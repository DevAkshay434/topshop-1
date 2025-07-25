import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import PostList from "@/components/PostList";
import CreatePostModal from "@/components/CreatePostModal";
import ScheduledPostEditModal from "@/components/ScheduledPostEditModal";
import { BlogPost } from "@shared/schema";
import { SchedulingPermissionNotice } from "../components/SchedulingPermissionNotice";

export default function ScheduledPosts() {
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [scheduleEditModalOpen, setScheduleEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [scheduleEditPost, setScheduleEditPost] = useState<BlogPost | null>(null);
  
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

  const handleEditSchedule = (post: BlogPost) => {
    setScheduleEditPost(post);
    setScheduleEditModalOpen(true);
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
        onEditSchedule={handleEditSchedule}
      />
      
      <CreatePostModal
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
        initialData={selectedPost}
      />
      
      <ScheduledPostEditModal
        open={scheduleEditModalOpen}
        onOpenChange={setScheduleEditModalOpen}
        post={scheduleEditPost}
      />
    </Layout>
  );
}
