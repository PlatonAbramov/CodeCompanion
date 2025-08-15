import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runDatabaseBootstrap } from "./db-bootstrap";

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

// Database bootstrap will handle admin user creation automatically

const app = express();

// Trust proxy for rate limiting to work correctly in Replit
app.set('trust proxy', true);

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
  try {
    // Run automatic database bootstrap before starting the application
    await runDatabaseBootstrap();
  } catch (error) {
    console.error("Database bootstrap failed:", error);
    
    // Enhanced error handling for production deployments
    const isProduction = process.env.NODE_ENV === 'production';
    const skipMigrationOnError = process.env.SKIP_MIGRATION_ON_ERROR === '1';
    const autoMigrateDisabled = process.env.AUTO_MIGRATE === '0';
    
    // Multiple conditions to allow startup despite migration failures
    const shouldSkipError = isProduction || skipMigrationOnError || autoMigrateDisabled;
    
    if (shouldSkipError) {
      console.warn("=".repeat(80));
      console.warn("DATABASE MIGRATION FAILURE - CONTINUING STARTUP");
      console.warn("=".repeat(80));
      console.warn("Reason: Production deployment with migration error handling enabled");
      console.warn(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      console.warn(`SKIP_MIGRATION_ON_ERROR: ${process.env.SKIP_MIGRATION_ON_ERROR || 'not set'}`);
      console.warn(`AUTO_MIGRATE: ${process.env.AUTO_MIGRATE || 'not set'}`);
      console.warn("The application will start without database migrations");
      console.warn("Manual migration may be required via database panel");
      console.warn("=".repeat(80));
    } else {
      console.error("Database migration is required for development environment");
      console.error("Set NODE_ENV=production, SKIP_MIGRATION_ON_ERROR=1, or AUTO_MIGRATE=0 to skip");
      process.exit(1);
    }
  }
  
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
