import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChooseMediaDialog, MediaImage } from '@/components/ChooseMediaDialog';

export default function TestImageDisplay() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<MediaImage[]>([]);
  const [testImages, setTestImages] = useState<MediaImage[]>([]);

  // Fetch some test product images directly 
  useEffect(() => {
    async function fetchTestImages() {
      try {
        // Use the files endpoint that we're already using in the dialog
        const response = await fetch('/api/admin/files');
        if (!response.ok) {
          throw new Error('Failed to fetch test images');
        }
        
        const data = await response.json();
        console.log('Test image data:', data);
        
        if (data.success && data.files && Array.isArray(data.files)) {
          setTestImages(data.files.slice(0, 10)); // Just show the first 10 for testing
        }
      } catch (error) {
        console.error('Error fetching test images:', error);
      }
    }
    
    fetchTestImages();
  }, []);

  const handleImagesSelected = (images: MediaImage[]) => {
    setSelectedImages(images);
    setDialogOpen(false);
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Test Image Display</h1>
      
      <div className="mb-6">
        <Button onClick={() => setDialogOpen(true)}>Open Image Selector</Button>
      </div>
      
      <ChooseMediaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onImagesSelected={handleImagesSelected}
        initialSelectedImages={selectedImages}
        allowMultiple={true}
      />
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Selected Images ({selectedImages.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {selectedImages.map((image) => (
            <div key={image.id} className="border rounded-md p-2">
              <div 
                className="aspect-square bg-gray-100 mb-2"
                style={{
                  backgroundImage: `url("${image.url}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              ></div>
              <p className="text-sm truncate">{image.title || image.alt || 'Image'}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Raw API Data Preview</h2>
        <p className="mb-2 text-sm text-gray-500">First 10 images from the API:</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {testImages.map((image, index) => (
            <div key={index} className="border rounded-md p-2">
              <div className="aspect-square bg-gray-100 mb-2 relative">
                {/* Test with background image */}
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url("${image.url}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                ></div>
                <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1">
                  {image.source}
                </div>
              </div>
              <p className="text-xs truncate">{image.filename || image.title || image.alt || 'Image'}</p>
              <p className="text-xs text-gray-500 truncate">{image.url}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}