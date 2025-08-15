import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced users table for secure authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  login: text("login").notNull().unique(), // Primary login field
  password_hash: text("password_hash").notNull(),
  password_algo: text("password_algo").notNull().default("argon2id"),
  name: text("name"),
  role: text("role").notNull().default("user"), // 'user' | 'admin' | 'director' | 'master'
  is_blocked: boolean("is_blocked").notNull().default(false),
  mfa_enabled: boolean("mfa_enabled").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"), // Soft delete
  last_login_at: timestamp("last_login_at"),
  // Legacy fields for compatibility
  username: text("username").unique(), // Keep for migration
  password: text("password"), // Keep for migration
  isActive: boolean("is_active").default(true), // Keep for migration
  lastLogin: timestamp("last_login"), // Keep for migration
});

// User sessions for JWT refresh tokens
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  refresh_token_hash: text("refresh_token_hash").notNull(),
  user_agent: text("user_agent"),
  device_label: text("device_label"),
  ip_hash: text("ip_hash"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  last_used_at: timestamp("last_used_at").notNull().defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
  revoked_at: timestamp("revoked_at"),
});

// Login attempts tracking for rate limiting and security
export const login_attempts = pgTable("login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").references(() => users.id), // nullable for failed login attempts
  ip_hash: text("ip_hash").notNull(),
  login_attempted: text("login_attempted"),
  result: text("result").notNull(), // 'success' | 'failed' | 'locked' | 'blocked'
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// MFA TOTP secrets (optional)
export const mfa_totp = pgTable("mfa_totp", {
  user_id: varchar("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  secret_encrypted: text("secret_encrypted").notNull(),
  recovery_codes: jsonb("recovery_codes"), // Array of encrypted recovery codes
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
  sessions: many(sessions),
  loginAttempts: many(login_attempts),
  mfaTotp: many(mfa_totp),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));

export const loginAttemptsRelations = relations(login_attempts, ({ one }) => ({
  user: one(users, {
    fields: [login_attempts.user_id],
    references: [users.id],
  }),
}));

export const mfaTotpRelations = relations(mfa_totp, ({ one }) => ({
  user: one(users, {
    fields: [mfa_totp.user_id],
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

// New authentication schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  created_at: true,
  last_used_at: true,
});

export const insertLoginAttemptSchema = createInsertSchema(login_attempts).omit({
  id: true,
  created_at: true,
});

export const insertMfaTotpSchema = createInsertSchema(mfa_totp).omit({
  created_at: true,
  updated_at: true,
});

// Enhanced login schema for new auth system (supports both username and login)
export const loginSchema = z.object({
  login: z.string().min(1, "Login is required").optional(),
  username: z.string().min(1, "Username is required").optional(),
  password: z.string().min(1, "Password is required"),
  mfa_code: z.string().optional(),
  remember_device: z.boolean().optional().default(false),
}).refine(data => data.login || data.username, {
  message: "Either login or username is required",
});

// User creation schema for admin
export const createUserSchema = z.object({
  login: z.string().min(3, "Login must be at least 3 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  role: z.enum(["user", "admin", "director", "master"]).default("user"),
  mfa_enabled: z.boolean().default(false),
});

// Password reset schema
export const resetPasswordSchema = z.object({
  user_id: z.string(),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

// Admin user management schemas
export const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["user", "admin", "director", "master"]).optional(),
  mfa_enabled: z.boolean().optional(),
  is_blocked: z.boolean().optional(),
});

// Types for new schemas
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type InsertMfaTotp = z.infer<typeof insertMfaTotpSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type ToolPerson = typeof toolPersons.$inferSelect;
export type InsertToolPerson = z.infer<typeof insertToolPersonSchema>;
