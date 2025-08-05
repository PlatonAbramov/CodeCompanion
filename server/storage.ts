import { 
  users, projects, expenses, documents, advances, customerAdvances, userProjects,
  type User, type InsertUser, type Project, type InsertProject,
  type Expense, type InsertExpense, type Document, type InsertDocument,
  type Advance, type InsertAdvance, type CustomerAdvance, type InsertCustomerAdvance,
  type UserProject, type InsertUserProject
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  getUserProjects(userId: string): Promise<Project[]>;
  
  // Expenses
  getProjectExpenses(projectId: string): Promise<(Expense & { user: { name: string } })[]>;
  getUserExpenses(userId: string): Promise<(Expense & { project: { name: string } })[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  
  // Documents
  getProjectDocuments(projectId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Advances
  getProjectAdvances(projectId: string): Promise<Advance[]>;
  createAdvance(advance: InsertAdvance): Promise<Advance>;
  
  // Customer Advances
  getProjectCustomerAdvances(projectId: string): Promise<CustomerAdvance[]>;
  createCustomerAdvance(customerAdvance: InsertCustomerAdvance): Promise<CustomerAdvance>;
  
  // User Projects
  assignUserToProject(userId: string, projectId: string): Promise<UserProject>;
  
  // Analytics
  getProjectFinancialSummary(projectId: string): Promise<{
    totalCost: string;
    totalAdvances: string;
    totalCustomerAdvances: string;
    totalExpenses: string;
    profit: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const userProjectsList = await db
      .select({ project: projects })
      .from(userProjects)
      .innerJoin(projects, eq(userProjects.projectId, projects.id))
      .where(eq(userProjects.userId, userId));
    
    return userProjectsList.map(up => up.project);
  }

  async getProjectExpenses(projectId: string): Promise<(Expense & { user: { name: string } })[]> {
    const result = await db
      .select({
        expense: expenses,
        user: { name: users.name }
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .where(eq(expenses.projectId, projectId))
      .orderBy(desc(expenses.createdAt));
    
    return result.map(r => ({ ...r.expense, user: r.user }));
  }

  async getUserExpenses(userId: string): Promise<(Expense & { project: { name: string } })[]> {
    const result = await db
      .select({
        expense: expenses,
        project: { name: projects.name }
      })
      .from(expenses)
      .innerJoin(projects, eq(expenses.projectId, projects.id))
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.createdAt));
    
    return result.map(r => ({ ...r.expense, project: r.project }));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async getProjectAdvances(projectId: string): Promise<Advance[]> {
    return await db
      .select()
      .from(advances)
      .where(eq(advances.projectId, projectId))
      .orderBy(desc(advances.createdAt));
  }

  async createAdvance(advance: InsertAdvance): Promise<Advance> {
    const [newAdvance] = await db
      .insert(advances)
      .values(advance)
      .returning();
    return newAdvance;
  }

  async getProjectCustomerAdvances(projectId: string): Promise<CustomerAdvance[]> {
    return db.select()
      .from(customerAdvances)
      .where(eq(customerAdvances.projectId, projectId))
      .orderBy(desc(customerAdvances.createdAt));
  }

  async createCustomerAdvance(customerAdvance: InsertCustomerAdvance): Promise<CustomerAdvance> {
    const [newCustomerAdvance] = await db
      .insert(customerAdvances)
      .values(customerAdvance)
      .returning();
    return newCustomerAdvance;
  }

  async assignUserToProject(userId: string, projectId: string): Promise<UserProject> {
    const [userProject] = await db
      .insert(userProjects)
      .values({ userId, projectId })
      .returning();
    return userProject;
  }

  async getProjectFinancialSummary(projectId: string): Promise<{
    totalCost: string;
    totalAdvances: string;
    totalCustomerAdvances: string;
    totalExpenses: string;
    profit: string;
  }> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      throw new Error("Project not found");
    }

    const [advancesSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${advances.amount}), 0)` 
      })
      .from(advances)
      .where(eq(advances.projectId, projectId));

    const [customerAdvancesSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${customerAdvances.amount}), 0)` 
      })
      .from(customerAdvances)
      .where(eq(customerAdvances.projectId, projectId));

    const [expensesSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` 
      })
      .from(expenses)
      .where(eq(expenses.projectId, projectId));

    const totalCost = project.totalCost;
    const totalAdvances = advancesSum?.total || "0";
    const totalCustomerAdvances = customerAdvancesSum?.total || "0";
    const totalExpenses = expensesSum?.total || "0";
    const profit = (parseFloat(totalCost) - parseFloat(totalExpenses)).toString();

    return {
      totalCost,
      totalAdvances,
      totalCustomerAdvances,
      totalExpenses,
      profit
    };
  }
}

export const storage = new DatabaseStorage();
