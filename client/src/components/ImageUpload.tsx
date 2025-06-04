import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImageUpload: (imageData: {
    id: string;
    url: string;
    width: number;
    height: number;
    alt?: string;
    source: 'uploaded';
  }) => void;
  maxFiles?: number;
  accept?: string;
}

export function ImageUpload({ 
  onImageUpload, 
  maxFiles = 5, 
  accept = "image/*" 
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const totalFiles = uploadedImages.length + fileArray.length;

    if (totalFiles > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} images allowed`,
        variant: "destructive"
      });
      return;
    }

    fileArray.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setPreviews(prev => [...prev, result]);
          
          // Create image object to get dimensions
          const img = new Image();
          img.onload = () => {
            const imageData = {
              id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              url: result,
              width: img.width,
              height: img.height,
              alt: file.name.replace(/\.[^/.]+$/, ""),
              source: 'uploaded' as const
            };
            onImageUpload(imageData);
          };
          img.src = result;
        };
        reader.readAsDataURL(file);
        setUploadedImages(prev => [...prev, file]);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Card 
        className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
        onClick={triggerFileSelect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              Upload Images
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Drag and drop images here, or click to browse
            </div>
            <Button type="button" variant="outline" disabled={isUploading}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
            <div className="text-xs text-gray-400 mt-2">
              Supports JPG, PNG, GIF up to 10MB each (max {maxFiles} files)
            </div>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={preview}
                  alt={`Upload preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mt-1 text-xs text-gray-500 truncate">
                {uploadedImages[index]?.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}