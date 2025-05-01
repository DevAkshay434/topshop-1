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
import { pixabayService } from "../services/pixabay";
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
      defaultBlogId: connection.defaultBlogId,
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
      defaultBlogId: connection.defaultBlogId,
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
    const includeSmartCollections = req.query.includeSmartCollections === 'true';
    const collections = includeSmartCollections ? 
      await getAllCollections(store, limit) : 
      await getCollections(store, limit);
    
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
      defaultBlogId: connection.defaultBlogId,
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

// Get keywords for a product URL using DataForSEO
adminRouter.post("/keywords-for-product", async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      productUrl: z.string().url()
    });
    
    const { productUrl } = schema.parse(req.body);
    
    // Check if DataForSEO API key is set
    if (!dataForSEOService.hasValidCredentials()) {
      return res.status(400).json({
        success: false,
        error: "DataForSEO API key not set",
        needsApiKey: true
      });
    }
    
    // Get keywords
    const keywords = await dataForSEOService.getKeywordsForProduct(productUrl);
    
    res.json({
      success: true,
      keywords
    });
  } catch (error: any) {
    console.error("Error fetching keywords:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch keywords"
    });
  }
});

// Generate images for a topic using Pixaway
adminRouter.post("/generate-images", async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      prompt: z.string().min(1),
      count: z.number().min(1).max(10).optional()
    });
    
    const { prompt, count = 3 } = schema.parse(req.body);
    
    // Generate images (with fallback to placeholders if API key not set)
    const { images, fallbackUsed } = await pixabayService.safeGenerateImages(prompt, count);
    
    res.json({
      success: true,
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
      toneOfVoice: z.enum(["neutral", "professional", "empathetic", "casual", "excited", "formal", "friendly", "humorous"]).default("friendly"),
      postStatus: z.enum(["publish", "draft"]).default("draft"),
      generateImages: z.boolean().default(true)
    });
    
    const requestData = requestSchema.parse(req.body);
    
    // Log the receipt of the request
    console.log(`Enhanced content generation request received: ${requestData.title} (${requestData.articleType})`);
    
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
      defaultBlogId: connection.defaultBlogId || (requestData.blogId || ''),
      isConnected: connection.isConnected,
      lastSynced: connection.lastSynced,
      installedAt: new Date(),
      uninstalledAt: null,
      planName: null,
      chargeId: null,
      trialEndsAt: null
    };
    
    // Create a record of the content generation request
    const contentRequest = await storage.createContentGenRequest({
      topic: requestData.title,
      tone: requestData.toneOfVoice,
      length: "medium", // Default length
      status: "pending",
      generatedContent: null
    });
    
    try {
      // 1. Fetch product and collection details if IDs provided
      let productsInfo: Array<any> = [];
      let collectionsInfo: Array<any> = [];
      
      if (requestData.productIds && requestData.productIds.length > 0) {
        // Note: In a full implementation, we would fetch each product individually
        // For simplicity, we'll use the product search API
        const allProducts = await getProducts(store, 100);
        productsInfo = allProducts.filter(p => requestData.productIds?.includes(p.id));
      }
      
      if (requestData.collectionIds && requestData.collectionIds.length > 0) {
        const allCollections = await getAllCollections(store, 100);
        collectionsInfo = allCollections.filter(c => requestData.collectionIds?.includes(c.id));
      }
      
      // 2. Generate Claude prompt based on all parameters
      let claudeSystemPrompt = `You are an expert SEO blog writer and content strategist. Your goal is to write high-quality, engaging, and SEO-optimized ${requestData.articleType === 'blog' ? 'blog posts' : 'pages'} that sound natural, helpful, and authoritative.`;
      
      // Build a detailed prompt with all the parameters
      let claudeUserPrompt = `
Create a complete ${requestData.articleType === 'blog' ? 'blog post' : 'Shopify page'} based on the following inputs:

Title: "${requestData.title}"
${requestData.region ? `Region: ${requestData.region}` : ''}
${productsInfo.length > 0 ? `Products: ${productsInfo.map(p => p.title).join(', ')}` : ''}
${collectionsInfo.length > 0 ? `Collections: ${collectionsInfo.map(c => c.title).join(', ')}` : ''}
Type: ${requestData.articleType === 'blog' ? 'Blog Post' : 'Shopify Page'}
Keywords: ${requestData.keywords?.join(', ') || 'None provided'}
Writing Perspective: ${requestData.writingPerspective.replace(/_/g, ' ')}
Formatting Options:
- Tables: ${requestData.enableTables ? 'Yes' : 'No'}
- Lists: ${requestData.enableLists ? 'Yes' : 'No'}
- H3 Headings: ${requestData.enableH3s ? 'Yes' : 'No'}
- Intro Type: ${requestData.introType}
- FAQ Type: ${requestData.faqType}
- Citations/Links: ${requestData.enableCitations ? 'Yes' : 'No'}
Tone of Voice: ${requestData.toneOfVoice}

Instructions:
1. Begin with a ${requestData.introType === 'search_intent' ? 'search intent-focused intro' : requestData.introType === 'standard' ? 'standard compelling intro' : 'direct entry into the topic'}.
2. Each H2 section must:
   - Have a compelling heading
   - Include 2-4 natural, helpful paragraphs
   ${requestData.enableH3s ? '   - Include relevant H3 subheadings where appropriate' : ''}
   ${requestData.enableLists ? '   - Use bullet or numbered lists when presenting multiple items or steps' : ''}
   ${requestData.enableTables ? '   - Use HTML tables for comparing items or presenting structured data' : ''}
3. Maintain a ${requestData.toneOfVoice} tone throughout.
4. Use the ${requestData.writingPerspective.replace(/_/g, ' ')} perspective consistently.
${productsInfo.length > 0 ? '5. Naturally mention and link to the provided products where relevant.' : ''}
${collectionsInfo.length > 0 ? `${productsInfo.length > 0 ? '6' : '5'}. Naturally mention and link to the provided collections where relevant.` : ''}
${requestData.enableCitations ? `${productsInfo.length > 0 || collectionsInfo.length > 0 ? '7' : '5'}. Include 2-3 authoritative external citations or references.` : ''}
${requestData.faqType !== 'none' ? `${(productsInfo.length > 0 || collectionsInfo.length > 0 || requestData.enableCitations) ? '8' : '5'}. Include a FAQ section with ${requestData.faqType === 'short' ? '3-5 concise questions and answers' : '5-7 detailed questions and answers'}.` : ''}

IMPORTANT FORMATTING REQUIREMENTS:
1. Format the content using proper HTML (h2, h3, p, ul, li, table, etc.)
2. NO H1 TAGS - the title will be set separately
3. For links to products, use: <a href="{product-url}">{product-name}</a>
4. For links to collections, use: <a href="{collection-url}">{collection-name}</a>
5. For external citations, use proper hyperlinks
6. Don't include repetitive conclusions or generic phrases

Please suggest a meta description at the end of your response.
`;

      // 3. Generate content with Claude
      console.log(`Generating enhanced content with Claude for: "${requestData.title}"`);
      
      const generatedContent = await generateBlogContentWithClaude({
        topic: requestData.title,
        tone: requestData.toneOfVoice,
        length: "medium",
        customPrompt: claudeUserPrompt,
        systemPrompt: claudeSystemPrompt
      });
      
      // 4. Update content generation request
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
      // 5. Generate images if requested
      let featuredImage = null;
      if (requestData.generateImages) {
        try {
          console.log(`Generating images for: "${requestData.title}"`);
          const { images, fallbackUsed } = await pixabayService.safeGenerateImages(requestData.title, 1);
          if (images && images.length > 0) {
            featuredImage = images[0];
            console.log(`Successfully generated featured image: ${featuredImage.url}`);
          }
        } catch (imageError) {
          console.error('Error generating images:', imageError);
          // Continue even if image generation fails
        }
      }
      
      // 6. Create a blog post or page based on article type
      let contentId, contentUrl;
      
      if (requestData.articleType === 'blog') {
        // Must have a blog ID for blog posts
        const blogId = requestData.blogId || store.defaultBlogId;
        if (!blogId) {
          throw new Error('Blog ID is required for blog posts');
        }
        
        // Prepare content with featured image if available
        let finalContent = generatedContent.content || `<h2>${requestData.title}</h2><p>Content being generated...</p>`;
        
        // Add featured image at the beginning if generated
        if (featuredImage) {
          finalContent = `<img src="${featuredImage.url}" alt="${featuredImage.alt || requestData.title}" class="featured-image" />\n\n${finalContent}`;
        }
        
        // Create blog post in DB
        const post = await storage.createBlogPost({
          title: generatedContent.title || requestData.title,
          content: finalContent,
          status: requestData.postStatus === 'publish' ? 'published' : 'draft',
          publishedDate: requestData.postStatus === 'publish' ? new Date() : undefined,
          author: connection.storeName.replace('.myshopify.com', ''),
          tags: generatedContent.tags?.join(',') || '',
          category: "Generated Content",
          shopifyPostId: null,
          shopifyBlogId: blogId
        });
        
        contentId = post.id;
        
        // If set to publish, create in Shopify too
        if (requestData.postStatus === 'publish') {
          try {
            const shopifyArticle = await createArticle(store, blogId, post);
            
            // Update the local post with Shopify IDs
            await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id,
              shopifyBlogId: blogId
            });
            
            contentUrl = `https://${store.shopName}/blogs/${shopifyArticle.blog_id}/${shopifyArticle.handle}`;
          } catch (shopifyError) {
            console.error('Error creating Shopify article:', shopifyError);
            // Continue even if Shopify sync fails, we'll have the local version
          }
        }
      } else {
        // Create page in Shopify
        try {
          const page = await createPage(
            store,
            generatedContent.title || requestData.title,
            generatedContent.content || `<h2>${requestData.title}</h2><p>Content being generated...</p>`,
            requestData.postStatus === 'publish'
          );
          
          contentId = page.id;
          contentUrl = `https://${store.shopName}/pages/${page.handle}`;
        } catch (pageError: any) {
          console.error('Error creating Shopify page:', pageError);
          throw new Error(`Failed to create page: ${pageError?.message || 'Unknown error'}`);
        }
      }
      
      // 6. Return the generated content
      res.json({
        success: true,
        contentId,
        contentUrl,
        content: generatedContent.content,
        title: generatedContent.title,
        tags: generatedContent.tags,
        metaDescription: generatedContent.metaDescription || ''
      });
      
    } catch (error: any) {
      console.error("Error in enhanced content generation:", error);
      
      // Update request as failed
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "failed",
        generatedContent: JSON.stringify({ 
          error: "Content generation failed: " + (error?.message || String(error))
        })
      });
      
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate content"
      });
    }
  } catch (validationError: any) {
    console.error("Validation error in enhanced content generation:", validationError);
    res.status(400).json({
      success: false,
      error: validationError.message || "Invalid request data"
    });
  }
});

// Test connections to external services
adminRouter.get("/test-connections", async (_req: Request, res: Response) => {
  const results = {
    shopify: false,
    claude: false,
    dataForSEO: false,
    pixabay: false
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
  
  // Test Pixabay connection
  try {
    const pixabayTest = await pixabayService.testConnection();
    results.pixabay = pixabayTest.success;
  } catch (error) {
    console.error("Pixabay connection test failed:", error);
  }
  
  res.json({
    success: true,
    connections: results
  });
});

export default adminRouter;