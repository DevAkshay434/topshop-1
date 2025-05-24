import React from 'react';
import { Button } from './ui/button';
import { MediaImage } from './MediaSelectionStep';
import ShopifyImageViewer from './ShopifyImageViewer';
import { X, Eye, Star, Plus, Trash2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface HorizontalSelectedImagesBarProps {
  primaryImage: MediaImage | null;
  secondaryImages: MediaImage[];
  setPrimaryImage: (image: MediaImage | null) => void;
  setSecondaryImages: (images: MediaImage[]) => void;
  onPreviewImage: (image: MediaImage) => void;
}

/**
 * A horizontal bar showing selected primary and secondary images
 */
export default function HorizontalSelectedImagesBar({
  primaryImage,
  secondaryImages,
  setPrimaryImage,
  setSecondaryImages,
  onPreviewImage
}: HorizontalSelectedImagesBarProps) {
  // Count total selected images
  const totalSelected = (primaryImage ? 1 : 0) + secondaryImages.length;
  
  if (totalSelected === 0) {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
        <div className="text-sm text-blue-800 text-center">
          <p className="font-medium">No images selected yet</p>
          <p className="text-xs mt-1">Choose one primary and multiple secondary images from the options below</p>
        </div>
      </div>
    );
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
        
        {secondaryImages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              if (confirm('Are you sure you want to clear all secondary images?')) {
                setSecondaryImages([]);
              }
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear Secondary
          </Button>
        )}
      </div>
      
      <div className="flex items-start gap-3 overflow-x-auto pb-2 pt-1 max-h-28">
        {/* Primary Image */}
        {primaryImage && (
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 rounded overflow-hidden border-2 border-blue-500">
              <ShopifyImageViewer
                src={primaryImage.url}
                alt={primaryImage.alt || ""}
                className="w-full h-full"
                objectFit="cover"
              />
              <div className="absolute top-0 left-0 right-0 bg-blue-500 py-0.5 px-1">
                <p className="text-white text-xs text-center font-medium flex items-center justify-center">
                  <Star className="h-3 w-3 mr-1" />
                  Primary
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/50 py-0.5 px-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-5 w-5 p-0 text-white hover:bg-black/20"
                  onClick={() => onPreviewImage(primaryImage)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-5 w-5 p-0 text-white hover:bg-black/20"
                  onClick={() => setPrimaryImage(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Separator if both primary and secondary images exist */}
        {primaryImage && secondaryImages.length > 0 && (
          <Separator orientation="vertical" className="h-24" />
        )}
        
        {/* Secondary Images */}
        {secondaryImages.length > 0 && (
          <div className="flex flex-nowrap gap-2 overflow-x-auto">
            {secondaryImages.map((image) => (
              <div key={image.id} className="flex-shrink-0">
                <div className="relative w-24 h-24 rounded overflow-hidden border-2 border-green-500">
                  <ShopifyImageViewer
                    src={image.url}
                    alt={image.alt || ""}
                    className="w-full h-full"
                    objectFit="cover"
                  />
                  <div className="absolute top-0 left-0 right-0 bg-green-500 py-0.5 px-1">
                    <p className="text-white text-xs text-center font-medium flex items-center justify-center">
                      <Plus className="h-3 w-3 mr-1" />
                      Secondary
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/50 py-0.5 px-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-5 w-5 p-0 text-white hover:bg-black/20"
                      onClick={() => onPreviewImage(image)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-5 w-5 p-0 text-white hover:bg-black/20"
                      onClick={() => {
                        setSecondaryImages(secondaryImages.filter(img => img.id !== image.id));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}