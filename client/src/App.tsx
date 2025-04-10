import { Switch, Route, useLocation } from "wouter";
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
import AppInstall from "@/pages/AppInstall";
import PartnerInstall from "@/pages/PartnerInstall";
import EmbeddedApp from "@/pages/EmbeddedApp";
import { useEffect, useState } from "react";

function Router() {
  const [location] = useLocation();
  const [showNavbar, setShowNavbar] = useState(true);
  
  useEffect(() => {
    // Check if the URL has Shopify embedded parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isEmbedded = urlParams.has('shop') && 
                      (urlParams.has('host') || urlParams.get('embedded') === '1');
    
    // Hide navbar if we're in embedded mode
    setShowNavbar(!isEmbedded);
  }, [location]);
  
  // Check if current URL has embedded params
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.has('shop') && 
                   (urlParams.has('host') || urlParams.get('embedded') === '1');
  
  return (
    <>
      {showNavbar && <Navbar />}
      <main className={`flex-grow ${showNavbar ? 'p-4 sm:p-6' : 'p-0'}`}>
        <Switch>
          {/* If we're at root with embedded params, show EmbeddedApp */}
          <Route path="/">
            {isEmbedded ? <EmbeddedApp /> : <Dashboard />}
          </Route>
          <Route path="/blog-posts" component={BlogPosts} />
          <Route path="/scheduled-posts" component={ScheduledPosts} />
          <Route path="/shopify-connection" component={ShopifyConnection} />
          <Route path="/billing-settings" component={BillingSettings} />
          <Route path="/billing-callback" component={Dashboard} />
          <Route path="/install" component={AppInstall} />
          <Route path="/partner-install" component={PartnerInstall} />
          <Route path="/embedded" component={EmbeddedApp} />
          <Route path="/dashboard" component={Dashboard} />
          
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
