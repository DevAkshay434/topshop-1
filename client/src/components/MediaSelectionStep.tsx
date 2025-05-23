import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import ShopifyImageViewer from './ShopifyImageViewer';
import { Loader2, Search, Upload, Youtube, Image as ImageIcon, X, Check, AlertCircle, Star, Plus, Minus, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
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
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }) => void;
  onBack: () => void;
  initialValues?: {
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  };
  selectedProductId?: string | null;
  title?: string | null; // The selected content title for context
}

export default function MediaSelectionStep({
  onComplete,
  onBack,
  initialValues,
  selectedProductId,
  title
}: MediaSelectionStepProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('primary');
  const [primaryImage, setPrimaryImage] = useState<MediaImage | null>(initialValues?.primaryImage || null);
  const [secondaryImages, setSecondaryImages] = useState<MediaImage[]>(initialValues?.secondaryImages || []);
  const [youtubeUrl, setYoutubeUrl] = useState<string>(initialValues?.youtubeEmbed || '');
  const [youtubePreviewUrl, setYoutubePreviewUrl] = useState<string>('');
  
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
  
  // Load product images when component mounts or when productId changes
  useEffect(() => {
    if (selectedProductId) {
      loadProductImages();
    }
  }, [selectedProductId]);
  
  // Load Shopify media library images on initial load
  useEffect(() => {
    loadShopifyMediaImages();
  }, []);
  
  const loadProductImages = async () => {
    if (!selectedProductId) return;
    
    setIsLoadingImages(true);
    try {
      const response = await axios.get('/api/media/product-images', {
        params: { productId: selectedProductId }
      });
      
      if (response.data.success && response.data.images) {
        // Process the images to match our MediaImage format
        const formattedImages: MediaImage[] = response.data.images.map((img: any) => ({
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
    try {
      console.log(`Searching Pexels for: "${searchQuery}"`);
      const response = await axios.get('/api/media/pexels-search', {
        params: { query: searchQuery }
      });
      
      if (response.data.success && response.data.images) {
        console.log(`Found ${response.data.images.length} Pexels images`);
        
        // Process the images to match our MediaImage format
        const formattedImages: MediaImage[] = response.data.images.map((img: any) => ({
          id: `pexels-${img.id}`,
          url: img.src.large || img.src.original,
          width: img.width,
          height: img.height,
          alt: img.alt || `${searchQuery} image`,
          src: {
            original: img.src.original,
            large: img.src.large,
            medium: img.src.medium,
            small: img.src.small,
            thumbnail: img.src.thumbnail
          },
          source: 'pexels'
        }));
        
        setPexelsImages(formattedImages);
        
        // Show a success message
        toast({
          title: 'Images found',
          description: `Found ${formattedImages.length} images matching "${searchQuery}"`,
        });
      } else {
        toast({
          title: 'No images found',
          description: 'Try different keywords or browse the Shopify Media Library',
          variant: 'destructive'
        });
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
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Handle multiple file uploads
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && e.target.result) {
            const imageUrl = e.target.result.toString();
            
            // Create a new MediaImage object
            const newImage: MediaImage = {
              id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: imageUrl,
              width: 800, // Placeholder dimensions
              height: 600,
              alt: file.name,
              src: {
                original: imageUrl,
                large: imageUrl,
                medium: imageUrl,
                small: imageUrl,
                thumbnail: imageUrl
              },
              source: 'uploaded'
            };
            
            setUploadedImages(prev => [...prev, newImage]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
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
  
  const setPrimaryImageHandler = (image: MediaImage) => {
    setPrimaryImage(image);
    
    toast({
      title: 'Primary image set',
      description: 'This image will be used as the featured image for your content.',
    });
  };
  
  // Function to toggle between primary and secondary
  const toggleImageStatus = (image: MediaImage) => {
    // Check current status
    const isPrimary = primaryImage?.id === image.id;
    const isSecondary = secondaryImages.some(img => img.id === image.id);
    
    if (isPrimary) {
      // If it's the primary image, change to secondary
      setPrimaryImage(null);
      
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
      setPrimaryImage(image);
      
      toast({
        title: 'Image promoted to primary',
        description: 'Image has been set as the primary (featured) image.',
      });
    } else {
      // If neither, set as primary by default
      setPrimaryImage(image);
      
      toast({
        title: 'Image set as primary',
        description: 'Image has been set as the primary (featured) image.',
      });
    }
  };
  
  const toggleSecondaryImage = (image: MediaImage) => {
    // Check if this image is already in secondary images
    const exists = secondaryImages.some(img => img.id === image.id);
    
    if (exists) {
      // Remove from secondary images
      setSecondaryImages(prev => prev.filter(img => img.id !== image.id));
      toast({
        title: 'Image removed',
        description: 'Image removed from secondary content images.',
      });
    } else {
      // Add to secondary images
      setSecondaryImages(prev => [...prev, image]);
      toast({
        title: 'Image added',
        description: 'Image added to secondary content images.',
      });
    }
  };
  
  const renderImageCard = (image: MediaImage, isPrimary: boolean = false, isSecondary: boolean = false) => {
    return (
      <div key={image.id} className="relative group border rounded-md overflow-hidden">
        <div className="relative aspect-video bg-slate-100">
          <ShopifyImageViewer
            src={image.url}
            alt={image.alt || ''}
            className="w-full h-full object-cover"
          />
          
          {/* Selection indicators */}
          {isPrimary && (
            <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1 z-10">
              <Star className="h-4 w-4" />
            </div>
          )}
          
          {isSecondary && !isPrimary && (
            <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1 z-10">
              <Check className="h-4 w-4" />
            </div>
          )}
          
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
              onClick={() => setPrimaryImageHandler(image)}
              title="Set as primary image"
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
            <Button 
              size="sm" 
              variant={isPrimary ? "default" : "outline"} 
              className={isPrimary ? "bg-blue-600 hover:bg-blue-700 w-full" : "bg-white text-blue-700 hover:bg-blue-50 w-full"}
              onClick={() => setPrimaryImageHandler(image)}
            >
              {isPrimary ? 'Primary Image ✓' : 'Set as Primary'}
            </Button>
            
            <Button 
              size="sm" 
              variant={isSecondary ? "default" : "outline"} 
              className={isSecondary ? "bg-green-600 hover:bg-green-700 w-full" : "bg-white text-green-700 hover:bg-green-50 w-full"}
              onClick={() => toggleSecondaryImage(image)}
            >
              {isSecondary ? 'Remove from Secondary' : 'Add as Secondary'}
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  const handleComplete = () => {
    onComplete({
      primaryImage,
      secondaryImages,
      youtubeEmbed: youtubePreviewUrl || null
    });
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="primary">Primary Image</TabsTrigger>
          <TabsTrigger value="secondary">Secondary Images</TabsTrigger>
          <TabsTrigger value="youtube">YouTube Video</TabsTrigger>
        </TabsList>
        
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
              <Button onClick={searchPexelsImages} className="flex-shrink-0">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
            
            {primaryImage && (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Selected Primary Image</h3>
                <div className="aspect-video relative w-full max-w-md mx-auto">
                  <ShopifyImageViewer
                    src={primaryImage.url}
                    alt={primaryImage.alt || ''}
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setPrimaryImage(null)}
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
                  {pexelsImages.map(image => renderImageCard(
                    image,
                    primaryImage?.id === image.id,
                    secondaryImages.some(img => img.id === image.id)
                  ))}
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
                  primaryImage?.id === image.id,
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
                    primaryImage?.id === image.id,
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
                  primaryImage?.id === image.id, 
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
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete}>
          Continue
        </Button>
      </div>
    </div>
  );
}