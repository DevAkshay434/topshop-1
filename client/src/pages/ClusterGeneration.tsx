import React, { useState, useEffect } from 'react';
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
import KeywordSelector from '../components/KeywordSelector';
import { ChooseMediaDialog } from '../components/ChooseMediaDialog';
import Layout from "@/components/Layout";

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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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

// Form schema for cluster generation
const clusterFormSchema = z.object({
  // Cluster Configuration
  clusterTopic: z.string().min(3, "Cluster topic must be at least 3 characters"),
  articleType: z.enum(["blog", "page"]).default("blog"),
  blogId: z.string().optional(),
  
  // Article Configuration  
  articleLength: z.string().default("medium"),
  headingsCount: z.string().default("3"),
  writingPerspective: z.string().default("first_person_plural"),
  toneOfVoice: z.string().default("friendly"),
  introType: z.string().default("search_intent"),
  faqType: z.string().default("short"),
  contentStyle: z.string().default("informative"),
  
  // Content Options
  enableTables: z.boolean().default(true),
  enableLists: z.boolean().default(true),
  enableH3s: z.boolean().default(true),
  enableCitations: z.boolean().default(true),
  generateImages: z.boolean().default(true),
  
  // Publication
  postStatus: z.string().default("draft"),
  
  // Keywords
  keywords: z.array(z.string()).default([]),
  
  // Products and Collections
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  
  // Author
  authorId: z.string().optional(),
});

type ClusterFormValues = z.infer<typeof clusterFormSchema>;

// Interface types
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

interface MediaImage {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  filename?: string;
  source: 'product' | 'variant' | 'shopify' | 'pexels' | 'pixabay' | 'product_image' | 'theme_asset' | 'article_image' | 'collection_image' | 'shopify_media' | 'variant_image' | 'uploaded';
  selected?: boolean;
  isPrimary?: boolean;
  product_id?: string | number;
  product_title?: string;
  width?: number;
  height?: number;
  type?: 'image' | 'youtube';
  videoId?: string;
}

interface ClusterResult {
  success: boolean;
  clusterId?: string;
  generatedTitles?: string[];
  articles?: Array<{
    id: string;
    title: string;
    status: 'success' | 'failed';
    postId?: string;
    error?: string;
  }>;
  totalGenerated?: number;
  failedCount?: number;
}

export default function ClusterGeneration() {
  // Store context
  const storeContext = useStore();
  
  // Form setup
  const form = useForm<ClusterFormValues>({
    resolver: zodResolver(clusterFormSchema),
    defaultValues: {
      clusterTopic: "",
      articleType: "blog",
      articleLength: "medium",
      headingsCount: "3",
      writingPerspective: "first_person_plural",
      toneOfVoice: "friendly",
      introType: "search_intent",
      faqType: "short",
      contentStyle: "informative",
      enableTables: true,
      enableLists: true,
      enableH3s: true,
      enableCitations: true,
      generateImages: true,
      postStatus: "draft",
      keywords: [],
      productIds: [],
      collectionIds: [],
    }
  });

  // Workflow state
  const [currentStep, setCurrentStep] = useState<'topic' | 'content-type' | 'keywords' | 'media' | 'author' | 'style' | 'generate' | 'results'>('topic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Content state
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [isKeywordSelectorOpen, setIsKeywordSelectorOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  
  // Content style state
  const [selectedContentToneId, setSelectedContentToneId] = useState<string>("");
  const [selectedContentDisplayName, setSelectedContentDisplayName] = useState<string>("");
  
  // Media state - for cluster we allow multiple featured images
  const [clusterImages, setClusterImages] = useState<MediaImage[]>([]);
  
  // Generated cluster titles
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  // Data queries
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

  // Generate cluster titles based on main topic and keywords
  const generateClusterTitles = async () => {
    const clusterTopic = form.getValues('clusterTopic');
    if (!clusterTopic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a cluster topic first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingTitles(true);
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
        setGeneratedTitles(response.titles);
        toast({
          title: "Cluster Titles Generated",
          description: `Generated ${response.titles.length} unique article titles for your cluster`,
        });
      } else {
        throw new Error(response.error || "Failed to generate cluster titles");
      }
    } catch (error) {
      console.error("Error generating cluster titles:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate cluster titles",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Main cluster generation function
  const handleClusterGeneration = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setCurrentStep('generate');
    
    try {
      const formValues = form.getValues();
      
      if (generatedTitles.length === 0) {
        throw new Error("Please generate cluster titles first");
      }
      
      console.log(`Generating cluster with ${generatedTitles.length} articles`);
      setProgress(10);
      
      // Build comprehensive cluster data
      const clusterData = {
        clusterTopic: formValues.clusterTopic,
        titles: generatedTitles,
        formData: {
          ...formValues,
          productIds: selectedProducts.map(p => p.id),
          collectionIds: selectedCollections.map(c => c.id),
          keywords: selectedKeywords,
          authorId: selectedAuthorId,
          contentStyle: {
            toneId: selectedContentToneId,
            displayName: selectedContentDisplayName
          }
        },
        mediaContent: {
          clusterImages: clusterImages
        }
      };
      
      setProgress(30);
      
      // Use cluster generation endpoint
      const response = await apiRequest({
        url: "/api/generate-content/cluster",
        method: "POST",
        data: clusterData
      });
      
      setProgress(90);
      
      if (response && response.success) {
        console.log(`Cluster generation complete: ${response.totalGenerated} articles created`);
        
        setClusterResult(response);
        setProgress(100);
        setCurrentStep('results');
        
        toast({
          title: "Cluster Generation Complete",
          description: `Successfully generated ${response.totalGenerated} articles in your cluster`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else {
        throw new Error(response?.error || "Failed to generate cluster");
      }
    } catch (e) {
      console.error("Error generating cluster:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      
      toast({
        title: "Cluster Generation Error",
        description: e instanceof Error ? e.message : "Failed to generate cluster",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Navigation functions
  const nextStep = () => {
    const steps: typeof currentStep[] = ['topic', 'content-type', 'keywords', 'media', 'author', 'style', 'generate'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const steps: typeof currentStep[] = ['topic', 'content-type', 'keywords', 'media', 'author', 'style', 'generate'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'topic':
        return form.getValues('clusterTopic').trim().length >= 3;
      case 'content-type':
        return true;
      case 'keywords':
        return true; // Keywords are optional but helpful
      case 'media':
        return true; // Media is optional
      case 'author':
        return true; // Author is optional
      case 'style':
        return true; // Style is optional
      default:
        return false;
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'topic':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-blue-600" />
                Cluster Topic
              </CardTitle>
              <CardDescription>
                Define the main topic for your content cluster. We'll generate 10 related articles around this topic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="clusterTopic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Cluster Topic</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your main topic (e.g., 'Sustainable Fashion for Modern Consumers', 'Digital Marketing Strategies for Small Businesses')"
                        className="min-h-[100px]"
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

              {/* Show basic cluster preview */}
              {form.getValues('clusterTopic').trim().length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Cluster Preview</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    We'll create 10 unique articles exploring different aspects of: 
                    <span className="font-medium"> "{form.getValues('clusterTopic').trim()}"</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'content-type':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Content Type & Settings
              </CardTitle>
              <CardDescription>
                Configure the type and format of content for your cluster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

                {form.watch('articleType') === 'blog' && (
                  <FormField
                    control={form.control}
                    name="blogId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Blog</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blog" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {blogsData?.blogs?.map((blog: Blog) => (
                              <SelectItem key={blog.id} value={blog.id}>
                                {blog.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

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

              {/* Content Enhancement Options */}
              <div className="space-y-4">
                <h3 className="font-medium">Content Enhancement Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="generateImages"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Generate Images</FormLabel>
                          <FormDescription>Automatically include relevant images</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableCitations"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Citations</FormLabel>
                          <FormDescription>Add citations and references</FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'keywords':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Keywords & SEO
              </CardTitle>
              <CardDescription>
                Add keywords to help generate SEO-optimized content for your cluster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Products Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Related Products (Optional)</h3>
                <ProductMultiSelect
                  products={productsData?.products || []}
                  selectedProducts={selectedProducts}
                  onSelectionChange={setSelectedProducts}
                />
              </div>

              {/* Collections Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Related Collections (Optional)</h3>
                <RelatedCollectionsSelector
                  collections={collectionsData?.collections || []}
                  selectedCollections={selectedCollections}
                  onSelectionChange={setSelectedCollections}
                />
              </div>

              {/* Keywords Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Keywords</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsKeywordSelectorOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Keywords
                  </Button>
                </div>

                {selectedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {keyword.keyword}
                        <button
                          onClick={() => {
                            const newKeywords = selectedKeywords.filter((_, i) => i !== index);
                            setSelectedKeywords(newKeywords);
                          }}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {selectedKeywords.length === 0 && (
                  <p className="text-gray-500 text-sm">
                    No keywords selected. Add keywords to improve SEO optimization.
                  </p>
                )}
              </div>

              {/* Generate Cluster Titles */}
              <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-green-900">Generate Article Titles</h3>
                  <Button
                    type="button"
                    onClick={generateClusterTitles}
                    disabled={isGeneratingTitles || !form.getValues('clusterTopic').trim()}
                  >
                    {isGeneratingTitles ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Titles
                      </>
                    )}
                  </Button>
                </div>

                {generatedTitles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-800 font-medium">
                      Generated {generatedTitles.length} cluster titles:
                    </p>
                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                      {generatedTitles.map((title, index) => (
                        <div key={index} className="p-2 bg-white border rounded text-sm">
                          <span className="font-medium text-green-700">{index + 1}.</span> {title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedTitles.length === 0 && (
                  <p className="text-sm text-green-700">
                    Generate titles based on your cluster topic and keywords to preview the articles.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'media':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-orange-600" />
                Media Selection
              </CardTitle>
              <CardDescription>
                Select multiple images to be used across your cluster articles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Cluster Images</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMediaDialogOpen(true)}
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Choose Images
                  </Button>
                </div>

                {clusterImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {clusterImages.map((image, index) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={image.alt || `Cluster image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => {
                            const newImages = clusterImages.filter((_, i) => i !== index);
                            setClusterImages(newImages);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {clusterImages.length === 0 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No images selected. These images will be distributed across your cluster articles.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Media Distribution</span>
                </div>
                <p className="text-sm text-blue-800">
                  Selected images will be automatically distributed across your 10 cluster articles to ensure each has relevant visual content.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'author':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                Author Selection
              </CardTitle>
              <CardDescription>
                Choose an author for your cluster articles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AuthorSelector
                selectedAuthorId={selectedAuthorId}
                onAuthorSelect={(authorId) => setSelectedAuthorId(authorId || '')}
              />
              
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-indigo-900">Author Consistency</span>
                </div>
                <p className="text-sm text-indigo-800">
                  The selected author will be attributed to all articles in this cluster for brand consistency.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'style':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-600" />
                Style & Formatting
              </CardTitle>
              <CardDescription>
                Configure the writing style and tone for your cluster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="writingPerspective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Writing Perspective</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select perspective" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="first_person_singular">First Person (I)</SelectItem>
                          <SelectItem value="first_person_plural">First Person Plural (We)</SelectItem>
                          <SelectItem value="second_person">Second Person (You)</SelectItem>
                          <SelectItem value="third_person">Third Person (They)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toneOfVoice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone of Voice</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="informative">Informative</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="entertaining">Entertaining</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
                          <SelectItem value="storytelling">Storytelling</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="introType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Introduction Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select intro type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="search_intent">Search Intent Focused</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <ContentStyleSelector
                selectedToneId={selectedContentToneId}
                selectedDisplayName={selectedContentDisplayName}
                onStyleChange={(toneId, displayName) => {
                  setSelectedContentToneId(toneId);
                  setSelectedContentDisplayName(displayName);
                }}
              />
            </CardContent>
          </Card>
        );

      case 'generate':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Generate Cluster
              </CardTitle>
              <CardDescription>
                Review your settings and generate your content cluster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isGenerating && (
                <div className="space-y-4">
                  {/* Cluster Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Cluster Summary</h3>
                    <div className="grid gap-2 text-sm">
                      <div><strong>Topic:</strong> {form.getValues('clusterTopic')}</div>
                      <div><strong>Content Type:</strong> {form.getValues('articleType')}</div>
                      <div><strong>Articles to Generate:</strong> {generatedTitles.length}</div>
                      <div><strong>Selected Products:</strong> {selectedProducts.length}</div>
                      <div><strong>Selected Keywords:</strong> {selectedKeywords.length}</div>
                      <div><strong>Cluster Images:</strong> {clusterImages.length}</div>
                    </div>
                  </div>

                  {/* Generated Titles Preview */}
                  {generatedTitles.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="font-medium mb-2 text-green-900">Articles to Generate</h3>
                      <div className="grid gap-1 text-sm max-h-40 overflow-y-auto">
                        {generatedTitles.map((title, index) => (
                          <div key={index} className="text-green-800">
                            {index + 1}. {title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleClusterGeneration}
                    className="w-full"
                    disabled={generatedTitles.length === 0}
                  >
                    <Network className="h-4 w-4 mr-2" />
                    Generate Content Cluster
                  </Button>
                </div>
              )}

              {isGenerating && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="font-medium">Generating Content Cluster...</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-gray-600">
                    This may take a few minutes as we generate {generatedTitles.length} unique articles for your cluster.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Generation Failed</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'results':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Cluster Generated Successfully
              </CardTitle>
              <CardDescription>
                Your content cluster has been generated and is ready for review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {clusterResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {clusterResult.totalGenerated || 0}
                      </div>
                      <div className="text-sm text-green-800">Articles Created</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {generatedTitles.length}
                      </div>
                      <div className="text-sm text-blue-800">Total in Cluster</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {clusterResult.failedCount || 0}
                      </div>
                      <div className="text-sm text-orange-800">Failed</div>
                    </div>
                  </div>

                  {clusterResult.articles && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Generated Articles</h3>
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {clusterResult.articles.map((article, index) => (
                          <div
                            key={article.id}
                            className={`p-3 rounded-lg border flex items-center justify-between ${
                              article.status === 'success' 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {article.status === 'success' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="font-medium text-sm">
                                  {article.title}
                                </span>
                              </div>
                              {article.error && (
                                <p className="text-xs text-red-600 mt-1">{article.error}</p>
                              )}
                            </div>
                            {article.postId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLocation('/blog-posts')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setLocation('/blog-posts')}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View All Posts
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset form and start over
                        setCurrentStep('topic');
                        setGeneratedTitles([]);
                        setClusterResult(null);
                        setError(null);
                        form.reset();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Cluster
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Network className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Content Cluster Generation</h1>
              <p className="text-gray-600">
                Generate 10 interconnected articles around a single topic, inspired by Machined.ai
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { key: 'topic', label: 'Topic', icon: Target },
              { key: 'content-type', label: 'Content Type', icon: FileText },
              { key: 'keywords', label: 'Keywords', icon: Search },
              { key: 'media', label: 'Media', icon: ImageIcon },
              { key: 'author', label: 'Author', icon: User },
              { key: 'style', label: 'Style', icon: Sparkles },
              { key: 'generate', label: 'Generate', icon: Zap },
              { key: 'results', label: 'Results', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = [
                'topic', 'content-type', 'keywords', 'media', 'author', 'style', 'generate', 'results'
              ].indexOf(currentStep) > [
                'topic', 'content-type', 'keywords', 'media', 'author', 'style', 'generate', 'results'
              ].indexOf(step.key);
              
              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                    isActive ? "bg-blue-600 text-white" : 
                    isCompleted ? "bg-green-600 text-white" : 
                    "bg-gray-200 text-gray-600"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium text-center",
                    isActive ? "text-blue-600" : 
                    isCompleted ? "text-green-600" : 
                    "text-gray-500"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <Form {...form}>
          <form className="space-y-8">
            {renderStepContent()}

            {/* Navigation */}
            {currentStep !== 'results' && (
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={previousStep}
                  disabled={currentStep === 'topic'}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentStep !== 'generate' && (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceedToNextStep()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </form>
        </Form>

        {/* Dialogs */}
        {isKeywordSelectorOpen && (
          <KeywordSelector
            initialKeywords={selectedKeywords}
            onKeywordsSelected={(keywords) => {
              setSelectedKeywords(keywords);
              setIsKeywordSelectorOpen(false);
            }}
            onClose={() => setIsKeywordSelectorOpen(false)}
            productTitle={form.getValues('clusterTopic')}
            selectedProducts={selectedProducts}
            selectedCollections={selectedCollections}
          />
        )}

        <ChooseMediaDialog
          open={isMediaDialogOpen}
          onOpenChange={setIsMediaDialogOpen}
          onImagesSelected={(images) => {
            setClusterImages(images);
            setIsMediaDialogOpen(false);
          }}
          initialSelectedImages={clusterImages}
          maxImages={20}
          allowMultiple={true}
          title="Choose Cluster Images"
          description="Select multiple images to be distributed across your cluster articles"
        />
      </div>
    </Layout>
  );
}