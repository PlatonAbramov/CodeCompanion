import { AuthService } from './auth';
import { storage } from './storage';

/**
 * Helper script to migrate existing user to new authentication system
 */
export async function migrateUserToNewAuth(userId: string, plainPassword: string): Promise<void> {
  try {
    // Hash password with Argon2
    const passwordHash = await AuthService.hashPassword(plainPassword);
    
    // Update user with new hash
    await storage.updateUserPassword(userId, passwordHash);
    
    console.log(`User ${userId} migrated to new authentication system`);
  } catch (error) {
    console.error('Migration error:', error);
  }
}

// Export for direct execution if needed
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2];
  const password = process.argv[3];
  
  if (!userId || !password) {
    console.error('Usage: tsx migration-helper.ts <userId> <password>');
    process.exit(1);
  }
  
  migrateUserToNewAuth(userId, password).then(() => {
    console.log('Migration completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}