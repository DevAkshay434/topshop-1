import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Star, Plus, Check, Trash2 } from 'lucide-react';
import ShopifyImageViewer from './ShopifyImageViewer';
import { MediaImage } from './MediaSelectionStep';

interface ImagePreviewDialogProps {
  image: MediaImage | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setPrimaryImage: (image: MediaImage) => void;
  toggleSecondaryImage: (image: MediaImage) => void;
  isSecondary: boolean;
}

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  image,
  isOpen,
  setIsOpen,
  setPrimaryImage,
  toggleSecondaryImage,
  isSecondary
}) => {
  if (!image) return null;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Controlled opening/closing with safety mechanism
        if (!open) {
          // Always allow closing
          setIsOpen(false);
        } else {
          // When opening, ensure we don't conflict with other dialogs
          setIsOpen(open);
          
          // Add event listener to handle ESC key for easier closing
          const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          };
          window.addEventListener('keydown', handleEsc);
          return () => {
            window.removeEventListener('keydown', handleEsc);
          };
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Image Preview</DialogTitle>
        </DialogHeader>
        
        <div className="mt-2 flex flex-col">
          <div className="relative bg-slate-50 rounded-md overflow-hidden">
            <ShopifyImageViewer
              src={image.url}
              alt={image.alt || "Image preview"}
              className="w-full h-full max-h-[70vh] object-contain"
            />
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-slate-500">
              {image.source === 'pexels' ? 'Pexels stock image' : 
               image.source === 'product' ? 'Product image' :
               image.source === 'product_image' ? 'Product image' :
               image.source === 'collection_image' ? 'Collection image' :
               image.source === 'shopify_media' ? 'Shopify media library' :
               image.source === 'uploaded' ? 'Uploaded image' : 'Image'}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => {
                  setPrimaryImage(image);
                  setIsOpen(false);
                }}
              >
                <Star className="h-4 w-4" />
                Set as Primary
              </Button>
              
              <Button 
                variant={isSecondary ? "default" : "outline"}
                className={isSecondary 
                  ? "flex items-center gap-1 bg-green-600 hover:bg-green-700" 
                  : "flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                }
                onClick={() => {
                  toggleSecondaryImage(image);
                }}
              >
                {isSecondary ? (
                  <>
                    <Check className="h-4 w-4" />
                    Added as Secondary
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add as Secondary
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;