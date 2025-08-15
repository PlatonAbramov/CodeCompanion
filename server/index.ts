import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import bcrypt from "bcrypt";

// Set default object storage environment variables if not already set
// These are the standard values when object storage is configured in Replit
if (!process.env.PUBLIC_OBJECT_SEARCH_PATHS && !process.env.PRIVATE_OBJECT_DIR) {
  // Check if we're in a Replit environment
  if (process.env.REPL_ID) {
    const defaultBucketId = `replit-objstore-${process.env.REPL_ID}`;
    process.env.PUBLIC_OBJECT_SEARCH_PATHS = `/${defaultBucketId}/public`;
    process.env.PRIVATE_OBJECT_DIR = `/${defaultBucketId}/.private`;
    log("Object storage environment variables not found. Using default configuration based on REPL_ID.");
  }
}

// Initialize default admin user if no users exist
async function initializeDefaultAdmin() {
  try {
    const users = await storage.getAllUsers();
    const adminExists = users.find(u => u.username === "platonabramov90@gmail.com");
    
    if (!adminExists) {
      log("Admin user not found. Creating admin user...");
      await storage.createUser({
        username: "platonabramov90@gmail.com",
        password: "123456",
        name: "Platon Abramov",
        role: "director"
      });
      log("Admin user created: username='platonabramov90@gmail.com', password='123456'");
    } else {
      log("Admin user already exists: platonabramov90@gmail.com");
    }
  } catch (error) {
    console.error("Error initializing admin user:", error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize default admin user if database is empty
  await initializeDefaultAdmin();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
