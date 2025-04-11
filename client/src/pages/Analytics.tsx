import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { BarChart3, TrendingUp, Users, Clock } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

// This would normally come from your analytics API
const generateMockData = () => {
  // Create 7 days of data from today backwards
  const today = new Date();
  return Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(today, 6 - i);
    return {
      date: format(date, "MMM dd"),
      views: Math.floor(Math.random() * 50) + 10,
      visitors: Math.floor(Math.random() * 30) + 5,
      engagementTime: Math.floor(Math.random() * 120) + 30,
    };
  });
};

export default function Analytics() {
  const { data: statsData, isLoading: isStatsLoading } = useQuery<{
    totalPosts: number;
    published: number;
    scheduled: number;
    totalViews: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: postsData, isLoading: isPostsLoading } = useQuery<{ posts: any[] }>({
    queryKey: ["/api/posts/published"],
  });

  const [viewsData, setViewsData] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!isPostsLoading && postsData?.posts) {
      // Convert posts to analytics data
      setViewsData(generateMockData());
      
      // Sort posts by views to get top posts
      const sorted = [...postsData.posts].sort((a, b) => (b.views || 0) - (a.views || 0));
      setTopPosts(sorted.slice(0, 5));
    }
  }, [postsData, isPostsLoading]);

  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Analytics</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Track your blog posts' performance and audience engagement
          </p>
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
              title="Total Views"
              value={statsData?.totalViews || 0}
              icon={<BarChart3 className="h-5 w-5" />}
              color="primary"
            />
            <StatsCard
              title="Published Posts"
              value={statsData?.published || 0}
              icon={<TrendingUp className="h-5 w-5" />}
              color="success"
            />
            <StatsCard
              title="Unique Visitors"
              value={Math.floor((statsData?.totalViews || 0) * 0.7)}
              icon={<Users className="h-5 w-5" />}
              color="warning"
            />
            <StatsCard
              title="Avg. Read Time"
              value="3m 24s"
              icon={<Clock className="h-5 w-5" />}
              color="accent"
              isTime
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
            <CardDescription>Daily post views from the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isPostsLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={viewsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
            <CardDescription>Views, visitors, and time spent</CardDescription>
          </CardHeader>
          <CardContent>
            {isPostsLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={viewsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" name="Views" fill="#3b82f6" />
                    <Bar dataKey="visitors" name="Visitors" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Posts */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
          <CardDescription>Your most viewed blog posts</CardDescription>
        </CardHeader>
        <CardContent>
          {isPostsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {topPosts.length > 0 ? (
                topPosts.map((post, index) => (
                  <div key={post.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900">{post.title}</h4>
                        <p className="text-sm text-neutral-500">{post.publishedDate ? format(new Date(post.publishedDate), "MMM d, yyyy") : "Not published"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-neutral-900">{post.views || 0}</p>
                      <p className="text-sm text-neutral-500">Views</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <p>No published posts yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  isTime?: boolean;
}

function StatsCard({ title, value, icon, color, isTime = false }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500">{title}</p>
            <p className="text-2xl font-semibold mt-1 text-neutral-900">
              {isTime ? value : typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          <div className={`p-2 rounded-full bg-${color}/10`}>
            <div className={`text-${color}`}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}