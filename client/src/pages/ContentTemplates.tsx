import React, { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Pencil, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Template data structure
interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  contentStructure?: string;
  topics?: string[];
}

// Define the template content structures
const templateContent: Record<number, {structure: string, topics: string[]}> = {
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
    topics: ["Fashion Accessories", "Tech Gadgets", "Home Decor", "Beauty Products", "Kitchen Appliances"]
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
    topics: ["DIY Projects", "Digital Marketing", "Personal Finance", "Cooking Techniques", "Product Photography"]
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
    topics: ["E-commerce", "Social Media", "Sustainability", "AI and Technology", "Remote Work"]
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
    topics: ["Smartphones", "E-commerce Platforms", "Email Marketing Tools", "CRM Software", "Payment Processors"]
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
    topics: ["Winter Holiday Sales", "Back to School", "Black Friday", "Summer Clearance", "Anniversary Sale"]
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
    topics: ["Small Business Success", "E-commerce Growth", "Marketing ROI", "Customer Retention", "Digital Transformation"]
  }
};

// Sample template data
const templates: Template[] = [
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
];

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
  
  // Handle template usage
  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };
  
  // Handle template editing
  const handleEditTemplate = (template: Template) => {
    toast({
      title: "Edit Template",
      description: `Editing template "${template.name}" is not implemented yet.`,
    });
  };
  
  // Apply template with topic
  const handleApplyTemplate = async (topic: string, templateId: number) => {
    try {
      // Get the content structure for this template
      const templateData = templateContent[templateId];
      if (!templateData) {
        throw new Error("Template content not found");
      }
      
      // Generate a title based on topic and template
      const selectedTemplate = templates.find(t => t.id === templateId);
      let title = "";
      
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
        tags: tags.join(","),
        category: selectedTemplate?.category || "General"
      });
      
      // Response should have an ID if post was created successfully
      if (response && typeof response === 'object' && 'id' in response) {
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

  const handleCreateTemplate = () => {
    toast({
      title: "Create Template",
      description: "Creating new templates is not implemented yet.",
    });
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
        <div className="mt-4 md:mt-0 md:ml-4">
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
      
      <TemplateUsageDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        template={selectedTemplate}
        onApply={handleApplyTemplate}
      />
    </Layout>
  );
}