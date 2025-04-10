import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import BlogPosts from "@/pages/BlogPosts";
import ScheduledPosts from "@/pages/ScheduledPosts";
import ShopifyConnection from "@/pages/ShopifyConnection";
import BillingSettings from "@/pages/BillingSettings";

function Router() {
  return (
    <>
      <Navbar />
      <main className="flex-grow p-4 sm:p-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/blog-posts" component={BlogPosts} />
          <Route path="/scheduled-posts" component={ScheduledPosts} />
          <Route path="/shopify-connection" component={ShopifyConnection} />
          <Route path="/billing-settings" component={BillingSettings} />
          <Route path="/billing-callback" component={Dashboard} />
          
          {/* AI Templates, Analytics, Settings, and Help routes would go here */}
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
