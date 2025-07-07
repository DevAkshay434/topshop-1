import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { RescheduleModal } from "@/components/RescheduleModal";
import CreatePostModal from "@/components/CreatePostModal";
import { BlogPost } from "@shared/schema";
import { SchedulingPermissionNotice } from "../components/SchedulingPermissionNotice";
import { ScheduledPostList } from "@/components/ScheduledPostList";

export default function ScheduledPosts() {
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const queryClient = useQueryClient();
  
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
  
  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setCreatePostModalOpen(true);
  };

  const handleReschedulePost = (post: BlogPost) => {
    setSelectedPost(post);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = () => {
    // Invalidate queries to refresh the scheduled posts list
    queryClient.invalidateQueries({ queryKey: ['/api/posts/scheduled'] });
    queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
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
      
      <ScheduledPostList
        queryKey="/api/posts/scheduled"
        title="Scheduled Posts"
        onEditPost={handleEditPost}
        onReschedulePost={handleReschedulePost}
      />
      
      <CreatePostModal
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
        initialData={selectedPost}
      />

      <RescheduleModal
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        post={selectedPost}
        onSuccess={handleRescheduleSuccess}
      />
    </Layout>
  );
}
