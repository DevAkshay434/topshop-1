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
adminRouter.post("/title-suggestions", async (req: Request, res: Response) => {
  try {
    console.log("Title suggestions requested with data:", req.body);
    const { keywords, keywordData, productTitle } = req.body;
    
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Keywords are required for title generation"
      });
    }
    
    // Prioritize keywords with higher search volume
    const sortedKeywords = [...keywordData].sort((a, b) => {
      const volumeA = a.searchVolume || 0;
      const volumeB = b.searchVolume || 0;
      return volumeB - volumeA;
    });
    
    const keywordStrings = sortedKeywords.map(k => k.keyword);
    const topKeywords = keywordStrings.slice(0, 5); // Use top 5 keywords by search volume
    
    // Generate titles using Claude or other service
    let titles: string[] = [];
    try {
      // Create a clean product title without repetition for prompting
      const cleanProductTitle = productTitle ? productTitle.replace(/\[.*?\]/g, '').trim() : '';
      
      // Example using Claude service
      const claudeRequest = {
        prompt: `Generate 5 compelling, SEO-optimized blog post titles about ${cleanProductTitle || topKeywords[0]} that naturally incorporate these keywords: ${topKeywords.join(", ")}.
        
        IMPORTANT GUIDELINES:
        - Each title should be unique and engaging
        - Create natural-sounding titles that don't seem keyword-stuffed
        - Avoid repetition of the same phrases or product names
        - Avoid using the same keyword multiple times in a single title
        - Use each keyword only where it fits naturally
        - Focus on creating titles that would get high CTR in search results
        - Keep titles between 50-65 characters for optimal SEO
        
        Format your response as a JSON array of exactly 5 strings, with no additional text.`,
        responseFormat: "json"
      };
      
      const claudeService = require("../services/claude");
      const claudeResponse = await claudeService.generateTitles(claudeRequest);
      
      if (claudeResponse && claudeResponse.titles && Array.isArray(claudeResponse.titles)) {
        titles = claudeResponse.titles;
      }
    } catch (claudeError) {
      console.error("Claude title generation failed:", claudeError);
      
      // Create a clean product title without repetition for fallback
      const cleanProductTitle = productTitle ? productTitle.replace(/\[.*?\]/g, '').trim() : '';
      const productShortName = cleanProductTitle.split(' ').slice(0, 2).join(' ');
      
      // Fallback to better title generation with less repetition
      titles = [
        `Ultimate Guide to ${topKeywords[0]} in ${new Date().getFullYear()}`,
        `Top 10 ${productShortName || topKeywords[0]} Features and Benefits`,
        `How to Choose the Best ${topKeywords[1] || topKeywords[0]} for Your Home`,
        `${topKeywords[0]} vs Competitors: What You Need to Know`,
        `The Complete Buyer's Guide for ${productShortName || topKeywords[0]}`
      ];
    }
    
    // Return titles
    return res.json({
      success: true,
      titles
    });
    
  } catch (error: any) {
    console.error("Title suggestions error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate title suggestions"
    });
  }
});

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

// Generate product-specific image search suggestions using OpenAI
adminRouter.post("/image-suggestions-for-product", async (req: Request, res: Response) => {
  try {
    const { productId, productTitle, productDescription, productType, productTags } = req.body;
    
    if (!productTitle) {
      return res.status(400).json({
        success: false,
        error: "Product title is required for generating image suggestions"
      });
    }
    
    // Import the OpenAI image suggestion service
    const { generateProductImageSuggestions } = await import("../services/openai-image-suggestions");
    
    // Create product details object
    const productDetails = {
      title: productTitle,
      description: productDescription || '',
      type: productType || '',
      tags: productTags || []
    };
    
    console.log(`Generating image suggestions for product: "${productTitle}"`);
    
    // Get suggestions using OpenAI
    const suggestions = await generateProductImageSuggestions(productDetails, 8);
    
    // Return the suggestions
    res.json({
      success: true,
      productId,
      productTitle,
      suggestions
    });
    
  } catch (error: any) {
    console.error("Error generating image suggestions:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate image suggestions"
    });
  }
});

// Title suggestion endpoint already defined above

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
      
      // If user has selected specific images, use ONLY those
      if (requestData.selectedImageIds && requestData.selectedImageIds.length > 0) {
        try {
          console.log(`Using user-selected images with IDs: ${requestData.selectedImageIds.join(', ')}`);
          
          // Directly fetch the selected images by ID
          const selectedImages = await pexelsService.getImagesByIds(requestData.selectedImageIds);
          
          console.log(`Fetched ${selectedImages.length} images out of ${requestData.selectedImageIds.length} requested IDs`);
          
          if (selectedImages.length > 0) {
            // Use the first image as featured image
            featuredImage = selectedImages[0];
            console.log(`Using user-selected featured image: ${featuredImage.url}`);
            
            // Save any additional images for insertion into content
            if (selectedImages.length > 1) {
              additionalImages = selectedImages.slice(1);
              console.log(`Using ${additionalImages.length} additional images for content body`);
            }
          } else {
            console.warn("Could not fetch any of the selected images by ID");
            
            // Fallback to searching if direct fetching fails
            console.log("Attempting fallback search for images");
            const { images } = await pexelsService.safeSearchImages(requestData.title, 50);
            
            // Filter to ONLY use the specifically selected images
            const fallbackImages = images.filter((img: PexelsImage) => 
              requestData.selectedImageIds && 
              requestData.selectedImageIds.includes(String(img.id))
            );
            
            if (fallbackImages.length > 0) {
              featuredImage = fallbackImages[0];
              if (fallbackImages.length > 1) {
                additionalImages = fallbackImages.slice(1);
              }
              console.log(`Found ${fallbackImages.length} images through fallback search`);
            }
          }
        } catch (imageError) {
          console.error('Error retrieving selected images:', imageError);
        }
      } else if (requestData.generateImages) {
        // ONLY if no specific images were selected AND generateImages is true, find some images
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
        
        // Remove photographer credit as per request
        
        // If we have products, link the featured image to the first product
        let featuredImageHtml = '';
        if (productsInfo.length > 0) {
          // Use the first product URL for the featured image
          featuredImageHtml = `<div style="text-align: center;"><a href="https://${store.shopName}/products/${productsInfo[0].handle}" target="_blank"><img src="${imageUrl}" alt="${featuredImage.alt || requestData.title}" class="featured-image" style="max-width: 100%; height: auto;" /></a></div>`;
        } else {
          // No product to link to
          featuredImageHtml = `<div style="text-align: center;"><img src="${imageUrl}" alt="${featuredImage.alt || requestData.title}" class="featured-image" style="max-width: 100%; height: auto;" /></div>`;
        }
        
        finalContent = `${featuredImageHtml}\n${finalContent}`;
      }
      
      // Insert secondary images throughout the content with product links
      if (additionalImages.length > 0 && productsInfo.length > 0) {
        console.log(`Inserting ${additionalImages.length} secondary images into content body`);
        
        // Find potential spots to insert images (after paragraphs or headings)
        const insertPoints = [];
        let match;
        const tagPattern = /<\/(p|h2|h3|h4|div|section)>/g;
        
        // Find all potential insertion points
        while ((match = tagPattern.exec(finalContent)) !== null) {
          // Skip the first 15% of the content for the first image insertion
          if (match.index > finalContent.length * 0.15) {
            insertPoints.push(match.index + match[0].length);
          }
        }
        
        // If we have insertion points and images, start inserting images
        if (insertPoints.length > 0) {
          // Use ALL additional images, not just a limited number
          const insertCount = Math.min(additionalImages.length, insertPoints.length);
          
          if (insertCount > 0) {
            // Create evenly spaced insertion indices to distribute images throughout the content
            const contentSections = insertCount + 1;
            const sectionSize = insertPoints.length / contentSections;
            
            // Distribute images evenly
            let modifiedContent = finalContent;
            let insertionOffset = 0;
            
            for (let i = 0; i < insertCount; i++) {
              // Calculate insertion index - distribute evenly throughout content
              const insertIndex = Math.floor(sectionSize * (i + 1));
              
              if (insertIndex < insertPoints.length) {
                // Get the image and appropriate product to link to
                const imageIndex = i % additionalImages.length;
                // Use the first product for all images if only one product is available
                const productIndex = productsInfo.length > 1 ? (i % productsInfo.length) : 0;
                
                const image = additionalImages[imageIndex];
                const product = productsInfo[productIndex];
                
                // Get the actual position in the content
                const position = insertPoints[insertIndex] + insertionOffset;
                
                // Ensure we have valid image URLs
                const imageUrl = image.src?.medium || image.src?.large || image.url;
                // Make sure we have valid image ALT text
                const imageAlt = image.alt || product.title || requestData.title;
                // Ensure product URL is correctly formatted
                const productUrl = `https://${store.shopName}/products/${product.handle}`;
                
                // Create center-aligned div with link to product
                const imageHtml = `\n<div style="text-align: center; margin: 20px 0;"><a href="${productUrl}" target="_blank"><img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;" /></a>
<p style="margin-top: 5px; font-size: 0.9em;"><a href="${productUrl}">${product.title}</a></p></div>\n`;
                
                // Insert the image HTML at the position
                modifiedContent = modifiedContent.slice(0, position) + imageHtml + modifiedContent.slice(position);
                
                // Adjust offset for subsequent insertions
                insertionOffset += imageHtml.length;
                
                console.log(`Inserted image ${i+1}/${insertCount} at position ${position} with URL: ${imageUrl}`);
              }
            }
            
            finalContent = modifiedContent;
          }
        } else {
          console.warn("Could not find suitable insertion points for additional images");
        }
      } else if (additionalImages.length > 0) {
        console.warn("Have additional images but no products to link to. Images will not be inserted.");
      } else if (productsInfo.length > 0) {
        console.log("No additional images available to insert into content.");
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
