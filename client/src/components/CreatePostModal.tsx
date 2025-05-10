import React, { useState, useEffect, useRef, Fragment } from "react";
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
  categories?: string[]; // Categories for the post
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
  categories: z.array(z.string()).optional(),
  tags: z.string().optional(),
  // Status is preserved when editing existing content
  publicationType: z.enum(["publish", "draft"]).default("draft").optional(),
  // We still need these fields to handle existing values in the DB
  publishedDate: z.any().optional(),
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
  articleType = "blog",
  categories
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
  
  // Store reference for timezone info
  const currentDate = new Date();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      category: initialData?.category || "Fashion",
      categories: initialData?.categories ? 
        (typeof initialData.categories === 'string' 
          ? initialData.categories.split(',') 
          : initialData.categories) 
        : undefined,
      tags: initialData?.tags || "",
      // Default to draft for new content, preserve status for existing content
      publicationType: initialData?.status || "draft",
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
      
      // Set categories if provided from parent component
      if (categories && Array.isArray(categories)) {
        form.setValue('categories', categories);
      }
    } else if (initialData) {
      // Make sure form gets reset with initial data when editing an existing post
      form.reset({
        title: initialData.title || "",
        content: initialData.content || "",
        category: initialData.category || "Fashion",
        categories: initialData.categories ? 
          (typeof initialData.categories === 'string' 
            ? initialData.categories.split(',') 
            : initialData.categories) 
          : undefined,
        tags: initialData.tags || "",
        // Default to draft for new content, preserve status for existing content
        publicationType: initialData.status || "draft",
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
      
      // Set categories if provided from parent component (override initialData)
      if (categories && Array.isArray(categories)) {
        form.setValue('categories', categories);
      }
    } else {
      // For new posts without generated content, still use the selected blog ID and article type
      if (selectedBlogId) {
        form.setValue('blogId', selectedBlogId);
      }
      
      form.setValue('articleType', 
        (articleType || "blog") as "blog" | "page"
      );
      
      // Set categories if provided from parent component
      if (categories && Array.isArray(categories)) {
        form.setValue('categories', categories);
      }
    }
  }, [generatedContent, initialData, form, storeTimezone, selectedBlogId, articleType, categories]);
  
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
        categories: Array.isArray(values.categories) ? values.categories.join(',') : values.categories, // Convert categories array to string
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
      // Log the selected publication type for debugging
      console.log(`Using publication type: ${values.publicationType}`);
      
      // IMPORTANT: Add publicationType to postData for server-side processing
      postData.publicationType = values.publicationType;
      
      // For existing content, preserve its current publishing status
      if (initialData?.id) {
        console.log("Updating existing content, preserving current status:", initialData.status);
        
        // Keep the existing status
        postData.status = initialData.status || "published";
        postData.postStatus = initialData.status || "published";
        
        // Keep any existing publishing dates
        if (initialData.publishedDate) {
          postData.publishedDate = initialData.publishedDate;
        }
        
        // Keep scheduling information if it's already scheduled
        if (initialData.status === "scheduled") {
          postData.scheduledDate = initialData.scheduledDate;
          postData.scheduledPublishDate = initialData.scheduledPublishDate;
          postData.scheduledPublishTime = initialData.scheduledPublishTime;
          // Keep the original scheduled publication details
        }
        
        // For published content, ensure it stays published
        if (initialData.status === "published") {
          postData.status = "published";
          postData.postStatus = "publish";
          
          if (!initialData.publishedDate) {
            // If somehow there's no published date, set it to current
            postData.publishedDate = new Date();
          }
        }
      } else {
        // For new content, always save as draft
        console.log("Creating new content as draft");
        postData.status = "draft";
        postData.postStatus = "draft";
        postData.publishedDate = null;
        postData.scheduledDate = null;
        postData.scheduledPublishDate = null;
        postData.scheduledPublishTime = null;
      }
      
      let response;
      
      if (initialData?.id) {
        // Update existing post
        response = await apiRequest("PUT", `/api/posts/${initialData.id}`, postData);
        
        toast({
          title: "Content Updated",
          description: "Changes have been saved and published immediately",
        });
      } else {
        // Create new post
        response = await apiRequest("POST", "/api/posts", postData);
        
        toast({
          title: "Draft Created",
          description: "A new draft has been created successfully",
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Content
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
                      
                      {/* Display selected products if any */}
                      {selectedProducts && selectedProducts.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {selectedProducts.map((product) => (
                            <Badge key={product.id} variant="outline" className="flex items-center gap-1">
                              <ShoppingBag className="h-3 w-3" />
                              {product.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <FormControl>
                        <Textarea
                          placeholder="Enter your blog content here..."
                          className="min-h-[400px] font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const content = textarea.value;
                        const newContent = content.substring(0, start) + '**' + content.substring(start, end) + '**' + content.substring(end);
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const content = textarea.value;
                        const newContent = content.substring(0, start) + '*' + content.substring(start, end) + '*' + content.substring(end);
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Insert a heading
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const content = textarea.value;
                        const selectedText = content.substring(start, end);
                        
                        // Check if at the start of line or insert newline if needed
                        const beforeText = content.substring(0, start);
                        const needsNewLine = beforeText.length > 0 && !beforeText.endsWith('\n\n');
                        
                        const newContent = content.substring(0, start) + 
                          (needsNewLine ? '\n\n' : '') + 
                          '## ' + selectedText + 
                          content.substring(end);
                        
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    H2
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Insert an unordered list
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const content = textarea.value;
                        
                        // Check if at the start of line or insert newline if needed
                        const beforeText = content.substring(0, start);
                        const needsNewLine = beforeText.length > 0 && !beforeText.endsWith('\n\n');
                        
                        const newContent = content.substring(0, start) + 
                          (needsNewLine ? '\n\n' : '') + 
                          '- List item 1\n- List item 2\n- List item 3' + 
                          content.substring(start);
                        
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Insert an ordered list
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const content = textarea.value;
                        
                        // Check if at the start of line or insert newline if needed
                        const beforeText = content.substring(0, start);
                        const needsNewLine = beforeText.length > 0 && !beforeText.endsWith('\n\n');
                        
                        const newContent = content.substring(0, start) + 
                          (needsNewLine ? '\n\n' : '') + 
                          '1. List item 1\n2. List item 2\n3. List item 3' + 
                          content.substring(start);
                        
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Insert a link
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const content = textarea.value;
                        const selectedText = content.substring(start, end);
                        
                        const linkText = selectedText || 'link text';
                        const newContent = content.substring(0, start) + 
                          '[' + linkText + '](https://example.com)' + 
                          content.substring(end);
                        
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Insert an image placeholder
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const content = textarea.value;
                        
                        // Check if at the start of line or insert newline if needed
                        const beforeText = content.substring(0, start);
                        const needsNewLine = beforeText.length > 0 && !beforeText.endsWith('\n\n');
                        
                        const newContent = content.substring(0, start) + 
                          (needsNewLine ? '\n\n' : '') + 
                          '![Image description](https://example.com/image.jpg)' + 
                          content.substring(start);
                        
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Insert a YouTube embed placeholder
                      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const content = textarea.value;
                        
                        // Check if at the start of line or insert newline if needed
                        const beforeText = content.substring(0, start);
                        const needsNewLine = beforeText.length > 0 && !beforeText.endsWith('\n\n');
                        
                        const newContent = content.substring(0, start) + 
                          (needsNewLine ? '\n\n' : '') + 
                          '[YOUTUBE_EMBED_PLACEHOLDER]' + 
                          content.substring(start);
                        
                        form.setValue('content', newContent);
                      }
                    }}
                  >
                    YouTube
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormDescription>
                          Add a YouTube video to be embedded in your blog post
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Blog selection (for multi-blog stores) */}
                  <FormField
                    control={form.control}
                    name="blogId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blog</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            console.log("Blog changed to:", value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a blog" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {blogsData?.blogs && blogsData.blogs.map((blog) => (
                              <SelectItem key={blog.id} value={blog.id}>
                                {blog.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose which blog this post will be published to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter tags separated by commas"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Tags help customers find your content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Removed publication controls as changes are now saved directly */}
              </TabsContent>
              
              <TabsContent value="preview">
                <div className="border border-border rounded-md p-6 min-h-[400px] prose prose-blue max-w-none">
                  <h1>{form.watch("title") || "Post Title"}</h1>
                  
                  {/* Content Preview Component */}
                  {(() => {
                    const content = form.watch("content") || "";
                    const youtubeUrl = form.watch("youtubeUrl");
                    let youtubeVideoId = null;
                    
                    if (youtubeUrl) {
                      const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                      if (match) youtubeVideoId = match[1];
                    }
                    
                    const YouTubeEmbed = () => (
                      <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginTop: '20px', marginBottom: '20px' }}>
                        <iframe 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                          src={`https://www.youtube.com/embed/${youtubeVideoId}`} 
                          title="YouTube video" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                      </div>
                    );
                    
                    // Check for the presence of images and YouTube placeholder
                    const hasEmbeddedImages = content.includes('<img') || content.includes('![');
                    const hasImageWithSrc = content.includes('src=') || content.includes('![');
                    const hasYoutubePlaceholder = content.includes('[YOUTUBE_EMBED_PLACEHOLDER]');
                    const hasImageTags = content.includes('<img');
                    
                    // For content with properly embedded images (with src attributes), render directly
                    if (hasEmbeddedImages && hasImageWithSrc) {
                      // Apply formatting to content with embedded images and enhance image styling
                      let processedContent = content
                        .replace(/\n/g, '<br />')
                        .replace(/<\/strong>([^\n<])/g, '</strong><br />$1')
                        .replace(/<\/h2>([^\n<])/g, '</h2><br />$1')
                        .replace(/<\/h3>([^\n<])/g, '</h3><br />$1');
                        
                      // Fix relative image URLs to absolute URLs
                      processedContent = processedContent.replace(
                        /<img([^>]*?)src=["'](?!http)(\/[^"']+)["']([^>]*?)>/gi,
                        '<img$1src="https://rajeshshah.myshopify.com$2"$3>'
                      );
                      
                      // Fix protocol-relative URLs (starting with //)
                      processedContent = processedContent.replace(
                        /<img([^>]*?)src=["'](\/\/[^"']+)["']([^>]*?)>/gi,
                        '<img$1src="https:$2"$3>'
                      );
                      
                      // Enhance all images with improved styling
                      processedContent = processedContent.replace(
                        /<img([^>]*?)>/gi, 
                        '<img$1 style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">'
                      );
                      
                      // Handle YouTube embed if present
                      if (youtubeVideoId) {
                        if (processedContent.includes('[YOUTUBE_EMBED_PLACEHOLDER]')) {
                          // Replace placeholder with YouTube embed
                          const parts = processedContent.split('[YOUTUBE_EMBED_PLACEHOLDER]');
                          return (
                            <>
                              <div dangerouslySetInnerHTML={{ __html: parts[0] || '' }} />
                              <YouTubeEmbed />
                              <div dangerouslySetInnerHTML={{ __html: parts[1] || '' }} />
                            </>
                          );
                        }
                        
                        // Add YouTube embed at the end if no placeholder exists
                        return (
                          <>
                            <div dangerouslySetInnerHTML={{ __html: processedContent }} />
                            <YouTubeEmbed />
                          </>
                        );
                      }
                      
                      return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
                    }
                    
                    // For content with image tags without src (placeholders), handle them separately
                    if (hasEmbeddedImages && !hasImageWithSrc) {
                      // First, clean up any image tags without proper src attributes
                      const cleanedContent = content.replace(/<img[^>]*?(?!src=)[^>]*?>/gi, '');
                      
                      // Then process the cleaned content
                      let processedContent = cleanedContent
                        .replace(/\n/g, '<br />')
                        .replace(/<\/strong>([^\n<])/g, '</strong><br />$1')
                        .replace(/<\/h2>([^\n<])/g, '</h2><br />$1')
                        .replace(/<\/h3>([^\n<])/g, '</h3><br />$1')
                        // Make sure all image URLs are absolute and not relative
                        .replace(
                          /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
                          '<img$1src="https://$2"$3>'
                        );
                      
                      // We'll use our secondary images logic below instead of these placeholder images
                      return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
                    }
                    
                    // For simple text content without embedded images
                    if (!hasEmbeddedImages) {
                      // Convert markdown-like syntax to HTML
                      let processedContent = content
                        .replace(/\n/g, '<br />')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>')
                        .replace(/### (.*?)(?:\n|$)/g, '<h3>$1</h3>')
                        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; max-height: 400px; object-fit: contain; margin: 1rem auto; display: block;">')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
                      
                      // Handle YouTube placeholder separately
                      if (youtubeVideoId && hasYoutubePlaceholder) {
                        const parts = processedContent.split('[YOUTUBE_EMBED_PLACEHOLDER]');
                        
                        return (
                          <>
                            {parts[0] && <div dangerouslySetInnerHTML={{ __html: parts[0] }} />}
                            <YouTubeEmbed />
                            {parts[1] && <div dangerouslySetInnerHTML={{ __html: parts[1] }} />}
                          </>
                        );
                      }
                      
                      // Format paragraphs with proper spacing
                      const paragraphs = processedContent.split(/<br \/>(?:<br \/>)+/);
                      if (paragraphs.length > 1) {
                        return paragraphs.map((para, i) => {
                          const formattedPara = para.replace(/<br \/>/g, ' ');
                          return <div key={i} dangerouslySetInnerHTML={{ __html: formattedPara }} />;
                        });
                      }
                      
                      // Process content that might have secondary images from AI generation
                      const secondaryImages = generatedContent?.secondaryImages || [];
                      
                      if (secondaryImages.length > 0) {
                        // If content has secondaryImages but no embedded images in content, 
                        // divide content into paragraphs and insert images in between
                        const paragraphs = processedContent.split(/<br \/>(?:<br \/>)+/);
                        const result: React.ReactNode[] = [];
                        
                        paragraphs.forEach((para, i) => {
                          // Add paragraph text
                          const formattedPara = para.replace(/<br \/>/g, ' ');
                          if (formattedPara.trim()) {
                            result.push(<div key={`p-${i}-part1`} dangerouslySetInnerHTML={{ __html: formattedPara }} />);
                          }
                          
                          // After some paragraphs, add an image if available
                          if (i % 3 === 1 && secondaryImages[Math.floor(i / 3)]) {
                            const imageIndex = Math.floor(i / 3);
                            if (imageIndex < secondaryImages.length) {
                              const image = secondaryImages[imageIndex];
                              result.push(
                                <div key={`img-${i}`} style={{ margin: '2rem 0' }}>
                                  <img 
                                    src={image.src?.medium || image.url} 
                                    alt={image.alt || `Image ${imageIndex + 1}`}
                                    style={{ maxWidth: '100%', maxHeight: '400px', margin: '0 auto', display: 'block' }}
                                  />
                                </div>
                              );
                            }
                          }
                          
                          // Add YouTube embed if placeholder is in this paragraph
                          if (youtubeVideoId && para.includes('[YOUTUBE_EMBED_PLACEHOLDER]')) {
                            result.push(<YouTubeEmbed />);
                          }
                        });
                        
                        return <div>{result}</div>;
                      }
                      
                      // If no special handling needed, just return the formatted content
                      return <div dangerouslySetInnerHTML={{ __html: processedContent }} />;
                    }
                    
                    // Default fallback
                    return <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />;
                  })()}
                  
                  {/* Display selected product information if available */}
                  {selectedProducts && selectedProducts.length > 0 && (
                    <div className="mt-6 border-t border-border pt-4">
                      <h3 className="text-lg font-medium mb-3">Featured Products</h3>
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        {selectedProducts.map((product) => (
                          <div 
                            key={product.id} 
                            className="flex items-center p-3 border border-border rounded-md gap-3"
                          >
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.title} 
                                className="w-16 h-16 object-contain"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted flex items-center justify-center">
                                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{product.title}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {product.handle}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {form.watch("tags") && typeof form.watch("tags") === 'string' && form.watch("tags")?.trim() && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags:</h3>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("tags")?.split(",").filter(tag => tag.trim()).map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Scheduling information removed as per requirement - content is saved directly */}
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6 flex items-center justify-between">
              <div>
                {initialData?.status === "published" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Published
                  </Badge>
                )}
                {initialData?.status === "scheduled" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Scheduled
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
