import { 
  users, projects, expenses, documents, advances, customerAdvances, userProjects, revenues, ownerInvestments,
  contractors, contractorProjects, clients, clientProjects, clientPayments, clientEmployees,
  tools, toolMovements, toolPersons, userSessions, loginAttempts, adminActions,
  implementationSheets, implementationItems, implementationPhotos, implementationChangeLogs,
  implementationItemComments,
  personnel, personnelDocuments, personnelAdvances,
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
  type ImplementationPhoto, type InsertImplementationPhoto, type ImplementationChangeLog, type InsertImplementationChangeLog,
  type ImplementationItemComment, type InsertImplementationItemComment,
  type Personnel, type InsertPersonnel, type PersonnelDocument, type InsertPersonnelDocument,
  type PersonnelAdvance, type InsertPersonnelAdvance,
  personnelRoleAuditLog,
  telegramNotifications,
  vehicles, vehiclePhotoControls, vehiclePhotoControlPhotos, vehicleAuditLog,
  type Vehicle, type InsertVehicle,
  type VehiclePhotoControl, type InsertVehiclePhotoControl,
  type VehiclePhotoControlPhoto, type InsertVehiclePhotoControlPhoto,
  type VehicleAuditLog, type InsertVehicleAuditLog,
  rolePermissions, userPermissionOverrides, permissionAuditLog,
  type RolePermission, type UserPermissionOverride, type PermissionAuditLog,
  type InsertRolePermission, type InsertPermissionAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserBlockStatus(id: string, blocked: boolean): Promise<void>;
  updateUserPassword(id: string, password: string, mustChangePassword?: boolean): Promise<void>;
  updateUserRole(id: string, role: string): Promise<void>;
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
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  
  // Documents
  getProjectDocuments(projectId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  
  // Advances
  getProjectAdvances(projectId: string): Promise<Advance[]>;
  getAdvanceById(id: string): Promise<Advance | undefined>;
  createAdvance(advance: InsertAdvance): Promise<Advance>;
  updateAdvance(id: string, advance: Partial<InsertAdvance>): Promise<Advance>;
  deleteAdvance(id: string): Promise<void>;
  
  // Customer Advances
  getProjectCustomerAdvances(projectId: string): Promise<CustomerAdvance[]>;
  getCustomerAdvanceById(id: string): Promise<CustomerAdvance | undefined>;
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
  getOwnerInvestmentById(id: string): Promise<OwnerInvestment | undefined>;
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
  getDeletedClients(): Promise<Client[]>;
  restoreClient(id: string): Promise<Client>;
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
  assignEmployeesToClient(clientId: string, employeeIds: string[], assignedBy: string): Promise<void>;
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

  getOverallFinancialSummary(): Promise<{
    totalRevenue: string;
    totalExpenses: string;
    totalAdvances: string;
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
  
  // Implementation item comments
  getImplementationItemComments(itemId: string): Promise<(ImplementationItemComment & { author: User })[]>;
  createImplementationItemComment(data: InsertImplementationItemComment): Promise<ImplementationItemComment>;
  deleteImplementationItemComment(id: string, userId: string): Promise<void>;
  
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
  
  // Personnel
  getAllPersonnel(): Promise<(Personnel & { documents?: PersonnelDocument[] })[]>;
  getPersonnel(id: string): Promise<Personnel | undefined>;
  getPersonnelByUserId(userId: string): Promise<Personnel | undefined>;
  createPersonnel(data: InsertPersonnel): Promise<Personnel>;
  updatePersonnel(id: string, data: Partial<InsertPersonnel>): Promise<Personnel>;
  deletePersonnel(id: string): Promise<void>;
  setPersonnelDriverRole(id: string, isDriver: boolean): Promise<Personnel>;
  getVehiclesAssignedToPersonnel(personnelId: string): Promise<Array<{ id: string; brand: string; model: string; plateNumber: string; status: string }>>;
  createPersonnelRoleAuditEntry(data: { personnelId: string; action: 'grant_driver' | 'revoke_driver'; actorUserId: string | null; details?: any }): Promise<void>;
  getPersonnelRoleAuditLog(personnelId: string): Promise<Array<{ id: string; action: string; actorName: string | null; createdAt: Date | null; details: any }>>;

  // Telegram notifications (отправка чеков расходов)
  // Атомарно «застолбить» отправку. Если запись уже существует — возвращает null
  // (значит, другой процесс уже занялся этим чеком).
  claimTelegramNotification(data: {
    expenseId: string;
    fileUrl: string;
    telegramChatId?: string | null;
  }): Promise<{ id: string } | null>;
  updateTelegramNotification(id: string, data: {
    status: string;
    telegramMessageId?: string | null;
    error?: string | null;
    attempts?: number;
  }): Promise<void>;
  
  // Personnel Documents
  getPersonnelDocuments(personnelId: string): Promise<PersonnelDocument[]>;
  getPersonnelDocument(id: string): Promise<PersonnelDocument | undefined>;
  createPersonnelDocument(data: InsertPersonnelDocument): Promise<PersonnelDocument>;
  updatePersonnelDocument(id: string, data: Partial<InsertPersonnelDocument>): Promise<PersonnelDocument>;
  deletePersonnelDocument(id: string): Promise<void>;
  
  // Personnel Advances
  getPersonnelAdvances(personnelId: string, month?: Date): Promise<PersonnelAdvance[]>;
  getPersonnelAdvance(id: string): Promise<PersonnelAdvance | undefined>;
  createPersonnelAdvance(data: InsertPersonnelAdvance): Promise<PersonnelAdvance>;
  cancelPersonnelAdvance(id: string, userId: string, reason: string): Promise<PersonnelAdvance>;
  getPersonnelAdvancesSummary(personnelId: string, month: Date): Promise<{
    totalAdvances: number;
    salary: number;
    toPay: number;
    carryOver: number;
  }>;

  // Vehicles (Автомобили / фотоконтроль)
  getAllVehicles(opts?: { assignedUserId?: string; status?: string }): Promise<(Vehicle & {
    assignedUser?: { id: string; name: string; role: string } | null;
    lastPhotoControl?: { id: string; performedAt: Date | null; weekKey: string; mileageKm: number } | null;
  })[]>;
  getVehicle(id: string): Promise<(Vehicle & {
    assignedUser?: { id: string; name: string; role: string } | null;
  }) | undefined>;
  createVehicle(data: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle>;
  setVehicleStatus(id: string, status: 'active' | 'archived'): Promise<Vehicle>;

  getVehiclePhotoControls(vehicleId: string): Promise<(VehiclePhotoControl & {
    performedBy?: { id: string; name: string } | null;
    photos: VehiclePhotoControlPhoto[];
  })[]>;
  getVehiclePhotoControl(id: string): Promise<(VehiclePhotoControl & {
    photos: VehiclePhotoControlPhoto[];
  }) | undefined>;
  getLastVehiclePhotoControl(vehicleId: string): Promise<VehiclePhotoControl | undefined>;
  createVehiclePhotoControl(
    control: InsertVehiclePhotoControl,
    photos: Omit<InsertVehiclePhotoControlPhoto, 'controlId'>[],
  ): Promise<VehiclePhotoControl>;
  setVehiclePhotoControlPdf(id: string, pdfUrl: string): Promise<void>;
  getVehicleMileageStats(vehicleId: string): Promise<{
    week: number;
    month: number;
    year: number;
    all: number;
    controlsCount: number;
    lastMileage: number | null;
    lastDate: string | null;
  }>;

  createVehicleAuditLog(entry: InsertVehicleAuditLog): Promise<VehicleAuditLog>;
  getVehicleAuditLog(vehicleId: string, limit?: number): Promise<(VehicleAuditLog & {
    user?: { id: string; name: string | null; username: string | null } | null;
  })[]>;
  correctVehiclePhotoControlMileage(controlId: string, newMileageKm: number): Promise<VehiclePhotoControl>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`LOWER(${users.username}) = LOWER(${username})`
    );
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
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
    // Удаляем только технические связанные данные пользователя
    await db.delete(userProjects).where(eq(userProjects.userId, id));
    await db.delete(userSessions).where(eq(userSessions.userId, id));
    await db.delete(loginAttempts).where(eq(loginAttempts.userId, id));
    await db.delete(clientEmployees).where(eq(clientEmployees.userId, id));
    
    // Удаляем админ-действия где этот пользователь был целью
    await db.delete(adminActions).where(eq(adminActions.targetUserId, id));
    
    // Обнуляем ссылки на пользователя в audit_logs (сохраняем логи, но убираем ссылку на пользователя)
    await db.update(auditLogs).set({ userId: sql`null` }).where(eq(auditLogs.userId, id));
    
    // Обновляем ссылки на пользователя на null, сохраняя все данные
    await db.update(projects).set({ createdBy: null }).where(eq(projects.createdBy, id));
    await db.update(clientProjects).set({ createdBy: null }).where(eq(clientProjects.createdBy, id));
    await db.update(advances).set({ createdBy: null }).where(eq(advances.createdBy, id));
    await db.update(customerAdvances).set({ createdBy: null }).where(eq(customerAdvances.createdBy, id));
    await db.update(revenues).set({ createdBy: null }).where(eq(revenues.createdBy, id));
    await db.update(ownerInvestments).set({ createdBy: null }).where(eq(ownerInvestments.createdBy, id));
    await db.update(contractors).set({ createdBy: null }).where(eq(contractors.createdBy, id));
    await db.update(clients).set({ createdBy: null }).where(eq(clients.createdBy, id));
    await db.update(clientPayments).set({ createdBy: null }).where(eq(clientPayments.createdBy, id));
    await db.update(tools).set({ createdBy: null }).where(eq(tools.createdBy, id));
    await db.update(toolMovements).set({ createdBy: null }).where(eq(toolMovements.createdBy, id));
    await db.update(implementationSheets).set({ createdBy: null }).where(eq(implementationSheets.createdBy, id));
    await db.update(implementationItems).set({ lastUpdatedBy: null }).where(eq(implementationItems.lastUpdatedBy, id));
    await db.update(implementationChangeLogs).set({ changedBy: null }).where(eq(implementationChangeLogs.changedBy, id));
    
    // ВСЕ ДАННЫЕ СОТРУДНИКА ОСТАЮТСЯ: документы, расходы, фотографии, изменения
    // Обнуляем ссылки на пользователя, но сохраняем все данные
    await db.update(expenses).set({ userId: null }).where(eq(expenses.userId, id));
    await db.update(documents).set({ uploadedBy: null }).where(eq(documents.uploadedBy, id));
    
    // Обнуляем ссылку на пользователя в clients (если он был контактным лицом)
    await db.update(clients).set({ userId: null }).where(eq(clients.userId, id));
    
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
    console.log(`Starting deleteProject for ID: ${id}`);
    
    try {
      // Delete related data in the correct order to respect foreign key constraints
      
      // 1. Delete implementation photos and change logs
      console.log('Deleting implementation-related data...');
      const implementationSheetsList = await db.select().from(implementationSheets).where(eq(implementationSheets.projectId, id));
      console.log(`Found ${implementationSheetsList.length} implementation sheets`);
      
      for (const sheet of implementationSheetsList) {
        const items = await db.select().from(implementationItems).where(eq(implementationItems.sheetId, sheet.id));
        console.log(`Processing ${items.length} implementation items for sheet ${sheet.id}`);
        for (const item of items) {
          await db.delete(implementationPhotos).where(eq(implementationPhotos.itemId, item.id));
          await db.delete(implementationChangeLogs).where(eq(implementationChangeLogs.itemId, item.id));
        }
        await db.delete(implementationItems).where(eq(implementationItems.sheetId, sheet.id));
      }
      await db.delete(implementationSheets).where(eq(implementationSheets.projectId, id));
      
      // 2. Delete client payments
      console.log('Deleting client payments...');
      await db.delete(clientPayments).where(eq(clientPayments.projectId, id));
      
      // 3. Delete implementation item comments
      console.log('Deleting implementation item comments...');
      await db.delete(implementationItemComments).where(eq(implementationItemComments.projectId, id));
      
      // 4. Delete email notifications
      console.log('Deleting email notifications...');
      await db.delete(emailNotifications).where(eq(emailNotifications.projectId, id));
      
      // 5. Delete personnel advances
      console.log('Deleting personnel advances...');
      await db.delete(personnelAdvances).where(eq(personnelAdvances.projectId, id));
      
      // 6. Delete other project-related data
      console.log('Deleting project-related data...');
      await db.delete(clientProjects).where(eq(clientProjects.projectId, id));
      await db.delete(contractorProjects).where(eq(contractorProjects.projectId, id));
      await db.delete(userProjects).where(eq(userProjects.projectId, id));
      await db.delete(expenses).where(eq(expenses.projectId, id));
      await db.delete(documents).where(eq(documents.projectId, id));
      await db.delete(advances).where(eq(advances.projectId, id));
      await db.delete(customerAdvances).where(eq(customerAdvances.projectId, id));
      await db.delete(revenues).where(eq(revenues.projectId, id));
      await db.delete(ownerInvestments).where(eq(ownerInvestments.projectId, id));
      
      // 7. Delete OLD audit logs to avoid constraint violations (new deletion log will be created after)
      console.log('Deleting old audit logs...');
      await db.delete(auditLogs).where(eq(auditLogs.projectId, id));
      
      // 8. Finally, delete the project itself
      console.log('Deleting the project itself...');
      const result = await db.delete(projects).where(eq(projects.id, id));
      console.log(`Project deletion result:`, result);
      
      console.log(`Successfully deleted project ${id}`);
    } catch (error) {
      console.error(`Error in deleteProject for ID ${id}:`, error);
      throw error;
    }
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

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
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

  async getAdvanceById(id: string): Promise<Advance | undefined> {
    const [advance] = await db.select().from(advances).where(eq(advances.id, id));
    return advance;
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

  async getCustomerAdvanceById(id: string): Promise<CustomerAdvance | undefined> {
    const [advance] = await db.select().from(customerAdvances).where(eq(customerAdvances.id, id));
    return advance;
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
    
    // Используем customer_advances как основной источник авансов, clientPayments может дублировать данные
    const totalFromClients = parseFloat(totalCustomerAdvances);
    
    // Исправленная математика согласно примеру:
    // Аванс от заказчика: 250 000, Влад взял: 150 000, Платон взял: 100 000, расходы: 52 900
    // Остаток = 250 000 - 150 000 - 100 000 - 52 900 = -52 900 (перетрата на 52 900)
    // Значит текущая прибыль = -52 900
    
    const vladAdvancesNum = parseFloat(vladAdvances);
    const platonAdvancesNum = parseFloat(platonAdvances);
    const totalParticipantAdvances = vladAdvancesNum + platonAdvancesNum;
    
    // Текущая прибыль = Полученные авансы от заказчика - Расходы - Взятые авансы участниками
    const currentProfit = (
      totalFromClients - 
      parseFloat(totalExpenses) - 
      totalParticipantAdvances
    ).toString();
    
    // Прогнозируемая прибыль = общая стоимость проекта - расходы - взятые авансы
    const projectedProfit = (
      parseFloat(totalCost) - 
      parseFloat(totalExpenses) - 
      totalParticipantAdvances
    ).toString();

    // Заработок каждого участника = (Полученные от заказчика - расходы) / 2 - взятый аванс
    // Это показывает, сколько каждый должен получить или доплатить
    const currentProfitNum = parseFloat(currentProfit);
    const availableForDistribution = totalFromClients - parseFloat(totalExpenses);
    const sharePerParticipant = availableForDistribution / 2;
    
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

  async getOverallFinancialSummary(): Promise<{
    totalRevenue: string;
    totalExpenses: string;
    totalAdvances: string;
  }> {
    // Получаем все проекты (как архивные, так и активные)
    const allProjects = await db
      .select()
      .from(projects);

    if (allProjects.length === 0) {
      return {
        totalRevenue: "0",
        totalExpenses: "0", 
        totalAdvances: "0"
      };
    }

    const allProjectIds = allProjects.map(p => p.id);

    // Сумма авансов от заказчиков (это и есть доходы по всем проектам)
    let customerAdvancesTotalSum = 0;
    for (const projectId of allProjectIds) {
      const projectAdvances = await db
        .select({ amount: customerAdvances.amount })
        .from(customerAdvances)
        .where(eq(customerAdvances.projectId, projectId));
      
      for (const advance of projectAdvances) {
        customerAdvancesTotalSum += parseFloat(advance.amount || '0');
      }
    }

    // Сумма расходов по всем проектам
    let expensesTotalSum = 0;
    for (const projectId of allProjectIds) {
      const projectExpenses = await db
        .select({ amount: expenses.amount })
        .from(expenses)
        .where(eq(expenses.projectId, projectId));
      
      for (const expense of projectExpenses) {
        expensesTotalSum += parseFloat(expense.amount || '0');
      }
    }

    // Сумма взятых авансов участниками по всем проектам
    let advancesTotalSum = 0;
    for (const projectId of allProjectIds) {
      const projectAdvances = await db
        .select({ amount: advances.amount })
        .from(advances)
        .where(eq(advances.projectId, projectId));
      
      for (const advance of projectAdvances) {
        advancesTotalSum += parseFloat(advance.amount || '0');
      }
    }

    return {
      totalRevenue: customerAdvancesTotalSum.toString(),
      totalExpenses: expensesTotalSum.toString(),
      totalAdvances: advancesTotalSum.toString()
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
        console.log(`Deleting client payment for customer advance: ${id}`);
        console.log(`Looking for payment: client=${clientProject[0].clientId}, project=${advanceToDelete.projectId}, amount=${advanceToDelete.amount}, date=${advanceToDelete.date}`);
        
        const deleteResult = await db
          .delete(clientPayments)
          .where(
            and(
              eq(clientPayments.clientId, clientProject[0].clientId),
              eq(clientPayments.projectId, advanceToDelete.projectId),
              sql`${clientPayments.amount} = ${advanceToDelete.amount}`,
              sql`DATE(${clientPayments.paymentDate}) = DATE(${advanceToDelete.date})`, // Compare only dates, not times
              eq(clientPayments.paymentMethod, 'advance')
            )
          );
          
        console.log(`Client payment deletion result:`, deleteResult);
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

  async getOwnerInvestmentById(id: string): Promise<OwnerInvestment | undefined> {
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

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
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
    return await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.createdAt));
  }

  async getDeletedClients(): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.isActive, false)).orderBy(desc(clients.createdAt));
  }

  async restoreClient(id: string): Promise<Client> {
    // Убираем " (удален)" из названия и восстанавливаем клиента
    const [client] = await db
      .update(clients)
      .set({ 
        name: sql`REPLACE(${clients.name}, ' (удален)', '')`,
        isActive: true 
      })
      .where(eq(clients.id, id))
      .returning();
    return client;
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
    // Вместо удаления заказчика, просто деактивируем его, сохраняя все связанные данные
    // Все проекты, платежи, документы остаются в системе
    await db.update(clients).set({ 
      name: sql`${clients.name} || ' (удален)'`,
      isActive: false 
    }).where(eq(clients.id, id));
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

  async getClientEmployeeByUserId(userId: string): Promise<ClientEmployee | undefined> {
    // Find the client employee relationship for a specific user
    const [clientEmployee] = await db
      .select()
      .from(clientEmployees)
      .where(eq(clientEmployees.userId, userId));
    
    return clientEmployee;
  }

  async assignEmployeesToClient(clientId: string, employeeIds: string[], assignedBy: string): Promise<void> {
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
        assignedBy
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
    // 1) Помечаем «внутренние» сессии (таблица userSessions — наш аудит-учёт)
    //    как неактивные.
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
    // 2) Реальные сессии express-session живут в таблице `session`
    //    (connect-pg-simple): {sid, sess(jsonb-like text), expire}.
    //    Чтобы пользователь действительно вылетел, удаляем все её записи,
    //    в чьём sess.user.id совпадает с userId.
    //    Используем JSONB-каст и оператор `->>`. Если таблица ещё не создана
    //    (свежий запуск без сессий) — игнорируем ошибку.
    try {
      await db.execute(
        sql`DELETE FROM session WHERE (sess::jsonb -> 'user' ->> 'id') = ${userId}`,
      );
    } catch (err) {
      console.warn("deactivateUserSessions: could not purge express sessions", err);
    }
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

  async updateUserRole(id: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role })
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
    // Delete all related data first in correct order
    const [sheet] = await db.select().from(implementationSheets).where(eq(implementationSheets.id, id));
    if (sheet) {
      const items = await db.select().from(implementationItems).where(eq(implementationItems.sheetId, id));
      for (const item of items) {
        // Delete in order: comments -> photos -> change logs -> items
        await db.delete(implementationItemComments).where(eq(implementationItemComments.itemId, item.id));
        await db.delete(implementationPhotos).where(eq(implementationPhotos.itemId, item.id));
        await db.delete(implementationChangeLogs).where(eq(implementationChangeLogs.itemId, item.id));
      }
      // Delete all items for this sheet
      await db.delete(implementationItems).where(eq(implementationItems.sheetId, id));
    }
    // Finally delete the sheet itself
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

  // Implementation item comments
  async getImplementationItemComments(itemId: string): Promise<(ImplementationItemComment & { author: User })[]> {
    const comments = await db
      .select({
        id: implementationItemComments.id,
        itemId: implementationItemComments.itemId,
        projectId: implementationItemComments.projectId,
        authorId: implementationItemComments.authorId,
        text: implementationItemComments.text,
        visibleToClient: implementationItemComments.visibleToClient,
        isDeleted: implementationItemComments.isDeleted,
        deletedBy: implementationItemComments.deletedBy,
        deletedAt: implementationItemComments.deletedAt,
        createdAt: implementationItemComments.createdAt,
        author: users
      })
      .from(implementationItemComments)
      .leftJoin(users, eq(implementationItemComments.authorId, users.id))
      .where(and(
        eq(implementationItemComments.itemId, itemId),
        eq(implementationItemComments.isDeleted, false)
      ))
      .orderBy(desc(implementationItemComments.createdAt));
    
    return comments.map(c => ({
      ...c,
      author: c.author!
    }));
  }

  async createImplementationItemComment(data: InsertImplementationItemComment): Promise<ImplementationItemComment> {
    const [comment] = await db
      .insert(implementationItemComments)
      .values(data)
      .returning();
    return comment;
  }

  async deleteImplementationItemComment(id: string, userId: string): Promise<void> {
    // Soft delete with audit trail
    await db
      .update(implementationItemComments)
      .set({
        isDeleted: true,
        deletedBy: userId,
        deletedAt: new Date()
      })
      .where(eq(implementationItemComments.id, id));
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
  
  // Personnel methods
  async getAllPersonnel(): Promise<(Personnel & { documents?: PersonnelDocument[] })[]> {
    const personnelList = await db.select().from(personnel).orderBy(personnel.lastName, personnel.firstName);
    
    // Get documents for each person
    const personnelWithDocs = await Promise.all(
      personnelList.map(async (person) => {
        const docs = await db
          .select()
          .from(personnelDocuments)
          .where(eq(personnelDocuments.personnelId, person.id))
          .orderBy(personnelDocuments.documentType);
        return { ...person, documents: docs };
      })
    );
    
    return personnelWithDocs;
  }
  
  async getPersonnel(id: string): Promise<Personnel | undefined> {
    const [person] = await db.select().from(personnel).where(eq(personnel.id, id));
    return person;
  }
  
  async createPersonnel(data: any): Promise<Personnel> {
    const insertData = {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      phone: data.phoneNumber,
      email: data.email,
      emiratesId: data.emiratesId,
      emiratesIdIssueDate: data.emiratesIdIssueDate ? new Date(data.emiratesIdIssueDate) : null,
      emiratesIdExpiryDate: data.emiratesIdExpiryDate ? new Date(data.emiratesIdExpiryDate) : null,
      specialization: data.position, // Map position to specialization
      startDate: data.hireDate ? new Date(data.hireDate) : new Date(), // Map hireDate to startDate
      salary: data.salary ? String(data.salary) : null,
      status: data.status || 'active',
      createdBy: data.createdBy,
    };
    const [person] = await db.insert(personnel).values(insertData).returning();
    return person;
  }
  
  async updatePersonnel(id: string, data: any): Promise<Personnel> {
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Map form fields to database fields
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.middleName !== undefined) updateData.middleName = data.middleName;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    if (data.phoneNumber !== undefined) updateData.phone = data.phoneNumber;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.emiratesId !== undefined) updateData.emiratesId = data.emiratesId;
    if (data.emiratesIdIssueDate !== undefined) updateData.emiratesIdIssueDate = data.emiratesIdIssueDate ? new Date(data.emiratesIdIssueDate) : null;
    if (data.emiratesIdExpiryDate !== undefined) updateData.emiratesIdExpiryDate = data.emiratesIdExpiryDate ? new Date(data.emiratesIdExpiryDate) : null;
    if (data.position !== undefined) updateData.specialization = data.position; // Map position to specialization
    if (data.hireDate !== undefined) updateData.startDate = data.hireDate ? new Date(data.hireDate) : null; // Map hireDate to startDate
    if (data.salary !== undefined) updateData.salary = data.salary ? String(data.salary) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
    if (data.userId !== undefined) updateData.userId = data.userId; // null = отвязать
    
    const [person] = await db
      .update(personnel)
      .set(updateData)
      .where(eq(personnel.id, id))
      .returning();
    return person;
  }

  async getPersonnelByUserId(userId: string): Promise<Personnel | undefined> {
    const [person] = await db.select().from(personnel).where(eq(personnel.userId, userId));
    return person;
  }
  
  async deletePersonnel(id: string): Promise<void> {
    // Delete documents first (cascade)
    await db.delete(personnelDocuments).where(eq(personnelDocuments.personnelId, id));
    await db.delete(personnel).where(eq(personnel.id, id));
  }

  async setPersonnelDriverRole(id: string, isDriver: boolean): Promise<Personnel> {
    const [person] = await db
      .update(personnel)
      .set({ isDriver, updatedAt: new Date() })
      .where(eq(personnel.id, id))
      .returning();
    return person;
  }

  async setPersonnelDriverRoleWithAudit(
    id: string,
    isDriver: boolean,
    audit: { action: 'grant_driver' | 'revoke_driver'; actorUserId: string | null; details?: any }
  ): Promise<Personnel> {
    return await db.transaction(async (tx) => {
      const [person] = await tx
        .update(personnel)
        .set({ isDriver, updatedAt: new Date() })
        .where(eq(personnel.id, id))
        .returning();
      await tx.insert(personnelRoleAuditLog).values({
        personnelId: id,
        action: audit.action,
        actorUserId: audit.actorUserId,
        details: audit.details ?? null,
      });
      return person;
    });
  }

  async getVehiclesAssignedToPersonnel(personnelId: string): Promise<Array<{ id: string; brand: string; model: string; plateNumber: string; status: string }>> {
    const rows = await db
      .select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        plateNumber: vehicles.plateNumber,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(eq(vehicles.assignedPersonnelId, personnelId));
    return rows.map((r) => ({ ...r, status: r.status || 'active' }));
  }

  async createPersonnelRoleAuditEntry(data: { personnelId: string; action: 'grant_driver' | 'revoke_driver'; actorUserId: string | null; details?: any }): Promise<void> {
    await db.insert(personnelRoleAuditLog).values({
      personnelId: data.personnelId,
      action: data.action,
      actorUserId: data.actorUserId,
      details: data.details ?? null,
    });
  }

  async claimTelegramNotification(data: {
    expenseId: string;
    fileUrl: string;
    telegramChatId?: string | null;
  }): Promise<{ id: string } | null> {
    // Атомарное «застолбить»: insert ... on conflict do nothing returning id.
    // Если строка уже была — returning вернёт пустой массив.
    const inserted = await db
      .insert(telegramNotifications)
      .values({
        expenseId: data.expenseId,
        fileUrl: data.fileUrl,
        status: "pending",
        telegramChatId: data.telegramChatId ?? null,
        attempts: 0,
      })
      .onConflictDoNothing({
        target: [telegramNotifications.expenseId, telegramNotifications.fileUrl],
      })
      .returning({ id: telegramNotifications.id });
    return inserted[0] ?? null;
  }

  async updateTelegramNotification(id: string, data: {
    status: string;
    telegramMessageId?: string | null;
    error?: string | null;
    attempts?: number;
  }): Promise<void> {
    const patch: any = { status: data.status };
    if (data.telegramMessageId !== undefined) patch.telegramMessageId = data.telegramMessageId;
    if (data.error !== undefined) patch.error = data.error;
    if (data.attempts !== undefined) patch.attempts = data.attempts;
    await db.update(telegramNotifications).set(patch).where(eq(telegramNotifications.id, id));
  }

  async getPersonnelRoleAuditLog(personnelId: string): Promise<Array<{ id: string; action: string; actorName: string | null; createdAt: Date | null; details: any }>> {
    const rows = await db
      .select({
        id: personnelRoleAuditLog.id,
        action: personnelRoleAuditLog.action,
        createdAt: personnelRoleAuditLog.createdAt,
        details: personnelRoleAuditLog.details,
        actorName: users.name,
        actorUsername: users.username,
      })
      .from(personnelRoleAuditLog)
      .leftJoin(users, eq(personnelRoleAuditLog.actorUserId, users.id))
      .where(eq(personnelRoleAuditLog.personnelId, personnelId))
      .orderBy(desc(personnelRoleAuditLog.createdAt));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      createdAt: r.createdAt,
      details: r.details,
      actorName: r.actorName || r.actorUsername || null,
    }));
  }

  // Personnel Documents methods
  async getPersonnelDocuments(personnelId: string): Promise<PersonnelDocument[]> {
    return await db
      .select()
      .from(personnelDocuments)
      .where(eq(personnelDocuments.personnelId, personnelId))
      .orderBy(personnelDocuments.documentType, personnelDocuments.expiryDate);
  }
  
  async getPersonnelDocument(id: string): Promise<PersonnelDocument | undefined> {
    const [doc] = await db.select().from(personnelDocuments).where(eq(personnelDocuments.id, id));
    return doc;
  }
  
  async createPersonnelDocument(data: InsertPersonnelDocument): Promise<PersonnelDocument> {
    const insertData: any = {
      personnelId: data.personnelId,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      fileName: data.fileName || 'document.pdf', // Required field
      fileSize: data.fileSize || 0, // Required field  
      mimeType: data.mimeType || 'application/pdf', // Required field
      fileUrl: data.fileUrl,
      comment: data.comment,
      uploadedBy: data.uploadedBy,
    };
    
    // Convert date strings to Date objects
    if (data.issueDate) insertData.issueDate = new Date(data.issueDate);
    if (data.expiryDate) insertData.expiryDate = new Date(data.expiryDate);
    
    const [doc] = await db.insert(personnelDocuments).values(insertData).returning();
    return doc;
  }
  
  async updatePersonnelDocument(id: string, data: Partial<InsertPersonnelDocument>): Promise<PersonnelDocument> {
    const updateData: any = { ...data };
    
    // Convert date strings to Date objects  
    if (data.issueDate && typeof data.issueDate === 'string') {
      updateData.issueDate = new Date(data.issueDate);
    }
    if (data.expiryDate && typeof data.expiryDate === 'string') {
      updateData.expiryDate = new Date(data.expiryDate);
    }
    
    const [doc] = await db
      .update(personnelDocuments)
      .set(updateData)
      .where(eq(personnelDocuments.id, id))
      .returning();
    return doc;
  }
  
  async deletePersonnelDocument(id: string): Promise<void> {
    await db.delete(personnelDocuments).where(eq(personnelDocuments.id, id));
  }

  // Personnel Advances Implementation
  async getPersonnelAdvances(personnelId: string, month?: Date): Promise<PersonnelAdvance[]> {
    let query = db
      .select()
      .from(personnelAdvances)
      .where(eq(personnelAdvances.personnelId, personnelId))
      .$dynamic();
    
    if (month) {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
      query = query.where(
        and(
          sql`${personnelAdvances.date} >= ${startOfMonth}`,
          sql`${personnelAdvances.date} <= ${endOfMonth}`
        )
      );
    }
    
    return await query.orderBy(desc(personnelAdvances.date));
  }

  async getPersonnelAdvance(id: string): Promise<PersonnelAdvance | undefined> {
    const [advance] = await db
      .select()
      .from(personnelAdvances)
      .where(eq(personnelAdvances.id, id));
    return advance;
  }

  async createPersonnelAdvance(data: InsertPersonnelAdvance): Promise<PersonnelAdvance> {
    const insertData: any = { ...data };
    
    // Convert date string to Date object
    if (data.date && typeof data.date === 'string') {
      insertData.date = new Date(data.date);
    }
    
    // Handle empty project ID - set to null instead of empty string
    if (insertData.projectId === '') {
      insertData.projectId = null;
    }
    
    const [advance] = await db
      .insert(personnelAdvances)
      .values(insertData)
      .returning();
    return advance;
  }

  async cancelPersonnelAdvance(id: string, userId: string, reason: string): Promise<PersonnelAdvance> {
    const [advance] = await db
      .update(personnelAdvances)
      .set({
        status: 'cancelled',
        cancelledBy: userId,
        cancelledAt: new Date(),
        cancellationReason: reason
      })
      .where(eq(personnelAdvances.id, id))
      .returning();
    return advance;
  }

  async deletePersonnelAdvance(id: string): Promise<void> {
    await db.delete(personnelAdvances).where(eq(personnelAdvances.id, id));
  }

  async getPersonnelAdvancesSummary(personnelId: string, month: Date): Promise<{
    totalAdvances: number;
    salary: number;
    toPay: number;
    carryOver: number;
  }> {
    // Get personnel salary
    const person = await this.getPersonnel(personnelId);
    const salary = person?.salary ? parseFloat(person.salary) : 0;
    
    // Get advances for the month
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    
    const advances = await db
      .select({
        total: sql`COALESCE(SUM(${personnelAdvances.amount}), 0)`
      })
      .from(personnelAdvances)
      .where(
        and(
          eq(personnelAdvances.personnelId, personnelId),
          eq(personnelAdvances.status, 'active'),
          sql`${personnelAdvances.date} >= ${startOfMonth}`,
          sql`${personnelAdvances.date} <= ${endOfMonth}`
        )
      );
    
    const totalAdvances = Number(advances[0]?.total || 0);
    
    // Get carry over from previous month
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const prevMonthEnd = new Date(month.getFullYear(), month.getMonth(), 0, 23, 59, 59);
    
    const prevAdvances = await db
      .select({
        total: sql`COALESCE(SUM(${personnelAdvances.amount}), 0)`
      })
      .from(personnelAdvances)
      .where(
        and(
          eq(personnelAdvances.personnelId, personnelId),
          eq(personnelAdvances.status, 'active'),
          sql`${personnelAdvances.date} >= ${prevMonth}`,
          sql`${personnelAdvances.date} <= ${prevMonthEnd}`
        )
      );
    
    const prevTotal = Number(prevAdvances[0]?.total || 0);
    const carryOver = Math.max(0, prevTotal - salary);
    
    // Calculate to pay (considering carry over)
    const totalDebt = totalAdvances + carryOver;
    const toPay = Math.max(0, salary - totalDebt);
    
    return {
      totalAdvances,
      salary,
      toPay,
      carryOver
    };
  }

  // ========================================================================
  // Vehicles (Автомобили / фотоконтроль)
  // ========================================================================
  async getAllVehicles(opts?: { assignedPersonnelId?: string; status?: string }) {
    const conds: any[] = [];
    if (opts?.assignedPersonnelId) conds.push(eq(vehicles.assignedPersonnelId, opts.assignedPersonnelId));
    if (opts?.status) conds.push(eq(vehicles.status, opts.status));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const rows = await db
      .select({
        v: vehicles,
        p: {
          id: personnel.id,
          firstName: personnel.firstName,
          lastName: personnel.lastName,
          specialization: personnel.specialization,
          photoUrl: personnel.photoUrl,
        },
      })
      .from(vehicles)
      .leftJoin(personnel, eq(personnel.id, vehicles.assignedPersonnelId))
      .where(where as any)
      .orderBy(desc(vehicles.createdAt));

    const ids = rows.map(r => r.v.id);
    let lastByVehicle = new Map<string, { id: string; performedAt: Date | null; weekKey: string; mileageKm: number }>();
    if (ids.length > 0) {
      const lasts = await db
        .select()
        .from(vehiclePhotoControls)
        .where(inArray(vehiclePhotoControls.vehicleId, ids))
        .orderBy(desc(vehiclePhotoControls.performedAt));
      for (const c of lasts) {
        if (!lastByVehicle.has(c.vehicleId)) {
          lastByVehicle.set(c.vehicleId, {
            id: c.id,
            performedAt: c.performedAt,
            weekKey: c.weekKey,
            mileageKm: c.mileageKm,
          });
        }
      }
    }

    return rows.map(({ v, p }) => ({
      ...v,
      assignedPersonnel: p && p.id ? p : null,
      lastPhotoControl: lastByVehicle.get(v.id) || null,
    }));
  }

  async getVehicle(id: string) {
    const [row] = await db
      .select({
        v: vehicles,
        p: {
          id: personnel.id,
          firstName: personnel.firstName,
          lastName: personnel.lastName,
          specialization: personnel.specialization,
          photoUrl: personnel.photoUrl,
        },
      })
      .from(vehicles)
      .leftJoin(personnel, eq(personnel.id, vehicles.assignedPersonnelId))
      .where(eq(vehicles.id, id))
      .limit(1);
    if (!row) return undefined;
    return { ...row.v, assignedPersonnel: row.p && row.p.id ? row.p : null };
  }

  async createVehicle(data: InsertVehicle) {
    const [row] = await db.insert(vehicles).values(data as any).returning();
    return row;
  }

  async updateVehicle(id: string, data: Partial<InsertVehicle>) {
    const [row] = await db
      .update(vehicles)
      .set({ ...(data as any), updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return row;
  }

  async setVehicleStatus(id: string, status: 'active' | 'archived') {
    const [row] = await db
      .update(vehicles)
      .set({ status, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return row;
  }

  async getVehiclePhotoControls(vehicleId: string) {
    const controls = await db
      .select({
        c: vehiclePhotoControls,
        u: { id: users.id, name: users.name },
      })
      .from(vehiclePhotoControls)
      .leftJoin(users, eq(users.id, vehiclePhotoControls.performedByUserId))
      .where(eq(vehiclePhotoControls.vehicleId, vehicleId))
      .orderBy(desc(vehiclePhotoControls.performedAt));

    if (controls.length === 0) return [];
    const ids = controls.map(c => c.c.id);
    const photos = await db
      .select()
      .from(vehiclePhotoControlPhotos)
      .where(inArray(vehiclePhotoControlPhotos.controlId, ids))
      .orderBy(vehiclePhotoControlPhotos.controlId, vehiclePhotoControlPhotos.step);
    const photosByControl = new Map<string, VehiclePhotoControlPhoto[]>();
    for (const p of photos) {
      const arr = photosByControl.get(p.controlId) || [];
      arr.push(p);
      photosByControl.set(p.controlId, arr);
    }
    return controls.map(({ c, u }) => ({
      ...c,
      performedBy: u && u.id ? u : null,
      photos: photosByControl.get(c.id) || [],
    }));
  }

  async getVehiclePhotoControl(id: string) {
    const [c] = await db
      .select()
      .from(vehiclePhotoControls)
      .where(eq(vehiclePhotoControls.id, id))
      .limit(1);
    if (!c) return undefined;
    const photos = await db
      .select()
      .from(vehiclePhotoControlPhotos)
      .where(eq(vehiclePhotoControlPhotos.controlId, id))
      .orderBy(vehiclePhotoControlPhotos.step);
    return { ...c, photos };
  }

  async getLastVehiclePhotoControl(vehicleId: string) {
    const [row] = await db
      .select()
      .from(vehiclePhotoControls)
      .where(eq(vehiclePhotoControls.vehicleId, vehicleId))
      .orderBy(desc(vehiclePhotoControls.performedAt))
      .limit(1);
    return row || undefined;
  }

  async createVehiclePhotoControl(
    control: InsertVehiclePhotoControl,
    photos: Omit<InsertVehiclePhotoControlPhoto, 'controlId'>[],
  ) {
    const [created] = await db.insert(vehiclePhotoControls).values(control as any).returning();
    if (photos.length > 0) {
      await db.insert(vehiclePhotoControlPhotos).values(
        photos.map(p => ({ ...(p as any), controlId: created.id }))
      );
    }
    return created;
  }

  async getVehicleMileageStats(vehicleId: string) {
    const all = await db
      .select({
        performedAt: vehiclePhotoControls.performedAt,
        mileageKm: vehiclePhotoControls.mileageKm,
      })
      .from(vehiclePhotoControls)
      .where(eq(vehiclePhotoControls.vehicleId, vehicleId))
      .orderBy(vehiclePhotoControls.performedAt);

    if (all.length === 0) {
      return { week: 0, month: 0, year: 0, all: 0, controlsCount: 0, lastMileage: null, lastDate: null };
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Дельта пробега за окно: latest_in_window - max(latest_before_window, earliest_in_window)
    const calcWindow = (windowMs: number): number => {
      const cutoff = now - windowMs;
      let lastBefore: number | null = null;
      let firstIn: number | null = null;
      let lastIn: number | null = null;
      for (const c of all) {
        if (!c.performedAt) continue;
        const t = new Date(c.performedAt).getTime();
        if (t < cutoff) {
          lastBefore = c.mileageKm;
        } else {
          if (firstIn === null) firstIn = c.mileageKm;
          lastIn = c.mileageKm;
        }
      }
      if (lastIn === null) return 0;
      const baseline = lastBefore !== null ? lastBefore : (firstIn as number);
      return Math.max(0, lastIn - baseline);
    };

    const first = all[0];
    const last = all[all.length - 1];
    return {
      week: calcWindow(7 * day),
      month: calcWindow(30 * day),
      year: calcWindow(365 * day),
      all: Math.max(0, (last.mileageKm || 0) - (first.mileageKm || 0)),
      controlsCount: all.length,
      lastMileage: last.mileageKm,
      lastDate: last.performedAt ? new Date(last.performedAt).toISOString() : null,
    };
  }

  async setVehiclePhotoControlPdf(id: string, pdfUrl: string) {
    await db
      .update(vehiclePhotoControls)
      .set({ pdfUrl })
      .where(eq(vehiclePhotoControls.id, id));
  }

  async getVehicleAuditLog(vehicleId: string, limit = 100) {
    const rows = await db
      .select({
        log: vehicleAuditLog,
        u: { id: users.id, name: users.name, username: users.username },
      })
      .from(vehicleAuditLog)
      .leftJoin(users, eq(users.id, vehicleAuditLog.userId))
      .where(eq(vehicleAuditLog.vehicleId, vehicleId))
      .orderBy(desc(vehicleAuditLog.createdAt))
      .limit(limit);
    return rows.map(({ log, u }) => ({
      ...log,
      user: u && u.id ? u : null,
    }));
  }

  async correctVehiclePhotoControlMileage(controlId: string, newMileageKm: number) {
    const [updated] = await db
      .update(vehiclePhotoControls)
      .set({ mileageKm: newMileageKm })
      .where(eq(vehiclePhotoControls.id, controlId))
      .returning();
    if (!updated) {
      throw new Error('Photo control not found');
    }
    return updated;
  }

  async createVehicleAuditLog(entry: InsertVehicleAuditLog) {
    const [row] = await db.insert(vehicleAuditLog).values(entry as any).returning();
    return row;
  }

  // ===========================================================================
  // Гибкие права (этап 1)
  // ===========================================================================

  async getRolePermissions(role: string): Promise<RolePermission[]> {
    return await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.role, role));
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions);
  }

  async bulkInsertRolePermissions(rows: InsertRolePermission[]): Promise<void> {
    if (rows.length === 0) return;
    await db
      .insert(rolePermissions)
      .values(rows as any)
      .onConflictDoNothing({
        target: [rolePermissions.role, rolePermissions.permissionKey],
      });
  }

  async upsertRolePermission(role: string, permissionKey: string, enabled: boolean): Promise<RolePermission> {
    const [row] = await db
      .insert(rolePermissions)
      .values({ role, permissionKey, enabled } as any)
      .onConflictDoUpdate({
        target: [rolePermissions.role, rolePermissions.permissionKey],
        set: { enabled, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async deleteRolePermissionsForRole(role: string): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.role, role));
  }

  async getUserPermissionOverrides(userId: string): Promise<UserPermissionOverride[]> {
    return await db
      .select()
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));
  }

  async upsertUserPermissionOverride(userId: string, permissionKey: string, state: "enabled" | "disabled"): Promise<UserPermissionOverride> {
    const [row] = await db
      .insert(userPermissionOverrides)
      .values({ userId, permissionKey, state } as any)
      .onConflictDoUpdate({
        target: [userPermissionOverrides.userId, userPermissionOverrides.permissionKey],
        set: { state, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async deleteUserPermissionOverride(userId: string, permissionKey: string): Promise<void> {
    await db
      .delete(userPermissionOverrides)
      .where(
        and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.permissionKey, permissionKey),
        ),
      );
  }

  async deleteAllUserPermissionOverrides(userId: string): Promise<void> {
    await db
      .delete(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));
  }

  async createPermissionAuditEntry(entry: InsertPermissionAuditLog): Promise<PermissionAuditLog> {
    const [row] = await db
      .insert(permissionAuditLog)
      .values(entry as any)
      .returning();
    return row;
  }

  async listPermissionAuditEntries(limit: number = 100): Promise<Array<PermissionAuditLog & { actor: { id: string; name: string; username: string } | null }>> {
    const rows = await db
      .select({ log: permissionAuditLog, u: users })
      .from(permissionAuditLog)
      .leftJoin(users, eq(users.id, permissionAuditLog.changedBy))
      .orderBy(desc(permissionAuditLog.changedAt))
      .limit(limit);
    return rows.map(({ log, u }) => ({
      ...log,
      actor: u && u.id ? { id: u.id, name: u.name, username: u.username } : null,
    }));
  }

  async countActiveAdminsWithPermission(permissionKey: string, registryDefaultForAdmin: boolean): Promise<number> {
    // Базовый набор: активные не-заблокированные пользователи с ролью 'admin'.
    const admins = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          eq(users.isActive, true as any),
        ),
      );
    if (admins.length === 0) return 0;

    // Эффективное значение для роли 'admin'.
    const roleRows = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.role, "admin"),
          eq(rolePermissions.permissionKey, permissionKey),
        ),
      );
    const roleEnabled = roleRows[0] ? roleRows[0].enabled === true : registryDefaultForAdmin;

    // Учитываем персональные переопределения.
    const overrides = await db
      .select()
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.permissionKey, permissionKey));
    const overrideByUser = new Map<string, "enabled" | "disabled">();
    for (const ov of overrides) {
      overrideByUser.set(ov.userId, ov.state as "enabled" | "disabled");
    }

    let count = 0;
    for (const a of admins) {
      if (a.isBlocked) continue;
      const ov = overrideByUser.get(a.id);
      const eff = ov ? ov === "enabled" : roleEnabled;
      if (eff) count++;
    }
    return count;
  }
}

export const storage = new DatabaseStorage();
