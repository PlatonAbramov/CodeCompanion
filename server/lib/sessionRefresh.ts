/**
 * Поддержание актуальности `req.session.user` относительно реальных данных
 * пользователя в БД. Решает «рассинхрон»: админ сменил роль / заблокировал
 * сотрудника / выдал-снял право, а у активного пользователя в его сессии
 * висит старое `role`, и `requireAuth` / `denyWorker` / `requireRole`
 * принимают неверные решения до тех пор, пока он не перелогинится или
 * вручную не дёрнется `/api/auth/me`.
 *
 * Стратегия:
 *  • Кэшируем «версию» пользователя в in-process Map<userId, lastRefreshedAt>.
 *  • На каждый авторизованный запрос: если прошло > REFRESH_INTERVAL_MS или
 *    запись помечена как dirty — забираем свежие поля из БД и переписываем
 *    `req.session.user`, после чего `req.session.save()` асинхронно.
 *  • Любые ошибки БД молча логируем и пропускаем запрос — иначе мы можем
 *    положить весь продакшен на сетевом сбое.
 *  • Если пользователь стал inactive/blocked/удалён — сигнализируем кодом
 *    `kill`, чтобы вызывающий middleware вернул 401 и убил сессию.
 *
 *  Побочный эффект: кэш прав запроса (`req._permissionsCache`) сбрасываем,
 *  как только role изменилась — иначе следующий `userHasPermission` использует
 *  карту, рассчитанную на устаревшую роль.
 */
import type { Request } from "express";
import { storage } from "../storage";

const REFRESH_INTERVAL_MS = 15_000;

/** userId → millis последней синхронизации */
const lastRefreshedAt = new Map<string, number>();
/** userId, у которых произошло внешнее изменение и refresh нужен сразу */
const dirtyUsers = new Set<string>();

/**
 * Помечает userId как «нужно перечитать из БД при следующем запросе».
 * Дёргается из эндпоинтов смены роли / прав / блокировки.
 */
export function invalidateUserVersion(userId: string): void {
  if (!userId) return;
  dirtyUsers.add(userId);
  lastRefreshedAt.delete(userId);
}

export function invalidateUserVersions(userIds: ReadonlyArray<string>): void {
  for (let i = 0; i < userIds.length; i++) invalidateUserVersion(userIds[i]);
}

export type RefreshResult =
  | { kind: "ok"; changed: boolean }
  | { kind: "kill"; reason: "not_found" | "inactive" | "blocked" };

/**
 * Подтягивает свежие поля пользователя из БД и обновляет `req.session.user`,
 * если что-то изменилось. Возвращает `kill`, если пользователя нужно
 * выкинуть из системы (его удалили/деактивировали/заблокировали).
 */
export async function refreshSessionUserFromDb(req: Request): Promise<RefreshResult> {
  const sessUser = (req as any).session?.user;
  if (!sessUser?.id) return { kind: "ok", changed: false };
  const userId: string = sessUser.id;

  const now = Date.now();
  const last = lastRefreshedAt.get(userId) ?? 0;
  const isDirty = dirtyUsers.has(userId);
  if (!isDirty && now - last < REFRESH_INTERVAL_MS) {
    return { kind: "ok", changed: false };
  }

  let dbUser: any = null;
  try {
    dbUser = await storage.getUserById(userId);
  } catch (err) {
    // На сетевых сбоях не валим запрос: оставляем сессии шанс отработать
    // с текущими данными. Следующий запрос попробует ещё раз.
    console.warn("refreshSessionUserFromDb: DB read failed, keeping cached session", err);
    return { kind: "ok", changed: false };
  }

  // Любая попытка (успешная) считается обновлением версии.
  lastRefreshedAt.set(userId, now);
  dirtyUsers.delete(userId);

  if (!dbUser) {
    return { kind: "kill", reason: "not_found" };
  }
  if (dbUser.isActive === false) {
    return { kind: "kill", reason: "inactive" };
  }
  if (dbUser.isBlocked === true) {
    return { kind: "kill", reason: "blocked" };
  }

  const next = {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    role: dbUser.role,
  };

  const changed =
    sessUser.username !== next.username ||
    sessUser.name !== next.name ||
    sessUser.role !== next.role;

  if (!changed) {
    return { kind: "ok", changed: false };
  }

  // Если поменялась роль — карта прав, рассчитанная на текущий request,
  // тоже устарела (она построена под старую роль).
  if (sessUser.role !== next.role) {
    delete (req as any)._permissionsCache;
  }

  (req as any).session.user = next;
  // save() — fire and forget: запрос продолжается, последующий запрос
  // увидит обновлённую сессию.
  try {
    (req as any).session.save?.((err: any) => {
      if (err) console.warn("refreshSessionUserFromDb: session.save failed", err);
    });
  } catch (err) {
    console.warn("refreshSessionUserFromDb: session.save threw", err);
  }

  return { kind: "ok", changed: true };
}
