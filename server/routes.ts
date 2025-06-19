import { Express, Request, Response, NextFunction, Router } from 'express';
import { Server } from 'http';
import { z } from 'zod';
import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';
import {
  insertContentGenRequestSchema,
  insertBlogPostSchema,
  insertShopifyConnectionSchema,
  insertShopifyStoreSchema,
  insertUserStoreSchema,
  insertProjectSchema,
  authors,
  insertAuthorSchema,
} from '@shared/schema';
import { db } from './db';
import { eq, desc, sql, and } from 'drizzle-orm';
import { shopifyStores, blogPosts } from '@shared/schema';
import { storage } from './storage';
import { shopifyService } from './services/shopify';
import contentRouter from './routes/content';
import claudeRouter from './routes/claude';
import adminRouter from './routes/admin';
import { mediaRouter } from './routes/media';
import oauthRouter from './routes/oauth';
import { pexelsService } from './services/pexels';
import { shopifyAuthMiddleware, shopifyAuthOptional } from './middleware/shopify-auth';
import { 
  validateShopDomain, 
  generateNonce, 
  createAuthUrl, 
  validateHmac, 
  getAccessToken, 
  getShopData,
  verifyWebhook
} from './services/oauth';
import { generateBlogContentWithHF } from './services/huggingface';
import { PLANS, PlanType, createSubscription, getSubscriptionStatus, cancelSubscription } from './services/billing';

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to get store from request with multi-store support
async function getStoreFromRequest(req: Request): Promise<any | null> {
  try {
    // Check if X-Store-ID header is provided (from frontend store selection)
    const requestedStoreId = req.headers['x-store-id'] as string;
    
    if (requestedStoreId) {
      const storeId = parseInt(requestedStoreId);
      const store = await storage.getStoreById(storeId);
      
      if (store && store.isConnected) {
        console.log(`Using store from X-Store-ID header: ${store.shopName} (ID: ${store.id})`);
        return store;
      }
    }

    // Fallback: Get store from shopify auth session  
    const session = req.session as any;
    if (session?.shopifyAuth?.shop) {
      const store = await storage.getStoreByShopName(session.shopifyAuth.shop);
      if (store && store.isConnected) {
        console.log(`Using store from session: ${store.shopName} (ID: ${store.id})`);
        return store;
      }
    }

    // Final fallback: Get any connected store (legacy behavior)
    const stores = await storage.getAllStores();
    const connectedStore = stores.find(store => store.isConnected);
    
    if (connectedStore) {
      console.log(`Using fallback store: ${connectedStore.shopName} (ID: ${connectedStore.id})`);
      return connectedStore;
    }

    return null;
  } catch (error) {
    console.error('Error getting store from request:', error);
    return null;
  }
}

/**
 * Register all API routes for the app
 */
export async function registerRoutes(app: Express): Promise<void> {
  // API router for authenticated endpoints
  const apiRouter = Router();
  
  // Image upload endpoint for rich text editor
  apiRouter.post("/upload-image", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      // Get store connection for Shopify file upload
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(401).json({ error: 'Store not connected' });
      }

      try {
        // Upload to Shopify Files API
        const shopifyResponse = await axios.post(
          `https://${store.shopName}/admin/api/2023-10/files.json`,
          {
            file: {
              attachment: req.file.buffer.toString('base64'),
              filename: req.file.originalname,
              content_type: req.file.mimetype,
            }
          },
          {
            headers: {
              'X-Shopify-Access-Token': store.accessToken,
              'Content-Type': 'application/json'
            }
          }
        );

        const fileUrl = shopifyResponse.data.file?.url;
        if (fileUrl) {
          res.json({ 
            success: true, 
            url: fileUrl,
            filename: req.file.originalname 
          });
        } else {
          throw new Error('No file URL returned from Shopify');
        }
      } catch (shopifyError) {
        console.error('Shopify upload error:', shopifyError);
        
        // Fallback: Return a data URL for immediate display
        const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        res.json({ 
          success: true, 
          url: dataUrl,
          filename: req.file.originalname,
          note: 'Image uploaded as data URL - may not persist in published content' 
        });
      }
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });
  
  // Health check endpoint for server monitoring and keep-alive
  apiRouter.get("/health", async (req: Request, res: Response) => {
    try {
      // Simple response to confirm server is running
      res.status(200).json({ 
        status: "ok", 
        message: "Server is healthy", 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Server error", 
        timestamp: new Date().toISOString() 
      });
    }
  });
  
  // --- SHOPIFY CONNECTION ROUTES ---
  
  // Get Shopify API key for frontend initialization
  apiRouter.get("/shopify/api-key", async (req: Request, res: Response) => {
    try {
      res.json({ 
        apiKey: process.env.SHOPIFY_API_KEY || ''
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Check if store has scheduling permissions
  apiRouter.get("/shopify/check-permissions", async (req: Request, res: Response) => {
    try {
      const { hasSchedulingPermission, getMissingSchedulingPermissions } = await import('../shared/permissions');
      
      // Get current store
      const stores = await storage.getShopifyStores();
      if (!stores || stores.length === 0) {
        return res.status(404).json({
          success: false,
          hasPermission: false,
          message: "No stores found"
        });
      }
      
      const store = stores[0]; // Use first store for now
      const hasPermission = hasSchedulingPermission(store.scope || '');
      const missingPermissions = getMissingSchedulingPermissions(store.scope || '');
      
      res.json({
        success: true,
        hasPermission,
        missingPermissions,
        store: {
          id: store.id,
          name: store.shopName,
          scope: store.scope
        }
      });
    } catch (error: any) {
      console.error("Error checking store permissions:", error);
      res.status(500).json({
        success: false,
        hasPermission: false,
        message: error.message || "Failed to check permissions"
      });
    }
  });
  
  // Special route to handle reconnection with the new write_publications scope
  apiRouter.get("/shopify/reconnect", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.SHOPIFY_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          success: false,
          message: "Missing Shopify API credentials"
        });
      }
      
      // Get shop from existing connection
      const stores = await storage.getShopifyStores();
      if (!stores || stores.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: "No connected store found" 
        });
      }
      
      // Generate a nonce for CSRF protection
      const nonce = crypto.randomBytes(16).toString('hex');
      
      // Store nonce data
      const shop = stores[0].shopName;
      const nonceData: NonceData = {
        shop,
        timestamp: Date.now()
      };
      nonceStore.set(nonce, nonceData);
      
      // Use app URL for OAuth callback (will be proxied through to the actual app server)
      // In local dev or testing, use the current hostname
      const hostname = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const baseUrl = `${protocol}://${hostname}`;
      
      const redirectUri = `${baseUrl}/oauth/shopify/callback`;
      
      // Create the auth URL with the new write_publications scope
      const authUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${apiKey}&` +
        `scope=read_products,write_products,read_content,write_content,read_themes,write_publications&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${nonce}`;
      
      // Return the URL to the client
      return res.json({ 
        success: true, 
        authUrl
      });
    } catch (error) {
      console.error('Error generating reconnect URL:', error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to generate authentication URL" 
      });
    }
  });
  
  // Direct endpoint to update permissions in the database without OAuth
  apiRouter.post("/shopify/force-update-permissions", async (req: Request, res: Response) => {
    try {
      // Get stores
      const stores = await storage.getShopifyStores();
      if (!stores || stores.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No stores found"
        });
      }
      
      const store = stores[0]; // Use first store
      
      // Import the utility to get full scope string
      const { getFullScopeString } = await import('../shared/permissions');
      
      // Update the store with the full scope string including write_publications
      const fullScopes = getFullScopeString();
      
      // Update the store record
      const updatedStore = await storage.updateShopifyStore(store.id, {
        scope: fullScopes
      });
      
      // Return success
      return res.json({
        success: true,
        message: "Store permissions updated",
        store: {
          id: updatedStore.id,
          name: updatedStore.shopName,
          scope: updatedStore.scope
        }
      });
    } catch (error: any) {
      console.error("Error updating store permissions:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update permissions"
      });
    }
  });
  
  // Get current Shopify connection
  apiRouter.get("/shopify/connection", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      res.json({ connection });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  apiRouter.get("/shopify/store-info", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      
      if (!connection || !connection.isConnected) {
        return res.status(404).json({
          success: false,
          error: "No active Shopify connection found"
        });
      }
      
      // Create temporary store object
      const store = {
        id: connection.id,
        shopName: connection.storeName,
        accessToken: connection.accessToken,
        scope: '',
        defaultBlogId: connection.defaultBlogId || '',
        isConnected: connection.isConnected,
        lastSynced: connection.lastSynced,
        installedAt: new Date(),
        uninstalledAt: null,
        planName: null,
        chargeId: null,
        trialEndsAt: null
      };
      
      // Get shop info with timezone directly from the shopifyService singleton
      const shopInfo = await shopifyService.getShopInfo(store);
      
      res.json({
        success: true,
        shopInfo: {
          name: shopInfo.name,
          domain: shopInfo.domain,
          email: shopInfo.email,
          country: shopInfo.country,
          currency: shopInfo.currency,
          timezone: shopInfo.timezone,
          iana_timezone: shopInfo.iana_timezone
        }
      });
    } catch (error: any) {
      console.error("Error fetching Shopify store info:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to fetch store information"
      });
    }
  });
  
  // Get all connected Shopify stores
  apiRouter.get("/shopify/stores", async (req: Request, res: Response) => {
    try {
      const stores = await storage.getShopifyStores();
      res.json({ stores });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get a specific Shopify store
  apiRouter.get("/shopify/store/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      const store = await storage.getShopifyStore(id);
      
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      res.json({ store });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create/update Shopify connection
  apiRouter.post("/shopify/connection", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const connectionData = insertShopifyConnectionSchema.parse(req.body);
      
      // Check if we already have a connection
      const existingConnection = await storage.getShopifyConnection();
      
      if (existingConnection) {
        // Update existing connection
        const connection = await storage.updateShopifyConnection(connectionData);
        
        // Test the connection
        if (connection.accessToken && connection.isConnected) {
          try {
            shopifyService.setConnection(connection);
            await shopifyService.testConnection();
          } catch (error) {
            return res.status(400).json({ error: "Failed to connect to Shopify API" });
          }
        }
        
        res.json({ connection });
      } else {
        // Create new connection
        const connection = await storage.createShopifyConnection(connectionData);
        
        // Test the connection
        if (connection.accessToken && connection.isConnected) {
          try {
            shopifyService.setConnection(connection);
            await shopifyService.testConnection();
          } catch (error) {
            return res.status(400).json({ error: "Failed to connect to Shopify API" });
          }
        }
        
        res.json({ connection });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Disconnect from Shopify
  apiRouter.post("/shopify/disconnect", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      
      if (!connection) {
        return res.status(404).json({ error: "No connection found" });
      }
      
      const updatedConnection = await storage.updateShopifyConnection({
        id: connection.id,
        isConnected: false
      });
      
      res.json({ success: true, connection: updatedConnection });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get Shopify blogs
  apiRouter.get("/shopify/blogs", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      
      if (!connection || !connection.isConnected) {
        return res.status(400).json({ error: "Not connected to Shopify" });
      }
      
      // Use the compatibility functions with the legacy connection
      const { setConnection, getBlogsLegacy } = shopifyService;
      
      // Set the connection using our wrapper method
      setConnection(connection);
      
      // Get blogs using the legacy method that doesn't require a store parameter
      const blogs = await getBlogsLegacy();
      
      res.json({ blogs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Set default blog
  apiRouter.post("/shopify/default-blog", async (req: Request, res: Response) => {
    try {
      const { blogId } = req.body;
      
      if (!blogId) {
        return res.status(400).json({ error: "Blog ID is required" });
      }
      
      const connection = await storage.getShopifyConnection();
      
      if (!connection) {
        return res.status(404).json({ error: "No connection found" });
      }
      
      const updatedConnection = await storage.updateShopifyConnection({
        id: connection.id,
        defaultBlogId: blogId
      });
      
      res.json({ success: true, connection: updatedConnection });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Sync posts with Shopify
  apiRouter.post("/shopify/sync", async (req: Request, res: Response) => {
    try {
      console.log("Syncing posts to Shopify:", JSON.stringify(req.body));
      
      // Get the Shopify connection
      const connection = await storage.getShopifyConnection();
      
      if (!connection || !connection.isConnected || !connection.defaultBlogId) {
        return res.status(400).json({ error: "Not properly connected to Shopify" });
      }
      
      // Get posts to sync - either specific postIds or all published posts
      let postsToSync = [];
      
      if (req.body && req.body.postIds && Array.isArray(req.body.postIds) && req.body.postIds.length > 0) {
        // Get specific posts by ID
        const postIds = req.body.postIds.map((id: string | number) => Number(id));
        console.log(`Looking for specific posts with IDs: ${postIds.join(', ')}`);
        
        // Get all the requested posts
        const allPosts = await storage.getBlogPosts();
        
        // Filter by requested IDs
        postsToSync = allPosts.filter(post => {
          const included = postIds.includes(post.id);
          // Force sync even if already synced
          if (included && post.shopifyPostId) {
            console.log(`Will update existing Shopify post: ${post.id} (${post.shopifyPostId})`);
          }
          return included;
        });
      } else {
        // Get all published posts that need to be synced (no specific IDs provided)
        const posts = await storage.getBlogPosts();
        postsToSync = posts.filter(post => post.status === 'published' && !post.shopifyPostId);
      }
      
      if (postsToSync.length === 0) {
        return res.json({ success: true, syncedCount: 0, message: "No posts to sync" });
      }
      
      console.log(`Preparing to sync ${postsToSync.length} posts to Shopify`);
      
      // Set up Shopify connection
      console.log(`Using Shopify connection: store=${connection.storeName}, blogId=${connection.defaultBlogId}`);
      shopifyService.setConnection(connection);
      
      // Get function references
      const { setConnection, createArticle, updateArticle } = shopifyService;
      
      // Set connection first
      setConnection(connection);
      
      // Create a temporary store object for using with the new API
      const tempStore = {
        id: connection.id,
        shopName: connection.storeName,
        accessToken: connection.accessToken,
        scope: '', // Not available in legacy connection
        defaultBlogId: connection.defaultBlogId,
        isConnected: connection.isConnected || true,
        lastSynced: connection.lastSynced,
        installedAt: new Date(),
        uninstalledAt: null,
        planName: null,
        chargeId: null,
        trialEndsAt: null
      };
      
      // Sync each post
      let syncedCount = 0;
      for (const post of postsToSync) {
        try {
          let shopifyArticle;
          
          if (post.shopifyPostId) {
            // Update existing article
            console.log(`Updating existing Shopify post ${post.shopifyPostId} for post ${post.id}: "${post.title}"`);
            // The updateArticle function expects (store, blogId, articleId, post) but is being passed (store, blogId, post)
            shopifyArticle = await updateArticle(tempStore, connection.defaultBlogId, post.shopifyPostId, post);
          } else {
            // Create new article
            console.log(`Creating new Shopify post for post ${post.id}: "${post.title}"`);
            shopifyArticle = await createArticle(tempStore, connection.defaultBlogId, post);
            
            // Update post with Shopify ID
            await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id
            });
          }
          
          // Create sync activity
          await storage.createSyncActivity({
            activity: `Published "${post.title}"`,
            status: "success",
            details: `Successfully published to Shopify`
          });
          
          syncedCount++;
        } catch (error: any) {
          // Log error but continue with next post
          console.error("Error publishing to Shopify:", error);
          
          // Create sync activity
          await storage.createSyncActivity({
            activity: `Failed to publish "${post.title}"`,
            status: "failed",
            details: error.message
          });
        }
      }
      
      res.json({ success: true, syncedCount });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- BLOG POST ROUTES ---
  
  // Get all blog posts with pagination and populate author names
  apiRouter.get("/posts", async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Get all posts to calculate total
      const allPosts = await storage.getBlogPosts();
      
      // Populate author names for posts that have authorId but no author name
      const postsWithAuthors = await Promise.all(
        allPosts.map(async (post) => {
          if (post.authorId && !post.author) {
            try {
              const authorData = await db.select().from(authors).where(eq(authors.id, post.authorId)).limit(1);
              if (authorData.length > 0) {
                return { ...post, author: authorData[0].name };
              }
            } catch (error) {
              console.error(`Error fetching author for post ${post.id}:`, error);
            }
          }
          return post;
        })
      );
      
      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      
      // Get the paginated posts
      const posts = postsWithAuthors.slice(startIndex, endIndex);
      
      res.json({ 
        posts,
        pagination: {
          total: allPosts.length,
          page,
          limit,
          totalPages: Math.ceil(allPosts.length / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get recent blog posts with author names populated
  apiRouter.get("/posts/recent", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      // Get store from request context for proper isolation
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(400).json({ error: "Store context required" });
      }
      
      const posts = await storage.getRecentPostsByStore(store.id, limit);
      
      // Populate author names for posts that have authorId but no author name
      const postsWithAuthors = await Promise.all(
        posts.map(async (post) => {
          if (post.authorId && !post.author) {
            try {
              const authorData = await db.select().from(authors).where(eq(authors.id, post.authorId)).limit(1);
              if (authorData.length > 0) {
                return { ...post, author: authorData[0].name };
              }
            } catch (error) {
              console.error(`Error fetching author for post ${post.id}:`, error);
            }
          }
          return post;
        })
      );
      
      res.json({ posts: postsWithAuthors });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get scheduled blog posts with author names populated
  apiRouter.get("/posts/scheduled", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getScheduledPosts();
      
      // Populate author names for posts that have authorId but no author name
      const postsWithAuthors = await Promise.all(
        posts.map(async (post) => {
          if (post.authorId && !post.author) {
            try {
              const authorData = await db.select().from(authors).where(eq(authors.id, post.authorId)).limit(1);
              if (authorData.length > 0) {
                return { ...post, author: authorData[0].name };
              }
            } catch (error) {
              console.error(`Error fetching author for post ${post.id}:`, error);
            }
          }
          return post;
        })
      );
      
      res.json({ posts: postsWithAuthors });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get published blog posts
  apiRouter.get("/posts/published", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPublishedPosts();
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get a specific blog post
  apiRouter.get("/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ post });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create a new blog post
  apiRouter.post("/posts", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/posts - Request body:", JSON.stringify(req.body));
      console.log("POST /api/posts - AuthorId from request:", req.body.authorId);
      console.log("POST /api/posts - AuthorId type:", typeof req.body.authorId);
      
      // CRITICAL FIX: Ensure authorId is properly converted to number before validation
      if (req.body.authorId && typeof req.body.authorId === 'string') {
        req.body.authorId = parseInt(req.body.authorId, 10);
        console.log("POST /api/posts - Converted authorId to number:", req.body.authorId);
      }
      
      // Validate request body
      let postData;
      try {
        postData = insertBlogPostSchema.parse(req.body);
        console.log("POST /api/posts - After schema validation authorId:", postData.authorId);
        console.log("POST /api/posts - After schema validation authorId type:", typeof postData.authorId);
        
        // Better handling for scheduling fields
        if (postData.status === 'scheduled') {
          console.log("Processing scheduled post request with data:", {
            status: postData.status,
            scheduledPublishDate: postData.scheduledPublishDate,
            scheduledPublishTime: postData.scheduledPublishTime,
            storeId: postData.storeId,
            shopifyBlogId: postData.shopifyBlogId
          });
          
          // Ensure scheduledPublishDate and scheduledPublishTime are set for scheduled posts
          if (!postData.scheduledPublishDate || !postData.scheduledPublishTime) {
            console.error("Missing required scheduling fields for scheduled post");
            return res.status(400).json({
              error: "Missing required scheduling information",
              details: "A scheduled post must include scheduledPublishDate and scheduledPublishTime fields"
            });
          }
          
          // Set scheduledDate for compatibility with old code
          if (postData.scheduledPublishDate && postData.scheduledPublishTime) {
            try {
              const { createDateInTimezone } = await import('../shared/timezone');
              // Get store timezone from Shopify
              const connection = await storage.getShopifyConnection();
              const shopifyService = await import('./services/shopify').then(module => module.shopifyService);
              
              // Default to store timezone or UTC
              let timezone = 'UTC';
              if (connection && connection.storeName) {
                const tempStore = {
                  id: connection.id,
                  shopName: connection.storeName,
                  accessToken: connection.accessToken,
                  scope: '',
                  defaultBlogId: connection.defaultBlogId || null,
                  isConnected: connection.isConnected || true,
                  lastSynced: connection.lastSynced,
                  installedAt: new Date(),
                  uninstalledAt: null,
                  planName: null,
                  chargeId: null,
                  trialEndsAt: null
                };
                
                try {
                  const shopInfo = await shopifyService.getShopInfo(tempStore);
                  timezone = shopInfo.iana_timezone || 'UTC';
                  console.log(`Using store timezone: ${timezone}`);
                } catch (tzError) {
                  console.warn("Could not get store timezone:", tzError);
                }
              }
              
              // Create a date object from the date and time strings in the store's timezone
              const scheduledDate = createDateInTimezone(
                postData.scheduledPublishDate,
                postData.scheduledPublishTime,
                timezone
              );
              
              console.log(`Converted scheduled date: ${scheduledDate.toISOString()}`);
              postData.scheduledDate = scheduledDate;
            } catch (dateError) {
              console.error("Error setting scheduledDate field:", dateError);
            }
          }
        }
      } catch (validationError: any) {
        console.error("Validation error:", JSON.stringify(validationError));
        return res.status(400).json({ 
          error: validationError.errors || validationError.message,
          details: validationError
        });
      }
      
      // Save post to storage
      console.log("Saving post to storage with data:", {
        status: postData.status,
        authorId: postData.authorId,
        scheduledDate: postData.scheduledDate ? postData.scheduledDate.toISOString() : null,
        scheduledPublishDate: postData.scheduledPublishDate,
        scheduledPublishTime: postData.scheduledPublishTime
      });
      
      console.log("Full postData being saved:", JSON.stringify(postData, null, 2));
      
      const post = await storage.createBlogPost(postData);
      
      // ENHANCED PUBLISHING LOGIC
      // Check all possible publishing flags from the frontend form
      const publicationType = (req.body.publicationType || '').toLowerCase();
      const postStatus = (req.body.postStatus || '').toLowerCase();
      
      console.log(`POST /api/posts - Processing with multiple flags:`, {
        status: post.status,
        publicationType,
        postStatus,
        hasScheduleInfo: !!(post.scheduledPublishDate && post.scheduledPublishTime)
      });
      
      // Determine the correct publishing state based on multiple indicators
      let correctedStatus = post.status;
      
      // Case 1: Published content
      if (publicationType === 'publish' || postStatus === 'published') {
        correctedStatus = 'published';
        console.log("Publishing immediately based on explicit publish flags");
      } 
      // Case 2: Scheduled content
      else if (publicationType === 'schedule' || 
               post.scheduledPublishDate && post.scheduledPublishTime) {
        correctedStatus = 'scheduled';
        console.log("Scheduling content based on schedule flags and date/time values");
      }
      // Case 3: Draft (default if no other flags set)
      
      // Update post status if needed
      if (correctedStatus !== post.status) {
        post.status = correctedStatus;
        await storage.updateBlogPost(post.id, { status: correctedStatus });
        console.log(`Post status updated to '${correctedStatus}' based on form flags`);
      }
      
      // Only send to Shopify if it's a published or scheduled post AND the user explicitly wants to publish
      // Check if this is content generation (draft by default) vs explicit publishing
      const isContentGeneration = !publicationType && !postStatus && post.status === 'draft';
      const shouldPushToShopify = (post.status === 'published' || post.status === 'scheduled') && !isContentGeneration;
      
      if (shouldPushToShopify) {
        // CRITICAL FIX: Use proper multi-store routing instead of legacy connection fallback
        const store = await getStoreFromRequest(req);
        if (!store) {
          console.error("No store context found for publishing - cannot publish to Shopify");
          return res.status(400).json({ error: "Store context required for publishing" });
        }
        
        console.log(`Publishing to store: ${store.shopName} (ID: ${store.id})`);
        
        if (store && store.isConnected && store.defaultBlogId) {
          try {
            // Use the actual store from multi-store context, not legacy connection
            const tempStore = store;
            
            // Initialize the Shopify service with the correct store
            shopifyService.initializeClient(tempStore);
            
            // Use the complete post object, including all scheduling fields
            console.log("Sending to Shopify API:", {
              postId: post.id,
              title: post.title,
              status: post.status,
              hasScheduledDate: !!post.scheduledDate,
              scheduledDate: post.scheduledDate,
              hasScheduledPublishDate: !!post.scheduledPublishDate,
              scheduledPublishDate: post.scheduledPublishDate,
              hasScheduledPublishTime: !!post.scheduledPublishTime,
              scheduledPublishTime: post.scheduledPublishTime
            });
            
            // For scheduled posts, create a proper Date object for scheduling
            let scheduledPublishDate: Date | undefined = undefined;
            
            if (post.status === 'scheduled' && post.scheduledPublishDate && post.scheduledPublishTime) {
              console.log(`Processing scheduled post with date: ${post.scheduledPublishDate} and time: ${post.scheduledPublishTime}`);
              
              try {
                // Get shop's timezone from the store info
                const shopInfo = await shopifyService.getShopInfo(tempStore);
                const timezone = shopInfo?.iana_timezone || shopInfo.timezone || 'UTC';
                console.log(`Using timezone: ${timezone} for scheduling`);
                
                // Import the timezone-aware date creation function
                const { createDateInTimezone } = await import('@shared/timezone');
                
                // Create a proper Date object in the store's timezone
                scheduledPublishDate = createDateInTimezone(
                  post.scheduledPublishDate,
                  post.scheduledPublishTime,
                  timezone
                );
                
                console.log(`Created scheduled publish date: ${scheduledPublishDate.toISOString()}`);
                
                // Ensure the date is in the future
                const now = new Date();
                if (scheduledPublishDate <= now) {
                  console.warn(`Scheduled date is in the past, adjusting to 1 hour from now`);
                  scheduledPublishDate = new Date();
                  scheduledPublishDate.setHours(scheduledPublishDate.getHours() + 1);
                }
              } catch (error) {
                console.error(`Error creating scheduled date:`, error);
                // Fallback to simple date creation
                try {
                  const [year, month, day] = post.scheduledPublishDate.split('-').map(Number);
                  const [hours, minutes] = post.scheduledPublishTime.split(':').map(Number);
                  
                  scheduledPublishDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
                  console.log(`Fallback scheduled date: ${scheduledPublishDate.toISOString()}`);
                } catch (fallbackError) {
                  console.error(`Fallback date creation failed:`, fallbackError);
                }
              }
            }
            
            // Determine if this is a page or a blog post
            let shopifyArticle;
            // Get the article type from the request or default to blog
            const articleType = req.body.articleType || req.body.contentType || 'blog';
            const isPage = articleType === 'page';
            // Add this info to the post for later use
            post.articleType = articleType;
            
            if (isPage) {
              console.log(`Creating a Shopify page for post with status: ${post.status}`);
              
              // Get complete post data for pages too
              const completePost = await storage.getBlogPost(post.id);
              let pageContent = completePost?.content || post.content;
              
              // If page has an author, inject author box into content
              if (completePost?.authorId) {
                try {
                  // Get author data from database
                  const authorData = await db.select().from(authors).where(eq(authors.id, completePost.authorId)).limit(1);
                  
                  if (authorData.length > 0) {
                    const author = authorData[0];
                    
                    // Generate author box HTML inline with LinkedIn integration
                    const generateAuthorBoxHTML = (author: any) => {
                      const avatarInitials = author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                      const avatarImg = author.profileImage 
                        ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;" />`
                        : `<div style="width: 64px; height: 64px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 18px;">${avatarInitials}</div>`;

                      // LinkedIn "Learn More" button if LinkedIn URL is available
                      const linkedinButton = author.linkedinUrl 
                        ? `<a href="${author.linkedinUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #0077b5; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">Learn More</a>`
                        : '';

                      return `
                        <div id="author-box" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; background: #ffffff;">
                          <div style="display: flex; gap: 16px; align-items: flex-start;">
                            ${avatarImg}
                            <div style="flex: 1;">
                              <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">${author.name}</h3>
                              ${author.description ? `<p style="color: #4b5563; line-height: 1.6; margin: 0 0 12px 0;">${author.description}</p>` : ''}
                              ${linkedinButton}
                            </div>
                          </div>
                        </div>
                      `;
                    };

                    const generateWrittenByHTML = (author: any) => {
                      const avatarInitials = author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                      const avatarImg = author.profileImage 
                        ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />`
                        : `<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 12px;">${avatarInitials}</div>`;

                      return `
                        <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0; padding: 8px 0;">
                          ${avatarImg}
                          <span style="color: #6b7280; font-size: 14px;">
                            Written by <a href="#author-box" style="color: #2563eb; text-decoration: none; font-weight: 500;">${author.name}</a>
                          </span>
                        </div>
                      `;
                    };
                    
                    const authorFormatted = {
                      id: author.id.toString(),
                      name: author.name,
                      description: author.description || '',
                      profileImage: author.avatarUrl || undefined,
                      linkedinUrl: author.linkedin_url || undefined
                    };
                    
                    // Generate author HTML components
                    const writtenByHTML = generateWrittenByHTML(authorFormatted);
                    const authorBoxHTML = generateAuthorBoxHTML(authorFormatted);
                    
                    // Find the first image or paragraph in content to inject "Written by" after it
                    const imageMatch = pageContent.match(/<img[^>]*>/i);
                    const paragraphMatch = pageContent.match(/<p[^>]*>.*?<\/p>/i);
                    
                    if (imageMatch) {
                      // Insert "Written by" after first image
                      const imageEndIndex = pageContent.indexOf(imageMatch[0]) + imageMatch[0].length;
                      pageContent = pageContent.slice(0, imageEndIndex) + writtenByHTML + pageContent.slice(imageEndIndex);
                    } else if (paragraphMatch) {
                      // Insert "Written by" after first paragraph
                      const paragraphEndIndex = pageContent.indexOf(paragraphMatch[0]) + paragraphMatch[0].length;
                      pageContent = pageContent.slice(0, paragraphEndIndex) + writtenByHTML + pageContent.slice(paragraphEndIndex);
                    } else {
                      // Fallback: add at beginning of content
                      pageContent = writtenByHTML + pageContent;
                    }
                    
                    // Add author box at the end of content
                    pageContent += authorBoxHTML;
                    
                    // Add author name to the post object for Shopify API
                    completePost.author = author.name;
                    
                    console.log(`Added author information to page for: ${author.name}`);
                  }
                } catch (authorError) {
                  console.error("Error adding author information to page:", authorError);
                  // Continue without author info if there's an error
                }
              }
              
              // For pages, we need to pass the published flag and date
              shopifyArticle = await shopifyService.createPage(
                tempStore,
                post.title,
                pageContent,
                post.status === 'published', // true only if immediate publish
                scheduledPublishDate, // date for scheduled posts
                undefined, // featured image
                post // pass the post object with categories for metadata
              );
            } else {
              // For blog posts, use the existing article creation logic
              console.log(`Creating a Shopify article for post with status: ${post.status}`);
              
              // Ensure we have the complete post data with meta fields
              const completePost = await storage.getBlogPost(post.id);
              console.log(`Complete post data before Shopify:`, {
                id: completePost?.id,
                title: completePost?.title,
                metaTitle: completePost?.metaTitle,
                metaDescription: completePost?.metaDescription,
                authorId: completePost?.authorId
              });

              // Add author information with LinkedIn integration
              try {
                let authorToUse = null;
                
                // First, try to use the selected author from the form
                if (completePost?.authorId) {
                  const selectedAuthorData = await db.select().from(authors).where(eq(authors.id, parseInt(completePost.authorId.toString()))).limit(1);
                  if (selectedAuthorData.length > 0) {
                    authorToUse = selectedAuthorData[0];
                    console.log(`Using selected author: ${authorToUse.name}`);
                  }
                }
                
                // No automatic default author selection - require explicit author selection
                if (!authorToUse) {
                  console.log(`No author specified for post ${post.id} - skipping author information`);
                }
                
                if (authorToUse && completePost) {
                  const author = authorToUse;
                  
                  // Author box with LinkedIn integration - small avatar sizing
                  const avatarInitials = author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                  const avatarElement = author.avatarUrl 
                    ? `<img src="${author.avatarUrl}" alt="${author.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; display: block; flex-shrink: 0;" />`
                    : `<div style="width: 48px; height: 48px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 14px; flex-shrink: 0;">${avatarInitials}</div>`;
                  
                  // LinkedIn "Learn More" button if LinkedIn URL is available
                  const linkedinButton = author.linkedinUrl 
                    ? `<a href="${author.linkedinUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #0077b5; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;">Learn More</a>`
                    : '';
                  
                  const authorBox = `
                    <div id="author-box" style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; background: #ffffff;">
                      <div style="display: flex; gap: 16px; align-items: flex-start;">
                        ${avatarElement}
                        <div style="flex: 1;">
                          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">${author.name}</h3>
                          ${author.description ? `<p style="color: #4b5563; line-height: 1.6; margin: 0 0 12px 0;">${author.description}</p>` : ''}
                          ${linkedinButton}
                        </div>
                      </div>
                    </div>
                  `;
                  
                  completePost.content += authorBox;
                  completePost.author = author.name;
                  console.log(`Added author with LinkedIn integration: ${author.name}${author.linkedinUrl ? ' (LinkedIn: ' + author.linkedinUrl + ')' : ''}`);
                }
              } catch (authorError) {
                console.error("Error adding author information:", authorError);
              }
              
              // Use custom scheduler for scheduled posts instead of Shopify's built-in scheduling
              if (post.status === 'scheduled' && scheduledPublishDate) {
                console.log('Creating scheduled post using custom scheduler approach');
                
                const { schedulePost } = await import('./services/custom-scheduler');
                
                shopifyArticle = await schedulePost(
                  tempStore,
                  tempStore.defaultBlogId,
                  completePost || post,
                  scheduledPublishDate
                );
              } else {
                // For immediate publishing or drafts
                shopifyArticle = await shopifyService.createArticle(
                  tempStore, 
                  connection.defaultBlogId, 
                  completePost || post,
                  undefined // No scheduling date for immediate publish/draft
                );
              }
            }
            
            // Update post with Shopify ID and handle for URL generation
            let updatedPost;
            try {
              updatedPost = await storage.updateBlogPost(post.id, {
                shopifyPostId: shopifyArticle.id,
                shopifyBlogId: isPage ? null : connection.defaultBlogId
              });
            } catch (dbError) {
              console.log('Database update failed, using in-memory post data with Shopify info');
              // Even if database update fails, return post with Shopify information for button display
              updatedPost = {
                ...post,
                shopifyPostId: shopifyArticle.id,
                shopifyBlogId: isPage ? null : connection.defaultBlogId,
                shopifyHandle: shopifyArticle.handle // Add handle for URL generation
              };
            }
            
            // Create appropriate sync activity based on status
            const activityType = post.status === 'published' ? 'Published' : 'Scheduled';
            const details = post.status === 'published' 
              ? 'Successfully published to Shopify'
              : `Successfully scheduled for publication on ${post.scheduledPublishDate} at ${post.scheduledPublishTime}`;
            
            try {
              await storage.createSyncActivity({
                activity: `${activityType} "${post.title}"`,
                status: "success",
                details: details
              });
            } catch (activityError) {
              console.log('Failed to create sync activity, but continuing with response');
            }
            
            return res.json({ 
              post: updatedPost,
              shopifyUrl: isPage 
                ? `https://${tempStore.shopName}/pages/${shopifyArticle.handle || shopifyArticle.id}`
                : `https://${tempStore.shopName}/blogs/${tempStore.defaultBlogId ? 'news' : 'blog'}/${shopifyArticle.handle || shopifyArticle.id}`,
              success: true
            });
          } catch (shopifyError: any) {
            // Log error but don't fail the request
            console.error("Error sending to Shopify:", shopifyError);
            
            // Create sync activity
            const activityType = post.status === 'published' ? 'publishing' : 'scheduling';
            await storage.createSyncActivity({
              activity: `Failed ${activityType} "${post.title}"`,
              status: "failed",
              details: shopifyError.message
            });
          }
        } else {
          console.log("No valid Shopify connection available for publishing/scheduling");
        }
      }
      
      // Default response if we didn't return earlier
      return res.json({ post });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update a blog post
  apiRouter.put("/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      // Check if post exists
      const existingPost = await storage.getBlogPost(id);
      
      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Validate request body
      const postData = insertBlogPostSchema.partial().parse(req.body);
      
      // Update post in storage
      const post = await storage.updateBlogPost(id, postData);
      
      if (!post) {
        return res.status(500).json({ error: "Failed to update post" });
      }
      
      // If post is published and has a Shopify ID, update in Shopify
      if (post.shopifyPostId && (postData.status === 'published' || existingPost.status === 'published')) {
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.isConnected && connection.defaultBlogId) {
          try {
            // Get function references
            const { setConnection, updateArticle } = shopifyService;
            
            // Set connection first
            setConnection(connection);
            
            // Create a temporary store object for using with the new API
            const tempStore = {
              id: connection.id,
              shopName: connection.storeName,
              accessToken: connection.accessToken,
              scope: '', // Not available in legacy connection
              defaultBlogId: connection.defaultBlogId,
              isConnected: connection.isConnected || true,
              lastSynced: connection.lastSynced,
              installedAt: new Date(),
              uninstalledAt: null,
              planName: null,
              chargeId: null,
              trialEndsAt: null
            };
            
            await updateArticle(tempStore, connection.defaultBlogId, post.shopifyPostId, postData);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Updated "${post.title}" on Shopify`,
              status: "success",
              details: `Successfully updated on Shopify`
            });
          } catch (shopifyError: any) {
            // Log error but don't fail the request
            console.error("Error updating in Shopify:", shopifyError);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Failed to update "${post.title}" on Shopify`,
              status: "failed",
              details: shopifyError.message
            });
          }
        }
      }
      // If post is now published but wasn't before, publish to Shopify
      else if (postData.status === 'published' && existingPost.status !== 'published') {
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.isConnected && connection.defaultBlogId) {
          try {
            // Get function references
            const { setConnection, createArticle } = shopifyService;
            
            // Set connection first
            setConnection(connection);
            
            // Create a temporary store object for using with the new API
            const tempStore = {
              id: connection.id,
              shopName: connection.storeName,
              accessToken: connection.accessToken,
              scope: '', // Not available in legacy connection
              defaultBlogId: connection.defaultBlogId,
              isConnected: connection.isConnected || true,
              lastSynced: connection.lastSynced,
              installedAt: new Date(),
              uninstalledAt: null,
              planName: null,
              chargeId: null,
              trialEndsAt: null
            };
            // For scheduled posts, create a proper Date object for scheduling
            let scheduledPublishDate: Date | undefined = undefined;
            
            if (post.status === 'scheduled' && post.scheduledPublishDate && post.scheduledPublishTime) {
              try {
                // Get shop info for timezone
                const shopInfo = await shopifyService.getShopInfo(tempStore);
                const timezone = shopInfo?.iana_timezone || shopInfo.timezone || 'UTC';
                
                // Create a date in the shop's timezone
                const { createDateInTimezone } = await import('@shared/timezone');
                scheduledPublishDate = createDateInTimezone(
                  post.scheduledPublishDate,
                  post.scheduledPublishTime,
                  timezone
                );
                
                console.log(`Created scheduled date for updated post: ${scheduledPublishDate.toISOString()}`);
              } catch (error) {
                console.error('Error creating scheduled date for update:', error);
              }
            }
            
            const shopifyArticle = await createArticle(
              tempStore, 
              connection.defaultBlogId, 
              post,
              scheduledPublishDate
            );
            
            // Update post with Shopify ID
            const updatedPost = await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id
            });
            
            if (updatedPost) {
              // Create sync activity
              await storage.createSyncActivity({
                activity: `Published "${post.title}"`,
                status: "success",
                details: `Successfully published to Shopify`
              });
              
              return res.json({ post: updatedPost });
            }
          } catch (shopifyError: any) {
            // Log error but don't fail the request
            console.error("Error publishing to Shopify:", shopifyError);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Failed to publish "${post.title}"`,
              status: "failed",
              details: shopifyError.message
            });
          }
        }
      }
      
      res.json({ post });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete a blog post
  apiRouter.delete("/posts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      // Check if post exists
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // If post has a Shopify ID, delete from Shopify
      if (post.shopifyPostId) {
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.isConnected && connection.defaultBlogId) {
          try {
            // Get function references
            const { setConnection, deleteArticle } = shopifyService;
            
            // Set connection first
            setConnection(connection);
            
            // Create a temporary store object for using with the new API
            const tempStore = {
              id: connection.id,
              shopName: connection.storeName,
              accessToken: connection.accessToken,
              scope: '', // Not available in legacy connection
              defaultBlogId: connection.defaultBlogId,
              isConnected: connection.isConnected || true,
              lastSynced: connection.lastSynced,
              installedAt: new Date(),
              uninstalledAt: null,
              planName: null,
              chargeId: null,
              trialEndsAt: null
            };
            
            await deleteArticle(tempStore, connection.defaultBlogId, post.shopifyPostId);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Deleted "${post.title}" from Shopify`,
              status: "success",
              details: `Successfully deleted from Shopify`
            });
          } catch (shopifyError: any) {
            // Log error but don't fail the request
            console.error("Error deleting from Shopify:", shopifyError);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Failed to delete "${post.title}" from Shopify`,
              status: "failed",
              details: shopifyError.message
            });
          }
        }
      }
      
      // Delete post from storage
      const result = await storage.deleteBlogPost(id);
      
      if (!result) {
        return res.status(500).json({ error: "Failed to delete post" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- SYNC ACTIVITY ROUTES ---
  
  // Get sync activities
  apiRouter.get("/sync-activities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getSyncActivities(limit);
      res.json({ activities });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- CONTENT GENERATION ROUTES ---
  
  // Generate topic suggestions
  apiRouter.get("/topic-suggestions", async (req: Request, res: Response) => {
    try {
      const { niche, count = "5" } = req.query;
      
      if (!niche || typeof niche !== 'string') {
        return res.status(400).json({ error: "Niche parameter is required" });
      }
      
      console.log(`Generating topic suggestions for niche: "${niche}", count: ${count}`);
      
      // Import the OpenAI service here to avoid loading during startup if not needed
      const { generateTopicSuggestions } = await import("./services/openai");
      
      try {
        const topics = await generateTopicSuggestions(niche, parseInt(count as string));
        console.log(`Generated ${topics.length} topic suggestions`);
        
        res.json({ topics });
      } catch (serviceError: any) {
        console.error("Service error generating topic suggestions:", serviceError);
        
        // Generate fallback topics on server if the service fails
        const fallbackTopics = [
          `${niche} Best Practices`,
          `Top 10 ${niche} Trends`,
          `How to Improve Your ${niche} Strategy`,
          `${niche} for Beginners`,
          `Advanced ${niche} Techniques`,
          `The Future of ${niche}`,
          `${niche} Case Studies`,
          `${niche} Tools and Resources`,
          `${niche} vs Traditional Methods`,
          `${niche} ROI Calculation`
        ].slice(0, parseInt(count as string));
        
        console.log(`Using ${fallbackTopics.length} fallback topics`);
        res.json({ topics: fallbackTopics });
      }
    } catch (error: any) {
      console.error("Error generating topic suggestions:", error);
      res.status(500).json({ error: error.message || "Failed to generate topic suggestions" });
    }
  });

  // AI-powered Auto Optimize for meta title and description
  apiRouter.post("/optimize-meta-fields", async (req: Request, res: Response) => {
    try {
      const optimizeSchema = z.object({
        title: z.string().min(1, "Title is required"),
        content: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        targetAudience: z.string().optional(),
        tone: z.string().optional(),
        region: z.string().optional()
      });

      const { title, content, keywords = [], targetAudience, tone, region } = optimizeSchema.parse(req.body);

      console.log('Optimizing meta fields with AI:', {
        title: title.substring(0, 50) + '...',
        hasContent: !!content,
        keywordCount: keywords.length,
        targetAudience,
        tone,
        region
      });

      // Use Claude AI for meta optimization
      const Anthropic = await import('@anthropic-ai/sdk');
      const anthropic = new Anthropic.default({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Create context for optimization
      const optimizationContext = {
        mainTitle: title,
        keywords: keywords.join(', '),
        targetAudience: targetAudience || 'general audience',
        tone: tone || 'professional',
        region: region || 'US',
        contentSnippet: content ? content.substring(0, 500) : ''
      };

      const prompt = `You are an SEO expert specializing in meta optimization. Generate an optimized meta title and meta description for this content:

CONTENT DETAILS:
Title: ${optimizationContext.mainTitle}
Keywords: ${optimizationContext.keywords}
Target Audience: ${optimizationContext.targetAudience}
Tone: ${optimizationContext.tone}
Region: ${optimizationContext.region}
${optimizationContext.contentSnippet ? `Content Preview: ${optimizationContext.contentSnippet}...` : ''}

REQUIREMENTS:
- Meta Title: 50-60 characters maximum, include primary keyword, compelling and clickable
- Meta Description: 150-160 characters maximum, include keywords naturally, compelling call-to-action
- Optimize for search engines while remaining engaging for humans
- Match the specified tone and target audience
- Use action words and emotional triggers appropriate for the audience
- Include location-specific terms if relevant to the region

Return ONLY a valid JSON object with "metaTitle" and "metaDescription" fields. No additional text or formatting.`;

      console.log('Sending meta optimization request to Claude AI');
      
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      // Extract content from Claude's response
      const aiResponseContent = response.content[0];
      let aiResponseText = '';
      
      if (aiResponseContent && aiResponseContent.type === 'text') {
        aiResponseText = aiResponseContent.text;
      }
      
      console.log('Claude AI response:', aiResponseText);

      // Parse the AI response
      let optimizedFields;
      try {
        // Extract JSON from response if it's wrapped in markdown or text
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponseText;
        optimizedFields = JSON.parse(jsonStr);
        
        console.log('Successfully parsed AI response:', optimizedFields);
      } catch (parseError) {
        console.log('Failed to parse JSON, using text extraction fallback:', parseError);
        
        // Fallback: create structured response from text
        const lines = aiResponseText.split('\n').filter((line: string) => line.trim());
        optimizedFields = {
          metaTitle: title.substring(0, 60), // Fallback to truncated original
          metaDescription: `Discover ${title.toLowerCase()}. ${keywords.slice(0, 2).join(', ')} and more.`.substring(0, 160)
        };
        
        // Try to extract from formatted text
        for (const line of lines) {
          if (line.toLowerCase().includes('meta title') || line.toLowerCase().includes('title:')) {
            const titleMatch = line.match(/:\s*(.+)/);
            if (titleMatch) optimizedFields.metaTitle = titleMatch[1].trim().replace(/"/g, '');
          }
          if (line.toLowerCase().includes('meta description') || line.toLowerCase().includes('description:')) {
            const descMatch = line.match(/:\s*(.+)/);
            if (descMatch) optimizedFields.metaDescription = descMatch[1].trim().replace(/"/g, '');
          }
        }
      }

      // Validate and clean the response
      if (!optimizedFields.metaTitle || !optimizedFields.metaDescription) {
        throw new Error('AI response missing required fields');
      }

      // Ensure proper length limits
      if (optimizedFields.metaTitle.length > 60) {
        optimizedFields.metaTitle = optimizedFields.metaTitle.substring(0, 57) + '...';
      }
      if (optimizedFields.metaDescription.length > 160) {
        optimizedFields.metaDescription = optimizedFields.metaDescription.substring(0, 157) + '...';
      }

      console.log('AI optimization complete:', {
        metaTitleLength: optimizedFields.metaTitle.length,
        metaDescriptionLength: optimizedFields.metaDescription.length
      });

      res.json({
        success: true,
        metaTitle: optimizedFields.metaTitle,
        metaDescription: optimizedFields.metaDescription,
        context: optimizationContext
      });

    } catch (error: any) {
      console.error("Error optimizing meta fields:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to optimize meta fields" 
      });
    }
  });

  // Keywords endpoint for SEO keyword research
  apiRouter.get("/keywords", async (req: Request, res: Response) => {
    try {
      const { products, collections, region = 'us' } = req.query;
      
      console.log('Keywords API called with:', { products, collections, region });
      
      // Parse products and collections from query parameters
      let selectedProducts: any[] = [];
      let selectedCollections: any[] = [];
      
      if (products && typeof products === 'string') {
        try {
          selectedProducts = JSON.parse(products);
        } catch (e) {
          console.error('Error parsing products:', e);
        }
      }
      
      if (collections && typeof collections === 'string') {
        try {
          selectedCollections = JSON.parse(collections);
        } catch (e) {
          console.error('Error parsing collections:', e);
        }
      }
      
      // Import DataForSEO service
      const { DataForSEOService } = await import('./services/dataforseo');
      const dataForSEOService = new DataForSEOService();
      
      // Build search terms from products and collections
      const searchTerms: string[] = [];
      
      // Add product titles
      if (selectedProducts && Array.isArray(selectedProducts)) {
        selectedProducts.forEach(product => {
          if (product.title) {
            searchTerms.push(product.title);
          }
        });
      }
      
      // Add collection titles
      if (selectedCollections && Array.isArray(selectedCollections)) {
        selectedCollections.forEach(collection => {
          if (collection.title) {
            searchTerms.push(collection.title);
          }
        });
      }
      
      // If no search terms, use a default
      if (searchTerms.length === 0) {
        searchTerms.push('business products');
      }
      
      console.log(`Fetching keywords for terms: ${searchTerms.join(', ')}`);
      
      // Get keywords from DataForSEO
      let allKeywords: any[] = [];
      
      // Process first search term
      if (searchTerms.length > 0) {
        const keywords = await dataForSEOService.getKeywordsForProduct(searchTerms[0]);
        allKeywords = keywords;
      }
      
      // Process additional terms and merge unique keywords
      if (searchTerms.length > 1) {
        const processedKeywords = new Set(allKeywords.map(k => k.keyword.toLowerCase()));
        
        for (let i = 1; i < Math.min(searchTerms.length, 3); i++) {
          const additionalKeywords = await dataForSEOService.getKeywordsForProduct(searchTerms[i]);
          
          additionalKeywords.forEach(keyword => {
            if (!processedKeywords.has(keyword.keyword.toLowerCase())) {
              allKeywords.push(keyword);
              processedKeywords.add(keyword.keyword.toLowerCase());
            }
          });
        }
      }
      
      console.log(`Returning ${allKeywords.length} keywords`);
      res.json({ keywords: allKeywords });
      
    } catch (error: any) {
      console.error('Error fetching keywords:', error);
      res.status(500).json({ 
        error: 'Failed to fetch keywords',
        message: error.message 
      });
    }
  });

  // Use our dedicated content router for content generation endpoints
  apiRouter.use(contentRouter);
  
  // Add Claude routes under /api/claude
  apiRouter.use('/claude', claudeRouter);
  
  // Add admin panel routes under /api/admin
  apiRouter.use('/admin', adminRouter);
  
  // Get stats for dashboard
  apiRouter.get("/stats", async (req: Request, res: Response) => {
    try {
      const allPosts = await storage.getBlogPosts();
      const publishedPosts = allPosts.filter(post => post.status === 'published');
      const scheduledPosts = allPosts.filter(post => post.status === 'scheduled');
      
      // Calculate total views
      const totalViews = publishedPosts.reduce((sum, post) => sum + (post.views || 0), 0);
      
      res.json({
        totalPosts: allPosts.length,
        published: publishedPosts.length,
        scheduled: scheduledPosts.length,
        totalViews: totalViews
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get available plans
  apiRouter.get("/plans", async (req: Request, res: Response) => {
    try {
      res.json({
        plans: PLANS
      });
    } catch (error: any) {
      res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  });

  // --- AUTHOR MANAGEMENT ROUTES ---
  
  // Get all authors
  apiRouter.get("/authors", async (req: Request, res: Response) => {
    try {
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(401).json({ error: "Store not found or not connected" });
      }

      // Get authors using Drizzle ORM with correct schema
      const authorsList = await db.select().from(authors).where(eq(authors.storeId, store.id)).orderBy(desc(authors.createdAt));

      // Convert database authors to expected format
      const formattedAuthors = authorsList.map((author) => ({
        id: author.id.toString(),
        handle: author.name.toLowerCase().replace(/\s+/g, '-'), // Generate handle from name
        name: author.name,
        description: author.description || '',
        profileImage: author.avatarUrl || null,
        linkedinUrl: author.linkedinUrl || null
      }));

      res.json({ authors: formattedAuthors });
    } catch (error: any) {
      console.error("Error fetching authors:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new author
  apiRouter.post("/authors", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/authors - Request body:", JSON.stringify(req.body));
      const { name, description, profileImage, linkedinUrl } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Author name is required" });
      }

      const connection = await storage.getShopifyConnection();
      
      if (!connection || !connection.isConnected) {
        return res.status(400).json({ error: "Not connected to Shopify" });
      }

      // Create temporary store object
      const store = {
        id: connection.id,
        shopName: connection.storeName,
        accessToken: connection.accessToken,
        scope: '',
        defaultBlogId: connection.defaultBlogId || '',
        isConnected: connection.isConnected,
        lastSynced: connection.lastSynced,
        installedAt: new Date(),
        uninstalledAt: null,
        planName: null,
        chargeId: null,
        trialEndsAt: null
      };

      // Insert author using Drizzle ORM with correct schema
      const [newAuthor] = await db.insert(authors).values({
        storeId: store.id,
        name,
        description: description || '',
        avatarUrl: profileImage || null,
        linkedinUrl: linkedinUrl || null,
        isActive: true
      }).returning();
      
      // Format response to match expected structure
      const formattedAuthor = {
        id: newAuthor.id.toString(),
        handle: newAuthor.name.toLowerCase().replace(/\s+/g, '-'),
        name: newAuthor.name,
        description: newAuthor.description || '',
        profileImage: newAuthor.avatarUrl || null,
        linkedinUrl: newAuthor.linkedinUrl || null
      };
      
      console.log("Created author:", JSON.stringify(formattedAuthor));
      res.json({ author: formattedAuthor });
    } catch (error: any) {
      console.error("Error creating author:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update an author
  apiRouter.put("/authors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      console.log(`PUT /api/authors/${id} - Request body:`, JSON.stringify(req.body));
      const { name, description, profileImage, linkedinUrl } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Author name is required" });
      }

      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(401).json({ error: "Store not found or not connected" });
      }

      // Update author using Drizzle ORM
      const [updatedAuthor] = await db.update(authors)
        .set({
          name,
          description: description || '',
          avatarUrl: profileImage || null,
          linkedinUrl: linkedinUrl || null,
          updatedAt: new Date()
        })
        .where(and(eq(authors.id, id), eq(authors.storeId, store.id)))
        .returning();

      if (!updatedAuthor) {
        return res.status(404).json({ error: "Author not found" });
      }

      // Format response to match expected structure
      const formattedAuthor = {
        id: updatedAuthor.id.toString(),
        handle: updatedAuthor.name.toLowerCase().replace(/\s+/g, '-'),
        name: updatedAuthor.name,
        description: updatedAuthor.description || '',
        profileImage: updatedAuthor.avatarUrl || null,
        linkedinUrl: updatedAuthor.linkedinUrl || null
      };
      
      console.log("Updated author:", JSON.stringify(formattedAuthor));
      res.json({ author: formattedAuthor });
    } catch (error: any) {
      console.error("Error updating author:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete an author
  apiRouter.delete("/authors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID" });
      }
      
      console.log(`DELETE /api/authors/${id}`);

      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(401).json({ error: "Store not found or not connected" });
      }

      // Check if author has any posts
      const postsWithAuthor = await db.select().from(blogPosts)
        .where(and(eq(blogPosts.authorId, id), eq(blogPosts.storeId, store.id)))
        .limit(1);

      if (postsWithAuthor.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete author with existing posts. Please reassign posts to another author first." 
        });
      }

      // Delete author using Drizzle ORM
      const [deletedAuthor] = await db.delete(authors)
        .where(and(eq(authors.id, id), eq(authors.storeId, store.id)))
        .returning();

      if (!deletedAuthor) {
        return res.status(404).json({ error: "Author not found" });
      }

      console.log(`Deleted author: ${deletedAuthor.name}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting author:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Project Management API Endpoints
  
  // Create a new project
  apiRouter.post("/projects", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/projects - Request body:", JSON.stringify(req.body));
      
      const { name, formData } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }
      
      if (!formData) {
        return res.status(400).json({ error: "Form data is required" });
      }

      // Get store info for storeId
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(401).json({ error: "Store not found or not connected" });
      }

      // For now, use a default userId (1) - in a real app, this would come from authentication
      const userId = 1;
      
      const projectData = {
        name,
        formData: JSON.stringify(formData),
        userId,
        storeId: store.id
      };

      const project = await storage.createProject(projectData);
      
      console.log("Created project:", JSON.stringify(project));
      res.json({ success: true, project });
    } catch (error: any) {
      console.error("Error creating project:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update an existing project
  apiRouter.put("/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      console.log(`PUT /api/projects/${id} - Request body:`, JSON.stringify(req.body));
      
      const { name, formData } = req.body;
      
      const updateData: any = {};
      if (name) updateData.name = name;
      if (formData) updateData.formData = JSON.stringify(formData);

      const project = await storage.updateProject(id, updateData);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      console.log("Updated project:", JSON.stringify(project));
      res.json({ success: true, project });
    } catch (error: any) {
      console.error("Error updating project:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get a specific project
  apiRouter.get("/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Parse formData back to JSON for the frontend
      const responseProject = {
        ...project,
        formData: project.formData ? JSON.parse(project.formData) : null
      };
      
      res.json({ success: true, project: responseProject });
    } catch (error: any) {
      console.error("Error getting project:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all projects for a user/store
  apiRouter.get("/projects", async (req: Request, res: Response) => {
    try {
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(401).json({ error: "Store not found or not connected" });
      }

      // For now, use a default userId (1) - in a real app, this would come from authentication
      const userId = 1;
      
      const projects = await storage.getUserProjects(userId, store.id);
      
      // Parse formData for each project
      const responseProjects = projects.map(project => ({
        ...project,
        formData: project.formData ? JSON.parse(project.formData) : null
      }));
      
      res.json({ success: true, projects: responseProjects });
    } catch (error: any) {
      console.error("Error getting projects:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete a project
  apiRouter.delete("/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      const deleted = await storage.deleteProject(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // --- OAUTH ROUTES ---
  
  // Shopify OAuth routes (not prefixed with /api)
  const oauthRouter = Router();
  
  // Store the nonce in memory with type for host parameter
  interface NonceData {
    shop: string;
    timestamp: number;
    host?: string;
  }
  const nonceStore = new Map<string, NonceData>();
  
  // Clean up expired nonces (older than 1 hour)
  setInterval(() => {
    const now = Date.now();
    // Use Array.from to convert Iterator to array to avoid TypeScript error
    Array.from(nonceStore.entries()).forEach(([nonce, data]) => {
      if (now - data.timestamp > 60 * 60 * 1000) {
        nonceStore.delete(nonce);
      }
    });
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  // Initiate OAuth flow
  oauthRouter.get("/shopify/auth", async (req: Request, res: Response) => {
    try {
      const { shop, host } = req.query;
      
      if (!shop || typeof shop !== 'string') {
        return res.status(400).send('Missing shop parameter');
      }
      
      if (!validateShopDomain(shop)) {
        return res.status(400).send('Invalid shop domain');
      }
      
      // Generate a nonce for CSRF protection
      const nonce = generateNonce();
      
      // Store the host parameter if it exists (for Partner Dashboard installations)
      if (host && typeof host === 'string') {
        nonceStore.set(nonce, { shop, timestamp: Date.now(), host });
      } else {
        nonceStore.set(nonce, { shop, timestamp: Date.now() });
      }

      // Get Shopify API credentials from environment variables
      const apiKey = process.env.SHOPIFY_API_KEY;
      
      if (!apiKey) {
        return res.status(500).send('Missing Shopify API key');
      }
      
      // Use the exact redirect URL configured in the Shopify Partner Dashboard
      const hostname = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || (hostname.includes('replit.dev') ? 'https' : 'http');
      const baseUrl = `${protocol}://${hostname}`;
      
      // Use the correct callback path that matches Partner Dashboard configuration
      const redirectUri = `${baseUrl}/shopify/callback`;
      
      console.log(`Using redirect URI: ${redirectUri}`);
      
      // Create the authorization URL, passing host parameter for embedded apps
      const authUrl = createAuthUrl(shop, apiKey, redirectUri, nonce, host as string | undefined);
      
      console.log(`Redirecting to Shopify for authorization with URL: ${authUrl}`);
      
      // Redirect to Shopify for authorization
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Error initiating OAuth:', error);
      res.status(500).send('An error occurred while initiating OAuth');
    }
  });
  
  // OAuth callback (matches Partner Dashboard configuration)
  oauthRouter.get("/shopify/callback", async (req: Request, res: Response) => {
    try {
      const { shop, code, state, hmac } = req.query as Record<string, string>;
      
      if (!shop || !code || !state || !hmac) {
        return res.status(400).send('Missing required parameters');
      }
      
      // Validate the shop domain
      if (!validateShopDomain(shop)) {
        return res.status(400).send('Invalid shop domain');
      }
      
      // Get Shopify API credentials from environment variables
      const apiKey = process.env.SHOPIFY_API_KEY;
      const apiSecret = process.env.SHOPIFY_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        return res.status(500).send('Missing Shopify API credentials');
      }
      
      // Verify the HMAC
      if (!validateHmac(req.query as Record<string, string>, apiSecret)) {
        return res.status(403).send('Invalid HMAC signature');
      }
      
      // Validate the state (nonce)
      const nonceData = nonceStore.get(state);
      if (!nonceData || nonceData.shop !== shop) {
        return res.status(403).send('Invalid state parameter');
      }
      
      // Clean up the used nonce
      nonceStore.delete(state);
      
      // Exchange the code for a permanent access token
      const accessToken = await getAccessToken(shop, code, apiKey, apiSecret);
      
      // Get shop data from Shopify
      const shopData = await getShopData(shop, accessToken);
      
      // Create or update the store in our multi-store database
      try {
        // First check if we already have this store
        let store = await storage.getShopifyStoreByDomain(shop);
        let storeId: number;
        
        if (store) {
          // Update the existing store
          store = await storage.updateShopifyStore(store.id, {
            accessToken,
            isConnected: true,
            lastSynced: new Date(),
            uninstalledAt: null // Clear uninstall date if previously uninstalled
          });
          storeId = store.id;
        } else {
          // Create a new store
          const storeName = shopData.name || shop;
          
          store = await storage.createShopifyStore({
            shopName: shop, // Using the shop domain as the shopName
            accessToken,
            scope: "read_products,write_products,read_content,write_content,read_themes,write_publications",
            isConnected: true
            // lastSynced will be set by default
          });
          storeId = store.id;
          
          console.log(`New store created with ID: ${storeId} for shop: ${shop}`);
        }
        
        // Redirect to the app with the shop and host parameters
        const host = nonceData.host;
        const redirectUrl = `/embedded?shop=${shop}${host ? `&host=${host}` : ''}`;
        
        res.redirect(redirectUrl);
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        res.status(500).send('An error occurred while saving store data');
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.status(500).send('An error occurred during the OAuth callback');
    }
  });
  
  // Webhook for app uninstalled
  oauthRouter.post("/shopify/webhooks/app-uninstalled", async (req: Request, res: Response) => {
    try {
      // Verify the webhook
      const hmac = req.headers['x-shopify-hmac-sha256'] as string;
      const apiSecret = process.env.SHOPIFY_API_SECRET;
      
      if (!apiSecret) {
        console.error('Missing API secret for webhook verification');
        return res.status(403).send('Unauthorized');
      }
      
      if (!verifyWebhook(req.headers as Record<string, string>, req.body, apiSecret)) {
        console.error('Invalid webhook signature');
        return res.status(403).send('Unauthorized');
      }
      
      // Extract shop from webhook
      const { shop_domain } = req.body;
      
      if (!shop_domain) {
        console.error('Missing shop domain in webhook');
        return res.status(400).send('Bad request');
      }
      
      // Update store record to mark as uninstalled
      try {
        // Find the store
        const store = await storage.getShopifyStoreByDomain(shop_domain);
        
        if (store) {
          // Mark as uninstalled
          await storage.updateShopifyStore(store.id, {
            isConnected: false,
            uninstalledAt: new Date()
          });
          
          // Also update the legacy connection for backward compatibility
          const connection = await storage.getShopifyConnection();
          if (connection) {
            await storage.updateShopifyConnection({
              id: connection.id,
              isConnected: false
            });
          }
          
          console.log(`App uninstalled from ${shop_domain}`);
        } else {
          console.warn(`Uninstall webhook received for unknown shop: ${shop_domain}`);
        }
        
        // Always return 200 to acknowledge receipt
        res.status(200).send('OK');
      } catch (dbError: any) {
        console.error('Database error processing uninstall webhook:', dbError);
        // Still return 200 to acknowledge receipt and avoid Shopify retrying
        res.status(200).send('OK');
      }
    } catch (error: any) {
      console.error('Error processing app uninstalled webhook:', error);
      // Still return 200 to acknowledge receipt and avoid Shopify retrying
      res.status(200).send('OK');
    }
  });
  
  // --- BILLING ROUTES ---
  
  // Subscribe to a plan
  apiRouter.post("/billing/subscribe", async (req: Request, res: Response) => {
    try {
      const { storeId, plan } = req.body;
      
      if (!storeId || !plan) {
        return res.status(400).json({ error: "Store ID and plan are required" });
      }
      
      // Validate plan type
      if (!Object.values(PlanType).includes(plan as PlanType)) {
        return res.status(400).json({ error: "Invalid plan type" });
      }
      
      // Get the store
      const store = await storage.getShopifyStore(parseInt(storeId));
      
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      // Create subscription
      const result = await createSubscription(store, plan as PlanType);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get billing status for a store
  apiRouter.get("/billing/status/:storeId", async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.storeId);
      
      if (isNaN(storeId)) {
        return res.status(400).json({ error: "Invalid store ID" });
      }
      
      // Get the store
      const store = await storage.getShopifyStore(storeId);
      
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      // Get subscription status
      const status = await getSubscriptionStatus(store);
      
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Cancel subscription
  apiRouter.post("/billing/cancel", async (req: Request, res: Response) => {
    try {
      const { storeId, subscriptionId } = req.body;
      
      if (!storeId || !subscriptionId) {
        return res.status(400).json({ error: "Store ID and subscription ID are required" });
      }
      
      // Get the store
      const store = await storage.getShopifyStore(parseInt(storeId));
      
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      // Cancel subscription
      const result = await cancelSubscription(store, subscriptionId);
      
      res.json({ success: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add image proxy endpoint to handle Pexels images
  apiRouter.get("/proxy/image/:imageId", async (req: Request, res: Response) => {
    try {
      const imageId = req.params.imageId;
      
      if (!imageId) {
        return res.status(400).json({ error: "Image ID is required" });
      }
      
      // Get the image from Pexels
      const image = await pexelsService.getImageById(imageId);
      
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      // Get the best quality image (but avoid original which can be too large)
      const imageUrl = image.src?.large || image.src?.medium || image.src?.small || image.src?.original;
      
      if (!imageUrl) {
        return res.status(404).json({ error: "No valid image URL found" });
      }
      
      console.log(`Image proxy: Redirecting to Pexels image URL: ${imageUrl}`);
      
      // Option 1: Redirect to the image URL (simplest approach but still uses external URLs)
      // return res.redirect(imageUrl);
      
      // Option 2: Fetch the image and pipe it through our server (more robust but uses more bandwidth)
      try {
        // Fetch the image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
        // Set appropriate Content-Type header based on the image type
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        
        // Set cache headers to improve performance
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Send the image data
        return res.send(response.data);
      } catch (fetchError) {
        console.error('Error fetching image:', fetchError);
        return res.status(500).json({ error: "Failed to fetch image" });
      }
    } catch (error: any) {
      console.error('Image proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mount OAuth routes without /api prefix
  app.use(oauthRouter);
  
  // Custom scheduler check endpoint for publishing scheduled content
  apiRouter.get("/scheduler/check", async (req: Request, res: Response) => {
    try {
      console.log("Running custom scheduler check");
      
      // Import custom scheduler service
      const { checkScheduledPosts } = await import("./services/custom-scheduler");
      
      // Run the scheduler check
      await checkScheduledPosts();
      
      res.json({
        status: "success",
        message: "Scheduler check completed",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Scheduler check failed:", error);
      res.status(500).json({
        status: "error",
        message: "Scheduler check failed",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  // Endpoint to manually publish a scheduled post
  apiRouter.post("/posts/:id/publish", async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id, 10);
      const force = req.body?.force === true;
      
      console.log(`Manual publish request for post ${postId}, force: ${force}`);
      
      // Get the post data
      const post = await storage.getBlogPost(postId);
      if (!post) {
        return res.status(404).json({
          status: "error",
          message: `Post with ID ${postId} not found`
        });
      }
      
      // Verify it has the required Shopify IDs
      if (!post.shopifyPostId || !post.shopifyBlogId) {
        return res.status(400).json({
          status: "error",
          message: "Post is missing Shopify IDs and cannot be published"
        });
      }
      
      // Get the store info
      const stores = await storage.getShopifyStores();
      let store = post.storeId ? stores.find(s => s.id === post.storeId) : undefined;
      
      // Try to find by blog ID if store ID not available
      if (!store) {
        store = stores.find(s => s.defaultBlogId === post.shopifyBlogId);
      }
      
      if (!store) {
        return res.status(400).json({
          status: "error",
          message: "Could not find associated store for this post"
        });
      }
      
      console.log(`Publishing post ${postId} to store ${store.shopName}`);
      
      // Import the publishing function from custom-scheduler
      const { publishScheduledArticle } = await import("./services/custom-scheduler");
      
      // Publish the post
      const publishedArticle = await publishScheduledArticle(
        store,
        post.shopifyBlogId,
        post.shopifyPostId,
        post
      );
      
      // Update the post status in the database
      await storage.updateBlogPost(postId, {
        status: "published",
        publishedDate: new Date()
      });
      
      return res.json({
        status: "success",
        message: "Post published successfully",
        post: {
          id: postId,
          title: post.title,
          shopifyPostId: post.shopifyPostId,
          publishedArticle
        }
      });
      
    } catch (error) {
      console.error("Error publishing post:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to publish post",
        error: String(error)
      });
    }
  });
  
  // Endpoint to reschedule content (both posts and pages)
  apiRouter.post("/posts/:id/reschedule", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { scheduledDate } = req.body;
      
      if (!scheduledDate) {
        return res.status(400).json({ 
          status: "error", 
          message: "Missing scheduled date" 
        });
      }
      
      // Convert the string date to a Date object
      const newScheduledDate = new Date(scheduledDate);
      
      if (isNaN(newScheduledDate.getTime())) {
        return res.status(400).json({ 
          status: "error", 
          message: "Invalid date format" 
        });
      }
      
      // Get the post to verify it exists and to get the store ID
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ 
          status: "error", 
          message: "Post not found" 
        });
      }
      
      // Get the store
      const store = await storage.getShopifyStore(post.storeId);
      
      if (!store) {
        return res.status(404).json({ 
          status: "error", 
          message: "Store not found" 
        });
      }
      
      // Use timezone-aware functions
      const { formatDate, formatTime } = await import("./services/custom-scheduler");
      
      // Format the dates for database storage
      const formattedPublishDate = formatDate(newScheduledDate);
      const formattedPublishTime = formatTime(newScheduledDate);
      
      // Update our database with the new schedule
      const updatedPost = await storage.updateBlogPost(id, {
        scheduledDate: newScheduledDate,
        scheduledPublishDate: formattedPublishDate,
        scheduledPublishTime: formattedPublishTime,
        status: 'scheduled' // Ensure it stays in scheduled status
      });
      
      // Log the rescheduling
      await storage.createSyncActivity({
        storeId: store.id,
        activity: `Rescheduled ${post.contentType === 'page' ? 'page' : 'blog post'} "${post.title}"`,
        status: 'success',
        details: `Rescheduled to ${formattedPublishDate} at ${formattedPublishTime}`
      });
      
      console.log(`Successfully rescheduled ${post.contentType || 'content'} ${id} to ${formattedPublishDate} at ${formattedPublishTime}`);
      
      return res.json({ 
        status: "success", 
        message: `Content successfully rescheduled to ${formattedPublishDate} at ${formattedPublishTime}`,
        post: updatedPost
      });
    } catch (error) {
      console.error(`Error rescheduling content:`, error);
      return res.status(500).json({ 
        status: "error", 
        message: error instanceof Error ? error.message : "Failed to reschedule content" 
      });
    }
  });

  // Register OAuth routes (not prefixed with /api) - these handle multi-store authentication
  app.use('/oauth', oauthRouter);
  
  // Apply authentication middleware to all API routes for multi-store support
  app.use('/api', shopifyAuthOptional);
  
  // Register feature-specific routers with authentication
  app.use('/api/content', contentRouter);
  app.use('/api/claude', claudeRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/media', mediaRouter);

  // Mount API routes with /api prefix and store context
  app.use('/api', apiRouter);
}