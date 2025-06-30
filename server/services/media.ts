import { ShopifyService } from './shopify';
import { ShopifyStore } from '@shared/schema';

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
      // Use themes/assets API for general media files
      const assetsResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        '/themes.json'
      );
      
      if (!assetsResponse || !assetsResponse.themes || !Array.isArray(assetsResponse.themes)) {
        console.log('No themes found in the store');
        return [];
      }
      
      // Get the main/published theme
      const publishedTheme = assetsResponse.themes.find((theme: any) => theme.role === 'main' || theme.role === 'published');
      
      if (!publishedTheme) {
        console.log('No published theme found');
        return [];
      }
      
      // Get assets from the theme
      const themeAssetsResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        `/themes/${publishedTheme.id}/assets.json`
      );
      
      if (!themeAssetsResponse || !themeAssetsResponse.assets) {
        console.log('No assets found in theme');
        return [];
      }
      
      // Filter for image assets only
      const imageAssets = themeAssetsResponse.assets.filter((asset: any) => {
        const isImage = asset.content_type && asset.content_type.startsWith('image/');
        const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(asset.key);
        return isImage || hasImageExtension;
      });
      
      console.log(`Found ${imageAssets.length} image assets in theme`);
      
      return imageAssets.map((asset: any) => ({
        id: asset.key,
        url: `https://${store.shopName}/files/${asset.key}`,
        filename: asset.key,
        content_type: asset.content_type || 'image/jpeg',
        alt: asset.key.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        source: 'theme_asset'
      }));
      
    } catch (error: any) {
      console.error('Error fetching Shopify media files:', error.message);
      return [];
    }
  }

  /**
   * Get product images from all products
   */
  async getProductImagesFromAllProducts(store: ShopifyStore): Promise<MediaFile[]> {
    console.log('Fetching product images as content files using GraphQL');
    
    try {
      // Use GraphQL Admin API instead of deprecated REST API
      const { graphqlShopifyService } = await import('./graphql-shopify');
      const productImages = await graphqlShopifyService.getProductImages(store, 20);
      
      if (!productImages || !Array.isArray(productImages)) {
        console.log('No product images found in the store');
        return [];
      }
      
      console.log(`Processing ${productImages.length} product images from GraphQL`);
      
      // Convert to MediaFile format
      const allImages: MediaFile[] = productImages.map((image: any) => ({
        id: image.id,
        url: image.url,
        filename: image.filename,
        content_type: image.content_type,
        alt: image.alt,
        source: image.source,
        position: image.position
      }));
      
      return allImages;
    } catch (error: any) {
      console.error('Error fetching product images:', error.message);
      return [];
    }
  }

  /**
   * Get images from a specific product using GraphQL API
   */
  async getProductImages(store: ShopifyStore, productId: string): Promise<MediaFile[]> {
    try {
      // Get product details using GraphQL
      const { graphqlShopifyService } = await import('./graphql-shopify');
      const products = await graphqlShopifyService.getProducts(store, 1);
      
      if (!products || !Array.isArray(products)) {
        console.log(`No product found with ID ${productId}`);
        return [];
      }
      
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.log(`Product ${productId} not found`);
        return [];
      }
      
      // Convert product images to MediaFile format
      const allImages: MediaFile[] = [];
      
      // Add featured image
      if (product.image) {
        allImages.push({
          id: `product-${product.id}-featured`,
          url: product.image.src,
          filename: `${product.title} - Featured Image`,
          content_type: 'image/jpeg',
          alt: product.image.alt || `${product.title} featured image`,
          source: 'product_image'
        });
      }
      
      // Add all product images
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((image: any, index: number) => {
          if (image && image.src) {
            allImages.push({
              id: `product-${product.id}-image-${image.id || index}`,
              url: image.src,
              filename: `${product.title} - Image ${index + 1}`,
              content_type: 'image/jpeg',
              alt: image.alt || `${product.title} image ${index + 1}`,
              source: 'product_image',
              position: index
            });
          }
        });
      }
      
      // Add variant images
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach((variant: any, variantIndex: number) => {
          if (variant.image && variant.image.src) {
            allImages.push({
              id: `variant-${variant.id}-image`,
              url: variant.image.src,
              filename: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
              content_type: 'image/jpeg',
              alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
              source: 'variant_image',
              position: variantIndex
            });
          }
        });
      }
      
      console.log(`Found ${allImages.length} images for product ${product.title}`);
      return allImages;
      
    } catch (error: any) {
      console.error(`Error fetching product images for ${productId}:`, error.message);
      return [];
    }
  }

  /**
   * Get all content files from multiple sources
   */
  async getAllContentFiles(store: ShopifyStore): Promise<MediaFile[]> {
    try {
      console.log('Fetching all content files from Shopify');
      
      const allFiles: MediaFile[] = [];
      
      // Get theme assets
      const themeFiles = await this.getShopifyMediaFiles(store);
      console.log(`Found ${themeFiles.length} theme assets`);
      allFiles.push(...themeFiles);
      
      // Get product images
      const productFiles = await this.getProductImagesFromAllProducts(store);
      console.log(`Found ${productFiles.length} product images`);
      allFiles.push(...productFiles);
      
      // Remove duplicates based on URL
      const uniqueFiles = allFiles.filter((file, index, array) => 
        array.findIndex(f => f.url === file.url) === index
      );
      
      console.log(`Returning ${uniqueFiles.length} unique content files`);
      return uniqueFiles;
      
    } catch (error: any) {
      console.error('Error fetching all content files:', error.message);
      return [];
    }
  }

  /**
   * Helper function to determine content type from filename
   */
  private getContentTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/jpeg';
    }
  }
}