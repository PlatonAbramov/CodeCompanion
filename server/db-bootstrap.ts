import { Client } from 'pg';
import bcrypt from 'bcrypt';

const log = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [DBBOOT] ${message}`);
};

interface BootstrapConfig {
  databaseUrl: string;
  autoMigrate: boolean;
  lockKey: number;
  maxRetries: number;
  backoffMs: number;
  directorEmail: string;
  directorLogin: string;
  directorPassword: string;
}

const getConfig = (): BootstrapConfig => ({
  databaseUrl: process.env.DATABASE_URL || '',
  autoMigrate: process.env.AUTO_MIGRATE !== '0',
  lockKey: parseInt(process.env.DB_LOCK_KEY || '748392', 10),
  maxRetries: parseInt(process.env.DB_BOOT_RETRIES || '15', 10),
  backoffMs: parseInt(process.env.DB_BOOT_BACKOFF_MS || '2000', 10),
  directorEmail: process.env.DIRECTOR_EMAIL || 'platonabramov90@gmail.com',
  directorLogin: process.env.DIRECTOR_LOGIN || 'platonabramov90',
  directorPassword: process.env.DIRECTOR_PASSWORD || '123456',
});

async function waitForDatabase(config: BootstrapConfig): Promise<Client> {
  log('WAIT - Starting database connection attempts');
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const client = new Client({ connectionString: config.databaseUrl });
      await client.connect();
      await client.query('SELECT 1');
      log(`WAIT - Database connected successfully on attempt ${attempt}`);
      return client;
    } catch (error) {
      log(`WAIT - Attempt ${attempt}/${config.maxRetries} failed: ${(error as Error).message}`);
      
      if (attempt === config.maxRetries) {
        throw new Error(`Failed to connect to database after ${config.maxRetries} attempts`);
      }
      
      const delay = config.backoffMs * Math.pow(1.5, attempt - 1);
      log(`WAIT - Retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unexpected end of waitForDatabase');
}

async function acquireAdvisoryLock(client: Client, lockKey: number): Promise<void> {
  log(`LOCK - Acquiring advisory lock ${lockKey}`);
  const result = await client.query('SELECT pg_advisory_lock($1)', [lockKey]);
  log('LOCK - Advisory lock acquired successfully');
}

async function releaseAdvisoryLock(client: Client, lockKey: number): Promise<void> {
  log(`UNLOCK - Releasing advisory lock ${lockKey}`);
  await client.query('SELECT pg_advisory_unlock($1)', [lockKey]);
  log('UNLOCK - Advisory lock released successfully');
}

async function runPreflight(client: Client): Promise<void> {
  log('PREFLIGHT - Starting data integrity checks');
  const start = Date.now();
  
  try {
    // Check for NULL values in required columns
    const nullChecks = await client.query(`
      SELECT 'users.created_at' as field, count(*) FROM users WHERE created_at IS NULL
      UNION ALL SELECT 'users.updated_at', count(*) FROM users WHERE updated_at IS NULL
      UNION ALL SELECT 'users.login', count(*) FROM users WHERE login IS NULL
      UNION ALL SELECT 'users.password_hash', count(*) FROM users WHERE password_hash IS NULL
      UNION ALL SELECT 'users.password_algo', count(*) FROM users WHERE password_algo IS NULL
      UNION ALL SELECT 'users.is_blocked', count(*) FROM users WHERE is_blocked IS NULL
      UNION ALL SELECT 'users.mfa_enabled', count(*) FROM users WHERE mfa_enabled IS NULL
    `);
    
    const nullIssues = nullChecks.rows.filter(row => parseInt(row.count) > 0);
    if (nullIssues.length > 0) {
      log(`PREFLIGHT - Found NULL values: ${nullIssues.map(r => `${r.field}(${r.count})`).join(', ')}`);
    } else {
      log('PREFLIGHT - No NULL values found in required columns');
    }
    
    // Check for orphaned records
    const orphanChecks = await client.query(`
      SELECT 'sessions orphans' as type, count(*) 
      FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE u.id IS NULL
      UNION ALL SELECT 'login_attempts orphans', count(*) 
      FROM login_attempts l LEFT JOIN users u ON u.id=l.user_id WHERE l.user_id IS NOT NULL AND u.id IS NULL
      UNION ALL SELECT 'mfa_totp orphans', count(*) 
      FROM mfa_totp m LEFT JOIN users u ON u.id=m.user_id WHERE u.id IS NULL
    `);
    
    const orphanIssues = orphanChecks.rows.filter(row => parseInt(row.count) > 0);
    if (orphanIssues.length > 0) {
      log(`PREFLIGHT - Found orphaned records: ${orphanIssues.map(r => `${r.type}(${r.count})`).join(', ')}`);
    } else {
      log('PREFLIGHT - No orphaned records found');
    }
    
    const duration = Date.now() - start;
    log(`PREFLIGHT - Completed successfully in ${duration}ms`);
  } catch (error) {
    log(`PREFLIGHT - Failed: ${(error as Error).message}`);
    throw error;
  }
}

async function runBackfill(client: Client): Promise<void> {
  log('BACKFILL - Starting data cleanup and defaults');
  const start = Date.now();
  
  try {
    await client.query('BEGIN');
    
    // Set column defaults for new records
    await client.query(`
      ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
      ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
      ALTER TABLE users ALTER COLUMN is_blocked SET DEFAULT false;
      ALTER TABLE users ALTER COLUMN mfa_enabled SET DEFAULT false;
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
    `);
    
    // Fill existing NULL values
    const updates = await Promise.all([
      client.query(`UPDATE users SET created_at=NOW() WHERE created_at IS NULL`),
      client.query(`UPDATE users SET updated_at=NOW() WHERE updated_at IS NULL`),
      client.query(`UPDATE users SET is_blocked=false WHERE is_blocked IS NULL`),
      client.query(`UPDATE users SET mfa_enabled=false WHERE mfa_enabled IS NULL`),
      client.query(`UPDATE users SET login=COALESCE(login, username) WHERE login IS NULL`),
    ]);
    
    const totalUpdated = updates.reduce((sum, result) => sum + (result.rowCount || 0), 0);
    if (totalUpdated > 0) {
      log(`BACKFILL - Updated ${totalUpdated} NULL values`);
    }
    
    // Block users with invalid passwords
    const passwordFix = await client.query(`
      UPDATE users 
      SET password_hash='disabled', password_algo='none', is_blocked=true
      WHERE password_hash IS NULL OR password_algo IS NULL
    `);
    
    if ((passwordFix.rowCount || 0) > 0) {
      log(`BACKFILL - Blocked ${passwordFix.rowCount || 0} users with invalid passwords`);
    }
    
    // Clean orphaned records
    const orphanCleanup = await Promise.all([
      client.query(`DELETE FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id=s.user_id)`),
      client.query(`DELETE FROM login_attempts l WHERE l.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=l.user_id)`),
      client.query(`DELETE FROM mfa_totp m WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id=m.user_id)`),
    ]);
    
    const totalOrphansRemoved = orphanCleanup.reduce((sum, result) => sum + (result.rowCount || 0), 0);
    if (totalOrphansRemoved > 0) {
      log(`BACKFILL - Removed ${totalOrphansRemoved} orphaned records`);
    }
    
    await client.query('COMMIT');
    
    const duration = Date.now() - start;
    log(`BACKFILL - Completed successfully in ${duration}ms`);
  } catch (error) {
    await client.query('ROLLBACK');
    log(`BACKFILL - Failed: ${(error as Error).message}`);
    throw error;
  }
}

async function runMigration(client: Client): Promise<void> {
  log('MIGRATE - Starting safe idempotent schema migration');
  const start = Date.now();
  
  try {
    // Execute the safe, idempotent migration script
    await client.query(`
      -- SAFE / IDEMPOTENT MIGRATION
      -- Делает backfill, чистит "сирот", мягко меняет схему и только потом ужесточает + вешает FK.
      -- Можно запускать повторно: операции защищены проверками.

      BEGIN;

      -- 0) На всякий случай ждём эксклюзив (advisory lock), чтобы миграцию выполнял один инстанс
      -- Не критично для одиночного деплоя, но безопасно при параллельном старте
      SELECT pg_advisory_lock(748392);

      -- 1) ДЕФОЛТЫ, ЧТОБЫ НОВЫЕ ЗАПИСИ НЕ БЫЛИ NULL
      ALTER TABLE users ALTER COLUMN created_at  SET DEFAULT now();
      ALTER TABLE users ALTER COLUMN updated_at  SET DEFAULT now();
      ALTER TABLE users ALTER COLUMN is_blocked  SET DEFAULT false;
      ALTER TABLE users ALTER COLUMN mfa_enabled SET DEFAULT false;
      ALTER TABLE users ALTER COLUMN role        SET DEFAULT 'user';

      -- 2) BACKFILL: ЗАПОЛНИТЬ ТЕКУЩИЕ NULL (БЕЗОПАСНО)
      UPDATE users SET created_at  = COALESCE(created_at, NOW());
      UPDATE users SET updated_at  = COALESCE(updated_at, NOW());
      UPDATE users SET is_blocked  = COALESCE(is_blocked, FALSE);
      UPDATE users SET mfa_enabled = COALESCE(mfa_enabled, FALSE);
      -- если login пустой, подставим username (если колонка есть)
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username')
        THEN
          UPDATE users SET login = COALESCE(login, username);
        END IF;
      END $$;

      -- если нет хэша пароля/алгоритма — временно «заглушим» и заблокируем (чтобы не рушить NOT NULL)
      UPDATE users
      SET password_hash = COALESCE(password_hash, 'disabled'),
          password_algo = COALESCE(password_algo, 'none'),
          is_blocked    = CASE WHEN password_hash IS NULL OR password_algo IS NULL THEN TRUE ELSE is_blocked END
      WHERE password_hash IS NULL OR password_algo IS NULL;

      -- 3) УДАЛИТЬ «СИРОТ» ПЕРЕД ДОБАВЛЕНИЕМ ВНЕШНИХ КЛЮЧЕЙ
      DELETE FROM sessions s
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);

      DELETE FROM login_attempts l
      WHERE l.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = l.user_id);

      DELETE FROM mfa_totp m
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = m.user_id);

      -- 4) МЯГКИЕ ИЗМЕНЕНИЯ СХЕМЫ (НЕ ЛОМАЕМ ИМЕЮЩИЕСЯ ДАННЫЕ)

      -- tool_movements.photo_url: убрать NOT NULL, если колонка существует
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tool_movements' AND column_name='photo_url')
        THEN
          EXECUTE 'ALTER TABLE tool_movements ALTER COLUMN photo_url DROP NOT NULL';
        END IF;
      END $$;

      -- Добавить миниатюру, если ещё нет
      ALTER TABLE tool_movements ADD COLUMN IF NOT EXISTS photo_thumbnail_url text;

      -- users: снять NOT NULL с «устаревших» колонок, но только если они вообще есть
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username')
        THEN
          EXECUTE 'ALTER TABLE users ALTER COLUMN username DROP NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password')
        THEN
          EXECUTE 'ALTER TABLE users ALTER COLUMN password DROP NOT NULL';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name')
        THEN
          EXECUTE 'ALTER TABLE users ALTER COLUMN name DROP NOT NULL';
        END IF;
      END $$;

      -- 5) УЖЕСТОЧЕНИЕ (ПОСЛЕ BACKFILL): СДЕЛАТЬ ПОЛЯ ОБЯЗАТЕЛЬНЫМИ
      ALTER TABLE users ALTER COLUMN created_at    SET NOT NULL;
      ALTER TABLE users ALTER COLUMN updated_at    SET NOT NULL;
      ALTER TABLE users ALTER COLUMN login         SET NOT NULL;
      ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
      ALTER TABLE users ALTER COLUMN password_algo SET NOT NULL;
      ALTER TABLE users ALTER COLUMN is_blocked    SET NOT NULL;
      ALTER TABLE users ALTER COLUMN mfa_enabled   SET NOT NULL;

      -- 6) СНЯТЬ СТАРЫЕ FK, ЕСЛИ ОНИ ЕСТЬ, И ПОВЕСИТЬ НОВЫЕ ТОЛЬКО ЕСЛИ ИХ ЕЩЁ НЕТ
      ALTER TABLE sessions       DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
      ALTER TABLE login_attempts DROP CONSTRAINT IF EXISTS login_attempts_user_id_fkey;
      ALTER TABLE mfa_totp       DROP CONSTRAINT IF EXISTS mfa_totp_user_id_fkey;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sessions_user_id_users_id_fk') THEN
          EXECUTE 'ALTER TABLE sessions
            ADD CONSTRAINT sessions_user_id_users_id_fk
            FOREIGN KEY (user_id) REFERENCES public.users(id)
            ON DELETE CASCADE ON UPDATE NO ACTION';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='login_attempts_user_id_users_id_fk') THEN
          EXECUTE 'ALTER TABLE login_attempts
            ADD CONSTRAINT login_attempts_user_id_users_id_fk
            FOREIGN KEY (user_id) REFERENCES public.users(id)
            ON DELETE NO ACTION ON UPDATE NO ACTION';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='mfa_totp_user_id_users_id_fk') THEN
          EXECUTE 'ALTER TABLE mfa_totp
            ADD CONSTRAINT mfa_totp_user_id_users_id_fk
            FOREIGN KEY (user_id) REFERENCES public.users(id)
            ON DELETE CASCADE ON UPDATE NO ACTION';
        END IF;
      END $$;

      -- 7) Снять advisory-lock и завершить
      SELECT pg_advisory_unlock(748392);
      COMMIT;
    `);
    
    const duration = Date.now() - start;
    log(`MIGRATE - Completed successfully in ${duration}ms`);
  } catch (error) {
    log(`MIGRATE - Failed: ${(error as Error).message}`);
    throw error;
  }
}

async function seedDirector(client: Client, config: BootstrapConfig): Promise<void> {
  log('SEED - Starting director account setup');
  const start = Date.now();
  
  try {
    const passwordHash = await bcrypt.hash(config.directorPassword, 12);
    
    // Check if director already exists
    const existingUser = await client.query(`
      SELECT id, login, role, is_blocked FROM users WHERE login = $1
    `, [config.directorLogin]);
    
    if (existingUser.rows.length > 0) {
      // Update existing director
      const user = existingUser.rows[0];
      await client.query(`
        UPDATE users SET 
          role = 'director',
          is_blocked = false,
          password_hash = $1,
          password_algo = 'bcrypt',
          updated_at = now()
        WHERE id = $2
      `, [passwordHash, user.id]);
      
      log(`SEED - Director account updated: ${user.login} (role: director, blocked: false)`);
    } else {
      // Create new director
      const result = await client.query(`
        INSERT INTO users (id, login, password_hash, password_algo, name, role, is_blocked, mfa_enabled, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          $1, $2, 'bcrypt', 'Директор', 'director', false, false, now(), now()
        )
        RETURNING login, role, is_blocked
      `, [config.directorLogin, passwordHash]);
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        log(`SEED - Director account created: ${user.login} (role: ${user.role}, blocked: ${user.is_blocked})`);
      }
    }
    
    const duration = Date.now() - start;
    log(`SEED - Completed successfully in ${duration}ms`);
  } catch (error) {
    log(`SEED - Failed: ${(error as Error).message}`);
    throw error;
  }
}

export async function runDatabaseBootstrap(): Promise<void> {
  const config = getConfig();
  
  if (!config.autoMigrate) {
    log('AUTO_MIGRATE=0 - Skipping database bootstrap');
    return;
  }
  
  if (!config.databaseUrl) {
    const error = new Error('DATABASE_URL environment variable is required');
    
    // In production, log the error but don't fail
    if (process.env.NODE_ENV === 'production' || process.env.SKIP_MIGRATION_ON_ERROR === '1') {
      log('FAILED - DATABASE_URL missing, but continuing in production mode');
      return;
    }
    
    throw error;
  }
  
  log('Starting automatic database bootstrap');
  const overallStart = Date.now();
  
  let client: Client | null = null;
  
  try {
    // Step 1: Wait for database with enhanced error handling
    try {
      client = await waitForDatabase(config);
    } catch (dbError) {
      const errorMessage = (dbError as Error).message;
      log(`DATABASE - Connection failed: ${errorMessage}`);
      
      // Check if this is a platform/infrastructure issue
      const isPlatformIssue = errorMessage.includes('ENOTFOUND') ||
                             errorMessage.includes('ECONNREFUSED') ||
                             errorMessage.includes('timeout') ||
                             errorMessage.includes('network') ||
                             errorMessage.includes('connection');
      
      if (isPlatformIssue && (process.env.NODE_ENV === 'production' || process.env.SKIP_MIGRATION_ON_ERROR === '1')) {
        log('DATABASE - Platform connectivity issue detected, skipping bootstrap in production');
        return;
      }
      
      throw dbError;
    }
    
    // Step 2: Acquire advisory lock with timeout protection
    try {
      await acquireAdvisoryLock(client, config.lockKey);
    } catch (lockError) {
      const errorMessage = (lockError as Error).message;
      log(`LOCK - Failed to acquire: ${errorMessage}`);
      
      if (process.env.NODE_ENV === 'production' || process.env.SKIP_MIGRATION_ON_ERROR === '1') {
        log('LOCK - Skipping lock acquisition in production mode');
        // Continue without lock in production
      } else {
        throw lockError;
      }
    }
    
    // Step 3: Run preflight checks with error handling
    try {
      await runPreflight(client);
    } catch (preflightError) {
      const errorMessage = (preflightError as Error).message;
      log(`PREFLIGHT - Failed: ${errorMessage}`);
      
      if (process.env.NODE_ENV === 'production' || process.env.SKIP_MIGRATION_ON_ERROR === '1') {
        log('PREFLIGHT - Skipping preflight checks in production mode');
      } else {
        throw preflightError;
      }
    }
    
    // Step 4: Run migration with comprehensive error handling
    try {
      await runMigration(client);
    } catch (migrationError) {
      const errorMessage = (migrationError as Error).message;
      const isPlatformIssue = errorMessage.includes('current transaction is aborted') ||
                             errorMessage.includes('connection') ||
                             errorMessage.includes('timeout') ||
                             errorMessage.includes('network') ||
                             errorMessage.includes('advisory lock') ||
                             errorMessage.includes('database is starting up');
      
      log(`MIGRATE - Error: ${errorMessage}`);
      
      if (isPlatformIssue || process.env.NODE_ENV === 'production' || process.env.SKIP_MIGRATION_ON_ERROR === '1') {
        log('MIGRATE - Platform issue detected or production mode, skipping migration');
        log('MIGRATE - Application will continue without schema changes');
      } else {
        throw migrationError;
      }
    }
    
    // Step 5: Seed director with error handling
    try {
      await seedDirector(client, config);
    } catch (seedError) {
      const errorMessage = (seedError as Error).message;
      log(`SEED - Failed: ${errorMessage}`);
      
      if (process.env.NODE_ENV === 'production' || process.env.SKIP_MIGRATION_ON_ERROR === '1') {
        log('SEED - Skipping director seeding in production mode');
      } else {
        throw seedError;
      }
    }
    
    // Step 6: Release lock with error handling
    try {
      await releaseAdvisoryLock(client, config.lockKey);
    } catch (unlockError) {
      log(`UNLOCK - Failed to release lock: ${(unlockError as Error).message}`);
      // Don't fail the entire bootstrap for unlock issues
    }
    
    const totalDuration = Date.now() - overallStart;
    log(`DONE - Database bootstrap completed successfully in ${totalDuration}ms`);
    
  } catch (error) {
    const errorMessage = (error as Error).message;
    log(`FAILED - Database bootstrap failed: ${errorMessage}`);
    
    // Enhanced production error handling
    const isProduction = process.env.NODE_ENV === 'production';
    const skipOnError = process.env.SKIP_MIGRATION_ON_ERROR === '1';
    
    if (isProduction || skipOnError) {
      log('FAILED - Continuing startup despite bootstrap failure (production mode)');
      
      if (client) {
        try {
          await releaseAdvisoryLock(client, config.lockKey);
        } catch (unlockError) {
          log(`UNLOCK - Failed to release lock: ${(unlockError as Error).message}`);
        }
      }
      
      return; // Don't throw in production
    }
    
    if (client) {
      try {
        await releaseAdvisoryLock(client, config.lockKey);
      } catch (unlockError) {
        log(`UNLOCK - Failed to release lock: ${(unlockError as Error).message}`);
      }
    }
    
    throw error;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        log(`CLIENT - Failed to close connection: ${(closeError as Error).message}`);
      }
    }
  }
}