import { Router, Request, Response } from 'express';
import { generateCluster } from '../services/claude';

const router = Router();

// Generate a topic cluster using Claude AI
router.post('/cluster', async (req: Request, res: Response) => {
  try {
    const { topic, productName, productDescription, keywords } = req.body;
    
    if (!topic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Topic is required for cluster generation' 
      });
    }
    
    // Generate content cluster using Claude
    const clusterData = await generateCluster(
      topic,
      productName,
      productDescription,
      keywords
    );
    
    // Return the generated cluster
    return res.status(200).json({
      success: true,
      cluster: clusterData
    });
    
  } catch (error) {
    console.error('Error generating topic cluster:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate topic cluster',
      error: (error as Error).message
    });
  }
});

export default router;