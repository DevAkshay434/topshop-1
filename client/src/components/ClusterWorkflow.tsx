import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '@/contexts/StoreContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, ChevronRight, Clock, FileText, Sparkles, Bot, Terminal, Trash, Upload, Search, Loader2, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ImageSearchDialog from './ImageSearchDialog';

// Local definition of PexelsImage to match what's in ImageSearchDialog
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
  isProductImage?: boolean;
  productId?: string;
  source?: 'pexels' | 'pixabay' | 'product';
  isFeatured?: boolean;
  isContentImage?: boolean;
}

interface Article {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'scheduled';
  publicationType?: 'draft' | 'published' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
  images?: Array<{
    id: string;
    url?: string;
    alt?: string;
    source?: string;
    isFeatured?: boolean;
    isContentImage?: boolean;
  }>;
}

interface Product {
  id: string;
  title: string;
  handle?: string;
  price?: string;
  compareAtPrice?: string;
  image?: {
    src: string;
    alt?: string;
  };
}

interface Keyword {
  keyword: string;
  score?: number;
  isMainKeyword?: boolean;
}

interface ClusterWorkflowProps {
  onBack?: () => void;
  onComplete?: (articles: Article[]) => void;
  articles?: Article[];
  initialProducts?: Product[];
  isDemo?: boolean;
}

export default function ClusterWorkflow({
  onBack,
  onComplete,
  articles = [],
  initialProducts = [],
  isDemo = false,
}: ClusterWorkflowProps) {
  const { toast } = useToast();
  // Query for blogs instead of using store context
  const { data: blogsData } = useQuery<{ blogs: { id: string, title: string }[] }>({
    queryKey: ["/api/shopify/blogs"],
  });
  
  const { data: connectionData } = useQuery<{ connection: { defaultBlogId?: string } }>({
    queryKey: ["/api/shopify/connection"],
  });
  
  // Use these fetched blogs with fallbacks
  const blogs = blogsData?.blogs || [];
  const defaultBlog = connectionData?.connection?.defaultBlogId;
  
  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Selected products
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mainTopic, setMainTopic] = useState<string>('');
  
  // Article creation options
  const [numberOfArticles, setNumberOfArticles] = useState<string>('3');
  const [selectedWritingPerspective, setSelectedWritingPerspective] = useState<string>('male');
  const [selectedBlog, setSelectedBlog] = useState<string>(defaultBlog || '');
  const [toneOfVoice, setToneOfVoice] = useState<string>('authoritative');
  const [introStyle, setIntroStyle] = useState<string>('problem-focused');
  const [articleLength, setArticleLength] = useState<string>('medium');
  const [faqStyle, setFaqStyle] = useState<string>('detailed');
  const [includeTOC, setIncludeTOC] = useState<boolean>(true);
  const [includeYouTube, setIncludeYouTube] = useState<boolean>(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Keyword selection
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string>('');
  
  // Content options
  const [enableTables, setEnableTables] = useState<boolean>(true);
  const [enableLists, setEnableLists] = useState<boolean>(true);
  const [enableH1, setEnableH1] = useState<boolean>(true);
  const [enableCitations, setEnableCitations] = useState<boolean>(true);
  
  // Generated content
  const [editedArticles, setEditedArticles] = useState<Article[]>(articles);
  const [selectedArticles, setSelectedArticles] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );
  const [scheduleTime, setScheduleTime] = useState<string>("09:30");
  
  // Keyword suggestions (mock data for UI development)
  const [suggestedKeywords, setSuggestedKeywords] = useState<Keyword[]>([
    { keyword: "water softener", score: 45 },
    { keyword: "water testing", score: 35 },
    { keyword: "water softener installation", score: 27 },
  ]);
  
  // Image selection modal
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  
  // Update local state when articles prop changes
  React.useEffect(() => {
    setEditedArticles(articles);
  }, [articles]);
  
  // Toggle article selection for bulk actions
  const toggleSelection = (id: string) => {
    setSelectedArticles({
      ...selectedArticles,
      [id]: !selectedArticles[id]
    });
  };
  
  // Select or deselect all articles
  const toggleSelectAll = (select: boolean) => {
    const newSelection: Record<string, boolean> = {};
    editedArticles.forEach(article => {
      newSelection[article.id] = select;
    });
    setSelectedArticles(newSelection);
  };
  
  // Count selected articles
  const selectedCount = Object.values(selectedArticles).filter(Boolean).length;
  
  // Check if scheduling is possible (needs date and time)
  const canSchedule = !!scheduleDate && !!scheduleTime;
  
  // Apply bulk action to selected articles
  const applyBulkAction = () => {
    if (selectedCount === 0) {
      toast({
        title: "No articles selected",
        description: "Please select at least one article to apply action",
        variant: "destructive",
      });
      return;
    }
    
    const updatedArticles = editedArticles.map(article => {
      if (selectedArticles[article.id]) {
        return {
          ...article,
          status: bulkAction,
          scheduledDate: bulkAction === 'scheduled' && scheduleDate 
            ? format(scheduleDate, 'yyyy-MM-dd')
            : undefined,
          scheduledTime: bulkAction === 'scheduled' ? scheduleTime : undefined,
        };
      }
      return article;
    });
    
    setEditedArticles(updatedArticles);
    
    toast({
      title: "Action applied",
      description: `${selectedCount} article${selectedCount > 1 ? 's' : ''} set to ${bulkAction}${bulkAction === 'scheduled' ? ` for ${format(scheduleDate!, 'yyyy-MM-dd')} at ${scheduleTime}` : ''}`,
    });
    
    // Clear selection after applying action
    setSelectedArticles({});
  };
  
  // Open image selection dialog for an article
  const openImageDialog = (articleId: string) => {
    const article = editedArticles.find(a => a.id === articleId);
    if (article) {
      setCurrentArticleId(articleId);
      
      // Set search keyword from article title or tags
      let keyword = article.title.split(' ').slice(0, 2).join(' ');
      if (article.tags && article.tags.length > 0) {
        keyword = article.tags[0];
      }
      setSearchKeyword(keyword);
      
      // Open dialog
      setIsImageDialogOpen(true);
    }
  };
  
  // Handle images selected from dialog
  const handleImagesSelected = (images: PexelsImage[]) => {
    if (!currentArticleId) return;
    
    // Convert PexelsImages to the Article image format
    const processedImages = images.map(img => ({
      id: img.id,
      url: img.url,
      alt: img.alt || '',
      source: img.source,
      isFeatured: !!img.isFeatured,
      isContentImage: !!img.isContentImage
    }));
    
    setEditedArticles(prev => 
      prev.map(article => {
        if (article.id === currentArticleId) {
          return {
            ...article,
            images: processedImages,
          };
        }
        return article;
      })
    );
    
    toast({
      title: "Images Updated",
      description: `Updated images for article: ${editedArticles.find(a => a.id === currentArticleId)?.title}`,
    });
  };
  
  // Update article title
  const updateArticleTitle = (id: string, title: string) => {
    setEditedArticles(prevArticles => 
      prevArticles.map(article => 
        article.id === id ? { ...article, title } : article
      )
    );
  };
  
  // Update article content
  const updateArticleContent = (id: string, content: string) => {
    setEditedArticles(prevArticles => 
      prevArticles.map(article => 
        article.id === id ? { ...article, content } : article
      )
    );
  };
  
  // Update article status
  const updateArticleStatus = (id: string, status: 'draft' | 'published' | 'scheduled', scheduledDate?: string, scheduledTime?: string) => {
    setEditedArticles(prevArticles => 
      prevArticles.map(article => 
        article.id === id ? { 
          ...article, 
          status,
          scheduledDate,
          scheduledTime
        } : article
      )
    );
    
    toast({
      title: "Status updated",
      description: `Article set to ${status}${status === 'scheduled' && scheduledDate ? ` for ${scheduledDate} at ${scheduledTime}` : ''}`,
    });
  };
  
  // Check if article is selected for bulk actions
  const isSelected = (id: string) => !!selectedArticles[id];
  
  // Test the Claude API connection
  const testClaudeConnection = async () => {
    try {
      toast({
        title: "Testing Claude API Connection",
        description: "Checking connection to Claude AI..."
      });
      
      const response = await apiRequest("GET", "/api/content/test-claude");
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Connected to Claude AI successfully!"
        });
      } else {
        toast({
          title: "Connection Error",
          description: response.message || "Failed to connect to Claude AI",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: (error as Error)?.message || "Failed to connect to Claude AI",
        variant: "destructive"
      });
    }
  };
  
  // Generate a cluster of content based on inputs
  const generateClusterContent = async () => {
    if (!mainTopic) {
      toast({
        title: "Topic Required",
        description: "Please enter a main topic for your content cluster",
        variant: "destructive",
      });
      return;
    }
    
    // Show loading state
    setIsSaving(true);
    
    try {
      // Prepare keywords array from both selected suggestions and custom entries
      const allKeywords = [
        ...selectedKeywords.map(k => k.keyword),
        ...customKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      ];
      
      // Get product info for selected products
      const products = selectedProducts.map(product => ({
        id: product.id,
        title: product.title,
        description: '',
      }));
      
      if (!isDemo) {
        // Make API call to generate content
        const response = await apiRequest("POST", "/api/claude/cluster", {
          topic: mainTopic,
          keywords: allKeywords,
          products,
          options: {
            writingPerspective: selectedWritingPerspective,
            toneOfVoice: toneOfVoice,
            introStyle: introStyle,
            faqStyle: faqStyle,
            enableTables,
            enableLists,
            enableH1,
            enableBolding: true,
            enableCitations,
            enableExternalLinks: true,
            includeYouTube,
            youtubeUrl: youtubeUrl || '',
            includeTOC,
            authorInfo: null,
            numH2s: 5,
            articleLength: articleLength,
          }
        });
        
        if (response.success && response.cluster) {
          // Log the response structure for debugging
          console.log('Claude cluster response structure:', response.cluster);
          
          // Handle both structured formats that Claude might return
          const subtopics = response.cluster.subtopics || [];
          console.log('Subtopics detected:', subtopics.length);
          
          // Create articles from the subtopics with proper error handling
          const articles = subtopics.map((article: any, index: number) => ({
            id: `article-${Date.now()}-${index}`,
            title: article.title || `Article ${index + 1}`,
            content: article.content || '<p>Content is being processed...</p>',
            tags: [mainTopic, ...(article.keywords?.slice(0, 3) || [])],
            status: 'draft' as const,
            images: [], // Initialize with empty images array that can be filled later
          }));
          
          setEditedArticles(articles);
          
          toast({
            title: "Content Generated",
            description: `Generated ${articles.length} articles in your cluster`,
          });
        } else {
          throw new Error(response.message || "Failed to generate content");
        }
      } else {
        // Create mock content for development
        const mockCluster = Array.from({ length: parseInt(numberOfArticles) }, (_, i) => ({
          id: `article-${Date.now()}-${i}`,
          title: `${mainTopic} ${["Guide", "Tips", "Benefits", "Installation", "Review"][i % 5]} - ${i + 1}`,
          content: `<h1>${mainTopic} ${["Guide", "Tips", "Benefits", "Installation", "Review"][i % 5]}</h1>
          
          <p>In this comprehensive guide, we'll explore everything you need to know about ${mainTopic} systems for your home.</p>
          
          <h2>Why Choose a Quality ${mainTopic}?</h2>
          <p>Selecting the right ${mainTopic} for your home is crucial for ensuring clean, safe water for your family.</p>
          
          <h2>Top Features to Consider</h2>
          <p>When shopping for a ${mainTopic}, look for these important features:</p>
          
          <ul>
            <li>Quality materials ensure longer lifespan</li>
            <li>Proper installation is critical for performance</li>
            <li>Regular maintenance prevents expensive repairs</li>
          </ul>
          
          <h2>Conclusion</h2>
          <p>Investing in a high-quality ${mainTopic} provides lasting benefits for your home and family.</p>`,
          tags: [mainTopic, ...selectedKeywords.slice(0, 3).map(k => k.keyword)],
          status: 'draft' as const,
          images: [] // Initialize with empty images array that can be filled later
        }));
        
        setEditedArticles(mockCluster);
        
        toast({
          title: "Demo Mode",
          description: `Generated ${mockCluster.length} articles using sample content`,
        });
      }
      
      // Move to the articles view
      setCurrentStep(6);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate content cluster",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Cluster Generator</CardTitle>
        <CardDescription>
          {currentStep < 6 
            ? "Generate SEO-optimized content clusters for your Shopify store" 
            : "Review and edit your generated content cluster before publishing"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : currentStep === 1 ? (
          // Step 1: Select Products
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">1</div>
                <h3 className="text-lg font-medium">Select Products</h3>
              </div>
              <div className="flex space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">2</div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">3</div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">4</div>
              </div>
            </div>
            
            <div className="grid gap-6">
              <div>
                <Label>Select Products</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose products you want to create content for
                </p>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                <ScrollArea className="h-[300px] border rounded-md">
                  <div className="p-4 grid gap-2">
                    {/* Filtered products here */}
                    {initialProducts
                      .filter(product => 
                        !searchQuery || 
                        product.title.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(product => (
                        <div 
                          key={product.id}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors",
                            selectedProducts.some(p => p.id === product.id)
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-muted"
                          )}
                          onClick={() => {
                            if (selectedProducts.some(p => p.id === product.id)) {
                              setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                            } else {
                              setSelectedProducts([...selectedProducts, product]);
                            }
                          }}
                        >
                          <Checkbox 
                            checked={selectedProducts.some(p => p.id === product.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                if (!selectedProducts.some(p => p.id === product.id)) {
                                  setSelectedProducts([...selectedProducts, product]);
                                }
                              } else {
                                setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                              }
                            }}
                          />
                          
                          {product.image && (
                            <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
                              <img 
                                src={product.image.src} 
                                alt={product.image.alt || product.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{product.title}</div>
                            {product.price && (
                              <div className="text-sm text-muted-foreground">
                                ${product.price}
                                {product.compareAtPrice && (
                                  <span className="ml-2 line-through text-xs">
                                    ${product.compareAtPrice}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div>
                <Label htmlFor="main-topic">Main Topic</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter the main topic for your content cluster
                </p>
                <Input
                  id="main-topic"
                  placeholder="e.g., Water Softener Installation Guide"
                  value={mainTopic}
                  onChange={(e) => setMainTopic(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(2)}>
                  Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : currentStep === 2 ? (
          // Step 2: Choose Keywords
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">2</div>
                <h3 className="text-lg font-medium">Choose Keywords</h3>
              </div>
            </div>
            
            <div className="grid gap-6">
              <div>
                <Label>Keyword Suggestions</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select keywords to include in your content
                </p>
                
                <div className="mb-4 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {suggestedKeywords.map((keyword, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer",
                          selectedKeywords.some(k => k.keyword === keyword.keyword)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted"
                        )}
                        onClick={() => {
                          if (selectedKeywords.some(k => k.keyword === keyword.keyword)) {
                            setSelectedKeywords(selectedKeywords.filter(k => k.keyword !== keyword.keyword));
                          } else {
                            setSelectedKeywords([...selectedKeywords, keyword]);
                          }
                        }}
                      >
                        <span>{keyword.keyword}</span>
                        {keyword.score && <Badge variant="outline" className="text-xs">{keyword.score}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="custom-keywords">Custom Keywords</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add your own keywords (comma separated)
                  </p>
                  <Textarea
                    id="custom-keywords"
                    placeholder="e.g., water filter, water quality, home water system"
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : currentStep === 3 ? (
          // Step 3: Style & Settings
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">3</div>
                <h3 className="text-lg font-medium">Style & Settings</h3>
              </div>
            </div>
            
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Writing Perspective</Label>
                  <Select 
                    value={selectedWritingPerspective} 
                    onValueChange={setSelectedWritingPerspective}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose writing perspective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male Perspective</SelectItem>
                      <SelectItem value="female">Female Perspective</SelectItem>
                      <SelectItem value="neutral">Gender Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the gender perspective for your content
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Number of Articles</Label>
                  <Select 
                    value={numberOfArticles} 
                    onValueChange={setNumberOfArticles}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose number of articles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Articles</SelectItem>
                      <SelectItem value="5">5 Articles</SelectItem>
                      <SelectItem value="7">7 Articles</SelectItem>
                      <SelectItem value="10">10 Articles</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How many articles to generate in this cluster
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Blog</Label>
                  <Select 
                    value={selectedBlog} 
                    onValueChange={setSelectedBlog}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose blog" />
                    </SelectTrigger>
                    <SelectContent>
                      {blogs.map((blog: { id: string; title: string }) => (
                        <SelectItem key={blog.id} value={blog.id.toString()}>
                          {blog.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which blog to publish to
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Article Length</Label>
                  <Select 
                    value={articleLength} 
                    onValueChange={setArticleLength}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose article length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (~800 words)</SelectItem>
                      <SelectItem value="medium">Medium (~1200 words)</SelectItem>
                      <SelectItem value="long">Long (~2000 words)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How long each article should be
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Writing Perspective</Label>
                  <Select 
                    value={selectedWritingPerspective} 
                    onValueChange={setSelectedWritingPerspective}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose writing perspective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first-person">First Person (I, We)</SelectItem>
                      <SelectItem value="second-person">Second Person (You, Your)</SelectItem>
                      <SelectItem value="third-person">Third Person (They, It)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the perspective from which your content will be written
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Tone of Voice</Label>
                  <Select 
                    value={toneOfVoice} 
                    onValueChange={setToneOfVoice}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose tone of voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="direct-punchy">Direct & Punchy</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    The overall tone for your content
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Introduction Style</Label>
                  <Select 
                    value={introStyle} 
                    onValueChange={setIntroStyle}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose introduction style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="problem-focused">Problem Focused</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="stats-focused">Statistics Focused</SelectItem>
                      <SelectItem value="search-intent-focused">Search Intent Focused</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How to start your articles
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>FAQ Style</Label>
                  <Select 
                    value={faqStyle} 
                    onValueChange={setFaqStyle}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose FAQ style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="short">Short & Concise</SelectItem>
                      <SelectItem value="none">No FAQs</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How to format FAQs in your content
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Formatting Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enable-tables" 
                      checked={enableTables}
                      onCheckedChange={(checked) => setEnableTables(!!checked)}
                    />
                    <Label htmlFor="enable-tables">Enable Tables</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enable-lists" 
                      checked={enableLists}
                      onCheckedChange={(checked) => setEnableLists(!!checked)}
                    />
                    <Label htmlFor="enable-lists">Enable Lists</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enable-h1" 
                      checked={enableH1}
                      onCheckedChange={(checked) => setEnableH1(!!checked)}
                    />
                    <Label htmlFor="enable-h1">Enable H1 Headers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enable-citations" 
                      checked={enableCitations}
                      onCheckedChange={(checked) => setEnableCitations(!!checked)}
                    />
                    <Label htmlFor="enable-citations">Enable Citations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-toc"
                      checked={includeTOC}
                      onCheckedChange={(checked) => setIncludeTOC(!!checked)}
                    />
                    <Label htmlFor="include-toc">Include Table of Contents</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-youtube"
                      checked={includeYouTube}
                      onCheckedChange={(checked) => setIncludeYouTube(!!checked)}
                    />
                    <Label htmlFor="include-youtube">Include YouTube Video</Label>
                  </div>
                </div>
                
                {includeYouTube && (
                  <div className="mt-4">
                    <Label htmlFor="youtube-url">YouTube Video URL</Label>
                    <Input
                      id="youtube-url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back: Keywords
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={testClaudeConnection}
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  Test Claude
                </Button>
              </div>
              <Button onClick={generateClusterContent}>
                Generate Content <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : currentStep === 6 && editedArticles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No articles in this cluster yet.</p>
          </div>
        ) : currentStep === 6 ? (
          <div className="space-y-6">
            {/* Step 6: Review Content */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">6</div>
                <h3 className="text-lg font-medium">Review Content</h3>
              </div>
            </div>
            
            {/* Bulk actions */}
            <div className="bg-muted/40 rounded-md p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all"
                    checked={selectedCount === editedArticles.length && selectedCount > 0}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
                  <Label htmlFor="select-all">
                    {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
                  </Label>
                </div>
                
                {selectedCount > 0 && (
                  <div className="flex items-center space-x-4">
                    <RadioGroup 
                      value={bulkAction} 
                      onValueChange={(value) => setBulkAction(value as 'draft' | 'published' | 'scheduled')}
                      className="flex items-center space-x-4"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="draft" id="draft" />
                        <Label htmlFor="draft">Draft</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="published" id="published" />
                        <Label htmlFor="published">Publish</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="scheduled" id="scheduled" disabled={!canSchedule} />
                        <Label htmlFor="scheduled">Schedule</Label>
                      </div>
                    </RadioGroup>
                    
                    {bulkAction === 'scheduled' && (
                      <div className="flex items-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{scheduleDate ? format(scheduleDate, 'yyyy-MM-dd') : 'Pick date'}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={scheduleDate}
                              onSelect={setScheduleDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-24"
                        />
                      </div>
                    )}
                    
                    <Button 
                      onClick={applyBulkAction}
                      disabled={selectedCount === 0 || (bulkAction === 'scheduled' && !canSchedule)}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Articles accordion */}
            <Accordion type="multiple" className="space-y-4">
              {editedArticles.map((article) => (
                <AccordionItem
                  key={article.id}
                  value={article.id}
                  className={cn(
                    "border rounded-md overflow-hidden",
                    isSelected(article.id) && "ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center px-4 py-2">
                    <Checkbox 
                      checked={isSelected(article.id)}
                      onCheckedChange={() => toggleSelection(article.id)}
                      className="mr-2"
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">{article.title}</span>
                        {article.status && (
                          <Badge 
                            variant={
                              article.status === 'published' ? 'default' : 
                              article.status === 'scheduled' ? 'outline' : 'secondary'
                            }
                            className="mt-1"
                          >
                            {article.status}
                            {article.status === 'scheduled' && article.scheduledDate && (
                              <span className="ml-1">({article.scheduledDate})</span>
                            )}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                  </div>
                  
                  <AccordionContent className="px-4 pb-4">
                    <Tabs defaultValue="edit">
                      <TabsList className="mb-4">
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="edit" className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`title-${article.id}`}>Title</Label>
                            <Input 
                              id={`title-${article.id}`}
                              value={article.title} 
                              onChange={(e) => updateArticleTitle(article.id, e.target.value)}
                            />
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`images-${article.id}`}>Images</Label>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openImageDialog(article.id)}
                              className="flex items-center gap-1"
                            >
                              <ImageIcon className="h-4 w-4" />
                              {article.images && article.images.length > 0 ? 
                                `${article.images.length} Image${article.images.length > 1 ? 's' : ''}` : 
                                'Add Images'}
                            </Button>
                          </div>
                          
                          {/* Display selected images thumbnails */}
                          {article.images && article.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
                              {article.images.map((img: any) => (
                                <div key={img.id} className="relative rounded-md overflow-hidden border">
                                  <img 
                                    src={`/api/proxy/image/${img.id}`}
                                    alt={img.alt || "Selected image"}
                                    className="w-full h-auto aspect-[4/3] object-cover"
                                  />
                                  {img.isFeatured && (
                                    <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-1">
                                      <span className="sr-only">Featured Image</span>
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div>
                            <Label htmlFor={`content-${article.id}`}>Content</Label>
                            <Textarea 
                              id={`content-${article.id}`}
                              value={article.content}
                              onChange={(e) => updateArticleContent(article.id, e.target.value)}
                              className="min-h-[300px]"
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="preview">
                        <div className="prose prose-sm max-w-none border rounded-md p-4 bg-white shadow-sm">
                          {/* Featured image - show featured image or first image if any */}
                          {article.images && article.images.length > 0 && (
                            <div className="mb-4 rounded-md overflow-hidden border">
                              {(() => {
                                const featuredImage = article.images.find(img => img.isFeatured);
                                if (featuredImage) {
                                  // Show featured image if available
                                  return (
                                    <img 
                                      src={`/api/proxy/image/${featuredImage.id}`} 
                                      alt={featuredImage.alt || article.title}
                                      className="w-full h-auto object-cover max-h-[300px]"
                                      onError={(e) => {
                                        // On error, replace with placeholder
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null; // Prevent infinite reload
                                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23f5f5f5'/%3E%3Ctext x='400' y='200' font-family='Arial' font-size='30' text-anchor='middle' alignment-baseline='middle' fill='%23999'%3EFeatured Image%3C/text%3E%3C/svg%3E";
                                      }}
                                    />
                                  );
                                } else if (article.images.length > 0) {
                                  // Otherwise show first image
                                  return (
                                    <img 
                                      src={`/api/proxy/image/${article.images[0].id}`} 
                                      alt={article.images[0].alt || article.title}
                                      className="w-full h-auto object-cover max-h-[300px]"
                                      onError={(e) => {
                                        // On error, replace with placeholder
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null; // Prevent infinite reload
                                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23f5f5f5'/%3E%3Ctext x='400' y='200' font-family='Arial' font-size='30' text-anchor='middle' alignment-baseline='middle' fill='%23999'%3EImage%3C/text%3E%3C/svg%3E";
                                      }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                              <div className="bg-gradient-to-r from-primary/20 to-transparent p-2 text-xs font-medium">
                                Featured Image
                              </div>
                            </div>
                          )}
                          
                          {/* Article title */}
                          <h1 className="text-2xl font-bold mb-4">{article.title}</h1>
                          
                          {/* Table of contents summary */}
                          <div className="bg-slate-50 p-3 rounded-md border mb-6">
                            <h4 className="text-sm font-medium mb-2">Table of Contents</h4>
                            <ul className="text-sm space-y-1">
                              {/* Extract h2s from content to build TOC */}
                              {article.content.match(/<h2[^>]*>(.*?)<\/h2>/g)?.map((match, i) => {
                                const heading = match.replace(/<[^>]+>/g, '');
                                return (
                                  <li key={i} className="text-blue-600 hover:underline">
                                    • {heading}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                          
                          {/* Article content with styled preview */}
                          <div 
                            dangerouslySetInnerHTML={{ __html: article.content }} 
                            className="article-preview"
                          />
                          
                          {/* Display inline content images if any */}
                          {article.images && article.images.length > 1 && (
                            <div className="mt-6 border-t pt-4">
                              <h4 className="text-sm font-medium mb-3">Content Images</h4>
                              <div className="grid grid-cols-3 gap-3">
                                {article.images
                                  .filter(img => !img.isFeatured) // Skip featured image
                                  .map((img) => (
                                    <div key={img.id} className="border rounded-md overflow-hidden">
                                      <img 
                                        src={`/api/proxy/image/${img.id}`} 
                                        alt={img.alt || "Content image"}
                                        className="w-full h-auto object-cover aspect-[4/3]"
                                        onError={(e) => {
                                          // On error, replace with placeholder or fallback
                                          const target = e.target as HTMLImageElement;
                                          target.onerror = null; // Prevent infinite reload
                                          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f5f5f5'/%3E%3Cpath d='M65,35 L35,65 M35,35 L65,65' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E";
                                        }}
                                      />
                                      {img.isContentImage && (
                                        <div className="bg-blue-50 p-1 text-xs font-medium text-blue-700 text-center">
                                          Content Image
                                        </div>
                                      )}
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={article.status === 'draft' ? "default" : "outline"}
                        size="sm"
                        className="col-span-1"
                        onClick={() => updateArticleStatus(article.id, 'draft')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Save as Draft
                      </Button>
                      
                      <Button
                        variant={article.status === 'published' ? "default" : "outline"}
                        size="sm"
                        className="col-span-1"
                        onClick={() => updateArticleStatus(article.id, 'published')}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Publish Now
                      </Button>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={article.status === 'scheduled' ? "default" : "outline"}
                            size="sm"
                            className="col-span-1"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Schedule
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4">
                          <div className="space-y-4">
                            <h4 className="font-medium">Schedule Publication</h4>
                            <div className="grid gap-2">
                              <Label>Date</Label>
                              <CalendarComponent
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                disabled={(date) => date < new Date()}
                                className="rounded-md border"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Time</Label>
                              <Input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                              />
                            </div>
                            <Button 
                              onClick={() => {
                                if (!scheduleDate) {
                                  toast({
                                    title: "Date Required",
                                    description: "Please select a publication date",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                updateArticleStatus(
                                  article.id, 
                                  'scheduled', 
                                  format(scheduleDate, 'yyyy-MM-dd'),
                                  scheduleTime
                                );
                              }}
                              className="w-full"
                            >
                              Schedule Publication
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        className="col-span-3 mt-2 flex items-center justify-center"
                        onClick={() => {
                          // Remove article from the cluster
                          setEditedArticles(prev => prev.filter(a => a.id !== article.id));
                          toast({
                            title: "Article removed",
                            description: "The article has been removed from the cluster",
                          });
                        }}
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Remove Article
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Error: Unknown step encountered</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          <span className="text-sm text-muted-foreground self-center">
            {editedArticles.length} articles in this cluster
          </span>
          {onBack && (
            <Button 
              variant="outline" 
              onClick={onBack}
            >
              Back
            </Button>
          )}
        </div>
        
        {onComplete && editedArticles.length > 0 && (
          <Button 
            onClick={() => onComplete(editedArticles)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Complete
              </>
            )}
          </Button>
        )}
      </CardFooter>
      
      {/* Image selection dialog */}
      <ImageSearchDialog
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onImagesSelected={handleImagesSelected}
        initialSelectedImages={currentArticleId ? 
          // Convert article images to PexelsImage type with required properties
          (editedArticles.find(a => a.id === currentArticleId)?.images || []).map(img => ({
            id: img.id,
            url: img.url || '', // Ensure url is never undefined
            alt: img.alt || '',
            source: ((img.source === 'pexels' || img.source === 'pixabay' || img.source === 'product') 
              ? img.source 
              : 'product') as 'pexels' | 'pixabay' | 'product', // Cast to expected type
            isFeatured: !!img.isFeatured,
            isContentImage: !!img.isContentImage,
            selected: true, // Mark as selected in the dialog
            width: 800, // Default width
            height: 600, // Default height
            src: {
              original: img.url || '',
              large: img.url || '',
              medium: img.url || '',
              small: img.url || '',
              thumbnail: img.url || ''
            }
          })) : []}
        searchKeyword={searchKeyword}
      />
    </Card>
  );
}