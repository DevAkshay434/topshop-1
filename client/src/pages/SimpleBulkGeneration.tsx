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
  Wand2
} from 'lucide-react';

// Form schema for bulk generation
const bulkFormSchema = z.object({
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
  contentPreview: string;
  status: "success";
  usesFallback: boolean;
};

type FailedResult = {
  topic: string;
  status: "failed";
  error: string;
};

type GenerationResult = SuccessResult | FailedResult;

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
      topics: "",
      batchSize: 5,
      simultaneousGeneration: false
    }
  });

  // Workflow and generation state
  const [currentStep, setCurrentStep] = useState<'setup' | 'topics' | 'products' | 'collections' | 'personas' | 'style' | 'author' | 'media' | 'generation' | 'results'>('setup');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
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
    primaryImage: any | null;
    secondaryImages: any[];
    youtubeEmbed: string | null;
  }>({
    primaryImage: null,
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
    const topicsValue = form.watch('topics');
    if (topicsValue) {
      const processedTopics = topicsValue
        .split('\n')
        .map(topic => topic.trim())
        .filter(Boolean);
      setTopicsList(processedTopics);
      
      const batchSize = form.getValues('batchSize');
      setTotalBatches(Math.ceil(processedTopics.length / batchSize));
    } else {
      setTopicsList([]);
      setTotalBatches(0);
    }
  }, [form.watch('topics'), form.watch('batchSize')]);

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
    const steps: typeof currentStep[] = ['setup', 'topics', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const steps: typeof currentStep[] = ['setup', 'topics', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Main bulk generation function
  const handleBulkGeneration = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResults([]);
    setError(null);
    setCurrentStep('generation');
    
    try {
      const formValues = form.getValues();
      
      if (topicsList.length === 0) {
        throw new Error("Please enter at least one topic");
      }
      
      console.log(`Generating content for ${topicsList.length} topics`);
      setProgress(10);
      
      // Build comprehensive content data like AdminPanel
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
        mediaContent: selectedMediaContent,
        batchSize: formValues.batchSize,
        simultaneousGeneration: formValues.simultaneousGeneration
      };
      
      setProgress(30);
      
      // Use enhanced bulk generation endpoint
      const response = await apiRequest({
        url: "/api/generate-content/enhanced-bulk",
        method: "POST",
        data: contentData
      });
      
      setProgress(90);
      
      if (response && response.success) {
        console.log(`Bulk generation results: ${response.successful} of ${response.totalTopics} successful`);
        
        const processedResults = response.results.map((result: any) => {
          if (result.status === "success") {
            return {
              topic: result.topic,
              postId: result.postId,
              title: result.title,
              contentPreview: result.content ? result.content.substring(0, 100) + "..." : "No content preview available",
              status: "success" as const,
              usesFallback: result.usesFallback
            };
          } else {
            return {
              topic: result.topic,
              status: "failed" as const,
              error: result.error || "Unknown error"
            };
          }
        });
        
        setResults(processedResults);
        setProgress(100);
        setCurrentStep('results');
        
        toast({
          title: "Bulk Content Generation Complete",
          description: `Generated ${response.successful} of ${response.totalTopics} articles successfully`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else {
        throw new Error(response?.error || "Failed to generate content");
      }
    } catch (e) {
      console.error("Error generating content:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      
      toast({
        title: "Bulk Generation Error",
        description: e instanceof Error ? e.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'setup':
        return true; // Basic setup can always proceed
      case 'topics':
        return topicsList.length > 0;
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
                Bulk Generation Setup
              </CardTitle>
              <CardDescription>
                Configure your bulk content generation settings and preferences
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
                            <SelectItem value="article">Article</SelectItem>
                            <SelectItem value="guide">Guide</SelectItem>
                            <SelectItem value="tutorial">Tutorial</SelectItem>
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

                  <FormField
                    control={form.control}
                    name="batchSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Size</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="20" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Number of articles to generate simultaneously (1-20)
                        </FormDescription>
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
                </div>
            </CardContent>
          </Card>
        );

      case 'topics':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                Content Topics
              </CardTitle>
              <CardDescription>
                Enter the topics you want to create content for (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="topics"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topics (one per line)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Sustainable fashion trends
Benefits of organic skincare
How to choose the right running shoes
Best practices for home organization
Top 10 productivity apps for entrepreneurs"
                        rows={12}
                        {...field}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      {topicsList.length > 0 && (
                        <span className="text-green-600 font-medium">
                          {topicsList.length} topics detected • {totalBatches} batches planned
                        </span>
                      )}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom AI Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="You are a professional blog writer creating high-quality content for an e-commerce store. Write a detailed, informative, and engaging blog post about [TOPIC]..."
                        rows={6}
                        {...field}
                        disabled={isGenerating}
                      />
                    </FormControl>
                    <FormDescription>
                      Use [TOPIC] as a placeholder where you want the topic to be inserted
                    </FormDescription>
                  </FormItem>
                )}
              />
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
                options={productsData?.products?.map((product: any) => ({
                  product: product,
                  value: product.id
                })) || []}
                selected={selectedProducts.map(p => p.id)}
                onChange={(selectedIds: string[]) => {
                  const products = (productsData?.products || []).filter((p: any) => 
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
                collections={collectionsData?.collections || []}
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
                onAuthorSelect={(authorId: string) => setSelectedAuthorId(authorId)}
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
                selectedProducts={selectedProducts}
                selectedMediaContent={selectedMediaContent}
                onMediaChange={setSelectedMediaContent}
                workflowStep="media"
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
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Generation Results
              </CardTitle>
              <CardDescription>
                Your bulk content generation is complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.status === "success" 
                        ? "bg-green-50 border-green-200" 
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900">
                          {result.status === "success" ? result.title : result.topic}
                        </h4>
                        <p className="text-sm mt-1 text-neutral-600">
                          {result.status === "success" ? (
                            <>
                              <span className="text-green-700 font-medium">Successfully generated</span>
                              {result.usesFallback && (
                                <span className="ml-2 text-amber-600 text-xs px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                                  Fallback model used
                                </span>
                              )}
                              {result.contentPreview && (
                                <span className="block mt-1">{result.contentPreview}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-red-700">Failed: {result.error}</span>
                          )}
                        </p>
                      </div>
                      {result.status === "success" && (
                        <div className="ml-4">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      )}
                    </div>
                  </div>
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
    const steps = ['setup', 'topics', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation', 'results'];
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
                <h1 className="text-3xl font-bold text-neutral-900">Bulk Content Generation</h1>
                <p className="text-neutral-600 mt-2">
                  Create multiple high-quality blog posts using the same advanced workflow as single post generation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-neutral-600">
                  Step {['setup', 'topics', 'products', 'collections', 'personas', 'style', 'author', 'media', 'generation', 'results'].indexOf(currentStep) + 1} of 10
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
    </Layout>
  );
}