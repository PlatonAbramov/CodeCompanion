import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { 
  insertUserSchema, insertProjectSchema, insertExpenseSchema, 
  insertDocumentSchema, insertAdvanceSchema, insertCustomerAdvanceSchema,
  insertRevenueSchema, insertOwnerInvestmentSchema, insertContractorSchema,
  insertContractorProjectSchema, insertClientSchema, insertClientProjectSchema,
  insertClientPaymentSchema, insertToolSchema, insertToolMovementSchema,
  createUserSchema,
  type InsertContractorProject, type InsertClientProject, type InsertClientPayment,
  type InsertTool, type InsertToolMovement, type CreateUser
} from "@shared/schema";

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

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'construction-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
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
    if (!req.session?.user || (req.session.user.role !== 'director' && req.session.user.role !== 'admin')) {
      return res.status(403).json({ error: "Director or admin access required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
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

      res.json({ 
        user: req.session.user,
        message: "Login successful" 
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

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user: req.session.user });
  });

  // User management routes (Director only)
  app.get("/api/users", requireAuth, requireDirector, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", requireAuth, requireDirector, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Project routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const fullUser = await storage.getUserById(user.id);
      if (!fullUser) {
        return res.status(404).json({ error: "User not found" });
      }

      let projects;
      
      // Администратор видит все проекты
      if (fullUser.role === 'admin') {
        projects = await storage.getAllProjects();
      }
      // Прораб видит только назначенные ему проекты  
      else if (fullUser.role === 'director') {
        projects = await storage.getUserProjects(user.id);
      }
      // Мастер видит только назначенные ему проекты
      else if (fullUser.role === 'master') {
        projects = await storage.getUserProjects(user.id);
      }
      // Заказчик видит только свои проекты (где он заказчик)
      else if (fullUser.role === 'client') {
        projects = await storage.getUserProjects(user.id);
      }
      else {
        projects = [];
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
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
      res.json(updatedProject);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/financial-summary", requireAuth, async (req, res) => {
    try {
      const summary = await storage.getProjectFinancialSummary(req.params.id);
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
      const expenses = await storage.getProjectExpenses(req.params.id);
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
      res.status(201).json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Document routes
  app.get("/api/projects/:id/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getProjectDocuments(req.params.id);
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
      res.status(201).json(document);
    } catch (error) {
      console.error("Create document error:", error);
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
      const customerAdvanceData = {
        ...req.body,
        amount: req.body.amount.toString(),
        date: new Date(req.body.date)
      };
      const customerAdvance = await storage.updateCustomerAdvance(req.params.id, customerAdvanceData);
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
      await storage.deleteAdvance(req.params.id);
      res.json({ message: "Advance deleted successfully" });
    } catch (error) {
      console.error("Delete advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/customer-advances/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      await storage.deleteCustomerAdvance(req.params.id);
      res.json({ message: "Customer advance deleted successfully" });
    } catch (error) {
      console.error("Delete customer advance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, requireDirector, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
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
      res.status(201).json(ownerInvestment);
    } catch (error) {
      console.error("Error creating owner investment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/owner-investments/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertOwnerInvestmentSchema.partial().parse(req.body);
      const ownerInvestment = await storage.updateOwnerInvestment(req.params.id, validatedData);
      res.json(ownerInvestment);
    } catch (error) {
      console.error("Error updating owner investment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/owner-investments/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteOwnerInvestment(req.params.id);
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

  // Contractors routes
  app.get("/api/contractors", requireAuth, async (req, res) => {
    try {
      const contractors = await storage.getAllContractors();
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
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      console.error("Failed to get clients:", error);
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
      res.json(client);
    } catch (error) {
      console.error("Failed to create client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (error) {
      console.error("Failed to update client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
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
          photoUrl = await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
            owner: req.session.user!.id,
            visibility: "private",
          });
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
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
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
      
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email || null,
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
      
      // Генерируем временный пароль
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
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

  // Object storage endpoints
  const objectStorageService = new ObjectStorageService();
  
  // Get upload URL for objects
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Set object ACL policy
  app.post("/api/objects/acl", requireAuth, async (req, res) => {
    try {
      const { objectUrl, visibility } = req.body;
      const objectPath = objectStorageService.normalizeObjectEntityPath(objectUrl);
      res.json({ objectPath });
    } catch (error) {
      console.error("Failed to set object ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Implementation sheets endpoints
  
  // Get all implementation sheets for a project
  app.get("/api/projects/:projectId/implementation-sheets", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.params;
      
      // Check user access to project
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      if (!isAdminOrDirector) {
        const userProject = await storage.getUserProject(req.session.user!.id, projectId);
        if (!userProject) {
          return res.status(403).json({ error: "Доступ запрещен" });
        }
      }
      
      const sheets = await storage.getImplementationSheets(projectId);
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
      const isAdminOrDirector = req.session.user!.role === 'admin' || req.session.user!.role === 'director';
      if (!isAdminOrDirector) {
        const userProject = await storage.getUserProject(req.session.user!.id, sheet.projectId);
        if (!userProject) {
          return res.status(403).json({ error: "Доступ запрещен" });
        }
      }
      
      const items = await storage.getImplementationItems(sheetId);
      res.json({ ...sheet, items });
    } catch (error) {
      console.error("Failed to get implementation sheet:", error);
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
        const userProject = await storage.getUserProject(req.session.user!.id, sheet.projectId);
        if (!userProject) {
          return res.status(403).json({ error: "Доступ запрещен" });
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
      const { itemId } = req.params;
      
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
      
      await storage.deleteImplementationPhoto(photoId);
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

  const httpServer = createServer(app);
  return httpServer;
}
