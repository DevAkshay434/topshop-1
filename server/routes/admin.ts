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
import OpenAI from "openai";

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

// Generate keyword suggestions for a product or topic
adminRouter.post("/keywords-for-product", async (req: Request, res: Response) => {
  try {
    const { productId, productTitle, productUrl, topic } = req.body;
    
    // Accept either a direct topic, productTitle, or productUrl
    const searchTerm = topic || productTitle || productUrl;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: "A search term (topic, product title, or URL) is required for keyword generation"
      });
    }
    
    // Execute keyword search
    console.log(`Searching for keywords related to: ${searchTerm}`);
    // Use the proper method from dataForSEOService
    const keywords = await dataForSEOService.getKeywordsForProduct(searchTerm);
    
    res.json({
      success: true,
      productId,
      topic: searchTerm,
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

// Generate title suggestions based on selected keywords
adminRouter.post("/title-suggestions", async (req: Request, res: Response) => {
  try {
    const { keywords = [], productTitle = null, count = 5 } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one keyword is required for title generation"
      });
    }
    
    console.log(`Generating ${count} title suggestions for keywords:`, keywords);
    
    try {
      // Use Claude/GPT to generate title options
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Prepare keywords for prompt
      let keywordText;
      if (typeof keywords[0] === 'string') {
        keywordText = keywords.join(', ');
      } else {
        // Handle case where keywords are objects with keyword property
        keywordText = keywords.map((k: any) => k.keyword || k).join(', ');
      }
      
      const prompt = `Generate ${count} SEO-optimized, catchy blog title options for a Shopify store.
      
These titles MUST incorporate at least 1-2 of these keywords naturally: ${keywordText}
${productTitle ? `The related product is: ${productTitle}` : ''}

The titles should:
- Be attention-grabbing and encourage clicks
- Incorporate keywords naturally, not forced
- Be between 40-60 characters long
- Use power words and numbers where appropriate
- Be highly specific, not generic
- Target search intent

Format your response as a JSON array containing only the title strings.`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          { role: "system", content: "You are an expert SEO title writer for e-commerce blogs." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("Empty response from AI service");
      }
      
      // Parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      // Return titles to client
      res.json({
        success: true,
        titles: Array.isArray(parsedResponse.titles) ? parsedResponse.titles : 
                (Array.isArray(parsedResponse) ? parsedResponse : [])
      });
      
    } catch (aiError: any) {
      console.error("Error generating title suggestions:", aiError);
      
      // Fallback to simple title generation if AI fails
      const fallbackTitles = [
        `Top Guide to ${keywords[0]}`,
        `How to Choose the Best ${keywords[0]}`,
        `${keywords[0]}: Everything You Need to Know`,
        `Why ${keywords[0]} Matters for Your Home`,
        `The Complete ${keywords[0]} Buying Guide`
      ].slice(0, count);
      
      res.json({
        success: true,
        titles: fallbackTitles,
        fallback: true
      });
    }
  } catch (error: any) {
    console.error("Title suggestion error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate title suggestions"
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
    console.log("Generate images request body:", req.body);
    const { query, count } = req.body;
    
    if (!query) {
      console.log("Missing query in request body:", req.body);
      return res.status(400).json({
        success: false,
        error: "Search query is required for image generation"
      });
    }
    
    const imageCount = count || 10;
    
    // Search for images
    console.log(`Searching Pexels for: "${query}" (requesting ${imageCount} images)`);
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
    
    // Parse request data for easier access
    const requestData = req.body;
    
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
        // For simplicity, we'll use the product search API
        const allProducts = await getProducts(store, 100);
        productsInfo = allProducts.filter(p => requestData.productIds?.includes(p.id));
      }
      
      if (requestData.collectionIds && requestData.collectionIds.length > 0) {
        const allCollections = await getAllCollections(store, 100);
        collectionsInfo = allCollections.filter(c => requestData.collectionIds?.includes(c.id));
      }
      
      // 2. Generate Claude prompt based on all parameters
      let claudeSystemPrompt = `You are an expert SEO blog writer and content strategist specializing in keyword optimization. Your goal is to write high-quality, engaging, and SEO-optimized ${requestData.articleType === 'blog' ? 'blog posts' : 'pages'} that sound natural, helpful, and authoritative.
      
Your primary objective is to create content that ranks well on search engines by incorporating ALL provided keywords naturally throughout the content. Keywords should appear in strategic locations:
1. In the title (most important keywords)
2. In H2 and H3 headings
3. In the first and last paragraphs
4. Throughout the body content in a natural, reader-friendly way

When given keywords with search volume data, prioritize higher-volume keywords by giving them more prominence and using them more frequently.`;
      
      // Get selected keyword data with volume information if available
      const selectedKeywordData = requestData.selectedKeywordData || [];
      const hasKeywordData = selectedKeywordData && selectedKeywordData.length > 0;
      
      // Sort keywords by search volume if available to prioritize high-volume keywords
      let prioritizedKeywords = [...selectedKeywordData];
      if (hasKeywordData) {
        try {
          prioritizedKeywords.sort((a, b) => {
            const volumeA = a.searchVolume || 0;
            const volumeB = b.searchVolume || 0;
            return volumeB - volumeA; // Sort from highest to lowest volume
          });
        } catch (err) {
          console.log("Error sorting keywords by volume:", err);
        }
      }
      
      // Extract just the keyword text strings for easier use
      const keywordStrings = hasKeywordData 
        ? prioritizedKeywords.map(k => k.keyword) 
        : (requestData.keywords || []);
      
      // Build a more detailed keyword section with search volumes
      let keywordInfo = '';
      if (hasKeywordData) {
        keywordInfo = `
Keywords (by search volume):
${prioritizedKeywords.map(k => {
  return `- ${k.keyword}${k.searchVolume ? ` (${k.searchVolume.toLocaleString()} monthly searches)` : ''}${k.intent ? `, ${k.intent} intent` : ''}`;
}).join('\n')}`;
      } else if (requestData.keywords?.length) {
        keywordInfo = `Keywords: ${requestData.keywords.join(', ')}`;
      } else {
        keywordInfo = 'Keywords: None provided';
      }
      
      // Build a detailed prompt with all the parameters
      let claudeUserPrompt = `
Create a complete ${requestData.articleType === 'blog' ? 'blog post' : 'Shopify page'} based on the following inputs:

Title: "${requestData.title}"
${requestData.region ? `Region: ${requestData.region}` : ''}
${productsInfo.length > 0 ? `Products: ${productsInfo.map(p => p.title).join(', ')}` : ''}
${collectionsInfo.length > 0 ? `Collections: ${collectionsInfo.map(c => c.title).join(', ')}` : ''}
Type: ${requestData.articleType === 'blog' ? 'Blog Post' : 'Shopify Page'}
${keywordInfo}
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
5. VERY IMPORTANT - Use ALL the provided keywords naturally in the content - each keyword should appear at least once, with higher search volume keywords appearing more prominently and in important positions (title, headings, early paragraphs).
${productsInfo.length > 0 ? '6. Naturally mention and link to the provided products where relevant.' : ''}
${collectionsInfo.length > 0 ? `${productsInfo.length > 0 ? '7' : '6'}. Naturally mention and link to the provided collections where relevant.` : ''}
${requestData.enableCitations ? `${productsInfo.length > 0 || collectionsInfo.length > 0 ? '8' : '6'}. Include 2-3 authoritative external citations or references.` : ''}
${requestData.faqType !== 'none' ? `${(productsInfo.length > 0 || collectionsInfo.length > 0 || requestData.enableCitations) ? '9' : '7'}. Include a FAQ section with ${requestData.faqType === 'short' ? '3-5 concise questions and answers' : '5-7 detailed questions and answers'}.` : ''}

IMPORTANT FORMATTING REQUIREMENTS:
1. Format the content using proper HTML (h2, h3, p, ul, li, table, etc.)
2. NO H1 TAGS - the title will be set separately
3. For links to products, use: <a href="{product-url}">{product-name}</a>
4. For links to collections, use: <a href="{collection-url}">{collection-name}</a>
5. For external citations, use proper hyperlinks
6. Don't include repetitive conclusions or generic phrases
7. Include all selected keywords in the content - this is critical for SEO

Please suggest a meta description at the end of your response that includes at least 2 of the top keywords.
`;

      console.log(`Generating content with Claude for: "${requestData.title}"`);
      
      // 3. Generate content with Claude
      const generatedContent = await generateBlogContentWithClaude({
        topic: requestData.title,
        tone: requestData.toneOfVoice,
        length: "medium",
        customPrompt: claudeUserPrompt,
        systemPrompt: claudeSystemPrompt,
        includeProducts: productsInfo.length > 0,
        includeCollections: collectionsInfo.length > 0,
        includeKeywords: requestData.keywords && requestData.keywords.length > 0
      });
      
      // 4. Update content generation request
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
      // 5. Handle images from Pexels if needed
      let featuredImage = null;
      let additionalImages: PexelsImage[] = [];
      
      // If user has selected specific images, use those
      if (requestData.selectedImageIds && requestData.selectedImageIds.length > 0) {
        try {
          console.log(`Using user-selected images with IDs: ${requestData.selectedImageIds.join(', ')}`);
          
          // Search for the image to get its full data
          const { images } = await pexelsService.safeSearchImages(requestData.title, 10);
          
          // Filter all selected images
          const selectedImages = images.filter((img: PexelsImage) => 
            requestData.selectedImageIds && 
            requestData.selectedImageIds.includes(img.id)
          );
          
          if (selectedImages.length > 0) {
            // Use the first image as featured image
            featuredImage = selectedImages[0];
            console.log(`Using user-selected featured image: ${featuredImage.url}`);
            
            // Save any additional images for insertion into content
            if (selectedImages.length > 1) {
              additionalImages = selectedImages.slice(1);
            }
          }
        } catch (imageError) {
          console.error('Error retrieving selected images:', imageError);
        }
      }
      
      // If we still don't have a featured image (no selection or error), generate some
      if (!featuredImage && requestData.generateImages) {
        try {
          console.log(`Generating images for: "${requestData.title}"`);
          const { images } = await pexelsService.safeSearchImages(requestData.title, 3);
          if (images && images.length > 0) {
            featuredImage = images[0];
            
            // Save additional generated images if available
            if (images.length > 1) {
              additionalImages = images.slice(1);
            }
          }
        } catch (imageError) {
          console.error('Error generating images:', imageError);
          // Continue even if image generation fails
        }
      }
      
      // 6. Prepare content for blog post or page
      let finalContent = generatedContent.content || `<h2>${requestData.title}</h2><p>Content being generated...</p>`;
      
      // Add featured image at the beginning if available
      if (featuredImage) {
        // Use Pexels medium or large src image if available, otherwise fallback to url
        const imageUrl = featuredImage.src?.large || featuredImage.src?.medium || featuredImage.url;
        const photographer = featuredImage.photographer 
          ? `<p class="image-credit">Photo by: ${featuredImage.photographer}</p>` 
          : '';
        
        finalContent = `<img src="${imageUrl}" alt="${featuredImage.alt || requestData.title}" class="featured-image" />\n${photographer}\n${finalContent}`;
      }
      
      // 7. Create a blog post or page based on article type
      let contentId, contentUrl;
      
      if (requestData.articleType === 'blog') {
        // Must have a blog ID for blog posts
        const blogId = requestData.blogId || store.defaultBlogId;
        if (!blogId) {
          throw new Error('Blog ID is required for blog posts');
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
          console.log(`Publishing to Shopify blog ID: ${blogId}`);
          try {
            const shopifyArticle = await createArticle(store, blogId, post);
            
            // Update the local post with Shopify IDs
            await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id,
              shopifyBlogId: blogId
            });
            
            contentUrl = `https://${store.shopName}/blogs/${shopifyArticle.blog_id}/${shopifyArticle.handle}`;
          } catch (shopifyError: any) {
            console.error('Error creating Shopify article:', shopifyError);
            throw new Error(`Failed to publish to Shopify: ${shopifyError.message || 'Unknown error'}`);
          }
        }
      } else {
        // Create page in Shopify
        try {
          const page = await createPage(
            store,
            generatedContent.title || requestData.title,
            finalContent,
            requestData.postStatus === 'publish'
          );
          
          contentId = page.id;
          contentUrl = `https://${store.shopName}/pages/${page.handle}`;
        } catch (pageError: any) {
          console.error('Error creating Shopify page:', pageError);
          throw new Error(`Failed to create page: ${pageError?.message || 'Unknown error'}`);
        }
      }
      
      // 8. Return the result
      return res.json({
        success: true,
        contentId,
        contentUrl,
        content: generatedContent.content,
        title: generatedContent.title,
        tags: generatedContent.tags,
        metaDescription: generatedContent.metaDescription || '',
        featuredImage: featuredImage
      });
    } catch (error: any) {
      console.error("Error in content generation process:", error);
      
      // Update request as failed if we created one
      if (contentRequest && contentRequest.id) {
        try {
          await storage.updateContentGenRequest(contentRequest.id, {
            status: "failed",
            generatedContent: JSON.stringify({ 
              error: "Content generation failed: " + (error instanceof Error ? error.message : String(error))
            })
          });
        } catch (updateError) {
          console.error("Failed to update content request status:", updateError);
        }
      }
      
      return res.status(500).json({
        success: false,
        error: "Content generation failed",
        details: error.message || String(error)
      });
    }
  } catch (error: any) {
    console.error("Unexpected error in generate-content endpoint:", error);
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred",
      details: error.message || String(error)
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
