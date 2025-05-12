import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import ClusterWorkflow from '@/components/ClusterWorkflow';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';

export default function ClusterWorkflowDemo() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticles, setGeneratedArticles] = useState<any[]>([]);
  
  // Get product data
  const { data: productsData } = useQuery<any>({
    queryKey: ['/api/admin/products'],
  });
  
  // Get permissions
  const { data: permissionsData } = useQuery<any>({
    queryKey: ['/api/shopify/check-permissions'],
  });
  
  // Get blogs
  const { data: blogsData } = useQuery<any>({
    queryKey: ['/api/admin/blogs'],
  });
  
  const canSchedule = permissionsData?.hasPermission;
  const products = productsData?.products || [];
  const blogId = blogsData?.blogs?.[0]?.id;
  
  // Generate content
  const generateContent = async () => {
    if (!topic) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic to generate content",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      toast({
        title: "Generating Content Cluster",
        description: "This might take a minute...",
      });
      
      const requestData = {
        topic,
        contentType: "blog",
        clusterSize: 4,
        includeKeywords: true,
      };
      
      try {
        // First try to use the real API
        const response = await apiRequest("POST", "/api/claude/cluster", requestData);
        
        if (response.success && response.cluster && response.cluster.subtopics) {
          // Process real response from API
          const articles = response.cluster.subtopics.map((article: any, index: number) => ({
            id: `article-${index}`,
            title: article.title,
            content: article.content,
            tags: article.keywords || [],
            status: 'draft'
          }));
          
          setGeneratedArticles(articles);
          
          toast({
            title: "Content Generated",
            description: `Generated ${articles.length} articles for your cluster`,
          });
        } else {
          throw new Error(response.error || "Failed to generate content");
        }
      } catch (error) {
        console.error("API error, using fallback content:", error);
        
        // For demo/development purposes, create mock articles if API fails
        const mockArticles = [
          {
            id: 'demo-1',
            title: `Complete Guide to ${topic}: Everything You Need to Know in 2025`,
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
            tags: [topic, "guide", "2025"],
            status: 'draft'
          },
          {
            id: 'demo-2',
            title: `How to Choose the Best ${topic} for Your Needs`,
            content: `<h2>Selecting the Right ${topic} Solution</h2>
            <p>Choosing the right ${topic} solution can be overwhelming with so many options available. This guide will help you make an informed decision.</p>
            
            <h2>Key Factors to Consider</h2>
            <p>When evaluating ${topic} solutions, keep these factors in mind:</p>
            <ul>
              <li>Budget constraints and long-term costs</li>
              <li>Compatibility with your existing systems</li>
              <li>Scalability for future growth</li>
              <li>Technical support and documentation</li>
            </ul>
            
            <h2>Top Options in the Market</h2>
            <p>Based on our research, these are the top ${topic} solutions worth considering:</p>
            <ul>
              <li>Option A: Best for beginners</li>
              <li>Option B: Most cost-effective</li>
              <li>Option C: Enterprise-grade features</li>
            </ul>
            
            <h2>Making the Final Decision</h2>
            <p>Before finalizing your choice, consider conducting a trial or requesting a demonstration to ensure it meets your specific requirements.</p>`,
            tags: [topic, "comparison", "buying guide"],
            status: 'draft'
          },
          {
            id: 'demo-3',
            title: `${topic} Benefits: Why It's Essential for Your Business`,
            content: `<h2>The Importance of ${topic}</h2>
            <p>In today's competitive landscape, leveraging ${topic} effectively can be the difference between thriving and merely surviving. Let's explore the key benefits.</p>
            
            <h2>Primary Benefits of ${topic}</h2>
            <ul>
              <li>Increased operational efficiency</li>
              <li>Enhanced customer satisfaction</li>
              <li>Reduced overhead costs</li>
              <li>Improved decision-making capabilities</li>
              <li>Competitive advantage in your market</li>
            </ul>
            
            <h2>Real-World Success Stories</h2>
            <p>Many businesses have transformed their operations through effective ${topic} implementation. Here are some inspiring examples:</p>
            
            <h2>Getting Started with ${topic}</h2>
            <p>If you're convinced about the benefits, here's a quick guide to getting started with ${topic} in your organization.</p>`,
            tags: [topic, "benefits", "business"],
            status: 'draft'
          },
          {
            id: 'demo-4',
            title: `${topic} Troubleshooting: Solving Common Problems`,
            content: `<h2>Common ${topic} Issues</h2>
            <p>Even the best ${topic} solutions can encounter problems. This troubleshooting guide helps you identify and fix the most common issues.</p>
            
            <h2>Problem 1: Integration Challenges</h2>
            <p>Integration issues are among the most common problems with ${topic} implementations. Here's how to address them effectively.</p>
            
            <h2>Problem 2: Performance Bottlenecks</h2>
            <p>When your ${topic} solution starts slowing down, these optimization techniques can help restore peak performance.</p>
            
            <h2>Problem 3: User Adoption</h2>
            <p>Sometimes the biggest challenge isn't technical but human. These strategies can improve user adoption and satisfaction.</p>
            
            <h2>Preventative Maintenance</h2>
            <p>The best way to deal with problems is to prevent them in the first place. Implement these best practices for a smoother ${topic} experience.</p>`,
            tags: [topic, "troubleshooting", "solutions"],
            status: 'draft'
          }
        ];
        
        setGeneratedArticles(mockArticles);
        
        toast({
          title: "Demo Content",
          description: "Generated sample content for demonstration purposes",
        });
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
      
      // Clear generated articles
      setGeneratedArticles([]);
      
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save articles",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Content Cluster Generator</h1>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Input section (only show if no articles generated yet) */}
          {generatedArticles.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generate Content Cluster</CardTitle>
                <CardDescription>
                  Generate multiple SEO-optimized articles around a central topic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Main Topic</Label>
                    <Input 
                      id="topic" 
                      placeholder="e.g. Water Purification Systems"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Enter a specific topic to generate multiple related articles
                    </p>
                  </div>
                  
                  <div>
                    <Button
                      onClick={generateContent}
                      disabled={isGenerating || !topic}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Content Cluster
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Cluster workflow (show when articles are generated) */}
          {generatedArticles.length > 0 && (
            <ClusterWorkflow
              articles={generatedArticles}
              isLoading={isGenerating}
              onSave={handleSaveAllArticles}
              canSchedule={canSchedule}
              blogId={blogId}
              products={products}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}