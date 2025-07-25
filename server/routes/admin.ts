import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { shopifyService } from "../services/shopify";
import { dataForSEOService, KeywordData } from "../services/dataforseo";
import { pexelsService, type PexelsImage } from "../services/pexels";
import { pixabayService, type PixabayImage } from "../services/pixabay";
import { generateBlogContentWithClaude } from "../services/claude";
import OpenAI from "openai";
import { ShopifyStore } from "../../shared/schema";
import { MediaService } from "../services/media";

// REMOVED: Fallback keyword generation to ensure only authentic DataForSEO keywords are displayed
// Only authentic DataForSEO keywords with real search volumes are returned

// Store retrieval function that respects X-Store-ID header
async function getStoreFromRequest(req: Request): Promise<any | null> {
  try {
    const storeId = req.headers['x-store-id'];
    console.log(`Admin route: X-Store-ID header = ${storeId}`);
    
    if (storeId && typeof storeId === 'string' && storeId !== 'undefined' && storeId !== 'null') {
      const numericStoreId = parseInt(storeId, 10);
      if (!isNaN(numericStoreId)) {
        console.log(`Admin route: Looking for store ID ${numericStoreId}`);
        const store = await storage.getStoreById(numericStoreId);
        if (store) {
          console.log(`Admin route: Found store ${store.shopName}`);
          return store;
        } else {
          console.log(`Admin route: Store ID ${numericStoreId} not found`);
        }
      }
    }
    
    console.log(`Admin route: Using fallback store`);
    // Get the first available store as fallback
    const stores = await storage.getShopifyStores();
    if (stores && stores.length > 0) {
      const fallbackStore = stores[0];
      console.log(`Admin route: Using fallback store: ${fallbackStore.shopName} (ID: ${fallbackStore.id})`);
      return fallbackStore;
    }
    
    console.log(`Admin route: No stores available`);
    return null;
  } catch (error) {
    console.error('Admin route: Error getting store from request:', error);
    return null;
  }
}

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

// Check scheduled post status in Shopify
adminRouter.get("/check-scheduled-post/:articleId", async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    if (!articleId) {
      return res.status(400).json({
        success: false,
        message: "Article ID is required"
      });
    }
    
    // Get the store
    const stores = await storage.getShopifyStores();
    if (!stores || stores.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Shopify stores found"
      });
    }
    
    // Use the first store
    const store: ShopifyStore = stores[0];
    
    // Get all blogs to find the one containing our article
    const blogs = await shopifyService.getBlogs(store);
    
    // Initialize result variable
    let articleData = null;
    
    // Search for the article in each blog
    for (const blog of blogs) {
      try {
        const articles = await shopifyService.getArticles(store, blog.id);
        console.log(`Checking ${articles.length} articles in blog ${blog.id} for ID ${articleId}`);
        
        // Debug first few articles
        if (articles.length > 0) {
          console.log("First article ID:", articles[0].id, "Type:", typeof articles[0].id);
        }
        
        // Convert to string for comparison since IDs might be coming as numbers
        const foundArticle = articles.find(article => String(article.id) === String(articleId));
        
        if (foundArticle) {
          console.log("Found article:", foundArticle.title);
          articleData = {
            ...foundArticle,
            blogId: blog.id
          };
          break;
        }
      } catch (error) {
        console.error(`Error fetching articles for blog ${blog.id}:`, error);
      }
    }
    
    if (!articleData) {
      return res.status(404).json({
        success: false,
        message: "Article not found in any blog"
      });
    }
    
    // Add a note about the scheduling discrepancy
    return res.json({
      success: true,
      article: articleData,
      schedulingStatus: {
        isScheduled: articleData.published_at && new Date(articleData.published_at) > new Date(),
        publishDate: articleData.published_at,
        currentStatus: articleData.published ? "published" : "draft", // If not published but has future date, it's scheduled
        note: "The Shopify API returns the current date in published_at even for scheduled posts. Check the actual post in Shopify Admin to confirm scheduling."
      },
      verificationUrl: `https://${store.shopName}/admin/blogs/${articleData.blog_id}/articles/${articleData.id}`
    });
  } catch (error) {
    console.error("Error checking scheduled post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check scheduled post status",
      error: String(error)
    });
  }
});

// Get products from Shopify
adminRouter.get("/products", async (req: Request, res: Response) => {
  try {
    // Get store from request context (respects X-Store-ID header)
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: "No active Shopify store found"
      });
    }
    
    // Get limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    // Get products
    const products = await shopifyService.getProducts(store, limit);
    
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
    // Get store from request context (respects X-Store-ID header)
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: "No active Shopify store found"
      });
    }
    
    // Get limit from query params
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    // Get all collections (GraphQL returns all types, avoiding duplication)
    const collections = await shopifyService.getCollections(store, 'custom', limit);
    
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
adminRouter.get("/blogs", async (req: Request, res: Response) => {
  try {
    // Get store from request context (respects X-Store-ID header)
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: "No active Shopify store found"
      });
    }
    
    // Get blogs
    const blogs = await shopifyService.getBlogs(store);
    
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
    const { keywords, keywordData, productTitle, targetAudience, buyerPersona } = req.body;
    
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
      let cleanProductTitle = '';
      
      if (productTitle) {
        // Check if this is a multi-product title and handle appropriately
        if (productTitle.includes(' - ')) {
          // Split by dash and take just the first product to avoid long confusing titles
          cleanProductTitle = productTitle.split(' - ')[0].replace(/\[.*?\]/g, '').trim();
          console.log("Multi-product title detected. Using first product:", cleanProductTitle);
        } else {
          cleanProductTitle = productTitle.replace(/\[.*?\]/g, '').trim();
        }
        
        // If still too long (>40 chars), truncate for better title generation
        if (cleanProductTitle.length > 40) {
          const shortened = cleanProductTitle.substring(0, 40).trim();
          console.log(`Product title too long (${cleanProductTitle.length} chars). Shortened to: ${shortened}`);
          cleanProductTitle = shortened;
        }
      }
      
      // Enhanced Claude prompt for trending, Google-optimized titles with audience awareness
      const audience = targetAudience || buyerPersona;
      const claudeRequest = {
        prompt: `Generate 12 unique, highly SEO-optimized blog post titles about ${cleanProductTitle || topKeywords[0]} that strategically incorporate these keywords: ${topKeywords.join(", ")}.
        
        IMPORTANT CONTEXT: 
        - Primary product: ${cleanProductTitle || topKeywords[0]}
        - Primary keywords: ${topKeywords.slice(0, 3).join(", ")}
        - Secondary keywords: ${topKeywords.slice(3).join(", ") || "N/A"}
        - Current year: ${new Date().getFullYear()}${audience ? `\n        - Target Audience: ${audience}` : ''}
        
        IMPORTANT SEO GUIDELINES:
        - Each title MUST naturally include at least one of the provided keywords in full
        - Always place the most important keyword as close to the beginning of the title as possible
        - Create titles that directly match search intent (informational, commercial, etc.)
        - Use trending headline patterns like "Ultimate Guide", "Complete Breakdown", or "${new Date().getFullYear()} Review"
        - Include the current year (${new Date().getFullYear()}) in at least 2 titles for freshness signals
        - For clickthrough optimization, use powerful words like "essential", "complete", "proven", or "ultimate"
        - Create naturally engaging titles that avoid obvious keyword stuffing
        - Focus on titles with strong CTR potential in search results
        - Follow these specific title formats for maximum SEO value:
          * Include 2 numbered list titles (e.g., "7 Best...", "10 Ways to...")
          * Include 1 "How to" title specifically targeting informational searches
          * Include 1 comparison title (e.g., "X vs Y: Which...")
          * Include 1 question-format title that includes a keyword (e.g., "What is...")
          * Include 1 title with "Ultimate Guide to [keyword]" format
          * Include 1 title with a "Why" format (e.g., "Why [keyword] is...")
          * Include 1 title with "[Current Year] Review/Guide" format
        - Keep titles between 50-65 characters for optimal SEO click-through rates
        - Avoid ALL-CAPS words, excessive punctuation, or clickbait tactics
        
        Format your response as a JSON array of exactly 12 strings, with no additional text.`,
        responseFormat: "json",
        targetAudience: audience,
        keywords: topKeywords,
        keywordData: keywordData
      };
      
      // Log the Claude request for debugging
      console.log("Sending title generation request to Claude with data:", {
        productTitle: cleanProductTitle || topKeywords[0],
        keywords: topKeywords,
        yearContext: new Date().getFullYear(),
        targetAudience: audience
      });
      
      const claudeService = require("../services/claude");
      const claudeResponse = await claudeService.generateTitles(claudeRequest);
      
      if (claudeResponse && claudeResponse.titles && Array.isArray(claudeResponse.titles)) {
        console.log("Claude generated title suggestions:", claudeResponse.titles);
        titles = claudeResponse.titles;
      } else {
        console.error("Claude response missing titles array:", claudeResponse);
      }
    } catch (claudeError) {
      console.error("Claude title generation failed:", claudeError);
      
      // Create a clean product title without repetition for fallback using the same logic
      let cleanProductTitle = '';
      
      if (productTitle) {
        // Check if this is a multi-product title and handle appropriately
        if (productTitle.includes(' - ')) {
          // Split by dash and take just the first product to avoid long confusing titles
          cleanProductTitle = productTitle.split(' - ')[0].replace(/\[.*?\]/g, '').trim();
          console.log("Multi-product title detected in fallback. Using first product:", cleanProductTitle);
        } else {
          cleanProductTitle = productTitle.replace(/\[.*?\]/g, '').trim();
        }
        
        // If still too long (>40 chars), truncate for better title generation
        if (cleanProductTitle.length > 40) {
          const shortened = cleanProductTitle.substring(0, 40).trim();
          console.log(`Product title too long in fallback (${cleanProductTitle.length} chars). Shortened to: ${shortened}`);
          cleanProductTitle = shortened;
        }
      }
      
      // Extract a short product name for more compact titles
      const productShortName = cleanProductTitle.split(' ').slice(0, 2).join(' ');
      
      // Generate dynamic titles based on the product and keywords
      const currentYear = new Date().getFullYear();
      const keyword1 = topKeywords[0] || "product";
      const keyword2 = topKeywords[1] || keyword1;
      const keyword3 = topKeywords[2] || keyword1;
      
      titles = [
        // SEO-optimized titles as fallbacks (12 titles)
        `${keyword1}: The Ultimate Guide for ${currentYear}`,
        `10 Best ${keyword1} Features You Need to Know (${currentYear})`,
        `How to Choose the Perfect ${keyword2} in ${currentYear}`,
        `${keyword1} vs Traditional Systems: Which is Better?`,
        `What is ${keyword1}? Complete ${currentYear} Buyer's Guide`,
        `Why ${keyword1} is Essential for Modern Homes`,
        `7 Reasons ${keyword2} Outperforms the Competition`,
        `${currentYear} ${keyword1} Review: Everything You Need to Know`,
        `Best ${keyword3} Options: Expert Recommendations ${currentYear}`,
        `${keyword1} Benefits: Transform Your Home Today`,
        `Top ${keyword2} Mistakes to Avoid in ${currentYear}`,
        `${keyword1} Installation: Step-by-Step Guide`
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
    const { 
      productId, 
      productTitle, 
      productUrl, 
      topic, 
      selectedProducts, 
      selectedCollections 
    } = req.body;
    
    // Accept either a direct topic, productTitle, or productUrl
    const searchTerm = topic || productTitle || productUrl;
    
    console.log('KEYWORD SEARCH DEBUG - Raw request body:', JSON.stringify(req.body, null, 2));
    console.log('KEYWORD SEARCH DEBUG - Extracted search term:', searchTerm);
    console.log('KEYWORD SEARCH DEBUG - topic:', topic);
    console.log('KEYWORD SEARCH DEBUG - productTitle:', productTitle);
    console.log('KEYWORD SEARCH DEBUG - productUrl:', productUrl);
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: "A search term (topic, product title, or URL) is required for keyword generation"
      });
    }
    
    // ONLY use the exact search term to prevent keyword contamination
    // For topic searches, we only want keywords for that specific topic
    const searchTerms: string[] = [searchTerm];
    
    // REMOVED: Additional product and collection terms to prevent mixed keywords
    // Only search for the exact topic/term specified by the user
    
    console.log(`Searching for keywords related to ${searchTerms.length} topics: ${searchTerms.join(', ')}`);
    
    // Try to get keywords from DataForSEO API - only use authentic data
    let keywords;
    try {
      console.log(`Attempting to fetch keywords for: "${searchTerm}"`);
      keywords = await dataForSEOService.getKeywordsForProduct(searchTerm);
      console.log(`Successfully fetched ${keywords.length} keywords from DataForSEO API`);
    } catch (error: any) {
      console.log(`DataForSEO API error: ${error.message}`);
      
      // Return specific error message for timeout vs other errors
      if (error.message.includes('timeout')) {
        return res.status(408).json({
          success: false,
          error: "DataForSEO API timeout - please try again with a simpler search term",
          message: "The keyword search is taking longer than expected. Please try a simpler search term or try again later."
        });
      } else {
        return res.status(500).json({
          success: false,
          error: "DataForSEO API error",
          message: "Unable to fetch authentic keyword data. Please check your API configuration."
        });
      }
    }
    
    // REMOVED: Additional search terms processing to prevent keyword contamination
    // Only use keywords from the exact search term specified by the user
    
    // Sort results by search volume (authentic DataForSEO keywords only)
    keywords.sort((a, b) => {
      const volumeA = a.searchVolume || 0;
      const volumeB = b.searchVolume || 0;
      return volumeB - volumeA; // Descending order
    });
    
    console.log(`Generated ${keywords.length} authentic keywords for: "${searchTerm}"`);
    
    // Process keywords to ensure they're not just showing the product name
    if (keywords.length > 0) {
      // Clean up helper function
      const cleanKeyword = (keyword: string): string => {
        return keyword
          .replace(/®|™|©/g, '') // Remove trademark symbols
          .replace(/\[.*?\]|\(.*?\)/g, '') // Remove text in brackets/parentheses
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();
      };
      
      // Process each keyword
      keywords = keywords.map(kw => {
        let processedKeyword = cleanKeyword(kw.keyword);
        
        // If the keyword is still just the full product name, try to extract a more meaningful term
        if (searchTerm && processedKeyword.length > 30 && 
            processedKeyword.toLowerCase() === cleanKeyword(searchTerm).toLowerCase()) {
          // Extract meaningful part (e.g., "water filter" from "SoftPro Elite Salt Free Water Conditioner")
          const parts = processedKeyword.split(' ');
          if (parts.length > 3) {
            // Try to find meaningful pairs of words for specific categories
            const categoryKeywords = [
              'water filter', 'water conditioner', 'water treatment', 
              'salt free', 'filtration system', 'water system',
              'jacket', 'smartphone', 'laptop', 'camera', 'headphones'
            ];
            
            for (const catKeyword of categoryKeywords) {
              if (processedKeyword.toLowerCase().includes(catKeyword)) {
                processedKeyword = catKeyword;
                break;
              }
            }
            
            // If still using full product name, use the last 2-3 words which often contain the product category
            if (processedKeyword.length > 30) {
              processedKeyword = parts.slice(-Math.min(3, parts.length)).join(' ');
            }
          }
        }
        
        return {
          ...kw,
          keyword: processedKeyword
        };
      });
    }
    
    // Add helpful message when no authentic keywords are available
    const response: any = {
      success: true,
      productId,
      topic: searchTerm,
      keywords
    };
    
    if (keywords.length === 0) {
      response.message = "No authentic keywords available. DataForSEO API credentials not configured. Please provide valid API credentials to access real keyword data.";
    }
    
    res.json(response);
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

// Create an instance of MediaService
const mediaService = new MediaService(shopifyService);

// Get all product images directly (more reliable)
adminRouter.get("/product-images-all", async (_req: Request, res: Response) => {
  try {
    // Get Shopify connection
    const connection = await storage.getShopifyConnection();
    
    if (!connection || !connection.isConnected) {
      return res.json({
        success: false,
        message: "No active Shopify connection",
        images: []
      });
    }
    
    // Create store object for API calls
    const store = {
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
    
    // Use GraphQL Admin API instead of deprecated REST API
    const { graphqlShopifyService } = await import('../services/graphql-shopify');
    const productImages = await graphqlShopifyService.getProductImages(store, 50);
    
    if (!productImages || !Array.isArray(productImages)) {
      return res.json({
        success: false,
        message: "Failed to fetch products from Shopify",
        images: []
      });
    }
    
    // Return the images directly from GraphQL service (already processed)
    return res.json({
      success: true,
      images: productImages,
      count: productImages.length
    });
  } catch (error: any) {
    console.error("Error fetching product images:", error);
    return res.json({
      success: false,
      message: "Error fetching product images",
      images: []
    });
  }
});

// Skip the old REST API processing code
adminRouter.get("/product-images-all-old", async (_req: Request, res: Response) => {
  // This is the old method for reference but should not be used
  try {
    const store = {
      id: 1,
      shopName: 'example.myshopify.com',
      accessToken: 'token'
    } as any;
    
    const allImages: any[] = [];
    
    // OLD CODE - Process each product and collect images (deprecated)
    [].forEach((product: any) => {
      // Handle product's main image
      if (product.image && product.image.src) {
        allImages.push({
          id: `product-${product.id}-main`,
          url: product.image.src,
          filename: `${product.title} - Main Image`,
          content_type: 'image/jpeg',
          alt: product.title || 'Product image',
          source: 'product_image'
        });
      }
      
      // Handle product's additional images
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((image: any, index: number) => {
          if (image && image.src) {
            // Check if we already added this image (to avoid duplicates)
            const isDuplicate = allImages.some(img => img.url === image.src);
            
            if (!isDuplicate) {
              allImages.push({
                id: `product-${product.id}-image-${index}`,
                url: image.src,
                filename: `${product.title} - Image ${index + 1}`,
                content_type: 'image/jpeg',
                alt: image.alt || `${product.title} - Image ${index + 1}`,
                source: 'product_image'
              });
            }
          }
        });
      }
      
      // Handle variant images
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach((variant: any, index: number) => {
          if (variant.image && variant.image.src) {
            // Check if this variant image is already included
            const isDuplicate = allImages.some(img => img.url === variant.image.src);
            
            if (!isDuplicate) {
              allImages.push({
                id: `variant-${variant.id}`,
                url: variant.image.src,
                filename: `${product.title} - ${variant.title || `Variant ${index + 1}`}`,
                content_type: 'image/jpeg',
                alt: `${product.title} - ${variant.title || `Variant ${index + 1}`}`,
                source: 'variant_image'
              });
            }
          }
        });
      }
    });
    
    console.log(`Directly fetched ${allImages.length} product and variant images`);
    
    return res.json({
      success: true,
      images: allImages
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in product images endpoint:", errorMessage);
    res.status(500).json({
      success: false,
      message: errorMessage || "Failed to fetch product images",
      images: []
    });
  }
});

// Get files from the Shopify media library (not product-specific)
adminRouter.get("/files", async (_req: Request, res: Response) => {
  try {
    // Get Shopify connection
    const connection = await storage.getShopifyConnection();
    
    if (!connection || !connection.isConnected) {
      return res.json({
        success: false,
        message: "No active Shopify connection",
        files: []
      });
    }
    
    // Create store object for API calls
    const store = {
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
    
    // Try to fetch files from Shopify Media Library using the MediaService
    const files = await mediaService.getShopifyMediaFiles(store);
    console.log(`Fetched ${files.length} files from Shopify Media Library`);
    
    return res.json({
      success: true,
      files
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in media files endpoint:", errorMessage);
    res.status(500).json({
      success: false,
      message: errorMessage || "Failed to fetch media files",
      files: []
    });
  }
});

// Get product-specific images for a selected product
adminRouter.get("/product-images/:productId", async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
        files: []
      });
    }
    
    // Get Shopify connection
    const connection = await storage.getShopifyConnection();
    
    if (!connection || !connection.isConnected) {
      return res.json({
        success: false,
        message: "No active Shopify connection",
        files: []
      });
    }
    
    // Create store object for API calls
    const store = {
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
    
    // Fetch product-specific images using the MediaService
    const productImages = await mediaService.getProductImages(store, productId);
    console.log(`Fetched ${productImages.length} images for product ${productId}`);
    
    return res.json({
      success: true,
      files: productImages
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching product images:", errorMessage);
    res.status(500).json({
      success: false,
      message: errorMessage || "Failed to fetch product images",
      files: []
    });
  }
});

// Original endpoint for backward compatibility
// Get content files from Shopify
adminRouter.get("/content-files", async (_req: Request, res: Response) => {
  try {
    // Redirect to the new endpoint
    const connection = await storage.getShopifyConnection();
    
    if (!connection || !connection.isConnected) {
      return res.json({
        success: false,
        message: "No active Shopify connection",
        files: []
      });
    }
    
    // Create store object for API calls
    const store = {
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
    
    // For backward compatibility, get files from media library using MediaService
    const files = await mediaService.getAllContentFiles(store);
    console.log(`Fetched ${files.length} files for backward compatibility`);
    
    return res.json({
      success: true,
      files
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in content-files endpoint:", errorMessage);
    res.status(500).json({
      success: false,
      message: errorMessage || "Failed to fetch content files",
      files: []
    });
  }
});

adminRouter.post("/generate-images", async (req: Request, res: Response) => {
  try {
    console.log("Generate images request body:", req.body);
    const { query, count, source } = req.body;
    
    if (!query) {
      console.log("Missing query in request body:", req.body);
      return res.status(400).json({
        success: false,
        error: "Search query is required for image generation"
      });
    }
    
    const imageCount = count || 10;
    const requestedSource = source || 'all'; // Default to 'all' if not specified
    
    // Prepare response containers
    let images: PexelsImage[] = [];
    let fallbackUsed = false;
    let sourcesUsed: string[] = [];
    
    // Try Pexels first if source is 'all' or 'pexels'
    if (requestedSource === 'all' || requestedSource === 'pexels') {
      try {
        console.log(`Searching Pexels for: "${query}" (requesting ${imageCount} images)`);
        const pexelsResult = await pexelsService.safeSearchImages(query, imageCount);
        
        // Add source property to each image
        images = pexelsResult.images.map(img => ({
          ...img,
          source: 'pexels'
        }));
        
        fallbackUsed = pexelsResult.fallbackUsed;
        sourcesUsed.push('pexels');
      } catch (error) {
        console.error("Pexels search failed:", error);
        fallbackUsed = true;
      }
    }
    
    // If Pexels returned no results or failed and source is 'all' or 'pixabay', try Pixabay
    if ((images.length === 0 || requestedSource === 'pixabay') && 
        (requestedSource === 'all' || requestedSource === 'pixabay')) {
      try {
        console.log(`Searching Pixabay for: "${query}" (requesting ${imageCount} images)`);
        const pixabayResult = await pixabayService.safeGenerateImages(query, imageCount);
        
        // Convert Pixabay format to Pexels format for consistent client handling
        const pixabayImages: PexelsImage[] = pixabayResult.images.map(img => ({
          id: img.id,
          width: img.width,
          height: img.height,
          url: img.url,
          src: {
            original: img.url,
            large: img.url,
            medium: img.url,
            small: img.url,
            thumbnail: img.url
          },
          photographer: 'Pixabay',
          photographer_url: 'https://pixabay.com',
          alt: img.alt || query,
          source: 'pixabay'
        }));
        
        // If no images from Pexels or if explicitly requested Pixabay, use Pixabay images
        if (images.length === 0 || requestedSource === 'pixabay') {
          images = pixabayImages;
        } else {
          // Otherwise, add some Pixabay images to supplement Pexels
          const remainingSlots = imageCount - images.length;
          if (remainingSlots > 0) {
            // Add Pixabay images until we reach the desired count
            images = [...images, ...pixabayImages.slice(0, remainingSlots)];
          }
        }
        
        sourcesUsed.push('pixabay');
        fallbackUsed = fallbackUsed || pixabayResult.fallbackUsed;
      } catch (error) {
        console.error("Pixabay search failed:", error);
        // If Pexels already failed, we're in full fallback mode
        fallbackUsed = true;
      }
    }
    
    // Search for product images if productId is provided
    if (req.body.productId) {
      try {
        const { productId } = req.body;
        const connection = await storage.getShopifyConnection();
        
        if (connection && connection.isConnected) {
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
          
          // Get the specific product to fetch its images
          const products = await shopifyService.getProducts(store, 1);
          
          if (products.length > 0 && products[0].images) {
            const productImages = products[0].images.map((img: any, index: number) => ({
              id: `product-${productId}-img-${index}`,
              width: img.width || 800,
              height: img.height || 800,
              url: img.src,
              src: {
                original: img.src,
                large: img.src,
                medium: img.src,
                small: img.src,
                thumbnail: img.src
              },
              photographer: 'Product Image',
              photographer_url: '',
              alt: img.alt || products[0].title,
              isProductImage: true,
              productId: productId,
              source: 'product'
            }));
            
            // Add product images to the results
            if (productImages.length > 0) {
              // Add product images at the beginning for prominence
              images = [...productImages, ...images];
              sourcesUsed.push('product');
            }
          }
        }
      } catch (error) {
        console.error("Error fetching product images:", error);
        // Continue with other images, don't fail the entire request
      }
    }
    
    res.json({
      success: true,
      query,
      images,
      fallbackUsed,
      sourcesUsed
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
  console.log("🔍 CRITICAL DEBUG: Secondary images in request:", {
    hasSecondaryImages: !!req.body.secondaryImages,
    secondaryImagesLength: req.body.secondaryImages?.length || 0,
    secondaryImagesData: req.body.secondaryImages || []
  });
  console.log("🔍 FULL REQUEST BODY STRUCTURE:", {
    title: req.body.title,
    primaryImage: !!req.body.primaryImage,
    secondaryImages: req.body.secondaryImages,
    hasMediaContent: !!req.body.mediaContent
  });
  
  try {
    // Validate request body with all required fields
    const requestSchema = z.object({
      title: z.string().min(1, "Title is required"),
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
      postStatus: z.enum(["publish", "draft", "scheduled"]).default("draft"),
      // Support for explicit scheduling controls
      publicationType: z.enum(["publish", "draft", "schedule"]).optional(),
      scheduleDate: z.string().optional(),
      scheduleTime: z.string().optional(),
      // Allow null for scheduled dates, as they might not be set in all cases
      scheduledPublishDate: z.string().nullable().optional(),
      scheduledPublishTime: z.string().nullable().optional(),
      generateImages: z.boolean().default(true),
      // New fields for content generation options
      buyerProfile: z.enum(["auto", "beginner", "intermediate", "advanced"]).default("auto"),
      articleLength: z.enum(["short", "medium", "long", "comprehensive"]).default("medium"),
      headingsCount: z.enum(["2", "3", "4", "5", "6"]).default("3"),
      youtubeUrl: z.string().optional(),
      // Category support
      categories: z.array(z.string()).optional(),
      // Additional fields from client
      selectedKeywordData: z.array(z.any()).optional(),
      // Content style fields
      contentStyleToneId: z.string().optional(),
      contentStyleDisplayName: z.string().optional(),
      // Media selection fields from Choose Media step
      primaryImage: z.object({
        id: z.string().optional(),
        url: z.string(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        src: z.object({
          original: z.string(),
          large: z.string(),
          medium: z.string(),
          small: z.string(),
          thumbnail: z.string()
        }).optional()
      }).optional(),
      secondaryImages: z.array(z.object({
        id: z.string().optional(),
        url: z.string(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        source: z.string().optional(),
        src: z.object({
          original: z.string(),
          large: z.string(),
          medium: z.string(),
          small: z.string(),
          thumbnail: z.string()
        }).optional()
      })).optional(),
      youtubeEmbed: z.string().nullable().optional(),
      // Author selection field
      authorId: z.union([z.string(), z.number()]).nullable().optional(),
      // Audience targeting fields
      targetAudience: z.string().optional(),
      buyerPersona: z.string().optional()
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
    
    // Get the store from request context (respects X-Store-ID header)
    const store = await getStoreFromRequest(req);
    if (!store || !store.isConnected) {
      return res.status(400).json({
        success: false,
        error: "No active Shopify store found"
      });
    }
    
    console.log(`Admin route: Content generation using store: ${store.shopName} (ID: ${store.id})`);
    
    // Parse request data for easier access
    const requestData = req.body;
    
    // CRITICAL DEBUGGING: Log incoming request data before processing
    console.log("🔍 ADMIN ROUTE ENTRY POINT - REQUEST RECEIVED");
    console.log("   - Request method:", req.method);
    console.log("   - Request URL:", req.url);
    console.log("   - Content-Type:", req.headers['content-type']);
    console.log("   - Store ID header:", req.headers['x-store-id']);
    console.log("   - Request body keys:", Object.keys(requestData));
    console.log("   - Title:", requestData.title);
    console.log("   - Primary Image:", requestData.primaryImage ? "Present" : "Missing");
    console.log("   - Secondary Images:", requestData.secondaryImages ? `${requestData.secondaryImages.length} images` : "Missing/Empty");
    console.log("   - Products Info:", requestData.productsInfo ? `${requestData.productsInfo.length} products` : "Missing");
    
    if (requestData.secondaryImages) {
      console.log("🔍 DETAILED SECONDARY IMAGES RECEIVED:");
      requestData.secondaryImages.forEach((img, idx) => {
        console.log(`   - Image ${idx + 1}: ${img.id} (${img.url}) [source: ${img.source}]`);
      });
    } else {
      console.log("❌ NO SECONDARY IMAGES IN REQUEST BODY");
      console.log("   - requestData.secondaryImages =", requestData.secondaryImages);
      console.log("   - This confirms secondary images aren't being sent from frontend");
    }
    
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
      
      // ENHANCED FIX: Extract product IDs from multiple sources including secondary images
      let effectiveProductIds = requestData.productIds && requestData.productIds.length > 0 
        ? requestData.productIds 
        : requestData.selectedProducts?.map(p => String(p.id)) || [];
      
      // CRITICAL FIX: Also check if products can be derived from secondary images sources
      if (effectiveProductIds.length === 0 && requestData.secondaryImages && requestData.secondaryImages.length > 0) {
        const productIdsFromImages = new Set<string>();
        requestData.secondaryImages.forEach(img => {
          if (img.source === 'product_image' && img.id) {
            // Extract product ID from image ID (format: product-{productId}-image-{imageId})
            const match = img.id.match(/^product-(\d+)-/);
            if (match) {
              productIdsFromImages.add(match[1]);
            }
          }
        });
        effectiveProductIds = [...effectiveProductIds, ...Array.from(productIdsFromImages)];
        console.log(`🔍 EXTRACTED PRODUCT IDS FROM SECONDARY IMAGES: ${Array.from(productIdsFromImages).join(', ')}`);
      }
        
      if (effectiveProductIds.length > 0) {
        // For simplicity, we'll use the product search API
        const allProducts = await shopifyService.getProducts(store, 100);
        productsInfo = allProducts.filter(p => effectiveProductIds.includes(String(p.id)));
        console.log(`✅ LOADED ${productsInfo.length} PRODUCTS FOR MEDIA INTERLINKING:`, productsInfo.map(p => ({ id: p.id, title: p.title, handle: p.handle })));
      } else {
        console.log(`❌ NO PRODUCT IDS FOUND - Secondary images will not be linked to products`);
        console.log(`   - requestData.productIds:`, requestData.productIds);
        console.log(`   - requestData.selectedProducts:`, requestData.selectedProducts);
        console.log(`   - requestData.secondaryImages.length:`, requestData.secondaryImages?.length || 0);
      }
      
      if (requestData.collectionIds && requestData.collectionIds.length > 0) {
        const customCollections = await shopifyService.getCollections(store, 'custom', 100);
        const smartCollections = await shopifyService.getCollections(store, 'smart', 100);
        const allCollections = [...customCollections, ...smartCollections];
        collectionsInfo = allCollections.filter(c => requestData.collectionIds?.includes(c.id));
      }
      
      // 2. Generate Claude prompt based on all parameters
      const audience = requestData.targetAudience || requestData.buyerPersona;
      let claudeSystemPrompt = `You are an expert SEO blog writer and content strategist specializing in keyword optimization and audience-focused content creation. Your goal is to write high-quality, engaging, and SEO-optimized ${requestData.articleType === 'blog' ? 'blog posts' : 'pages'} that sound natural, helpful, and authoritative while specifically addressing your target audience.
      
Your primary objective is to create content that ranks well on search engines by incorporating ALL provided keywords naturally throughout the content while maintaining strong audience alignment. Keywords should appear in strategic locations:
1. In the title (most important keywords)
2. In H2 and H3 headings
3. In the first and last paragraphs
4. Throughout the body content in a natural, reader-friendly way

When given keywords with search volume data, prioritize higher-volume keywords by giving them more prominence and using them more frequently.

${audience ? `
AUDIENCE TARGETING: Your content must be specifically tailored for: ${audience}
- Write with this audience's knowledge level, interests, and pain points in mind
- Use language, examples, and references that resonate with this specific group
- Address their unique challenges and provide solutions that match their context
- Focus on conversion potential by speaking directly to their needs and desires
- Include actionable advice that this audience can immediately implement
` : ''}

CONTENT STRATEGY:
- Prioritize relevancy and conversion potential over generic information
- Create content that builds trust and authority with the target audience
- Use persuasive language that encourages engagement and action
- Ensure every section provides value to the specific audience you're addressing`;
      
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
Writing Perspective: ${requestData.writingPerspective ? requestData.writingPerspective.replace(/_/g, ' ') : 'first person plural'}
Formatting Options:
- Tables: ${requestData.enableTables ? 'Yes' : 'No'}
- Lists: ${requestData.enableLists ? 'Yes' : 'No'}
- H3 Headings: ${requestData.enableH3s ? 'Yes' : 'No'}
- Intro Type: ${requestData.introType || 'search_intent'}
- FAQ Type: ${requestData.faqType || 'short'}
- Citations/Links: ${requestData.enableCitations ? 'Yes' : 'No'}
Tone of Voice: ${requestData.toneOfVoice || 'friendly'}

Instructions:
1. Begin with a ${requestData.introType ? (requestData.introType === 'search_intent' ? 'search intent-focused intro' : requestData.introType === 'standard' ? 'standard compelling intro' : 'direct entry into the topic') : 'search intent-focused intro'}.
2. Each H2 section must:
   - Have a compelling heading
   - Include 2-4 natural, helpful paragraphs
   ${requestData.enableH3s ? '   - Include relevant H3 subheadings where appropriate' : ''}
   ${requestData.enableLists ? '   - Use bullet or numbered lists when presenting multiple items or steps' : ''}
   ${requestData.enableTables ? '   - Use HTML tables for comparing items or presenting structured data' : ''}
3. Maintain a ${requestData.toneOfVoice} tone throughout.
4. Use the ${requestData.writingPerspective ? requestData.writingPerspective.replace(/_/g, ' ') : 'first person plural'} perspective consistently.
5. VERY IMPORTANT - Use ALL the provided keywords naturally in the content - each keyword should appear at least once, with higher search volume keywords appearing more prominently and in important positions (title, headings, early paragraphs).
${productsInfo.length > 0 ? '6. Naturally mention and link to the provided products where relevant.' : ''}
${collectionsInfo.length > 0 ? `${productsInfo.length > 0 ? '7' : '6'}. Naturally mention and link to the provided collections where relevant.` : ''}
${requestData.enableCitations ? `${productsInfo.length > 0 || collectionsInfo.length > 0 ? '8' : '6'}. Include 2-3 authoritative external citations or references.` : ''}
${requestData.faqType !== 'none' ? `${(productsInfo.length > 0 || collectionsInfo.length > 0 || requestData.enableCitations) ? '9' : '7'}. Include a FAQ section with ${requestData.faqType === 'short' ? '3-5 concise questions and answers' : '5-7 detailed questions and answers'}.` : ''}

IMPORTANT FORMATTING REQUIREMENTS:
1. Format the content using proper HTML (h2, h3, p, ul, li, table, etc.)
2. NO H1 TAGS - the title will be set separately
3. Always add a <br> tag after bolded text in introductions (e.g., <strong>Bolded text</strong><br>Next sentence)
4. Add proper spacing between sections with an extra line break (<br>) after each closing paragraph tag
5. Center-align tables with inline styles (style="margin: 0 auto;width: 100%;text-align: center;")
6. For links to products, use: <a href="{product-url}">{product-name}</a>
7. For links to collections, use: <a href="{collection-url}">{collection-name}</a>
8. For external citations, use proper hyperlinks
9. Don't include repetitive conclusions or generic phrases
10. Include all selected keywords in the content - this is critical for SEO

Please suggest a meta description at the end of your response that includes at least 2 of the top keywords.
`;

      console.log(`Generating content with Claude for: "${requestData.title}"`);
      
      // Map articleLength to actual length values for Claude
      let contentLength = "medium";
      if (requestData.articleLength === "short") {
        contentLength = "short";
      } else if (requestData.articleLength === "long") {
        contentLength = "long";
      } else if (requestData.articleLength === "comprehensive") {
        contentLength = "comprehensive";
      }
      
      // Update the prompt based on new fields
      // Add buyer profile information
      if (requestData.buyerProfile && requestData.buyerProfile !== "auto") {
        claudeUserPrompt += `\nBuyer Profile: ${requestData.buyerProfile}
Target this content specifically for ${requestData.buyerProfile}-level users with appropriate depth and terminology.`;
      }
      
      // Add headings count information
      if (requestData.headingsCount) {
        claudeUserPrompt += `\nStructure: Include exactly ${requestData.headingsCount} main sections with H2 headings.`;
      }
      
      // Add category information if provided
      if (requestData.categories && Array.isArray(requestData.categories) && requestData.categories.length > 0) {
        claudeUserPrompt += `\nCategories: ${requestData.categories.join(', ')}
When writing this content, specifically tailor it for these categories. Ensure the content emphasizes features, benefits, and topics that would be most relevant to readers interested in these categories.`;
      }
      
      // Add YouTube video embed instruction if URL is provided
      if (requestData.youtubeUrl) {
        const videoId = requestData.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
        
        if (videoId) {
          claudeUserPrompt += `\nYouTube Video: Please indicate where to place a YouTube video embed with ID "${videoId}" by adding this placeholder:
[YOUTUBE_EMBED_PLACEHOLDER]
Place this at a logical position in the content, typically after introducing a concept that the video demonstrates.`;
        }
      }
      
      // CRITICAL DEBUGGING: Log secondary images data before sending to Claude
      console.log("🔍 ADMIN ROUTE DEBUGGING - Data being sent to Claude service:");
      console.log("   - Primary Image:", requestData.primaryImage ? "Present" : "Missing");
      console.log("   - Secondary Images:", requestData.secondaryImages ? `${requestData.secondaryImages.length} images` : "Missing");
      
      if (requestData.secondaryImages && requestData.secondaryImages.length > 0) {
        console.log("🔍 SECONDARY IMAGES DETAILS:");
        requestData.secondaryImages.forEach((img, idx) => {
          console.log(`   - Image ${idx + 1}: ${img.id} (${img.url}) [source: ${img.source}]`);
        });
      } else {
        console.log("❌ NO SECONDARY IMAGES DETECTED in requestData");
        console.log("   - This explains why secondary images aren't appearing in generated content");
        console.log("   - requestData.secondaryImages =", requestData.secondaryImages);
      }
      
      console.log("   - Products Info:", productsInfo.length > 0 ? `${productsInfo.length} products` : "No products");
      if (productsInfo.length > 0) {
        console.log("🔍 PRODUCTS FOR INTERLINKING:");
        productsInfo.forEach((product, idx) => {
          console.log(`   - Product ${idx + 1}: ${product.title} (handle: ${product.handle})`);
        });
      }
      
      // 3. Generate content with Claude
      const generatedContent = await generateBlogContentWithClaude({
        topic: requestData.title,
        tone: requestData.toneOfVoice,
        length: contentLength,
        customPrompt: claudeUserPrompt,
        systemPrompt: claudeSystemPrompt,
        includeProducts: productsInfo.length > 0,
        includeCollections: collectionsInfo.length > 0,
        // Add content style information if available
        contentStyleToneId: requestData.contentStyleToneId,
        contentStyleDisplayName: requestData.contentStyleDisplayName,
        includeKeywords: requestData.keywords && requestData.keywords.length > 0,
        // Add selected media from Choose Media step
        primaryImage: requestData.primaryImage,
        secondaryImages: requestData.secondaryImages,
        youtubeEmbed: requestData.youtubeEmbed,
        // Add product information for secondary image linking
        productIds: productsInfo.map(p => String(p.id)),
        productsInfo: productsInfo,
        // Add audience targeting fields
        targetAudience: requestData.targetAudience,
        buyerPersona: requestData.buyerPersona,
        // Add keyword data for alignment
        keywords: requestData.keywords,
        keywordData: selectedKeywordData
      });
      
      console.log("✅ CLAUDE SERVICE COMPLETED - Generated content length:", generatedContent.content?.length || 0);
      console.log("🔍 CLAUDE SERVICE DEBUGGING - Data sent to Claude:");
      console.log("   - productsInfo passed to Claude:", {
        hasProductsInfo: !!productsInfo,
        productsInfoLength: productsInfo?.length || 0,
        productsInfoSample: productsInfo?.slice(0, 2).map(p => ({ id: p.id, handle: p.handle, title: p.title })) || []
      });
      
      // 4. Update content generation request
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
      // 5. Handle media from Choose Media step
      let featuredImage = null;
      let additionalImages: any[] = [];
      
      // Use primary image from Choose Media step
      if (requestData.primaryImage) {
        console.log(`Using selected primary image: ${requestData.primaryImage.url}`);
        featuredImage = requestData.primaryImage;
      }
      
      // Use secondary images from Choose Media step
      if (requestData.secondaryImages && requestData.secondaryImages.length > 0) {
        console.log(`✓ SECONDARY IMAGES RECEIVED: Using ${requestData.secondaryImages.length} selected secondary images`);
        
        // CRITICAL FIX: Filter out primary image from secondary images to prevent duplication
        const primaryImageUrl = featuredImage?.url || featuredImage?.src?.original;
        if (primaryImageUrl) {
          additionalImages = requestData.secondaryImages.filter((img: any) => {
            const imgUrl = img.url || img.src?.original;
            return imgUrl !== primaryImageUrl;
          });
          
          if (additionalImages.length !== requestData.secondaryImages.length) {
            console.log(`✓ DUPLICATE PREVENTION: Filtered out ${requestData.secondaryImages.length - additionalImages.length} duplicate primary images from secondary images`);
          }
        } else {
          additionalImages = requestData.secondaryImages;
        }
        
        // Log each secondary image for debugging
        additionalImages.forEach((img: any, idx: number) => {
          console.log(`✓ Secondary image ${idx + 1}: ${img.url} (source: ${img.source})`);
        });
        
        // CRITICAL FIX: Ensure secondary images are processed and linked to products
        if (requestData.secondaryImages.length > 0 && productsInfo.length > 0) {
          console.log(`🔗 PRODUCT INTERLINKING: Will link ${requestData.secondaryImages.length} secondary images to ${productsInfo.length} products`);
          
          // Enhance secondary images with product information for interlinking
          additionalImages = requestData.secondaryImages.map((img: any, index: number) => {
            const productIndex = index % productsInfo.length; // Cycle through products
            const product = productsInfo[productIndex];
            
            return {
              ...img,
              productUrl: `https://${store.shopName}/products/${product.handle}`,
              productTitle: product.title,
              productId: product.id
            };
          });
          
          console.log(`🔗 Enhanced ${additionalImages.length} secondary images with product links`);
        }
      } else {
        console.log(`✗ NO SECONDARY IMAGES RECEIVED: requestData.secondaryImages = ${JSON.stringify(requestData.secondaryImages)}`);
        console.log(`✗ This explains why no secondary images are being processed for content generation`);
        console.log(`✗ Check if frontend is properly sending secondaryImages in the request payload`);
      }
      
      // Fallback: If no media selected from Choose Media, try the legacy approach
      if (!featuredImage && !additionalImages.length) {
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
      }
      
      // 6. Prepare content for blog post or page
      let finalContent = generatedContent.content || `<h2>${requestData.title}</h2><p>Content being generated...</p>`;
      
      // Handle primary image differently for pages vs blog posts
      if (requestData.primaryImage && requestData.articleType === 'page') {
        // For pages: Add primary image at the beginning of content
        const primaryImageUrl = requestData.primaryImage.url;
        const primaryImageAlt = requestData.primaryImage.alt || requestData.title;
        
        // Featured image should NOT be linked to products - display as standalone image
        const primaryImageHtml = `
<div class="featured-image-container" style="text-align: center; margin: 20px 0;">
  <img src="${primaryImageUrl}" alt="${primaryImageAlt}" style="max-width: 100%; height: auto;">
</div>`;
        
        // Add primary image at the beginning of content for pages
        finalContent = primaryImageHtml + finalContent;
        console.log("Added primary image to beginning of page content");
      }
      
      // Secondary images are now handled by the Claude service via processMediaPlacementsHandler
      // This prevents duplication and ensures proper placement according to the placement markers
      if (false && requestData.secondaryImages && requestData.secondaryImages.length > 0) {
        console.log(`DISABLED: Embedding ${requestData.secondaryImages.length} secondary images directly into content`);
        
        // Find all H2 headings in the content
        const h2Pattern = /<\/h2>/gi;
        const h2Matches = [...finalContent.matchAll(h2Pattern)];
        
        if (h2Matches.length > 0) {
          // Insert secondary images after H2 headings (starting from the third H2 to leave space for video)
          let insertionOffset = 0;
          let startingH2Index = requestData.youtubeEmbed ? 2 : 1; // Skip first 2 H2s if video present, otherwise skip first 1
          
          requestData.secondaryImages.forEach((image, imageIndex) => {
            const h2Index = startingH2Index + imageIndex;
            
            if (h2Index < h2Matches.length) {
              const imageUrl = image.url;
              const imageAlt = image.alt || requestData.title;
              
              let imageHtml;
              if (productsInfo.length > 0) {
                const productIndex = imageIndex % productsInfo.length;
                const product = productsInfo[productIndex];
                const productUrl = `https://${store.shopName}/products/${product.handle}`;
                
                console.log(`Linking secondary image ${imageIndex + 1} to product: ${product.title}`);
                
                imageHtml = `
<div class="image-container" style="text-align: center; margin: 20px 0;">
  <a href="${productUrl}" title="View ${product.title}">
    <img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; border-radius: 8px;">
  </a>
  <p style="margin-top: 8px; font-size: 0.9em; color: #666;">
    <a href="${productUrl}" style="text-decoration: none; color: #2563eb; font-weight: 500;">${product.title}</a>
  </p>
</div>`;
              } else {
                console.log(`No products available for linking secondary image ${imageIndex + 1}`);
                imageHtml = `
<div class="image-container" style="text-align: center; margin: 20px 0;">
  <img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>`;
              }
              
              // Calculate insertion position with offset
              const insertPosition = h2Matches[h2Index].index + h2Matches[h2Index][0].length + insertionOffset;
              
              // Insert the image HTML
              finalContent = finalContent.slice(0, insertPosition) + imageHtml + finalContent.slice(insertPosition);
              insertionOffset += imageHtml.length;
              
              console.log(`Embedded secondary image ${imageIndex + 1} after H2 heading ${h2Index + 1}`);
            }
          });
        }
      }
      
      // Handle YouTube video placement under second H2 heading
      if (requestData.youtubeEmbed) {
        console.log(`Embedding YouTube video: ${requestData.youtubeEmbed}`);
        
        const videoHtml = `
<div class="video-container" style="text-align: center; margin: 20px 0;">
  <iframe width="100%" height="315" src="https://www.youtube.com/embed/${requestData.youtubeEmbed}" 
          frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen style="max-width: 560px;"></iframe>
</div>`;
        
        // Place video under SECOND H2 heading
        const h2Pattern = /<\/h2>/gi;
        const h2Matches = [...finalContent.matchAll(h2Pattern)];
        
        if (h2Matches.length >= 2) {
          // Insert after the second H2 heading
          const insertPosition = h2Matches[1].index + h2Matches[1][0].length;
          finalContent = finalContent.slice(0, insertPosition) + videoHtml + finalContent.slice(insertPosition);
          console.log(`Embedded YouTube video under second H2 heading`);
        } else if (h2Matches.length === 1) {
          // If only one H2, insert after it
          const insertPosition = h2Matches[0].index + h2Matches[0][0].length;
          finalContent = finalContent.slice(0, insertPosition) + videoHtml + finalContent.slice(insertPosition);
          console.log(`Embedded YouTube video under first H2 heading (only one available)`);
        }
      }
      
      // Remove any remaining placement markers to prevent empty placeholders
      finalContent = finalContent.replace(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g, '');
      finalContent = finalContent.replace(/<!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->/g, '');

      
      // Add featured image at the beginning if available
      if (featuredImage) {
        // Make sure we have a valid image URL - use Pexels medium or large src image
        // Only use URL from src properties, which are the actual image URLs
        const imageUrl = featuredImage.src?.large || featuredImage.src?.medium || featuredImage.src?.small || featuredImage.src?.original;
        
        if (!imageUrl) {
          console.warn("Featured image is missing valid src URLs, skipping featured image");
        } else {
          console.log(`Using featured image URL: ${imageUrl}`);
          
          // For Shopify compatibility, we need to use direct image URLs
          // This will ensure images work both in preview and on Shopify
          console.log(`Using direct image URL for featured image: ${imageUrl}`);
          
          // Remove photographer credit as per request
          
          // If we have products, link the featured image to the first product
          let featuredImageHtml = '';
          if (productsInfo.length > 0) {
            // Use the first product URL for the featured image with absolute URL
            const productUrl = `https://${store.shopName}/products/${productsInfo[0].handle}`;
            console.log(`Linking featured image to product URL: ${productUrl}`);
            
            featuredImageHtml = `<div class="image-container" style="text-align: center; margin: 20px 0;"><a href="${productUrl}" title="${productsInfo[0].title}"><img src="${imageUrl}" alt="${featuredImage.alt || requestData.title}" class="featured-image" style="max-width: 100%; height: auto;" /></a></div>`;
          } else {
            // No product to link to
            featuredImageHtml = `<div class="image-container" style="text-align: center; margin: 20px 0;"><img src="${imageUrl}" alt="${featuredImage.alt || requestData.title}" class="featured-image" style="max-width: 100%; height: auto;" /></div>`;
          }
          
          finalContent = `${featuredImageHtml}\n${finalContent}`;
        }
      }
      
      // LEGACY IMAGE INSERTION - DISABLED TO PREVENT DUPLICATION
      // This section was causing secondary images to repeat multiple times
      // All image placement is now handled by the Choose Media workflow above
      if (false && additionalImages.length > 0) {
        // Get product info either from productsInfo or from the request's productIds
        let availableProducts = productsInfo;
        
        // If we don't have productsInfo but we do have productIds in the request, use those productIds
        if ((!availableProducts || availableProducts.length === 0) && requestData.productIds && requestData.productIds.length > 0) {
          // Fetch product information for the productIds
          try {
            console.log(`No product info available, trying to fetch details for products: ${requestData.productIds.join(', ')}`);
            // Since getProductsById doesn't exist, we'll use getProducts and filter the results
            const allProducts = await shopifyService.getProducts(store, 100);
            // CRITICAL FIX: Ensure product IDs are properly compared as strings
            availableProducts = allProducts.filter(p => {
              // Convert both to strings to ensure proper comparison
              const productId = String(p.id);
              return requestData.productIds?.some((id: string | number) => String(id) === productId);
            });
            console.log(`Available products after filtering: ${JSON.stringify(availableProducts.map(p => ({ id: p.id, title: p.title })))}`);
            
            // If we still don't have products, try to use all products
            if (availableProducts.length === 0 && allProducts.length > 0) {
              console.log(`Falling back to using all products since none matched the specific IDs`);
              availableProducts = allProducts.slice(0, 3); // Use up to 3 products
            }
            console.log(`Successfully fetched ${availableProducts.length} products for interlinking`);
          } catch (productFetchError) {
            console.error("Failed to fetch product details for interlinking:", productFetchError);
          }
        }
        
        // Determine if we're inserting images with or without product links
        const hasProducts = availableProducts && availableProducts.length > 0;
        
        console.log(`Inserting ${additionalImages.length} secondary images into content body ${hasProducts ? 'with' : 'without'} product links`);
        
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
                // Get the image
                const imageIndex = i % additionalImages.length;
                const image = additionalImages[imageIndex];
                
                // Get the actual position in the content
                const position = insertPoints[insertIndex] + insertionOffset;
                
                // Get image URL - handle both Choose Media format and legacy format
                const imageUrl = image.url || image.src?.large || image.src?.medium || image.src?.small || image.src?.original;
                if (!imageUrl) {
                  console.warn(`Image ${image.id || 'unknown'} is missing valid URLs, skipping insertion`);
                  continue;
                }
                
                // For Shopify compatibility, we need to use direct image URLs
                // This will ensure images work both in preview and on Shopify
                console.log(`Using direct image URL for content: ${imageUrl}`);
                
                let imageHtml;
                
                // If we have products, link the image to a product
                if (hasProducts) {
                  // Use the first product for all images if only one product is available
                  const productIndex = availableProducts.length > 1 ? (i % availableProducts.length) : 0;
                  const product = availableProducts[productIndex];
                  
                  // Make sure we have valid image ALT text
                  const imageAlt = image.alt || product.title || requestData.title;
                  
                  // Ensure product URL is correctly formatted with store domain - CRITICAL FIX
                  const productUrl = `https://${store.shopName}/products/${product.handle}`;
                  
                  console.log(`Inserting image with URL: ${imageUrl} linking to product: ${productUrl}`);
                  
                  // Create center-aligned div with link to product - Using direct image URL
                  imageHtml = `\n<div class="image-container" style="text-align: center; margin: 20px 0;"><a href="${productUrl}" title="${product.title}"><img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;"></a>
<p style="margin-top: 5px; font-size: 0.9em;"><a href="${productUrl}">${product.title}</a></p></div>\n`;
                } else {
                  // No product to link to - just insert the image
                  const imageAlt = image.alt || requestData.title;                  
                  console.log(`Inserting standalone image with URL: ${imageUrl}`);
                  
                  // Create center-aligned div without product link - Using direct image URL
                  imageHtml = `\n<div class="image-container" style="text-align: center; margin: 20px 0;"><img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;"></div>\n`;
                }
                
                // Insert the image HTML at the position
                modifiedContent = modifiedContent.slice(0, position) + imageHtml + modifiedContent.slice(position);
                
                // Adjust offset for subsequent insertions
                insertionOffset += imageHtml.length;
                
                console.log(`Inserted image ${i+1}/${insertCount} at position ${position}`);
              }
            }
            
            finalContent = modifiedContent;
          }
        } else {
          console.warn("Could not find suitable insertion points for additional images");
        }
      } else {
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
        // Use custom categories if available, or fall back to default category
        let categoryValue = "";
        
        if (requestData.categories && Array.isArray(requestData.categories) && requestData.categories.length > 0) {
          // Use the first category as the main category for the post
          categoryValue = requestData.categories[0];
          console.log(`Using custom category for post: ${categoryValue}`);
        } else {
          // Check if we have product information for setting the proper category
          const hasCategoryProducts = productsInfo.length > 0 || 
                               (requestData.productIds && requestData.productIds.length > 0);
          categoryValue = hasCategoryProducts ? "Selected" : "Generated Content";
          console.log(`Using default category for post: ${categoryValue}`);
        }
        
        // Prepare categories string for storage
        const categoriesString = requestData.categories && Array.isArray(requestData.categories) 
                               ? requestData.categories.join(',') 
                               : categoryValue;
        
        // CRITICAL: Check if this is a scheduled post - publicationType takes precedence over postStatus
        const isScheduled = 
            // First check explicit publicationType (from form radio buttons)
            (requestData.publicationType === "schedule" && 
            requestData.scheduleDate && 
            requestData.scheduleTime) || 
            // Fallback to postStatus for backward compatibility
            (requestData.postStatus === 'schedule' && 
            requestData.scheduleDate && 
            requestData.scheduleTime);
                          
        console.log("Processing post/page creation:", {
          publicationType: requestData.publicationType,
          postStatus: requestData.postStatus,
          scheduleDate: requestData.scheduleDate,
          scheduleTime: requestData.scheduleTime,
          isScheduled: isScheduled
        });
        
        // OVERRIDE postStatus when scheduling is selected
        // This ensures immediate publication is NOT triggered when scheduling is selected
        if (isScheduled) {
          console.log("SCHEDULING MODE ACTIVATED - Setting status to scheduled");
          requestData.postStatus = 'draft'; // Prevent immediate publishing
        }

        // Prepare post data with proper status - publicationType takes precedence
        const postStatus = isScheduled
                         ? 'scheduled'  
                         : requestData.postStatus === 'publish'
                           ? 'published'
                           : 'draft';

        // Log post creation info
        console.log(`Creating post with status: ${postStatus}`, {
          title: generatedContent.title || requestData.title,
          postStatus: requestData.postStatus,
          publicationType: requestData.publicationType,
          scheduleDate: requestData.scheduleDate,
          scheduleTime: requestData.scheduleTime
        });

        // Determine author name - prioritize selected author from AdminPanel
        let authorName = ''; // No default fallback - require explicit author selection
        let finalAuthorId: number | null = null;
        
        // Convert authorId to number if provided
        if (requestData.authorId) {
          try {
            // Handle both string and number types from frontend
            const authorIdNum = typeof requestData.authorId === 'string' 
              ? parseInt(requestData.authorId, 10) 
              : requestData.authorId;
            
            if (!isNaN(authorIdNum)) {
              const { db } = await import('../db');
              const { authors } = await import('../../shared/schema');
              const { eq } = await import('drizzle-orm');
              
              const authorData = await db.select().from(authors).where(eq(authors.id, authorIdNum)).limit(1);
              if (authorData.length > 0) {
                authorName = authorData[0].name;
                finalAuthorId = authorIdNum;
                console.log(`AUTHOR SYNC SUCCESS - Using selected author: ${authorName} (ID: ${authorIdNum})`);
              } else {
                console.log(`AUTHOR SYNC WARNING - Author ID ${authorIdNum} not found in database`);
              }
            } else {
              console.log(`AUTHOR SYNC WARNING - Invalid authorId format: ${requestData.authorId}`);
            }
          } catch (error) {
            console.error('AUTHOR SYNC ERROR - Failed to fetch author from database:', error);
          }
        } else {
          console.log(`AUTHOR SYNC INFO - No authorId provided, no author will be assigned`);
        }

        // @ts-ignore - Categories field is supported in the database but might not be in the type yet
        const post = await storage.createBlogPost({
          storeId: store.id, // CRITICAL: Associate post with the correct store
          title: generatedContent.title || requestData.title,
          content: finalContent,
          status: postStatus,
          publishedDate: requestData.postStatus === 'publish' ? new Date() : undefined,
          // Add scheduled date information if applicable
          scheduledPublishDate: isScheduled ? requestData.scheduleDate : undefined,
          scheduledPublishTime: isScheduled ? requestData.scheduleTime : undefined,
          author: authorName,
          authorId: finalAuthorId, // CRITICAL: Store the properly converted author ID
          tags: generatedContent.tags?.join(',') || '',
          category: categoryValue,
          categories: categoriesString,
          shopifyPostId: null,
          shopifyBlogId: blogId,
          // Add primary image as featured image for blog posts
          featuredImage: requestData.primaryImage?.url || featuredImage?.url
        });
        
        contentId = post.id;
        
        // IMPORTANT: Content generation should NEVER automatically publish to Shopify
        // Content should only be pushed to Shopify when user explicitly clicks publish buttons
        // This prevents automatic publishing during content generation
        if (false) { // Disabled automatic Shopify publishing during content generation
          console.log(`Publishing to Shopify blog ID: ${blogId}${isScheduled ? ' (scheduled)' : ''}`);
          try {
            // For scheduled posts, create a proper Date object to pass to Shopify API
            let scheduledPublishDate: Date | undefined = undefined;
            
            if (isScheduled && requestData.scheduleDate && requestData.scheduleTime) {
              console.log(`Preparing scheduled date for Shopify API: ${requestData.scheduleDate} at ${requestData.scheduleTime}`);
              
              try {
                // Get shop timezone for proper date creation
                const shopInfo = await shopifyService.getShopInfo(store);
                const storeTimezone = shopInfo?.iana_timezone || shopInfo.timezone || 'UTC';
                console.log(`Using store timezone for scheduling: ${storeTimezone}`);
                
                // Import timezone utilities
                const { createDateInTimezone } = await import('../../shared/timezone');
                
                // Create a date in the store's timezone
                scheduledPublishDate = createDateInTimezone(
                  requestData.scheduleDate,
                  requestData.scheduleTime,
                  storeTimezone
                );
                
                console.log(`Created scheduled publish date: ${scheduledPublishDate.toISOString()}`);
              } catch (error) {
                console.error(`Error creating scheduled date:`, error);
                // Fallback to a simple date creation
                try {
                  const [year, month, day] = requestData.scheduleDate.split('-').map(Number);
                  const [hours, minutes] = requestData.scheduleTime.split(':').map(Number);
                  scheduledPublishDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
                  console.log(`Fallback scheduled date: ${scheduledPublishDate.toISOString()}`);
                } catch (fallbackError) {
                  console.error(`Fallback date creation failed:`, fallbackError);
                }
              }
            }
            
            // Handle post creation based on scheduling requirements
            let shopifyArticle;
            
            if (isScheduled && scheduledPublishDate) {
              console.log('Using custom scheduling implementation for future-dated content');
              
              // Import the custom scheduling implementation
              const { schedulePost } = await import('../services/custom-scheduler');
              
              // Schedule the post with our custom implementation
              // This will create a draft post and store scheduling info locally
              try {
                shopifyArticle = await schedulePost(
                  store,
                  blogId,
                  post,
                  scheduledPublishDate
                );
                
                console.log('Post scheduled successfully with custom scheduler:', {
                  id: shopifyArticle.id,
                  title: shopifyArticle.title,
                  scheduledDate: scheduledPublishDate.toISOString()
                });
              } catch (schedulingError) {
                console.error('Error with custom scheduling:', schedulingError);
                // Fallback to creating as draft
                shopifyArticle = await shopifyService.createArticle(store, blogId, post);
              }
            } else {
              // For non-scheduled posts, use the regular implementation
              shopifyArticle = await shopifyService.createArticle(
                store, 
                blogId, 
                post,
                undefined // Don't pass any scheduled date to avoid issues
              );
            }
            
            // Update the local post with Shopify IDs
            await storage.updateBlogPost(post.id, {
              shopifyPostId: shopifyArticle.id,
              shopifyBlogId: blogId
            });
            
            // Get the blog handle/slug instead of using the numeric ID in the URL
            let blogHandle;
            try {
              const blogDetails = await shopifyService.getBlogById(store, shopifyArticle.blog_id);
              blogHandle = blogDetails.handle;
              console.log(`Using blog handle "${blogHandle}" for URL generation`);
            } catch (blogError) {
              console.warn(`Could not fetch blog handle, using default: ${blogError}`);
              blogHandle = 'news'; // Default blog handle
            }
            
            // Ensure we use the article handle from Shopify response, not numeric ID
            const articleHandle = shopifyArticle.handle || shopifyArticle.title?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'untitled';
            contentUrl = `https://${store.shopName}/blogs/${blogHandle}/${articleHandle}`;
            
            console.log(`Generated blog post URL: ${contentUrl}`);
          } catch (shopifyError: any) {
            console.error('Error creating Shopify article:', shopifyError);
            throw new Error(`Failed to publish to Shopify: ${shopifyError.message || 'Unknown error'}`);
          }
        }
      } else {
        // IMPORTANT: Content generation should NEVER automatically publish pages to Shopify
        // Pages should only be pushed to Shopify when user explicitly clicks publish buttons
        // This prevents automatic publishing during content generation
        if (false) { // Disabled automatic Shopify page publishing during content generation
        // Create page in Shopify
        try {
          // CRITICAL: Check if this is a scheduled page - publicationType takes precedence
          const isScheduled = 
              // First check explicit publicationType (from form radio buttons)
              (requestData.publicationType === "schedule" && 
              requestData.scheduleDate && 
              requestData.scheduleTime) || 
              // Fallback to postStatus for backward compatibility
              (requestData.postStatus === 'schedule' && 
              requestData.scheduleDate && 
              requestData.scheduleTime);
                            
          console.log("Processing page creation:", {
            publicationType: requestData.publicationType,
            postStatus: requestData.postStatus,
            scheduleDate: requestData.scheduleDate,
            scheduleTime: requestData.scheduleTime,
            isScheduled: isScheduled
          });
          
          // OVERRIDE postStatus when scheduling is selected
          // This ensures immediate publication is NOT triggered when scheduling is selected
          if (isScheduled) {
            console.log("SCHEDULING MODE ACTIVATED FOR PAGE - Setting status to scheduled");
            requestData.postStatus = 'draft'; // Prevent immediate publishing
          }
          
          let scheduledAt: Date | undefined = undefined;
          
          // If scheduled, create proper date for scheduling
          if (isScheduled) {
            // Import timezone utilities
            const { createDateInTimezone } = await import('../../shared/timezone');
            
            // Create a proper date object for scheduling
            // Get shop info for timezone using the singleton
            const shopInfo = await shopifyService.getShopInfo(store);
            const storeTimezone = shopInfo?.iana_timezone || 'America/New_York';
            
            console.log(`Using timezone: ${storeTimezone} for scheduling`);
            
            // Create a JavaScript Date object for scheduling
            const scheduledDate = createDateInTimezone(
              requestData.scheduleDate,
              requestData.scheduleTime,
              storeTimezone
            );
            
            // Set for Shopify API - must be a Date object for the createPage method
            scheduledAt = new Date(scheduledDate);
            console.log(`Setting page scheduled publication date to: ${scheduledAt}`);
          }
          
          // Determine publish setting - critical for correct scheduling
          // Only publish immediately if explicitly set to publish AND not scheduled
          const shouldPublishNow = requestData.postStatus === 'publish' && !isScheduled;
          
          console.log(`Creating page with publish setting: ${shouldPublishNow ? 'PUBLISH NOW' : isScheduled ? 'SCHEDULED' : 'DRAFT'}`);
          
          // Handle page creation based on scheduling requirements
          let page;
          
          if (isScheduled && scheduledAt) {
            console.log('Using custom scheduling implementation for future-dated page');
            
            // Import the custom scheduling implementation
            const { schedulePage } = await import('../services/custom-scheduler');
            
            try {
              // Create a draft page and store scheduling info locally
              page = await schedulePage(
                store,
                generatedContent.title || requestData.title,
                finalContent,
                scheduledAt
              );
              
              console.log('Page scheduled successfully with custom scheduler:', {
                id: page.id,
                title: page.title,
                scheduledDate: scheduledAt.toISOString()
              });
            } catch (schedulingError) {
              console.error('Error with custom page scheduling:', schedulingError);
              // Fallback to creating as draft
              page = await shopifyService.createPage(
                store,
                generatedContent.title || requestData.title,
                finalContent,
                false, // Create as draft
                undefined, // Don't pass any scheduled date
                featuredImage?.src?.large || featuredImage?.src?.medium || featuredImage?.url, // Add featured image
                { categories: requestData.categories } // Pass categories for page metadata
              );
            }
          } else {
            // For non-scheduled pages, use the regular implementation
            page = await shopifyService.createPage(
              store,
              generatedContent.title || requestData.title,
              finalContent,
              shouldPublishNow, // Only publish now if explicitly set
              undefined, // Don't pass any scheduled date to avoid issues
              featuredImage?.src?.large || featuredImage?.src?.medium || featuredImage?.url, // Add featured image
              { categories: requestData.categories } // Pass categories for page metadata
            );
          }
          
          contentId = page.id;
          
          // Ensure we use the page handle from Shopify response, not numeric ID
          const pageHandle = page.handle || generatedContent.title?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'untitled';
          contentUrl = `https://${store.shopName}/pages/${pageHandle}`;
          
          console.log(`Generated page URL: ${contentUrl}`);
        } catch (pageError: any) {
          console.error('Error creating Shopify page:', pageError);
          throw new Error(`Failed to create page: ${pageError?.message || 'Unknown error'}`);
        }
        } // End of disabled automatic page creation
      }
      
      // 8. Return the result with selected media included for preview
      return res.json({
        success: true,
        contentId,
        contentUrl,
        content: finalContent, // Use finalContent which includes embedded secondary media
        title: generatedContent.title,
        tags: generatedContent.tags,
        metaDescription: generatedContent.metaDescription || '',
        featuredImage: featuredImage,
        // Include selected media for preview display
        secondaryImages: requestData.secondaryImages || [],
        youtubeEmbed: requestData.youtubeEmbed || null,
        primaryImage: requestData.primaryImage || featuredImage
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
      
      const testResult = await shopifyService.testConnection(store);
      results.shopify = testResult.success;
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
  
  // Test DataForSEO connection with detailed logging
  try {
    // Log the current DataForSEO credentials format (without revealing sensitive data)
    const apiKey = process.env.DATAFORSEO_API_KEY || '';
    const hasCredentials = apiKey.length > 0;
    const hasCorrectFormat = apiKey.includes(':');
    
    console.log(`DataForSEO credentials check - Has credentials: ${hasCredentials}, Has correct format: ${hasCorrectFormat}`);
    if (hasCredentials) {
      const parts = apiKey.split(':');
      console.log(`DataForSEO login length: ${parts[0]?.length || 0}, password length: ${parts[1]?.length || 0}`);
    }
    
    console.log("Testing DataForSEO connection...");
    const dataForSEOTest = await dataForSEOService.testConnection();
    console.log("DataForSEO test result:", dataForSEOTest);
    
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
