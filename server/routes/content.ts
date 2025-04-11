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
      try {
        const generatedContent = await generateBlogContent(topic, customPrompt);
        
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
        return;
      } catch (openAiError: any) {
        console.error("OpenAI content generation error:", openAiError);
        
        // Check if this is a quota error with OpenAI
        if (openAiError.status === 429 || 
            (openAiError.error && openAiError.error.type === 'insufficient_quota')) {
          console.log("OpenAI quota exceeded, falling back to HuggingFace");
          
          // Import the HuggingFace generator
          const { generateBlogContentWithHF } = require("../services/huggingface");
          
          try {
            // Fall back to HuggingFace when OpenAI fails
            const hfContent = await generateBlogContentWithHF({
              topic: topic,
              tone: "professional",
              length: "medium"
            });
            
            // Update content generation request to completed
            const updatedRequest = await storage.updateContentGenRequest(contentRequest.id, {
              status: "completed",
              generatedContent: JSON.stringify(hfContent),
              provider: "huggingface"
            });
            
            res.json({ 
              success: true, 
              requestId: updatedRequest?.id,
              ...hfContent,
              fallbackUsed: true
            });
            return;
          } catch (hfError) {
            console.error("HuggingFace fallback also failed:", hfError);
            throw openAiError; // Re-throw the original error
          }
        } else {
          throw openAiError; // Re-throw the error if it's not a quota issue
        }
      }
    } catch (aiError: any) {
      console.error("Content generation error:", aiError);
      
      // Update content generation request to failed
      await storage.updateContentGenRequest(contentRequest.id, {
        status: "failed",
        generatedContent: JSON.stringify({ error: aiError.message })
      });
      
      // Provide user-friendly error response
      const errorMessage = aiError?.message || "Failed to generate content";
      res.status(500).json({ 
        success: false, 
        error: errorMessage
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
      // Generate content for each topic
      const results = await bulkGenerateBlogContent(topics, effectivePrompt);
      
      // Create blog posts from generated content
      const createdPosts = [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const topic = topics[i];
        
        try {
          // Create a blog post
          const post = await storage.createBlogPost({
            title: result.title,
            content: result.content,
            status: "published", // Automatically publish
            publishedDate: new Date(),
            author: "Bulk Generation",
            tags: Array.isArray(result.tags) && result.tags.length > 0 
              ? result.tags.join(",") 
              : `${topic},Educational,How-To Guide,Bulk Generated`,
            category: "Educational"
          });
          
          createdPosts.push(post);
          
          console.log(`Created post: ${post.id} - "${post.title}"`);
        } catch (createError) {
          console.error(`Error creating post for topic "${topic}":`, createError);
        }
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