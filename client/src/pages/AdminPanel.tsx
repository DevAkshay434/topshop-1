import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ShopifyImageViewer from '../components/ShopifyImageViewer';
import { useQuery } from '@tanstack/react-query';
import { SchedulingPermissionNotice } from '../components/SchedulingPermissionNotice';
import { ContentStyleSelector } from '../components/ContentStyleSelector';
import ProjectCreationDialog from '../components/ProjectCreationDialog';
import { ChooseMediaDialog, MediaImage } from '../components/ChooseMediaDialog';
import { RelatedProductsSelector } from '../components/RelatedProductsSelector';
import { RelatedCollectionsSelector } from '../components/RelatedCollectionsSelector';
import { ProductMultiSelect } from '../components/ProductMultiSelect';
import MediaSelectionStep from '../components/MediaSelectionStep';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart, 
  Calendar, 
  CalendarCheck,
  CheckCircle,
  Check,
  PlusCircle,
  CircleDot,
  CheckSquare,
  ChevronLeft,
  ImagePlus,
  ChevronRight,
  Clock, 
  Copy,
  Cpu,
  Download,
  ExternalLink, 
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  Folders,
  Gem,
  Heart,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Pencil,
  ShoppingBag,
  Leaf,
  Loader2,
  Package,
  PiggyBank,
  Plus, 
  RefreshCw,
  Save, 
  Search,
  Store,
  Upload,
  User,
  Users,
  Zap,
  ShoppingCart,
  Sparkles, 
  Trash, 
  Type,
  X, 
  XCircle,
  Bold,
  Italic,
  Underline,
  List,
  Edit3,
  Crown,
  Tag
} from 'lucide-react';

// Enhanced content preview component with editing capabilities
export default function AdminPanel() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(true); // Assuming connected for demo
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableContent, setEditableContent] = useState('');
  const [editableMetaDescription, setEditableMetaDescription] = useState('');
  const [isEditingContent, setIsEditingContent] = useState(false);

  // Form schema for content generation
  const contentFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    metaDescription: z.string().max(160, "Meta description must be under 160 characters"),
  });

  const form = useForm({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: '',
      content: '',
      metaDescription: '',
    }
  });

  // Update editable fields when generated content changes
  useEffect(() => {
    if (generatedContent) {
      setEditableTitle(generatedContent.title || '');
      setEditableContent(generatedContent.content || '');
      setEditableMetaDescription(generatedContent.metaDescription || '');
      setIsEditingContent(false);
    }
  }, [generatedContent]);

  // Word count utility functions
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharacterCount = (text: string) => {
    return text.length;
  };

  // Rich text formatting functions
  const formatText = (command: string) => {
    document.execCommand(command, false);
  };

  const insertList = () => {
    document.execCommand('insertUnorderedList', false);
  };

  // Mock generated content for demonstration
  const mockGeneratedContent = {
    title: "Best SEO Practices for E-commerce Stores in 2024",
    content: "<h2>Introduction</h2><p>Search engine optimization is crucial for e-commerce success...</p><h2>Key Strategies</h2><p>Here are the most effective SEO strategies for 2024...</p>",
    metaDescription: "Learn the best SEO practices for e-commerce stores in 2024. Boost your online visibility and drive more traffic to your Shopify store.",
    tags: ["SEO", "E-commerce", "Shopify", "Digital Marketing"],
    featuredImage: {
      id: "1",
      url: "https://via.placeholder.com/800x400",
      alt: "SEO for E-commerce",
      src: {
        original: "https://via.placeholder.com/800x400",
        large: "https://via.placeholder.com/800x400",
        medium: "https://via.placeholder.com/600x300",
        small: "https://via.placeholder.com/400x200",
        thumbnail: "https://via.placeholder.com/200x100"
      }
    }
  };

  const handleGenerateContent = () => {
    setIsGenerating(true);
    // Simulate content generation
    setTimeout(() => {
      setGeneratedContent(mockGeneratedContent);
      setIsGenerating(false);
      toast({
        title: "Content generated successfully",
        description: "Your SEO-optimized content is ready for review and editing."
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <Gem className="mr-3 h-8 w-8 text-primary" />
              TopshopSEO
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered SEO content generation for Shopify stores
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Content Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Content</CardTitle>
                <CardDescription>
                  Create SEO-optimized content for your products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your content title..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <Button 
                        type="button"
                        onClick={handleGenerateContent}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Content
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Enhanced Content Preview & Editor */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Content Preview & Editor</CardTitle>
                    <CardDescription>
                      Preview and edit your generated content
                    </CardDescription>
                  </div>
                  {generatedContent && (
                    <Button
                      variant={isEditingContent ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsEditingContent(!isEditingContent)}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      {isEditingContent ? "Save" : "Edit"}
                    </Button>
                  )}
                </div>
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
                  <div className="space-y-6">
                    {/* Editable Title Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">Title</h4>
                        <span className="text-xs text-muted-foreground">
                          {getCharacterCount(editableTitle)}/255 characters
                        </span>
                      </div>
                      {isEditingContent ? (
                        <Input
                          value={editableTitle}
                          onChange={(e) => setEditableTitle(e.target.value)}
                          maxLength={255}
                          className="text-xl font-bold"
                          placeholder="Enter title..."
                        />
                      ) : (
                        <h3 className="text-xl font-bold">{editableTitle}</h3>
                      )}
                    </div>

                    {/* Tags Section with Visual Indicators */}
                    {generatedContent.tags && generatedContent.tags.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-sm font-medium text-muted-foreground">Tags to be applied</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {generatedContent.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Featured Image with Badge */}
                    {generatedContent.featuredImage && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          <h4 className="text-sm font-medium text-muted-foreground">Featured Image</h4>
                          <Badge variant="secondary" className="text-xs">
                            Primary
                          </Badge>
                        </div>
                        <div className="relative">
                          <img 
                            src={generatedContent.featuredImage.src?.medium || generatedContent.featuredImage.url} 
                            alt={generatedContent.featuredImage.alt || generatedContent.title} 
                            className="w-full h-auto rounded-md shadow-md"
                          />
                          <Badge className="absolute top-2 left-2 bg-yellow-500 text-black">
                            <Crown className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Rich Text Content Editor */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">Content</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getWordCount(editableContent)} words</span>
                          <span>•</span>
                          <span>{getCharacterCount(editableContent)} characters</span>
                        </div>
                      </div>
                      
                      {isEditingContent ? (
                        <div className="space-y-2">
                          {/* Rich Text Formatting Toolbar */}
                          <div className="flex items-center gap-1 p-2 border rounded-md bg-gray-50">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatText('bold')}
                              className="h-8 w-8 p-0"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatText('italic')}
                              className="h-8 w-8 p-0"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatText('underline')}
                              className="h-8 w-8 p-0"
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                            <div className="w-px h-6 bg-gray-300 mx-1" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={insertList}
                              className="h-8 w-8 p-0"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Rich Text Editor */}
                          <div
                            contentEditable
                            suppressContentEditableWarning={true}
                            className="min-h-[400px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-blue max-w-none"
                            onInput={(e) => {
                              const target = e.target as HTMLDivElement;
                              setEditableContent(target.innerHTML);
                            }}
                            dangerouslySetInnerHTML={{ __html: editableContent }}
                          />
                        </div>
                      ) : (
                        <div className="rounded-md p-5 max-h-[60vh] overflow-y-auto bg-white shadow-sm border border-gray-100">
                          <div 
                            className="content-preview prose prose-blue max-w-none" 
                            dangerouslySetInnerHTML={{ __html: editableContent || generatedContent.content }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Editable Meta Description Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">Meta Description</h4>
                        <span className="text-xs text-muted-foreground">
                          {getCharacterCount(editableMetaDescription)}/160 characters
                        </span>
                      </div>
                      {isEditingContent ? (
                        <Textarea
                          value={editableMetaDescription}
                          onChange={(e) => setEditableMetaDescription(e.target.value)}
                          maxLength={160}
                          rows={3}
                          placeholder="Enter meta description..."
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md border">
                          {editableMetaDescription || generatedContent.metaDescription || "No meta description available"}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-muted-foreground">No content generated</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fill out the form and click "Generate Content" to see a preview
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Publishing Actions */}
          {generatedContent && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Publish Content</CardTitle>
                <CardDescription>
                  Choose how you want to publish your generated content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Publish Now
                  </Button>
                  
                  <Button variant="outline" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save as Draft
                  </Button>
                  
                  <Button variant="outline" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule for Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}