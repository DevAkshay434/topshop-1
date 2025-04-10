import React, { useEffect } from 'react';
import createApp from '@shopify/app-bridge';
import { AppBridgeState } from '@shopify/app-bridge';

// Add type declaration for the global shopifyApp property
declare global {
  interface Window {
    shopifyApp?: AppBridgeState;
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
  useEffect(() => {
    // Parse URL query parameters
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');
    const shop = params.get('shop');
    
    // Check if embedded in Shopify (has host parameter)
    const isEmbedded = Boolean(host && shop);
    
    if (isEmbedded) {
      // Get API key from environment or use the one from the Shopify Partners dashboard
      const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY || '171d3c09d9299b9f6934c29abb309929';
      
      // Configure and initialize App Bridge
      const appBridgeConfig = {
        apiKey,
        host: host as string,
        forceRedirect: true
      };
      
      try {
        // Initialize App Bridge
        const app = createApp(appBridgeConfig);
        
        // Make app available globally for components that need to use it
        window.shopifyApp = app;
        
        console.log('App Bridge initialized successfully');
      } catch (error) {
        console.error('Error initializing App Bridge:', error);
      }
      
      console.log('App is running in embedded mode');
    } else {
      console.log('Not in Shopify embedded mode - App Bridge not initialized');
    }
  }, []);

  // Directly render children as we're using the App Bridge instance directly when needed
  return <>{children}</>;
}