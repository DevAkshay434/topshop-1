import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Plus, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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
  const { toast } = useToast();

  // Reset selected images when initialSelectedImages changes
  useEffect(() => {
    if (initialSelectedImages && open) {
      setSelectedImages(initialSelectedImages);
      
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
  }, [initialSelectedImages, open]);

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
    // Pass selected images back to parent component
    onImagesSelected(selectedImages);
    onOpenChange(false);
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
      <DialogContent className="sm:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content using keywords. Choose from multiple sources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search bar and controls */}
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
            
            {/* Selected images count */}
            {selectedImages.length > 0 && (
              <div className="bg-green-50 px-3 py-2 rounded-md text-sm">
                <span className="font-medium text-green-800">
                  {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            )}
          </div>
          
          {/* Image grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchedImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                      `}
                      onClick={() => toggleImageSelection(image.id)}
                    >
                      <div className="aspect-[4/3] bg-slate-100">
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
                      
                      {/* Selection indicator */}
                      {image.selected && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="bg-blue-500 text-white p-2 rounded-full">
                            <CheckCircle size={20} />
                          </div>
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