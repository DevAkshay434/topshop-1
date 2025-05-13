import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Plus, Search, ImageIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PexelsImage {
  id: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
  src?: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
  photographer?: string;
  photographer_url?: string;
  selected?: boolean;
  isProductImage?: boolean;
  productId?: string;
  source?: 'pexels' | 'pixabay' | 'product';
  isFeatured?: boolean;
  isContentImage?: boolean;
  large_url?: string;
  original_url?: string;
}

interface SearchHistory {
  query: string;
  images: PexelsImage[];
}

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesSelected: (images: PexelsImage[]) => void;
  initialSelectedImages?: PexelsImage[];
  selectedKeywords?: Array<{
    keyword: string;
    isMainKeyword?: boolean;
  }>;
  searchKeyword?: string;
}

export default function ImageSearchDialog({
  open,
  onOpenChange,
  onImagesSelected,
  initialSelectedImages = [],
  selectedKeywords = [],
  searchKeyword = ''
}: ImageSearchDialogProps) {
  const [imageSearchQuery, setImageSearchQuery] = useState<string>(searchKeyword || '');
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>(initialSelectedImages || []);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchHistory, setImageSearchHistory] = useState<SearchHistory[]>([]);
  const [hasInitialSearchRun, setHasInitialSearchRun] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pexels' | 'pixabay' | 'product'>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'selected'>('search');
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(null);
  const [contentImageIds, setContentImageIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Reset selected images when initialSelectedImages changes
  useEffect(() => {
    if (initialSelectedImages && open) {
      setSelectedImages(initialSelectedImages);
      
      // Set the first image as featured if none is set and we have selected images
      if (initialSelectedImages.length > 0 && !featuredImageId) {
        setFeaturedImageId(initialSelectedImages[0].id);
      }
      
      // If initialSelectedImages is provided, update the selected state in searchedImages
      if (searchedImages.length > 0) {
        setSearchedImages(prev =>
          prev.map(img => ({
            ...img,
            selected: initialSelectedImages.some(selected => selected.id === img.id)
          }))
        );
      }
    }
  }, [initialSelectedImages, open, featuredImageId]);

  // Pre-populate with main keyword if available and auto-search with it
  useEffect(() => {
    if (open && !hasInitialSearchRun && imageSearchHistory.length === 0 && !searchedImages.length) {
      // Set the flag to prevent repeated searches
      setHasInitialSearchRun(true);
      
      // If searchKeyword is provided, use it first
      if (searchKeyword && searchKeyword.trim() !== '') {
        console.log(`Pre-populated and searching with provided keyword: ${searchKeyword}`);
        handleImageSearch(searchKeyword);
        return;
      }
      
      // Otherwise, find the main keyword if available
      const mainKeyword = selectedKeywords.find(kw => kw.isMainKeyword);
      
      if (mainKeyword) {
        // Pre-populate the search box with the main keyword
        setImageSearchQuery(mainKeyword.keyword);
        
        // Auto-search with the main keyword when dialog opens
        console.log(`Pre-populated and searching with main keyword: ${mainKeyword.keyword}`);
        handleImageSearch(mainKeyword.keyword);
      } else {
        // If no main keyword, just leave empty
        setImageSearchQuery('');
      }
    }
  }, [open, imageSearchHistory.length, searchedImages.length, selectedKeywords]);

  // Handle image search using API
  const handleImageSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search term to find images",
        variant: "destructive"
      });
      return;
    }
    
    // Check if we already have this search in history
    const existingSearch = imageSearchHistory.find(hist => hist.query === trimmedQuery);
    if (existingSearch) {
      setSearchedImages(existingSearch.images);
      setImageSearchQuery(trimmedQuery);
      return;
    }
    
    setIsSearchingImages(true);
    
    try {
      console.log('Searching for images with query:', trimmedQuery);
      const response = await apiRequest({
        url: '/api/admin/generate-images',
        method: 'POST',
        data: {
          query: trimmedQuery,
          count: 20, // Request more images for better selection
          source: sourceFilter !== 'all' ? sourceFilter : undefined
        }
      });
      
      console.log('API response:', response);
      
      if (response.success && response.images && response.images.length > 0) {
        console.log(`Found ${response.images.length} images`);
        
        // Mark images as selected if they're already in selectedImages
        const newImages = response.images.map((img: any) => ({
          ...img,
          selected: selectedImages.some(selected => selected.id === img.id),
          // Ensure URL is always set from the response with multiple fallbacks
          url: img.url || 
               img.src?.medium || 
               img.src?.original || 
               img.large_url || 
               img.original_url || 
               (img.source === 'pexels' && img.id 
                 ? `https://images.pexels.com/photos/${img.id}/pexels-photo-${img.id}.jpeg?auto=compress&cs=tinysrgb&h=350` 
                 : null)
        }));
        
        // Filter out images without valid URLs to prevent rendering issues
        const validImages = newImages.filter((img: PexelsImage) => img.url);
        
        console.log('Valid images count:', validImages.length);
        console.log('First image:', validImages.length > 0 ? validImages[0] : 'No valid images');
        
        // Track available image sources from the response
        if (response.sourcesUsed && Array.isArray(response.sourcesUsed)) {
          setAvailableSources(response.sourcesUsed);
        }
        
        setSearchedImages(validImages);
        
        // Add to search history
        setImageSearchHistory(prev => [
          ...prev,
          { 
            query: trimmedQuery, 
            images: validImages 
          }
        ]);
        
        if (validImages.length > 0) {
          toast({
            title: "Images found",
            description: `Found ${validImages.length} images for "${trimmedQuery}"`,
            variant: "default"
          });
        } else {
          toast({
            title: "Image loading issues",
            description: "Found images but couldn't load them properly. Try another search term.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "No images found",
          description: "Try a different search term",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Image search error:", error);
      toast({
        title: "Error searching images",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSearchingImages(false);
    }
  };
  
  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    console.log("Toggle selection called for image ID:", imageId);
    console.log("Current searchedImages length:", searchedImages.length);
    console.log("Current selectedImages:", selectedImages.map(img => img.id).join(', '));
    
    // Get the current selection state
    const currentImage = searchedImages.find(img => img.id === imageId);
    if (!currentImage) {
      console.error("Could not find image with ID:", imageId, "in searchedImages.");
      // Try to find in history
      const inHistory = imageSearchHistory.some(history => 
        history.images.some(img => img.id === imageId)
      );
      console.log("Image found in history:", inHistory);
      return;
    }
    
    const newSelectedState = !(currentImage.selected || false);
    console.log(`Toggling image ${imageId} to selected=${newSelectedState}`);
    console.log("Current image details:", currentImage);
    
    // Update in current search results
    setSearchedImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, selected: newSelectedState } 
          : img
      )
    );
    
    // Update in search history
    setImageSearchHistory(prev => 
      prev.map(history => ({
        ...history,
        images: history.images.map(img => 
          img.id === imageId 
            ? { ...img, selected: newSelectedState } 
            : img
        )
      }))
    );
    
    // Update selected images list
    if (newSelectedState) {
      // Add to selected images if not already there
      const imageToAdd = searchedImages.find(img => img.id === imageId);
      if (imageToAdd && !selectedImages.some(img => img.id === imageId)) {
        console.log("Adding image to selected images:", imageToAdd);
        setSelectedImages(prev => [...prev, { ...imageToAdd, selected: true }]);
        
        // Show toast when selecting an image
        toast({
          title: "Image Selected",
          description: "Click 'Set as Featured' to make it the main image",
          variant: "default"
        });
      }
    } else {
      // Remove from selected images
      console.log("Removing image from selected images:", imageId);
      setSelectedImages(prev => prev.filter(img => img.id !== imageId));
      
      // If this was the featured image, remove that too
      if (featuredImageId === imageId) {
        setFeaturedImageId(null);
      }
      
      // Remove from content images too if needed
      if (contentImageIds.includes(imageId)) {
        setContentImageIds(prev => prev.filter(id => id !== imageId));
      }
    }
  };

  // Handle image selection confirmation
  const confirmImageSelection = () => {
    console.log("Confirming image selection. Selected images:", selectedImages);
    
    // Make sure featured image is first in the array
    let orderedImages = [...selectedImages].map(img => ({
      ...img,
      isFeatured: img.id === featuredImageId,
      isContentImage: contentImageIds.includes(img.id)
    }));
    
    console.log("Featured image ID:", featuredImageId);
    console.log("Content image IDs:", contentImageIds);
    
    if (featuredImageId && orderedImages.length > 0) {
      // Remove featured image from array if it exists
      const featuredImageIndex = orderedImages.findIndex(img => img.id === featuredImageId);
      
      if (featuredImageIndex >= 0) {
        const featuredImage = orderedImages[featuredImageIndex];
        // Remove from current position
        orderedImages.splice(featuredImageIndex, 1);
        // Add to beginning of array
        orderedImages.unshift(featuredImage);
      }
    }
    
    console.log("Ordered images to return:", orderedImages);
    
    // Pass selected images back to parent component with featured image first
    onImagesSelected(orderedImages);
    onOpenChange(false);
    
    // Show toast confirmation
    toast({
      title: "Images Selected",
      description: `You've selected ${orderedImages.length} images for your content`,
    });
  };
  
  // Set an image as featured
  const setAsFeaturedImage = (imageId: string) => {
    // Check if image is selected
    const isSelected = selectedImages.some(img => img.id === imageId);
    
    if (!isSelected) {
      // Auto-select the image if it's not already selected
      toggleImageSelection(imageId);
    }
    
    // Set as featured image
    setFeaturedImageId(imageId);
    
    toast({
      title: "Featured image set",
      description: "This will be the main image for your content",
      variant: "default"
    });
  };
  
  // Toggle image as content image (for product linking)
  const toggleContentImage = (imageId: string) => {
    // Make sure image is selected first
    const isSelected = selectedImages.some(img => img.id === imageId);
    if (!isSelected) {
      toggleImageSelection(imageId);
    }
    
    // Toggle content image status
    setContentImageIds(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
    
    toast({
      title: contentImageIds.includes(imageId) ? "Removed from content" : "Added to content",
      description: contentImageIds.includes(imageId) 
        ? "This image will no longer be linked with products in the content" 
        : "This image will be linked with selected products in the content",
      variant: "default"
    });
  };
  
  // Function used by the "Set as Content" button
  const setAsContentImage = (imageId: string) => {
    // Simply delegate to the toggle function
    toggleContentImage(imageId);
  };
  
  // Suggestion options for the search field
  const suggestedSearches = [
    "happy family lifestyle",
    "smiling person in kitchen",
    "children playing at home",
    "relaxed family moments",
    "healthy lifestyle choices",
    "satisfied customer portrait"
  ];

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          // Clear search query when dialog closes
          setImageSearchQuery('');
        }
        onOpenChange(open);
      }}>
      <DialogContent className="sm:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px] h-[85vh] max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content using keywords. You can select <span className="text-yellow-500 font-medium">Featured</span> images for your article header and <span className="text-blue-500 font-medium">Content</span> images to be embedded within your article.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs 
            defaultValue="search" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'search' | 'selected')}
            className="w-full flex flex-col flex-1"
          >
            <div className="border-b px-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="search" className="rounded-b-none">
                  <Search className="mr-2 h-4 w-4" /> Search Images
                </TabsTrigger>
                <TabsTrigger value="selected" className="rounded-b-none">
                  <ImageIcon className="mr-2 h-4 w-4" /> Selected Images 
                  {selectedImages.length > 0 && (
                    <span className="ml-1.5 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {selectedImages.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Search Tab */}
            <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Image Selection Guide</h4>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                      <li>Search for relevant images using keywords</li>
                      <li>Click images to select them</li>
                      <li>Choose Featured and Content images</li>
                      <li>Select at least one featured image for your article</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">Image Types</h4>
                    <ul className="text-xs text-yellow-700 space-y-1 list-disc pl-4">
                      <li><strong>Featured Image:</strong> Main image for your article (required)</li>
                      <li><strong>Content Images:</strong> Additional images to use in your content</li>
                      <li>You can select multiple images</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <Input
                        value={imageSearchQuery}
                        onChange={(e) => setImageSearchQuery(e.target.value)}
                        placeholder="Search for images..."
                        className="pl-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleImageSearch(imageSearchQuery);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={() => handleImageSearch(imageSearchQuery)}
                      disabled={isSearchingImages || !imageSearchQuery.trim()}
                      className={`whitespace-nowrap ${isSearchingImages ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {isSearchingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        "Search Images"
                      )}
                    </Button>
                  </div>
                  
                  {/* Source filters if we have multiple sources */}
                  {availableSources.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-500">Filter sources:</span>
                      <Button
                        variant={sourceFilter === 'all' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSourceFilter('all')}
                        className="h-8"
                      >
                        All Sources
                      </Button>
                      {availableSources.includes('pexels') && (
                        <Button
                          variant={sourceFilter === 'pexels' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSourceFilter('pexels')}
                          className="h-8"
                        >
                          Pexels
                        </Button>
                      )}
                      {availableSources.includes('pixabay') && (
                        <Button
                          variant={sourceFilter === 'pixabay' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSourceFilter('pixabay')}
                          className="h-8"
                        >
                          Pixabay
                        </Button>
                      )}
                      {availableSources.includes('product') && (
                        <Button
                          variant={sourceFilter === 'product' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSourceFilter('product')}
                          className="h-8"
                        >
                          Product Images
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Suggestions if no search yet */}
                {!searchedImages.length && !isSearchingImages && (
                  <div className="border border-blue-100 bg-blue-50/50 rounded-md p-3">
                    <p className="text-sm font-medium text-blue-800 mb-1">Try searching for:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSearches.map((term, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-white hover:bg-blue-50 cursor-pointer border-blue-200"
                          onClick={() => {
                            setImageSearchQuery(term);
                            handleImageSearch(term);
                          }}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recent searches */}
                {imageSearchHistory.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-blue-800 mb-2">Recent searches:</div>
                    <div className="flex flex-wrap gap-2">
                      {imageSearchHistory.map((history, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-white hover:bg-blue-50 cursor-pointer border-blue-200 flex items-center"
                          onClick={() => {
                            setImageSearchQuery(history.query);
                            setSearchedImages(history.images);
                          }}
                        >
                          {history.query}
                          <span className="ml-1 text-xs text-gray-500">({history.images.length})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Selected images counter */}
                {selectedImages.length > 0 && (
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-blue-50 border-blue-200">
                      <div className="flex gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500" /> 
                        <span>{selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected</span>
                      </div>
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveTab('selected')}
                    >
                      View selected
                    </Button>
                  </div>
                )}
                
                {/* Selected images info */}
                {selectedImages.length > 0 && (
                  <div className="bg-green-50 px-3 py-2 rounded-md text-sm flex justify-between items-center">
                    <span className="font-medium text-green-800">
                      {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('selected')}
                      className="text-green-800 hover:text-green-900 hover:bg-green-100 p-1 h-auto"
                    >
                      View Selected
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Search results grid - with improved scrolling */}
              <div className="flex-1 overflow-y-auto">
                {/* Helpful guidance */}
                <div className="sticky top-0 z-10 pt-4 pb-2 px-4 bg-white">
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-800 mb-1">How to select images:</h3>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal pl-5">
                      <li><strong>Search</strong> using keywords related to your product</li>
                      <li><strong>Click</strong> on an image to select it</li>
                      <li>Use the <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">Featured</span> button for your main image</li>
                      <li>Use the <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded">Content</span> button for additional images</li>
                      <li>When finished, click <strong>Confirm Selection</strong> at the bottom</li>
                    </ol>
                  </div>
                </div>
                
                <div className="px-4 pb-4">
                  {searchedImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {searchedImages
                      .filter(image => {
                        // Apply source filtering
                        if (sourceFilter === 'all') return true;
                        if (sourceFilter === 'pexels') return image.source === 'pexels';
                        if (sourceFilter === 'pixabay') return image.source === 'pixabay';
                        if (sourceFilter === 'product') return image.isProductImage;
                        return true;
                      })
                      .map(image => (
                        <div 
                          key={image.id}
                          className={`
                            relative rounded-lg overflow-hidden border-2 shadow-md cursor-pointer group transition-all hover:scale-105 hover:shadow-lg
                            ${image.selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-300'}
                            ${image.isProductImage ? 'border-green-500' : ''}
                            ${featuredImageId === image.id ? 'ring-4 ring-yellow-400 border-yellow-500 shadow-yellow-100' : ''}
                            ${contentImageIds.includes(image.id) && featuredImageId !== image.id ? 'border-blue-500 ring-2 ring-blue-300 shadow-blue-100' : ''}
                          `}
                        >
                          <div className="aspect-[4/3] bg-slate-100 relative" onClick={() => toggleImageSelection(image.id)}>
                            {/* Use direct proxy URL to ensure images load */}
                            <img 
                              src={`/api/proxy/image/${image.id}`}
                              alt={image.alt || 'Product image'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to placeholder if direct proxy fails
                                const target = e.target as HTMLImageElement;
                                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='gray' stroke-width='2'%3E%3Crect width='20' height='20' x='2' y='2' rx='2'/%3E%3Cpath d='m4 14 4-4 6 6'/%3E%3Cpath d='m14 10 2-2 4 4'/%3E%3Ccircle cx='8' cy='8' r='2'/%3E%3C/svg%3E";
                              }}
                              loading="lazy"
                            />
                            
                            {/* Status badges at top right */}
                            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
                              {featuredImageId === image.id && (
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 border-yellow-600">
                                  Featured
                                </Badge>
                              )}
                              {contentImageIds.includes(image.id) && featuredImageId !== image.id && (
                                <Badge className="bg-blue-500 hover:bg-blue-600 border-blue-600">
                                  Content
                                </Badge>
                              )}
                            </div>
                            
                            {/* Selection indicator */}
                            <div className={`absolute inset-0 bg-black/10 flex items-center justify-center transition-opacity ${image.selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                              {image.selected ? (
                                <div className="bg-white text-blue-600 rounded-full p-1">
                                  <CheckCircle className="h-5 w-5" />
                                </div>
                              ) : (
                                <div className="bg-white text-blue-600 rounded-full p-1 opacity-0 group-hover:opacity-100">
                                  <Plus className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Image actions */}
                          <div className="flex p-1 bg-gradient-to-b from-gray-50 to-gray-100">
                            <Button 
                              className="flex-1 text-xs h-7 rounded-sm"
                              variant={featuredImageId === image.id ? "default" : "secondary"}
                              size="sm"
                              onClick={() => setAsFeaturedImage(image.id)}
                            >
                              {featuredImageId === image.id ? (
                                <span className="flex items-center justify-center">
                                  <span className="inline-block w-2 h-2 bg-white rounded-full mr-1"></span>
                                  Featured
                                </span>
                              ) : "Set Featured"}
                            </Button>
                            <Button
                              variant={contentImageIds.includes(image.id) ? "default" : "secondary"}
                              className={`ml-1 flex-1 text-xs h-7 rounded-sm ${contentImageIds.includes(image.id) ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                              size="sm"
                              onClick={() => setAsContentImage(image.id)}
                            >
                              {contentImageIds.includes(image.id) ? (
                                <span className="flex items-center justify-center">
                                  <span className="inline-block w-2 h-2 bg-white rounded-full mr-1"></span>
                                  Content
                                </span>
                              ) : "Set Content"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    isSearchingImages ? (
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Searching for images...</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>Enter keywords above and click Search to find images</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* Selected Images Tab */}
            <TabsContent value="selected" className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Image Types</h3>
                  <div className="flex flex-col space-y-3 text-xs text-blue-700">
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-2">
                        <Badge className="bg-yellow-500 border-yellow-600">Featured</Badge>
                      </div>
                      <div>
                        <p className="font-medium">Featured Image</p>
                        <p>The main image used at the top of your article. This should be eye-catching and relevant to your topic.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-2">
                        <Badge className="bg-blue-500 border-blue-600">Content</Badge>
                      </div>
                      <div>
                        <p className="font-medium">Content Image</p>
                        <p>Additional images that will be placed throughout your article content. These should support your text and showcase products.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {selectedImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedImages.map((image, index) => (
                      <div 
                        key={image.id}
                        className={`
                          relative rounded-lg overflow-hidden border-2 shadow
                          ${featuredImageId === image.id ? 'ring-4 ring-yellow-400 border-yellow-500' : 'border-blue-500'}
                        `}
                      >
                        <div className="aspect-[4/3] bg-slate-100">
                          <img 
                            src={`/api/proxy/image/${image.id}`} 
                            alt={image.alt || 'Selected image'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to placeholder if direct proxy fails
                              const target = e.target as HTMLImageElement;
                              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='gray' stroke-width='2'%3E%3Crect width='20' height='20' x='2' y='2' rx='2'/%3E%3Cpath d='m4 14 4-4 6 6'/%3E%3Cpath d='m14 10 2-2 4 4'/%3E%3Ccircle cx='8' cy='8' r='2'/%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        
                        {/* Remove badge */}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 bg-white bg-opacity-90 hover:bg-opacity-100 text-red-500 hover:text-red-600 border border-red-200"
                          onClick={() => toggleImageSelection(image.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        
                        {/* Image type badge */}
                        <div className="absolute top-2 left-2">
                          {featuredImageId === image.id ? (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 border-yellow-600">Featured</Badge>
                          ) : contentImageIds.includes(image.id) ? (
                            <Badge className="bg-blue-500 hover:bg-blue-600 border-blue-600">Content</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-white/90">Regular</Badge>
                          )}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex p-1 bg-gradient-to-b from-gray-50 to-gray-100">
                          <Button 
                            className="flex-1 text-xs h-7 rounded-sm"
                            variant={featuredImageId === image.id ? "default" : "secondary"}
                            size="sm"
                            onClick={() => setAsFeaturedImage(image.id)}
                          >
                            {featuredImageId === image.id ? "Featured ✓" : "Set Featured"}
                          </Button>
                          <Button
                            variant={contentImageIds.includes(image.id) ? "default" : "secondary"}
                            className={`ml-1 flex-1 text-xs h-7 rounded-sm ${contentImageIds.includes(image.id) ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                            size="sm"
                            onClick={() => setAsContentImage(image.id)}
                          >
                            {contentImageIds.includes(image.id) ? "Content ✓" : "Set Content"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg mb-2">No images selected yet</p>
                    <p className="text-sm mb-4">Go to the search tab to find and select images for your content</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('search')}
                    >
                      Go to Search
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="p-4 border-t">
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {selectedImages.length > 0 ? 
                `${selectedImages.length} image${selectedImages.length !== 1 ? 's' : ''} selected` : 
                "No images selected"
              }
              {featuredImageId && " (including 1 featured)"}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmImageSelection}
                disabled={selectedImages.length === 0}
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}