import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Plus } from 'lucide-react';
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
  productTitle?: string;
  productId?: string;
  productDescription?: string;
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
  productTitle,
  productId,
  productDescription,
  initialSelectedImages = [],
  selectedKeywords = []
}: ImageSearchDialogProps) {
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
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

  // Pre-populate with main keyword if available and auto-suggest search terms based on it
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
          count: 10, // Request 10 images to choose from
          productId: productId // Include productId if available to fetch product images
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
      <DialogContent className="sm:max-w-[800px] lg:max-w-[1000px] xl:max-w-[1200px] h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Images for Your Content</DialogTitle>
          <DialogDescription>
            Search for images related to your content. You can perform multiple searches and select images from each.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 overflow-y-auto overflow-x-hidden flex-grow flex flex-col">
          <div className="w-full space-y-4">
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1">
                <Input
                  placeholder="Search for images (e.g., 'family drinking water')"
                  value={imageSearchQuery || ''}
                  onChange={(e) => {
                    setImageSearchQuery(e.target.value);
                    setShowSearchSuggestions(e.target.value.length >= 2);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && imageSearchQuery.trim()) {
                      e.preventDefault();
                      handleImageSearch(imageSearchQuery.trim());
                    }
                  }}
                  onFocus={() => setShowSearchSuggestions(true)} 
                  // Keep suggestions visible when input is focused
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 300)}
                  className="flex-1"
                />
                <ImageSearchSuggestions 
                  query={imageSearchQuery} 
                  visible={showSearchSuggestions}
                  productTitle={productTitle}
                  productId={productId}
                  productDescription={productDescription}
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
            
            {/* Example search prompts or keyword-based suggestions */}
            {!searchedImages.length && !isSearchingImages && (
              <div className="rounded-md bg-blue-50 p-3">
                {/* If we have a main keyword, show suggestions based on it */}
                {selectedKeywords.some(kw => kw.isMainKeyword) ? (
                  <>
                    <div className="text-sm font-medium text-blue-800 mb-2">
                      Search suggestions based on your main keyword:
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedKeywords.filter(kw => kw.isMainKeyword).map((mainKw, idx) => {
                        // Generate search variations based on the main keyword
                        const variations = [
                          mainKw.keyword,
                          `happy ${mainKw.keyword}`,
                          `${mainKw.keyword} lifestyle`,
                          `family using ${mainKw.keyword}`,
                          `smiling person with ${mainKw.keyword}`,
                          `${mainKw.keyword} at home`
                        ];
                        
                        return variations.map((variation, vIdx) => (
                          <Badge 
                            key={`${idx}-${vIdx}`} 
                            variant="secondary" 
                            className={`cursor-pointer hover:bg-blue-100 py-1.5 justify-center ${vIdx === 0 ? 'bg-blue-200 hover:bg-blue-300' : ''}`}
                            onClick={() => {
                              setImageSearchQuery(variation);
                              handleImageSearch(variation);
                            }}
                          >
                            {variation}
                          </Badge>
                        ));
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-blue-800 mb-2">Try these realistic search prompts:</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        "happy family lifestyle",
                        "smiling person in kitchen",
                        "children playing at home",
                        "relaxed family moments",
                        "healthy lifestyle choices",
                        "satisfied customer portrait"
                      ].map((example, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-blue-100 py-1.5 justify-center"
                          onClick={() => {
                            setImageSearchQuery(example);
                            handleImageSearch(example);
                          }}
                        >
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
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
          
          {/* Selection summary - Positioned in a compact format when showing search results */}
          {Array.isArray(selectedImages) && selectedImages.length > 0 && (
            <div className={`border rounded-md shadow-sm mb-4 ${searchedImages.length > 0 ? 'bg-white' : 'bg-slate-50/80 p-4'}`}>
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
                    Selected Images: {selectedImages.length}
                  </p>
                  <Badge variant="secondary" className="ml-1">
                    First image will be featured at the top
                  </Badge>
                </div>
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
              
              {/* Compact view when we have search results, expandable view otherwise */}
              {searchedImages.length > 0 ? (
                <div className="px-3 py-1.5 flex gap-2 items-center overflow-x-auto">
                  <p className="text-xs text-gray-500 shrink-0 whitespace-nowrap">Selected:</p>
                  <div className="flex gap-1.5">
                    {selectedImages.map((image, index) => (
                      <div 
                        key={image.id} 
                        className={`relative rounded-md overflow-hidden border shadow shrink-0 ${index === 0 ? 'ring-2 ring-blue-400' : ''}`}
                        style={{ width: '72px', height: '72px' }}
                      >
                        <img 
                          src={image.src?.small || image.src?.thumbnail || image.url} 
                          alt="Selected" 
                          className="h-full w-full object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs py-0.5 px-1">
                            Featured
                          </div>
                        )}
                        <div 
                          className="absolute top-1 right-1 bg-red-500 rounded-full p-1 cursor-pointer shadow-md hover:bg-red-600 transition-colors"
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
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-3">
                  {selectedImages.map((image, index) => (
                    <div 
                      key={image.id} 
                      className={`relative rounded-md overflow-hidden border shadow hover:shadow-md transition-shadow duration-200 ${index === 0 ? 'ring-2 ring-blue-400' : ''}`}
                    >
                      <div className="aspect-square relative">
                        <img 
                          src={image.src?.small || image.src?.thumbnail || image.url} 
                          alt="Selected" 
                          className="h-full w-full object-cover"
                        />
                        {index === 0 && (
                          <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs py-1 px-2">
                            Featured
                          </div>
                        )}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search results - Now always visible below selected images */}
          {searchedImages.length > 0 ? (
            <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
              <div className="p-3 bg-blue-50 border-b">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-blue-900">Search results for "{imageSearchQuery}"</h3>
                  {availableSources.length > 1 && (
                    <div className="flex gap-1">
                      <Badge 
                        variant={sourceFilter === 'all' ? 'default' : 'outline'} 
                        className="cursor-pointer"
                        onClick={() => setSourceFilter('all')}
                      >
                        All
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
                      {availableSources.includes('product') && (
                        <Badge 
                          variant={sourceFilter === 'product' ? 'default' : 'outline'} 
                          className="cursor-pointer bg-green-100 hover:bg-green-200"
                          onClick={() => setSourceFilter('product')}
                        >
                          Product
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-blue-700">Click on an image to select/deselect it</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-5" style={{ maxHeight: 'calc(80vh - 210px)' }}>
                {searchedImages
                  .filter(image => {
                    // Apply source filtering
                    if (sourceFilter === 'all') return true;
                    if (sourceFilter === 'product') return image.isProductImage;
                    if (sourceFilter === 'pexels') return image.source === 'pexels';
                    if (sourceFilter === 'pixabay') return image.source === 'pixabay';
                    return true;
                  })
                  .map(image => (
                  <div 
                    key={image.id}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 shadow hover:shadow-lg ${
                      image.selected 
                        ? 'border-blue-500 ring-2 ring-blue-300' 
                        : image.isProductImage 
                          ? 'border-green-500 hover:border-green-600' 
                          : 'border-transparent hover:border-slate-300'
                    }`}
                    onClick={() => toggleImageSelection(image.id)}
                  >
                    <div className="aspect-[4/3] relative bg-slate-100">
                      <img 
                        src={image.src?.medium || image.url} 
                        alt={image.alt || 'Content image'} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Label for image source - show product image label or alt text */}
                      {image.isProductImage ? (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-600 text-white text-xs py-1 px-2 truncate">
                          Product Image
                        </div>
                      ) : image.alt && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                          {image.alt}
                        </div>
                      )}
                      
                      {/* Badge for image source */}
                      <div className="absolute top-2 left-2 bg-white/90 rounded-md text-xs py-0.5 px-2 font-medium shadow-sm">
                        {image.isProductImage ? (
                          <span className="text-green-700">Product</span>
                        ) : image.source === 'pexels' ? (
                          <span className="text-blue-700">Pexels</span>
                        ) : image.source === 'pixabay' ? (
                          <span className="text-purple-700">Pixabay</span>
                        ) : (
                          <span className="text-gray-700">Stock</span>
                        )}
                      </div>
                    </div>
                    {image.selected ? (
                      <div className="absolute top-0 right-0 left-0 bottom-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="bg-blue-500 rounded-full p-2 shadow-md">
                          <CheckCircle className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute top-0 right-0 left-0 bottom-0 bg-black/0 hover:bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="bg-white/80 rounded-full p-2 shadow-md">
                          <Plus className="h-6 w-6 text-blue-500" />
                        </div>
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