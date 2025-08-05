import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, Edit, ExternalLink, AlertCircle } from "lucide-react";

interface ScheduledPost {
  id: number;
  title: string;
  content: string;
  status: string;
  author?: string;
  authorId?: number;
  scheduledDate?: string;
  scheduledPublishDate?: string;
  scheduledPublishTime?: string;
  storeId?: number;
  shopifyPostId?: string;
  createdAt: string;
  updatedAt: string;
  schedulingInfo?: {
    scheduledDate: string;
    scheduledDateLocal: string;
    timezone: string;
    isPastDue: boolean;
    minutesUntilPublish: number;
  };
  publishStatus?: {
    isScheduled: boolean;
    isPublished: boolean;
    hasShopifyId: boolean;
    shopifyUrl?: string;
  };
}

interface ScheduledPostsResponse {
  posts: ScheduledPost[];
  storeTimezone: string;
  store: {
    name: string;
    id: number;
  };
}

export function ScheduledPostsList() {
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scheduledData, isLoading, error } = useQuery<ScheduledPostsResponse>({
    queryKey: ["/api/posts/scheduled"],
    refetchInterval: 30000, // Refresh every 30 seconds to show live countdown
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ postId, scheduledPublishDate, scheduledPublishTime }: {
      postId: number;
      scheduledPublishDate: string;
      scheduledPublishTime: string;
    }) => {
      return apiRequest(`/api/posts/${postId}/schedule`, {
        method: "PUT",
        body: {
          scheduledPublishDate,
          scheduledPublishTime,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts/scheduled"] });
      setEditingPost(null);
      setNewDate("");
      setNewTime("");
      toast({
        title: "Schedule Updated",
        description: "The post schedule has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update post schedule.",
        variant: "destructive",
      });
    },
  });

  const formatTimeUntilPublish = (minutes: number) => {
    if (minutes <= 0) return "Past due";
    
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const getStatusColor = (post: ScheduledPost) => {
    if (post.schedulingInfo?.isPastDue) return "destructive";
    if (post.publishStatus?.hasShopifyId) return "default";
    return "secondary";
  };

  const getStatusText = (post: ScheduledPost) => {
    if (post.schedulingInfo?.isPastDue) return "Past Due";
    if (post.publishStatus?.hasShopifyId) return "Ready to Publish";
    return "Scheduled";
  };

  const handleEditSchedule = (post: ScheduledPost) => {
    setEditingPost(post);
    setNewDate(post.scheduledPublishDate || "");
    setNewTime(post.scheduledPublishTime || "");
  };

  const handleUpdateSchedule = () => {
    if (!editingPost || !newDate || !newTime) {
      toast({
        title: "Invalid Input",
        description: "Please provide both date and time.",
        variant: "destructive",
      });
      return;
    }

    updateScheduleMutation.mutate({
      postId: editingPost.id,
      scheduledPublishDate: newDate,
      scheduledPublishTime: newTime,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scheduled Posts</h3>
          <Skeleton className="h-4 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load scheduled posts</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { posts, storeTimezone, store } = scheduledData || { posts: [], storeTimezone: "UTC", store: { name: "", id: 0 } };

  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Posts
          </CardTitle>
          <CardDescription>
            No scheduled posts found for {store.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Posts scheduled for future publication will appear here. You can update their schedule times and monitor their status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduled Posts ({posts.length})
        </h3>
        <Badge variant="outline" className="text-xs">
          {store.name} • {storeTimezone}
        </Badge>
      </div>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {post.author && (
                      <span>by {post.author}</span>
                    )}
                    <Badge variant={getStatusColor(post)} className="text-xs">
                      {getStatusText(post)}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSchedule(post)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Schedule</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="date">Publish Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="time">Publish Time ({storeTimezone})</Label>
                          <Input
                            id="time"
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleUpdateSchedule}
                          disabled={updateScheduleMutation.isPending}
                          className="w-full"
                        >
                          {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {post.publishStatus?.shopifyUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={post.publishStatus.shopifyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {post.schedulingInfo?.scheduledDateLocal || 
                       `${post.scheduledPublishDate} ${post.scheduledPublishTime}`}
                    </span>
                  </div>
                  
                  {post.schedulingInfo && (
                    <div className={`flex items-center gap-1 ${
                      post.schedulingInfo.isPastDue 
                        ? "text-destructive" 
                        : "text-primary"
                    }`}>
                      <span className="font-medium">
                        {formatTimeUntilPublish(post.schedulingInfo.minutesUntilPublish)}
                      </span>
                      {!post.schedulingInfo.isPastDue && <span>remaining</span>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {post.publishStatus?.hasShopifyId && (
                    <Badge variant="outline" className="text-xs">
                      Synced to Shopify
                    </Badge>
                  )}
                  
                  {post.schedulingInfo?.isPastDue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Attention
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>

            {post.schedulingInfo?.isPastDue && (
              <div className="absolute top-2 right-2">
                <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Times shown in {storeTimezone} • Updates every 30 seconds
      </div>
    </div>
  );
}