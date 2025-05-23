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
    setImageSrc(processedUrl);
    setHasError(false);
  }, [src]);

  // Comprehensive URL processing for Shopify images
  const processShopifyUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return '';
    }

    try {
      // Handle protocol-relative URLs (starting with //)
      if (url.startsWith('//')) {
        url = 'https:' + url;
      }
      
      // Fix missing protocol
      if (url.startsWith('cdn.shopify.com')) {
        url = 'https://' + url;
      }
      
      // If it's already a CDN URL, ensure it has https
      if (url.includes('cdn.shopify.com')) {
        // In case it's using http, upgrade to https
        if (url.startsWith('http:')) {
          url = 'https:' + url.substring(5);
        }
        return url;
      }
      
      // Handle URLs with /static/ path which are commonly used in Shopify admin
      if (url.includes('/static/')) {
        try {
          const urlObj = new URL(url);
          return `https://cdn.shopify.com${urlObj.pathname}${urlObj.search}`;
        } catch (error) {
          console.error("Failed to parse static URL:", url);
        }
      }
      
      // For Shopify URLs that aren't in CDN format, convert them
      if (url.includes('shopify.com')) {
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
            // Try to convert to CDN URL format
            return `https://cdn.shopify.com/s/files/1/0000/0000/${productImageMatch[1]}/products/${productImageMatch[2]}.jpg`;
          }
          
          // Otherwise just use the pathname as is
          return `https://cdn.shopify.com${urlObj.pathname}${urlObj.search}`;
        } catch (error) {
          console.error("Failed to parse Shopify URL:", url);
        }
      }
      
      // Handle direct image URLs that might not have shopify.com in them
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i)) {
        // It's an image URL but not recognized as Shopify, return as is
        return url;
      }
      
      // If nothing else applies, return the original
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
    
    // If we're currently using the original or a first transform, try cdn.shopify.com format
    if (currentUrl === originalUrl || !currentUrl.includes('cdn.shopify.com')) {
      try {
        // Try force-converting to CDN format
        const matches = originalUrl.match(/\/([0-9]+)\/([0-9]+)\/([^?]+)/);
        if (matches) {
          const [, shopId, productId, imagePath] = matches;
          const cdnUrl = `https://cdn.shopify.com/s/files/${shopId}/${productId}/${imagePath}`;
          setImageSrc(cdnUrl);
          return; // Wait for the next error cycle if this fails
        }
      } catch (error) {
        console.error("Advanced URL transform failed", error);
      }
    }
    
    // If nothing worked, show the error UI
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