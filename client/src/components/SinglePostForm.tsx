import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Calendar, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Validation schema for the form
const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  metaDescription: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled']),
  scheduledPublishDate: z.string().optional().nullable(),
  scheduledPublishTime: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
});

type PostFormValues = z.infer<typeof postSchema>;

interface SinglePostFormProps {
  post: any;
  onSave: (post: any) => Promise<void>;
  products?: any[];
  canSchedule?: boolean;
  blogId?: string | number;
}

export default function SinglePostForm({ 
  post, 
  onSave, 
  products = [], 
  canSchedule = false,
  blogId 
}: SinglePostFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with post data
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post.title || '',
      content: post.content || '',
      metaDescription: post.metaDescription || '',
      status: 'draft',
      scheduledPublishDate: null,
      scheduledPublishTime: null,
      featuredImage: post.featuredImage || null,
    },
  });

  // Get status from form
  const status = form.watch('status');
  const showScheduleFields = status === 'scheduled' && canSchedule;

  // Handle form submission
  const onSubmit = async (values: PostFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Create post object to save
      const postToSave = {
        ...post,
        ...values,
        blogId: blogId,
      };
      
      await onSave(postToSave);
      
      toast({
        title: "Post Saved",
        description: `Your post has been ${values.status === 'published' ? 'published' : values.status === 'scheduled' ? 'scheduled' : 'saved as draft'}.`,
      });
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        variant: "destructive",
        title: "Error Saving Post",
        description: "There was an error saving your post. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Edit Article</CardTitle>
        <CardDescription>
          Review and edit your generated article before saving or publishing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Article title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meta Description Field */}
            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="SEO meta description" 
                      {...field} 
                      value={field.value || ''}
                      className="resize-none"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Field */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Article content" 
                      {...field} 
                      className="resize-none min-h-[300px]"
                      rows={12}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                      <SelectItem value="published">Publish Now</SelectItem>
                      {canSchedule && (
                        <SelectItem value="scheduled">Schedule Publication</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled Publication Fields */}
            {showScheduleFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledPublishDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
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
                          {...field} 
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {post.tags && post.tags.length > 0 && (
            <div>Tags: {post.tags.join(', ')}</div>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => form.setValue('status', 'draft')}
            disabled={isSubmitting}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          
          {canSchedule && (
            <Button
              variant="outline"
              onClick={() => {
                form.setValue('status', 'scheduled');
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dateStr = tomorrow.toISOString().split('T')[0];
                form.setValue('scheduledPublishDate', dateStr);
                form.setValue('scheduledPublishTime', '10:00');
              }}
              disabled={isSubmitting}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          )}
          
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {status === 'published' 
                  ? 'Publish Now' 
                  : status === 'scheduled' 
                    ? 'Schedule Post' 
                    : 'Save Draft'}
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}