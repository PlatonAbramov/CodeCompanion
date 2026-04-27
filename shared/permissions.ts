// =============================================================================
// Реестр прав системы для функции «Гибкая настройка прав ролей и пользователей».
// Используется на сервере (для middleware requirePermission) и в UI (страница
// «Права и доступ»). Дефолты по ролям точно соответствуют текущей матрице,
// чтобы при первом релизе ничего не изменилось ни для одного пользователя.
//
// При добавлении нового функционала — добавлять сюда новый ключ с разумными
// дефолтами по ролям. Существующие персональные переопределения сотрудников
// при этом не затрагиваются (ТЗ §8).
// =============================================================================

export type PermissionRole = "admin" | "director" | "master" | "worker" | "client";
export const PERMISSION_ROLES: readonly PermissionRole[] = [
  "admin",
  "director",
  "master",
  "worker",
  "client",
] as const;

export const PERMISSION_ROLE_LABELS: Record<PermissionRole, string> = {
  admin: "Админ",
  director: "Директор",
  master: "Мастер",
  worker: "Рабочий",
  client: "Клиент",
};

export type PermissionCategory =
  | "users"
  | "projects"
  | "finances"
  | "documents"
  | "directories"
  | "vehicles"
  | "system";

export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  users: "Пользователи и доступ",
  projects: "Проекты",
  finances: "Финансы",
  documents: "Документы и листы выполнения",
  directories: "Справочники",
  vehicles: "Автомобили и фотоконтроль",
  system: "Система",
};

export interface PermissionDef {
  key: string;
  category: PermissionCategory;
  name: string;
  description: string;
  defaults: Record<PermissionRole, boolean>;
  /**
   * Системные права не показываются в UI и не подлежат редактированию через
   * страницу «Права и доступ». Например, право на сам доступ к управлению
   * правами держится здесь как защитный механизм (см. ТЗ §7).
   */
  isSystem?: boolean;
}

const all = (v: boolean): Record<PermissionRole, boolean> => ({
  admin: v, director: v, master: v, worker: v, client: v,
});
const adminOnly = (): Record<PermissionRole, boolean> => ({
  ...all(false), admin: true,
});
const adminAndDirector = (): Record<PermissionRole, boolean> => ({
  ...all(false), admin: true, director: true,
});
const adminDirectorMaster = (): Record<PermissionRole, boolean> => ({
  ...all(false), admin: true, director: true, master: true,
});

export const PERMISSIONS: PermissionDef[] = [
  // ===== Пользователи и доступ =====
  {
    key: "users.view",
    category: "users",
    name: "Видеть список пользователей",
    description: "Доступ к списку пользователей системы.",
    defaults: adminAndDirector(),
  },
  {
    key: "users.create",
    category: "users",
    name: "Создавать пользователей",
    description: "Создание новых учётных записей сотрудников и клиентов.",
    defaults: adminAndDirector(),
  },
  {
    key: "users.update",
    category: "users",
    name: "Изменять пользователей",
    description: "Редактирование данных, блокировка, сброс пароля пользователя.",
    defaults: adminOnly(),
  },
  {
    key: "users.delete",
    category: "users",
    name: "Удалять пользователей",
    description: "Полное удаление учётной записи.",
    defaults: adminOnly(),
  },
  {
    key: "users.manage_permissions",
    category: "users",
    name: "Управлять правами",
    description: "Доступ к разделу «Права и доступ» и редактирование настроек прав.",
    defaults: adminOnly(),
    isSystem: true,
  },

  // ===== Проекты =====
  {
    key: "projects.view_all",
    category: "projects",
    name: "Видеть все проекты",
    description: "Просмотр полного списка проектов компании.",
    defaults: { admin: true, director: true, master: true, worker: true, client: false },
  },
  {
    key: "projects.view_assigned",
    category: "projects",
    name: "Видеть назначенные проекты",
    description: "Просмотр только тех проектов, на которые сотрудник назначен.",
    defaults: all(true),
  },
  {
    key: "projects.view_full",
    category: "projects",
    name: "Видеть полные данные проекта",
    description: "Бюджет, локация, клиент и прочая полная информация по проекту.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "projects.create",
    category: "projects",
    name: "Создавать проекты",
    description: "Заведение новых проектов в системе.",
    defaults: adminAndDirector(),
  },
  {
    key: "projects.update",
    category: "projects",
    name: "Изменять проекты",
    description: "Редактирование данных проекта, изменение статуса.",
    defaults: adminAndDirector(),
  },
  {
    key: "projects.archive",
    category: "projects",
    name: "Архивировать проекты",
    description: "Перевод проектов в архив и восстановление из архива.",
    defaults: adminAndDirector(),
  },
  {
    key: "projects.delete",
    category: "projects",
    name: "Удалять проекты",
    description: "Полное удаление проекта из системы (необратимо).",
    defaults: adminAndDirector(),
  },
  {
    key: "projects.assign_users",
    category: "projects",
    name: "Назначать пользователей на проект",
    description: "Привязка мастеров, рабочих и клиентов к проекту.",
    defaults: adminAndDirector(),
  },

  // ===== Финансы =====
  {
    key: "finances.view_summary",
    category: "finances",
    name: "Видеть финансовую сводку проекта",
    description: "Доход / расход / маржа по проекту.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "finances.view_overview",
    category: "finances",
    name: "Видеть финансовый обзор компании",
    description: "Сводный финансовый дашборд по всем проектам.",
    defaults: adminAndDirector(),
  },
  {
    key: "expenses.view_all",
    category: "finances",
    name: "Видеть все расходы",
    description: "Доступ к расходам по всем проектам.",
    defaults: adminAndDirector(),
  },
  {
    key: "expenses.view_own",
    category: "finances",
    name: "Видеть свои расходы",
    description: "Просмотр расходов, заведённых самим пользователем.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "expenses.create",
    category: "finances",
    name: "Создавать расходы",
    description: "Заведение нового расхода с обязательным чеком.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "expenses.delete_own",
    category: "finances",
    name: "Удалять свои расходы",
    description: "Удаление расходов, заведённых самим пользователем.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "expenses.delete_any",
    category: "finances",
    name: "Удалять любые расходы",
    description: "Удаление расходов, заведённых другими пользователями.",
    defaults: adminAndDirector(),
  },
  {
    key: "revenues.manage",
    category: "finances",
    name: "Управлять доходами",
    description: "Создание и удаление доходов по проекту.",
    defaults: adminAndDirector(),
  },
  {
    key: "advances.manage",
    category: "finances",
    name: "Управлять авансами сотрудникам",
    description: "Выдача и списание авансов сотрудникам.",
    defaults: adminAndDirector(),
  },
  {
    key: "customer_advances.manage",
    category: "finances",
    name: "Управлять авансами от клиентов",
    description: "Учёт авансовых платежей от заказчиков.",
    defaults: adminAndDirector(),
  },
  {
    key: "owner_investments.manage",
    category: "finances",
    name: "Управлять инвестициями владельца",
    description: "Учёт собственных вложений владельца в проект.",
    defaults: adminAndDirector(),
  },

  // ===== Документы и листы выполнения =====
  {
    key: "documents.view",
    category: "documents",
    name: "Видеть документы проекта",
    description: "Просмотр загруженных документов по проекту.",
    defaults: { admin: true, director: true, master: true, worker: false, client: true },
  },
  {
    key: "documents.upload",
    category: "documents",
    name: "Загружать документы",
    description: "Добавление новых документов к проекту.",
    defaults: adminAndDirector(),
  },
  {
    key: "documents.delete",
    category: "documents",
    name: "Удалять документы",
    description: "Удаление документов из проекта.",
    defaults: adminAndDirector(),
  },
  {
    key: "implementation_sheets.view",
    category: "documents",
    name: "Видеть листы выполнения",
    description: "Просмотр листов выполнения работ по проекту.",
    defaults: all(true),
  },
  {
    key: "implementation_sheets.manage",
    category: "documents",
    name: "Управлять листами выполнения",
    description: "Создание, редактирование, отметки готовности по позициям листа.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "implementation_photos.upload",
    category: "documents",
    name: "Загружать фото в листы выполнения",
    description: "Добавление фото- и видеоматериалов к позициям листа.",
    defaults: { admin: true, director: true, master: true, worker: true, client: false },
  },
  {
    key: "implementation_photos.delete_own",
    category: "documents",
    name: "Удалять свои фото в листах выполнения",
    description: "Удаление только тех фото, которые загрузил сам пользователь.",
    defaults: { admin: true, director: true, master: true, worker: true, client: false },
  },
  {
    key: "implementation_photos.delete_any",
    category: "documents",
    name: "Удалять любые фото в листах выполнения",
    description: "Удаление любых фото, в том числе чужих.",
    defaults: adminAndDirector(),
  },

  // ===== Справочники =====
  {
    key: "contractors.view",
    category: "directories",
    name: "Видеть подрядчиков",
    description: "Доступ к справочнику подрядчиков.",
    defaults: adminAndDirector(),
  },
  {
    key: "contractors.manage",
    category: "directories",
    name: "Управлять подрядчиками",
    description: "Создание, изменение, удаление подрядчиков.",
    defaults: adminAndDirector(),
  },
  {
    key: "clients.view",
    category: "directories",
    name: "Видеть клиентов",
    description: "Доступ к справочнику клиентов.",
    defaults: adminAndDirector(),
  },
  {
    key: "clients.manage",
    category: "directories",
    name: "Управлять клиентами",
    description: "Создание, изменение, удаление клиентов.",
    defaults: adminAndDirector(),
  },
  {
    key: "personnel.view",
    category: "directories",
    name: "Видеть персонал",
    description: "Справочник сотрудников и рабочих.",
    defaults: adminAndDirector(),
  },
  {
    key: "personnel.manage",
    category: "directories",
    name: "Управлять персоналом",
    description: "Создание, изменение, увольнение, назначение флага «Водитель».",
    defaults: adminOnly(),
  },
  {
    key: "tools.view",
    category: "directories",
    name: "Видеть инструменты",
    description: "Справочник инструментов и их перемещений.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "tools.manage",
    category: "directories",
    name: "Управлять инструментами",
    description: "Заведение и движение инструментов.",
    defaults: adminDirectorMaster(),
  },

  // ===== Автомобили и фотоконтроль =====
  {
    key: "vehicles.view",
    category: "vehicles",
    name: "Видеть автомобили",
    description: "Список автомобилей и их базовые данные.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "vehicles.manage",
    category: "vehicles",
    name: "Управлять автомобилями",
    description: "Создание, изменение и удаление автомобилей.",
    defaults: adminAndDirector(),
  },
  {
    key: "vehicles.photo_control",
    category: "vehicles",
    name: "Выполнять фотоконтроль автомобилей",
    description: "Проводить фотоконтроль автомобиля и сохранять снимки.",
    defaults: adminDirectorMaster(),
  },
  {
    key: "vehicles.audit_log",
    category: "vehicles",
    name: "Видеть аудит автомобилей",
    description: "Журнал изменений по автомобилю.",
    defaults: adminAndDirector(),
  },

  // ===== Система =====
  {
    key: "system.view_history",
    category: "system",
    name: "Видеть историю проекта",
    description: "Журнал изменений по проекту.",
    defaults: adminAndDirector(),
  },
  {
    key: "system.view_analytics",
    category: "system",
    name: "Видеть аналитику",
    description: "Раздел аналитики и отчётов по компании.",
    defaults: adminAndDirector(),
  },
  {
    key: "system.access_admin_panel",
    category: "system",
    name: "Доступ к админ-панели",
    description: "Раздел администрирования системы.",
    defaults: adminOnly(),
  },
];

export const PERMISSION_BY_KEY: Map<string, PermissionDef> = new Map(
  PERMISSIONS.map((p) => [p.key, p]),
);

export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, PermissionDef[]> =
  PERMISSIONS.reduce((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {} as Record<PermissionCategory, PermissionDef[]>);

/**
 * Чисто-вычисляемое право по дефолтам реестра, без обращения к БД.
 * Используется как fallback, если для (role, key) ещё не записан явный дефолт
 * в таблице rolePermissions.
 */
export function getRegistryDefault(role: PermissionRole, key: string): boolean {
  const def = PERMISSION_BY_KEY.get(key);
  if (!def) return false;
  return def.defaults[role] === true;
}
