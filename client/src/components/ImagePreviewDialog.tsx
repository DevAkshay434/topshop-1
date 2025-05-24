import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Check, Plus, X } from 'lucide-react';
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

export default function ImagePreviewDialog({
  image,
  isOpen,
  setIsOpen,
  setPrimaryImage,
  toggleSecondaryImage,
  isSecondary
}: ImagePreviewDialogProps) {
  if (!image) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Image Preview</DialogTitle>
        </DialogHeader>
        <div className="relative w-full">
          <ShopifyImageViewer
            src={image.src?.original || image.url}
            alt={image.alt || 'Image preview'}
            className="w-full max-h-[70vh]"
            objectFit="contain"
          />
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex-1">
            <p className="text-sm text-gray-500">{image.alt || 'Image'}</p>
            <p className="text-xs text-gray-400">
              Source: {image.source === 'pexels' ? 'Pexels' : 
                       image.source === 'uploaded' ? 'Uploaded' : 
                       image.source === 'shopify_media' ? 'Media Library' :
                       image.source === 'variant' ? 'Variant' : 'Product'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
            
            <Button 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setPrimaryImage(image);
                setIsOpen(false);
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Set as Primary
            </Button>
            
            <Button 
              variant={isSecondary ? "destructive" : "outline"}
              className={isSecondary 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"}
              onClick={() => {
                toggleSecondaryImage(image);
                setIsOpen(false);
              }}
            >
              {isSecondary ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Remove from Secondary
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add as Secondary
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}