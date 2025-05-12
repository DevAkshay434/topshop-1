import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertBlogPostSchema } from '@shared/schema';
import { format } from 'date-fns';
import { useStore } from '@/contexts/StoreContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { createDateInTimezone, getTomorrowInTimezone } from '@shared/timezone';
import { SchedulingPermissionNotice } from './SchedulingPermissionNotice';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, CheckCircle2, Clock, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

// Extend the schema with validation rules
const formSchema = insertBlogPostSchema.extend({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.string().optional(),
  publicationType: z.enum(["publish", "draft", "schedule"]).default("draft"),
  scheduledPublishDate: z.string().optional().nullable(),
  scheduledPublishTime: z.string().optional().nullable(),
  blogId: z.string().optional(),
  shopifyBlogId: z.string().optional(),
  articleType: z.enum(["blog", "page"]).default("blog"),
  productIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EnhancedWorkflowProps {
  isGenerating?: boolean;
  generatedContent: any;
  selectedBlogId?: string;
  articleType?: "blog" | "page";
  categories?: string[];
  canSchedule?: boolean;
  onPublish?: (values: FormValues) => Promise<void>;
}

export default function EnhancedWorkflow({
  isGenerating = false,
  generatedContent,
  selectedBlogId,
  articleType = "blog",
  categories = [],
  canSchedule = true,
  onPublish
}: EnhancedWorkflowProps) {
  const { toast } = useToast();
  const { storeInfo } = useStore();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get the store timezone or fall back to UTC
  const storeTimezone = storeInfo?.iana_timezone || 'UTC';
  
  // Get tomorrow's date in the store's timezone for scheduling
  const tomorrow = getTomorrowInTimezone(storeTimezone);
  const defaultScheduleDate = format(tomorrow, 'yyyy-MM-dd');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: generatedContent?.title || "",
      content: generatedContent?.content || "",
      category: generatedContent?.category || "General",
      categories: categories || [],
      tags: Array.isArray(generatedContent?.tags) 
        ? generatedContent.tags.join(", ") 
        : "",
      publicationType: "draft",
      scheduledPublishDate: defaultScheduleDate,
      scheduledPublishTime: "09:30",
      blogId: selectedBlogId || "",
      articleType: articleType,
      productIds: [],
    },
  });
  
  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create the base post data from form values
      let postData: any = {
        title: values.title,
        content: values.content,
        category: values.category,
        categories: Array.isArray(values.categories) ? values.categories.join(',') : values.categories,
        tags: values.tags,
        blogId: values.blogId || selectedBlogId,
        articleType: values.articleType || articleType,
        productIds: values.productIds || [],
      };
      
      // Process scheduling information
      if (values.publicationType === 'schedule') {
        if (!canSchedule) {
          toast({
            title: "Permission Required",
            description: "Your store doesn't have scheduling permission. Post saved as draft instead.",
            variant: "destructive",
          });
          postData.publicationType = 'draft';
          postData.status = 'draft';
        } else {
          // Set up scheduled post data
          postData.publicationType = 'schedule';
          postData.status = 'scheduled';
          
          // Make sure we have date and time
          if (!values.scheduledPublishDate || !values.scheduledPublishTime) {
            // Get the store timezone or fall back to UTC
            const storeTimezone = storeInfo?.iana_timezone || 'UTC';
            
            // Get tomorrow's date in the store's timezone for scheduling
            const tomorrow = getTomorrowInTimezone(storeTimezone);
            const defaultDate = format(tomorrow, 'yyyy-MM-dd');
            
            postData.scheduledPublishDate = values.scheduledPublishDate || defaultDate;
            postData.scheduledPublishTime = values.scheduledPublishTime || "09:30";
          } else {
            postData.scheduledPublishDate = values.scheduledPublishDate;
            postData.scheduledPublishTime = values.scheduledPublishTime;
          }
          
          // Backward compatibility
          postData.scheduleDate = postData.scheduledPublishDate;
          postData.scheduleTime = postData.scheduledPublishTime;
          
          console.log(`Scheduling post for ${postData.scheduledPublishDate} at ${postData.scheduledPublishTime}`);
        }
      } else {
        // Handle publish or draft
        postData.publicationType = values.publicationType;
        postData.status = values.publicationType === 'publish' ? 'published' : 'draft';
      }
      
      // Use custom publish handler if provided
      if (onPublish) {
        await onPublish(values);
      } else {
        // Default publish implementation
        const response = await apiRequest("POST", "/api/posts", postData);
        
        const actionText = 
          values.publicationType === 'publish' ? 'published' :
          values.publicationType === 'schedule' ? 'scheduled' : 'saved as draft';
        
        toast({
          title: "Content " + actionText,
          description: `Your content has been successfully ${actionText}`,
        });
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/posts/recent"] });
        queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
        queryClient.invalidateQueries({ queryKey: ["/api/posts/published"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render preview content
  const renderPreview = () => {
    const content = form.watch('content');
    if (!content) return <p>No content available</p>;
    
    return (
      <div className="rounded-md p-5 bg-white shadow-sm border border-gray-100 prose prose-blue max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Review & Publish</CardTitle>
        <CardDescription>
          Edit your generated content before publishing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              Generating content with AI. This might take a minute...
            </p>
          </div>
        ) : generatedContent ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Tabs for Edit/Preview modes */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="edit" className="space-y-6">
                  {/* Title field */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Content editor */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            className="min-h-[400px] font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Tags field */}
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags (comma separated)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter tags separated by commas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">{form.watch('title') || 'Untitled Post'}</h3>
                      {(() => {
                        const tagValue = form.watch('tags');
                        if (!tagValue || typeof tagValue !== 'string' || !tagValue.trim()) {
                          return null;
                        }
                        
                        const tagList = tagValue.split(',').filter(tag => tag.trim());
                        if (tagList.length === 0) {
                          return null;
                        }
                        
                        return (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tagList.map((tag, index) => (
                              <Badge key={index} variant="outline">{tag.trim()}</Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Content preview */}
                    {renderPreview()}
                  </div>
                </TabsContent>
              </Tabs>
              
              <Separator className="my-6" />
              
              {/* Publication options */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="publicationType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Publication Options</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="draft" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Save as Draft
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="publish" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Publish Now
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="schedule" disabled={!canSchedule} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Schedule for Later
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Scheduling options - only show when schedule is selected */}
                {form.watch('publicationType') === 'schedule' && (
                  <div className="space-y-4 p-4 bg-neutral-50 rounded-md">
                    {!canSchedule && (
                      <SchedulingPermissionNotice 
                        storeName={storeInfo?.name || 'your store'} 
                      />
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledPublishDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Publish Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      field.onChange(format(date, 'yyyy-MM-dd'));
                                    }
                                  }}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="scheduledPublishTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publish Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                value={field.value || "09:30"}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : form.watch('publicationType') === 'publish' ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Publish
                    </>
                  ) : form.watch('publicationType') === 'schedule' ? (
                    <>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Schedule
                    </>
                  ) : (
                    'Save Draft'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>No content to preview. Generate content first.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}