import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, Clock, CheckCircle, Eye, Edit, MoreVertical, Trash2, Loader2, Calendar, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface Article {
  topic: string;
  status: 'processing' | 'completed' | 'failed';
  title: string;
  contentPreview: string;
  postId: number;
  usesFallback?: boolean;
}

interface ClusterViewProps {
  clusterTopic: string;
  articles: Article[];
  onRefresh?: () => void;
  onDeleteCluster?: () => void;
  onEditPost?: (post: any) => void;
}

export function ClusterView({ clusterTopic, articles, onRefresh, onDeleteCluster, onEditPost }: ClusterViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const completedCount = articles.filter(a => a.status === 'completed').length;
  const processingCount = articles.filter(a => a.status === 'processing').length;
  const totalCount = articles.length;
  
  // Auto-refresh every 30 seconds if there are processing articles
  useEffect(() => {
    if (processingCount > 0 && onRefresh) {
      const interval = setInterval(onRefresh, 30000);
      return () => clearInterval(interval);
    }
  }, [processingCount, onRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-blue-500';
      case 'processing': return 'bg-amber-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-amber-600 animate-spin" />;
      case 'failed': return <div className="w-4 h-4 bg-red-600 rounded-full" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const handleEditPost = async (article: Article) => {
    if (article.status !== 'completed' || article.postId <= 0) {
      toast({
        title: "Cannot Edit",
        description: "Article is still being generated or has failed.",
        variant: "destructive"
      });
      return;
    }

    if (onEditPost) {
      // Fetch the full post data and open the Shopify editor (same as admin panel)
      try {
        const response = await apiRequest('GET', `/api/posts/${article.postId}`, {});
        if (response && response.post) {
          // Open the same CreatePostModal used in admin panel
          onEditPost(response.post);
          toast({
            title: "Opening Editor",
            description: `Opening "${article.title}" in the Shopify editor.`,
          });
        }
      } catch (error) {
        console.error('Error fetching post for editing:', error);
        toast({
          title: "Error",
          description: "Could not open editor. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handlePublishPost = async (article: Article, action: 'draft' | 'publish' | 'schedule') => {
    if (article.status !== 'completed' || article.postId <= 0) {
      toast({
        title: "Cannot Publish",
        description: "Article is still being generated or has failed.",
        variant: "destructive"
      });
      return;
    }

    setPublishingId(article.postId);

    try {
      let response: any;
      
      switch (action) {
        case 'draft':
          // Save as draft - update status only
          response = await apiRequest('PUT', `/api/posts/${article.postId}`, { 
            status: 'draft' 
          });
          break;
          
        case 'publish':
          // Publish to Shopify using the existing publish endpoint
          response = await apiRequest('POST', `/api/posts/publish/${article.postId}`, {});
          break;
          
        case 'schedule':
          // For scheduling, we'd need a date picker - for now just schedule for tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          response = await apiRequest('PUT', `/api/posts/${article.postId}`, { 
            status: 'scheduled', 
            scheduledDate: tomorrow.toISOString() 
          });
          break;
      }

      if (response && response.success !== false) {
        let title = '';
        let description = '';
        
        switch (action) {
          case 'draft':
            title = "Saved as Draft";
            description = `"${article.title}" has been saved as draft.`;
            break;
          case 'publish':
            title = "Published to Shopify!";
            description = response.shopifyUrl 
              ? `"${article.title}" has been published to your Shopify store successfully!`
              : `"${article.title}" has been published successfully!`;
            break;
          case 'schedule':
            title = "Scheduled Publication";
            description = `"${article.title}" has been scheduled for publication.`;
            break;
        }
        
        toast({
          title,
          description,
          variant: "default"
        });
        
        // Refresh the data
        if (onRefresh) onRefresh();
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      } else {
        throw new Error(response?.message || 'Operation failed');
      }
    } catch (error: any) {
      console.error(`Error ${action}ing post:`, error);
      toast({
        title: `${action === 'publish' ? 'Publish' : action === 'draft' ? 'Save' : 'Schedule'} Failed`,
        description: error.message || `There was an error ${action}ing the article. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteCluster = () => {
    if (onDeleteCluster) {
      onDeleteCluster();
      toast({
        title: "Cluster Deleted",
        description: "The content cluster has been removed.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cluster Overview */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {clusterTopic}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Content cluster with {totalCount} interconnected articles
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                {completedCount} Ready
              </Badge>
              {processingCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  {processingCount} Processing
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Visual Progress Blocks */}
          <div className="grid grid-cols-10 gap-2 mb-4">
            {articles.map((article, index) => (
              <div
                key={index}
                className={`h-8 rounded ${getStatusColor(article.status)} cursor-pointer transition-all hover:scale-105`}
                title={`${article.topic} - ${article.status}`}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                Ready
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded animate-pulse"></div>
                Processing
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Open Cluster
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {clusterTopic} - Article Details
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {articles.map((article, index) => (
                    <Card key={index} className="border-l-4" style={{
                      borderLeftColor: article.status === 'completed' ? '#3b82f6' : article.status === 'processing' ? '#f59e0b' : '#ef4444'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(article.status)}
                            <h4 className="font-medium">{article.title}</h4>
                          </div>
                          <Badge variant={article.status === 'completed' ? 'default' : article.status === 'processing' ? 'secondary' : 'destructive'}>
                            {article.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{article.contentPreview}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Topic: {article.topic}</span>
                          
                          {/* Article Actions */}
                          {article.status === 'completed' && article.postId > 0 && (
                            <div className="flex items-center gap-2">
                              {/* Edit Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPost(article);
                                }}
                                className="h-8 text-xs"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              
                              {/* Three Dots Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublishPost(article, 'draft');
                                  }}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Save as Draft
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublishPost(article, 'publish');
                                  }}>
                                    {publishingId === article.postId ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Publishing...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Publish Now
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublishPost(article, 'schedule');
                                  }}>
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Schedule Publication
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <span className="text-xs text-gray-400">ID: {article.postId}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {processingCount > 0 && (
                  <div className="text-center text-sm text-gray-600 mt-4">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Articles are being generated in the background. This view will update automatically.
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Delete Cluster Button */}
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDeleteCluster}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Cluster
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}