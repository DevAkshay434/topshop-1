import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import PostList from "@/components/PostList";
import CreatePostModal from "@/components/CreatePostModal";
import { BlogPost } from "@shared/schema";
import { SchedulingPermissionNotice } from "../components/SchedulingPermissionNotice";
import { useStore } from "../contexts/StoreContext";

export default function ScheduledPosts() {
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const { autoDetectedStoreId } = useStore();
  
  // Check if the store has the scheduling permission
  const { data: permissionsData } = useQuery<{ 
    success: boolean; 
    hasPermission: boolean;
    store: { name: string; }
  }>({
    queryKey: ['/api/shopify/check-permissions'],
    enabled: true,
    onSuccess: (data) => {
      console.log('Scheduled Posts - Permissions check result:', data);
    }
  });

  // Get store info including timezone
  const { data: storeInfoData } = useQuery<{
    success: boolean;
    shopInfo: {
      timezone: string;
    };
  }>({
    queryKey: ['/api/shopify/store-info'],
    enabled: true
  });

  // Extract timezone from format "(GMT-05:00) America/New_York"
  const getStoreTimezone = () => {
    if (!storeInfoData?.shopInfo?.timezone) return 'America/New_York';
    const timezoneMatch = storeInfoData.shopInfo.timezone.match(/\) (.+)$/);
    return timezoneMatch ? timezoneMatch[1] : 'America/New_York';
  };
  
  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setCreatePostModalOpen(true);
  };
  
  return (
    <Layout>
      {/* Show scheduling permission notice if needed */}
      {permissionsData?.success && !permissionsData.hasPermission && (
        <div className="mb-4">
          <SchedulingPermissionNotice 
            storeName={permissionsData.store?.name || 'your store'} 
          />
        </div>
      )}
      <div className="mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">Scheduled Posts</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Manage posts scheduled for future publication
          </p>
        </div>
      </div>
      
      <PostList
        queryKey="/api/posts/scheduled"
        title="Scheduled Posts"
        onEditPost={handleEditPost}
        storeId={autoDetectedStoreId}
        storeTimezone={getStoreTimezone()}
      />
      
      <CreatePostModal
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
        initialData={selectedPost}
      />
    </Layout>
  );
}
