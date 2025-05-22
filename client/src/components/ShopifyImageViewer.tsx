import React, { useState } from 'react';

interface ShopifyImageViewerProps {
  imageUrl: string;
  alt?: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  onClick?: () => void;
  showPlaceholder?: boolean;
}

/**
 * A reliable image component for displaying Shopify images
 * Handles CDN conversions and fallbacks automatically
 */
export function ShopifyImageViewer({
  imageUrl,
  alt = 'Product image',
  className = '',
  width = 'auto',
  height = 'auto',
  onClick,
  showPlaceholder = false
}: ShopifyImageViewerProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract the product title from the alt text if available
  const productTitle = alt?.split(' - ')[0] || 'Product';
  
  // Function to convert a Shopify URL to CDN format
  const convertToCdnUrl = (url: string): string => {
    try {
      if (url.includes('shopify.com') && !url.includes('cdn.shopify.com')) {
        const parsedUrl = new URL(url);
        return `https://cdn.shopify.com${parsedUrl.pathname}${parsedUrl.search}`;
      }
      return url;
    } catch (error) {
      console.error('Failed to convert to CDN URL:', error);
      return url;
    }
  };
  
  // Start with the original URL, convert if needed
  const [currentSrc, setCurrentSrc] = useState(imageUrl);

  // Handle image load failure
  const handleImageError = () => {
    if (currentSrc === imageUrl && currentSrc.includes('shopify.com') && !currentSrc.includes('cdn.shopify.com')) {
      // Try CDN version
      const cdnUrl = convertToCdnUrl(imageUrl);
      console.log(`Retrying with CDN URL: ${cdnUrl}`);
      setCurrentSrc(cdnUrl);
    } else {
      // If we've already tried the CDN version or it's not a Shopify URL, show placeholder
      setHasError(true);
    }
    setIsLoading(false);
  };

  // Handle successful image loading
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Show placeholder if error or if placeholder is forced
  const shouldShowPlaceholder = hasError || showPlaceholder;

  return (
    <div 
      className={`relative ${className}`} 
      style={{ width, height }}
      onClick={onClick}
    >
      {isLoading && !shouldShowPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="sr-only">Loading...</span>
        </div>
      )}
      
      {shouldShowPlaceholder ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border rounded">
          <div className="text-center p-2">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="mt-1 text-sm text-gray-500 truncate">
              {productTitle || alt}
            </p>
          </div>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-contain ${hasError ? 'hidden' : ''}`}
          style={{ 
            objectFit: 'contain',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );
}

export default ShopifyImageViewer;