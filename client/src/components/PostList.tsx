import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Clock, 
  Edit as EditIcon, 
  BarChart2, 
  MoreVertical, 
  Calendar, 
  Eye,
  Loader2
} from "lucide-react";
import { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PostListProps {
  queryKey: string;
  title: string;
  viewAllLink?: string;
  limit?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  onEditPost?: (post: BlogPost) => void;
  onEditSchedule?: (post: BlogPost) => void;
}

export default function PostList({ 
  queryKey, 
  title, 
  viewAllLink, 
  limit = 10,
  page = 1,
  onPageChange,
  totalPages = 1,
  onEditPost,
  onEditSchedule
}: PostListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishingId, setPublishingId] = useState<number | null>(null);
  
  const { data, isLoading, error } = useQuery<{ posts: BlogPost[] }>({
    queryKey: [queryKey, limit, page],
  });
  
  const handleViewAnalytics = (post: BlogPost) => {
    toast({
      title: "Analytics",
      description: `Viewing analytics for "${post.title}"`,
    });
  };
  
  const handlePublishPost = async (post: BlogPost) => {
    if (post.status === 'published') return;
    
    setPublishingId(post.id);
    
    try {
      const response = await apiRequest('PUT', `/api/posts/${post.id}`, {
        status: 'published',
        publishedDate: new Date().toISOString()
      });
      
      if (response) {
        toast({
          title: "Post Published",
          description: `"${post.title}" has been published successfully.`
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts/recent'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      }
    } catch (error) {
      console.error('Error publishing post:', error);
      toast({
        title: "Publication Failed",
        description: "There was an error publishing the post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPublishingId(null);
    }
  };
  
  const getPostStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500/10 text-green-500";
      case "draft":
        return "bg-neutral-500/10 text-neutral-500";
      case "scheduled":
        return "bg-amber-500/10 text-amber-500";
      default:
        return "bg-neutral-500/10 text-neutral-500";
    }
  };
  
  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  const getPostIcon = (status: string) => {
    switch (status) {
      case "published":
        return <FileText className="h-5 w-5 text-primary" />;
      case "draft":
        return <FileText className="h-5 w-5 text-neutral-500" />;
      case "scheduled":
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <FileText className="h-5 w-5 text-neutral-500" />;
    }
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return format(new Date(date), "MMM d, yyyy");
  };
  
  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        </div>
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-neutral-200">
            {[...Array(3)].map((_, i) => (
              <li key={i}>
                <div className="px-4 py-4 sm:px-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        </div>
        <div className="overflow-hidden bg-white shadow sm:rounded-md p-4 text-red-500">
          Error loading posts: {error.message}
        </div>
      </div>
    );
  }
  
  const posts = data?.posts || [];
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
        {viewAllLink && (
          <a href={viewAllLink} className="text-sm font-medium text-primary hover:text-primary-dark">
            View all
            <span className="material-icons align-text-bottom text-sm ml-1">→</span>
          </a>
        )}
      </div>
      
      <div className="overflow-hidden bg-white shadow sm:rounded-md">
        <ul role="list" className="divide-y divide-neutral-200">
          {posts.length > 0 ? (
            posts.map(post => (
              <li key={post.id}>
                <div 
                  className="block hover:bg-neutral-50 cursor-pointer" 
                  onClick={() => onEditPost && onEditPost(post)}
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getPostIcon(post.status)}
                        </div>
                        <p className="text-sm font-medium text-primary truncate">
                          {post.title}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <div className="flex items-center gap-2">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPostStatusColor(post.status)}`}>
                            {getStatusLabel(post.status)}
                          </p>
                          {/* Show Published label for scheduled posts that have been published */}
                          {post.status === 'scheduled' && post.publishedDate && (
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Published
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-neutral-500">
                          <Calendar className="text-neutral-400 mr-1 h-4 w-4" />
                          <span>
                            {post.status === "published" 
                              ? formatDate(post.publishedDate)
                              : post.status === "scheduled"
                                ? formatDate(post.scheduledDate)
                                : "Draft"}
                          </span>
                        </p>
                        {post.category && (
                          <p className="mt-2 flex items-center text-sm text-neutral-500 sm:mt-0 sm:ml-6">
                            <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700">
                              {post.category}
                            </span>
                          </p>
                        )}
                        {post.author && (
                          <p className="mt-2 flex items-center text-sm text-neutral-500 sm:mt-0 sm:ml-6">
                            <span className="px-2 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700">
                              Author: {post.author}
                            </span>
                          </p>
                        )}
                        {post.status === "published" && (
                          <p className="mt-2 flex items-center text-sm text-neutral-500 sm:mt-0 sm:ml-6">
                            <Eye className="text-neutral-400 mr-1 h-4 w-4" />
                            <span>{post.views || 0} views</span>
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-neutral-500 sm:mt-0">
                        <div className="flex space-x-1">
                          <button 
                            className="p-1 rounded-full hover:bg-neutral-100" 
                            title="Edit post"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPost && onEditPost(post);
                            }}
                          >
                            <EditIcon className="text-neutral-500 h-4 w-4" />
                          </button>
                          <button 
                            className="p-1 rounded-full hover:bg-neutral-100" 
                            title="View analytics"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAnalytics(post);
                            }}
                          >
                            <BarChart2 className="text-neutral-500 h-4 w-4" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className="p-1 rounded-full hover:bg-neutral-100" 
                                title="More options"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="text-neutral-500 h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onEditPost && onEditPost(post);
                              }}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewAnalytics(post);
                              }}>
                                View Analytics
                              </DropdownMenuItem>
                              {post.status === "scheduled" && !post.publishedDate && onEditSchedule && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSchedule(post);
                                }}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  Edit Schedule
                                </DropdownMenuItem>
                              )}
                              {post.status !== "published" && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublishPost(post);
                                }}>
                                  {publishingId === post.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Publishing...
                                    </>
                                  ) : (
                                    "Publish Now"
                                  )}
                                </DropdownMenuItem>
                              )}
                              {post.status === "published" && (
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  Unpublish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-red-500"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="py-8 text-center text-neutral-500">
              No posts found
            </li>
          )}
        </ul>
      </div>
      
      {/* Pagination UI */}
      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded-md ${
              page === 1 
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
            }`}
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i + 1)}
              className={`px-3 py-1 rounded-md ${
                page === i + 1
                  ? 'bg-primary text-white'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={`px-3 py-1 rounded-md ${
              page === totalPages
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
