import React, { useEffect, useState } from 'react';
import createApp from '@shopify/app-bridge';
import type { ClientApplication } from '@shopify/app-bridge';
import { useToast } from '@/hooks/use-toast';

// Add type declaration for the global shopifyApp property
declare global {
  interface Window {
    shopifyApp?: ClientApplication;
  }
}

interface ShopifyProviderProps {
  children: React.ReactNode;
}

/**
 * Shopify App Bridge Provider component
 * Sets up App Bridge for embedded app functionality
 */
export function ShopifyProvider({ children }: ShopifyProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Parse URL query parameters
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');
    const shop = params.get('shop');
    
    // Check if embedded in Shopify (has host parameter)
    const isEmbedded = Boolean(host);
    
    if (isEmbedded && !initialized) {
      // Fetch API key from our secure endpoint
      fetch('/api/shopify/api-key')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch API key');
          }
          return response.json();
        })
        .then(data => {
          if (!data.apiKey) {
            throw new Error('API key not found');
          }
          
          // Configure and initialize App Bridge
          const appBridgeConfig = {
            apiKey: data.apiKey,
            host: host as string,
            forceRedirect: true
          };
          
          // Initialize App Bridge
          const app = createApp(appBridgeConfig);
          
          // Make app available globally for components that need to use it
          window.shopifyApp = app;
          
          setInitialized(true);
          console.log('App Bridge initialized successfully with API key from server');
          console.log('App is running in embedded mode');
        })
        .catch(error => {
          console.error('Error setting up App Bridge:', error);
          // Use the toast function from the hook
          toast({
            title: 'App Bridge Error',
            description: 'Could not initialize the Shopify embedded app. Some features may be limited.',
            variant: 'destructive'
          });
        });
    } else if (!isEmbedded) {
      console.log('Not in Shopify embedded mode - App Bridge not initialized');
    }
  }, [initialized, toast]);

  // Directly render children as we're using the App Bridge instance directly when needed
  return <>{children}</>;
}