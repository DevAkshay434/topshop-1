import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileImage, 
  Youtube, 
  Image as ImageIcon, 
  ImagePlus, 
  Loader2, 
  Search, 
  Upload, 
  X, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import ShopifyImageViewer from './ShopifyImageViewer';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { MediaImage } from './ChooseMediaDialog';

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
  initialValues = { primaryImage: null, secondaryImages: [], youtubeEmbed: null },
  selectedProductId = null,
  title = null
}: MediaSelectionStepProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('primary');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Image state management
  const [primaryImage, setPrimaryImage] = useState<MediaImage | null>(initialValues.primaryImage);
  const [secondaryImages, setSecondaryImages] = useState<MediaImage[]>(initialValues.secondaryImages);
  const [youtubeEmbed, setYoutubeEmbed] = useState<string | null>(initialValues.youtubeEmbed);
  const [isValidYoutubeEmbed, setIsValidYoutubeEmbed] = useState<boolean>(false);
  
  // Pexels search state
  const [pexelsQuery, setPexelsQuery] = useState<string>('');
  const [pexelsImages, setPexelsImages] = useState<MediaImage[]>([]);
  const [isPexelsLoading, setIsPexelsLoading] = useState<boolean>(false);
  const [pexelsSuggestions, setPexelsSuggestions] = useState<string[]>([]);
  
  // Product images state
  const [productImages, setProductImages] = useState<MediaImage[]>([]);
  const [isProductImagesLoading, setIsProductImagesLoading] = useState<boolean>(false);
  
  // Shopify Media Library state
  const [shopifyMediaImages, setShopifyMediaImages] = useState<MediaImage[]>([]);
  const [isShopifyMediaLoading, setIsShopifyMediaLoading] = useState<boolean>(false);
  
  // Generate Pexels search suggestions based on title
  useEffect(() => {
    if (title) {
      generatePexelsSuggestions(title);
    }
  }, [title]);
  
  // Load product images when product ID changes
  useEffect(() => {
    if (selectedProductId) {
      loadProductImages(selectedProductId);
    }
  }, [selectedProductId]);
  
  const generatePexelsSuggestions = (contentTitle: string) => {
    const baseKeywords = ['happy', 'satisfied', 'lifestyle', 'person', 'people', 'emotion'];
    const emotionalKeywords = ['happy', 'excited', 'satisfied', 'smiling'];
    const personKeywords = ['woman', 'man', 'family', 'child', 'person', 'people'];
    
    // Extract keywords from title
    const titleWords = contentTitle
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3);
    
    // Generate combinations
    const suggestions: string[] = [];
    
    // Add title-based suggestions
    if (titleWords.length > 0) {
      suggestions.push(`${titleWords.join(' ')} person`);
      suggestions.push(`${titleWords.join(' ')} lifestyle`);
      suggestions.push(`happy person ${titleWords.join(' ')}`);
    }
    
    // Add emotional + title combinations
    emotionalKeywords.forEach(emotion => {
      suggestions.push(`${emotion} person using ${titleWords.join(' ')}`);
    });
    
    // Add person + title combinations
    personKeywords.forEach(person => {
      suggestions.push(`${person} using ${titleWords.join(' ')}`);
      suggestions.push(`happy ${person} with ${titleWords.join(' ')}`);
    });
    
    // Limit to 5 unique suggestions
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5);
    setPexelsSuggestions(uniqueSuggestions);
  };
  
  // Search Pexels for images
  const searchPexels = async (query: string) => {
    if (!query || query.trim().length < 3) {
      toast({
        title: "Search too short",
        description: "Please enter at least 3 characters for your search",
        variant: "destructive"
      });
      return;
    }
    
    setIsPexelsLoading(true);
    setPexelsImages([]);
    
    try {
      const response = await apiRequest({
        url: `/api/media/pexels-search?query=${encodeURIComponent(query)}`,
        method: 'GET'
      });
      
      if (!response.success || !response.images) {
        toast({
          title: "Search failed",
          description: "Could not get images from Pexels. Please try again.",
          variant: "destructive"
        });
        setIsPexelsLoading(false);
        return;
      }
      
      // Format images for display
      const formattedImages: MediaImage[] = response.images.map((image: any) => ({
        id: `pexels-${image.id}`,
        url: image.src.medium,
        alt: image.alt || 'Pexels image',
        title: image.alt || 'Pexels image',
        source: 'pexels',
        selected: false,
        originalUrl: image.src.original,
        photographer: image.photographer
      }));
      
      setPexelsImages(formattedImages);
      
    } catch (error) {
      console.error('Error searching Pexels:', error);
      toast({
        title: "Search error",
        description: "There was a problem searching for images.",
        variant: "destructive"
      });
    } finally {
      setIsPexelsLoading(false);
    }
  };
  
  // Load images from a specific product
  const loadProductImages = async (productId: string) => {
    setIsProductImagesLoading(true);
    setProductImages([]);
    
    try {
      const response = await apiRequest({
        url: `/api/media/product-images?productId=${productId}`,
        method: 'GET'
      });
      
      if (!response.success || !response.images) {
        toast({
          title: "Failed to load images",
          description: "Could not load images for this product.",
          variant: "destructive"
        });
        setIsProductImagesLoading(false);
        return;
      }
      
      setProductImages(response.images);
      
    } catch (error) {
      console.error('Error loading product images:', error);
      toast({
        title: "Error loading images",
        description: "There was a problem loading product images.",
        variant: "destructive"
      });
    } finally {
      setIsProductImagesLoading(false);
    }
  };
  
  // Load Shopify Media Library
  const loadShopifyMediaLibrary = async () => {
    setIsShopifyMediaLoading(true);
    setShopifyMediaImages([]);
    
    try {
      const response = await apiRequest({
        url: '/api/media/shopify-media-library',
        method: 'GET'
      });
      
      if (!response.success || !response.images) {
        toast({
          title: "Failed to load media",
          description: "Could not load media from your Shopify store.",
          variant: "destructive"
        });
        setIsShopifyMediaLoading(false);
        return;
      }
      
      setShopifyMediaImages(response.images);
      
    } catch (error) {
      console.error('Error loading Shopify Media Library:', error);
      toast({
        title: "Error loading media",
        description: "There was a problem accessing your Shopify Media Library.",
        variant: "destructive"
      });
    } finally {
      setIsShopifyMediaLoading(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsLoading(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        toast({
          title: "Upload failed",
          description: result.message || "Failed to upload images.",
          variant: "destructive"
        });
        return;
      }
      
      // Add uploaded images to the appropriate array based on active tab
      const uploadedImages: MediaImage[] = result.images;
      
      if (activeTab === 'primary' && uploadedImages.length > 0) {
        setPrimaryImage(uploadedImages[0]);
        toast({
          title: "Primary image set",
          description: "Your uploaded image has been set as the primary image."
        });
      } else if (activeTab === 'secondary') {
        setSecondaryImages(prev => [...prev, ...uploadedImages]);
        toast({
          title: "Images added",
          description: `Added ${uploadedImages.length} images as secondary content.`
        });
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload error",
        description: "There was a problem uploading your files.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      // Clear the input
      event.target.value = '';
    }
  };
  
  // Set an image as primary
  const setPrimaryImageHandler = (image: MediaImage) => {
    setPrimaryImage(image);
    
    // Remove from secondary if it exists there
    if (secondaryImages.some(img => img.id === image.id)) {
      setSecondaryImages(secondaryImages.filter(img => img.id !== image.id));
    }
    
    toast({
      title: "Primary image set",
      description: "Your selected image is now the featured image."
    });
  };
  
  // Add or remove image from secondary images
  const toggleSecondaryImage = (image: MediaImage) => {
    const imageExists = secondaryImages.some(img => img.id === image.id);
    
    if (imageExists) {
      // Remove it
      setSecondaryImages(secondaryImages.filter(img => img.id !== image.id));
      toast({
        title: "Image removed",
        description: "Image removed from secondary content."
      });
    } else {
      // Add it
      setSecondaryImages([...secondaryImages, image]);
      
      // If this image was the primary, remove it from there
      if (primaryImage && primaryImage.id === image.id) {
        setPrimaryImage(null);
        toast({
          title: "Image moved",
          description: "Image moved from primary to secondary content."
        });
      } else {
        toast({
          title: "Image added",
          description: "Image added to secondary content."
        });
      }
    }
  };
  
  // Handle YouTube embed code
  const validateYoutubeEmbed = (embedCode: string) => {
    if (!embedCode) {
      setIsValidYoutubeEmbed(false);
      return;
    }
    
    // Basic validation for iframe with youtube src
    const isValid = embedCode.includes('<iframe') && 
                   (embedCode.includes('youtube.com') || embedCode.includes('youtu.be'));
    
    setIsValidYoutubeEmbed(isValid);
    
    if (!isValid && embedCode.length > 0) {
      toast({
        title: "Invalid YouTube embed",
        description: "Please enter a valid YouTube iframe embed code.",
        variant: "destructive"
      });
    }
  };
  
  // Extract YouTube video ID for preview
  const getYoutubeVideoId = (embedCode: string): string | null => {
    if (!embedCode) return null;
    
    // Try to extract the video ID from the iframe src
    const srcMatch = embedCode.match(/src=["'](https:\/\/(www\.)?youtube\.com\/embed\/|https:\/\/youtu\.be\/)([^"'&?\/]+)/i);
    if (srcMatch && srcMatch[3]) {
      return srcMatch[3];
    }
    
    return null;
  };
  
  // Handle final submission
  const handleSubmit = () => {
    onComplete({
      primaryImage,
      secondaryImages,
      youtubeEmbed
    });
    
    toast({
      title: "Media selection complete",
      description: `Selected ${primaryImage ? '1 primary image' : 'no primary image'} and ${secondaryImages.length} secondary images.`
    });
  };
  
  // Render image card
  const renderImageCard = (image: MediaImage, isPrimary: boolean = false, isSecondary: boolean = false) => {
    return (
      <div 
        key={image.id} 
        className={`
          relative cursor-pointer border-2 rounded-md overflow-hidden
          ${isPrimary ? 'border-blue-500 ring-2 ring-blue-300' : 
            isSecondary ? 'border-green-500' : 'border-gray-100 hover:border-gray-300'}
        `}
      >
        <div className="aspect-square bg-gray-50 overflow-hidden relative">
          <ShopifyImageViewer
            src={image.url}
            alt={image.alt || 'Media image'}
            className="w-full h-full object-cover"
          />
          
          {/* Source badge */}
          <div className="absolute top-2 left-2">
            <span 
              className={`text-xs px-2 py-1 rounded text-white ${
                image.source === 'product' ? 'bg-purple-500' : 
                image.source === 'variant' ? 'bg-indigo-500' : 
                image.source === 'pexels' ? 'bg-green-500' : 
                'bg-blue-500'
              }`}
            >
              {image.source === 'product' ? 'Product' : 
               image.source === 'variant' ? 'Variant' : 
               image.source === 'pexels' ? 'Pexels' : 
               'Shopify'}
            </span>
          </div>
          
          {/* Action buttons */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {!isPrimary && (
              <Button 
                size="sm" 
                variant="secondary"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-8 h-8 p-0 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrimaryImageHandler(image);
                }}
                title="Set as primary image"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant={isSecondary ? "destructive" : "secondary"}
              className={`${isSecondary ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-full w-8 h-8 p-0 flex items-center justify-center`}
              onClick={(e) => {
                e.stopPropagation();
                toggleSecondaryImage(image);
              }}
              title={isSecondary ? "Remove from secondary images" : "Add to secondary images"}
            >
              {isSecondary ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="p-2">
          <p className="text-xs truncate">{image.title || image.alt || 'Image'}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileImage className="h-6 w-6 text-primary" />
            Choose Media
          </CardTitle>
          <CardDescription>
            Select featured and secondary images for your content and add YouTube videos.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="primary" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="primary" className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Primary Image
              </TabsTrigger>
              <TabsTrigger value="secondary" className="flex items-center gap-1">
                <ImagePlus className="h-4 w-4" />
                Secondary Images
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-1">
                <Youtube className="h-4 w-4" />
                YouTube Video
              </TabsTrigger>
            </TabsList>
            
            {/* Primary Image Tab */}
            <TabsContent value="primary">
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Tips for Primary Images</h3>
                  <p className="text-sm text-muted-foreground">
                    The primary image is your featured image. For best results:
                  </p>
                  <ul className="text-sm list-disc pl-5 pt-2 text-muted-foreground space-y-1">
                    <li>Choose emotionally compelling imagery with people or pets</li>
                    <li>Select high-quality, well-lit images that create an emotional connection</li>
                    <li>Landscape orientation works best for featured images</li>
                  </ul>
                </div>
                
                {primaryImage && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Selected Primary Image
                    </h3>
                    <div className="w-full max-w-md mx-auto">
                      <div className="relative">
                        <ShopifyImageViewer
                          src={primaryImage.url}
                          alt={primaryImage.alt || "Primary image"}
                          className="w-full h-auto max-h-[300px] object-contain rounded"
                        />
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setPrimaryImage(null)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                      <p className="text-sm mt-2 text-center">{primaryImage.title || primaryImage.alt || "Primary image"}</p>
                    </div>
                  </div>
                )}
                
                <Accordion type="single" collapsible defaultValue="pexels" className="w-full">
                  <AccordionItem value="pexels">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <ImagePlus className="h-4 w-4" />
                        Search Pexels for Primary Image
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Search for images..." 
                            value={pexelsQuery}
                            onChange={(e) => setPexelsQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                searchPexels(pexelsQuery);
                              }
                            }}
                          />
                          <Button 
                            onClick={() => searchPexels(pexelsQuery)}
                            disabled={isPexelsLoading}
                          >
                            {isPexelsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            Search
                          </Button>
                        </div>
                        
                        {/* Search suggestions */}
                        {pexelsSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {pexelsSuggestions.map((suggestion, index) => (
                              <Badge 
                                key={index}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => {
                                  setPexelsQuery(suggestion);
                                  searchPexels(suggestion);
                                }}
                              >
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Results grid */}
                        {isPexelsLoading ? (
                          <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : pexelsImages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {pexelsImages.map(image => 
                              renderImageCard(
                                image, 
                                primaryImage?.id === image.id,
                                secondaryImages.some(img => img.id === image.id)
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">
                            {pexelsQuery ? 'No images found. Try a different search.' : 'Search for images to display results here.'}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="product-images">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Product Images
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {isProductImagesLoading ? (
                        <div className="flex justify-center items-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : productImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {productImages.map(image => 
                            renderImageCard(
                              image, 
                              primaryImage?.id === image.id,
                              secondaryImages.some(img => img.id === image.id)
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                          {selectedProductId ? 
                            'No product images found. Try selecting a different product.' : 
                            'Please select a product first to view product images.'}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="media-library">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        Shopify Media Library
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <Button 
                          onClick={loadShopifyMediaLibrary}
                          disabled={isShopifyMediaLoading}
                          variant="outline"
                        >
                          {isShopifyMediaLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <FileImage className="h-4 w-4 mr-2" />
                          )}
                          Load Media Library
                        </Button>
                        
                        {isShopifyMediaLoading ? (
                          <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : shopifyMediaImages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {shopifyMediaImages.map(image => 
                              renderImageCard(
                                image, 
                                primaryImage?.id === image.id,
                                secondaryImages.some(img => img.id === image.id)
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">
                            Click "Load Media Library" to view images from your Shopify store.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="upload">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <Label htmlFor="primary-image-upload">Select an image to upload</Label>
                        <Input 
                          id="primary-image-upload" 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isLoading}
                        />
                        <p className="text-sm text-muted-foreground">
                          Supported formats: JPEG, PNG, GIF. Max size: 5MB.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>
            
            {/* Secondary Images Tab */}
            <TabsContent value="secondary">
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">About Secondary Images</h3>
                  <p className="text-sm text-muted-foreground">
                    Secondary images provide additional context and detail for your content:
                  </p>
                  <ul className="text-sm list-disc pl-5 pt-2 text-muted-foreground space-y-1">
                    <li>Include multiple product views or variants</li>
                    <li>Show product details, features, or specifications</li>
                    <li>Demonstrate product usage or benefits</li>
                  </ul>
                </div>
                
                {/* Selected Secondary Images */}
                {secondaryImages.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Selected Secondary Images ({secondaryImages.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {secondaryImages.map(image => (
                        <div key={image.id} className="relative group">
                          <ShopifyImageViewer
                            src={image.url}
                            alt={image.alt || "Secondary image"}
                            className="w-full h-auto rounded border border-green-500"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => toggleSecondaryImage(image)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Secondary Image Selection */}
                <Accordion type="single" collapsible defaultValue="product-images" className="w-full">
                  <AccordionItem value="product-images">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Product Images
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {isProductImagesLoading ? (
                        <div className="flex justify-center items-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : productImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {productImages.map(image => 
                            renderImageCard(
                              image, 
                              primaryImage?.id === image.id,
                              secondaryImages.some(img => img.id === image.id)
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground">
                          {selectedProductId ? 
                            'No product images found. Try selecting a different product.' : 
                            'Please select a product first to view product images.'}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="media-library">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        Shopify Media Library
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <Button 
                          onClick={loadShopifyMediaLibrary}
                          disabled={isShopifyMediaLoading}
                          variant="outline"
                        >
                          {isShopifyMediaLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <FileImage className="h-4 w-4 mr-2" />
                          )}
                          Load Media Library
                        </Button>
                        
                        {isShopifyMediaLoading ? (
                          <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : shopifyMediaImages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {shopifyMediaImages.map(image => 
                              renderImageCard(
                                image, 
                                primaryImage?.id === image.id,
                                secondaryImages.some(img => img.id === image.id)
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">
                            Click "Load Media Library" to view images from your Shopify store.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="pexels">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <ImagePlus className="h-4 w-4" />
                        Search Pexels
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Search for images..." 
                            value={pexelsQuery}
                            onChange={(e) => setPexelsQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                searchPexels(pexelsQuery);
                              }
                            }}
                          />
                          <Button 
                            onClick={() => searchPexels(pexelsQuery)}
                            disabled={isPexelsLoading}
                          >
                            {isPexelsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Search className="h-4 w-4 mr-2" />
                            )}
                            Search
                          </Button>
                        </div>
                        
                        {/* Results grid */}
                        {isPexelsLoading ? (
                          <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : pexelsImages.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {pexelsImages.map(image => 
                              renderImageCard(
                                image, 
                                primaryImage?.id === image.id,
                                secondaryImages.some(img => img.id === image.id)
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">
                            {pexelsQuery ? 'No images found. Try a different search.' : 'Search for images to display results here.'}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="upload">
                    <AccordionTrigger className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Images
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <Label htmlFor="secondary-images-upload">Select images to upload</Label>
                        <Input 
                          id="secondary-images-upload" 
                          type="file" 
                          accept="image/*"
                          multiple
                          onChange={handleFileUpload}
                          disabled={isLoading}
                        />
                        <p className="text-sm text-muted-foreground">
                          You can select multiple images. Supported formats: JPEG, PNG, GIF. Max size: 5MB per image.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </TabsContent>
            
            {/* YouTube Video Tab */}
            <TabsContent value="video">
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Adding YouTube Videos</h3>
                  <p className="text-sm text-muted-foreground">
                    Enhance your content with embedded YouTube videos:
                  </p>
                  <ol className="text-sm list-decimal pl-5 pt-2 text-muted-foreground space-y-1">
                    <li>Go to the YouTube video you want to embed</li>
                    <li>Click Share → Embed</li>
                    <li>Copy the entire iframe code</li>
                    <li>Paste it in the field below</li>
                  </ol>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="youtube-embed">YouTube Embed Code</Label>
                  <Textarea 
                    id="youtube-embed" 
                    placeholder="<iframe src='https://www.youtube.com/embed/...'></iframe>"
                    value={youtubeEmbed || ''}
                    onChange={(e) => {
                      setYoutubeEmbed(e.target.value);
                      validateYoutubeEmbed(e.target.value);
                    }}
                    className="font-mono text-sm"
                    rows={4}
                  />
                  
                  {youtubeEmbed && !isValidYoutubeEmbed && (
                    <div className="flex items-start gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5" />
                      <span>
                        Please enter a valid YouTube embed code. It should be an iframe with a YouTube URL.
                      </span>
                    </div>
                  )}
                  
                  {youtubeEmbed && isValidYoutubeEmbed && (
                    <div className="border rounded p-4">
                      <h3 className="font-semibold mb-2">Video Preview</h3>
                      <div className="aspect-video bg-black/5 rounded overflow-hidden">
                        {getYoutubeVideoId(youtubeEmbed) ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${getYoutubeVideoId(youtubeEmbed)}`}
                            title="YouTube video preview"
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            Loading video preview...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={!primaryImage && secondaryImages.length === 0 && !youtubeEmbed}
          >
            {primaryImage || secondaryImages.length > 0 || youtubeEmbed 
              ? 'Continue with Selected Media' 
              : 'Please Select Media'
            }
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// For TypeScript
const Plus = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);