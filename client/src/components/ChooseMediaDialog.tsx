import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Image as ImageIcon, ImagePlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from '@/components/ui/separator';
import ShopifyImageViewer from './ShopifyImageViewer';

// Define the shape of image objects
export interface MediaImage {
  id: string;
  url: string; 
  alt?: string;
  title?: string;
  filename?: string;
  source: 'product' | 'variant' | 'shopify' | 'pexels' | 'product_image' | 'theme_asset' | 'article_image' | 'collection_image';
  selected?: boolean;
  product_id?: string | number;
  product_title?: string;
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
  const [mediaLibraryImages, setMediaLibraryImages] = useState<MediaImage[]>([]);
  
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
      if (formContext && formContext.productIds && formContext.productIds.length > 0) {
        console.log("Found product ID in form context:", formContext.productIds[0]);
        return formContext.productIds[0];
      }
      
      console.log("No product ID found in any source");
      return undefined;
    } catch (error) {
      console.error("Error getting selected product ID:", error);
      return undefined;
    }
  };
  
  // Fetch media based on the active tab when dialog opens
  useEffect(() => {
    if (open) {
      if (activeTab === 'products') {
        // Get product ID from URL or other means if available
        const selectedProductId = getSelectedProductId();
        
        if (selectedProductId) {
          console.log("Loading images for selected product ID:", selectedProductId);
          // Pass the selected product ID to filter images for that product only
          loadProductImages(selectedProductId);
        } else {
          // No product selected, load all product images
          console.log("No specific product selected, loading all product images");
          loadProductImages();
        }
      } else if (activeTab === 'pexels') {
        // Pexels tab is handled separately
        console.log("Pexels tab selected");
      } else if (activeTab === 'media_library') {
        // This is specifically for the Shopify Media Library tab - load all media
        console.log("Loading all media from Shopify Media Library");
        loadShopifyMediaLibrary();
      }
    }
  }, [open, activeTab]);

  // Initialize with passed-in selected images
  useEffect(() => {
    if (initialSelectedImages) {
      setSelectedImages(initialSelectedImages);
    }
  }, [initialSelectedImages]);
  
  // Load Shopify Media Library images
  const loadShopifyMediaLibrary = async () => {
    setIsLoading(true);
    try {
      console.log("Loading images from Shopify Media Library...");
      
      // Use the media-specific endpoint to get all Shopify media
      const response = await apiRequest({
        url: '/api/media/shopify-media-library',
        method: 'GET'
      });
      
      if (!response.success || !response.images) {
        toast({
          title: "Failed to load media",
          description: "Could not load images from your Shopify Media Library."
        });
        setIsLoading(false);
        return;
      }
      
      console.log(`Got ${response.images.length} files from Media Library API`);
      
      // Format received images into our standard format
      const formattedImages: MediaImage[] = [];
      
      // Process all media library images 
      response.images.forEach((image: any) => {
        if (image && image.url) {
          // Check if this image is already selected
          const isAlreadySelected = initialSelectedImages.some(
            img => img.url === image.url || img.id === image.id
          );
          
          // Ensure the URL starts with https://
          let imageUrl = image.url;
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else if (!imageUrl.startsWith('http')) {
            imageUrl = 'https://' + imageUrl;
          }
          
          // Make sure we use CDN URLs for proper image loading
          if (!imageUrl.includes('cdn.shopify.com') && imageUrl.includes('shopify.com')) {
            try {
              const urlParts = imageUrl.split('/');
              const domainParts = urlParts[2].split('.');
              if (domainParts.length > 0) {
                const storeName = domainParts[0];
                const pathPart = urlParts.slice(3).join('/');
                imageUrl = `https://cdn.shopify.com/s/files/1/${storeName}/${pathPart}`;
              }
            } catch (err) {
              console.warn("Failed to convert URL to CDN format:", imageUrl);
            }
          }
          
          // Create a properly formatted media item
          formattedImages.push({
            id: image.id || `media-${formattedImages.length}`,
            url: imageUrl,
            alt: image.alt || image.filename || 'Shopify image',
            title: image.filename || image.title || 'Shopify image',
            source: image.source || 'shopify',
            product_id: image.product_id,
            product_title: image.product_title,
            selected: isAlreadySelected
          });
        }
      });
      
      // Store media library images in their own state
      setMediaLibraryImages(formattedImages);
      console.log(`Processed ${formattedImages.length} media files from Shopify`);
      
      // Log a sample for debugging
      if (formattedImages.length > 0) {
        console.log("Sample media image:", formattedImages[0]);
      }
      
    } catch (error) {
      console.error('Error loading Shopify Media Library:', error);
      toast({
        title: "Error loading media library",
        description: "There was a problem loading images from your Shopify Media Library.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load product images directly from the products API
  const loadProductImages = async (selectedProductId?: string | React.MouseEvent) => {
    // Handle being called from a button click
    if (selectedProductId && typeof selectedProductId !== 'string') {
      selectedProductId = undefined; // It's a MouseEvent, not a product ID
    }
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
      
      // Debug information
      console.log(`Selected product ID: ${selectedProductId}`);
      console.log(`Total products available: ${productsResponse.products.length}`);
      
      // If a specific product ID is provided, only show images from that product
      const productsToProcess = selectedProductId 
        ? productsResponse.products.filter((product: any) => {
            // Ensure consistent string comparison for product IDs
            const productIdString = String(product.id);
            const selectedIdString = String(selectedProductId);
            const isMatch = productIdString === selectedIdString;
            
            if (isMatch) {
              console.log(`✅ Found matching product: ${product.title} (ID: ${productIdString})`);
            }
            
            return isMatch;
          })
        : productsResponse.products;
      
      console.log(`Processing images from ${productsToProcess.length} products`);
      
      // Process products and extract images
      productsToProcess.forEach((product: any) => {
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
            product_id: product.id,
            product_title: product.title,
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
                  product_id: product.id,
                  product_title: product.title,
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
                  product_id: product.id,
                  product_title: product.title, 
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
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="products">
              <ImageIcon className="h-4 w-4 mr-2" />
              Product Images
            </TabsTrigger>
            <TabsTrigger value="media_library">
              <ImageIcon className="h-4 w-4 mr-2" />
              Shopify Media Library
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
                  onClick={() => loadProductImages()} 
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
                          {/* Use our robust ShopifyImageViewer component with improved error handling */}
                          <ShopifyImageViewer
                            src={image.url}
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
                    onClick={() => loadProductImages()}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Refresh Images
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Shopify Media Library Tab */}
          <TabsContent value="media_library" className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Loading media library...</p>
              </div>
            ) : mediaLibraryImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p>No images found in your Shopify Media Library.</p>
                <Button 
                  variant="outline" 
                  onClick={() => loadShopifyMediaLibrary()} 
                  className="mt-4"
                >
                  Refresh Media Library
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {mediaLibraryImages.map((image) => {
                    const isSelected = selectedImages.some(
                      img => img.id === image.id || img.url === image.url
                    );
                    
                    return (
                      <div 
                        key={image.id} 
                        className={`
                          relative cursor-pointer border-2 rounded-md overflow-hidden
                          ${isSelected ? 'border-blue-500' : 'border-gray-100 hover:border-gray-300'}
                        `}
                        onClick={() => toggleImageSelection(image)}
                      >
                        <div className="aspect-square bg-gray-50 overflow-hidden relative">
                          {/* Image wrapper with fallback placeholder */}
                          <div className="relative w-full h-full">
                            {/* Use our robust ShopifyImageViewer for better image display */}
                            <ShopifyImageViewer
                              src={image.url}
                              alt={image.alt || image.title || "Shopify image"}
                              className="w-full h-full object-cover"
                              key={`${image.id}-${image.url}`} // Force re-render when URL changes
                            />
                            
                            {/* Show image title overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                              {image.title || image.alt || 'Image'}
                            </div>
                          </div>
                          
                          {/* Source badge */}
                          <div className="absolute top-2 left-2">
                            <span className="text-xs px-2 py-1 rounded text-white bg-blue-500">
                              Media Library
                            </span>
                          </div>
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2">
                          <p className="text-xs truncate">{image.title || image.alt || 'Media image'}</p>
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
                    onClick={loadShopifyMediaLibrary}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Refresh Media Library
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Stock Images Tab */}
          <TabsContent value="pexels" className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
              {/* Placeholder images - these would normally come from Pexels API */}
              {Array.from({ length: 12 }).map((_, index) => {
                const id = `pexels-sample-${index + 1}`;
                const image: MediaImage = {
                  id,
                  url: `https://images.pexels.com/photos/${3000000 + index}/pexels-photo-${3000000 + index}.jpeg?auto=compress&cs=tinysrgb&w=800`,
                  alt: `Stock image ${index + 1}`,
                  title: `Sample stock image ${index + 1}`,
                  source: 'pexels',
                  selected: selectedImages.some(img => img.id === id)
                };
                
                const isSelected = selectedImages.some(img => img.id === image.id);
                
                return (
                  <div 
                    key={image.id} 
                    className={`
                      relative cursor-pointer border-2 rounded-md overflow-hidden
                      ${isSelected ? 'border-blue-500' : 'border-gray-100 hover:border-gray-300'}
                      ${image.source === 'pexels' ? 'ring-1 ring-green-300' : ''}
                    `}
                    onClick={() => toggleImageSelection(image)}
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden relative">
                      {/* Use our ShopifyImageViewer for better image handling */}
                      <ShopifyImageViewer
                        src={image.url}
                        alt={image.alt || 'Stock image'}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Source badge */}
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-1 rounded text-white bg-green-500">
                          Pexels
                        </span>
                      </div>
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2">
                      <p className="text-xs truncate">{image.title || image.alt || 'Stock image'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-2" />
        
        {/* Selected image count and controls */}
        <div className="flex justify-between items-center my-2">
          <span className="text-sm">
            {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} selected
            {maxImages > 0 && ` (max: ${maxImages})`}
          </span>
          
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