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
}

export default function ImageSearchDialog({
  open,
  onOpenChange,
  onImagesSelected,
  initialSelectedImages = [],
  selectedKeywords = []
}: ImageSearchDialogProps) {
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>(initialSelectedImages || []);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchHistory, setImageSearchHistory] = useState<SearchHistory[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pexels' | 'pixabay' | 'product'>('all');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'selected'>('search');
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(null);
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
    if (open && imageSearchHistory.length === 0 && !searchedImages.length) {
      // Find the main keyword if available
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
      const response = await apiRequest({
        url: '/api/admin/generate-images',
        method: 'POST',
        data: {
          query: trimmedQuery,
          count: 20, // Request more images for better selection
          source: sourceFilter !== 'all' ? sourceFilter : undefined
        }
      });
      
      if (response.success && response.images && response.images.length > 0) {
        // Mark images as selected if they're already in selectedImages
        const newImages = response.images.map((img: any) => ({
          ...img,
          selected: selectedImages.some(selected => selected.id === img.id)
        }));
        
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
    // Get the current selection state
    const currentImage = searchedImages.find(img => img.id === imageId);
    const newSelectedState = !(currentImage?.selected || false);
    
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
        setSelectedImages(prev => [...prev, { ...imageToAdd, selected: true }]);
      }
    } else {
      // Remove from selected images
      setSelectedImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  // Handle image selection confirmation
  const confirmImageSelection = () => {
    // Make sure featured image is first in the array
    let orderedImages = [...selectedImages];
    
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
    
    // Pass selected images back to parent component with featured image first
    onImagesSelected(orderedImages);
    onOpenChange(false);
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
      <DialogContent className="sm:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px] h-[85vh] max-h-screen flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content using keywords. Choose from multiple sources.
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
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter keywords to search for images..."
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && imageSearchQuery.trim()) {
                        handleImageSearch(imageSearchQuery);
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={() => handleImageSearch(imageSearchQuery)}
                    disabled={isSearchingImages || !imageSearchQuery.trim()}
                  >
                    {isSearchingImages ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : "Search"}
                  </Button>
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
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(70vh - 150px)" }}>
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
                            relative rounded-lg overflow-hidden border-2 shadow cursor-pointer
                            ${image.selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}
                            ${image.isProductImage ? 'border-green-500' : ''}
                            ${featuredImageId === image.id ? 'ring-4 ring-yellow-400' : ''}
                          `}
                        >
                          <div className="aspect-[4/3] bg-slate-100" onClick={() => toggleImageSelection(image.id)}>
                            <img 
                              src={image.src?.medium || image.url} 
                              alt={image.alt || 'Image'} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          
                          {/* Source badge */}
                          <div className="absolute top-2 left-2 z-10">
                            {image.source === 'pexels' && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-md">
                                Pexels
                              </span>
                            )}
                            {image.source === 'pixabay' && (
                              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md">
                                Pixabay
                              </span>
                            )}
                            {image.isProductImage && (
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-md">
                                Product
                              </span>
                            )}
                          </div>
                          
                          {/* Featured badge */}
                          {featuredImageId === image.id && (
                            <div className="absolute top-2 right-2 z-10">
                              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                                Featured
                              </span>
                            </div>
                          )}
                          
                          {/* Selection indicator */}
                          {image.selected && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <div className="bg-blue-500 text-white p-2 rounded-full">
                                <CheckCircle size={20} />
                              </div>
                            </div>
                          )}
                          
                          {/* Featured button */}
                          {image.selected && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 flex justify-center">
                              <Button
                                variant={featuredImageId === image.id ? "default" : "secondary"}
                                size="sm"
                                className="h-7 text-xs w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAsFeaturedImage(image.id);
                                }}
                              >
                                {featuredImageId === image.id ? "Featured" : "Set as Featured"}
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
                <div className="bg-blue-50 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Selected Images</h3>
                  <p className="text-xs text-blue-700">
                    The first image will be used as the featured image for your content.
                    Click "Set as Featured" to choose which image appears first.
                  </p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(70vh - 150px)" }}>
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
                            src={image.src?.medium || image.url} 
                            alt={image.alt || 'Image'} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
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
                        
                        {/* Action buttons */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 flex justify-between gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => toggleImageSelection(image.id)}
                          >
                            Remove
                          </Button>
                          
                          <Button
                            variant={featuredImageId === image.id ? "default" : "secondary"}
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => setAsFeaturedImage(image.id)}
                            disabled={featuredImageId === image.id}
                          >
                            {featuredImageId === image.id ? "Featured" : "Set as Featured"}
                          </Button>
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
        
        <DialogFooter>
          <div className="flex gap-2 ml-auto">
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
            >
              Use {selectedImages.length} Selected Image{selectedImages.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}