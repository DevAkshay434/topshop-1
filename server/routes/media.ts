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

    // Collection to store all images
    const allImages = [];

    // Try to get product images first
    try {
      console.log("Fetching product images from Shopify...");
      const productsResponse = await shopifyClient.get('/products.json?limit=50&fields=id,title,image,images');
      
      if (productsResponse.data && productsResponse.data.products) {
        const products = productsResponse.data.products;
        
        // Process each product
        for (const product of products) {
          // Add all product images
          if (product.images && Array.isArray(product.images)) {
            product.images.forEach((image, index) => {
              if (image && image.src) {
                allImages.push({
                  id: `product-${product.id}-image-${index}`,
                  url: image.src,
                  alt: image.alt || `${product.title} - Image ${index + 1}`,
                  title: `${product.title} - Image ${index + 1}`,
                  source: 'shopify'
                });
              }
            });
          }
        }
        
        console.log(`Successfully fetched ${allImages.length} product images`);
      }
    } catch (error) {
      console.error("Error fetching product images:", error);
    }

    // Try to get theme assets
    try {
      console.log("Fetching theme assets from Shopify...");
      
      // Get the main theme ID
      const themesResponse = await shopifyClient.get('/themes.json');
      if (themesResponse.data && themesResponse.data.themes) {
        // Find the main theme (published/active theme)
        const mainTheme = themesResponse.data.themes.find(theme => theme.role === 'main');
        
        if (mainTheme) {
          // Get the assets for the main theme
          const assetsResponse = await shopifyClient.get(`/themes/${mainTheme.id}/assets.json`);
          
          if (assetsResponse.data && assetsResponse.data.assets) {
            // Filter for image assets and add to our collection
            assetsResponse.data.assets
              .filter(asset => 
                asset.content_type && 
                asset.content_type.startsWith('image/') && 
                asset.public_url
              )
              .forEach(asset => {
                allImages.push({
                  id: `theme-asset-${asset.key.replace(/\//g, '-')}`,
                  url: asset.public_url,
                  alt: asset.key || 'Theme asset',
                  title: asset.key || 'Theme asset',
                  source: 'shopify'
                });
              });
            
            console.log(`Successfully fetched ${assetsResponse.data.assets.length} theme assets`);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching theme assets:", error);
    }
    
    // If we still have no images, try the files API as last resort
    if (allImages.length === 0) {
      try {
        console.log("Trying files API as last resort...");
        const filesResponse = await shopifyClient.get('/files.json?limit=250');
        
        if (filesResponse.data && filesResponse.data.files) {
          filesResponse.data.files
            .filter(file => 
              file.content_type && 
              file.content_type.startsWith('image/') &&
              file.url
            )
            .forEach(file => {
              allImages.push({
                id: `file-${file.id}`,
                url: file.url,
                alt: file.alt || file.name || 'Media file',
                title: file.name || 'Media file',
                source: 'shopify'
              });
            });
          
          console.log(`Successfully fetched ${allImages.length} files from Files API`);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    }
    
    // Remove any duplicate URLs
    const uniqueUrls = new Set();
    const uniqueImages = allImages.filter(image => {
      if (uniqueUrls.has(image.url)) {
        return false;
      }
      uniqueUrls.add(image.url);
      return true;
    });

    console.log(`Successfully fetched ${uniqueImages.length} unique media files from Shopify`);

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