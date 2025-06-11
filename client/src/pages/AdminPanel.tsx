import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BookOpen, 
  Calendar, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Database, 
  Edit2, 
  Eye, 
  FileText, 
  Filter, 
  Globe, 
  Hash, 
  Image, 
  Info,
  Lightbulb, 
  Link, 
  MessageSquare, 
  Package, 
  Plus, 
  RefreshCw, 
  Save, 
  Search, 
  Settings, 
  Sparkles, 
  Tag, 
  Target, 
  User, 
  Users, 
  X, 
  Zap 
} from "lucide-react";
import { ChooseMediaDialog, type MediaImage } from "@/components/ChooseMediaDialog";
import { KeywordSelector } from "@/components/KeywordSelector";
import { TitleSelectionDialog } from "@/components/TitleSelectionDialog";
import { SelectedImagesPanel } from "@/components/SelectedImagesPanel";

// Schema for form validation
const contentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  region: z.string().min(1, "Region is required"),
  productIds: z.array(z.string()).min(1, "At least one product is required"),
  collectionIds: z.array(z.string()).optional(),
  articleType: z.string().min(1, "Article type is required"),
  blogId: z.string().min(1, "Blog selection is required"),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  writingPerspective: z.string().min(1, "Writing perspective is required"),
  enableTables: z.boolean().optional(),
  enableLists: z.boolean().optional(),
  enableH3s: z.boolean().optional(),
  introType: z.string().min(1, "Introduction type is required"),
  customInstructions: z.string().optional(),
  authorId: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  publishDate: z.string().optional(),
  targetAudience: z.string().optional(),
  contentGoal: z.string().optional(),
  callToAction: z.string().optional(),
  internalLinks: z.array(z.string()).optional(),
  socialMediaOptimization: z.boolean().optional(),
  seoFocus: z.string().optional(),
  competitorAnalysis: z.boolean().optional(),
  localSEO: z.boolean().optional(),
  metaDescription: z.string().optional(),
  featuredImage: z.string().optional(),
  altText: z.string().optional(),
  imageDescription: z.string().optional(),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

// Interface definitions
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

export default function AdminPanel() {
  // Form and state management
  const [selectedTab, setSelectedTab] = useState("generate");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [generatedContent, setGeneratedContent] = useState({
    title: "",
    content: "",
    metaDescription: "",
    tags: [] as string[]
  });
  
  // Dialog states
  const [showKeywordSelector, setShowKeywordSelector] = useState(false);
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [showChooseMediaDialog, setShowChooseMediaDialog] = useState(false);
  
  // Media content state
  const [selectedMediaContent, setSelectedMediaContent] = useState<{
    primaryImage: MediaImage | null;
    secondaryImages: MediaImage[];
  }>({
    primaryImage: null,
    secondaryImages: []
  });

  // Form setup
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      enableTables: false,
      enableLists: true,
      enableH3s: true,
      socialMediaOptimization: false,
      competitorAnalysis: false,
      localSEO: false,
      productIds: [],
      collectionIds: [],
      keywords: [],
      categories: [],
      tags: [],
      internalLinks: []
    }
  });

  // API Queries
  const regionsQuery = useQuery({
    queryKey: ['/api/admin/regions'],
  });

  const productsQuery = useQuery({
    queryKey: ['/api/admin/products'],
  });

  const collectionsQuery = useQuery({
    queryKey: ['/api/admin/collections'],
  });

  const blogsQuery = useQuery({
    queryKey: ['/api/admin/blogs'],
  });

  const permissionsData = {
    success: true,
    hasPermission: true,
    store: { name: "Sample Store" }
  };

  // Generate content function
  const handleSubmit = async (values: ContentFormValues) => {
    console.log("Generating content with values:", values);
    // Content generation logic would go here
  };

  // Media selection handlers
  const handleChooseMediaSelected = useCallback((images: MediaImage[]) => {
    if (images.length > 0) {
      const primaryImage = images.find(img => img.isPrimary) || images[0];
      const secondaryImages = images.filter(img => !img.isPrimary || img !== primaryImage);
      
      setSelectedMediaContent({
        primaryImage,
        secondaryImages: secondaryImages.slice(0, 5)
      });
    }
    setShowChooseMediaDialog(false);
  }, []);

  // Validation function for Generate Content button
  const isFormValid = () => {
    const values = form.getValues();
    return (
      values.title &&
      values.keywords && values.keywords.length > 0 &&
      selectedMediaContent.primaryImage &&
      values.articleType &&
      values.authorId &&
      values.blogId
    );
  };

  return (
    <div className="container max-w-7xl mx-auto py-10">
      {/* Show scheduling permission notice if needed */}
      {permissionsData?.success && !permissionsData.hasPermission && (
        <div className="mb-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your store needs additional permissions to schedule posts. 
              {permissionsData.store && (
                <span> Connected to: {permissionsData.store.name}</span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TopShop SEO Admin</h1>
          <p className="text-muted-foreground">
            Manage content generation, view service status, and configure settings
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="generate">Content Generator</TabsTrigger>
          <TabsTrigger value="connections">Services</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Generation Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Content Generator Section */}
            <div className="xl:w-1/3 w-full">
              <Card>
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
                      <div className="flex justify-end mb-4">
                        <Button
                          type="button" 
                          variant="outline"
                          size="sm"
                          onClick={() => console.log("Load template functionality")}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Load Template
                        </Button>
                      </div>

                      {/* Region Selection */}
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a region" />
                                </SelectTrigger>
                                <SelectContent>
                                  {regionsQuery.data?.regions.map((region: Region) => (
                                    <SelectItem key={region.id} value={region.id}>
                                      {region.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Blog Selection */}
                      <FormField
                        control={form.control}
                        name="blogId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blog</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a blog" />
                                </SelectTrigger>
                                <SelectContent>
                                  {blogsQuery.data?.blogs && blogsQuery.data.blogs.map((blog: Blog) => (
                                    <SelectItem key={blog.id} value={blog.id}>
                                      {blog.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Generate Content Button */}
                      <div className="pt-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Button 
                                  type="button"
                                  onClick={() => handleSubmit(form.getValues())}
                                  className="w-full"
                                  disabled={!isFormValid()}
                                >
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Generate Content
                                </Button>
                              </div>
                            </TooltipTrigger>
                            {!isFormValid() && (
                              <TooltipContent>
                                <p>Complete all required fields to generate content</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Word Count */}
                      <div className="text-xs text-gray-500 text-right">
                        Words: {generatedContent.content ? 
                          generatedContent.content.replace(/<[^>]*>/g, '').split(/\s+/).filter((word: any) => word.length > 0).length 
                          : 0}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Content Preview and Publication Section */}
            <div className="xl:w-2/3 w-full space-y-6">
              {/* Content Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Preview</CardTitle>
                  <CardDescription>
                    Preview of your generated content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedContent.content ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">{generatedContent.title}</h3>
                        <div 
                          className="prose max-w-none mt-4"
                          dangerouslySetInnerHTML={{ __html: generatedContent.content }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Content will appear here after generation.</p>
                      <p className="text-sm">Fill out the form and click "Generate Content" to create new content.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Publication Section */}
              {generatedContent.content && (
                <Card>
                  <CardHeader>
                    <CardTitle>Publication</CardTitle>
                    <CardDescription>
                      Schedule and publish your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button className="flex-1">
                          <Calendar className="mr-2 h-4 w-4" />
                          Schedule Post
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Dialogs */}
          <Dialog open={showKeywordSelector} onOpenChange={setShowKeywordSelector}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Keywords</DialogTitle>
              </DialogHeader>
              <KeywordSelector
                open={showKeywordSelector}
                onClose={() => setShowKeywordSelector(false)}
                onKeywordsSelected={(keywords) => {
                  setSelectedKeywords(keywords);
                  setShowKeywordSelector(false);
                }}
                selectedProducts={selectedProducts}
                selectedCollections={selectedCollections}
                productTitle={productTitle}
                initialKeywords={selectedKeywords}
              />
            </DialogContent>
          </Dialog>

          <TitleSelectionDialog
            open={showTitleDialog}
            onOpenChange={setShowTitleDialog}
            selectedProducts={selectedProducts}
            selectedCollections={selectedCollections}
            productTitle={productTitle}
            onTitleSelected={(title) => {
              setProductTitle(title);
              form.setValue("title", title);
              setShowTitleDialog(false);
            }}
          />

          <ChooseMediaDialog
            open={showChooseMediaDialog}
            onOpenChange={setShowChooseMediaDialog}
            onImagesSelected={handleChooseMediaSelected}
            initialSelectedImages={selectedMediaContent.primaryImage ? 
              [selectedMediaContent.primaryImage, ...selectedMediaContent.secondaryImages] : 
              selectedMediaContent.secondaryImages}
            maxImages={6}
            allowMultiple={true}
            title="Choose Media for Your Content"
            description="Select images and videos to enhance your content. Choose a primary image and up to 5 secondary images."
          />
        </TabsContent>

        {/* Other Tab Content */}
        <TabsContent value="connections" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Service connections panel coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Settings panel coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}