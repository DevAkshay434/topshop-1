import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import ImageSearchSuggestions from './ImageSearchSuggestions';
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
}

interface SearchHistory {
  query: string;
  images: PexelsImage[];
}

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesSelected: (images: PexelsImage[]) => void;
  productTitle?: string;
  initialSelectedImages?: PexelsImage[];
}

export default function ImageSearchDialog({
  open,
  onOpenChange,
  onImagesSelected,
  productTitle,
  initialSelectedImages = []
}: ImageSearchDialogProps) {
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>(initialSelectedImages || []);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchHistory, setImageSearchHistory] = useState<SearchHistory[]>([]);
  const { toast } = useToast();

  // Reset selected images when initialSelectedImages changes
  useEffect(() => {
    if (initialSelectedImages) {
      setSelectedImages(initialSelectedImages);
    }
  }, [initialSelectedImages]);

  // Just open the dialog without auto-populating or auto-searching
  useEffect(() => {
    // No longer auto-populate or search based on title
    if (open && imageSearchHistory.length === 0 && !searchedImages.length) {
      // Just display empty search - user must enter their own query
      setImageSearchQuery('');
    }
  }, [open, imageSearchHistory.length, searchedImages.length]);

  // Handle image search using Pexels API
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
          count: 10 // Request 10 images to choose from
        }
      });
      
      if (response.success && response.images && response.images.length > 0) {
        // Mark images as selected if they're already in selectedImages
        const newImages = response.images.map((img: any) => ({
          ...img,
          selected: selectedImages.some(selected => selected.id === img.id)
        }));
        
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
      <DialogContent className="sm:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content. You can perform multiple searches and select images from each.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 overflow-hidden flex-grow flex flex-col">
          <div className="w-full">
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1">
                <Input
                  placeholder="Search for images"
                  value={imageSearchQuery || ''}
                  onChange={(e) => {
                    setImageSearchQuery(e.target.value);
                    setShowSearchSuggestions(e.target.value.length >= 2);
                  }}
                  onFocus={() => setShowSearchSuggestions(imageSearchQuery?.length >= 2)}
                  // Keep suggestions visible for longer to allow clicking
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 300)}
                  className="flex-1"
                />
                <ImageSearchSuggestions 
                  query={imageSearchQuery} 
                  visible={showSearchSuggestions}
                  productTitle={productTitle}
                  onSuggestionSelect={(suggestion) => {
                    setImageSearchQuery(suggestion);
                    setShowSearchSuggestions(false);
                    handleImageSearch(suggestion);
                  }}
                />
              </div>
              <Button 
                type="button" 
                onClick={() => {
                  // Use the explicit search query, never fall back to the title
                  const query = imageSearchQuery.trim();
                  if (!query) {
                    toast({
                      title: "Search query required",
                      description: "Please enter a search term for images",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  handleImageSearch(query);
                  
                  // Store current images in history if there are any
                  if (searchedImages.length > 0) {
                    const currentSearch = imageSearchHistory.find(history => 
                      history.query === imageSearchQuery);
                    
                    if (!currentSearch) {
                      setImageSearchHistory(prev => [
                        ...prev,
                        { 
                          query: imageSearchQuery, 
                          images: searchedImages 
                        }
                      ]);
                    }
                  }
                }}
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
          </div>
          
          {/* Search history tabs */}
          {imageSearchHistory.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge 
                variant={!imageSearchHistory.some(h => h.query === imageSearchQuery) ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => {
                  setSearchedImages([]);
                  setImageSearchQuery("");
                }}
              >
                New Search
              </Badge>
              
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
          
          {searchedImages.length > 0 ? (
            <div className="border rounded-lg overflow-hidden shadow-sm bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[500px] overflow-y-auto p-6">
                {searchedImages.map(image => (
                  <div 
                    key={image.id}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 shadow hover:shadow-lg ${
                      image.selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-slate-300'
                    }`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <div className="aspect-[4/3] relative bg-slate-100">
                      <img 
                        src={image.src?.medium || image.url} 
                        alt={image.alt || 'Content image'} 
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {image.alt && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                          {image.alt}
                        </div>
                      )}
                    </div>
                    {image.selected && (
                      <div className="absolute top-3 right-3 bg-blue-500 rounded-full p-1.5 shadow-md">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border rounded-md bg-slate-50/50 my-4">
              {isSearchingImages ? 
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin mb-2 text-blue-500" />
                  <p>Searching for images...</p>
                </div> 
                : 
                <p>Search for images to display results</p>
              }
            </div>
          )}
          
          {/* Selection summary */}
          {Array.isArray(selectedImages) && selectedImages.length > 0 && (
            <div className="mt-4 p-4 border rounded-md bg-slate-50/80 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
                  Selected Images: {selectedImages.length}
                </p>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    // Clear all selections
                    setSelectedImages([]);
                    setSearchedImages(prev => prev.map(img => ({ ...img, selected: false })));
                    setImageSearchHistory(prev => prev.map(history => ({
                      ...history,
                      images: history.images.map(img => ({ ...img, selected: false }))
                    })));
                  }}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {selectedImages.map(image => (
                  <div 
                    key={image.id} 
                    className="relative h-28 rounded-md overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <img 
                      src={image.src?.small || image.src?.thumbnail || image.url} 
                      alt="Selected" 
                      className="h-full w-full object-cover"
                    />
                    <div 
                      className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5 cursor-pointer shadow-md hover:bg-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Remove from selected images
                        setSelectedImages(prev => 
                          prev.filter(img => img.id !== image.id)
                        );
                        // Also unselect in current search results if present
                        setSearchedImages(prev => 
                          prev.map(img => 
                            img.id === image.id 
                              ? { ...img, selected: false } 
                              : img
                          )
                        );
                        // Update in search history as well
                        setImageSearchHistory(prev => 
                          prev.map(history => ({
                            ...history,
                            images: history.images.map(img => 
                              img.id === image.id 
                                ? { ...img, selected: false } 
                                : img
                            )
                          }))
                        );
                      }}
                    >
                      <XCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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