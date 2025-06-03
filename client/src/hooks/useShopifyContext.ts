import { useState, useEffect } from 'react';
import { extractShopContext, getStoreIdFromShop } from '../utils/shopifyAuth';

interface ShopifyContext {
  shopDomain: string | null;
  storeId: number | null;
  isDetected: boolean;
  isEmbedded: boolean;
}

/**
 * Hook to automatically detect Shopify store context from various sources
 * including embedded app URLs, query parameters, and referrers
 */
export function useShopifyContext(): ShopifyContext {
  const [context, setContext] = useState<ShopifyContext>({
    shopDomain: null,
    storeId: null,
    isDetected: false,
    isEmbedded: false
  });

  useEffect(() => {
    // Detect if app is embedded in iframe
    const isEmbedded = window !== window.parent;
    
    // Extract shop context using various methods
    const shopDomain = extractShopContext();
    const storeId = shopDomain ? getStoreIdFromShop(shopDomain) : null;
    
    console.log('Shopify context detection:', {
      shopDomain,
      storeId,
      isEmbedded,
      isDetected: !!shopDomain
    });

    setContext({
      shopDomain,
      storeId,
      isDetected: !!shopDomain,
      isEmbedded
    });

    // If shop context is detected, store it for future requests
    if (shopDomain) {
      localStorage.setItem('shopify_shop_domain', shopDomain);
      if (storeId) {
        localStorage.setItem('shopify_store_id', storeId.toString());
      }
    }
  }, []);

  return context;
}