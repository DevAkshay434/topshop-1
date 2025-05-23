import { Router, Request, Response } from 'express';
import axios from 'axios';
import { db } from '../db';
import * as shopify from '../services/shopify';

// Initialize router
const mediaRouter = Router();

/**
 * Get all images for a specific product
 */
mediaRouter.get('/product-images', async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId;
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required' 
      });
    }
    
    // Get the authenticated store for the current user's session
    const store = res.locals.store;
    if (!store) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authenticated Shopify store found'
      });
    }
    
    // Fetch product details from Shopify
    const product = await shopify.fetchProduct(store, productId as string);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Extract and format images
    const allImages = [];
    const uniqueImageUrls = new Set();
    
    // Main product image
    if (product.image && product.image.src) {
      uniqueImageUrls.add(product.image.src);
      allImages.push({
        id: `product-${product.id}-main`,
        url: product.image.src,
        alt: product.title,
        title: product.title,
        source: 'product',
        product_id: product.id,
        product_title: product.title,
        selected: false
      });
    }
    
    // Additional product images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((image, index) => {
        if (image && image.src && !uniqueImageUrls.has(image.src)) {
          uniqueImageUrls.add(image.src);
          allImages.push({
            id: `product-${product.id}-image-${index}`,
            url: image.src,
            alt: image.alt || `${product.title} - Image ${index + 1}`,
            title: product.title,
            source: 'product',
            product_id: product.id,
            product_title: product.title,
            selected: false
          });
        }
      });
    }
    
    // Variant images
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant, variantIndex) => {
        if (variant.image && variant.image.src && !uniqueImageUrls.has(variant.image.src)) {
          uniqueImageUrls.add(variant.image.src);
          allImages.push({
            id: `variant-${variant.id}`,
            url: variant.image.src,
            alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
            title: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
            source: 'variant',
            product_id: product.id,
            product_title: product.title,
            selected: false
          });
        }
      });
    }
    
    return res.json({
      success: true,
      images: allImages,
      product: {
        id: product.id,
        title: product.title
      }
    });
    
  } catch (error) {
    console.error('Error fetching product images:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching product images',
      error: error.message 
    });
  }
});

/**
 * Get images from Shopify Media Library
 */
mediaRouter.get('/shopify-media-library', async (req: Request, res: Response) => {
  try {
    // Get the authenticated store for the current user's session
    const store = res.locals.store;
    if (!store) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authenticated Shopify store found' 
      });
    }
    
    // Fetch media from Shopify
    const mediaFiles = await shopify.fetchMediaLibrary(store);
    
    if (!mediaFiles || !Array.isArray(mediaFiles)) {
      return res.status(404).json({ 
        success: false, 
        message: 'No media files found' 
      });
    }
    
    // Format the media files for the frontend
    const mediaImages = [];
    
    // Process all media library images
    mediaFiles.forEach((image, index) => {
      if (image && image.url) {
        // Ensure the URL starts with https://
        let imageUrl = image.url;
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = 'https://' + imageUrl;
        }
        
        // Make sure we use CDN URLs for proper image loading
        if (!imageUrl.includes('cdn.shopify.com') && imageUrl.includes('shopify.com')) {
          try {
            const urlParts = imageUrl.split('/');
            const domainParts = urlParts[2].split('.');
            if (domainParts.length > 0) {
              const storeName = domainParts[0];
              const pathPart = urlParts.slice(3).join('/');
              imageUrl = `https://cdn.shopify.com/s/files/1/${storeName}/${pathPart}`;
            }
          } catch (err) {
            console.warn("Failed to convert URL to CDN format:", imageUrl);
          }
        }
        
        // Filter to only include image files
        const filename = image.filename || '';
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename) || 
                       image.type?.includes('image/');
        
        if (isImage) {
          mediaImages.push({
            id: image.id || `media-${index}`,
            url: imageUrl,
            alt: image.alt || image.filename || 'Shopify image',
            title: image.filename || image.title || 'Shopify image',
            source: 'shopify',
            selected: false
          });
        }
      }
    });
    
    return res.json({
      success: true,
      images: mediaImages
    });
    
  } catch (error) {
    console.error('Error fetching Shopify Media Library:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching media library',
      error: error.message 
    });
  }
});

/**
 * Search for images on Pexels
 */
mediaRouter.get('/pexels-search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query must be at least 3 characters' 
      });
    }
    
    // Get Pexels API key from environment variables
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    
    if (!pexelsApiKey) {
      console.error('Pexels API key is missing');
      return res.status(503).json({ 
        success: false, 
        message: 'Pexels API is not configured' 
      });
    }
    
    // Make request to Pexels API
    const response = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20`, {
      headers: {
        'Authorization': pexelsApiKey
      }
    });
    
    if (!response.data || !response.data.photos) {
      return res.status(404).json({ 
        success: false, 
        message: 'No images found' 
      });
    }
    
    // Format response for our frontend
    const images = response.data.photos.map((photo: any) => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      url: photo.url,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
      alt: photo.alt || query,
      src: {
        original: photo.src.original,
        large: photo.src.large,
        medium: photo.src.medium,
        small: photo.src.small,
        thumbnail: photo.src.tiny
      }
    }));
    
    return res.json({
      success: true,
      images,
      query
    });
    
  } catch (error) {
    console.error('Error searching Pexels:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error searching for images',
      error: error.message 
    });
  }
});

/**
 * Upload image file(s)
 */
mediaRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    // Check if files were provided
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files were uploaded' 
      });
    }
    
    const store = res.locals.store;
    if (!store) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authenticated Shopify store found' 
      });
    }
    
    // Handle multiple files or single file upload
    const files = Array.isArray(req.files.files) ? req.files.files : [req.files.files];
    
    // Upload each file to Shopify Media Library
    const uploadPromises = files.map(async (file: any) => {
      return await shopify.uploadToMediaLibrary(store, file.buffer, file.originalname, file.mimetype);
    });
    
    const uploadedFiles = await Promise.all(uploadPromises);
    
    const uploadedImages = uploadedFiles.map((file, index) => ({
      id: `upload-${file.id || Date.now() + index}`,
      url: file.url,
      alt: file.alt || file.filename || `Uploaded image ${index + 1}`,
      title: file.filename || `Uploaded image ${index + 1}`,
      source: 'upload',
      selected: false
    }));
    
    return res.json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} file(s)`,
      images: uploadedImages
    });
    
  } catch (error) {
    console.error('Error uploading files:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error uploading files',
      error: error.message 
    });
  }
});

export { mediaRouter };