import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, CheckCircle, XCircle, Sparkles, FileText, BarChart, Save, Download, Trash, Calendar } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import KeywordSelector from '@/components/KeywordSelector';
import TitleSelector from '@/components/TitleSelector';
import ImagePromptSuggestions from '@/components/ImagePromptSuggestions';
import ImageSearchSuggestions from '@/components/ImageSearchSuggestions';

// Define the form schema for content generation
const contentFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  region: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  collectionIds: z.array(z.string()).optional(),
  articleType: z.enum(["blog", "page"]),
  blogId: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  writingPerspective: z.enum(["first_person_plural", "first_person_singular", "second_person", "third_person", "professional"]),
  enableTables: z.boolean().default(true),
  enableLists: z.boolean().default(true),
  enableH3s: z.boolean().default(true),
  introType: z.enum(["none", "standard", "search_intent"]),
  faqType: z.enum(["none", "short", "long"]),
  enableCitations: z.boolean().default(true),
  mainImageIds: z.array(z.string()).optional(),
  internalImageIds: z.array(z.string()).optional(),
  toneOfVoice: z.enum(["neutral", "professional", "empathetic", "casual", "excited", "formal", "friendly", "humorous"]),
  postStatus: z.enum(["publish", "draft"]),
  generateImages: z.boolean().default(true),
  scheduledPublishDate: z.string().optional() // Added for future scheduling
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface Region {
  id: string;
  name: string;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  image?: string;
}

interface Blog {
  id: string;
  title: string;
  handle: string;
}

interface ServiceStatus {
  shopify: boolean;
  claude: boolean;
  dataForSEO: boolean;
  pexels: boolean;
}

// Interface for Pexels image 
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

export default function AdminPanel() {
  const [selectedTab, setSelectedTab] = useState("generate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showKeywordSelector, setShowKeywordSelector] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [productTitle, setProductTitle] = useState<string>('');
  const [workflowStep, setWorkflowStep] = useState<'product' | 'keyword' | 'title' | 'content'>('product');
  const [templates, setTemplates] = useState<{name: string, data: any}[]>(() => {
    // Load templates from localStorage on initial render
    const savedTemplates = localStorage.getItem('topshop-templates');
    return savedTemplates ? JSON.parse(savedTemplates) : [];
  });
  const [templateName, setTemplateName] = useState<string>('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showLoadTemplateDialog, setShowLoadTemplateDialog] = useState(false);
  const [imageSearchHistory, setImageSearchHistory] = useState<{query: string, images: PexelsImage[]}[]>([]);
  const { toast } = useToast();

  // Default form values
  const defaultValues: Partial<ContentFormValues> = {
    articleType: "blog",
    writingPerspective: "first_person_plural",
    enableTables: true,
    enableLists: true,
    enableH3s: true,
    introType: "standard",
    faqType: "short",
    enableCitations: true,
    toneOfVoice: "friendly",
    postStatus: "draft",
    generateImages: true,
    region: "us", // Default to US region for store
    keywords: [],
    productIds: [], // This needs to be initialized as an empty array
    collectionIds: [] // This needs to be initialized as an empty array
  };

  // Form setup
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues
  });

  // Define response types
  interface RegionsResponse {
    regions: Array<Region>;
  }
  
  interface ProductsResponse {
    success: boolean;
    products: Array<Product>;
  }
  
  interface CollectionsResponse {
    success: boolean;
    collections: Array<Collection>;
  }
  
  interface BlogsResponse {
    success: boolean;
    blogs: Array<Blog>;
  }
  
  interface ServiceStatusResponse {
    success: boolean;
    connections: ServiceStatus;
  }

  // Query for regions
  const regionsQuery = useQuery<RegionsResponse>({
    queryKey: ['/api/admin/regions'],
    enabled: selectedTab === "generate"
  });

  // Query for products
  const productsQuery = useQuery<ProductsResponse>({
    queryKey: ['/api/admin/products'],
    enabled: selectedTab === "generate"
  });

  // Query for collections
  const collectionsQuery = useQuery<CollectionsResponse>({
    queryKey: ['/api/admin/collections'],
    enabled: selectedTab === "generate"
  });

  // Query for blogs
  const blogsQuery = useQuery<BlogsResponse>({
    queryKey: ['/api/admin/blogs'],
    enabled: selectedTab === "generate" && form.watch('articleType') === "blog"
  });

  // Query for connection status
  const servicesStatusQuery = useQuery<ServiceStatusResponse>({
    queryKey: ['/api/admin/test-connections'],
    enabled: selectedTab === "connections"
  });

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
          query: trimmedQuery, // Use "query" instead of "prompt" to match server expectations
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
  
  // Just open the dialog without auto-populating or auto-searching
  useEffect(() => {
    // No longer auto-populate or search based on title
    if (showImageDialog && imageSearchHistory.length === 0 && !searchedImages.length) {
      // Just display empty search - user must enter their own query
      setImageSearchQuery('');
    }
  }, [showImageDialog, imageSearchHistory.length, searchedImages.length]);

  // Handle image selection confirmation
  const confirmImageSelection = () => {
    // Consolidate all selected images from all searches
    const allSelected: PexelsImage[] = [];
    
    // Get selected images from current search
    const currentSelected = searchedImages.filter(img => img.selected);
    
    // Get selected images from history
    imageSearchHistory.forEach(history => {
      const historySelected = history.images.filter(img => img.selected);
      historySelected.forEach(img => {
        // Only add if not already in the list
        if (!allSelected.some(selected => selected.id === img.id)) {
          allSelected.push(img);
        }
      });
    });
    
    // Add current selected images if not in history
    currentSelected.forEach(img => {
      if (!allSelected.some(selected => selected.id === img.id)) {
        allSelected.push(img);
      }
    });
    
    setSelectedImages(allSelected);
    setShowImageDialog(false);
    
    toast({
      title: `${allSelected.length} image(s) selected`,
      description: "Images will be included in your content",
      variant: "default"
    });
  };
  
  // Handle keyword selection
  const handleKeywordsSelected = (keywords: any[]) => {
    setSelectedKeywords(keywords);
    setShowKeywordSelector(false);
    
    // Update form with selected keywords
    const keywordStrings = keywords.map(k => k.keyword);
    form.setValue('keywords', keywordStrings);
    
    toast({
      title: `${keywords.length} keyword(s) selected`,
      description: "Keywords will be used to optimize your content",
      variant: "default"
    });
    
    // Move to title selection step
    setWorkflowStep('title');
    setShowTitleSelector(true);
  };
  
  // Handle title selection
  const handleTitleSelected = (title: string) => {
    form.setValue('title', title);
    setShowTitleSelector(false);
    
    toast({
      title: "Title selected",
      description: "Title will be used for your content",
      variant: "default"
    });
    
    // Move to content generation step
    setWorkflowStep('content');
  };
  
  // Handle product selection
  const handleProductsSelected = (productIds: string[]) => {
    // Find the selected product to use for keyword generation
    if (productIds.length > 0) {
      const product = productsQuery.data?.products.find(p => p.id === productIds[0]);
      if (product) {
        setProductTitle(product.title);
      }
    }
    
    form.setValue('productIds', productIds);
    setSelectedProducts(productIds);
    
    // Move to keyword selection step after product selection
    setWorkflowStep('keyword');
    
    // No longer auto-open keyword selector, let user click the button manually
    // Just update the UI to show that we're in the keyword step now
  };
  
  // Handle collection selection
  const handleCollectionsSelected = (collectionIds: string[]) => {
    form.setValue('collectionIds', collectionIds);
    setSelectedCollections(collectionIds);
    
    // Only move to next step if no products were selected (products take precedence)
    const productIds = form.getValues('productIds') || [];
    if (productIds.length === 0 && collectionIds.length > 0) {
      // Just update the workflow step, don't auto-open keyword selector
      setWorkflowStep('keyword');
      // The user will need to click the button manually
    }
  };
  
  // Handle content generation form submission
  const handleSubmit = async (values: ContentFormValues) => {
    console.log("Form submission started with values:", values);
    setIsGenerating(true);
    setGeneratedContent(null);
    
    try {
      // Create a safe copy of the form values with guaranteed array values
      const safeValues = {
        ...values,
        // Ensure these are always arrays
        productIds: Array.isArray(values.productIds) ? values.productIds : [],
        collectionIds: Array.isArray(values.collectionIds) ? values.collectionIds : [],
        keywords: Array.isArray(values.keywords) ? values.keywords : []
      };
      
      // Add selected image IDs and keywords to form data
      const submitData = {
        ...safeValues,
        selectedImageIds: selectedImages.map(img => img.id),
        // Include full keyword data (not just strings) for analysis on the server
        selectedKeywordData: selectedKeywords
      };
      
      console.log("Preparing API request to /api/admin/generate-content with data:", submitData);
      
      try {
        const response = await apiRequest({
          url: '/api/admin/generate-content',
          method: 'POST',
          data: submitData
        });
        
        console.log("API response received:", response);
        setGeneratedContent(response);
        toast({
          title: "Content generated successfully",
          description: "Your content has been generated and saved.",
          variant: "default"
        });
      } catch (apiError: any) {
        console.error("API request failed:", apiError);
        toast({
          title: "API Request Failed",
          description: apiError.message || "Could not connect to the server",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Content generation error:", error);
      toast({
        title: "Error generating content",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 text-transparent bg-clip-text mb-2">
          TopShop SEO Admin
        </h1>
        <p className="text-muted-foreground">
          Manage content generation, view service status, and configure settings
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="generate">Content Generator</TabsTrigger>
          <TabsTrigger value="connections">Services</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Generation Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Content Generator</CardTitle>
                <CardDescription>
                  Generate SEO-optimized content for your Shopify store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    {/* Step guidance */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                      <h3 className="font-medium text-blue-700 mb-2">Content Creation Workflow</h3>
                      <div className="flex items-center space-x-3">
                        <Badge className={workflowStep === 'product' ? 'bg-blue-600' : 'bg-gray-300'}>1</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep !== 'product' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        <Badge className={workflowStep === 'keyword' ? 'bg-blue-600' : (workflowStep === 'title' || workflowStep === 'content' ? 'bg-green-600' : 'bg-gray-300')}>2</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'title' || workflowStep === 'content' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        <Badge className={workflowStep === 'title' ? 'bg-blue-600' : (workflowStep === 'content' ? 'bg-green-600' : 'bg-gray-300')}>3</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'content' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        <Badge className={workflowStep === 'content' ? 'bg-blue-600' : 'bg-gray-300'}>4</Badge>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-600">
                        <span>Select Products</span>
                        <span>Choose Keywords</span>
                        <span>Pick Title</span>
                        <span>Generate</span>
                      </div>
                    </div>
                      
                    {/* Basic information section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Information</h3>

                      {/* Region selection - always visible regardless of step */}
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || "us"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No specific region</SelectItem>
                                {regionsQuery.data?.regions.map((region: Region) => (
                                  <SelectItem key={region.id} value={region.id}>
                                    {region.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Target region for content localization
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Content type selection - always visible regardless of step */}
                      <FormField
                        control={form.control}
                        name="articleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select content type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="blog">Blog Post</SelectItem>
                                <SelectItem value="page">Shopify Page</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Blog ID selection if blog type is selected */}
                      {form.watch('articleType') === "blog" && (
                        <FormField
                          control={form.control}
                          name="blogId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Blog</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select blog" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {blogsQuery.data?.blogs.map((blog: Blog) => (
                                    <SelectItem key={blog.id} value={blog.id}>
                                      {blog.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select the blog where this post will be published
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Title field (hidden initially, made visible and populated in title step) */}
                      <div className={workflowStep === 'content' ? 'block' : 'hidden'}>
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Selected Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter a descriptive title" {...field} />
                              </FormControl>
                              <FormMessage />
                              <div className="mt-2">
                                <Button
                                  type="button" 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowTitleSelector(true)}
                                >
                                  Change Title
                                </Button>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Step 1: Product and Collection Selection */}
                      <div className={workflowStep === 'product' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 1: Select Products or Collections</h4>
                          <p className="text-sm text-blue-600">Choose products or collections to feature in your content</p>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="productIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Featured Products</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={productsQuery.data?.products.map(product => ({
                                    label: product.title,
                                    value: product.id
                                  })) || []}
                                  selected={Array.isArray(field.value) ? field.value : []}
                                  onChange={(selected) => {
                                    field.onChange(selected);
                                    handleProductsSelected(selected);
                                  }}
                                  placeholder="Select products to feature in content..."
                                />
                              </FormControl>
                              <FormDescription>
                                Products will be mentioned and linked in your content
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="collectionIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Featured Collections</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={collectionsQuery.data?.collections.map(collection => ({
                                    label: collection.title,
                                    value: collection.id
                                  })) || []}
                                  selected={Array.isArray(field.value) ? field.value : []}
                                  onChange={(selected) => {
                                    field.onChange(selected);
                                    handleCollectionsSelected(selected);
                                  }}
                                  placeholder="Select collections to feature in content..."
                                />
                              </FormControl>
                              <FormDescription>
                                Collections will be mentioned and linked in your content
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            onClick={() => {
                              if (selectedProducts.length > 0 || selectedCollections.length > 0) {
                                setWorkflowStep('keyword');
                                setShowKeywordSelector(true);
                              } else {
                                toast({
                                  title: "Selection Required",
                                  description: "Please select at least one product or collection",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Next: Select Keywords
                          </Button>
                        </div>
                      </div>
                      
                      {/* Step 2: Keyword Selection Section */}
                      <div className={workflowStep === 'keyword' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 2: Choose Keywords</h4>
                          <p className="text-sm text-blue-600 mb-4">
                            Click the button below to select keywords for your content. The selected product will be used to generate relevant keyword suggestions.
                          </p>
                          <Button 
                            onClick={() => setShowKeywordSelector(true)}
                            size="lg"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> 
                            Select Keywords
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 min-h-[40px] border rounded-md p-2 mb-3">
                          {Array.isArray(selectedKeywords) && selectedKeywords.length > 0 ? (
                            selectedKeywords.map((keyword, idx) => (
                              <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                                {keyword?.keyword || ''}
                                {keyword?.searchVolume && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({keyword.searchVolume.toLocaleString()})
                                  </span>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No keywords selected yet</span>
                          )}
                        </div>
                        
                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setWorkflowStep('product')}
                          >
                            Back
                          </Button>
                          
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              className="mr-2"
                              onClick={() => setShowKeywordSelector(true)}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {selectedKeywords.length > 0 ? 'Change Keywords' : 'Select Keywords'}
                            </Button>
                            
                            <Button
                              type="button"
                              onClick={() => {
                                if (selectedKeywords.length > 0) {
                                  setWorkflowStep('title');
                                  setShowTitleSelector(true);
                                } else {
                                  toast({
                                    title: "Keywords Required",
                                    description: "Please select at least one keyword before continuing",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              disabled={selectedKeywords.length === 0}
                            >
                              Next: Choose Title
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 3: Title Selection Section */}
                      <div className={workflowStep === 'title' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 3: Select a Title</h4>
                          <p className="text-sm text-blue-600">Choose from AI-generated title suggestions based on your keywords</p>
                        </div>
                        
                        {form.watch('title') && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <h4 className="font-medium">Selected Title:</h4>
                            <p className="text-lg font-semibold">{form.watch('title')}</p>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setWorkflowStep('keyword')}
                          >
                            Back
                          </Button>
                          
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              className="mr-2"
                              onClick={() => setShowTitleSelector(true)}
                            >
                              <Sparkles className="mr-2 h-4 w-4" />
                              {form.watch('title') ? 'Change Title' : 'Select Title'}
                            </Button>
                            
                            <Button
                              type="button"
                              onClick={() => {
                                if (form.watch('title')) {
                                  setWorkflowStep('content');
                                } else {
                                  toast({
                                    title: "Title Required",
                                    description: "Please select a title before continuing",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              disabled={!form.watch('title')}
                            >
                              Next: Generate Content
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Style and formatting section - Only shown in content step */}
                    <div className={`space-y-4 pt-4 ${workflowStep === 'content' ? 'block' : 'hidden'}`}>
                      <h3 className="text-lg font-medium">Style & Formatting</h3>
                      
                      <FormField
                        control={form.control}
                        name="writingPerspective"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Writing Perspective</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select perspective" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="first_person_plural">We (First Person Plural)</SelectItem>
                                <SelectItem value="first_person_singular">I (First Person Singular)</SelectItem>
                                <SelectItem value="second_person">You (Second Person)</SelectItem>
                                <SelectItem value="third_person">They (Third Person)</SelectItem>
                                <SelectItem value="professional">Professional (Neutral)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="toneOfVoice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tone of Voice</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="neutral">Neutral</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="empathetic">Empathetic</SelectItem>
                                <SelectItem value="casual">Casual</SelectItem>
                                <SelectItem value="excited">Excited</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="humorous">Humorous</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="introType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Introduction Style</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select intro style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard Introduction</SelectItem>
                                <SelectItem value="search_intent">Search Intent Focused</SelectItem>
                                <SelectItem value="none">No Introduction</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="faqType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>FAQ Section</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select FAQ style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No FAQ Section</SelectItem>
                                <SelectItem value="short">Short FAQ (3-5 Q&A)</SelectItem>
                                <SelectItem value="long">Long FAQ (5-7 Q&A)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="enableTables"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Enable Tables
                                </FormLabel>
                                <FormDescription>
                                  Use comparison tables
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="enableLists"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Enable Lists
                                </FormLabel>
                                <FormDescription>
                                  Use bullet points
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="enableH3s"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Enable H3 Headings
                                </FormLabel>
                                <FormDescription>
                                  Use sub-headings
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="enableCitations"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Enable Citations
                                </FormLabel>
                                <FormDescription>
                                  Add external links
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* Keywords section - only visible in final content step */}
                    <div className={`space-y-4 pt-4 ${workflowStep === 'content' ? 'block' : 'hidden'}`}>
                      <h3 className="text-lg font-medium flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                        Selected Keywords
                      </h3>
                        
                      <div className="flex flex-wrap gap-2 min-h-[40px] border rounded-md p-2">
                        {Array.isArray(selectedKeywords) && selectedKeywords.length > 0 ? (
                          selectedKeywords.map((keyword, idx) => (
                            <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                              {keyword?.keyword || ''}
                              {keyword?.searchVolume && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({keyword.searchVolume.toLocaleString()})
                                </span>
                              )}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No keywords selected yet</span>
                        )}
                      </div>
                        
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWorkflowStep('keyword');
                          setShowKeywordSelector(true);
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Change Keywords
                      </Button>
                    </div>
                    
                    {/* Products & Collections section - Temporarily commented out to fix display issues
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-medium flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-500" />
                        Products & Collections
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select products and collections to feature in your content
                      </p>
                      
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="productIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Featured Products</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={productsQuery.data?.products.map(product => ({
                                    label: product.title,
                                    value: product.id
                                  })) || []}
                                  selected={Array.isArray(field.value) ? field.value : []}
                                  onChange={(selected) => {
                                    setSelectedProducts(selected);
                                    field.onChange(selected);
                                    console.log("Products selected:", selected);
                                  }}
                                  placeholder="Select products to feature in content..."
                                />
                              </FormControl>
                              <div className="text-sm text-muted-foreground m-0 mt-1">
                                Products will be mentioned and linked in your content
                                {Array.isArray(field.value) && field.value.length > 0 && (
                                  <div className="font-medium text-foreground mt-1">
                                    {field.value.length} product(s) selected
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <FormField
                          control={form.control}
                          name="collectionIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Featured Collections</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={collectionsQuery.data?.collections.map(collection => ({
                                    label: collection.title,
                                    value: collection.id
                                  })) || []}
                                  selected={Array.isArray(field.value) ? field.value : []}
                                  onChange={(selected) => {
                                    setSelectedCollections(selected);
                                    field.onChange(selected);
                                    console.log("Collections selected:", selected);
                                  }}
                                  placeholder="Select collections to feature in content..."
                                />
                              </FormControl>
                              <div className="text-sm text-muted-foreground m-0 mt-1">
                                Collections will be mentioned and linked in your content
                                {Array.isArray(field.value) && field.value.length > 0 && (
                                  <div className="font-medium text-foreground mt-1">
                                    {field.value.length} collection(s) selected
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    */}
                    
                    {/* Publication section */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-lg font-medium">Publication</h3>
                      
                      <FormField
                        control={form.control}
                        name="postStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publish Status</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Save as Draft</SelectItem>
                                <SelectItem value="publish">Publish Immediately</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="generateImages"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Generate Images
                              </FormLabel>
                              <FormDescription>
                                Select images for your content from Pexels
                              </FormDescription>
                              {field.value && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  className="mt-2" 
                                  onClick={() => setShowImageDialog(true)}
                                >
                                  {Array.isArray(selectedImages) && selectedImages.length > 0 
                                    ? `${selectedImages.length} Image(s) Selected` 
                                    : "Search & Select Images"}
                                </Button>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {/* Scheduled publishing option - Step 4 content */}
                      {workflowStep === 'content' && (
                        <FormField
                          control={form.control}
                          name="scheduledPublishDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-4 space-y-0 mt-2">
                              <FormControl>
                                <div className="flex items-center">
                                  <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        // Set to tomorrow by default
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        tomorrow.setHours(9, 0, 0, 0);
                                        field.onChange(tomorrow.toISOString().split('T')[0]);
                                      } else {
                                        field.onChange(undefined);
                                      }
                                    }}
                                  />
                                  <FormLabel className="ml-2 font-medium">
                                    Schedule for later
                                  </FormLabel>
                                </div>
                              </FormControl>
                              
                              {field.value && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                                  <Input
                                    type="date"
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    className="w-auto"
                                  />
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      )}

                    {/* Image Selection Dialog */}
                      <Dialog 
                        open={showImageDialog} 
                        onOpenChange={(open) => {
                          if (!open) {
                            // Clear search query when dialog closes
                            setImageSearchQuery('');
                          }
                          setShowImageDialog(open);
                        }}>
                        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
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
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-1 border rounded-md bg-slate-50/50">
                                {searchedImages.map(image => (
                                  <div 
                                    key={image.id}
                                    className={`relative rounded-md overflow-hidden cursor-pointer transition-all duration-200 border-2 shadow-sm hover:shadow-md ${
                                      image.selected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent hover:border-slate-300'
                                    }`}
                                    onClick={() => toggleImageSelection(image.id)}
                                  >
                                    <div className="aspect-w-16 aspect-h-9 relative">
                                      <img 
                                        src={image.src?.medium || image.url} 
                                        alt={image.alt || 'Content image'} 
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                    {/* Photographer credit removed as per client request */}
                                    {image.selected && (
                                      <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1.5 shadow-md">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-8 text-center text-muted-foreground">
                                {isSearchingImages ? "Searching for images..." : "Search for images to display results"}
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
                                <div className="flex flex-wrap gap-3">
                                  {selectedImages.map(image => (
                                    <div 
                                      key={image.id} 
                                      className="relative h-20 w-20 rounded-md overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200"
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
                          
                          <DialogFooter>
                            <div className="flex gap-2 ml-auto">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowImageDialog(false)}
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
                    </div>
                    
                    {/* Template Controls */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setTemplateName('');
                          setShowSaveTemplateDialog(true);
                        }}
                      >
                        Save as Template
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowLoadTemplateDialog(true)}
                        disabled={templates.length === 0}
                      >
                        Load Template
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full mt-3" 
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Content...
                        </>
                      ) : "Generate Content"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Content Preview</CardTitle>
                <CardDescription>
                  Preview of your generated content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Generating content with AI. This might take a minute...
                    </p>
                  </div>
                ) : generatedContent ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">{generatedContent.title}</h3>
                      {generatedContent.tags && generatedContent.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {generatedContent.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Display featured image if available */}
                    {generatedContent.featuredImage && (
                      <div className="mb-4">
                        <img 
                          src={generatedContent.featuredImage.src?.medium || generatedContent.featuredImage.url} 
                          alt={generatedContent.featuredImage.alt || generatedContent.title} 
                          className="w-full h-auto rounded-md border"
                        />
                        {/* Photographer credit removed as per client request */}
                      </div>
                    )}
                    
                    <div className="border rounded-md p-4 max-h-[60vh] overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
                    </div>
                    
                    {generatedContent.metaDescription && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold">Meta Description:</h4>
                        <p className="text-sm text-muted-foreground">
                          {generatedContent.metaDescription}
                        </p>
                      </div>
                    )}
                    
                    {generatedContent.contentUrl && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => window.open(generatedContent.contentUrl, '_blank')}
                      >
                        View on Shopify
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-muted-foreground">
                      Content will appear here after generation.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Fill out the form and click "Generate Content" to create new content.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Keyword Selector Dialog */}
          <Dialog open={showKeywordSelector} onOpenChange={setShowKeywordSelector}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Keywords</DialogTitle>
                <DialogDescription>
                  Choose keywords to optimize your content for SEO. Higher search volume keywords typically attract more traffic.
                </DialogDescription>
              </DialogHeader>
              <KeywordSelector
                initialKeywords={selectedKeywords}
                onKeywordsSelected={handleKeywordsSelected}
                onClose={() => setShowKeywordSelector(false)}
                title="Select Keywords for SEO Optimization"
                productTitle={productTitle}
              />
            </DialogContent>
          </Dialog>
          
          {/* Title Selector Dialog */}
          <Dialog open={showTitleSelector} onOpenChange={setShowTitleSelector}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Choose a Title</DialogTitle>
                <DialogDescription>
                  Select a title that incorporates your keywords for better SEO.
                </DialogDescription>
              </DialogHeader>
              
              <TitleSelector 
                open={showTitleSelector}
                onOpenChange={setShowTitleSelector}
                onTitleSelected={handleTitleSelected}
                selectedKeywords={selectedKeywords}
                productTitle={productTitle}
              />
            </DialogContent>
          </Dialog>
          
          {/* Save Template Dialog */}
          <Dialog 
            open={showSaveTemplateDialog} 
            onOpenChange={(open) => {
              if (!open) {
                setTemplateName('');
              }
              setShowSaveTemplateDialog(open);
            }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
                <DialogDescription>
                  Save your current settings as a template for future use
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="templateName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="templateName"
                    value={templateName || ''}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="col-span-3"
                    placeholder="My Template"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveTemplateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    // Save current form values as template
                    if (!templateName) {
                      toast({
                        title: "Template name required",
                        description: "Please enter a name for your template",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    const templateData = {
                      ...form.getValues(),
                      selectedKeywords,
                      selectedProducts,
                      selectedCollections
                    };
                    
                    const updatedTemplates = [...templates, {
                      name: templateName,
                      data: templateData
                    }];
                    
                    setTemplates(updatedTemplates);
                    
                    // Save to localStorage
                    localStorage.setItem('topshop-templates', JSON.stringify(updatedTemplates));
                    
                    setTemplateName('');
                    setShowSaveTemplateDialog(false);
                    
                    toast({
                      title: "Template saved",
                      description: "Your template has been saved successfully",
                      variant: "default"
                    });
                  }}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Load Template Dialog */}
          <Dialog open={showLoadTemplateDialog} onOpenChange={setShowLoadTemplateDialog}>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Load Template</DialogTitle>
                <DialogDescription>
                  Select a saved template to load its settings
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[300px] overflow-y-auto">
                {templates.length > 0 ? (
                  <div className="space-y-2">
                    {templates.map((template, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">{template.name}</div>
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                // Ensure all array values are properly initialized
                                const formDataWithArrays = {
                                  ...template.data,
                                  // Initialize required arrays
                                  productIds: Array.isArray(template.data.productIds) ? template.data.productIds : [],
                                  collectionIds: Array.isArray(template.data.collectionIds) ? template.data.collectionIds : [],
                                  keywords: Array.isArray(template.data.keywords) ? template.data.keywords : []
                                };
                                
                                // Load template data into form
                                form.reset(formDataWithArrays);
                                
                                // Update selected states
                                if (template.data.selectedKeywords) {
                                  setSelectedKeywords(template.data.selectedKeywords);
                                }
                                
                                if (template.data.selectedProducts) {
                                  setSelectedProducts(Array.isArray(template.data.selectedProducts) ? template.data.selectedProducts : []);
                                }
                                
                                if (template.data.selectedCollections) {
                                  setSelectedCollections(Array.isArray(template.data.selectedCollections) ? template.data.selectedCollections : []);
                                }
                                
                                setShowLoadTemplateDialog(false);
                                
                                toast({
                                  title: "Template loaded",
                                  description: "Template settings have been applied",
                                  variant: "default"
                                });
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Load
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                // Remove this template
                                const updatedTemplates = templates.filter((_, i) => i !== index);
                                setTemplates(updatedTemplates);
                                
                                // Update localStorage
                                localStorage.setItem('topshop-templates', JSON.stringify(updatedTemplates));
                                
                                toast({
                                  title: "Template deleted",
                                  description: `"${template.name}" has been removed`,
                                  variant: "default"
                                });
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No saved templates. Save a template first.
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLoadTemplateDialog(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Connections</CardTitle>
              <CardDescription>
                Check the status of your connected services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicesStatusQuery.isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : servicesStatusQuery.data ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(servicesStatusQuery.data.connections as ServiceStatus).map(([service, status]) => (
                    <Card key={service}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center">
                          {status ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          {service.charAt(0).toUpperCase() + service.slice(1)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {status 
                            ? `Connected and working properly.` 
                            : `Not connected or having issues.`}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0">
                        {!status && (
                          <Button variant="outline" size="sm">
                            Fix Connection
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Failed to load service status. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Configure your TopShop SEO application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-12">
                Settings functionality coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}