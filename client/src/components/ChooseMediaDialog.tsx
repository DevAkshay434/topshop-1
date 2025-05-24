import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Image as ImageIcon, ImagePlus, Loader2, X, Search } from 'lucide-react';
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
  source: 'product' | 'variant' | 'shopify' | 'pexels' | 'product_image' | 'theme_asset' | 'article_image' | 'collection_image' | 'shopify_media' | 'variant_image' | 'uploaded';
  selected?: boolean;
  product_id?: string | number;
  product_title?: string;
  width?: number;
  height?: number;
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
  const [activeTab, setActiveTab] = useState<string>('primary_images');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<MediaImage[]>(initialSelectedImages);
  const [productImages, setProductImages] = useState<MediaImage[]>([]);
  const [pexelsImages, setPexelsImages] = useState<MediaImage[]>([]);
  const [searchInProgress, setSearchInProgress] = useState<boolean>(false);

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
      } else if (activeTab === 'pexels') {
        // Pexels tab is handled separately
        console.log("Pexels tab selected");
      }
    }
  }, [open, activeTab]);

  // Initialize with passed-in selected images
  useEffect(() => {
    if (initialSelectedImages) {
      setSelectedImages(initialSelectedImages);
    }
  }, [initialSelectedImages]);

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

  // Search for images on Pexels
  const searchPexelsImages = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Please enter a search term",
        description: "Enter keywords to search for images on Pexels",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setSearchInProgress(true);

    try {
      console.log(`Searching Pexels for: ${searchQuery}`);

      const response = await apiRequest({
        url: `/api/media/search-pexels?query=${encodeURIComponent(searchQuery)}`,
        method: 'GET'
      });

      if (!response.success || !response.images) {
        toast({
          title: "Search failed",
          description: "Could not search for images on Pexels",
          variant: "destructive"
        });
        setIsLoading(false);
        setSearchInProgress(false);
        return;
      }

      console.log(`Got ${response.images.length} images from Pexels search`);

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
          source: 'pexels',
          selected: isAlreadySelected,
          src: image.src
        };
      });

      // Store pexels images in state
      setPexelsImages(formattedImages);

    } catch (error) {
      console.error('Error searching Pexels:', error);
      toast({
        title: "Error",
        description: "Could not search for images on Pexels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSearchInProgress(false);
    }
  };

  // Toggle image selection with limit enforcement
  const toggleImageSelection = (image: MediaImage) => {
    setSelectedImages(prevSelectedImages => {
      // Check if image is already selected
      const isSelected = prevSelectedImages.some(img => img.id === image.id);

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
        return prevSelectedImages.filter(img => img.id !== image.id);
      } else {
        return [...prevSelectedImages, { ...image, selected: true }];
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
    } else if (activeTab === 'pexels') {
      return searchInProgress 
        ? "No images found. Try a different search term." 
        : "Enter search terms above to find images on Pexels.";
    }
    return "No images available. Try a different source.";
  };

  // Determine which images to display based on active tab
  const getActiveImages = () => {
    switch (activeTab) {
      case 'products':
        return productImages;
      case 'pexels':
        return pexelsImages;
      default:
        return [];
    }
  };

  // Function to render the content for the active tab
  const renderTabContent = () => {
    const images = getActiveImages();

    return (
      <div className="relative">
        {/* Show search bar for Pexels tab */}
        {activeTab === 'pexels' && (
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
                    searchPexelsImages();
                  }
                }}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <Button 
              onClick={searchPexelsImages} 
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

              // For Pexels images, we might want to show different sizes
              const imageUrl = image.source === 'pexels' && image.src?.medium
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
                    ${isSelected ? 'border-blue-500' : 'border-gray-100 hover:border-gray-300'}
                    ${image.source === 'variant' ? 'ring-1 ring-purple-300' : ''}
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
                          'bg-blue-500'
                        }`}
                      >
                        {image.source === 'product' ? 'Product' : 
                         image.source === 'variant' ? 'Variant' : 
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

        <Tabs defaultValue="primary_images" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="primary_images">
              Primary Images
            </TabsTrigger>
            <TabsTrigger value="secondary_images">
              Secondary Images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="primary_images" className="space-y-4">
            <div className="rounded-md bg-blue-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-blue-700">
                    Choose emotionally compelling images with human subjects to feature at the top of your content
                  </p>
                </div>
              </div>
            </div>

            {/* Tab selection for image sources */}
            <Tabs defaultValue="pexels" className="w-full">
              <TabsList className="w-full flex justify-start border-b mb-4">
                <TabsTrigger value="pexels" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500">
                  Pexels Images
                </TabsTrigger>
                <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500">
                  Product Images
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pexels">
                {renderTabContent()}
              </TabsContent>

              <TabsContent value="products">
                {renderTabContent()}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="secondary_images" className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                  <p className="text-sm text-green-700">
                    Choose additional product-focused images to include throughout your content
                  </p>
                </div>
              </div>
            </div>

            {/* Tab selection for image sources */}
            <Tabs defaultValue="pexels" className="w-full">
              <TabsList className="w-full flex justify-start border-b mb-4">
                <TabsTrigger value="pexels" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500">
                  Pexels Images
                </TabsTrigger>
                <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500">
                  Product Images
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pexels">
                {renderTabContent()}
              </TabsContent>

              <TabsContent value="products">
                {renderTabContent()}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Selected Images Preview */}
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Selected Images ({selectedImages.length})</h3>
          {selectedImages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((image) => (
                <div key={image.id} className="relative w-16 h-16 border rounded-md overflow-hidden group">
                  <ShopifyImageViewer
                    src={image.url}
                    alt={image.alt || "Selected image"}
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center"
                    onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== image.id))}
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  {image.isPrimary && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1">
                      Primary
                    </div>
                  )}
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