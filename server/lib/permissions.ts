import type { Request, Response, NextFunction } from "express";
import {
  PERMISSIONS,
  PERMISSION_BY_KEY,
  type PermissionRole,
  type PermissionDef,
} from "@shared/permissions";
import { storage } from "../storage";

/**
 * Карта эффективных значений прав для конкретного пользователя.
 * Ключ — `permissionKey`, значение — финальный enabled/disabled с учётом
 * переопределений: персональный override > значение, заданное для роли в БД >
 * дефолт реестра.
 *
 * Кэш на запрос:
 *   В рамках одного http-запроса повторно не дёргаем БД — складываем результат
 *   в `req._permissionsCache`. Это особенно важно, потому что одна цепочка
 *   middleware/handler может дёрнуть проверку нескольких прав.
 */
export type PermissionMap = Map<string, boolean>;

interface PermissionUser {
  id: string;
  role: string;
}

function isKnownRole(role: string): role is PermissionRole {
  return role === "admin" || role === "director" || role === "master" ||
    role === "worker" || role === "client";
}

/**
 * Возвращает финальную карту прав для пользователя с учётом БД-настроек роли
 * и персональных переопределений.
 */
export async function getEffectivePermissions(user: PermissionUser): Promise<PermissionMap> {
  const map: PermissionMap = new Map();
  const role = user.role;
  const knownRole = isKnownRole(role);

  // 1. Базовые дефолты реестра.
  for (const def of PERMISSIONS) {
    const dflt = knownRole ? def.defaults[role] === true : false;
    map.set(def.key, dflt);
  }

  // 2. Если в БД сохранены явные значения для роли — переопределяем.
  if (knownRole) {
    const roleRows = await storage.getRolePermissions(role);
    for (const row of roleRows) {
      if (PERMISSION_BY_KEY.has(row.permissionKey)) {
        map.set(row.permissionKey, row.enabled === true);
      }
    }
  }

  // 3. Персональные переопределения сотрудника.
  const overrides = await storage.getUserPermissionOverrides(user.id);
  for (const ov of overrides) {
    if (!PERMISSION_BY_KEY.has(ov.permissionKey)) continue;
    if (ov.state === "enabled") map.set(ov.permissionKey, true);
    else if (ov.state === "disabled") map.set(ov.permissionKey, false);
  }

  return map;
}

/** Извлекает (или вычисляет и кэширует) карту прав текущего пользователя из req. */
export async function loadRequestPermissions(req: any): Promise<PermissionMap | null> {
  const user = req.session?.user as PermissionUser | undefined;
  if (!user) return null;
  if (req._permissionsCache) return req._permissionsCache as PermissionMap;
  const map = await getEffectivePermissions(user);
  req._permissionsCache = map;
  return map;
}

/** Точечная проверка одного права для пользователя (с кэшем по запросу). */
export async function userHasPermission(req: any, key: string): Promise<boolean> {
  const map = await loadRequestPermissions(req);
  if (!map) return false;
  return map.get(key) === true;
}

/**
 * Express-middleware: пускает запрос дальше, только если пользователь авторизован
 * и у него установлено право `key`. Иначе — 401 / 403 с понятным сообщением.
 */
export function requirePermission(key: string) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ error: "Не авторизован" });
      }
      const ok = await userHasPermission(req, key);
      if (!ok) {
        return res.status(403).json({
          error: "Недостаточно прав",
          missingPermission: key,
        });
      }
      next();
    } catch (err) {
      console.error("requirePermission error", { key, err });
      return res.status(500).json({ error: "Ошибка проверки прав" });
    }
  };
}

/**
 * Идемпотентная инициализация дефолтов прав для всех ролей при старте сервера.
 * Создаёт строки в `role_permissions` только для тех (role, key), которых там
 * ещё нет — существующие настройки администратора не затрагиваются.
 */
export async function seedDefaultRolePermissions(): Promise<void> {
  const roles: PermissionRole[] = ["admin", "director", "master", "worker", "client"];
  const inserted: { role: PermissionRole; key: string; enabled: boolean }[] = [];

  for (const role of roles) {
    const existing = await storage.getRolePermissions(role);
    const existingKeys = new Set(existing.map((r) => r.permissionKey));
    for (const def of PERMISSIONS) {
      if (existingKeys.has(def.key)) continue;
      inserted.push({ role, key: def.key, enabled: def.defaults[role] === true });
    }
  }

  if (inserted.length === 0) return;
  await storage.bulkInsertRolePermissions(inserted.map((i) => ({
    role: i.role,
    permissionKey: i.key,
    enabled: i.enabled,
  })));
  console.log(`[permissions] seeded ${inserted.length} default role-permission rows`);
}

export type { PermissionDef, PermissionRole };
