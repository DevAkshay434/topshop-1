import { Request, Response, Router } from 'express';
import { generateSinglePost, generateContentCluster, generateTopicSuggestions } from '../services/claude-content';

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

/**
 * Generate topic suggestions using Claude AI
 */
claudeContentRouter.post('/topic-suggestions', async (req: Request, res: Response) => {
  try {
    const { keywords = [], products = [], collections = [], contentType = 'blog' } = req.body;

    if (keywords.length === 0 && products.length === 0 && collections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one keyword, product, or collection is required'
      });
    }

    const result = await generateTopicSuggestions(keywords, products, collections, contentType);
    return res.json(result);
  } catch (error) {
    console.error('Error generating topic suggestions with Claude:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating topic suggestions with Claude AI'
    });
  }
});

export default claudeContentRouter;