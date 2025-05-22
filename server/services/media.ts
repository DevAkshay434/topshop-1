import { ShopifyService } from './shopify';
import type { ShopifyStore } from '../../shared/schema';
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
      console.log(`MediaService: Fetching all media library files from ${store.shopName}`);
      
      // We'll use shopifyService to make the API calls
      const allMediaFiles: MediaFile[] = [];
      
      // First try the files API to get the official Media Library
      try {
        const filesResponse = await this.shopifyService.makeApiRequest(
          store, 
          'GET', 
          '/files.json'
        );
        
        if (filesResponse && filesResponse.files) {
          // Filter to only include image files
          const imageFiles = filesResponse.files
            .filter((file: any) => 
              file.content_type && file.content_type.startsWith('image/')
            )
            .map((file: any) => ({
              id: `file-${file.id}`,
              url: file.url,
              filename: file.filename || `File ${file.id}`,
              content_type: file.content_type,
              alt: file.alt || file.filename || `File ${file.id}`,
              source: 'shopify_media'
            }));
            
          console.log(`Found ${imageFiles.length} image files in Shopify Files API`);
          allMediaFiles.push(...imageFiles);
        }
      } catch (error) {
        console.log("Files API not available or no permissions, trying alternatives");
      }
      
      // Try to fetch article images
      try {
        const articlesResponse = await this.shopifyService.makeApiRequest(
          store,
          'GET',
          '/articles.json?limit=20&fields=id,title,image'
        );
        
        if (articlesResponse && articlesResponse.articles) {
          const articleImages = articlesResponse.articles
            .filter((article: any) => article.image && article.image.src)
            .map((article: any) => ({
              id: `article-image-${article.id}`,
              url: article.image.src,
              filename: `Article: ${article.title.substring(0, 30)}...`,
              content_type: 'image/jpeg',
              alt: article.title,
              source: 'shopify_media'
            }));
            
          console.log(`Found ${articleImages.length} article images`);
          allMediaFiles.push(...articleImages);
        }
      } catch (error) {
        console.log("Could not fetch article images");
      }
      
      // Try to fetch metafield images
      try {
        const metafieldsResponse = await this.shopifyService.makeApiRequest(
          store,
          'GET',
          '/metafields.json?limit=50'
        );
        
        if (metafieldsResponse && metafieldsResponse.metafields) {
          const metafieldImages = [];
          
          for (const metafield of metafieldsResponse.metafields) {
            if (
              metafield.value_type === 'string' && 
              typeof metafield.value === 'string' &&
              (metafield.value.endsWith('.jpg') || 
               metafield.value.endsWith('.jpeg') || 
               metafield.value.endsWith('.png') || 
               metafield.value.endsWith('.gif'))
            ) {
              try {
                // Check if it's a valid URL
                new URL(metafield.value);
                
                metafieldImages.push({
                  id: `metafield-${metafield.id}`,
                  url: metafield.value,
                  filename: `Metafield: ${metafield.key}`,
                  content_type: 'image/jpeg',
                  alt: metafield.key,
                  source: 'shopify_media'
                });
              } catch (e) {
                // Not a valid URL, ignore
              }
            }
          }
          
          console.log(`Found ${metafieldImages.length} images in metafields`);
          allMediaFiles.push(...metafieldImages);
        }
      } catch (error) {
        console.log("Could not fetch metafield images");
      }
      
      // Deduplicate files by URL
      const uniqueFiles = allMediaFiles.filter((file, index, self) => 
        index === self.findIndex(f => f.url === file.url)
      );
      
      console.log(`Found ${uniqueFiles.length} unique media files in Shopify Media Library`);
      return uniqueFiles;
    } catch (error) {
      console.error("Error in getShopifyMediaFiles:", error instanceof Error ? error.message : String(error));
      return [];
    }
  }
  
  /**
   * Get product-specific images for a selected product
   */
  async getProductImages(store: ShopifyStore, productId: string): Promise<MediaFile[]> {
    try {
      console.log(`MediaService: Fetching images for product ${productId}`);
      const productImages: MediaFile[] = [];
      
      // Get detailed product information
      const productResponse = await this.shopifyService.makeApiRequest(
        store,
        'GET',
        `/products/${productId}.json`
      );
      
      if (!productResponse || !productResponse.product) {
        console.log(`No product found with ID ${productId}`);
        return [];
      }
      
      const product = productResponse.product;
      
      // Add main product image
      if (product.image && product.image.src) {
        productImages.push({
          id: `product-${product.id}-main`,
          url: product.image.src,
          filename: `${product.title} (main)`,
          content_type: 'image/jpeg',
          alt: product.title,
          source: 'product_image',
          position: product.image.position || 1
        });
      }
      
      // Add all product images (excluding main image if already added)
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((image: any, index: number) => {
          // Skip if this is the main image (already added)
          const isMainImage = product.image && image.id === product.image.id;
          
          if (image && image.src && !isMainImage) {
            productImages.push({
              id: `product-${product.id}-image-${image.id}`,
              url: image.src,
              filename: `${product.title} (${index + 1})`,
              content_type: 'image/jpeg',
              alt: image.alt || `${product.title} image ${index + 1}`,
              source: 'product_image',
              position: image.position || (index + 2)
            });
          }
        });
      }
      
      // Add variant images (only if different from product images)
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          // Only process variants with image IDs
          if (variant.image_id) {
            // Check if this variant image is already included in product images
            const variantImageExists = productImages.some(img => 
              img.id === `product-${product.id}-image-${variant.image_id}`
            );
            
            if (!variantImageExists) {
              try {
                // Get variant image through product images endpoint
                const imagesResponse = await this.shopifyService.makeApiRequest(
                  store,
                  'GET',
                  `/products/${productId}/images/${variant.image_id}.json`
                );
                
                if (imagesResponse && imagesResponse.image && imagesResponse.image.src) {
                  const variantImage = imagesResponse.image;
                  
                  productImages.push({
                    id: `variant-${variant.id}-image-${variantImage.id}`,
                    url: variantImage.src,
                    filename: `${product.title} - ${variant.title || 'Variant'}`,
                    content_type: 'image/jpeg', 
                    alt: `${product.title} - ${variant.title || 'Variant'}`,
                    source: 'variant_image',
                    position: 1000 + (variantImage.position || 0) // Put variants at the end
                  });
                }
              } catch (error) {
                console.log(`Could not get image for variant ${variant.id}`);
              }
            }
          }
        }
      }
      
      // Sort by position
      productImages.sort((a, b) => (a.position || 0) - (b.position || 0));
      
      console.log(`Found ${productImages.length} images for product ${productId}`);
      return productImages;
    } catch (error) {
      console.error(`Error fetching product images: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Legacy compatibility method - get all content files
   */
  async getAllContentFiles(store: ShopifyStore): Promise<MediaFile[]> {
    // For backward compatibility with the old implementation
    return this.getShopifyMediaFiles(store);
  }
}