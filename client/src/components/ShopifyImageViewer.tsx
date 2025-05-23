import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface ShopifyImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * A specialized component for displaying Shopify images that handles various URL formats
 * and provides fallbacks for failed image loads
 */
const ShopifyImageViewer: React.FC<ShopifyImageViewerProps> = ({ 
  src, 
  alt = "Shopify image", 
  className = "", 
  width, 
  height 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  
  // Reset state when src changes
  useEffect(() => {
    if (!src || typeof src !== 'string') {
      setHasError(true);
      return;
    }
    
    // Try to fix the URL immediately
    const processedUrl = processShopifyUrl(src);
    console.log(`Processing Shopify image URL: ${src} → ${processedUrl}`);
    setImageSrc(processedUrl);
    setHasError(false);
  }, [src]);

  // Enhanced URL processing for all image types (Shopify, Pexels, etc.)
  const processShopifyUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return '';
    }

    try {
      // Pexels and other external image services shouldn't be modified
      if (url.includes('pexels.com') || 
          url.includes('pixabay.com') || 
          url.includes('unsplash.com')) {
        return url;
      }
      
      // Simple case - already a CDN URL with proper format
      if (url.includes('cdn.shopify.com') && url.startsWith('https://')) {
        return url;
      }
      
      // Handle protocol-relative URLs (starting with //)
      if (url.startsWith('//')) {
        return 'https:' + url;
      }
      
      // Fix missing protocol
      if (url.startsWith('cdn.shopify.com')) {
        return 'https://' + url;
      }
      
      // If it's using http, upgrade to https
      if (url.startsWith('http://')) {
        return 'https://' + url.substring(7);
      }
      
      // For any external service URLs, leave as-is if they have https
      if (url.startsWith('https://')) {
        return url;
      }
      
      // Check if it's a direct file URL pattern like files/image.jpg
      if (url.match(/files\/.*\.(jpg|jpeg|png|gif|webp)/i)) {
        if (!url.includes('cdn.shopify.com')) {
          return `https://cdn.shopify.com/s/${url}`;
        }
      }

      // Direct image URL check
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i)) {
        // Already an image URL, just ensure it has HTTPS
        if (!url.startsWith('http')) {
          return `https://${url}`;
        }
        return url;
      }
      
      // For Shopify URLs with domain but not in CDN format
      if (url.includes('shopify.com') && !url.includes('cdn.shopify.com')) {
        try {
          // Try to convert admin or other Shopify URLs to CDN format
          const urlObj = new URL(url);
          
          // Find the /files/ or /products/ part in the path
          const filesMatch = urlObj.pathname.match(/\/(files|products|assets|shops)\/(.+)/);
          if (filesMatch) {
            return `https://cdn.shopify.com/s${filesMatch[0]}${urlObj.search}`;
          }
          
          // Check for product image pattern /admin/products/{product_id}/images/{image_id}
          const productImageMatch = urlObj.pathname.match(/\/admin\/products\/(\d+)\/images\/(\d+)/);
          if (productImageMatch) {
            // Try to convert to CDN URL format - use the store path from original URL
            const storePath = urlObj.hostname.split('.')[0];
            return `https://cdn.shopify.com/s/files/1/${storePath}/products/${productImageMatch[2]}.jpg`;
          }
        } catch (error) {
          console.error("Failed to parse Shopify URL:", url);
        }
      }
      
      // Last resort - return the original
      return url;
    } catch (error) {
      console.error("Error processing image URL:", url, error);
      return url;
    }
  };

  // Attempt multiple fallback strategies
  const handleImageError = () => {
    // Already in error state or no source to work with
    if (hasError || !src || typeof src !== 'string') {
      setHasError(true);
      return;
    }
    
    // Try several fallback approaches
    const originalUrl = src;
    const currentUrl = imageSrc;
    
    console.log("Image failed to load, attempting fallbacks:", currentUrl);
    
    // Try CDN format for Shopify URLs if we haven't already
    if (currentUrl === originalUrl || !currentUrl.includes('cdn.shopify.com')) {
      try {
        // Try different patterns of Shopify URLs
        
        // Pattern 1: Extract product/variant IDs from URL paths
        const matches = originalUrl.match(/\/([0-9]+)\/([0-9]+)\/([^?]+)/);
        if (matches) {
          const [, shopId, productId, imagePath] = matches;
          const cdnUrl = `https://cdn.shopify.com/s/files/${shopId}/${productId}/${imagePath}`;
          console.log("Trying CDN URL format 1:", cdnUrl);
          setImageSrc(cdnUrl);
          return; // Wait for the next error cycle if this fails
        }
        
        // Pattern 2: Try a more generic approach for product images
        if (originalUrl.includes('products')) {
          const productMatch = originalUrl.match(/\/products\/([^\/\?]+)/);
          if (productMatch) {
            const cdnUrl = `https://cdn.shopify.com/s/files/1/0938/4158/8538/products/${productMatch[1]}.jpg`;
            console.log("Trying CDN URL format 2:", cdnUrl);
            setImageSrc(cdnUrl);
            return;
          }
        }
        
        // Pattern 3: For admin URLs, try to extract the image ID
        const adminImageMatch = originalUrl.match(/\/admin\/products\/\d+\/images\/(\d+)/);
        if (adminImageMatch) {
          const imageId = adminImageMatch[1];
          const cdnUrl = `https://cdn.shopify.com/s/files/1/0938/4158/8538/products/image_${imageId}.jpg`;
          console.log("Trying admin image URL format:", cdnUrl);
          setImageSrc(cdnUrl);
          return;
        }
        
        // Pattern 4: Try direct file access with more permissive pattern
        if (originalUrl.includes('files')) {
          const filesMatch = originalUrl.match(/files\/(.+?)($|\?)/);
          if (filesMatch) {
            const filePath = filesMatch[1];
            const cdnUrl = `https://cdn.shopify.com/s/files/${filePath}`;
            console.log("Trying files URL format:", cdnUrl);
            setImageSrc(cdnUrl);
            return;
          }
        }
      } catch (error) {
        console.error("Advanced URL transform failed", error);
      }
    }
    
    // Last resort - try a completely different approach with direct image
    if (!currentUrl.includes('.jpg') && !currentUrl.includes('.png') && !currentUrl.includes('.jpeg')) {
      // Try adding extension
      const withExtension = `${currentUrl}.jpg`;
      console.log("Trying with extension:", withExtension);
      setImageSrc(withExtension);
      return;
    }
    
    // If nothing worked, show the error UI
    console.log("All image fallbacks failed, showing error UI");
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`} style={{ width, height }}>
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 text-xs">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleImageError}
      loading="lazy"
    />
  );
};

export default ShopifyImageViewer;