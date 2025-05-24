import React, { useState } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { MediaImage } from './MediaSelectionStep';
import ShopifyImageViewer from './ShopifyImageViewer';
import { X, Eye, ArrowUp, Trash2, Plus, Star, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { Badge } from './ui/badge';

interface CompactSelectedImagesPanelProps {
  primaryImage: MediaImage | null;
  secondaryImages: MediaImage[];
  setPrimaryImage: (image: MediaImage | null) => void;
  setSecondaryImages: (images: MediaImage[]) => void;
  onPreviewImage: (image: MediaImage) => void;
}

export function CompactSelectedImagesPanel({
  primaryImage,
  secondaryImages,
  setPrimaryImage,
  setSecondaryImages,
  onPreviewImage
}: CompactSelectedImagesPanelProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Count total selected images
  const totalSelected = (primaryImage ? 1 : 0) + secondaryImages.length;

  return (
    <div className="border border-slate-200 rounded-md bg-slate-50 mb-4">
      {/* Header with expand/collapse control */}
      <div 
        className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <h3 className="font-medium">Selected Images</h3>
          <Badge variant="outline" className="ml-2">
            {totalSelected} total
          </Badge>
          
          {primaryImage && (
            <Badge variant="default" className="ml-2 bg-blue-600">
              <Star className="h-3 w-3 mr-1" />
              Primary
            </Badge>
          )}
          
          {secondaryImages.length > 0 && (
            <Badge variant="default" className="ml-2 bg-green-600">
              <Plus className="h-3 w-3 mr-1" />
              {secondaryImages.length} Secondary
            </Badge>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="p-0 h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 pt-0">
          {/* Primary Image */}
          {primaryImage && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-blue-700 mb-1">Primary (Featured) Image</h4>
              <div className="flex items-start">
                <div className="relative aspect-video w-24 h-16 mr-2 border border-blue-300 rounded-sm overflow-hidden bg-white">
                  <ShopifyImageViewer
                    src={primaryImage.url}
                    alt={primaryImage.alt || ""}
                    className="w-full h-full"
                    objectFit="cover"
                  />
                </div>
                <div className="flex space-x-1">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => onPreviewImage(primaryImage)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                    onClick={() => setPrimaryImage(null)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Secondary Images */}
          {secondaryImages.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-green-700 mb-1">Secondary Images</h4>
              <div className="flex flex-wrap gap-2">
                {secondaryImages.map(image => (
                  <div key={image.id} className="relative group">
                    <div className="relative aspect-video w-24 h-16 border border-green-300 rounded-sm overflow-hidden bg-white">
                      <ShopifyImageViewer
                        src={image.url}
                        alt={image.alt || ""}
                        className="w-full h-full"
                        objectFit="cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 bg-white/90"
                          onClick={() => onPreviewImage(image)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 bg-white/90"
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
                            toast({
                              title: "Image set as primary",
                              description: "Image has been promoted to primary (featured) status",
                            });
                          }}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 bg-white/90 text-red-600"
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
              
              {secondaryImages.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs text-red-600"
                  onClick={() => {
                    if (confirm('Are you sure you want to remove all secondary images?')) {
                      setSecondaryImages([]);
                      toast({
                        title: "Secondary images cleared",
                        description: "All secondary images have been removed",
                      });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All Secondary
                </Button>
              )}
            </div>
          )}
          
          {/* No images selected */}
          {!primaryImage && secondaryImages.length === 0 && (
            <div className="text-center py-2 text-slate-500">
              <p className="text-sm">No images selected yet</p>
              <p className="text-xs text-slate-400">Search for images below and use the Primary/Secondary buttons</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}