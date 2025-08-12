import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Image as ImageIcon, ImagePlus, Loader2, X, Search, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import ShopifyImageViewer from './ShopifyImageViewer';

// Define the shape of image objects
export interface MediaImage {
  id: string;
  url: string; 
  alt?: string;
  title?: string;
  filename?: string;
  source: 'product' | 'variant' | 'shopify' | 'pexels' | 'pixabay' | 'product_image' | 'theme_asset' | 'article_image' | 'collection_image' | 'shopify_media' | 'variant_image' | 'uploaded';
  selected?: boolean;
  isPrimary?: boolean;
  product_id?: string | number;
  product_title?: string;
  width?: number;
  height?: number;
  type?: 'image' | 'youtube';
  videoId?: string;
  src?: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
}

interface ChooseMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesSelected: (images: MediaImage[]) => void;
  initialSelectedImages?: MediaImage[];
  maxImages?: number;
  allowMultiple?: boolean;
  title?: string;
  description?: string;
}

export function ChooseMediaDialog({
  open,
  onOpenChange,
  onImagesSelected,
  initialSelectedImages = [],
  maxImages = 10,
  allowMultiple = true,
  title = "Choose Media",
  description = "Select images from your Shopify store or other sources."
}: ChooseMediaDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('pexels-pixabay');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<MediaImage[]>(initialSelectedImages);
  const [productImages, setProductImages] = useState<MediaImage[]>([]);
  const [pexelsImages, setPexelsImages] = useState<MediaImage[]>([]);
  const [searchInProgress, setSearchInProgress] = useState<boolean>(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<MediaImage[]>([]);

  // Enhanced method to get selected product ID from any available source
  const getSelectedProductId = () => {
    try {
      // Try to get the product ID from the URL parameters first (highest priority)
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('productId');
      if (productId) {
        console.log("Found product ID in URL:", productId);
        return productId;
      }

      // Try to get from global productId variable next
      if ((window as any).productId) {
        console.log("Found product ID in global variable:", (window as any).productId);
        return (window as any).productId;
      }

      // Try to get from the global form context last
      const formContext = (window as any).TopshopSEO?.formContext;
      if (formContext && formContext.productId) {
        console.log("Found product ID in form context:", formContext.productId);
        return formContext.productId;
      }

      return null;
    } catch (error) {
      console.error("Error getting product ID:", error);
      return null;
    }
  };

  // Load appropriate images when dialog is opened
  useEffect(() => {
    if (open) {
      // Reset UI state for new dialog
      setIsLoading(false);

      if (activeTab === 'products') {
        // For product tab, load product-specific images if we have a product ID
        const productId = getSelectedProductId();
        if (productId) {
          console.log("Loading images for product:", productId);
          loadProductImages(productId);
        } else {
          console.log("No product ID found, showing default product images");
          // You could load featured products or recent products here
        }
      } else if (activeTab === 'pexels-pixabay') {
        // Pexels + Pixabay tab is handled separately
        console.log("Pexels + Pixabay tab selected");
      }
    }
  }, [open, activeTab]);

  // Initialize with passed-in selected images
  useEffect(() => {
    if (initialSelectedImages) {
      setSelectedImages(initialSelectedImages);
    }
  }, [initialSelectedImages]);

  // Handle file upload functionality
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types and sizes
    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image file`,
          variant: "destructive"
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) {
      // Reset input
      event.target.value = '';
      return;
    }

    // Upload files
    setIsLoading(true);
    const uploadPromises = validFiles.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          const uploadedImage: MediaImage = {
            id: `uploaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: result.url,
            alt: file.name,
            title: file.name,
            filename: file.name,
            source: 'uploaded',
            selected: false,
            isPrimary: false
          };
          
          return uploadedImage;
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean) as MediaImage[];
      
      if (successfulUploads.length > 0) {
        setUploadedImages(prev => {
          const newImages = [...prev, ...successfulUploads];
          console.log('Added uploaded images. Total count:', newImages.length);
          console.log('Uploaded images:', newImages);
          return newImages;
        });
        
        toast({
          title: "Upload successful",
          description: `${successfulUploads.length} image(s) uploaded successfully`
        });
      }
    } catch (error) {
      console.error('Upload process error:', error);
      toast({
        title: "Upload error",
        description: "Some uploads failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      // Reset input
      event.target.value = '';
    }
  };

  // We've removed the Shopify Media Library functionality
  // as per the simplified UI requirements

  // Load product-specific images
  const loadProductImages = async (productId: string) => {
    setIsLoading(true);
    try {
      console.log(`Loading images for product ID: ${productId}`);

      const response = await apiRequest({
        url: `/api/media/product-images/${productId}`,
        method: 'GET'
      });

      if (!response.success || !response.images) {
        toast({
          title: "Failed to load product images",
          description: "Could not load images for the selected product.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      console.log(`Got ${response.images.length} images for product ID ${productId}`);

      // Format received images into our standard format with proper selection handling
      const formattedImages = response.images.map((image: any) => {
        // Check if this image is already selected
        const isAlreadySelected = initialSelectedImages.some(
          img => img.url === image.url || img.id === image.id
        );

        return {
          id: image.id,
          url: image.url,
          alt: image.alt || `Product image`,
          title: image.title || image.alt || `Product image`,
          source: image.source || 'product',
          product_id: productId,
          selected: isAlreadySelected
        };
      });

      // Store product images in state
      setProductImages(formattedImages);

    } catch (error) {
      console.error('Error loading product images:', error);
      toast({
        title: "Error",
        description: "Could not load product images",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Search for images on Pexels + Pixabay
  const searchPexelsPixabayImages = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Please enter a search term",
        description: "Enter keywords to search for images on Pexels + Pixabay",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setSearchInProgress(true);

    try {
      console.log(`Searching Pexels + Pixabay for: ${searchQuery}`);

      const response = await apiRequest({
        url: `/api/media/pexels-pixabay-search?query=${encodeURIComponent(searchQuery)}`,
        method: 'GET'
      });

      if (!response.success || !response.images) {
        toast({
          title: "Search failed",
          description: "Could not search for images on Pexels + Pixabay",
          variant: "destructive"
        });
        setIsLoading(false);
        setSearchInProgress(false);
        return;
      }

      console.log(`Got ${response.images.length} images from Pexels + Pixabay search`);

      // Format received images into our standard format with proper selection handling
      const formattedImages = response.images.map((image: any) => {
        // Check if this image is already selected
        const isAlreadySelected = initialSelectedImages.some(
          img => img.url === image.url || img.id === image.id
        );

        return {
          id: image.id,
          url: image.src.large || image.src.medium || image.src.original,
          alt: image.alt || `${searchQuery} image`,
          title: image.photographer ? `Photo by ${image.photographer}` : `${searchQuery} image`,
          source: image.source || 'pexels', // Use the source from the API response
          selected: isAlreadySelected,
          src: image.src
        };
      });

      // Store pexels images in state
      setPexelsImages(formattedImages);

    } catch (error) {
      console.error('Error searching Pexels + Pixabay:', error);
      toast({
        title: "Error",
        description: "Could not search for images on Pexels + Pixabay",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSearchInProgress(false);
    }
  };

  // Toggle image selection with limit enforcement
  const toggleImageSelection = (image: MediaImage) => {
    console.log('Toggling selection for image:', image.id, 'Source:', image.source, 'URL:', image.url);
    
    setSelectedImages(prevSelectedImages => {
      // Check if image is already selected
      const isSelected = prevSelectedImages.some(img => img.id === image.id);
      console.log('Image already selected:', isSelected);
      console.log('Current selected images:', prevSelectedImages.length);

      // If not selected and we're at the limit, show warning and prevent selection
      if (!isSelected && prevSelectedImages.length >= maxImages && !allowMultiple) {
        toast({
          title: `Selection limit reached`,
          description: `You can only select ${maxImages} image${maxImages === 1 ? '' : 's'}. Please deselect an image first.`,
          variant: "destructive"
        });
        return prevSelectedImages;
      }

      // If not selected and we're at the limit with allowMultiple, remove oldest selection
      if (!isSelected && prevSelectedImages.length >= maxImages && allowMultiple) {
        toast({
          title: `Maximum images updated`,
          description: `Added new image. You can select up to ${maxImages} images.`,
        });

        // Add new image and remove oldest one
        return [...prevSelectedImages.slice(1), { ...image, selected: true }];
      }

      // Toggle selection normally
      if (isSelected) {
        const newSelection = prevSelectedImages.filter(img => img.id !== image.id);
        console.log('Removing image from selection. New count:', newSelection.length);
        return newSelection;
      } else {
        const newSelection = [...prevSelectedImages, { ...image, selected: true }];
        console.log('Adding image to selection. New count:', newSelection.length);
        return newSelection;
      }
    });
  };

  // Confirm selection and pass to parent
  const confirmSelection = () => {
    if (selectedImages.length > 0) {
      onImagesSelected(selectedImages);
      onOpenChange(false);
      toast({
        title: "Images selected",
        description: `Selected ${selectedImages.length} image${selectedImages.length === 1 ? '' : 's'}`
      });
    } else {
      toast({
        title: "No images selected",
        description: "Please select at least one image",
        variant: "destructive"
      });
    }
  };

  // Function to get appropriate message when no images are available
  const getEmptyStateMessage = () => {
    if (activeTab === 'products') {
      return "No product images found. Please select a different product.";
    } else if (activeTab === 'pexels-pixabay') {
      return searchInProgress 
        ? "No images found. Try a different search term." 
        : "Enter search terms above to find images on Pexels + Pixabay.";
    } else if (activeTab === 'uploaded') {
      return "No uploaded images yet. Upload images using the button above.";
    }
    return "No images available. Try a different source.";
  };

  // Determine which images to display based on active tab
  const getActiveImages = () => {
    switch (activeTab) {
      case 'products':
        return productImages;
      case 'pexels-pixabay':
        return pexelsImages;
      case 'uploaded':
        return uploadedImages;
      default:
        return [];
    }
  };

  // Function to render the content for the active tab
  const renderTabContent = () => {
    const images = getActiveImages();

    return (
      <div className="relative">
        {/* Show search bar for Pexels + Pixabay tab */}
        {activeTab === 'pexels-pixabay' && (
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search for images (e.g., happy customer, product in use)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchPexelsPixabayImages();
                  }
                }}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <Button 
              onClick={searchPexelsPixabayImages} 
              disabled={isLoading || !searchQuery.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : 'Search'}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading images...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-500">{getEmptyStateMessage()}</p>
          </div>
        )}

        {/* Grid of images */}
        {!isLoading && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image) => {
              // Check if this image is selected
              const isSelected = selectedImages.some(img => img.id === image.id);

              // For Pexels and Pixabay images, we might want to show different sizes
              const imageUrl = (image.source === 'pexels' || image.source === 'pixabay') && image.src?.medium
                ? image.src.medium
                : image.url;

              // Determine if this is a product image, variant image, or media library image for styling
              const isPrimaryProduct = image.source === 'product';
              const isVariant = image.source === 'variant';

              return (
                <div 
                  key={image.id} 
                  className={`
                    relative cursor-pointer border-2 rounded-md overflow-hidden
                    ${isSelected ? 
                      (image.source === 'uploaded' ? 'border-orange-500' : 'border-blue-500') 
                      : 'border-gray-100 hover:border-gray-300'}
                    ${image.source === 'variant' ? 'ring-1 ring-purple-300' : ''}
                    ${image.source === 'uploaded' ? 'ring-1 ring-orange-300' : ''}
                  `}
                  onClick={() => toggleImageSelection(image)}
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    {/* Use our robust ShopifyImageViewer component with improved error handling */}
                    <ShopifyImageViewer
                      src={imageUrl}
                      alt={image.alt || 'Product image'}
                      className="w-full h-full object-cover"
                      key={`${image.id}-${image.url}`} // Force re-render when URL changes
                    />

                    {/* Source badge */}
                    <div className="absolute top-2 left-2">
                      <span 
                        className={`text-xs px-2 py-1 rounded text-white ${
                          image.source === 'product' ? 'bg-green-500' : 
                          image.source === 'variant' ? 'bg-purple-500' : 
                          image.source === 'uploaded' ? 'bg-orange-500' :
                          image.source === 'pixabay' ? 'bg-teal-500' :
                          'bg-blue-500'
                        }`}
                      >
                        {image.source === 'product' ? 'Product' : 
                         image.source === 'variant' ? 'Variant' : 
                         image.source === 'uploaded' ? 'Uploaded' :
                         image.source === 'pixabay' ? 'Pixabay' :
                         'Pexels'}
                      </span>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Image title - truncated for space */}
                  <div className="p-2">
                    <p className="text-xs truncate">{image.title || image.alt || 'Product image'}</p>
                  </div>

                  {/* Primary/Secondary Selection Controls - only show on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      className="w-3/4 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle primary selection logic
                        setSelectedImages(prev => {
                          // Remove this image from the current selection if it exists
                          const filtered = prev.filter(img => img.id !== image.id);
                          // Add it as the only primary image
                          return [...filtered, { ...image, selected: true, isPrimary: true }];
                        });
                        toast({
                          title: "Primary image selected",
                          description: "This image will be used as the featured image"
                        });
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Select as Primary
                    </Button>
                    <Button 
                      size="sm" 
                      className="w-3/4 bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle secondary selection logic
                        setSelectedImages(prev => {
                          // Check if already in selection
                          const exists = prev.some(img => img.id === image.id);
                          if (exists) {
                            // Already exists - no change
                            return prev;
                          }
                          // Add as secondary image
                          return [...prev, { ...image, selected: true, isPrimary: false }];
                        });
                        toast({
                          title: "Secondary image selected",
                          description: "Image added to content images"
                        });
                      }}
                    >
                      <ImagePlus className="h-4 w-4 mr-1" />
                      Add as Secondary
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        {/* Close button */}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pexels-pixabay" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="pexels-pixabay">
              Search Images
            </TabsTrigger>
            <TabsTrigger value="primary_images">
              Product Images
            </TabsTrigger>
            <TabsTrigger value="uploaded">
              Uploaded Images
            </TabsTrigger>
            <TabsTrigger value="upload">
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="youtube">
              YouTube Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pexels-pixabay" className="space-y-4">
            <div className="rounded-md bg-teal-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Search className="h-5 w-5 text-teal-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-teal-700">
                    Search for high-quality images from Pexels and Pixabay. Use keywords like "happy customer", "confused customer", "smiling family", etc.
                  </p>
                </div>
              </div>
            </div>
            {renderTabContent()}
          </TabsContent>

          <TabsContent value="primary_images" className="space-y-4">
            <div className="rounded-md bg-blue-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-blue-700">
                    Use images from your Shopify store products and collections.
                  </p>
                </div>
              </div>
            </div>
            {renderTabContent()}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="rounded-md bg-orange-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Upload className="h-5 w-5 text-orange-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-orange-700">
                    Upload your own images (JPG, PNG, GIF - max 10MB each)
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload images</p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="upload-images-dialog"
                onChange={handleFileUpload}
              />
              <label htmlFor="upload-images-dialog" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Choose Files</span>
                </Button>
              </label>
            </div>

            {/* Show uploaded images */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {uploadedImages.map((image) => (
                  <div 
                    key={image.id} 
                    className={`
                      relative cursor-pointer border-2 rounded-md overflow-hidden
                      ${selectedImages.some(img => img.id === image.id) ? 'border-orange-500' : 'border-gray-200 hover:border-gray-300'}
                    `}
                    onClick={() => toggleImageSelection(image)}
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden relative">
                      <img
                        src={image.url}
                        alt={image.alt || 'Uploaded image'}
                        className="w-full h-full object-cover"
                      />
                      {selectedImages.some(img => img.id === image.id) && (
                        <div className="absolute top-2 right-2 bg-orange-500 text-white p-1 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate">{image.title || image.alt || 'Uploaded image'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="uploaded" className="space-y-4">
            <div className="rounded-md bg-purple-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-purple-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-purple-700">
                    View and select from previously uploaded images.
                  </p>
                </div>
              </div>
            </div>
            {renderTabContent()}
          </TabsContent>
          
          <TabsContent value="youtube" className="space-y-4">
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-red-700">
                    Add a YouTube video to embed in your content
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid w-full gap-2">
                <Input
                  type="url"
                  placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
                  value={youtubeUrl}
                  onChange={e => {
                    const url = e.target.value;
                    setYoutubeUrl(url);
                    // Extract YouTube video ID from URL
                    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                    const extractedVideoId = match ? match[1] : null;
                    setYoutubeVideoId(extractedVideoId);
                  }}
                  className="w-full"
                />
                
                <Button 
                  type="button"
                  onClick={() => {
                    if (!youtubeVideoId) {
                      toast({
                        title: "Invalid YouTube URL",
                        description: "Please enter a valid YouTube video URL",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    const youtubeImage: MediaImage = {
                      id: `youtube-${youtubeVideoId}`,
                      url: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
                      alt: `YouTube video ${youtubeVideoId}`,
                      source: 'uploaded',
                      selected: true,
                      isPrimary: false,
                      type: 'youtube',
                      videoId: youtubeVideoId,
                      width: 1280,
                      height: 720,
                      src: {
                        original: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
                        large: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
                        medium: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
                        small: `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`,
                        thumbnail: `https://img.youtube.com/vi/${youtubeVideoId}/default.jpg`
                      }
                    };
                    
                    setSelectedImages(prev => {
                      // Check if we already have this video
                      const exists = prev.some(img => 
                        img.type === 'youtube' && img.videoId === youtubeVideoId
                      );
                      
                      if (!exists) {
                        toast({
                          title: "YouTube Video Added",
                          description: "YouTube video has been added to your content",
                        });
                        return [...prev, youtubeImage];
                      }
                      return prev;
                    });
                  }}
                  disabled={!youtubeVideoId}
                >
                  Add Video
                </Button>
              </div>
              
              {youtubeVideoId && (
                <div className="mt-4 border rounded-md overflow-hidden">
                  <div className="aspect-video relative">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mt-2">
                Paste a YouTube video URL to embed it in your content. The video will be added as a secondary content element.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Selected Images Preview */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Your Selected Images ({selectedImages.length})</h3>
            {selectedImages.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedImages([])}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" /> Clear All
              </Button>
            )}
          </div>
          {selectedImages.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {selectedImages.map((image) => (
                <div 
                  key={image.id} 
                  className={`relative border-2 rounded-md overflow-hidden group aspect-square ${
                    image.isPrimary ? 'border-blue-500' : 'border-green-500'
                  }`}
                >
                  <ShopifyImageViewer
                    src={image.src?.medium || image.url}
                    alt={image.alt || "Selected image"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 p-1">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6"
                        onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== image.id))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {!image.isPrimary && (
                        <Button
                          size="icon"
                          variant="default"
                          className="h-6 w-6 bg-blue-500 hover:bg-blue-600"
                          onClick={() => {
                            setSelectedImages(prev => {
                              // Make all images secondary
                              const updatedImages = prev.map(img => ({
                                ...img,
                                isPrimary: false
                              }));
                              // Find this image and make it primary
                              const thisImageIndex = updatedImages.findIndex(img => img.id === image.id);
                              if (thisImageIndex >= 0) {
                                updatedImages[thisImageIndex].isPrimary = true;
                              }
                              return updatedImages;
                            });
                            toast({
                              title: "Primary image changed",
                              description: "Image set as the primary featured image"
                            });
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div 
                    className={`absolute top-0 left-0 text-white text-xs px-1 py-0.5 ${
                      image.isPrimary ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                  >
                    {image.isPrimary ? 'Primary' : 'Secondary'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No images selected yet</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmSelection}
            disabled={selectedImages.length === 0}
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}