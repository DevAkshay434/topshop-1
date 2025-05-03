import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
  getProducts, 
  getCollections, 
  getAllCollections, 
  getBlogs,
  createArticle,
  createPage,
  shopifyService
} from "../services/shopify";
import { dataForSEOService, KeywordData } from "../services/dataforseo";
import { pexelsService, type PexelsImage } from "../services/pexels";
import { generateBlogContentWithClaude } from "../services/claude";

const adminRouter = Router();

// Get supported regions
adminRouter.get("/regions", async (_req: Request, res: Response) => {
  const regions = [
    { id: "us", name: "United States" },
    { id: "gb", name: "United Kingdom" },
    { id: "ca", name: "Canada" },
    { id: "au", name: "Australia" },
    { id: "nz", name: "New Zealand" },
    { id: "in", name: "India" },
    { id: "eu", name: "European Union" }
  ];
  
  res.json({ regions });
});

// Get products from Shopify
adminRouter.get("/products", async (req: Request, res: Response) => {
  try {
    // Get the Shopify connection
    const connection = await storage.getShopifyConnection();
    if (!connection || !connection.isConnected) {
      return res.status(400).json({
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
    
    // Get limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    // Get products
    const products = await getProducts(store, limit);
    
    res.json({
      success: true,
      products
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch products"
    });
  }
});

// Get collections from Shopify
adminRouter.get("/collections", async (req: Request, res: Response) => {
  try {
    // Get the Shopify connection
    const connection = await storage.getShopifyConnection();
    if (!connection || !connection.isConnected) {
      return res.status(400).json({
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
    
    // Get limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    // Get all collections (both smart and custom)
    const collections = await getAllCollections(store, limit);
    
    res.json({
      success: true,
      collections
    });
  } catch (error: any) {
    console.error("Error fetching collections:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch collections"
    });
  }
});

// Get blogs from Shopify
adminRouter.get("/blogs", async (_req: Request, res: Response) => {
  try {
    // Get the Shopify connection
    const connection = await storage.getShopifyConnection();
    if (!connection || !connection.isConnected) {
      return res.status(400).json({
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
    
    // Get blogs
    const blogs = await getBlogs(store);
    
    res.json({
      success: true,
      blogs
    });
  } catch (error: any) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch blogs"
    });
  }
});

// Generate keyword suggestions for a product
adminRouter.post("/keywords-for-product", async (req: Request, res: Response) => {
  try {
    const { productId, productTitle, region } = req.body;
    
    if (!productTitle) {
      return res.status(400).json({
        success: false,
        error: "Product title is required for keyword generation"
      });
    }
    
    // Execute keyword search
    const keywords = await dataForSEOService.getKeywordSuggestions(
      productTitle,
      region || 'us'
    );
    
    res.json({
      success: true,
      productId,
      productTitle,
      keywords
    });
  } catch (error: any) {
    console.error("Error generating keywords:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate keywords"
    });
  }
});

// Save selected keywords
adminRouter.post("/save-selected-keywords", async (req: Request, res: Response) => {
  try {
    const { productId, keywords } = req.body;
    
    if (!productId || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({
        success: false,
        error: "Product ID and keywords array are required"
      });
    }
    
    // TODO: Save to database when needed
    
    res.json({
      success: true,
      productId,
      keywordCount: keywords.length
    });
  } catch (error: any) {
    console.error("Error saving keywords:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to save keywords"
    });
  }
});

// Generate images from Pexels
adminRouter.post("/generate-images", async (req: Request, res: Response) => {
  try {
    const { query, count } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required for image generation"
      });
    }
    
    const imageCount = count || 10;
    
    // Search for images
    console.log(`Searching Pexels for: "${query}"`);
    const { images, fallbackUsed } = await pexelsService.safeSearchImages(query, imageCount);
    
    res.json({
      success: true,
      query,
      images,
      fallbackUsed
    });
  } catch (error: any) {
    console.error("Error generating images:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate images"
    });
  }
});

// Enhanced content generation endpoint with all new parameters
adminRouter.post("/generate-content", async (req: Request, res: Response) => {
  console.log("Content generation request received with body:", JSON.stringify(req.body));
  
  try {
    // Validate request body with all required fields
    const requestSchema = z.object({
      title: z.string().min(3),
      region: z.string().optional(),
      productIds: z.array(z.string()).optional(),
      collectionIds: z.array(z.string()).optional(),
      articleType: z.enum(["blog", "page"]),
      blogId: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      writingPerspective: z.enum(["first_person_plural", "first_person_singular", "second_person", "third_person", "professional"]).default("first_person_plural"),
      enableTables: z.boolean().default(true),
      enableLists: z.boolean().default(true),
      enableH3s: z.boolean().default(true),
      introType: z.enum(["none", "standard", "search_intent"]).default("standard"),
      faqType: z.enum(["none", "short", "long"]).default("short"),
      enableCitations: z.boolean().default(true),
      mainImageIds: z.array(z.string()).optional(),
      internalImageIds: z.array(z.string()).optional(),
      selectedImageIds: z.array(z.string()).optional(), // Added for user-selected Pexels images
      toneOfVoice: z.enum(["neutral", "professional", "empathetic", "casual", "excited", "formal", "friendly", "humorous"]).default("friendly"),
      postStatus: z.enum(["publish", "draft"]).default("draft"),
      generateImages: z.boolean().default(true),
      // Additional fields from client
      selectedKeywordData: z.array(z.any()).optional()
    });
    
    // Parse the request data to verify it matches the schema
    try {
      requestSchema.parse(req.body);
    } catch (parseError) {
      console.error("Request validation failed:", parseError);
      return res.status(400).json({
        success: false,
        error: "Invalid request data",
        details: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }
    
    // Get the Shopify connection to check if it exists
    const connection = await storage.getShopifyConnection();
    if (!connection || !connection.isConnected) {
      return res.status(400).json({
        success: false,
        error: "No active Shopify connection found"
      });
    }
    
    // Create a content ID for tracking
    const contentId = Math.floor(Math.random() * 1000) + 1;
    
    // For debugging, respond with a simplified result to verify API connectivity
    return res.json({
      success: true,
      contentId,
      title: req.body.title || "Test Title",
      content: "<h2>Test Content</h2><p>This is test content to verify that the API is working. We'll implement the real content generation next.</p>",
      message: "Content generation API endpoint successful. Real implementation coming soon."
    });
  } catch (error) {
    console.error("Unexpected error in generate-content endpoint:", error);
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Test connections to external services
adminRouter.get("/test-connections", async (_req: Request, res: Response) => {
  const results = {
    shopify: false,
    claude: false,
    dataForSEO: false,
    pexels: false
  };
  
  // Test Shopify connection
  try {
    const connection = await storage.getShopifyConnection();
    if (connection && connection.isConnected) {
      const store = {
        id: connection.id,
        shopName: connection.storeName,
        accessToken: connection.accessToken,
        scope: '',
        defaultBlogId: connection.defaultBlogId,
        isConnected: connection.isConnected,
        lastSynced: connection.lastSynced,
        installedAt: new Date(),
        uninstalledAt: null,
        planName: null,
        chargeId: null,
        trialEndsAt: null
      };
      
      results.shopify = await shopifyService.testConnection(store);
    }
  } catch (error) {
    console.error("Shopify connection test failed:", error);
  }
  
  // Test Claude connection
  try {
    const { testClaudeConnection } = await import("../services/claude");
    const claudeTest = await testClaudeConnection();
    results.claude = claudeTest.success;
  } catch (error) {
    console.error("Claude connection test failed:", error);
  }
  
  // Test DataForSEO connection
  try {
    const dataForSEOTest = await dataForSEOService.testConnection();
    results.dataForSEO = dataForSEOTest.success;
  } catch (error) {
    console.error("DataForSEO connection test failed:", error);
  }
  
  // Test Pexels connection
  try {
    const pexelsTest = await pexelsService.testConnection();
    results.pexels = pexelsTest.success;
  } catch (error) {
    console.error("Pexels connection test failed:", error);
  }
  
  res.json({
    success: true,
    connections: results
  });
});

export default adminRouter;
