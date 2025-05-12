import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Import our enhanced workflow components
import EnhancedWorkflow from '../components/EnhancedWorkflow';
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
import { Loader2, Wand } from 'lucide-react';

export default function EnhancedWorkflowDemo() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  
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
                
                <div>
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
                    Generate Content
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="md:col-span-3">
            <Tabs defaultValue="enhanced" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="enhanced">Enhanced Single Post</TabsTrigger>
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