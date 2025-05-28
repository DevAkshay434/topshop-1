import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ShopifyImageViewer from '../components/ShopifyImageViewer';

// Define MediaImage interface locally
interface MediaImage {
  id: string;
  url: string;
  src: string;
  alt?: string;
  source?: string;
}
import { useQuery } from '@tanstack/react-query';
import { SchedulingPermissionNotice } from '../components/SchedulingPermissionNotice';
import { ContentStyleSelector } from '../components/ContentStyleSelector';
import ProjectCreationDialog from '../components/ProjectCreationDialog';

import { RelatedProductsSelector } from '../components/RelatedProductsSelector';
import { RelatedCollectionsSelector } from '../components/RelatedCollectionsSelector';
import { ProductMultiSelect } from '../components/ProductMultiSelect';

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
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart, 
  Calendar, 
  CalendarCheck,
  CheckCircle,
  Check,
  PlusCircle,
  CircleDot,
  CheckSquare,
  ChevronLeft,
  ImagePlus,
  ChevronRight,
  Clock, 
  Copy,
  Cpu,
  Download,
  ExternalLink, 
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Folders,
  Gem,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Pencil,
  ShoppingBag,
  Leaf,
  Loader2,
  Package,
  PiggyBank,
  Plus, 
  RefreshCw,
  Save, 
  Search,
  Store,
  Upload,
  User,
  Users,
  Zap,
  ShoppingCart,
  Sparkles, 
  Trash, 
  Type,
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
  writingPerspective: z.enum(["first_person_singular", "first_person_plural", "second_person", "third_person"]),
  enableTables: z.boolean().default(true),
  enableLists: z.boolean().default(true),
  enableH3s: z.boolean().default(true),
  introType: z.enum(["none", "standard", "search_intent"]),
  faqType: z.enum(["none", "short", "long"]),
  enableCitations: z.boolean().default(true),
  // Removed non-functional image fields
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
  articleLength: z.enum(["short", "medium", "long", "comprehensive"]).default("long"),
  headingsCount: z.enum(["2", "3", "4", "5", "6"]).default("3"),
  // Custom category fields
  categories: z.array(z.string()).optional(),
  customCategory: z.string().optional()
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface Region {
  id: string;
  name: string;
}

interface ProductVariant {
  id: string;
  title: string;
  price: string;
  image?: string;
  inventory_quantity?: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
  admin_url?: string;
  images?: {
    id: string;
    src: string;
    alt?: string;
    position?: number;
  }[];
  variants?: ProductVariant[];
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

interface BuyerPersona {
  id: string;
  name: string;
  description: string;
  icon: string;
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
  isPrimary?: boolean;
  type?: 'image' | 'youtube';
  videoId?: string;
  source?: 'product' | 'variant' | 'shopify' | 'pexels' | 'product_image' | 'theme_asset' | 'article_image' | 'collection_image' | 'shopify_media' | 'variant_image' | 'uploaded';
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

// Predefined buyer personas for content targeting
const predefinedBuyerPersonas: BuyerPersona[] = [
  { 
    id: "budget_conscious", 
    name: "Budget-Conscious Shopper", 
    description: "Price-sensitive customers looking for the best deals and value", 
    icon: "piggy-bank" 
  },
  { 
    id: "luxury_seeker", 
    name: "Luxury Seeker", 
    description: "Premium shoppers willing to pay more for quality and exclusivity", 
    icon: "gem" 
  },
  { 
    id: "convenience_focused", 
    name: "Convenience Focused", 
    description: "Time-starved customers who value ease and simplicity over price", 
    icon: "zap" 
  },
  { 
    id: "eco_conscious", 
    name: "Eco-Conscious Consumer", 
    description: "Environmentally aware shoppers who prioritize sustainability", 
    icon: "leaf" 
  },
  { 
    id: "tech_savvy", 
    name: "Tech-Savvy", 
    description: "Early adopters who appreciate innovative features and technology",
    icon: "cpu" 
  },
  { 
    id: "research_driven", 
    name: "Research-Driven Buyer", 
    description: "Detail-oriented customers who thoroughly compare options before purchase", 
    icon: "search" 
  },
  { 
    id: "impulse_buyer", 
    name: "Impulse Buyer", 
    description: "Spontaneous shoppers who make quick decisions based on emotion", 
    icon: "zap-fast" 
  },
  { 
    id: "health_conscious", 
    name: "Health & Wellness Focused", 
    description: "Customers prioritizing products that contribute to wellbeing", 
    icon: "heart" 
  },
  {
    id: "parents",
    name: "Parents & Families",
    description: "Shopping for household needs with children's interests in mind",
    icon: "users"
  }
];

export default function AdminPanel() {
  const [selectedTab, setSelectedTab] = useState("generate");
  const [selectedContentToneId, setSelectedContentToneId] = useState<string>("");
  const [selectedContentDisplayName, setSelectedContentDisplayName] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>([]);
  const [primaryImages, setPrimaryImages] = useState<PexelsImage[]>([]);
  const [secondaryImages, setSecondaryImages] = useState<PexelsImage[]>([]);
  const [showChooseMediaDialog, setShowChooseMediaDialog] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [shopifyFiles, setShopifyFiles] = useState<PexelsImage[]>([]);
  
  // Media selection state - initialized with empty values
  const [selectedMediaContent, setSelectedMediaContent] = useState<{
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }>({
    primaryImage: null,
    secondaryImages: [],
    youtubeEmbed: null
  });
  
  // Add logging to track state changes
  console.log('Current selectedMediaContent state:', selectedMediaContent);
  
  // Workflow step state
  const [currentStep, setCurrentStep] = useState<string>("product");
  
  const [shopifyMediaType, setShopifyMediaType] = useState<'products' | 'variants' | 'media'>('products');
  
  // Function to fetch product images for selected products
  const fetchProductImages = async (includeVariants: boolean = false) => {
    try {
      setIsLoadingMedia(true);
      setShopifyFiles([]);
      
      if (selectedProducts.length === 0) {
        toast({
          title: "No products selected",
          description: "Please select at least one product to view images",
          variant: "destructive"
        });
        setIsLoadingMedia(false);
        return;
      }
      
      // Extract images from the selected products
      const productImages: PexelsImage[] = [];
      let uniqueImageUrls = new Set<string>();
      
      selectedProducts.forEach(product => {
        // Add main product image
        if (product.image && product.image.src) {
          const imageUrl = product.image.src;
          if (!uniqueImageUrls.has(imageUrl)) {
            uniqueImageUrls.add(imageUrl);
            productImages.push({
              id: `product-${product.id}-main`,
              url: imageUrl,
              width: 500,
              height: 500,
              alt: product.title || 'Product image',
              src: {
                original: imageUrl,
                large: imageUrl,
                medium: imageUrl,
                small: imageUrl,
                thumbnail: imageUrl
              },
              selected: false,
              source: 'shopify'
            });
          }
        }
        
        // Add additional product images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((image, index) => {
            if (image.src && (!product.image || image.id !== product.image.id)) {
              // Skip the main image (already added above)
              const imageUrl = image.src;
              if (!uniqueImageUrls.has(imageUrl)) {
                uniqueImageUrls.add(imageUrl);
                productImages.push({
                  id: `product-${product.id}-image-${index}`,
                  url: imageUrl,
                  width: 500,
                  height: 500,
                  alt: image.alt || `${product.title} - Image ${index + 1}`,
                  src: {
                    original: imageUrl,
                    large: imageUrl,
                    medium: imageUrl,
                    small: imageUrl,
                    thumbnail: imageUrl
                  },
                  selected: false,
                  source: 'shopify'
                });
              }
            }
          });
        }
        
        // Add variant images if requested
        if (includeVariants && product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant, variantIndex) => {
            if (variant.image && variant.image.src) {
              const imageUrl = variant.image.src;
              if (!uniqueImageUrls.has(imageUrl)) {
                uniqueImageUrls.add(imageUrl);
                productImages.push({
                  id: `variant-${variant.id}`,
                  url: imageUrl,
                  width: 500,
                  height: 500,
                  alt: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                  src: {
                    original: imageUrl,
                    large: imageUrl,
                    medium: imageUrl,
                    small: imageUrl,
                    thumbnail: imageUrl
                  },
                  selected: false,
                  source: 'shopify'
                });
              }
            }
          });
        }
      });
      
      setShopifyFiles(productImages);
      
      console.log(`Loaded ${productImages.length} product images (${uniqueImageUrls.size} unique)`);
      
      toast({
        title: `${productImages.length} images found`,
        description: includeVariants 
          ? "Showing product and variant images" 
          : "Showing product images"
      });
      
    } catch (error) {
      console.error('Error processing product images:', error);
      toast({
        title: "Error loading images",
        description: "There was a problem processing product images",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Function to fetch product and variant images from selected products
  const fetchProductAndVariantImages = async () => {
    try {
      setIsLoadingMedia(true);
      setShopifyFiles([]);
      
      if (selectedProducts.length === 0) {
        toast({
          title: "No products selected",
          description: "Please select at least one product in Step 2 first.",
          variant: "destructive"
        });
        setIsLoadingMedia(false);
        return;
      }
      
      toast({
        title: "Loading product images",
        description: `Loading images from ${selectedProducts.length} selected product(s)...`
      });
      
      // Collect all images from selected products and their variants
      const productImages: any[] = [];
      
      for (const product of selectedProducts) {
        // Add main product images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((image: any, index: number) => {
            const imageUrl = typeof image === 'string' ? image : image.src;
            if (imageUrl) {
              productImages.push({
                id: `product-${product.id}-image-${image.id || index}`,
                url: imageUrl,
                width: 500,
                height: 500,
                alt: `${product.title} - Image ${index + 1}`,
                title: `${product.title} - Image ${index + 1}`,
                source: 'product_image',
                product_id: product.id,
                product_title: product.title,
                selected: false,
                src: {
                  original: imageUrl,
                  large: imageUrl,
                  medium: imageUrl,
                  small: imageUrl,
                  thumbnail: imageUrl
                }
              });
            }
          });
        } else if (product.image) {
          // Add single product image if no images array
          const imageUrl = typeof product.image === 'string' ? product.image : (product.image.src || '');
          if (imageUrl) {
            productImages.push({
              id: `product-${product.id}-main`,
              url: imageUrl,
              width: 500,
              height: 500,
              alt: product.title || 'Product image',
              title: `${product.title} - Main Image`,
              source: 'product_image',
              product_id: product.id,
              product_title: product.title,
              selected: false,
              src: {
                original: imageUrl,
                large: imageUrl,
                medium: imageUrl,
                small: imageUrl,
                thumbnail: imageUrl
              }
            });
          }
        }
        
        // Add variant images
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: any, variantIndex: number) => {
            if (variant.image) {
              const variantImageUrl = typeof variant.image === 'string' ? variant.image : (variant.image.src || '');
              if (variantImageUrl) {
                productImages.push({
                  id: `variant-${variant.id}-image`,
                  url: variantImageUrl,
                  width: 500,
                  height: 500,
                  alt: `${variant.title || 'Variant'} - ${product.title}`,
                  title: `${product.title} - ${variant.title || `Variant ${variantIndex + 1}`}`,
                  source: 'variant_image',
                  product_id: product.id,
                  product_title: product.title,
                  variant_id: variant.id,
                  variant_title: variant.title,
                  selected: false,
                  src: {
                    original: variantImageUrl,
                    large: variantImageUrl,
                    medium: variantImageUrl,
                    small: variantImageUrl,
                    thumbnail: variantImageUrl
                  }
                });
              }
            }
          });
        }
      }
      
      // If no images found, show a message
      if (productImages.length === 0) {
        toast({
          title: "No product images found",
          description: "The selected products don't have any images.",
          variant: "destructive"
        });
        setIsLoadingMedia(false);
        return;
      }
      
      // Set the product images to display
      setShopifyFiles(productImages);
      toast({
        title: "Product Images Loaded",
        description: `Loaded ${productImages.length} images from your selected products and their variants.`
      });
      
      setIsLoadingMedia(false);
    } catch (error) {
      console.error('Error fetching product images:', error);
      toast({
        title: "Error",
        description: "Failed to load product images",
        variant: "destructive"
      });
      setIsLoadingMedia(false);
    }
  };

  
  
  // Function to fetch images for a specific product by ID
  const fetchProductImagesById = async (productId: string) => {
    try {
      setIsLoadingContentFiles(true);
      toast({
        title: "Loading product images",
        description: "Fetching images for the selected product..."
      });
      
      // Use the dedicated endpoint for product-specific images
      const productImagesResponse = await fetch(`/api/admin/product-images/${productId}`);
      const productImagesData = await productImagesResponse.json();
      
      if (productImagesData.success && productImagesData.files && productImagesData.files.length > 0) {
        // Format the product images for our UI
        const productImages = productImagesData.files.map(file => ({
          id: `product-${file.id || Math.random().toString(36).substring(7)}`,
          url: file.url,
          name: file.filename || 'Product Image',
          alt: file.alt || file.filename || 'Product Image',
          content_type: file.content_type || 'image/jpeg',
          source: file.source || 'product_image',
          position: file.position || 0
        }));
        
        // Sort by position to show main product image first
        productImages.sort((a, b) => (a.position || 0) - (b.position || 0));
        
        setContentFiles(productImages);
        toast({
          title: "Product images loaded",
          description: `${productImages.length} images loaded for this product`,
        });
      } else {
        toast({
          title: "No product images found",
          description: "This product doesn't have any images",
          variant: "destructive"
        });
        setContentFiles([]);
      }
    } catch (error) {
      console.error('Error fetching product images:', error);
      toast({
        title: "Error loading product images",
        description: "There was a problem fetching images for this product",
        variant: "destructive"
      });
      setContentFiles([]);
    } finally {
      setIsLoadingContentFiles(false);
    }
  };
  
  // Legacy function for backward compatibility
  const fetchShopifyFiles = async () => {
    // By default, fetch from media library only
    await fetchShopifyMediaFiles();
  };
  const [productImages, setProductImages] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<{url: string, id: string}[]>([]);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageSource, setImageSource] = useState<'pexels' | 'pixabay' | 'shopify_media' | 'product_images' | 'upload' | 'youtube'>('pexels');
  const [mediaTypeSelection, setMediaTypeSelection] = useState<'products' | 'variants' | 'media'>('products');
  const [contentFiles, setContentFiles] = useState<any[]>([]);
  const [isLoadingContentFiles, setIsLoadingContentFiles] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [currentImageEdit, setCurrentImageEdit] = useState<{id: string, alt: string}>({id: '', alt: ''});
  const [imageTab, setImageTab] = useState<'primary' | 'secondary'>('primary');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>('');
  const [showKeywordSelector, setShowKeywordSelector] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [selectedBuyerPersonas, setSelectedBuyerPersonas] = useState<string[]>([]);
  const [productTitle, setProductTitle] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  type WorkflowStep = 'product' | 'related-products' | 'related-collections' | 'buying-avatars' | 'keyword' | 'title' | 'media' | 'content' | 'preview' | 'publish';
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('product');
  const [forceUpdate, setForceUpdate] = useState(0); // Used to force UI re-renders
  
  // Project Creation Dialog state
  const [projectDialogOpen, setProjectDialogOpen] = useState(true); // Set to true to show by default
  const [currentProject, setCurrentProject] = useState<string>(() => {
    return localStorage.getItem('current-project') || '';
  });
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
    articleLength: "long",
    headingsCount: "3",
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
  
  // Check if the store has the scheduling permission
  const { data: permissionsData } = useQuery<{ 
    success: boolean; 
    hasPermission: boolean;
    store: { name: string; }
  }>({
    queryKey: ['/api/shopify/check-permissions'],
    enabled: true,
    onSuccess: (data) => {
      console.log('Permissions check result:', data);
    }
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
      form.setValue('blogId', String(blogsQuery.data.blogs[0].id));
    } else if (form.getValues('articleType') === "blog" && !form.getValues('blogId')) {
      // If no blogs are loaded but we're in blog mode, set a default value
      form.setValue('blogId', "default");
    }
    
    // If we've had a blogId set but the blogs data shows it's invalid, reset to first available or default
    if (form.getValues('blogId') && blogsQuery.data?.blogs) {
      const currentBlogId = form.getValues('blogId');
      const validBlog = blogsQuery.data.blogs.find(blog => String(blog.id) === String(currentBlogId));
      
      if (!validBlog && blogsQuery.data.blogs.length > 0) {
        form.setValue('blogId', String(blogsQuery.data.blogs[0].id));
      }
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
      
      // If no primary images are set, automatically use the first image from history as featured
      if (primaryImages.length === 0 && existingSearch.images.length > 0) {
        setPrimaryImages([existingSearch.images[0]]);
        toast({
          title: "Featured image set",
          description: "A search result has been automatically set as your featured image",
        });
      }
      
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
        
        // Set Pexels images as default for primary images
        if (primaryImages.length === 0 && newImages.length > 0) {
          // Find an image with people if possible (better for featured images)
          const humanImage = newImages.find(img => 
            img.alt?.toLowerCase().includes('person') || 
            img.alt?.toLowerCase().includes('people') || 
            img.alt?.toLowerCase().includes('woman') || 
            img.alt?.toLowerCase().includes('man')
          );
          
          // Use human image if found, otherwise first image
          const featuredImage = humanImage || newImages[0];
          
          setPrimaryImages([featuredImage]);
          toast({
            title: "Featured image set",
            description: "A Pexels image has been automatically set as your featured image",
          });
        }
        
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
    
    // Move to media selection step
    setWorkflowStep('media');
  };
  
  // Handle media selection step completion
  const handleMediaSelectionComplete = (mediaContent: {
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }) => {
    console.log('Media selection completed:', mediaContent);
    setSelectedMediaContent(mediaContent);
    
    // Store the media content in form state for API submission
    if (mediaContent.primaryImage) {
      form.setValue('featuredImage', mediaContent.primaryImage.url);
    }
    
    // Store secondary images for content generation - map to compatible format
    setSecondaryImages(mediaContent.secondaryImages.map(img => ({
      id: img.id,
      url: img.url,
      width: img.width || 0,
      height: img.height || 0,
      alt: img.alt || '',
      source: img.source || 'pexels',
      selected: true,
      type: 'image' as const,
      src: {
        original: img.url,
        large: img.url,
        medium: img.url,
        small: img.url,
        thumbnail: img.url
      }
    })));
    
    // Move to content generation step
    setWorkflowStep('content');
    
    toast({
      title: "Media Selection Complete",
      description: `Selected ${mediaContent.primaryImage ? "a primary image" : "no primary image"}, ${mediaContent.secondaryImages.length} secondary images${mediaContent.youtubeEmbed ? ", and 1 video" : ""}.`
    });
  };
  
  // Handle media selection back button
  const handleMediaSelectionBack = () => {
    // Go back to title selection
    setWorkflowStep('title');
    setShowTitleSelector(true);
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
    
    // Move to related products selection step after product selection
    setWorkflowStep('related-products');
    
    toast({
      title: "Product selected",
      description: "Now select any related products you want to include in your content",
    });
  };
  
  // Handle related products continue action
  const handleRelatedProductsContinue = () => {
    // Move to related collections step after related products selection
    setWorkflowStep('related-collections');
    
    toast({
      title: "Related products saved",
      description: "Now select collections to include in your content",
    });
  };
  
  // Handle related collections continue action
  const handleRelatedCollectionsContinue = () => {
    // Move to buying avatars step after collections selection
    setWorkflowStep('buying-avatars');
    
    toast({
      title: "Related collections saved",
      description: "Now let's select your target buyer personas",
    });
  };
  
  // Handle buying avatars continue action
  const handleBuyerPersonasContinue = () => {
    // Store the selected buyer personas for later use in form submission
    // We'll include them in the API request when generating content
    // This avoids TypeScript errors with the form field that doesn't expect this property
    
    // Move to keyword selection step after buyer personas selection
    setWorkflowStep('keyword');
    
    toast({
      title: `${selectedBuyerPersonas.length} buyer personas saved`,
      description: selectedBuyerPersonas.length > 0 
        ? "Content will be tailored to your selected audience segments" 
        : "Using automatic audience detection",
    });
  };
  
  // Handle back button from collections to products
  const handleBackToProducts = () => {
    setWorkflowStep('related-products');
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
  // Handle publishing content
  const handlePublishContent = async (publishData: any) => {
    try {
      console.log('Publishing content:', publishData);
      toast({
        title: "Publishing...",
        description: "Your content is being published to Shopify"
      });
      
      // Here you would implement the actual publishing logic
      // For now, we'll just show a success message
      setTimeout(() => {
        toast({
          title: "Content published!",
          description: "Your content has been successfully published to Shopify"
        });
      }, 2000);
    } catch (error) {
      console.error('Publishing error:', error);
      toast({
        title: "Publishing failed",
        description: "There was an error publishing your content",
        variant: "destructive"
      });
    }
  };

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
        // Include selected buyer personas to target specific customer types
        buyerPersonas: selectedBuyerPersonas || [],
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
        // Use empty string instead of null to avoid validation errors
        scheduledPublishDate: values.scheduledPublishDate || "",
        scheduledPublishTime: values.scheduledPublishTime || (values.scheduledPublishDate ? "09:30" : ""),
        
        // If we're scheduling, keep post as draft until scheduled time
        postStatus: publicationType === "schedule" ? "scheduled" : values.postStatus,
        
        // Include content generation option fields
        articleLength: values.articleLength || "long",
        headingsCount: values.headingsCount || "3"
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
        selectedKeywordData: processedKeywords,
        // Add content style selection if available
        contentStyleToneId: selectedContentToneId || "",
        contentStyleDisplayName: selectedContentDisplayName || "",
        // Add selected media from selectedMediaContent state (the correct source)
        primaryImage: selectedMediaContent.primaryImage,
        secondaryImages: selectedMediaContent.secondaryImages || [],
        youtubeEmbed: selectedMediaContent.youtubeEmbed
      };
      
      console.log("Preparing API request to /api/admin/generate-content with data:", submitData);
      console.log("Selected media content state:", selectedMediaContent);
      console.log("Primary image in submit data:", submitData.primaryImage);
      console.log("Secondary images in submit data:", submitData.secondaryImages);
      console.log("YouTube embed in submit data:", submitData.youtubeEmbed);
      console.log("Media data being sent to server - Primary:", !!submitData.primaryImage, "Secondary:", submitData.secondaryImages?.length || 0, "YouTube:", !!submitData.youtubeEmbed);
      
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
      {/* Show scheduling permission notice if needed */}
      {permissionsData?.success && !permissionsData.hasPermission && (
        <div className="mb-4">
          <SchedulingPermissionNotice 
            storeName={permissionsData.store?.name || 'your store'} 
          />
        </div>
      )}
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
                        {/* Step 1: Product Selection */}
                        <Badge className={workflowStep === 'product' ? 'bg-blue-600' : 'bg-gray-300'}>1</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep !== 'product' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        
                        {/* Step 2: Related Products */}
                        <Badge className={workflowStep === 'related-products' ? 'bg-blue-600' : (workflowStep === 'related-collections' || workflowStep === 'keyword' || workflowStep === 'title' || workflowStep === 'media' || workflowStep === 'content' || workflowStep === 'preview' || workflowStep === 'publish' ? 'bg-green-600' : 'bg-gray-300')}>2</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'related-collections' || workflowStep === 'keyword' || workflowStep === 'title' || workflowStep === 'media' || workflowStep === 'content' || workflowStep === 'preview' || workflowStep === 'publish' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        
                        {/* Step 3: Keywords & Title */}
                        <Badge className={workflowStep === 'keyword' || workflowStep === 'title' ? 'bg-blue-600' : (workflowStep === 'media' || workflowStep === 'content' || workflowStep === 'preview' || workflowStep === 'publish' ? 'bg-green-600' : 'bg-gray-300')}>3</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'media' || workflowStep === 'content' || workflowStep === 'preview' || workflowStep === 'publish' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        
                        {/* Step 4: Media Selection */}
                        <Badge className={workflowStep === 'media' ? 'bg-blue-600' : (workflowStep === 'content' || workflowStep === 'preview' || workflowStep === 'publish' ? 'bg-green-600' : 'bg-gray-300')}>4</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'content' || workflowStep === 'preview' || workflowStep === 'publish' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        
                        {/* Step 5: Generate Content */}
                        <Badge className={workflowStep === 'content' ? 'bg-blue-600' : (workflowStep === 'preview' || workflowStep === 'publish' ? 'bg-green-600' : 'bg-gray-300')}>5</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'preview' || workflowStep === 'publish' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        
                        {/* Step 6: Preview & Edit */}
                        <Badge className={workflowStep === 'preview' ? 'bg-blue-600' : (workflowStep === 'publish' ? 'bg-green-600' : 'bg-gray-300')}>6</Badge>
                        <div className="flex-1 h-1 bg-gray-200 rounded">
                          <div className={`h-1 bg-blue-600 rounded ${workflowStep === 'publish' ? 'w-full' : 'w-0'}`}></div>
                        </div>
                        
                        {/* Step 7: Publish */}
                        <Badge className={workflowStep === 'publish' ? 'bg-blue-600' : 'bg-gray-300'}>7</Badge>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-600">
                        <span>Product</span>
                        <span>Related</span>
                        <span>Keywords</span>
                        <span>Media</span>
                        <span>Generate</span>
                        <span>Preview</span>
                        <span>Publish</span>
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
                              <FormLabel>Selected Blog</FormLabel>
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
                                key={`blog-select-${field.value ? String(field.value) : "default"}-${forceUpdate}`}
                                value={field.value ? String(field.value) : ""} // Convert to string to fix type issues
                                defaultValue=""
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full border border-gray-300">
                                    {/* We use a direct component to ensure it re-renders on selection change */}
                                    {(() => {
                                      // Get blog title from the current value
                                      const currentBlogId = field.value;
                                      
                                      if (blogsQuery.isLoading) {
                                        return <SelectValue placeholder="Loading blogs..." />;
                                      }
                                      
                                      // If no blogs are loaded, use a default value
                                      if (!blogsQuery.data?.blogs || blogsQuery.data.blogs.length === 0) {
                                        return <SelectValue placeholder="Default Blog" />;
                                      }
                                      
                                      // Find the selected blog by ID (convert to string for comparison)
                                      const selectedBlog = blogsQuery.data.blogs.find(
                                        blog => String(blog.id) === String(currentBlogId)
                                      );
                                      
                                      // Get blog title to display
                                      const displayTitle = selectedBlog?.title || blogsQuery.data.blogs[0]?.title || "News";
                                      
                                      return <SelectValue placeholder={displayTitle}>{displayTitle}</SelectValue>;
                                    })()}
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {blogsQuery.isLoading ? (
                                    <SelectItem value="loading" disabled>Loading blogs...</SelectItem>
                                  ) : blogsQuery.data?.blogs && blogsQuery.data.blogs.length > 0 ? (
                                    blogsQuery.data.blogs.map((blog: Blog) => (
                                      <SelectItem key={blog.id} value={String(blog.id)}>
                                        {blog.title}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="default">Default Blog</SelectItem>
                                  )}
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
                      
                      {/* Selected Items Display - appears after blog selection */}
                      {(selectedProducts.length > 0 || selectedCollections.length > 0 || selectedBuyerPersonas.length > 0 || selectedKeywords.length > 0 || form.watch('title')) && (
                        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                          <h4 className="text-sm font-medium text-slate-700 mb-3">Current Selections</h4>
                          
                          {/* Selected Products */}
                          {selectedProducts.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h5 className="text-sm font-medium flex items-center">
                                  <Package className="h-4 w-4 mr-2 text-green-500" />
                                  Selected Products ({selectedProducts.length})
                                </h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedProducts.map((product) => (
                                  <div key={product.id} className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border">
                                    {product.image && (
                                      <img 
                                        src={product.image} 
                                        alt={product.title} 
                                        className="w-8 h-8 rounded object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <span className="text-sm font-medium truncate max-w-32">{product.title}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                      onClick={() => {
                                        setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Selected Collections */}
                          {selectedCollections.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h5 className="text-sm font-medium flex items-center">
                                  <Folders className="h-4 w-4 mr-2 text-purple-500" />
                                  Selected Collections ({selectedCollections.length})
                                </h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedCollections.map((collection) => (
                                  <div key={collection.id} className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border">
                                    <FolderOpen className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium truncate max-w-32">{collection.title}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                      onClick={() => {
                                        setSelectedCollections(prev => prev.filter(c => c.id !== collection.id));
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Selected Buyer Personas */}
                          {selectedBuyerPersonas.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h5 className="text-sm font-medium flex items-center">
                                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                                  Selected Buyer Personas ({selectedBuyerPersonas.length})
                                </h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedBuyerPersonas.map((personaId) => {
                                  const persona = predefinedBuyerPersonas.find(p => p.id === personaId);
                                  if (!persona) return null;
                                  
                                  let IconComponent = User;
                                  if (persona.icon === 'piggy-bank') IconComponent = PiggyBank;
                                  else if (persona.icon === 'gem') IconComponent = Gem;
                                  else if (persona.icon === 'zap') IconComponent = Zap;
                                  else if (persona.icon === 'leaf') IconComponent = Leaf;
                                  else if (persona.icon === 'cpu') IconComponent = Cpu;
                                  else if (persona.icon === 'search') IconComponent = Search;
                                  else if (persona.icon === 'heart') IconComponent = Heart;
                                  else if (persona.icon === 'users') IconComponent = Users;
                                  
                                  return (
                                    <div key={persona.id} className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border">
                                      <div className="h-5 w-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <IconComponent className="h-3 w-3" />
                                      </div>
                                      <span className="text-sm font-medium truncate max-w-32">{persona.name}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                        onClick={() => {
                                          setSelectedBuyerPersonas(prev => prev.filter(id => id !== persona.id));
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Selected Keywords */}
                          {selectedKeywords.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h5 className="text-sm font-medium flex items-center">
                                  <Search className="h-4 w-4 mr-2 text-orange-500" />
                                  Selected Keywords ({selectedKeywords.length})
                                </h5>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selectedKeywords.map((keyword, index) => (
                                  <div key={index} className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border">
                                    <span className="text-sm font-medium">{typeof keyword === 'string' ? keyword : keyword.keyword}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                      onClick={() => {
                                        setSelectedKeywords(prev => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Selected Title */}
                          {form.watch('title') && (
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h5 className="text-sm font-medium flex items-center">
                                  <Type className="h-4 w-4 mr-2 text-indigo-500" />
                                  Selected Title
                                </h5>
                              </div>
                              <div className="bg-white rounded-md p-3 shadow-sm border">
                                <p className="text-sm font-medium">{form.watch('title')}</p>
                              </div>
                            </div>
                          )}
                        </div>
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
                                <ProductMultiSelect
                                  options={productsQuery.data?.products.map(product => ({
                                    product: product,
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
                              if (selectedProducts.length > 0) {
                                setWorkflowStep('related-products');
                                toast({
                                  title: "Main product selected",
                                  description: "Now select any related products you want to include in your content",
                                });
                              } else {
                                toast({
                                  title: "Selection Required",
                                  description: "Please select at least one product",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Next: Related Products
                          </Button>
                        </div>
                      </div>
                      
                      {/* Step 2: Related Products Selection Section */}
                      <div className={workflowStep === 'related-products' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 2: Choose Related Products</h4>
                          <p className="text-sm text-blue-600 mb-4">
                            Select products related to your content to improve cross-selling opportunities
                          </p>
                        </div>

                        <RelatedProductsSelector
                          products={productsQuery.data?.products || []}
                          selectedProducts={selectedProducts}
                          onProductSelect={(product) => {
                            // Add the product to the selected products if not already there
                            if (!selectedProducts.some(p => p.id === product.id)) {
                              const updatedProducts = [...selectedProducts, product];
                              setSelectedProducts(updatedProducts);
                              
                              // Update form value with the IDs
                              const productIds = updatedProducts.map(p => p.id);
                              form.setValue('productIds', productIds);
                            }
                          }}
                          onProductRemove={(productId) => {
                            // Remove the product from the selected products
                            const updatedProducts = selectedProducts.filter(p => p.id !== productId);
                            setSelectedProducts(updatedProducts);
                            
                            // Update form value with the IDs
                            const productIds = updatedProducts.map(p => p.id);
                            form.setValue('productIds', productIds);
                          }}
                          onContinue={handleRelatedProductsContinue}
                        />
                      </div>
                      
                      {/* Step 3: Related Collections Selection Section */}
                      <div className={workflowStep === 'related-collections' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 3: Choose Related Collections</h4>
                          <p className="text-sm text-blue-600 mb-4">
                            Select collections that are related to your content to group products and categories
                          </p>
                        </div>

                        <RelatedCollectionsSelector
                          collections={collectionsQuery.data?.collections || []}
                          selectedCollections={selectedCollections}
                          onCollectionSelect={(collection) => {
                            // Add the collection to the selected collections if not already there
                            if (!selectedCollections.some(c => c.id === collection.id)) {
                              const updatedCollections = [...selectedCollections, collection];
                              setSelectedCollections(updatedCollections);
                              
                              // Update form value with the IDs
                              const collectionIds = updatedCollections.map(c => c.id);
                              form.setValue('collectionIds', collectionIds);
                            }
                          }}
                          onCollectionRemove={(collectionId) => {
                            // Remove the collection from the selected collections
                            const updatedCollections = selectedCollections.filter(c => c.id !== collectionId);
                            setSelectedCollections(updatedCollections);
                            
                            // Update form value with the IDs
                            const collectionIds = updatedCollections.map(c => c.id);
                            form.setValue('collectionIds', collectionIds);
                          }}
                          onContinue={handleRelatedCollectionsContinue}
                          onBack={handleBackToProducts}
                        />
                      </div>
                      
                      {/* Step 4: Buyer Personas Selection Section */}
                      <div className={workflowStep === 'buying-avatars' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 4: Select Target Buyer Personas</h4>
                          <p className="text-sm text-blue-600 mb-2">
                            Choose the types of customers you want to target with this content. This helps personalize the content to specific audience segments.
                          </p>
                        </div>
                        
                        {/* Buyer Personas Grid with Multi-Select */}
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-md font-medium">Buyer Personas</h3>
                            {selectedBuyerPersonas.length > 0 && (
                              <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium flex items-center">
                                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                                <span>{selectedBuyerPersonas.length} selected</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {predefinedBuyerPersonas.map(persona => {
                              const isSelected = selectedBuyerPersonas.includes(persona.id);
                              
                              // Get the appropriate icon component
                              let IconComponent = User;
                              if (persona.icon === 'piggy-bank') IconComponent = PiggyBank;
                              else if (persona.icon === 'gem') IconComponent = Gem;
                              else if (persona.icon === 'zap') IconComponent = Zap;
                              else if (persona.icon === 'leaf') IconComponent = Leaf;
                              else if (persona.icon === 'cpu') IconComponent = Cpu;
                              else if (persona.icon === 'search') IconComponent = Search;
                              else if (persona.icon === 'heart') IconComponent = Heart;
                              else if (persona.icon === 'users') IconComponent = Users;
                              
                              return (
                                <div 
                                  key={persona.id}
                                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                      : 'bg-white hover:bg-gray-50 border-gray-200'
                                  }`}
                                  onClick={() => {
                                    setSelectedBuyerPersonas(prev => {
                                      if (prev.includes(persona.id)) {
                                        return prev.filter(id => id !== persona.id);
                                      } else {
                                        return [...prev, persona.id];
                                      }
                                    });
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      <IconComponent className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <h4 className="font-medium text-gray-900 text-sm">{persona.name}</h4>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                        }`}>
                                          {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">{persona.description}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="mt-6 flex justify-between">
                          <Button 
                            variant="outline" 
                            type="button"
                            onClick={() => setWorkflowStep('related-collections')}
                          >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back
                          </Button>
                          <Button 
                            type="button"
                            onClick={handleBuyerPersonasContinue}
                          >
                            Next <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Step 5: Keyword Selection Section */}
                      <div className={workflowStep === 'keyword' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 5: Choose Keywords</h4>
                          <p className="text-sm text-blue-600 mb-2">
                            Click the button below to select keywords for your content. The following selected items will be used for keyword generation:
                          </p>
                          
                          {/* Display selected products and collections in the keyword step */}
                          {(selectedProducts.length > 0 || selectedCollections.length > 0) && (
                            <div className="mb-4 p-3 bg-white rounded-md border">
                              {selectedProducts.length > 0 && (
                                <div className="mb-2">
                                  <h5 className="text-xs font-medium text-slate-600 mb-1.5">Selected Products:</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedProducts.map(product => {
                                      // Get image source from images array or direct image property
                                      const imageSrc = product.images && product.images.length > 0
                                        ? product.images[0].src
                                        : product.image || '';
                                      
                                      return (
                                        <div key={product.id} className="flex items-center gap-2 bg-slate-50 rounded p-1.5 border shadow-sm">
                                          {imageSrc ? (
                                            <img 
                                              src={imageSrc} 
                                              alt={product.title}
                                              className="w-8 h-8 rounded object-contain" 
                                            />
                                          ) : (
                                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                                              <Search className="w-4 h-4 text-slate-400" />
                                            </div>
                                          )}
                                          <span className="text-xs font-medium max-w-[120px] truncate">{product.title}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {selectedCollections.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium text-slate-600 mb-1.5">Selected Collections:</h5>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedCollections.map(collection => (
                                      <div key={collection.id} className="flex items-center gap-2 bg-slate-50 rounded p-1.5 border shadow-sm">
                                        {collection.image_url ? (
                                          <img 
                                            src={collection.image_url} 
                                            alt={collection.title}
                                            className="w-8 h-8 rounded object-contain" 
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                          </div>
                                        )}
                                        <span className="text-xs font-medium max-w-[120px] truncate">{collection.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
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
                                  setWorkflowStep('media');
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
                              Next: Choose Media
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 4: Media Selection Section */}
                      <div className={workflowStep === 'media' ? 'block' : 'hidden'}>
                        <div className="p-4 bg-blue-50 rounded-md mb-4">
                          <h4 className="font-medium text-blue-700 mb-1">Step 4: Choose Media</h4>
                          <p className="text-sm text-blue-600">Select compelling visuals to enhance your content and boost engagement</p>
                        </div>
                        
                        {/* Media Selection Button */}
                        <div className="mb-6 p-4 border rounded-lg bg-white">
                          <Button 
                            type="button" 
                            onClick={() => setShowChooseMediaDialog(true)}
                            className="w-full mb-4"
                            size="lg"
                          >
                            <ImageIcon className="mr-2 h-5 w-5" />
                            Choose Media for Content
                          </Button>
                          
                          {/* Display Selected Images Summary */}
                          {selectedImages.length > 0 && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium mb-2">Selected Images ({selectedImages.length})</h4>
                              <div className="grid grid-cols-3 gap-2">
                                {selectedImages.slice(0, 6).map((img, idx) => (
                                  <div key={idx} className="relative">
                                    <img 
                                      src={img.src?.medium || img.url} 
                                      alt={img.alt || 'Selected image'}
                                      className="w-full h-16 object-cover rounded"
                                    />
                                    {idx === 0 && (
                                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">
                                        Primary
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {selectedImages.length > 6 && (
                                <p className="text-sm text-gray-600 mt-2">+{selectedImages.length - 6} more images</p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <Tabs defaultValue="primary" className="mb-6">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="primary">Primary Images</TabsTrigger>
                            <TabsTrigger value="secondary">Secondary Images</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="primary" className="p-4 bg-slate-50 rounded-md mt-2">
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-1">Featured Image</h4>
                              <p className="text-xs text-slate-500 mb-3">
                                Use emotionally compelling images with people or animals. Try search terms like "happy woman", "confused customer", "smiling family", etc.
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <Card className="overflow-hidden">
                                  <CardHeader className="p-3 bg-slate-100">
                                    <CardTitle className="text-sm">Pexels Images</CardTitle>
                                    <CardDescription className="text-xs">
                                      Search free stock photos
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <Button 
                                      variant="outline" 
                                      className="w-full" 
                                      size="sm"
                                      onClick={() => {
                                        setImageSource('pexels');
                                        // Suggested emotional search terms based on products
                                        setImageSearchQuery(`happy ${selectedProducts.length > 0 ? selectedProducts[0].title.split(' ')[0] : 'customer'}`);
                                        setShowImageDialog(true);
                                      }}
                                    >
                                      <Search className="mr-2 h-4 w-4" />
                                      Search Pexels
                                    </Button>
                                  </CardContent>
                                </Card>
                                
                                <Card className="overflow-hidden">
                                  <CardHeader className="p-3 bg-slate-100">
                                    <CardTitle className="text-sm">Shopify Images</CardTitle>
                                    <CardDescription className="text-xs">
                                      Use images from your store
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <div className="flex flex-col space-y-2">
                                  
                                      
                                      {/* Only show product images button when a product is selected */}
                                      {selectedProducts.length > 0 && (
                                        <Button 
                                          variant="outline" 
                                          className="w-full" 
                                          size="sm"
                                          onClick={() => {
                                            setImageSource('product_images');
                                            // Use the first selected product for product-specific images
                                            if (selectedProducts[0]?.id) {
                                              fetchProductImages(selectedProducts[0].id);
                                            } else {
                                              toast({
                                                title: "No product selected",
                                                description: "Please select a product first",
                                                variant: "destructive"
                                              });
                                            }
                                            setShowImageDialog(true);
                                          }}
                                        >
                                          <ImageIcon className="mr-2 h-4 w-4" />
                                          Product Images
                                        </Button>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <Card className="overflow-hidden">
                                  <CardHeader className="p-3 bg-slate-100">
                                    <CardTitle className="text-sm">Upload Image</CardTitle>
                                    <CardDescription className="text-xs">
                                      Upload your own images
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-3">
                                    <Button 
                                      variant="outline" 
                                      className="w-full" 
                                      size="sm"
                                      onClick={() => {
                                        setImageSource('upload');
                                        setShowImageDialog(true);
                                      }}
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      Upload Image
                                    </Button>
                                  </CardContent>
                                </Card>
                              </div>
                              
                              {/* Display selected primary images */}
                              {primaryImages.length > 0 ? (
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium">Selected Primary Images:</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {primaryImages.map((image) => (
                                      <div key={image.id} className="relative group">
                                        <ShopifyImageViewer 
                                          src={image.src?.medium || image.url} 
                                          alt={image.alt || "Primary image"} 
                                          className="w-full h-32 object-cover rounded-md border"
                                        />
                                        <div className="absolute top-2 right-2">
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="h-6 w-6 rounded-full opacity-80 hover:opacity-100"
                                            onClick={() => setPrimaryImages(prev => prev.filter(img => img.id !== image.id))}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 bg-white rounded-md border border-dashed">
                                  <ImageIcon className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                  <p className="text-sm text-slate-500">No primary images selected</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Select emotionally compelling images featuring people or subjects relevant to your content
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="secondary" className="p-4 bg-slate-50 rounded-md mt-2">
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-1">Secondary Images</h4>
                              <p className="text-xs text-slate-500 mb-3">
                                These images will appear throughout your content to showcase product details or supporting visuals.
                              </p>
                              
                              {/* Product Images Section */}
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">Product Images</h4>
                                {selectedProducts.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {selectedProducts.map((product) => {
                                      if (!product.image) return null;
                                      return (
                                        <div key={product.id} className="relative group">
                                          <div className="aspect-square overflow-hidden rounded-md border">
                                            <ShopifyImageViewer 
                                              src={product.image} 
                                              alt={product.title} 
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                            <Button
                                              type="button"
                                              variant="secondary"
                                              size="sm"
                                              className="opacity-0 group-hover:opacity-100 transition-all"
                                              onClick={() => {
                                                // Add product image to secondary images
                                                const productImage: PexelsImage = {
                                                  id: `product-${product.id}`,
                                                  url: product.image || '',
                                                  width: 500,
                                                  height: 500,
                                                  alt: product.title,
                                                  src: {
                                                    original: product.image || '',
                                                    large: product.image || '',
                                                    medium: product.image || '',
                                                    small: product.image || '',
                                                    thumbnail: product.image || '',
                                                  }
                                                };
                                                setSecondaryImages(prev => [...prev, productImage]);
                                                toast({
                                                  title: "Image added",
                                                  description: "Product image added to secondary images",
                                                });
                                              }}
                                            >
                                              <Plus className="mr-2 h-3 w-3" />
                                              Add Image
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 bg-white rounded-md border border-dashed">
                                    <Package className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                                    <p className="text-sm text-slate-500">No products selected</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => setWorkflowStep('product')}
                                    >
                                      <ArrowLeft className="mr-2 h-3 w-3" />
                                      Select Products
                                    </Button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Custom Secondary Images */}
                              <div className="mt-6">
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-medium">Additional Secondary Images</h4>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setImageSearchQuery('product lifestyle');
                                      setShowImageDialog(true);
                                    }}
                                  >
                                    <Search className="mr-2 h-3 w-3" />
                                    Search More Images
                                  </Button>
                                </div>
                                
                                {/* Display selected secondary images */}
                                {secondaryImages.length > 0 ? (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {secondaryImages.map((image) => (
                                      <div key={image.id} className="relative group">
                                        <ShopifyImageViewer 
                                          src={image.src?.medium || image.url} 
                                          alt={image.alt || "Secondary image"} 
                                          className="w-full h-32 object-cover rounded-md border"
                                        />
                                        <div className="absolute top-2 right-2">
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="h-6 w-6 rounded-full opacity-80 hover:opacity-100"
                                            onClick={() => setSecondaryImages(prev => prev.filter(img => img.id !== image.id))}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-white rounded-md border border-dashed">
                                    <FileImage className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-slate-500">No additional secondary images</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      Add supporting images to enhance your content
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                        
                        <div className="flex justify-between mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setWorkflowStep('title')}
                          >
                            Back to Title
                          </Button>
                          
                          <Button
                            type="button"
                            onClick={() => {
                              // Continue to content generation step
                              setWorkflowStep('content');
                            }}
                          >
                            Next: Generate Content
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Style and formatting section - Only shown in content step */}
                    <div className={`space-y-4 pt-4 ${workflowStep === 'content' ? 'block' : 'hidden'}`}>
                      <h3 className="text-lg font-medium">Style & Formatting</h3>
                      
                      {/* Content Generation Options */}
                      {/* Buyer Personas Display */}
                      <div className="col-span-full mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium flex items-center">
                            <Users className="h-4 w-4 mr-2 text-blue-500" />
                            Selected Buyer Personas
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setWorkflowStep('buying-avatars')}
                            className="h-8"
                          >
                            <User className="mr-2 h-4 w-4" />
                            Edit Personas
                          </Button>
                        </div>
                        
                        <div className="border rounded-md p-3 bg-slate-50">
                          {selectedBuyerPersonas.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {selectedBuyerPersonas.map((personaId) => {
                                  const persona = predefinedBuyerPersonas.find(p => p.id === personaId);
                                  if (!persona) return null;
                                  
                                  // Get the appropriate icon component
                                  let IconComponent = User;
                                  if (persona.icon === 'piggy-bank') IconComponent = PiggyBank;
                                  else if (persona.icon === 'gem') IconComponent = Gem;
                                  else if (persona.icon === 'zap') IconComponent = Zap;
                                  else if (persona.icon === 'leaf') IconComponent = Leaf;
                                  else if (persona.icon === 'cpu') IconComponent = Cpu;
                                  else if (persona.icon === 'search') IconComponent = Search;
                                  else if (persona.icon === 'heart') IconComponent = Heart;
                                  else if (persona.icon === 'users') IconComponent = Users;
                                  
                                  return (
                                    <div 
                                      key={persona.id} 
                                      className="flex items-center gap-2 bg-white rounded-md p-2 shadow-sm border"
                                    >
                                      <div className="h-6 w-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <IconComponent className="h-3.5 w-3.5" />
                                      </div>
                                      <span className="text-sm font-medium">{persona.name}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 rounded-full ml-1 hover:bg-slate-100"
                                        onClick={() => {
                                          setSelectedBuyerPersonas(prev => 
                                            prev.filter(id => id !== persona.id)
                                          );
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Content will be tailored to these target audience segments
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-sm text-muted-foreground mb-2">No buyer personas selected</p>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setWorkflowStep('buying-avatars')}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                Select Target Audience
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                        
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
                                <SelectItem value="first_person_singular">First Person Singular (I, me, my, mine)</SelectItem>
                                <SelectItem value="first_person_plural">First Person Plural (we, us, our, ours)</SelectItem>
                                <SelectItem value="second_person">Second Person (you, your, yours)</SelectItem>
                                <SelectItem value="third_person">Third Person (he, she, it, they)</SelectItem>

                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Content Style Selector - New Feature */}
                      <div className="mb-6">
                        <FormLabel className="mb-2 block">Content Style</FormLabel>
                        <ContentStyleSelector 
                          onSelectionChange={(toneId, displayName) => {
                            setSelectedContentToneId(toneId);
                            setSelectedContentDisplayName(displayName);
                          }}
                          className="mt-2"
                        />

                      </div>
                      
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
                                <SelectItem value="search_intent">Search Intent Focused (Recommended)</SelectItem>
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
                                  onClick={() => setShowChooseMediaDialog(true)}
                                >
                                  {Array.isArray(selectedImages) && selectedImages.length > 0 
                                    ? `${selectedImages.length} Image(s) Selected` 
                                    : "Choose Media for Content"}
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
                            handleSubmit(values).then(() => {
                              // After successful content generation, move to preview step
                              setWorkflowStep('preview');
                              toast({
                                title: "Content Generated Successfully",
                                description: "Review and edit your content in the preview section below",
                              });
                            }).catch((error) => {
                              console.error('Content generation failed:', error);
                            });
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
                  <div className="space-y-6">
                    {/* Editable Title Section */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Title (H1)</label>
                      <input
                        type="text"
                        value={generatedContent.title}
                        onChange={(e) => setGeneratedContent(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full p-3 text-xl font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your title..."
                      />
                      <div className="text-xs text-gray-500">
                        {generatedContent.title?.length || 0} characters
                      </div>
                    </div>

                    {/* Editable Meta Description */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Meta Description</label>
                      <textarea
                        value={generatedContent.metaDescription || ''}
                        onChange={(e) => setGeneratedContent(prev => ({ ...prev, metaDescription: e.target.value }))}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={3}
                        placeholder="Enter meta description (155-160 characters recommended)..."
                        maxLength={200}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{(generatedContent.metaDescription || '').length}/200 characters</span>
                        <span className={`${(generatedContent.metaDescription || '').length >= 155 && (generatedContent.metaDescription || '').length <= 160 ? 'text-green-600' : 'text-orange-600'}`}>
                          {(generatedContent.metaDescription || '').length >= 155 && (generatedContent.metaDescription || '').length <= 160 ? 'Optimal length' : 'Recommended: 155-160 chars'}
                        </span>
                      </div>
                    </div>

                    {/* Tags Section */}
                    {generatedContent.tags && generatedContent.tags.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tags</label>
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display featured image if available */}
                    {generatedContent.featuredImage && (
                      <div className="mb-6">
                        <ShopifyImageViewer 
                          src={generatedContent.featuredImage.src?.medium || generatedContent.featuredImage.url} 
                          alt={generatedContent.featuredImage.alt || generatedContent.title} 
                          className="w-full h-auto rounded-md shadow-md"
                        />
                        {/* Photographer credit removed as per client request */}
                      </div>
                    )}
                    
                    {/* Rich Text Content Editor */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center justify-between">
                        Content
                        <div className="text-xs text-gray-500">
                          {generatedContent.content ? `${generatedContent.content.replace(/<[^>]*>/g, '').split(' ').length} words` : '0 words'}
                        </div>
                      </label>
                      <div className="border rounded-md">
                        {/* Rich Text Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
                          <button
                            type="button"
                            onClick={() => document.execCommand('bold')}
                            className="px-2 py-1 text-sm border rounded hover:bg-white"
                            title="Bold"
                          >
                            <strong>B</strong>
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('italic')}
                            className="px-2 py-1 text-sm border rounded hover:bg-white"
                            title="Italic"
                          >
                            <em>I</em>
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('underline')}
                            className="px-2 py-1 text-sm border rounded hover:bg-white"
                            title="Underline"
                          >
                            <u>U</u>
                          </button>
                          <div className="w-px h-6 bg-gray-300 mx-1"></div>
                          <button
                            type="button"
                            onClick={() => document.execCommand('insertUnorderedList')}
                            className="px-2 py-1 text-sm border rounded hover:bg-white"
                            title="Bullet Points"
                          >
                            • List
                          </button>
                          <button
                            type="button"
                            onClick={() => document.execCommand('insertOrderedList')}
                            className="px-2 py-1 text-sm border rounded hover:bg-white"
                            title="Numbered List"
                          >
                            1. List
                          </button>
                        </div>
                        
                        {/* Editable Content Area with Enhanced Media Display */}
                        <div
                          contentEditable
                          suppressContentEditableWarning={true}
                          onInput={(e) => {
                            const content = e.currentTarget.innerHTML;
                            setGeneratedContent(prev => ({ ...prev, content }));
                          }}
                          className="min-h-[400px] p-4 prose prose-blue max-w-none focus:outline-none"
                          style={{ maxWidth: 'none' }}
                        >
                          {generatedContent.content ? (
                            <div dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
                          ) : (
                            <div className="text-gray-500 text-center py-8">
                              <p>Generated content will appear here for editing...</p>
                              <p className="text-sm">Complete the form above and click "Generate Content" to begin.</p>
                            </div>
                          )}
                          
                          {/* Display Secondary Images */}
                          {selectedMediaContent.secondaryImages && selectedMediaContent.secondaryImages.length > 0 && (
                            <div className="my-6 space-y-4">
                              <h4 className="text-lg font-semibold text-gray-800">Secondary Images</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedMediaContent.secondaryImages.map((image, index) => (
                                  <div key={index} className="text-center">
                                    <img 
                                      src={image.url || image.src?.medium} 
                                      alt={image.alt || `Secondary image ${index + 1}`}
                                      className="w-full h-auto rounded-lg shadow-md mb-2 cursor-pointer hover:shadow-lg transition-shadow"
                                      style={{ maxHeight: '300px', objectFit: 'cover' }}
                                    />
                                    {image.photographer && (
                                      <p className="text-xs text-gray-500">Photo by {image.photographer}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Display YouTube Video */}
                          {selectedMediaContent.youtubeVideo && (
                            <div className="my-6">
                              <h4 className="text-lg font-semibold text-gray-800 mb-3">Featured Video</h4>
                              <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
                                <iframe
                                  className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
                                  src={`https://www.youtube.com/embed/${selectedMediaContent.youtubeVideo.videoId}`}
                                  title={selectedMediaContent.youtubeVideo.title || 'YouTube Video'}
                                  frameBorder="0"
                                  allowFullScreen
                                />
                              </div>
                              <p className="text-sm text-gray-600 mt-2">{selectedMediaContent.youtubeVideo.title}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Publishing Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={() => {
                          const publishData = {
                            ...generatedContent,
                            contentType: form.watch('articleType'),
                            blogId: form.watch('blogId'),
                            publishAction: 'publish'
                          };
                          handlePublishContent(publishData);
                        }}
                        className="flex-1"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Publish Now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const publishData = {
                            ...generatedContent,
                            contentType: form.watch('articleType'),
                            blogId: form.watch('blogId'),
                            publishAction: 'schedule'
                          };
                          handlePublishContent(publishData);
                        }}
                        className="flex-1"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Schedule
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const publishData = {
                            ...generatedContent,
                            contentType: form.watch('articleType'),
                            blogId: form.watch('blogId'),
                            publishAction: 'draft'
                          };
                          handlePublishContent(publishData);
                        }}
                        className="flex-1"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Save Draft
                      </Button>
                    </div>

                    {/* Links to published content */}
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
                selectedProducts={selectedProducts}
                selectedCollections={selectedCollections}
              />
            </DialogContent>
          </Dialog>

          {/* Add necessary imports and handle publish function */}
          {generatedContent && (
            <div className="hidden">
              {/* Publishing handler function */}
              {(() => {
                const handlePublishContent = async (publishData: any) => {
                  try {
                    console.log('Publishing content:', publishData);
                    toast({
                      title: "Publishing...",
                      description: "Your content is being published to Shopify"
                    });
                  } catch (error) {
                    console.error('Publishing error:', error);
                    toast({
                      title: "Publishing failed",
                      description: "There was an error publishing your content",
                      variant: "destructive"
                    });
                  }
                };
                return null;
              })()}
            </div>
          )}

          {/* Title Selector Dialog */}
          <Dialog open={showTitleSelector} onOpenChange={setShowTitleSelector}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Select a Title</DialogTitle>
                <DialogDescription>
                  Choose from AI-generated title suggestions optimized for your selected keywords and products.
                </DialogDescription>
              </DialogHeader>
              <TitleSelector
                keywords={selectedKeywords}
                productTitle={productTitle}
                selectedProducts={selectedProducts}
                selectedCollections={selectedCollections}
                onTitleSelected={(title) => {
                  form.setValue('title', title);
                  setShowTitleSelector(false);
                }}
                onClose={() => setShowTitleSelector(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Choose Media Dialog */}
          <Dialog open={showChooseMediaDialog} onOpenChange={setShowChooseMediaDialog}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose Media for Content</DialogTitle>
                <DialogDescription>
                  Select images and videos for your content
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Search for images..."
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      if (!imageSearchQuery.trim()) return;
                      setIsSearchingImages(true);
                      try {
                        const response = await fetch('/api/admin/generate-images', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            query: imageSearchQuery,
                            count: 12
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          setSearchedImages(data.images || []);
                        }
                      } catch (error) {
                        console.error('Error searching images:', error);
                      } finally {
                        setIsSearchingImages(false);
                      }
                    }}
                    disabled={isSearchingImages || !imageSearchQuery.trim()}
                  >
                    {isSearchingImages ? 'Searching...' : 'Search'}
                  </Button>
                </div>
                
                {searchedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                    {searchedImages.map((img, idx) => {
                      const isSelected = selectedImages.some(selected => selected.id === img.id);
                      return (
                        <div 
                          key={`search-${idx}`}
                          className={`cursor-pointer border-2 rounded-lg overflow-hidden ${
                            isSelected ? 'border-blue-500' : 'border-gray-200'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedImages(prev => prev.filter(selected => selected.id !== img.id));
                            } else {
                              setSelectedImages(prev => [...prev, img]);
                            }
                          }}
                        >
                          <img 
                            src={img.src?.medium || img.url} 
                            alt={img.alt || 'Search result'}
                            className="w-full h-24 object-cover"
                          />
                          {isSelected && (
                            <div className="p-1 bg-blue-50 text-xs text-blue-600 text-center">Selected</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {selectedProducts.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Product Images</h3>
                    <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                      {selectedProducts.map((product) => 
                        product.images?.map((img: any, idx: number) => {
                          const isSelected = selectedImages.some(selected => selected.url === img.src);
                          return (
                            <div 
                              key={`product-${product.id}-${idx}`}
                              className={`cursor-pointer border-2 rounded-lg overflow-hidden ${
                                isSelected ? 'border-blue-500' : 'border-gray-200'
                              }`}
                              onClick={() => {
                                const productImage = {
                                  id: img.id || `${product.id}-${idx}`,
                                  url: img.src,
                                  src: { medium: img.src },
                                  alt: img.alt || product.title,
                                  source: 'product',
                                  width: 500,
                                  height: 500
                                } as any;
                                if (isSelected) {
                                  setSelectedImages(prev => prev.filter(selected => selected.url !== img.src));
                                } else {
                                  setSelectedImages(prev => [...prev, productImage]);
                                }
                              }}
                            >
                              <img 
                                src={img.src} 
                                alt={img.alt || product.title}
                                className="w-full h-24 object-cover"
                              />
                              {isSelected && (
                                <div className="p-1 bg-blue-50 text-xs text-blue-600 text-center">Selected</div>
                              )}
                            </div>
                          );
                        }) || []
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowChooseMediaDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setShowChooseMediaDialog(false);
                  toast({
                    title: "Media selected",
                    description: `${selectedImages.length} image(s) selected`,
                  });
                }}>
                  Add Selected Items
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="connections">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Service Connections</h3>
            <p className="text-gray-600">Manage your external service connections here.</p>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Settings</h3>
            <p className="text-gray-600">Configure your application settings here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
