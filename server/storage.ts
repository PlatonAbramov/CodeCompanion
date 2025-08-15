import { 
  users, projects, expenses, documents, advances, customerAdvances, userProjects, revenues, ownerInvestments,
  contractors, contractorProjects, clients, clientProjects, clientPayments,
  tools, toolMovements, toolPersons, sessions, login_attempts, mfa_totp,
  type User, type InsertUser, type Project, type InsertProject,
  type Expense, type InsertExpense, type Document, type InsertDocument,
  type Advance, type InsertAdvance, type CustomerAdvance, type InsertCustomerAdvance,
  type Revenue, type InsertRevenue, type UserProject, type InsertUserProject,
  type OwnerInvestment, type InsertOwnerInvestment,
  type Contractor, type InsertContractor, type ContractorProject, type InsertContractorProject,
  type Client, type InsertClient, type ClientProject, type InsertClientProject,
  type ClientPayment, type InsertClientPayment,
  type Tool, type InsertTool, type ToolMovement, type InsertToolMovement,
  type ToolPerson, type InsertToolPerson,
  type InsertSession, type InsertLoginAttempt, type InsertMfaTotp
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByLogin(login: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createSecureUser(user: any): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Sessions
  createSession(session: InsertSession): Promise<any>;
  getSessionByToken(tokenHash: string): Promise<any>;
  updateSessionLastUsed(sessionId: string): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  
  // Login attempts
  createLoginAttempt(attempt: InsertLoginAttempt): Promise<any>;
  getRecentLoginAttempts(login: string, cutoffTime: Date): Promise<any[]>;
  
  // User management
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  updateUserBlockStatus(id: string, isBlocked: boolean): Promise<void>;
  updateUserDetails(id: string, updates: any): Promise<void>;
  
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

  async getUserByLogin(login: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.login, login));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createSecureUser(user: any): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Session management
  async createSession(session: InsertSession): Promise<any> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async getSessionByToken(tokenHash: string): Promise<any> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refresh_token_hash, tokenHash))
      .limit(1);
    return session;
  }

  async updateSessionLastUsed(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ last_used_at: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await db
      .update(sessions)
      .set({ revoked_at: new Date() })
      .where(eq(sessions.refresh_token_hash, tokenHash));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ revoked_at: new Date() })
      .where(eq(sessions.user_id, userId));
  }

  // Login attempts tracking
  async createLoginAttempt(attempt: InsertLoginAttempt): Promise<any> {
    const [newAttempt] = await db.insert(login_attempts).values(attempt).returning();
    return newAttempt;
  }

  async getRecentLoginAttempts(login: string, cutoffTime: Date): Promise<any[]> {
    const attempts = await db
      .select()
      .from(login_attempts)
      .where(
        and(
          eq(login_attempts.login_attempted, login),
          sql`${login_attempts.created_at} >= ${cutoffTime}`
        )
      )
      .orderBy(desc(login_attempts.created_at));
    return attempts;
  }

  // User management methods
  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password_hash: passwordHash,
        updated_at: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserBlockStatus(id: string, isBlocked: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        is_blocked: isBlocked,
        updated_at: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserDetails(id: string, updates: any): Promise<void> {
    await db
      .update(users)
      .set({ 
        ...updates,
        updated_at: new Date()
      })
      .where(eq(users.id, id));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
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
      .orderBy(desc(advances.createdAt));
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
      .orderBy(desc(customerAdvances.createdAt));
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
      createdBy: { name: movement.createdByName },
    }));
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
}

export const storage = new DatabaseStorage();
