import express, { Request, Response } from 'express';
import { shopifyService } from '../services/shopify';
import { storage } from '../storage';
import { pixabayService } from '../services/pixabay';
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
    
    // Create array to hold all image sources
    let allMediaImages: any[] = [];
    
    // APPROACH 1: Try to fetch theme assets first
    try {
      console.log('Trying to fetch Shopify theme assets');
      const themesResponse = await axios.get(`https://${store.shopName}/admin/api/2025-07/themes.json`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      if (themesResponse.data && themesResponse.data.themes) {
        const mainTheme = themesResponse.data.themes.find((theme: any) => 
          theme.role === 'main' || theme.role === 'published');
        
        if (mainTheme && mainTheme.id) {
          console.log(`Found main theme with ID ${mainTheme.id}`);
          
          const assetsResponse = await axios.get(
            `https://${store.shopName}/admin/api/2025-07/themes/${mainTheme.id}/assets.json`,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': store.accessToken
              }
            }
          );
          
          if (assetsResponse.data && assetsResponse.data.assets) {
            const imageAssets = assetsResponse.data.assets
              .filter((asset: any) => {
                if (!asset.key) return false;
                const key = asset.key.toLowerCase();
                return key.endsWith('.jpg') || key.endsWith('.jpeg') || 
                       key.endsWith('.png') || key.endsWith('.gif') || 
                       key.endsWith('.webp');
              })
              .map((asset: any, index: number) => {
                const filename = asset.key.split('/').pop();
                const storefrontUrl = `https://cdn.shopify.com/s/files/1/0938/4158/8538/files/${filename}`;
                return {
                  id: `theme-asset-${index}-${asset.key.replace(/[^\w]/g, '-')}`,
                  url: storefrontUrl,
                  src: storefrontUrl,
                  width: 800,
                  height: 600,
                  filename: asset.key,
                  content_type: asset.content_type || 'image/jpeg',
                  alt: `Theme asset - ${asset.key}`,
                  source: 'shopify_media',
                  assetType: 'theme'
                };
              });
            
            console.log(`Found ${imageAssets.length} theme image assets`);
            allMediaImages = allMediaImages.concat(imageAssets);
          }
        }
      }
    } catch (themeError: any) {
      console.error('Error fetching theme assets:', themeError.message);
    }
    
    // APPROACH 2: Try the Files API
    try {
      console.log('Trying to fetch Shopify media files using Files API');
      // Note: Files API might not be available in all Shopify plans
      const filesResponse = await axios.get(`https://${store.shopName}/admin/api/2025-07/files.json?limit=250`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      if (filesResponse.data && filesResponse.data.files) {
        const filesApiImages = filesResponse.data.files.map((file: any) => ({
          id: `file-${file.id}`,
          url: file.url,
          src: file.url,
          width: file.width || 800,
          height: file.height || 600,
          filename: file.filename || 'Shopify file',
          content_type: file.content_type || 'image/jpeg',
          alt: file.alt || `Shopify media - ${file.filename || 'Image'}`,
          source: 'shopify_media',
          assetType: 'file'
        }));
        
        console.log(`Found ${filesApiImages.length} files from Files API`);
        allMediaImages = allMediaImages.concat(filesApiImages);
      }
    } catch (filesError: any) {
      console.error('Error fetching from Files API:', filesError.message);
    }
    
    // APPROACH 3: Always fetch product images using GraphQL API instead of deprecated REST API
    try {
      console.log('Fetching product images for media library using GraphQL');
      const { graphqlShopifyService } = await import('../services/graphql-shopify');
      const productImages = await graphqlShopifyService.getProductImages(store, 50);
      
      console.log(`Processing ${productImages.length} product images from GraphQL`);
      
      if (productImages && productImages.length > 0) {
        console.log(`Found ${productImages.length} product and variant images`);
        allMediaImages = allMediaImages.concat(productImages);
      }
    } catch (productsError: any) {
      console.error('Error fetching product images:', productsError.message);
    }
    
    // Remove any potential duplicates based on URL
    const uniqueUrls = new Set();
    const uniqueMediaImages = allMediaImages.filter(img => {
      if (!img.url || uniqueUrls.has(img.url)) return false;
      uniqueUrls.add(img.url);
      return true;
    });
    
    console.log(`Returning ${uniqueMediaImages.length} total unique media files`);
    
    return res.json({
      success: true,
      images: uniqueMediaImages,
      count: uniqueMediaImages.length
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
      
      // Return consistent demo data that will reliably display
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
          },
          {
            id: 'demo-2',
            width: 800,
            height: 600,
            url: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg',
            photographer: 'Demo Photographer',
            alt: 'Happy woman using product',
            src: {
              original: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg',
              large: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              medium: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&h=350',
              small: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&h=130',
              thumbnail: 'https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=280'
            }
          },
          {
            id: 'demo-3',
            width: 800, 
            height: 600,
            url: 'https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg',
            photographer: 'Demo Photographer',
            alt: 'Product showcase image',
            src: {
              original: 'https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg',
              large: 'https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              medium: 'https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg?auto=compress&cs=tinysrgb&h=350',
              small: 'https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg?auto=compress&cs=tinysrgb&h=130',
              thumbnail: 'https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=280'
            }
          }
        ]
      });
    }
    
    try {
      // Build request to Pexels API with more results and landscape orientation
      const endpoint = useSearch 
        ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query as string)}&per_page=24&orientation=landscape`
        : `https://api.pexels.com/v1/curated?per_page=24`;
      
      console.log(`Searching Pexels for: "${query}" (requesting 24 images)`);
      
      const pexelsResponse = await axios.get(endpoint, {
        headers: {
          'Authorization': PEXELS_API_KEY
        },
        timeout: 12000 // Increase timeout to 12 seconds
      });
      
      if (pexelsResponse.status !== 200 || !pexelsResponse.data) {
        throw new Error('Failed to fetch from Pexels API');
      }
      
      // Process photos to ensure they have all required fields
      const processedPhotos = pexelsResponse.data.photos.map((photo: any) => {
        // Ensure URL fields exist
        if (!photo.src) {
          photo.src = {
            original: photo.url,
            large: photo.url,
            medium: photo.url,
            small: photo.url,
            thumbnail: photo.url
          };
        }
        
        // Ensure alt text exists
        if (!photo.alt) {
          photo.alt = photo.photographer ? 
            `Image by ${photo.photographer}` : 
            `${query} image`;
        }
        
        return photo;
      });
      
      // Log success
      console.log(`Pexels ${useSearch ? 'search' : 'curated'} returned ${processedPhotos.length} results`);
      
      // Return processed images
      return res.json({
        success: true,
        images: processedPhotos
      });
    } catch (pexelsError: any) {
      console.error('Pexels API error:', pexelsError.message);
      
      // Try fallback query
      try {
        // If the original search failed, try with a more generic term
        const fallbackQuery = useSearch ? `people ${query}` : 'happy people';
        const fallbackEndpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(fallbackQuery)}&per_page=24&orientation=landscape`;
        
        console.log(`Trying fallback Pexels search: "${fallbackQuery}"`);
        
        const fallbackResponse = await axios.get(fallbackEndpoint, {
          headers: {
            'Authorization': PEXELS_API_KEY
          },
          timeout: 12000
        });
        
        if (fallbackResponse.status === 200 && fallbackResponse.data && fallbackResponse.data.photos) {
          const processedPhotos = fallbackResponse.data.photos.map((photo: any) => {
            // Ensure URL fields exist
            if (!photo.src) {
              photo.src = {
                original: photo.url,
                large: photo.url,
                medium: photo.url,
                small: photo.url,
                thumbnail: photo.url
              };
            }
            
            // Ensure alt text exists
            if (!photo.alt) {
              photo.alt = photo.photographer ? 
                `Image by ${photo.photographer}` : 
                `${fallbackQuery} image`;
            }
            
            return photo;
          });
          
          console.log(`Fallback Pexels search returned ${processedPhotos.length} results`);
          
          return res.json({
            success: true,
            images: processedPhotos,
            fallback: true
          });
        }
      } catch (fallbackError: any) {
        console.error('Fallback Pexels search failed:', fallbackError.message);
      }
      
      // If both attempts failed, return demo data
      return res.json({
        success: true,
        message: 'Using demo mode due to API failure',
        images: [
          {
            id: 'demo-1',
            width: 800,
            height: 600,
            url: 'https://images.pexels.com/photos/3807770/pexels-photo-3807770.jpeg',
            photographer: 'Demo Photographer',
            alt: 'Demo image',
            src: {
              original: 'https://images.pexels.com/photos/3807770/pexels-photo-3807770.jpeg',
              large: 'https://images.pexels.com/photos/3807770/pexels-photo-3807770.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
              medium: 'https://images.pexels.com/photos/3807770/pexels-photo-3807770.jpeg?auto=compress&cs=tinysrgb&h=350',
              small: 'https://images.pexels.com/photos/3807770/pexels-photo-3807770.jpeg?auto=compress&cs=tinysrgb&h=130',
              thumbnail: 'https://images.pexels.com/photos/3807770/pexels-photo-3807770.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=280'
            }
          }
        ]
      });
    }
  } catch (error: any) {
    console.error('Error searching Pexels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching Pexels',
      error: error.message
    });
  }
});

/**
 * Search for images on both Pexels and Pixabay
 */
mediaRouter.get('/pexels-pixabay-search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    console.log(`Searching both Pexels and Pixabay for: "${query}"`);

    let allImages: any[] = [];
    const searchPromises: Promise<any>[] = [];

    // Pexels search
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    if (PEXELS_API_KEY) {
      const pexelsPromise = axios.get('https://api.pexels.com/v1/search', {
        headers: {
          'Authorization': PEXELS_API_KEY
        },
        params: {
          query: query,
          per_page: 15,
          orientation: 'landscape'
        }
      }).then((response) => {
        const pexelsImages = response.data.photos.map((photo: any) => ({
          id: `pexels-${photo.id}`,
          width: photo.width,
          height: photo.height,
          url: photo.url,
          src: {
            original: photo.src.original,
            large: photo.src.large,
            medium: photo.src.medium,
            small: photo.src.small,
            thumbnail: photo.src.tiny
          },
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
          alt: photo.alt || query,
          source: 'pexels'
        }));
        console.log(`Pexels returned ${pexelsImages.length} images`);
        return pexelsImages;
      }).catch((error) => {
        console.error('Pexels search failed:', error.message);
        return [];
      });
      
      searchPromises.push(pexelsPromise);
    }

    // Pixabay search
    try {
      const pixabayResult = await pixabayService.safeGenerateImages(query as string, 15);
      const pixabayImages = pixabayResult.images.map((image: any) => ({
        id: `pixabay-${image.id}`,
        width: image.width,
        height: image.height,
        url: image.url,
        src: {
          original: image.url,
          large: image.url,
          medium: image.url,
          small: image.url,
          thumbnail: image.url
        },
        photographer: 'Pixabay',
        photographer_url: 'https://pixabay.com/',
        alt: image.alt || query,
        source: 'pixabay'
      }));
      console.log(`Pixabay returned ${pixabayImages.length} images`);
      allImages.push(...pixabayImages);
    } catch (pixabayError) {
      console.error('Pixabay search failed:', pixabayError);
    }

    // Wait for Pexels results if the API key is available
    if (searchPromises.length > 0) {
      try {
        const results = await Promise.all(searchPromises);
        results.forEach(result => {
          if (Array.isArray(result)) {
            allImages.push(...result);
          }
        });
      } catch (error) {
        console.error('Error with search promises:', error);
      }
    }

    // If no images found and no API keys, return demo data
    if (allImages.length === 0) {
      console.log('No images found from either service, using demo data');
      allImages = [
        {
          id: 'demo-combined-1',
          width: 800,
          height: 600,
          url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg',
          photographer: 'Demo Photographer',
          alt: 'Demo image',
          source: 'demo',
          src: {
            original: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg',
            large: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
            medium: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&h=350',
            small: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&h=130',
            thumbnail: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=200&w=280'
          }
        }
      ];
    }

    // Shuffle the combined results to mix Pexels and Pixabay images
    const shuffledImages = allImages.sort(() => Math.random() - 0.5);

    console.log(`Returning ${shuffledImages.length} total images from combined search`);

    return res.json({
      success: true,
      images: shuffledImages,
      count: shuffledImages.length,
      message: `Found ${shuffledImages.length} images from Pexels + Pixabay`
    });

  } catch (error: any) {
    console.error('Error in combined search:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching Pexels + Pixabay',
      error: error.message
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