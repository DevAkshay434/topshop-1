import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import Layout from "@/components/Layout";

export default function SimpleBulkGeneration() {
  const [topics, setTopics] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>(
    "You are a professional blog writer creating high-quality content for an e-commerce store. Write a detailed, informative, and engaging blog post about [TOPIC]. Include an attention-grabbing title, introduction, several subheadings with substantial content under each, and a conclusion. Format the content with markdown, making sure to use # for the title, ## for major sections, and proper paragraph breaks. The content should be approximately 800-1000 words."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();

  const handleGenerate = async () => {
    // Reset states
    setIsGenerating(true);
    setProgress(0);
    setResults([]);
    setError(null);
    
    try {
      // Split topics by new line and filter empty ones
      const topicList = topics
        .split("\n")
        .map(topic => topic.trim())
        .filter(Boolean);
      
      if (topicList.length === 0) {
        throw new Error("Please enter at least one topic");
      }
      
      console.log(`Generating content for ${topicList.length} topics`);
      
      // Process each topic sequentially to avoid rate limits
      const generatedResults = [];
      let completed = 0;
      
      for (const topic of topicList) {
        try {
          console.log(`Generating content for topic: "${topic}"`);
          
          // Call the API to generate content for this topic
          const response = await apiRequest({
            url: "/api/generate-content",
            method: "POST",
            data: {
              topic,
              customPrompt
            }
          });
          
          if (response && response.success) {
            console.log(`Successfully generated content for "${topic}"`);
            
            // Create a blog post with this content
            const postResponse = await apiRequest({
              url: "/api/posts",
              method: "POST",
              data: {
                title: response.title || `Article about ${topic}`,
                content: response.content || "Content not available",
                status: "published",
                publishedDate: new Date().toISOString(),
                tags: Array.isArray(response.tags) ? response.tags.join(",") : topic,
                category: "Generated Content",
                author: "Bulk Generator",
                storeId: null,
              }
            });
            
            if (postResponse && postResponse.post) {
              console.log(`Created post ID ${postResponse.post.id} for "${topic}"`);
              
              // Add to results
              generatedResults.push({
                topic,
                postId: postResponse.post.id,
                title: response.title,
                contentPreview: response.content ? response.content.substring(0, 100) + "..." : "No content",
                status: "success"
              });
              
              // Automatically sync to Shopify
              try {
                await apiRequest({
                  url: "/api/shopify/sync",
                  method: "POST",
                  data: {
                    postIds: [postResponse.post.id]
                  }
                });
                console.log(`Post for "${topic}" synced to Shopify`);
              } catch (syncError) {
                console.error(`Error syncing post for "${topic}" to Shopify:`, syncError);
              }
            }
          } else {
            console.error(`Failed to generate content for "${topic}"`, response);
            generatedResults.push({
              topic,
              status: "failed",
              error: response?.error || "Unknown error"
            });
          }
        } catch (topicError) {
          console.error(`Error processing topic "${topic}":`, topicError);
          generatedResults.push({
            topic,
            status: "failed",
            error: topicError instanceof Error ? topicError.message : "Unknown error"
          });
        }
        
        // Update progress
        completed++;
        const newProgress = Math.round((completed / topicList.length) * 100);
        setProgress(newProgress);
        setResults([...generatedResults]);
      }
      
      // All done
      toast({
        title: "Content Generation Complete",
        description: `Generated ${generatedResults.filter(r => r.status === "success").length} of ${topicList.length} articles`,
      });
      
      // Invalidate posts query to refresh any lists
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
    } catch (e) {
      console.error("Error generating content:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">Simple Bulk Content Generation</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Generate multiple blog posts at once from a list of topics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Content</CardTitle>
            <CardDescription>
              Enter each topic on a new line and customize the AI prompt if needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topics">Topics (one per line)</Label>
                <Textarea
                  id="topics"
                  placeholder="Sustainable fashion trends
Benefits of organic skincare
How to choose the right running shoes"
                  rows={8}
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Custom AI Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Write a blog post about [TOPIC]..."
                  rows={6}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-neutral-500">
                  Use [TOPIC] as a placeholder where you want the topic to be inserted
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleGenerate}
                disabled={isGenerating || !topics.trim()}
              >
                {isGenerating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Generating...
                  </>
                ) : (
                  "Generate Content"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Progress and generated content details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGenerating && (
              <div className="mb-6 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-neutral-500">
                  {progress}% Complete
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-md border ${
                    result.status === "success" 
                      ? "bg-green-50 border-green-200" 
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="font-medium">
                    {result.status === "success" ? result.title : result.topic}
                  </div>
                  <div className="text-sm mt-1">
                    {result.status === "success" ? (
                      <>
                        <p className="text-green-700">Successfully generated</p>
                        {result.contentPreview && (
                          <p className="mt-1 text-neutral-600">{result.contentPreview}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-red-700">Failed: {result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {results.length > 0 && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/blog-posts")}
                >
                  View All Blog Posts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}