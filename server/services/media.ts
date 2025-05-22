import { ShopifyService } from './shopify';
import { ShopifyStore } from '../models/shopify';
import axios from 'axios';

interface MediaFile {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  alt: string;
  source: string;
  position?: number;
}

/**
 * Service for handling media files across different sources
 * - Shopify Media Library (store-wide)
 * - Product-specific images
 */
export class MediaService {
  private shopifyService: ShopifyService;

  constructor(shopifyService: ShopifyService) {
    this.shopifyService = shopifyService;
  }

  /**
   * Get all files from the Shopify Media Library (not product-specific)
   */
  async getShopifyMediaFiles(store: ShopifyStore): Promise<MediaFile[]> {
    try {
      console.log(`Fetching media files from ${store.shopName} using Files API`);
      
      // Try to use the Files API to get all media library files
      const filesResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/files.json?limit=250'
      );
      
      if (filesResponse && filesResponse.files && filesResponse.files.length > 0) {
        console.log(`Successfully fetched ${filesResponse.files.length} files from Shopify Files API`);
        
        // Convert to our standard format with careful validation
        const mediaFiles = filesResponse.files.map((file: any) => {
          // Ensure the file has a valid URL - essential for image display
          const url = file.url && file.url.trim() !== '' 
            ? file.url 
            : `https://placehold.co/600x400?text=${encodeURIComponent(file.filename || 'Image')}`;
            
          return {
            id: file.id ? file.id.toString() : `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            url: url,
            filename: file.filename || 'Unnamed file',
            content_type: file.content_type || this.getContentTypeFromFilename(file.filename || 'image.jpg'),
            alt: file.alt || file.filename || 'Shopify Media',
            source: 'shopify_media'
          };
        });
        
        // Log a sample for debugging
        if (mediaFiles.length > 0) {
          console.log('Sample media file:', JSON.stringify(mediaFiles[0]));
        }
        
        return mediaFiles;
      }
      
      // If Files API fails or returns empty, get product images directly
      console.log('Files API returned empty or failed, fetching product images directly');
      
      // Get product images directly from products as a fallback
      const productImages = await this.getProductImagesFromAllProducts(store);
      if (productImages.length > 0) {
        console.log(`Found ${productImages.length} product images to use as media files`);
        return productImages;
      }
      
      // If both methods failed, try the Assets API as a last resort
      console.log('Product images search returned empty, falling back to Assets API');
      return this.getAllContentFiles(store);
      
    } catch (error) {
      console.error('Error fetching Shopify media files:', error);
      
      try {
        // Try to get product images if Files API fails
        console.log('Trying to fetch product images as fallback after error');
        const productImages = await this.getProductImagesFromAllProducts(store);
        if (productImages.length > 0) {
          console.log(`Found ${productImages.length} product images to use as media files`);
          return productImages;
        }
      } catch (productError) {
        console.error('Error fetching product images as fallback:', productError);
      }
      
      // If all else fails, try Assets API
      console.log('Falling back to Assets API due to error');
      return this.getAllContentFiles(store);
    }
  }
  
  /**
   * Get images from all products as a fallback method
   */
  async getProductImagesFromAllProducts(store: ShopifyStore): Promise<MediaFile[]> {
    console.log('Fetching product images as content files - more reliable method');
    
    try {
      // Get a list of products with their images
      const productsResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/products.json?limit=20&fields=id,title,image,images,variants'
      );
      
      if (!productsResponse || !productsResponse.products || !Array.isArray(productsResponse.products)) {
        console.log('No products found in the store, or invalid response format');
        return [];
      }
      
      console.log(`Processing images from ${productsResponse.products.length} products`);
      
      const allImages: MediaFile[] = [];
      
      // Process each product and its images
      productsResponse.products.forEach((product: any) => {
        // Handle main product images
        if (product.images && Array.isArray(product.images)) {
          console.log(`Product ${product.id} (${product.title}) has ${product.images.length} images`);
          
          product.images.forEach((image: any, index: number) => {
            if (image && image.src) {
              // Create a proper image object with all required fields
              const imageObject: MediaFile = {
                id: `product-${product.id}-image-${image.id || index}`,
                url: image.src,
                filename: `${product.title} - Image ${index + 1}`,
                content_type: 'image/jpeg',
                alt: image.alt || `${product.title} - Image ${index + 1}`,
                source: 'product_image'
              };
              
              allImages.push(imageObject);
            }
          });
        } else {
          console.log(`Product ${product.id} (${product.title}) has no images array`);
        }
        
        // Handle single product image if images array isn't available
        if (product.image && product.image.src && (!product.images || !Array.isArray(product.images))) {
          console.log(`Adding single image for product ${product.id} (${product.title})`);
          
          // Create a proper image object with all required fields
          const imageObject: MediaFile = {
            id: `product-${product.id}-image-single`,
            url: product.image.src,
            filename: `${product.title} - Main Image`,
            content_type: 'image/jpeg',
            alt: product.image.alt || `${product.title} - Main Image`,
            source: 'product_image'
          };
          
          allImages.push(imageObject);
        }
      });
      
      console.log(`Found ${allImages.length} product images to use as content files`);
      
      // Log sample image to verify format
      if (allImages.length > 0) {
        console.log('Sample image object:', JSON.stringify(allImages[0]));
      }
      
      return allImages;
      
    } catch (error) {
      console.error('Error fetching product images as content files:', error);
      return [];
    }
  }

  /**
   * Get product-specific images for a selected product
   */
  async getProductImages(store: ShopifyStore, productId: string): Promise<MediaFile[]> {
    try {
      console.log(`Fetching images for product ${productId} from ${store.shopName}`);
      
      // Get the product details including all images
      const productResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        `/products/${productId}.json`
      );
      
      if (!productResponse || !productResponse.product) {
        console.log(`Product ${productId} not found`);
        return [];
      }
      
      const product = productResponse.product;
      const result: MediaFile[] = [];
      
      // Process the main product images
      if (product.images && Array.isArray(product.images)) {
        console.log(`Processing ${product.images.length} images for product ${product.title}`);
        
        product.images.forEach((image: any, index: number) => {
          if (!image || !image.src) {
            console.log(`Skipping invalid image at index ${index} for product ${product.id}`);
            return; // Skip this iteration
          }
          
          try {
            // Ensure ID is a string
            const imageId = image.id ? image.id.toString() : `product-${product.id}-image-${index}`;
            
            // Create a properly structured image object
            const imageObject: MediaFile = {
              id: imageId,
              url: image.src,
              filename: `${product.title} - Image ${index + 1}`,
              content_type: 'image/jpeg',
              alt: image.alt || `${product.title} - Image ${index + 1}`,
              source: 'product_image',
              position: image.position || index + 1
            };
            
            result.push(imageObject);
          } catch (err) {
            console.error(`Error processing image at index ${index} for product ${product.id}:`, err);
          }
        });
        
        console.log(`Successfully processed ${result.length} product images`);
      }
      
      // Process variant images if they exist and aren't duplicates
      if (product.variants && Array.isArray(product.variants)) {
        console.log(`Processing ${product.variants.length} variants for product ${product.title}`);
        const existingUrls = new Set(result.map(img => img.url));
        
        product.variants.forEach((variant: any, index: number) => {
          if (variant.image && variant.image.src && !existingUrls.has(variant.image.src)) {
            try {
              // Ensure ID is a string
              const variantImageId = variant.image.id 
                ? variant.image.id.toString() 
                : `variant-${variant.id || product.id}-image-${index}`;
              
              // Create a properly structured variant image object
              const variantImage: MediaFile = {
                id: variantImageId,
                url: variant.image.src,
                filename: `${product.title} - ${variant.title || `Variant ${index + 1}`}`,
                content_type: 'image/jpeg',
                alt: variant.image.alt || `${product.title} - ${variant.title || `Variant ${index + 1}`}`,
                source: 'variant_image',
                position: 1000 + index // Put variants at the end
              };
              
              result.push(variantImage);
              existingUrls.add(variant.image.src);
              
              console.log(`Added variant image for ${variant.title || `Variant ${index + 1}`}`);
            } catch (err) {
              console.error(`Error processing variant image at index ${index}:`, err);
            }
          }
        });
        
        console.log(`Added ${result.length - product.images.length} variant images`);
      }
      
      // Sort by position
      return result.sort((a, b) => (a.position || 999) - (b.position || 999));
      
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error);
      return [];
    }
  }

  /**
   * Legacy compatibility method - get all content files
   */
  async getAllContentFiles(store: ShopifyStore): Promise<MediaFile[]> {
    try {
      console.log(`Fetching content files from ${store.shopName} using Assets API`);
      
      // Try to use the Assets API as a fallback
      const assetsResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/themes/current.json'
      );
      
      if (!assetsResponse || !assetsResponse.theme || !assetsResponse.theme.id) {
        console.log('Could not get current theme');
        return [];
      }
      
      const themeId = assetsResponse.theme.id;
      const assetsListResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        `/themes/${themeId}/assets.json`
      );
      
      if (!assetsListResponse || !assetsListResponse.assets) {
        console.log('No assets found');
        return [];
      }
      
      // Filter for image assets only
      const imageAssets = assetsListResponse.assets.filter((asset: any) => {
        if (!asset.key || typeof asset.key !== 'string') return false;
        const key = asset.key.toLowerCase();
        return (
          key.endsWith('.jpg') || 
          key.endsWith('.jpeg') || 
          key.endsWith('.png') || 
          key.endsWith('.gif')
        );
      });
      
      console.log(`Found ${imageAssets.length} image assets in theme files`);
      
      // Generate URLs for all assets and convert to our format with validation
      const mediaFiles = imageAssets.map((asset: any, index: number) => {
        try {
          // Extract filename from key
          const filename = asset.key && typeof asset.key === 'string' 
            ? asset.key.split('/').pop() 
            : `Asset ${index + 1}`;
          
          // Generate a consistent ID
          const assetId = `theme-asset-${index}-${Date.now().toString().substring(8)}`;
          
          // Ensure we have a valid URL - critical for image display
          let imageUrl = '';
          if (asset.public_url && asset.public_url.trim() !== '') {
            imageUrl = asset.public_url;
          } else if (asset.key) {
            imageUrl = `https://${store.shopName}/assets/${asset.key}`;
          } else {
            console.log(`Missing URL for asset ${index}, using placeholder`);
            imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(filename)}`;
          }
          
          // Create a valid media file object
          return {
            id: assetId,
            url: imageUrl,
            filename,
            content_type: this.getContentTypeFromFilename(filename),
            alt: filename,
            source: 'theme_asset'
          };
        } catch (err) {
          console.error(`Error processing theme asset at index ${index}:`, err);
          
          // Return a fallback asset with placeholder
          return {
            id: `asset-error-${index}`,
            url: `https://placehold.co/600x400?text=Error+Loading+Image`,
            filename: `Error Loading Asset ${index}`,
            content_type: 'image/jpeg',
            alt: `Error Loading Asset ${index}`,
            source: 'theme_asset'
          };
        }
      });
      
      // Log a sample for debugging
      if (mediaFiles.length > 0) {
        console.log('Sample theme asset:', JSON.stringify(mediaFiles[0]));
      }
      
      return mediaFiles;
    } catch (error) {
      console.error('Error fetching content files:', error);
      return [];
    }
  }
  
  /**
   * Helper to determine content type from filename
   */
  private getContentTypeFromFilename(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'application/octet-stream';
  }
}