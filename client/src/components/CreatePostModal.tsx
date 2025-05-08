import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertBlogPostSchema } from "@shared/schema";
import { 
  createDateInTimezone, 
  formatToTimezone, 
  getTomorrowInTimezone 
} from "@shared/timezone";
import { useStore } from "@/contexts/StoreContext";
import { 
  Dialog,
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  List, 
  ListOrdered, 
  Image, 
  ShoppingBag 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  generatedContent?: {
    title: string;
    content: string;
    tags: string[];
  };
}

// Extend the schema with validation rules
const formSchema = insertBlogPostSchema.extend({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().optional(),
  tags: z.string().optional(),
  publicationType: z.enum(["publish", "schedule", "draft"]),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  // Override date fields with more flexible handling
  publishedDate: z.any().optional(),
  scheduledDate: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreatePostModal({ 
  open, 
  onOpenChange, 
  initialData,
  generatedContent
}: CreatePostModalProps) {
  const { toast } = useToast();
  const { storeInfo } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formattedTags = useRef<string>("");
  
  // Get the store timezone or fall back to UTC
  const storeTimezone = storeInfo?.iana_timezone || 'UTC';
  
  // Get current and tomorrow's date in the store's timezone
  const currentDate = new Date();
  const currentDateFormatted = formatToTimezone(currentDate, storeTimezone, 'date');
  const tomorrowDate = new Date(currentDate);
  tomorrowDate.setDate(currentDate.getDate() + 1);
  const tomorrowDateFormatted = formatToTimezone(tomorrowDate, storeTimezone, 'date');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "Fashion",
      tags: initialData?.tags || "",
      publicationType: initialData?.status === "published" 
        ? "publish" 
        : initialData?.status === "scheduled" 
          ? "schedule" 
          : "draft",
      scheduleDate: initialData?.scheduledDate 
        ? formatToTimezone(new Date(initialData.scheduledDate), storeTimezone, 'date') 
        : tomorrowDateFormatted,
      scheduleTime: initialData?.scheduledDate 
        ? formatToTimezone(new Date(initialData.scheduledDate), storeTimezone, 'time') 
        : "09:30",
      status: initialData?.status || "draft",
    },
  });
  
  useEffect(() => {
    if (generatedContent) {
      // Format tags array into a comma-separated string (safely handle undefined tags)
      formattedTags.current = Array.isArray(generatedContent.tags) 
        ? generatedContent.tags.join(", ") 
        : generatedContent.title?.split(" ").slice(0, 3).join(", ") || "";
      
      form.reset({
        ...form.getValues(),
        title: generatedContent.title || "New Blog Post",
        content: generatedContent.content || "",
        tags: formattedTags.current,
      });
    } else if (initialData) {
      // Make sure form gets reset with initial data when editing an existing post
      form.reset({
        title: initialData.title || "",
        content: initialData.content || "",
        category: initialData.category || "Fashion",
        tags: initialData.tags || "",
        publicationType: initialData.status === "published" 
          ? "publish" 
          : initialData.status === "scheduled" 
            ? "schedule" 
            : "draft",
        scheduleDate: initialData.scheduledDate 
          ? formatToTimezone(new Date(initialData.scheduledDate), storeTimezone, 'date') 
          : tomorrowDateFormatted,
        scheduleTime: initialData.scheduledDate 
          ? formatToTimezone(new Date(initialData.scheduledDate), storeTimezone, 'time') 
          : "09:30",
        status: initialData.status || "draft"
      });
    }
  }, [generatedContent, initialData, form, storeTimezone, tomorrowDateFormatted]);
  
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      let postData: any = {
        title: values.title,
        content: values.content,
        category: values.category,
        tags: values.tags,
      };
      
      // Set status and dates based on publication type
      if (values.publicationType === "publish") {
        postData.status = "published";
        // Make sure date is properly formatted as ISO string
        const currentDate = new Date();
        postData.publishedDate = currentDate;
        // For publish, still need to set scheduledDate to null explicitly
        postData.scheduledDate = null;
      } else if (values.publicationType === "schedule") {
        postData.status = "scheduled";
        
        // Combine date and time for scheduled date
        if (values.scheduleDate && values.scheduleTime) {
          // Use timezone-aware date creation
          const scheduledDate = createDateInTimezone(
            values.scheduleDate,
            values.scheduleTime,
            storeTimezone
          );
          postData.scheduledDate = scheduledDate;
        } else {
          // Default scheduling to tomorrow in the store's timezone if not specified
          postData.scheduledDate = getTomorrowInTimezone(storeTimezone);
        }
        // For schedule, still set publishedDate to null
        postData.publishedDate = null;
      } else {
        postData.status = "draft";
        // For draft, set both dates to null explicitly
        postData.scheduledDate = null;
        postData.publishedDate = null;
      }
      
      let response;
      
      if (initialData?.id) {
        // Update existing post
        response = await apiRequest("PUT", `/api/posts/${initialData.id}`, postData);
        
        toast({
          title: "Post Updated",
          description: "Blog post has been updated successfully",
        });
      } else {
        // Create new post
        response = await apiRequest("POST", "/api/posts", postData);
        
        toast({
          title: "Post Created",
          description: "Blog post has been created successfully",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/published"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save post",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const publicationType = form.watch("publicationType");
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Blog Post" : "Create New Blog Post"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a compelling title"
                      {...field}
                    />
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
                  <FormLabel>Post Content</FormLabel>
                  <div className="mt-1 border border-neutral-200 rounded-md shadow-sm">
                    <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-5 mx-1" />
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <List className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-5 mx-1" />
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                        <ShoppingBag className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        rows={8}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="Write your blog post content here or use AI to generate content..."
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fashion">Fashion</SelectItem>
                        <SelectItem value="Style Tips">Style Tips</SelectItem>
                        <SelectItem value="Seasonal Trends">Seasonal Trends</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                        <SelectItem value="Sustainability">Sustainability</SelectItem>
                        <SelectItem value="Selected">Selected</SelectItem>
                        <SelectItem value="Featured">Featured</SelectItem>
                        <SelectItem value="New Arrivals">New Arrivals</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="summer, fashion, trends"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="publicationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publication Options</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="publish" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Publish now
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="schedule" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Schedule for later
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="draft" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Save as draft
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {publicationType === "schedule" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="scheduleDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduleTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="text-xs text-gray-500 -mt-2">
                  {storeInfo ? (
                    <p>All times are in the store's timezone: <span className="font-medium">{storeInfo.timezone || storeInfo.iana_timezone}</span></p>
                  ) : (
                    <p>Times are in your local timezone</p>
                  )}
                </div>
              </>
            )}
            
            <DialogFooter>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? "Saving..." 
                  : initialData 
                    ? "Update" 
                    : publicationType === "publish" 
                      ? "Publish to Shopify" 
                      : publicationType === "schedule" 
                        ? "Schedule" 
                        : "Save as Draft"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
