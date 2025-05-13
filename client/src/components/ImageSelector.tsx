import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Image, Plus, Search, Star, X } from "lucide-react";
import axios from "axios";

// Type definitions
interface ImageSelectorImage {
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
  source?: 'pexels' | 'pixabay' | 'product';
  isFeatured?: boolean;
  isContentImage?: boolean;
  large_url?: string;
  original_url?: string;
}

interface ImageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesSelected: (images: ImageSelectorImage[]) => void;
  initialImages?: ImageSelectorImage[];
  searchKeyword?: string;
}

export default function ImageSelector({
  open,
  onOpenChange,
  onImagesSelected,
  initialImages = [],
  searchKeyword = "",
}: ImageSelectorProps) {
  // State
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>(searchKeyword || "");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<ImageSelectorImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Record<string, boolean>>({});
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(null);
  const [contentImageIds, setContentImageIds] = useState<string[]>([]);
  
  // Initialize selection state from initial images
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      const selectionMap: Record<string, boolean> = {};
      const contentIds: string[] = [];
      let featuredId = null;
      
      initialImages.forEach(img => {
        selectionMap[img.id] = true;
        
        if (img.isFeatured) {
          featuredId = img.id;
        } else if (img.isContentImage) {
          contentIds.push(img.id);
        }
      });
      
      setSelectedImages(selectionMap);
      setFeaturedImageId(featuredId);
      setContentImageIds(contentIds);
    }
  }, [initialImages]);
  
  // Use search keyword if provided
  useEffect(() => {
    if (open && searchKeyword && searchKeyword.trim() !== "") {
      setSearchQuery(searchKeyword);
      handleSearch(searchKeyword);
    }
  }, [open, searchKeyword]);
  
  // Search images
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await axios.post("/api/admin/generate-images", { query });
      console.log("Search results:", response.data);
      
      if (response.data.success && response.data.images) {
        setSearchResults(response.data.images.filter((img: ImageSelectorImage) => img.url));
      } else {
        toast({
          title: "No images found",
          description: "Try a different search term",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching for images:", error);
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Submit search form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };
  
  // Toggle selection of an image
  const toggleSelection = (imageId: string) => {
    setSelectedImages(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  };
  
  // Set or unset an image as featured
  const toggleFeaturedImage = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Toggle featured status
    if (featuredImageId === imageId) {
      setFeaturedImageId(null);
    } else {
      setFeaturedImageId(imageId);
      // Ensure the image is selected
      setSelectedImages(prev => ({
        ...prev,
        [imageId]: true
      }));
      // Remove from content images if it was already there
      setContentImageIds(prev => prev.filter(id => id !== imageId));
    }
  };
  
  // Toggle an image as content image
  const toggleContentImage = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Toggle content status
    if (contentImageIds.includes(imageId)) {
      setContentImageIds(prev => prev.filter(id => id !== imageId));
    } else {
      setContentImageIds(prev => [...prev, imageId]);
      // Ensure the image is selected
      setSelectedImages(prev => ({
        ...prev,
        [imageId]: true
      }));
      // Remove from featured if it was featured
      if (featuredImageId === imageId) {
        setFeaturedImageId(null);
      }
    }
  };
  
  // Confirm selection
  const confirmSelection = () => {
    // Build the final list of selected images
    const selectedIds = Object.entries(selectedImages)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (selectedIds.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image",
        variant: "destructive",
      });
      return;
    }
    
    // Map to full image objects with proper flags
    const finalImages = searchResults
      .filter(img => selectedIds.includes(img.id))
      .map(img => ({
        ...img,
        isFeatured: img.id === featuredImageId,
        isContentImage: contentImageIds.includes(img.id) || img.id === featuredImageId
      }));
    
    onImagesSelected(finalImages);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold mb-2">Select Images</h2>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for images..."
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isSearching ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map(image => (
                <div
                  key={image.id}
                  className={`
                    border-2 rounded-lg overflow-hidden cursor-pointer
                    ${selectedImages[image.id] ? 'border-blue-500' : 'border-gray-200'}
                    ${featuredImageId === image.id ? 'ring-2 ring-yellow-400' : ''}
                    ${contentImageIds.includes(image.id) ? 'ring-1 ring-blue-400' : ''}
                  `}
                  onClick={() => toggleSelection(image.id)}
                >
                  {/* Image container */}
                  <div className="relative aspect-[4/3]">
                    <img
                      src={`/api/proxy/image/${image.id}`}
                      alt={image.alt || "Image"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Selection indicator */}
                    {selectedImages[image.id] && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    )}
                    
                    {/* Status badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {featuredImageId === image.id && (
                        <Badge className="bg-yellow-500 border-yellow-500">Featured</Badge>
                      )}
                      {contentImageIds.includes(image.id) && (
                        <Badge className="bg-blue-500 border-blue-500">Content</Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Image actions */}
                  <div className="p-2 bg-gray-50 flex gap-2">
                    <Button
                      size="sm"
                      variant={featuredImageId === image.id ? "default" : "outline"}
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => toggleFeaturedImage(image.id, e)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </Button>
                    <Button
                      size="sm"
                      variant={contentImageIds.includes(image.id) ? "default" : "outline"}
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => toggleContentImage(image.id, e)}
                    >
                      <Image className="w-3 h-3 mr-1" />
                      Content
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">No images found</p>
                <p className="text-gray-500 mb-4">Please search for images using keywords</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["water softener", "water filter", "clean water"].map(suggestion => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleSearch(suggestion);
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
        
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              {Object.values(selectedImages).filter(Boolean).length} images selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSelection}>
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}