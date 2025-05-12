import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
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
import { Calendar, ChevronRight, Sparkles, Bot, Terminal } from 'lucide-react';
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

interface Article {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'scheduled';
  publicationType?: 'draft' | 'published' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
}

interface Keyword {
  keyword: string;
  score: number;
}

interface ClusterWorkflowProps {
  articles: Article[];
  isLoading?: boolean;
  onSave?: (articles: Article[]) => Promise<void>;
  canSchedule?: boolean;
  blogId?: string;
  products?: Product[];
  onBack?: () => void;  // Added callback for back button
}

export default function ClusterWorkflow({
  articles = [],
  isLoading = false,
  onSave,
  canSchedule = true,
  blogId,
  products = [],
  onBack
}: ClusterWorkflowProps) {
  const { toast } = useToast();
  const { storeInfo } = useStore();
  
  // Content creation steps
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [mainTopic, setMainTopic] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string>("");
  
  // Formatting options
  const [writingPerspective, setWritingPerspective] = useState<string>("second-person");
  const [toneOfVoice, setToneOfVoice] = useState<string>("friendly");
  const [introStyle, setIntroStyle] = useState<string>("search-intent-focused");
  const [faqStyle, setFaqStyle] = useState<string>("short");
  
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
  const [isSaving, setIsSaving] = useState(false);
  
  // Keyword suggestions (mock data for UI development)
  const [suggestedKeywords, setSuggestedKeywords] = useState<Keyword[]>([
    { keyword: "water softener", score: 45 },
    { keyword: "water testing", score: 35 },
    { keyword: "water softener installation", score: 27 },
  ]);
  
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
  
  // Update an article's content
  const updateArticleContent = (id: string, content: string) => {
    setEditedArticles(prev => 
      prev.map(article => 
        article.id === id ? { ...article, content } : article
      )
    );
  };
  
  // Update an article's title
  const updateArticleTitle = (id: string, title: string) => {
    setEditedArticles(prev => 
      prev.map(article => 
        article.id === id ? { ...article, title } : article
      )
    );
  };
  
  // Apply bulk action to selected articles
  const applyBulkAction = () => {
    const updatedArticles = editedArticles.map(article => {
      if (selectedArticles[article.id]) {
        return {
          ...article,
          status: bulkAction,
          ...(bulkAction === 'scheduled' ? {
            scheduledDate: scheduleDate ? format(scheduleDate, 'yyyy-MM-dd') : undefined,
            scheduledTime: scheduleTime
          } : {})
        };
      }
      return article;
    });
    
    setEditedArticles(updatedArticles);
    
    toast({
      title: "Bulk Action Applied",
      description: `Applied ${bulkAction} to ${selectedCount} articles`,
    });
  };
  
  // Save all articles
  const saveAllArticles = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    
    try {
      await onSave(editedArticles);
      
      toast({
        title: "Success",
        description: `Saved ${editedArticles.length} articles`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/published"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save articles",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save a single article
  const saveArticle = async (article: Article) => {
    if (!blogId) {
      toast({
        title: "Error",
        description: "No blog selected for publication",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare post data
      const postData: any = {
        title: article.title,
        content: article.content,
        blogId: blogId,
        status: article.status || 'draft',
        publicationType: article.status || 'draft',
        tags: Array.isArray(article.tags) ? article.tags.join(',') : '',
      };
      
      // Add scheduling info if needed
      if (article.status === 'scheduled') {
        postData.scheduledPublishDate = article.scheduledDate;
        postData.scheduledPublishTime = article.scheduledTime || "09:30";
        postData.scheduleDate = article.scheduledDate;
        postData.scheduleTime = article.scheduledTime || "09:30";
      }
      
      // Send request
      await apiRequest("POST", "/api/posts", postData);
      
      toast({
        title: "Success",
        description: `Article "${article.title}" saved as ${article.status}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save article",
        variant: "destructive",
      });
    }
  };
  
  // Determine if an article is selected
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
      const selectedProductsInfo = products.filter(p => selectedProducts.includes(p.id));
      
      toast({
        title: "Generating Content Cluster",
        description: `Creating cluster for "${mainTopic}" with ${selectedProductsInfo.length} products and ${allKeywords.length} keywords`,
      });
      
      // In a real implementation, we would call the Claude API
      try {
        const response = await apiRequest("POST", "/api/claude/cluster", {
          topic: mainTopic,
          products: selectedProductsInfo,
          keywords: allKeywords,
          options: {
            writingPerspective,
            toneOfVoice,
            introStyle,
            faqStyle,
            enableTables,
            enableLists,
            enableH1,
            enableCitations
          }
        });
        
        // Process the response from Claude
        if (response.success && response.cluster) {
          // Convert the cluster data into the format expected by our UI
          const articles = response.cluster.subtopics.map((article: any, index: number) => ({
            id: `cluster-${index + 1}`,
            title: article.title,
            content: article.content,
            tags: article.keywords || [mainTopic],
            status: 'draft' as const
          }));
          
          setEditedArticles(articles);
          
          toast({
            title: "Cluster Generated",
            description: `Successfully generated ${articles.length} articles for your content cluster`,
          });
        } else {
          throw new Error(response.message || "Failed to generate content cluster");
        }
      } catch (error) {
        console.log("Using demo content due to API error:", error);
        
        // For demo/fallback purposes, generate some mock content
        // This would normally come from Claude but we provide fallback content
        const clusterTopics = [
          `Complete Guide to ${mainTopic}: Everything You Need to Know`,
          `How to Choose the Best ${mainTopic} for Your Home`,
          `${mainTopic} Installation: Step-by-Step Instructions`,
          `Troubleshooting Common ${mainTopic} Problems`
        ];
        
        const mockCluster = clusterTopics.map((title: string, index: number) => ({
          id: `demo-${index + 1}`,
          title,
          content: `<h2>Introduction to ${title}</h2>
          <p>This comprehensive article about ${title} explores everything you need to know, with a focus on our premium products.</p>
          
          <h2>Key Points About ${mainTopic}</h2>
          <p>When considering a ${mainTopic}, keep these important factors in mind:</p>
          <ul>
            <li>Quality materials ensure longer lifespan</li>
            <li>Proper installation is critical for performance</li>
            <li>Regular maintenance prevents expensive repairs</li>
          </ul>
          
          <h2>Conclusion</h2>
          <p>Investing in a high-quality ${mainTopic} provides lasting benefits for your home and family.</p>`,
          tags: [mainTopic, ...selectedKeywords.slice(0, 3).map(k => k.keyword)],
          status: 'draft' as const
        }));
        
        setEditedArticles(mockCluster);
        
        toast({
          title: "Demo Mode",
          description: `Generated ${mockCluster.length} articles using sample content`,
        });
      }
      
      // Move to the articles view
      setCurrentStep(4);
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
          {currentStep < 4 
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
            
            <div className="space-y-4">
              <div>
                <Label>Cluster Topic</Label>
                <Input 
                  value={mainTopic}
                  onChange={(e) => setMainTopic(e.target.value)}
                  placeholder="e.g., Water Softener Installation Guide"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This will be the main topic for your content cluster
                </p>
              </div>
              
              <div>
                <Label>Select Products</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose products to feature in your content
                </p>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {products.length === 0 ? (
                    <div className="text-center py-4 border rounded-md bg-muted/30">
                      <p className="text-muted-foreground">No products available</p>
                    </div>
                  ) : (
                    products.map(product => (
                      <div key={product.id} className="flex items-start space-x-2 p-2 border rounded-md">
                        <Checkbox 
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts(prev => [...prev, product.id]);
                            } else {
                              setSelectedProducts(prev => prev.filter(id => id !== product.id));
                            }
                          }}
                        />
                        <div>
                          <p className="font-medium">{product.title}</p>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={testClaudeConnection}
                className="flex items-center gap-2"
              >
                <Bot className="h-4 w-4" />
                Test Claude Connection
              </Button>
              
              <Button onClick={() => setCurrentStep(2)}>
                Next: Keywords <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : currentStep === 2 ? (
          // Step 2: Choose Keywords
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">1</div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">2</div>
              </div>
              <div className="flex space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">3</div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">4</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <Label>Selected Keywords</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedKeywords([])}
                    disabled={selectedKeywords.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2 min-h-[60px] p-2 border rounded-md">
                  {selectedKeywords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No keywords selected</p>
                  ) : (
                    selectedKeywords.map(keyword => (
                      <Badge 
                        key={keyword.keyword} 
                        className="flex items-center gap-1 px-3 py-1"
                        variant="secondary"
                      >
                        {keyword.keyword}
                        <span className="text-xs opacity-70">({keyword.score})</span>
                        <button 
                          className="ml-1 text-muted-foreground hover:text-foreground" 
                          onClick={() => setSelectedKeywords(prev => 
                            prev.filter(k => k.keyword !== keyword.keyword)
                          )}
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              
              <div>
                <Label>Suggested Keywords</Label>
                <div className="space-y-2 mt-2">
                  {suggestedKeywords.map(keyword => (
                    <div 
                      key={keyword.keyword}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center">
                        <span className="font-medium">{keyword.keyword}</span>
                        <Badge className="ml-2" variant="outline">{keyword.score}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant={selectedKeywords.some(k => k.keyword === keyword.keyword) ? "default" : "outline"}
                        onClick={() => {
                          if (selectedKeywords.some(k => k.keyword === keyword.keyword)) {
                            setSelectedKeywords(prev => prev.filter(k => k.keyword !== keyword.keyword));
                          } else {
                            setSelectedKeywords(prev => [...prev, keyword]);
                          }
                        }}
                      >
                        {selectedKeywords.some(k => k.keyword === keyword.keyword) ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Custom Keywords</Label>
                <Input
                  placeholder="Enter custom keywords separated by commas"
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Add additional keywords separated by commas
                </p>
              </div>
            </div>
            
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back: Products
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
              <Button onClick={() => setCurrentStep(3)}>
                Next: Style <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : currentStep === 3 ? (
          // Step 3: Style & Settings
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">1</div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">2</div>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">3</div>
              </div>
              <div className="flex space-x-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">4</div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Style & Formatting</h3>
                
                <div>
                  <Label>Writing Perspective</Label>
                  <Select 
                    value={writingPerspective}
                    onValueChange={setWritingPerspective}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select writing perspective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first-person">First Person (I, We)</SelectItem>
                      <SelectItem value="second-person">Second Person (You, Your)</SelectItem>
                      <SelectItem value="third-person">Third Person (They, It)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Tone of Voice</Label>
                  <Select 
                    value={toneOfVoice}
                    onValueChange={setToneOfVoice}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select tone of voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Introduction Style</Label>
                  <Select 
                    value={introStyle}
                    onValueChange={setIntroStyle}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select introduction style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="search-intent-focused">Search Intent Focused</SelectItem>
                      <SelectItem value="problem-solution">Problem-Solution</SelectItem>
                      <SelectItem value="story-based">Story-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>FAQ Section</Label>
                  <Select 
                    value={faqStyle}
                    onValueChange={setFaqStyle}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select FAQ style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (3-5 Q&As)</SelectItem>
                      <SelectItem value="medium">Medium (5-8 Q&As)</SelectItem>
                      <SelectItem value="detailed">Detailed (8-10 Q&As)</SelectItem>
                      <SelectItem value="none">No FAQ Section</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Content Options</h3>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="enable-tables" 
                    checked={enableTables}
                    onCheckedChange={(checked) => setEnableTables(!!checked)}
                  />
                  <div>
                    <Label 
                      htmlFor="enable-tables" 
                      className="font-medium"
                    >
                      Enable Tables
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use comparison tables
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="enable-lists" 
                    checked={enableLists}
                    onCheckedChange={(checked) => setEnableLists(!!checked)}
                  />
                  <div>
                    <Label 
                      htmlFor="enable-lists" 
                      className="font-medium"
                    >
                      Enable Lists
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use bullet points
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="enable-h1" 
                    checked={enableH1}
                    onCheckedChange={(checked) => setEnableH1(!!checked)}
                  />
                  <div>
                    <Label 
                      htmlFor="enable-h1" 
                      className="font-medium"
                    >
                      Enable H1 Headings
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use sub-headings
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="enable-citations" 
                    checked={enableCitations}
                    onCheckedChange={(checked) => setEnableCitations(!!checked)}
                  />
                  <div>
                    <Label 
                      htmlFor="enable-citations" 
                      className="font-medium"
                    >
                      Enable Citations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Add external links
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <div className="flex gap-2">
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
        ) : editedArticles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No articles in this cluster yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
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
                      size="sm" 
                      onClick={applyBulkAction}
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
                        <div className="prose prose-sm max-w-none">
                          <h2>{article.title}</h2>
                          <div dangerouslySetInnerHTML={{ __html: article.content }} />
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          saveArticle({
                            ...article,
                            status: 'draft'
                          });
                        }}
                      >
                        Save as Draft
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          saveArticle({
                            ...article,
                            status: 'published'
                          });
                        }}
                      >
                        Publish Now
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="text-sm text-muted-foreground">
          {editedArticles.length} articles in this cluster
        </span>
        <Button
          onClick={saveAllArticles}
          disabled={isSaving || editedArticles.length === 0}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Saving...
            </>
          ) : (
            "Save All"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}