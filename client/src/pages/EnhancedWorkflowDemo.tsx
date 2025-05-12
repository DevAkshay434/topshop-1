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
        description: "Please enter a main topic for the cluster",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // This would call the API in a real implementation
      // For the demo we create mock data
      const mockCluster = [
        {
          id: "cluster-1",
          title: `Complete Guide to ${topic}`,
          content: `<h2>Introduction to ${topic}</h2>
          <p>This comprehensive guide explores everything you need to know about ${topic}, including its history, benefits, and practical applications.</p>
          
          <h2>The Evolution of ${topic}</h2>
          <p>The concept of ${topic} has evolved significantly over time, with major developments including...</p>
          
          <h2>Key Components and Benefits</h2>
          <p>Several core elements make ${topic} valuable:</p>
          <ul>
            <li><strong>Component A:</strong> Provides foundation and structure</li>
            <li><strong>Component B:</strong> Enhances functionality and reach</li>
            <li><strong>Component C:</strong> Optimizes performance metrics</li>
          </ul>
          
          <h2>Implementation Strategies</h2>
          <p>To successfully implement ${topic} in your organization, consider these approaches...</p>
          
          <h2>Conclusion</h2>
          <p>By understanding and applying the principles of ${topic}, you can achieve significant benefits for your business or personal projects.</p>`,
          tags: [topic, "guide", "comprehensive"],
          status: "draft"
        },
        {
          id: "cluster-2",
          title: `${topic} Best Practices for 2025`,
          content: `<h2>Introduction</h2>
          <p>As we move through 2025, implementing the right ${topic} best practices has become increasingly critical for success.</p>
          
          <h2>Current Trends Shaping ${topic}</h2>
          <p>Several significant trends are influencing how organizations approach ${topic} today:</p>
          <ul>
            <li><strong>Trend 1:</strong> Integration with emerging technologies</li>
            <li><strong>Trend 2:</strong> Focus on sustainability and ethical considerations</li>
            <li><strong>Trend 3:</strong> Enhanced analytics and performance measurement</li>
          </ul>
          
          <h2>Essential Best Practices</h2>
          <p>To maximize the value of your ${topic} implementation, follow these proven best practices:</p>
          <ol>
            <li>Start with clear objectives and KPIs</li>
            <li>Build a robust framework that can scale</li>
            <li>Incorporate feedback loops for continuous improvement</li>
            <li>Maintain flexibility to adapt to changing conditions</li>
            <li>Regularly review and update your approach</li>
          </ol>
          
          <h2>Case Studies: Success Stories</h2>
          <p>Several organizations have achieved remarkable results by following these ${topic} best practices...</p>
          
          <h2>Looking Ahead</h2>
          <p>The future of ${topic} will likely involve further integration with AI, enhanced personalization, and more sophisticated analytics capabilities.</p>`,
          tags: [topic, "best practices", "2025", "trends"],
          status: "draft"
        },
        {
          id: "cluster-3",
          title: `Common ${topic} Mistakes and How to Avoid Them`,
          content: `<h2>Introduction</h2>
          <p>While ${topic} offers significant benefits, many organizations make common mistakes that limit its effectiveness.</p>
          
          <h2>Top ${topic} Mistakes</h2>
          <p>Be aware of these frequent errors when implementing ${topic}:</p>
          
          <h3>1. Insufficient Planning</h3>
          <p>Many organizations rush into ${topic} without adequate preparation, leading to disorganized implementation and poor results. Instead:</p>
          <ul>
            <li>Develop a comprehensive strategy before beginning</li>
            <li>Identify clear objectives and success metrics</li>
            <li>Create a realistic timeline with milestone checkpoints</li>
          </ul>
          
          <h3>2. Neglecting User Experience</h3>
          <p>Technical aspects often overshadow user needs, resulting in low adoption rates and engagement. Better approaches include:</p>
          <ul>
            <li>Conduct user research before and during implementation</li>
            <li>Create intuitive interfaces and workflows</li>
            <li>Collect and act on user feedback regularly</li>
          </ul>
          
          <h3>3. Failing to Measure Results</h3>
          <p>Without proper measurement, you can't determine ROI or make improvements. Instead:</p>
          <ul>
            <li>Establish baseline metrics before implementation</li>
            <li>Track relevant KPIs throughout the process</li>
            <li>Analyze results and make data-driven adjustments</li>
          </ul>
          
          <h2>Prevention Strategies</h2>
          <p>To avoid these and other common ${topic} mistakes, implement these preventative measures...</p>
          
          <h2>Conclusion</h2>
          <p>By learning from these common mistakes, you can implement ${topic} more effectively and achieve better results for your organization.</p>`,
          tags: [topic, "mistakes", "troubleshooting", "best practices"],
          status: "draft"
        }
      ];
      
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
                  {generatedContent ? (
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
              
              <TabsContent value="cluster">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  {demoCluster.length > 0 ? (
                    <ClusterWorkflow
                      isLoading={isGenerating}
                      articles={demoCluster}
                      canSchedule={permissionsData?.hasPermission}
                      blogId={selectedBlogId}
                      products={demoProducts}
                      onSave={async (articles) => {
                        toast({
                          title: "Demo Mode",
                          description: `In a real implementation, this would save ${articles.length} cluster articles`,
                        });
                        
                        // In a demo we just log the values
                        console.log("Saving cluster with articles:", articles);
                        
                        // Clear content after "publishing"
                        setDemoCluster([]);
                      }}
                    />
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          Generate a cluster to see the content here.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="classic">
                {generatedContent ? (
                  <ScrollArea className="h-[calc(100vh-240px)]">
                    <ReviewPane 
                      title={generatedContent.title}
                      content={generatedContent.content}
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
                  </ScrollArea>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Generate content to see a preview here.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}