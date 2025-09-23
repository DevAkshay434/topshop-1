import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from '../hooks/use-toast';
import ShopifyImageViewer from './ShopifyImageViewer';
import { Loader2, Search, Upload, Youtube, Image as ImageIcon, X, Check, AlertCircle, Star, Plus, Minus, ArrowUp, ArrowDown, RefreshCw, Maximize, Eye, Trash2, Package } from 'lucide-react';
import ImagePreviewDialog from './ImagePreviewDialog';
import ImageSelectionControls from './ImageSelectionControls';
import SimpleSelectedImagesBar from './SimpleSelectedImagesBar';
import axios from 'axios';

// Define the MediaImage type
export interface MediaImage {
  id: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  src?: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
  source: 'product' | 'variant' | 'pexels' | 'uploaded' | 'shopify_media' | 'product_image' | 'collection_image';
}

interface MediaSelectionStepProps {
  onComplete: (media: {
    primaryImages: MediaImage[];
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }) => void;
  onBack: () => void;
  initialValues?: {
    primaryImages: MediaImage[];
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  };
  selectedProductId?: string | null;
  selectedProducts?: any[]; // Array of selected products for loading all product images
  title?: string | null; // The selected content title for context
  isClusterMode?: boolean; // Whether we're in cluster generation mode
  clusterCount?: number; // Number of articles in the cluster (for cluster mode)
}

export default function MediaSelectionStep({
  onComplete,
  onBack,
  initialValues,
  selectedProductId,
  selectedProducts = [],
  title,
  isClusterMode = false,
  clusterCount = 1
}: MediaSelectionStepProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('products'); // Default to product images first
  const [primaryImages, setPrimaryImages] = useState<MediaImage[]>(initialValues?.primaryImages || []);
  const [secondaryImages, setSecondaryImages] = useState<MediaImage[]>(initialValues?.secondaryImages || []);
  const [youtubeUrl, setYoutubeUrl] = useState<string>(initialValues?.youtubeEmbed || '');
  const [youtubePreviewUrl, setYoutubePreviewUrl] = useState<string>('');
  
  // State for image preview modal
  const [previewImage, setPreviewImage] = useState<MediaImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  
  // Image search and loading states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pexelsImages, setPexelsImages] = useState<MediaImage[]>([]);
  const [productImages, setProductImages] = useState<MediaImage[]>([]);
  const [shopifyMediaImages, setShopifyMediaImages] = useState<MediaImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<MediaImage[]>([]);
  
  // Set a default search query based on the title if provided
  useEffect(() => {
    if (title && !searchQuery) {
      // Extract keywords from title to form a search query
      const words = title.split(' ');
      const keywords = words.filter(word => word.length > 3).slice(0, 2);
      
      if (keywords.length > 0) {
        setSearchQuery(keywords.join(' '));
      } else if (words.length > 0) {
        setSearchQuery(words[0]);
      }
    }
  }, [title]);
  
  // Load product images when component mounts or when products change
  useEffect(() => {
    console.log('MediaSelectionStep: Products changed', { 
      selectedProductsCount: selectedProducts.length, 
      selectedProductId,
      productTitles: selectedProducts.map(p => p.title)
    });
    
    if (selectedProducts.length > 0) {
      console.log('Loading images for multiple products:', selectedProducts.length);
      loadAllProductImages();
    } else if (selectedProductId) {
      console.log('Loading images for single product:', selectedProductId);
      loadProductImages();
    } else {
      // Clear product images if no products are selected
      console.log('No products selected, clearing product images');
      setProductImages([]);
    }
  }, [selectedProductId, selectedProducts]);
  
  // Load product images initially if products are selected, otherwise load Shopify media
  useEffect(() => {
    if (selectedProducts.length > 0) {
      loadAllProductImages();
    } else {
      loadShopifyMediaImages();
    }
  }, []);
  
  const loadProductImages = async () => {
    if (!selectedProductId) return;
    
    setIsLoadingImages(true);
    try {
      const response = await axios.get(`/api/admin/product-images/${selectedProductId}`);
      
      if (response.data.success && (response.data.images || response.data.files)) {
        // Process the images to match our MediaImage format
        const imageData = response.data.images || response.data.files;
        const formattedImages: MediaImage[] = imageData.map((img: any) => ({
          id: img.id,
          url: img.src,
          width: img.width || 800,
          height: img.height || 600,
          alt: img.alt || 'Product image',
          src: {
            original: img.src,
            large: img.src,
            medium: img.src,
            small: img.src,
            thumbnail: img.src
          },
          source: img.variantId ? 'variant' : 'product'
        }));
        
        setProductImages(formattedImages);
      }
    } catch (error) {
      console.error('Error loading product images:', error);
      toast({
        title: 'Error loading product images',
        description: 'Could not load images for this product. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Load images for all selected products
  const loadAllProductImages = async () => {
    if (selectedProducts.length === 0) return;
    
    setIsLoadingImages(true);
    try {
      const allImages: MediaImage[] = [];
      
      // Load images for each selected product
      for (const product of selectedProducts) {
        try {
          console.log(`Loading images for product: ${product.title} (ID: ${product.id})`);
          const response = await axios.get(`/api/admin/product-images/${product.id}`);
          
          console.log(`Response for product ${product.id}:`, response.data);
          
          if (response.data.success && (response.data.images || response.data.files)) {
            const imageData = response.data.images || response.data.files;
            console.log(`Found ${imageData.length} images for product ${product.title}`);
            
            const formattedImages: MediaImage[] = imageData.map((img: any) => ({
              id: img.id || `${product.id}-${img.src}`,
              url: img.src || img.url,
              width: img.width || 800,
              height: img.height || 600,
              alt: img.alt || `${product.title} image`,
              src: {
                original: img.src || img.url,
                large: img.src || img.url,
                medium: img.src || img.url,
                small: img.src || img.url,
                thumbnail: img.src || img.url,
              },
              source: img.variantId ? 'variant' : 'product'
            }));
            allImages.push(...formattedImages);
          } else {
            console.log(`No images found for product ${product.title} (ID: ${product.id})`);
          }
        } catch (productError) {
          console.error(`Error loading images for product ${product.id} (${product.title}):`, productError);
        }
      }
      
      setProductImages(allImages);
      console.log(`Loaded ${allImages.length} product images from ${selectedProducts.length} products`);
      
      // If no images from API, try to extract images from product data directly
      if (allImages.length === 0) {
        console.log('No images from API, checking product data directly...');
        for (const product of selectedProducts) {
          if (product.images && Array.isArray(product.images)) {
            console.log(`Found ${product.images.length} images in product data for ${product.title}`);
            const productImages: MediaImage[] = product.images.map((img: any, index: number) => ({
              id: img.id || `product-${product.id}-image-${index}`,
              url: img.src || img.url,
              width: img.width || 800,
              height: img.height || 600,
              alt: img.alt || `${product.title} image ${index + 1}`,
              src: {
                original: img.src || img.url,
                large: img.src || img.url,
                medium: img.src || img.url,
                small: img.src || img.url,
                thumbnail: img.src || img.url,
              },
              source: 'product'
            }));
            allImages.push(...productImages);
          }
        }
        
        // Update the productImages state with fallback data
        if (allImages.length > 0) {
          setProductImages(allImages);
          console.log(`Updated product images with ${allImages.length} images from product data fallback`);
        }
      }

      if (allImages.length > 0) {
        toast({
          title: 'Product images loaded',
          description: `Loaded ${allImages.length} images from your selected products`
        });
      } else if (selectedProducts.length > 0) {
        console.log('No images found for any selected products');
        toast({
          title: 'No images found',
          description: 'Selected products do not have images. Try using stock photos from other tabs.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error loading all product images:', error);
      toast({
        title: 'Error loading product images',
        description: 'Could not load images for selected products. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingImages(false);
    }
  };
  
  const loadShopifyMediaImages = async () => {
    setIsLoadingImages(true);
    try {
      const response = await axios.get('/api/media/shopify-media-library');
      
      if (response.data.success && response.data.images) {
        console.log(`Successfully loaded ${response.data.images.length} Shopify media files`);
        
        // Process the images to match our MediaImage format
        const formattedImages: MediaImage[] = response.data.images.map((img: any) => {
          // Generate a unique ID if one doesn't exist
          const imgId = img.id || `shopify-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Ensure we have a valid URL
          const imgUrl = img.src || img.url;
          
          // Create the media image object
          return {
            id: imgId,
            url: imgUrl,
            width: img.width || 800,
            height: img.height || 600,
            alt: img.alt || img.filename || 'Shopify media',
            src: {
              original: imgUrl,
              large: imgUrl,
              medium: imgUrl,
              small: imgUrl,
              thumbnail: imgUrl
            },
            source: 'shopify_media'
          };
        });
        
        console.log(`Processed ${formattedImages.length} Shopify media images for display`);
        setShopifyMediaImages(formattedImages);
        
        // Show a success toast if we have images
        if (formattedImages.length > 0) {
          toast({
            title: 'Media loaded',
            description: `Loaded ${formattedImages.length} images from your Shopify store`
          });
        }
        
        // Auto-search on Pexels with a sensible default if we have a title
        if (title && searchQuery === '' && pexelsImages.length === 0) {
          const words = title.split(' ');
          const keywords = words.filter(word => word.length > 3).slice(0, 2);
          if (keywords.length > 0) {
            setSearchQuery("people using " + keywords.join(' '));
            setTimeout(() => searchPexelsImages(), 500);
          }
        }
      }
    } catch (error) {
      console.error('Error loading Shopify media library:', error);
      toast({
        title: 'Error loading media library',
        description: 'Could not load images from your Shopify media library. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingImages(false);
    }
  };
  
  const searchPexelsImages = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Please enter a search term',
        description: 'Enter keywords to search for images on Pexels.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSearching(true);
    setPexelsImages([]); // Clear previous results first
    
    try {
      console.log(`Searching Pexels for: "${searchQuery}"`);
      
      // Add a retry mechanism with a longer timeout
      const fetchWithRetry = async (query: string, retries = 2) => {
        try {
          const response = await axios.get('/api/media/pexels-search', {
            params: { query },
            timeout: 15000 // 15 second timeout
          });
          return response;
        } catch (error) {
          if (retries > 0) {
            console.log(`Retrying Pexels search for "${query}" (${retries} retries left)...`);
            return fetchWithRetry(query, retries - 1);
          }
          throw error;
        }
      };
      
      // First attempt with user's search query
      const response = await fetchWithRetry(searchQuery);
      
      // Process the response data and safely format images
      const processImages = (data: any, queryUsed: string): MediaImage[] => {
        if (!data || !data.success || !data.images || !Array.isArray(data.images) || data.images.length === 0) {
          return [];
        }
        
        return data.images
          .filter((img: any) => img && img.src && (img.src.large || img.src.medium || img.src.original))
          .map((img: any) => {
            // Ensure we have a working image URL with fallbacks
            const imageUrl = img.src.large || img.src.medium || img.src.original || '';
            
            return {
              id: `pexels-${img.id || Date.now() + Math.random().toString(36).substr(2, 9)}`,
              url: imageUrl,
              alt: img.alt || `${queryUsed} image`,
              source: 'pexels' as const,
              // Include these properties for our interface
              width: img.width || 800,
              height: img.height || 600,
              // Store all image sizes for potential fallback
              src: {
                original: img.src.original || imageUrl,
                large: img.src.large || imageUrl,
                medium: img.src.medium || imageUrl,
                small: img.src.small || imageUrl,
                thumbnail: img.src.thumbnail || imageUrl
              }
            };
          });
      };
      
      // Process the main search results
      const formattedImages = processImages(response.data, searchQuery);
      
      if (formattedImages.length > 0) {
        console.log(`Found ${formattedImages.length} Pexels images for "${searchQuery}"`);
        setPexelsImages(formattedImages);
        
        toast({
          title: 'Images found',
          description: `Found ${formattedImages.length} images matching "${searchQuery}"`,
        });
      } else {
        // Try fallback search with modified terms
        console.log("No results from primary search, trying alternative query");
        const fallbackQuery = `people ${searchQuery}`;
        
        try {
          const fallbackResponse = await fetchWithRetry(fallbackQuery);
          const fallbackImages = processImages(fallbackResponse.data, fallbackQuery);
          
          if (fallbackImages.length > 0) {
            console.log(`Found ${fallbackImages.length} Pexels images with fallback query "${fallbackQuery}"`);
            setPexelsImages(fallbackImages);
            
            toast({
              title: 'Alternative images found',
              description: `Found ${fallbackImages.length} images for "${fallbackQuery}"`,
            });
          } else {
            // Try one last generic fallback
            const genericQuery = "happy customer product";
            console.log(`Trying generic fallback query: "${genericQuery}"`);
            
            const genericResponse = await fetchWithRetry(genericQuery);
            const genericImages = processImages(genericResponse.data, genericQuery);
            
            if (genericImages.length > 0) {
              console.log(`Found ${genericImages.length} images with generic query "${genericQuery}"`);
              setPexelsImages(genericImages);
              
              toast({
                title: 'Generic images found',
                description: `Found ${genericImages.length} general images you can use`,
              });
            } else {
              // Nothing worked, show error
              toast({
                title: 'No images found',
                description: 'Try different keywords or browse the Shopify Media Library',
                variant: 'destructive'
              });
            }
          }
        } catch (fallbackError) {
          console.error('Error with fallback searches:', fallbackError);
          toast({
            title: 'No images found',
            description: 'Try different keywords or browse your Shopify Media Library',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error searching Pexels:', error);
      toast({
        title: 'Error searching images',
        description: 'Could not search for images on Pexels. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Handle multiple file uploads
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          // Create form data for upload
          const formData = new FormData();
          formData.append('image', file);
          
          // Upload to server
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const result = await response.json();
            
            // Create a new MediaImage object with server URL
            const newImage: MediaImage = {
              id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: result.url, // Use server URL instead of blob
              width: 800, // Placeholder dimensions
              height: 600,
              alt: file.name,
              src: {
                original: result.url,
                large: result.url,
                medium: result.url,
                small: result.url,
                thumbnail: result.url
              },
              source: 'uploaded'
            };
            
            setUploadedImages(prev => [...prev, newImage]);
            
            toast({
              title: 'Image uploaded successfully',
              description: `${file.name} has been uploaded and is ready to use`,
            });
          } else {
            toast({
              title: 'Upload failed',
              description: `Failed to upload ${file.name}`,
              variant: 'destructive'
            });
          }
        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: 'Upload error',
            description: `Error uploading ${file.name}`,
            variant: 'destructive'
          });
        }
      }
    }
    
    // Reset the input value to allow uploading the same file again
    event.target.value = '';
  };
  
  const parseYoutubeUrl = (url: string): string | null => {
    // Regular YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  const handleYoutubePreview = () => {
    const videoId = parseYoutubeUrl(youtubeUrl);
    if (videoId) {
      setYoutubePreviewUrl(`https://www.youtube.com/embed/${videoId}`);
    } else {
      toast({
        title: 'Invalid YouTube URL',
        description: 'Please enter a valid YouTube video URL.',
        variant: 'destructive'
      });
    }
  };
  
  const addPrimaryImageHandler = (image: MediaImage) => {
    console.log('Adding primary image:', image);
    
    // Check if image is already selected as primary
    if (primaryImages.some(img => img.id === image.id)) {
      toast({
        title: 'Already selected',
        description: 'This image is already selected as a primary image.',
        variant: 'default'
      });
      return;
    }
    
    setPrimaryImages(prev => [...prev, image]);
    
    toast({
      title: 'Primary image added',
      description: `You now have ${primaryImages.length + 1} primary images for bulk generation.`,
    });
  };
  
  const removePrimaryImageHandler = (image: MediaImage) => {
    console.log('Removing primary image:', image);
    setPrimaryImages(prev => prev.filter(img => img.id !== image.id));
    
    toast({
      title: 'Primary image removed',
      description: 'Image removed from primary images.',
    });
  };
  
  // Function to toggle between primary and secondary
  const toggleImageStatus = (image: MediaImage) => {
    // Check current status
    const isPrimary = primaryImages.some(img => img.id === image.id);
    const isSecondary = secondaryImages.some(img => img.id === image.id);
    
    if (isPrimary) {
      // If it's a primary image, remove from primary and add to secondary
      setPrimaryImages(prev => prev.filter(img => img.id !== image.id));
      
      // Add to secondary images if not already there
      if (!isSecondary) {
        setSecondaryImages(prev => [...prev, image]);
      }
      
      toast({
        title: 'Image changed to secondary',
        description: 'Image has been moved from primary to secondary status.',
      });
    } else if (isSecondary) {
      // If it's a secondary image, make it primary
      setSecondaryImages(prev => prev.filter(img => img.id !== image.id));
      setPrimaryImages(prev => [...prev, image]);
      
      toast({
        title: 'Image promoted to primary',
        description: 'Image has been added to primary images for bulk generation.',
      });
    } else {
      // If neither, add as primary by default
      setPrimaryImages(prev => [...prev, image]);
      
      toast({
        title: 'Image set as primary',
        description: 'Image has been added to primary images for bulk generation.',
      });
    }
  };
  
  const toggleSecondaryImage = (image: MediaImage) => {
    // Check if this image is already in secondary images
    const exists = secondaryImages.some(img => img.id === image.id);
    
    if (exists) {
      // Remove from secondary images
      console.log('Removing secondary image:', image);
      setSecondaryImages(prev => prev.filter(img => img.id !== image.id));
      toast({
        title: 'Image removed',
        description: 'Image removed from secondary content images.',
      });
    } else {
      // Add to secondary images
      console.log('Adding secondary image:', image);
      setSecondaryImages(prev => [...prev, image]);
      toast({
        title: 'Image added',
        description: 'Image added to secondary content images.',
      });
    }
  };
  
  const renderImageCard = (image: MediaImage, isPrimary: boolean = false, isSecondary: boolean = false) => {
    return (
      <div key={image.id} className="relative group overflow-hidden rounded-md">
        <div className="relative aspect-video bg-slate-100">
          <ShopifyImageViewer
            src={image.url}
            alt={image.alt || ''}
            className="w-full h-full"
            objectFit="cover"
            selected={isPrimary || isSecondary}
            selectionType={isPrimary ? 'primary' : isSecondary ? 'secondary' : 'none'}
          />
          
          {/* Selection indicators - now handled by ShopifyImageViewer */}
          
          {/* Source badge */}
          <div className="absolute bottom-2 left-2 z-10">
            <Badge variant="secondary" className="text-xs">
              {image.source === 'pexels' ? 'Pexels' : 
               image.source === 'uploaded' ? 'Uploaded' : 
               image.source === 'shopify_media' ? 'Media Library' :
               image.source === 'variant' ? 'Variant' : 'Product'}
            </Badge>
          </div>
          
          {/* Always visible selection options for better discoverability */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {/* Toggle button */}
            <Button 
              size="sm" 
              variant="secondary"
              className={`p-1 h-7 w-7 rounded-full bg-white/90 hover:bg-white text-purple-600 hover:text-purple-700`}
              onClick={() => toggleImageStatus(image)}
              title="Toggle between primary and secondary"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {/* Primary button */}
            <Button 
              size="sm" 
              variant="secondary"
              className={`p-1 h-7 w-7 rounded-full ${isPrimary ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/80 hover:bg-white'}`}
              onClick={() => isPrimary ? removePrimaryImageHandler(image) : addPrimaryImageHandler(image)}
              title={isPrimary ? 'Remove from primary images' : 'Add to primary images'}
            >
              <Star className="h-4 w-4" />
            </Button>
            
            {/* Secondary button */}
            <Button 
              size="sm" 
              variant="secondary"
              className={`p-1 h-7 w-7 rounded-full ${isSecondary ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/80 hover:bg-white'}`}
              onClick={() => toggleSecondaryImage(image)}
              title={isSecondary ? "Remove from secondary images" : "Add as secondary image"}
            >
              {isSecondary ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Hover overlay with more detailed actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
            <div className="flex flex-col items-center w-full gap-2">
              <p className="text-white text-xs font-medium">Select image as:</p>
              <div className="flex gap-2 w-full">
                <Button 
                  size="sm" 
                  variant={isPrimary ? "default" : "outline"} 
                  className={isPrimary ? "bg-blue-600 hover:bg-blue-700 w-full" : "bg-white text-blue-700 hover:bg-blue-50 w-full"}
                  onClick={() => isPrimary ? removePrimaryImageHandler(image) : addPrimaryImageHandler(image)}
                >
                  {isPrimary ? (
                    <div className="flex items-center justify-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Primary</span>
                    </div>
                  ) : 'Primary'}
                </Button>
                
                <Button 
                  size="sm" 
                  variant={isSecondary ? "default" : "outline"} 
                  className={isSecondary ? "bg-green-600 hover:bg-green-700 w-full" : "bg-white text-green-700 hover:bg-green-50 w-full"}
                  onClick={() => toggleSecondaryImage(image)}
                >
                  {isSecondary ? (
                    <div className="flex items-center justify-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Secondary</span>
                    </div>
                  ) : 'Secondary'}
                </Button>
              </div>
            </div>
            
            {(isPrimary || isSecondary) && (
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-white/90 text-red-600 hover:bg-white hover:text-red-700 w-full mt-1"
                onClick={() => {
                  if (isPrimary) {
                    removePrimaryImageHandler(image);
                  } 
                  if (isSecondary) {
                    toggleSecondaryImage(image);
                  }
                }}
              >
                Remove Selection
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const handleComplete = () => {
    onComplete({
      primaryImages,
      secondaryImages,
      youtubeEmbed: youtubePreviewUrl || null
    });
  };
  
  // Function to open image preview
  const openImagePreview = (image: MediaImage) => {
    setPreviewImage(image);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Select Images for Your Content</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={handleComplete}>Continue</Button>
        </div>
      </div>
      
      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        image={previewImage}
        isOpen={isPreviewOpen}
        setIsOpen={setIsPreviewOpen}
        setPrimaryImage={addPrimaryImageHandler}
        toggleSecondaryImage={toggleSecondaryImage}
        isSecondary={previewImage ? secondaryImages.some(img => img.id === previewImage.id) : false}
      />
      
      {/* Display selection instructions */}
      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 flex items-start">
        <div className="mr-2 mt-0.5">
          <AlertCircle className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-blue-700">How to select images</h3>
          <ul className="text-xs text-blue-600 list-disc ml-4 mt-1">
            <li>Choose <strong>multiple primary (featured) images</strong> for bulk generation - each article will use a different primary image</li>
            <li>Select <strong>multiple secondary images</strong> that will appear throughout the content</li>
            <li>Hover over any image to see selection options</li>
            <li>Use the <strong>eye icon</strong> to preview images at full size</li>
          </ul>
        </div>
      </div>
      
      {/* Display simple selected images bar */}
      <SimpleSelectedImagesBar
        primaryImages={primaryImages}
        secondaryImages={secondaryImages}
        setPrimaryImages={setPrimaryImages}
        setSecondaryImages={setSecondaryImages}
        onPreviewImage={openImagePreview}
      />
      
      {/* Debug info - remove when fixed */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-2 text-xs border">
          <strong>Debug:</strong> Primary: {primaryImages.length}, Secondary: {secondaryImages.length}, Uploaded: {uploadedImages.length}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="products" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900">Product Images</TabsTrigger>
          <TabsTrigger value="primary" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900">Primary Image</TabsTrigger>
          <TabsTrigger value="secondary" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900">Secondary Images</TabsTrigger>
          <TabsTrigger value="uploaded" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900">Uploaded Images</TabsTrigger>
          <TabsTrigger value="youtube" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-700 hover:text-gray-900">YouTube Video</TabsTrigger>
        </TabsList>
        
        {/* PRODUCT IMAGES TAB */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="flex items-start">
                <Package className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-700">Your Product Images</h3>
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedProducts.length > 0 
                      ? `Images from your ${selectedProducts.length} selected product${selectedProducts.length > 1 ? 's' : ''}. Click ⭐ for primary (featured) or ➕ for secondary images.`
                      : 'Select products in step 1 to see their images here'}
                  </p>
                </div>
              </div>
            </div>
            
            {isLoadingImages ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-600">Loading product images...</span>
              </div>
            ) : productImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productImages.map(image => renderImageCard(
                  image,
                  primaryImages.some(img => img.id === image.id),
                  secondaryImages.some(img => img.id === image.id)
                ))}
              </div>
            ) : selectedProducts.length > 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md">
                <AlertCircle className="h-12 w-12 mx-auto text-slate-300" />
                <p className="mt-2">No images found for selected products</p>
                <p className="text-xs mt-1">Try selecting products with images or use Pexels for stock photos</p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md">
                <Package className="h-12 w-12 mx-auto text-slate-300" />
                <p className="mt-2">No products selected</p>
                <p className="text-xs mt-1">Go back to step 1 to select products first</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* PRIMARY IMAGE SELECTION */}
        <TabsContent value="primary" className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search for primary images (e.g. happy customer using product)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPexelsImages()}
              />
              <Button onClick={searchPexelsImages} className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-0.5" /> : <Search className="h-4 w-4 mr-0.5" />}
                Search
              </Button>
            </div>
            
            {primaryImages.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Selected Primary Image</h3>
                <div className="aspect-video relative w-full max-w-md mx-auto">
                  <ShopifyImageViewer
                    src={primaryImages[0].url}
                    alt={primaryImages[0].alt || ''}
                    className="w-full h-full rounded-md"
                    objectFit="cover"
                    selected={true}
                    selectionType="primary"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setPrimaryImages([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">This image will be used as the featured image for your content.</p>
              </div>
            )}
            
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-700">Primary Image Tips</h3>
                  <p className="text-xs text-yellow-600 mt-1">
                    For engaging content, choose a primary image that:
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Shows people using or interacting with the product</li>
                      <li>Conveys emotion and tells a story</li>
                      <li>Has good lighting and composition</li>
                      <li>Appears professional and high-quality</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
            
            {pexelsImages.length > 0 && (
              <>
                <h3 className="text-sm font-medium">Pexels Stock Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pexelsImages.map(image => {
                    const isPrimary = primaryImages.some(img => img.id === image.id);
                    const isSecondary = secondaryImages.some(img => img.id === image.id);
                    
                    return (
                      <div key={image.id} className="relative group overflow-hidden rounded-md">
                        <div className="relative aspect-video bg-slate-100">
                          <ShopifyImageViewer
                            src={image.url}
                            alt={image.alt || ''}
                            className="w-full h-full"
                            objectFit="cover"
                            selected={isPrimary || isSecondary}
                            selectionType={isPrimary ? 'primary' : isSecondary ? 'secondary' : 'none'}
                          />
                          
                          {/* Source badge */}
                          <div className="absolute bottom-2 left-2 z-10">
                            <Badge variant="secondary" className="text-xs">
                              Pexels
                            </Badge>
                          </div>
                          
                          {/* Simple selection controls that are directly below the image */}
                          {isPrimary && (
                            <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white py-1 px-2 text-center text-xs font-bold">
                              Primary Image
                            </div>
                          )}
                          
                          {isSecondary && (
                            <div className="absolute top-0 left-0 right-0 bg-green-600 text-white py-1 px-2 text-center text-xs font-bold">
                              Secondary Image
                            </div>
                          )}
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-black p-2 flex items-center justify-center gap-1">
                            <Button 
                              variant="default"
                              className="bg-blue-600 text-white text-xs w-full"
                              onClick={() => addPrimaryImageHandler(image)}
                            >
                              Set Primary
                            </Button>
                            
                            <Button 
                              variant="default"
                              className="bg-green-600 text-white text-xs w-full"
                              onClick={() => toggleSecondaryImage(image)}
                            >
                              Add Secondary
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            <h3 className="text-sm font-medium pt-2">Product Images</h3>
            {isLoadingImages ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : productImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productImages.map(image => renderImageCard(
                  image,
                  primaryImages.some(img => img.id === image.id),
                  secondaryImages.some(img => img.id === image.id)
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md">
                <ImageIcon className="h-12 w-12 mx-auto text-slate-300" />
                <p className="mt-2">No product images available</p>
              </div>
            )}
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Upload Your Own Images</h3>
              <div 
                className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center cursor-pointer hover:bg-slate-50"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-500">
                  PNG, JPG, GIF up to 10MB
                </p>
                <input 
                  type="file" 
                  id="image-upload" 
                  multiple
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {uploadedImages.map(image => renderImageCard(
                    image,
                    primaryImages.some(img => img.id === image.id),
                    secondaryImages.some(img => img.id === image.id)
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* SECONDARY IMAGES SELECTION */}
        <TabsContent value="secondary" className="space-y-4">
          <div className="flex flex-col space-y-4">
            {secondaryImages.length > 0 ? (
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="text-sm font-medium text-green-700 mb-2">Selected Secondary Images ({secondaryImages.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {secondaryImages.map(image => (
                    <div key={image.id} className="relative aspect-video">
                      <ShopifyImageViewer
                        src={image.url}
                        alt={image.alt || ''}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => toggleSecondaryImage(image)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-600 mt-2">These images will be used within your content body.</p>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-center">
                <ImageIcon className="h-8 w-8 mx-auto text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700 mt-2">No Secondary Images Selected</h3>
                <p className="text-xs text-slate-500 mt-1">Select images from any tab to add them as secondary content images.</p>
              </div>
            )}
            
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-700">Secondary Image Tips</h3>
                  <p className="text-xs text-yellow-600 mt-1">
                    For effective secondary images:
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Include detailed product shots from multiple angles</li>
                      <li>Show product features, dimensions, or material details</li>
                      <li>Add lifestyle images showing the product in use</li>
                      <li>Keep a consistent style across all images</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
            
            <h3 className="text-sm font-medium">Shopify Media Library</h3>
            {isLoadingImages ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : shopifyMediaImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopifyMediaImages.map(image => renderImageCard(
                  image,
                  primaryImages.some(img => img.id === image.id), 
                  secondaryImages.some(img => img.id === image.id)
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md">
                <ImageIcon className="h-12 w-12 mx-auto text-slate-300" />
                <p className="mt-2">No media library images available</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* UPLOADED IMAGES SELECTION */}
        <TabsContent value="uploaded" className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
              <div className="flex items-start">
                <Upload className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-purple-700">Your Uploaded Images</h3>
                  <p className="text-xs text-purple-600 mt-1">
                    Images you've uploaded are displayed below. Click on any image to set it as primary or add to secondary images.
                  </p>
                </div>
              </div>
            </div>
            
            {/* File Upload Section */}
            <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload additional images</p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="upload-images-tab"
                onChange={handleFileUpload}
              />
              <Label htmlFor="upload-images-tab" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Choose Files</span>
                </Button>
              </Label>
            </div>
            
            {/* Display Uploaded Images */}
            {uploadedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedImages.map(image => renderImageCard(
                  image,
                  primaryImages.some(img => img.id === image.id),
                  secondaryImages.some(img => img.id === image.id)
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No uploaded images yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload images using the button above</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* YOUTUBE VIDEO EMBEDDING */}
        <TabsContent value="youtube" className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube Video URL</Label>
              <div className="flex gap-2">
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                <Button onClick={handleYoutubePreview} className="flex-shrink-0">
                  <Youtube className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
            
            {youtubePreviewUrl && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-2">Video Preview</h3>
                  <div className="aspect-video">
                    <iframe
                      src={youtubePreviewUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-700">YouTube Video Tips</h3>
                  <p className="text-xs text-yellow-600 mt-1">
                    When adding a YouTube video:
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Choose videos that demonstrate your product in action</li>
                      <li>Include tutorials, reviews, or testimonials if available</li>
                      <li>Ensure the video is high-quality and professional</li>
                      <li>Videos should be relevant to your content topic</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="border-gray-300 text-gray-700 hover:bg-gray-50">
          Back
        </Button>
        <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 text-white">
          Continue
        </Button>
      </div>
    </div>
  );
}