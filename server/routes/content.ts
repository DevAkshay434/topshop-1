import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertContentGenRequestSchema } from "@shared/schema";
import { generateBlogContentWithClaude, testClaudeConnection, generateClusterTitles } from "../services/claude";
import { generateBulkContentWithClaude } from "../services/claudeBulk";
import { canGenerateContentWithCredits, consumeUsageForContentGeneration } from "../services/billing";

// Helper function to get store from request with multi-store support (copied from routes.ts)
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

const contentRouter = Router();

// Generate content for a single topic with optional custom prompt
contentRouter.post("/generate-content", async (req: Request, res: Response) => {
  try {
    // Validate request body with custom prompt support
    const reqSchema = z.object({
      topic: z.string().min(1),
      customPrompt: z.string().optional()
    });
    
    const { topic, customPrompt } = reqSchema.parse(req.body);
    
    console.log(`Generating content for topic: "${topic}" ${customPrompt ? 'with custom prompt' : ''}`);
    
    // Get store context
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Check if user can generate content (considering both plan limits and credits)
    const generationCheck = await canGenerateContentWithCredits(store.id);
    
    if (!generationCheck.canGenerate) {
      return res.status(403).json({
        success: false,
        error: 'Content generation limit reached',
        message: generationCheck.message,
        details: {
          currentUsage: generationCheck.currentUsage,
          planLimit: generationCheck.planLimit,
          availableCredits: generationCheck.availableCredits,
          planType: generationCheck.planType
        }
      });
    }
    
    // Create a record of the content generation request
    const contentRequest = await storage.createContentGenRequest({
      storeId: store.id,
      userId: null, // TODO: Add user context when authentication is implemented
      topic,
      tone: customPrompt ? "custom" : "professional", // Using tone field to track if custom prompt was used
      length: "medium", // Default length
      status: "pending",
      generatedContent: null
    });
    
    try {
      // Generate content with Claude as the primary service
      console.log(`Generating content with Claude for topic: "${topic}"`);
      
      const generatedContent = await generateBlogContentWithClaude({
        topic,
        tone: "professional",
        length: "medium",
        customPrompt
      });
      
      // Log the returned content (truncated for readability)
      console.log(`Claude content generated successfully. Title: "${generatedContent.title}", Content length: ${generatedContent.content ? generatedContent.content.length : 0} characters`);
      
      // Update content generation request to completed
      const updatedRequest = await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
      // Consume the usage (either from plan limits or credits)
      const consumeResult = await consumeUsageForContentGeneration(store.id);
      console.log(`Content generation consumed:`, consumeResult);
      
      // Get the Shopify connection to use as author
      const connection = await storage.getShopifyConnection();
      const storeName = connection?.storeName || "Store Owner";
      
      // Create a blog post with the generated content
      const post = await storage.createBlogPost({
        title: generatedContent.title,
        content: generatedContent.content || `# ${generatedContent.title}\n\nContent for ${topic}`,
        status: "draft", // Default to draft so user can review before publishing
        author: storeName,
        tags: Array.isArray(generatedContent.tags) && generatedContent.tags.length > 0 
          ? generatedContent.tags.join(",") 
          : topic,
        category: "Generated Content"
      });
      
      res.json({ 
        success: true, 
        requestId: updatedRequest?.id,
        postId: post.id,
        consumeResult,
        ...generatedContent
      });
      
    } catch (claudeError: any) {
      console.error("Claude content generation error:", claudeError);
      
      // Update as failed since Claude failed
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "failed",
        generatedContent: JSON.stringify({ 
          error: "Claude content generation failed: " + (claudeError?.message || String(claudeError))
        })
      });
      
      // Return error to the client
      res.status(500).json({
        success: false,
        error: "Failed to generate content with Claude API",
        message: claudeError?.message || String(claudeError)
      });
    }
  } catch (error: any) {
    console.error("Error in content generation endpoint:", error);
    res.status(400).json({ 
      success: false, 
      error: error?.message || "Invalid request"
    });
  }
});

// Removed OpenAI test routes as we're now using Claude API exclusively

// Simple bulk content generation - direct topics and prompt
contentRouter.post("/generate-content/simple-bulk", async (req: Request, res: Response) => {
  try {
    // Validate request
    const reqSchema = z.object({
      topics: z.array(z.string().min(1)).min(1),
      customPrompt: z.string().min(10)
    });
    
    const { topics, customPrompt } = reqSchema.parse(req.body);
    
    console.log(`Simple bulk generating content for ${topics.length} topics with custom prompt`);
    
    // Log the prompt for debugging (first 50 chars)
    console.log(`Using prompt (first 50 chars): ${customPrompt.substring(0, 50)}...`);
    
    // Process results array
    const results = [];
    
    // Process each topic sequentially to avoid rate limits and make debugging easier
    for (const topic of topics) {
      try {
        console.log(`Generating content for topic: "${topic}"`);
        
        // Create content request record
        const contentRequest = await storage.createContentGenRequest({
          topic,
          tone: "custom",
          length: "medium",
          status: "pending",
          generatedContent: null
        });
        
        // Replace [TOPIC] in the custom prompt with the actual topic
        const topicPrompt = customPrompt.replace(/\[TOPIC\]/g, topic);
        
        try {
          console.log(`Generating content with Claude for topic "${topic}"`);
          
          // Generate content with Claude API
          const generatedContent = await generateBlogContentWithClaude({
            topic,
            tone: "professional",
            length: "medium",
            customPrompt: topicPrompt
          });
          
          console.log(`Claude content generated successfully for "${topic}". Title: "${generatedContent.title}"`);
          
          // Update request record
          await storage.updateContentGenRequest(contentRequest.id, {
            status: "completed",
            generatedContent: JSON.stringify(generatedContent)
          });
          
          // Get the Shopify connection to use as author
          const connection = await storage.getShopifyConnection();
          const storeName = connection?.storeName || "Store Owner";
          
          // Create a blog post with this content
          const post = await storage.createBlogPost({
            title: generatedContent.title,
            content: generatedContent.content || `# ${generatedContent.title}\n\nContent for ${topic}`,
            status: "published", 
            publishedDate: new Date(),
            author: storeName,
            tags: Array.isArray(generatedContent.tags) && generatedContent.tags.length > 0 
              ? generatedContent.tags.join(",") 
              : topic,
            category: "Generated Content"
          });
          
          // Try to sync to Shopify immediately
          try {
            await fetch(`http://localhost:5000/api/shopify/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postIds: [post.id] })
            });
            console.log(`Post for "${topic}" synced to Shopify`);
          } catch (syncError) {
            console.error(`Error syncing post for "${topic}" to Shopify:`, syncError);
          }
          
          // Add to results
          results.push({
            topic,
            postId: post.id,
            title: generatedContent.title,
            content: generatedContent.content,
            status: "success",
            usesFallback: false
          });
          
        } catch (claudeError: any) {
          console.error(`Claude API error for topic "${topic}":`, claudeError);
          
          // Update request as failed
          await storage.updateContentGenRequest(contentRequest.id, {
            status: "failed",
            generatedContent: JSON.stringify({ 
              error: "Claude content generation failed: " + (claudeError?.message || String(claudeError))
            })
          });
          
          // Add failed result
          results.push({
            topic,
            status: "failed",
            error: "Claude content generation failed: " + (claudeError?.message || String(claudeError))
          });
        }
      } catch (topicError) {
        console.error(`Error processing topic "${topic}":`, topicError);
        results.push({
          topic,
          status: "failed",
          error: topicError instanceof Error ? topicError.message : "Unknown error"
        });
      }
    }
    
    // Send back all results
    res.json({
      success: true,
      totalTopics: topics.length,
      successful: results.filter(r => r.status === "success").length,
      results
    });
    
  } catch (error: any) {
    console.error("Error in simple bulk generation endpoint:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Bulk generate content for multiple topics using Claude API
contentRouter.post("/generate-content/bulk", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const reqSchema = z.object({
      topics: z.array(z.string().min(1)).min(1),
      templateId: z.number().optional(),
      customPrompt: z.string().optional()
    });
    
    const { topics, templateId, customPrompt } = reqSchema.parse(req.body);
    
    console.log(`Bulk generating content for ${topics.length} topics with Claude API ${customPrompt ? 'and custom prompt' : ''}`);
    
    // Get the template content if template ID is provided
    // Use the custom prompt if provided, otherwise use default prompt
    let effectivePrompt = customPrompt;
    
    if (!effectivePrompt && templateId) {
      // In a real implementation, we would fetch the template from the database
      // and use its customPrompt field if available
      console.log(`Using template ID: ${templateId}`);
      
      // Template prompts stored here for simplicity
      const templatePrompts: Record<number, string> = {
        1: "You are a professional product reviewer. Write a comprehensive, honest review about [TOPIC]. Include pros, cons, and a final verdict with rating. Be objective and support claims with evidence.",
        2: "You are an expert educator. Create a detailed, step-by-step guide explaining how to [TOPIC]. Include prerequisites, common mistakes to avoid, and helpful tips for beginners.",
        3: "You are an industry analyst. Write a well-researched article about the latest trends in [TOPIC] for this year. Include statistics, expert opinions, and practical insights for businesses.",
        4: "You are a product comparison specialist. Write a detailed, fair comparison between different [TOPIC] options. Include a feature-by-feature breakdown and recommendations for different use cases.",
        5: "You are a marketing specialist. Create a compelling seasonal promotion article for [TOPIC]. Include special offers, limited-time deals, and create a sense of urgency.",
        6: "You are a case study writer. Create a detailed success story about a business that achieved impressive results with [TOPIC]. Include specific challenges, solutions, implementation details, and quantifiable outcomes. Use a professional, factual tone."
      };
      
      if (templateId in templatePrompts) {
        effectivePrompt = templatePrompts[templateId];
        console.log(`Using template prompt for ID ${templateId}`);
      }
    }
    
    // Log the effective prompt for debugging
    console.log(`Using prompt (first 50 chars): ${effectivePrompt ? effectivePrompt.substring(0, 50) + '...' : 'None'}`);
    
    // Array to store results for all topics
    const createdPosts = [];
    const postIds = [];
    
    // Process each topic sequentially to better handle rate limits
    for (const topic of topics) {
      try {
        console.log(`Generating content for topic: "${topic}"`);
        
        // Create a content generation request record
        const contentRequest = await storage.createContentGenRequest({
          topic,
          tone: "professional",
          length: "medium",
          status: "pending",
          generatedContent: null
        });
        
        // Create topic-specific prompt by replacing [TOPIC]
        const topicPrompt = effectivePrompt ? effectivePrompt.replace(/\[TOPIC\]/g, topic) : undefined;
        
        // Generate content with Claude
        console.log(`Generating content with Claude for topic: "${topic}"`);
        
        try {
          const generatedContent = await generateBlogContentWithClaude({
            topic,
            tone: "professional",
            length: "medium",
            customPrompt: topicPrompt
          });
          
          console.log(`Claude content generated successfully for "${topic}". Title: "${generatedContent.title}"`);
          
          // Update request record
          await storage.updateContentGenRequest(contentRequest.id, {
            status: "completed",
            generatedContent: JSON.stringify(generatedContent)
          });
          
          // Get the Shopify connection to use as author
          const connection = await storage.getShopifyConnection();
          const storeName = connection?.storeName || "Store Owner";
          
          // Create a blog post with this content
          const post = await storage.createBlogPost({
            title: generatedContent.title,
            content: generatedContent.content || `# ${generatedContent.title}\n\nContent for ${topic}`,
            status: "published", 
            publishedDate: new Date(),
            author: storeName,
            tags: Array.isArray(generatedContent.tags) && generatedContent.tags.length > 0 
              ? generatedContent.tags.join(",") 
              : topic,
            category: "Generated Content"
          });
          
          // Add to tracking arrays
          createdPosts.push(post);
          postIds.push(post.id);
          
          console.log(`Created post: ${post.id} - "${post.title}"`);
          
          // Try to sync to Shopify immediately
          try {
            await fetch(`http://localhost:5000/api/shopify/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ postIds: [post.id] })
            });
            console.log(`Post for "${topic}" synced to Shopify`);
          } catch (syncError) {
            console.error(`Error syncing post for "${topic}" to Shopify:`, syncError);
          }
          
        } catch (claudeError: any) {
          console.error(`Claude API error for topic "${topic}":`, claudeError);
          
          // Update request as failed
          await storage.updateContentGenRequest(contentRequest.id, {
            status: "failed",
            generatedContent: JSON.stringify({ 
              error: "Claude content generation failed: " + (claudeError?.message || String(claudeError))
            })
          });
        }
      } catch (topicError) {
        console.error(`Error processing topic "${topic}":`, topicError);
      }
    }
    
    // Return results
    res.json({
      success: true,
      totalTopics: topics.length,
      successful: createdPosts.length,
      posts: createdPosts
    });
    
  } catch (error: any) {
    console.error("Error in bulk generation endpoint:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Add a test route to check Claude API
contentRouter.get("/test-claude", async (req: Request, res: Response) => {
  try {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Claude API Key is missing");
      return res.status(500).json({
        success: false,
        error: "Claude API Key is missing",
        details: "API key environment variable is not set"
      });
    }
    
    // Log the API key status (masked for security)
    console.log(`Claude API Key status: Present (first 3 chars: ${process.env.ANTHROPIC_API_KEY.substring(0, 3)}...)`);
    
    // Test connection to Claude API
    const testResult = await testClaudeConnection();
    
    return res.json({ 
      success: testResult.success, 
      message: testResult.message,
      data: { 
        model: "claude-3-7-sonnet-20250219",
        status: testResult.success ? "success" : "error"
      }
    });
  } catch (error) {
    console.error("Claude API test failed:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Claude API test failed", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Enhanced bulk generation with comprehensive AdminPanel features
contentRouter.post("/generate-content/enhanced-bulk", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const reqSchema = z.object({
      topics: z.array(z.string().min(1)).min(1),
      formData: z.object({
        articleType: z.string().default("blog"),
        articleLength: z.string().default("medium"),
        headingsCount: z.string().default("3"),
        writingPerspective: z.string().default("first_person_plural"),
        toneOfVoice: z.string().default("friendly"),
        introType: z.string().default("search_intent"),
        faqType: z.string().default("short"),
        enableTables: z.boolean().default(true),
        enableLists: z.boolean().default(true),
        enableH3s: z.boolean().default(true),
        enableCitations: z.boolean().default(true),
        generateImages: z.boolean().default(true),
        postStatus: z.string().default("draft"),
        blogId: z.string().optional(),
        productIds: z.array(z.string()).default([]),
        collectionIds: z.array(z.string()).default([]),
        keywords: z.array(z.any()).default([]),
        buyerPersonas: z.string().optional(),
        authorId: z.string().optional(),
        categories: z.union([z.array(z.string()), z.string()]).default([]).transform((val) => 
          Array.isArray(val) ? val : [val]
        ),
        contentStyle: z.object({
          toneId: z.string().optional(),
          displayName: z.string().optional()
        }).optional(),
        customPrompt: z.string().optional()
      }),
      mediaContent: z.object({
        primaryImage: z.any().nullable(),
        secondaryImages: z.array(z.any()).default([]),
        youtubeEmbed: z.string().nullable()
      }).optional(),
      batchSize: z.number().default(5),
      simultaneousGeneration: z.boolean().default(false),
      isClusterMode: z.boolean().default(false),
      clusterTopic: z.string().optional()
    });
    
    const { topics, formData, mediaContent, batchSize, simultaneousGeneration, isClusterMode, clusterTopic } = reqSchema.parse(req.body);
    
    console.log(`Enhanced bulk generating content for ${topics.length} topics with advanced settings`);
    console.log(`Batch size: ${batchSize}, Simultaneous: ${simultaneousGeneration}, Cluster mode: ${isClusterMode}`);
    
    if (isClusterMode && clusterTopic) {
      console.log(`Generating cluster content around topic: "${clusterTopic}"`);
    }
    
    // Get store from request
    const storeFromRequest = await getStoreFromRequest(req);
    if (!storeFromRequest) {
      return res.status(400).json({
        success: false,
        error: "No connected Shopify store found"
      });
    }
    
    const results = [];
    
    // Process topics based on configuration
    if (simultaneousGeneration) {
      // Process topics in parallel batches
      console.log(`Processing ${topics.length} topics in parallel batches of ${batchSize}`);
      
      for (let i = 0; i < topics.length; i += batchSize) {
        const batch = topics.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} topics`);
        
        const batchPromises = batch.map(topic => 
          processEnhancedTopic(topic, formData, mediaContent, storeFromRequest, isClusterMode, clusterTopic, topics)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              topic: batch[index],
              status: "failed",
              error: result.reason?.message || "Unknown error in parallel processing"
            });
          }
        });
        
        // Add small delay between batches to avoid rate limits
        if (i + batchSize < topics.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } else {
      // Process topics sequentially 
      console.log(`Processing ${topics.length} topics sequentially`);
      
      for (const topic of topics) {
        try {
          const result = await processEnhancedTopic(topic, formData, mediaContent, storeFromRequest, isClusterMode, clusterTopic, topics);
          results.push(result);
          
          // Shorter delay for faster processing
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error processing topic "${topic}":`, error);
          results.push({
            topic,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }
    
    // Send response
    res.json({
      success: true,
      totalTopics: topics.length,
      successful: results.filter(r => r.status === "success").length,
      results
    });
    
  } catch (error: any) {
    console.error("Error in enhanced bulk generation endpoint:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Single topic generation endpoint for progressive updates
contentRouter.post("/generate-content/single-enhanced", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      topic: z.string().min(1),
      formData: z.object({
        articleType: z.string().default("blog"),
        articleLength: z.string().default("medium"),
        headingsCount: z.string().default("3"),
        writingPerspective: z.string().default("first_person_plural"),
        toneOfVoice: z.string().default("friendly"),
        introType: z.string().default("search_intent"),
        faqType: z.string().default("short"),
        enableTables: z.boolean().default(true),
        enableLists: z.boolean().default(true),
        enableH3s: z.boolean().default(true),
        enableCitations: z.boolean().default(true),
        generateImages: z.boolean().default(true),
        postStatus: z.string().default("draft"),
        blogId: z.string().optional(),
        productIds: z.array(z.string()).default([]),
        collectionIds: z.array(z.string()).default([]),
        keywords: z.array(z.any()).default([]),
        buyerPersonas: z.string().optional(),
        authorId: z.string().optional(),
        categories: z.union([z.array(z.string()), z.string()]).default([]).transform((val) => 
          Array.isArray(val) ? val : [val]
        ),
        contentStyle: z.object({
          toneId: z.string().optional(),
          displayName: z.string().optional()
        }).optional(),
        customPrompt: z.string().optional()
      }),
      mediaContent: z.object({
        primaryImage: z.any().nullable(),
        secondaryImages: z.array(z.any()).default([]),
        youtubeEmbed: z.string().nullable()
      }).optional(),
      isClusterMode: z.boolean().default(false),
      clusterTopic: z.string().optional(),
      allTopics: z.array(z.string()).default([])
    });
    
    const { topic, formData, mediaContent, isClusterMode, clusterTopic, allTopics } = reqSchema.parse(req.body);
    
    console.log(`Single enhanced generating content for topic: "${topic}"`);
    
    // Get store from request
    const storeFromRequest = await getStoreFromRequest(req);
    if (!storeFromRequest) {
      return res.status(400).json({
        success: false,
        error: "No connected Shopify store found"
      });
    }
    
    // Process the single topic
    const result = await processEnhancedTopic(topic, formData, mediaContent, storeFromRequest, isClusterMode, clusterTopic, allTopics);
    
    res.json({
      success: true,
      result
    });
    
  } catch (error: any) {
    console.error("Error in single enhanced generation endpoint:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Invalid request"
    });
  }
});

// Helper function to process a single topic with enhanced features
async function processEnhancedTopic(
  topic: string, 
  formData: any, 
  mediaContent: any, 
  store: any,
  isClusterMode: boolean = false,
  clusterTopic?: string,
  allTopics?: string[]
): Promise<any> {
  try {
    console.log(`Enhanced processing for topic: "${topic}"`);
    
    // Create content request record
    const contentRequest = await storage.createContentGenRequest({
      topic,
      tone: formData.toneOfVoice || "friendly",
      length: formData.articleLength || "medium",
      status: "pending",
      generatedContent: null
    });
    
    // Build enhanced prompt based on form data and cluster mode
    let enhancedPrompt = formData.customPrompt;
    
    if (!enhancedPrompt) {
      // Create comprehensive prompt based on form settings
      enhancedPrompt = buildEnhancedPrompt(topic, formData);
    } else {
      // Replace topic placeholder in custom prompt
      enhancedPrompt = enhancedPrompt.replace(/\[TOPIC\]/g, topic);
    }
    
    // Add cluster-specific instructions if in cluster mode
    if (isClusterMode && clusterTopic && allTopics) {
      const otherTopics = allTopics.filter(t => t !== topic);
      enhancedPrompt += `\n\nCLUSTER MODE INSTRUCTIONS:
      This article is part of a content cluster about "${clusterTopic}". 
      Create natural internal links to these related articles in your cluster: ${otherTopics.slice(0, 3).join(', ')}.
      Use phrases like "as we discussed in our guide to [topic]" or "learn more about [related topic] in our comprehensive guide".
      Ensure this article complements and references the other articles in the cluster while maintaining its unique focus on "${topic}".`;
    }
    
    // Include product and collection context if available
    if (formData.productIds?.length > 0 || formData.collectionIds?.length > 0) {
      enhancedPrompt += await buildProductContext(formData.productIds, formData.collectionIds, store);
    }
    
    // Add buyer persona context
    if (formData.buyerPersonas) {
      enhancedPrompt += `\n\nTarget audience: ${formData.buyerPersonas}`;
    }
    
    // Prepare products info for interlinking
    let productsInfo = [];
    if (formData.productIds && formData.productIds.length > 0) {
      try {
        const productsResponse = await fetch(`http://localhost:5000/api/admin/products`, {
          headers: { 'X-Store-ID': store.id.toString() }
        });
        const productsData = await productsResponse.json();
        productsInfo = productsData.products?.filter((p: any) => formData.productIds.includes(p.id)) || [];
        console.log(`📦 Loaded ${productsInfo.length} products for interlinking`);
      } catch (productError) {
        console.error('Error loading products for interlinking:', productError);
      }
    }

    try {
      console.log(`🎯 Generating content with Claude for topic: "${topic}"`);
      
      // Determine author before generation for attribution
      let authorData = null;
      if (formData.authorId) {
        try {
          const authors = await storage.getAuthors();
          const author = authors.find(a => a.id === formData.authorId);
          if (author) {
            authorData = {
              id: author.id,
              name: author.name || "Store Owner",
              description: author.description,
              profileImage: author.profileImage,
              linkedinUrl: author.linkedinUrl
            };
            console.log(`👤 BULK ROUTE - Found author for attribution: ${authorData.name}`);
          }
        } catch (error) {
          console.warn(`Could not fetch author ${formData.authorId}:`, error);
        }
      }

      // Generate content with dedicated bulk Claude service (same as admin panel)
      const generatedContent = await generateBulkContentWithClaude({
        topic,
        tone: formData.toneOfVoice || "friendly",
        length: formData.articleLength || "medium",
        customPrompt: enhancedPrompt,
        contentStyleDisplayName: formData.contentStyle?.displayName,
        contentStyleToneId: formData.contentStyle?.toneId,
        // Include all media content like admin panel
        primaryImage: mediaContent?.primaryImage || null,
        secondaryImages: mediaContent?.secondaryImages || [],
        youtubeEmbed: mediaContent?.youtubeEmbed || null,
        // Include product linking (convert productsInfo to the expected format)
        selectedProducts: productsInfo?.map((p: any) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          url: `https://${store.shopName}/products/${p.handle}`,
          imageUrl: p.image?.url
        })) || [],
        // Include collection context
        selectedCollections: [], // TODO: Map collections if needed
        // Include keywords
        keywords: formData.keywords || [],
        // Include audience targeting
        targetAudience: formData.buyerPersonas,
        buyerPersona: formData.buyerPersonas,
        // Include form-based settings
        articleType: formData.articleType,
        headingsCount: formData.headingsCount,
        writingPerspective: formData.writingPerspective,
        introType: formData.introType,
        faqType: formData.faqType,
        enableTables: formData.enableTables,
        enableLists: formData.enableLists,
        enableH3s: formData.enableH3s,
        enableCitations: formData.enableCitations,
        // CRITICAL: Include author attribution (matching AdminPanel functionality)
        authorId: formData.authorId,
        author: authorData
      });
      
      console.log(`Enhanced content generated for "${topic}". Title: "${generatedContent.title}"`);
      
      // Update request record
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
      // Use author name from previously fetched authorData
      const authorName = authorData?.name || "Store Owner";
      
      // Create blog post with enhanced settings including featured image and meta optimization
      const postData: any = {
        title: generatedContent.title,
        content: generatedContent.content || `# ${generatedContent.title}\n\nContent for ${topic}`,
        status: formData.postStatus || "draft",
        publishedDate: formData.postStatus === "published" ? new Date() : undefined,
        author: authorName,
        authorId: formData.authorId || null,
        tags: Array.isArray(generatedContent.tags) && generatedContent.tags.length > 0 
          ? generatedContent.tags.join(",") 
          : topic,
        category: formData.categories?.length > 0 ? formData.categories[0] : "Generated Content",
        // Include optimized meta fields (matching AdminPanel functionality)
        metaTitle: generatedContent.metaTitle || generatedContent.title,
        metaDescription: generatedContent.metaDescription || `Learn about ${topic} with this comprehensive guide.`
      };
      
      console.log(`📝 BULK META - Added optimized meta title: "${postData.metaTitle.substring(0, 50)}..."`);
      console.log(`📝 BULK META - Added optimized meta description: "${postData.metaDescription.substring(0, 50)}..."`);

      // Add featured image from primary image like admin panel
      if (mediaContent?.primaryImage) {
        if (typeof mediaContent.primaryImage === 'object' && mediaContent.primaryImage.url) {
          postData.featuredImage = mediaContent.primaryImage.url;
        } else if (typeof mediaContent.primaryImage === 'string') {
          postData.featuredImage = mediaContent.primaryImage;
        }
        console.log(`📸 Added featured image: ${postData.featuredImage}`);
      }

      const post = await storage.createBlogPost(postData);
      
      console.log(`Created enhanced post: ${post.id} - "${post.title}"`);
      
      // Publish to Shopify if status is published or draft (for immediate publishing)
      if (formData.postStatus === "published" || formData.postStatus === "draft") {
        try {
          console.log(`🚀 Publishing post "${post.title}" to Shopify...`);
          
          // Import ShopifyService 
          const { ShopifyService } = await import('../services/shopify');
          const shopifyService = new ShopifyService();
          
          // Initialize client for this store
          shopifyService.initializeClient(store);
          
          // Determine blog ID - use from formData or get default blog
          let blogId = formData.blogId;
          if (!blogId) {
            try {
              const blogs = await shopifyService.getBlogs(store);
              if (blogs && blogs.length > 0) {
                blogId = blogs[0].id.toString();
                console.log(`Using default blog ID: ${blogId}`);
              }
            } catch (blogError) {
              console.warn('Could not get blogs, will try without blog ID');
            }
          }
          
          // Create article in Shopify
          const shopifyArticle = await shopifyService.createArticle(
            store, 
            blogId, 
            post,
            formData.postStatus === "published" ? new Date() : undefined
          );
          
          // Update local post with Shopify details
          await storage.updateBlogPost(post.id, {
            shopifyPostId: shopifyArticle.id?.toString(),
            shopifyBlogId: blogId,
            shopifyHandle: shopifyArticle.handle || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            status: formData.postStatus === "published" ? "published" : "draft"
          });
          
          console.log(`✅ Successfully published to Shopify: ${shopifyArticle.id}`);
          
        } catch (shopifyError: any) {
          console.error(`❌ Failed to publish to Shopify for "${post.title}":`, shopifyError);
          // Don't fail the entire operation, just log the error
          console.warn('Post created locally but not published to Shopify');
        }
      }
      
      return {
        topic,
        postId: post.id,
        title: generatedContent.title,
        content: generatedContent.content,
        status: "success",
        usesFallback: false
      };
      
    } catch (aiError: any) {
      console.error(`AI generation error for topic "${topic}":`, aiError);
      
      // Update request as failed
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "failed",
        generatedContent: JSON.stringify({ 
          error: "AI generation failed: " + (aiError?.message || String(aiError))
        })
      });
      
      return {
        topic,
        status: "failed",
        error: "AI generation failed: " + (aiError?.message || String(aiError))
      };
    }
    
  } catch (error) {
    console.error(`Error in enhanced topic processing for "${topic}":`, error);
    return {
      topic,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown processing error"
    };
  }
}

// Build enhanced prompt based on form settings
function buildEnhancedPrompt(topic: string, formData: any): string {
  let prompt = `You are a professional ${formData.articleType || 'blog'} writer creating high-quality content for an e-commerce store. `;
  
  // Article type specific instructions
  switch (formData.articleType) {
    case 'guide':
      prompt += `Write a comprehensive step-by-step guide about ${topic}. `;
      break;
    case 'tutorial':
      prompt += `Create a detailed tutorial explaining how to ${topic}. `;
      break;
    case 'article':
      prompt += `Write an informative article about ${topic}. `;
      break;
    default:
      prompt += `Write a detailed, informative, and engaging blog post about ${topic}. `;
  }
  
  // Length specifications
  const lengthMap = {
    'short': '300-500 words',
    'medium': '500-800 words', 
    'long': '800-1200 words',
    'extended': '1200+ words'
  };
  prompt += `The content should be approximately ${lengthMap[formData.articleLength as keyof typeof lengthMap] || '500-800 words'}. `;
  
  // Tone and perspective
  prompt += `Write in a ${formData.toneOfVoice || 'friendly'} tone using ${formData.writingPerspective || 'first person plural'} perspective. `;
  
  // Structure requirements - prioritize word count over section count
  const headingsCount = parseInt(formData.headingsCount) || 3;
  prompt += `Include approximately ${headingsCount} main headings, but prioritize staying within the word count limit. Adjust section depth based on word count constraint. `;
  
  if (formData.enableTables) {
    prompt += `Include helpful tables where appropriate to organize information. `;
  }
  
  if (formData.enableLists) {
    prompt += `Use bullet points and numbered lists to improve readability. `;
  }
  
  if (formData.enableH3s) {
    prompt += `Include relevant H3 subheadings to further organize content. `;
  }
  
  // Introduction type
  switch (formData.introType) {
    case 'search_intent':
      prompt += `Start with an introduction that addresses the search intent behind "${topic}". `;
      break;
    case 'story':
      prompt += `Begin with a compelling story or anecdote related to ${topic}. `;
      break;
    case 'question':
      prompt += `Open with a thought-provoking question about ${topic}. `;
      break;
    default:
      prompt += `Include an attention-grabbing introduction. `;
  }
  
  // FAQ section
  if (formData.faqType && formData.faqType !== 'none') {
    const faqLength = formData.faqType === 'short' ? '3-5' : '5-8';
    prompt += `Include a FAQ section with ${faqLength} relevant questions and answers. `;
  }
  
  // Citations and credibility
  if (formData.enableCitations) {
    prompt += `Include credible sources and references where appropriate. `;
  }
  
  prompt += `Format the content with markdown, using # for the title, ## for major sections, and proper paragraph breaks. `;
  prompt += `Focus on providing value to readers interested in ${topic}.`;
  
  return prompt;
}

// Build product and collection context
async function buildProductContext(productIds: string[], collectionIds: string[], store: any): Promise<string> {
  let context = "";
  
  try {
    // Add product context
    if (productIds?.length > 0) {
      context += `\n\nRelated products to reference in the content: `;
      // In a real implementation, you would fetch product details from Shopify
      context += productIds.map(id => `Product ID: ${id}`).join(', ');
    }
    
    // Add collection context  
    if (collectionIds?.length > 0) {
      context += `\n\nRelated collections to reference: `;
      context += collectionIds.map(id => `Collection ID: ${id}`).join(', ');
    }
    
    if (context) {
      context = `\n\nPlease naturally incorporate references to these products/collections where relevant in the content.` + context;
    }
  } catch (error) {
    console.warn("Error building product context:", error);
  }
  
  return context;
}

// Generate cluster titles endpoint
contentRouter.post("/generate-content/cluster-titles", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      clusterTopic: z.string().min(3),
      keywords: z.array(z.string()).default([]),
      count: z.number().min(1).max(20).default(10),
      productIds: z.array(z.string()).default([]),
      collectionIds: z.array(z.string()).default([])
    });
    
    const { clusterTopic, keywords, count } = reqSchema.parse(req.body);
    
    console.log(`Generating cluster titles for topic: "${clusterTopic}"`);
    
    // Get store from request
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: "No connected store found. Please connect a Shopify store first."
      });
    }
    
    // Check if user can generate content
    const { canGenerate, message, availableCredits } = await canGenerateContentWithCredits(store.id);
    if (!canGenerate) {
      return res.status(403).json({
        success: false,
        error: message || "Cannot generate content at this time",
        availableCredits
      });
    }
    
    // Generate cluster titles using Claude
    const titles = await generateClusterTitles(clusterTopic, keywords, count);
    
    // Consume credits for the title generation (minimal consumption for title generation)
    await consumeUsageForContentGeneration(store.id, true);
    
    res.json({
      success: true,
      titles,
      count: titles.length,
      topic: clusterTopic
    });
    
  } catch (error: any) {
    console.error("Error generating cluster titles:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate cluster titles",
      message: error?.message || String(error)
    });
  }
});

export default contentRouter;