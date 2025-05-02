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
    // Validate request - allow either direct topic or URL
    const schema = z.object({
      productUrl: z.string().optional(),
      topic: z.string().optional() // Allow direct keyword entry
    }).refine(data => data.productUrl || data.topic, {
      message: "Either productUrl or topic must be provided"
    });
    
    const { productUrl, topic } = schema.parse(req.body);
    
    // Check if DataForSEO API key is set
    if (!dataForSEOService.hasValidCredentials()) {
      return res.status(400).json({
        success: false,
        error: "DataForSEO API key not set",
        needsApiKey: true
      });
    }
    
    try {
      // Determine search query - prefer topic if provided
      const searchQuery = topic || productUrl || "";
      console.log(`Searching keywords for: "${searchQuery}"`);
      
      // Get keywords - might use real API or fallback depending on credentials
      const keywords = await dataForSEOService.getKeywordsForProduct(searchQuery);
      
      // Log success for debugging
      console.log(`Successfully found ${keywords.length} keywords for "${searchQuery}"`);
      
      res.json({
        success: true,
        keywords,
        usingFallback: !dataForSEOService.hasValidCredentials()
      });
    } catch (apiError: any) {
      console.error("API error when fetching keywords:", apiError);
      
      res.status(500).json({
        success: false,
        error: apiError.message || "Failed to fetch keywords"
      });
    }
  } catch (error: any) {
    console.error("Error fetching keywords:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch keywords"
    });
  }
});

// Save selected keywords for content generation
adminRouter.post("/save-selected-keywords", async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      contentRequestId: z.number().optional(),
      selectedKeywords: z.array(z.object({
        keyword: z.string(),
        searchVolume: z.number().optional(),
        competition: z.number().optional(),
        competitionLevel: z.string().optional(),
        difficulty: z.number().optional()
      }))
    });
    
    const { contentRequestId, selectedKeywords } = schema.parse(req.body);
    
    // Here you would typically save the selected keywords to the database
    // For this implementation, we'll just return them back with a success flag
    
    res.json({
      success: true,
      contentRequestId,
      selectedKeywords
    });
  } catch (error: any) {
    console.error("Error saving selected keywords:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to save selected keywords"
    });
  }
});

// Generate images for a topic using Pexels
adminRouter.post("/generate-images", async (req: Request, res: Response) => {
  try {
    // Validate request
    const schema = z.object({
      prompt: z.string().min(1),
      count: z.number().min(1).max(10).optional()
    });
    
    const { prompt, count = 3 } = schema.parse(req.body);
    
    // Generate images with Pexels (with fallback to placeholders if API key not set)
    const { images, fallbackUsed } = await pexelsService.safeSearchImages(prompt, count);
    
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
      selectedImageIds: z.array(z.string()).optional(), // Added for user-selected Pexels images
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
      
      // 5. Handle images based on user selection or generate if needed
      let featuredImage = null;
      let additionalImages: PexelsImage[] = [];
      
      // If user has selected specific images, use those
      if (requestData.selectedImageIds && requestData.selectedImageIds.length > 0) {
        try {
          // We need to search for the image to get the URL
          console.log(`Using user-selected images with IDs: ${requestData.selectedImageIds.join(', ')}`);
          
          // Search for the image to get its full data
          // Note: In a real implementation, we'd store these images in a database
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
              console.log(`Found ${additionalImages.length} additional images to insert in content`);
            }
          } else {
            console.log(`Selected images not found, will generate new ones`);
          }
        } catch (imageError) {
          console.error('Error retrieving selected images:', imageError);
        }
      }
      
      // If we still don't have a featured image (no selection or error), generate some
      if (!featuredImage && requestData.generateImages) {
        try {
          console.log(`Generating images for: "${requestData.title}"`);
          const { images, fallbackUsed } = await pexelsService.safeSearchImages(requestData.title, 3);
          if (images && images.length > 0) {
            featuredImage = images[0];
            console.log(`Successfully generated featured image: ${featuredImage.url}`);
            
            // Save additional generated images if available
            if (images.length > 1) {
              additionalImages = images.slice(1);
              console.log(`Generated ${additionalImages.length} additional images for content`);
            }
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
        
        // Prepare content with featured image and additional images throughout the content
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
        
        // Insert additional images throughout the content, after subheadings (<h2> and <h3> tags)
        if (additionalImages.length > 0) {
          // Find all heading locations in the content using a compatible approach instead of matchAll
          const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>/g;
          const headingMatches: Array<{index: number, match: string}> = [];
          let match;
          
          // Manually collect all matches
          while ((match = headingRegex.exec(finalContent)) !== null) {
            headingMatches.push({
              index: match.index,
              match: match[0]
            });
          }
          
          if (headingMatches.length > 0) {
            // Create a copy of the content to modify
            let contentWithImages = finalContent;
            let imageIndex = 0;
            let insertOffset = 0;
            
            // Insert images after some headings (not all, to maintain good content flow)
            for (let i = 0; i < headingMatches.length && imageIndex < additionalImages.length; i++) {
              // Only insert after approximately every second heading
              if (i % 2 === 1) {
                const match = headingMatches[i];
                if (match.index !== undefined) {
                  const insertPosition = match.index + match.match.length + insertOffset;
                  const image = additionalImages[imageIndex];
                  const imageHtml = `\n\n<img src="${image.url}" alt="${image.alt || 'Content image'}" class="content-image" />\n\n`;
                  
                  // Insert the image HTML after the heading
                  contentWithImages = 
                    contentWithImages.substring(0, insertPosition) + 
                    imageHtml + 
                    contentWithImages.substring(insertPosition);
                  
                  // Track the offset as we're modifying the string
                  insertOffset += imageHtml.length;
                  imageIndex++;
                }
              }
            }
            
            // If we still have images left but ran out of headings, append them to the end
            if (imageIndex < additionalImages.length) {
              contentWithImages += '\n\n<div class="additional-images">\n';
              for (let i = imageIndex; i < additionalImages.length; i++) {
                const image = additionalImages[i];
                contentWithImages += `<img src="${image.url}" alt="${image.alt || 'Additional content image'}" class="content-image" />\n`;
              }
              contentWithImages += '</div>\n';
            }
            
            finalContent = contentWithImages;
          }
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
          // Prepare content with featured image and additional images throughout the content
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
          
          // Insert additional images throughout the content, after subheadings (<h2> and <h3> tags)
          if (additionalImages.length > 0) {
            // Find all heading locations in the content using a compatible approach instead of matchAll
            const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>/g;
            const headingMatches: Array<{index: number, match: string}> = [];
            let match;
            
            // Manually collect all matches
            while ((match = headingRegex.exec(finalContent)) !== null) {
              headingMatches.push({
                index: match.index,
                match: match[0]
              });
            }
            
            if (headingMatches.length > 0) {
              // Create a copy of the content to modify
              let contentWithImages = finalContent;
              let imageIndex = 0;
              let insertOffset = 0;
              
              // Insert images after some headings (not all, to maintain good content flow)
              for (let i = 0; i < headingMatches.length && imageIndex < additionalImages.length; i++) {
                // Only insert after approximately every second heading
                if (i % 2 === 1) {
                  const match = headingMatches[i];
                  if (match.index !== undefined) {
                    const insertPosition = match.index + match.match.length + insertOffset;
                    const image = additionalImages[imageIndex];
                    const imageUrl = image.src?.medium || image.url;
                    const photographer = image.photographer ? `<p class="image-credit">Photo by: ${image.photographer}</p>` : '';
                    const imageHtml = `\n\n<img src="${imageUrl}" alt="${image.alt || 'Content image'}" class="content-image" />\n${photographer}\n`;
                    
                    // Insert the image HTML after the heading
                    contentWithImages = 
                      contentWithImages.substring(0, insertPosition) + 
                      imageHtml + 
                      contentWithImages.substring(insertPosition);
                    
                    // Track the offset as we're modifying the string
                    insertOffset += imageHtml.length;
                    imageIndex++;
                  }
                }
              }
              
              // If we still have images left but ran out of headings, append them to the end
              if (imageIndex < additionalImages.length) {
                contentWithImages += '\n\n<div class="additional-images">\n';
                for (let i = imageIndex; i < additionalImages.length; i++) {
                  const image = additionalImages[i];
                  contentWithImages += `<img src="${image.url}" alt="${image.alt || 'Additional content image'}" class="content-image" />\n`;
                }
                contentWithImages += '</div>\n';
              }
              
              finalContent = contentWithImages;
            }
          }
          
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
      
      // 6. Return the generated content
      res.json({
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