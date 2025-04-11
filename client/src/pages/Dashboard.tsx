import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import StatsCard from "@/components/StatsCard";
import PostList from "@/components/PostList";
import ContentGenerator from "@/components/ContentGenerator";
import ShopifyStoreCard from "@/components/ShopifyStoreCard";
import CreatePostModal from "@/components/CreatePostModal";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Eye, Sparkles, Plus, Zap } from "lucide-react";
import { BlogPost } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    tags: string[];
  } | undefined>(undefined);
  const [, setLocation] = useLocation();
  
  const { data: statsData, isLoading: isStatsLoading } = useQuery<{
    totalPosts: number;
    published: number;
    scheduled: number;
    totalViews: number;
  }>({
    queryKey: ["/api/stats"],
  });
  
  // Calculate total pages based on total posts
  const postsPerPage = 5;
  const totalPages = statsData ? Math.ceil(statsData.totalPosts / postsPerPage) : 1;
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleCreatePost = () => {
    setSelectedPost(null);
    setGeneratedContent(undefined);
    setCreatePostModalOpen(true);
  };
  
  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    setGeneratedContent(undefined);
    setCreatePostModalOpen(true);
  };
  
  const handleContentGenerated = (content: {
    title: string;
    content: string;
    tags: string[];
  }) => {
    setGeneratedContent(content);
    setSelectedPost(null);
    setCreatePostModalOpen(true);
  };
  
  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Dashboard</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your blog content and Shopify publication
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4 flex space-x-2">
          <Button variant="outline" onClick={() => setLocation("/content-templates")}>
            <Zap className="mr-2 h-4 w-4" />
            Bulk Generate
          </Button>
          <Button onClick={handleCreatePost}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Post
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {isStatsLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Posts"
              value={statsData?.totalPosts || 0}
              icon={FileText}
              color="primary"
            />
            <StatsCard
              title="Scheduled"
              value={statsData?.scheduled || 0}
              icon={Clock}
              color="warning"
            />
            <StatsCard
              title="Published"
              value={statsData?.published || 0}
              icon={FileText}
              color="success"
            />
            <StatsCard
              title="Total Views"
              value={statsData?.totalViews || 0}
              icon={Eye}
              color="accent"
            />
          </>
        )}
      </div>

      {/* Posts Section hidden per user request */}
      {/* <PostList
        queryKey="/api/posts"
        title="All Blog Posts"
        viewAllLink="/blog-posts"
        limit={postsPerPage}
        page={currentPage}
        onPageChange={handlePageChange}
        totalPages={totalPages}
        onEditPost={handleEditPost}
      /> */}

      {/* Content Creation & Blog Settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContentGenerator onContentGenerated={handleContentGenerated} />
        <ShopifyStoreCard />
      </div>
      
      {/* Create Post Modal */}
      <CreatePostModal
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
        initialData={selectedPost}
        generatedContent={generatedContent}
      />
    </Layout>
  );
}
