import { Router, Request, Response } from 'express';
import { generateCluster } from '../services/claude';

const router = Router();

// Generate a topic cluster using Claude AI
router.post('/cluster', async (req: Request, res: Response) => {
  try {
    const { 
      topic, 
      products, 
      keywords,
      options
    } = req.body;
    
    if (!topic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Topic is required for cluster generation' 
      });
    }
    
    console.log(`Generating cluster for topic: "${topic}" with ${products?.length || 0} products and ${keywords?.length || 0} keywords`);
    
    // Extract product information for Claude
    let productName = '';
    let productDescription = '';
    
    if (products && products.length > 0) {
      const mainProduct = products[0];
      productName = mainProduct.title || '';
      productDescription = mainProduct.description || '';
      
      // If there are multiple products, append them to the description
      if (products.length > 1) {
        productDescription += ` Additional products: ${products.slice(1).map((p: {title: string}) => p.title).join(', ')}`;
      }
    }
    
    // Format options for prompt construction
    const promptOptions = options || {};
    console.log('Formatting options:', JSON.stringify(promptOptions));
    
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