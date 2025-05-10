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
import { 
  BarChart, 
  Calendar, 
  CalendarCheck,
  CheckCircle, 
  Clock, 
  Copy, 
  Download, 
  ExternalLink, 
  FileText, 
  Loader2, 
  Package, 
  Plus, 
  Save, 
  Sparkles, 
  Trash, 
  X, 
  XCircle 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import KeywordSelector from '@/components/KeywordSelector';
import TitleSelector from '@/components/TitleSelector';
import ImageSearchDialog from '@/components/ImageSearchDialog';
import ImageSearchSuggestions from '@/components/ImageSearchSuggestions';
import CreatePostModal from '@/components/CreatePostModal';

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
  scheduledPublishDate: z.string().optional(), // Added for future scheduling date
  scheduledPublishTime: z.string().optional(),  // Added for future scheduling time
  // Fields needed for scheduling functionality
  publicationType: z.enum(["publish", "schedule", "draft"]).optional(),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  // New fields for content generation
  buyerProfile: z.enum(["auto", "beginner", "intermediate", "advanced"]).default("auto"),
  articleLength: z.enum(["short", "medium", "long", "comprehensive"]).default("medium"),
  headingsCount: z.enum(["2", "3", "4", "5", "6"]).default("3"),
  youtubeUrl: z.string().optional(),
  // Custom category fields
  categories: z.array(z.string()).optional(),
  customCategory: z.string().optional()
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
  body_html?: string;
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

// Predefined categories for content
const predefinedCategories = [
  { id: "featured", name: "Featured" },
  { id: "new", name: "New Arrivals" },
  { id: "selected", name: "Selected" },
  { id: "trending", name: "Trending" },
  { id: "popular", name: "Popular" },
  { id: "seasonal", name: "Seasonal" },
  { id: "sale", name: "On Sale" },
  { id: "guides", name: "Buying Guides" },
  { id: "how-to", name: "How-To" },
];

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
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [productTitle, setProductTitle] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [workflowStep, setWorkflowStep] = useState<'product' | 'keyword' | 'title' | 'content'>('product');
  const [forceUpdate, setForceUpdate] = useState(0); // Used to force UI re-renders
  const [customCategories, setCustomCategories] = useState<{id: string, name: string}[]>(() => {
    // Load custom categories from localStorage
    const savedCategories = localStorage.getItem('topshop-custom-categories');
    return savedCategories ? JSON.parse(savedCategories) : [];
  });
  const [templates, setTemplates] = useState<{name: string, data: any}[]>(() => {
    // Load templates from localStorage on initial render
    const savedTemplates = localStorage.getItem('topshop-templates');
    return savedTemplates ? JSON.parse(savedTemplates) : [];
  });
  const [templateName, setTemplateName] = useState<string>('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showLoadTemplateDialog, setShowLoadTemplateDialog] = useState(false);
  const [imageSearchHistory, setImageSearchHistory] = useState<{query: string, images: PexelsImage[]}[]>([]);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const { toast } = useToast();

  // Default form values
  const defaultValues: Partial<ContentFormValues> = {
    articleType: "blog",
    writingPerspective: "first_person_plural",
    enableTables: true,
    enableLists: true,
    enableH3s: true,
    introType: "search_intent", // Changed from "standard" to "search_intent"
    faqType: "short",
    enableCitations: true,
    toneOfVoice: "friendly",
    postStatus: "draft",
    generateImages: true,
    region: "us", // Default to US region for store
    keywords: [],
    productIds: [], // This needs to be initialized as an empty array
    collectionIds: [], // This needs to be initialized as an empty array
    scheduledPublishTime: "09:30", // Default to 9:30 AM
    blogId: "", // Initialize with empty string to ensure the field exists
    // Scheduling fields
    publicationType: "draft",
    scheduleDate: undefined,
    scheduleTime: "09:30",
    // New fields
    buyerProfile: "auto",
    articleLength: "medium",
    headingsCount: "3",
    youtubeUrl: "",
    // Category fields
    categories: [],
    customCategory: ""
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
  
  // Initialize form defaults when data is loaded
  useEffect(() => {
    // First, ensure we have articleType set to "blog"
    if (!form.getValues('articleType')) {
      form.setValue('articleType', "blog");
    }
    
    // Then set the default blog ID if blogs are loaded and no blog is selected
    if (blogsQuery.data?.blogs && 
        blogsQuery.data.blogs.length > 0 && 
        form.getValues('articleType') === "blog" && 
        !form.getValues('blogId')) {
      form.setValue('blogId', blogsQuery.data.blogs[0].id);
    }
  }, [blogsQuery.data, form]);
  
  // Save custom categories to localStorage when they change
  useEffect(() => {
    localStorage.setItem('topshop-custom-categories', JSON.stringify(customCategories));
  }, [customCategories]);
  
  // Function to add a new custom category
  const addCustomCategory = (name: string) => {
    if (!name.trim()) return;
    
    // Create a slug-like ID from the name
    const id = name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if this category already exists (case insensitive)
    const exists = [...predefinedCategories, ...customCategories]
      .some(cat => cat.name.toLowerCase() === name.trim().toLowerCase());
    
    if (exists) {
      toast({
        title: "Category already exists",
        description: `"${name}" is already in your category list`,
        variant: "destructive"
      });
      return;
    }
    
    // Add the new category
    setCustomCategories(prev => [...prev, { id, name: name.trim() }]);
    
    toast({
      title: "Category added",
      description: `"${name}" added to your categories`,
      variant: "default"
    });
  };

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
    // Save the actual product objects instead of just IDs
    const selectedProductObjects: Product[] = [];
    
    productIds.forEach(id => {
      const product = productsQuery.data?.products.find(p => p.id === id);
      if (product) {
        selectedProductObjects.push(product);
      }
    });
    
    setSelectedProducts(selectedProductObjects);
    
    // Find the primary selected product to use for keyword generation and image suggestions
    if (productIds.length > 0 && selectedProductObjects.length > 0) {
      const primaryProduct = selectedProductObjects[0];
      setProductTitle(primaryProduct.title);
      setProductId(primaryProduct.id);
      
      // Set product description if available
      if (primaryProduct.body_html) {
        // Strip HTML tags for plain text description
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = primaryProduct.body_html;
        setProductDescription(tempDiv.textContent || tempDiv.innerText || '');
      } else {
        setProductDescription('');
      }
    } else {
      // Clear product-related fields if no products selected
      setProductTitle('');
      setProductId('');
      setProductDescription('');
    }
    
    // Update form value with the IDs
    form.setValue('productIds', productIds);
    
    // Move to keyword selection step after product selection
    setWorkflowStep('keyword');
    
    // No longer auto-open keyword selector, let user click the button manually
    // Just update the UI to show that we're in the keyword step now
  };
  
  // Handle collection selection
  const handleCollectionsSelected = (collectionIds: string[]) => {
    // Save the actual collection objects instead of just IDs
    const selectedCollectionObjects: Collection[] = [];
    
    collectionIds.forEach(id => {
      const collection = collectionsQuery.data?.collections.find(c => c.id === id);
      if (collection) {
        selectedCollectionObjects.push(collection);
      }
    });
    
    setSelectedCollections(selectedCollectionObjects);
    
    // Update form value with IDs
    form.setValue('collectionIds', collectionIds);
    
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
    try {
      console.log("Form submission started with values:", values);
      setIsGenerating(true);
      setGeneratedContent(null);
      
      // Validate required fields
      if (!values.title) {
        throw new Error("Please select a title for your content");
      }
      
      if (!values.articleType) {
        throw new Error("Please select an article type");
      }
      
      if (values.articleType === "blog" && !values.blogId) {
        throw new Error("Please select a blog for your content");
      }
      
      if (!Array.isArray(selectedKeywords) || selectedKeywords.length === 0) {
        throw new Error("Please select at least one keyword for SEO optimization");
      }
      
      if (workflowStep !== 'content') {
        console.warn("Attempting to generate content when not in content step. Current step:", workflowStep);
        setWorkflowStep('content');
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure state update
      }
      
      // Determine publication type based on scheduling checkbox
      let publicationType = values.postStatus === "publish" ? "publish" : "draft";
      let scheduleDate: string | undefined = undefined;
      let scheduleTime: string | undefined = undefined;
      
      // Handle scheduling information
      if (values.scheduledPublishDate) {
        // If scheduled, override publication type to schedule and set status to scheduled
        publicationType = "schedule";
        scheduleDate = values.scheduledPublishDate;
        scheduleTime = values.scheduledPublishTime || "09:30";
        
        // Updating both for maximum compatibility with backend
        console.log("Content will be scheduled for", scheduleDate, "at", scheduleTime);
        
        // Add explicit debugging log to confirm scheduling is being set
        console.log("SCHEDULING MODE ACTIVE in AdminPanel form submission", {
          scheduledPublishDate: values.scheduledPublishDate,
          scheduledPublishTime: values.scheduledPublishTime || "09:30",
          publicationType,
          scheduleDate,
          scheduleTime
        });
      }
      
      // Create a safe copy of the form values with guaranteed array values
      const processedData = {
        ...values,
        // Ensure these are always arrays of strings
        productIds: Array.isArray(values.productIds) 
          ? values.productIds.map(id => String(id)) 
          : [],
        collectionIds: Array.isArray(values.collectionIds) 
          ? values.collectionIds.map(id => String(id)) 
          : [],
        keywords: Array.isArray(values.keywords) ? values.keywords : [],
        // Ensure categories are properly included
        categories: Array.isArray(values.categories) ? values.categories : [],
        // Ensure we have these required fields
        articleType: values.articleType || "blog",
        title: values.title || "",
        introType: values.introType || "search_intent",
        region: values.region || "us",
        // Make sure blogId is a string if it exists
        blogId: values.blogId ? String(values.blogId) : undefined,
        
        // Critical scheduling fields - includes multiple formats for compatibility
        // with different parts of the backend
        publicationType,
        status: publicationType === "schedule" ? "scheduled" : (values.postStatus || "draft"),
        scheduleDate,
        scheduleTime,
        scheduledPublishDate: values.scheduledPublishDate || null,
        scheduledPublishTime: values.scheduledPublishTime || (values.scheduledPublishDate ? "09:30" : null),
        
        // If we're scheduling, keep post as draft until scheduled time
        postStatus: publicationType === "schedule" ? "scheduled" : values.postStatus,
        
        // Include content generation option fields
        buyerProfile: values.buyerProfile || "auto",
        articleLength: values.articleLength || "medium",
        headingsCount: values.headingsCount || "3",
        youtubeUrl: values.youtubeUrl || ""
      };
      
      // Extra verification to ensure scheduling works correctly
      if (values.scheduledPublishDate) {
        console.log("Double-checking scheduling data is complete", {
          status: processedData.status,
          postStatus: processedData.postStatus,
          publicationType: processedData.publicationType,
          scheduleDate: processedData.scheduleDate,
          scheduleTime: processedData.scheduleTime,
          scheduledPublishDate: processedData.scheduledPublishDate,
          scheduledPublishTime: processedData.scheduledPublishTime
        });
      }
      
      // Process keywords to ensure they're in the right format
      const processedKeywords = Array.isArray(selectedKeywords)
        ? selectedKeywords.map(kw => ({
            keyword: typeof kw.keyword === 'string' ? kw.keyword : String(kw.keyword || ''),
            searchVolume: typeof kw.searchVolume === 'number' ? kw.searchVolume : 0,
            // Ensure any other properties are included but properly typed
            difficulty: typeof kw.difficulty === 'number' ? kw.difficulty : 0,
            cpc: typeof kw.cpc === 'number' ? kw.cpc : 0
          }))
        : [];
      
      // Add selected image IDs and keywords to form data
      const submitData = {
        ...processedData,
        selectedImageIds: selectedImages.map(img => String(img.id)),
        // Include full keyword data (not just strings) for analysis on the server
        selectedKeywordData: processedKeywords
      };
      
      console.log("Preparing API request to /api/admin/generate-content with data:", submitData);
      
      // Specific try-catch for the API request
      try {
        const response = await apiRequest({
          url: '/api/admin/generate-content',
          method: 'POST',
          data: submitData
        });
        
        console.log("API response received:", response);
        
        if (!response) {
          throw new Error("Received empty response from server");
        }
        
        setGeneratedContent(response);
        
        // Open the CreatePostModal to show the preview with all images
        setCreatePostModalOpen(true);
        
        toast({
          title: "Content generated successfully",
          description: "Your content has been generated and saved.",
          variant: "default"
        });
      } catch (apiError: any) {
        console.error("API request failed:", apiError);
        toast({
          title: "API Request Failed",
          description: apiError?.message || "Could not connect to the server. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Content generation error:", error);
      toast({
        title: "Error generating content",
        description: error?.message || "An unexpected error occurred. Please check your form inputs and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-10">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-800 text-transparent bg-clip-text mb-2">
            TopShop SEO Admin
          </h1>
          <p className="text-muted-foreground">
            Manage content generation, view service status, and configure settings
          </p>
        </div>
        <Button 
          onClick={() => {
            // Ensure we have form data ready before opening the modal
            if (!form.getValues('articleType')) {
              form.setValue('articleType', "blog");
            }
            // Set default blog ID if not already set
            if (!form.getValues('blogId') && blogsQuery.data?.blogs && blogsQuery.data.blogs.length > 0) {
              form.setValue('blogId', blogsQuery.data.blogs[0].id);
            }
            setCreatePostModalOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-800 hover:from-blue-700 hover:to-indigo-900"
        >
          Create New Post
        </Button>
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
                  <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                    {/* Step guidance */}
                    {/* Top button for Load Template */}
                    <div className="flex justify-end mb-4">
                      <Button
                        type="button" 
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLoadTemplateDialog(true)}
                        disabled={templates.length === 0}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Load Template
                      </Button>
                    </div>
                    
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
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Immediately update the form to show/hide the blog selection
                                if (value === "blog" || value === "page") {
                                  form.setValue('articleType', value);
                                }
                              }} 
                              value={field.value || "blog"}
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
                                onValueChange={(value) => {
                                  console.log("Blog changed to:", value);
                                  // Update both the field and form state to ensure consistent updates
                                  field.onChange(value);
                                  // Force update the form with setValue to ensure React picks up the change
                                  form.setValue('blogId', value, { 
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true
                                  });
                                  
                                  // Force a re-render since the select value might not update immediately
                                  setTimeout(() => {
                                    const formState = form.getValues();
                                    console.log("Current form state:", formState);
                                    // Force a re-render to update UI
                                    setForceUpdate(prev => prev + 1);
                                  }, 100);
                                }} 
                                value={field.value || ""} // Use controlled component pattern with fallback
                                defaultValue=""
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full border border-gray-300">
                                    <SelectValue placeholder="Select blog">
                                      {(() => {
                                        // Get blog title from the current value
                                        const currentBlogId = field.value;
                                        if (!currentBlogId || !blogsQuery.data?.blogs) return "Select Blog";
                                        
                                        // Find the selected blog by ID
                                        const selectedBlog = blogsQuery.data.blogs.find(
                                          blog => blog.id === currentBlogId
                                        );
                                        
                                        // Return the blog title or placeholder
                                        return selectedBlog?.title || "Select Blog";
                                      })()}
                                    </SelectValue>
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
                              <FormDescription className="sr-only">
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
                        
                        {/* Always show selected products for reference in content step */}
                        {selectedProducts.length > 0 && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Products used for this content:</h4>
                            <div className="space-y-2">
                              {selectedProducts.map(product => (
                                <div key={product.id} className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm">
                                  {product.image ? (
                                    <img 
                                      src={product.image} 
                                      alt={product.title} 
                                      className="w-10 h-10 object-contain rounded border border-gray-200" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                      <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{product.title}</p>
                                    <p className="text-xs text-gray-500 truncate">Product</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                              
                              {/* Display selected products more prominently */}
                              {selectedProducts.length > 0 && (
                                <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                  <h4 className="font-medium text-sm text-green-700 mb-2">Selected Products:</h4>
                                  <div className="space-y-2">
                                    {selectedProducts.map(product => (
                                      <div key={product.id} className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm">
                                        {product.image ? (
                                          <img 
                                            src={product.image} 
                                            alt={product.title} 
                                            className="w-10 h-10 object-contain rounded border border-gray-200" 
                                          />
                                        ) : (
                                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                            <Package className="h-5 w-5 text-gray-400" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-800 truncate">{product.title}</p>
                                          <p className="text-xs text-gray-500 truncate">Product</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
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
                              
                              {/* Display selected collections more prominently */}
                              {selectedCollections.length > 0 && (
                                <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                                  <h4 className="font-medium text-sm text-green-700 mb-2">Selected Collections:</h4>
                                  <div className="space-y-2">
                                    {selectedCollections.map(collection => (
                                      <div key={collection.id} className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm">
                                        {collection.image ? (
                                          <img 
                                            src={collection.image} 
                                            alt={collection.title} 
                                            className="w-10 h-10 object-contain rounded border border-gray-200" 
                                          />
                                        ) : (
                                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                            <Package className="h-5 w-5 text-gray-400" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-800 truncate">{collection.title}</p>
                                          <p className="text-xs text-gray-500 truncate">Category</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
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
                      
                      {/* Content Generation Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="buyerProfile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Buyer Profile</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select buyer profile" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="auto">Auto (Based on Products)</SelectItem>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Tailors content to the buyer's knowledge level
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="articleLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Article Length</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select article length" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="short">Short (~500 words)</SelectItem>
                                  <SelectItem value="medium">Medium (~800 words)</SelectItem>
                                  <SelectItem value="long">Long (~1200 words)</SelectItem>
                                  <SelectItem value="comprehensive">Comprehensive (~1800 words)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Determines the detail and depth of the content
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="headingsCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Sections</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Number of H2 headings" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="2">2 Sections</SelectItem>
                                  <SelectItem value="3">3 Sections</SelectItem>
                                  <SelectItem value="4">4 Sections</SelectItem>
                                  <SelectItem value="5">5 Sections</SelectItem>
                                  <SelectItem value="6">6 Sections</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Controls how many H2 headings in the article
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="youtubeUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>YouTube Video URL (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Embed a relevant YouTube video in your article
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Categories Multi-select */}
                        <FormField
                          control={form.control}
                          name="categories"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categories</FormLabel>
                              <div className="flex flex-col space-y-3">
                                <div className="flex flex-wrap gap-2 border p-2 rounded-md min-h-[38px]">
                                  {field.value && Array.isArray(field.value) && field.value.length > 0 ? (
                                    field.value.map(category => {
                                      // Find display name for this category
                                      const foundCategory = [...predefinedCategories, ...customCategories]
                                        .find(cat => cat.id === category);
                                        
                                      return (
                                        <Badge
                                          key={category}
                                          variant="secondary"
                                          className="flex items-center gap-1"
                                        >
                                          {foundCategory?.name || category}
                                          <X
                                            className="h-3 w-3 cursor-pointer"
                                            onClick={() => {
                                              // Remove this category - ensure field.value is an array
                                              const currentCategories = Array.isArray(field.value) ? field.value : [];
                                              const updatedCategories = currentCategories.filter(
                                                (cat: string) => cat !== category
                                              );
                                              form.setValue('categories', updatedCategories);
                                            }}
                                          />
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span className="text-sm text-muted-foreground p-1">
                                      No categories selected
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="w-full"
                                        type="button"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Category
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56">
                                      <DropdownMenuLabel>Predefined Categories</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {predefinedCategories.map(category => (
                                        <DropdownMenuItem
                                          key={category.id}
                                          onClick={() => {
                                            const currentCategories = Array.isArray(field.value) ? field.value : [];
                                            
                                            // Only add if not already in the list
                                            if (!currentCategories.includes(category.id)) {
                                              form.setValue('categories', [
                                                ...currentCategories,
                                                category.id
                                              ]);
                                            }
                                          }}
                                        >
                                          {category.name}
                                        </DropdownMenuItem>
                                      ))}
                                      
                                      {customCategories.length > 0 && (
                                        <>
                                          <DropdownMenuLabel>Custom Categories</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          {customCategories.map(category => (
                                            <DropdownMenuItem
                                              key={category.id}
                                              onClick={() => {
                                                const currentCategories = Array.isArray(field.value) ? field.value : [];
                                                
                                                // Only add if not already in the list
                                                if (!currentCategories.includes(category.id)) {
                                                  form.setValue('categories', [
                                                    ...currentCategories,
                                                    category.id
                                                  ]);
                                                }
                                              }}
                                            >
                                              {category.name}
                                            </DropdownMenuItem>
                                          ))}
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <FormDescription className="text-xs">
                                Add categories to organize your content
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Custom Category Input */}
                        <FormField
                          control={form.control}
                          name="customCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Add Custom Category</FormLabel>
                              <div className="flex space-x-2">
                                <FormControl>
                                  <Input
                                    placeholder="Enter new category name"
                                    {...field}
                                    className="flex-1"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (field.value) {
                                      addCustomCategory(field.value);
                                      // Clear the input after adding
                                      form.setValue('customCategory', '');
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                              <FormDescription className="text-xs">
                                Create your own custom categories
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
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
                              value={field.value || "search_intent"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select intro style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="search_intent">Search Intent Focused</SelectItem>
                                <SelectItem value="standard">Standard Introduction</SelectItem>
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
                            <div className="flex items-center gap-2">
                              <FormLabel>Publish Status</FormLabel>
                              {form.getValues('scheduledPublishDate') && (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  <CalendarCheck className="h-3 w-3 mr-1" />
                                  Scheduled
                                </Badge>
                              )}
                            </div>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Update publicationType to match the selected status
                                form.setValue('publicationType', value === 'publish' ? 'publish' : 'draft');
                                
                                // If scheduling is active, ensure it takes precedence
                                if (form.getValues('scheduledPublishDate')) {
                                  form.setValue('publicationType', 'schedule');
                                }
                              }} 
                              defaultValue={field.value}
                              disabled={!!form.getValues('scheduledPublishDate')}
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
                            <FormDescription>
                              Choose whether to publish immediately or save as draft. 
                              <strong>Note:</strong> If "Schedule for later" is checked below, this post will be saved as a draft and published at the scheduled time.
                            </FormDescription>
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
                            <FormItem className="rounded-md border border-slate-200 p-4 mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  <CalendarCheck className="h-5 w-5 text-blue-500 mr-2" />
                                  <FormLabel className="text-lg font-medium">
                                    Schedule for later
                                  </FormLabel>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={!!field.value}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        // Set to tomorrow by default
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        tomorrow.setHours(9, 0, 0, 0);
                                        field.onChange(tomorrow.toISOString().split('T')[0]);
                                        
                                        // Also update the publicationType to indicate scheduling
                                        form.setValue('publicationType', 'schedule');
                                      } else {
                                        field.onChange(undefined);
                                        // Reset publicationType based on postStatus when scheduling is unchecked
                                        const currentPostStatus = form.getValues('postStatus');
                                        form.setValue('publicationType', 
                                          currentPostStatus === 'publish' ? 'publish' : 'draft');
                                      }
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <FormDescription className="mb-3">
                                Set a future date and time when this post should be published automatically on your Shopify store
                              </FormDescription>
                              
                              {field.value && (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-2">
                                  <div className="flex items-center">
                                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                                    <div className="flex flex-col">
                                      <FormLabel className="text-sm mb-1">Publication Date</FormLabel>
                                      <Input
                                        type="date"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="w-44"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-5 w-5 mr-2 text-blue-500" />
                                    <div className="flex flex-col">
                                      <FormLabel className="text-sm mb-1">Publication Time</FormLabel>
                                      <Input
                                        type="time"
                                        value={form.watch('scheduledPublishTime') || "09:30"}
                                        onChange={(e) => form.setValue('scheduledPublishTime', e.target.value)}
                                        className="w-32"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      )}

                    {/* Image Selection Dialog */}
                      <ImageSearchDialog
                        open={showImageDialog}
                        onOpenChange={setShowImageDialog}
                        onImagesSelected={(images) => {
                          setSelectedImages(images);
                          toast({
                            title: `${images.length} image(s) selected`,
                            description: "Images will be included in your content",
                          });
                        }}
                        initialSelectedImages={selectedImages}
                        selectedKeywords={selectedKeywords.map(k => ({
                          keyword: k.keyword,
                          isMainKeyword: k === selectedKeywords[0] // First keyword is main
                        }))}
                      />
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
                    
                    {/* Sticky Generate Content button fixed to bottom of screen */}
                    <div className="sticky bottom-6 left-0 right-0 mt-8 z-10">
                      <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200">
                        <Button 
                          type="button" 
                          className="w-full" 
                          disabled={isGenerating}
                          onClick={() => {
                            // Manually trigger form submission
                            const values = form.getValues();
                            console.log("Manual form submission triggered with values:", values);
                            handleSubmit(values);
                          }}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating Content...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Generate Content
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
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
                      <div className="mb-6">
                        <img 
                          src={generatedContent.featuredImage.src?.medium || generatedContent.featuredImage.url} 
                          alt={generatedContent.featuredImage.alt || generatedContent.title} 
                          className="w-full h-auto rounded-md shadow-md"
                        />
                        {/* Photographer credit removed as per client request */}
                      </div>
                    )}
                    
                    <div className="rounded-md p-5 max-h-[60vh] overflow-y-auto bg-white shadow-sm border border-gray-100">
                      {(() => {
                        // Get content
                        const content = generatedContent.content;
                        if (!content) return <p>No content available</p>;

                        // Get YouTube data if exists
                        const youtubeUrl = form.watch("youtubeUrl");
                        let youtubeVideoId: string | null = null;
                        if (youtubeUrl) {
                          youtubeVideoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1] || null;
                        }
                        
                        // Create YouTube embed component
                        const YouTubeEmbed = () => (
                          <div className="my-8 flex justify-center">
                            <iframe 
                              width="560" 
                              height="315" 
                              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                              title="YouTube video" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                              className="rounded-md border border-gray-200"
                            />
                          </div>
                        );
                        
                        // Check if content has YouTube placeholder
                        const hasYoutubePlaceholder = content.includes('[YOUTUBE_EMBED_PLACEHOLDER]');
                        
                        // If content has placeholder, split and insert YouTube
                        if (youtubeVideoId && hasYoutubePlaceholder) {
                          const parts = content.split('[YOUTUBE_EMBED_PLACEHOLDER]');
                          return (
                            <div className="content-preview prose prose-blue max-w-none">
                              {parts[0] && <div dangerouslySetInnerHTML={{ __html: parts[0] }} />}
                              <YouTubeEmbed />
                              {parts[1] && <div dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                            </div>
                          );
                        } 
                        
                        // Get secondary images
                        const secondaryImages = generatedContent.secondaryImages || [];
                        
                        // Check for image tags in content 
                        const hasImageTags = content.includes('<img');

                        // If content has no YouTube placeholder but has secondary images or image tags
                        if (secondaryImages.length > 0 || hasImageTags) {
                          // Always consider content as having proper images
                          // This ensures embedded images are always preserved
                          const hasProperImages = true;
                          
                          if (hasProperImages) {
                            // Enhanced processing for all content with images
                            let enhancedContent = content;
                            
                            // Process all <a> tags with embedded images to ensure they display properly
                            enhancedContent = enhancedContent.replace(
                              /<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>(\s*)<img([^>]*?)src=["']([^"']+)["']([^>]*?)>(\s*)<\/a>/gi,
                              (match, href, prespace, imgAttr, src, imgAttrEnd, postspace) => {
                                // Ensure src is absolute URL
                                let fixedSrc = src;
                                if (!src.startsWith('http')) {
                                  fixedSrc = 'https://' + src;
                                } else if (src.startsWith('//')) {
                                  fixedSrc = 'https:' + src;
                                }
                                
                                return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; margin: 1.5rem 0;">${prespace}<img${imgAttr}src="${fixedSrc}"${imgAttrEnd} style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 0 auto; display: block; border-radius: 4px;">${postspace}</a>`;
                              }
                            );
                            
                            // Then process any remaining standalone images
                            enhancedContent = enhancedContent
                              // Fix relative image URLs to absolute URLs (adding https:// if missing)
                              .replace(
                                /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                '<img$1src="https://$2"$3>'
                              )
                              // Fix image URLs that might be missing domain (starting with //)
                              .replace(
                                /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                '<img$1src="https://$3"$4>'
                              )
                              // Add styling to all remaining images for proper display
                              .replace(
                                /<img([^>]*?)>/gi, 
                                '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">'
                              );
                            
                            // Return the enhanced content with proper image styling
                            return <div className="content-preview prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: enhancedContent }} />;
                          } else {
                            // Remove any img tags without proper src
                            let cleanedContent = content;
                            if (hasImageTags) {
                              cleanedContent = content.replace(/<img[^>]*?(?!src=["'][^"']+["'])[^>]*?>/gi, '');
                            }
                            
                            // Split into paragraphs
                            const paragraphs = cleanedContent.split(/\n\n+/);
                            const result: React.ReactNode[] = [];
                            let imageIndex = 0;
                            
                            // Process each paragraph, inserting images occasionally
                            paragraphs.forEach((para: string, i: number) => {
                              // Check if paragraph already has image tags
                              const hasImageInParagraph = para.includes('<img');
                              
                              if (para.trim()) {
                                // Process paragraph to ensure proper image handling
                                const processedPara = para
                                  // Fix relative image URLs to absolute URLs (adding https:// if missing)
                                  .replace(
                                    /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$2"$3>'
                                  )
                                  // Fix image URLs that might be missing domain (starting with //)
                                  .replace(
                                    /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$3"$4>'
                                  )
                                  // Add styling to all images for proper display
                                  .replace(
                                    /<img([^>]*?)>/gi, 
                                    '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">'
                                  );
                                
                                result.push(
                                  <div key={`p-${i}`} dangerouslySetInnerHTML={{ __html: processedPara }} />
                                );
                              }
                              
                              // Only insert secondary images if the paragraph doesn't already have images
                              // And do it after every 2-3 paragraphs for optimal spacing
                              if (!hasImageInParagraph && (i + 1) % 2 === 0 && imageIndex < secondaryImages.length) {
                                const image = secondaryImages[imageIndex];
                                result.push(
                                  <div key={`img-${i}`} className="my-6 flex justify-center">
                                    <a href={image.productUrl || "#"} target="_blank" rel="noopener noreferrer">
                                      <img 
                                        src={image.url || (image.src?.medium ?? '')} 
                                        alt={image.alt || `Product image ${imageIndex + 1}`} 
                                        style={{
                                          maxWidth: '100%',
                                          maxHeight: '400px', 
                                          objectFit: 'contain',
                                          margin: '1rem auto',
                                          display: 'block',
                                          borderRadius: '0.375rem'
                                        }}
                                      />
                                    </a>
                                  </div>
                                );
                                imageIndex++;
                              }
                              
                              // Insert YouTube after first or second paragraph if not already inserted via placeholder
                              if (youtubeVideoId && !hasYoutubePlaceholder && (i === 0 || i === 1)) {
                                result.push(<YouTubeEmbed key="youtube" />);
                                // Prevent multiple inserts
                                youtubeVideoId = null;
                              }
                            });
                            
                            return <div className="content-preview prose prose-blue max-w-none">{result}</div>;
                          }
                        }
                        
                        // If no secondary images or YouTube placeholder, handle YouTube separately
                        if (youtubeVideoId && !hasYoutubePlaceholder) {
                          return (
                            <div className="content-preview prose prose-blue max-w-none">
                              <div dangerouslySetInnerHTML={{ 
                                __html: content.substring(0, content.length / 3)
                                  // Fix relative image URLs to absolute URLs (adding https:// if missing)
                                  .replace(
                                    /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$2"$3>'
                                  )
                                  // Fix image URLs that might be missing domain (starting with //)
                                  .replace(
                                    /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$3"$4>'
                                  )
                                  // Add styling to all images for proper display
                                  .replace(
                                    /<img([^>]*?)>/gi, 
                                    '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">'
                                  )
                              }} />
                              <YouTubeEmbed />
                              <div dangerouslySetInnerHTML={{ 
                                __html: content.substring(content.length / 3)
                                  // Fix relative image URLs to absolute URLs (adding https:// if missing)
                                  .replace(
                                    /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$2"$3>'
                                  )
                                  // Fix image URLs that might be missing domain (starting with //)
                                  .replace(
                                    /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                                    '<img$1src="https://$3"$4>'
                                  )
                                  // Add styling to all images for proper display
                                  .replace(
                                    /<img([^>]*?)>/gi, 
                                    '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">'
                                  )
                              }} />
                            </div>
                          );
                        }
                        
                        // Default: ensure content displays correctly with embedded images
                        const processedContent = content
                          // Fix relative image URLs to absolute URLs (adding https:// if missing)
                          .replace(
                            /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                            '<img$1src="https://$2"$3>'
                          )
                          // Fix image URLs that might be missing domain (starting with //)
                          .replace(
                            /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
                            '<img$1src="https://$3"$4>'
                          )
                          // Add styling to all images for proper display
                          .replace(
                            /<img([^>]*?)>/gi, 
                            '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">'
                          );
                        
                        // Return enhanced content with all embedded images properly displayed
                        return <div className="content-preview prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />;
                      })()}
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
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(generatedContent.contentUrl, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View on Shopify
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedContent.contentUrl);
                            toast({
                              title: "Link copied",
                              description: "URL has been copied to clipboard",
                              variant: "default"
                            });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </Button>
                      </div>
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
      
      {/* Create Post Modal */}
      {(() => {
        // Get values beforehand to ensure proper typing
        const blogId = form.getValues('blogId');
        const articleType = form.getValues('articleType') as "blog" | "page";
        const categoriesValue = form.getValues('categories');
        const categories = Array.isArray(categoriesValue) ? categoriesValue : undefined;
        
        return (
          <CreatePostModal
            open={createPostModalOpen}
            onOpenChange={setCreatePostModalOpen}
            initialData={null}
            generatedContent={generatedContent}
            selectedProducts={selectedProducts}
            selectedBlogId={blogId}
            articleType={articleType}
            categories={categories}
          />
        );
      })()}
    </div>
  );
}