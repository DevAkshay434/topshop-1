import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Image as ImageIcon, ImagePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';

// Define the shape of image objects
export interface MediaImage {
  id: string;
  url: string; 
  alt?: string;
  title?: string;
  source: 'product' | 'variant' | 'shopify' | 'pexels';
  selected?: boolean;
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
  const [activeTab, setActiveTab] = useState<string>('products');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<MediaImage[]>(initialSelectedImages);
  const [productImages, setProductImages] = useState<MediaImage[]>([]);
  
  // Fetch product images when dialog opens
  useEffect(() => {
    if (open && activeTab === 'products' && productImages.length === 0) {
      loadProductImages();
    }
  }, [open, activeTab]);

  // Initialize with passed-in selected images
  useEffect(() => {
    if (initialSelectedImages) {
      setSelectedImages(initialSelectedImages);
    }
  }, [initialSelectedImages]);

  // Load product images directly from the products API
  const loadProductImages = async () => {
    setIsLoading(true);
    
    try {
      // Get products first
      const productsResponse = await apiRequest({
        url: '/api/admin/products',
        method: 'GET'
      });
      
      if (!productsResponse.success || !productsResponse.products || !productsResponse.products.length) {
        toast({
          title: "No products found",
          description: "Could not find any products in your Shopify store."
        });
        setIsLoading(false);
        return;
      }
      
      const formattedImages: MediaImage[] = [];
      let imageCount = 0;
      
      // Process products and extract images
      productsResponse.products.forEach((product: any) => {
        // Add main product image
        if (product.image && product.image.src) {
          imageCount++;
          const isSelected = initialSelectedImages.some(img => 
            img.url === product.image.src || img.id === `product-${product.id}-main`
          );
          
          formattedImages.push({
            id: `product-${product.id}-main`,
            url: product.image.src,
            alt: product.title,
            title: product.title,
            source: 'product',
            selected: isSelected
          });
        }
        
        // Add additional product images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((image: any, index: number) => {
            if (image && image.src) {
              // Skip duplicates
              const isDuplicate = formattedImages.some(img => img.url === image.src);
              
              if (!isDuplicate) {
                imageCount++;
                const isSelected = initialSelectedImages.some(img => 
                  img.url === image.src || img.id === `product-${product.id}-image-${index}`
                );
                
                formattedImages.push({
                  id: `product-${product.id}-image-${index}`,
                  url: image.src,
                  alt: image.alt || `${product.title} - Image ${index + 1}`,
                  title: product.title,
                  source: 'product',
                  selected: isSelected
                });
              }
            }
          });
        }
        
        // Add variant images
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: any, variantIndex: number) => {
            if (variant.image && variant.image.src) {
              // Skip duplicates
              const isDuplicate = formattedImages.some(img => img.url === variant.image.src);
              
              if (!isDuplicate) {
                imageCount++;
                const isSelected = initialSelectedImages.some(img => 
                  img.url === variant.image.src || img.id === `variant-${variant.id}`
                );
                
                formattedImages.push({
                  id: `variant-${variant.id}`,
                  url: variant.image.src,
                  alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                  title: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                  source: 'variant',
                  selected: isSelected
                });
              }
            }
          });
        }
      });
      
      // Update the product images state
      setProductImages(formattedImages);
      console.log(`Loaded ${imageCount} product images (${formattedImages.length} unique)`);
      
      // Initial selection
      const newSelectedImages = formattedImages.filter(img => img.selected);
      if (newSelectedImages.length > 0) {
        setSelectedImages(prevSelected => {
          // Combine with any existing selections, avoiding duplicates
          const existingIds = prevSelected.map(img => img.id);
          const newImgs = newSelectedImages.filter(img => !existingIds.includes(img.id));
          return [...prevSelected, ...newImgs];
        });
      }
      
    } catch (error) {
      console.error('Error loading product images:', error);
      toast({
        title: "Error loading images",
        description: "There was a problem loading images from your store.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection of an image
  const toggleImageSelection = (image: MediaImage) => {
    // Check if already selected
    const isAlreadySelected = selectedImages.some(img => img.id === image.id || img.url === image.url);
    
    if (isAlreadySelected) {
      // Remove from selection
      setSelectedImages(selectedImages.filter(img => img.id !== image.id && img.url !== image.url));
    } else {
      // Check if we're at the maximum number of images
      if (!allowMultiple) {
        // If only allowing one image, replace current selection
        setSelectedImages([image]);
      } else if (selectedImages.length >= maxImages) {
        // If at max, show an error
        toast({
          title: "Maximum images reached",
          description: `You can only select up to ${maxImages} images.`,
          variant: "destructive"
        });
      } else {
        // Add to selection
        setSelectedImages([...selectedImages, image]);
      }
    }
  };

  // Handle confirm button
  const handleConfirm = () => {
    onImagesSelected(selectedImages);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[825px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue="products" 
          className="w-full mt-2 flex-1 flex flex-col overflow-hidden"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="products">
              <ImageIcon className="h-4 w-4 mr-2" />
              Product Images
            </TabsTrigger>
            <TabsTrigger value="pexels">
              <ImagePlus className="h-4 w-4 mr-2" />
              Stock Images
            </TabsTrigger>
          </TabsList>
          
          {/* Product Images Tab */}
          <TabsContent value="products" className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading product images...</p>
              </div>
            ) : productImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p>No product images found in your store.</p>
                <Button 
                  variant="outline" 
                  onClick={loadProductImages} 
                  className="mt-4"
                >
                  Refresh Images
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {productImages.map((image) => {
                    const isSelected = selectedImages.some(
                      img => img.id === image.id || img.url === image.url
                    );
                    
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
                          <img 
                            src={image.url}
                            alt={image.alt || 'Product image'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Try to fix Shopify URLs if they fail
                              const target = e.currentTarget;
                              const src = target.src;
                              
                              // If a Shopify URL, try converting to CDN URL
                              if (src.includes('shopify.com') && !src.includes('cdn.shopify.com')) {
                                try {
                                  const url = new URL(src);
                                  const cdnUrl = `https://cdn.shopify.com${url.pathname}${url.search}`;
                                  target.src = cdnUrl;
                                  return;
                                } catch (error) {
                                  console.log("Failed to create CDN URL");
                                }
                              }
                              
                              // Fallback to placeholder
                              target.src = `https://placehold.co/600x600?text=${encodeURIComponent(image.alt || 'Product Image')}`;
                              target.classList.add('placeholder-image');
                            }}
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
                               'Shopify'}
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
                      </div>
                    );
                  })}
                </div>
                
                {/* Refresh button */}
                <div className="flex justify-center mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadProductImages}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Refresh Images
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Stock Images Tab */}
          <TabsContent value="pexels" className="flex-1 overflow-auto">
            <div className="flex flex-col items-center justify-center h-64">
              <p>Pexels image search is coming soon.</p>
              <p className="text-sm text-gray-500 mt-2">Please use product images for now.</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-2" />
        
        {/* Selected image count and controls */}
        <div className="flex justify-between items-center my-2">
          <p className="text-sm">
            {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} selected
            {maxImages > 0 && ` (max: ${maxImages})`}
          </p>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedImages([])}
              disabled={selectedImages.length === 0}
            >
              Clear All
            </Button>
            
            <Button 
              variant="default" 
              onClick={handleConfirm}
              disabled={selectedImages.length === 0}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}