import { 
  users, projects, expenses, documents, advances, customerAdvances, userProjects, revenues, ownerInvestments,
  contractors, contractorProjects, clients, clientProjects, clientPayments, clientEmployees,
  tools, toolMovements, toolPersons, userSessions, loginAttempts, adminActions,
  implementationSheets, implementationItems, implementationPhotos, implementationChangeLogs,
  auditLogs, emailNotifications,
  type User, type InsertUser, type Project, type InsertProject,
  type Expense, type InsertExpense, type Document, type InsertDocument,
  type Advance, type InsertAdvance, type CustomerAdvance, type InsertCustomerAdvance,
  type Revenue, type InsertRevenue, type UserProject, type InsertUserProject,
  type OwnerInvestment, type InsertOwnerInvestment,
  type Contractor, type InsertContractor, type ContractorProject, type InsertContractorProject,
  type Client, type InsertClient, type ClientProject, type InsertClientProject,
  type ClientPayment, type InsertClientPayment, type ClientEmployee, type InsertClientEmployee,
  type Tool, type InsertTool, type ToolMovement, type InsertToolMovement,
  type ToolPerson, type InsertToolPerson,
  type UserSession, type InsertUserSession, type LoginAttempt, type InsertLoginAttempt,
  type AdminAction, type InsertAdminAction,
  type ImplementationSheet, type InsertImplementationSheet, type ImplementationItem, type InsertImplementationItem,
  type ImplementationPhoto, type InsertImplementationPhoto, type ImplementationChangeLog, type InsertImplementationChangeLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserBlockStatus(id: string, blocked: boolean): Promise<void>;
  updateUserPassword(id: string, password: string, mustChangePassword?: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
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
    remainingBudget: number;
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
  
  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  getClientStats(clientId: string): Promise<{
    totalPayments: number;
    totalProjects: number;
    remainingAmount: number;
  }>;
  
  // Client Projects
  getProjectClients(projectId: string): Promise<(ClientProject & { client: Client })[]>;
  getClientProjects(clientId: string): Promise<Array<{
    id: string;
    projectId: string;
    projectName: string;
    contractAmount: number;
    contractNumber?: string;
    contractDate?: string;
    description?: string;
    status: string;
  }>>;
  assignClientToProject(clientProject: InsertClientProject): Promise<ClientProject>;
  updateClientProject(id: string, clientProject: Partial<InsertClientProject>): Promise<ClientProject>;
  removeClientFromProject(id: string): Promise<void>;
  
  // Client Payments
  getClientPayments(clientId: string): Promise<Array<{
    id: string;
    amount: number;
    description?: string;
    paymentDate: string;
    paymentMethod?: string;
    projectId: string;
    projectName: string;
  }>>;
  getProjectClientPayments(projectId: string): Promise<Array<{
    id: string;
    amount: number;
    description?: string;
    paymentDate: string;
    paymentMethod?: string;
    clientId: string;
    clientName: string;
  }>>;
  createClientPayment(clientPayment: InsertClientPayment): Promise<ClientPayment>;
  updateClientPayment(id: string, clientPayment: Partial<InsertClientPayment>): Promise<ClientPayment>;
  deleteClientPayment(id: string): Promise<void>;
  
  // Client Employees
  getClientEmployees(clientId: string): Promise<User[]>;
  assignEmployeesToClient(clientId: string, employeeIds: string[]): Promise<void>;
  removeEmployeeFromClient(clientId: string, userId: string): Promise<void>;
  
  // Analytics
  getProjectFinancialSummary(projectId: string): Promise<{
    totalCost: string;
    totalAdvances: string;
    totalCustomerAdvances: string;
    totalClientPayments: string;
    totalRevenues: string;
    totalExpenses: string;
    totalOwnerInvestments: string;
    currentProfit: string;
    projectedProfit: string;
    vladAdvances: string;
    platonAdvances: string;
    vladEarnings: string;
    platonEarnings: string;
  }>;

  // Tools
  getAllTools(): Promise<(Tool & { currentPerson?: { name: string; phone: string } })[]>;
  getTool(id: string): Promise<Tool | undefined>;
  createTool(tool: InsertTool): Promise<Tool>;
  updateTool(id: string, tool: Partial<InsertTool>): Promise<Tool>;
  deleteTool(id: string): Promise<void>;
  
  // Tool Movements  
  getToolMovements(toolId: string): Promise<Array<Omit<ToolMovement, 'createdBy'> & { createdBy: { name: string } }>>;
  createToolMovement(movement: InsertToolMovement): Promise<ToolMovement>;
  
  // Tool Persons
  getRecentToolPersons(limit?: number): Promise<ToolPerson[]>;
  createOrUpdateToolPerson(person: InsertToolPerson): Promise<ToolPerson>;

  // Admin panel methods
  getUserById(id: string): Promise<User | undefined>;
  getActiveSessions(): Promise<UserSession[]>;
  getFailedLoginsToday(): Promise<LoginAttempt[]>;
  logAdminAction(action: InsertAdminAction): Promise<AdminAction>;
  getAdminActions(): Promise<AdminAction[]>;
  getLoginAttempts(): Promise<LoginAttempt[]>;
  deactivateUserSessions(userId: string): Promise<void>;
  updateUserBlockStatus(id: string, blocked: boolean): Promise<void>;
  updateUserPassword(id: string, password: string, mustChangePassword?: boolean): Promise<void>;
  
  // Implementation sheet methods
  getImplementationSheets(projectId: string): Promise<ImplementationSheet[]>;
  getImplementationSheet(id: string): Promise<ImplementationSheet | undefined>;
  createImplementationSheet(data: InsertImplementationSheet): Promise<ImplementationSheet>;
  updateImplementationSheet(id: string, data: Partial<InsertImplementationSheet>): Promise<ImplementationSheet>;
  deleteImplementationSheet(id: string): Promise<void>;
  
  // Implementation items
  getImplementationItems(sheetId: string): Promise<ImplementationItem[]>;
  getImplementationItem(id: string): Promise<ImplementationItem | undefined>;
  createImplementationItem(data: InsertImplementationItem): Promise<ImplementationItem>;
  updateImplementationItem(id: string, data: Partial<InsertImplementationItem>, userId: string): Promise<ImplementationItem>;
  deleteImplementationItem(id: string): Promise<void>;
  
  // Implementation photos
  getImplementationPhotos(itemId: string): Promise<ImplementationPhoto[]>;
  getImplementationPhoto(id: string): Promise<ImplementationPhoto | undefined>;
  createImplementationPhoto(data: InsertImplementationPhoto): Promise<ImplementationPhoto>;
  deleteImplementationPhoto(id: string, userId: string): Promise<void>;
  
  // Implementation change logs
  createImplementationChangeLog(data: InsertImplementationChangeLog): Promise<ImplementationChangeLog>;
  getImplementationChangeLogs(itemId: string): Promise<ImplementationChangeLog[]>;
  
  // Audit Logs
  createAuditLog(log: {
    entityType: string;
    entityId: string;
    action: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    userId: string;
    userName: string;
    userRole: string;
    projectId?: string;
    metadata?: any;
  }): Promise<void>;
  getProjectAuditLogs(projectId: string, filters?: {
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]>;
  getEntityAuditLogs(entityType: string, entityId: string): Promise<any[]>;
  
  // Email Notifications
  createEmailNotification(notification: {
    recipientEmail: string;
    subject: string;
    body: string;
    eventType: string;
    projectId?: string;
    projectName?: string;
    itemId?: string;
    itemName?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
  }): Promise<void>;
  getPendingNotifications(): Promise<any[]>;
  markNotificationSent(id: string): Promise<void>;
  markNotificationFailed(id: string, error: string): Promise<void>;
  
  // Analytics
  getProjectsAnalytics(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    activeCount: number;
    archivedCount: number;
    totalContractValue: number;
    totalExpenses: number;
    totalPayments: number;
    averageProgress: number;
  }>;
  getContractorAnalytics(contractorId?: string): Promise<any[]>;
  getClientAnalytics(clientId?: string): Promise<any[]>;
  getToolsAnalytics(): Promise<any>;
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
    return await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      isBlocked: users.isBlocked,
      tempPassword: users.tempPassword,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
      createdBy: users.createdBy,
      password: users.password
    }).from(users).orderBy(users.name).limit(100);
  }

  async deleteUser(id: string): Promise<void> {
    // Удаляем связанные данные пользователя
    await db.delete(userProjects).where(eq(userProjects.userId, id));
    await db.delete(userSessions).where(eq(userSessions.userId, id));
    await db.delete(loginAttempts).where(eq(loginAttempts.userId, id));
    
    // Удаляем админ-действия где этот пользователь был целью
    await db.delete(adminActions).where(eq(adminActions.targetUserId, id));
    
    // Удаляем самого пользователя
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select({
      id: projects.id,
      name: projects.name,
      location: projects.location,
      totalCost: projects.totalCost,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt
    }).from(projects).orderBy(desc(projects.createdAt)).limit(50);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject & { clientId?: string }): Promise<Project> {
    const { clientId, ...projectData } = project;
    
    const [newProject] = await db
      .insert(projects)
      .values({
        ...projectData,
        totalCost: projectData.totalCost.toString()
      })
      .returning();
    
    // Если указан clientId, автоматически связываем проект с заказчиком
    if (clientId) {
      await this.assignProjectToClient(newProject.id, clientId, newProject.totalCost);
    }
    
    return newProject;
  }

  async assignProjectToClient(projectId: string, clientId: string, contractAmount: string): Promise<void> {
    // Создаем связь между проектом и заказчиком
    await db.insert(clientProjects).values({
      clientId,
      projectId,
      contractAmount
    });
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ 
        ...project, 
        totalCost: project.totalCost ? project.totalCost.toString() : undefined,
        updatedAt: new Date() 
      })
      .where(eq(projects.id, id))
      .returning();

    // Синхронизируем contractAmount в clientProjects при изменении totalCost проекта
    if (project.totalCost !== undefined) {
      await db
        .update(clientProjects)
        .set({
          contractAmount: project.totalCost.toString()
        })
        .where(eq(clientProjects.projectId, id));
    }

    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    // Delete related data in the correct order to respect foreign key constraints
    
    // 1. Delete implementation photos and change logs
    const implementationSheetsList = await db.select().from(implementationSheets).where(eq(implementationSheets.projectId, id));
    for (const sheet of implementationSheetsList) {
      const items = await db.select().from(implementationItems).where(eq(implementationItems.sheetId, sheet.id));
      for (const item of items) {
        await db.delete(implementationPhotos).where(eq(implementationPhotos.itemId, item.id));
        await db.delete(implementationChangeLogs).where(eq(implementationChangeLogs.itemId, item.id));
      }
      await db.delete(implementationItems).where(eq(implementationItems.sheetId, sheet.id));
    }
    await db.delete(implementationSheets).where(eq(implementationSheets.projectId, id));
    
    // 2. Delete client payments
    await db.delete(clientPayments).where(eq(clientPayments.projectId, id));
    
    // 3. Delete other project-related data
    await db.delete(clientProjects).where(eq(clientProjects.projectId, id));
    await db.delete(contractorProjects).where(eq(contractorProjects.projectId, id));
    await db.delete(userProjects).where(eq(userProjects.projectId, id));
    await db.delete(expenses).where(eq(expenses.projectId, id));
    await db.delete(documents).where(eq(documents.projectId, id));
    await db.delete(advances).where(eq(advances.projectId, id));
    await db.delete(customerAdvances).where(eq(customerAdvances.projectId, id));
    await db.delete(revenues).where(eq(revenues.projectId, id));
    await db.delete(ownerInvestments).where(eq(ownerInvestments.projectId, id));
    
    // 4. Finally, delete the project itself
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    // First check if this is a client user
    const user = await this.getUserById(userId);
    if (!user) return [];
    
    // For clients, find the client record first, then get projects
    if (user.role === 'client') {
      // Find client record matching the logged-in user
      const allClients = await this.getAllClients();
      const userClient = allClients.find(client => 
        client.name === user.name || 
        client.name === user.username
      );
      
      if (!userClient) {
        return []; // No projects if user is not linked to a client
      }
      
      const clientProjectsList = await db
        .select({ project: projects })
        .from(clientProjects)
        .innerJoin(projects, eq(clientProjects.projectId, projects.id))
        .where(eq(clientProjects.clientId, userClient.id));
      
      return clientProjectsList.map(cp => cp.project);
    }
    
    // For masters and others, check userProjects table
    const userProjectsList = await db
      .select({ project: projects })
      .from(userProjects)
      .innerJoin(projects, eq(userProjects.projectId, projects.id))
      .where(eq(userProjects.userId, userId));
    
    return userProjectsList.map(up => up.project);
  }

  async getUserProject(userId: string, projectId: string): Promise<UserProject | undefined> {
    const [userProject] = await db
      .select()
      .from(userProjects)
      .where(
        and(
          eq(userProjects.userId, userId),
          eq(userProjects.projectId, projectId)
        )
      );
    return userProject || undefined;
  }

  async getProjectExpenses(projectId: string): Promise<(Expense & { user: { name: string }, contractor?: { name: string, company?: string } })[]> {
    const result = await db
      .select({
        id: expenses.id,
        projectId: expenses.projectId,
        userId: expenses.userId,
        category: expenses.category,
        amount: expenses.amount,
        description: expenses.description,
        receiptUrl: expenses.receiptUrl,
        contractorId: expenses.contractorId,
        createdAt: expenses.createdAt,
        user: { name: users.name },
        contractor: { name: contractors.name, company: contractors.company }
      })
      .from(expenses)
      .innerJoin(users, eq(expenses.userId, users.id))
      .leftJoin(contractors, eq(expenses.contractorId, contractors.id))
      .where(eq(expenses.projectId, projectId))
      .orderBy(desc(expenses.createdAt))
      .limit(100);
    
    return result.map(r => ({ 
      id: r.id,
      projectId: r.projectId,
      userId: r.userId,
      category: r.category,
      amount: r.amount,
      description: r.description,
      receiptUrl: r.receiptUrl,
      contractorId: r.contractorId,
      createdAt: r.createdAt,
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
      .values({
        ...expense,
        amount: expense.amount.toString()
      })
      .returning();
    return newExpense;
  }



  async getProjectAdvances(projectId: string): Promise<Advance[]> {
    return await db
      .select()
      .from(advances)
      .where(eq(advances.projectId, projectId))
      .orderBy(desc(advances.createdAt))
      .limit(50);
  }

  async createAdvance(advance: InsertAdvance): Promise<Advance> {
    const [newAdvance] = await db
      .insert(advances)
      .values({
        ...advance,
        amount: advance.amount.toString()
      })
      .returning();
    return newAdvance;
  }

  async getProjectCustomerAdvances(projectId: string): Promise<CustomerAdvance[]> {
    return db.select()
      .from(customerAdvances)
      .where(eq(customerAdvances.projectId, projectId))
      .orderBy(desc(customerAdvances.createdAt))
      .limit(50);
  }

  async createCustomerAdvance(customerAdvance: InsertCustomerAdvance): Promise<CustomerAdvance> {
    const [newCustomerAdvance] = await db
      .insert(customerAdvances)
      .values({
        ...customerAdvance,
        amount: customerAdvance.amount.toString()
      })
      .returning();

    // Проверяем, есть ли заказчик, связанный с этим проектом
    const clientProject = await db
      .select()
      .from(clientProjects)
      .where(eq(clientProjects.projectId, customerAdvance.projectId))
      .limit(1);

    // Если есть связанный заказчик, создаем соответствующий платеж
    if (clientProject.length > 0) {
      await db
        .insert(clientPayments)
        .values({
          clientId: clientProject[0].clientId,
          projectId: customerAdvance.projectId,
          amount: customerAdvance.amount.toString(),
          description: customerAdvance.description || "Аванс от заказчика",
          paymentDate: customerAdvance.date,
          paymentMethod: "advance",
          createdBy: customerAdvance.createdBy || null,
        });
    }

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
    const [result] = await db.insert(revenues).values({
      ...revenue,
      amount: revenue.amount.toString()
    }).returning();
    return result;
  }

  async updateRevenue(id: string, revenue: Partial<InsertRevenue>): Promise<Revenue> {
    const [result] = await db.update(revenues).set({
      ...revenue,
      amount: revenue.amount ? revenue.amount.toString() : undefined
    }).where(eq(revenues.id, id)).returning();
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
    totalClientPayments: string;
    totalRevenues: string;
    totalExpenses: string;
    totalOwnerInvestments: string;
    currentProfit: string;
    projectedProfit: string;
    vladAdvances: string;
    platonAdvances: string;
    vladEarnings: string;
    platonEarnings: string;
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

    const [clientPaymentsSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${clientPayments.amount}), 0)` 
      })
      .from(clientPayments)
      .where(eq(clientPayments.projectId, projectId));

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

    // Получаем авансы Влада и Платона отдельно
    const [vladAdvancesSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${advances.amount}), 0)` 
      })
      .from(advances)
      .where(
        and(
          eq(advances.projectId, projectId),
          sql`LOWER(${advances.recipient}) = 'влад'`
        )
      );

    const [platonAdvancesSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${advances.amount}), 0)` 
      })
      .from(advances)
      .where(
        and(
          eq(advances.projectId, projectId),
          sql`LOWER(${advances.recipient}) = 'платон'`
        )
      );

    const totalCost = project.totalCost;
    const totalAdvances = advancesSum?.total || "0";
    const totalCustomerAdvances = customerAdvancesSum?.total || "0";
    const totalClientPayments = clientPaymentsSum?.total || "0";
    const totalRevenues = revenuesSum?.total || "0";
    const totalExpenses = expensesSum?.total || "0";
    const totalOwnerInvestments = ownerInvestmentsSum?.total || "0";
    const vladAdvances = vladAdvancesSum?.total || "0";
    const platonAdvances = platonAdvancesSum?.total || "0";
    
    // Используем clientPayments как основной источник платежей от заказчиков
    const totalFromClients = Math.max(parseFloat(totalClientPayments), parseFloat(totalCustomerAdvances));
    
    // Текущая прибыль = Полученные авансы от заказчика - Расходы - Взятые авансы
    const currentProfit = (
      totalFromClients - 
      parseFloat(totalExpenses) - 
      parseFloat(totalAdvances)
    ).toString();
    
    // Прогнозируемая прибыль = общая стоимость проекта - расходы - взятые авансы
    const projectedProfit = (
      parseFloat(totalCost) - 
      parseFloat(totalExpenses) - 
      parseFloat(totalAdvances)
    ).toString();

    // Расчет заработка по формуле:
    // Выплата_участнику = (Текущая Прибыль + Сумма Всех Авансов Влад+Платон) / 2 - Аванс_каждого_Участника)
    const currentProfitNum = parseFloat(currentProfit);
    const vladAdvancesNum = parseFloat(vladAdvances);
    const platonAdvancesNum = parseFloat(platonAdvances);
    
    const totalParticipantAdvances = vladAdvancesNum + platonAdvancesNum;
    const totalForDistribution = currentProfitNum + totalParticipantAdvances;
    const sharePerParticipant = totalForDistribution / 2;
    
    const vladEarnings = (sharePerParticipant - vladAdvancesNum).toString();
    const platonEarnings = (sharePerParticipant - platonAdvancesNum).toString();

    return {
      totalCost,
      totalAdvances,
      totalCustomerAdvances,
      totalClientPayments,
      totalRevenues,
      totalExpenses,
      totalOwnerInvestments,
      currentProfit,
      projectedProfit,
      vladAdvances,
      platonAdvances,
      vladEarnings,
      platonEarnings
    };
  }

  async updateAdvance(id: string, advance: Partial<InsertAdvance>): Promise<Advance> {
    const [updatedAdvance] = await db
      .update(advances)
      .set({
        ...advance,
        amount: advance.amount ? advance.amount.toString() : undefined
      })
      .where(eq(advances.id, id))
      .returning();
    return updatedAdvance;
  }

  async updateCustomerAdvance(id: string, customerAdvance: Partial<InsertCustomerAdvance>): Promise<CustomerAdvance> {
    // Получаем старые данные аванса
    const [oldAdvance] = await db
      .select()
      .from(customerAdvances)
      .where(eq(customerAdvances.id, id))
      .limit(1);

    const [updatedCustomerAdvance] = await db
      .update(customerAdvances)
      .set({
        ...customerAdvance,
        amount: customerAdvance.amount ? customerAdvance.amount.toString() : undefined
      })
      .where(eq(customerAdvances.id, id))
      .returning();

    // Синхронизируем изменения с client_payments если есть связанный заказчик
    if (oldAdvance) {
      const clientProject = await db
        .select()
        .from(clientProjects)
        .where(eq(clientProjects.projectId, oldAdvance.projectId))
        .limit(1);

      if (clientProject.length > 0) {
        // Обновляем соответствующий платеж в client_payments
        await db
          .update(clientPayments)
          .set({
            amount: customerAdvance.amount ? customerAdvance.amount.toString() : oldAdvance.amount,
            description: customerAdvance.description || oldAdvance.description,
            paymentDate: customerAdvance.date || oldAdvance.date,
          })
          .where(
            and(
              eq(clientPayments.clientId, clientProject[0].clientId),
              eq(clientPayments.projectId, oldAdvance.projectId),
              sql`${clientPayments.amount} = ${oldAdvance.amount}`,
              sql`${clientPayments.paymentDate} = ${oldAdvance.date}`,
              eq(clientPayments.paymentMethod, 'advance')
            )
          );
      }
    }

    return updatedCustomerAdvance;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        ...expense,
        amount: expense.amount ? expense.amount.toString() : undefined
      })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteAdvance(id: string): Promise<void> {
    await db.delete(advances).where(eq(advances.id, id));
  }

  async deleteCustomerAdvance(id: string): Promise<void> {
    // Получаем данные удаляемого аванса перед удалением
    const [advanceToDelete] = await db
      .select()
      .from(customerAdvances)
      .where(eq(customerAdvances.id, id))
      .limit(1);

    if (advanceToDelete) {
      // Проверяем, есть ли связанный заказчик для этого проекта
      const clientProject = await db
        .select()
        .from(clientProjects)
        .where(eq(clientProjects.projectId, advanceToDelete.projectId))
        .limit(1);

      // Если есть связанный заказчик, удаляем соответствующий платеж
      if (clientProject.length > 0) {
        await db
          .delete(clientPayments)
          .where(
            and(
              eq(clientPayments.clientId, clientProject[0].clientId),
              eq(clientPayments.projectId, advanceToDelete.projectId),
              sql`${clientPayments.amount} = ${advanceToDelete.amount}`,
              sql`${clientPayments.paymentDate} = ${advanceToDelete.date}`,
              eq(clientPayments.paymentMethod, 'advance')
            )
          );
      }
    }

    // Удаляем сам аванс
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
      .orderBy(desc(ownerInvestments.date))
      .limit(50);
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
      .values({
        ...ownerInvestment,
        amount: ownerInvestment.amount.toString()
      })
      .returning();
    return result;
  }

  async updateOwnerInvestment(id: string, ownerInvestment: Partial<InsertOwnerInvestment>): Promise<OwnerInvestment> {
    const [updatedOwnerInvestment] = await db
      .update(ownerInvestments)
      .set({
        ...ownerInvestment,
        amount: ownerInvestment.amount ? ownerInvestment.amount.toString() : undefined
      })
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
      .orderBy(desc(documents.createdAt))
      .limit(50);
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

  async getDocumentById(id: string): Promise<Document | undefined> {
    return this.getDocument(id);
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
    remainingBudget: number;
  }> {
    // Get expenses for this contractor
    const expensesResult = await db
      .select({
        amount: expenses.amount,
        projectId: expenses.projectId,
      })
      .from(expenses)
      .where(eq(expenses.contractorId, contractorId));

    // Get active project assignments for this contractor
    const activeProjectsResult = await db
      .select({
        budget: contractorProjects.budget,
      })
      .from(contractorProjects)
      .where(and(
        eq(contractorProjects.contractorId, contractorId),
        eq(contractorProjects.status, 'active')
      ));

    const totalExpenses = expensesResult.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const uniqueProjects = new Set(expensesResult.map(e => e.projectId));
    const totalProjects = uniqueProjects.size;
    
    // Calculate remaining budget for active projects
    const totalActiveBudget = activeProjectsResult.reduce((sum, project) => sum + Number(project.budget || '0'), 0);
    const remainingBudget = totalActiveBudget - totalExpenses;

    return {
      totalExpenses,
      totalProjects,
      remainingBudget: Math.max(0, remainingBudget), // Don't show negative values
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
      .values({
        ...contractorProject,
        budget: contractorProject.budget ? contractorProject.budget.toString() : null
      })
      .returning();
    return result;
  }

  async updateContractorProject(id: string, contractorProject: Partial<InsertContractorProject>): Promise<ContractorProject> {
    const [updatedContractorProject] = await db
      .update(contractorProjects)
      .set({
        ...contractorProject,
        budget: contractorProject.budget ? contractorProject.budget.toString() : undefined
      })
      .where(eq(contractorProjects.id, id))
      .returning();
    return updatedContractorProject;
  }

  async removeContractorFromProject(id: string): Promise<void> {
    await db.delete(contractorProjects).where(eq(contractorProjects.id, id));
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [createdClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return createdClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getClientStats(clientId: string): Promise<{
    totalPayments: number;
    totalProjects: number;
    remainingAmount: number;
  }> {
    // Get total payments
    const paymentsResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${clientPayments.amount}::numeric), 0)`,
      })
      .from(clientPayments)
      .where(eq(clientPayments.clientId, clientId));

    // Get total projects and use project totalCost as source of truth
    const projectsResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalContract: sql<number>`COALESCE(SUM(${projects.totalCost}::numeric), 0)`,
      })
      .from(clientProjects)
      .innerJoin(projects, eq(clientProjects.projectId, projects.id))
      .where(eq(clientProjects.clientId, clientId));

    const totalPayments = Number(paymentsResult[0]?.total || 0);
    const totalProjects = Number(projectsResult[0]?.count || 0);
    const totalContract = Number(projectsResult[0]?.totalContract || 0);
    const remainingAmount = totalContract - totalPayments;

    return {
      totalPayments,
      totalProjects,
      remainingAmount,
    };
  }

  // Client Projects
  async getProjectClients(projectId: string): Promise<(ClientProject & { client: Client })[]> {
    const result = await db
      .select()
      .from(clientProjects)
      .innerJoin(clients, eq(clientProjects.clientId, clients.id))
      .where(eq(clientProjects.projectId, projectId));

    return result.map(row => ({
      ...row.client_projects,
      client: row.clients,
    }));
  }

  async getClientProjects(clientId: string): Promise<Array<{
    id: string;
    projectId: string;
    projectName: string;
    location: string;
    totalCost: string;
    contractAmount: number;
    contractNumber?: string;
    contractDate?: string;
    description?: string;
    status: string;
    totalPaid: string;
  }>> {
    const result = await db
      .select({
        id: clientProjects.id,
        projectId: clientProjects.projectId,
        projectName: projects.name,
        location: projects.location,
        totalCost: projects.totalCost,
        contractAmount: clientProjects.contractAmount,
        contractNumber: clientProjects.contractNumber,
        contractDate: clientProjects.contractDate,
        description: clientProjects.description,
        status: clientProjects.status,
      })
      .from(clientProjects)
      .innerJoin(projects, eq(clientProjects.projectId, projects.id))
      .where(eq(clientProjects.clientId, clientId))
      .orderBy(desc(clientProjects.createdAt));

    // Get payment totals for each project
    const projectIds = result.map(row => row.projectId);
    const paymentTotals: Record<string, string> = {};

    if (projectIds.length > 0) {
      const paymentsSum = await db
        .select({
          projectId: clientPayments.projectId,
          total: sql<string>`COALESCE(SUM(${clientPayments.amount}), 0)`
        })
        .from(clientPayments)
        .where(
          and(
            eq(clientPayments.clientId, clientId),
            inArray(clientPayments.projectId, projectIds)
          )
        )
        .groupBy(clientPayments.projectId);

      paymentsSum.forEach(payment => {
        paymentTotals[payment.projectId] = payment.total || '0';
      });
    }

    return result.map(row => ({
      id: row.id,
      projectId: row.projectId,
      projectName: row.projectName,
      location: row.location || '',
      totalCost: row.totalCost || '0',
      contractAmount: Number(row.totalCost || '0'), // Используем totalCost как источник истины
      contractNumber: row.contractNumber || undefined,
      contractDate: row.contractDate?.toISOString(),
      description: row.description || undefined,
      status: row.status || 'active',
      totalPaid: paymentTotals[row.projectId] || '0',
    }));
  }

  async assignClientToProject(clientProject: InsertClientProject): Promise<ClientProject> {
    // Получаем стоимость проекта для синхронизации
    const project = await this.getProject(clientProject.projectId);
    const contractAmount = clientProject.contractAmount || Number(project?.totalCost || 0);
    
    const [result] = await db
      .insert(clientProjects)
      .values({
        clientId: clientProject.clientId || '',
        projectId: clientProject.projectId,
        contractAmount: contractAmount.toString(),
        contractNumber: clientProject.contractNumber,
        contractDate: clientProject.contractDate,
        description: clientProject.description,
        status: clientProject.status || 'active',
        createdBy: clientProject.createdBy || ''
      })
      .returning();

    // Синхронизируем существующие авансы от заказчиков для этого проекта
    const existingAdvances = await db
      .select()
      .from(customerAdvances)
      .where(eq(customerAdvances.projectId, clientProject.projectId));

    // Создаем платежи для существующих авансов
    for (const advance of existingAdvances) {
      // Проверяем, не существует ли уже такой платеж
      const existingPayment = await db
        .select()
        .from(clientPayments)
        .where(
          and(
            eq(clientPayments.clientId, clientProject.clientId || ''),
            eq(clientPayments.projectId, clientProject.projectId),
            sql`${clientPayments.amount} = ${advance.amount}`,
            sql`${clientPayments.paymentDate} = ${advance.date}`
          )
        );

      if (existingPayment.length === 0) {
        await db
          .insert(clientPayments)
          .values({
            clientId: clientProject.clientId || '',
            projectId: clientProject.projectId,
            amount: advance.amount,
            description: advance.description || "Аванс от заказчика",
            paymentDate: advance.date,
            paymentMethod: "advance",
            createdBy: advance.createdBy || ''
          });
      }
    }

    return result;
  }

  async updateClientProject(id: string, clientProject: Partial<InsertClientProject>): Promise<ClientProject> {
    // Получаем текущие данные клиент-проекта
    const [currentClientProject] = await db
      .select()
      .from(clientProjects)
      .where(eq(clientProjects.id, id))
      .limit(1);

    if (!currentClientProject) {
      throw new Error("Client project not found");
    }

    const [updatedClientProject] = await db
      .update(clientProjects)
      .set({
        ...clientProject,
        contractAmount: clientProject.contractAmount ? clientProject.contractAmount.toString() : undefined
      })
      .where(eq(clientProjects.id, id))
      .returning();

    // Синхронизируем изменение contractAmount с totalCost в проекте
    if (clientProject.contractAmount !== undefined && clientProject.contractAmount !== null) {
      await db
        .update(projects)
        .set({
          totalCost: clientProject.contractAmount.toString(),
          updatedAt: new Date()
        })
        .where(eq(projects.id, currentClientProject.projectId));
    }

    return updatedClientProject;
  }

  async removeClientFromProject(id: string): Promise<void> {
    await db.delete(clientProjects).where(eq(clientProjects.id, id));
  }

  // Client Payments
  async getClientPayments(clientId: string): Promise<Array<{
    id: string;
    amount: number;
    description?: string;
    paymentDate: string;
    paymentMethod?: string;
    projectId: string;
    projectName: string;
  }>> {
    const result = await db
      .select({
        id: clientPayments.id,
        amount: clientPayments.amount,
        description: clientPayments.description,
        paymentDate: clientPayments.paymentDate,
        paymentMethod: clientPayments.paymentMethod,
        projectId: clientPayments.projectId,
        projectName: projects.name,
      })
      .from(clientPayments)
      .innerJoin(projects, eq(clientPayments.projectId, projects.id))
      .where(eq(clientPayments.clientId, clientId))
      .orderBy(desc(clientPayments.paymentDate));

    return result.map(row => ({
      id: row.id,
      amount: Number(row.amount),
      description: row.description || undefined,
      paymentDate: row.paymentDate.toISOString(),
      paymentMethod: row.paymentMethod || undefined,
      projectId: row.projectId,
      projectName: row.projectName,
    }));
  }

  async getProjectClientPayments(projectId: string): Promise<Array<{
    id: string;
    amount: number;
    description?: string;
    paymentDate: string;
    paymentMethod?: string;
    clientId: string;
    clientName: string;
  }>> {
    const result = await db
      .select({
        id: clientPayments.id,
        amount: clientPayments.amount,
        description: clientPayments.description,
        paymentDate: clientPayments.paymentDate,
        paymentMethod: clientPayments.paymentMethod,
        clientId: clientPayments.clientId,
        clientName: clients.name,
      })
      .from(clientPayments)
      .innerJoin(clients, eq(clientPayments.clientId, clients.id))
      .where(eq(clientPayments.projectId, projectId))
      .orderBy(desc(clientPayments.paymentDate));

    return result.map(row => ({
      id: row.id,
      amount: Number(row.amount),
      description: row.description || undefined,
      paymentDate: row.paymentDate.toISOString(),
      paymentMethod: row.paymentMethod || undefined,
      clientId: row.clientId,
      clientName: row.clientName,
    }));
  }

  async createClientPayment(clientPayment: InsertClientPayment): Promise<ClientPayment> {
    const [result] = await db
      .insert(clientPayments)
      .values({
        ...clientPayment,
        amount: clientPayment.amount.toString()
      })
      .returning();
    return result;
  }

  async updateClientPayment(id: string, clientPayment: Partial<InsertClientPayment>): Promise<ClientPayment> {
    const [updatedClientPayment] = await db
      .update(clientPayments)
      .set({
        ...clientPayment,
        amount: clientPayment.amount ? clientPayment.amount.toString() : undefined
      })
      .where(eq(clientPayments.id, id))
      .returning();
    return updatedClientPayment;
  }

  async deleteClientPayment(id: string): Promise<void> {
    await db.delete(clientPayments).where(eq(clientPayments.id, id));
  }

  // Client Employees implementation
  async getClientEmployees(clientId: string): Promise<User[]> {
    // Find all users assigned to this client through the clientEmployees table
    const employees = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        isBlocked: users.isBlocked,
        tempPassword: users.tempPassword,
        mustChangePassword: users.mustChangePassword,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin,
        createdBy: users.createdBy,
        password: users.password,
      })
      .from(users)
      .innerJoin(clientEmployees, eq(users.id, clientEmployees.userId))
      .where(eq(clientEmployees.clientId, clientId));
    
    return employees;
  }

  async assignEmployeesToClient(clientId: string, employeeIds: string[]): Promise<void> {
    // Batch insert new client-employee relationships, avoiding duplicates
    const existingAssignments = await db
      .select()
      .from(clientEmployees)
      .where(and(
        eq(clientEmployees.clientId, clientId),
        inArray(clientEmployees.userId, employeeIds)
      ));
    
    const existingUserIds = existingAssignments.map(a => a.userId);
    const newEmployeeIds = employeeIds.filter(id => !existingUserIds.includes(id));
    
    if (newEmployeeIds.length > 0) {
      const insertData = newEmployeeIds.map(userId => ({
        clientId,
        userId,
        assignedBy: 'admin' // Default to admin for now
      }));
      
      await db.insert(clientEmployees).values(insertData);
    }
  }

  async removeEmployeeFromClient(clientId: string, userId: string): Promise<void> {
    // Remove the client-employee relationship
    await db
      .delete(clientEmployees)
      .where(and(
        eq(clientEmployees.clientId, clientId),
        eq(clientEmployees.userId, userId)
      ));
  }

  // Tools implementation
  async getAllTools(): Promise<(Tool & { currentPerson?: { name: string; phone: string } })[]> {
    const toolsQuery = await db
      .select({
        id: tools.id,
        name: tools.name,
        inventoryNumber: tools.inventoryNumber,
        cost: tools.cost,
        description: tools.description,
        status: tools.status,
        currentIssueEventId: tools.currentIssueEventId,
        createdBy: tools.createdBy,
        createdAt: tools.createdAt,
        updatedAt: tools.updatedAt,
      })
      .from(tools)
      .orderBy(desc(tools.createdAt));

    // Get current person for tools that are OUT
    const result = [];
    for (const tool of toolsQuery) {
      let currentPerson = undefined;
      
      if (tool.status === 'OUT' && tool.currentIssueEventId) {
        const [movement] = await db
          .select({
            personName: toolMovements.personName,
            personPhone: toolMovements.personPhone,
          })
          .from(toolMovements)
          .where(eq(toolMovements.id, tool.currentIssueEventId));
          
        if (movement) {
          currentPerson = {
            name: movement.personName,
            phone: movement.personPhone,
          };
        }
      }
      
      result.push({ ...tool, currentPerson });
    }

    return result;
  }

  async getTool(id: string): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    return tool || undefined;
  }

  async createTool(tool: InsertTool): Promise<Tool> {
    const [result] = await db
      .insert(tools)
      .values({
        ...tool,
        cost: tool.cost.toString(),
      })
      .returning();
    return result;
  }

  async updateTool(id: string, tool: Partial<InsertTool>): Promise<Tool> {
    const [updatedTool] = await db
      .update(tools)
      .set({
        ...tool,
        cost: tool.cost ? tool.cost.toString() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tools.id, id))
      .returning();
    return updatedTool;
  }

  async deleteTool(id: string): Promise<void> {
    // Check if tool is currently out
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    if (tool && tool.status === 'OUT') {
      throw new Error('Cannot delete tool that is currently out');
    }
    
    // Delete related tool movements first
    await db.delete(toolMovements).where(eq(toolMovements.toolId, id));
    
    // Then delete the tool
    await db.delete(tools).where(eq(tools.id, id));
  }

  async getToolMovements(toolId: string): Promise<(ToolMovement & { createdBy: { name: string } })[]> {
    const movements = await db
      .select({
        id: toolMovements.id,
        toolId: toolMovements.toolId,
        type: toolMovements.type,
        personName: toolMovements.personName,
        personPhone: toolMovements.personPhone,
        photoUrl: toolMovements.photoUrl,
        comment: toolMovements.comment,
        eventTime: toolMovements.eventTime,
        createdBy: toolMovements.createdBy,
        isAdminCorrected: toolMovements.isAdminCorrected,
        correctionReason: toolMovements.correctionReason,
        createdAt: toolMovements.createdAt,
        createdByName: users.name,
      })
      .from(toolMovements)
      .innerJoin(users, eq(toolMovements.createdBy, users.id))
      .where(eq(toolMovements.toolId, toolId))
      .orderBy(desc(toolMovements.eventTime));

    return movements.map(movement => ({
      id: movement.id,
      toolId: movement.toolId,
      type: movement.type,
      personName: movement.personName,
      personPhone: movement.personPhone,
      photoUrl: movement.photoUrl,
      comment: movement.comment,
      eventTime: movement.eventTime,
      isAdminCorrected: movement.isAdminCorrected,
      correctionReason: movement.correctionReason,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy,
      createdByUser: { name: movement.createdByName },
    } as any));
  }

  async createToolMovement(movement: InsertToolMovement): Promise<ToolMovement> {
    // Create the movement record
    const [result] = await db
      .insert(toolMovements)
      .values({
        ...movement,
        eventTime: movement.eventTime || new Date(),
      })
      .returning();

    // Update tool status based on movement type
    if (movement.type === 'ISSUE') {
      await db
        .update(tools)
        .set({
          status: 'OUT',
          currentIssueEventId: result.id,
          updatedAt: new Date(),
        })
        .where(eq(tools.id, movement.toolId));
    } else if (movement.type === 'RETURN') {
      await db
        .update(tools)
        .set({
          status: 'AVAILABLE',
          currentIssueEventId: null,
          updatedAt: new Date(),
        })
        .where(eq(tools.id, movement.toolId));
    }

    // Create or update person record
    await this.createOrUpdateToolPerson({
      name: movement.personName,
      phone: movement.personPhone,
    });

    return result;
  }

  async getRecentToolPersons(limit: number = 20): Promise<ToolPerson[]> {
    return await db
      .select()
      .from(toolPersons)
      .orderBy(desc(toolPersons.lastUsedAt))
      .limit(limit);
  }

  async createOrUpdateToolPerson(person: InsertToolPerson): Promise<ToolPerson> {
    // Try to find existing person by phone
    const [existing] = await db
      .select()
      .from(toolPersons)
      .where(eq(toolPersons.phone, person.phone));

    if (existing) {
      // Update last used time and name if different
      const [updated] = await db
        .update(toolPersons)
        .set({
          name: person.name,
          lastUsedAt: new Date(),
        })
        .where(eq(toolPersons.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new person
      const [created] = await db
        .insert(toolPersons)
        .values(person)
        .returning();
      return created;
    }
  }

  // Admin panel implementations
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getActiveSessions(): Promise<UserSession[]> {
    const now = new Date();
    return await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.isActive, true),
        sql`${userSessions.expiresAt} > ${now}`
      ));
  }

  async getFailedLoginsToday(): Promise<LoginAttempt[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db
      .select()
      .from(loginAttempts)
      .where(and(
        eq(loginAttempts.success, false),
        sql`${loginAttempts.attemptTime} >= ${today}`
      ));
  }

  async logAdminAction(action: InsertAdminAction): Promise<AdminAction> {
    const [result] = await db
      .insert(adminActions)
      .values(action)
      .returning();
    return result;
  }

  async getAdminActions(): Promise<AdminAction[]> {
    return await db
      .select()
      .from(adminActions)
      .orderBy(desc(adminActions.createdAt))
      .limit(100);
  }

  async getLoginAttempts(): Promise<LoginAttempt[]> {
    return await db
      .select()
      .from(loginAttempts)
      .orderBy(desc(loginAttempts.attemptTime))
      .limit(100);
  }

  async deactivateUserSessions(userId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
  }

  async updateUserBlockStatus(id: string, blocked: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isBlocked: blocked })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, password: string, mustChangePassword = false): Promise<void> {
    await db
      .update(users)
      .set({ 
        password,
        mustChangePassword,
        tempPassword: mustChangePassword ? password : null
      })
      .where(eq(users.id, id));
  }

  // Implementation sheet methods
  async getImplementationSheets(projectId: string): Promise<ImplementationSheet[]> {
    return await db
      .select()
      .from(implementationSheets)
      .where(eq(implementationSheets.projectId, projectId))
      .orderBy(desc(implementationSheets.createdAt));
  }

  async getImplementationSheet(id: string): Promise<ImplementationSheet | undefined> {
    const [sheet] = await db
      .select()
      .from(implementationSheets)
      .where(eq(implementationSheets.id, id));
    return sheet || undefined;
  }

  async getImplementationSheetById(id: string): Promise<ImplementationSheet | undefined> {
    return this.getImplementationSheet(id);
  }

  async createImplementationSheet(data: InsertImplementationSheet): Promise<ImplementationSheet> {
    const insertData: any = { ...data };
    if (insertData.parseErrors && Array.isArray(insertData.parseErrors)) {
      insertData.parseErrors = insertData.parseErrors as string[];
    }
    const [sheet] = await db
      .insert(implementationSheets)
      .values(insertData)
      .returning();
    return sheet;
  }

  async updateImplementationSheet(id: string, data: Partial<InsertImplementationSheet>): Promise<ImplementationSheet> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (updateData.parseErrors && Array.isArray(updateData.parseErrors)) {
      updateData.parseErrors = JSON.stringify(updateData.parseErrors);
    }
    const [sheet] = await db
      .update(implementationSheets)
      .set(updateData)
      .where(eq(implementationSheets.id, id))
      .returning();
    return sheet;
  }

  async deleteImplementationSheet(id: string): Promise<void> {
    // Delete all related data first
    const [sheet] = await db.select().from(implementationSheets).where(eq(implementationSheets.id, id));
    if (sheet) {
      const items = await db.select().from(implementationItems).where(eq(implementationItems.sheetId, id));
      for (const item of items) {
        await db.delete(implementationPhotos).where(eq(implementationPhotos.itemId, item.id));
        await db.delete(implementationChangeLogs).where(eq(implementationChangeLogs.itemId, item.id));
      }
      await db.delete(implementationItems).where(eq(implementationItems.sheetId, id));
    }
    await db.delete(implementationSheets).where(eq(implementationSheets.id, id));
  }

  // Implementation items
  async getImplementationItems(sheetId: string): Promise<ImplementationItem[]> {
    return await db
      .select()
      .from(implementationItems)
      .where(eq(implementationItems.sheetId, sheetId))
      .orderBy(implementationItems.position);
  }

  async getImplementationItem(id: string): Promise<ImplementationItem | undefined> {
    const [item] = await db
      .select()
      .from(implementationItems)
      .where(eq(implementationItems.id, id));
    return item || undefined;
  }

  async createImplementationItem(data: InsertImplementationItem): Promise<ImplementationItem> {
    // Convert and limit numeric values to prevent overflow
    const insertData: any = { ...data };
    
    // Limit values to database precision constraints (12,3 = max 999999999.999)
    if (insertData.quantity !== undefined) {
      const num = Number(insertData.quantity);
      insertData.quantity = isNaN(num) ? "0" : Math.min(Math.abs(num), 999999999).toString();
    }
    if (insertData.price !== undefined) {
      const num = Number(insertData.price);
      insertData.price = isNaN(num) ? "0" : Math.min(Math.abs(num), 999999999).toString();
    }
    if (insertData.totalCost !== undefined) {
      const num = Number(insertData.totalCost);
      insertData.totalCost = isNaN(num) ? "0" : Math.min(Math.abs(num), 999999999).toString();
    }
    
    const [item] = await db
      .insert(implementationItems)
      .values(insertData)
      .returning();
    return item;
  }

  async updateImplementationItem(id: string, data: Partial<InsertImplementationItem>, userId: string): Promise<ImplementationItem> {
    // Get old values for change log
    const [oldItem] = await db.select().from(implementationItems).where(eq(implementationItems.id, id));
    
    // Convert numeric values to strings for decimal columns
    const updateData: any = { ...data };
    if (updateData.quantity !== undefined) updateData.quantity = updateData.quantity?.toString();
    if (updateData.price !== undefined) updateData.price = updateData.price?.toString();
    if (updateData.totalCost !== undefined) updateData.totalCost = updateData.totalCost?.toString();
    
    // Update item
    const [newItem] = await db
      .update(implementationItems)
      .set({ 
        ...updateData, 
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date() 
      })
      .where(eq(implementationItems.id, id))
      .returning();
    
    // Log changes
    if (oldItem) {
      if (data.progress !== undefined && oldItem.progress !== data.progress) {
        await this.createImplementationChangeLog({
          itemId: id,
          changeType: 'progress',
          oldValue: oldItem.progress?.toString() || '0',
          newValue: data.progress.toString(),
          changedBy: userId
        });
      }
      if (data.isCompleted !== undefined && oldItem.isCompleted !== data.isCompleted) {
        await this.createImplementationChangeLog({
          itemId: id,
          changeType: 'status',
          oldValue: oldItem.isCompleted ? 'completed' : 'in_progress',
          newValue: data.isCompleted ? 'completed' : 'in_progress',
          changedBy: userId
        });
      }
    }
    
    // Update sheet total progress
    await this.updateSheetProgress(newItem.sheetId);
    
    return newItem;
  }

  async deleteImplementationItem(id: string): Promise<void> {
    // Get item to get sheet ID for progress update
    const [item] = await db.select().from(implementationItems).where(eq(implementationItems.id, id));
    
    // Delete related data first
    await db.delete(implementationPhotos).where(eq(implementationPhotos.itemId, id));
    await db.delete(implementationChangeLogs).where(eq(implementationChangeLogs.itemId, id));
    await db.delete(implementationItems).where(eq(implementationItems.id, id));
    
    // Update sheet total progress if item existed
    if (item) {
      await this.updateSheetProgress(item.sheetId);
    }
  }

  // Implementation photos
  async getImplementationPhotos(itemId: string): Promise<ImplementationPhoto[]> {
    return await db
      .select()
      .from(implementationPhotos)
      .where(eq(implementationPhotos.itemId, itemId))
      .orderBy(desc(implementationPhotos.uploadedAt));
  }

  async getImplementationPhoto(id: string): Promise<ImplementationPhoto | undefined> {
    const [photo] = await db
      .select()
      .from(implementationPhotos)
      .where(eq(implementationPhotos.id, id));
    return photo || undefined;
  }

  async createImplementationPhoto(data: InsertImplementationPhoto): Promise<ImplementationPhoto> {
    const [photo] = await db
      .insert(implementationPhotos)
      .values(data)
      .returning();
    
    // Log photo addition
    await this.createImplementationChangeLog({
      itemId: data.itemId,
      changeType: 'photo_added',
      newValue: photo.photoUrl,
      changedBy: data.uploadedBy || ''
    });
    
    return photo;
  }

  async deleteImplementationPhoto(id: string, userId: string): Promise<void> {
    const [photo] = await db.select().from(implementationPhotos).where(eq(implementationPhotos.id, id));
    if (photo) {
      await this.createImplementationChangeLog({
        itemId: photo.itemId,
        changeType: 'photo_removed',
        oldValue: photo.photoUrl,
        changedBy: userId
      });
    }
    await db.delete(implementationPhotos).where(eq(implementationPhotos.id, id));
  }

  // Implementation change logs
  async createImplementationChangeLog(data: InsertImplementationChangeLog): Promise<ImplementationChangeLog> {
    const [log] = await db
      .insert(implementationChangeLogs)
      .values(data)
      .returning();
    return log;
  }

  async getImplementationChangeLogs(itemId: string): Promise<ImplementationChangeLog[]> {
    return await db
      .select()
      .from(implementationChangeLogs)
      .where(eq(implementationChangeLogs.itemId, itemId))
      .orderBy(desc(implementationChangeLogs.changedAt));
  }
  
  // Audit Log Implementation
  async createAuditLog(log: {
    entityType: string;
    entityId: string;
    action: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    userId: string;
    userName: string;
    userRole: string;
    projectId?: string;
    metadata?: any;
  }): Promise<void> {
    await db.insert(auditLogs).values(log);
  }
  
  async getProjectAuditLogs(projectId: string, filters?: {
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    let query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.projectId, projectId))
      .$dynamic();
      
    if (filters?.entityType) {
      query = query.where(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.userId) {
      query = query.where(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      query = query.where(sql`${auditLogs.createdAt} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      query = query.where(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
    }
    
    return await query.orderBy(desc(auditLogs.createdAt));
  }
  
  async getEntityAuditLogs(entityType: string, entityId: string): Promise<any[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.createdAt));
  }
  
  // Email Notifications Implementation
  async createEmailNotification(notification: {
    recipientEmail: string;
    subject: string;
    body: string;
    eventType: string;
    projectId?: string;
    projectName?: string;
    itemId?: string;
    itemName?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
  }): Promise<void> {
    await db.insert(emailNotifications).values(notification);
  }
  
  async getPendingNotifications(): Promise<any[]> {
    return await db
      .select()
      .from(emailNotifications)
      .where(eq(emailNotifications.status, 'pending'))
      .orderBy(emailNotifications.createdAt);
  }
  
  async markNotificationSent(id: string): Promise<void> {
    await db
      .update(emailNotifications)
      .set({ 
        status: 'sent',
        sentAt: new Date()
      })
      .where(eq(emailNotifications.id, id));
  }
  
  async markNotificationFailed(id: string, error: string): Promise<void> {
    await db
      .update(emailNotifications)
      .set({ 
        status: 'failed',
        errorMessage: error
      })
      .where(eq(emailNotifications.id, id));
  }
  
  // Analytics Implementation
  async getProjectsAnalytics(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    activeCount: number;
    archivedCount: number;
    totalContractValue: number;
    totalExpenses: number;
    totalPayments: number;
    averageProgress: number;
  }> {
    let query = db.select().from(projects).$dynamic();
    
    if (filters?.status) {
      query = query.where(eq(projects.status, filters.status));
    }
    if (filters?.startDate) {
      query = query.where(sql`${projects.createdAt} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      query = query.where(sql`${projects.createdAt} <= ${filters.endDate}`);
    }
    
    const projectList = await query;
    const projectIds = projectList.map(p => p.id);
    
    // Count by status
    const activeCount = projectList.filter(p => p.status === 'active').length;
    const archivedCount = projectList.filter(p => p.status === 'archived').length;
    
    // Calculate totals
    const totalContractValue = projectList.reduce((sum, p) => sum + Number(p.totalCost), 0);
    
    // Get expenses total
    let totalExpenses = 0;
    if (projectIds.length > 0) {
      const expensesData = await db
        .select({ total: sql`COALESCE(SUM(${expenses.amount}), 0)` })
        .from(expenses)
        .where(inArray(expenses.projectId, projectIds));
      totalExpenses = Number(expensesData[0]?.total || 0);
    }
    
    // Get payments total
    let totalPayments = 0;
    if (projectIds.length > 0) {
      const paymentsData = await db
        .select({ total: sql`COALESCE(SUM(${clientPayments.amount}), 0)` })
        .from(clientPayments)
        .where(inArray(clientPayments.projectId, projectIds));
      totalPayments = Number(paymentsData[0]?.total || 0);
    }
    
    // Get average progress from implementation sheets (average across ALL projects)
    let averageProgress = 0;
    if (projectIds.length > 0) {
      // Calculate progress for each project (0 if no implementation sheet exists)
      const progressData = await db
        .select({ 
          projectId: projects.id,
          avgProgress: sql`COALESCE(AVG(${implementationSheets.totalProgress}), 0)`
        })
        .from(projects)
        .leftJoin(implementationSheets, eq(projects.id, implementationSheets.projectId))
        .where(inArray(projects.id, projectIds))
        .groupBy(projects.id);
      
      // Calculate overall average including projects with 0% progress
      const totalProgress = progressData.reduce((sum, p) => sum + Number(p.avgProgress), 0);
      averageProgress = totalProgress / progressData.length;
    }
    
    return {
      activeCount,
      archivedCount,
      totalContractValue,
      totalExpenses,
      totalPayments,
      averageProgress
    };
  }
  
  async getContractorAnalytics(contractorId?: string): Promise<any[]> {
    let query = db
      .select({
        contractorId: contractors.id,
        contractorName: contractors.name,
        specialization: contractors.specialization,
        totalProjects: sql`COUNT(DISTINCT ${contractorProjects.projectId})`,
        totalBudget: sql`COALESCE(SUM(${contractorProjects.budget}), 0)`,
        totalExpenses: sql`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(contractors)
      .leftJoin(contractorProjects, eq(contractors.id, contractorProjects.contractorId))
      .leftJoin(expenses, eq(contractors.id, expenses.contractorId))
      .groupBy(contractors.id)
      .$dynamic();
      
    if (contractorId) {
      query = query.where(eq(contractors.id, contractorId));
    }
    
    return await query;
  }
  
  async getClientAnalytics(clientId?: string): Promise<any[]> {
    let query = db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        totalProjects: sql`COUNT(DISTINCT ${clientProjects.projectId})`,
        totalContractValue: sql`COALESCE(SUM(${clientProjects.contractAmount}), 0)`,
        totalPayments: sql`COALESCE(SUM(${clientPayments.amount}), 0)`,
      })
      .from(clients)
      .leftJoin(clientProjects, eq(clients.id, clientProjects.clientId))
      .leftJoin(clientPayments, eq(clients.id, clientPayments.clientId))
      .groupBy(clients.id)
      .$dynamic();
      
    if (clientId) {
      query = query.where(eq(clients.id, clientId));
    }
    
    return await query;
  }
  
  async getToolsAnalytics(): Promise<any> {
    const toolsData = await db
      .select({
        totalTools: sql`COUNT(*)`,
        availableTools: sql`COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END)`,
        outTools: sql`COUNT(CASE WHEN status = 'OUT' THEN 1 END)`,
        writtenOffTools: sql`COUNT(CASE WHEN status = 'WRITTEN_OFF' THEN 1 END)`,
        totalValue: sql`COALESCE(SUM(${tools.cost}), 0)`,
      })
      .from(tools);
      
    const movementsData = await db
      .select({
        totalMovements: sql`COUNT(*)`,
        totalIssues: sql`COUNT(CASE WHEN type = 'ISSUE' THEN 1 END)`,
        totalReturns: sql`COUNT(CASE WHEN type = 'RETURN' THEN 1 END)`,
      })
      .from(toolMovements);
      
    return {
      ...toolsData[0],
      ...movementsData[0]
    };
  }

  // Helper method to update sheet total progress
  private async updateSheetProgress(sheetId: string): Promise<void> {
    const items = await this.getImplementationItems(sheetId);
    if (items.length === 0) return;
    
    const totalProgress = items.reduce((sum, item) => sum + (item.progress || 0), 0);
    const averageProgress = totalProgress / items.length;
    
    await db
      .update(implementationSheets)
      .set({ 
        totalProgress: averageProgress.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(implementationSheets.id, sheetId));
  }
}

export const storage = new DatabaseStorage();
