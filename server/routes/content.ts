import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertContentGenRequestSchema } from "@shared/schema";
import { generateBlogContentWithClaude, testClaudeConnection } from "../services/claude";

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
    
    // Create a record of the content generation request
    const contentRequest = await storage.createContentGenRequest({
      topic,
      tone: customPrompt ? "custom" : "professional", // Using tone field to track if custom prompt was used
      length: "medium", // Default length
      status: "pending",
      generatedContent: null
    });
    
    try {
      // Generate content with Claude as the primary service
      console.log(`Generating content with Claude for topic: "${topic}"`);
      
      const generatedContent = await generateBlogContentWithClaude(
        topic,
        [], // keywords
        customPrompt || "",
        "", // productName
        "" // productDescription
      );
      
      // Log the returned content (truncated for readability)
      console.log(`Claude content generated successfully. Title: "${generatedContent.title}", Content length: ${generatedContent.content ? generatedContent.content.length : 0} characters`);
      
      // Update content generation request to completed
      const updatedRequest = await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
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
          const generatedContent = await generateBlogContentWithClaude(
            topic,
            [], // keywords
            topicPrompt, // customPrompt
            "", // productName
            "" // productDescription 
          );
          
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
          const generatedContent = await generateBlogContentWithClaude(
            topic,
            [], // keywords
            topicPrompt || "",
            "", // productName
            "" // productDescription
          );
          
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
    const isConnected = await testClaudeConnection();
    
    return res.json({ 
      success: isConnected, 
      message: isConnected ? "Claude API connection successful" : "Claude API connection failed",
      data: { 
        model: "claude-3-7-sonnet-20250219",
        status: isConnected ? "success" : "error"
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

export default contentRouter;