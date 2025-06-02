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
import { SchedulingPermissionNotice } from "./SchedulingPermissionNotice";
import { 
  Dialog,
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
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
  CheckCircle2,
  Copy,
  ExternalLink,
  Calendar as CalendarIcon,
  Clock,
  Info as InfoIcon,
  Check as CheckIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  mediaImages?: Array<{
    id: string;
    url: string;
    alt?: string;
    type?: 'image' | 'youtube';
    videoId?: string;
  }>; // Selected media including YouTube videos
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
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  // Status is preserved when editing existing content
  publicationType: z.enum(["publish", "draft", "schedule"]).default("draft").optional(),
  // Fields for scheduling
  scheduledPublishDate: z.string().optional(),
  scheduledPublishTime: z.string().optional(),
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
  categories,
  mediaImages = []
}: CreatePostModalProps) {
  const { toast } = useToast();
  const { storeInfo } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formattedTags = useRef<string>("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  
  // State for scheduling modal
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  
  // Track published content information
  const [publishedContentInfo, setPublishedContentInfo] = useState<{
    shopifyId?: string | null;
    shopifyHandle?: string | null;
    shopifyUrl?: string;
    contentType: 'blog' | 'page';
    published: boolean;
    title?: string;
  } | null>(null);
  
  // Check if the store has the scheduling permission
  const { data: permissionsData } = useQuery<{ 
    success: boolean; 
    hasPermission: boolean;
    store: { name: string; }
  }>({
    queryKey: ['/api/shopify/check-permissions'],
    enabled: open,
  });
  
  // Query for blogs
  const { data: blogsData } = useQuery<{ success: boolean; blogs: Array<{ id: string; title: string; handle: string; }> }>({
    queryKey: ['/api/admin/blogs'],
    enabled: true,
  });
  
  // Get the store timezone or fall back to UTC
  const storeTimezone = storeInfo?.iana_timezone || 'UTC';
  
  // Store reference for timezone info
  const currentDate = new Date();
  
  // Reference to content preview with images
  const [isPreviewMode, setIsPreviewMode] = useState(!!generatedContent);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(
    generatedContent?.featuredImage?.url || generatedContent?.featuredImage?.src?.medium || null
  );
  
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
      metaTitle: initialData?.metaTitle || "",
      metaDescription: initialData?.metaDescription || "",
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
      // Process YouTube embeds
      let finalContent = values.content;
      
      // Process YouTube videos from the image selection interface
      // These are embedded as PexelsImage objects with type='youtube'
      const youtubeVideos: Array<{videoId?: string, type?: 'youtube' | 'image'}> = [];
      
      // Check if media images are available and find YouTube videos
      if (mediaImages && Array.isArray(mediaImages)) {
        const youtubeMediaVideos = mediaImages.filter((img: {type?: 'youtube' | 'image', videoId?: string}) => 
          img.type === 'youtube' && img.videoId
        );
        youtubeVideos.push(...youtubeMediaVideos);
      }
      
      // Also check if there's a single YouTube URL from the form field
      if (values.youtubeUrl) {
        const videoId = values.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
        
        if (videoId) {
          youtubeVideos.push({
            videoId,
            type: 'youtube'
          });
        }
      }
      
      // If we have YouTube videos, embed them into the content
      if (youtubeVideos.length > 0) {
        // For multiple videos, we'll distribute them throughout the content
        if (youtubeVideos.length > 1) {
          // Split content into paragraphs for proper distribution
          const paragraphs = finalContent.split('</p>');
          
          youtubeVideos.forEach((video, index) => {
            if (!video.videoId) return;
            
            // Create responsive embed code
            const videoEmbed = `
<div class="video-container" style="position: relative; padding-bottom: 56.25%; margin: 30px 0;">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/${video.videoId}" title="YouTube video" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`;
            
            // Distribute videos throughout content
            if (paragraphs.length > 3) {
              // For first video, place after intro (25% through)
              // For second video, place in middle (50% through)
              // For additional videos, distribute in latter half
              const position = Math.min(
                Math.floor(paragraphs.length * (0.25 + (index * 0.25))),
                paragraphs.length - 1
              );
              paragraphs[position] = paragraphs[position] + videoEmbed;
            } else if (paragraphs.length > 0) {
              // For shorter content, place after first paragraph
              paragraphs[0] = paragraphs[0] + videoEmbed;
            } else {
              // If no paragraphs, append at end
              finalContent += videoEmbed;
            }
          });
          
          // Recombine content if we modified paragraphs
          if (paragraphs.length > 0) {
            finalContent = paragraphs.join('</p>');
          }
        } else {
          // If just one video, add it at the end as before
          const videoId = youtubeVideos[0].videoId;
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
      
      // Check if the store has scheduling permissions - if not, prevent scheduling
      const hasSchedulingPermission = permissionsData?.hasPermission || false;
      
      // If user is trying to schedule but doesn't have permission, convert to immediate publish
      // Note: The scheduler logic is handled on the backend, this flag is for the UI toast
      const formValues = form.getValues();
      const isAttemptingToSchedule = (initialData?.status === 'scheduled' || 
        formValues.publicationType === 'schedule');
      if (isAttemptingToSchedule && !hasSchedulingPermission) {
        console.log("Store lacks scheduling permission - converting scheduled post to draft");
        postData.publicationType = 'draft';
        
        // Show toast notification about permission issue
        toast({
          title: "Permission Required",
          description: "Your store doesn't have scheduling permission. Post saved as draft instead.",
          variant: "destructive",
        });
      }
      
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
        
        // Keep scheduling information if it's already scheduled and has permission
        if (initialData.status === "scheduled" && hasSchedulingPermission) {
          postData.scheduledDate = initialData.scheduledDate;
          postData.scheduledPublishDate = initialData.scheduledPublishDate;
          postData.scheduledPublishTime = initialData.scheduledPublishTime;
          // Keep the original scheduled publication details
        } else if (initialData.status === "scheduled" && !hasSchedulingPermission) {
          // If scheduled but now lacks permission, convert to draft
          postData.status = "draft";
          postData.postStatus = "draft";
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
        
        // Get the response data to check for Shopify information
        if (response?.success && response?.post) {
          const createdPost = response.post;
          
          // Check if we have Shopify information to show links
          if (createdPost.shopifyId || createdPost.handle) {
            const shopUrl = storeInfo?.myshopifyDomain || storeInfo?.domain;
            const isPage = (articleType === 'page' || values.articleType === 'page');
            
            // Construct the Shopify URL for viewing the content
            let contentUrl = '';
            if (shopUrl) {
              if (isPage) {
                // For pages, URL is shop.com/pages/handle
                contentUrl = `https://${shopUrl}/pages/${createdPost.handle || ''}`;
              } else {
                // For blog posts, URL is shop.com/blogs/blog-handle/post-handle
                // Get the blog handle from the selected blog
                const blogHandle = blogsData?.blogs?.find(
                  blog => blog.id === (selectedBlogId || values.blogId)
                )?.handle || 'news';
                
                contentUrl = `https://${shopUrl}/blogs/${blogHandle}/${createdPost.handle || ''}`;
              }
            }
            
            // Store this info for displaying view buttons
            setPublishedContentInfo({
              shopifyId: createdPost.shopifyId,
              shopifyHandle: createdPost.handle,
              shopifyUrl: contentUrl,
              contentType: isPage ? 'page' : 'blog',
              published: createdPost.status === 'published' || 
                values.publicationType === 'publish' ||
                createdPost.status === 'scheduled' || 
                values.publicationType === 'schedule'
            });
            
            // Only show simple success toast since we'll display buttons
            toast({
              title: values.publicationType === 'publish' ? "Content Published" : 
                    values.publicationType === 'schedule' ? "Content Scheduled" : 
                    "Draft Created",
              description: "Content has been saved to Shopify successfully",
            });
            
            // Don't close the modal yet - we want to show the buttons
            return;
          }
        }
        
        // Default toast if no Shopify info available
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
      
      // Only close if we don't have published content info to display
      if (!publishedContentInfo) {
        onOpenChange(false);
      }
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
    <div>
      {/* Main Content Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {publishedContentInfo ? "Content Published to Shopify" : "Edit Content"}
            </DialogTitle>
          </DialogHeader>
        
        {/* Show Shopify content links if available */}
        {publishedContentInfo && (
          <div className="my-6 bg-gray-50 border border-gray-200 rounded-md p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500 h-5 w-5" />
                <span className="font-medium">
                  Your content has been {publishedContentInfo.published ? "published" : "saved as a draft"} to Shopify
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Content type:</span>
                <Badge variant="outline">
                  {publishedContentInfo.contentType === 'page' ? 'Page' : 'Blog Post'}
                </Badge>
              </div>
              
              {publishedContentInfo.shopifyUrl && (
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">Content URL:</div>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={publishedContentInfo.shopifyUrl} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(publishedContentInfo.shopifyUrl || '');
                        toast({
                          title: "URL Copied",
                          description: "Content URL copied to clipboard"
                        });
                      }}
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {publishedContentInfo.shopifyUrl && (
                  <Button
                    onClick={() => {
                      window.open(publishedContentInfo.shopifyUrl, '_blank');
                    }}
                  >
                    View in Shopify
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Show scheduling permission notice if needed */}
        {permissionsData?.success && !permissionsData.hasPermission && !publishedContentInfo && (
          <SchedulingPermissionNotice 
            storeName={permissionsData.store?.name || storeInfo?.name || 'your store'} 
          />
        )}
        
        {/* Enhanced preview mode for newly generated content */}
        {generatedContent && !initialData?.id && isPreviewMode ? (
          <div className="content-preview mb-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Content Preview</h3>
              <Button 
                variant="outline" 
                onClick={() => setIsPreviewMode(false)}
              >
                Edit Content
              </Button>
            </div>
            
            {/* Featured image preview - more robust handling of different image formats */}
            {(generatedContent.featuredImage?.url || 
              generatedContent.featuredImage?.src?.medium || 
              generatedContent.featuredImage?.src?.original || 
              featuredImageUrl) && (
              <div className="mb-6">
                <h4 className="text-sm text-gray-500 mb-2">Featured Image</h4>
                <div className="relative aspect-video overflow-hidden rounded-md border border-gray-200">
                  <img 
                    src={generatedContent.featuredImage?.url || 
                         generatedContent.featuredImage?.src?.medium || 
                         generatedContent.featuredImage?.src?.original || 
                         featuredImageUrl} 
                    alt="Featured" 
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      // If image fails to load, check if we have other sources
                      const target = e.target as HTMLImageElement;
                      if (target.src !== generatedContent.featuredImage?.src?.large && 
                          generatedContent.featuredImage?.src?.large) {
                        target.src = generatedContent.featuredImage.src.large;
                      } else if (target.src !== generatedContent.featuredImage?.src?.small && 
                                generatedContent.featuredImage?.src?.small) {
                        target.src = generatedContent.featuredImage.src.small;
                      }
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Title preview */}
            <div className="mb-6">
              <h4 className="text-sm text-gray-500 mb-2">Title</h4>
              <h2 className="text-2xl font-bold">{generatedContent.title}</h2>
            </div>
            
            {/* Tags preview */}
            {generatedContent.tags && generatedContent.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm text-gray-500 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedContent.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Content preview */}
            <div className="mb-6">
              <h4 className="text-sm text-gray-500 mb-2">Content</h4>
              <div 
                className="prose max-w-none p-4 bg-gray-50 rounded-md border border-gray-200 overflow-auto max-h-[500px]" 
                dangerouslySetInnerHTML={{ __html: generatedContent.content }}
              />
            </div>
            
            {/* Product information if any */}
            {selectedProducts && selectedProducts.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm text-gray-500 mb-2">Associated Products</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map(product => (
                    <Badge key={product.id} variant="outline" className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      {product.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Publishing decision buttons */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h4 className="text-sm font-medium mb-4">Publish Options</h4>
              <div className="flex flex-wrap gap-3">
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    // Set up form values with explicit DRAFT status flags
                    form.setValue('title', generatedContent.title);
                    form.setValue('content', generatedContent.content);
                    form.setValue('tags', Array.isArray(generatedContent.tags) 
                      ? generatedContent.tags.join(", ") 
                      : "");
                      
                    // Set multiple status flags to ensure backend saves as draft
                    form.setValue('publicationType', 'draft');
                    form.setValue('status', 'draft');
                    
                    // Clear any scheduling data
                    form.setValue('scheduledPublishDate', '');
                    form.setValue('scheduledPublishTime', '');
                    
                    // Submit the form
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  Save as Draft
                </Button>
                
                {permissionsData?.hasPermission && (
                  <Button 
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      // Fill form values with content
                      form.setValue('title', generatedContent.title);
                      form.setValue('content', generatedContent.content);
                      form.setValue('tags', Array.isArray(generatedContent.tags) 
                        ? generatedContent.tags.join(", ") 
                        : "");
                      
                      // Default to tomorrow at 9:30 AM
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 30, 0, 0);
                      
                      // Format date as YYYY-MM-DD
                      const formattedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                      // Format time as HH:MM (default to 9:30)
                      const formattedTime = `09:30`;
                      
                      // Show scheduling dialog
                      setSchedulingModalOpen(true);
                      
                      // Pre-populate the scheduling form
                      form.setValue('scheduledPublishDate', formattedDate);
                      form.setValue('scheduledPublishTime', formattedTime);
                    }}
                  >
                    Schedule for Later
                  </Button>
                )}
                

                
                <Button 
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    // Fill form values with explicit publish flags
                    form.setValue('title', generatedContent.title);
                    form.setValue('content', generatedContent.content);
                    form.setValue('tags', Array.isArray(generatedContent.tags) 
                      ? generatedContent.tags.join(", ") 
                      : "");
                      
                    // Set multiple publish status flags to ensure backend handles it properly
                    form.setValue('publicationType', 'publish');
                    form.setValue('status', 'published');
                    
                    // Clear any scheduling data
                    form.setValue('scheduledPublishDate', '');
                    form.setValue('scheduledPublishTime', '');
                    
                    // Set published date to now
                    form.setValue('publishedDate', new Date().toISOString());
                    
                    // Make sure we have the featured image
                    if (generatedContent.featuredImage) {
                      if (generatedContent.featuredImage.url) {
                        form.setValue('featuredImage', generatedContent.featuredImage.url);
                      } else if (generatedContent.featuredImage.src?.original) {
                        form.setValue('featuredImage', generatedContent.featuredImage.src.original);
                      } else if (generatedContent.featuredImage.src?.medium) {
                        form.setValue('featuredImage', generatedContent.featuredImage.src.medium);
                      }
                    }
                    
                    // Submit the form
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  Publish Now
                </Button>
              </div>
            </div>
          </div>
        ) : (
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

              {/* SEO Fields */}
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title (SEO)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SEO title for search engines (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optimized title for search engines. If empty, the post title will be used.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description (SEO)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description for search engine results (optional)"
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Summary that appears in search engine results (150-160 characters recommended).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
              
              {/* Enhanced publishing options */}
              <div className="flex gap-2">
                {generatedContent && !initialData?.id ? (
                  <>
                    {/* For newly generated content, show comprehensive publishing options */}
                    <Button 
                      type="button" 
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => {
                        form.setValue('publicationType', 'draft');
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      Save as Draft
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => {
                        form.setValue('publicationType', 'schedule');
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      Schedule
                    </Button>
                    
                    <Button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        form.setValue('publicationType', 'publish');
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      Publish Now
                    </Button>
                  </>
                ) : (
                  // For existing content, use a single save button
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Scheduling Modal */}
    <Dialog open={schedulingModalOpen} onOpenChange={setSchedulingModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule for later</DialogTitle>
          <DialogDescription>
            Set a future date and time when this post should be published automatically on your Shopify store
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5 text-blue-500" />
            <span className="font-medium">Publication Date</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Input
                id="scheduledDate"
                type="date"
                className="border-input bg-background focus:ring-1 focus:ring-blue-500"
                value={form.watch('scheduledPublishDate')}
                onChange={(e) => form.setValue('scheduledPublishDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Set min date to today
              />
            </div>
            
            <div className="space-y-1 flex items-end">
              <div className="relative w-full">
                <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <Input
                  id="scheduledTime"
                  type="time"
                  className="pl-8 border-input bg-background focus:ring-1 focus:ring-blue-500"
                  value={form.watch('scheduledPublishTime') || "09:30"}
                  onChange={(e) => form.setValue('scheduledPublishTime', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            <span className="flex items-center">
              <InfoIcon className="mr-1 h-4 w-4" />
              Scheduled content will be published automatically at the specified time
            </span>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline"
            onClick={() => setSchedulingModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              // Set multiple schedule flags to ensure backend schedules properly
              form.setValue('publicationType', 'schedule');
              form.setValue('status', 'scheduled');
              
              // Submit the form
              form.handleSubmit(onSubmit)();
              
              // Close the dialog
              setSchedulingModalOpen(false);
            }}
          >
            <CheckIcon className="mr-2 h-4 w-4" />
            Confirm Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
