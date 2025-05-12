import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import ClusterWorkflow from '@/components/ClusterWorkflow';
import ImageSearchDialog from '@/components/ImageSearchDialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  Sparkles, 
  ShoppingBag, 
  Tag, 
  BookOpen,
  CheckSquare,
  XSquare,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  FolderOpen,
  Info,
  Store,
  Image
} from 'lucide-react';

// Define types for our workflow
interface Product {
  id: string;
  title: string;
  description?: string;
  image?: string;
}

interface Collection {
  id: string;
  title: string;
  description?: string;
  image?: string;
  productsCount?: number;
  isSmartCollection?: boolean;
}

interface Keyword {
  keyword: string;
  score: number;
  volume?: string;
  searchVolume?: number;
  difficulty?: number;
  competition?: number;
  cpc?: number;
  isFeatured?: boolean;
  isMain?: boolean;
  intent?: string; // Informational, Transactional, Commercial, Navigational
}

interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  keywords: string[];
}

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
}

export default function OpenAIWorkflow() {
  const { toast } = useToast();
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Data states
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Collection[]>([]);
  const [keywordsList, setKeywordsList] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Keyword[]>([]);
  const [featuredKeyword, setFeaturedKeyword] = useState<string | null>(null);
  const [mainKeywords, setMainKeywords] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [keywordSortOption, setKeywordSortOption] = useState<string>("score");
  const [intentFilters, setIntentFilters] = useState<string[]>([]);
  const [suggestedTopics, setSuggestedTopics] = useState<TopicSuggestion[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null);
  const [generatedArticles, setGeneratedArticles] = useState<GeneratedArticle[]>([]);
  
  // Content source selection
  const [selectedTab, setSelectedTab] = useState<string>("products");
  
  // Selected images for content
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  
  // Styling & formatting options
  const [writingPerspective, setWritingPerspective] = useState<string>("second-person");
  const [toneOfVoice, setToneOfVoice] = useState<string>("friendly");
  const [introStyle, setIntroStyle] = useState<string>("search-intent-focused");
  const [faqStyle, setFaqStyle] = useState<string>("short");
  const [enableTables, setEnableTables] = useState<boolean>(true);
  const [enableLists, setEnableLists] = useState<boolean>(true);
  const [enableH1, setEnableH1] = useState<boolean>(true);
  const [enableCitations, setEnableCitations] = useState<boolean>(true);
  
  // Content creation mode and blog selection
  const [contentMode, setContentMode] = useState<'cluster' | 'single'>('cluster');
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);
  
  // Advanced content settings
  const [contentType, setContentType] = useState<'blog' | 'page'>('blog');
  const [numH2s, setNumH2s] = useState<number>(5);
  const [articleLength, setArticleLength] = useState<string>("medium");
  const [enableBolding, setEnableBolding] = useState<boolean>(true);
  const [enableExternalLinks, setEnableExternalLinks] = useState<boolean>(true);
  const [includeYouTube, setIncludeYouTube] = useState<boolean>(false);
  const [includeTOC, setIncludeTOC] = useState<boolean>(true);
  const [authorInfo, setAuthorInfo] = useState<string | null>(null);
  const [buyerProfileText, setBuyerProfileText] = useState<string>('');

  // Loading states
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isGeneratingCluster, setIsGeneratingCluster] = useState(false);
  
  // Get store products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery<any>({
    queryKey: ['/api/admin/products'],
  });
  
  // Get store collections
  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery<any>({
    queryKey: ['/api/admin/collections'],
  });
  
  // Get store blogs
  const { data: blogsData, isLoading: isLoadingBlogs } = useQuery<any>({
    queryKey: ['/api/admin/blogs'],
  });
  
  // Get permissions
  const { data: permissionsData } = useQuery<any>({
    queryKey: ['/api/shopify/check-permissions'],
  });
  
  // Extract data from queries
  const products = productsData?.products || [];
  const collections = collectionsData?.collections || [];
  const canSchedule = permissionsData?.hasPermission;
  const blogId = blogsData?.blogs?.[0]?.id;
  
  // Is the store data loading?
  const isLoadingStoreData = isLoadingProducts || isLoadingCollections;
  
  // Handle content source selection (products or collections)
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
  };
  
  // Step 1: Handle product selection
  const toggleProductSelection = (product: Product) => {
    if (selectedProducts.some(p => p.id === product.id)) {
      setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts(prev => [...prev, product]);
    }
  };
  
  // Handle collection selection
  const toggleCollectionSelection = (collection: Collection) => {
    if (selectedCollections.some(c => c.id === collection.id)) {
      setSelectedCollections(prev => prev.filter(c => c.id !== collection.id));
    } else {
      setSelectedCollections(prev => [...prev, collection]);
    }
  };
  
  // Step 2: Generate and fetch keyword suggestions based on selected products or collections
  const generateKeywordSuggestions = async () => {
    // Check if we have products or collections selected
    const hasSelectedContent = 
      (selectedTab === 'products' && selectedProducts.length > 0) ||
      (selectedTab === 'collections' && selectedCollections.length > 0);
    
    if (!hasSelectedContent) {
      toast({
        title: "No Content Selected",
        description: `Please select at least one ${selectedTab === 'products' ? 'product' : 'collection'} to generate keywords`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingKeywords(true);
    
    try {
      let requestData;
      
      if (selectedTab === 'products') {
        // Extract product information for the request
        const productInfo = selectedProducts.map(product => ({
          id: product.id,
          title: product.title,
          description: product.description
        }));
        
        requestData = {
          products: productInfo
        };
      } else {
        // Extract collection information for the request
        const collectionInfo = selectedCollections.map(collection => ({
          id: collection.id,
          title: collection.title,
          description: collection.description
        }));
        
        requestData = {
          collections: collectionInfo
        };
      }
      
      console.log("Sending keyword request with data:", JSON.stringify(requestData));
      
      // Call the DataForSEO API through our backend
      const response = await apiRequest("POST", "/api/admin/keywords-for-product", requestData);
      
      if (response.success && response.keywords) {
        // Format the received keywords
        const formattedKeywords: Keyword[] = response.keywords.map((kw: any) => ({
          keyword: kw.keyword,
          score: kw.score || 0,
          volume: kw.volume || 'N/A',
          searchVolume: kw.searchVolume || kw.search_volume || 0,
          difficulty: kw.difficulty || 0,
          competition: kw.competition || 0,
          cpc: kw.cpc || 0,
          isFeatured: false,
          isMain: false
        }));
        
        toast({
          title: "Keywords Generated",
          description: `Found ${formattedKeywords.length} keyword suggestions`
        });
        
        // Auto-select the top 5 keywords and set the highest one as featured
        const topKeywords = [...formattedKeywords]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        
        // Set as selected keywords
        setSelectedKeywords(topKeywords);
        
        // Mark the top keyword as featured
        if (topKeywords.length > 0) {
          setFeaturedKeyword(topKeywords[0].keyword);
          
          // Mark top 3 as main keywords
          const mainKeywordsList = topKeywords.slice(0, 3).map(k => k.keyword);
          setMainKeywords(mainKeywordsList);
        }
        
        // Store all keywords for display and filtering
        setKeywordsList(formattedKeywords);
        
        // Move to the next step
        setCurrentStep(2);
        
      } else {
        throw new Error(response.message || "Failed to generate keywords");
      }
    } catch (error) {
      console.error("Error generating keywords:", error);
      
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate keywords",
        variant: "destructive",
      });
      
      // Generate some mock keywords for development/demo purposes with enhanced data
      const mockKeywords: Keyword[] = [
        { 
          keyword: "Free Water Conditioner CITY", 
          score: 95, 
          volume: "0", 
          searchVolume: 0,
          difficulty: 0,
          competition: 0.15,
          cpc: 0,
          intent: "Navigational"
        },
        { 
          keyword: "reverse osmosis", 
          score: 88, 
          volume: "301,000/mo", 
          searchVolume: 301000,
          difficulty: 91,
          competition: 0.78,
          cpc: 1.8,
          intent: "Navigational"
        },
        { 
          keyword: "water softener", 
          score: 82, 
          volume: "135,000/mo", 
          searchVolume: 135000,
          difficulty: 100,
          competition: 0.85,
          cpc: 1.5,
          intent: "Navigational"
        },
        { 
          keyword: "best water conditioner", 
          score: 79, 
          volume: "40,500/mo", 
          searchVolume: 40500,
          difficulty: 59,
          competition: 0.2,
          cpc: 1.9,
          intent: "Commercial"
        },
        { 
          keyword: "water filter", 
          score: 75, 
          volume: "110,000/mo", 
          searchVolume: 110000,
          difficulty: 90,
          competition: 0.75,
          cpc: 1.7,
          intent: "Navigational"
        },
        { 
          keyword: "salt-free water conditioner", 
          score: 72, 
          volume: "15,400/mo", 
          searchVolume: 15400,
          difficulty: 62,
          competition: 0.3,
          cpc: 2.1,
          intent: "Informational"
        },
        { 
          keyword: "water filter for home", 
          score: 68, 
          volume: "21,400/mo", 
          searchVolume: 21400,
          difficulty: 75,
          competition: 0.68,
          cpc: 1.8,
          intent: "Commercial"
        },
        { 
          keyword: "water filtration system", 
          score: 65, 
          volume: "25,800/mo", 
          searchVolume: 25800,
          difficulty: 81,
          competition: 0.71,
          cpc: 2.2,
          intent: "Commercial"
        },
        { 
          keyword: "SoftPro Elite reviews", 
          score: 62, 
          volume: "2,200/mo", 
          searchVolume: 2200,
          difficulty: 45,
          competition: 0.25,
          cpc: 1.4,
          intent: "Informational"
        },
        { 
          keyword: "hard water solution", 
          score: 59, 
          volume: "5,800/mo", 
          searchVolume: 5800,
          difficulty: 52,
          competition: 0.55,
          cpc: 1.3,
          intent: "Informational"
        },
        { 
          keyword: "water softener alternative", 
          score: 55, 
          volume: "6,700/mo", 
          searchVolume: 6700,
          difficulty: 68,
          competition: 0.45,
          cpc: 1.9,
          intent: "Informational"
        },
        { 
          keyword: "SoftPro vs Water Right", 
          score: 50, 
          volume: "1,300/mo", 
          searchVolume: 1300,
          difficulty: 35,
          competition: 0.3,
          cpc: 1.1,
          intent: "Commercial"
        }
      ];
      
      // Set the selected keywords and featured/main keywords
      setSelectedKeywords(mockKeywords.slice(0, 5));
      setFeaturedKeyword(mockKeywords[0].keyword);
      setMainKeywords(mockKeywords.slice(0, 3).map(k => k.keyword));
      setKeywordsList(mockKeywords);
      setCurrentStep(2);
    } finally {
      setIsLoadingKeywords(false);
    }
  };
  
  // Toggle keyword selection
  const toggleKeywordSelection = (keyword: Keyword) => {
    if (selectedKeywords.some(k => k.keyword === keyword.keyword)) {
      setSelectedKeywords(prev => prev.filter(k => k.keyword !== keyword.keyword));
      
      // If the keyword was featured, reset the featured keyword
      if (featuredKeyword === keyword.keyword) {
        setFeaturedKeyword(null);
      }
      
      // If the keyword was main, remove it from main keywords
      if (mainKeywords.includes(keyword.keyword)) {
        setMainKeywords(prev => prev.filter(k => k !== keyword.keyword));
      }
    } else {
      setSelectedKeywords(prev => [...prev, keyword]);
    }
  };
  
  // Set a keyword as featured (primary)
  const setKeywordAsFeatured = (keyword: string) => {
    // Can only set featured keyword if it's selected
    if (selectedKeywords.some(k => k.keyword === keyword)) {
      setFeaturedKeyword(keyword);
    }
  };
  
  // Toggle a keyword as main (important)
  const toggleMainKeyword = (keyword: string) => {
    // Can only set main keyword if it's selected
    if (selectedKeywords.some(k => k.keyword === keyword)) {
      if (mainKeywords.includes(keyword)) {
        setMainKeywords(prev => prev.filter(k => k !== keyword));
      } else {
        setMainKeywords(prev => [...prev, keyword]);
      }
    }
  };
  
  // Toggle intent filter
  const toggleIntentFilter = (intent: string) => {
    setIntentFilters(prev => {
      if (prev.includes(intent)) {
        return prev.filter(i => i !== intent);
      } else {
        return [...prev, intent];
      }
    });
  };
  
  // Filter and sort keywords
  const getFilteredKeywords = () => {
    let filtered = [...keywordsList];
    
    // Apply text filter if provided
    if (keywordFilter) {
      const lowercaseFilter = keywordFilter.toLowerCase();
      filtered = filtered.filter(k => 
        k.keyword.toLowerCase().includes(lowercaseFilter)
      );
    }
    
    // Apply intent filters if any are selected
    if (intentFilters.length > 0) {
      filtered = filtered.filter(k => 
        k.intent && intentFilters.includes(k.intent)
      );
    }
    
    // Apply sorting
    switch (keywordSortOption) {
      case 'score':
        filtered.sort((a, b) => b.score - a.score);
        break;
      case 'volume':
        filtered.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
        break;
      case 'difficulty':
        filtered.sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0)); // Lower is better
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.keyword.localeCompare(b.keyword));
        break;
      default:
        filtered.sort((a, b) => b.score - a.score);
    }
    
    return filtered;
  };
  
  // Step 3: Generate topic suggestions with OpenAI based on selected content and keywords
  const generateTopicSuggestions = async () => {
    if (selectedKeywords.length === 0 && !customKeywords.trim()) {
      toast({
        title: "No Keywords Selected",
        description: "Please select at least one keyword or enter custom keywords",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingTopics(true);
    
    try {
      // Combine selected keywords with custom keywords
      const allKeywords = [
        ...selectedKeywords.map(k => k.keyword),
        ...customKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
      ];
      
      // Prepare request data based on selected tab
      let requestData: any = {
        keywords: allKeywords
      };
      
      if (selectedTab === 'products' && selectedProducts.length > 0) {
        // Product information
        requestData.products = selectedProducts.map(product => ({
          id: product.id,
          title: product.title,
          description: product.description
        }));
      } else if (selectedTab === 'collections' && selectedCollections.length > 0) {
        // Collection information
        requestData.collections = selectedCollections.map(collection => ({
          id: collection.id,
          title: collection.title,
          description: collection.description
        }));
      }
      
      console.log("Sending topic generation request with data:", JSON.stringify(requestData));
      
      // Call the OpenAI topic suggestion API
      const response = await apiRequest("POST", "/api/openai/topic-suggestions", requestData);
      
      if (response.success && response.topics) {
        const topics: TopicSuggestion[] = response.topics.map((topic: any, index: number) => ({
          id: `topic-${index + 1}`,
          title: topic.title,
          description: topic.description || "",
          keywords: selectedTopic?.keywords || allKeywords.slice(0, 3)
        }));
        
        setSuggestedTopics(topics);
        
        toast({
          title: "Topics Generated",
          description: `Generated ${topics.length} topic suggestions`
        });
        
        // Move to topic selection step
        setCurrentStep(3);
      } else {
        throw new Error(response.message || "Failed to generate topic suggestions");
      }
    } catch (error) {
      console.error("Error generating topic suggestions:", error);
      
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate topic suggestions",
        variant: "destructive",
      });
      
      // Generate mock topic suggestions for development/demo
      let contentNames = "";
      if (selectedTab === 'products') {
        contentNames = selectedProducts.map(p => p.title).join(", ");
      } else {
        contentNames = selectedCollections.map(c => c.title).join(", ");
      }
      const keywordList = selectedKeywords.map(k => k.keyword);
      const primaryKeyword = keywordList[0] || "water filtration";
      
      const mockTopics = [
        {
          id: "topic-1",
          title: `Complete Guide to ${primaryKeyword}: Everything You Need to Know in 2025`,
          description: `A comprehensive guide covering all aspects of ${primaryKeyword}, including types, benefits, installation, and maintenance.`,
          keywords: keywordList.slice(0, 3)
        },
        {
          id: "topic-2",
          title: `Top 10 Best ${primaryKeyword} Systems for Homes in 2025`,
          description: `A detailed comparison of the top ${primaryKeyword} systems available in the market, with pros, cons, and buying advice.`,
          keywords: keywordList.slice(0, 3)
        },
        {
          id: "topic-3",
          title: `How to Choose the Right ${primaryKeyword} System for Your Home`,
          description: `A step-by-step guide to help homeowners select the perfect ${primaryKeyword} system based on their specific needs and circumstances.`,
          keywords: keywordList.slice(0, 3)
        },
        {
          id: "topic-4",
          title: `${primaryKeyword} Installation Guide: DIY vs Professional Installation`,
          description: `An examination of whether to install a ${primaryKeyword} system yourself or hire a professional, with cost comparisons and considerations.`,
          keywords: keywordList.slice(0, 3)
        },
        {
          id: "topic-5",
          title: `Common Problems with ${primaryKeyword} Systems and How to Fix Them`,
          description: `Troubleshooting guide for the most frequent issues with ${primaryKeyword} systems, including maintenance tips and when to call a professional.`,
          keywords: keywordList.slice(0, 3)
        },
        {
          id: "topic-6",
          title: `The Health Benefits of Installing a ${primaryKeyword} System`,
          description: `An exploration of how ${primaryKeyword} systems improve water quality and the positive impact on health and wellbeing.`,
          keywords: keywordList.slice(0, 3)
        },
        {
          id: "topic-7",
          title: `${primaryKeyword} vs Traditional Systems: Which is Better?`,
          description: `A detailed comparison between ${primaryKeyword} systems and conventional alternatives, helping readers make an informed decision.`,
          keywords: keywordList.slice(0, 3)
        }
      ];
      
      setSuggestedTopics(mockTopics);
      setCurrentStep(3);
    } finally {
      setIsLoadingTopics(false);
    }
  };
  
  // Select a topic and move to styling & image selection step
  const selectTopicAndGenerate = (topic: TopicSuggestion) => {
    setSelectedTopic(topic);
    
    // Move to the styling & image selection step
    setCurrentStep(4);
    
    toast({
      title: "Topic Selected",
      description: `Selected topic: "${topic.title}"`,
    });
  };
  
  // Handle image selection
  const handleImagesSelected = (images: any[]) => {
    setSelectedImages(images);
    setIsImageDialogOpen(false);
  };
  
  // Generate the content cluster with selected styling and images
  const generateContentCluster = async () => {
    if (!selectedTopic) {
      toast({
        title: "Topic Required",
        description: "Please select a topic before generating content",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingCluster(true);
    
    try {
      toast({
        title: "Generating Content Cluster",
        description: `Creating content cluster for "${selectedTopic.title}"`,
      });
      
      // Call the content generation API
      const response = await apiRequest("POST", "/api/claude/cluster", {
        topic: selectedTopic.title,
        products: selectedProducts,
        keywords: selectedTopic.keywords,
        options: {
          writingPerspective,
          toneOfVoice,
          introStyle,
          faqStyle,
          enableTables,
          enableLists,
          enableH1,
          enableCitations
        },
        images: selectedImages.map(img => ({
          url: img.url || img.src?.medium,
          alt: img.alt || selectedTopic.title,
          source: img.source || 'custom'
        }))
      });
      
      if (response.success && response.cluster) {
        // Convert the cluster data into the format expected by our UI
        const articles: GeneratedArticle[] = response.cluster.subtopics.map((article: any, index: number) => ({
          id: `cluster-${index + 1}`,
          title: article.title,
          content: article.content,
          tags: article.keywords || selectedTopic.keywords,
          status: 'draft'
        }));
        
        setGeneratedArticles(articles);
        
        toast({
          title: "Cluster Generated",
          description: `Successfully generated ${articles.length} articles for your content cluster`,
        });
        
        // Move to the content review step
        setCurrentStep(5);
      } else {
        throw new Error(response.message || "Failed to generate content cluster");
      }
    } catch (error) {
      console.error("Error generating content cluster:", error);
      
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate content cluster",
        variant: "destructive",
      });
      
      // Generate fallback mock content for development/demo
      const mockArticles = [
        {
          id: "demo-1",
          title: selectedTopic.title,
          content: `<h2>Introduction to ${selectedTopic.title}</h2>
          <p>This comprehensive article about ${selectedTopic.title} explores everything you need to know, with a focus on our premium products.</p>
          
          <h2>Key Points About ${selectedTopic.title}</h2>
          <p>When considering this topic, keep these important factors in mind:</p>
          <ul>
            <li>Quality materials ensure longer lifespan</li>
            <li>Proper installation is critical for performance</li>
            <li>Regular maintenance prevents expensive repairs</li>
          </ul>
          
          <h2>Conclusion</h2>
          <p>Investing in high-quality products provides lasting benefits for your home and family.</p>`,
          tags: selectedTopic.keywords,
          status: 'draft' as const
        },
        {
          id: "demo-2",
          title: `How to Choose the Best ${selectedTopic.keywords[0] || 'Products'} for Your Home`,
          content: `<h2>Selection Guide</h2>
          <p>Choosing the right solution can be overwhelming with so many options available. This guide will help you make an informed decision.</p>
          
          <h2>Key Factors to Consider</h2>
          <p>When evaluating solutions, keep these factors in mind:</p>
          <ul>
            <li>Budget constraints and long-term costs</li>
            <li>Compatibility with your existing systems</li>
            <li>Scalability for future growth</li>
            <li>Technical support and documentation</li>
          </ul>
          
          <h2>Making the Final Decision</h2>
          <p>Before finalizing your choice, consider conducting a trial or requesting a demonstration to ensure it meets your specific requirements.</p>`,
          tags: selectedTopic.keywords,
          status: 'draft' as const
        },
        {
          id: "demo-3",
          title: `Installation Guide: Step-by-Step Instructions`,
          content: `<h2>Before You Begin</h2>
          <p>Proper installation is crucial for optimal performance and longevity. Follow these step-by-step instructions for best results.</p>
          
          <h2>Required Tools and Materials</h2>
          <ul>
            <li>Basic hand tools (screwdriver, wrench, pliers)</li>
            <li>Measuring tape</li>
            <li>Safety equipment (gloves, eye protection)</li>
            <li>Additional components as specified in your product manual</li>
          </ul>
          
          <h2>Installation Steps</h2>
          <ol>
            <li>Preparation: Turn off water supply and electrical connections</li>
            <li>Remove existing equipment if applicable</li>
            <li>Position the new system according to specifications</li>
            <li>Connect all components following the diagram</li>
            <li>Test for leaks and proper operation</li>
          </ol>
          
          <h2>Troubleshooting Common Installation Issues</h2>
          <p>If you encounter problems during installation, check these common issues first before calling support.</p>`,
          tags: selectedTopic.keywords,
          status: 'draft' as const
        },
        {
          id: "demo-4",
          title: `Maintenance and Troubleshooting Guide`,
          content: `<h2>Regular Maintenance Tasks</h2>
          <p>Proper maintenance is essential for keeping your system working efficiently and extending its lifespan.</p>
          
          <h2>Monthly Maintenance Checklist</h2>
          <ul>
            <li>Inspect for leaks or unusual noises</li>
            <li>Check pressure readings if applicable</li>
            <li>Clean external surfaces</li>
          </ul>
          
          <h2>Quarterly Maintenance Tasks</h2>
          <ul>
            <li>Replace filters as recommended</li>
            <li>Inspect internal components</li>
            <li>Run system diagnostics if available</li>
          </ul>
          
          <h2>Troubleshooting Common Problems</h2>
          <p>When your system isn't performing as expected, try these solutions before calling for service.</p>`,
          tags: selectedTopic.keywords,
          status: 'draft' as const
        }
      ];
      
      setGeneratedArticles(mockArticles);
      setCurrentStep(5);
    } finally {
      setIsGeneratingCluster(false);
    }
  };
  
  // Handle saving all articles
  const handleSaveAllArticles = async (articles: any[]) => {
    try {
      toast({
        title: "Saving Articles",
        description: "Saving all articles to your Shopify store...",
      });
      
      // In a real implementation, we would call the API to save all articles
      const results = await Promise.all(
        articles.map(article => {
          // Create a post object
          const postData = {
            title: article.title,
            content: article.content,
            blogId: blogId,
            status: article.status,
            tags: Array.isArray(article.tags) ? article.tags.join(',') : '',
            ...(article.status === 'scheduled' ? {
              scheduledPublishDate: article.scheduledDate,
              scheduledPublishTime: article.scheduledTime || "09:30"
            } : {})
          };
          
          // Save the post
          return apiRequest("POST", "/api/posts", postData);
        })
      );
      
      toast({
        title: "Success",
        description: `Saved ${articles.length} articles to your Shopify store`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/published"] });
      
      // Reset workflow
      setSelectedProducts([]);
      setSelectedCollections([]);
      setSelectedKeywords([]);
      setCustomKeywords("");
      setSuggestedTopics([]);
      setSelectedTopic(null);
      setGeneratedArticles([]);
      setCurrentStep(1);
      
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save articles",
        variant: "destructive",
      });
    }
  };
  
  // Render content mode selection step
  const renderContentModeSelection = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Step 1: Choose Content Creation Mode
          </CardTitle>
          <CardDescription>
            Select whether to create a content cluster or a single post
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-base font-medium mb-3">1. Select Content Mode</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer hover:border-primary transition-colors ${contentMode === 'cluster' ? 'border-primary bg-primary/5' : 'border'}`} 
                  onClick={() => setContentMode('cluster')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Content Cluster</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Create multiple related articles optimized for SEO performance.</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer hover:border-primary transition-colors ${contentMode === 'single' ? 'border-primary bg-primary/5' : 'border'}`}
                  onClick={() => setContentMode('single')}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Single Post</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Create a single blog post or page with targeted keywords.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-base font-medium mb-3">2. Select Content Type</h3>
              <div className="flex space-x-4">
                <Button 
                  variant={contentType === 'blog' ? "default" : "outline"}
                  onClick={() => setContentType('blog')}
                  className="flex-1 py-6"
                >
                  <div className="flex flex-col items-center">
                    <BookOpen className="h-6 w-6 mb-2" />
                    <span>Blog Post</span>
                  </div>
                </Button>
                <Button 
                  variant={contentType === 'page' ? "default" : "outline"}
                  onClick={() => setContentType('page')}
                  className="flex-1 py-6"
                >
                  <div className="flex flex-col items-center">
                    <FolderOpen className="h-6 w-6 mb-2" />
                    <span>Page</span>
                  </div>
                </Button>
              </div>
            </div>
            
            {contentType === 'blog' && (
              <div className="space-y-3 mt-4">
                <div className="bg-blue-50 p-3 rounded-md mb-4">
                  <div className="text-sm font-medium text-blue-800">Content Type: Blog Post</div>
                  <p className="text-xs text-blue-700 mt-1">Select where this content will be published</p>
                </div>
                <Label>Select Blog</Label>
                <Select 
                  value={selectedBlog || ""} 
                  onValueChange={setSelectedBlog}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a blog" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogsData?.blogs?.map((blog: any) => (
                      <SelectItem key={blog.id} value={blog.id.toString()}>
                        {blog.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {contentType === 'page' && (
              <div className="space-y-3 mt-4">
                <div className="bg-green-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-green-800">Content Type: Page</div>
                  <p className="text-xs text-green-700 mt-1">Pages are published directly to your Shopify store</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {contentType === 'blog' && !selectedBlog && (
              <span className="text-amber-600 flex items-center">
                <Info className="h-4 w-4 mr-1" /> Please select a blog before continuing
              </span>
            )}
          </div>
          <Button 
            onClick={() => setCurrentStep(2)} 
            disabled={contentType === 'blog' && !selectedBlog}
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Render product selection step
  const renderProductSelection = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Store className="mr-2 h-5 w-5" />
            Step 2: Select Products or Collections
          </CardTitle>
          <CardDescription>
            Choose products or collections to feature in your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="products" 
            value={selectedTab}
            onValueChange={handleTabChange}
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex items-center">
                <FolderOpen className="mr-2 h-4 w-4" />
                Collections
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="products" className="mt-4">
              {isLoadingProducts ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-4">
                    {products.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground">No products found in your store</p>
                      </div>
                    ) : (
                      products.map((product: any) => (
                        <div 
                          key={product.id} 
                          className={`flex items-start space-x-4 p-3 rounded-md border ${
                            selectedProducts.some(p => p.id === product.id) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                          onClick={() => toggleProductSelection(product)}
                        >
                          {product.image ? (
                            <img
                              src={product.image.src}
                              alt={product.title}
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{product.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {product.description || 'No description available'}
                            </p>
                          </div>
                          <div className="flex items-center h-full">
                            {selectedProducts.some(p => p.id === product.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <XSquare className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
              <div className="mt-4 text-sm">
                <p className="text-muted-foreground">
                  {selectedProducts.length} product(s) selected
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="collections" className="mt-4">
              {isLoadingCollections ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-4">
                    {collections.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground">No collections found in your store</p>
                      </div>
                    ) : (
                      collections.map((collection: any) => (
                        <div 
                          key={collection.id} 
                          className={`flex items-start space-x-4 p-3 rounded-md border ${
                            selectedCollections.some(c => c.id === collection.id) 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                          onClick={() => toggleCollectionSelection(collection)}
                        >
                          {collection.image ? (
                            <img
                              src={collection.image.src}
                              alt={collection.title}
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                              <FolderOpen className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {collection.title}
                              {collection.isSmartCollection && 
                                <Badge variant="secondary" className="ml-2 text-xs">Smart</Badge>
                              }
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {collection.description || 'No description available'}
                            </p>
                            {typeof collection.productsCount !== 'undefined' && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {collection.productsCount} products
                              </p>
                            )}
                          </div>
                          <div className="flex items-center h-full">
                            {selectedCollections.some(c => c.id === collection.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <XSquare className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
              <div className="mt-4 text-sm">
                <p className="text-muted-foreground">
                  {selectedCollections.length} collection(s) selected
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Warning message for products tab */}
          {selectedTab === 'products' && selectedProducts.length === 0 && (
            <div className="rounded-md bg-blue-50 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Please select at least one product to continue
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Warning message for collections tab */}
          {selectedTab === 'collections' && selectedCollections.length === 0 && (
            <div className="rounded-md bg-blue-50 p-4 mt-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Please select at least one collection to continue
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <div className="flex items-center space-x-2">
            {selectedTab === 'products' ? (
              <p className="text-sm text-muted-foreground">
                {selectedProducts.length} product(s) selected
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedCollections.length} collection(s) selected
              </p>
            )}
          </div>
          <Button 
            onClick={generateKeywordSuggestions}
            disabled={
              isLoadingStoreData || 
              (selectedTab === 'products' && selectedProducts.length === 0) ||
              (selectedTab === 'collections' && selectedCollections.length === 0) ||
              isLoadingKeywords
            }
          >
            {isLoadingKeywords ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Keywords
                <RefreshCw className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Render keyword selection step
  const renderKeywordSelection = () => {
    // Filter keywords based on user input and sort options
    const filteredKeywords = getFilteredKeywords();
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="mr-2 h-5 w-5" />
            Select Keywords
          </CardTitle>
          <CardDescription>
            Choose keywords to optimize your content for SEO. Higher search volume keywords typically attract more traffic.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Keywords for SEO Optimization</h3>
              <p className="text-sm text-muted-foreground mb-4">Find and select keywords to include in your content</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Product URL</h4>
                  <Input 
                    placeholder="Enter a product URL to find keywords"
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-2">Direct Topic</h4>
                    <Input 
                      placeholder="Enter a topic to find related keywords"
                      value={keywordFilter}
                      onChange={(e) => setKeywordFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button className="mb-[1px]">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <h4 className="text-sm font-medium">Filter by intent:</h4>
                  
                  <div className="flex gap-2 flex-wrap">
                    {["Informational", "Transactional", "Commercial", "Navigational"].map(intent => (
                      <Badge 
                        key={intent}
                        variant={intentFilters.includes(intent) ? "default" : "outline"} 
                        className="cursor-pointer hover:bg-secondary"
                        onClick={() => toggleIntentFilter(intent)}
                      >
                        {intent}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="w-64 ml-auto">
                  <Input
                    placeholder="Filter keywords..."
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-6 bg-muted px-4 py-2 border-b">
                  <div className="font-medium text-sm">Keyword</div>
                  <div className="font-medium text-sm text-center">Search Volume</div>
                  <div className="font-medium text-sm text-center">Competition</div>
                  <div className="font-medium text-sm text-center">Difficulty</div>
                  <div className="font-medium text-sm text-center">Intent</div>
                  <div className="font-medium text-sm text-center">Featured</div>
                </div>
                
                <ScrollArea className="h-[350px]">
                  <div className="divide-y">
                    {filteredKeywords.map((keyword) => {
                      const isSelected = selectedKeywords.some(k => k.keyword === keyword.keyword);
                      const isFeatured = featuredKeyword === keyword.keyword;
                      const competition = keyword.competition || 0;
                      const competitionLabel = competition > 0.66 ? 'High' : competition > 0.33 ? 'Medium' : 'Low';
                      const competitionColor = competition > 0.66 ? 'bg-red-100 text-red-800' : competition > 0.33 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
                      
                      return (
                        <div key={keyword.keyword} className="grid grid-cols-6 items-center px-4 py-3">
                          <div className="flex items-center">
                            <Checkbox 
                              id={`keyword-${keyword.keyword}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleKeywordSelection(keyword)}
                              className="mr-2"
                            />
                            <label 
                              htmlFor={`keyword-${keyword.keyword}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {keyword.keyword}
                            </label>
                          </div>
                          
                          <div className="text-sm text-center">
                            {keyword.searchVolume ? keyword.searchVolume.toLocaleString() : '0'}
                          </div>
                          
                          <div className="text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${competitionColor}`}>
                              {competitionLabel}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${keyword.difficulty || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{keyword.difficulty || 0}</span>
                          </div>
                          
                          <div className="text-sm text-center">
                            {keyword.intent || 'Navigational'}
                          </div>
                          
                          <div className="text-center">
                            {isSelected && (
                              <div className="flex items-center justify-center">
                                <Checkbox 
                                  id={`featured-${keyword.keyword}`}
                                  checked={isFeatured}
                                  onCheckedChange={() => isFeatured ? setFeaturedKeyword(null) : setKeywordAsFeatured(keyword.keyword)}
                                  className="h-4 w-4"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredKeywords.length === 0 && (
                      <div className="py-8 text-center text-muted-foreground">
                        No keywords found. Try a different search or filter.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            Back to Products
          </Button>
          <Button 
            onClick={generateTopicSuggestions}
            disabled={isLoadingTopics || (selectedKeywords.length === 0 && !customKeywords.trim())}
          >
            {isLoadingTopics ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Topics
                <BookOpen className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Render topic suggestion step
  const renderTopicSuggestions = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Step 3: Select a Topic
          </CardTitle>
          <CardDescription>
            Choose a topic for your content cluster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {suggestedTopics.map((topic) => (
                <Card 
                  key={topic.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => selectTopicAndGenerate(topic)}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <p className="text-sm">{topic.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {topic.keywords?.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="py-1 px-2">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="py-4">
                    <Button className="w-full">
                      {selectedTopic?.id === topic.id && isGeneratingCluster ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Cluster...
                        </>
                      ) : (
                        <>
                          Select & Generate
                          <Sparkles className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            Back to Keywords
          </Button>
          <Button 
            variant="outline"
            onClick={generateTopicSuggestions}
            disabled={isLoadingTopics}
          >
            {isLoadingTopics ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                Refresh Topics
                <RefreshCw className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Render styling and image selection
  const renderStylingAndImageSelection = () => {
    if (!selectedTopic) {
      return (
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <h3 className="text-lg font-medium">No Topic Selected</h3>
              <p className="text-muted-foreground mt-2">Please go back and select a topic first</p>
              <Button 
                className="mt-4"
                onClick={() => setCurrentStep(3)}
              >
                Back to Topics
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Style & Format Your Content</CardTitle>
          <CardDescription>
            Customize how your content will be generated for "{selectedTopic.title}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Content Type</h3>
            <div className="flex space-x-2">
              <Button 
                variant={contentType === 'blog' ? "default" : "outline"}
                onClick={() => setContentType('blog')}
                className="flex-1"
              >
                Blog Post
              </Button>
              <Button 
                variant={contentType === 'page' ? "default" : "outline"}
                onClick={() => setContentType('page')}
                className="flex-1"
              >
                Page
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Writing Style</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Writing Perspective</Label>
                    <Select 
                      value={writingPerspective} 
                      onValueChange={setWritingPerspective}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose writing perspective" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="we">We</SelectItem>
                        <SelectItem value="i">I</SelectItem>
                        <SelectItem value="you">You</SelectItem>
                        <SelectItem value="they">They</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tone of Voice</Label>
                    <Select 
                      value={toneOfVoice} 
                      onValueChange={setToneOfVoice}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose tone of voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly (Default)</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="empathic">Empathic</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="excited">Excited</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Introduction Style</Label>
                    <Select 
                      value={introStyle} 
                      onValueChange={setIntroStyle}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose introduction style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="search-intent-focused">Search Intent Focused (Default)</SelectItem>
                        <SelectItem value="standard">Standard Introduction</SelectItem>
                        <SelectItem value="none">No Introduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>FAQ Style</Label>
                    <Select 
                      value={faqStyle} 
                      onValueChange={setFaqStyle}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose FAQ style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short FAQ (3-5 Questions)</SelectItem>
                        <SelectItem value="long">Long FAQ (5-7 Questions)</SelectItem>
                        <SelectItem value="none">No FAQ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Advanced Article Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of H2 Headings</Label>
                    <Select 
                      value={numH2s.toString()} 
                      onValueChange={(val) => setNumH2s(parseInt(val))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose number of headings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Headings</SelectItem>
                        <SelectItem value="4">4 Headings</SelectItem>
                        <SelectItem value="5">5 Headings</SelectItem>
                        <SelectItem value="6">6 Headings</SelectItem>
                        <SelectItem value="7">7 Headings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Article Length</Label>
                    <Select 
                      value={articleLength} 
                      onValueChange={setArticleLength}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose article length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (~1000 words)</SelectItem>
                        <SelectItem value="medium">Medium (~1500 words)</SelectItem>
                        <SelectItem value="long">Long (~2000+ words)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Author Information</Label>
                    <Select 
                      value={authorInfo || ""} 
                      onValueChange={setAuthorInfo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose author" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Author</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="expert">Water Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Content Elements</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableTables" 
                      checked={enableTables}
                      onCheckedChange={val => setEnableTables(!!val)}
                    />
                    <Label htmlFor="enableTables">Include Tables</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableLists" 
                      checked={enableLists}
                      onCheckedChange={val => setEnableLists(!!val)}
                    />
                    <Label htmlFor="enableLists">Include Lists & Bullet Points</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableH1" 
                      checked={enableH1}
                      onCheckedChange={val => setEnableH1(!!val)}
                    />
                    <Label htmlFor="enableH1">Include H1 Headings</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableBolding" 
                      checked={enableBolding}
                      onCheckedChange={val => setEnableBolding(!!val)}
                    />
                    <Label htmlFor="enableBolding">Use Bold Formatting</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableCitations" 
                      checked={enableCitations}
                      onCheckedChange={val => setEnableCitations(!!val)}
                    />
                    <Label htmlFor="enableCitations">Include Citations</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableExternalLinks" 
                      checked={enableExternalLinks}
                      onCheckedChange={val => setEnableExternalLinks(!!val)}
                    />
                    <Label htmlFor="enableExternalLinks">Include External Links (.gov, .edu, Wikipedia)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeYouTube" 
                      checked={includeYouTube}
                      onCheckedChange={val => setIncludeYouTube(!!val)}
                    />
                    <Label htmlFor="includeYouTube">Include YouTube Videos</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeTOC" 
                      checked={includeTOC}
                      onCheckedChange={val => setIncludeTOC(!!val)}
                    />
                    <Label htmlFor="includeTOC">Include Table of Contents</Label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Image Selection</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select images to include in your content. These will be interlinked with your products.
                </p>
                
                {selectedImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative rounded-md overflow-hidden border">
                        <img 
                          src={image.url || image.src?.medium} 
                          alt={image.alt || "Selected image"} 
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute top-1 left-1 flex space-x-1">
                          {image.isFeatured && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                              Featured
                            </Badge>
                          )}
                          {image.isContentImage && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                              Content
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => {
                            const newImages = [...selectedImages];
                            newImages.splice(index, 1);
                            setSelectedImages(newImages);
                          }}
                        >
                          <XSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-md flex items-center justify-center h-32 mb-4 bg-muted/50">
                    <div className="text-center">
                      <Image className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No images selected</p>
                    </div>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setIsImageDialogOpen(true)}
                  className="w-full"
                >
                  <Image className="mr-2 h-4 w-4" />
                  Browse Images
                </Button>
                
                <ImageSearchDialog
                  open={isImageDialogOpen}
                  onOpenChange={setIsImageDialogOpen}
                  onImagesSelected={handleImagesSelected}
                  searchKeyword={selectedTopic?.title || ''}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Buyer Profile Generator</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define your target audience for better content personalization.
                </p>
                
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe your target buyer here. For example: 'Homeowners aged 35-55 concerned about water quality, with disposable income who prioritize health and eco-friendly solutions.'"
                    value={buyerProfileText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBuyerProfileText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBuyerProfileText("Young homeowners (25-35) with growing families concerned about water quality and its effects on children's health.")}
                    >
                      Family-focused
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBuyerProfileText("Eco-conscious individuals (30-45) seeking sustainable home solutions that reduce plastic waste and environmental impact.")}
                    >
                      Eco-conscious
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBuyerProfileText("Budget-conscious homeowners looking for long-term cost savings on water bills and plumbing maintenance.")}
                    >
                      Budget-savvy
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 mt-auto">
                <h3 className="text-lg font-medium mb-4">Selected Topic</h3>
                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{selectedTopic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 text-sm">
                    <p>{selectedTopic.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedTopic.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs py-0">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(3)}
          >
            Back to Topics
          </Button>
          <Button 
            onClick={generateContentCluster}
            disabled={isGeneratingCluster}
          >
            {isGeneratingCluster ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Content
                <Sparkles className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Render steps indicator
  const renderWorkflowSteps = () => {
    return (
      <div className="flex justify-between mb-6">
        <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
            1
          </div>
          <span className="text-xs mt-1">Mode</span>
        </div>
        <div className={`flex-1 h-1 mx-2 self-center ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
            2
          </div>
          <span className="text-xs mt-1">Products</span>
        </div>
        <div className={`flex-1 h-1 mx-2 self-center ${currentStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-muted'}`}>
            3
          </div>
          <span className="text-xs mt-1">Keywords</span>
        </div>
        <div className={`flex-1 h-1 mx-2 self-center ${currentStep >= 4 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex flex-col items-center ${currentStep >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-primary text-white' : 'bg-muted'}`}>
            4
          </div>
          <span className="text-xs mt-1">Topics</span>
        </div>
        <div className={`flex-1 h-1 mx-2 self-center ${currentStep >= 5 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex flex-col items-center ${currentStep >= 5 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 5 ? 'bg-primary text-white' : 'bg-muted'}`}>
            5
          </div>
          <span className="text-xs mt-1">Styling</span>
        </div>
        <div className={`flex-1 h-1 mx-2 self-center ${currentStep >= 6 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex flex-col items-center ${currentStep >= 6 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 6 ? 'bg-primary text-white' : 'bg-muted'}`}>
            6
          </div>
          <span className="text-xs mt-1">Content</span>
        </div>
      </div>
    );
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Topic Cluster Generator</h1>
        
        {renderWorkflowSteps()}
        
        <div className="grid grid-cols-1 gap-6">
          {/* Step 1: Content Mode Selection */}
          {currentStep === 1 && renderContentModeSelection()}
          
          {/* Step 2: Product Selection */}
          {currentStep === 2 && renderProductSelection()}
          
          {/* Step 3: Keyword Selection */}
          {currentStep === 3 && renderKeywordSelection()}
          
          {/* Step 4: Topic Selection */}
          {currentStep === 4 && renderTopicSuggestions()}
          
          {/* Step 5: Styling & Image Selection */}
          {currentStep === 5 && renderStylingAndImageSelection()}
          
          {/* Step 6: Content Review */}
          {currentStep === 6 && (
            <ClusterWorkflow
              articles={generatedArticles}
              isLoading={isGeneratingCluster}
              onSave={handleSaveAllArticles}
              canSchedule={canSchedule}
              blogId={selectedBlog || blogId}
              products={selectedProducts}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}