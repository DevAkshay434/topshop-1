import { useState } from "react";
import Layout from "@/components/Layout";
import PostList from "@/components/PostList";
import CreatePostModal from "@/components/CreatePostModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BlogPost } from "@shared/schema";

export default function ScheduledPosts() {
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  
  const handleCreatePost = () => {
    setSelectedPost(null);
    setCreatePostModalOpen(true);
  };
  
  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setCreatePostModalOpen(true);
  };
  
  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">Scheduled Posts</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Manage posts scheduled for future publication
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4">
          <Button onClick={handleCreatePost}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule New Post
          </Button>
        </div>
      </div>
      
      <PostList
        queryKey="/api/posts/scheduled"
        title="Scheduled Posts"
        onEditPost={handleEditPost}
      />
      
      <CreatePostModal
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
        initialData={selectedPost}
      />
    </Layout>
  );
}
