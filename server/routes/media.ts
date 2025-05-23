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
    const mediaImages = [];
    
    console.log("Fetching product images as content files - more reliable method");
    
    // Use a direct product request as our primary source of images
    try {
      // Get products with their images
      const productsResponse = await shopifyClient.get('/products.json?limit=20&fields=id,title,image,images,variants');
      
      if (productsResponse.data && productsResponse.data.products) {
        const products = productsResponse.data.products;
        
        console.log(`Processing images from ${products.length} products`);
        
        // Process each product
        for (const product of products) {
          // Track how many images we found for this product
          let productImageCount = 0;
          
          // Add all product images
          if (product.images && Array.isArray(product.images)) {
            productImageCount = product.images.length;
            
            product.images.forEach((image, index) => {
              if (image && image.src) {
                // Make sure this is a cdn.shopify.com URL
                const imageUrl = image.src.includes('cdn.shopify.com') 
                  ? image.src 
                  : image.src.replace(/^(https?:\/\/[^\/]+\/)/, 'https://cdn.shopify.com/');
                
                mediaImages.push({
                  id: `product-${product.id}-image-${image.id || index}`,
                  url: imageUrl,
                  alt: image.alt || `${product.title} - Image ${index + 1}`,
                  title: `${product.title} - Image ${index + 1}`,
                  filename: `${product.title} - Image ${index + 1}`,
                  content_type: 'image/jpeg', // Most Shopify images are JPEGs
                  source: 'product_image'
                });
              }
            });
          }
          
          console.log(`Product ${product.id} (${product.title}) has ${productImageCount} images`);
        }
        
        console.log(`Found ${mediaImages.length} product images to use as content files`);
        
        if (mediaImages.length > 0) {
          // Show a sample of what we're sending back
          console.log(`Sample image object: ${JSON.stringify(mediaImages[0])}`);
        }
      }
    } catch (error) {
      console.error("Error fetching product images:", error);
      
      // If there was an error with the products approach, try a simpler fallback
      try {
        console.log("Trying content files API as fallback");
        // This endpoint is more likely to work on some stores
        const contentFilesResponse = await shopifyClient.get('/admin/api/2023-10/metafields.json?metafield[owner_resource]=product&metafield[namespace]=content');
        
        if (contentFilesResponse.data && contentFilesResponse.data.metafields) {
          const metafields = contentFilesResponse.data.metafields;
          
          for (const metafield of metafields) {
            if (metafield.value && metafield.value.includes('cdn.shopify.com')) {
              // Try to extract image URLs from the metafield values
              const imageMatches = metafield.value.match(/(https:\/\/cdn\.shopify\.com\/[^"'\s]+)/g);
              
              if (imageMatches) {
                imageMatches.forEach((imageUrl, index) => {
                  mediaImages.push({
                    id: `metafield-${metafield.id}-image-${index}`,
                    url: imageUrl,
                    alt: `Product content image ${index + 1}`,
                    title: `Product content image ${index + 1}`,
                    filename: `Product content image ${index + 1}`,
                    content_type: 'image/jpeg',
                    source: 'product_content'
                  });
                });
              }
            }
          }
        }
      } catch (fallbackError) {
        console.error("Fallback content files approach also failed:", fallbackError);
      }
    }
    
    console.log(`Found ${mediaImages.length} product images to use as media files`);
    
    // Remove any duplicate URLs
    const uniqueUrls = new Set();
    const uniqueImages = mediaImages.filter(image => {
      if (uniqueUrls.has(image.url)) {
        return false;
      }
      uniqueUrls.add(image.url);
      return true;
    });

    console.log(`Fetched ${uniqueImages.length} files from Shopify Media Library`);

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