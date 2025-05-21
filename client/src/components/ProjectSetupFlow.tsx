import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  Box, 
  CheckCircle, 
  ChevronRight, 
  FolderPlus, 
  ImagePlus, 
  Layers, 
  Package, 
  Search, 
  ShoppingBag, 
  Tag, 
  User, 
  Users,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define types for our flow
interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
  admin_url?: string;
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  image?: string;
}

interface BuyerAvatar {
  id: string;
  name: string;
  description: string;
  selected?: boolean;
}

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  alt?: string;
  source?: string;
  selected?: boolean;
}

interface ContentStyle {
  tone: string;
  perspective: string;
  structure: string;
}

interface ProjectData {
  projectName: string;
  selectedProducts: Product[];
  selectedCollections: Collection[];
  selectedBuyerAvatars: BuyerAvatar[];
  selectedMedia: MediaItem[];
  contentStyle: ContentStyle;
}

// Define the steps in our setup flow
type SetupStep = 'products' | 'collections' | 'avatars' | 'media' | 'style' | 'complete';

// Buyer avatar presets
const buyerAvatars: BuyerAvatar[] = [
  {
    id: "young-parents",
    name: "Young Parents",
    description: "Age 25-35, busy lifestyle, value convenience and quality for their growing family"
  },
  {
    id: "eco-conscious",
    name: "Eco-Conscious Shoppers",
    description: "Focused on sustainability, willing to pay more for environmentally friendly products"
  },
  {
    id: "budget-shoppers",
    name: "Budget-Conscious Consumers",
    description: "Looking for best value, compare options extensively before purchase"
  },
  {
    id: "luxury-seekers",
    name: "Luxury Seekers",
    description: "High income, appreciate premium quality and exclusive offerings"
  },
  {
    id: "tech-savvy",
    name: "Tech-Savvy Professionals",
    description: "Early adopters, appreciate innovation and smart features"
  },
  {
    id: "health-focused",
    name: "Health & Wellness Enthusiasts",
    description: "Prioritize products that contribute to healthy lifestyle and wellbeing"
  }
];

// Content style options
const toneOptions = [
  { id: "professional", name: "Professional" },
  { id: "friendly", name: "Friendly" },
  { id: "enthusiastic", name: "Enthusiastic" },
  { id: "informative", name: "Informative" },
  { id: "conversational", name: "Conversational" }
];

const perspectiveOptions = [
  { id: "first_person_plural", name: "We/Us (First Person Plural)" },
  { id: "first_person_singular", name: "I/Me (First Person Singular)" },
  { id: "second_person", name: "You/Your (Second Person)" },
  { id: "third_person", name: "They/Them (Third Person)" }
];

const structureOptions = [
  { id: "narrative", name: "Narrative Story" },
  { id: "how_to", name: "How-to Guide" },
  { id: "listicle", name: "Listicle (Numbered List)" },
  { id: "comparison", name: "Comparison Article" },
  { id: "qa_format", name: "Q&A Format" }
];

interface ProjectSetupFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onComplete: (projectData: ProjectData) => void;
}

export default function ProjectSetupFlow({ 
  open, 
  onOpenChange, 
  projectName,
  onComplete 
}: ProjectSetupFlowProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('products');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [selectedAvatars, setSelectedAvatars] = useState<BuyerAvatar[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [contentStyle, setContentStyle] = useState<ContentStyle>({
    tone: "friendly",
    perspective: "first_person_plural",
    structure: "narrative"
  });
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [isSearchingMedia, setIsSearchingMedia] = useState(false);
  const [searchedMedia, setSearchedMedia] = useState<MediaItem[]>([]);
  
  const { toast } = useToast();

  // Query for products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery<{
    success: boolean;
    products: Product[];
  }>({
    queryKey: ['/api/admin/products'],
    enabled: currentStep === 'products'
  });

  // Query for collections
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery<{
    success: boolean;
    collections: Collection[];
  }>({
    queryKey: ['/api/admin/collections'],
    enabled: currentStep === 'collections'
  });

  // Filter products by search query
  const filteredProducts = productsData?.products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter collections by search query
  const filteredCollections = collectionsData?.collections.filter(collection =>
    collection.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle search for media (images)
  const handleMediaSearch = async () => {
    if (!mediaSearchQuery.trim()) {
      toast({
        title: "Please enter search terms",
        description: "Enter emotional and descriptive terms for better results",
        variant: "destructive"
      });
      return;
    }

    setIsSearchingMedia(true);

    try {
      // This would call your API for image search
      // For now, we'll simulate with placeholder data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create demo results with emotional terms
      const emotionalTerms = mediaSearchQuery.toLowerCase();
      const mockResults = [
        {
          id: "img1",
          type: "image" as const,
          url: "https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg",
          alt: "Happy woman shopping online",
          source: "Pexels"
        },
        {
          id: "img2",
          type: "image" as const,
          url: "https://images.pexels.com/photos/5076520/pexels-photo-5076520.jpeg",
          alt: "Satisfied customer reviewing products",
          source: "Pexels"
        },
        {
          id: "img3",
          type: "image" as const, 
          url: "https://images.pexels.com/photos/3760790/pexels-photo-3760790.jpeg",
          alt: "Family enjoying new purchase",
          source: "Pexels"
        },
        {
          id: "img4",
          type: "image" as const,
          url: "https://images.pexels.com/photos/4350213/pexels-photo-4350213.jpeg",
          alt: "Excited woman with shopping bags",
          source: "Pexels"
        }
      ];
      
      setSearchedMedia(mockResults);
      
      toast({
        title: "Media found",
        description: `Found ${mockResults.length} items matching your search`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error searching media",
        description: "Failed to find matching images. Try different terms.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingMedia(false);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (product: Product) => {
    if (selectedProducts.some(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  // Toggle collection selection
  const toggleCollectionSelection = (collection: Collection) => {
    if (selectedCollections.some(c => c.id === collection.id)) {
      setSelectedCollections(selectedCollections.filter(c => c.id !== collection.id));
    } else {
      setSelectedCollections([...selectedCollections, collection]);
    }
  };

  // Toggle avatar selection
  const toggleAvatarSelection = (avatar: BuyerAvatar) => {
    if (selectedAvatars.some(a => a.id === avatar.id)) {
      setSelectedAvatars(selectedAvatars.filter(a => a.id !== avatar.id));
    } else {
      setSelectedAvatars([...selectedAvatars, avatar]);
    }
  };

  // Toggle media selection
  const toggleMediaSelection = (media: MediaItem) => {
    if (selectedMedia.some(m => m.id === media.id)) {
      setSelectedMedia(selectedMedia.filter(m => m.id !== media.id));
    } else {
      setSelectedMedia([...selectedMedia, media]);
    }
  };

  // Navigate to next step
  const goToNextStep = () => {
    switch (currentStep) {
      case 'products':
        setCurrentStep('collections');
        break;
      case 'collections':
        setCurrentStep('avatars');
        break;
      case 'avatars':
        setCurrentStep('media');
        break;
      case 'media':
        setCurrentStep('style');
        break;
      case 'style':
        setCurrentStep('complete');
        // Prepare final project data
        const projectData: ProjectData = {
          projectName,
          selectedProducts,
          selectedCollections,
          selectedBuyerAvatars: selectedAvatars,
          selectedMedia,
          contentStyle
        };
        
        // Call the completion handler
        onComplete(projectData);
        break;
    }
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    switch (currentStep) {
      case 'collections':
        setCurrentStep('products');
        break;
      case 'avatars':
        setCurrentStep('collections');
        break;
      case 'media':
        setCurrentStep('avatars');
        break;
      case 'style':
        setCurrentStep('media');
        break;
      case 'complete':
        setCurrentStep('style');
        break;
    }
  };

  // Determine if we can proceed to the next step
  const canProceed = () => {
    switch (currentStep) {
      case 'products':
        return selectedProducts.length > 0;
      case 'collections':
        return true; // Collections are optional
      case 'avatars':
        return selectedAvatars.length > 0;
      case 'media':
        return true; // Media is optional
      case 'style':
        return true; // Style always has defaults
      default:
        return false;
    }
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'products':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-muted p-2 rounded-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {isLoadingProducts ? (
                <p>Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="col-span-2 text-center text-muted-foreground py-8">No products found. Try a different search.</p>
              ) : (
                filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      selectedProducts.some(p => p.id === product.id) 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleProductSelection(product)}
                  >
                    <div className="flex items-start space-x-3 p-3">
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-full h-full p-2" />
                        )}
                        {selectedProducts.some(p => p.id === product.id) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm leading-tight mb-1 truncate">{product.title}</h3>
                        <p className="text-xs text-muted-foreground">ID: {product.id}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedProducts.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Products ({selectedProducts.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map(product => (
                    <Badge 
                      key={product.id} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {product.title}
                      <button 
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProductSelection(product);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'collections':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 bg-muted p-2 rounded-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {isLoadingCollections ? (
                <p>Loading collections...</p>
              ) : filteredCollections.length === 0 ? (
                <p className="col-span-2 text-center text-muted-foreground py-8">No collections found. Try a different search.</p>
              ) : (
                filteredCollections.map(collection => (
                  <div 
                    key={collection.id}
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      selectedCollections.some(c => c.id === collection.id) 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleCollectionSelection(collection)}
                  >
                    <div className="flex items-start space-x-3 p-3">
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {collection.image ? (
                          <img 
                            src={collection.image} 
                            alt={collection.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Layers className="w-full h-full p-2" />
                        )}
                        {selectedCollections.some(c => c.id === collection.id) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm leading-tight mb-1 truncate">{collection.title}</h3>
                        <p className="text-xs text-muted-foreground">ID: {collection.id}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedCollections.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Collections ({selectedCollections.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCollections.map(collection => (
                    <Badge 
                      key={collection.id} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {collection.title}
                      <button 
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollectionSelection(collection);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'avatars':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select target audience personas to tailor content to your specific customers.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {buyerAvatars.map(avatar => (
                <div 
                  key={avatar.id}
                  className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                    selectedAvatars.some(a => a.id === avatar.id) 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleAvatarSelection(avatar)}
                >
                  <div className="flex items-start space-x-3 p-3">
                    <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                      {selectedAvatars.some(a => a.id === avatar.id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-tight mb-1">{avatar.name}</h3>
                      <p className="text-xs text-muted-foreground">{avatar.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedAvatars.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Avatars ({selectedAvatars.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAvatars.map(avatar => (
                    <Badge 
                      key={avatar.id} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {avatar.name}
                      <button 
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAvatarSelection(avatar);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'media':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select or search for emotionally compelling images to include in your content.
            </p>
            
            <div className="flex items-center space-x-2 bg-muted p-2 rounded-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emotional images (e.g., 'happy woman with shopping bags')"
                value={mediaSearchQuery}
                onChange={(e) => setMediaSearchQuery(e.target.value)}
                className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleMediaSearch}
                disabled={isSearchingMedia}
              >
                {isSearchingMedia ? "Searching..." : "Search"}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {isSearchingMedia ? (
                <p className="col-span-full text-center py-8">Searching for images...</p>
              ) : searchedMedia.length === 0 ? (
                <p className="col-span-full text-center text-muted-foreground py-8">
                  Search for emotional images to include in your content.
                  <br />
                  <span className="text-xs block mt-2">
                    Try search terms like "happy customer" or "family enjoying product"
                  </span>
                </p>
              ) : (
                searchedMedia.map(media => (
                  <div 
                    key={media.id}
                    className={`border rounded-md overflow-hidden cursor-pointer transition-all ${
                      selectedMedia.some(m => m.id === media.id) 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleMediaSelection(media)}
                  >
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      <img 
                        src={media.url} 
                        alt={media.alt || "Content image"} 
                        className="w-full h-full object-cover"
                      />
                      {selectedMedia.some(m => m.id === media.id) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground truncate">{media.alt}</p>
                      <p className="text-xs">Source: {media.source}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {selectedMedia.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Selected Media ({selectedMedia.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMedia.map(media => (
                    <div 
                      key={media.id}
                      className="relative w-16 h-16 overflow-hidden rounded-md border"
                    >
                      <img 
                        src={media.url} 
                        alt={media.alt || "Selected media"} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow-sm"
                        onClick={() => toggleMediaSelection(media)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'style':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Tone of Voice</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {toneOptions.map(tone => (
                  <div 
                    key={tone.id}
                    className={`border rounded-md p-2 cursor-pointer transition-all text-center ${
                      contentStyle.tone === tone.id 
                        ? 'border-primary bg-primary/5 font-medium' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setContentStyle({...contentStyle, tone: tone.id})}
                  >
                    {tone.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Writing Perspective</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perspectiveOptions.map(perspective => (
                  <div 
                    key={perspective.id}
                    className={`border rounded-md p-2 cursor-pointer transition-all ${
                      contentStyle.perspective === perspective.id 
                        ? 'border-primary bg-primary/5 font-medium' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setContentStyle({...contentStyle, perspective: perspective.id})}
                  >
                    {perspective.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Content Structure</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {structureOptions.map(structure => (
                  <div 
                    key={structure.id}
                    className={`border rounded-md p-2 cursor-pointer transition-all ${
                      contentStyle.structure === structure.id 
                        ? 'border-primary bg-primary/5 font-medium' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setContentStyle({...contentStyle, structure: structure.id})}
                  >
                    {structure.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-6 space-y-4">
            <div className="rounded-full w-16 h-16 bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-medium">Project Setup Complete!</h3>
            <p className="text-muted-foreground">
              Your project "{projectName}" is ready to generate content.
            </p>
            <div className="text-sm text-left bg-muted p-4 rounded-md mt-4">
              <p className="font-medium mb-2">Project Summary:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>{selectedProducts.length} products selected</span>
                </li>
                {selectedCollections.length > 0 && (
                  <li className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>{selectedCollections.length} collections selected</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{selectedAvatars.length} buyer avatars selected</span>
                </li>
                {selectedMedia.length > 0 && (
                  <li className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    <span>{selectedMedia.length} media items selected</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            <span>
              {currentStep === 'complete' 
                ? 'Project Setup Complete' 
                : `Setting Up Project: ${projectName}`}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress indicators */}
        {currentStep !== 'complete' && (
          <div className="flex items-center justify-between px-1 mb-4 text-sm">
            <div className="flex items-center gap-1">
              <span 
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${currentStep === 'products' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                1
              </span>
              <span className={currentStep === 'products' ? 'font-medium' : 'text-muted-foreground'}>Products</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex items-center gap-1">
              <span 
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${currentStep === 'collections' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                2
              </span>
              <span className={currentStep === 'collections' ? 'font-medium' : 'text-muted-foreground'}>Collections</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex items-center gap-1">
              <span 
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${currentStep === 'avatars' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                3
              </span>
              <span className={currentStep === 'avatars' ? 'font-medium' : 'text-muted-foreground'}>Avatars</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex items-center gap-1">
              <span 
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${currentStep === 'media' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                4
              </span>
              <span className={currentStep === 'media' ? 'font-medium' : 'text-muted-foreground'}>Media</span>
            </div>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <div className="flex items-center gap-1">
              <span 
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${currentStep === 'style' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                5
              </span>
              <span className={currentStep === 'style' ? 'font-medium' : 'text-muted-foreground'}>Style</span>
            </div>
          </div>
        )}
        
        {/* Scrollable content area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="py-2">
            {renderStepContent()}
          </div>
        </ScrollArea>
        
        {/* Dialog footer */}
        <DialogFooter className="flex items-center justify-between mt-6 gap-2">
          <div>
            {currentStep !== 'products' && currentStep !== 'complete' && (
              <Button 
                type="button" 
                variant="outline"
                onClick={goToPreviousStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          
          <div>
            {currentStep !== 'complete' ? (
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={!canProceed()}
              >
                {currentStep === 'style' ? 'Complete Setup' : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Start Creating Content
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}