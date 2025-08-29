import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { cache, cacheKeys, invalidateProjectCache, invalidateUserCache, invalidateContractorCache, invalidateClientCache, invalidateToolCache } from "./cache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { 
  insertUserSchema, insertProjectSchema, insertExpenseSchema, 
  insertDocumentSchema, insertAdvanceSchema, insertCustomerAdvanceSchema,
  insertRevenueSchema, insertOwnerInvestmentSchema, insertContractorSchema,
  insertContractorProjectSchema, insertClientSchema, insertClientProjectSchema,
  insertClientPaymentSchema, insertToolSchema, insertToolMovementSchema,
  createUserSchema, implementationItemComments, users,
  type InsertContractorProject, type InsertClientProject, type InsertClientPayment,
  type InsertTool, type InsertToolMovement, type CreateUser, type ClientEmployee
} from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend session data type
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      name: string;
      role: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Trust proxy for Replit deployment
  app.set('trust proxy', 1);

  // Session middleware
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.REPLIT_DOMAINS;
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'construction-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax', // 'none' для production с HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  const requireDirector = (req: any, res: any, next: any) => {
    console.log("requireDirector check - user:", req.session?.user ? { id: req.session.user.id, role: req.session.user.role } : null);
    if (!req.session?.user || (req.session.user.role !== 'director' && req.session.user.role !== 'admin')) {
      console.log("Access denied - role:", req.session?.user?.role);
      return res.status(403).json({ error: "Director or admin access required" });
    }
    console.log("Access granted for role:", req.session.user.role);
    next();
  };



  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("=== PRODUCTION LOGIN ATTEMPT ===");
      console.log("Username:", username);
      console.log("Password length:", password?.length);
      console.log("Environment:", {
        NODE_ENV: process.env.NODE_ENV,
        hasDatabase: !!process.env.DATABASE_URL,
        databaseUrlStart: process.env.DATABASE_URL?.substring(0, 30) + "..."
      });
      
      if (!username || !password) {
        console.log("Missing credentials");
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      console.log("User lookup result:", user ? {
        found: true,
        id: user.id,
        username: user.username,
        isActive: user.isActive,
        role: user.role,
        hasPassword: !!user.password,
        passwordStart: user.password?.substring(0, 15) + "..."
      } : { found: false });
      
      if (!user || !user.isActive) {
        console.log("User not found or inactive");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      console.log("Password comparison result:", isValid);
      
      if (!isValid) {
        console.log("Password invalid");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      
      // Store user in session (excluding password)
      req.session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      };

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session save error" });
        }
        
        console.log("Login successful for:", user.username);
        res.json({ 
          user: req.session.user,
          message: "Login successful" 
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      // Получаем актуальные данные пользователя из базы данных
      const currentUser = await storage.getUserById(req.session.user.id);
      
      if (!currentUser || !currentUser.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found or inactive" });
      }
      
      // Обновляем сессию актуальными данными
      req.session.user = {
        id: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        role: currentUser.role
      };
      
      res.json({ user: req.session.user });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Special route for creating initial admin user in production
  app.post("/api/setup-admin", async (req, res) => {
    try {
      console.log("=== SETUP ADMIN ATTEMPT ===");
      console.log("Environment check:", {
        NODE_ENV: process.env.NODE_ENV,
        REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
        databaseUrl: !!process.env.DATABASE_URL
      });

      // Check if admin already exists
      const existingAdmin = await storage.getUserByUsername('platonabramov90@gmail.com');
      if (existingAdmin) {
        console.log("Admin already exists:", existingAdmin.id);
        return res.json({ message: "Admin already exists", userId: existingAdmin.id });
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash('123456', 10);
      const adminUser = await storage.createUser({
        username: 'platonabramov90@gmail.com',
        name: 'Администратор Платон',
        role: 'admin',
        password: hashedPassword,
        isActive: true
      });

      console.log("Admin user created:", adminUser.id);
      res.json({ 
        message: "Admin user created successfully", 
        userId: adminUser.id,
        username: adminUser.username
      });
    } catch (error) {
      console.error("Setup admin error:", error);
      res.status(500).json({ error: "Setup admin failed", details: error.message });
    }
  });

  // Diagnostic endpoint to check production user
  app.get("/api/check-user", async (req, res) => {
    try {
      const user = await storage.getUserByUsername('platonabramov90@gmail.com');
      if (!user) {
        return res.json({ found: false });
      }
      
      // Test password with current hash
      const testPassword = await bcrypt.compare('123456', user.password);
      
      res.json({ 
        found: true,
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        passwordTest: testPassword,
        passwordHashStart: user.password.substring(0, 20) + "...",
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fix user profile in production
  app.post("/api/fix-user-profile", async (req, res) => {
    try {
      const user = await storage.getUserByUsername('platonabramov90@gmail.com');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user with correct name and ensure admin role
      await db.update(users)
        .set({ 
          name: 'Administrator Platon',
          role: 'admin',
          isActive: true
        })
        .where(eq(users.id, user.id));
      
      // Verify the fix worked
      const updatedUser = await storage.getUserByUsername('platonabramov90@gmail.com');
      
      res.json({ 
        message: "User profile fixed successfully",
        userId: user.id,
        oldName: user.name,
        newName: updatedUser.name,
        role: updatedUser.role,
        isActive: updatedUser.isActive
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // User management routes (Director only)
  app.get("/api/users", requireAuth, requireDirector, async (req, res) => {
    try {
      const { role } = req.query;
      
      if (role) {
        // Get users by specific role
        const users = await storage.getAllUsers();
        const filteredUsers = users.filter(user => user.role === role);
        // Remove passwords from response
        const safeUsers = filteredUsers.map(({ password, ...user }) => user);
        return res.json(safeUsers);
      }
      
      const cacheKey = cacheKeys.users();
      
      // Try cache first (60 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      
      // Cache for 60 seconds
      cache.set(cacheKey, safeUsers, 60);
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, requireDirector, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash the password before storing
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const user = await storage.createUser(userData);
      
      // Invalidate users cache
      invalidateUserCache();
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get archived projects
  app.get("/api/projects/archived", requireAuth, requireDirector, async (req, res) => {
    try {
      const user = req.session.user!;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) {
        return res.status(404).json({ error: "User not found" });
      }

      let projects: any[] = [];
      
      // Get all projects and filter archived ones
      if (fullUser.role === 'admin' || fullUser.role === 'director') {
        projects = await storage.getAllProjects();
      }
      
      // Filter only archived projects
      const archivedProjects = projects.filter(p => p.status === 'archived');
      res.json(archivedProjects);
    } catch (error) {
      console.error("Get archived projects error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Project routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      
      // Try cache first for admin/director
      const cacheKey = cacheKeys.projects();
      if (user.role === 'admin' || user.role === 'director') {
        const cached = cache.get(cacheKey);
        if (cached) {
          return res.json(cached);
        }
      }

      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) {
        return res.status(404).json({ error: "User not found" });
      }

      let projects: any[] = [];
      
      // Администратор и прораб видят все активные проекты
      if (fullUser.role === 'admin' || fullUser.role === 'director') {
        const allProjects = await storage.getAllProjects();
        projects = allProjects.filter(p => p.status === 'active');
      }
      // Мастер видит только назначенные ему активные проекты
      else if (fullUser.role === 'master') {
        const userProjects = await storage.getUserProjects(user.id);
        projects = userProjects.filter(p => p.status === 'active');
      }
      // Заказчик видит только свои активные проекты (где он заказчик)
      else if (fullUser.role === 'client') {
        const userProjects = await storage.getUserProjects(user.id);
        projects = userProjects.filter(p => p.status === 'active');
      }
      
      // Cache for admin/director (30 seconds)
      if (user.role === 'admin' || user.role === 'director') {
        cache.set(cacheKey, projects, 30);
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check access for clients - they can only see projects from their assigned client
      if (user.role === 'client') {
        // Get the client employee relationship
        const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
        if (!clientEmployee) {
          return res.status(403).json({ error: "No client assignment found" });
        }
        
        // Get projects for this client
        const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
        const hasAccess = clientProjects.some(cp => cp.projectId === req.params.id);
        
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied to this project" });
        }
      }

      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Создание проектов - только директор
  app.post("/api/projects", requireAuth, requireDirector, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        createdBy: req.session.user!.id
      });
      const project = await storage.createProject(projectData);
      
      // Invalidate cache
      cache.invalidate('projects:');
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Create project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/projects/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const projectData = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(req.params.id, projectData);
      
      // Invalidate cache
      invalidateProjectCache(req.params.id);
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/financial-summary", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const projectId = req.params.id;
      
      // Block clients from accessing financial data
      if (user.role === 'client') {
        return res.status(403).json({ error: "Clients cannot access financial summary" });
      }
      
      const cacheKey = cacheKeys.projectFinancialSummary(projectId);
      
      // Try cache first (10 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const summary = await storage.getProjectFinancialSummary(projectId);
      
      // Cache for 10 seconds
      cache.set(cacheKey, summary, 10);
      
      res.json(summary);
    } catch (error) {
      console.error("Get financial summary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Expense routes
  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const expenses = await storage.getUserExpenses(user.id);
      res.json(expenses);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/expenses", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const projectId = req.params.id;
      
      // Check access for clients
      if (user.role === 'client') {
        const userProjects = await storage.getUserProjects(user.id);
        const hasAccess = userProjects.some(p => p.id === projectId);
        
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied to this project" });
        }
      }
      
      const cacheKey = cacheKeys.projectExpenses(projectId);
      
      // Try cache first (30 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const expenses = await storage.getProjectExpenses(projectId);
      
      // Cache for 30 seconds
      cache.set(cacheKey, expenses, 30);
      
      res.json(expenses);
    } catch (error) {
      console.error("Get project expenses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        userId: req.session.user!.id
      });
      const expense = await storage.createExpense(expenseData);
      
      // Invalidate cache
      invalidateProjectCache(expenseData.projectId);
      
      // Create audit log for expense creation
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'expense',
        entityId: expense.id,
        action: 'create',
        fieldName: 'amount',
        oldValue: null,
        newValue: expenseData.amount,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: expenseData.projectId
      });
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Document routes
  app.get("/api/projects/:id/documents", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const projectId = req.params.id;
      
      // Check access for clients
      if (user.role === 'client') {
        // Get the client employee relationship
        const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
        if (!clientEmployee) {
          return res.status(403).json({ error: "No client assignment found" });
        }
        
        // Get projects for this client
        const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
        const hasAccess = clientProjects.some(cp => cp.projectId === projectId);
        
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied to this project" });
        }
        
        // For clients, return ALL documents (they can view but not edit/delete)
        const documents = await storage.getProjectDocuments(projectId);
        return res.json(documents);
      }
      
      const documents = await storage.getProjectDocuments(projectId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/documents", requireAuth, async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: req.session.user!.id
      });
      const document = await storage.createDocument(documentData);
      
      // Create audit log for document creation
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'document',
        entityId: document.id,
        action: 'upload',
        fieldName: 'name',
        oldValue: null,
        newValue: documentData.name,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: documentData.projectId
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      await storage.deleteDocument(req.params.id);
      
      // Create audit log for document deletion
      const user = req.session.user!;
      if (document) {
        await storage.createAuditLog({
          entityType: 'document',
          entityId: req.params.id,
          action: 'delete',
          fieldName: 'name',
          oldValue: document.name,
          newValue: null,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          projectId: document.projectId
        });
      }
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Advance routes
  app.get("/api/projects/:id/advances", requireAuth, requireDirector, async (req, res) => {
    try {
      const advances = await storage.getProjectAdvances(req.params.id);
      res.json(advances);
    } catch (error) {
      console.error("Get advances error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/advances", requireAuth, requireDirector, async (req, res) => {
    try {
      const advanceData = insertAdvanceSchema.parse({
        ...req.body,
        createdBy: req.session.user!.id
      });
      const advance = await storage.createAdvance(advanceData);
      
      // Invalidate cache
      invalidateProjectCache(advanceData.projectId);
      
      res.status(201).json(advance);
    } catch (error) {
      console.error("Create advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Customer Advance routes
  app.get("/api/projects/:id/customer-advances", requireAuth, requireDirector, async (req, res) => {
    try {
      const customerAdvances = await storage.getProjectCustomerAdvances(req.params.id);
      res.json(customerAdvances);
    } catch (error) {
      console.error("Get customer advances error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/customer-advances", requireAuth, requireDirector, async (req, res) => {
    try {
      const customerAdvanceData = insertCustomerAdvanceSchema.parse({
        ...req.body,
        createdBy: req.session.user!.id
      });
      const customerAdvance = await storage.createCustomerAdvance(customerAdvanceData);
      
      // Create audit log for customer advance creation
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'customer_advance',
        entityId: customerAdvance.id,
        action: 'create',
        fieldName: 'amount',
        oldValue: null,
        newValue: customerAdvanceData.amount,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: customerAdvanceData.projectId
      });
      
      res.status(201).json(customerAdvance);
    } catch (error) {
      console.error("Create customer advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Revenue routes
  app.get("/api/projects/:id/revenues", requireAuth, requireDirector, async (req, res) => {
    try {
      const revenues = await storage.getProjectRevenues(req.params.id);
      res.json(revenues);
    } catch (error) {
      console.error("Get revenues error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/revenues", requireAuth, requireDirector, async (req, res) => {
    try {
      const revenueData = insertRevenueSchema.parse({
        ...req.body,
        amount: req.body.amount.toString(),
        createdBy: req.session.user!.id,
        date: new Date(req.body.date || Date.now())
      });
      const revenue = await storage.createRevenue(revenueData);
      res.status(201).json(revenue);
    } catch (error) {
      console.error("Create revenue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/revenues/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const revenueData = {
        ...req.body,
        amount: req.body.amount.toString(),
        date: new Date(req.body.date)
      };
      const revenue = await storage.updateRevenue(req.params.id, revenueData);
      res.json(revenue);
    } catch (error) {
      console.error("Update revenue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/advances/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const advanceData = {
        ...req.body,
        amount: req.body.amount.toString(),
        date: new Date(req.body.date)
      };
      const advance = await storage.updateAdvance(req.params.id, advanceData);
      res.json(advance);
    } catch (error) {
      console.error("Update advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/customer-advances/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const oldAdvance = await storage.getCustomerAdvance(req.params.id);
      const customerAdvanceData = {
        ...req.body,
        amount: req.body.amount.toString(),
        date: new Date(req.body.date)
      };
      const customerAdvance = await storage.updateCustomerAdvance(req.params.id, customerAdvanceData);
      
      // Create audit log for customer advance update
      const user = req.session.user!;
      if (oldAdvance && customerAdvanceData.amount !== oldAdvance.amount) {
        await storage.createAuditLog({
          entityType: 'customer_advance',
          entityId: req.params.id,
          action: 'update',
          fieldName: 'amount',
          oldValue: oldAdvance.amount,
          newValue: customerAdvanceData.amount,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          projectId: oldAdvance.projectId
        });
      }
      
      res.json(customerAdvance);
    } catch (error) {
      console.error("Update customer advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      const expenseData = {
        ...req.body,
        amount: req.body.amount.toString()
      };
      const expense = await storage.updateExpense(req.params.id, expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Update expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete endpoints
  app.delete("/api/advances/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      // Get the advance to find its project ID
      const advance = await storage.getAdvanceById(req.params.id);
      
      await storage.deleteAdvance(req.params.id);
      
      // Clear all relevant caches comprehensively
      if (advance?.projectId) {
        invalidateProjectCache(advance.projectId);
        cache.del(cacheKeys.projectFinancialSummary(advance.projectId));
        cache.del(cacheKeys.projectAdvances(advance.projectId));
        cache.del(cacheKeys.project(advance.projectId));
      }
      cache.del(cacheKeys.projects());
      cache.del('financial-overview');
      cache.del(cacheKeys.analyticsProjects());
      
      res.json({ message: "Advance deleted successfully" });
    } catch (error) {
      console.error("Delete advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/customer-advances/:id", requireAuth, async (req, res) => {
    try {
      // Only admin and director can delete customer advances
      const userRole = req.session.user!.role;
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the advance to find its project ID
      const advance = await storage.getCustomerAdvanceById(req.params.id);
      
      await storage.deleteCustomerAdvance(req.params.id);
      
      // Clear all relevant caches comprehensively
      if (advance?.projectId) {
        invalidateProjectCache(advance.projectId);
        cache.del(cacheKeys.projectFinancialSummary(advance.projectId));
        cache.del(cacheKeys.projectCustomerAdvances(advance.projectId));
        cache.del(cacheKeys.project(advance.projectId));
        cache.del(cacheKeys.projectExpenses(advance.projectId));
        cache.del(cacheKeys.projectAdvances(advance.projectId));
        cache.del(cacheKeys.projectDocuments(advance.projectId));
      }
      cache.del(cacheKeys.projects());
      cache.del('financial-overview');
      cache.del(cacheKeys.analyticsProjects());
      
      // Create audit log for customer advance deletion
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'customer_advance',
        entityId: req.params.id,
        action: 'delete',
        fieldName: 'amount',
        oldValue: advance?.amount || '0',
        newValue: undefined,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: advance?.projectId
      });
      
      res.json({ message: "Customer advance deleted successfully" });
    } catch (error) {
      console.error("Delete customer advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      // Only admin and director can delete expenses
      const userRole = req.session.user!.role;
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the expense to find its project ID
      const expense = await storage.getExpenseById(req.params.id);
      
      await storage.deleteExpense(req.params.id);
      
      // Clear all relevant caches comprehensively
      if (expense?.projectId) {
        invalidateProjectCache(expense.projectId);
        invalidateCache(cacheKeys.projectFinancialSummary(expense.projectId));
        invalidateCache(cacheKeys.projectExpenses(expense.projectId));
        invalidateCache(cacheKeys.project(expense.projectId));
      }
      invalidateCache(cacheKeys.projects());
      invalidateCache('financial-overview');
      invalidateCache(cacheKeys.analyticsProjects());
      
      // Create audit log for expense deletion
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'expense',
        entityId: req.params.id,
        action: 'delete',
        fieldName: 'amount',
        oldValue: expense?.amount || '0',
        newValue: undefined,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: expense?.projectId
      });
      
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Delete expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/revenues/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      await storage.deleteRevenue(req.params.id);
      res.json({ message: "Revenue deleted successfully" });
    } catch (error) {
      console.error("Delete revenue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  // Documents routes
  app.get("/api/projects/:projectId/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getProjectDocuments(req.params.projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Owner Investments routes
  app.get("/api/projects/:projectId/owner-investments", requireAuth, async (req, res) => {
    try {
      const ownerInvestments = await storage.getProjectOwnerInvestments(req.params.projectId);
      res.json(ownerInvestments);
    } catch (error) {
      console.error("Error fetching owner investments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/owner-investments/:id", requireAuth, async (req, res) => {
    try {
      const ownerInvestment = await storage.getOwnerInvestment(req.params.id);
      if (!ownerInvestment) {
        return res.status(404).json({ error: "Owner investment not found" });
      }
      res.json(ownerInvestment);
    } catch (error) {
      console.error("Error fetching owner investment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/projects/:projectId/owner-investments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertOwnerInvestmentSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdBy: req.session.user!.id
      });

      const ownerInvestment = await storage.createOwnerInvestment(validatedData);
      
      // Create audit log for owner investment creation
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'owner_investment',
        entityId: ownerInvestment.id,
        action: 'create',
        fieldName: 'amount',
        oldValue: null,
        newValue: validatedData.amount,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: req.params.projectId
      });
      
      res.status(201).json(ownerInvestment);
    } catch (error) {
      console.error("Error creating owner investment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/owner-investments/:id", requireAuth, async (req, res) => {
    try {
      const oldInvestment = await storage.getOwnerInvestment(req.params.id);
      const validatedData = insertOwnerInvestmentSchema.partial().parse(req.body);
      const ownerInvestment = await storage.updateOwnerInvestment(req.params.id, validatedData);
      
      // Create audit log for owner investment update
      const user = req.session.user!;
      if (validatedData.amount && oldInvestment) {
        await storage.createAuditLog({
          entityType: 'owner_investment',
          entityId: req.params.id,
          action: 'update',
          fieldName: 'amount',
          oldValue: oldInvestment.amount,
          newValue: validatedData.amount,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          projectId: oldInvestment.projectId
        });
      }
      
      res.json(ownerInvestment);
    } catch (error) {
      console.error("Error updating owner investment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/owner-investments/:id", requireAuth, async (req, res) => {
    try {
      // Only admin and director can delete owner investments
      const userRole = req.session.user!.role;
      if (userRole !== 'admin' && userRole !== 'director') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the investment to find its project ID
      const investment = await storage.getOwnerInvestmentById(req.params.id);
      
      await storage.deleteOwnerInvestment(req.params.id);
      
      // Clear all relevant caches comprehensively
      if (investment?.projectId) {
        invalidateProjectCache(investment.projectId);
        cache.del(cacheKeys.projectFinancialSummary(investment.projectId));
        cache.del(cacheKeys.projectOwnerInvestments(investment.projectId));
        cache.del(cacheKeys.project(investment.projectId));
      }
      cache.del(cacheKeys.projects());
      cache.del('financial-overview');
      cache.del(cacheKeys.analyticsProjects());
      
      // Create audit log for owner investment deletion
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'owner_investment',
        entityId: req.params.id,
        action: 'delete',
        fieldName: 'amount',
        oldValue: investment?.amount || '0',
        newValue: undefined,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: investment?.projectId
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting owner investment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Documents routes
  app.post("/api/projects/:projectId/documents", requireAuth, requireDirector, async (req, res) => {
    try {
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        uploadedBy: req.session.user!.id,
      });
      const document = await storage.createDocument(documentData);
      
      // Invalidate cache
      invalidateProjectCache(documentData.projectId);
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Create document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete document from database
      await storage.deleteDocument(req.params.id);
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // File upload route
  app.post("/api/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileUrl = `/api/files/${req.file.filename}`;
      
      res.json({
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve uploaded files
  app.get("/api/files/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  });

  // Object Storage service instance
  const objectStorageService = new ObjectStorageService();

  // Get upload URL for object storage
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      console.log("Getting upload URL for user:", req.session.user?.id);
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log("Generated upload URL:", uploadURL);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Set object ACL policy for uploaded files  
  app.post("/api/objects/acl", requireAuth, async (req, res) => {
    try {
      const { objectUrl, visibility = 'private' } = req.body;
      const userId = req.session.user?.id;
      
      const aclPolicy = {
        owner: userId,
        visibility,
      };
      
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(objectUrl, aclPolicy);
      res.json({ objectPath });
    } catch (error) {
      console.error("Failed to set ACL policy:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    const userId = req.session.user?.id;
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      // For implementation photos, allow read access to authenticated users for now
      const canAccess = true;
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Contractors routes
  app.get("/api/contractors", requireAuth, async (req, res) => {
    try {
      const cacheKey = cacheKeys.contractors();
      
      // Try cache first (60 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const contractors = await storage.getAllContractors();
      
      // Cache for 60 seconds
      cache.set(cacheKey, contractors, 60);
      
      res.json(contractors);
    } catch (error) {
      console.error("Failed to get contractors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contractors/:id", requireAuth, async (req, res) => {
    try {
      const contractor = await storage.getContractor(req.params.id);
      if (!contractor) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      res.json(contractor);
    } catch (error) {
      console.error("Failed to get contractor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get contractor expenses
  app.get("/api/contractors/:id/expenses", requireAuth, async (req, res) => {
    try {
      const expenses = await storage.getContractorExpenses(req.params.id);
      res.json(expenses);
    } catch (error) {
      console.error("Failed to get contractor expenses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get contractor statistics
  app.get("/api/contractors/:id/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getContractorStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get contractor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contractors", requireAuth, async (req, res) => {
    try {
      const contractorData = insertContractorSchema.parse({
        ...req.body,
        createdBy: req.session?.user?.id
      });
      const contractor = await storage.createContractor(contractorData);
      
      // Invalidate cache
      invalidateContractorCache();
      
      res.json(contractor);
    } catch (error) {
      console.error("Failed to create contractor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/contractors/:id", requireAuth, async (req, res) => {
    try {
      const contractor = await storage.updateContractor(req.params.id, req.body);
      res.json(contractor);
    } catch (error) {
      console.error("Failed to update contractor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/contractors/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteContractor(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete contractor:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Contractor-Project assignments
  app.get("/api/projects/:projectId/contractors", requireAuth, async (req, res) => {
    try {
      const contractors = await storage.getProjectContractors(req.params.projectId);
      res.json(contractors);
    } catch (error) {
      console.error("Failed to get project contractors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/contractors/:contractorId/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getContractorProjects(req.params.contractorId);
      res.json(projects);
    } catch (error) {
      console.error("Failed to get contractor projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Contractor project assignment routes
  app.get("/api/contractor-projects/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const assignment = await storage.getContractorProjectAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Failed to get contractor project assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/contractor-projects/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      const updateData: Partial<InsertContractorProject> = {};
      
      if (req.body.budget !== undefined) {
        updateData.budget = req.body.budget;
      }
      if (req.body.description !== undefined) {
        updateData.description = req.body.description;
      }
      if (req.body.startDate !== undefined) {
        updateData.startDate = new Date(req.body.startDate);
      }
      if (req.body.endDate !== undefined) {
        updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
      }
      if (req.body.status !== undefined) {
        updateData.status = req.body.status as 'active' | 'completed' | 'paused';
      }

      const assignment = await storage.updateContractorProject(req.params.id, updateData);
      res.json(assignment);
    } catch (error) {
      console.error("Failed to update contractor project assignment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/contractors/:contractorId/assign-project", requireAuth, async (req, res) => {
    try {
      const contractorProjectData = insertContractorProjectSchema.parse({
        ...req.body,
        contractorId: req.params.contractorId,
        createdBy: req.session?.user?.id
      });
      const contractorProject = await storage.assignContractorToProject(contractorProjectData);
      res.json(contractorProject);
    } catch (error) {
      console.error("Failed to assign contractor to project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/contractor-projects/:id", requireAuth, async (req, res) => {
    try {
      const contractorProject = await storage.updateContractorProject(req.params.id, req.body);
      res.json(contractorProject);
    } catch (error) {
      console.error("Failed to update contractor project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/contractor-projects/:id", requireAuth, async (req, res) => {
    try {
      await storage.removeContractorFromProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove contractor from project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Clients routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const cacheKey = cacheKeys.clients();
      
      // Try cache first (60 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const clients = await storage.getAllClients();
      
      // Cache for 60 seconds
      cache.set(cacheKey, clients, 60);
      
      res.json(clients);
    } catch (error) {
      console.error("Failed to get clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get projects for a specific client (for client role users)
  app.get("/api/clients/:clientId/projects", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const userId = req.session.user?.id;
      const userRole = req.session.user?.role;
      
      // For client role, find their client record by user ID
      if (userRole === 'client') {
        // Get client by user ID (assuming username matches client name or we have a user-client mapping)
        const allClients = await storage.getAllClients();
        const userClient = allClients.find(client => 
          client.name === req.session.user?.name || 
          client.name === req.session.user?.username
        );
        
        if (!userClient || userClient.id !== clientId) {
          return res.status(403).json({ error: "Access denied - you can only view your own projects" });
        }
      }
      
      const projects = await storage.getClientProjects(clientId);
      res.json(projects);
    } catch (error) {
      console.error("Failed to get client projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user's client projects (for client role)
  app.get("/api/my-client-projects", requireAuth, async (req, res) => {
    try {
      const userRole = req.session.user?.role;
      const userId = req.session.user?.id;
      
      if (userRole !== 'client') {
        return res.status(403).json({ error: "Access denied - only for client users" });
      }
      
      // Find client through client_employees table
      const clientEmployee = await storage.getClientEmployeeByUserId(userId!);
      
      if (!clientEmployee) {
        return res.json([]); // No projects if user is not linked to a client
      }
      
      const projects = await storage.getClientProjects(clientEmployee.clientId);
      res.json(projects);
    } catch (error) {
      console.error("Failed to get user's client projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get deleted clients
  app.get("/api/clients/deleted", requireAuth, async (req, res) => {
    try {
      const deletedClients = await storage.getDeletedClients();
      res.json(deletedClients);
    } catch (error) {
      console.error("Failed to get deleted clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Restore client
  app.post("/api/clients/:id/restore", requireAuth, async (req, res) => {
    try {
      const client = await storage.restoreClient(req.params.id);
      
      // Invalidate clients cache
      cache.invalidate('clients:');
      
      res.json(client);
    } catch (error) {
      console.error("Failed to restore client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Failed to get client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get client statistics
  app.get("/api/clients/:id/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getClientStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get client stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get client payments
  app.get("/api/clients/:id/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getClientPayments(req.params.id);
      res.json(payments);
    } catch (error) {
      console.error("Failed to get client payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Client employees endpoints
  app.get("/api/clients/:id/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getClientEmployees(req.params.id);
      res.json(employees);
    } catch (error) {
      console.error("Failed to get client employees:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/clients/:id/employees", requireAuth, async (req, res) => {
    try {
      const { employeeIds } = req.body;
      const clientId = req.params.id;
      const assignedBy = req.session?.user?.id;
      
      if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ error: "employeeIds must be a non-empty array" });
      }

      if (!assignedBy) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await storage.assignEmployeesToClient(clientId, employeeIds, assignedBy);
      res.json({ success: true, assignedCount: employeeIds.length });
    } catch (error) {
      console.error("Failed to assign employees to client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/clients/:id/employees/:userId", requireAuth, async (req, res) => {
    try {
      const { id: clientId, userId } = req.params;
      await storage.removeEmployeeFromClient(clientId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove employee from client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get client projects
  app.get("/api/clients/:id/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getClientProjects(req.params.id);
      res.json(projects);
    } catch (error) {
      console.error("Failed to get client projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse({
        ...req.body,
        createdBy: req.session?.user?.id
      });
      const client = await storage.createClient(clientData);
      
      // If a user is linked to this client, automatically assign all client projects to the user
      if (clientData.userId) {
        try {
          const clientProjects = await storage.getClientProjects(client.id);
          for (const project of clientProjects) {
            // Check if user-project relation already exists
            const existingUserProjects = await storage.getUserProjects(clientData.userId);
            const hasProject = existingUserProjects.some(up => up.id === project.projectId);
            
            if (!hasProject) {
              // Create user-project relation
              await storage.assignUserToProject({
                userId: clientData.userId,
                projectId: project.projectId
              });
            }
          }
        } catch (assignError) {
          console.error("Failed to auto-assign projects to user:", assignError);
          // Don't fail the client creation if project assignment fails
        }
      }
      
      // Invalidate cache
      invalidateClientCache();
      
      res.json(client);
    } catch (error) {
      console.error("Failed to create client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      
      // If a new user is linked to this client, automatically assign all client projects to the user
      if (req.body.userId) {
        try {
          const clientProjects = await storage.getClientProjects(req.params.id);
          for (const project of clientProjects) {
            // Check if user-project relation already exists
            const existingUserProjects = await storage.getUserProjects(req.body.userId);
            const hasProject = existingUserProjects.some(up => up.id === project.projectId);
            
            if (!hasProject) {
              // Create user-project relation
              await storage.assignUserToProject({
                userId: req.body.userId,
                projectId: project.projectId
              });
            }
          }
        } catch (assignError) {
          console.error("Failed to auto-assign projects to user:", assignError);
          // Don't fail the client update if project assignment fails
        }
      }
      
      res.json(client);
    } catch (error) {
      console.error("Failed to update client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      
      // Invalidate clients cache
      cache.invalidate('clients:');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  // Client projects routes
  app.get("/api/projects/:projectId/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getProjectClients(req.params.projectId);
      res.json(clients);
    } catch (error) {
      console.error("Failed to get project clients:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/clients/:clientId/projects", requireAuth, async (req, res) => {
    try {
      const clientProjectData = insertClientProjectSchema.parse({
        ...req.body,
        clientId: req.params.clientId,
        createdBy: req.session?.user?.id
      });
      const clientProject = await storage.assignClientToProject(clientProjectData);
      res.json(clientProject);
    } catch (error) {
      console.error("Failed to assign client to project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/clients/:clientId/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.updateClientProject(req.params.id, req.body);
      res.json(project);
    } catch (error) {
      console.error("Failed to update client project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/client-projects/:id", requireAuth, async (req, res) => {
    try {
      const clientProject = await storage.updateClientProject(req.params.id, req.body);
      res.json(clientProject);
    } catch (error) {
      console.error("Failed to update client project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/client-projects/:id", requireAuth, async (req, res) => {
    try {
      await storage.removeClientFromProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove client from project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Client payments routes
  app.get("/api/projects/:projectId/client-payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getProjectClientPayments(req.params.projectId);
      res.json(payments);
    } catch (error) {
      console.error("Failed to get project client payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/client-payments", requireAuth, async (req, res) => {
    try {
      const paymentData = insertClientPaymentSchema.parse({
        ...req.body,
        createdBy: req.session?.user?.id
      });
      const payment = await storage.createClientPayment(paymentData);
      res.json(payment);
    } catch (error) {
      console.error("Failed to create client payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/client-payments/:id", requireAuth, async (req, res) => {
    try {
      const payment = await storage.updateClientPayment(req.params.id, req.body);
      res.json(payment);
    } catch (error) {
      console.error("Failed to update client payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/client-payments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteClientPayment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete client payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tools routes
  app.get("/api/tools", requireAuth, async (req, res) => {
    try {
      const tools = await storage.getAllTools();
      res.json(tools);
    } catch (error) {
      console.error("Failed to get tools:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tools/:id", requireAuth, async (req, res) => {
    try {
      const tool = await storage.getTool(req.params.id);
      if (!tool) {
        return res.status(404).json({ error: "Tool not found" });
      }
      res.json(tool);
    } catch (error) {
      console.error("Failed to get tool:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tools", requireAuth, async (req, res) => {
    try {
      const validatedData = insertToolSchema.parse({
        ...req.body,
        createdBy: req.session.user!.id,
      });
      const tool = await storage.createTool(validatedData);
      res.status(201).json(tool);
    } catch (error) {
      console.error("Failed to create tool:", error);
      res.status(400).json({ error: "Validation error" });
    }
  });

  app.patch("/api/tools/:id", requireAuth, async (req, res) => {
    try {
      const tool = await storage.updateTool(req.params.id, req.body);
      res.json(tool);
    } catch (error) {
      console.error("Failed to update tool:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/tools/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteTool(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete tool:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tool movements routes
  app.get("/api/tools/:id/movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getToolMovements(req.params.id);
      res.json(movements);
    } catch (error) {
      console.error("Failed to get tool movements:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tools/:id/movements", requireAuth, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Photo is required" });
      }

      // Upload photo to object storage
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      
      let photoUrl = `/uploads/${req.file.filename}`; // fallback for local storage
      
      try {
        // Try to upload to object storage
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        
        // Create FormData to upload file
        const fs = await import('fs');
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Upload to object storage
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: fileBuffer,
          headers: {
            'Content-Type': req.file.mimetype,
          },
        });
        
        if (uploadResponse.ok) {
          // Set ACL policy for the uploaded object
          photoUrl = objectStorageService.normalizeObjectEntityPath(uploadURL);
        }
        
        // Clean up local file
        fs.unlinkSync(req.file.path);
      } catch (storageError) {
        console.warn("Object storage upload failed, using local storage:", storageError);
        // Keep the local file as fallback
      }

      const validatedData = insertToolMovementSchema.parse({
        ...req.body,
        toolId: req.params.id,
        photoUrl: photoUrl,
        createdBy: req.session.user!.id,
      });

      const movement = await storage.createToolMovement(validatedData);
      res.status(201).json(movement);
    } catch (error) {
      console.error("Failed to create tool movement:", error);
      res.status(400).json({ error: "Validation error" });
    }
  });

  // Recent tool persons
  app.get("/api/tool-persons/recent", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const persons = await storage.getRecentToolPersons(limit);
      res.json(persons);
    } catch (error) {
      console.error("Failed to get recent tool persons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve objects (photos) from object storage
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    try {
      const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
      const { ObjectPermission } = await import('./objectAcl');
      
      const userId = req.session?.user?.id;
      const objectStorageService = new ObjectStorageService();
      
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      // For now, allow access to all authenticated users
      // Later can implement proper ACL based on user roles
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof (await import('./objectStorage')).ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Admin middleware - только для platonabramov90@gmail.com
  // Middleware для проверки ролей
  const requireRole = (allowedRoles: string[]) => {
    return async (req: any, res: any, next: any) => {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUserById(req.session.user.id);
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      next();
    };
  };

  // Специализированные middleware
  const requireAdmin = requireRole(["admin"]);
  const requireDirectorOrAdmin = requireRole(["admin", "director"]);
  const requireMasterOrAbove = requireRole(["admin", "director", "master"]);
  const requireAnyRole = requireRole(["admin", "director", "master", "client"]);

  // Админ-панель: статистика


  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeSessions = await storage.getActiveSessions();
      const failedLoginsToday = await storage.getFailedLoginsToday();
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive && !u.isBlocked).length,
        blockedUsers: users.filter(u => u.isBlocked).length,
        activeSessions: activeSessions.length,
        failedLoginsToday: failedLoginsToday.length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Failed to get admin stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: список пользователей
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const { search, status } = req.query;
      let users = await storage.getAllUsers();
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        users = users.filter(user => 
          user.username.toLowerCase().includes(searchLower) ||
          user.name.toLowerCase().includes(searchLower) ||
          (user.email && user.email.toLowerCase().includes(searchLower))
        );
      }
      
      if (status && status !== 'all') {
        if (status === 'active') {
          users = users.filter(user => user.isActive && !user.isBlocked);
        } else if (status === 'blocked') {
          users = users.filter(user => user.isBlocked);
        }
      }
      
      res.json(users);
    } catch (error) {
      console.error("Failed to get users:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: создание пользователя
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const validatedData = createUserSchema.parse(req.body);
      
      // Проверяем, что пользователь с таким логином не существует
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
      }
      
      // Используем стандартный пароль 123456 для продакшена если не указан
      const finalPassword = validatedData.password || '123456';
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      console.log(`Creating user with password '${finalPassword}' and hash:`, hashedPassword);
      
      const user = await storage.createUser({
        username: validatedData.username,
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role,
        isActive: true,
        isBlocked: false,
        tempPassword: null,
        mustChangePassword: false,
        createdBy: req.session.user!.id,
      });
      
      // Логируем действие админа
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: 'create_user',
        targetUserId: user.id,
        details: { username: validatedData.username, role: validatedData.role },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(400).json({ error: "Validation error" });
    }
  });

  // Админ-панель: блокировка/разблокировка пользователя
  app.patch("/api/admin/users/:userId/block", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { blocked } = req.body;
      
      await storage.updateUserBlockStatus(userId, blocked);
      
      // Логируем действие админа
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: blocked ? 'block_user' : 'unblock_user',
        targetUserId: userId,
        details: { blocked },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update user block status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: сброс пароля
  app.post("/api/admin/users/:userId/reset-password", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Генерируем временный пароль (или устанавливаем 123456 как стандартный)
      const tempPassword = '123456'; // Стандартный пароль для продакшена
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      console.log(`Resetting password to '${tempPassword}' with hash:`, hashedPassword);
      
      await storage.updateUserPassword(userId, hashedPassword, true); // mustChangePassword = true
      
      // Логируем действие админа
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: 'reset_password',
        targetUserId: userId,
        details: { tempPassword: 'generated' },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.json({ tempPassword });
    } catch (error) {
      console.error("Failed to reset password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: установка пароля
  app.post("/api/admin/users/:userId/set-password", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      if (!password || password.length < 3) {
        return res.status(400).json({ error: "Пароль должен содержать минимум 3 символа" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(userId, hashedPassword, false); // mustChangePassword = false для админа
      
      // Логируем действие админа
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: 'set_password',
        targetUserId: userId,
        details: { customPassword: true },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to set password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: принудительный выход
  app.post("/api/admin/users/:userId/force-logout", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      await storage.deactivateUserSessions(userId);
      
      // Логируем действие админа
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: 'force_logout',
        targetUserId: userId,
        details: {},
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to force logout:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: журнал действий
  app.get("/api/admin/actions", requireAdmin, async (req, res) => {
    try {
      const actions = await storage.getAdminActions();
      res.json(actions);
    } catch (error) {
      console.error("Failed to get admin actions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: логи входов
  app.get("/api/admin/login-attempts", requireAdmin, async (req, res) => {
    try {
      const attempts = await storage.getLoginAttempts();
      res.json(attempts);
    } catch (error) {
      console.error("Failed to get login attempts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Удаление пользователя
  app.delete("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Проверяем, что пользователь не удаляет сам себя
      if (userId === req.session.user!.id) {
        return res.status(400).json({ error: "Нельзя удалить собственную учетную запись" });
      }
      
      // Логируем действие админа ПЕРЕД удалением пользователя
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: 'delete_user',
        targetUserId: userId,
        details: {},
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      await storage.deleteUser(userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Админ-панель: установка стандартного пароля для пользователя
  app.post("/api/admin/users/:userId/set-password", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      // Используем стандартный пароль если не указан
      const finalPassword = password || '123456';
      const hashedPassword = await bcrypt.hash(finalPassword, 10);
      console.log(`Setting password '${finalPassword}' for user ${userId} with hash:`, hashedPassword);
      
      await storage.updateUserPassword(userId, hashedPassword, false); // mustChangePassword = false
      
      // Логируем действие админа
      await storage.logAdminAction({
        adminUserId: req.session.user!.id,
        action: 'set_password',
        targetUserId: userId,
        details: { passwordSet: true },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.json({ success: true, password: finalPassword });
    } catch (error) {
      console.error("Failed to set password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Remove duplicate ACL endpoint (already added above)

  // Implementation sheets endpoints
  
  // Get all implementation sheets for a project
  app.get("/api/projects/:projectId/implementation-sheets", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const { projectId } = req.params;
      
      // Check user access to project
      const isAdminOrDirector = user.role === 'admin' || user.role === 'director';
      if (!isAdminOrDirector) {
        if (user.role === 'client') {
          // For client users, check via client_employees table
          const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
          if (!clientEmployee) {
            return res.status(403).json({ error: "No client assignment found" });
          }
          
          const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
          const hasAccess = clientProjects.some(cp => cp.projectId === projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        } else {
          // For master users, check via user_projects table
          const userProjects = await storage.getUserProjects(user.id);
          const hasAccess = userProjects.some(p => p.id === projectId);
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        }
      }
      
      const sheets = await storage.getImplementationSheets(projectId);
      
      // For clients, filter to show only visible items and photos
      if (user.role === 'client') {
        const clientSheets = await Promise.all(sheets.map(async (sheet) => {
          const items = await storage.getImplementationItems(sheet.id);
          const visibleItems = await Promise.all(items.map(async (item) => {
            if (!item.visibleToClient) return null;
            
            const photos = await storage.getImplementationPhotos(item.id);
            const visiblePhotos = photos.filter(photo => photo.visibleToClient);
            
            return { ...item, photos: visiblePhotos };
          }));
          
          return { 
            ...sheet, 
            items: visibleItems.filter(item => item !== null) 
          };
        }));
        return res.json(clientSheets);
      }
      
      res.json(sheets);
    } catch (error) {
      console.error("Failed to get implementation sheets:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single implementation sheet with items
  app.get("/api/implementation-sheets/:sheetId", requireAuth, async (req, res) => {
    try {
      const { sheetId } = req.params;
      
      const sheet = await storage.getImplementationSheet(sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Лист реализации не найден" });
      }
      
      // Check user access to project
      const user = req.session.user!;
      const isAdminOrDirector = user.role === 'admin' || user.role === 'director';
      
      if (!isAdminOrDirector) {
        if (user.role === 'client') {
          // For client users, check via client_employees table
          const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
          if (!clientEmployee) {
            return res.status(403).json({ error: "No client assignment found" });
          }
          
          const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
          const hasAccess = clientProjects.some(cp => cp.projectId === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        } else {
          // For master users, check via user_projects table
          const userProjects = await storage.getUserProjects(user.id);
          const hasAccess = userProjects.some(p => p.id === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        }
      }
      
      const items = await storage.getImplementationItems(sheetId);
      
      // For clients, filter to show only visible items and photos
      if (user.role === 'client') {
        const visibleItems = await Promise.all(items.map(async (item) => {
          if (!item.visibleToClient) return null;
          
          const photos = await storage.getImplementationPhotos(item.id);
          const visiblePhotos = photos.filter(photo => photo.visibleToClient);
          
          return { ...item, photos: visiblePhotos };
        }));
        
        const filteredItems = visibleItems.filter(item => item !== null);
        return res.json({ ...sheet, items: filteredItems });
      }
      
      res.json({ ...sheet, items });
    } catch (error) {
      console.error("Failed to get implementation sheet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Parse invoice and create implementation sheet
  app.post("/api/projects/:projectId/implementation-sheets/parse-invoice", requireDirector, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { name, documentId } = req.body;

      if (!name || !documentId) {
        return res.status(400).json({ error: "Name and document ID are required" });
      }

      // Get the document
      const document = await storage.getDocumentById(documentId);
      if (!document || document.projectId !== projectId) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Check if document name starts with "invoice"
      if (!document.fileName.toLowerCase().startsWith('invoice')) {
        return res.status(400).json({ error: "Document name must start with 'invoice'" });
      }

      // Parse the invoice from cloud storage
      const { InvoiceParser } = await import('./invoiceParser');
      const parser = new InvoiceParser();
      
      console.log('Document file URL:', document.fileUrl);
      
      // Download file from object storage
      let fileBuffer: Buffer;
      try {
        // Handle different file URL formats
        if (document.fileUrl.startsWith('gs://') || 
            document.fileUrl.startsWith('/objects/') ||
            document.fileUrl.startsWith('https://storage.googleapis.com/')) {
          // File is in object storage - download from cloud
          fileBuffer = await objectStorageService.downloadFile(document.fileUrl);
        } else {
          // Legacy local file path - handle gracefully
          console.error('Unsupported file URL format:', document.fileUrl);
          return res.status(400).json({ 
            error: "File format not supported", 
            details: [`Unsupported file URL format: ${document.fileUrl}. Must be stored in object storage.`] 
          });
        }
      } catch (downloadError: any) {
        console.error('Failed to download file from object storage:', downloadError);
        return res.status(400).json({ 
          error: "File not found in storage", 
          details: [`Failed to download file: ${downloadError?.message || 'Unknown error'}`] 
        });
      }

      const parseResult = await parser.parseInvoiceFromBuffer(fileBuffer, document.fileName);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Failed to parse invoice", 
          details: parseResult.errors,
          suggestColumnMapping: parseResult.suggestColumnMapping,
          rawData: parseResult.rawData
        });
      }

      // Create implementation sheet
      const sheetData = {
        projectId,
        sourceDocumentId: documentId,
        name,
        autoGenerated: true,
        parsedFromFormat: parseResult.format,
        parseErrors: parseResult.errors || [],
        createdBy: req.session.user!.id
      };

      const sheet = await storage.createImplementationSheet(sheetData);

      // Create implementation items from parsed data
      for (let i = 0; i < parseResult.items.length; i++) {
        const item = parseResult.items[i];
        
        // Validate and limit numeric values to prevent overflow
        const quantity = isNaN(item.quantity || 0) ? 0 : Math.min(Math.abs(item.quantity || 0), 999999);
        const price = isNaN(item.price || 0) ? 0 : Math.min(Math.abs(item.price || 0), 999999);
        const totalCost = isNaN(item.totalCost || 0) ? 0 : Math.min(Math.abs(item.totalCost || 0), 999999);
        
        const itemData = {
          sheetId: sheet.id,
          position: item.position || i + 1,
          name: item.name || `Item ${i + 1}`,
          quantity: quantity,
          unit: item.unit || '',
          price: price,
          totalCost: totalCost,
          description: item.description || '',
          progress: 0,
          isCompleted: false,
          visibleToClient: true,
          lastUpdatedBy: req.session.user!.id
        };

        await storage.createImplementationItem(itemData);
      }

      // Get the complete sheet with items  
      const completeSheet = await storage.getImplementationSheet(sheet.id);
      
      res.json({
        sheet: completeSheet,
        parsedItems: parseResult.items.length,
        format: parseResult.format
      });

    } catch (error) {
      console.error("Failed to parse invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create implementation sheet
  app.post("/api/projects/:projectId/implementation-sheets", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут создавать листы реализации" });
      }
      
      const sheet = await storage.createImplementationSheet({
        ...req.body,
        projectId,
        createdBy: req.session.user!.id
      });
      
      res.json(sheet);
    } catch (error) {
      console.error("Failed to create implementation sheet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update implementation sheet
  app.put("/api/implementation-sheets/:sheetId", requireAuth, async (req, res) => {
    try {
      const { sheetId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут редактировать листы реализации" });
      }
      
      const sheet = await storage.updateImplementationSheet(sheetId, req.body);
      res.json(sheet);
    } catch (error) {
      console.error("Failed to update implementation sheet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete implementation sheet
  app.delete("/api/implementation-sheets/:sheetId", requireAuth, async (req, res) => {
    try {
      const { sheetId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут удалять листы реализации" });
      }
      
      await storage.deleteImplementationSheet(sheetId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete implementation sheet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create implementation item
  app.post("/api/implementation-sheets/:sheetId/items", requireAuth, async (req, res) => {
    try {
      const { sheetId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут добавлять позиции" });
      }
      
      const item = await storage.createImplementationItem({
        ...req.body,
        sheetId
      });
      
      res.json(item);
    } catch (error) {
      console.error("Failed to create implementation item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update implementation item
  app.put("/api/implementation-items/:itemId", requireAuth, async (req, res) => {
    try {
      const { itemId } = req.params;
      
      const item = await storage.getImplementationItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Позиция не найдена" });
      }
      
      const sheet = await storage.getImplementationSheet(item.sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Лист реализации не найден" });
      }
      
      // Check user access
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      if (!isAdminOrDirector) {
        if (req.session.user!.role === 'client') {
          // For client users, check via client_employees table
          const clientEmployee = await storage.getClientEmployeeByUserId(req.session.user!.id);
          if (!clientEmployee) {
            return res.status(403).json({ error: "No client assignment found" });
          }
          
          const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
          const hasAccess = clientProjects.some(cp => cp.projectId === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        } else {
          // For master users, check via user_projects table
          const userProject = await storage.getUserProject(req.session.user!.id, sheet.projectId);
          if (!userProject) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        }
      }
      
      const updatedItem = await storage.updateImplementationItem(
        itemId, 
        req.body, 
        req.session.user!.id
      );
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Failed to update implementation item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete implementation item
  app.delete("/api/implementation-items/:itemId", requireAuth, async (req, res) => {
    try {
      const { itemId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут удалять позиции" });
      }
      
      await storage.deleteImplementationItem(itemId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete implementation item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get photos for implementation item
  app.get("/api/implementation-items/:itemId/photos", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const { itemId } = req.params;
      
      // Check access for clients
      if (user.role === 'client') {
        const item = await storage.getImplementationItem(itemId);
        if (!item) {
          return res.status(404).json({ error: "Item not found" });
        }
        
        const sheet = await storage.getImplementationSheet(item.sheetId);
        if (!sheet) {
          return res.status(404).json({ error: "Sheet not found" });
        }
        
        // Check via client_employees for client users
        const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
        if (!clientEmployee) {
          return res.status(403).json({ error: "No client assignment found" });
        }
        
        const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
        const hasAccess = clientProjects.some(cp => cp.projectId === sheet.projectId);
        
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied" });
        }
        
        // For clients, return ALL photos (they can view but not edit/delete)
        const photos = await storage.getImplementationPhotos(itemId);
        return res.json(photos);
      }
      
      const photos = await storage.getImplementationPhotos(itemId);
      res.json(photos);
    } catch (error) {
      console.error("Failed to get implementation photos:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Upload photo for implementation item
  app.post("/api/implementation-items/:itemId/photos", requireAuth, async (req, res) => {
    try {
      const { itemId } = req.params;
      const { photoUrl, thumbnailUrl, caption, visibleToClient } = req.body;
      
      const photo = await storage.createImplementationPhoto({
        itemId,
        photoUrl,
        thumbnailUrl,
        caption,
        visibleToClient,
        uploadedBy: req.session.user!.id
      });
      
      // Create audit log for photo upload
      const user = req.session.user!;
      const item = await storage.getImplementationItem(itemId);
      if (item) {
        const sheet = await storage.getImplementationSheet(item.sheetId);
        if (sheet) {
          await storage.createAuditLog({
            entityType: 'photo',
            entityId: photo.id,
            action: 'upload',
            fieldName: 'url',
            oldValue: null,
            newValue: photo.photoUrl,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            projectId: sheet.projectId
          });
        }
      }
      
      res.json(photo);
    } catch (error) {
      console.error("Failed to create implementation photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete photo
  app.delete("/api/implementation-photos/:photoId", requireAuth, async (req, res) => {
    try {
      const { photoId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут удалять фотографии" });
      }
      
      // Get photo info before deletion for audit log
      const photo = await storage.getImplementationPhoto(photoId);
      await storage.deleteImplementationPhoto(photoId, req.session.user!.id);
      
      // Create audit log for photo deletion
      const user = req.session.user!;
      if (photo) {
        const item = await storage.getImplementationItem(photo.itemId);
        if (item) {
          const sheet = await storage.getImplementationSheet(item.sheetId);
          if (sheet) {
            await storage.createAuditLog({
              entityType: 'photo',
              entityId: photoId,
              action: 'delete',
              fieldName: 'url',
              oldValue: photo.photoUrl,
              newValue: null,
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              projectId: sheet.projectId
            });
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete implementation photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get change logs for implementation item
  app.get("/api/implementation-items/:itemId/logs", requireAuth, async (req, res) => {
    try {
      const { itemId } = req.params;
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      
      if (!isAdminOrDirector) {
        return res.status(403).json({ error: "Только администраторы и директора могут просматривать журнал изменений" });
      }
      
      const logs = await storage.getImplementationChangeLogs(itemId);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get implementation change logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get comments for implementation item
  app.get("/api/implementation-items/:itemId/comments", requireAuth, async (req, res) => {
    try {
      const { itemId } = req.params;
      const user = req.session.user!;
      
      // Get item to check access
      const item = await storage.getImplementationItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Позиция не найдена" });
      }
      
      const sheet = await storage.getImplementationSheet(item.sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Лист реализации не найден" });
      }
      
      // Check user access
      const isAdminOrDirector = user.role === 'admin' || user.role === 'director';
      
      if (!isAdminOrDirector) {
        if (user.role === 'client') {
          // For client users, check via client_employees table
          const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
          if (!clientEmployee) {
            return res.status(403).json({ error: "No client assignment found" });
          }
          
          const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
          const hasAccess = clientProjects.some(cp => cp.projectId === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        } else {
          // For master users, check via user_projects table
          const userProjects = await storage.getUserProjects(user.id);
          const hasAccess = userProjects.some(p => p.id === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
        }
      }
      
      // Get all comments
      const allComments = await storage.getImplementationItemComments(itemId);
      
      // Filter comments based on user role
      let comments = allComments;
      if (user.role === 'client') {
        // Clients see only comments marked as visible to client
        comments = allComments.filter(c => c.visibleToClient);
      }
      
      res.json(comments);
    } catch (error) {
      console.error("Failed to get implementation item comments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add comment to implementation item
  app.post("/api/implementation-items/:itemId/comments", requireAuth, async (req, res) => {
    try {
      const { itemId } = req.params;
      const { text, visibleToClient } = req.body;
      const user = req.session.user!;
      
      // Get item to check access
      const item = await storage.getImplementationItem(itemId);
      if (!item) {
        return res.status(404).json({ error: "Позиция не найдена" });
      }
      
      const sheet = await storage.getImplementationSheet(item.sheetId);
      if (!sheet) {
        return res.status(404).json({ error: "Лист реализации не найден" });
      }
      
      // Check user access and permissions
      const isAdmin = user.role === 'admin';
      const isDirector = user.role === 'director';
      const isClient = user.role === 'client';
      const isMaster = user.role === 'master';
      
      // Permission logic:
      // Admin: Can add any comment
      // Director: Can add comments to projects they manage
      // Master: Can add comments to projects they're assigned to
      // Client: Can only add comments marked as "for client"
      
      if (!isAdmin) {
        if (isDirector) {
          // Directors can add comments to all projects (they manage them)
        } else if (isMaster) {
          // Masters check via user_projects
          const userProjects = await storage.getUserProjects(user.id);
          const hasAccess = userProjects.some(p => p.id === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Вы можете добавлять комментарии только к своим проектам" });
          }
        } else if (isClient) {
          // Clients check via client_employees
          const clientEmployee = await storage.getClientEmployeeByUserId(user.id);
          if (!clientEmployee) {
            return res.status(403).json({ error: "No client assignment found" });
          }
          
          const clientProjects = await storage.getClientProjects(clientEmployee.clientId);
          const hasAccess = clientProjects.some(cp => cp.projectId === sheet.projectId);
          
          if (!hasAccess) {
            return res.status(403).json({ error: "Доступ запрещен" });
          }
          
          // Clients can only add comments that are visible to client
          if (!visibleToClient) {
            return res.status(403).json({ error: "Клиенты могут добавлять только комментарии для заказчика" });
          }
        }
      }
      
      // Create comment
      const comment = await storage.createImplementationItemComment({
        itemId,
        projectId: sheet.projectId,
        authorId: user.id,
        text,
        visibleToClient: visibleToClient || false
      });
      
      // Get author info
      const commentWithAuthor = {
        ...comment,
        author: user
      };
      
      // Create audit log
      await storage.createAuditLog({
        entityType: 'comment',
        entityId: comment.id,
        action: 'create',
        newValue: text,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: sheet.projectId,
        metadata: {
          itemId,
          visibleToClient: comment.visibleToClient
        }
      });
      
      res.json(commentWithAuthor);
    } catch (error) {
      console.error("Failed to add implementation item comment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete comment
  app.delete("/api/implementation-item-comments/:commentId", requireAuth, async (req, res) => {
    try {
      const { commentId } = req.params;
      const user = req.session.user!;
      
      // Get comment to check permissions
      const comments = await db
        .select()
        .from(implementationItemComments)
        .where(eq(implementationItemComments.id, commentId))
        .limit(1);
      
      const comment = comments[0];
      if (!comment) {
        return res.status(404).json({ error: "Комментарий не найден" });
      }
      
      // Only admin or comment author can delete
      const isAdmin = user.role === 'admin';
      const isAuthor = comment.authorId === user.id;
      
      if (!isAdmin && !isAuthor) {
        return res.status(403).json({ error: "Вы можете удалять только свои комментарии" });
      }
      
      // Soft delete
      await storage.deleteImplementationItemComment(commentId, user.id);
      
      // Create audit log
      await storage.createAuditLog({
        entityType: 'comment',
        entityId: commentId,
        action: 'delete',
        oldValue: comment.text,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: comment.projectId,
        metadata: {
          itemId: comment.itemId,
          visibleToClient: comment.visibleToClient
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete implementation item comment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete project - Admin only (after requireAdmin is defined)
  app.delete("/api/projects/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // === NEW FEATURES API ENDPOINTS ===
  
  // 1. AUDIT LOGS (История изменений)
  app.get("/api/audit-logs/project/:projectId", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { entityType, userId, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (entityType) filters.entityType = entityType as string;
      if (userId) filters.userId = userId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const logs = await storage.getProjectAuditLogs(projectId, filters);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get audit logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/audit-logs/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const logs = await storage.getEntityAuditLogs(entityType, entityId);
      res.json(logs);
    } catch (error) {
      console.error("Failed to get entity audit logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // 2. PROJECT ARCHIVING (Архивирование проектов)
  app.patch("/api/projects/:id/archive", requireAuth, requireDirector, async (req, res) => {
    try {
      const { id } = req.params;
      const { archive } = req.body; // true to archive, false to unarchive
      
      const project = await storage.updateProject(id, {
        status: archive ? 'archived' : 'active'
      });
      
      // Create audit log for archiving
      const user = req.session.user!;
      await storage.createAuditLog({
        entityType: 'project',
        entityId: id,
        action: archive ? 'archive' : 'unarchive',
        fieldName: 'status',
        oldValue: archive ? 'active' : 'archived',
        newValue: archive ? 'archived' : 'active',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        projectId: id
      });
      
      // Invalidate project cache
      invalidateProjectCache(id);
      
      res.json(project);
    } catch (error) {
      console.error("Failed to archive project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // 3. CLIENT PORTAL (Личный кабинет заказчика)
  app.get("/api/client-portal/projects", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      
      // Only clients can access this endpoint
      if (user.role !== 'client') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get projects where user is a client
      const projects = await storage.getUserProjects(user.id);
      
      // Filter to show only visible documents and items
      const projectsWithVisibility = await Promise.all(projects.map(async (project) => {
        const documents = await storage.getProjectDocuments(project.id);
        const visibleDocuments = documents.filter(doc => doc.visibleToClient);
        
        const sheets = await storage.getImplementationSheets(project.id);
        const visibleSheets = await Promise.all(sheets.map(async (sheet) => {
          const items = await storage.getImplementationItems(sheet.id);
          const visibleItems = items.filter(item => item.visibleToClient);
          return { ...sheet, items: visibleItems };
        }));
        
        return {
          ...project,
          documents: visibleDocuments,
          implementationSheets: visibleSheets
        };
      }));
      
      res.json(projectsWithVisibility);
    } catch (error) {
      console.error("Failed to get client portal projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/client-portal/project/:id", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const { id } = req.params;
      
      // Only clients can access this endpoint
      if (user.role !== 'client') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if user has access to this project
      const userProjects = await storage.getUserProjects(user.id);
      const hasAccess = userProjects.some(p => p.id === id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this project" });
      }
      
      const project = await storage.getProject(id);
      const documents = await storage.getProjectDocuments(id);
      const visibleDocuments = documents.filter(doc => doc.visibleToClient);
      
      const sheets = await storage.getImplementationSheets(id);
      const visibleSheets = await Promise.all(sheets.map(async (sheet) => {
        const items = await storage.getImplementationItems(sheet.id);
        const visibleItems = await Promise.all(items.map(async (item) => {
          if (!item.visibleToClient) return null;
          
          const photos = await storage.getImplementationPhotos(item.id);
          const visiblePhotos = photos.filter(photo => photo.visibleToClient);
          
          return { ...item, photos: visiblePhotos };
        }));
        
        return { 
          ...sheet, 
          items: visibleItems.filter(item => item !== null) 
        };
      }));
      
      const financialSummary = await storage.getProjectFinancialSummary(id);
      
      res.json({
        project,
        documents: visibleDocuments,
        implementationSheets: visibleSheets,
        financialSummary
      });
    } catch (error) {
      console.error("Failed to get client portal project:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // 4. ANALYTICS DASHBOARD (Аналитика и отчеты)
  app.get("/api/analytics/projects", requireAuth, requireDirector, async (req, res) => {
    try {
      const cacheKey = cacheKeys.analyticsProjects();
      
      // Try cache first (120 seconds - analytics don't need real-time updates)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const { status, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const analytics = await storage.getProjectsAnalytics(filters);
      
      // Cache for 120 seconds
      cache.set(cacheKey, analytics, 120);
      
      res.json(analytics);
    } catch (error) {
      console.error("Failed to get project analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/analytics/contractors", requireAuth, requireDirector, async (req, res) => {
    try {
      const cacheKey = cacheKeys.analyticsContractors();
      
      // Try cache first (120 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const { contractorId } = req.query;
      const analytics = await storage.getContractorAnalytics(contractorId as string);
      
      // Cache for 120 seconds
      cache.set(cacheKey, analytics, 120);
      
      res.json(analytics);
    } catch (error) {
      console.error("Failed to get contractor analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/analytics/clients", requireAuth, requireDirector, async (req, res) => {
    try {
      const cacheKey = cacheKeys.analyticsClients();
      
      // Try cache first (120 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const { clientId } = req.query;
      const analytics = await storage.getClientAnalytics(clientId as string);
      
      // Cache for 120 seconds
      cache.set(cacheKey, analytics, 120);
      
      res.json(analytics);
    } catch (error) {
      console.error("Failed to get client analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/analytics/tools", requireAuth, requireDirector, async (req, res) => {
    try {
      const cacheKey = cacheKeys.analyticsTools();
      
      // Try cache first (120 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const analytics = await storage.getToolsAnalytics();
      
      // Cache for 120 seconds  
      cache.set(cacheKey, analytics, 120);
      
      res.json(analytics);
    } catch (error) {
      console.error("Failed to get tools analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // 5. EMAIL NOTIFICATIONS TEST (Тестовый endpoint для email уведомлений)
  app.post("/api/test-email-notification", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { recipientEmail, subject, body, eventType } = req.body;
      const user = req.session.user!;
      
      await storage.createEmailNotification({
        recipientEmail,
        subject,
        body,
        eventType,
        userId: user.id,
        userName: user.name,
        userRole: user.role
      });
      
      res.json({ success: true, message: "Email notification queued" });
    } catch (error) {
      console.error("Failed to create email notification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // 6. PERSONNEL MANAGEMENT (Управление персоналом)
  // Middleware for Admin or Foreman access
  const requireAdminOrForeman: RequestHandler = (req, res, next) => {
    const user = req.session.user;
    if (!user || (user.role !== 'admin' && user.role !== 'director')) {
      return res.status(403).json({ error: "Access denied. Admin or Director role required." });
    }
    next();
  };
  
  // Get all personnel (Admin & Foreman can view)
  app.get("/api/personnel", requireAuth, requireAdminOrForeman, async (req, res) => {
    try {
      const personnel = await storage.getAllPersonnel();
      res.json(personnel);
    } catch (error) {
      console.error("Failed to get personnel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get single personnel (Admin & Foreman can view)
  app.get("/api/personnel/:id", requireAuth, requireAdminOrForeman, async (req, res) => {
    try {
      const person = await storage.getPersonnel(req.params.id);
      if (!person) {
        return res.status(404).json({ error: "Personnel not found" });
      }
      res.json(person);
    } catch (error) {
      console.error("Failed to get personnel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create personnel (Admin only)
  app.post("/api/personnel", requireAuth, requireAdmin, async (req, res) => {
    try {
      const person = await storage.createPersonnel({
        ...req.body,
        createdBy: req.session.user!.id
      });
      res.json(person);
    } catch (error) {
      console.error("Failed to create personnel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update personnel (Admin only)
  app.put("/api/personnel/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const person = await storage.updatePersonnel(req.params.id, req.body);
      res.json(person);
    } catch (error) {
      console.error("Failed to update personnel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Delete personnel (Admin only)
  app.delete("/api/personnel/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deletePersonnel(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete personnel:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Get personnel documents (Admin & Foreman can view)
  app.get("/api/personnel/:personnelId/documents", requireAuth, requireAdminOrForeman, async (req, res) => {
    try {
      const documents = await storage.getPersonnelDocuments(req.params.personnelId);
      res.json(documents);
    } catch (error) {
      console.error("Failed to get personnel documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Create personnel document (Admin only)
  app.post("/api/personnel/:personnelId/documents", requireAuth, requireAdmin, async (req, res) => {
    try {
      const doc = await storage.createPersonnelDocument({
        ...req.body,
        personnelId: req.params.personnelId,
        uploadedBy: req.session.user!.id
      });
      res.json(doc);
    } catch (error) {
      console.error("Failed to create personnel document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Update personnel document (Admin only)
  app.put("/api/personnel/documents/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const doc = await storage.updatePersonnelDocument(req.params.id, req.body);
      res.json(doc);
    } catch (error) {
      console.error("Failed to update personnel document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Delete personnel document (Admin only)
  app.delete("/api/personnel/documents/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deletePersonnelDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete personnel document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Upload personnel photo
  app.post("/api/personnel/:id/photo", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { photoUrl } = req.body;
      const person = await storage.updatePersonnel(req.params.id, { photoUrl });
      res.json(person);
    } catch (error) {
      console.error("Failed to upload personnel photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Personnel Advances routes
  // Get personnel advances (Admin and Foreman can view)
  app.get("/api/personnel/:personnelId/advances", requireAuth, requireAdminOrForeman, async (req, res) => {
    try {
      const { month } = req.query;
      const monthDate = month ? new Date(month as string) : undefined;
      const advances = await storage.getPersonnelAdvances(req.params.personnelId, monthDate);
      res.json(advances);
    } catch (error) {
      console.error("Failed to get personnel advances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get personnel advances summary (Admin and Foreman can view)
  app.get("/api/personnel/:personnelId/advances/summary", requireAuth, requireAdminOrForeman, async (req, res) => {
    try {
      const { month } = req.query;
      if (!month) {
        return res.status(400).json({ error: "Month parameter is required" });
      }
      const monthDate = new Date(month as string);
      const summary = await storage.getPersonnelAdvancesSummary(req.params.personnelId, monthDate);
      res.json(summary);
    } catch (error) {
      console.error("Failed to get personnel advances summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create personnel advance (Admin and Foreman can add)
  app.post("/api/personnel/:personnelId/advances", requireAuth, requireAdminOrForeman, async (req, res) => {
    try {
      const advance = await storage.createPersonnelAdvance({
        ...req.body,
        personnelId: req.params.personnelId,
        createdBy: req.session.user!.id,
        status: 'active'
      });
      res.json(advance);
    } catch (error) {
      console.error("Failed to create personnel advance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cancel personnel advance (Admin only can cancel)
  app.post("/api/personnel/advances/:id/cancel", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Cancellation reason is required" });
      }
      const advance = await storage.cancelPersonnelAdvance(
        req.params.id,
        req.session.user!.id,
        reason
      );
      res.json(advance);
    } catch (error) {
      console.error("Failed to cancel personnel advance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete personnel advance (Admin only can delete)
  app.delete("/api/personnel/advances/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deletePersonnelAdvance(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete personnel advance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Voice Assistant Routes
  app.post("/api/voice/parse-expense", requireAuth, async (req, res) => {
    try {
      const { transcript, projects, currentProjectId } = req.body;
      
      if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
      }
      
      // Импортируем функцию парсинга
      const { parseVoiceExpense } = await import('./voiceAssistant');
      
      const result = await parseVoiceExpense(transcript, projects || [], currentProjectId);
      
      res.json(result);
    } catch (error) {
      console.error("Failed to parse voice expense:", error);
      res.status(500).json({ 
        success: false, 
        message: "Ошибка при обработке голосовой команды" 
      });
    }
  });

  // Financial Overview - general profit calculation from archived projects only
  app.get("/api/financial-overview", requireAuth, async (req, res) => {
    try {
      const cacheKey = 'financial-overview';
      
      // Try cache first (30 seconds)
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const summary = await storage.getOverallFinancialSummary();
      
      // Cache for 30 seconds
      cache.set(cacheKey, summary, 30);
      
      res.json(summary);
    } catch (error) {
      console.error("Get financial overview error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
