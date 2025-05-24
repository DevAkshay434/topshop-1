import React from 'react';
import { Button } from './ui/button';
import { MediaImage } from './MediaSelectionStep';
import ShopifyImageViewer from './ShopifyImageViewer';
import { X, Eye, Star, Plus } from 'lucide-react';
import { Badge } from './ui/badge';

interface SimpleSelectedImagesBarProps {
  primaryImage: MediaImage | null;
  secondaryImages: MediaImage[];
  setPrimaryImage: (image: MediaImage | null) => void;
  setSecondaryImages: (images: MediaImage[]) => void;
  onPreviewImage: (image: MediaImage) => void;
}

/**
 * A simple horizontal bar showing selected primary and secondary images
 */
export default function SimpleSelectedImagesBar({
  primaryImage,
  secondaryImages,
  setPrimaryImage,
  setSecondaryImages,
  onPreviewImage
}: SimpleSelectedImagesBarProps) {
  // Count total selected images
  const totalSelected = (primaryImage ? 1 : 0) + secondaryImages.length;
  
  if (totalSelected === 0) {
    return null;
  }
  
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <h3 className="text-sm font-medium">Selected Images</h3>
          <Badge variant="outline" className="ml-2 text-xs">
            {totalSelected} total
          </Badge>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Primary Image */}
        {primaryImage && (
          <div className="relative w-20 h-20 border-2 border-blue-500 rounded overflow-hidden group">
            <ShopifyImageViewer
              src={primaryImage.url}
              alt={primaryImage.alt || ""}
              className="w-full h-full"
              objectFit="cover"
            />
            <div className="absolute top-0 left-0 right-0 bg-blue-500 px-1 py-0.5">
              <p className="text-white text-xs font-medium text-center">Primary</p>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0 bg-white/90"
                onClick={() => onPreviewImage(primaryImage)}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0 bg-white/90 text-red-500"
                onClick={() => setPrimaryImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Secondary Images */}
        {secondaryImages.map(image => (
          <div key={image.id} className="relative w-20 h-20 border-2 border-green-500 rounded overflow-hidden group">
            <ShopifyImageViewer
              src={image.url}
              alt={image.alt || ""}
              className="w-full h-full"
              objectFit="cover"
            />
            <div className="absolute top-0 left-0 right-0 bg-green-500 px-1 py-0.5">
              <p className="text-white text-xs font-medium text-center">Secondary</p>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0 bg-white/90"
                onClick={() => onPreviewImage(image)}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0 bg-white/90"
                onClick={() => {
                  // If there's a primary image, swap it to secondary
                  if (primaryImage) {
                    setSecondaryImages([
                      ...secondaryImages.filter(img => img.id !== image.id),
                      primaryImage
                    ]);
                  } else {
                    setSecondaryImages(secondaryImages.filter(img => img.id !== image.id));
                  }
                  
                  setPrimaryImage(image);
                }}
              >
                <Star className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 p-0 bg-white/90 text-red-500"
                onClick={() => {
                  setSecondaryImages(secondaryImages.filter(img => img.id !== image.id));
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}