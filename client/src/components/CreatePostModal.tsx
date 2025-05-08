import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
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
  FormDescription,
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
  ShoppingBag,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  // Additional props for product and blog information
  selectedProducts?: Array<{
    id: string;
    title: string;
    handle: string;
    image?: string;
    body_html?: string;
  }>;
  selectedBlogId?: string;
  articleType?: "blog" | "page";
  generatedContent?: {
    title: string;
    content: string;
    tags: string[];
    featuredImage?: {
      id: string;
      url: string;
      width: number;
      height: number;
      alt?: string;
      src?: {
        original: string;
        large: string;
        medium: string;
        small: string;
        thumbnail: string;
      };
    };
    secondaryImages?: Array<{
      id: string;
      url: string;
      width: number;
      height: number;
      alt?: string;
      src?: {
        original: string;
        large: string;
        medium: string;
        small: string;
        thumbnail: string;
      };
    }>;
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
  // Additional fields for blog selection and product association
  blogId: z.string().optional(),
  shopifyBlogId: z.string().optional(),
  articleType: z.enum(["blog", "page"]).default("blog"),
  productIds: z.array(z.string()).optional(),
  // New fields for content generation options
  buyerProfile: z.enum(["auto", "beginner", "intermediate", "advanced"]).default("auto"),
  articleLength: z.enum(["short", "medium", "long", "comprehensive"]).default("medium"),
  headingsCount: z.string().default("3"),
  youtubeUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreatePostModal({ 
  open, 
  onOpenChange, 
  initialData,
  generatedContent,
  selectedProducts,
  selectedBlogId,
  articleType = "blog"
}: CreatePostModalProps) {
  const { toast } = useToast();
  const { storeInfo } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formattedTags = useRef<string>("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Query for blogs
  const { data: blogsData } = useQuery<{ success: boolean; blogs: Array<{ id: string; title: string; handle: string; }> }>({
    queryKey: ['/api/admin/blogs'],
    enabled: true,
  });
  
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
      // Default values for new fields
      buyerProfile: initialData?.buyerProfile || "auto",
      articleLength: initialData?.articleLength || "medium",
      headingsCount: initialData?.headingsCount || "3",
      youtubeUrl: initialData?.youtubeUrl || "",
    },
  });
  
  useEffect(() => {
    // Update the form when generated content is available
    if (generatedContent) {
      // Format tags array into a comma-separated string (safely handle undefined tags)
      formattedTags.current = Array.isArray(generatedContent.tags) 
        ? generatedContent.tags.join(", ") 
        : generatedContent.title?.split(" ").slice(0, 3).join(", ") || "";
      
      // Get current values
      const currentValues = form.getValues();
      
      // Update form values
      form.reset({
        ...currentValues,
        title: generatedContent.title || "New Blog Post",
        content: generatedContent.content || "",
        tags: formattedTags.current,
      });
      
      // Set additional fields after reset
      if (selectedBlogId) {
        form.setValue('blogId', selectedBlogId);
      }
      
      if (articleType) {
        form.setValue('articleType', articleType as "blog" | "page");
      }
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
        status: initialData.status || "draft",
      });
      
      // Set additional fields after reset
      if (selectedBlogId || initialData.blogId) {
        form.setValue('blogId', selectedBlogId || initialData.blogId);
      }
      
      if (articleType || initialData.articleType) {
        form.setValue('articleType', 
          (articleType || initialData.articleType || "blog") as "blog" | "page"
        );
      }
    } else {
      // For new posts without generated content, still use the selected blog ID and article type
      if (selectedBlogId) {
        form.setValue('blogId', selectedBlogId);
      }
      
      form.setValue('articleType', 
        (articleType || "blog") as "blog" | "page"
      );
    }
  }, [generatedContent, initialData, form, storeTimezone, tomorrowDateFormatted, selectedBlogId, articleType]);
  
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Process YouTube embed if available
      let finalContent = values.content;
      
      // If YouTube URL is provided, embed it at the end of the content
      if (values.youtubeUrl) {
        const videoId = values.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
        
        if (videoId) {
          // Add a section break and video embed HTML
          finalContent = `${finalContent}\n\n<div class="video-container" style="position: relative; padding-bottom: 56.25%; margin: 30px 0;">\n  <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n</div>`;
        }
      }
      
      // Create the base post data from form values
      let postData: any = {
        title: values.title,
        content: finalContent, // Use the processed content with YouTube embed
        category: values.category,
        tags: values.tags,
        shopifyBlogId: values.shopifyBlogId,
        // Add new fields
        buyerProfile: values.buyerProfile,
        articleLength: values.articleLength,
        headingsCount: values.headingsCount,
        youtubeUrl: values.youtubeUrl || null,
      };
      
      // Add blogId and articleType if available
      if (selectedBlogId || values.blogId) {
        postData.blogId = selectedBlogId || values.blogId;
      }
      
      if (articleType || values.articleType) {
        postData.articleType = articleType || values.articleType || "blog";
      }
      
      // Include selected products if available
      if (selectedProducts && selectedProducts.length > 0) {
        postData.productIds = selectedProducts.map(product => product.id);
      }
      
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as "edit" | "preview")} 
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit" className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post Content</FormLabel>
                      
                      {/* Display selected products related to this content */}
                      {selectedProducts && selectedProducts.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Products used for this content:</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedProducts.map(product => (
                              <div key={product.id} className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm">
                                <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center mr-1">
                                  <ShoppingBag className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{product.title}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
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
                            rows={12}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 max-h-[400px] overflow-y-auto"
                            placeholder="Write your blog post content here or use AI to generate content..."
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto">
                  <h2 className="text-2xl font-bold mb-4">{form.watch("title")}</h2>
                  
                  {/* Display the featured image */}
                  {generatedContent?.featuredImage && (
                    <div className="mb-6 flex justify-center">
                      <img 
                        src={generatedContent.featuredImage.url || generatedContent.featuredImage.src?.medium} 
                        alt={generatedContent.featuredImage.alt || form.watch("title")} 
                        className="rounded-md max-h-80 object-contain" 
                      />
                    </div>
                  )}
                  
                  {/* Convert content to paragraphs and insert secondary images */}
                  <div className="space-y-4 post-content">
                    {(() => {
                      const content = form.watch("content");
                      if (!content) return <p>No content to preview</p>;
                      
                      // Split content into paragraphs
                      const paragraphs = content.split(/\n\n+/);
                      const secondaryImages = generatedContent?.secondaryImages || [];
                      
                      // If no secondary images, just return the content as paragraphs
                      if (!secondaryImages.length) {
                        return paragraphs.map((para, i) => {
                          // Add <br> after bold text or section headers
                          let formattedPara = para
                            .replace(/\n/g, '<br />')
                            // Add line break after bold paragraphs
                            .replace(/<\/strong>([^\n<])/g, '</strong><br />$1')
                            // Add line break after h2, h3 tags
                            .replace(/<\/h2>([^\n<])/g, '</h2><br />$1')
                            .replace(/<\/h3>([^\n<])/g, '</h3><br />$1');
                          
                          return <div key={i} dangerouslySetInnerHTML={{ __html: formattedPara }} />;
                        });
                      }
                      
                      // Insert images at approximately every 3 paragraphs
                      const result: React.ReactNode[] = [];
                      let imageIndex = 0;
                      
                      paragraphs.forEach((para, i) => {
                        // Apply the same formatting as above
                        let formattedPara = para
                          .replace(/\n/g, '<br />')
                          // Add line break after bold paragraphs
                          .replace(/<\/strong>([^\n<])/g, '</strong><br />$1')
                          // Add line break after h2, h3 tags
                          .replace(/<\/h2>([^\n<])/g, '</h2><br />$1')
                          .replace(/<\/h3>([^\n<])/g, '</h3><br />$1');
                        
                        result.push(
                          <div key={`p-${i}`} dangerouslySetInnerHTML={{ __html: formattedPara }} />
                        );
                        
                        // Insert an image after every 3 paragraphs, if available
                        if ((i + 1) % 3 === 0 && imageIndex < secondaryImages.length) {
                          const image = secondaryImages[imageIndex];
                          result.push(
                            <div key={`img-${i}`} className="my-6 flex justify-center">
                              <img 
                                src={image.url || (image.src?.medium ?? '')} 
                                alt={image.alt || `Product image ${imageIndex + 1}`} 
                                className="rounded-md max-h-64 object-contain" 
                              />
                            </div>
                          );
                          imageIndex++;
                        }
                      });
                      
                      return result;
                    })()}
                  </div>
                  
                  {/* Display YouTube video if URL is provided */}
                  {(() => {
                    const youtubeUrl = form.watch("youtubeUrl");
                    if (youtubeUrl) {
                      // Extract video ID from YouTube URL
                      const videoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
                      
                      if (videoId) {
                        return (
                          <div className="my-8 flex justify-center">
                            <iframe 
                              width="560" 
                              height="315" 
                              src={`https://www.youtube.com/embed/${videoId}`}
                              title="YouTube video" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                              className="rounded-md border border-gray-200"
                            />
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
                  
                  {/* Tags section */}
                  {(() => {
                    const tags = form.watch("tags");
                    return typeof tags === 'string' && tags.length > 0 ? (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {tags.split(',').filter(Boolean).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Content Creation Options Section */}
            <div className="mb-4 mt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Content Generation Options</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="buyerProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Profile</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select buyer profile" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto">Auto (Based on Products)</SelectItem>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Tailors content to the buyer's knowledge level
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="articleLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Length</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select article length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="short">Short (~500 words)</SelectItem>
                          <SelectItem value="medium">Medium (~800 words)</SelectItem>
                          <SelectItem value="long">Long (~1200 words)</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive (~1800 words)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Determines the detail and depth of the content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="headingsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sections</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Number of H2 headings" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2">2 Sections</SelectItem>
                          <SelectItem value="3">3 Sections</SelectItem>
                          <SelectItem value="4">4 Sections</SelectItem>
                          <SelectItem value="5">5 Sections</SelectItem>
                          <SelectItem value="6">6 Sections</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Controls how many H2 headings in the article
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube Video URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.youtube.com/watch?v=..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Embed a relevant YouTube video in your article
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Content Classification */}
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
              
              {/* Hidden field for blogId with visual indicator */}
              <FormField
                control={form.control}
                name="blogId"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {/* Display selected blog info if available */}
              {selectedBlogId && blogsData?.blogs && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    <CheckCircle2 className="inline-block w-4 h-4 mr-1" />
                    <span className="font-semibold">Blog:</span> {blogsData.blogs.find(blog => blog.id === selectedBlogId)?.title || 'Selected Blog'}
                  </p>
                </div>
              )}
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
