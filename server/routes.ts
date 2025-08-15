import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import sharp from 'sharp';

// Import new auth routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import { legacyAuthRoutes, legacyRequireAuth } from './routes/legacy';
import { securityHeaders, corsMiddleware } from './middleware/auth';
import { AuthService } from './auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { 
  insertUserSchema, insertProjectSchema, insertExpenseSchema, 
  insertDocumentSchema, insertAdvanceSchema, insertCustomerAdvanceSchema,
  insertRevenueSchema, insertOwnerInvestmentSchema, insertContractorSchema,
  insertContractorProjectSchema, insertClientSchema, insertClientProjectSchema,
  insertClientPaymentSchema, insertToolSchema, insertToolMovementSchema,
  type InsertContractorProject, type InsertClientProject, type InsertClientPayment,
  type InsertTool, type InsertToolMovement
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
  // Security middleware
  app.use(securityHeaders);
  app.use(corsMiddleware);
  // Remove general rate limiting to avoid 429 errors on frontend requests
  
  // Cookie parser for refresh tokens
  app.use(cookieParser());
  
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

  // Session middleware (for legacy compatibility)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'construction-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Register new authentication routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  
  // Register legacy authentication routes for backwards compatibility
  app.use('/api', legacyAuthRoutes);

  // Unified auth middleware that works with both JWT and session
  const requireAuth = (req: any, res: any, next: any) => {
    // Check JWT token first
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Try JWT authentication
      const decoded = AuthService.verifyAccessToken(token);
      if (decoded) {
        req.user = {
          id: decoded.user_id,
          login: decoded.login,
          role: decoded.role,
          username: decoded.login,
          name: decoded.login
        };
        req.session = req.session || {};
        req.session.user = req.user;
        return next();
      }
    }
    
    // Fallback to session-based auth
    if (!req.session?.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  const requireDirector = (req: any, res: any, next: any) => {
    const user = req.user || req.session?.user;
    if (!user || user.role !== 'director') {
      return res.status(403).json({ error: "Director access required" });
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

      const isValid = await bcrypt.compare(password, user.password || '');
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      
      // Store user in session (excluding password)
      req.session.user = {
        id: user.id,
        username: user.username || '',
        name: user.name || '',
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

  // Initialize admin user (public endpoint for deployment setup)
  app.get("/api/init-admin", async (req, res) => {
    try {
      // Check if the specific admin user already exists
      const users = await storage.getAllUsers();
      const existingAdmin = users.find(u => u.username === "platonabramov90@gmail.com");
      
      if (existingAdmin) {
        return res.json({ 
          message: "Admin user already exists",
          username: "platonabramov90@gmail.com",
          password: "123456",
          status: "exists"
        });
      }

      // Create specific admin user
      const adminUser = await storage.createUser({
        username: "platonabramov90@gmail.com",
        password: "123456",
        name: "Platon Abramov",
        role: "director"
      });

      res.json({ 
        message: "Admin user created successfully",
        username: "platonabramov90@gmail.com",
        password: "123456",
        status: "created"
      });
    } catch (error) {
      console.error("Init admin error:", error);
      res.status(500).json({ 
        error: "Failed to create admin user",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/init-admin", async (req, res) => {
    try {
      // Force create admin user even if others exist
      const users = await storage.getAllUsers();
      const existingAdmin = users.find(u => u.username === "platonabramov90@gmail.com");
      
      if (existingAdmin) {
        return res.json({ 
          message: "Admin user already exists",
          username: "platonabramov90@gmail.com",
          password: "123456",
          status: "exists"
        });
      }

      // Create specific admin user
      const adminUser = await storage.createUser({
        username: "platonabramov90@gmail.com",
        password: "123456",
        name: "Platon Abramov",
        role: "director"
      });

      res.json({ 
        message: "Admin user created successfully",
        username: "platonabramov90@gmail.com",
        password: "123456",
        status: "created"
      });
    } catch (error) {
      console.error("Init admin error:", error);
      res.status(500).json({ 
        error: "Failed to create admin user",
        details: error instanceof Error ? error.message : String(error)
      });
    }
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
      let projects;
      
      if (user.role === 'director') {
        projects = await storage.getAllProjects();
      } else {
        projects = await storage.getUserProjects(user.id);
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
      const user = req.user || req.session.user!;
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
      const user = req.user || req.session.user;
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        userId: user!.id
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
      const user = req.user || req.session.user;
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: user!.id
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
      const user = req.user || req.session.user;
      const advanceData = insertAdvanceSchema.parse({
        ...req.body,
        createdBy: user!.id
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
      const user = req.user || req.session.user;
      const customerAdvanceData = insertCustomerAdvanceSchema.parse({
        ...req.body,
        createdBy: user!.id
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
      const user = req.user || req.session.user;
      const revenueData = insertRevenueSchema.parse({
        ...req.body,
        amount: req.body.amount.toString(),
        createdBy: user!.id,
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
      const user = req.user || req.session.user;
      const validatedData = insertOwnerInvestmentSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdBy: user!.id
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
      const user = req.user || req.session.user;
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        uploadedBy: user!.id,
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
      let photoUrl = null;
      let photoThumbnailUrl = null;

      // Handle photo if uploaded
      if (req.file) {
        const filename = req.file.filename;
        const filenameWithoutExt = path.parse(filename).name;
        const fileExt = path.extname(filename);
        
        // Original photo URL
        photoUrl = `/uploads/${filename}`;
        
        // Generate thumbnail
        const thumbnailFilename = `${filenameWithoutExt}_thumb${fileExt}`;
        const originalPath = path.join(uploadsDir, filename);
        const thumbnailPath = path.join(uploadsDir, thumbnailFilename);
        
        try {
          // Create 100x100 thumbnail using sharp
          await sharp(originalPath)
            .resize(100, 100, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);
          
          photoThumbnailUrl = `/uploads/${thumbnailFilename}`;
        } catch (thumbnailError) {
          console.error("Error creating thumbnail:", thumbnailError);
          // If thumbnail fails, use original as fallback
          photoThumbnailUrl = photoUrl;
        }
      }

      const user = req.user || req.session.user;
      const validatedData = insertToolMovementSchema.parse({
        ...req.body,
        toolId: req.params.id,
        photoUrl,
        photoThumbnailUrl,
        createdBy: user!.id,
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

  const httpServer = createServer(app);
  return httpServer;
}
