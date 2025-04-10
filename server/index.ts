import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
