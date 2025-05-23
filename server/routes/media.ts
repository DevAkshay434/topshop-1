import express, { Request, Response } from 'express';
import { shopifyService } from '../services/shopify';
import { storage } from '../storage';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const mediaRouter = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      // Create unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  })
});

/**
 * Get all images for a specific product
 */
mediaRouter.get('/product-images', async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Get current store
    const stores = await storage.getShopifyStores();
    if (!stores || stores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Shopify store found'
      });
    }
    
    const store = stores[0]; // Use first store for now
    
    // Fetch product details to get images
    let product;
    try {
      product = await shopifyService.getProductById(store, productId as string);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    } catch (productError) {
      console.error(`Error fetching product directly: ${productError.message}`);
      
      // Try using the products endpoint as fallback
      try {
        console.log(`Trying to fetch product ${productId} using products endpoint`);
        const productsResponse = await shopifyService.getProducts(store);
        product = productsResponse.find((p: any) => p.id === productId);
        
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found in products list'
          });
        }
      } catch (fallbackError) {
        console.error(`Error with fallback product fetch: ${fallbackError.message}`);
        return res.status(500).json({
          success: false, 
          message: 'Failed to fetch product details',
          error: fallbackError.message
        });
      }
    }
    
    // Prepare images array with main product images
    const images: any[] = [];
    
    // Add product main images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image, index) => {
        images.push({
          id: image.id,
          src: image.src,
          width: image.width,
          height: image.height,
          alt: image.alt || `Product image ${index + 1}`,
          position: image.position
        });
      });
    }
    
    // Add variant images if they have unique images
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant, variantIndex) => {
        if (variant.image && !images.some(img => img.id === variant.image.id)) {
          images.push({
            id: variant.image.id,
            src: variant.image.src,
            width: variant.image.width,
            height: variant.image.height,
            alt: variant.image.alt || `Variant ${variant.title} image`,
            variantId: variant.id,
            variantTitle: variant.title
          });
        }
      });
    }
    
    return res.json({
      success: true,
      images,
      productTitle: product.title
    });
  } catch (error) {
    console.error('Error fetching product images:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product images',
      error: (error as Error).message
    });
  }
});

/**
 * Get images from Shopify Media Library
 */
mediaRouter.get('/shopify-media-library', async (req: Request, res: Response) => {
  try {
    // Get current store
    const stores = await storage.getShopifyStores();
    if (!stores || stores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Shopify store found'
      });
    }
    
    const store = stores[0]; // Use first store for now
    
    // Try to fetch media files from Shopify
    let mediaFiles = [];
    try {
      console.log('Trying to fetch Shopify media files using Files API');
      // First attempt using the Files API
      const filesResponse = await axios.get(`https://${store.shopName}/admin/api/2023-10/files.json?limit=250`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      if (filesResponse.data && filesResponse.data.files) {
        mediaFiles = filesResponse.data.files;
        console.log(`Successfully fetched ${mediaFiles.length} files from Shopify Files API`);
      }
    } catch (filesError) {
      console.error('Error fetching from Files API:', filesError.message);
      console.log('Trying to fetch product images as fallback after error');
      
      // Fallback method - use product images if Files API fails
      console.log('Fetching product images as content files - more reliable method');
      try {
        const productsResponse = await axios.get(
          `https://${store.shopName}/admin/api/2023-10/products.json?limit=20&fields=id,title,image,images,variants`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': store.accessToken
            }
          }
        );
        
        if (productsResponse.data && productsResponse.data.products) {
          const products = productsResponse.data.products;
          console.log(`Processing images from ${products.length} products`);
          
          // Extract all product images
          let productImages: any[] = [];
          products.forEach((product: any) => {
            console.log(`Product ${product.id} (${product.title}) has ${product.images?.length || 0} images`);
            if (product.images && product.images.length) {
              product.images.forEach((image: any, index: number) => {
                productImages.push({
                  id: `product-${product.id}-image-${image.id}`,
                  url: image.src,
                  src: image.src,
                  filename: `${product.title} - Image ${index + 1}`,
                  content_type: 'image/jpeg',
                  alt: image.alt || `${product.title} image`,
                  source: 'product_image'
                });
              });
            }
          });
          
          console.log(`Found ${productImages.length} product images to use as media files`);
          mediaFiles = productImages;
        }
      } catch (productsError: any) {
        console.error('Error fetching product images as fallback:', productsError.message);
      }
    }
    
    // Process media files into consistent format
    const mediaImages = [];
    
    for (const file of mediaFiles) {
      mediaImages.push({
        id: file.id || `shopify-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        src: file.url || file.src,
        url: file.url || file.src,
        width: file.width || 800,
        height: file.height || 600,
        alt: file.alt || file.filename || 'Shopify media image',
        filename: file.filename,
        created_at: file.created_at,
        content_type: file.content_type || 'image/jpeg',
        source: file.source || 'shopify_media'
      });
    }
    
    console.log(`Fetched ${mediaImages.length} files from Shopify Media Library`);
    
    return res.json({
      success: true,
      images: mediaImages,
      count: mediaImages.length
    });
  } catch (error: any) {
    console.error('Error fetching Shopify media library:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error fetching Shopify media library',
      error: error.message
    });
  }
});

/**
 * Search for images on Pexels
 */
mediaRouter.get('/pexels-search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Determine if we should get curated photos instead of search
    const useSearch = query !== 'featured';
    
    // Log search attempt
    console.log(`${useSearch ? 'Searching' : 'Getting'} ${useSearch ? query : ''} images from Pexels`);
    
    // Fetch from Pexels API
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    
    if (!PEXELS_API_KEY) {
      console.warn('Pexels API key not found - using demo API mode');
      
      // Return mock data in development mode
      return res.json({
        success: true,
        message: 'Using demo mode without Pexels API key',
        images: [
          {
            id: 'demo-1',
            width: 800,
            height: 600,
            url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg',
            photographer: 'Demo Photographer',
            alt: 'Demo image',
            src: {
              original: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg',
              large: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              medium: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&h=350',
              small: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&h=130',
              thumbnail: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=280'
            }
          }
        ]
      });
    }
    
    // Build request to Pexels API
    const endpoint = useSearch 
      ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query as string)}&per_page=15`
      : `https://api.pexels.com/v1/curated?per_page=1`;
    
    const pexelsResponse = await axios.get(endpoint, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });
    
    if (pexelsResponse.status !== 200 || !pexelsResponse.data) {
      throw new Error('Failed to fetch from Pexels API');
    }
    
    // Log success
    console.log(`Pexels ${useSearch ? 'search' : 'curated'} returned ${pexelsResponse.data.photos.length} results`);
    
    // Return processed images
    return res.json({
      success: true,
      images: pexelsResponse.data.photos
    });
  } catch (error) {
    console.error('Error searching Pexels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching Pexels',
      error: (error as Error).message
    });
  }
});

/**
 * Upload image file(s)
 */
mediaRouter.post('/upload', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    // Get current store
    const stores = await storage.getShopifyStores();
    if (!stores || stores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Shopify store found'
      });
    }
    
    const store = stores[0]; // Use first store for now
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files were uploaded'
      });
    }
    
    // Upload each file to Shopify
    const uploadedFiles = [];
    
    for (const file of req.files as Express.Multer.File[]) {
      try {
        // Read file content
        const fileContent = fs.readFileSync(file.path);
        
        // Upload to Shopify
        const shopifyFile = await shopifyService.uploadToShopifyMediaLibrary(
          store,
          fileContent,
          file.mimetype,
          path.basename(file.originalname)
        );
        
        // Add to result
        uploadedFiles.push({
          id: shopifyFile.id,
          src: shopifyFile.url,
          url: shopifyFile.url,
          originalName: file.originalname,
          filename: shopifyFile.filename || file.originalname,
          mimetype: file.mimetype
        });
        
        // Delete local file
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        console.error(`Error uploading file ${file.originalname}:`, uploadError);
        // Continue with other files
      }
    }
    
    return res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: (error as Error).message
    });
  }
});

export { mediaRouter };