import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from '@/lib/utils';
import { useStore } from '../contexts/StoreContext';
import { ProductMultiSelect } from '../components/ProductMultiSelect';
import { RelatedCollectionsSelector } from '../components/RelatedCollectionsSelector';
import { ContentStyleSelector } from '../components/ContentStyleSelector';
import { AuthorSelector } from '../components/AuthorSelector';
import MediaSelectionStep from '../components/MediaSelectionStep';
import { SchedulingPermissionNotice } from '../components/SchedulingPermissionNotice';
import { ClusterView } from '../components/ClusterView';
import CreatePostModal from '../components/CreatePostModal';
import { SimpleHTMLEditor } from '../components/SimpleHTMLEditor';
import { BlogPost } from '@shared/schema';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Layout from "@/components/Layout";
import { 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart, 
  Calendar, 
  CalendarCheck,
  Camera,
  CheckCircle,
  Check,
  PlusCircle,
  CircleDot,
  CheckSquare,
  ChevronLeft,
  ImagePlus,
  ChevronRight,
  ChevronDown,
  Clock, 
  Copy,
  Cpu,
  Download,
  Edit,
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
  Zap,
  PiggyBank,
  Plus, 
  RefreshCw,
  Save,
  SaveAll,
  Search,
  Send,
  Store,
  Upload,
  User,
  Users,
  ShoppingCart,
  Sparkles, 
  Trash, 
  Type,
  X, 
  XCircle,
  ZoomIn,
  Star,
  Layers,
  Target,
  Globe,
  BookOpen,
  Wand2,
  Network,
  Link
} from 'lucide-react';

// Form schema for bulk generation
const bulkFormSchema = z.object({
  // Generation Mode (fixed to topical mapping)
  generationMode: z.literal("topical").default("topical"),
  clusterTopic: z.string().optional(),
  rootKeyword: z.string().optional(),
  
  // Article Configuration
  articleType: z.string().default("blog"),
  articleLength: z.string().default("long"),
  headingsCount: z.string().default("3"),
  writingPerspective: z.string().default("first_person_plural"),
  toneOfVoice: z.string().default("friendly"),
  introType: z.string().default("search_intent"),
  faqType: z.string().default("short"),
  
  // Content Options
  enableTables: z.boolean().default(true),
  enableLists: z.boolean().default(true),
  enableH3s: z.boolean().default(true),
  enableCitations: z.boolean().default(true),
  generateImages: z.boolean().default(true),
  
  // Publication
  postStatus: z.string().default("draft"),
  publicationType: z.string().default("draft"),
  scheduleTime: z.string().default("09:30"),
  blogId: z.string().default(""),
  
  // Content Context
  keywords: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  
  // Categories
  categories: z.array(z.string()).default([]),
  customCategory: z.string().default(""),
  
  // Buyer personas
  buyerPersonas: z.string().optional(),
  
  // Author Attribution (CRITICAL for feature parity with AdminPanel)
  authorId: z.string().optional(),
  
  // Bulk specific
  topics: z.string().min(1, "Please enter at least one topic"),
  customPrompt: z.string().optional(),
  batchSize: z.number().min(1).max(20).default(5),
  simultaneousGeneration: z.boolean().default(false)
});

type BulkFormValues = z.infer<typeof bulkFormSchema>;

// Types for result data
type SuccessResult = {
  topic: string;
  postId: number;
  title: string;
  content: string; // Full content for SimpleHTMLEditor
  contentPreview: string;
  status: "success";
  usesFallback: boolean;
};

type FailedResult = {
  topic: string;
  status: "failed";
  error: string;
};

type ProcessingResult = {
  topic: string;
  status: "processing";
  title: string;
  contentPreview: string;
  postId: number;
  usesFallback: boolean;
};

type GenerationResult = SuccessResult | FailedResult | ProcessingResult;

// BulkResultCard Component
interface BulkResultCardProps {
  result: GenerationResult;
  index: number;
  onContentUpdate: (content: string) => void;
  onPublish: (postData: any) => Promise<void>;
  onSaveDraft: (postData: any) => Promise<void>;
  onSchedule: (postData: any, scheduleDate: Date) => Promise<void>;
}

const BulkResultCard: React.FC<BulkResultCardProps> = ({ 
  result, 
  index, 
  onContentUpdate, 
  onPublish, 
  onSaveDraft, 
  onSchedule 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <CircleDot className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case 'success':
        return 'Ready to publish';
      case 'processing':
        return 'Generating content...';
      case 'failed':
        return 'Generation failed';
      default:
        return 'Unknown status';
    }
  };

  const getPreviewText = () => {
    if (result.status === 'success' && result.content) {
      // Strip HTML and get first 150 characters
      const textContent = result.content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
      return textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
    }
    if (result.status === 'processing') {
      return result.contentPreview || 'Content is being generated...';
    }
    if (result.status === 'failed') {
      return result.error || 'Generation failed';
    }
    return 'No preview available';
  };

  return (
    <div className={`border rounded-lg ${
      result.status === 'success' ? 'border-green-200 bg-green-50/30' :
      result.status === 'processing' ? 'border-blue-200 bg-blue-50/30' :
      'border-red-200 bg-red-50/30'
    }`}>
      {/* List Header */}
      <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {result.status === 'success' ? result.title : result.topic}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {getStatusText()}
                {result.status === 'success' && result.usesFallback && (
                  <span className="ml-2 text-amber-600 text-xs px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                    Fallback used
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {result.status === 'success' && (
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  setIsPublishing(true);
                  try {
                    await onPublish(result);
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                disabled={isPublishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Publish to Shopify
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await onSaveDraft(result);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                Save as Draft
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsScheduling(true);
                  try {
                    await onSchedule(result, new Date()); // Pass dummy date, modal will handle real scheduling
                  } finally {
                    setIsScheduling(false);
                  }
                }}
                disabled={isScheduling}
              >
                {isScheduling ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-1" />
                )}
                Schedule for Later
              </Button>

              {/* Toggle Editor Button */}
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Content Preview */}
        <div className="mt-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {getPreviewText()}
          </p>
        </div>
      </div>

      {/* Expandable Content Editor */}
      {result.status === 'success' && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <div className="p-4 bg-gray-50">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="h-96">
                  <SimpleHTMLEditor
                    content={result.content || ''}
                    onChange={onContentUpdate}
                    className="h-full"
                    editable={true}
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Processing State */}
      {result.status === 'processing' && (
        <div className="p-4 bg-blue-50">
          <div className="text-center text-blue-800">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
            <div className="font-medium">Content is being generated...</div>
            <div className="text-sm text-blue-600 mt-1">{result.contentPreview}</div>
          </div>
        </div>
      )}

      {/* Failed State */}
      {result.status === 'failed' && (
        <div className="p-4 bg-red-50">
          <div className="text-center text-red-800">
            <XCircle className="h-6 w-6 mx-auto mb-2" />
            <div className="font-medium">Generation Failed</div>
            <div className="text-sm text-red-600 mt-1">{result.error}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Interface types matching AdminPanel
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
  variants?: any[];
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

export default function SimpleBulkGeneration() {
  // Store context
  const storeContext = useStore();
  
  // Form setup
  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkFormSchema),
    defaultValues: {
      generationMode: "topical",
      clusterTopic: "",
      articleType: "blog",
      articleLength: "long",
      headingsCount: "3",
      writingPerspective: "first_person_plural",
      toneOfVoice: "friendly",
      introType: "search_intent",
      faqType: "short",
      enableTables: true,
      enableLists: true,
      enableH3s: true,
      enableCitations: true,
      generateImages: true,
      postStatus: "draft",
      publicationType: "draft",
      scheduleTime: "09:30",
      blogId: "",
      keywords: [],
      productIds: [],
      collectionIds: [],
      categories: [],
      customCategory: "",
      authorId: "",
      topics: "",
      batchSize: 5,
      simultaneousGeneration: false
    }
  });

  // Workflow and generation state (removed 'topics' step as requested)
  const [currentStep, setCurrentStep] = useState<'setup' | 'products' | 'collections' | 'personas' | 'style' | 'author' | 'media' | 'generation' | 'results'>('setup');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  
  // Modal state for editing posts (same as admin panel)
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Content and product state
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<{id: string, name: string}[]>([]);
  
  // Content style state
  const [selectedContentToneId, setSelectedContentToneId] = useState<string>("");
  const [selectedContentDisplayName, setSelectedContentDisplayName] = useState<string>("");
  
  // Media state
  const [selectedMediaContent, setSelectedMediaContent] = useState<{
    primaryImages: any[];
    secondaryImages: any[];
    youtubeEmbed: string | null;
  }>({
    primaryImages: [],
    secondaryImages: [],
    youtubeEmbed: null
  });

  // Buyer persona state
  const [buyerPersonaSuggestions, setBuyerPersonaSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);
  
  // Topics processing
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  
  // Cluster-specific state
  const [generatedClusterTitles, setGeneratedClusterTitles] = useState<string[]>([]);
  const [isGeneratingClusterTitles, setIsGeneratingClusterTitles] = useState(false);
  
  // Topical mapping state
  const [topicalMappingSession, setTopicalMappingSession] = useState<any>(null);
  const [relatedKeywords, setRelatedKeywords] = useState<any[]>([]);
  const [generatedTitles, setGeneratedTitles] = useState<{[keywordId: string]: any[]}>({});
  const [selectedTitles, setSelectedTitles] = useState<any[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Drag functionality state - start centered
  // Drag state for mind map
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Individual title positioning state
  const [isGeneratingTitles, setIsGeneratingTitles] = useState<{[keywordId: string]: boolean}>({});
  
  // Scheduling modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingPost, setSchedulingPost] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  // Data queries - matching AdminPanel patterns
  const { data: productsData } = useQuery({
    queryKey: ['/api/admin/products'],
    enabled: !!storeContext.currentStore
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['/api/admin/collections'],
    enabled: !!storeContext.currentStore
  });

  const { data: blogsData } = useQuery({
    queryKey: ['/api/admin/blogs'],
    enabled: !!storeContext.currentStore
  });

  const { data: authorsData } = useQuery({
    queryKey: ['/api/authors'],
    enabled: !!storeContext.currentStore
  });

  // Process topics when form topics field changes
  useEffect(() => {
    // For topical mapping mode, use selected titles
    const selectedTitlesList = selectedTitles.map(title => title.title);
    setTopicsList(selectedTitlesList);
    
    const batchSize = form.getValues('batchSize');
    setTotalBatches(Math.ceil(selectedTitlesList.length / batchSize));
  }, [form.watch('batchSize'), selectedTitles]);

  // Create topical mapping session and fetch related keywords
  const createTopicalMappingSession = async () => {
    const rootKeyword = form.getValues('rootKeyword');
    if (!rootKeyword || rootKeyword.trim().length < 3) {
      toast({
        title: "Root Keyword Required",
        description: "Please enter a root keyword of at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    if (!storeContext.currentStore?.id) {
      toast({
        title: "Store Required",
        description: "Please select a store first",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingSession(true);
    try {
      const response = await apiRequest({
        url: '/api/topical-mapping/create-session',
        method: 'POST',
        data: {
          rootKeyword: rootKeyword.trim(),
          storeId: storeContext.currentStore.id,
          languageCode: 'en',
          locationCode: '2840' // USA
        }
      });

      if (response.success) {
        setTopicalMappingSession(response.session);
        setRelatedKeywords(response.keywords || []);
        
        // Process auto-generated titles
        const titlesMap: {[keywordId: string]: any[]} = {};
        response.keywords?.forEach((keyword: any) => {
          if (keyword.titles && keyword.titles.length > 0) {
            titlesMap[keyword.id] = keyword.titles;
          }
        });
        setGeneratedTitles(titlesMap);
        
        const totalTitles = Object.values(titlesMap).reduce((sum: number, titles: any[]) => sum + titles.length, 0);
        toast({
          title: "Topical Map Created!",
          description: `Found ${response.keywords?.length || 0} related keywords with ${totalTitles} auto-generated titles for "${rootKeyword}"`,
        });
      } else {
        throw new Error(response.error || "Failed to create topical mapping session");
      }
    } catch (error: any) {
      console.error("Error creating topical mapping session:", error);
      toast({
        title: "Keyword Research Failed",
        description: error.message || "Failed to fetch related keywords",
        variant: "destructive",
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Generate titles for a specific keyword
  const generateTitlesForKeyword = async (keyword: any) => {
    setIsGeneratingTitles(prev => ({ ...prev, [keyword.id]: true }));
    
    try {
      const response = await apiRequest({
        url: '/api/topical-mapping/generate-titles',
        method: 'POST',
        data: {
          keywordId: keyword.id,
          keyword: keyword.keyword,
          count: 10
        }
      });

      if (response.success) {
        setGeneratedTitles(prev => ({
          ...prev,
          [keyword.id]: response.titles || []
        }));
        toast({
          title: "Titles Generated!",
          description: `Generated ${response.titles?.length || 0} titles for "${keyword.keyword}"`,
        });
      } else {
        throw new Error(response.error || "Failed to generate titles");
      }
    } catch (error: any) {
      console.error("Error generating titles:", error);
      toast({
        title: "Title Generation Failed",
        description: error.message || "Failed to generate titles",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTitles(prev => ({ ...prev, [keyword.id]: false }));
    }
  };

  // Toggle title selection
  const toggleTitleSelection = async (title: any) => {
    try {
      const response = await apiRequest({
        url: '/api/topical-mapping/toggle-title',
        method: 'POST',
        data: {
          titleId: title.id,
          isSelected: !title.isSelected
        }
      });

      if (response.success) {
        // Update the title in the generated titles state
        setGeneratedTitles(prev => {
          const newTitles = { ...prev };
          Object.keys(newTitles).forEach(keywordId => {
            newTitles[keywordId] = newTitles[keywordId].map(t => 
              t.id === title.id ? { ...t, isSelected: !title.isSelected } : t
            );
          });
          return newTitles;
        });

        // Update selected titles list
        if (!title.isSelected) {
          setSelectedTitles(prev => [...prev, { ...title, isSelected: true }]);
        } else {
          setSelectedTitles(prev => prev.filter(t => t.id !== title.id));
        }
      }
    } catch (error: any) {
      console.error("Error toggling title selection:", error);
      toast({
        title: "Selection Failed",
        description: "Failed to update title selection",
        variant: "destructive",
      });
    }
  };

  // Generate cluster titles using Claude AI
  const generateClusterTitles = async () => {
    const clusterTopic = form.getValues('clusterTopic');
    if (!clusterTopic || clusterTopic.trim().length < 3) {
      toast({
        title: "Cluster Topic Required",
        description: "Please enter a cluster topic of at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingClusterTitles(true);
    try {
      const response = await apiRequest({
        url: '/api/generate-content/cluster-titles',
        method: 'POST',
        data: {
          clusterTopic: clusterTopic.trim(),
          keywords: selectedKeywords.map(k => k.keyword).filter(Boolean),
          count: 10, // Generate 10 titles for the cluster
          productIds: selectedProducts.map(p => p.id),
          collectionIds: selectedCollections.map(c => c.id),
        }
      });

      if (response.success && response.titles) {
        setGeneratedClusterTitles(response.titles);
        toast({
          title: "Cluster Titles Generated",
          description: `Generated ${response.titles.length} unique article titles for your cluster`,
        });
      } else {
        throw new Error(response.error || "Failed to generate cluster titles");
      }
    } catch (error) {
      console.error("Error generating cluster titles:", error);
      // Fallback titles if API fails
      const fallbackTitles = [
        `Complete Guide to ${clusterTopic}`,
        `${clusterTopic}: Tips for Beginners`,
        `Advanced ${clusterTopic} Strategies`,
        `Common ${clusterTopic} Mistakes to Avoid`,
        `${clusterTopic} Best Practices`,
        `How to Master ${clusterTopic}`,
        `${clusterTopic} vs Alternatives`,
        `${clusterTopic} Case Studies`,
        `Future of ${clusterTopic}`,
        `${clusterTopic}: Frequently Asked Questions`
      ];
      setGeneratedClusterTitles(fallbackTitles);
      
      toast({
        title: "Using Fallback Titles",
        description: "Generated cluster titles using fallback system due to API error",
        variant: "default",
      });
    } finally {
      setIsGeneratingClusterTitles(false);
    }
  };

  // Generate buyer persona suggestions based on selected products
  const generateBuyerPersonaSuggestions = async () => {
    if (selectedProducts.length === 0) {
      setBuyerPersonaSuggestions([
        'General Consumers',
        'Budget-Conscious Shoppers',
        'Quality-Focused Buyers',
        'Online Shoppers',
        'Brand-Conscious Customers'
      ]);
      setSuggestionsGenerated(true);
      return;
    }
    
    setSuggestionsLoading(true);
    try {
      const response = await apiRequest({
        url: '/api/buyer-personas/generate-suggestions',
        method: 'POST',
        data: {
          products: selectedProducts.map(product => ({
            id: product.id,
            title: product.title,
            description: product.body_html || '',
            price: product.variants?.[0]?.price || '0'
          }))
        }
      });
      
      if (response.success && response.suggestions) {
        setBuyerPersonaSuggestions(response.suggestions);
      } else {
        // Fallback suggestions
        setBuyerPersonaSuggestions([
          'Product Enthusiasts',
          'Quality Seekers',
          'Value Hunters',
          'Brand Loyalists'
        ]);
      }
    } catch (error) {
      console.error('Error generating personas:', error);
      setBuyerPersonaSuggestions([
        'General Consumers',
        'Quality-Focused Buyers',
        'Value Hunters'
      ]);
    } finally {
      setSuggestionsLoading(false);
      setSuggestionsGenerated(true);
    }
  };

  // Navigation functions
  const nextStep = () => {
    const steps: typeof currentStep[] = ['setup', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const steps: typeof currentStep[] = ['setup', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };


  // Drag handlers for mind map
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setDragOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Clean title selection handler
  const handleTitleClick = (e: React.MouseEvent, title: any) => {
    e.stopPropagation();
    
    // Toggle selection immediately in UI
    const newIsSelected = !title.isSelected;
    
    setGeneratedTitles(prev => ({
      ...prev,
      [title.keywordId]: prev[title.keywordId].map(t => 
        t.id === title.id ? { ...t, isSelected: newIsSelected } : t
      )
    }));
    
    // Update selected titles list
    if (newIsSelected) {
      setSelectedTitles(prev => [...prev.filter(t => t.id !== title.id), { ...title, isSelected: true }]);
    } else {
      setSelectedTitles(prev => prev.filter(t => t.id !== title.id));
    }
  };

  // Main bulk generation function
  const handleBulkGeneration = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResults([]);
    setError(null);
    setCurrentStep('generation');
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      const formValues = form.getValues();
      
      if (topicsList.length === 0) {
        throw new Error("Please enter at least one topic");
      }
      
      console.log(`Generating content for ${topicsList.length} topics`);
      setProgress(10);
      
      // Build comprehensive content data like AdminPanel with distributed primary images
      const contentData = {
        topics: topicsList,
        formData: {
          ...formValues,
          productIds: selectedProducts.map(p => p.id),
          collectionIds: selectedCollections.map(c => c.id),
          keywords: selectedKeywords,
          buyerPersonas: formValues.buyerPersonas || buyerPersonaSuggestions.join(', '),
          authorId: selectedAuthorId,
          categories,
          contentStyle: {
            toneId: selectedContentToneId,
            displayName: selectedContentDisplayName
          }
        },
        // Create individual media content for each topic/article
        topicMediaContent: topicsList.map((topic, index) => ({
          topic,
          mediaContent: {
            // Distribute different primary images across articles (cycle through if more articles than images)
            primaryImage: selectedMediaContent.primaryImages.length > 0 
              ? selectedMediaContent.primaryImages[index % selectedMediaContent.primaryImages.length]
              : null,
            secondaryImages: selectedMediaContent.secondaryImages,
            youtubeEmbed: selectedMediaContent.youtubeEmbed
          }
        })),
        batchSize: formValues.batchSize,
        simultaneousGeneration: formValues.simultaneousGeneration
      };
      
      setProgress(30);
      
      console.log(`Using topical mapping generation mode with ${topicsList.length} topics`);
      
      // For topical mapping mode, keep the progress indicator
      let progressCounter = 0;
      progressInterval = setInterval(() => {
        progressCounter++;
        setProgress(prev => {
          const currentProgress = Math.floor(prev);
          if (currentProgress < 30) {
            return currentProgress + 2;
          } else if (currentProgress < 60) {
            return currentProgress + 1;
          } else if (currentProgress < 85) {
            return currentProgress + 1;
          } else if (currentProgress < 95) {
            return currentProgress + 1;
          } else if (currentProgress < 100) {
            return currentProgress + 0.5; // Slow down but still allow progress toward 100%
          }
          return Math.min(100, currentProgress);
        });
      }, 2000);
      
      try {
        console.log('🚀 Starting progressive generation...');
        
        // Initialize results with processing status
        const initialResults = topicsList.map(topic => ({
          topic,
          status: "processing" as const,
          title: topic,
          contentPreview: `Generating content for ${topic}...`,
          postId: Date.now() + Math.random(),
          usesFallback: false
        }));
        
        setResults(initialResults);
        setCurrentStep('results');
        
        if (progressInterval) clearInterval(progressInterval);
        
        // Process all topics in one enhanced bulk request for proper formatting and media placement
        console.log(`🚀 Using enhanced bulk generation with ${topicsList.length} topics`);
        
        try {
          const response = await apiRequest({
            url: "/api/generate-content/enhanced-bulk",
            method: "POST",
            data: {
              topics: topicsList,
              formData: contentData.formData,
              mediaContent: {
                primaryImage: selectedMediaContent.primaryImages?.[0] || null,
                secondaryImages: selectedMediaContent.secondaryImages || [],
                youtubeEmbed: selectedMediaContent.youtubeEmbed || null
              },
              batchSize: contentData.batchSize || 5,
              simultaneousGeneration: contentData.simultaneousGeneration || false,
              isClusterMode: false,
              clusterTopic: formValues.clusterTopic
            },
            timeout: 600000 // 10 minute timeout for bulk
          });
          
          console.log(`✅ Enhanced bulk generation response received:`, response);
          
          const finalResults = [];
          let successful = 0;
          
          // Process the bulk results
          if (response && response.success && response.results) {
            for (let i = 0; i < response.results.length; i++) {
              const result = response.results[i];
            
              if (result.status === "success") {
                const processedResult = {
                  topic: result.topic,
                  postId: result.postId,
                  title: result.title,
                  content: result.content || "No content available",
                  contentPreview: result.content ? result.content.substring(0, 100) + "..." : "No content preview available",
                  status: "success" as const,
                  usesFallback: result.usesFallback
                };
                finalResults.push(processedResult);
                successful++;
                
                // Update results immediately
                setResults(prev => prev.map((prevResult, index) => 
                  index === i ? processedResult : prevResult
                ));
                
                console.log(`✅ Completed topic ${i + 1}/${topicsList.length}: "${result.topic}"`);
              } else {
                const failedResult = {
                  topic: result.topic,
                  status: "failed" as const,
                  error: result.error || "Unknown error"
                };
                finalResults.push(failedResult);
                
                // Update results immediately
                setResults(prev => prev.map((prevResult, index) => 
                  index === i ? failedResult : prevResult
                ));
                
                console.error(`❌ Failed topic ${i + 1}/${topicsList.length}: "${result.topic}" - ${result.error}`);
              }
              
              // Update progress as we process each result
              const progressPercentage = Math.round(((i + 1) / topicsList.length) * 100);
              setProgress(progressPercentage);
            }
          } else {
            throw new Error(response?.error || "No results returned from bulk generation");
          }
        } catch (error: any) {
          console.error('❌ Enhanced bulk generation error:', error);
          
          // Set all topics as failed
          const failedResults = topicsList.map((topic, index) => ({
            topic,
            status: "failed" as const,
            error: error.message || "Bulk generation failed"
          }));
          
          setResults(failedResults);
          throw error;
        }
        
        setProgress(100);
        
        toast({
          title: "Content Generation Complete",
          description: `Generated content for ${topicsList.length} articles successfully`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } catch (apiError: any) {
        if (progressInterval) clearInterval(progressInterval);
        
        // Handle timeout by showing cluster view with processing states
        if (apiError.message?.includes('Request timeout after')) {
          console.log('⏰ Timeout detected - checking if articles were actually generated...');
          
          // Check if any articles were actually generated despite timeout
          try {
            const postsResponse = await apiRequest({ url: '/api/posts', method: 'GET' });
            const currentPosts = postsResponse.posts || [];
            const recentPosts = currentPosts.filter((post: any) => {
              const postTime = new Date(post.createdAt).getTime();
              const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
              return postTime > fiveMinutesAgo;
            });
            
            if (recentPosts.length > 0) {
              console.log(`✅ Found ${recentPosts.length} recently generated articles despite timeout!`);
              setProgress(100);
              setCurrentStep('results');
              
              // Show successful completion
              const successResults = recentPosts.slice(0, 10).map((post: any, index: number) => ({
                topic: `Article ${index + 1}`,
                status: "success" as const,
                title: post.title,
                contentPreview: post.content?.substring(0, 150) + '...',
                postId: post.id,
                usesFallback: false
              }));
              
              setResults(successResults);
              
              toast({
                title: "Cluster Generation Complete!",
                description: `Successfully generated ${recentPosts.length} articles in your cluster.`,
                variant: "default"
              });
              return;
            }
          } catch (checkError) {
            console.error('Error checking for generated articles:', checkError);
          }
          
          setProgress(100);
          setCurrentStep('results');
          
          // Create cluster view with processing articles
          const clusterResults = Array.from({length: 10}, (_, i) => ({
            topic: `Article ${i + 1}`,
            status: "processing" as const,
            title: `Generating article ${i + 1}...`,
            contentPreview: "Content is being generated in the background...",
            postId: 0,
            usesFallback: false
          }));
          
          setResults(clusterResults);
          
          toast({
            title: "Cluster Generation Started",
            description: "Your cluster is being generated. Articles will appear as they complete.",
            variant: "default"
          });
          
          // Start monitoring for completion
          startClusterMonitoring();
          return;
        }
        
        console.error('❌ API error occurred:', apiError);
        throw apiError;
      }
    } catch (e) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Error generating content:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      
      toast({
        title: "Bulk Generation Error",
        description: e instanceof Error ? e.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  // Handler functions for editing posts (same as admin panel)
  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setCreatePostModalOpen(true);
  };

  // Monitor cluster generation progress and update blocks in real-time
  const startClusterMonitoring = () => {
    const monitorInterval = setInterval(async () => {
      try {
        // Check for new posts created in the last hour
        const postsResponse = await apiRequest({ url: '/api/posts', method: 'GET' });
        const currentPosts = postsResponse.posts || [];
        const recentPosts = currentPosts.filter((post: any) => {
          const postTime = new Date(post.createdAt).getTime();
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          return postTime > oneHourAgo;
        });
        
        console.log(`🔍 Monitoring: Found ${recentPosts.length} recent posts`);
        console.log('Recent posts:', recentPosts.map((p: any) => ({ id: p.id, title: p.title, created: p.createdAt })));
        console.log('Current results:', results.map(r => ({ 
          topic: r.topic, 
          status: r.status, 
          title: r.status === 'success' ? r.title : 'Processing...'
        })));
        
        // Update results with actual completed articles - improved matching
        setResults(prevResults => {
          return prevResults.map((result, index) => {
            if (result.status === 'failed' && result.error === 'Article is being generated in the background...') {
              // Try multiple matching strategies
              const matchingPost = recentPosts.find((post: any) => {
                const postTitle = post.title?.toLowerCase() || '';
                const postContent = post.content?.toLowerCase() || '';
                const resultTopic = result.topic.toLowerCase();
                
                // Strategy 1: Exact topic match in title
                if (postTitle.includes(resultTopic)) return true;
                
                // Strategy 2: Key words from topic in title (minimum 2 words, length > 3)
                const topicWords = resultTopic.split(' ').filter((word: string) => word.length > 3);
                const matchingWords = topicWords.filter((word: string) => postTitle.includes(word));
                if (matchingWords.length >= Math.min(2, topicWords.length)) return true;
                
                // Strategy 3: Topic words in content
                if (topicWords.some((word: string) => postContent.includes(word))) return true;
                
                // Strategy 4: Use post creation order (newest posts match first topics)
                const postAge = Date.now() - new Date(post.createdAt).getTime();
                if (postAge < 300000) return true; // Posts created in last 5 minutes
                
                return false;
              });
              
              if (matchingPost) {
                console.log(`✅ Found completed article: "${matchingPost.title}" for topic: "${result.topic}"`);
                return {
                  topic: result.topic,
                  status: 'success' as const,
                  title: matchingPost.title,
                  content: matchingPost.content || "No content available", // Full content for SimpleHTMLEditor
                  contentPreview: matchingPost.content?.substring(0, 150) + '...',
                  postId: matchingPost.id,
                  usesFallback: false
                };
              }
            }
            
            return result;
          });
        });
        
        // Count completed articles after state update and update progress
        setTimeout(() => {
          const currentResults = results;
          const completedCount = currentResults.filter(r => r.status === 'success').length;
          const totalCount = currentResults.length;
        
          console.log(`📊 Progress: ${completedCount}/${totalCount} articles completed`);
          
          // Update progress based on completed articles (90% base + 10% for completion)
          const completionProgress = totalCount > 0 ? (completedCount / totalCount) * 10 : 0;
          setProgress(90 + completionProgress);
          
          // Stop monitoring if all articles are complete
          if (completedCount === totalCount) {
            clearInterval(monitorInterval);
            setProgress(100);
            setIsGenerating(false);
            toast({
              title: "🎉 Cluster Complete!",
              description: `All ${totalCount} articles in your cluster have been generated successfully.`,
              variant: "default"
            });
          } else if (completedCount > 0) {
            // Show ongoing progress
            toast({
              title: "Articles Generating",
              description: `${completedCount}/${totalCount} articles completed. Keep watching the blocks turn blue!`,
              variant: "default"
            });
          }
        }, 100);
        
      } catch (error) {
        console.error('Error monitoring cluster progress:', error);
      }
    }, 10000); // Check every 10 seconds for faster updates
    
    // Clean up after 20 minutes
    setTimeout(() => clearInterval(monitorInterval), 1200000);
  };

  // Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'setup':
        return topicsList.length > 0; // Must have topics to proceed
      case 'products':
        return true; // Products are optional
      case 'collections':
        return true; // Collections are optional
      case 'personas':
        return true; // Personas are optional
      case 'style':
        return true; // Style is optional
      case 'author':
        return true; // Author is optional
      case 'media':
        return true; // Media is optional
      default:
        return false;
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'setup':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-blue-600" />
                Content Generation Setup
              </CardTitle>
              <CardDescription>
                Choose between bulk generation or cluster generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Cluster Topic Input (only show in cluster mode) */}
                {false && ( // Removed cluster mode
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <FormField
                      control={form.control}
                      name="clusterTopic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cluster Topic</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your main topic (e.g., 'Sustainable Fashion for Modern Consumers', 'Digital Marketing Strategies for Small Businesses')"
                              className="min-h-[100px] bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be the central theme around which all 10 articles will be created
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Generate Cluster Titles Button */}
                    <div className="space-y-3">
                      <Button
                        type="button"
                        onClick={generateClusterTitles}
                        disabled={isGeneratingClusterTitles || !form.watch('clusterTopic')?.trim()}
                        variant="outline"
                        className="w-full"
                      >
                        {isGeneratingClusterTitles ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Cluster Titles...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Generate 10 Article Titles
                          </>
                        )}
                      </Button>

                      {/* Show generated titles */}
                      {generatedClusterTitles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-blue-800 font-medium">
                            Generated {generatedClusterTitles.length} cluster titles:
                          </p>
                          <div className="grid gap-1 max-h-40 overflow-y-auto bg-white rounded border p-3">
                            {generatedClusterTitles.map((title, index) => (
                              <div key={index} className="text-sm flex items-center gap-2">
                                <span className="font-medium text-blue-700 w-6">{index + 1}.</span>
                                <span>{title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Topical Mapping Interface (only show in topical mode) */}
                {form.watch('generationMode') === 'topical' && (
                  <div className="space-y-6 p-4 bg-green-50 rounded-lg">
                    {/* Root Keyword Input */}
                    <FormField
                      control={form.control}
                      name="rootKeyword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Root Keyword</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter your root keyword (e.g., 'sustainable fashion', 'digital marketing')"
                                className="bg-white"
                                {...field}
                                data-testid="input-root-keyword"
                              />
                              <Button 
                                type="button" 
                                onClick={createTopicalMappingSession}
                                disabled={isCreatingSession || !field.value?.trim()}
                                className="whitespace-nowrap"
                                data-testid="button-find-keywords"
                              >
                                {isCreatingSession ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Research...
                                  </>
                                ) : (
                                  <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Find Keywords
                                  </>
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            We'll use Claude AI to find 5 related keywords and generate SEO-optimized titles for each
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Topical Mapping Diagram */}
                    {relatedKeywords.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Topical Map ({relatedKeywords.length + 1} keywords)</Label>
                          <Badge variant="outline" className="text-xs" data-testid="badge-selected-count">
                            {selectedTitles.length} titles selected
                          </Badge>
                        </div>
                        
                        {/* Draggable Mind Map: Main → Subkeywords → Titles */}
                        <div className="w-full border rounded-lg bg-white overflow-hidden relative">
                          <div 
                            className="relative cursor-grab active:cursor-grabbing"
                            style={{
                              width: '1600px',
                              height: '1400px',
                              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                              transition: isDragging ? 'none' : 'transform 0.3s ease'
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            data-testid="draggable-mindmap"
                          >
                            {/* SVG Layer for Connections */}
                            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                              {/* Main keyword to subkeywords connections */}
                              {relatedKeywords.map((keyword, keywordIndex) => {
                                const mainX = 200; // Leftmost position
                                const mainY = 500; // Center vertically
                                
                                // Calculate subkeyword positions with proper spacing
                                const subkeywordSpacing = 120; // Fixed spacing between subkeywords
                                const totalSubkeywords = relatedKeywords.length;
                                const totalSubkeywordHeight = (totalSubkeywords - 1) * subkeywordSpacing;
                                const subkeywordStartY = mainY - totalSubkeywordHeight / 2;
                                const subkeywordY = subkeywordStartY + (keywordIndex * subkeywordSpacing);
                                const subkeywordX = 600; // Middle position
                                
                                return (
                                  <g key={`main-to-${keyword.id}`}>
                                    {/* Main to subkeyword curved line */}
                                    <path
                                      d={`M ${mainX + 130} ${mainY} Q ${(mainX + subkeywordX) / 2} ${(mainY + subkeywordY) / 2} ${subkeywordX - 90} ${subkeywordY}`}
                                      stroke="#3b82f6"
                                      strokeWidth="3"
                                      fill="none"
                                    />
                                    
                                    {/* Subkeyword to titles connections */}
                                    {(generatedTitles[keyword.id] || []).map((title, titleIndex) => {
                                      const titleX = 1100; // Rightmost position
                                      const titlesCount = (generatedTitles[keyword.id] || []).length;
                                      
                                      // MAXIMUM SPACING: Ensure minimum 60px between titles to completely prevent overlapping
                                      const minTitleSpacing = 60;
                                      const totalTitleHeight = (titlesCount - 1) * minTitleSpacing;
                                      const titleStartY = subkeywordY - totalTitleHeight / 2;
                                      const titleY = titleStartY + (titleIndex * minTitleSpacing);
                                      
                                      return (
                                        <path
                                          key={`${keyword.id}-to-${title.id}`}
                                          d={`M ${subkeywordX + 90} ${subkeywordY} L ${titleX - 110} ${titleY}`}
                                          stroke="#10b981"
                                          strokeWidth="1.5"
                                          fill="none"
                                          strokeDasharray="3,2"
                                        />
                                      );
                                    })}
                                  </g>
                                );
                              })}
                            </svg>
                            
                            {/* Main Keyword on LEFTMOST */}
                            <div 
                              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                              style={{ left: '200px', top: '500px' }}
                              data-testid="main-keyword-left"
                            >
                              <div className="bg-blue-600 text-white rounded-lg px-6 py-4 shadow-lg border-2 border-blue-700 text-center">
                                <div className="text-base font-bold">{topicalMappingSession?.rootKeyword}</div>
                                <div className="text-xs opacity-90 mt-1">Main</div>
                              </div>
                            </div>
                            
                            {/* Subkeywords positioned vertically in MIDDLE */}
                            {relatedKeywords.map((keyword, keywordIndex) => {
                              // Calculate subkeyword positions with proper spacing
                              const subkeywordSpacing = 120;
                              const totalSubkeywords = relatedKeywords.length;
                              const totalSubkeywordHeight = (totalSubkeywords - 1) * subkeywordSpacing;
                              const subkeywordStartY = 500 - totalSubkeywordHeight / 2;
                              const subkeywordY = subkeywordStartY + (keywordIndex * subkeywordSpacing);
                              const subkeywordX = 600;
                              const keywordTitles = generatedTitles[keyword.id] || [];
                              
                              return (
                                <div key={keyword.id}>
                                  {/* Subkeyword Node */}
                                  <div
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                                    style={{ left: `${subkeywordX}px`, top: `${subkeywordY}px` }}
                                    data-testid={`subkeyword-${keyword.id}`}
                                  >
                                    <div className="bg-emerald-500 text-white rounded-lg px-4 py-3 shadow-md border border-emerald-600 text-center max-w-[180px]">
                                      <div className="text-sm font-semibold">{keyword.keyword}</div>
                                      <div className="text-xs opacity-80 mt-1">{keywordTitles.length} titles</div>
                                    </div>
                                  </div>
                                  
                                  {/* Titles positioned on the RIGHT with PROPER SPACING */}
                                  {keywordTitles.map((title, titleIndex) => {
                                    const titleX = 1100;
                                    const titlesCount = keywordTitles.length;
                                    
                                    // MAXIMUM SPACING: Ensure no overlaps with minimum 60px spacing
                                    const minTitleSpacing = 60;
                                    const totalTitleHeight = (titlesCount - 1) * minTitleSpacing;
                                    const titleStartY = subkeywordY - totalTitleHeight / 2;
                                    const titleY = titleStartY + (titleIndex * minTitleSpacing);
                                    
                                    return (
                                      <div
                                        key={title.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                                        style={{ left: `${titleX}px`, top: `${titleY}px` }}
                                        data-testid={`title-${title.id}`}
                                      >
                                        <div
                                          className={cn(
                                            "cursor-pointer transition-all duration-200 rounded-md px-2 py-1 border text-left max-w-[240px] text-xs",
                                            title.isSelected
                                              ? "bg-blue-100 border-blue-500 text-blue-800"
                                              : "bg-gray-50 border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"
                                          )}
                                          onClick={(e) => handleTitleClick(e, title)}
                                        >
                                          {/* Selection checkbox and title */}
                                          <div className="flex items-start gap-2">
                                            <div className={cn(
                                              "w-3 h-3 rounded border flex-shrink-0 mt-0.5",
                                              title.isSelected 
                                                ? "border-blue-500 bg-blue-500" 
                                                : "border-gray-400"
                                            )}>
                                              {title.isSelected && (
                                                <div className="w-1 h-1 bg-white rounded-full m-auto mt-0.5"></div>
                                              )}
                                            </div>
                                            <div className="font-medium leading-tight">
                                              {title.title}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Generated Titles Panel (Collapsible) */}
                        {Object.keys(generatedTitles).length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Generated Titles</Label>
                            {relatedKeywords.map((keyword) => {
                              if (!generatedTitles[keyword.id]) return null;
                              
                              return (
                                <Card key={keyword.id} className="bg-white">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-sm flex items-center gap-2">
                                        <Target className="h-3 w-3 text-green-600" />
                                        {keyword.keyword}
                                      </CardTitle>
                                      <span className="text-xs text-gray-500">
                                        {generatedTitles[keyword.id]?.filter(t => t.isSelected).length || 0} / {generatedTitles[keyword.id]?.length || 0} selected
                                      </span>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    <div className="grid gap-1 max-h-32 overflow-y-auto">
                                      {generatedTitles[keyword.id]?.map((title) => (
                                        <div
                                          key={title.id}
                                          className={cn(
                                            "p-2 rounded text-xs cursor-pointer transition-colors flex items-center gap-2",
                                            title.isSelected 
                                              ? "bg-green-100 border border-green-300" 
                                              : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                                          )}
                                          onClick={() => toggleTitleSelection(title)}
                                          data-testid={`title-${title.id}`}
                                        >
                                          <div className={cn(
                                            "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                            title.isSelected 
                                              ? "border-green-500 bg-green-500" 
                                              : "border-gray-300"
                                          )}>
                                            {title.isSelected && (
                                              <Plus className="h-2 w-2 text-white" />
                                            )}
                                          </div>
                                          <span className="flex-1 line-clamp-2">{title.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Titles Summary */}
                    {selectedTitles.length > 0 && (
                      <div className="mt-4 p-3 bg-white rounded border" data-testid="summary-selected-titles">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <Label className="text-sm font-medium">Ready for Generation</Label>
                          <Badge variant="secondary">{selectedTitles.length} titles</Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          Selected titles will be used for bulk content generation. Proceed to the next step when ready.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="articleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select content type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="blog">Blog Post</SelectItem>
                            <SelectItem value="page">Page</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="articleLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Article Length</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select length" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="short">Short (300-500 words)</SelectItem>
                            <SelectItem value="medium">Medium (500-800 words)</SelectItem>
                            <SelectItem value="long">Long (800-1200 words)</SelectItem>
                            <SelectItem value="extended">Extended (1200+ words)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headingsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Headings</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select headings count" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2">2 Headings</SelectItem>
                            <SelectItem value="3">3 Headings</SelectItem>
                            <SelectItem value="4">4 Headings</SelectItem>
                            <SelectItem value="5">5 Headings</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableTables"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Tables</FormLabel>
                          <FormDescription>Include tables in generated content</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableLists"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Lists</FormLabel>
                          <FormDescription>Include bullet points and numbered lists</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                </div>
                
                {/* Add topics input to setup step - only show in bulk mode */}
                {false && ( // Removed bulk mode
                  <div className="space-y-4 pt-6 border-t">
                    <h4 className="font-medium text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      Content Topics
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="topics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topics (one per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter topics, one per line:&#10;How to choose the right running shoes&#10;Best skincare routine for dry skin&#10;Sustainable fashion trends 2024&#10;Benefits of meal planning&#10;Essential kitchen tools for beginners"
                              className="min-h-32"
                              rows={8}
                          />
                        </FormControl>
                        <FormDescription>
                          Each line will generate a separate piece of content. You can enter up to 50 topics.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="text-center text-neutral-600">
                    <p className="text-sm">
                      💡 <strong>Tip:</strong> Be specific with your topics for better content quality
                    </p>
                  </div>
                  </div>
                )}

                  {/* Topics preview - only show in bulk mode */}
                  {topicsList.length > 0 && (
                    <div className="border rounded-lg p-4 bg-neutral-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">
                          Topics Preview ({topicsList.length})
                        </h4>
                        <Badge variant="secondary">{totalBatches} batches</Badge>
                      </div>
                      <div className="grid gap-2">
                        {topicsList.slice(0, 5).map((topic, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>{topic}</span>
                          </div>
                        ))}
                        {topicsList.length > 5 && (
                          <div className="text-sm text-neutral-500 mt-2">
                            + {topicsList.length - 5} more topics...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

            </CardContent>
          </Card>
        );



      case 'products':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Related Products
              </CardTitle>
              <CardDescription>
                Select products to reference in your content (optional but recommended)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductMultiSelect
                options={(productsData as any)?.products || []}
                selected={selectedProducts.map(p => p.id)}
                onChange={(selectedIds: string[]) => {
                  const products = ((productsData as any)?.products || []).filter((p: Product) => 
                    selectedIds.includes(p.id)
                  );
                  setSelectedProducts(products);
                }}
                placeholder="Select products to reference in content..."
              />
              {selectedProducts.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    Selected {selectedProducts.length} products that will be referenced in your content
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'collections':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folders className="h-5 w-5 text-orange-600" />
                Related Collections
              </CardTitle>
              <CardDescription>
                Select collections to reference in your content (optional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelatedCollectionsSelector
                collections={(collectionsData as any)?.collections || []}
                selectedCollections={selectedCollections}
                onCollectionSelect={(collection: Collection) => {
                  if (!selectedCollections.find(c => c.id === collection.id)) {
                    setSelectedCollections([...selectedCollections, collection]);
                  }
                }}
                onCollectionRemove={(collectionId: string) => {
                  setSelectedCollections(selectedCollections.filter(c => c.id !== collectionId));
                }}
                onContinue={() => nextStep()}
                onBack={() => previousStep()}
              />
            </CardContent>
          </Card>
        );

      case 'personas':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-red-600" />
                Buyer Personas
              </CardTitle>
              <CardDescription>
                Define your target audience to create more relevant content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProducts.length > 0 && !suggestionsGenerated && (
                <Button
                  onClick={generateBuyerPersonaSuggestions}
                  disabled={suggestionsLoading}
                  variant="outline"
                  className="w-full"
                >
                  {suggestionsLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Personas...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Personas from Selected Products
                    </>
                  )}
                </Button>
              )}

              {buyerPersonaSuggestions.length > 0 && (
                <div className="space-y-2">
                  <Label>AI-Generated Persona Suggestions</Label>
                  <div className="flex flex-wrap gap-2">
                    {buyerPersonaSuggestions.map((persona, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-100"
                        onClick={() => {
                          const current = form.getValues('buyerPersonas') || '';
                          const personas = current ? current.split(',').map(p => p.trim()) : [];
                          if (!personas.includes(persona)) {
                            form.setValue('buyerPersonas', [...personas, persona].join(', '));
                          }
                        }}
                      >
                        {persona}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="buyerPersonas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buyer Personas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quality-conscious consumers, Budget-friendly shoppers, Tech enthusiasts"
                        rows={3}
                        {...field}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe your target audience (comma-separated)
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        );

      case 'style':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-indigo-600" />
                Content Style
              </CardTitle>
              <CardDescription>
                Choose the tone and style for your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentStyleSelector
                onSelectionChange={(toneId: string, displayName: string) => {
                  setSelectedContentToneId(toneId);
                  setSelectedContentDisplayName(displayName);
                }}
                initialToneId={selectedContentToneId}
              />
            </CardContent>
          </Card>
        );

      case 'author':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                Author Settings
              </CardTitle>
              <CardDescription>
                Select the author for your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthorSelector
                selectedAuthorId={selectedAuthorId}
                onAuthorSelect={(authorId: string | null) => setSelectedAuthorId(authorId || "")}
              />
            </CardContent>
          </Card>
        );

      case 'media':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-pink-600" />
                Media Selection
              </CardTitle>
              <CardDescription>
                Choose images and media for your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaSelectionStep
                selectedProductId={selectedProducts[0]?.id || ""}
                selectedProducts={selectedProducts}
                initialValues={selectedMediaContent}
                isClusterMode={false}
                clusterCount={1}
                onComplete={(media) => {
                  setSelectedMediaContent(media);
                  nextStep();
                }}
                onBack={previousStep}
              />
            </CardContent>
          </Card>
        );

      case 'generation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Generating Content
              </CardTitle>
              <CardDescription>
                Creating {topicsList.length} articles with your settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-center text-neutral-600">
                  {progress}% Complete • Batch {currentBatch + 1} of {totalBatches}
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  <AlertCircle className="inline h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              <div className="text-center text-neutral-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Generating high-quality content...</p>
                <p className="text-xs mt-1">This may take a few minutes</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'results':
        if (false) { // Removed cluster mode
          return (
            <ClusterView 
              clusterTopic={form.watch('clusterTopic') || 'Content Cluster'}
              articles={results.map(r => ({
                topic: r.topic,
                status: r.status === 'success' ? 'completed' as const : 
                        r.status === 'processing' ? 'processing' as const :
                        (r.status === 'failed' && r.error === 'Article is being generated in the background...') ? 'processing' as const : 'failed' as const,
                title: r.status === 'success' ? r.title : `Generating: ${r.topic}`,
                contentPreview: r.status === 'success' ? (r.contentPreview || 'Content preview not available') : 
                               r.status === 'processing' ? r.contentPreview :
                               (r.status === 'failed' && r.error === 'Article is being generated in the background...') ? 'Article is being generated in the background...' : 
                               r.status === 'failed' ? `Error: ${r.error || 'Unknown error'}` : 'Unknown status',
                postId: r.status === 'success' ? (r.postId || 0) : 0,
                usesFallback: r.status === 'success' ? (r.usesFallback || false) : false
              }))}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
              }}
              onDeleteCluster={() => {
                setResults([]);
                setCurrentStep('setup');
                toast({
                  title: "Cluster Deleted",
                  description: "Content cluster has been removed. You can start a new one.",
                });
              }}
              onEditPost={handleEditPost}
            />
          );
        }

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Generation Results
              </CardTitle>
              <CardDescription>
                Your bulk content generation is complete. Click any article to edit or publish.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[800px] overflow-y-auto">
                {results.map((result, index) => (
                  <BulkResultCard
                    key={index}
                    result={result}
                    index={index}
                    onContentUpdate={(newContent) => {
                      setResults(prevResults => 
                        prevResults.map((r, i) => 
                          i === index && r.status === "success" 
                            ? { ...r, content: newContent }
                            : r
                        )
                      );
                    }}
                    onPublish={async (postData) => {
                      try {
                        // Check if we have an existing post ID from bulk generation
                        if (postData.postId) {
                          // Update the existing post with any content changes, then publish
                          const updateData = {
                            title: postData.title,
                            content: postData.content,
                            status: 'draft' // Keep as draft for now
                          };

                          // First update the post content if it was edited
                          const updateResponse = await apiRequest({
                            url: `/api/posts/${postData.postId}`,
                            method: 'PUT',
                            data: updateData
                          });

                          if (!updateResponse.success) {
                            throw new Error(updateResponse.error || 'Failed to update post');
                          }

                          // First sync to Shopify to create the draft there
                          const syncResponse = await apiRequest({
                            url: '/api/shopify/sync',
                            method: 'POST',
                            data: { postIds: [postData.postId] }
                          });

                          if (!syncResponse.success) {
                            throw new Error(syncResponse.error || 'Failed to sync to Shopify');
                          }

                          // Now publish to Shopify using the existing post ID
                          const publishResponse = await apiRequest({
                            url: `/api/posts/${postData.postId}/publish`,
                            method: 'POST'
                          });

                          if (publishResponse.success) {
                            toast({
                              title: "Published Successfully",
                              description: `"${postData.title}" has been published to Shopify!`,
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
                          } else {
                            throw new Error(publishResponse.error || 'Failed to publish to Shopify');
                          }
                        } else {
                          // Fallback: Create a new post if no existing post ID
                          const draftData = {
                            title: postData.title,
                            content: postData.content,
                            contentType: 'post',
                            status: 'draft',
                            blogId: form.getValues('blogId') || 'default',
                            authorId: selectedAuthorId || '1',
                            tags: 'bulk generated content',
                            category: 'Generated Content'
                          };

                          const draftResponse = await apiRequest({
                            url: '/api/posts',
                            method: 'POST',
                            data: draftData
                          });

                          if (draftResponse.success) {
                            // Sync to Shopify first
                            const syncResponse = await apiRequest({
                              url: '/api/shopify/sync',
                              method: 'POST',
                              data: { postIds: [draftResponse.post.id] }
                            });

                            if (!syncResponse.success) {
                              throw new Error(syncResponse.error || 'Failed to sync to Shopify');
                            }

                            // Now publish to Shopify
                            const publishResponse = await apiRequest({
                              url: `/api/posts/${draftResponse.post.id}/publish`,
                              method: 'POST'
                            });

                            if (publishResponse.success) {
                              toast({
                                title: "Published Successfully",
                                description: `"${postData.title}" has been published to Shopify!`,
                              });
                              queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
                            } else {
                              throw new Error(publishResponse.error || 'Failed to publish to Shopify');
                            }
                          } else {
                            throw new Error(draftResponse.error || 'Failed to create draft');
                          }
                        }
                      } catch (error: any) {
                        console.error('Publish error:', error);
                        toast({
                          title: "Publishing Failed",
                          description: error.message || "Failed to create draft",
                          variant: "destructive"
                        });
                      }
                    }}
                    onSaveDraft={async (postData) => {
                      try {
                        // Check if we have an existing post ID from bulk generation
                        if (postData.postId) {
                          // Update the existing post content
                          const updateData = {
                            title: postData.title,
                            content: postData.content,
                            status: 'draft'
                          };

                          const response = await apiRequest({
                            url: `/api/posts/${postData.postId}`,
                            method: 'PUT',
                            data: updateData
                          });

                          if (response.success) {
                            // Optionally sync to Shopify as a draft
                            try {
                              await apiRequest({
                                url: '/api/shopify/sync',
                                method: 'POST',
                                data: { postIds: [postData.postId] }
                              });
                            } catch (syncError) {
                              console.log('Sync to Shopify failed (non-critical for draft):', syncError);
                            }

                            toast({
                              title: "Draft Updated",
                              description: `"${postData.title}" has been updated and saved as a draft.`,
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
                          } else {
                            throw new Error(response.error || 'Failed to update draft');
                          }
                        } else {
                          // Fallback: Create a new draft if no existing post ID
                          const draftData = {
                            title: postData.title,
                            content: postData.content,
                            contentType: 'post',
                            status: 'draft',
                            blogId: form.getValues('blogId') || 'default',
                            authorId: selectedAuthorId || '1',
                            tags: 'bulk generated content',
                            category: 'Generated Content'
                          };

                          const response = await apiRequest({
                            url: '/api/posts',
                            method: 'POST',
                            data: draftData
                          });

                          if (response.success) {
                            toast({
                              title: "Saved as Draft",
                              description: `"${postData.title}" has been saved as a draft.`,
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
                          } else {
                            throw new Error(response.error || 'Failed to save draft');
                          }
                        }
                      } catch (error: any) {
                        console.error('Save draft error:', error);
                        toast({
                          title: "Save Failed",
                          description: error.message || "Failed to save as draft",
                          variant: "destructive"
                        });
                      }
                    }}
                    onSchedule={async (postData, scheduleDate) => {
                      setSchedulingPost(postData);
                      setShowScheduleModal(true);
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <Button 
                  onClick={() => setLocation("/blog-posts")}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View All Blog Posts
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCurrentStep('setup');
                    setResults([]);
                    setProgress(0);
                    form.reset();
                  }}
                >
                  Create New Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Progress indicator
  const getStepProgress = () => {
    const steps = ['setup', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <Layout>
      <Form {...form}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">
                  Topical Mapping Content Generation
                </h1>
                <p className="text-neutral-600 mt-2">
                  Use keyword research to find related topics and generate AI-powered titles for SEO optimization
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-neutral-600">
                  Step {['setup', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation', 'results'].indexOf(currentStep) + 1} of 9
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-neutral-200 rounded-full h-2 mb-6">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between bg-white border rounded-lg p-4">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 'setup' || isGenerating}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-2 text-sm text-neutral-500">
              {topicsList.length > 0 && (
                <span>{topicsList.length} topics • {totalBatches} batches</span>
              )}
              {selectedProducts.length > 0 && (
                <span>• {selectedProducts.length} products</span>
              )}
            </div>

            {currentStep === 'media' ? (
              <Button
                onClick={handleBulkGeneration}
                disabled={!canProceedToNextStep() || isGenerating || topicsList.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate {topicsList.length} Articles
              </Button>
            ) : currentStep === 'results' ? (
              <Button
                variant="outline"
                onClick={() => setLocation("/blog-posts")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Posts
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceedToNextStep() || isGenerating}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Form>
      
      {/* Create Post Modal - Same as admin panel for editing cluster articles */}
      <CreatePostModal
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
        initialData={selectedPost}
      />

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule for Publication</DialogTitle>
            <DialogDescription>
              Choose when to publish "{schedulingPost?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleDate">Publication Date</Label>
              <Input
                id="scheduleDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                defaultValue={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduleTime">Publication Time</Label>
              <Input
                id="scheduleTime"
                type="time"
                defaultValue="09:00"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleModal(false);
                  setSchedulingPost(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button
                onClick={async () => {
                  try {
                    const dateInput = document.getElementById('scheduleDate') as HTMLInputElement;
                    const timeInput = document.getElementById('scheduleTime') as HTMLInputElement;
                    
                    const scheduleDate = new Date(dateInput.value);
                    const scheduleTime = timeInput.value;
                    
                    // Combine date and time
                    const [hours, minutes] = scheduleTime.split(':').map(Number);
                    const scheduledDateTime = new Date(scheduleDate);
                    scheduledDateTime.setHours(hours, minutes, 0, 0);

                    // Create draft with scheduling
                    const draftData = {
                      title: schedulingPost.title,
                      content: schedulingPost.content,
                      contentType: 'post',
                      status: 'scheduled',
                      blogId: form.getValues('blogId') || 'default',
                      authorId: selectedAuthorId || '1',
                      tags: 'bulk generated content',
                      category: 'Generated Content',
                      scheduledPublishDate: scheduledDateTime.toISOString().split('T')[0],
                      scheduledPublishTime: scheduleTime
                    };

                    const response = await apiRequest({
                      url: '/api/posts',
                      method: 'POST',
                      data: draftData
                    });

                    if (response.success) {
                      toast({
                        title: "Scheduled Successfully",
                        description: `"${schedulingPost.title}" is scheduled for ${scheduledDateTime.toLocaleDateString()} at ${scheduleTime}`,
                      });
                      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
                      setShowScheduleModal(false);
                      setSchedulingPost(null);
                    } else {
                      throw new Error(response.error || 'Failed to schedule post');
                    }
                  } catch (error: any) {
                    console.error('Schedule error:', error);
                    toast({
                      title: "Scheduling Failed",
                      description: error.message || "Failed to schedule post",
                      variant: "destructive"
                    });
                  }
                }}
                className="flex-1"
              >
                Schedule Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}