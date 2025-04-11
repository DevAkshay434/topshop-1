import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer, Server } from "http";
import * as fsPath from "path";
import fs from "fs";

// Global maintenance mode flag
let isMaintenanceMode = false;

// Function to toggle maintenance mode
export function setMaintenanceMode(active: boolean) {
  isMaintenanceMode = active;
  log(`Maintenance mode ${active ? 'enabled' : 'disabled'}`);
  return isMaintenanceMode;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for Shopify iframe embedding
app.use((req, res, next) => {
  // Allow requests from Shopify domains
  const shopifyDomains = [
    'https://admin.shopify.com',
    'https://accounts.shopify.com',
    'https://shop.app',
    'https://partners.shopify.com',
    req.headers.origin // Include the actual origin making the request
  ].filter(Boolean); // Remove null/undefined origins
  
  const origin = req.headers.origin;
  
  // Set headers for ALL requests to enable Shopify embedding
  // This is more permissive but necessary for proper Shopify iframe embedding
  if (origin) {
    // If we have an origin, allow it (needed for both Shopify and non-Shopify sources)
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // If no origin is specified, use a wildcard (less secure but more compatible)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Add Content-Security-Policy headers to allow iframe embedding from ALL Shopify domains
  // The wildcard ensures compatibility with all possible Shopify admin URLs
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com https://*.shopifyapps.com https://admin.shopify.com https://accounts.shopify.com https://*.shop.app;"
  );
  
  // Remove X-Frame-Options which can conflict with CSP frame-ancestors in some browsers
  // Modern browsers prefer the CSP policy for framing control
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Maintenance mode middleware
app.use((req, res, next) => {
  // API for maintenance mode control
  if (req.path === '/api/maintenance') {
    if (req.query.action === 'enable') {
      setMaintenanceMode(true);
      return res.json({ maintenance: true, message: 'Maintenance mode enabled' });
    } else if (req.query.action === 'disable') {
      setMaintenanceMode(false);
      return res.json({ maintenance: false, message: 'Maintenance mode disabled' });
    } else {
      return res.json({ maintenance: isMaintenanceMode });
    }
  }
  
  // Always allow API requests to pass through
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Serve maintenance page if in maintenance mode
  if (isMaintenanceMode) {
    const maintenancePath = fsPath.resolve(process.cwd(), 'public', 'maintenance.html');
    if (fs.existsSync(maintenancePath)) {
      return res.sendFile(maintenancePath);
    }
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
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
  // Create HTTP server
  const server = createServer(app);

  // Register routes before error handler
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error but don't crash the server
    console.error("Server error:", err);
    
    // Send error response
    return res.status(status).json({ 
      message,
      error: app.get("env") === "development" ? err.stack : undefined
    });
    // Don't throw the error after handling it - this was causing crashes
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    
    // Set up a keep-alive interval to prevent app from sleeping in Replit
    setInterval(() => {
      // Ping ourselves every 5 minutes
      try {
        fetch(`http://localhost:${port}/api/health`)
          .then(res => res.ok ? log("Health check successful") : log(`Health check failed: ${res.status}`))
          .catch(err => console.error("Health check error:", err));
      } catch (error) {
        console.error("Health check error:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Handle graceful shutdown
    const handleShutdown = () => {
      setMaintenanceMode(true);
      log('Application shutdown initiated - entering maintenance mode');
      
      // Delay the actual exit to allow final requests to be served with the maintenance page
      setTimeout(() => {
        log('Shutdown complete');
        process.exit(0);
      }, 2000);
    };
    
    // Listen for termination signals
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      handleShutdown();
    });
  });
})();
