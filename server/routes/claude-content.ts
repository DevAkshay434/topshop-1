import { Request, Response, Router } from 'express';
import { generateSinglePost, generateContentCluster } from '../services/claude-content';

// Create a router for Claude content-related routes
const claudeContentRouter = Router();

/**
 * Generate a single blog post using Claude AI
 */
claudeContentRouter.post('/single', async (req: Request, res: Response) => {
  try {
    const { topic, keywords = [], products = [], options = {} } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const result = await generateSinglePost(topic, keywords, products, options);
    return res.json(result);
  } catch (error) {
    console.error('Error generating single post with Claude:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating content with Claude AI'
    });
  }
});

/**
 * Generate a content cluster using Claude AI
 */
claudeContentRouter.post('/cluster', async (req: Request, res: Response) => {
  try {
    const { topic, keywords = [], products = [], options = {} } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const result = await generateContentCluster(topic, keywords, products, options);
    return res.json(result);
  } catch (error) {
    console.error('Error generating content cluster with Claude:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating content cluster with Claude AI'
    });
  }
});

export default claudeContentRouter;