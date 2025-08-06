import { Express, Request, Response, NextFunction, Router } from 'express';
import { Server } from 'http';
import { z } from 'zod';
import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
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
import buyerPersonasRouter from './routes/buyer-personas';
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

// Helper function to get main theme ID
async function getMainThemeId(store: any): Promise<string> {
  try {
    const themesResponse = await axios.get(
      `https://${store.shopName}/admin/api/2025-07/themes.json`,
      {
        headers: {
          'X-Shopify-Access-Token': store.accessToken,
        }
      }
    );
    
    const mainTheme = themesResponse.data.themes.find((theme: any) => theme.role === 'main');
    return mainTheme ? mainTheme.id : themesResponse.data.themes[0]?.id || '';
  } catch (error) {
    console.error('Error getting theme ID:', error);
    return '';
  }
}

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

    // Final fallback: Prioritize the main store (rajeshshah.myshopify.com)
    const stores = await storage.getAllStores();
    
    // First try to find the main store by name
    const mainStore = stores.find(store => 
      store.shopName === 'rajeshshah.myshopify.com' && store.isConnected
    );
    
    if (mainStore) {
      console.log(`Using main store as fallback: ${mainStore.shopName} (ID: ${mainStore.id})`);
      return mainStore;
    }
    
    // If main store not found, get any connected store
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
        // Upload to Shopify Files API using staged upload approach
        console.log('Starting Shopify Files API upload:', req.file.originalname, req.file.mimetype);
        
        // Generate a unique filename to avoid conflicts
        const timestamp = Date.now();
        const fileExtension = path.extname(req.file.originalname);
        const baseName = path.basename(req.file.originalname, fileExtension);
        const uniqueFilename = `${baseName}-${timestamp}${fileExtension}`;
        
        // Step 1: Create staged upload URL
        const stagedUploadMutation = `
          mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                url
                resourceUrl
                parameters {
                  name
                  value
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const stagedUploadVariables = {
          input: [
            {
              resource: "IMAGE",
              filename: uniqueFilename,
              mimeType: req.file.mimetype,
              httpMethod: "POST"
            }
          ]
        };

        console.log('Step 1: Getting staged upload URL from Shopify...');
        const stagedUploadResponse = await axios.post(
          `https://${store.shopName}/admin/api/2025-07/graphql.json`,
          {
            query: stagedUploadMutation,
            variables: stagedUploadVariables
          },
          {
            headers: {
              'X-Shopify-Access-Token': store.accessToken,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Staged upload response:', JSON.stringify(stagedUploadResponse.data, null, 2));

        const stagedUploadData = stagedUploadResponse.data.data.stagedUploadsCreate;
        if (stagedUploadData.userErrors && stagedUploadData.userErrors.length > 0) {
          throw new Error(`Staged upload error: ${stagedUploadData.userErrors[0].message}`);
        }

        const stagedTarget = stagedUploadData.stagedTargets[0];
        console.log('Step 2: Uploading file to staged URL:', stagedTarget.url);

        // Step 2: Upload file to staged URL
        const formData = new FormData();
        stagedTarget.parameters.forEach(param => {
          formData.append(param.name, param.value);
        });
        formData.append('file', req.file.buffer, {
          filename: uniqueFilename,
          contentType: req.file.mimetype
        });

        const uploadResult = await axios.post(stagedTarget.url, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });
        console.log('File uploaded to staged URL successfully:', uploadResult.status);

        // Step 3: Create file record in Shopify
        const fileCreateMutation = `
          mutation fileCreate($files: [FileCreateInput!]!) {
            fileCreate(files: $files) {
              files {
                id
                fileStatus
                ... on MediaImage {
                  id
                  image {
                    id
                    url
                    altText
                    width
                    height
                  }
                  mimeType
                  originalSource {
                    url
                  }
                  createdAt
                }
                ... on GenericFile {
                  id
                  url
                  mimeType
                  originalFileSize
                  createdAt
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const fileCreateVariables = {
          files: [
            {
              alt: req.file.originalname.replace(/\.[^/.]+$/, ""),
              contentType: "IMAGE",
              originalSource: stagedTarget.resourceUrl
            }
          ]
        };

        console.log('Step 3: Creating file record in Shopify with resourceUrl:', stagedTarget.resourceUrl);

        const shopifyResponse = await axios.post(
          `https://${store.shopName}/admin/api/2025-07/graphql.json`,
          {
            query: fileCreateMutation,
            variables: fileCreateVariables
          },
          {
            headers: {
              'X-Shopify-Access-Token': store.accessToken,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        console.log('Shopify Files API response status:', shopifyResponse.status);
        console.log('Shopify Files API response data:', JSON.stringify(shopifyResponse.data, null, 2));

        const fileData = shopifyResponse.data?.data?.fileCreate;
        if (fileData && fileData.files && fileData.files.length > 0) {
          const uploadedFile = fileData.files[0];
          
          // Check for errors
          if (fileData.userErrors && fileData.userErrors.length > 0) {
            console.error('Shopify Files API errors:', fileData.userErrors);
            throw new Error(`Shopify Files API error: ${fileData.userErrors[0].message}`);
          }
          
          // Extract URL from different file types with priority order
          let fileUrl = '';
          let fileType = '';
          
          // MediaImage type has priority
          if (uploadedFile.image && uploadedFile.image.url) {
            fileUrl = uploadedFile.image.url;
            fileType = 'MediaImage';
          } 
          // GenericFile type
          else if (uploadedFile.url) {
            fileUrl = uploadedFile.url;
            fileType = 'GenericFile';
          } 
          // Original source as fallback
          else if (uploadedFile.originalSource && uploadedFile.originalSource.url) {
            fileUrl = uploadedFile.originalSource.url;
            fileType = 'OriginalSource';
          }
          
          if (fileUrl) {
            console.log(`Successfully uploaded to Shopify Files API (${fileType}):`, fileUrl);
            
            return res.json({ 
              success: true, 
              url: fileUrl,
              filename: req.file.originalname,
              shopifyFileId: uploadedFile.id,
              fileStatus: uploadedFile.fileStatus,
              fileType: fileType,
              source: 'shopify' 
            });
          } 
          // File uploaded but URL not ready yet (still processing) - use staged URL
          else if (uploadedFile.fileStatus === 'UPLOADED' && uploadedFile.id) {
            console.log('File uploaded to Shopify successfully. URLs not ready yet, using staged resource URL.');
            console.log('Shopify File ID:', uploadedFile.id);
            console.log('Staged Resource URL:', stagedTarget.resourceUrl);
            
            // Return the staged resource URL which is accessible
            return res.json({
              success: true,
              url: stagedTarget.resourceUrl,
              filename: req.file.originalname,
              shopifyFileId: uploadedFile.id,
              fileStatus: uploadedFile.fileStatus,
              fileType: 'StagedImage',
              source: 'shopify',
              note: 'Image uploaded to Shopify CDN successfully'
            });
          } else {
            console.error('No URL found and file not properly uploaded:', JSON.stringify(uploadedFile, null, 2));
            throw new Error(`Shopify Files API upload failed: No URL returned and file status is ${uploadedFile.fileStatus}`);
          }
        } else {
          throw new Error(`Shopify Files API upload failed: No files returned`);
        }
      } catch (shopifyError) {
        console.error('Shopify upload error:', shopifyError);
        
        // Check if it's a permission error
        const isPermissionError = shopifyError.message && shopifyError.message.includes('Access denied');
        
        // Create a unique filename for local storage
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}-${req.file.originalname}`;
        const publicPath = path.join(process.cwd(), 'public', 'uploads', uniqueFilename);
        
        // Ensure uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Save file locally as fallback
        fs.writeFileSync(publicPath, req.file.buffer);
        
        const localUrl = `/uploads/${uniqueFilename}`;
        console.log('Shopify upload failed, saved locally:', localUrl);
        
        let note = 'Image uploaded locally - Shopify upload failed';
        if (isPermissionError) {
          note = 'Store needs re-authentication for file upload permissions. Using local storage.';
        }
        
        res.json({ 
          success: true, 
          url: localUrl,
          filename: req.file.originalname,
          source: 'local',
          note: note,
          requiresReauth: isPermissionError
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
  
  // Check if store has all required permissions including file upload
  apiRouter.get("/shopify/check-permissions", async (req: Request, res: Response) => {
    try {
      const { hasSchedulingPermission, getMissingSchedulingPermissions, getFullScopeString } = await import('../shared/permissions');
      
      // Get current store
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(404).json({
          success: false,
          hasPermission: false,
          message: "No store found"
        });
      }
      
      const currentScope = store.scope || '';
      const requiredScopes = getFullScopeString();
      
      const hasPermission = hasSchedulingPermission(currentScope);
      const missingPermissions = getMissingSchedulingPermissions(currentScope);
      
      // Check for file upload permissions
      const hasFileUploadPermission = currentScope.includes('read_files') && currentScope.includes('write_files');
      const missingFilePermissions = [];
      if (!currentScope.includes('read_files')) missingFilePermissions.push('read_files');
      if (!currentScope.includes('write_files')) missingFilePermissions.push('write_files');
      
      const allMissingPermissions = [...missingPermissions, ...missingFilePermissions];
      
      res.json({
        success: true,
        hasPermission: hasPermission && hasFileUploadPermission,
        hasFileUploadPermission,
        missingPermissions: allMissingPermissions,
        currentScope,
        requiredScope: requiredScopes,
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
  
  // Special route to handle reconnection with updated scopes (including file upload permissions)
  apiRouter.get("/shopify/reconnect", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.SHOPIFY_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          success: false,
          message: "Missing Shopify API credentials"
        });
      }
      
      // Get current store
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(400).json({ 
          success: false, 
          message: "No connected store found" 
        });
      }
      
      // Generate a nonce for CSRF protection
      const nonce = crypto.randomBytes(16).toString('hex');
      
      // Store nonce data
      const shop = store.shopName;
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
      
      // Use the full scope string including file upload permissions
      const fullScopes = 'read_products,write_products,read_content,write_content,read_themes,write_publications,read_files,write_files';
      
      // Create the auth URL with all required scopes including file upload permissions
      const authUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${apiKey}&` +
        `scope=${encodeURIComponent(fullScopes)}&` +
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
  
  // Get scheduled blog posts with author names populated and timezone info
  apiRouter.get("/posts/scheduled", async (req: Request, res: Response) => {
    try {
      // Get store context for proper multi-store support
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(400).json({ error: "Store context required" });
      }
      
      const allPosts = await storage.getScheduledPostsByStore(store.id);
      // Include all scheduled content - both blog posts and pages
      // Users need to see and manage all their scheduled content in one place
      const posts = allPosts.filter(post => {
        // Only filter: must be scheduled status
        return post.status === 'scheduled';
      });
      
      // Get store timezone information
      let storeTimezone = 'UTC';
      try {
        const shopInfo = await shopifyService.getShopInfo(store);
        storeTimezone = shopInfo.iana_timezone || 'UTC';
      } catch (error) {
        console.error('Error getting store timezone:', error);
      }
      
      // Populate author names and enhance with scheduling info
      const postsWithAuthors = await Promise.all(
        posts.map(async (post) => {
          let enrichedPost = { ...post };
          
          // Populate author name if needed
          if (post.authorId && !post.author) {
            try {
              const authorData = await db.select().from(authors).where(eq(authors.id, post.authorId)).limit(1);
              if (authorData.length > 0) {
                enrichedPost.author = authorData[0].name;
              }
            } catch (error) {
              console.error(`Error fetching author for post ${post.id}:`, error);
            }
          }
          
          // Add timezone-aware scheduling information
          if (post.scheduledDate) {
            const scheduledDate = new Date(post.scheduledDate);
            
            // Calculate isPastDue using store timezone comparison
            let isPastDue = false;
            if (post.scheduledPublishDate && post.scheduledPublishTime) {
              // Get current time in store timezone
              const nowFormatted = new Date().toLocaleString("en-CA", { 
                timeZone: storeTimezone,
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
              
              // Parse current time in store timezone
              const [currentDate, currentTime] = nowFormatted.split(', ');
              const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number);
              const [currentHour, currentMinute] = currentTime.split(':').map(Number);
              
              // Parse scheduled time
              const [schedYear, schedMonth, schedDay] = post.scheduledPublishDate.split('-').map(Number);
              const [schedHour, schedMinute] = post.scheduledPublishTime.split(':').map(Number);
              
              // Compare dates and times within the store timezone
              isPastDue = (
                schedYear < currentYear ||
                (schedYear === currentYear && schedMonth < currentMonth) ||
                (schedYear === currentYear && schedMonth === currentMonth && schedDay < currentDay) ||
                (schedYear === currentYear && schedMonth === currentMonth && schedDay === currentDay && 
                 (schedHour < currentHour || (schedHour === currentHour && schedMinute < currentMinute)))
              );
            } else {
              // Fallback to UTC comparison if no date/time fields
              const now = new Date();
              isPastDue = scheduledDate < now;
            }
            
            enrichedPost.schedulingInfo = {
              scheduledDate: scheduledDate.toISOString(),
              scheduledDateLocal: scheduledDate.toLocaleString('en-US', { 
                timeZone: storeTimezone,
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              }),
              timezone: storeTimezone,
              isPastDue,
              minutesUntilPublish: isPastDue ? 0 : Math.floor((scheduledDate.getTime() - new Date().getTime()) / (1000 * 60))
            };
          }
          
          // Check if the post has been published to Shopify
          let shopifyUrl = null;
          if (post.shopifyPostId) {
            if (post.contentType === 'page') {
              // For pages - fetch handle if not stored locally
              let pageIdentifier = post.shopifyHandle;
              
              if (!pageIdentifier) {
                try {
                  // Fetch page details from Shopify to get the handle
                  const pageResponse = await shopifyService.makeApiRequest(store, 'GET', `pages/${post.shopifyPostId}.json`);
                  if (pageResponse.page && pageResponse.page.handle) {
                    pageIdentifier = pageResponse.page.handle;
                    
                    // Update local database with the handle for future use
                    try {
                      await storage.updateBlogPost(post.id, { shopifyHandle: pageResponse.page.handle });
                    } catch (updateError) {
                      console.warn(`Could not update page handle for post ${post.id}:`, updateError);
                    }
                  } else {
                    pageIdentifier = post.shopifyPostId; // fallback to ID
                  }
                } catch (error) {
                  console.warn(`Could not fetch page handle for page ${post.shopifyPostId}:`, error);
                  pageIdentifier = post.shopifyPostId; // fallback to ID
                }
              }
              
              shopifyUrl = `https://${store.shopName}/pages/${pageIdentifier}`;
            } else {
              // For blog posts - determine the correct blog handle
              let blogHandle = 'news'; // default fallback
              
              // Try to get the blog handle from the store's blog configuration
              try {
                const blogs = await shopifyService.getBlogs(store);
                const targetBlog = blogs.find(blog => blog.id.toString() === post.shopifyBlogId?.toString());
                if (targetBlog && targetBlog.handle) {
                  blogHandle = targetBlog.handle;
                }
              } catch (error) {
                console.error('Error fetching blog handle:', error);
                // Keep default fallback
              }
              
              // For blog posts - fetch handle if not stored locally
              let articleIdentifier = post.shopifyHandle;
              
              if (!articleIdentifier) {
                try {
                  // If we don't have a blog ID, try to find the article in all available blogs
                  if (!post.shopifyBlogId) {
                    console.log(`No blog ID for post ${post.id}, searching all blogs for article ${post.shopifyPostId}`);
                    const blogs = await shopifyService.getBlogs(store);
                    
                    for (const blog of blogs) {
                      try {
                        const articleResponse = await shopifyService.makeApiRequest(store, 'GET', `blogs/${blog.id}/articles/${post.shopifyPostId}.json`);
                        if (articleResponse.article && articleResponse.article.handle) {
                          articleIdentifier = articleResponse.article.handle;
                          blogHandle = blog.handle; // Update blog handle too
                          
                          // Update local database with both handles for future use
                          try {
                            await storage.updateBlogPost(post.id, { 
                              shopifyHandle: articleResponse.article.handle,
                              shopifyBlogId: blog.id.toString()
                            });
                          } catch (updateError) {
                            console.warn(`Could not update article handle for post ${post.id}:`, updateError);
                          }
                          console.log(`✓ Found article ${articleIdentifier} in blog ${blog.handle}`);
                          break;
                        }
                      } catch (blogError) {
                        // Continue searching other blogs
                        continue;
                      }
                    }
                  } else {
                    // We have a blog ID, fetch directly
                    const articleResponse = await shopifyService.makeApiRequest(store, 'GET', `blogs/${post.shopifyBlogId}/articles/${post.shopifyPostId}.json`);
                    if (articleResponse.article && articleResponse.article.handle) {
                      articleIdentifier = articleResponse.article.handle;
                      
                      // Update local database with the handle for future use
                      try {
                        await storage.updateBlogPost(post.id, { shopifyHandle: articleResponse.article.handle });
                      } catch (updateError) {
                        console.warn(`Could not update article handle for post ${post.id}:`, updateError);
                      }
                    }
                  }
                  
                  // Only fallback to ID if we absolutely can't find the handle
                  if (!articleIdentifier) {
                    console.warn(`Could not find handle for article ${post.shopifyPostId}, using ID as fallback`);
                    articleIdentifier = post.shopifyPostId;
                  }
                } catch (error) {
                  console.warn(`Could not fetch article handle for article ${post.shopifyPostId}:`, error);
                  articleIdentifier = post.shopifyPostId; // fallback to ID
                }
              }
              
              shopifyUrl = `https://${store.shopName}/blogs/${blogHandle}/${articleIdentifier}`;
            }
          }
          
          enrichedPost.publishStatus = {
            isScheduled: post.status === 'scheduled',
            isPublished: post.status === 'published',
            hasShopifyId: !!(post.shopifyPostId),
            shopifyUrl
          };
          
          return enrichedPost;
        })
      );
      
      res.json({ 
        posts: postsWithAuthors,
        storeTimezone,
        store: {
          name: store.shopName,
          id: store.id
        }
      });
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get schedule details for a specific post
  apiRouter.get("/posts/:id/schedule", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }
      
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({
        success: true,
        schedule: {
          scheduledDate: post.scheduledDate,
          scheduledPublishDate: post.scheduledPublishDate,
          scheduledPublishTime: post.scheduledPublishTime
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update scheduled publish time for a post
  apiRouter.put("/posts/:id/schedule", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }
      
      const { scheduledPublishDate, scheduledPublishTime } = req.body;
      
      if (!scheduledPublishDate || !scheduledPublishTime) {
        return res.status(400).json({ 
          error: "Missing required fields",
          details: "Both scheduledPublishDate and scheduledPublishTime are required"
        });
      }
      
      // Get store context for timezone calculations
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(400).json({ error: "Store context required" });
      }
      
      // Get store timezone
      let storeTimezone = 'America/New_York'; // Default fallback to store's timezone
      try {
        const shopInfo = await shopifyService.getShopInfo(store);
        storeTimezone = shopInfo.iana_timezone || 'America/New_York';
        console.log(`Using store timezone: ${storeTimezone} for schedule validation`);
      } catch (error) {
        console.error('Error getting store timezone, using America/New_York fallback:', error);
      }
      
      // Create timezone-aware date
      let scheduledDate: Date;
      try {
        const { createDateInTimezone } = await import('@shared/timezone');
        scheduledDate = createDateInTimezone(
          scheduledPublishDate,
          scheduledPublishTime,
          storeTimezone
        );
      } catch (error) {
        console.error('Error creating timezone-aware date:', error);
        // Fallback to UTC parsing
        const [year, month, day] = scheduledPublishDate.split('-').map(Number);
        const [hours, minutes] = scheduledPublishTime.split(':').map(Number);
        scheduledDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
      }
      
      // Validate schedule time within store timezone
      // Get current time formatted in store timezone
      const nowFormatted = new Date().toLocaleString("en-CA", { 
        timeZone: storeTimezone,
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Parse current time in store timezone
      const [currentDate, currentTime] = nowFormatted.split(', ');
      const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      
      // Parse scheduled time
      const [schedYear, schedMonth, schedDay] = scheduledPublishDate.split('-').map(Number);
      const [schedHour, schedMinute] = scheduledPublishTime.split(':').map(Number);
      
      console.log(`Current time in ${storeTimezone}: ${currentYear}-${currentMonth}-${currentDay} ${currentHour}:${currentMinute}`);
      console.log(`Scheduled time: ${schedYear}-${schedMonth}-${schedDay} ${schedHour}:${schedMinute}`);
      
      // Compare dates and times within the store timezone
      const isScheduleInPast = (
        schedYear < currentYear ||
        (schedYear === currentYear && schedMonth < currentMonth) ||
        (schedYear === currentYear && schedMonth === currentMonth && schedDay < currentDay) ||
        (schedYear === currentYear && schedMonth === currentMonth && schedDay === currentDay && 
         (schedHour < currentHour || (schedHour === currentHour && schedMinute <= currentMinute)))
      );
      
      if (isScheduleInPast) {
        return res.status(400).json({ 
          error: "Invalid schedule time",
          details: `Scheduled time must be in the future. Current time in ${storeTimezone}: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`
        });
      }
      
      // Update the post
      const updatedPost = await storage.updateBlogPost(id, {
        scheduledDate,
        scheduledPublishDate,
        scheduledPublishTime,
        status: 'scheduled'
      });
      
      if (!updatedPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ 
        success: true,
        post: updatedPost,
        schedulingInfo: {
          scheduledDate: scheduledDate.toISOString(),
          scheduledDateLocal: scheduledDate.toLocaleString('en-US', { 
            timeZone: storeTimezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          }),
          timezone: storeTimezone
        }
      });
    } catch (error) {
      console.error('Error updating scheduled post:', error);
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
            const isPage = articleType === 'page' || (post.tags && post.tags.includes('page')) || post.contentType === 'page';
            // Add this info to the post for later use
            post.articleType = isPage ? 'page' : 'blog';
            
            // Update contentType in database to reflect correct type
            if (isPage && post.contentType !== 'page') {
              await storage.updateBlogPost(post.id, { contentType: 'page' });
              post.contentType = 'page';
              console.log(`Updated post ${post.id} contentType to 'page'`);
            }
            
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
              
              // For pages, use custom scheduler approach since Shopify Pages API doesn't support scheduling
              if (post.status === 'scheduled' && scheduledPublishDate) {
                console.log('Creating scheduled page using custom scheduler approach (Shopify Pages API does not support native scheduling)');
                
                const { schedulePage } = await import('./services/custom-scheduler');
                
                shopifyArticle = await schedulePage(
                  tempStore,
                  post.title,
                  pageContent,
                  scheduledPublishDate
                );
              } else {
                // For immediate publish or draft
                const shouldPublish = post.status === 'published';
                console.log(`Creating page with immediate publish: ${shouldPublish}`);
                shopifyArticle = await shopifyService.createPage(
                  tempStore,
                  post.title,
                  pageContent,
                  shouldPublish, // true only if immediate publish
                  undefined, // no schedule date for immediate/draft
                  undefined, // featured image
                  post // pass the post object with categories for metadata
                );
              }
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
                  tempStore.defaultBlogId, 
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
                shopifyBlogId: isPage ? null : tempStore.defaultBlogId
              });
            } catch (dbError) {
              console.log('Database update failed, using in-memory post data with Shopify info');
              // Even if database update fails, return post with Shopify information for button display
              updatedPost = {
                ...post,
                shopifyPostId: shopifyArticle.id,
                shopifyBlogId: isPage ? null : tempStore.defaultBlogId,
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
  
  // Update a blog post or page
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
      
      console.log(`PUT /api/posts/${id} - Updating post:`, {
        currentStatus: existingPost.status,
        newStatus: postData.status,
        currentScheduledTime: `${existingPost.scheduledPublishDate} ${existingPost.scheduledPublishTime}`,
        newScheduledTime: postData.scheduledPublishDate || postData.scheduledPublishTime ? `${postData.scheduledPublishDate} ${postData.scheduledPublishTime}` : 'unchanged',
        isPage: existingPost.contentType === 'page' || (existingPost.tags && existingPost.tags.includes('page')),
        hasShopifyId: !!existingPost.shopifyPostId
      });
      
      // Update post in storage
      const post = await storage.updateBlogPost(id, postData);
      
      if (!post) {
        return res.status(500).json({ error: "Failed to update post" });
      }
      
      // Determine if this is a page or blog post
      const isPage = post.contentType === 'page' || (post.tags && post.tags.includes('page'));
      console.log(`Identified content type: ${isPage ? 'page' : 'blog post'}`);
      
      // Use proper multi-store routing instead of legacy connection
      const store = await getStoreFromRequest(req);
      if (!store) {
        console.error("No store context found for update");
        return res.status(400).json({ error: "Store context required for update" });
      }
      
      console.log(`Using store: ${store.shopName} (ID: ${store.id})`);
      
      // Check if we need to update/publish in Shopify
      const needsShopifyUpdate = post.shopifyPostId && store && store.isConnected;
      const hasScheduleTimeChanged = (postData.scheduledPublishDate || postData.scheduledPublishTime) && 
        (postData.scheduledPublishDate !== existingPost.scheduledPublishDate || 
         postData.scheduledPublishTime !== existingPost.scheduledPublishTime);
      
      if (needsShopifyUpdate) {
        try {
          // Initialize the Shopify service with the correct store
          shopifyService.initializeClient(store);
          
          // Handle scheduled time updates
          if (hasScheduleTimeChanged && post.status === 'scheduled') {
            console.log('Schedule time changed - updating scheduled content');
            
            // Create proper scheduled date with timezone handling
            let scheduledPublishDate: Date | undefined = undefined;
            
            if (post.scheduledPublishDate && post.scheduledPublishTime) {
              try {
                // Get shop's timezone from the store info
                const shopInfo = await shopifyService.getShopInfo(store);
                const timezone = shopInfo?.iana_timezone || shopInfo.timezone || 'UTC';
                console.log(`Using timezone: ${timezone} for schedule update`);
                
                // Import the timezone-aware date creation function
                const { createDateInTimezone } = await import('@shared/timezone');
                
                // Create a proper Date object in the store's timezone
                scheduledPublishDate = createDateInTimezone(
                  post.scheduledPublishDate,
                  post.scheduledPublishTime,
                  timezone
                );
                
                console.log(`Updated scheduled publish date: ${scheduledPublishDate.toISOString()}`);
              } catch (error) {
                console.error(`Error creating scheduled date for update:`, error);
              }
            }
            
            // For pages, we need to handle differently than blog posts
            if (isPage) {
              console.log('Updating scheduled page in Shopify');
              
              // For pages, we need to update the existing page
              // Since Shopify pages don't support scheduling, we just update the page content
              // and let our custom scheduler handle the publishing
              const pageUpdateResult = await shopifyService.updatePage(
                store,
                post.shopifyPostId,
                {
                  title: post.title,
                  body_html: post.content || '',
                  published: false // Keep as draft until scheduled time
                }
              );
              
              console.log('Page updated in Shopify for scheduling:', {
                pageId: post.shopifyPostId,
                published: false,
                scheduledFor: scheduledPublishDate?.toISOString()
              });
            } else {
              console.log('Updating scheduled blog post in Shopify');
              
              // For blog posts, update the existing article
              const articleData = {
                title: post.title,
                body_html: post.content || '',
                published: false, // Keep as draft until scheduled time
                author: post.author || ''
              };
              
              await shopifyService.updateArticle(store, store.defaultBlogId, post.shopifyPostId, articleData);
              
              console.log('Blog post updated in Shopify for scheduling:', {
                articleId: post.shopifyPostId,
                published: false,
                scheduledFor: scheduledPublishDate?.toISOString()
              });
            }
            
            // Create sync activity for schedule update
            await storage.createSyncActivity({
              activity: `Updated schedule for "${post.title}" to ${post.scheduledPublishDate} at ${post.scheduledPublishTime}`,
              status: "success",
              details: `${isPage ? 'Page' : 'Blog post'} schedule updated in Shopify`
            });
          }
          // Handle immediate publishing
          else if (postData.status === 'published' && existingPost.status !== 'published') {
            console.log('Publishing content immediately');
            
            if (isPage) {
              console.log('Publishing page immediately');
              
              const pageUpdateResult = await shopifyService.updatePage(
                store,
                post.shopifyPostId,
                {
                  title: post.title,
                  body_html: post.content || '',
                  published: true // Publish immediately
                }
              );
              
              console.log('Page published immediately in Shopify');
            } else {
              console.log('Publishing blog post immediately');
              
              const articleData = {
                title: post.title,
                body_html: post.content || '',
                published: true, // Publish immediately
                author: post.author || ''
              };
              
              await shopifyService.updateArticle(store, store.defaultBlogId, post.shopifyPostId, articleData);
              
              console.log('Blog post published immediately in Shopify');
            }
            
            // Update published date in our database
            await storage.updateBlogPost(id, {
              publishedDate: new Date()
            });
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Published "${post.title}" immediately`,
              status: "success",
              details: `${isPage ? 'Page' : 'Blog post'} published successfully in Shopify`
            });
          }
          // Handle other updates (content, title, etc.)
          else if (post.status === 'published') {
            console.log('Updating published content');
            
            if (isPage) {
              await shopifyService.updatePage(
                store,
                post.shopifyPostId,
                {
                  title: post.title,
                  body_html: post.content || '',
                  published: true
                }
              );
            } else {
              const articleData = {
                title: post.title,
                body_html: post.content || '',
                published: true,
                author: post.author || ''
              };
              
              await shopifyService.updateArticle(store, store.defaultBlogId, post.shopifyPostId, articleData);
            }
            
            // Create sync activity
            await storage.createSyncActivity({
              activity: `Updated "${post.title}" on Shopify`,
              status: "success",
              details: `Successfully updated ${isPage ? 'page' : 'blog post'} on Shopify`
            });
          }
          
        } catch (shopifyError: any) {
          console.error("Error updating in Shopify:", shopifyError);
          
          // Create sync activity for the error
          await storage.createSyncActivity({
            activity: `Failed to update "${post.title}" on Shopify`,
            status: "failed",
            details: shopifyError.message
          });
        }
      } else {
        console.log('No Shopify update needed - either no Shopify ID or store not connected');
      }
      
      res.json({ post });
    } catch (error: any) {
      console.error('Error in PUT /posts/:id:', error);
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
${optimizationContext.contentSnippet ? `Content Preview: ${optimizationContext.contentSnippet}` : ''}

STRICT REQUIREMENTS:
- Meta Title (50-60 characters max):
  * MUST include at least one keyword from the provided keywords list
  * MUST be directly relevant to the article content
  * NO ellipsis (...) anywhere in the title
  * NO month/year references (avoid 2023, 2024, 2025, etc.)
  * Should be compelling and click-worthy
  * Use ${optimizationContext.tone} tone

- Meta Description (150-160 characters max):
  * MUST summarize the actual content value
  * Include relevant keywords naturally
  * NO ellipsis (...) anywhere in the description
  * NO month/year references or dates
  * Should encourage clicks with clear value proposition
  * Target ${optimizationContext.targetAudience}

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
        
        // Fallback: create structured response from text without ellipsis
        const lines = aiResponseText.split('\n').filter((line: string) => line.trim());
        
        // Create fallback meta title with keyword
        let fallbackTitle = title.substring(0, 60);
        if (keywords.length > 0) {
          const primaryKeyword = keywords[0];
          fallbackTitle = `${primaryKeyword}: ${title}`.substring(0, 60);
          // Truncate at word boundary
          const lastSpace = fallbackTitle.lastIndexOf(' ');
          if (lastSpace > 45) fallbackTitle = fallbackTitle.substring(0, lastSpace);
        }
        
        // Create fallback description with keywords
        let fallbackDesc = `Discover ${title.toLowerCase()}. ${keywords.slice(0, 2).join(', ')} and more`;
        if (fallbackDesc.length > 160) {
          const truncated = fallbackDesc.substring(0, 160);
          const lastSpace = truncated.lastIndexOf(' ');
          fallbackDesc = lastSpace > 140 ? truncated.substring(0, lastSpace) : truncated;
        }
        
        optimizedFields = {
          metaTitle: fallbackTitle,
          metaDescription: fallbackDesc
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

      // Clean and validate fields according to user requirements
      // Remove any ellipsis that might have been added by AI
      optimizedFields.metaTitle = optimizedFields.metaTitle.replace(/\.{3,}/g, '').trim();
      optimizedFields.metaDescription = optimizedFields.metaDescription.replace(/\.{3,}/g, '').trim();

      // Ensure proper length limits WITHOUT adding ellipsis
      if (optimizedFields.metaTitle.length > 60) {
        // Truncate at word boundary to avoid cutting words
        const truncated = optimizedFields.metaTitle.substring(0, 60);
        const lastSpace = truncated.lastIndexOf(' ');
        optimizedFields.metaTitle = lastSpace > 45 ? truncated.substring(0, lastSpace) : truncated;
      }
      if (optimizedFields.metaDescription.length > 160) {
        // Truncate at word boundary to avoid cutting words
        const truncated = optimizedFields.metaDescription.substring(0, 160);
        const lastSpace = truncated.lastIndexOf(' ');
        optimizedFields.metaDescription = lastSpace > 140 ? truncated.substring(0, lastSpace) : truncated;
      }

      // Validate keyword inclusion in meta title
      const titleLower = optimizedFields.metaTitle.toLowerCase();
      const hasKeyword = keywords.some(keyword => titleLower.includes(keyword.toLowerCase()));
      
      if (!hasKeyword && keywords.length > 0) {
        console.log('Warning: Generated meta title does not contain any provided keywords');
        // Optionally regenerate or modify to include a keyword
        const primaryKeyword = keywords[0];
        if (optimizedFields.metaTitle.length + primaryKeyword.length <= 58) {
          optimizedFields.metaTitle = `${primaryKeyword}: ${optimizedFields.metaTitle}`;
        }
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
      
      // Provide specific error messages for DataForSEO API issues
      let userMessage = error.message;
      if (error.message.includes('DataForSEO API credentials not configured')) {
        userMessage = 'DataForSEO API credentials are not configured. Please contact support to set up keyword research functionality.';
      } else if (error.message.includes('DataForSEO API error')) {
        userMessage = 'DataForSEO API is currently unavailable. This could be due to API limits or service issues. Please try again later or contact support.';
      } else if (error.message.includes('No keyword data available')) {
        userMessage = 'No keyword data found for your selected products. Try selecting different products or check your DataForSEO API limits.';
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch keywords',
        message: userMessage,
        originalError: error.message
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

  // Get scheduled blog posts with author names populated and timezone info
  apiRouter.get("/posts/scheduled", async (req: Request, res: Response) => {
    try {
      // Get store context for proper multi-store support
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(400).json({ error: "Store context required" });
      }
      
      const allPosts = await storage.getScheduledPostsByStore(store.id);
      // Include all scheduled content - both blog posts and pages
      const posts = allPosts.filter(post => {
        // Only filter: must be scheduled status
        return post.status === 'scheduled';
      });

      // Sort by scheduled time (earliest first)
      posts.sort((a, b) => {
        const dateA = new Date(a.scheduledPublishTime || 0);
        const dateB = new Date(b.scheduledPublishTime || 0);
        return dateA.getTime() - dateB.getTime();
      });

      // Add explicit response headers to ensure JSON response and bypass Vite
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-API-Response', 'true');
      
      console.log(`✅ Returning ${posts.length} scheduled posts for store ${store.id}`);
      res.json({ 
        posts,
        storeTimezone: store.timezone || 'America/New_York',
        store: {
          name: store.shopName,
          id: store.id
        }
      });
    } catch (error: any) {
      console.error('Error fetching scheduled posts:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message });
    }
  });

  // Get single post/page by ID
  apiRouter.get("/posts/:id", async (req: Request, res: Response) => {
    try {
      const store = await getStoreFromRequest(req);
      if (!store) {
        return res.status(400).json({ error: "Store context required" });
      }
      
      const postId = parseInt(req.params.id);
      const post = await storage.getBlogPostById(postId, store.id);
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json(post);
    } catch (error: any) {
      console.error('Error fetching post:', error);
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
  
  return apiRouter;
}
