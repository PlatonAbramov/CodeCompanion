import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb, json, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(), // Добавляем email для админки
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'admin' | 'director' | 'master' | 'client'
  isActive: boolean("is_active").default(true),
  isBlocked: boolean("is_blocked").default(false), // Для блокировки пользователей
  tempPassword: text("temp_password"), // Временный пароль
  mustChangePassword: boolean("must_change_password").default(false), // Принудительная смена пароля
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
  createdBy: varchar("created_by"), // Кто создал пользователя
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("active"), // 'active' | 'completed' | 'paused' | 'archived'
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const advances = pgTable("advances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  recipient: text("recipient"),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerAdvances = pgTable("customer_advances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const revenues = pgTable("revenues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  source: text("source"),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id), // Может быть null если пользователь удален
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  contractorId: varchar("contractor_id").references(() => contractors.id), // Для оплаты подрядчикам
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(), // Original file name
  fileSize: integer("file_size").notNull(), // File size in bytes
  mimeType: text("mime_type").notNull(), // MIME type
  fileUrl: text("file_url").notNull(), // URL to the stored file
  visibleToClient: boolean("visible_to_client").default(false), // Показывать заказчику
  uploadedBy: varchar("uploaded_by").references(() => users.id), // Может быть null если пользователь удален
  createdAt: timestamp("created_at").defaultNow(),
});

export const ownerInvestments = pgTable("owner_investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  investor: text("investor").notNull(), // 'vlad' | 'platon'
  description: text("description"),
  date: timestamp("date").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contractors = pgTable("contractors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  specialization: text("specialization").notNull(), // Специализация работ
  licenseUrl: text("license_url"), // URL лицензии
  documentUrls: jsonb("document_urls").default("[]"), // Массив URL документов
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contractorProjects = pgTable("contractor_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").references(() => contractors.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: text("status").default("active"), // 'active' | 'completed' | 'paused'
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProjects = pgTable("user_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  contactPerson: text("contact_person"), // Контактное лицо
  userId: varchar("user_id").references(() => users.id), // Связанный пользователь с ролью client
  documentUrls: jsonb("document_urls").default("[]"), // Массив URL документов
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientProjects = pgTable("client_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  contractAmount: decimal("contract_amount", { precision: 12, scale: 2 }), // Сумма договора
  contractNumber: text("contract_number"), // Номер договора
  contractDate: timestamp("contract_date"), // Дата договора
  description: text("description"),
  status: text("status").default("active"), // 'active' | 'completed' | 'paused'
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientPayments = pgTable("client_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method"), // Способ оплаты
  documentUrl: text("document_url"), // URL документа об оплате
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientEmployees = pgTable("client_employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // сотрудник с ролью client
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
}, (table) => ({
  uniqueClientUser: unique().on(table.clientId, table.userId),
}));

export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inventoryNumber: text("inventory_number").unique(),
  cost: decimal("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  description: text("description"),
  status: text("status").default("AVAILABLE"), // 'AVAILABLE' | 'OUT' | 'WRITTEN_OFF'
  currentIssueEventId: varchar("current_issue_event_id"), // ссылка на открытое событие выдачи
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const toolMovements = pgTable("tool_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id").references(() => tools.id).notNull(),
  type: text("type").notNull(), // 'ISSUE' | 'RETURN'
  personName: text("person_name").notNull(),
  personPhone: text("person_phone").notNull(),
  photoUrl: text("photo_url").notNull(),
  comment: text("comment"),
  eventTime: timestamp("event_time").notNull().defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  isAdminCorrected: boolean("is_admin_corrected").default(false),
  correctionReason: text("correction_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const toolPersons = pgTable("tool_persons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Таблицы для админ-панели
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username"),
  email: text("email"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"), // неверный пароль, заблокирован и т.д.
  userId: varchar("user_id").references(() => users.id), // если успешный вход
  attemptTime: timestamp("attempt_time").defaultNow(),
});

export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // 'create_user', 'block_user', 'reset_password', etc.
  targetUserId: varchar("target_user_id").references(() => users.id),
  details: jsonb("details"), // дополнительные данные о действии
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Personnel (Employee) management tables
export const personnel = pgTable("personnel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  dateOfBirth: timestamp("date_of_birth"),
  phone: text("phone"),
  email: text("email"),
  emiratesId: text("emirates_id"), // ID number
  emiratesIdIssueDate: timestamp("emirates_id_issue_date"),
  emiratesIdExpiryDate: timestamp("emirates_id_expiry_date"),
  specialization: text("specialization").notNull(),
  startDate: timestamp("start_date").notNull(), // Date started working
  salary: decimal("salary", { precision: 12, scale: 2 }), // AED amount
  status: text("status").default("active"), // 'active' | 'dismissed' | 'vacation'
  photoUrl: text("photo_url"), // Main photo
  isDriver: boolean("is_driver").default(false).notNull(), // Признак роли «Водитель» (доступ к фотоконтролю авто)
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Журнал отправки чеков расходов в Telegram (idempotency + аудит).
// Любая запись здесь означает, что для конкретного (expense, fileUrl) уже была попытка
// отправки — повторно не отправляем.
export const telegramNotifications = pgTable("telegram_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").references(() => expenses.id, { onDelete: "cascade" }).notNull(),
  fileUrl: text("file_url").notNull(),
  status: text("status").notNull(), // 'pending' | 'sent' | 'failed' | 'too_large' | 'skipped'
  telegramMessageId: text("telegram_message_id"),
  telegramChatId: text("telegram_chat_id"),
  error: text("error"),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Атомарная идемпотентность: один и тот же чек одного и того же расхода — только одна запись.
  // Параллельные dispatch-ы конкурируют за вставку через ON CONFLICT DO NOTHING.
  uniqExpenseFile: unique("telegram_notifications_expense_file_unique").on(t.expenseId, t.fileUrl),
}));

// Журнал изменения роли «Водитель» у сотрудника (директор назначает/снимает)
export const personnelRoleAuditLog = pgTable("personnel_role_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personnelId: varchar("personnel_id").references(() => personnel.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // 'grant_driver' | 'revoke_driver'
  actorUserId: varchar("actor_user_id").references(() => users.id),
  details: jsonb("details"), // { actorName, personnelName, ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const personnelDocuments = pgTable("personnel_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personnelId: varchar("personnel_id").references(() => personnel.id, { onDelete: "cascade" }).notNull(),
  documentType: text("document_type").notNull(), // 'emirates_id' | 'passport' | 'visa' | 'contract' | 'other'
  documentNumber: text("document_number"),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileUrl: text("file_url").notNull(),
  comment: text("comment"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Personnel advances table for tracking employee advances
export const personnelAdvances = pgTable("personnel_advances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personnelId: varchar("personnel_id").references(() => personnel.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount in AED
  date: timestamp("date").notNull(), // Date of advance
  reason: text("reason"), // Reason/comment for advance
  projectId: varchar("project_id").references(() => projects.id), // Optional project link
  fileUrl: text("file_url"), // Optional receipt/proof file
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  status: varchar("status").default("active").notNull(), // Status: active, cancelled
  cancelledAt: timestamp("cancelled_at"), // When advance was cancelled
  cancelledBy: varchar("cancelled_by").references(() => users.id), // Who cancelled
  cancellationReason: text("cancellation_reason"), // Reason for cancellation
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  projects: many(projects),
  expenses: many(expenses),
  userProjects: many(userProjects),
  documents: many(documents),
  advances: many(advances),
  customerAdvances: many(customerAdvances),
  ownerInvestments: many(ownerInvestments),
  contractors: many(contractors),
  contractorProjects: many(contractorProjects),
  clients: many(clients),
  clientProjects: many(clientProjects),
  clientPayments: many(clientPayments),
  personnel: many(personnel),
  personnelDocuments: many(personnelDocuments),
  createdByUser: one(users, {
    fields: [users.createdBy],
    references: [users.id],
  }),
}));

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [contractors.createdBy],
    references: [users.id],
  }),
  contractorProjects: many(contractorProjects),
  expenses: many(expenses),
}));

export const contractorProjectsRelations = relations(contractorProjects, ({ one }) => ({
  contractor: one(contractors, {
    fields: [contractorProjects.contractorId],
    references: [contractors.id],
  }),
  project: one(projects, {
    fields: [contractorProjects.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [contractorProjects.createdBy],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  expenses: many(expenses),
  documents: many(documents),
  advances: many(advances),
  customerAdvances: many(customerAdvances),
  userProjects: many(userProjects),
  ownerInvestments: many(ownerInvestments),
  contractorProjects: many(contractorProjects),
  clientProjects: many(clientProjects),
  clientPayments: many(clientPayments),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  contractor: one(contractors, {
    fields: [expenses.contractorId],
    references: [contractors.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const advancesRelations = relations(advances, ({ one }) => ({
  project: one(projects, {
    fields: [advances.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [advances.createdBy],
    references: [users.id],
  }),
}));

export const customerAdvancesRelations = relations(customerAdvances, ({ one }) => ({
  project: one(projects, {
    fields: [customerAdvances.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [customerAdvances.createdBy],
    references: [users.id],
  }),
}));

export const revenuesRelations = relations(revenues, ({ one }) => ({
  project: one(projects, {
    fields: [revenues.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [revenues.createdBy],
    references: [users.id],
  }),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
  user: one(users, {
    fields: [userProjects.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [userProjects.projectId],
    references: [projects.id],
  }),
}));

export const ownerInvestmentsRelations = relations(ownerInvestments, ({ one }) => ({
  project: one(projects, {
    fields: [ownerInvestments.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [ownerInvestments.createdBy],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
  clientProjects: many(clientProjects),
  clientPayments: many(clientPayments),
}));

export const clientProjectsRelations = relations(clientProjects, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientProjects.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [clientProjects.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [clientProjects.createdBy],
    references: [users.id],
  }),
  clientPayments: many(clientPayments),
}));

export const clientPaymentsRelations = relations(clientPayments, ({ one }) => ({
  client: one(clients, {
    fields: [clientPayments.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [clientPayments.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [clientPayments.createdBy],
    references: [users.id],
  }),
}));

export const toolsRelations = relations(tools, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tools.createdBy],
    references: [users.id],
  }),
  movements: many(toolMovements),
}));

export const toolMovementsRelations = relations(toolMovements, ({ one }) => ({
  tool: one(tools, {
    fields: [toolMovements.toolId],
    references: [tools.id],
  }),
  createdBy: one(users, {
    fields: [toolMovements.createdBy],
    references: [users.id],
  }),
}));

// Personnel advances relations
export const personnelAdvancesRelations = relations(personnelAdvances, ({ one }) => ({
  personnel: one(personnel, {
    fields: [personnelAdvances.personnelId],
    references: [personnel.id],
  }),
  project: one(projects, {
    fields: [personnelAdvances.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [personnelAdvances.createdBy],
    references: [users.id],
  }),
  cancelledByUser: one(users, {
    fields: [personnelAdvances.cancelledBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalCost: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  startDate: z.union([
    z.date(), 
    z.string().transform((str) => str === '' ? null : new Date(str))
  ]).optional().nullable(),
  endDate: z.union([
    z.date(), 
    z.string().transform((str) => str === '' ? null : new Date(str))
  ]).optional().nullable(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertAdvanceSchema = createInsertSchema(advances).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  date: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]),
});

export const insertCustomerAdvanceSchema = createInsertSchema(customerAdvances).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  date: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]),
});

export const insertRevenueSchema = createInsertSchema(revenues).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  date: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]),
});

export const insertUserProjectSchema = createInsertSchema(userProjects).omit({
  id: true,
  createdAt: true,
});

export const insertOwnerInvestmentSchema = createInsertSchema(ownerInvestments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  date: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]),
});

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
  createdAt: true,
});

export const insertContractorProjectSchema = createInsertSchema(contractorProjects).omit({
  id: true,
  createdAt: true,
}).extend({
  budget: z.union([
    z.number(),
    z.string().transform((str) => str === '' ? null : parseFloat(str))
  ]).optional().nullable(),
  startDate: z.union([
    z.date(), 
    z.string().transform((str) => str === '' ? null : new Date(str))
  ]).optional().nullable(),
  endDate: z.union([
    z.date(), 
    z.string().transform((str) => str === '' ? null : new Date(str))
  ]).optional().nullable(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertClientProjectSchema = createInsertSchema(clientProjects).omit({
  id: true,
  createdAt: true,
}).extend({
  projectId: z.string().min(1, "Проект обязателен для заполнения"),
  contractAmount: z.union([
    z.number(),
    z.string().transform((str) => str === '' ? null : parseFloat(str))
  ]).optional().nullable(),
  contractDate: z.union([
    z.date(), 
    z.string().transform((str) => str === '' ? null : new Date(str))
  ]).optional().nullable(),
  contractNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  clientId: z.string().optional(),
  createdBy: z.string().optional(),
});

export const insertClientPaymentSchema = createInsertSchema(clientPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  paymentDate: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]),
});

export const insertClientEmployeeSchema = createInsertSchema(clientEmployees).omit({
  id: true,
  assignedAt: true,
});

// Personnel advances insert schema
export const insertPersonnelAdvanceSchema = createInsertSchema(personnelAdvances).omit({
  id: true,
  createdAt: true,
  cancelledAt: true,
  cancelledBy: true,
  cancellationReason: true,
}).extend({
  amount: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str))
  ]),
  date: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Advance = typeof advances.$inferSelect;
export type InsertAdvance = z.infer<typeof insertAdvanceSchema>;
export type CustomerAdvance = typeof customerAdvances.$inferSelect;
export type InsertCustomerAdvance = z.infer<typeof insertCustomerAdvanceSchema>;
export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type UserProject = typeof userProjects.$inferSelect;
export type InsertUserProject = z.infer<typeof insertUserProjectSchema>;
export type OwnerInvestment = typeof ownerInvestments.$inferSelect;
export type InsertOwnerInvestment = z.infer<typeof insertOwnerInvestmentSchema>;
export type Contractor = typeof contractors.$inferSelect;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type ContractorProject = typeof contractorProjects.$inferSelect;
export type InsertContractorProject = z.infer<typeof insertContractorProjectSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientProject = typeof clientProjects.$inferSelect;
export type InsertClientProject = z.infer<typeof insertClientProjectSchema>;
export type ClientPayment = typeof clientPayments.$inferSelect;
export type InsertClientPayment = z.infer<typeof insertClientPaymentSchema>;

export type ClientEmployee = typeof clientEmployees.$inferSelect;
export type InsertClientEmployee = z.infer<typeof insertClientEmployeeSchema>;

// Personnel advance type (other personnel types are defined later)
export type PersonnelAdvance = typeof personnelAdvances.$inferSelect;
export type InsertPersonnelAdvance = z.infer<typeof insertPersonnelAdvanceSchema>;

// Tool schemas
export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cost: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str || "0"))
  ]),
});

export const insertToolMovementSchema = createInsertSchema(toolMovements).omit({
  id: true,
  createdAt: true,
}).extend({
  eventTime: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ]).optional(),
  personPhone: z.string().min(1, "Телефон обязателен").regex(/^[\+]?[0-9\-\(\)\s]+$/, "Неверный формат телефона"),
});

export const insertToolPersonSchema = createInsertSchema(toolPersons).omit({
  id: true,
  createdAt: true,
});

// Tool types
export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
export type ToolMovement = typeof toolMovements.$inferSelect;
export type InsertToolMovement = z.infer<typeof insertToolMovementSchema>;
export type ToolPerson = typeof toolPersons.$inferSelect;
export type InsertToolPerson = z.infer<typeof insertToolPersonSchema>;

// Implementation sheets (Листы реализации)
export const implementationSheets = pgTable("implementation_sheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  sourceDocumentId: varchar("source_document_id").references(() => documents.id), // Ссылка на исходный документ сметы
  name: text("name").notNull(),
  status: text("status").default("active"), // 'active' | 'completed' | 'draft'
  totalProgress: decimal("total_progress", { precision: 5, scale: 2 }).default("0"), // Общий прогресс 0-100
  autoGenerated: boolean("auto_generated").default(false), // Автоматически сгенерировано из документа
  parsedFromFormat: text("parsed_from_format"), // PDF, XLSX, CSV - формат исходного документа
  parseErrors: jsonb("parse_errors").$type<string[]>(), // Ошибки парсинга, если были
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const implementationItems = pgTable("implementation_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sheetId: varchar("sheet_id").references(() => implementationSheets.id).notNull(),
  position: integer("position").notNull(), // Порядковый номер позиции
  name: text("name").notNull(), // Наименование работы
  quantity: decimal("quantity", { precision: 12, scale: 3 }), // Количество
  unit: text("unit"), // Единица измерения
  price: decimal("price", { precision: 12, scale: 2 }), // Цена за единицу
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }), // Общая стоимость
  description: text("description"), // Описание/примечание
  progress: integer("progress").default(0), // Прогресс 0-100
  isCompleted: boolean("is_completed").default(false), // Выполнено полностью
  visibleToClient: boolean("visible_to_client").default(true), // Видимость для клиента
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const implementationItemComments = pgTable("implementation_item_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").references(() => implementationItems.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id).notNull(), // Для быстрого доступа
  authorId: varchar("author_id").references(() => users.id).notNull(),
  text: text("text").notNull(),
  visibleToClient: boolean("visible_to_client").default(false), // false = внутренний, true = для заказчика
  isDeleted: boolean("is_deleted").default(false), // Мягкое удаление для истории
  deletedBy: varchar("deleted_by").references(() => users.id),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const implementationPhotos = pgTable("implementation_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").references(() => implementationItems.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"), // URL миниатюры
  caption: text("caption"), // Подпись к фото
  visibleToClient: boolean("visible_to_client").default(false), // Показывать заказчику
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const implementationChangeLogs = pgTable("implementation_change_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").references(() => implementationItems.id).notNull(),
  changeType: text("change_type").notNull(), // 'progress' | 'status' | 'photo_added' | 'photo_removed'
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: varchar("changed_by").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
});

// Relations for implementation sheets
export const implementationSheetsRelations = relations(implementationSheets, ({ one, many }) => ({
  project: one(projects, {
    fields: [implementationSheets.projectId],
    references: [projects.id],
  }),
  sourceDocument: one(documents, {
    fields: [implementationSheets.sourceDocumentId],
    references: [documents.id],
  }),
  createdByUser: one(users, {
    fields: [implementationSheets.createdBy],
    references: [users.id],
  }),
  items: many(implementationItems),
}));

export const implementationItemsRelations = relations(implementationItems, ({ one, many }) => ({
  sheet: one(implementationSheets, {
    fields: [implementationItems.sheetId],
    references: [implementationSheets.id],
  }),
  lastUpdatedByUser: one(users, {
    fields: [implementationItems.lastUpdatedBy],
    references: [users.id],
  }),
  photos: many(implementationPhotos),
  changeLogs: many(implementationChangeLogs),
  comments: many(implementationItemComments),
}));

export const implementationItemCommentsRelations = relations(implementationItemComments, ({ one }) => ({
  item: one(implementationItems, {
    fields: [implementationItemComments.itemId],
    references: [implementationItems.id],
  }),
  project: one(projects, {
    fields: [implementationItemComments.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [implementationItemComments.authorId],
    references: [users.id],
  }),
  deletedByUser: one(users, {
    fields: [implementationItemComments.deletedBy],
    references: [users.id],
  }),
}));

export const implementationPhotosRelations = relations(implementationPhotos, ({ one }) => ({
  item: one(implementationItems, {
    fields: [implementationPhotos.itemId],
    references: [implementationItems.id],
  }),
  uploadedByUser: one(users, {
    fields: [implementationPhotos.uploadedBy],
    references: [users.id],
  }),
}));

// Personnel relations
export const personnelRelations = relations(personnel, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [personnel.createdBy],
    references: [users.id],
  }),
  documents: many(personnelDocuments),
  advances: many(personnelAdvances),
}));

export const personnelDocumentsRelations = relations(personnelDocuments, ({ one }) => ({
  person: one(personnel, {
    fields: [personnelDocuments.personnelId],
    references: [personnel.id],
  }),
  uploadedByUser: one(users, {
    fields: [personnelDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const personnelRoleAuditLogRelations = relations(personnelRoleAuditLog, ({ one }) => ({
  personnel: one(personnel, {
    fields: [personnelRoleAuditLog.personnelId],
    references: [personnel.id],
  }),
  actor: one(users, {
    fields: [personnelRoleAuditLog.actorUserId],
    references: [users.id],
  }),
}));

export const implementationChangeLogsRelations = relations(implementationChangeLogs, ({ one }) => ({
  item: one(implementationItems, {
    fields: [implementationChangeLogs.itemId],
    references: [implementationItems.id],
  }),
  changedByUser: one(users, {
    fields: [implementationChangeLogs.changedBy],
    references: [users.id],
  }),
}));

// Таблица истории изменений (аудит лог)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'project' | 'expense' | 'advance' | 'document' | 'tool' | 'contractor' | 'client' | 'user' | 'implementation_item'
  entityId: varchar("entity_id").notNull(), // ID объекта
  action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'upload' | 'status_change' | 'progress_change' | 'complete'
  fieldName: text("field_name"), // Название поля, которое изменилось
  oldValue: text("old_value"), // Старое значение
  newValue: text("new_value"), // Новое значение
  userId: varchar("user_id").references(() => users.id), // Кто сделал изменение (может быть null если пользователь удален)
  userName: text("user_name").notNull(), // Имя пользователя для быстрого отображения
  userRole: text("user_role").notNull(), // Роль пользователя
  projectId: varchar("project_id").references(() => projects.id), // Привязка к проекту
  metadata: jsonb("metadata"), // Дополнительные данные
  createdAt: timestamp("created_at").defaultNow(),
});

// Email уведомления
export const emailNotifications = pgTable("email_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  eventType: text("event_type").notNull(), // 'photo_uploaded' | 'item_completed' | 'progress_changed'
  projectId: varchar("project_id").references(() => projects.id),
  projectName: text("project_name"),
  itemId: varchar("item_id"), 
  itemName: text("item_name"),
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name"),
  userRole: text("user_role"),
  status: text("status").default("pending"), // 'pending' | 'sent' | 'failed'
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations для новых таблиц
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [auditLogs.projectId],
    references: [projects.id],
  }),
}));

export const emailNotificationsRelations = relations(emailNotifications, ({ one }) => ({
  project: one(projects, {
    fields: [emailNotifications.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [emailNotifications.userId],
    references: [users.id],
  }),
}));

// Админ-панель схемы
export const createUserSchema = z.object({
  username: z.string().min(3, "Логин должен содержать минимум 3 символа"),
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  role: z.enum(["admin", "director", "master", "client"], { required_error: "Выберите роль" }),
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
});

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  attemptTime: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// Админ-панель типы
export type CreateUser = z.infer<typeof createUserSchema>;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type AdminAction = typeof adminActions.$inferSelect;

// Implementation sheet schemas
export const insertImplementationSheetSchema = createInsertSchema(implementationSheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalProgress: true,
});

export const insertImplementationItemSchema = createInsertSchema(implementationItems).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true,
}).extend({
  progress: z.number().min(0).max(100),
  quantity: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str || "0"))
  ]).optional(),
  price: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str || "0"))
  ]).optional(),
  totalCost: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str || "0"))
  ]).optional(),
});

export const insertImplementationItemCommentSchema = createInsertSchema(implementationItemComments).omit({
  id: true,
  createdAt: true,
  isDeleted: true,
  deletedBy: true,
  deletedAt: true,
}).extend({
  text: z.string().min(1, "Текст комментария обязателен"),
  visibleToClient: z.boolean().default(false),
});

export const insertImplementationPhotoSchema = createInsertSchema(implementationPhotos).omit({
  id: true,
  uploadedAt: true,
});

export const insertImplementationChangeLogSchema = createInsertSchema(implementationChangeLogs).omit({
  id: true,
  changedAt: true,
});

// Implementation sheet types
export type ImplementationSheet = typeof implementationSheets.$inferSelect;
export type InsertImplementationSheet = z.infer<typeof insertImplementationSheetSchema>;
export type ImplementationItem = typeof implementationItems.$inferSelect;
export type InsertImplementationItem = z.infer<typeof insertImplementationItemSchema>;
export type ImplementationPhoto = typeof implementationPhotos.$inferSelect;
export type InsertImplementationPhoto = z.infer<typeof insertImplementationPhotoSchema>;
export type ImplementationChangeLog = typeof implementationChangeLogs.$inferSelect;
export type InsertImplementationChangeLog = z.infer<typeof insertImplementationChangeLogSchema>;

// Personnel schemas
export const insertPersonnelSchema = createInsertSchema(personnel).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  salary: z.union([
    z.number(),
    z.string().transform((str) => parseFloat(str || "0"))
  ]).optional(),
  startDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]),
  dateOfBirth: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
  emiratesIdIssueDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
  emiratesIdExpiryDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
});

export const insertPersonnelDocumentSchema = createInsertSchema(personnelDocuments).omit({
  id: true,
  createdAt: true,
}).extend({
  issueDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
  expiryDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional(),
});

// Personnel types
export type Personnel = typeof personnel.$inferSelect;
export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;
export type PersonnelDocument = typeof personnelDocuments.$inferSelect;
export type InsertPersonnelDocument = z.infer<typeof insertPersonnelDocumentSchema>;
export type PersonnelRoleAuditLog = typeof personnelRoleAuditLog.$inferSelect;
export const insertPersonnelRoleAuditLogSchema = createInsertSchema(personnelRoleAuditLog).omit({
  id: true,
  createdAt: true,
});
export type InsertPersonnelRoleAuditLog = z.infer<typeof insertPersonnelRoleAuditLogSchema>;
export type ImplementationItemComment = typeof implementationItemComments.$inferSelect;
export type InsertImplementationItemComment = z.infer<typeof insertImplementationItemCommentSchema>;

// ============================================================================
// Express-session table (управляется connect-pg-simple). Объявлена здесь
// только чтобы drizzle-kit не считал её "пропавшей" и не предлагал rename.
// ============================================================================
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// ============================================================================
// Vehicles (Автомобили / фотоконтроль) — модуль строго аддитивный.
// Существующие сущности не меняются, только новые таблицы.
// ============================================================================
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  plateNumber: text("plate_number").notNull(),
  vin: text("vin"),
  color: text("color"),
  photoUrl: text("photo_url"),
  assignedPersonnelId: varchar("assigned_personnel_id").references(() => personnel.id),
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vehiclePhotoControls = pgTable("vehicle_photo_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
  performedByUserId: varchar("performed_by_user_id").references(() => users.id).notNull(),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  weekKey: text("week_key").notNull(), // 'YYYY-WW' (ISO неделя по серверному времени GST)
  mileageKm: integer("mileage_km").notNull(),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("completed"), // 'completed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehiclePhotoControlPhotos = pgTable("vehicle_photo_control_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  controlId: varchar("control_id").references(() => vehiclePhotoControls.id, { onDelete: "cascade" }).notNull(),
  step: integer("step").notNull(), // 1..8
  label: text("label").notNull(),
  photoUrl: text("photo_url").notNull(),
  takenAt: timestamp("taken_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicleAuditLog = pgTable("vehicle_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // 'create' | 'update' | 'archive' | 'restore' | 'reassign' | 'photo_control' | 'mileage_correction'
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  assignedPersonnel: one(personnel, { fields: [vehicles.assignedPersonnelId], references: [personnel.id] }),
  photoControls: many(vehiclePhotoControls),
}));

export const vehiclePhotoControlsRelations = relations(vehiclePhotoControls, ({ one, many }) => ({
  vehicle: one(vehicles, { fields: [vehiclePhotoControls.vehicleId], references: [vehicles.id] }),
  performedBy: one(users, { fields: [vehiclePhotoControls.performedByUserId], references: [users.id] }),
  photos: many(vehiclePhotoControlPhotos),
}));

export const vehiclePhotoControlPhotosRelations = relations(vehiclePhotoControlPhotos, ({ one }) => ({
  control: one(vehiclePhotoControls, { fields: [vehiclePhotoControlPhotos.controlId], references: [vehiclePhotoControls.id] }),
}));

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  year: z.union([
    z.number().int(),
    z.string().transform((s) => (s ? parseInt(s, 10) : undefined as any)),
  ]).optional(),
});

export const insertVehiclePhotoControlSchema = createInsertSchema(vehiclePhotoControls).omit({
  id: true,
  createdAt: true,
}).extend({
  performedAt: z.union([
    z.date(),
    z.string().transform((s) => new Date(s)),
  ]).optional(),
  mileageKm: z.union([
    z.number().int(),
    z.string().transform((s) => parseInt(s, 10)),
  ]),
});

export const insertVehiclePhotoControlPhotoSchema = createInsertSchema(vehiclePhotoControlPhotos).omit({
  id: true,
  createdAt: true,
}).extend({
  step: z.union([
    z.number().int(),
    z.string().transform((s) => parseInt(s, 10)),
  ]),
  takenAt: z.union([
    z.date(),
    z.string().transform((s) => new Date(s)),
  ]),
});

export const insertVehicleAuditLogSchema = createInsertSchema(vehicleAuditLog).omit({
  id: true,
  createdAt: true,
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type VehiclePhotoControl = typeof vehiclePhotoControls.$inferSelect;
export type InsertVehiclePhotoControl = z.infer<typeof insertVehiclePhotoControlSchema>;
export type VehiclePhotoControlPhoto = typeof vehiclePhotoControlPhotos.$inferSelect;
export type InsertVehiclePhotoControlPhoto = z.infer<typeof insertVehiclePhotoControlPhotoSchema>;
export type VehicleAuditLog = typeof vehicleAuditLog.$inferSelect;
export type InsertVehicleAuditLog = z.infer<typeof insertVehicleAuditLogSchema>;
