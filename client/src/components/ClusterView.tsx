import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, FileText, Clock, CheckCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
}

export function ClusterView({ clusterTopic, articles, onRefresh }: ClusterViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  
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
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Topic: {article.topic}</span>
                          {article.status === 'completed' && article.postId > 0 && (
                            <span>Post ID: {article.postId}</span>
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
        </CardContent>
      </Card>
    </div>
  );
}