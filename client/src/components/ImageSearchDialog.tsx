import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Search, X, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ImageSearchSuggestions from '@/components/ImageSearchSuggestions';

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
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>(initialSelectedImages);
  const [imageSearchHistory, setImageSearchHistory] = useState<SearchHistory[]>([]);

  // Reset selected images when receiving new initialSelectedImages
  useEffect(() => {
    setSelectedImages(initialSelectedImages);
  }, [initialSelectedImages]);

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    // Update selection in search results
    setSearchedImages(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { ...img, selected: !img.selected } 
          : img
      )
    );
    
    // Update in history as well for consistency
    setImageSearchHistory(prev => 
      prev.map(history => ({
        ...history,
        images: history.images.map(img => 
          img.id === imageId 
            ? { ...img, selected: !img.selected } 
            : img
        )
      }))
    );

    // Add or remove from selected images list
    const isCurrentlySelected = searchedImages.find(img => img.id === imageId)?.selected;
    
    if (!isCurrentlySelected) {
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
          count: 10
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
      } else {
        toast({
          title: "No images found",
          description: "Try a different search term",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Image search error:", error);
      toast({
        title: "Image search failed",
        description: "Could not fetch images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingImages(false);
    }
  };

  const confirmImageSelection = () => {
    onImagesSelected(selectedImages);
    onOpenChange(false);
  };
  
  // Example search prompts relevant to water solutions industry
  const examplePrompts = [
    "water filter",
    "water softener",
    "family drinking water",
    "clean water",
    "water purification"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content. You can perform multiple searches and select images from each.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-2 overflow-hidden flex-grow">
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
                  onFocus={() => setShowSearchSuggestions(imageSearchQuery.length >= 2)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
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
            
            {/* Example search prompts */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs text-muted-foreground">Try:</span>
              {examplePrompts.map((prompt) => (
                <Badge 
                  key={prompt}
                  variant="outline" 
                  className="cursor-pointer text-xs py-0"
                  onClick={() => {
                    setImageSearchQuery(prompt);
                    handleImageSearch(prompt);
                  }}
                >
                  {prompt}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Search history tabs */}
          {imageSearchHistory.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
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
          
          {/* Search results */}
          {searchedImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto p-3 border rounded-md bg-slate-50">
              {searchedImages.map(image => (
                <div 
                  key={image.id}
                  className={`relative rounded-md overflow-hidden cursor-pointer transition-all duration-200 border-2 shadow-sm hover:shadow-md ${
                    image.selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-slate-300'
                  }`}
                  onClick={() => toggleImageSelection(image.id)}
                >
                  <div className="h-[160px] relative">
                    <img 
                      src={image.src?.medium || image.url} 
                      alt={image.alt || 'Content image'} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {image.selected && (
                    <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1.5 shadow-md">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              {isSearchingImages ? "Searching for images..." : "Search for images to display results"}
            </div>
          )}
          
          {/* Selection summary */}
          {Array.isArray(selectedImages) && selectedImages.length > 0 && (
            <div className="border-t pt-2 mt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
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
              <div className="flex flex-wrap gap-2">
                {selectedImages.map(image => (
                  <div 
                    key={image.id} 
                    className="relative h-16 w-16 rounded-md overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <img 
                      src={image.src?.thumbnail || image.url} 
                      alt="Selected" 
                      className="h-full w-full object-cover"
                    />
                    <div 
                      className="absolute top-1 right-1 bg-red-500 rounded-full p-1 cursor-pointer shadow-sm hover:bg-red-600 transition-colors"
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
                      <XCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="pt-2">
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