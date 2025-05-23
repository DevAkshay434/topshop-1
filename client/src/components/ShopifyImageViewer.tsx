import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

interface ShopifyImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  selected?: boolean;
  selectionType?: 'primary' | 'secondary' | 'none';
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
  height,
  objectFit = 'cover',
  onLoad,
  selected = false,
  selectionType = 'none'
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Reset state when src changes
  useEffect(() => {
    if (!src || typeof src !== 'string') {
      setHasError(true);
      return;
    }
    
    // Try to fix the URL immediately
    const processedUrl = processImageUrl(src);
    console.log(`Processing image URL: ${src} → ${processedUrl}`);
    setImageSrc(processedUrl);
    setHasError(false);
    setLoadAttempts(0);
  }, [src]);

  // Enhanced URL processing for all image types (Shopify, Pexels, etc.)
  const processImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return '';
    }

    try {
      // Handle Pexels special case for better reliability
      if (url.includes('pexels.com')) {
        // Make sure we're using the right size for better loading
        if (url.includes('?')) {
          // Extract base URL without query params
          const baseUrl = url.split('?')[0];
          return `${baseUrl}?auto=compress&cs=tinysrgb&h=350`;
        }
        return `${url}?auto=compress&cs=tinysrgb&h=350`;
      }
      
      // Handle other stock image services
      if (url.includes('pixabay.com') || url.includes('unsplash.com')) {
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

  // Advanced fallback strategy with multiple attempts for different image sources
  const handleImageError = () => {
    // Limit retry attempts
    if (loadAttempts >= 3 || hasError) {
      setHasError(true);
      return;
    }
    
    setLoadAttempts(prev => prev + 1);
    console.log(`Image failed to load (attempt ${loadAttempts + 1}):`, imageSrc);
    
    // Different fallback strategies based on image source
    if (src.includes('pexels.com')) {
      // For Pexels, try different size formats
      const sizes = ['large', 'medium', 'small'];
      const formats = ['?auto=compress&cs=tinysrgb&h=650&w=940', '?auto=compress&cs=tinysrgb&h=350', ''];
      
      // Extract base URL without any params
      let baseUrl = src;
      if (baseUrl.includes('?')) {
        baseUrl = baseUrl.split('?')[0];
      }
      
      // Try a different size
      const newFormat = formats[loadAttempts % formats.length];
      const fallbackUrl = `${baseUrl}${newFormat}`;
      
      console.log(`Trying Pexels fallback format ${loadAttempts}:`, fallbackUrl);
      setImageSrc(fallbackUrl);
    } 
    else if (src.includes('cdn.shopify.com')) {
      // For Shopify CDN, try different formats
      const formats = ['.jpg', '.png', '.webp'];
      
      // Remove existing extension if any
      let baseUrl = src;
      if (/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(baseUrl)) {
        baseUrl = baseUrl.replace(/\.(jpg|jpeg|png|webp|gif)($|\?)/i, '$2');
      }
      
      // If we have a query string, keep it separated
      let queryPart = '';
      if (baseUrl.includes('?')) {
        const parts = baseUrl.split('?');
        baseUrl = parts[0];
        queryPart = '?' + parts[1];
      }
      
      // Try a different format
      const newFormat = formats[loadAttempts % formats.length];
      const fallbackUrl = `${baseUrl}${newFormat}${queryPart}`;
      
      console.log(`Trying Shopify fallback format ${loadAttempts}:`, fallbackUrl);
      setImageSrc(fallbackUrl);
    }
    else {
      // Generic approach for other image sources
      // Try adding different extensions
      const extensions = ['.jpg', '.png', '.jpeg'];
      
      // Clean the URL
      let baseUrl = src;
      if (/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(baseUrl)) {
        baseUrl = baseUrl.replace(/\.(jpg|jpeg|png|webp|gif)($|\?)/i, '$2');
      }
      
      // Try a different extension
      const newExt = extensions[loadAttempts % extensions.length];
      const fallbackUrl = `${baseUrl}${newExt}`;
      
      console.log(`Trying generic fallback format ${loadAttempts}:`, fallbackUrl);
      setImageSrc(fallbackUrl);
    }
  };

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle successful load
  const handleImageLoad = () => {
    setIsLoading(false);
    // Call the parent onLoad callback if provided
    if (onLoad) {
      onLoad();
    }
  };

  // Get selection border color
  const getSelectionBorderClass = () => {
    if (!selected) return '';
    
    if (selectionType === 'primary') {
      return 'ring-4 ring-blue-500';
    } else if (selectionType === 'secondary') {
      return 'ring-4 ring-green-500';
    }
    
    return '';
  };

  // Determine selection indicator badge
  const getSelectionBadge = () => {
    if (!selected) return null;
    
    const badgeClass = selectionType === 'primary' 
      ? 'bg-blue-500 text-white' 
      : 'bg-green-500 text-white';
    
    const label = selectionType === 'primary' ? 'Primary' : 'Secondary';
    
    return (
      <div className={`absolute top-2 right-2 z-10 rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>
        {label}
      </div>
    );
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 ${className} ${getSelectionBorderClass()}`} 
        style={{ width, height }}
      >
        {getSelectionBadge()}
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 text-xs">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${getSelectionBorderClass()}`}>
      {getSelectionBadge()}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ 
          width: width || '100%', 
          height: height || 'auto', 
          objectFit
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

export default ShopifyImageViewer;