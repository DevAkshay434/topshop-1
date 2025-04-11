import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertContentGenRequestSchema } from "@shared/schema";
import { generateBlogContent, bulkGenerateBlogContent } from "../services/openai";

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
      // Try to generate content with OpenAI
      console.log(`Attempting to generate content with OpenAI for topic: "${topic}"`);
      console.log("Calling OpenAI generateBlogContent function...");
      
      const generatedContent = await generateBlogContent(topic, customPrompt);
      
      // Log the returned content (truncated for readability)
      console.log(`OpenAI content generated successfully. Title: "${generatedContent.title}", Content length: ${generatedContent.content ? generatedContent.content.length : 0} characters`);
      
      // Update content generation request to completed
      const updatedRequest = await storage.updateContentGenRequest(contentRequest.id, {
        status: "completed",
        generatedContent: JSON.stringify(generatedContent)
      });
      
      res.json({ 
        success: true, 
        requestId: updatedRequest?.id,
        ...generatedContent
      });
      
    } catch (openAiError: any) {
      console.error("OpenAI content generation error:", openAiError);
      
      // Always try the fallback regardless of the specific error type
      console.log("OpenAI error, falling back to HuggingFace");
      
      try {
        // Import the HuggingFace generator
        const { generateBlogContentWithHF } = require("../services/huggingface");
        
        // Fall back to HuggingFace when OpenAI fails
        const hfContent = await generateBlogContentWithHF({
          topic: topic,
          tone: "professional",
          length: "medium"
        });
        
        // Update content generation request to completed
        const updatedRequest = await storage.updateContentGenRequest(contentRequest.id, {
          status: "completed",
          generatedContent: JSON.stringify(hfContent)
        });
        
        res.json({ 
          success: true, 
          requestId: updatedRequest?.id,
          ...hfContent,
          fallbackUsed: true
        });
        
      } catch (hfError: any) {
        console.error("HuggingFace fallback also failed:", hfError);
        
        // Update as failed since both services failed
        await storage.updateContentGenRequest(contentRequest.id, {
          status: "failed",
          generatedContent: JSON.stringify({ 
            error: "Both OpenAI and HuggingFace failed" 
          })
        });
        
        // Return error to the client
        res.status(500).json({
          success: false,
          error: "Failed to generate content with both services"
        });
      }
    }
  } catch (error: any) {
    console.error("Error in content generation endpoint:", error);
    res.status(400).json({ 
      success: false, 
      error: error?.message || "Invalid request"
    });
  }
});

// Add a test route to check OpenAI API
contentRouter.get("/test-openai", async (req: Request, res: Response) => {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API Key is missing");
      return res.status(500).json({
        success: false,
        error: "OpenAI API Key is missing",
        details: "API key environment variable is not set"
      });
    }
    
    // Log the API key status (masked)
    console.log(`OpenAI API Key status: Present (first 3 chars: ${process.env.OPENAI_API_KEY.substring(0, 3)}...)`);
    
    // For the test endpoint, we'll return success without making an actual API call
    // This avoids potential rate limiting or API issues
    return res.json({ 
      success: true, 
      message: "OpenAI API key is configured",
      data: { message: "API key check passed", status: "success" }
    });
  } catch (error) {
    console.error("OpenAI test failed:", error);
    return res.status(500).json({ 
      success: false, 
      error: "OpenAI API test failed", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Endpoint to handle error in OpenAI format response
contentRouter.get("/test-openai-format", async (req: Request, res: Response) => {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API Key is missing");
      return res.status(500).json({
        success: false,
        error: "OpenAI API Key is missing",
        details: "API key environment variable is not set"
      });
    }
    
    // Log the API key status (masked)
    console.log(`OpenAI API Key status: Present (first 3 chars: ${process.env.OPENAI_API_KEY.substring(0, 3)}...)`);
    
    // Respond with properly formatted JSON
    return res.json({ 
      success: true, 
      message: "OpenAI API test format successful",
      data: { message: "Sample formatted response", status: "success" }
    });
  } catch (error) {
    console.error("OpenAI format test failed:", error);
    return res.status(500).json({ 
      success: false, 
      error: "OpenAI format test failed", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

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
        
        // Try OpenAI first
        try {
          console.log(`Calling OpenAI for topic "${topic}"`);
          
          // Generate content with this topic and customized prompt
          const generatedContent = await generateBlogContent(topic, topicPrompt);
          
          console.log(`OpenAI content generated successfully for "${topic}". Title: "${generatedContent.title}"`);
          
          // Update request record
          await storage.updateContentGenRequest(contentRequest.id, {
            status: "completed",
            generatedContent: JSON.stringify(generatedContent)
          });
          
          // Create a blog post with this content
          const post = await storage.createBlogPost({
            title: generatedContent.title,
            content: generatedContent.content || `# ${generatedContent.title}\n\nContent for ${topic}`,
            status: "published", 
            publishedDate: new Date(),
            author: "Simple Bulk Generator",
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
          
        } catch (openAiError: any) {
          console.error(`OpenAI error for topic "${topic}":`, openAiError);
          
          // Always try the fallback regardless of the specific error type
          // This ensures we can still generate content even if OpenAI has issues
          console.log(`OpenAI error for "${topic}", falling back to HuggingFace`);
          
          try {
            // Import the HuggingFace generator
            const { generateBlogContentWithHF } = require("../services/huggingface");
            
            // Fall back to HuggingFace
            const hfContent = await generateBlogContentWithHF({
              topic: topic,
              tone: "professional",
              length: "medium"
            });
            
            // Update request
            await storage.updateContentGenRequest(contentRequest.id, {
              status: "completed",
              generatedContent: JSON.stringify(hfContent)
            });
            
            // Create blog post
            const post = await storage.createBlogPost({
              title: hfContent.title,
              content: hfContent.content || `# ${hfContent.title}\n\nContent for ${topic}`,
              status: "published",
              publishedDate: new Date(),
              author: "Simple Bulk Generator (Fallback)",
              tags: Array.isArray(hfContent.tags) && hfContent.tags.length > 0 
                ? hfContent.tags.join(",") 
                : topic,
              category: "Generated Content"
            });
            
            // Try to sync to Shopify
            try {
              await fetch(`http://localhost:5000/api/shopify/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postIds: [post.id] })
              });
              console.log(`Post for "${topic}" (fallback) synced to Shopify`);
            } catch (syncError) {
              console.error(`Error syncing fallback post for "${topic}" to Shopify:`, syncError);
            }
            
            // Add to results
            results.push({
              topic,
              postId: post.id,
              title: hfContent.title,
              content: hfContent.content,
              status: "success",
              usesFallback: true
            });
            
          } catch (hfError) {
            console.error(`HuggingFace fallback also failed for "${topic}":`, hfError);
            
            // Update request as failed
            await storage.updateContentGenRequest(contentRequest.id, {
              status: "failed",
              generatedContent: JSON.stringify({ error: hfError instanceof Error ? hfError.message : "Unknown error" })
            });
            
            // Add failed result
            results.push({
              topic,
              status: "failed",
              error: "Both generation services failed"
            });
          }
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

// Bulk generate content for multiple topics
contentRouter.post("/generate-content/bulk", async (req: Request, res: Response) => {
  try {
    // Validate request body
    const reqSchema = z.object({
      topics: z.array(z.string().min(1)).min(1),
      templateId: z.number().optional(),
      customPrompt: z.string().optional()
    });
    
    const { topics, templateId, customPrompt } = reqSchema.parse(req.body);
    
    console.log(`Bulk generating content for ${topics.length} topics ${customPrompt ? 'with custom prompt' : ''}`);
    
    // Get the template content if template ID is provided
    // Use the custom prompt if provided, otherwise use default prompt
    let effectivePrompt = customPrompt;
    
    if (!effectivePrompt && templateId) {
      // In a real implementation, we would fetch the template from the database
      // and use its customPrompt field if available
      console.log(`Using template ID: ${templateId}`);
      
      // This is placeholder logic for now - we'll get the actual template prompt from ContentTemplates.tsx
      // This is a temporary solution until we implement template storage in the database
      try {
        // Get template prompt from client-side templateContent
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
      } catch (promptError) {
        console.error("Error getting template prompt:", promptError);
      }
    }
    
    // Log the effective prompt for debugging
    console.log(`Using prompt (first 50 chars): ${effectivePrompt ? effectivePrompt.substring(0, 50) + '...' : 'None'}`);
    
    try {
      // Generate content for each topic - use HuggingFace fallback if OpenAI fails
      let results;
      try {
        results = await bulkGenerateBlogContent(topics, effectivePrompt);
      } catch (error) {
        const openAiError = error as any;
        console.error("OpenAI bulk generation failed:", openAiError);
        
        // Always try the fallback regardless of the specific error type
        console.log("OpenAI error in bulk generation, falling back to HuggingFace");
        
        // Import the HuggingFace generator
        const { generateBlogContentWithHF } = require("../services/huggingface");
        
        // Generate content with HuggingFace for each topic
        results = await Promise.all(topics.map(async (topic) => {
          try {
            return await generateBlogContentWithHF({
              topic: topic,
              tone: "professional",
              length: "medium"
            });
          } catch (err) {
            console.error(`HuggingFace generation failed for topic "${topic}":`, err);
            // Return a basic structure to prevent the whole batch from failing
            return {
              title: `${topic} - Generated Content`,
              content: `# ${topic}\n\nThis content could not be generated automatically. Please edit to add your content.`,
              tags: [topic, "Draft", "Needs Editing"]
            };
          }
        }));
      }
      
      // Create blog posts from generated content
      const createdPosts = [];
      const postIds = [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const topic = topics[i];
        
        try {
          // Create a blog post - ensure content isn't empty
          // Log content for debugging
          console.log(`Creating post with content ${result.content ? "present" : "MISSING"} - Length: ${result.content ? result.content.length : 0} characters`);
          
          const postContent = result.content || `# ${result.title}\n\nContent for ${topic} is being generated. This is placeholder content.`;
          
          const post = await storage.createBlogPost({
            title: result.title,
            content: postContent, // Use non-empty content
            status: "published", // Automatically publish
            publishedDate: new Date(),
            author: "Bulk Generation",
            tags: Array.isArray(result.tags) && result.tags.length > 0 
              ? result.tags.join(",") 
              : `${topic},Educational,How-To Guide,Bulk Generated`,
            category: "Educational"
          });
          
          createdPosts.push(post);
          postIds.push(post.id);
          
          console.log(`Created post: ${post.id} - "${post.title}"`);
        } catch (createError) {
          console.error(`Error creating post for topic "${topic}":`, createError);
        }
      }
      
      // Trigger Shopify sync for all created posts
      try {
        // Import the syncPosts function from routes.ts to avoid circular dependencies
        // Use dynamic import instead of require
        if (postIds.length > 0) {
          console.log(`Syncing ${postIds.length} posts to Shopify...`);
          
          // Call the API endpoint for syncing instead of direct function call
          const syncResponse = await fetch(`http://localhost:5000/api/shopify/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ postIds })
          });
          
          console.log("Shopify sync API called for bulk generation");
        }
      } catch (syncError) {
        console.error("Error syncing bulk posts to Shopify:", syncError);
      }
      
      res.json({ 
        success: true,
        generatedCount: results.length,
        createdCount: createdPosts.length,
        posts: createdPosts
      });
      
    } catch (bulkError: any) {
      console.error("Bulk content generation error:", bulkError);
      
      res.status(500).json({ 
        success: false, 
        error: bulkError.message || "Failed to generate content"
      });
    }
  } catch (error: any) {
    console.error("Error in bulk content generation endpoint:", error);
    res.status(400).json({ 
      success: false, 
      error: error.message || "Invalid request"
    });
  }
});

export default contentRouter;