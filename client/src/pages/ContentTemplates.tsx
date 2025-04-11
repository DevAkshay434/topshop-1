import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Pencil, Plus, Zap, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";

// Template data structure
interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  contentStructure?: string;
  topics?: string[];
  aiPrompt?: string; // Custom prompt for AI content generation
}

// Define the template content structures
const templateContent: Record<number, {structure: string, topics: string[], aiPrompt: string}> = {
  1: {
    structure: `# [Product Name] Review: Is It Worth Your Money?

## Introduction
Looking for an honest review of [Product Name]? In this comprehensive review, we'll explore its features, benefits, drawbacks, and whether it's worth your investment.

## Product Overview
[Brief description of the product, its purpose, and target audience]

## Key Features
- Feature 1: [Description]
- Feature 2: [Description]
- Feature 3: [Description]

## Pros and Cons
### What We Like
- [Pro 1]
- [Pro 2]
- [Pro 3]

### What Could Be Improved
- [Con 1]
- [Con 2]

## Performance and Value
[Detailed assessment of how the product performs and whether it provides good value]

## Final Verdict
[Summary and rating out of 5 stars]`,
    topics: ["Fashion Accessories", "Tech Gadgets", "Home Decor", "Beauty Products", "Kitchen Appliances"],
    aiPrompt: "You are a professional product reviewer. Write a comprehensive, honest review about [TOPIC]. Include pros, cons, and a final verdict with rating. Be objective and support claims with evidence."
  },
  2: {
    structure: `# How to [Accomplish Task]: A Step-by-Step Guide

## Introduction
Want to learn how to [accomplish task]? This comprehensive guide breaks down the process into simple, actionable steps anyone can follow.

## What You'll Need
- [Item/tool 1]
- [Item/tool 2]
- [Item/tool 3]

## Step 1: [First Step]
[Detailed explanation with tips]

## Step 2: [Second Step]
[Detailed explanation with tips]

## Step 3: [Third Step]
[Detailed explanation with tips]

## Common Mistakes to Avoid
- [Mistake 1]
- [Mistake 2]
- [Mistake 3]

## Conclusion
[Summary of the process and encouragement to try]`,
    topics: ["DIY Projects", "Digital Marketing", "Personal Finance", "Cooking Techniques", "Product Photography"],
    aiPrompt: "You are an expert educator. Create a detailed, step-by-step guide explaining how to [TOPIC]. Include prerequisites, common mistakes to avoid, and helpful tips for beginners."
  },
  3: {
    structure: `# [Industry] Trends: What's New in [Year]

## Introduction
The [industry] landscape is constantly evolving. In this article, we'll explore the latest trends, developments, and predictions for [year].

## Key Trend 1: [Trend Name]
[Explanation of the trend and its impact]

## Key Trend 2: [Trend Name]
[Explanation of the trend and its impact]

## Key Trend 3: [Trend Name]
[Explanation of the trend and its impact]

## Expert Insights
[Quotes or insights from industry experts]

## What This Means For Your Business
[Practical implications and action steps]

## Looking Ahead
[Future predictions and preparation strategies]`,
    topics: ["E-commerce", "Social Media", "Sustainability", "AI and Technology", "Remote Work"],
    aiPrompt: "You are an industry analyst. Write a well-researched article about the latest trends in [TOPIC] for this year. Include statistics, expert opinions, and practical insights for businesses."
  },
  4: {
    structure: `# [Product A] vs [Product B]: Which One Should You Choose?

## Introduction
Trying to decide between [Product A] and [Product B]? This in-depth comparison will help you make an informed decision based on features, performance, and value.

## Quick Comparison
| Feature | [Product A] | [Product B] |
|---------|-------------|-------------|
| Price   | $XX         | $XX         |
| [Feature 1] | [Details] | [Details] |
| [Feature 2] | [Details] | [Details] |
| [Feature 3] | [Details] | [Details] |

## Design and Build Quality
[Comparison of design and build quality]

## Performance
[Comparison of performance metrics]

## User Experience
[Comparison of user experience]

## Value for Money
[Assessment of value proposition]

## Who Should Choose [Product A]
[Ideal user profile]

## Who Should Choose [Product B]
[Ideal user profile]

## Final Verdict
[Summary and recommendation]`,
    topics: ["Smartphones", "E-commerce Platforms", "Email Marketing Tools", "CRM Software", "Payment Processors"],
    aiPrompt: "You are a product comparison expert. Create a detailed comparison between products or services in the [TOPIC] category. Highlight key differences, analyze value for money, and provide a clear recommendation for different user needs."
  },
  5: {
    structure: `# [Season/Holiday] Special: Exclusive Deals You Can't Miss

## Introduction
The [season/holiday] season is here, and we're celebrating with special offers on our most popular products. Don't miss these limited-time deals!

## Featured Promotion: [Promotion Name]
[Description of main promotion with deadline and savings]

## Top [Season/Holiday] Picks
### 1. [Product Name]
- Regular price: $XX
- Sale price: $XX
- [Brief description]

### 2. [Product Name]
- Regular price: $XX
- Sale price: $XX
- [Brief description]

### 3. [Product Name]
- Regular price: $XX
- Sale price: $XX
- [Brief description]

## Bundle Deals
[Description of bundle offers]

## How to Claim Your Discount
[Instructions for redeeming offers]

## Limited Time Only
[Urgency reminder with end date]`,
    topics: ["Winter Holiday Sales", "Back to School", "Black Friday", "Summer Clearance", "Anniversary Sale"],
    aiPrompt: "You are a marketing specialist creating a promotional article for the [TOPIC] season. Write compelling copy highlighting special offers, creating urgency, and featuring your best products with appealing descriptions."
  },
  6: {
    structure: `# How [Customer Name] Achieved [Result] with [Your Product/Service]

## Customer Profile
[Brief introduction to the customer, their business, and challenges]

## The Challenge
[Detailed description of the problems they were facing]

## Finding a Solution
[How they discovered your product/service and what made them choose it]

## Implementation Process
[How they implemented your product/service]

## The Results
[Specific, measurable results they achieved]

### Key Outcomes:
- [Outcome 1 with metrics]
- [Outcome 2 with metrics]
- [Outcome 3 with metrics]

## In Their Words
[Customer quote about their experience]

## Lessons Learned
[Insights gained from this customer success story]`,
    topics: ["Small Business Success", "E-commerce Growth", "Marketing ROI", "Customer Retention", "Digital Transformation"],
    aiPrompt: "You are a case study writer. Create a detailed success story about a business that achieved impressive results with [TOPIC]. Include specific challenges, solutions, implementation details, and quantifiable outcomes. Use a professional, factual tone."
  }
};

// Template creation dialog component
function TemplateCreateDialog({ 
  isOpen, 
  setIsOpen, 
  onSave 
}: { 
  isOpen: boolean, 
  setIsOpen: (open: boolean) => void,
  onSave: (name: string, description: string, category: string, structure: string, topics: string[], aiPrompt: string) => void
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [structure, setStructure] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setCategory("");
      setStructure(`# [Title]

## Introduction
[Introduction text]

## Section 1
[Content for section 1]

## Section 2
[Content for section 2]

## Conclusion
[Conclusion text]`);
      setTopicsText("");
      setAiPrompt("You are a professional blog writer creating a comprehensive article about [TOPIC]. Write a detailed, engaging, and informative article that provides value to the reader. Include specific examples, actionable tips, and cite relevant statistics or research when appropriate. Format the content with proper headings, bullet points, and paragraphs for easy readability.");
    }
  }, [isOpen]);
  
  const handleSave = () => {
    if (!name || !description || !category || !structure) return;
    
    // Convert topics text to array
    const topicsArray = topicsText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);
    
    onSave(name, description, category, structure, topicsArray, aiPrompt);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a custom content template for generating blog posts.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Template Details</TabsTrigger>
            <TabsTrigger value="structure">Template Structure</TabsTrigger>
            <TabsTrigger value="topics">Suggested Topics</TabsTrigger>
            <TabsTrigger value="ai-prompt">AI Prompt</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Product Review, Tutorial, Case Study"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of what this template is used for"
                  className="resize-none h-24"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Reviews, Educational, Marketing"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="structure" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="structure">Markdown Template</Label>
              <div className="relative">
                <Textarea 
                  id="structure" 
                  value={structure} 
                  onChange={(e) => setStructure(e.target.value)}
                  className="font-mono h-96 resize-none"
                />
              </div>
              <p className="text-sm text-neutral-500">
                Use placeholders like [Product Name], [Industry], [Season/Holiday], [Accomplish Task], or [Year] that will be replaced with the specific topic.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="topics" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="topics">Suggested Topics (one per line)</Label>
              <Textarea 
                id="topics" 
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)} 
                className="h-80 resize-none"
                placeholder="Topic 1
Topic 2
Topic 3"
              />
              <p className="text-sm text-neutral-500">
                These topics will be shown as suggestions when using this template.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="ai-prompt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Custom AI Prompt</Label>
              <Textarea 
                id="ai-prompt" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)} 
                className="h-80 resize-none"
                placeholder="You are a professional writer creating content about [TOPIC]. 
Write a comprehensive, engaging article that provides value to readers."
              />
              <p className="text-sm text-neutral-500">
                Use [TOPIC] as a placeholder for the topic you'll specify later. This prompt will be used to instruct the AI when generating content with this template.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={!name || !description || !category || !structure}
          >
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sample template data - moved to state in the component

// Template usage dialog component
function TemplateUsageDialog({ 
  isOpen, 
  setIsOpen, 
  template, 
  onApply 
}: { 
  isOpen: boolean, 
  setIsOpen: (open: boolean) => void, 
  template: Template | null,
  onApply: (topic: string, templateId: number) => void
}) {
  const [topic, setTopic] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  
  const handleApply = () => {
    if (!template) return;
    
    // Use either custom topic or selected predefined topic
    const finalTopic = topic || selectedTopic;
    if (!finalTopic) return;
    
    onApply(finalTopic, template.id);
    setTopic("");
    setSelectedTopic("");
    setIsOpen(false);
  };
  
  const topicSuggestions = template ? templateContent[template.id]?.topics || [] : [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{template?.name}</DialogTitle>
          <DialogDescription>
            {template?.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Custom Topic</Label>
            <Input
              id="topic"
              placeholder="Enter your topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                // Clear selected topic when custom topic is entered
                if (e.target.value) setSelectedTopic("");
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Or choose a suggested topic</Label>
            <Select 
              value={selectedTopic} 
              onValueChange={(value) => {
                setSelectedTopic(value);
                // Clear custom topic when suggestion is selected
                if (value) setTopic("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {topicSuggestions.map((suggestion, index) => (
                  <SelectItem key={index} value={suggestion}>
                    {suggestion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!topic && !selectedTopic}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Template edit dialog component
function TemplateEditDialog({ 
  isOpen, 
  setIsOpen, 
  template, 
  templateContent,
  onSave 
}: { 
  isOpen: boolean, 
  setIsOpen: (open: boolean) => void, 
  template: Template | null,
  templateContent: { structure: string, topics: string[], aiPrompt?: string } | null,
  onSave: (templateId: number, structure: string, topics: string[], aiPrompt: string) => void
}) {
  const [structure, setStructure] = useState("");
  const [topicsText, setTopicsText] = useState("");
  
  const [aiPrompt, setAiPrompt] = useState("");

  // Load template content when dialog opens
  useEffect(() => {
    if (isOpen && template && templateContent) {
      setStructure(templateContent.structure);
      setTopicsText(templateContent.topics.join('\n'));
      setAiPrompt(templateContent.aiPrompt || "");
    }
  }, [isOpen, template, templateContent]);
  
  const handleSave = () => {
    if (!template) return;
    
    // Convert topics text to array
    const topicsArray = topicsText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);
    
    onSave(template.id, structure, topicsArray, aiPrompt);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template: {template?.name}</DialogTitle>
          <DialogDescription>
            Customize the template structure and suggested topics.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="structure" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="structure">Template Structure</TabsTrigger>
            <TabsTrigger value="topics">Suggested Topics</TabsTrigger>
            <TabsTrigger value="ai-prompt">AI Prompt</TabsTrigger>
          </TabsList>
          
          <TabsContent value="structure" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="structure">Markdown Template</Label>
              <div className="relative">
                <Textarea 
                  id="structure" 
                  value={structure} 
                  onChange={(e) => setStructure(e.target.value)}
                  className="font-mono h-96 resize-none"
                  placeholder="# Template Title

## Section 1
[Your content here]

## Section 2
[Your content here]"
                />
              </div>
              <p className="text-sm text-neutral-500">
                Use placeholders like [Product Name], [Industry], [Season/Holiday], [Accomplish Task], or [Year] that will be replaced with the specific topic.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="topics" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="topics">Suggested Topics (one per line)</Label>
              <Textarea 
                id="topics" 
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)} 
                className="h-80 resize-none"
                placeholder="Topic 1
Topic 2
Topic 3"
              />
              <p className="text-sm text-neutral-500">
                These topics will be shown as suggestions when using this template.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="ai-prompt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Custom AI Prompt</Label>
              <Textarea 
                id="ai-prompt" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)} 
                className="h-80 resize-none"
                placeholder="You are a professional writer creating content about [TOPIC]. 
Write a comprehensive, engaging article that provides value to readers."
              />
              <p className="text-sm text-neutral-500">
                Use [TOPIC] as a placeholder for the topic you'll specify later. This prompt will be used to instruct the AI when generating content with this template.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Bulk content generation dialog
function BulkGenerationDialog({
  isOpen,
  setIsOpen,
  onGenerate,
  templates
}: {
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  onGenerate: (keywords: string[], templateId: number) => Promise<void>,
  templates: Template[]
}) {
  const { toast } = useToast();
  const [niche, setNiche] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("1"); // Default to Product Review template

  // Fetch topic suggestions based on niche
  const handleGetSuggestions = async () => {
    if (!niche.trim()) {
      toast({
        title: "Please enter a niche",
        description: "Enter your industry or topic area to get AI suggestions",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/topic-suggestions?niche=${encodeURIComponent(niche)}&count=10`);
      const data = await response.json();
      
      if (data.topics && Array.isArray(data.topics)) {
        setSuggestions(data.topics);
        
        // Automatically add suggestions to keywords textarea
        setKeywords(data.topics.join('\n'));
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast({
        title: "Failed to get suggestions",
        description: "There was an error generating topic suggestions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerate = async () => {
    if (!keywords) return;
    
    setIsGenerating(true);
    const keywordList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(Boolean);
      
    try {
      await onGenerate(keywordList, Number(selectedTemplate));
      setIsOpen(false);
    } catch (error) {
      console.error("Bulk generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>AI-Powered Content Generation</DialogTitle>
          <DialogDescription>
            Generate blog post ideas with AI or enter your own topics to generate multiple articles at once.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="niche">Your Business Niche/Industry</Label>
            <div className="flex space-x-2">
              <Input
                id="niche"
                placeholder="e.g., skincare, organic food, fitness"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
              <Button onClick={handleGetSuggestions} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Ideas"}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="keywords">Topics to Generate</Label>
              <span className="text-xs text-neutral-500">
                {keywords.split('\n').filter(Boolean).length} topics
              </span>
            </div>
            <Textarea
              id="keywords"
              placeholder="Enter topics one per line, or use the 'Get Ideas' button to generate suggestions"
              className="min-h-[150px]"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-neutral-500">
              Each line will become a separate blog post
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template">Content Style</Label>
            <Select 
              value={selectedTemplate}
              onValueChange={(value: string) => setSelectedTemplate(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a style" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!keywords || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Articles...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate {keywords.split('\n').filter(Boolean).length} Articles
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Template card component
function TemplateCard({ 
  template, 
  onUse, 
  onEdit 
}: { 
  template: Template, 
  onUse: (template: Template) => void,
  onEdit: (template: Template) => void 
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {template.category}
          </span>
        </div>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 mt-auto">
        <div className="flex space-x-2 mt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(template)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onUse(template)}>
            <FileCode className="h-4 w-4 mr-2" />
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContentTemplates() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editedTemplateContent, setEditedTemplateContent] = useState<string>("");
  const [editedTemplateTopics, setEditedTemplateTopics] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: 1,
      name: "Product Review",
      description: "Template for reviewing products with pros, cons, and ratings.",
      category: "Reviews"
    },
    {
      id: 2,
      name: "How-To Guide",
      description: "Step-by-step instructions for teaching a skill or process.",
      category: "Educational"
    },
    {
      id: 3,
      name: "Industry News",
      description: "Format for reporting on industry trends and developments.",
      category: "News"
    },
    {
      id: 4,
      name: "Product Comparison",
      description: "Side-by-side comparison of similar products or services.",
      category: "Reviews"
    },
    {
      id: 5,
      name: "Seasonal Promotion",
      description: "Promotional content for seasonal sales and special events.",
      category: "Marketing"
    },
    {
      id: 6,
      name: "Customer Story",
      description: "Format for highlighting customer success stories.",
      category: "Case Studies"
    }
  ]);
  const [generationResults, setGenerationResults] = useState<{
    success: number;
    failed: number;
    total: number;
    inProgress: boolean;
  }>({
    success: 0,
    failed: 0,
    total: 0,
    inProgress: false
  });
  
  // Handle template usage
  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };
  
  // Handle template editing
  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };
  
  // Apply template with topic
  const handleApplyTemplate = async (topic: string, templateId: number) => {
    try {
      // Get the content structure for this template
      const templateData = templateContent[templateId];
      if (!templateData) {
        throw new Error("Template content not found");
      }
      
      // Get the custom AI prompt for this template
      const customPrompt = templateData.aiPrompt;
      
      // Generate a title based on topic and template
      const selectedTemplate = templates.find(t => t.id === templateId);
      let title = "";
      
      console.log("Creating blog post from template with topic:", topic);
      
      switch (templateId) {
        case 1: // Product Review
          title = `${topic} Review: Is It Worth Your Money?`;
          break;
        case 2: // How-To Guide  
          title = `How to Master ${topic}: A Complete Guide`;
          break;
        case 3: // Industry News
          title = `${topic} Trends: What's New in ${new Date().getFullYear()}`;
          break;
        case 4: // Product Comparison
          const parts = topic.split(' vs ');
          title = parts.length > 1 
            ? `${parts[0]} vs ${parts[1]}: Which One is Better?`
            : `${topic} Comparison: Finding the Best Option`;
          break;
        case 5: // Seasonal Promotion
          title = `${topic} Special: Exclusive Deals You Can't Miss`;
          break;
        case 6: // Customer Story
          title = `How Our Customer Achieved Success with ${topic}`;
          break;
        default:
          title = `${topic} - ${selectedTemplate?.name || 'Blog Post'}`;
      }
      
      // Create content by replacing placeholders in the template
      let content = templateData.structure;
      
      // Replace topic-related placeholders
      content = content.replace(/\[Product Name\]/g, topic)
                       .replace(/\[Industry\]/g, topic)
                       .replace(/\[Season\/Holiday\]/g, topic)
                       .replace(/\[Accomplish Task\]/g, topic)
                       .replace(/\[Year\]/g, new Date().getFullYear().toString());
      
      // If using AI-generated content based on the template's custom prompt
      if (customPrompt) {
        try {
          console.log(`Using custom prompt for template: ${selectedTemplate?.name}`);
          const openaiResponse = await apiRequest({
            url: "/api/generate-content",
            method: "POST",
            data: {
              topic,
              customPrompt
            }
          });
          
          if (openaiResponse && openaiResponse.success) {
            console.log("Successfully generated content with custom prompt");
            content = openaiResponse.content;
            // Use the AI-generated title if available
            if (openaiResponse.title) {
              title = openaiResponse.title;
            }
          }
        } catch (promptError) {
          console.error("Error generating content with custom prompt:", promptError);
          // Continue with the template content as fallback
        }
      }
      
      // Create synthetic tags based on topic and template type
      const tags = [
        topic,
        selectedTemplate?.category || "",
        selectedTemplate?.name || ""
      ].filter(Boolean);
      
      // Create a new post draft with this content
      const response = await apiRequest("POST", "/api/posts", {
        title,
        content,
        status: "draft",
        tags: tags.join(","), // Tags is a text field in the schema, so join array to string
        category: selectedTemplate?.category || "General",
        storeId: null, // Use the default store connection
        author: "Template System",
        // Add these fields explicitly to avoid validation errors
        scheduledDate: null,
        publishedDate: null
      });
      
      // Server returns the created post object
      if (response) {
        toast({
          title: "Template Applied",
          description: "New draft created from template",
        });
        
        // Navigate to blog posts page
        setLocation("/blog-posts");
      }
    } catch (error) {
      console.error("Error applying template:", error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  // Save edited template
  const handleSaveTemplate = (templateId: number, structure: string, topics: string[], aiPrompt: string) => {
    if (!templateId) return;
    
    // Update the template content in the templateContent object
    templateContent[templateId] = {
      structure,
      topics,
      aiPrompt
    };
    
    toast({
      title: "Template Updated",
      description: "Template content has been updated successfully.",
    });
    
    setIsEditDialogOpen(false);
  };

  // Handle creating a new template
  const handleCreateNewTemplate = (name: string, description: string, category: string, structure: string, topics: string[], aiPrompt: string) => {
    // Generate a new template ID (max current ID + 1)
    const newId = Math.max(...templates.map(t => t.id)) + 1;
    
    // Create new template
    const newTemplate: Template = {
      id: newId,
      name,
      description,
      category
    };
    
    // Add to templates list
    setTemplates([...templates, newTemplate]);
    
    // Add template content
    templateContent[newId] = {
      structure,
      topics,
      aiPrompt
    };
    
    toast({
      title: "Template Created",
      description: `New template "${name}" has been created successfully.`,
    });
    
    setIsCreateDialogOpen(false);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsCreateDialogOpen(true);
  };
  
  // Open bulk generation dialog
  const handleOpenBulkGeneration = () => {
    setIsBulkDialogOpen(true);
  };
  
  // Process bulk article generation
  const handleBulkGeneration = async (keywords: string[], templateId: number) => {
    // Reset results
    setGenerationResults({
      success: 0,
      failed: 0,
      total: keywords.length,
      inProgress: true
    });
    
    let successCount = 0;
    let failedCount = 0;
    
    // Get template data
    const templateData = templateContent[templateId];
    const selectedTemplate = templates.find(t => t.id === templateId);
    const customPrompt = templateData?.aiPrompt;
    
    if (!templateData || !selectedTemplate) {
      toast({
        title: "Error",
        description: "Template not found",
        variant: "destructive",
      });
      return;
    }
    
    // Process each keyword
    for (const keyword of keywords) {
      try {
        // Generate title based on template type
        let title = "";
        
        switch (templateId) {
          case 1: // Product Review
            title = `${keyword} Review: Is It Worth Your Money?`;
            break;
          case 2: // How-To Guide  
            title = `How to Master ${keyword}: A Complete Guide`;
            break;
          case 3: // Industry News
            title = `${keyword} Trends: What's New in ${new Date().getFullYear()}`;
            break;
          case 4: // Product Comparison
            const parts = keyword.split(' vs ');
            title = parts.length > 1 
              ? `${parts[0]} vs ${parts[1]}: Which One is Better?`
              : `${keyword} Comparison: Finding the Best Option`;
            break;
          case 5: // Seasonal Promotion
            title = `${keyword} Special: Exclusive Deals You Can't Miss`;
            break;
          case 6: // Customer Story
            title = `How Our Customer Achieved Success with ${keyword}`;
            break;
          default:
            title = `${keyword} - ${selectedTemplate?.name || 'Blog Post'}`;
        }
        
        // Create content by replacing placeholders in the template
        let content = templateData.structure;
        
        // Replace topic-related placeholders
        content = content.replace(/\[Product Name\]/g, keyword)
                        .replace(/\[Industry\]/g, keyword)
                        .replace(/\[Season\/Holiday\]/g, keyword)
                        .replace(/\[Accomplish Task\]/g, keyword)
                        .replace(/\[Year\]/g, new Date().getFullYear().toString());
        
        // Create tags based on topic and template type
        const tags = [
          keyword,
          selectedTemplate?.category || "",
          selectedTemplate?.name || "",
          "Bulk Generated"
        ].filter(Boolean);
        
        // Create post with published status for Shopify sync
        const postResponse = await apiRequest("POST", "/api/posts", {
          title,
          content,
          // Mark as published now, so it gets pushed to Shopify
          scheduledDate: null,
          publishedDate: new Date().toISOString(),
          status: "published", // Changed from "draft" to "published"
          tags: tags.join(","), // Tags is a text field in the schema, so join array to string
          category: selectedTemplate?.category || "General",
          storeId: null,
          author: "Bulk Generation"
        });
        
        // If the post was created successfully, trigger Shopify sync
        if (postResponse && postResponse.post && postResponse.post.id) {
          try {
            // Trigger sync to Shopify
            await apiRequest("POST", "/api/shopify/sync", {
              postIds: [postResponse.post.id]
            });
            
            console.log(`Post "${title}" synced to Shopify successfully`);
          } catch (syncError) {
            console.error(`Error syncing post to Shopify:`, syncError);
            // Don't count as failed, as post was created successfully
          }
        }
        
        successCount++;
        
        // Update progress
        setGenerationResults(prev => ({
          ...prev,
          success: successCount,
          failed: failedCount
        }));
      } catch (error) {
        console.error(`Error generating article for keyword "${keyword}":`, error);
        failedCount++;
        
        // Update progress
        setGenerationResults(prev => ({
          ...prev,
          success: successCount,
          failed: failedCount
        }));
      }
    }
    
    // All done
    setGenerationResults(prev => ({
      ...prev,
      inProgress: false
    }));
    
    // Show result toast
    toast({
      title: "Bulk Generation Complete",
      description: `Generated ${successCount} of ${keywords.length} articles`,
    });
    
    // Invalidate posts query cache
    queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    
    // Navigate to blog posts page to see results
    setLocation("/blog-posts");
  };

  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">Content Templates</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Use pre-built templates to quickly create blog content
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4 flex space-x-2">
          <Button variant="outline" onClick={handleOpenBulkGeneration}>
            <Zap className="mr-2 h-4 w-4" />
            Bulk Generate
          </Button>
          <Button onClick={handleCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard 
            key={template.id} 
            template={template}
            onUse={handleUseTemplate}
            onEdit={handleEditTemplate}
          />
        ))}
      </div>
      
      {/* Single template usage dialog */}
      <TemplateUsageDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        template={selectedTemplate}
        onApply={handleApplyTemplate}
      />
      
      {/* Bulk generation dialog */}
      <BulkGenerationDialog
        isOpen={isBulkDialogOpen}
        setIsOpen={setIsBulkDialogOpen}
        onGenerate={handleBulkGeneration}
        templates={templates}
      />
      
      {/* Template editing dialog */}
      <TemplateEditDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        template={selectedTemplate}
        templateContent={selectedTemplate ? templateContent[selectedTemplate.id] : null}
        onSave={handleSaveTemplate}
      />
      
      {/* Template creation dialog */}
      <TemplateCreateDialog
        isOpen={isCreateDialogOpen}
        setIsOpen={setIsCreateDialogOpen}
        onSave={handleCreateNewTemplate}
      />
      
      {/* Progress indicator (conditionally shown) */}
      {generationResults.inProgress && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-80 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Generating Articles</h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {Math.round((generationResults.success + generationResults.failed) / generationResults.total * 100)}%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${((generationResults.success + generationResults.failed) / generationResults.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Success: {generationResults.success}</span>
              <span>Failed: {generationResults.failed}</span>
              <span>Total: {generationResults.total}</span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}