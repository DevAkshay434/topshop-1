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
import { 
  Button,
  Textarea,
  Input,
  Label,
  Spinner
} from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";

// Types for result data
type SuccessResult = {
  topic: string;
  postId: number;
  title: string;
  contentPreview: string;
  status: "success";
  usesFallback: boolean;
};

type FailedResult = {
  topic: string;
  status: "failed";
  error: string;
};

type GenerationResult = SuccessResult | FailedResult;

export default function SimpleBulkGeneration() {
  const [topics, setTopics] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>(
    "You are a professional blog writer creating high-quality content for an e-commerce store. Write a detailed, informative, and engaging blog post about [TOPIC]. Include an attention-grabbing title, introduction, several subheadings with substantial content under each, and a conclusion. Format the content with markdown, making sure to use # for the title, ## for major sections, and proper paragraph breaks. The content should be approximately 800-1000 words."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
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
      
      // Set initial progress
      setProgress(10);
      
      // Use our simplified bulk generation endpoint that handles everything
      console.log(`Sending ${topicList.length} topics to simple-bulk endpoint`);
      
      // Show progress as waiting for response
      setProgress(30);
      
      // Skip API test since we have server-side fallback
      // The test was causing issues and we don't need it since the server handles
      // OpenAI errors gracefully and falls back to HuggingFace
      
      // Make the API request to our bulk endpoint
      const response = await apiRequest({
        url: "/api/generate-content/simple-bulk",
        method: "POST",
        data: {
          topics: topicList,
          customPrompt
        }
      });
      
      // Update progress
      setProgress(90);
      
      if (response && response.success) {
        console.log(`Bulk generation results: ${response.successful} of ${response.totalTopics} successful`);
        
        // Process results for display
        const processedResults = response.results.map((result: any) => {
          if (result.status === "success") {
            return {
              topic: result.topic,
              postId: result.postId,
              title: result.title,
              contentPreview: result.content ? result.content.substring(0, 100) + "..." : "No content preview available",
              status: "success" as const,
              usesFallback: result.usesFallback
            };
          } else {
            return {
              topic: result.topic,
              status: "failed" as const,
              error: result.error || "Unknown error"
            };
          }
        });
        
        // Update UI
        setResults(processedResults);
        setProgress(100);
        
        // Show success message
        toast({
          title: "Content Generation Complete",
          description: `Generated ${response.successful} of ${response.totalTopics} articles`,
        });
        
        // Invalidate posts query to refresh any lists
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else {
        throw new Error(response?.error || "Failed to generate content");
      }
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
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Bulk Content Generation</h2>
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
                        <p className="text-green-700 flex items-center">
                          Successfully generated
                          {result.usesFallback && (
                            <span className="ml-2 text-amber-600 text-xs px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                              Fallback model used
                            </span>
                          )}
                        </p>
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