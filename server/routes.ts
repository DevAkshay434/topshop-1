import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { shopifyService } from "./services/shopify";
import { generateBlogContent } from "./services/openai";
import { 
  validateShopDomain, 
  generateNonce, 
  createAuthUrl, 
  validateHmac, 
  getAccessToken, 
  getShopData 
} from "./services/oauth";
import { z } from "zod";
import { insertBlogPostSchema, insertShopifyConnectionSchema, insertSyncActivitySchema, insertContentGenRequestSchema, insertShopifyStoreSchema } from "@shared/schema";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - all prefixed with /api
  const apiRouter = express.Router();
  
  // --- SHOPIFY CONNECTION ROUTES ---
  
  // Get Shopify connection
  apiRouter.get("/shopify/connection", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      res.json({ connection });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Create/update Shopify connection
  apiRouter.post("/shopify/connection", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const connectionData = insertShopifyConnectionSchema.parse(req.body);
      
      // Check if connection already exists
      const existingConnection = await storage.getShopifyConnection();
      
      let connection;
      if (existingConnection) {
        connection = await storage.updateShopifyConnection(connectionData);
      } else {
        connection = await storage.createShopifyConnection(connectionData);
      }
      
      // Initialize Shopify service with new connection
      shopifyService.setConnection(connection);
      
      // Test connection
      const isConnected = await shopifyService.testConnection();
      
      if (!isConnected) {
        // Update connection status
        connection = await storage.updateShopifyConnection({
          ...connection,
          isConnected: false
        });
        
        return res.status(400).json({ 
          error: "Could not connect to Shopify store", 
          connection 
        });
      }
      
      // Create sync activity
      await storage.createSyncActivity({
        activity: "Connected to Shopify store",
        status: "success",
        details: `Connected to ${connection.storeName}`
      });
      
      res.json({ connection });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Disconnect Shopify store
  apiRouter.post("/shopify/disconnect", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      
      if (!connection) {
        return res.status(404).json({ error: "No Shopify connection found" });
      }
      
      // Update connection status
      const updatedConnection = await storage.updateShopifyConnection({
        ...connection,
        isConnected: false
      });
      
      // Create sync activity
      await storage.createSyncActivity({
        activity: "Disconnected from Shopify store",
        status: "success",
        details: `Disconnected from ${connection.storeName}`
      });
      
      res.json({ connection: updatedConnection });
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
      
      shopifyService.setConnection(connection);
      const blogs = await shopifyService.getBlogs();
      
      res.json({ blogs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update default blog
  apiRouter.post("/shopify/default-blog", async (req: Request, res: Response) => {
    try {
      const { blogId } = req.body;
      
      if (!blogId) {
        return res.status(400).json({ error: "Blog ID is required" });
      }
      
      const connection = await storage.getShopifyConnection();
      
      if (!connection) {
        return res.status(404).json({ error: "No Shopify connection found" });
      }
      
      const updatedConnection = await storage.updateShopifyConnection({
        ...connection,
        defaultBlogId: blogId
      });
      
      res.json({ connection: updatedConnection });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Sync with Shopify
  apiRouter.post("/shopify/sync", async (req: Request, res: Response) => {
    try {
      const connection = await storage.getShopifyConnection();
      
      if (!connection || !connection.isConnected) {
        return res.status(400).json({ error: "Not connected to Shopify" });
      }
      
      // Update last synced timestamp
      const updatedConnection = await storage.updateShopifyConnection({
        ...connection,
        lastSynced: new Date()
      });
      
      // Create sync activity
      await storage.createSyncActivity({
        activity: "Sync completed successfully",
        status: "success",
        details: `Synchronized with ${connection.storeName}`
      });
      
      res.json({ connection: updatedConnection });
    } catch (error) {
      // Log failed sync
      await storage.createSyncActivity({
        activity: "Sync failed",
        status: "failed",
        details: error.message
      });
      
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- BLOG POST ROUTES ---
  
  // Get all blog posts
  apiRouter.get("/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get recent posts
  apiRouter.get("/posts/recent", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const posts = await storage.getRecentPosts(limit);
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get scheduled posts
  apiRouter.get("/posts/scheduled", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getScheduledPosts();
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get published posts
  apiRouter.get("/posts/published", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPublishedPosts();
      res.json({ posts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get a single blog post
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
      // Validate request body
      const postData = insertBlogPostSchema.parse(req.body);
      
      // Save post to storage
      const post = await storage.createBlogPost(postData);
      
      // If status is 'published' and we have a Shopify connection, publish to Shopify
      if (post.status === 'published') {
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.isConnected && connection.defaultBlogId) {
          try {
            shopifyService.setConnection(connection);
            const shopifyArticle = await shopifyService.createArticle(connection.defaultBlogId, post);
            
            // Update post with Shopify ID
            const updatedPost = await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id
            });
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Published "${post.title}"`,
              status: "success",
              details: `Successfully published to Shopify`
            });
            
            return res.json({ post: updatedPost });
          } catch (shopifyError) {
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
    } catch (error) {
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
      
      // If post is published and has a Shopify ID, update in Shopify
      if (post.shopifyPostId && (postData.status === 'published' || existingPost.status === 'published')) {
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.isConnected && connection.defaultBlogId) {
          try {
            shopifyService.setConnection(connection);
            await shopifyService.updateArticle(connection.defaultBlogId, post.shopifyPostId, postData);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Updated "${post.title}" on Shopify`,
              status: "success",
              details: `Successfully updated on Shopify`
            });
          } catch (shopifyError) {
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
            shopifyService.setConnection(connection);
            const shopifyArticle = await shopifyService.createArticle(connection.defaultBlogId, post);
            
            // Update post with Shopify ID
            const updatedPost = await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id
            });
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Published "${post.title}"`,
              status: "success",
              details: `Successfully published to Shopify`
            });
            
            return res.json({ post: updatedPost });
          } catch (shopifyError) {
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
    } catch (error) {
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
            shopifyService.setConnection(connection);
            await shopifyService.deleteArticle(connection.defaultBlogId, post.shopifyPostId);
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Deleted "${post.title}" from Shopify`,
              status: "success",
              details: `Successfully deleted from Shopify`
            });
          } catch (shopifyError) {
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
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- CONTENT GENERATION ROUTES ---
  
  // Generate blog content
  apiRouter.post("/generate-content", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { topic, tone, length } = insertContentGenRequestSchema.pick({
        topic: true,
        tone: true,
        length: true
      }).parse(req.body);
      
      // Create content generation request
      const contentRequest = await storage.createContentGenRequest({
        topic,
        tone,
        length,
        status: "pending",
        generatedContent: null
      });
      
      try {
        // Generate content with OpenAI
        const generatedContent = await generateBlogContent({ topic, tone, length });
        
        // Update content generation request
        const updatedRequest = await storage.updateContentGenRequest(contentRequest.id, {
          status: "completed",
          generatedContent: JSON.stringify(generatedContent)
        });
        
        res.json({ 
          success: true, 
          requestId: updatedRequest.id,
          content: generatedContent
        });
      } catch (aiError) {
        // Update content generation request with error
        await storage.updateContentGenRequest(contentRequest.id, {
          status: "failed",
          generatedContent: aiError.message
        });
        
        throw aiError;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });
  
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // --- OAUTH ROUTES ---
  
  // Shopify OAuth routes (not prefixed with /api)
  const oauthRouter = express.Router();
  
  // Store the nonce in memory
  const nonceStore = new Map<string, { shop: string, timestamp: number }>();
  
  // Clean up expired nonces (older than 1 hour)
  setInterval(() => {
    const now = Date.now();
    for (const [nonce, data] of nonceStore.entries()) {
      if (now - data.timestamp > 60 * 60 * 1000) {
        nonceStore.delete(nonce);
      }
    }
  }, 15 * 60 * 1000); // Run every 15 minutes
  
  // Initiate OAuth flow
  oauthRouter.get("/shopify/auth", async (req: Request, res: Response) => {
    try {
      const { shop } = req.query;
      
      if (!shop || typeof shop !== 'string') {
        return res.status(400).send('Missing shop parameter');
      }
      
      if (!validateShopDomain(shop)) {
        return res.status(400).send('Invalid shop domain');
      }
      
      // Generate a nonce for CSRF protection
      const nonce = generateNonce();
      nonceStore.set(nonce, { shop, timestamp: Date.now() });

      // Get Shopify API credentials from environment variables
      const apiKey = process.env.SHOPIFY_API_KEY;
      const host = req.headers.host;
      
      if (!apiKey) {
        return res.status(500).send('Missing Shopify API key');
      }
      
      // Create a redirect URL to the app in production, otherwise use the current host
      const redirectUri = process.env.NODE_ENV === 'production'
        ? `https://${host}/shopify/callback`
        : `http://${host}/shopify/callback`;
      
      // Create the authorization URL
      const authUrl = createAuthUrl(shop, apiKey, redirectUri, nonce);
      
      // Redirect to Shopify for authorization
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      res.status(500).send('An error occurred while initiating OAuth');
    }
  });
  
  // OAuth callback
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
            uninstalledAt: null // Clear uninstalled date if previously uninstalled
          });
          storeId = store.id;
          console.log(`Updated existing store: ${shop}`);
        } else {
          // Create a new store
          store = await storage.createShopifyStore({
            shopName: shop,
            accessToken,
            scope: "read_products,write_products,read_content,write_content", // Update with appropriate scopes
            isConnected: true
          });
          storeId = store.id;
          console.log(`Created new store: ${shop}`);
          
          // Create or get a user for this store (using shop data)
          // For now, we'll use a default system user
          let user = await storage.getUserByUsername('admin');
          
          if (!user) {
            // Create a default admin user if none exists
            user = await storage.createUser({
              username: 'admin',
              password: crypto.randomBytes(16).toString('hex'), // Generate random password
              name: 'Admin',
              email: 'admin@example.com',
              isAdmin: true
            });
            console.log('Created default admin user');
          }
          
          // Create the user-store relationship
          await storage.createUserStore({
            userId: user.id,
            storeId: store.id,
            role: 'owner'
          });
          console.log(`Associated user ${user.id} with store ${store.id}`);
        }
        
        // For backward compatibility, update the legacy connection as well
        const existingConnection = await storage.getShopifyConnection();
        
        if (existingConnection) {
          await storage.updateShopifyConnection({
            ...existingConnection,
            storeName: shop,
            accessToken,
            isConnected: true,
            lastSynced: new Date()
          });
        } else {
          await storage.createShopifyConnection({
            storeName: shop,
            accessToken,
            isConnected: true,
            lastSynced: new Date()
          });
        }
        
        // Create a sync activity
        await storage.createSyncActivity({
          storeId,
          activity: "Connected to Shopify store",
          status: "success",
          details: `Connected to ${shop}`
        });
        
        // Redirect to the app
        if (process.env.NODE_ENV === 'production') {
          res.redirect(`/dashboard?shop=${encodeURIComponent(shop)}`);
        } else {
          res.redirect(`/?shop=${encodeURIComponent(shop)}`);
        }
      } catch (error) {
        console.error('Error storing Shopify connection:', error);
        res.status(500).send('An error occurred while storing the connection');
      }
    } catch (error) {
      console.error('Error processing OAuth callback:', error);
      res.status(500).send('An error occurred during OAuth callback processing');
    }
  });
  
  // App uninstalled webhook
  oauthRouter.post("/shopify/webhooks/app-uninstalled", async (req: Request, res: Response) => {
    try {
      // Verify webhook authenticity
      const hmac = req.headers['x-shopify-hmac-sha256'] as string;
      const apiSecret = process.env.SHOPIFY_API_SECRET;
      
      if (!apiSecret) {
        console.error('Missing Shopify API secret');
        return res.status(401).send('Unauthorized');
      }
      
      // Convert request body to string if it's not already
      const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      
      // Verify the webhook signature
      const generatedHash = crypto
        .createHmac('sha256', apiSecret)
        .update(bodyString)
        .digest('base64');
      
      if (hmac !== generatedHash) {
        console.error('Invalid webhook signature');
        return res.status(401).send('Unauthorized');
      }
      
      // Process the uninstallation
      const { shop_domain } = req.body;
      
      if (!shop_domain) {
        console.error('Missing shop domain in webhook payload');
        return res.status(400).send('Bad Request');
      }
      
      // Find the store in our database and mark it as uninstalled
      const store = await storage.getShopifyStoreByDomain(shop_domain);
      
      if (store) {
        // Mark the store as uninstalled
        await storage.updateShopifyStore(store.id, {
          isConnected: false,
          uninstalledAt: new Date()
        });
        
        // Create a sync activity
        await storage.createSyncActivity({
          storeId: store.id,
          activity: "Disconnected from Shopify store",
          status: "info",
          details: `App uninstalled from ${shop_domain}`
        });
        
        console.log(`Store ${shop_domain} marked as uninstalled`);
      } else {
        // For backward compatibility, check the legacy connection
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.storeName === shop_domain) {
          await storage.updateShopifyConnection({
            ...connection,
            isConnected: false
          });
          
          // Create a sync activity
          await storage.createSyncActivity({
            storeId: null,
            activity: "Disconnected from Shopify store",
            status: "info",
            details: `App uninstalled from ${shop_domain}`
          });
          
          console.log(`Legacy connection for ${shop_domain} marked as disconnected`);
        } else {
          console.warn(`Received uninstall webhook for unknown store: ${shop_domain}`);
        }
      }
      
      // Always return 200 to acknowledge receipt
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing uninstall webhook:', error);
      // Still return 200 to acknowledge receipt
      res.status(200).send('Processed with errors');
    }
  });
  
  // Register OAuth routes
  app.use(oauthRouter);
  
  // Register the API router with /api prefix
  app.use('/api', apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
