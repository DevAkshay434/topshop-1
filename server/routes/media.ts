import { Router, Request, Response } from "express";
import { storage } from "../storage";
import axios from "axios";

const mediaRouter = Router();

/**
 * Fetches and returns all product images from Shopify
 * More reliable approach that directly accesses the Shopify Admin API
 */
mediaRouter.get("/shopify-product-images", async (_req: Request, res: Response) => {
  try {
    // Get the Shopify connection
    const connection = await storage.getShopifyConnection();
    if (!connection || !connection.isConnected) {
      return res.status(404).json({
        success: false,
        message: "No active Shopify connection found"
      });
    }

    // Create store client for API calls
    const store = {
      shopName: connection.storeName,
      accessToken: connection.accessToken
    };

    // Set up Shopify API client
    const shopifyClient = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Fetch all products with their images
    const response = await shopifyClient.get('/products.json?fields=id,title,image,images,variants&limit=50');
    
    if (!response.data || !response.data.products) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch products from Shopify"
      });
    }

    // Extract all images from products
    const allImages = [];
    const products = response.data.products;

    // Process each product
    for (const product of products) {
      // Add main product image
      if (product.image && product.image.src) {
        allImages.push({
          id: `product-${product.id}-main`,
          url: product.image.src,
          alt: product.title || 'Product image',
          title: product.title,
          source: 'product'
        });
      }

      // Add additional product images
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((image, index) => {
          // Skip duplicate images
          if (image && image.src && !allImages.some(img => img.url === image.src)) {
            allImages.push({
              id: `product-${product.id}-image-${index}`,
              url: image.src,
              alt: image.alt || `${product.title} - Image ${index + 1}`,
              title: product.title,
              source: 'product'
            });
          }
        });
      }

      // Add variant images
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach((variant, variantIndex) => {
          if (variant.image && variant.image.src && !allImages.some(img => img.url === variant.image.src)) {
            allImages.push({
              id: `variant-${variant.id}`,
              url: variant.image.src,
              alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
              title: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
              source: 'variant'
            });
          }
        });
      }
    }

    console.log(`Successfully fetched ${allImages.length} unique product and variant images`);

    return res.json({
      success: true,
      images: allImages
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching Shopify product images:", errorMessage);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product images: " + errorMessage
    });
  }
});

/**
 * Fetch all media files from Shopify Media Library
 * This provides access to all uploaded files, not just product images
 */
mediaRouter.get("/shopify-media-library", async (_req: Request, res: Response) => {
  try {
    // Get the Shopify connection
    const connection = await storage.getShopifyConnection();
    if (!connection || !connection.isConnected) {
      return res.status(404).json({
        success: false,
        message: "No active Shopify connection found"
      });
    }

    // Create store client for API calls
    const store = {
      shopName: connection.storeName,
      accessToken: connection.accessToken
    };

    // Set up Shopify API client
    const shopifyClient = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Collection to store all media images
    const mediaImages = [];
    
    console.log("Fetching assets from various Shopify endpoints to build a complete media library");
    
    // 1. First fetch product images - this is the most reliable source
    try {
      const productsResponse = await shopifyClient.get('/products.json?limit=30&fields=id,title,image,images,variants');
      
      if (productsResponse.data && productsResponse.data.products) {
        const products = productsResponse.data.products;
        
        console.log(`Processing images from ${products.length} products`);
        
        for (const product of products) {
          let productImageCount = 0;
          
          if (product.images && Array.isArray(product.images)) {
            productImageCount = product.images.length;
            
            product.images.forEach((image, index) => {
              if (image && image.src) {
                // Make sure URL is properly formatted with https and cdn.shopify.com
                let imageUrl = image.src;
                if (!imageUrl.startsWith('https://')) {
                  imageUrl = imageUrl.replace(/^http:\/\//, 'https://');
                  if (!imageUrl.startsWith('https://')) {
                    imageUrl = 'https://' + imageUrl;
                  }
                }
                
                mediaImages.push({
                  id: `product-${product.id}-image-${image.id || index}`,
                  url: imageUrl,
                  alt: image.alt || `${product.title} - Image ${index + 1}`,
                  title: `${product.title} - Image ${index + 1}`,
                  filename: `${product.title} - Image ${index + 1}`,
                  content_type: image.src.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
                  source: 'product_image',
                  product_id: product.id,
                  product_title: product.title
                });
              }
            });
          }
          
          console.log(`Product ${product.id} (${product.title}) has ${productImageCount} images`);
        }
      }
    } catch (error) {
      console.error("Error fetching product images:", error);
    }
    
    // 2. Try to get theme assets to get non-product images
    try {
      const themesResponse = await shopifyClient.get('/themes.json');
      if (themesResponse.data && themesResponse.data.themes) {
        // Find the main (active) theme
        const mainTheme = themesResponse.data.themes.find(theme => theme.role === 'main');
        
        if (mainTheme) {
          const assetsResponse = await shopifyClient.get(`/themes/${mainTheme.id}/assets.json`);
          
          if (assetsResponse.data && assetsResponse.data.assets) {
            // Filter for image assets
            const imageAssets = assetsResponse.data.assets.filter(asset => 
              asset.content_type && 
              asset.content_type.startsWith('image/') && 
              asset.public_url
            );
            
            imageAssets.forEach(asset => {
              mediaImages.push({
                id: `theme-asset-${asset.key.replace(/\//g, '-')}`,
                url: asset.public_url,
                alt: asset.key || 'Theme asset',
                title: asset.key || 'Theme asset',
                filename: asset.key,
                content_type: asset.content_type,
                source: 'theme_asset'
              });
            });
            
            console.log(`Added ${imageAssets.length} theme assets`);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching theme assets:", error);
    }
    
    // 3. Try to get article images
    try {
      const articlesResponse = await shopifyClient.get('/articles.json?limit=10&fields=id,title,image');
      
      if (articlesResponse.data && articlesResponse.data.articles) {
        const articles = articlesResponse.data.articles;
        
        articles.forEach(article => {
          if (article.image && article.image.src) {
            mediaImages.push({
              id: `article-${article.id}-image`,
              url: article.image.src,
              alt: article.title || `Article image`,
              title: article.title || `Article image`,
              filename: `Article - ${article.title}`,
              content_type: 'image/jpeg',
              source: 'article_image'
            });
          }
        });
        
        console.log(`Added ${articles.length} article images`);
      }
    } catch (error) {
      console.error("Error fetching article images:", error);
    }
    
    // 4. Try the collection images
    try {
      const collectionsResponse = await shopifyClient.get('/collections.json?limit=20');
      
      if (collectionsResponse.data && collectionsResponse.data.collections) {
        const collections = collectionsResponse.data.collections;
        
        collections.forEach(collection => {
          if (collection.image && collection.image.src) {
            mediaImages.push({
              id: `collection-${collection.id}-image`,
              url: collection.image.src,
              alt: collection.title || `Collection image`,
              title: collection.title || `Collection image`,
              filename: `Collection - ${collection.title}`,
              content_type: 'image/jpeg',
              source: 'collection_image'
            });
          }
        });
        
        console.log(`Added ${collections.length} collection images`);
      }
    } catch (error) {
      console.error("Error fetching collection images:", error);
    }
    
    console.log(`Found a total of ${mediaImages.length} media files to use`);
    
    // Remove any duplicate URLs to avoid showing the same image multiple times
    const uniqueUrls = new Set();
    const uniqueImages = mediaImages.filter(image => {
      if (uniqueUrls.has(image.url)) {
        return false;
      }
      uniqueUrls.add(image.url);
      return true;
    });

    console.log(`Fetched ${uniqueImages.length} unique files from Shopify Media Library`);
    
    // Sort by source type to group similar images together
    uniqueImages.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source.localeCompare(b.source);
      }
      return a.title.localeCompare(b.title);
    });

    // Return the combined result
    return res.json({
      success: true,
      images: uniqueImages
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching Shopify media library:", errorMessage);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch media library: " + errorMessage
    });
  }
});

/**
 * Proxy image URLs through our server to fix CORS issues
 * and ensure proper content-type headers
 */
mediaRouter.get("/proxy-image", async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required"
      });
    }

    // Convert to CDN URL if needed
    let finalUrl = imageUrl;
    if (imageUrl.includes('shopify.com') && !imageUrl.includes('cdn.shopify.com')) {
      try {
        const url = new URL(imageUrl);
        finalUrl = `https://cdn.shopify.com${url.pathname}${url.search}`;
      } catch (error) {
        console.error("Failed to create CDN URL:", error);
      }
    }

    // Fetch the image from Shopify
    const response = await axios.get(finalUrl, {
      responseType: 'arraybuffer'
    });

    // Set appropriate headers
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Return the image data
    return res.send(response.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error proxying image:", errorMessage);
    
    // Return a placeholder image instead of an error
    return res.redirect('https://placehold.co/400x400?text=Image+Not+Available');
  }
});

export { mediaRouter };