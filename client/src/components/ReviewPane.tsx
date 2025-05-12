import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { useStore } from '@/contexts/StoreContext';
import { SchedulingPermissionNotice } from './SchedulingPermissionNotice';
import { createDateInTimezone } from '@shared/timezone';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define schema for review form
const reviewSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  publicationType: z.enum(["draft", "publish", "schedule"]).default("draft"),
  scheduledPublishDate: z.string().optional().nullable(),
  scheduledPublishTime: z.string().optional().nullable(),
  tags: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewPaneProps {
  content: string;
  title: string;
  tags?: string[];
  onSubmit: (values: any) => Promise<void>;
  isSubmitting?: boolean;
  hasSchedulingPermission?: boolean;
}

export function ReviewPane({
  content,
  title,
  tags = [],
  onSubmit,
  isSubmitting = false,
  hasSchedulingPermission = true,
}: ReviewPaneProps) {
  const { storeInfo } = useStore();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');
  
  // Initialize form with provided values
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      title: title || "",
      content: content || "",
      publicationType: "draft",
      // Get tomorrow's date in store timezone
      scheduledPublishDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
      scheduledPublishTime: "09:30",
      tags: Array.isArray(tags) ? tags.join(", ") : ""
    }
  });
  
  // Handle form submission
  const handleSubmit = async (values: ReviewFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Error in review pane submission:", error);
    }
  };
  
  // Render content preview with proper HTML
  const renderPreview = () => {
    const currentContent = form.watch('content');
    
    if (!currentContent) {
      return <p className="text-muted-foreground">No content to preview</p>;
    }
    
    // Process content for display
    const processedContent = currentContent
      // Fix relative image URLs to absolute URLs (adding https:// if missing)
      .replace(
        /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
        '<img$1src="https://$2"$3>'
      )
      // Fix image URLs that might be missing domain (starting with //)
      .replace(
        /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
        '<img$1src="https://$3"$4>'
      );
    
    return (
      <div className="prose prose-blue max-w-none">
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Review Content</CardTitle>
        <CardDescription>
          Review and edit your content before publishing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="space-y-4 pt-4">
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
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          className="min-h-[300px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              
              <TabsContent value="preview" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{form.watch('title') || 'Untitled Post'}</h2>
                    
                    {(() => {
                      const tagValue = form.watch('tags');
                      // Safe check that we have a non-empty string
                      if (!tagValue || typeof tagValue !== 'string' || !tagValue.trim()) {
                        return null;
                      }
                      
                      // Split tags and filter out empty ones
                      const tagList = tagValue.split(',').filter(tag => tag.trim());
                      if (tagList.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tagList.map((tag, index) => (
                            <Badge key={index} variant="outline">{tag.trim()}</Badge>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  
                  {renderPreview()}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="pt-4 space-y-4">
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
                            <RadioGroupItem value="schedule" disabled={!hasSchedulingPermission} />
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
              
              {form.watch('publicationType') === 'schedule' && (
                <div className="space-y-4 p-4 bg-muted rounded-md">
                  {!hasSchedulingPermission && (
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
            
            <div className="flex justify-end">
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
                  'Publish'
                ) : form.watch('publicationType') === 'schedule' ? (
                  'Schedule'
                ) : (
                  'Save as Draft'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}