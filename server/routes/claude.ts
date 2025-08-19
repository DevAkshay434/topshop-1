import { Router, Request, Response } from "express";
import { generateBlogContentWithClaude, testClaudeConnection } from "../services/claude";
import { z } from "zod";

const claudeRouter = Router();

// Test Claude integration directly
claudeRouter.get("/test", async (_req: Request, res: Response) => {
  try {
    // Check if Claude API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ 
        success: false, 
        error: "Claude API key is not configured"
      });
    }
    
    // Test the connection
    const testResult = await testClaudeConnection();
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      model: "claude-3-7-sonnet-20250219"
    });
  } catch (error) {
    console.error("Claude test route error:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Generate content using Claude directly
claudeRouter.post("/generate", async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const schema = z.object({
      topic: z.string().min(1),
      tone: z.string().default("professional"),
      length: z.string().default("medium"),
      customPrompt: z.string().optional(),
      authorId: z.string().optional()
    });
    
    const { topic, tone, length, customPrompt, authorId } = schema.parse(req.body);
    
    console.log(`Generating content with Claude for topic: "${topic}"`);
    if (authorId) {
      console.log(`Including author ID: ${authorId} in content generation`);
    }
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ 
        success: false, 
        error: "Claude API key is not configured"
      });
    }
    
    // Generate content
    const content = await generateBlogContentWithClaude({
      topic,
      tone,
      length,
      customPrompt,
      authorId
    });
    
    res.json({
      success: true,
      model: "claude-3-7-sonnet-20250219",
      content
    });
  } catch (error) {
    console.error("Claude generation error:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default claudeRouter;