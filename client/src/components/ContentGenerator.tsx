import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        title: "Generating Content",
        description: "This might take a minute...",
      });
      
      const response = await apiRequest("POST", "/api/generate-content", {
        topic,
        tone,
        length
      });
      
      const data = await response.json();
      
      if (data.success && data.content) {
        toast({
          title: "Content Generated",
          description: "Blog content has been successfully created",
          variant: "success",
        });
        
        if (onContentGenerated) {
          onContentGenerated(data.content);
        }
      } else {
        throw new Error(data.error || "Failed to generate content");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [topic, tone, length, toast, onContentGenerated]);
  
  return (
    <Card>
      <CardHeader className="border-b border-neutral-200">
        <CardTitle>AI Content Generator</CardTitle>
        <CardDescription>
          Quickly create blog posts with AI assistance
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">Blog Topic</Label>
            <Input 
              id="topic" 
              placeholder="e.g. Summer fashion trends"
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
          </div>
          
          <div className="pt-3">
            <Button 
              className="w-full" 
              onClick={generateContent}
              disabled={isGenerating}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Content"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
