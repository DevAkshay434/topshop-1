import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ShopifyConnection, SyncActivity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building, CheckCircle, History, RefreshCw, StoreIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopifyStoreCard() {
  const { toast } = useToast();
  const [selectedBlog, setSelectedBlog] = useState<string>("");
  const [blogs, setBlogs] = useState<{id: string, title: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: connectionData, isLoading: isConnectionLoading } = useQuery<{ connection: ShopifyConnection }>({
    queryKey: ["/api/shopify/connection"],
  });
  
  const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery<{ activities: SyncActivity[] }>({
    queryKey: ["/api/sync-activities"],
  });
  
  const { data: blogsData, isLoading: isBlogsLoading } = useQuery<{ blogs: { id: string, title: string }[] }>({
    queryKey: ["/api/shopify/blogs"],
    enabled: !!connectionData?.connection?.isConnected,
  });
  
  useEffect(() => {
    if (blogsData?.blogs) {
      setBlogs(blogsData.blogs);
    }
  }, [blogsData]);
  
  useEffect(() => {
    if (connectionData?.connection?.defaultBlogId) {
      setSelectedBlog(connectionData.connection.defaultBlogId);
    }
  }, [connectionData]);
  
  const handleSyncNow = async () => {
    setIsSyncing(true);
    
    try {
      await apiRequest("POST", "/api/shopify/sync", {});
      
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/connection"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sync-activities"] });
      
      toast({
        title: "Sync Complete",
        description: "Successfully synchronized with Shopify",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Shopify",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleChangeBlog = async (blogId: string) => {
    setSelectedBlog(blogId);
    
    try {
      await apiRequest("POST", "/api/shopify/default-blog", { blogId });
      
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/connection"] });
      
      toast({
        title: "Default Blog Updated",
        description: "Your default blog has been updated",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update default blog",
        variant: "destructive",
      });
    }
  };
  
  const connection = connectionData?.connection;
  const activities = activitiesData?.activities || [];
  
  if (isConnectionLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-neutral-200">
          <CardTitle>Blog Settings</CardTitle>
          <CardDescription>
            Configure your Shopify blog publishing settings
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Extract store name without myshopify.com domain
  const displayName = connection?.storeName ? connection.storeName.replace('.myshopify.com', '') : '';
  
  return (
    <Card>
      <CardHeader className="border-b border-neutral-200">
        <CardTitle>Blog Settings</CardTitle>
        <CardDescription>
          Configure your Shopify blog publishing settings
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-center p-4 mb-4 bg-primary/5 rounded-md">
          <StoreIcon className="text-primary mr-3 h-5 w-5" />
          <div>
            <h4 className="text-sm font-medium">Store</h4>
            <p className="text-sm text-neutral-600 mt-1 font-medium capitalize">{displayName}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label>Default Blog</Label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <Select value={selectedBlog} onValueChange={handleChangeBlog}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a blog" />
                </SelectTrigger>
                <SelectContent>
                  {isBlogsLoading ? (
                    <SelectItem value="loading" disabled>Loading blogs...</SelectItem>
                  ) : blogs.length > 0 ? (
                    blogs.map((blog) => (
                      <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No blogs found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Select the default blog where new posts will be published
            </p>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleSyncNow}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <h4 className="text-sm font-medium text-neutral-900 mb-3">Recent Activity</h4>
          
          {isActivitiesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-2">
              {activities.slice(0, 2).map((activity) => (
                <div key={activity.id} className="flex space-x-2 text-sm">
                  <History className="text-neutral-400 h-4 w-4" />
                  <span className="text-neutral-500">
                    {format(new Date(activity.timestamp), "MMM d 'at' h:mm a")}
                  </span>
                  <span className="text-neutral-700">{activity.activity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}