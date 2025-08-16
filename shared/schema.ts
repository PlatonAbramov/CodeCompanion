import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
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
  status: text("status").default("active"), // 'active' | 'completed' | 'paused'
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
  userId: varchar("user_id").references(() => users.id).notNull(),
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
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
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

// Админ-панель схемы
export const createUserSchema = z.object({
  username: z.string().min(3, "Логин должен содержать минимум 3 символа"),
  email: z.string().email("Некорректный email").optional(),
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
