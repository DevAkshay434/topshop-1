import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Fix import path
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Define validation schema for the form
const formSchema = z.object({
  mode: z.enum(['cluster', 'single']),
  topic: z.string().min(1, 'Topic is required'),
  toneOfVoice: z.string().optional(),
  writingPerspective: z.string().optional(),
  introStyle: z.string().optional(),
  buyerProfile: z.string().optional(),
  copywriter: z.string().optional(),
  style: z.string().optional(),
  gender: z.string().optional(),
  faqStyle: z.string().optional(),
  articleLength: z.string().optional(),
  numH2s: z.coerce.number().default(5),
  enableTables: z.boolean().optional(),
  enableLists: z.boolean().optional(),
  enableCitations: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClaudeContentFormProps {
  onContentGenerated: (content: any) => void;
  products?: any[];
  keywords?: string[];
}

export default function ClaudeContentForm({ onContentGenerated, products = [], keywords = [] }: ClaudeContentFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'cluster' | 'single'>('cluster');

  // Setup form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'cluster',
      topic: '',
      toneOfVoice: 'professional',
      writingPerspective: 'third-person',
      introStyle: 'problem-focused',
      buyerProfile: 'homeowners',
      copywriter: 'Expert SEO Content Writer',
      style: 'authoritative',
      gender: 'neutral',
      faqStyle: 'detailed',
      articleLength: 'medium',
      numH2s: 5,
      enableTables: true,
      enableLists: true,
      enableCitations: true,
    },
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    
    try {
      // Prepare options object for API request
      const options = {
        toneOfVoice: values.toneOfVoice,
        writingPerspective: values.writingPerspective,
        introStyle: values.introStyle,
        buyerProfile: values.buyerProfile,
        copywriter: values.copywriter,
        style: values.style,
        gender: values.gender,
        faqStyle: values.faqStyle,
        articleLength: values.articleLength,
        numH2s: values.numH2s, // numH2s is now a number due to zod transform
        enableTables: values.enableTables,
        enableLists: values.enableLists,
        enableCitations: values.enableCitations,
      };

      // Choose endpoint based on mode
      const endpoint = values.mode === 'cluster' 
        ? '/api/claude-content/cluster' 
        : '/api/claude-content/single';
      
      // Make API request to generate content
      const response = await apiRequest(endpoint, {
        method: 'POST',
        data: {
          topic: values.topic,
          keywords,
          products,
          options,
        }
      });

      if (response.success) {
        toast({
          title: "Content Generated Successfully",
          description: `Claude AI has generated your ${values.mode === 'cluster' ? 'content cluster' : 'article'}.`,
        });
        
        // Pass generated content to parent component
        onContentGenerated(response);
      } else {
        throw new Error(response.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      
      toast({
        variant: "destructive",
        title: "Content Generation Failed",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Update form mode when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'cluster' | 'single');
    form.setValue('mode', value as 'cluster' | 'single');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Content with Claude AI</CardTitle>
        <CardDescription>
          Use Claude AI to generate high-quality SEO content for your Shopify store
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cluster" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="cluster">Content Cluster</TabsTrigger>
            <TabsTrigger value="single">Single Post</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Hidden field for mode */}
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Topic Input */}
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Topic</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={activeTab === 'cluster' 
                          ? "Enter main topic for content cluster (e.g., Sustainable Gardening)" 
                          : "Enter topic for blog post (e.g., Benefits of Organic Fertilizers)"
                        } 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Writing Style Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="toneOfVoice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone of Voice</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
                          <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="writingPerspective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perspective</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select perspective" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="first-person">First Person (I/We)</SelectItem>
                          <SelectItem value="second-person">Second Person (You)</SelectItem>
                          <SelectItem value="third-person">Third Person (They/It)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="introStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Introduction Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="problem-focused">Problem-Focused</SelectItem>
                          <SelectItem value="benefit-focused">Benefit-Focused</SelectItem>
                          <SelectItem value="story-based">Story-Based</SelectItem>
                          <SelectItem value="question-based">Question-Based</SelectItem>
                          <SelectItem value="statistic-based">Statistic-Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buyerProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="homeowners">Homeowners</SelectItem>
                          <SelectItem value="business-owners">Business Owners</SelectItem>
                          <SelectItem value="professionals">Professionals</SelectItem>
                          <SelectItem value="parents">Parents</SelectItem>
                          <SelectItem value="students">Students</SelectItem>
                          <SelectItem value="general-consumers">General Consumers</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="articleLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Length</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="short">Short</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="long">Long</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numH2s"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sections (H2s)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3">3 Sections</SelectItem>
                          <SelectItem value="4">4 Sections</SelectItem>
                          <SelectItem value="5">5 Sections</SelectItem>
                          <SelectItem value="6">6 Sections</SelectItem>
                          <SelectItem value="7">7 Sections</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="faqStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FAQ Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Toggle Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="enableTables"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include Tables</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enableLists"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include Lists</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="enableCitations"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Include Citations</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Writer Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="copywriter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Writer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Writer's name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Writer Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="authoritative">Authoritative</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="storytelling">Storytelling</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Writer Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Generate {activeTab === 'cluster' ? 'Content Cluster' : 'Article'} with Claude AI
                  </>
                )}
              </Button>
            </form>
          </Form>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-xs text-muted-foreground">
          {activeTab === 'cluster' 
            ? 'Claude AI will generate a pillar article and 5-7 supporting articles around your chosen topic.' 
            : 'Claude AI will generate a comprehensive single blog post on your chosen topic.'}
        </div>
        
        {products && products.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Selected Products: {products.map(p => p.title).join(', ')}
          </div>
        )}
        
        {keywords && keywords.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Selected Keywords: {keywords.join(', ')}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}