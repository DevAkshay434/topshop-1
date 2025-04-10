import React, { useEffect, useState } from 'react';
import createApp from '@shopify/app-bridge';

interface ShopifyProviderProps {
  children: React.ReactNode;
}

/**
 * Shopify App Bridge Provider component
 * Wraps the app with Shopify App Bridge context to enable embedded app functionality
 */
export function ShopifyProvider({ children }: ShopifyProviderProps) {
  const [appBridgeConfig, setAppBridgeConfig] = useState<{
    apiKey: string;
    host: string;
    forceRedirect: boolean;
  } | null>(null);

  useEffect(() => {
    // Parse URL query parameters
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');
    const shop = params.get('shop');
    
    // Check if embedded in Shopify (has host parameter)
    const isEmbedded = Boolean(host && shop);
    
    if (isEmbedded) {
      // Get API key from environment variables
      const apiKey = process.env.SHOPIFY_API_KEY || '171d3c09d9299b9f6934c29abb309929';
      
      setAppBridgeConfig({
        host: host as string,
        apiKey,
        forceRedirect: true
      });
      
      console.log('Initializing Shopify App Bridge with:', {
        host,
        apiKey: apiKey.substring(0, 6) + '...',
        shop
      });
    } else {
      console.log('Not in Shopify embedded mode - App Bridge not initialized');
    }
  }, []);

  // If we have config, wrap with AppProvider, otherwise render children directly
  if (appBridgeConfig) {
    return (
      <Provider config={appBridgeConfig}>
        {children}
      </Provider>
    );
  }

  return <>{children}</>;
}