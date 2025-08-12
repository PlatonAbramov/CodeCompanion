import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'director' | 'master'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
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
