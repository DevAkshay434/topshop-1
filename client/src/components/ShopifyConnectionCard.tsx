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
import { CheckCircle, History, Link2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopifyConnectionCard() {
  const { toast } = useToast();
  const [selectedBlog, setSelectedBlog] = useState<string>("");
  const [blogs, setBlogs] = useState<{id: string, title: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
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
  
  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Shopify store?")) {
      return;
    }
    
    setIsDisconnecting(true);
    
    try {
      await apiRequest("POST", "/api/shopify/disconnect", {});
      
      queryClient.invalidateQueries({ queryKey: ["/api/shopify/connection"] });
      
      toast({
        title: "Store Disconnected",
        description: "Your Shopify store has been disconnected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect store",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
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
  
  const isConnected = connection?.isConnected;
  
  if (isConnectionLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-neutral-200">
          <CardTitle>Shopify Connection</CardTitle>
          <CardDescription>
            Manage your Shopify store connection
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
  
  return (
    <Card>
      <CardHeader className="border-b border-neutral-200">
        <CardTitle>Shopify Connection</CardTitle>
        <CardDescription>
          Manage your Shopify store connection
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isConnected ? (
          <>
            <div className="flex items-center p-4 mb-4 bg-green-50 rounded-md">
              <CheckCircle className="text-green-500 mr-3 h-5 w-5" />
              <div>
                <h4 className="text-sm font-medium text-green-500">Connected</h4>
                <p className="text-sm text-neutral-600 mt-1">{connection?.storeName}</p>
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
              </div>
            </div>
            
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
              <Button
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <h4 className="text-sm font-medium text-neutral-900 mb-3">Last Sync Activity</h4>
              
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
          </>
        ) : (
          <div className="p-6 text-center">
            <h4 className="text-lg font-medium text-neutral-900 mb-3">Connect to Shopify</h4>
            <p className="mb-6 text-neutral-500">
              Connect your Shopify store to start publishing blog posts
            </p>
            <Button>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 109 124" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M74.7 14.8C74.6 14.4 74.3 14.3 74.1 14.2C73.9 14.1 72.9 14 71.4 14.1C69.9 14.2 67.7 14.4 65.3 14.8C65.3 14.3 65.2 13.9 65.2 13.4C65 10.5 64.5 8.2 63.4 6.2C61.9 3.5 59.6 2 57.3 2C57.1 2 56.9 2 56.8 2C56.7 2 56.6 1.9 56.5 1.9C56.4 1.2 56.2 0.6 55.9 0C54.9 0.2 53.9 0.5 53 0.9C51.7 1.5 50.3 2.3 49.1 3.3C47.9 4.3 46.8 5.5 45.9 6.8C44.9 8.1 44.2 9.6 43.7 11.2C43.2 12.8 42.9 14.5 42.9 16.2C42.8 16.5 42.8 16.8 42.8 17.1C39.8 18 37.4 18.9 35.9 19.6C33.6 20.7 33.5 20.7 33.2 22.9L30.7 89.1L76.4 98L95.9 93.5L74.7 14.8Z" fill="white"/>
                <path d="M94.4 23.7L84.6 26.7C84.6 26.4 84.5 26.1 84.4 25.8C83.5 22.1 81.6 19.1 78.7 16.8C80.8 16.4 82.5 16.1 83.9 16C85.4 15.9 86.3 15.9 86.6 16.1C86.7 16.2 87 16.3 87.1 16.7L94.4 23.7ZM74.7 14.8C74.6 14.4 74.3 14.3 74.1 14.2C73.9 14.1 72.9 14 71.4 14.1C69.9 14.2 67.7 14.4 65.3 14.8C65.3 14.3 65.2 13.9 65.2 13.4C65 10.5 64.5 8.2 63.4 6.2C61.9 3.5 59.6 2 57.3 2C57.1 2 56.9 2 56.8 2C56.7 2 56.6 1.9 56.5 1.9C56.4 1.2 56.2 0.6 55.9 0C54.9 0.2 53.9 0.5 53 0.9C51.7 1.5 50.3 2.3 49.1 3.3C47.9 4.3 46.8 5.5 45.9 6.8C44.9 8.1 44.2 9.6 43.7 11.2C43.2 12.8 42.9 14.5 42.9 16.2C42.8 16.5 42.8 16.8 42.8 17.1C39.8 18 37.4 18.9 35.9 19.6C33.6 20.7 33.5 20.7 33.2 22.9L30.7 89.1L76.4 98L95.9 93.5L74.7 14.8Z" fill="#95BF47"/>
                <path d="M71.7 27.1C70.2 27.5 68.6 28 66.8 28.5C66.5 25.9 65.8 23.4 64.7 20.9C63.3 17.6 61.4 15.1 59.3 13.3C65.5 12.7 70.2 13.2 71.2 14.8C71.9 16 72.1 21.4 71.7 27.1ZM56.8 13.2C56.6 13.2 56.4 13.3 56.2 13.3C56.1 13.1 56 12.9 55.9 12.6C54.9 10.8 53.6 9.5 52.2 8.6C49.7 7.1 47.1 7.2 45.6 7.4C45 7.5 44.5 7.6 44.3 7.7C44.8 5.6 45.7 3.7 47 2.3C48.5 0.6 50.7 -0.2 53.1 0.1C55.5 0.4 57.7 1.9 59.1 4.3C60.5 6.7 60.6 9.7 59.8 12.3C59.2 13.3 58.2 13.6 56.8 13.2ZM66.4 29.5C66.1 29.6 65.9 29.7 65.6 29.8C56.9 32.6 49.9 35 44.3 37C44.3 37 44.2 34.8 43.5 33.7C42.8 32.6 42.1 32.3 41.3 32.1C43.5 27.5 44.3 23.1 43.6 18.7C43.6 18.7 44.7 18.4 46.4 17.9C46.4 17.9 47.9 24.6 53.4 24.9C58.9 25.2 62.1 20.2 62.7 18.6C62.7 18.6 63.6 18.4 64.7 18.1C65.4 20.4 65.9 22.8 66.1 25.2C66.4 26.7 66.5 28.1 66.4 29.5Z" fill="white"/>
                <path d="M71.2 14.8C70.2 13.3 65.5 12.7 59.3 13.3C61.4 15.1 63.3 17.6 64.7 20.9C65.8 23.4 66.5 25.9 66.8 28.5C68.6 28 70.2 27.5 71.7 27.1C72.1 21.4 71.9 16 71.2 14.8Z" fill="#5E8E3E"/>
                <path d="M43.5 18.7C44.2 23.1 43.4 27.5 41.3 32.1C42.1 32.3 42.8 32.6 43.5 33.7C44.2 34.8 44.3 37 44.3 37C49.9 35 56.9 32.6 65.6 29.8C65.9 29.7 66.1 29.6 66.4 29.5C66.5 28.1 66.4 26.7 66.1 25.2C65.9 22.8 65.4 20.4 64.7 18.1C63.6 18.4 62.7 18.6 62.7 18.6C62.1 20.2 58.9 25.2 53.4 24.9C47.9 24.6 46.4 17.9 46.4 17.9C44.7 18.4 43.5 18.7 43.5 18.7Z" fill="#5E8E3E"/>
                <path d="M55.9 12.6C56 12.9 56.1 13.1 56.2 13.3C56.4 13.3 56.6 13.2 56.8 13.2C58.2 13.6 59.2 13.3 59.8 12.3C60.7 9.7 60.5 6.7 59.1 4.3C57.7 1.9 55.5 0.4 53.1 0.1C50.7 -0.2 48.5 0.6 47 2.3C45.7 3.7 44.8 5.6 44.3 7.7C44.5 7.6 45 7.5 45.6 7.4C47.1 7.2 49.7 7.1 52.2 8.6C53.6 9.5 54.9 10.8 55.9 12.6Z" fill="#5E8E3E"/>
                <path d="M2 89.3C3.2 90.9 4.8 92 6.7 92.6L14 95L20.8 96.9L25 98L27.5 37.9L20.9 36.3L14 34.6L9 33.4L2 89.3Z" fill="#5E8E3E"/>
                <path d="M40.3 94.3L53.7 97.9L59.3 99.2L65.6 100.7L70.5 102L81.9 104.6L84.5 105.2C87.1 105.8 89.8 105.9 92.5 105.4C95.1 104.9 97.6 103.8 99.8 102.3C102 100.8 103.9 98.8 105.2 96.5C106.5 94.2 107.2 91.6 107.4 89L107.7 83.7L108.1 78.2L108.5 68.6L108.7 58.9L108.6 44.1L108.4 38.2C108.4 36.3 108 34.5 107.2 32.8C106.5 31.1 105.4 29.5 104 28.2C102.6 26.9 101 25.9 99.3 25.2C97.5 24.5 95.6 24.2 93.8 24.1L90.1 24L86.3 24.2L82.1 24.5L74.4 25.6L67.7 27L60.5 28.8L43.7 32.7L35.3 34.9L27 37.4L18.6 40.1L14.5 41.3L10.4 42.7L6.2 44.3L2.1 45.9L0 46.7L2 89.3L9 33.4L14 34.6L20.9 36.3L27.5 37.9L36.3 40.1L40.3 94.3Z" fill="#5E8E3E"/>
              </svg>
              Connect to Shopify
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
