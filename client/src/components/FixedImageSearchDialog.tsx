import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Image, Plus, Search, Star, X } from "lucide-react";
import axios from "axios";

// Type definitions
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

export default function FixedImageSearchDialog({
  open,
  onOpenChange,
  onImagesSelected,
  initialSelectedImages = [],
  selectedKeywords = [],
  searchKeyword = "",
}: ImageSearchDialogProps) {
  const { toast } = useToast();
  const [imageSearchQuery, setImageSearchQuery] = useState<string>(searchKeyword || "");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>(initialSelectedImages || []);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pexels' | 'pixabay' | 'product'>('all');
  
  // Track featured and content images
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(
    initialSelectedImages?.find(img => img.isFeatured)?.id || null
  );
  
  const [contentImageIds, setContentImageIds] = useState<string[]>(
    initialSelectedImages?.filter(img => img.isContentImage && !img.isFeatured).map(img => img.id) || []
  );

  // Initialize with selected keywords
  useEffect(() => {
    if (selectedKeywords?.length > 0 && open) {
      // Find the main keyword or use the first one
      const mainKeyword = selectedKeywords.find(k => k.isMainKeyword)?.keyword || selectedKeywords[0]?.keyword;
      if (mainKeyword && (!searchKeyword || searchKeyword === "")) {
        setImageSearchQuery(mainKeyword);
      }
    }
  }, [selectedKeywords, open, searchKeyword]);

  // Use the provided search keyword if available
  useEffect(() => {
    if (searchKeyword && searchKeyword !== "" && open) {
      console.log("Pre-populated and searching with provided keyword:", searchKeyword);
      setImageSearchQuery(searchKeyword);
      searchImages(searchKeyword);
    }
  }, [searchKeyword, open]);

  // Update selected images when initialSelectedImages changes
  useEffect(() => {
    if (initialSelectedImages && initialSelectedImages.length > 0) {
      setSelectedImages(initialSelectedImages);
      
      // Extract featured and content image IDs
      const featured = initialSelectedImages.find(img => img.isFeatured);
      if (featured) {
        setFeaturedImageId(featured.id);
      }
      
      const contentImages = initialSelectedImages.filter(img => img.isContentImage && !img.isFeatured);
      if (contentImages.length > 0) {
        setContentImageIds(contentImages.map(img => img.id));
      }
    }
  }, [initialSelectedImages]);

  // Search for images from Pexels
  const searchImages = async (query: string) => {
    if (!query.trim()) return;
    
    // Check if we already have results for this query in history
    const existingSearch = searchHistory.find(item => item.query.toLowerCase() === query.toLowerCase());
    if (existingSearch) {
      setSearchedImages(existingSearch.images);
      return;
    }
    
    setIsSearching(true);
    console.log("Searching for images with query:", query);

    try {
      const response = await axios.post("/api/admin/generate-images", { query });
      console.log("API response:", response.data);
      
      if (response.data.success && response.data.images) {
        const validImages = response.data.images.filter((img: PexelsImage) => img.url);
        console.log("Found", validImages.length, "images");
        console.log("Valid images count:", validImages.length);
        if (validImages.length > 0) {
          console.log("First image:", validImages[0]);
        }
        
        // Mark previously selected images
        const imagesWithSelectionState = validImages.map((img: PexelsImage) => {
          const isSelected = !!selectedImages.find(selImg => selImg.id === img.id);
          return {
            ...img,
            selected: isSelected,
            isFeatured: img.id === featuredImageId,
            isContentImage: contentImageIds.includes(img.id)
          };
        });
        
        setSearchedImages(imagesWithSelectionState);
        
        // Add to search history
        setSearchHistory(prev => [
          ...prev, 
          { query, images: imagesWithSelectionState }
        ].slice(-5)); // Keep last 5 searches
      } else {
        toast({
          title: "No images found",
          description: "Try different search terms for better results.",
          variant: "destructive",
        });
        setSearchedImages([]);
      }
    } catch (error) {
      console.error("Error searching for images:", error);
      toast({
        title: "Error searching for images",
        description: "Please try again or use a different search term.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle selection of an image
  const toggleImageSelection = (imageId: string) => {
    console.log("Toggle selection called for image ID:", imageId);
    setSearchedImages(prev =>
      prev.map(img => {
        if (img.id === imageId) {
          const newSelectionState = !img.selected;
          console.log(`Toggling image ${imageId} to selected=${newSelectionState}`);
          return { ...img, selected: newSelectionState };
        }
        return img;
      })
    );
  };

  // Set an image as featured
  const setAsFeaturedImage = (imageId: string) => {
    // Find the image
    const image = searchedImages.find(img => img.id === imageId);
    if (!image) return;
    
    // Toggle feature state
    const isFeatured = featuredImageId === imageId;
    
    if (isFeatured) {
      // Unset as featured
      setFeaturedImageId(null);
    } else {
      // Set as featured
      setFeaturedImageId(imageId);
      
      // Also ensure it's selected
      if (!image.selected) {
        toggleImageSelection(imageId);
      }
    }
  };

  // Set an image as content image
  const setAsContentImage = (imageId: string) => {
    // Find the image
    const image = searchedImages.find(img => img.id === imageId);
    if (!image) return;
    
    // Toggle content state
    const isContentImage = contentImageIds.includes(imageId);
    
    if (isContentImage) {
      // Remove from content images
      setContentImageIds(prev => prev.filter(id => id !== imageId));
    } else {
      // Add to content images
      setContentImageIds(prev => [...prev, imageId]);
      
      // Also ensure it's selected
      if (!image.selected) {
        toggleImageSelection(imageId);
      }
    }
  };

  // Set or toggle an image as featured
  const setFeaturedImage = (imageId: string) => {
    const isFeatured = featuredImageId === imageId;
    
    if (isFeatured) {
      // Unset as featured
      setFeaturedImageId(null);
    } else {
      // Set as featured and remove from content if needed
      setFeaturedImageId(imageId);
      setContentImageIds(prev => prev.filter(id => id !== imageId));
    }
  };

  // Toggle an image as content image
  const toggleContentImage = (imageId: string) => {
    const isContent = contentImageIds.includes(imageId);
    
    if (isContent) {
      // Remove from content
      setContentImageIds(prev => prev.filter(id => id !== imageId));
    } else {
      // Add to content and remove from featured if needed
      if (featuredImageId === imageId) {
        setFeaturedImageId(null);
      }
      setContentImageIds(prev => [...prev, imageId]);
    }
  };

  // Calculate final selected images to return
  const finalSelectedImages = useMemo(() => {
    // Combine images from searchedImages that are selected
    const selected = searchedImages.filter(img => 
      img.selected || img.id === featuredImageId || contentImageIds.includes(img.id)
    );
    
    // Update with featured and content flags
    return selected.map(img => ({
      ...img,
      isFeatured: img.id === featuredImageId,
      isContentImage: contentImageIds.includes(img.id) || img.id === featuredImageId
    }));
  }, [searchedImages, featuredImageId, contentImageIds]);

  // Handle form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageSearchQuery.trim()) {
      searchImages(imageSearchQuery);
    }
  };

  // Confirm selection and close dialog
  const confirmSelection = () => {
    // Ensure we have at least one image selected
    if (finalSelectedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure we have a featured image if we have any images
    if (finalSelectedImages.length > 0 && !featuredImageId) {
      // Auto-select the first image as featured
      const firstImageId = finalSelectedImages[0].id;
      setFeaturedImageId(firstImageId);
      
      const updatedImages = finalSelectedImages.map(img => ({
        ...img,
        isFeatured: img.id === firstImageId
      }));
      
      onImagesSelected(updatedImages);
    } else {
      onImagesSelected(finalSelectedImages);
    }
    
    onOpenChange(false);
  };
  
  // Helper to get active search query for the title
  const getActiveSearchQuery = () => {
    if (imageSearchQuery.trim()) {
      return imageSearchQuery;
    } else if (selectedKeywords.length > 0) {
      return selectedKeywords[0].keyword;
    }
    return "images";
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // Reset state when dialog closes without selection
        setImageSearchQuery('');
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="fixed inset-0 z-50 p-0 w-full h-full max-w-full max-h-full m-0 rounded-none overflow-hidden" style={{ transform: 'none', top: 0, left: 0 }}>
        <div className="w-full h-full flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 bg-white z-50">
            <DialogTitle>Select Images for Your Content</DialogTitle>
            <DialogDescription>
              Search for images related to your content using keywords. You can select <span className="text-yellow-500 font-medium">Featured</span> images for your article header and <span className="text-blue-500 font-medium">Content</span> images to be embedded within your article.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left sidebar */}
            <div className="w-full md:w-1/4 p-4 bg-slate-50 border-r overflow-auto">
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Search for Images</h3>
                <form onSubmit={handleSearchSubmit} className="space-y-1">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Enter keywords..."
                      value={imageSearchQuery}
                      onChange={(e) => setImageSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      variant="ghost" 
                      className="absolute right-0 top-0 h-full"
                      disabled={isSearching}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSearching || !imageSearchQuery.trim()}
                  >
                    {isSearching ? "Searching..." : "Search Images"}
                  </Button>
                </form>
              </div>
              
              {/* Keyword suggestions */}
              {selectedKeywords.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2">Suggested Keywords</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedKeywords.map((keyword, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className={keyword.isMainKeyword ? "border-blue-500 bg-blue-50" : ""}
                        onClick={() => {
                          setImageSearchQuery(keyword.keyword);
                          searchImages(keyword.keyword);
                        }}
                      >
                        {keyword.keyword}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Source filtering */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Filter by Source</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={sourceFilter === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter('all')}
                  >
                    All Sources
                  </Button>
                  <Button
                    variant={sourceFilter === 'pexels' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter('pexels')}
                  >
                    Pexels
                  </Button>
                  <Button
                    variant={sourceFilter === 'pixabay' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter('pixabay')}
                  >
                    Pixabay
                  </Button>
                  <Button
                    variant={sourceFilter === 'product' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter('product')}
                  >
                    Products
                  </Button>
                </div>
              </div>
              
              {/* Search history */}
              {searchHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Recent Searches</h3>
                  <div className="space-y-1">
                    {searchHistory.map((item, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start truncate"
                        onClick={() => {
                          setImageSearchQuery(item.query);
                          setSearchedImages(item.images);
                        }}
                      >
                        {item.query}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Helpful guidance */}
              <div className="sticky top-0 z-20 pt-4 pb-2 px-4 bg-white">
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
              
              {/* Image grid */}
              <div className="flex-1 overflow-auto p-4">
                {isSearching ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Searching for images...</p>
                    </div>
                  </div>
                ) : searchedImages.length > 0 ? (
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
                          onClick={() => toggleImageSelection(image.id)}
                        >
                          <div className="aspect-[4/3] bg-slate-100 relative">
                            {/* Use direct proxy URL to ensure images load */}
                            <img 
                              src={`/api/proxy/image/${image.id}`}
                              alt={image.alt || 'Product image'} 
                              className="w-full h-full object-cover pointer-events-none"
                              onError={(e) => {
                                // Fallback to placeholder if direct proxy fails
                                const target = e.target as HTMLImageElement;
                                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='gray' stroke-width='2'%3E%3Crect width='20' height='20' x='2' y='2' rx='2'/%3E%3Cpath d='m4 14 4-4 6 6'/%3E%3Cpath d='m14 10 2-2 4 4'/%3E%3Ccircle cx='8' cy='8' r='2'/%3E%3C/svg%3E";
                              }}
                              loading="lazy"
                            />
                            
                            {/* Hover state overlay */}
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                            
                            {/* Big selection checkmark */}
                            {image.selected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 pointer-events-none">
                                <div className="bg-white rounded-full p-2 shadow-lg">
                                  <CheckCircle className="h-8 w-8 text-blue-500" />
                                </div>
                              </div>
                            )}
                            
                            {/* Selection instruction overlay on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <div className="bg-black/40 px-3 py-1 rounded-md">
                                <span className="text-white text-xs font-medium">Click to select</span>
                              </div>
                            </div>
                            
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
                              className="flex-1 text-xs h-7 rounded-sm mr-1"
                              variant={featuredImageId === image.id ? "default" : "secondary"}
                              size="sm"
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
                              ) : (
                                <span className="flex items-center justify-center">
                                  <Star className="w-3 h-3 mr-1" />
                                  Feature
                                </span>
                              )}
                            </Button>
                            <Button 
                              className="flex-1 text-xs h-7 rounded-sm"
                              variant={contentImageIds.includes(image.id) && featuredImageId !== image.id ? "default" : "secondary"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAsContentImage(image.id);
                              }}
                            >
                              {contentImageIds.includes(image.id) && featuredImageId !== image.id ? (
                                <span className="flex items-center justify-center">
                                  <span className="inline-block w-2 h-2 bg-white rounded-full mr-1"></span>
                                  Content
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <Image className="w-3 h-3 mr-1" />
                                  Content
                                </span>
                              )}
                            </Button>
                          </div>

                          {/* Image source attribution */}
                          {image.source && (
                            <div className="absolute bottom-10 left-1 bg-black/60 rounded text-[10px] px-1 text-white">
                              {image.source}
                            </div>
                          )}
                          {image.photographer && (
                            <div className="absolute bottom-10 right-1 bg-black/60 rounded text-[10px] px-1 text-white truncate max-w-[50%]">
                              {image.photographer}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md p-6 rounded-lg bg-slate-50">
                      <h3 className="text-lg font-medium text-slate-700 mb-2">No Images Found</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        {searchedImages.length === 0 && imageSearchQuery.trim() ? 
                          `We couldn't find any images matching "${imageSearchQuery}". Try a different search term.` : 
                          "Use the search form to find images for your content."}
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">Try searching for:</p>
                        {["water softener", "water filter", "clean water", "home water system"].map((suggestion, i) => (
                          <Button 
                            key={i} 
                            variant="outline" 
                            size="sm"
                            className="mr-2 mb-2"
                            onClick={() => {
                              setImageSearchQuery(suggestion);
                              searchImages(suggestion);
                            }}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer with selection count and actions */}
              <div className="border-t p-4 bg-white z-10">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-sm text-slate-600">
                    {finalSelectedImages.length > 0 ? (
                      <span>
                        <strong>{finalSelectedImages.length}</strong> image{finalSelectedImages.length !== 1 ? 's' : ''} selected
                        {featuredImageId ? ` (${contentImageIds.length} content, 1 featured)` : ''}
                      </span>
                    ) : (
                      <span>No images selected</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmSelection}
                      disabled={finalSelectedImages.length === 0}
                    >
                      Confirm Selection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}