import { 
  users, projects, expenses, documents, advances, customerAdvances, userProjects, revenues, ownerInvestments,
  contractors, contractorProjects,
  type User, type InsertUser, type Project, type InsertProject,
  type Expense, type InsertExpense, type Document, type InsertDocument,
  type Advance, type InsertAdvance, type CustomerAdvance, type InsertCustomerAdvance,
  type Revenue, type InsertRevenue, type UserProject, type InsertUserProject,
  type OwnerInvestment, type InsertOwnerInvestment,
  type Contractor, type InsertContractor, type ContractorProject, type InsertContractorProject
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
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  
  // Documents
  getProjectDocuments(projectId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Advances
  getProjectAdvances(projectId: string): Promise<Advance[]>;
  createAdvance(advance: InsertAdvance): Promise<Advance>;
  updateAdvance(id: string, advance: Partial<InsertAdvance>): Promise<Advance>;
  deleteAdvance(id: string): Promise<void>;
  
  // Customer Advances
  getProjectCustomerAdvances(projectId: string): Promise<CustomerAdvance[]>;
  createCustomerAdvance(customerAdvance: InsertCustomerAdvance): Promise<CustomerAdvance>;
  updateCustomerAdvance(id: string, customerAdvance: Partial<InsertCustomerAdvance>): Promise<CustomerAdvance>;
  deleteCustomerAdvance(id: string): Promise<void>;
  
  // Revenues
  getProjectRevenues(projectId: string): Promise<any[]>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  updateRevenue(id: string, revenue: Partial<InsertRevenue>): Promise<Revenue>;
  deleteRevenue(id: string): Promise<void>;
  
  // User Projects
  assignUserToProject(userId: string, projectId: string): Promise<UserProject>;
  
  // Owner Investments
  getProjectOwnerInvestments(projectId: string): Promise<OwnerInvestment[]>;
  getOwnerInvestment(id: string): Promise<OwnerInvestment | undefined>;
  createOwnerInvestment(ownerInvestment: InsertOwnerInvestment): Promise<OwnerInvestment>;
  updateOwnerInvestment(id: string, ownerInvestment: Partial<InsertOwnerInvestment>): Promise<OwnerInvestment>;
  deleteOwnerInvestment(id: string): Promise<void>;
  
  // Contractors
  getAllContractors(): Promise<Contractor[]>;
  getContractor(id: string): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  updateContractor(id: string, contractor: Partial<InsertContractor>): Promise<Contractor>;
  deleteContractor(id: string): Promise<void>;
  getContractorStats(contractorId: string): Promise<{
    totalExpenses: number;
    totalProjects: number;
    averageExpenseAmount: number;
  }>;
  getContractorExpenses(contractorId: string): Promise<{
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    projectId: string;
    projectName: string;
  }[]>;
  
  // Contractor Projects
  getProjectContractors(projectId: string): Promise<(ContractorProject & { contractor: Contractor })[]>;
  getContractorProjects(contractorId: string): Promise<Array<{
    id: string;
    projectId: string;
    projectName: string;
    budgetAllocation: number;
    workDescription: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
  }>>;
  getContractorProjectAssignment(assignmentId: string): Promise<{
    id: string;
    contractorId: string;
    projectId: string;
    projectName: string;
    budgetAllocation: number;
    workDescription: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
  } | undefined>;
  assignContractorToProject(contractorProject: InsertContractorProject): Promise<ContractorProject>;
  updateContractorProject(id: string, contractorProject: Partial<InsertContractorProject>): Promise<ContractorProject>;
  removeContractorFromProject(id: string): Promise<void>;
  
  // Analytics
  getProjectFinancialSummary(projectId: string): Promise<{
    totalCost: string;
    totalAdvances: string;
    totalCustomerAdvances: string;
    totalRevenues: string;
    totalExpenses: string;
    currentProfit: string;
    projectedProfit: string;
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

  async getProjectExpenses(projectId: string): Promise<(Expense & { user: { name: string }, contractor?: { name: string, company?: string } })[]> {
    const result = await db
      .select({
        expense: expenses,
        user: { name: users.name },
        contractor: { name: contractors.name, company: contractors.company }
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .leftJoin(contractors, eq(expenses.contractorId, contractors.id))
      .where(eq(expenses.projectId, projectId))
      .orderBy(desc(expenses.createdAt));
    
    return result.map(r => ({ 
      ...r.expense, 
      user: r.user,
      contractor: r.contractor?.name ? { 
        name: r.contractor.name, 
        company: r.contractor.company || undefined 
      } : undefined
    }));
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

  async getProjectRevenues(projectId: string): Promise<any[]> {
    return await db
      .select({
        id: revenues.id,
        amount: revenues.amount,
        source: revenues.source,
        description: revenues.description,
        date: revenues.date,
        createdAt: revenues.createdAt,
        user: {
          name: users.name
        }
      })
      .from(revenues)
      .innerJoin(users, eq(revenues.createdBy, users.id))
      .where(eq(revenues.projectId, projectId))
      .orderBy(desc(revenues.date));
  }

  async createRevenue(revenue: InsertRevenue): Promise<Revenue> {
    const [result] = await db.insert(revenues).values(revenue).returning();
    return result;
  }

  async updateRevenue(id: string, revenue: Partial<InsertRevenue>): Promise<Revenue> {
    const [result] = await db.update(revenues).set(revenue).where(eq(revenues.id, id)).returning();
    return result;
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
    totalRevenues: string;
    totalExpenses: string;
    totalOwnerInvestments: string;
    currentProfit: string;
    projectedProfit: string;
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

    const [revenuesSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${revenues.amount}), 0)` 
      })
      .from(revenues)
      .where(eq(revenues.projectId, projectId));

    const [ownerInvestmentsSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${ownerInvestments.amount}), 0)` 
      })
      .from(ownerInvestments)
      .where(eq(ownerInvestments.projectId, projectId));

    const totalCost = project.totalCost;
    const totalAdvances = advancesSum?.total || "0";
    const totalCustomerAdvances = customerAdvancesSum?.total || "0";
    const totalRevenues = revenuesSum?.total || "0";
    const totalExpenses = expensesSum?.total || "0";
    const totalOwnerInvestments = ownerInvestmentsSum?.total || "0";
    
    // Прибыль на данный момент = аванс от заказчика - взятые авансы собственников - расходы - собственные вложения
    const currentProfit = (
      parseFloat(totalCustomerAdvances) - 
      parseFloat(totalAdvances) - 
      parseFloat(totalExpenses) - 
      parseFloat(totalOwnerInvestments)
    ).toString();
    
    // Прогнозируемая прибыль = общая стоимость проекта - взятые авансы собственников - расходы - собственные вложения
    const projectedProfit = (
      parseFloat(totalCost) - 
      parseFloat(totalAdvances) - 
      parseFloat(totalExpenses) - 
      parseFloat(totalOwnerInvestments)
    ).toString();

    return {
      totalCost,
      totalAdvances,
      totalCustomerAdvances,
      totalRevenues,
      totalExpenses,
      totalOwnerInvestments,
      currentProfit,
      projectedProfit
    };
  }

  async updateAdvance(id: string, advance: Partial<InsertAdvance>): Promise<Advance> {
    const [updatedAdvance] = await db
      .update(advances)
      .set(advance)
      .where(eq(advances.id, id))
      .returning();
    return updatedAdvance;
  }

  async updateCustomerAdvance(id: string, customerAdvance: Partial<InsertCustomerAdvance>): Promise<CustomerAdvance> {
    const [updatedCustomerAdvance] = await db
      .update(customerAdvances)
      .set(customerAdvance)
      .where(eq(customerAdvances.id, id))
      .returning();
    return updatedCustomerAdvance;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set(expense)
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteAdvance(id: string): Promise<void> {
    await db.delete(advances).where(eq(advances.id, id));
  }

  async deleteCustomerAdvance(id: string): Promise<void> {
    await db.delete(customerAdvances).where(eq(customerAdvances.id, id));
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async deleteRevenue(id: string): Promise<void> {
    await db.delete(revenues).where(eq(revenues.id, id));
  }

  // Owner Investments
  async getProjectOwnerInvestments(projectId: string): Promise<OwnerInvestment[]> {
    const result = await db
      .select()
      .from(ownerInvestments)
      .where(eq(ownerInvestments.projectId, projectId))
      .orderBy(desc(ownerInvestments.date));
    return result;
  }

  async getOwnerInvestment(id: string): Promise<OwnerInvestment | undefined> {
    const [result] = await db
      .select()
      .from(ownerInvestments)
      .where(eq(ownerInvestments.id, id));
    return result || undefined;
  }

  async createOwnerInvestment(ownerInvestment: InsertOwnerInvestment): Promise<OwnerInvestment> {
    const [result] = await db
      .insert(ownerInvestments)
      .values(ownerInvestment)
      .returning();
    return result;
  }

  async updateOwnerInvestment(id: string, ownerInvestment: Partial<InsertOwnerInvestment>): Promise<OwnerInvestment> {
    const [updatedOwnerInvestment] = await db
      .update(ownerInvestments)
      .set(ownerInvestment)
      .where(eq(ownerInvestments.id, id))
      .returning();
    return updatedOwnerInvestment;
  }

  async deleteOwnerInvestment(id: string): Promise<void> {
    await db.delete(ownerInvestments).where(eq(ownerInvestments.id, id));
  }

  // Documents
  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
    return result;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [result] = await db
      .insert(documents)
      .values(document)
      .returning();
    return result;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [result] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return result || undefined;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Contractors
  async getAllContractors(): Promise<Contractor[]> {
    const result = await db
      .select()
      .from(contractors)
      .where(eq(contractors.isActive, true))
      .orderBy(contractors.name);
    return result;
  }

  async getContractor(id: string): Promise<Contractor | undefined> {
    const [result] = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, id));
    return result || undefined;
  }

  async createContractor(contractor: InsertContractor): Promise<Contractor> {
    const [result] = await db
      .insert(contractors)
      .values(contractor)
      .returning();
    return result;
  }

  async updateContractor(id: string, contractor: Partial<InsertContractor>): Promise<Contractor> {
    const [updatedContractor] = await db
      .update(contractors)
      .set(contractor)
      .where(eq(contractors.id, id))
      .returning();
    return updatedContractor;
  }

  async deleteContractor(id: string): Promise<void> {
    await db
      .update(contractors)
      .set({ isActive: false })
      .where(eq(contractors.id, id));
  }

  async getContractorExpenses(contractorId: string): Promise<Array<{
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    projectId: string;
    projectName: string;
  }>> {
    const result = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        description: expenses.description,
        createdAt: expenses.createdAt,
        projectId: expenses.projectId,
        projectName: projects.name,
      })
      .from(expenses)
      .innerJoin(projects, eq(expenses.projectId, projects.id))
      .where(eq(expenses.contractorId, contractorId))
      .orderBy(desc(expenses.createdAt));
    
    return result.map(row => ({
      ...row,
      amount: Number(row.amount),
      description: row.description || '',
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async getContractorStats(contractorId: string): Promise<{
    totalExpenses: number;
    totalProjects: number;
    averageExpenseAmount: number;
  }> {
    // Get expenses for this contractor
    const expensesResult = await db
      .select({
        amount: expenses.amount,
        projectId: expenses.projectId,
      })
      .from(expenses)
      .where(eq(expenses.contractorId, contractorId));

    if (expensesResult.length === 0) {
      return {
        totalExpenses: 0,
        totalProjects: 0,
        averageExpenseAmount: 0,
      };
    }

    const totalExpenses = expensesResult.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const uniqueProjects = new Set(expensesResult.map(e => e.projectId));
    const totalProjects = uniqueProjects.size;
    const averageExpenseAmount = totalExpenses / expensesResult.length;

    return {
      totalExpenses,
      totalProjects,
      averageExpenseAmount,
    };
  }

  // Contractor Projects
  async getProjectContractors(projectId: string): Promise<(ContractorProject & { contractor: Contractor })[]> {
    const result = await db
      .select()
      .from(contractorProjects)
      .innerJoin(contractors, eq(contractorProjects.contractorId, contractors.id))
      .where(and(
        eq(contractorProjects.projectId, projectId),
        eq(contractors.isActive, true)
      ))
      .orderBy(contractors.name);
    
    return result.map(row => ({
      ...row.contractor_projects,
      contractor: row.contractors
    }));
  }

  async getContractorProjects(contractorId: string): Promise<Array<{
    id: string;
    projectId: string;
    projectName: string;
    budgetAllocation: number;
    workDescription: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
  }>> {
    const result = await db
      .select({
        id: contractorProjects.id,
        projectId: contractorProjects.projectId,
        projectName: projects.name,
        budgetAllocation: contractorProjects.budget,
        workDescription: contractorProjects.description,
        startDate: contractorProjects.startDate,
        endDate: contractorProjects.endDate,
        isActive: contractorProjects.status,
      })
      .from(contractorProjects)
      .innerJoin(projects, eq(contractorProjects.projectId, projects.id))
      .where(eq(contractorProjects.contractorId, contractorId))
      .orderBy(projects.name);
    
    return result.map(row => ({
      ...row,
      budgetAllocation: Number(row.budgetAllocation || '0'),
      workDescription: row.workDescription || '',
      startDate: row.startDate?.toISOString() || new Date().toISOString(),
      endDate: row.endDate?.toISOString(),
      isActive: row.isActive === 'active',
    }));
  }

  async getContractorProjectAssignment(assignmentId: string): Promise<{
    id: string;
    contractorId: string;
    projectId: string;
    projectName: string;
    budgetAllocation: number;
    workDescription: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
  } | undefined> {
    const result = await db
      .select({
        id: contractorProjects.id,
        contractorId: contractorProjects.contractorId,
        projectId: contractorProjects.projectId,
        projectName: projects.name,
        budgetAllocation: contractorProjects.budget,
        workDescription: contractorProjects.description,
        startDate: contractorProjects.startDate,
        endDate: contractorProjects.endDate,
        isActive: contractorProjects.status,
      })
      .from(contractorProjects)
      .innerJoin(projects, eq(contractorProjects.projectId, projects.id))
      .where(eq(contractorProjects.id, assignmentId))
      .limit(1);

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    return {
      id: row.id,
      contractorId: row.contractorId,
      projectId: row.projectId,
      projectName: row.projectName,
      budgetAllocation: Number(row.budgetAllocation || '0'),
      workDescription: row.workDescription || '',
      startDate: row.startDate?.toISOString() || new Date().toISOString(),
      endDate: row.endDate?.toISOString(),
      isActive: row.isActive === 'active',
    };
  }

  async assignContractorToProject(contractorProject: InsertContractorProject): Promise<ContractorProject> {
    const [result] = await db
      .insert(contractorProjects)
      .values(contractorProject)
      .returning();
    return result;
  }

  async updateContractorProject(id: string, contractorProject: Partial<InsertContractorProject>): Promise<ContractorProject> {
    const [updatedContractorProject] = await db
      .update(contractorProjects)
      .set(contractorProject)
      .where(eq(contractorProjects.id, id))
      .returning();
    return updatedContractorProject;
  }

  async removeContractorFromProject(id: string): Promise<void> {
    await db.delete(contractorProjects).where(eq(contractorProjects.id, id));
  }
}

export const storage = new DatabaseStorage();
