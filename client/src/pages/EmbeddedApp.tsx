import React, { useEffect, useState } from 'react';
import { useLocation, Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

/**
 * EmbeddedApp component - serves as the entry point for embedded Shopify applications
 * Detects if it's running embedded in Shopify Admin and redirects to the appropriate page
 */
export default function EmbeddedApp() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Parse URL query parameters to understand the embedded app context
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');
    const shop = params.get('shop');
    
    // Determine if we're in an embedded context
    const isEmbedded = Boolean(host);

    if (isEmbedded) {
      // For embedded apps, redirect to the Dashboard with the original params
      console.log('App is embedded, redirecting to Dashboard');
      
      // Keep the Shopify parameters in the URL to maintain embed context
      const dashboardURL = `/dashboard?${params.toString()}`;
      
      // Short timeout to ensure App Bridge has time to initialize
      setTimeout(() => {
        navigate(dashboardURL);
        setLoading(false);
        setAppReady(true);
      }, 300);
    } else {
      // If not embedded, just go to the main app page
      console.log('Not in embedded mode, redirecting to main app');
      setTimeout(() => {
        navigate('/dashboard');
        setLoading(false);
        setAppReady(true);
      }, 300);
    }
  }, [navigate]);

  // Show loading spinner while determining redirect
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Initializing app...</p>
        </div>
      </div>
    );
  }

  // Failsafe redirect to dashboard if something goes wrong
  if (!loading && !appReady) {
    return <Redirect to="/dashboard" />;
  }

  // This is a transition component, should not directly render content
  return null;
}