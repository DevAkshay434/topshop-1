import { ShopifyService } from './shopify';
import type { ShopifyStore } from '@shared/types';

export class MediaService {
  private shopifyService: ShopifyService;
  
  constructor(shopifyService: ShopifyService) {
    this.shopifyService = shopifyService;
  }
  
  /**
   * Get all files from the Shopify Media Library
   */
  async getShopifyMediaFiles(store: ShopifyStore): Promise<any[]> {
    try {
      console.log(`MediaService: Fetching all media files from ${store.shopName}`);
      const client = this.shopifyService.getClient(store.shopName, store.accessToken);
      const allMediaFiles: any[] = [];
      
      // First try the files API
      try {
        const filesResponse = await client.get('/files.json');
        
        if (filesResponse.data && filesResponse.data.files) {
          // Filter to only include image files
          const imageFiles = filesResponse.data.files
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
        console.error("Error fetching Shopify files:", error instanceof Error ? error.message : String(error));
      }
      
      // Try to fetch article images
      try {
        // Get images from blog posts
        const articlesResponse = await client.get('/articles.json?limit=20&fields=id,title,image');
        
        if (articlesResponse.data && articlesResponse.data.articles) {
          const articleImages = articlesResponse.data.articles
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
        console.error("Error fetching article images:", error instanceof Error ? error.message : String(error));
      }
      
      // Try to fetch page images
      try {
        const pagesResponse = await client.get('/pages.json?limit=20&fields=id,title,body_html');
        
        if (pagesResponse.data && pagesResponse.data.pages) {
          // Extract image URLs from HTML content
          const pageImages = [];
          for (const page of pagesResponse.data.pages) {
            if (page.body_html) {
              // Try to extract image URLs using regex
              const imgRegex = /<img[^>]+src="([^">]+)"/g;
              let match;
              while ((match = imgRegex.exec(page.body_html)) !== null) {
                if (match[1] && match[1].startsWith('http')) {
                  pageImages.push({
                    id: `page-image-${page.id}-${pageImages.length}`,
                    url: match[1],
                    filename: `Page: ${page.title.substring(0, 30)}...`,
                    content_type: 'image/jpeg',
                    alt: page.title,
                    source: 'shopify_media'
                  });
                }
              }
            }
          }
          
          console.log(`Found ${pageImages.length} images in pages`);
          allMediaFiles.push(...pageImages);
        }
      } catch (error) {
        console.error("Error extracting page images:", error instanceof Error ? error.message : String(error));
      }
      
      // Try theme assets if we still don't have many images
      if (allMediaFiles.length < 20) {
        try {
          // Get the active theme ID first
          const themesResponse = await client.get('/themes.json');
          
          if (themesResponse.data && themesResponse.data.themes) {
            const activeTheme = themesResponse.data.themes.find((theme: any) => theme.role === 'main');
            
            if (activeTheme && activeTheme.id) {
              console.log(`Found active theme ${activeTheme.id} for store ${store.shopName}`);
              
              // Get all assets for the active theme
              const assetsResponse = await client.get(`/themes/${activeTheme.id}/assets.json`);
              
              if (assetsResponse.data && assetsResponse.data.assets) {
                const imageAssets = assetsResponse.data.assets
                  .filter((asset: any) => {
                    // Only include image assets that aren't theme files
                    const isImage = asset.content_type && 
                      (asset.content_type.startsWith('image/') || 
                      (asset.key && (
                        asset.key.endsWith('.jpg') || 
                        asset.key.endsWith('.jpeg') || 
                        asset.key.endsWith('.png') || 
                        asset.key.endsWith('.gif')
                      ))
                      );
                    
                    const isNotThemeFile = asset.key && 
                      !asset.key.startsWith('config/') && 
                      !asset.key.startsWith('layout/') && 
                      !asset.key.startsWith('templates/');
                    
                    return isImage && isNotThemeFile;
                  })
                  .map((asset: any) => {
                    // Convert to our file format
                    let assetUrl = asset.public_url;
                    
                    // For keys that don't have a set public_url
                    if (!assetUrl && asset.key) {
                      // Create CDN URL from the key
                      assetUrl = `https://cdn.shopify.com/s/files/1/0/0/1/products/${asset.key}`;
                    }
                    
                    return {
                      id: `theme-asset-${asset.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
                      url: assetUrl,
                      filename: asset.key.split('/').pop() || 'Theme Asset',
                      content_type: asset.content_type || 'image/jpeg',
                      alt: asset.key.split('/').pop() || 'Theme Asset',
                      source: 'shopify_media'
                    };
                  });
                
                console.log(`Found ${imageAssets.length} image assets in theme`);
                allMediaFiles.push(...imageAssets);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching theme assets:", error instanceof Error ? error.message : String(error));
        }
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
  async getProductImages(store: ShopifyStore, productId: string): Promise<any[]> {
    try {
      console.log(`MediaService: Fetching images for product ${productId}`);
      const client = this.shopifyService.getClient(store.shopName, store.accessToken);
      const productImages: any[] = [];
      
      // Get detailed product information
      const productResponse = await client.get(`/products/${productId}.json`);
      
      if (!productResponse.data || !productResponse.data.product) {
        console.log(`No product found with ID ${productId}`);
        return [];
      }
      
      const product = productResponse.data.product;
      
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
          if (variant.image_id) {
            // Check if this variant image is already included
            const variantImageExists = productImages.some(img => 
              img.id === `product-${product.id}-image-${variant.image_id}`
            );
            
            if (!variantImageExists) {
              try {
                // Get variant image directly
                const variantImageResponse = await client.get(`/variants/${variant.id}.json`);
                
                if (variantImageResponse.data && 
                    variantImageResponse.data.variant && 
                    variantImageResponse.data.variant.image_id) {
                  
                  // Fetch the image details
                  const imageResponse = await client.get(`/products/${productId}/images/${variant.image_id}.json`);
                  
                  if (imageResponse.data && imageResponse.data.image && imageResponse.data.image.src) {
                    const variantImage = imageResponse.data.image;
                    
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
                }
              } catch (error) {
                console.error(`Error fetching variant image: ${error instanceof Error ? error.message : String(error)}`);
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
  async getAllContentFiles(store: ShopifyStore): Promise<any[]> {
    // For backward compatibility with the old implementation
    return this.getShopifyMediaFiles(store);
  }
}