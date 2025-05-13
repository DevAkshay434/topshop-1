import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Sparkles, ListTree, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ContentGeneratorProps {
  onContentGenerated?: (content: {
    title: string;
    content: string;
    tags: string[];
  }) => void;
}

export default function ContentGenerator({ onContentGenerated }: ContentGeneratorProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("Medium (500-800 words)");
  const [model, setModel] = useState("claude"); // Default to Claude AI
  const [contentMode, setContentMode] = useState<"single" | "cluster">("single"); // New state for content mode
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateContent = useCallback(async () => {
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
      toast({
        title: `Generating ${contentMode === 'cluster' ? 'Content Cluster' : 'Content'} with Claude AI`,
        description: "This might take a minute...",
      });
      
      let data;
      
      if (contentMode === 'single') {
        // For single post, use the regular generate-content endpoint
        data = await apiRequest("POST", "/api/generate-content", {
          topic,
          tone,
          length,
          model
        });
        
        if (data.success) {
          toast({
            title: "Claude AI Content Generated",
            description: data.fallbackUsed 
              ? "Blog content has been created using our fallback system" 
              : "Blog content has been successfully created with Claude AI",
          });
          
          // Invalidate posts query to show new post
          queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
          
          if (onContentGenerated) {
            // Extract the content directly from data since our API returns it at the top level
            const contentData = {
              title: data.title || "",
              content: data.content || "",
              tags: Array.isArray(data.tags) ? data.tags : []
            };
            onContentGenerated(contentData);
          }
        } else {
          throw new Error(data.error || "Failed to generate content");
        }
      } else if (contentMode === 'cluster') {
        // For cluster mode, use the Claude cluster endpoint
        data = await apiRequest("POST", "/api/claude/cluster", {
          topic,
          keywords: [], // Optional keywords
          products: [], // Optional products
          options: {
            toneOfVoice: tone.toLowerCase(),
            articleLength: length.toLowerCase().includes('short') ? 'short' : 
                           length.toLowerCase().includes('long') ? 'long' : 'medium'
          }
        });
        
        if (data.success && data.cluster) {
          toast({
            title: "Claude AI Content Cluster Generated",
            description: `Successfully generated a content cluster with ${data.cluster.subtopics?.length || 0} related articles`,
          });
          
          // Pass the entire cluster data to the parent component
          if (onContentGenerated && data.cluster.subtopics && data.cluster.subtopics.length > 0) {
            // Pass first article content + mode + full cluster data
            const firstArticle = data.cluster.subtopics[0];
            const contentData = {
              title: firstArticle.title || data.cluster.mainTopic || "",
              content: firstArticle.content || "",
              tags: firstArticle.keywords || []
            };
            onContentGenerated(contentData);
          }
        } else {
          throw new Error(data.error || "Failed to generate content cluster");
        }
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [topic, tone, length, model, contentMode, toast, onContentGenerated]);
  
  return (
    <Card>
      <CardHeader className="border-b border-neutral-200">
        <CardTitle className="flex items-center">
          <span className="mr-2">Claude AI Content Generator</span>
          <span className="bg-amber-100 text-amber-800 text-xs py-0.5 px-2 rounded-full">
            Powered by Anthropic
          </span>
        </CardTitle>
        <CardDescription>
          Create high-quality blog posts and content clusters with Claude AI
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Content Mode Selection */}
          <div className="mb-4">
            <Label className="mb-2 block">Content Generation Mode</Label>
            <RadioGroup 
              value={contentMode} 
              onValueChange={(value) => setContentMode(value as "single" | "cluster")}
              className="grid grid-cols-2 gap-4"
            >
              <div className={`p-4 rounded-md border cursor-pointer ${contentMode === 'single' ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'}`}>
                <RadioGroupItem value="single" id="content-single" className="sr-only" />
                <Label htmlFor="content-single" className="flex items-center cursor-pointer">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Single Post</div>
                    <div className="text-sm text-muted-foreground">Generate a single blog post with Claude AI</div>
                  </div>
                </Label>
              </div>
              
              <div className={`p-4 rounded-md border cursor-pointer ${contentMode === 'cluster' ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'}`}>
                <RadioGroupItem value="cluster" id="content-cluster" className="sr-only" />
                <Label htmlFor="content-cluster" className="flex items-center cursor-pointer">
                  <ListTree className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="font-medium">Content Cluster</div>
                    <div className="text-sm text-muted-foreground">Generate multiple related articles optimized for SEO</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="topic">
              {contentMode === 'single' ? 'Blog Topic' : 'Main Topic for Cluster'}
            </Label>
            <Input 
              id="topic" 
              placeholder={contentMode === 'single' 
                ? "e.g. Summer fashion trends" 
                : "e.g. Complete guide to water softeners"}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="tone">Content Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
                <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                <SelectItem value="Informative">Informative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="length">Content Length</Label>
            <Select value={length} onValueChange={setLength}>
              <SelectTrigger id="length">
                <SelectValue placeholder="Select length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Short (300-500 words)">Short (300-500 words)</SelectItem>
                <SelectItem value="Medium (500-800 words)">Medium (500-800 words)</SelectItem>
                <SelectItem value="Long (800-1200 words)">Long (800-1200 words)</SelectItem>
              </SelectContent>
            </Select>
            {contentMode === 'cluster' && (
              <p className="text-xs text-muted-foreground mt-1">
                For clusters, this sets the approximate length for each article in the cluster
              </p>
            )}
          </div>
          
          <div className="pt-3">
            <Button 
              className="w-full" 
              onClick={generateContent}
              disabled={isGenerating}
              variant="default"
            >
              {contentMode === 'single' ? (
                <Sparkles className="mr-2 h-4 w-4" />
              ) : (
                <ListTree className="mr-2 h-4 w-4" />
              )}
              {isGenerating 
                ? `Generating ${contentMode === 'cluster' ? 'Content Cluster' : 'Content'} with Claude AI...` 
                : `Generate ${contentMode === 'cluster' ? 'Content Cluster' : 'Content'} with Claude AI`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
