import React, { useState } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { MediaImage } from './MediaSelectionStep';
import ShopifyImageViewer from './ShopifyImageViewer';
import { X, Eye, ArrowUp, Trash2, Plus, Star, ImageIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface SelectedImagesPanelProps {
  primaryImage: MediaImage | null;
  secondaryImages: MediaImage[];
  setPrimaryImage: (image: MediaImage | null) => void;
  setSecondaryImages: (images: MediaImage[]) => void;
  onPreviewImage: (image: MediaImage) => void;
}

export function SelectedImagesPanel({
  primaryImage,
  secondaryImages,
  setPrimaryImage,
  setSecondaryImages,
  onPreviewImage
}: SelectedImagesPanelProps) {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Promote a secondary image to primary
  const promoteToFeatured = (image: MediaImage) => {
    // If there's already a primary image, swap it to secondary
    if (primaryImage) {
      setSecondaryImages([...secondaryImages.filter(img => img.id !== image.id), primaryImage]);
    } else {
      setSecondaryImages(secondaryImages.filter(img => img.id !== image.id));
    }
    
    setPrimaryImage(image);
    toast({
      title: "Image promoted",
      description: "Image has been set as primary featured image"
    });
  };

  // Count total selected images
  const totalSelectedImages = (primaryImage ? 1 : 0) + secondaryImages.length;

  return (
    <div className="border border-slate-200 rounded-md bg-slate-50 mb-6 overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-lg font-medium flex items-center">
          <Star className={`h-4 w-4 mr-2 ${primaryImage ? 'text-blue-600' : 'text-slate-400'}`} />
          Selected Images ({totalSelectedImages})
        </h3>
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation();
          setIsCollapsed(!isCollapsed);
        }}>
          {isCollapsed ? 'Show' : 'Hide'}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="p-4 pt-0">
          {/* Primary Featured Image */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-blue-700 flex items-center mb-2">
              <Star className="h-4 w-4 mr-1 text-blue-600" />
              Primary Image {primaryImage ? "" : "(Not Selected)"}
            </h4>
            
            {primaryImage ? (
              <div className="relative aspect-video w-full max-w-md bg-blue-50 rounded-md overflow-hidden border-2 border-blue-300">
                <ShopifyImageViewer 
                  src={primaryImage.url} 
                  alt={primaryImage.alt || "Primary image"} 
                  className="w-full h-full" 
                  objectFit="cover"
                  selected={true}
                  selectionType="primary"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button 
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white"
                    onClick={() => onPreviewImage(primaryImage)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 rounded-full bg-white/90 text-red-600 hover:text-red-700 hover:bg-white"
                    onClick={() => setPrimaryImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center bg-blue-50 border-2 border-dashed border-blue-200 rounded-md aspect-video w-full max-w-md">
                <div className="text-center p-4">
                  <ImageIcon className="h-10 w-10 mx-auto text-blue-300" />
                  <p className="mt-2 text-sm text-blue-500">No primary image selected</p>
                  <p className="text-xs text-blue-400">Choose an image below and select "Primary"</p>
                </div>
              </div>
            )}
          </div>
          
          <Separator className="my-4" />
          
          {/* Secondary Images */}
          <div>
            <h4 className="text-sm font-medium text-green-700 flex items-center mb-2">
              <Plus className="h-4 w-4 mr-1 text-green-600" />
              Secondary Images {secondaryImages.length > 0 ? `(${secondaryImages.length})` : "(Not Selected)"}
            </h4>
            
            {secondaryImages.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {secondaryImages.map(image => (
                    <div key={image.id} className="group relative aspect-video rounded-md overflow-hidden border-2 border-green-200">
                      <ShopifyImageViewer 
                        src={image.url} 
                        alt={image.alt || ""} 
                        className="w-full h-full" 
                        objectFit="cover"
                        selected={true}
                        selectionType="secondary"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90 hover:bg-white"
                          onClick={() => onPreviewImage(image)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90 hover:bg-white"
                          onClick={() => promoteToFeatured(image)}
                        >
                          <ArrowUp className="h-3 w-3 mr-1" />
                          Primary
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-white/90 hover:bg-white text-red-500 hover:text-red-600"
                          onClick={() => setSecondaryImages(secondaryImages.filter(img => img.id !== image.id))}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {secondaryImages.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove all secondary images?')) {
                        setSecondaryImages([]);
                        toast({
                          title: 'Secondary images cleared',
                          description: 'All secondary images have been removed.',
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All Secondary Images
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center bg-green-50 border-2 border-dashed border-green-200 rounded-md aspect-video w-full max-w-md">
                <div className="text-center p-4">
                  <ImageIcon className="h-10 w-10 mx-auto text-green-300" />
                  <p className="mt-2 text-sm text-green-500">No secondary images selected</p>
                  <p className="text-xs text-green-400">Choose images below and select "Secondary"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}