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
import { Loader2, Plus, Wand } from 'lucide-react';

export default function EnhancedWorkflowDemo() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [demoCluster, setDemoCluster] = useState<any[]>([]);
  
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
  
  // Generate simple content function
  const generateContent = async () => {
    if (!topic) {
      toast({
        title: "Topic Required",
        description: "Please enter a blog topic",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // In a real implementation this would call the API
      // but for demo purposes we'll just create some content
      const mockGeneratedContent = {
        title: `${topic}: Complete Guide for 2025`,
        content: `<h2>Introduction to ${topic}</h2>
        <p>In this comprehensive guide to ${topic}, we'll explore everything you need to know about this fascinating subject. From basic concepts to advanced strategies, this guide has you covered.</p>
        
        <h2>Why ${topic} Matters in 2025</h2>
        <p>As we move further into 2025, ${topic} continues to gain importance across multiple industries. Understanding the fundamental principles can give you a significant advantage.</p>
        
        <h2>Key Strategies for Success</h2>
        <p>To succeed with ${topic}, you'll want to focus on these proven approaches:</p>
        <ul>
          <li>Research thoroughly before getting started</li>
          <li>Implement best practices from day one</li>
          <li>Continuously monitor and improve your results</li>
          <li>Stay updated with the latest developments</li>
        </ul>
        
        <h2>Common Challenges and Solutions</h2>
        <p>While working with ${topic}, you might encounter several challenges. Here's how to address the most common ones effectively.</p>
        
        <h2>Conclusion</h2>
        <p>By applying the knowledge from this guide, you'll be well-equipped to leverage ${topic} for your specific needs in 2025 and beyond.</p>`,
        tags: topic.split(' ').concat(['guide', '2025', 'tutorial']),
        category: "Guides"
      };
      
      setGeneratedContent(mockGeneratedContent);
      toast({
        title: "Content Generated",
        description: "Demo content has been created successfully",
      });
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
              <CardTitle>Generate Content</CardTitle>
              <CardDescription>
                Enter a topic to generate content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input 
                    id="topic" 
                    placeholder="e.g. Sustainable Fashion"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={generateContent}
                    disabled={isGenerating || !topic}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand className="h-4 w-4 mr-2" />
                    )}
                    Single Post
                  </Button>
                  
                  <Button
                    onClick={generateCluster}
                    disabled={isGenerating || !topic}
                    variant="outline"
                    className="w-full"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Cluster
                  </Button>
                </div>
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