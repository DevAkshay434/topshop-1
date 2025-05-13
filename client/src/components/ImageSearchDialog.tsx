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
          // Ensure URL is always set from the response
          url: img.url || img.src?.medium || img.src?.original || img.large_url || img.original_url
        }));
        
        console.log('First image:', newImages[0]);
        
        // Track available image sources from the response
        if (response.sourcesUsed && Array.isArray(response.sourcesUsed)) {
          setAvailableSources(response.sourcesUsed);
        }
        
        setSearchedImages(newImages);
        
        // Add to search history
        setImageSearchHistory(prev => [
          ...prev,
          { 
            query: trimmedQuery, 
            images: newImages 
          }
        ]);
        
        toast({
          title: "Images found",
          description: `Found ${newImages.length} images for "${trimmedQuery}"`,
          variant: "default"
        });
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
      <DialogContent className="sm:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px] h-[85vh] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content using keywords. You can select <span className="text-yellow-500 font-medium">Featured</span> images for your article header and <span className="text-blue-500 font-medium">Content</span> images to be embedded within your article.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs for Search vs Selected Images */}
          <Tabs 
            defaultValue="search" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'search' | 'selected')}
            className="w-full"
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
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Image Selection Guide</h4>
                  <p className="text-xs text-blue-700 mb-2">
                    1. Search for relevant images using keywords
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    2. Click images to select them
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    3. Mark images as <span className="text-yellow-600 font-medium">Featured</span> or <span className="text-blue-600 font-medium">Content</span>
                  </p>
                  <p className="text-xs text-blue-700">
                    4. Click "Use Selected Images" when finished
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                      </div>
                      <Input
                        placeholder="Search for product or topic images..."
                        value={imageSearchQuery}
                        onChange={(e) => setImageSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && imageSearchQuery.trim()) {
                            handleImageSearch(imageSearchQuery);
                          }
                        }}
                        className="pl-10 flex-1"
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => handleImageSearch(imageSearchQuery)}
                      disabled={isSearchingImages || !imageSearchQuery.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSearchingImages ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : "Search Images"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                    <span>Try:</span>
                    {['product close-up', 'lifestyle use', 'before & after', 'installation'].map((suggestion, i) => (
                      <Badge 
                        key={i}
                        variant="outline" 
                        className="cursor-pointer hover:bg-blue-50 text-xs"
                        onClick={() => {
                          setImageSearchQuery(suggestion);
                          handleImageSearch(suggestion);
                        }}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Image selection help text */}
                <div className="bg-blue-50 p-3 rounded-md mb-3">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Image Selection Guide</h3>
                  <div className="flex flex-col space-y-2 text-xs text-blue-700">
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1.5"></span>
                      <strong>Featured Image:</strong> Main image shown at the top of your content.
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
                      <strong>Content Images:</strong> Additional images embedded throughout your article.
                    </div>
                  </div>
                </div>
                
                {/* Suggested searches - show when no search has been performed */}
                {!searchedImages.length && !isSearchingImages && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="text-sm font-medium text-blue-800 mb-2">Try these search terms:</div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSearches.map((term, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-blue-100"
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
                
                {/* Search history */}
                {imageSearchHistory.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imageSearchHistory.map((history, index) => (
                      <Badge
                        key={index}
                        variant={history.query === imageSearchQuery ? "default" : "outline"} 
                        className="cursor-pointer"
                        onClick={() => {
                          setImageSearchQuery(history.query);
                          setSearchedImages(history.images);
                        }}
                      >
                        {history.query}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Source filters */}
                {searchedImages.length > 0 && availableSources.length > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Filter by source:</span>
                    <div className="flex gap-2">
                      <Badge 
                        variant={sourceFilter === 'all' ? 'default' : 'outline'} 
                        className="cursor-pointer"
                        onClick={() => setSourceFilter('all')}
                      >
                        All Sources
                      </Badge>
                      
                      {availableSources.includes('pexels') && (
                        <Badge 
                          variant={sourceFilter === 'pexels' ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setSourceFilter('pexels')}
                        >
                          Pexels
                        </Badge>
                      )}
                      
                      {availableSources.includes('pixabay') && (
                        <Badge 
                          variant={sourceFilter === 'pixabay' ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => setSourceFilter('pixabay')}
                        >
                          Pixabay
                        </Badge>
                      )}
                    </div>
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
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(70vh - 230px)", overflowY: "auto" }}>
                {/* Helpful guidance */}
                <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-800 mb-1">How to select images:</h3>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal pl-5">
                    <li><strong>Search</strong> using keywords related to your product</li>
                    <li><strong>Click</strong> on an image to select it</li>
                    <li>Use the <span className="px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded">Featured</span> button for your main image</li>
                    <li>Use the <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded">Content</span> button for additional images</li>
                    <li>When finished, click <strong>Confirm Selection</strong> at the bottom</li>
                  </ol>
                </div>
                
                {searchedImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
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
                            {image.url || image.src?.medium ? (
                              <img 
                                src={
                                  // Try to use the most reliable image URL format
                                  image.src?.medium ? image.src.medium :
                                  image.src?.small ? image.src.small :
                                  image.src?.thumbnail ? image.src.thumbnail :
                                  image.url && image.url.startsWith('http') ? image.url :
                                  image.source === 'pexels' && image.id ? `https://images.pexels.com/photos/${image.id}/pexels-photo-${image.id}.jpeg?auto=compress&cs=tinysrgb&h=350` :
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E"
                                } 
                                alt={image.alt || 'Image'} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  // If image fails to load, try alternate URLs before showing placeholder
                                  if (image.src?.small && e.currentTarget.src !== image.src.small) {
                                    e.currentTarget.src = image.src.small;
                                  } else if (image.src?.thumbnail && e.currentTarget.src !== image.src.thumbnail) {
                                    e.currentTarget.src = image.src.thumbnail;
                                  } else {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23aaaaaa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-red-50">
                                <span className="text-xs text-red-500">Image URL missing</span>
                              </div>
                            )}
                            
                            {/* Status badges at top right */}
                            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
                              {featuredImageId === image.id && (
                                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md shadow-sm flex items-center font-medium">
                                  <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                  </svg>
                                  Featured
                                </span>
                              )}
                              {contentImageIds.includes(image.id) && featuredImageId !== image.id && (
                                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md shadow-sm flex items-center font-medium">
                                  <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                  </svg>
                                  Content
                                </span>
                              )}
                            </div>
                            
                            {image.selected && (
                              <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </div>
                              </div>
                            )}
                            
                            {/* Hover action buttons with labels */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-3 z-30">
                              <div className="flex flex-col items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleImageSelection(image.id);
                                    if (!image.selected) return;
                                    setAsFeaturedImage(image.id);
                                  }}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-md shadow-md flex items-center gap-1.5 mb-1 px-3 transition-transform transform hover:scale-105"
                                  title="Set as Featured Image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                  </svg>
                                  <span className="text-xs font-medium">Featured Image</span>
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleImageSelection(image.id);
                                    if (!image.selected) return;
                                    toggleContentImage(image.id);
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md shadow-md flex items-center gap-1.5 px-3 transition-transform transform hover:scale-105"
                                  title="Toggle Content Image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                  </svg>
                                  <span className="text-xs font-medium">Content Image</span>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Source badge */}
                          <div className="absolute top-2 left-2 z-20">
                            {image.source === 'pexels' && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-md shadow-sm flex items-center font-medium">
                                <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 17.5c-4.136 0-7.5-3.364-7.5-7.5S5.864 2.5 10 2.5s7.5 3.364 7.5 7.5-3.364 7.5-7.5 7.5z"/>
                                  <path d="M6.667 12.917h1.666V7.083H6.667v5.834zm5-5.834v5.834h1.666V7.083h-1.666z"/>
                                </svg>
                                Pexels
                              </span>
                            )}
                            {image.source === 'pixabay' && (
                              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md shadow-sm flex items-center font-medium">
                                <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M5.5 9.511c.076.954.83 1.697 2.182 1.785V12h.6v-.709c1.4-.098 2.218-.846 2.218-1.932 0-.987-.626-1.496-1.745-1.76l-.473-.112V5.57c.6.068.982.396 1.074.85h1.052c-.076-.919-.864-1.638-2.126-1.716V4h-.6v.719c-1.195.117-2.01.836-2.01 1.853 0 .9.606 1.472 1.613 1.707l.397.098v2.034c-.615-.093-1.022-.43-1.114-.9H5.5zm2.177-2.166c-.59-.137-.91-.416-.91-.773 0-.387.317-.7.91-.773v1.546zm.615 2.725c.658.132 1.051.407 1.051.81 0 .414-.332.732-1.051.81v-1.62z"></path>
                                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-18a8 8 0 1 1 0 16 8 8 0 0 1 0-16z"></path>
                                </svg>
                                Pixabay
                              </span>
                            )}
                            {image.isProductImage && (
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-md shadow-sm flex items-center font-medium">
                                <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20 4H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zM4 6h16v2H4V6zm0 12v-8h16.001l.001 8H4z"/>
                                  <path d="M6 14h8v2H6z"/>
                                </svg>
                                Product
                              </span>
                            )}
                          </div>
                          
                          {/* Featured badge */}
                          {featuredImageId === image.id && (
                            <div className="absolute top-2 right-2 z-20">
                              <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-md font-medium flex items-center shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Featured
                              </span>
                            </div>
                          )}
                          
                          {/* Content image badge */}
                          {contentImageIds.includes(image.id) && featuredImageId !== image.id && (
                            <div className="absolute top-2 right-2 z-20">
                              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium flex items-center shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                                Content
                              </span>
                            </div>
                          )}
                          
                          {/* Selection indicator is already added above */}
                          
                          {/* Image actions */}
                          {image.selected && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 flex justify-between gap-1">
                              <Button
                                variant={featuredImageId === image.id ? "default" : "secondary"}
                                size="sm"
                                className={`h-7 text-xs flex-1 ${featuredImageId === image.id ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAsFeaturedImage(image.id);
                                }}
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
                                size="sm"
                                className={`h-7 text-xs flex-1 ${contentImageIds.includes(image.id) ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleContentImage(image.id);
                                }}
                              >
                                {contentImageIds.includes(image.id) ? (
                                  <span className="flex items-center justify-center">
                                    <span className="inline-block w-2 h-2 bg-white rounded-full mr-1"></span>
                                    In Content
                                  </span>
                                ) : "Add to Content"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {isSearchingImages ? (
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Searching for images...</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>Enter keywords above and click Search to find images</p>
                      </div>
                    )}
                  </div>
                )}
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <div>
                        <strong>Featured Image:</strong> 
                        <p className="mt-0.5">Main image shown at the top of your content and in article previews. You should select only one featured image.</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <strong>Content Images:</strong> 
                        <p className="mt-0.5">Additional images that will be embedded throughout your article body. You can select multiple content images.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(70vh - 230px)", overflowY: "auto" }}>
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
                          {image.url || image.src?.medium ? (
                            <img 
                              src={
                                // Try to use the most reliable image URL format in cascading priority
                                image.src?.medium ? image.src.medium :
                                image.url ? image.url :
                                image.large_url ? image.large_url :
                                image.original_url ? image.original_url :
                                image.src?.small ? image.src.small :
                                image.src?.thumbnail ? image.src.thumbnail :
                                image.source === 'pexels' && image.id ? `https://images.pexels.com/photos/${image.id}/pexels-photo-${image.id}.jpeg?auto=compress&cs=tinysrgb&h=350` :
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E"
                              } 
                              alt={image.alt || 'Image'} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                console.log('Selected image failed to load, trying fallbacks:', image.id);
                                // If image fails to load, try alternate URLs before showing placeholder
                                if (image.src?.small && e.currentTarget.src !== image.src.small) {
                                  e.currentTarget.src = image.src.small;
                                } else if (image.url && e.currentTarget.src !== image.url && e.currentTarget.src.indexOf(image.url) === -1) {
                                  e.currentTarget.src = image.url;
                                } else if (image.src?.thumbnail && e.currentTarget.src !== image.src.thumbnail) {
                                  e.currentTarget.src = image.src.thumbnail;
                                } else if (image.source === 'pexels' && image.id) {
                                  // Try a direct Pexels URL as last resort
                                  e.currentTarget.src = `https://images.pexels.com/photos/${image.id}/pexels-photo-${image.id}.jpeg?auto=compress&cs=tinysrgb&h=350`;
                                } else {
                                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23aaaaaa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-red-50">
                              <span className="text-xs text-red-500">Image URL missing</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Order badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <span className={`text-white text-xs px-2 py-1 rounded-md font-medium ${index === 0 ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                            {index === 0 ? 'Featured' : `Image ${index + 1}`}
                          </span>
                        </div>
                        
                        {/* Featured badge */}
                        {featuredImageId === image.id && index !== 0 && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                              Featured
                            </span>
                          </div>
                        )}
                        
                        {/* Hover action buttons */}
                        <div 
                          className="absolute inset-0 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black/75" 
                        >
                          <div className="flex flex-col gap-2 w-4/5">
                            <Button
                              variant={featuredImageId === image.id ? "default" : "secondary"}
                              size="sm"
                              className={`h-8 text-xs ${featuredImageId === image.id ? 'bg-yellow-500 hover:bg-yellow-600 border border-yellow-400' : 'border border-yellow-400'}`}
                              onClick={() => setAsFeaturedImage(image.id)}
                              disabled={featuredImageId === image.id}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {featuredImageId === image.id ? "Featured Image" : "Set as Featured"}
                            </Button>
                            
                            <Button
                              variant={contentImageIds.includes(image.id) && featuredImageId !== image.id ? "default" : "secondary"}
                              size="sm"
                              className={`h-8 text-xs ${contentImageIds.includes(image.id) && featuredImageId !== image.id ? 'bg-blue-500 hover:bg-blue-600 border border-blue-400' : 'border border-blue-400'}`}
                              onClick={() => toggleContentImage(image.id)}
                              disabled={featuredImageId === image.id}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              {contentImageIds.includes(image.id) ? "Content Image" : "Set as Content"}
                            </Button>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs border border-red-500"
                              onClick={() => toggleImageSelection(image.id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Remove Image
                            </Button>
                          </div>
                        </div>
                        
                        {/* Fixed bottom label */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm p-1">
                          {featuredImageId === image.id ? (
                            <span className="text-white text-xs px-2 py-1 bg-yellow-500/90 rounded-sm font-medium">
                              Featured Image
                            </span>
                          ) : contentImageIds.includes(image.id) ? (
                            <span className="text-white text-xs px-2 py-1 bg-blue-500/90 rounded-sm font-medium">
                              Content Image
                            </span>
                          ) : (
                            <span className="text-white text-xs px-2 py-1 font-medium">
                              Selected Image
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No images selected yet</p>
                      <Button 
                        variant="outline" 
                        className="mt-3" 
                        size="sm"
                        onClick={() => setActiveTab('search')}
                      >
                        Go to Search
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter className="border-t p-4">
          <div className="w-full flex justify-between items-center gap-3">
            <div className="flex items-center space-x-2">
              {featuredImageId && (
                <div className="flex items-center bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Featured image selected
                </div>
              )}
              {contentImageIds.length > 0 && (
                <div className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {contentImageIds.length} content image{contentImageIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={confirmImageSelection}
                disabled={selectedImages.length === 0}
                className={selectedImages.length > 0 ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {selectedImages.length === 0 ? (
                  "Select Images"
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Selection ({selectedImages.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}