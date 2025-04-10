import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import BlogPosts from "@/pages/BlogPosts";
import ScheduledPosts from "@/pages/ScheduledPosts";
import ShopifyConnection from "@/pages/ShopifyConnection";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/blog-posts" component={BlogPosts} />
      <Route path="/scheduled-posts" component={ScheduledPosts} />
      <Route path="/shopify-connection" component={ShopifyConnection} />
      
      {/* AI Templates, Analytics, Settings, and Help routes would go here */}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
