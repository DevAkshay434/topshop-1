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
        
        // Convert to our standard format
        return filesResponse.files.map((file: any) => ({
          id: file.id.toString(),
          url: file.url,
          filename: file.filename || '',
          content_type: file.content_type || 'image/jpeg',
          alt: file.alt || file.filename || 'Shopify Media',
          source: 'shopify_media'
        }));
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
        product.images.forEach((image: any, index: number) => {
          result.push({
            id: image.id.toString(),
            url: image.src,
            filename: `${product.title} - Image ${index + 1}`,
            content_type: 'image/jpeg',
            alt: image.alt || `${product.title} - Image ${index + 1}`,
            source: 'product_image',
            position: image.position || index + 1
          });
        });
      }
      
      // Process variant images if they exist and aren't duplicates
      if (product.variants && Array.isArray(product.variants)) {
        const existingUrls = new Set(result.map(img => img.url));
        
        product.variants.forEach((variant: any, index: number) => {
          if (variant.image && variant.image.src && !existingUrls.has(variant.image.src)) {
            result.push({
              id: variant.image.id.toString(),
              url: variant.image.src,
              filename: `${product.title} - ${variant.title || `Variant ${index + 1}`}`,
              content_type: 'image/jpeg',
              alt: variant.image.alt || `${product.title} - ${variant.title || `Variant ${index + 1}`}`,
              source: 'variant_image',
              position: 1000 + index // Put variants at the end
            });
            
            existingUrls.add(variant.image.src);
          }
        });
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
      
      // Generate URLs for all assets and convert to our format
      return imageAssets.map((asset: any, index: number) => {
        // Extract filename from key
        const filename = asset.key.split('/').pop() || `Asset ${index + 1}`;
        
        return {
          id: `asset-${index}`,
          url: asset.public_url || `https://${store.shopName}/assets/${asset.key}`,
          filename,
          content_type: this.getContentTypeFromFilename(filename),
          alt: filename,
          source: 'theme_asset'
        };
      });
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