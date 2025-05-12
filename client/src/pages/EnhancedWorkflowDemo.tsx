import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Import our enhanced workflow components
import EnhancedWorkflow from '../components/EnhancedWorkflow';
import ClusterWorkflow from '../components/ClusterWorkflow';
import { ReviewPane } from '../components/ReviewPane';

// Import UI components
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Layout from '@/components/Layout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Wand, FileText, Layers } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function EnhancedWorkflowDemo() {
  const { toast } = useToast();
  
  // Content generation states
  const [topic, setTopic] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [demoCluster, setDemoCluster] = useState<any[]>([]);
  const [contentType, setContentType] = useState<"single" | "cluster">("single");
  
  // Product selection state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Keywords state
  const [keywords, setKeywords] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<{keyword: string; score: number}[]>([]);
  
  // Demo products for the cluster workflow
  const [demoProducts, setDemoProducts] = useState<any[]>([
    { 
      id: "prod1", 
      title: "Premium Water Softener",
      description: "Our top-of-the-line water softener for residential use" 
    },
    { 
      id: "prod2", 
      title: "Water Filter System",
      description: "Complete water filtration system for cleaner, healthier water" 
    },
    { 
      id: "prod3", 
      title: "Water Testing Kit",
      description: "Professional-grade water testing kit for home use" 
    }
  ]);
  
  // Check scheduling permissions
  const { data: permissionsData } = useQuery<{ success: boolean; hasPermission: boolean; }>({
    queryKey: ['/api/shopify/check-permissions'],
  });
  
  // Get blog list
  const { data: blogsData } = useQuery<{ success: boolean; blogs: Array<{ id: string; title: string; }> }>({
    queryKey: ['/api/admin/blogs'],
  });
  
  const selectedBlogId = blogsData?.blogs?.[0]?.id;
  
  // Generate topic suggestions based on products and keywords
  const generateTopicSuggestions = async () => {
    if (selectedProducts.length === 0 && selectedKeywords.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one product or enter keywords",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Get selected products data
      const productsData = demoProducts.filter(product => 
        selectedProducts.includes(product.id)
      );
      
      // Extract keywords from selected keywords
      const keywordsList = selectedKeywords.map(k => k.keyword);
      
      // In a real app, this would call the Claude API for topic suggestions
      // For demo, we'll generate them based on products and keywords
      const mockTopics: string[] = [];
      
      if (productsData.length > 0) {
        const mainProduct = productsData[0];
        
        // Add product-based topics
        mockTopics.push(
          `The Ultimate Guide to ${mainProduct.title}`,
          `Top 10 Benefits of Using a ${mainProduct.title}`,
          `How to Choose the Right ${mainProduct.title} for Your Home`,
          `${mainProduct.title} vs Competitors: A Comprehensive Comparison`,
          `Common Problems with ${mainProduct.title} and How to Fix Them`
        );
        
        // Add product + keyword topics if keywords exist
        if (keywordsList.length > 0) {
          keywordsList.forEach(keyword => {
            mockTopics.push(
              `How ${mainProduct.title} Improves Your ${keyword}`,
              `Why ${keyword} Matters When Choosing a ${mainProduct.title}`
            );
          });
        }
      } else if (keywordsList.length > 0) {
        // Just keyword-based topics
        keywordsList.forEach(keyword => {
          mockTopics.push(
            `The Complete Guide to ${keyword}`,
            `Understanding ${keyword}: Benefits and Applications`,
            `${keyword} 101: Everything You Need to Know`,
            `How to Optimize Your ${keyword} Strategy`
          );
        });
      }
      
      // Set the generated topics
      setGeneratedTopics(mockTopics);
      
      toast({
        title: "Topics Generated",
        description: "Select a topic to continue",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate topics",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Add or remove a keyword from the selected keywords list
  const toggleKeyword = (keyword: string) => {
    const keywordObj = { keyword, score: 0.8 };
    
    if (selectedKeywords.some(k => k.keyword === keyword)) {
      setSelectedKeywords(selectedKeywords.filter(k => k.keyword !== keyword));
    } else {
      setSelectedKeywords([...selectedKeywords, keywordObj]);
    }
  };
  
  // Add a custom keyword
  const addCustomKeyword = () => {
    if (!keywords.trim()) return;
    
    const newKeywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    
    const newKeywordObjects = newKeywords.map(keyword => ({
      keyword,
      score: 0.7
    }));
    
    setSelectedKeywords([...selectedKeywords, ...newKeywordObjects]);
    setKeywords('');
  };
  
  // Generate content based on selected topic and content type
  const generateContent = async () => {
    if (!selectedTopic && !topic) {
      toast({
        title: "Topic Required",
        description: "Please select or enter a topic",
        variant: "destructive",
      });
      return;
    }
    
    const topicToUse = selectedTopic || topic;
    
    setIsGenerating(true);
    
    try {
      if (contentType === "single") {
        // This is a demo, so we'll create mock content
        // In a real app, this would call an API
        const mockGeneratedContent = {
          id: "demo1",
          title: topicToUse,
          content: `<h2>Introduction to ${topicToUse}</h2>
          <p>This comprehensive guide explores everything you need to know about ${topicToUse} in 2025, with a focus on the latest trends and best practices.</p>
          
          <h2>Key Factors to Consider</h2>
          <p>When working with ${topicToUse}, keep these important factors in mind:</p>
          <ul>
            <li>Start with a clear strategy</li>
            <li>Focus on measurable outcomes</li>
            <li>Always consider the user experience</li>
            <li>Stay updated with the latest developments</li>
          </ul>
          
          <h2>Common Challenges and Solutions</h2>
          <p>While working with ${topicToUse}, you might encounter several challenges. Here's how to address the most common ones effectively.</p>
          
          <h2>Conclusion</h2>
          <p>By applying the knowledge from this guide, you'll be well-equipped to leverage ${topicToUse} for your specific needs in 2025 and beyond.</p>`,
          tags: topicToUse.split(' ').concat(selectedKeywords.map(k => k.keyword)),
          category: "Guides"
        };
        
        setGeneratedContent(mockGeneratedContent);
        toast({
          title: "Content Generated",
          description: "Demo content has been created successfully",
        });
      } else {
        // For cluster generation, use the existing cluster generation logic
        generateCluster();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate a content cluster
  const generateCluster = async () => {
    if (!topic) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your content cluster",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // In a real implementation, we would call the Claude API here
      // For demo purposes, we're using realistic mock data
      
      // Simulate network delay - would be replaced with actual API call to /api/claude/cluster
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // The cluster topics would normally be generated by Claude based on the
      // topic, selected products, keywords, and formatting options
      const clusterTopics = [
        `Complete Guide to ${topic}: Everything You Need to Know`,
        `How to Choose the Best ${topic} for Your Home`,
        `${topic} Installation: Step-by-Step Instructions`,
        `Troubleshooting Common ${topic} Problems`
      ];
      
      // In a real implementation, Claude would generate complete articles 
      // based on the selected products and keywords
      const mockCluster = clusterTopics.map((title, index) => ({
        id: `demo-${index + 1}`,
        title,
        content: `<h2>Introduction to ${title}</h2>
        <p>This comprehensive article about ${title} explores everything from selection to maintenance, with a focus on our premium products.</p>
        
        <h2>Why Quality Matters for ${topic}</h2>
        <p>When investing in a ${topic}, quality makes all the difference. Our Premium Water Softener offers:</p>
        <ul>
          <li>Superior filtration technology</li>
          <li>Extended lifespan with proper maintenance</li>
          <li>Energy-efficient operation</li>
          <li>Comprehensive warranty coverage</li>
        </ul>
        
        <h2>Key Considerations for Your Purchase</h2>
        <p>Before selecting your ideal ${topic}, consider these important factors:</p>
        <ol>
          <li>Your specific water quality needs</li>
          <li>Available installation space</li>
          <li>Household size and water usage</li>
          <li>Budget and long-term operating costs</li>
        </ol>
        
        <h2>Expert Installation Tips</h2>
        <p>For optimal performance of your ${topic}, follow these professional installation guidelines:</p>
        <ol>
          <li>Always shut off the main water supply first</li>
          <li>Install the unit in a dry, level location</li>
          <li>Ensure proper drainage for backwash cycles</li>
          <li>Consider professional installation for warranty protection</li>
        </ol>
        
        <h2>Maintenance Schedule</h2>
        <table border="1">
          <tr>
            <th>Task</th>
            <th>Frequency</th>
            <th>Importance</th>
          </tr>
          <tr>
            <td>Check salt levels</td>
            <td>Monthly</td>
            <td>High</td>
          </tr>
          <tr>
            <td>Clean brine tank</td>
            <td>Annually</td>
            <td>Medium</td>
          </tr>
          <tr>
            <td>Replace pre-filter</td>
            <td>Every 3-6 months</td>
            <td>High</td>
          </tr>
        </table>
        
        <h2>FAQ About ${topic}</h2>
        <h3>How long should a quality ${topic} last?</h3>
        <p>With proper maintenance, a high-quality system like our Premium Water Softener can last 10-15 years or more.</p>
        
        <h3>Can I install a ${topic} myself?</h3>
        <p>While DIY installation is possible with our comprehensive instructions, professional installation ensures optimal performance and warranty protection.</p>
        
        <h2>Conclusion</h2>
        <p>Investing in a high-quality ${topic} provides lasting benefits for your home and family. Our selection of premium products ensures you'll find the perfect solution for your specific needs.</p>`,
        tags: [topic, 'water softener', 'water filter', 'water testing', 'home improvement'],
        status: 'draft'
      }));
      
      setDemoCluster(mockCluster);
      toast({
        title: "Cluster Generated",
        description: `Created ${mockCluster.length} articles in this content cluster`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate content cluster",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Enhanced Content Workflow</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Content Generator</CardTitle>
              <CardDescription>
                Start with product and keyword selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1: Product Selection */}
                <div className="space-y-3">
                  <div className="text-base font-medium flex items-center">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2">1</span>
                    <Label>Select Products</Label>
                  </div>
                  <div className="space-y-2 ml-7">
                    {demoProducts.map(product => (
                      <div key={product.id} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProducts([...selectedProducts, product.id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                            }
                          }}
                        />
                        <div>
                          <Label 
                            htmlFor={`product-${product.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {product.title}
                          </Label>
                          <p className="text-xs text-muted-foreground">{product.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Step 2: Keyword Selection */}
                <div className="space-y-3">
                  <div className="text-base font-medium flex items-center">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2">2</span>
                    <Label>Add Keywords</Label>
                  </div>
                  <div className="space-y-3 ml-7">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Enter keywords, comma separated"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                      />
                      <Button size="sm" onClick={addCustomKeyword}>Add</Button>
                    </div>
                    
                    {/* Display selected keywords */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedKeywords.map(kw => (
                        <Badge 
                          key={kw.keyword} 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleKeyword(kw.keyword)}
                        >
                          {kw.keyword} ✕
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Common keyword suggestions */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Common keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {['water quality', 'home improvement', 'installation', 'maintenance', 'cost savings'].map(kw => (
                          <Badge 
                            key={kw} 
                            variant="outline"
                            className="cursor-pointer text-xs"
                            onClick={() => toggleKeyword(kw)}
                          >
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Step 3: Generate Topics */}
                <div className="space-y-2">
                  <div className="text-base font-medium flex items-center">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2">3</span>
                    <Label>Generate Topics</Label>
                  </div>
                  <div className="ml-7">
                    <Button
                      onClick={generateTopicSuggestions}
                      disabled={isGenerating || (selectedProducts.length === 0 && selectedKeywords.length === 0)}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Wand className="h-4 w-4 mr-2" />
                      )}
                      Generate Topic Ideas
                    </Button>
                  </div>
                </div>
                
                {/* Step 4: Select Topic and Content Type */}
                {generatedTopics.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-base font-medium flex items-center">
                      <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2">4</span>
                      <Label>Select Topic & Type</Label>
                    </div>
                    <div className="ml-7 space-y-3">
                      <Select
                        value={selectedTopic}
                        onValueChange={setSelectedTopic}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {generatedTopics.map(topic => (
                            <SelectItem key={topic} value={topic}>
                              {topic}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          variant={contentType === "single" ? "default" : "outline"}
                          onClick={() => setContentType("single")}
                          className="w-full"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Single Post
                        </Button>
                        
                        <Button
                          variant={contentType === "cluster" ? "default" : "outline"}
                          onClick={() => setContentType("cluster")}
                          className="w-full"
                        >
                          <Layers className="h-4 w-4 mr-2" />
                          Cluster
                        </Button>
                      </div>
                      
                      <Button
                        onClick={generateContent}
                        disabled={isGenerating || !selectedTopic}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Wand className="h-4 w-4 mr-2" />
                        )}
                        Generate Content
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Direct topic entry for backward compatibility */}
                {generatedTopics.length === 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor="direct-topic">Or Enter Topic Directly</Label>
                    <Input 
                      id="direct-topic" 
                      placeholder="e.g. Water Filtration Systems"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        onClick={() => {
                          setContentType("single");
                          generateContent();
                        }}
                        disabled={isGenerating || !topic}
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Single Post
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setContentType("cluster");
                          generateContent();
                        }}
                        disabled={isGenerating || !topic}
                        variant="outline"
                        className="w-full"
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Cluster
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="md:col-span-3">
            <Tabs defaultValue="enhanced" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="enhanced">Enhanced Single Post</TabsTrigger>
                <TabsTrigger value="cluster">Topic Cluster</TabsTrigger>
                <TabsTrigger value="classic">Classic View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="enhanced">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <EnhancedWorkflow
                    isGenerating={isGenerating}
                    generatedContent={generatedContent}
                    selectedBlogId={selectedBlogId}
                    canSchedule={permissionsData?.hasPermission}
                    onPublish={async (values) => {
                      toast({
                        title: "Demo Mode",
                        description: `In a real implementation, this would save the content as ${values.publicationType}`,
                      });
                      
                      // In a demo we just log the values
                      console.log("Publishing with values:", values);
                      
                      // Clear content after "publishing"
                      setGeneratedContent(null);
                    }}
                  />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="cluster">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <ClusterWorkflow
                    isLoading={isGenerating}
                    articles={demoCluster}
                    canSchedule={permissionsData?.hasPermission}
                    blogId={selectedBlogId}
                    products={demoProducts}
                    onSave={async (articles) => {
                      toast({
                        title: "Demo Mode",
                        description: `In a real implementation, this would save ${articles.length} articles`,
                      });
                      
                      // In a demo we just log the values
                      console.log("Saving articles:", articles);
                      
                      // Clear content after "publishing"
                      setDemoCluster([]);
                    }}
                  />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="classic">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  {generatedContent ? (
                    <ReviewPane
                      content={generatedContent.content}
                      title={generatedContent.title}
                      tags={generatedContent.tags}
                      isSubmitting={isGenerating}
                      hasSchedulingPermission={permissionsData?.hasPermission}
                      onSubmit={async (values) => {
                        toast({
                          title: "Classic View",
                          description: `In a real implementation, this would publish using the classic workflow`,
                        });
                        
                        console.log("Classic submission:", values);
                        
                        // Clear content after "publishing"
                        setGeneratedContent(null);
                      }}
                    />
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          Generate content to see a preview here.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}