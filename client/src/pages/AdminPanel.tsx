import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ShopifyImageViewer from '../components/ShopifyImageViewer';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SchedulingPermissionNotice } from '../components/SchedulingPermissionNotice';
import { ContentStyleSelector } from '../components/ContentStyleSelector';
import CreateProjectModal from '../components/CreateProjectModal';
import { ChooseMediaDialog, MediaImage } from '../components/ChooseMediaDialog';
import { RelatedProductsSelector } from '../components/RelatedProductsSelector';
import { RelatedCollectionsSelector } from '../components/RelatedCollectionsSelector';
import { ProductMultiSelect } from '../components/ProductMultiSelect';
import MediaSelectionStep from '../components/MediaSelectionStep';
import { AuthorSelector } from '../components/AuthorSelector';
import { useStore } from '../contexts/StoreContext';
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
import { ImageUpload } from '@/components/ImageUpload';

// Define the form schema for content generation
const contentFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
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
  toneOfVoice: z.enum(["neutral", "professional", "empathetic", "casual", "excited", "formal", "friendly", "humorous"]),
  postStatus: z.enum(["publish", "draft"]),
  generateImages: z.boolean().default(true),
  scheduledPublishDate: z.string().optional(),
  scheduledPublishTime: z.string().optional(),
  publicationType: z.enum(["publish", "schedule", "draft"]).optional(),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  articleLength: z.enum(["short", "medium", "long", "comprehensive"]).default("long"),
  headingsCount: z.enum(["2", "3", "4", "5", "6"]).default("3"),
  categories: z.array(z.string()).optional(),
  customCategory: z.string().optional(),
  buyerPersonas: z.string().optional()
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

// Project interface
interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  isTemplate: boolean;
  templateCategory?: string;
  formData?: any;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
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

export default function AdminPanel() {
  // Project management state
  const [currentProject, setCurrentProject] = useState<string>('');
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Workflow step state
  type WorkflowStep = 'product' | 'related-products' | 'related-collections' | 'buying-avatars' | 'keyword' | 'title' | 'media' | 'author' | 'content';
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('product');

  // Other state variables
  const [selectedTab, setSelectedTab] = useState("generate");
  const [selectedContentToneId, setSelectedContentToneId] = useState<string>("");
  const [selectedContentDisplayName, setSelectedContentDisplayName] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<PexelsImage[]>([]);
  const [primaryImages, setPrimaryImages] = useState<PexelsImage[]>([]);
  const [secondaryImages, setSecondaryImages] = useState<PexelsImage[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [searchedImages, setSearchedImages] = useState<PexelsImage[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');

  // Media selection state
  const [selectedMediaContent, setSelectedMediaContent] = useState<{
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
    youtubeEmbed: string | null;
  }>({
    primaryImage: null,
    secondaryImages: [],
    youtubeEmbed: null
  });

  console.log('Current selectedMediaContent state:', selectedMediaContent);

  const { toast } = useToast();

  // Default form values
  const defaultValues: Partial<ContentFormValues> = {
    articleType: "blog",
    writingPerspective: "first_person_plural",
    enableTables: true,
    enableLists: true,
    enableH3s: true,
    introType: "search_intent",
    faqType: "short",
    enableCitations: true,
    toneOfVoice: "friendly",
    postStatus: "draft",
    generateImages: true,
    keywords: [],
    productIds: [],
    collectionIds: [],
    scheduledPublishTime: "09:30",
    blogId: "",
    publicationType: "draft",
    scheduleDate: undefined,
    scheduleTime: "09:30",
    articleLength: "long",
    headingsCount: "3",
    categories: [],
    customCategory: "",
    buyerPersonas: ""
  };

  // Initialize form
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues,
  });

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: { projectId: number; formData: any }) => {
      return apiRequest(`/api/projects/${data.projectId}/auto-save`, {
        method: 'POST',
        body: JSON.stringify({ formData: data.formData })
      });
    },
    onSuccess: () => {
      setAutoSaveStatus('saved');
      setLastAutoSave(new Date());
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    },
    onError: () => {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  });

  // Function to collect all form data for auto-save
  const collectFormData = () => {
    const formValues = form.getValues();
    return {
      ...formValues,
      selectedProducts: selectedProducts.map(p => ({ id: p.id, title: p.title })),
      selectedCollections: selectedCollections.map(c => ({ id: c.id, title: c.title })),
      selectedKeywords,
      selectedMediaContent,
      selectedAuthorId,
      workflowStep,
      generatedContent: generatedContent ? {
        content: generatedContent.content,
        title: generatedContent.title,
        metaDescription: generatedContent.metaDescription
      } : null,
      lastModified: new Date().toISOString()
    };
  };

  // Auto-save function
  const performAutoSave = () => {
    if (!currentProjectId || !autoSaveEnabled || autoSaveMutation.isPending) return;
    
    setAutoSaveStatus('saving');
    const formData = collectFormData();
    autoSaveMutation.mutate({ projectId: currentProjectId, formData });
  };

  // Auto-save effect
  useEffect(() => {
    if (!currentProjectId || !autoSaveEnabled) return;

    const interval = setInterval(() => {
      performAutoSave();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [currentProjectId, autoSaveEnabled, selectedProducts, selectedCollections, selectedKeywords, selectedMediaContent, workflowStep]);

  // Function to load project data
  const loadProjectData = (project: Project) => {
    if (!project.formData) return;

    const formData = project.formData;
    
    // Set form values
    Object.keys(formData).forEach(key => {
      if (key in form.getValues() && key !== 'selectedProducts' && key !== 'selectedCollections') {
        form.setValue(key as any, formData[key]);
      }
    });

    // Restore selected products
    if (formData.selectedProducts) {
      setSelectedProducts(formData.selectedProducts);
    }

    // Restore selected collections
    if (formData.selectedCollections) {
      setSelectedCollections(formData.selectedCollections);
    }

    // Restore keywords
    if (formData.selectedKeywords) {
      setSelectedKeywords(formData.selectedKeywords);
    }

    // Restore media content
    if (formData.selectedMediaContent) {
      setSelectedMediaContent(formData.selectedMediaContent);
    }

    // Restore author selection
    if (formData.selectedAuthorId) {
      setSelectedAuthorId(formData.selectedAuthorId);
    }

    // Restore workflow step
    if (formData.workflowStep) {
      setWorkflowStep(formData.workflowStep);
    }

    // Restore generated content
    if (formData.generatedContent) {
      setGeneratedContent(formData.generatedContent);
    }

    // Set current project
    setCurrentProject(project.name);
    setCurrentProjectId(project.id);

    toast({
      title: "Project Loaded",
      description: `"${project.name}" has been loaded with all saved data.`,
    });
  };

  // Handle project creation
  const handleProjectCreated = (project: Project) => {
    setCurrentProject(project.name);
    setCurrentProjectId(project.id);
    toast({
      title: "Project Created",
      description: `"${project.name}" is now active. Your progress will be automatically saved.`,
    });
  };

  // Handle project selection
  const handleProjectSelected = (project: Project) => {
    loadProjectData(project);
  };

  // Auto-save status display
  const renderAutoSaveStatus = () => {
    if (!currentProject) return null;

    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {autoSaveStatus === 'saving' && (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </>
        )}
        {autoSaveStatus === 'saved' && (
          <>
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Saved</span>
          </>
        )}
        {autoSaveStatus === 'error' && (
          <>
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span>Save failed</span>
          </>
        )}
        {lastAutoSave && autoSaveStatus === 'idle' && (
          <span>Last saved: {lastAutoSave.toLocaleTimeString()}</span>
        )}
      </div>
    );
  };

  // Project header component
  const ProjectHeader = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowCreateProjectModal(true)}
            className="flex items-center gap-2"
          >
            <Folders className="w-4 h-4" />
            {currentProject ? 'Switch Project' : 'Load Project'}
          </Button>
          {currentProject && (
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Current Project:</div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {currentProject}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {renderAutoSaveStatus()}
          {currentProject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={performAutoSave}
              disabled={autoSaveMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader />
      
      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProjectModal}
        onOpenChange={setShowCreateProjectModal}
        onProjectCreated={handleProjectCreated}
        onProjectSelected={handleProjectSelected}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Content Generation Workflow
            </CardTitle>
            <CardDescription>
              Create SEO-optimized blog posts and pages for your Shopify store
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-6">
                {/* Workflow content would go here */}
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Enhanced Project Workflow</h3>
                  <p>Your complete project management system is now active.</p>
                  <p className="text-sm mt-2">
                    {currentProject 
                      ? `Working on: ${currentProject} (Auto-save enabled)`
                      : 'Click "Load Project" to start or resume work'
                    }
                  </p>
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}