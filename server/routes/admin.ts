import { Router, Request, Response } from 'express';
import axios from 'axios';
import { storage } from '../storage';
import { shopifyService } from '../services/shopify';
import { dataSEOService } from '../services/dataseo';
import { pexelsService } from '../services/pexels';
import { pixabayService } from '../services/pixabay';

const router = Router();

// Get products from connected Shopify store
router.get('/products', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId ? Number(req.query.storeId) : undefined;
    let products: any[] = [];
    
    // Get the store
    let store: any;
    if (storeId) {
      store = await storage.getShopifyStore(storeId);
    } else {
      const conn = await storage.getShopifyConnection();
      if (conn) {
        store = {
          id: conn.id,
          shopName: conn.storeName,
          accessToken: conn.accessToken,
          scope: '',
          defaultBlogId: conn.defaultBlogId || '',
          isConnected: conn.isConnected,
          lastSynced: conn.lastSynced,
          installedAt: new Date(),
          uninstalledAt: null,
          planName: null,
          chargeId: null,
          trialEndsAt: null
        };
      }
    }
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No active Shopify store found'
      });
    }
    
    // Get products from Shopify
    try {
      const shopifyProducts = await shopifyService.getProducts(store);
      products = shopifyProducts.map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.body_html,
        image: product.image ? product.image : null,
        variants: product.variants,
        tags: product.tags,
        createdAt: product.created_at,
        updatedAt: product.updated_at
      }));
    } catch (error) {
      console.error('Error fetching products from Shopify:', error);
    }
    
    return res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error in admin/products route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: (error as Error).message
    });
  }
});

// Get collections from connected Shopify store
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId ? Number(req.query.storeId) : undefined;
    let collections = [];
    
    // Get the store
    let store: any;
    if (storeId) {
      store = await storage.getShopifyStore(storeId);
    } else {
      const conn = await storage.getShopifyConnection();
      if (conn) {
        store = {
          id: conn.id,
          shopName: conn.storeName,
          accessToken: conn.accessToken,
          scope: '',
          defaultBlogId: conn.defaultBlogId || '',
          isConnected: conn.isConnected,
          lastSynced: conn.lastSynced,
          installedAt: new Date(),
          uninstalledAt: null,
          planName: null,
          chargeId: null,
          trialEndsAt: null
        };
      }
    }
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No active Shopify store found'
      });
    }
    
    // Get collections from Shopify
    try {
      // Get custom collections
      const customCollections = await shopifyService.getCollections(store, 'custom');
      const formattedCustom = customCollections.map((collection: any) => ({
        id: collection.id,
        title: collection.title,
        description: collection.body_html,
        image: collection.image ? collection.image : null,
        handle: collection.handle,
        productsCount: collection.products_count || 0,
        updatedAt: collection.updated_at
      }));
      
      // Get smart collections
      const smartCollections = await shopifyService.getCollections(store, 'smart');
      const formattedSmart = smartCollections.map((collection: any) => ({
        id: collection.id,
        title: collection.title,
        description: collection.body_html,
        image: collection.image ? collection.image : null,
        handle: collection.handle,
        productsCount: collection.products_count || 0,
        updatedAt: collection.updated_at,
        isSmartCollection: true
      }));

      // Combine both collection types
      collections = [...formattedCustom, ...formattedSmart];
      
    } catch (error) {
      console.error('Error fetching collections from Shopify:', error);
    }
    
    return res.status(200).json({
      success: true,
      collections
    });
  } catch (error) {
    console.error('Error in admin/collections route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch collections',
      error: (error as Error).message
    });
  }
});

// Get blogs from connected Shopify store
router.get('/blogs', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId ? Number(req.query.storeId) : undefined;
    let blogs: any[] = [];
    
    // Get the store
    let store: any;
    if (storeId) {
      store = await storage.getShopifyStore(storeId);
    } else {
      const conn = await storage.getShopifyConnection();
      if (conn) {
        store = {
          id: conn.id,
          shopName: conn.storeName,
          accessToken: conn.accessToken,
          scope: '',
          defaultBlogId: conn.defaultBlogId || '',
          isConnected: conn.isConnected,
          lastSynced: conn.lastSynced,
          installedAt: new Date(),
          uninstalledAt: null,
          planName: null,
          chargeId: null,
          trialEndsAt: null
        };
      }
    }
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No active Shopify store found'
      });
    }
    
    // Get blogs from Shopify
    try {
      const shopifyBlogs = await shopifyService.getBlogs(store);
      blogs = shopifyBlogs;
    } catch (error) {
      console.error('Error fetching blogs from Shopify:', error);
    }
    
    return res.status(200).json({
      success: true,
      blogs
    });
  } catch (error) {
    console.error('Error in admin/blogs route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: (error as Error).message
    });
  }
});

// Generate keywords for products or collections using DataSEO API
router.post('/keywords-for-product', async (req: Request, res: Response) => {
  try {
    const requestBody = req.body;
    console.log("Keywords request body type:", typeof requestBody);
    console.log("Keywords request body:", JSON.stringify(requestBody, null, 2));
    
    // Ensure we have a valid request body as an object
    if (!requestBody || typeof requestBody !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      });
    }
    
    const { products, collections } = requestBody;
    
    // Check if we have either products or collections
    const hasProducts = products && Array.isArray(products) && products.length > 0;
    const hasCollections = collections && Array.isArray(collections) && collections.length > 0;
    
    console.log(`hasProducts: ${hasProducts}, hasCollections: ${hasCollections}`);
    
    if (!hasProducts && !hasCollections) {
      return res.status(400).json({
        success: false,
        error: 'A valid array of products or collections is required'
      });
    }
    
    let contentItems = [];
    let contentType = '';
    
    // Process content based on what was provided
    if (hasProducts) {
      contentType = 'products';
      contentItems = products.map((product: any) => ({
        title: product.title,
        description: product.description || ''
      }));
    } else if (hasCollections) {
      contentType = 'collections';
      contentItems = collections.map((collection: any) => ({
        title: collection.title,
        description: collection.description || ''
      }));
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to process content items'
      });
    }
    
    // Generate seed keywords from content titles
    const seedKeywords = contentItems
      .map(item => {
        // Extract main keywords from title and description
        const titleParts = item.title.split(' ').filter((word: string) => word.length > 3);
        const descParts = item.description 
          ? item.description.split(' ').filter((word: string) => word.length > 3) 
          : [];
        
        // Use title parts as primary keywords, add unique description words
        const combined = [...titleParts];
        descParts.forEach((word: string) => {
          if (!combined.includes(word)) {
            combined.push(word);
          }
        });
        
        // Return up to 5 seed keywords per item
        return combined.slice(0, 5);
      })
      .flat()
      .filter((keyword: string, index: number, self: string[]) => 
        // Remove duplicates
        self.indexOf(keyword) === index
      )
      .slice(0, 10); // Limit to 10 seed keywords
    
    console.log(`Generated seed keywords for ${contentType}:`, seedKeywords);
    
    try {
      // Use our DataSEO service to get comprehensive keywords
      const keywords = await dataSEOService.getComprehensiveKeywords(seedKeywords, 150);
      
      return res.status(200).json({
        success: true,
        keywords,
        message: `Generated ${keywords.length} keywords for ${contentType}`,
        contentType
      });
      
    } catch (apiError) {
      console.error('DataSEO API error:', apiError);
      
      // If DataSEO service fails, use the fallback method built into the service
      const combinedText = contentItems.map(item => `${item.title}. ${item.description}`).join(' ');
      const fallbackKeywords = generateFallbackKeywords(combinedText);
      
      return res.status(200).json({
        success: true,
        keywords: fallbackKeywords,
        message: `Using fallback keywords for ${contentType} due to API error`,
        contentType
      });
    }
    
  } catch (error) {
    console.error(`Error generating keywords:`, error);
    return res.status(500).json({
      success: false,
      message: `Failed to generate keywords`,
      error: (error as Error).message
    });
  }
});

// Image search with Pexels API
router.get('/image-search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid search query is required'
      });
    }
    
    const pexelsApiKey = process.env.PEXELS_API_KEY || '';
    
    try {
      const response = await axios.get(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`,
        {
          headers: {
            'Authorization': pexelsApiKey
          }
        }
      );
      
      if (response.data && response.data.photos) {
        const images = response.data.photos.map((photo: any) => ({
          id: photo.id,
          url: photo.src.medium,
          large_url: photo.src.large,
          original_url: photo.src.original,
          width: photo.width,
          height: photo.height,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          source: 'pexels'
        }));
        
        return res.status(200).json({
          success: true,
          images
        });
      } else {
        throw new Error('No images found');
      }
    } catch (pexelsError) {
      console.error('Pexels API error:', pexelsError);
      
      // Try Pixabay as a fallback
      try {
        const pixabayApiKey = process.env.PIXABAY_API_KEY || '';
        
        const pixabayResponse = await axios.get(
          `https://pixabay.com/api/?key=${pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=15`,
        );
        
        if (pixabayResponse.data && pixabayResponse.data.hits) {
          const images = pixabayResponse.data.hits.map((image: any) => ({
            id: image.id,
            url: image.webformatURL,
            large_url: image.largeImageURL,
            original_url: image.imageURL || image.largeImageURL,
            width: image.imageWidth,
            height: image.imageHeight,
            photographer: image.user,
            photographer_url: `https://pixabay.com/users/${image.user}-${image.user_id}/`,
            source: 'pixabay'
          }));
          
          return res.status(200).json({
            success: true,
            images,
            source: 'pixabay'
          });
        } else {
          throw new Error('No images found in Pixabay');
        }
      } catch (pixabayError) {
        console.error('Pixabay API error:', pixabayError);
        throw new Error('Failed to fetch images from both Pexels and Pixabay');
      }
    }
    
  } catch (error) {
    console.error('Error searching for images:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search for images',
      error: (error as Error).message
    });
  }
});

// Generate fallback keywords when API fails
function generateFallbackKeywords(text: string): Array<{ keyword: string, score: number, volume: string, difficulty: number }> {
  // Extract potential keywords from text
  const words = text.toLowerCase().split(/\s+/);
  const phrases: { [key: string]: number } = {};
  
  // Generate single word and two-word phrases
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z0-9]/g, '');
    if (word.length > 3) {
      phrases[word] = (phrases[word] || 0) + 1;
      
      if (i < words.length - 1) {
        const nextWord = words[i + 1].replace(/[^a-z0-9]/g, '');
        if (nextWord.length > 3) {
          const twoWordPhrase = `${word} ${nextWord}`;
          phrases[twoWordPhrase] = (phrases[twoWordPhrase] || 0) + 2;
        }
      }
      
      if (i < words.length - 2) {
        const nextWord = words[i + 1].replace(/[^a-z0-9]/g, '');
        const thirdWord = words[i + 2].replace(/[^a-z0-9]/g, '');
        if (nextWord.length > 2 && thirdWord.length > 2) {
          const threeWordPhrase = `${word} ${nextWord} ${thirdWord}`;
          phrases[threeWordPhrase] = (phrases[threeWordPhrase] || 0) + 3;
        }
      }
    }
  }
  
  // Convert to array and sort by frequency
  const keywordArray = Object.entries(phrases)
    .map(([keyword, count]) => ({
      keyword,
      count
    }))
    .filter(k => k.keyword.length > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((k, i) => {
      // Generate fake stats for the keywords
      const baseVolume = 1000 - (i * 40);
      const randomVariation = Math.floor(Math.random() * 200) - 100;
      const volume = Math.max(50, baseVolume + randomVariation);
      
      return {
        keyword: k.keyword,
        score: Math.round(100 - (i * 3)),
        volume: `${volume}/mo`,
        difficulty: Math.round(30 + (Math.random() * 40))
      };
    });
  
  return keywordArray;
}

// New enhanced POST endpoint for image generation with multiple sources
router.post('/generate-images', async (req: Request, res: Response) => {
  try {
    const { query, count = 24, source } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid search query is required'
      });
    }
    
    console.log(`Generating images for query: "${query}", count: ${count}, source: ${source || 'all'}`);
    
    // Prepare to collect results from multiple sources
    let allImages: any[] = [];
    const sourcesUsed: string[] = [];
    
    // Helper function to standardize image format
    const formatImage = (img: any, src: string) => ({
      ...img,
      source: src,
      // Make sure we have consistent property names
      url: img.url || img.src?.medium || img.webformatURL,
      large_url: img.src?.large || img.largeImageURL || img.large_url || img.url,
      original_url: img.src?.original || img.imageURL || img.original_url || img.large_url || img.url
    });
    
    // Determine sources to query
    const fetchFromPexels = !source || source === 'all' || source === 'pexels';
    const fetchFromPixabay = !source || source === 'all' || source === 'pixabay';
    
    // Split the requested count between sources
    const pexelsCount = fetchFromPexels && fetchFromPixabay ? Math.ceil(count / 2) : count;
    const pixabayCount = fetchFromPexels && fetchFromPixabay ? Math.floor(count / 2) : count;
    
    // Try Pexels API
    if (fetchFromPexels) {
      try {
        console.log(`Fetching ${pexelsCount} images from Pexels for "${query}"`);
        const { images, fallbackUsed } = await pexelsService.safeSearchImages(query, pexelsCount);
        
        if (images && images.length > 0) {
          const pexelsImages = images.map(img => formatImage(img, 'pexels'));
          allImages = [...allImages, ...pexelsImages];
          sourcesUsed.push('pexels');
          console.log(`Found ${images.length} images from Pexels`);
        }
      } catch (pexelsError) {
        console.error('Pexels search error:', pexelsError);
      }
    }
    
    // Try Pixabay API
    if (fetchFromPixabay) {
      try {
        console.log(`Fetching ${pixabayCount} images from Pixabay for "${query}"`);
        const { images, fallbackUsed } = await pixabayService.safeGenerateImages(query, pixabayCount);
        
        if (images && images.length > 0) {
          const pixabayImages = images.map(img => formatImage(img, 'pixabay'));
          allImages = [...allImages, ...pixabayImages];
          sourcesUsed.push('pixabay');
          console.log(`Found ${images.length} images from Pixabay`);
        }
      } catch (pixabayError) {
        console.error('Pixabay search error:', pixabayError);
      }
    }
    
    // Return results
    if (allImages.length > 0) {
      return res.status(200).json({
        success: true,
        images: allImages,
        sourcesUsed,
        count: allImages.length,
        query
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No images found for the given query',
        query
      });
    }
    
  } catch (error) {
    console.error('Error generating images:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate images',
      error: (error as Error).message
    });
  }
});

export default router;