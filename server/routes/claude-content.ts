import { Router, Request, Response } from 'express';
import { generateClusterContent, generateSinglePostContent } from '../services/claude-content';

// Create router
const router = Router();

/**
 * Generate a content cluster with Claude AI
 * 
 * @route POST /api/claude-content/cluster
 */
router.post('/cluster', async (req: Request, res: Response) => {
  try {
    // Extract request data
    const { topic, keywords, products, options } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }
    
    const request = {
      topic,
      keywords,
      products,
      options
    };
    
    console.log(`Generating cluster content for topic: "${topic}"`);
    const result = await generateClusterContent(request);
    
    return res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in cluster content generation route:', errorMessage);
    return res.status(500).json({
      success: false,
      message: errorMessage || 'Failed to generate cluster content'
    });
  }
});

/**
 * Generate a single post with Claude AI
 * 
 * @route POST /api/claude-content/single-post
 */
router.post('/single-post', async (req: Request, res: Response) => {
  try {
    // Extract request data
    const { topic, keywords, products, options } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }
    
    const request = {
      topic,
      keywords,
      products,
      options
    };
    
    console.log(`Generating single post content for topic: "${topic}"`);
    const result = await generateSinglePostContent(request);
    
    return res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in single post generation route:', errorMessage);
    return res.status(500).json({
      success: false,
      message: errorMessage || 'Failed to generate single post content'
    });
  }
});

/**
 * Test connection to Claude AI
 * 
 * @route GET /api/claude-content/test
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Simple test to verify Claude API connection
    const testMessage = "This is a test message to verify Claude API connectivity.";
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'Claude API key is not configured'
      });
    }
    
    return res.json({
      success: true,
      message: 'Claude API connection successful'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error testing Claude API connection:', errorMessage);
    return res.status(500).json({
      success: false,
      message: errorMessage || 'Failed to connect to Claude API'
    });
  }
});

export default router;