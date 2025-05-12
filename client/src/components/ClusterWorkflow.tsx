import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useStore } from '@/contexts/StoreContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Article {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'scheduled';
  publicationType?: 'draft' | 'published' | 'scheduled';
  scheduledDate?: string;
  scheduledTime?: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
}

interface Keyword {
  keyword: string;
  score: number;
}

interface ClusterWorkflowProps {
  articles: Article[];
  isLoading?: boolean;
  onSave?: (articles: Article[]) => Promise<void>;
  canSchedule?: boolean;
  blogId?: string;
  products?: Product[];
}

export default function ClusterWorkflow({
  articles = [],
  isLoading = false,
  onSave,
  canSchedule = true,
  blogId
}: ClusterWorkflowProps) {
  const { toast } = useToast();
  const { storeInfo } = useStore();
  const [editedArticles, setEditedArticles] = useState<Article[]>(articles);
  const [selectedArticles, setSelectedArticles] = useState<Record<string, boolean>>({});
  const [bulkAction, setBulkAction] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );
  const [scheduleTime, setScheduleTime] = useState<string>("09:30");
  const [isSaving, setIsSaving] = useState(false);
  
  // Update local state when articles prop changes
  React.useEffect(() => {
    setEditedArticles(articles);
  }, [articles]);
  
  // Toggle article selection for bulk actions
  const toggleSelection = (id: string) => {
    setSelectedArticles({
      ...selectedArticles,
      [id]: !selectedArticles[id]
    });
  };
  
  // Select or deselect all articles
  const toggleSelectAll = (select: boolean) => {
    const newSelection: Record<string, boolean> = {};
    editedArticles.forEach(article => {
      newSelection[article.id] = select;
    });
    setSelectedArticles(newSelection);
  };
  
  // Count selected articles
  const selectedCount = Object.values(selectedArticles).filter(Boolean).length;
  
  // Update an article's content
  const updateArticleContent = (id: string, content: string) => {
    setEditedArticles(prev => 
      prev.map(article => 
        article.id === id ? { ...article, content } : article
      )
    );
  };
  
  // Update an article's title
  const updateArticleTitle = (id: string, title: string) => {
    setEditedArticles(prev => 
      prev.map(article => 
        article.id === id ? { ...article, title } : article
      )
    );
  };
  
  // Apply bulk action to selected articles
  const applyBulkAction = () => {
    const updatedArticles = editedArticles.map(article => {
      if (selectedArticles[article.id]) {
        return {
          ...article,
          status: bulkAction,
          ...(bulkAction === 'scheduled' ? {
            scheduledDate: scheduleDate ? format(scheduleDate, 'yyyy-MM-dd') : undefined,
            scheduledTime: scheduleTime
          } : {})
        };
      }
      return article;
    });
    
    setEditedArticles(updatedArticles);
    
    toast({
      title: "Bulk Action Applied",
      description: `Applied ${bulkAction} to ${selectedCount} articles`,
    });
  };
  
  // Save all articles
  const saveAllArticles = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    
    try {
      await onSave(editedArticles);
      
      toast({
        title: "Success",
        description: `Saved ${editedArticles.length} articles`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/published"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save articles",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save a single article
  const saveArticle = async (article: Article) => {
    if (!blogId) {
      toast({
        title: "Error",
        description: "No blog selected for publication",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare post data
      const postData: any = {
        title: article.title,
        content: article.content,
        blogId: blogId,
        status: article.status || 'draft',
        publicationType: article.status || 'draft',
        tags: Array.isArray(article.tags) ? article.tags.join(',') : '',
      };
      
      // Add scheduling info if needed
      if (article.status === 'scheduled') {
        postData.scheduledPublishDate = article.scheduledDate;
        postData.scheduledPublishTime = article.scheduledTime || "09:30";
        postData.scheduleDate = article.scheduledDate;
        postData.scheduleTime = article.scheduledTime || "09:30";
      }
      
      // Send request
      await apiRequest("POST", "/api/posts", postData);
      
      toast({
        title: "Success",
        description: `Article "${article.title}" saved as ${article.status}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to save article",
        variant: "destructive",
      });
    }
  };
  
  // Determine if an article is selected
  const isSelected = (id: string) => !!selectedArticles[id];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Cluster Management</CardTitle>
        <CardDescription>
          Review and edit your generated content cluster before publishing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : editedArticles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No articles in this cluster yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bulk actions */}
            <div className="bg-muted/40 rounded-md p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all"
                    checked={selectedCount === editedArticles.length && selectedCount > 0}
                    onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                  />
                  <Label htmlFor="select-all">
                    {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
                  </Label>
                </div>
                
                {selectedCount > 0 && (
                  <div className="flex items-center space-x-4">
                    <RadioGroup 
                      value={bulkAction} 
                      onValueChange={(value) => setBulkAction(value as 'draft' | 'published' | 'scheduled')}
                      className="flex items-center space-x-4"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="draft" id="draft" />
                        <Label htmlFor="draft">Draft</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="published" id="published" />
                        <Label htmlFor="published">Publish</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="scheduled" id="scheduled" disabled={!canSchedule} />
                        <Label htmlFor="scheduled">Schedule</Label>
                      </div>
                    </RadioGroup>
                    
                    {bulkAction === 'scheduled' && (
                      <div className="flex items-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{scheduleDate ? format(scheduleDate, 'yyyy-MM-dd') : 'Pick date'}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={scheduleDate}
                              onSelect={setScheduleDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-24"
                        />
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      onClick={applyBulkAction}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Articles accordion */}
            <Accordion type="multiple" className="space-y-4">
              {editedArticles.map((article) => (
                <AccordionItem
                  key={article.id}
                  value={article.id}
                  className={cn(
                    "border rounded-md overflow-hidden",
                    isSelected(article.id) && "ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center px-4 py-2">
                    <Checkbox 
                      checked={isSelected(article.id)}
                      onCheckedChange={() => toggleSelection(article.id)}
                      className="mr-2"
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">{article.title}</span>
                        {article.status && (
                          <Badge 
                            variant={
                              article.status === 'published' ? 'default' : 
                              article.status === 'scheduled' ? 'outline' : 'secondary'
                            }
                            className="mt-1"
                          >
                            {article.status}
                            {article.status === 'scheduled' && article.scheduledDate && (
                              <span className="ml-1">({article.scheduledDate})</span>
                            )}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                  </div>
                  
                  <AccordionContent className="px-4 pb-4">
                    <Tabs defaultValue="edit">
                      <TabsList className="mb-4">
                        <TabsTrigger value="edit">Edit</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="edit" className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`title-${article.id}`}>Title</Label>
                            <Input 
                              id={`title-${article.id}`}
                              value={article.title} 
                              onChange={(e) => updateArticleTitle(article.id, e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`content-${article.id}`}>Content</Label>
                            <Textarea 
                              id={`content-${article.id}`}
                              value={article.content}
                              onChange={(e) => updateArticleContent(article.id, e.target.value)}
                              className="min-h-[300px]"
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="preview">
                        <div className="prose prose-sm max-w-none">
                          <h2>{article.title}</h2>
                          <div dangerouslySetInnerHTML={{ __html: article.content }} />
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          saveArticle({
                            ...article,
                            status: 'draft'
                          });
                        }}
                      >
                        Save as Draft
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          saveArticle({
                            ...article,
                            status: 'published'
                          });
                        }}
                      >
                        Publish Now
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="text-sm text-muted-foreground">
          {editedArticles.length} articles in this cluster
        </span>
        <Button
          onClick={saveAllArticles}
          disabled={isSaving || editedArticles.length === 0}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Saving...
            </>
          ) : (
            "Save All"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}