import React, { useState } from 'react';
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
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);

  // Attempts to normalize Shopify URL to ensure it works across environments
  const normalizeShopifyUrl = (url: string): string => {
    // If already a CDN URL or doesn't contain shopify.com, return as is
    if (url.includes('cdn.shopify.com') || !url.includes('shopify.com')) {
      return url;
    }

    try {
      // Try to convert to CDN format
      const urlObj = new URL(url);
      // Create CDN version (this format is more reliable)
      return `https://cdn.shopify.com${urlObj.pathname}${urlObj.search}`;
    } catch (error) {
      console.error("Failed to normalize Shopify URL:", url);
      return url;
    }
  };

  const handleImageError = () => {
    if (imageSrc === src) {
      // First try normalized URL
      const normalizedUrl = normalizeShopifyUrl(src);
      if (normalizedUrl !== src) {
        setImageSrc(normalizedUrl);
        return;
      }
    }

    // If we already tried the normalized URL or normalization failed, show error state
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