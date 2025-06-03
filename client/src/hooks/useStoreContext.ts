import { useState, useEffect } from 'react';

interface StoreContext {
  storeId: number | null;
  shopDomain: string | null;
  isEmbedded: boolean;
}

// Store mapping for quick lookup
const STORE_MAPPING: Record<string, number> = {
  'rajeshshah': 1,
  'reviewtesting434': 2
};

export function useStoreContext(): StoreContext {
  const [storeContext, setStoreContext] = useState<StoreContext>({
    storeId: null,
    shopDomain: null,
    isEmbedded: false
  });

  useEffect(() => {
    // Get store context from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    const host = urlParams.get('host');
    const embedded = urlParams.get('embedded');
    const storeId = urlParams.get('store_id');
    
    // Check if we're in embedded mode
    const isEmbedded = !!(shop && (host || embedded === '1'));
    
    // Extract shop domain from various sources
    let shopDomain = shop;
    
    // If no shop parameter, try to extract from referrer
    if (!shopDomain && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        if (referrerUrl.hostname.includes('.myshopify.com') || referrerUrl.pathname.includes('/store/')) {
          // Extract store name from admin.shopify.com URLs like /store/reviewtesting434/
          const storeMatch = referrerUrl.pathname.match(/\/store\/([^\/]+)\//);
          if (storeMatch) {
            shopDomain = `${storeMatch[1]}.myshopify.com`;
          } else if (referrerUrl.hostname.endsWith('.myshopify.com')) {
            shopDomain = referrerUrl.hostname;
          }
        }
      } catch (e) {
        // Ignore invalid referrer URLs
      }
    }
    
    // Try to extract from current URL path if it contains store info
    if (!shopDomain) {
      const currentUrl = window.location.href;
      const storeMatch = currentUrl.match(/store[_=]([^&\/]+)/i);
      if (storeMatch) {
        const storeName = storeMatch[1];
        if (storeName && !storeName.includes('.')) {
          shopDomain = `${storeName}.myshopify.com`;
        }
      }
    }
    
    // Determine store ID
    let resolvedStoreId: number | null = null;
    if (storeId) {
      resolvedStoreId = parseInt(storeId);
    } else if (shopDomain) {
      // Extract store name from domain
      const storeName = shopDomain.replace('.myshopify.com', '');
      resolvedStoreId = STORE_MAPPING[storeName] || null;
    }
    
    console.log('Store context detected:', {
      shop,
      host,
      embedded,
      storeId: storeId,
      shopDomain,
      resolvedStoreId,
      isEmbedded,
      referrer: document.referrer,
      currentUrl: window.location.href
    });
    
    setStoreContext({
      storeId: resolvedStoreId,
      shopDomain,
      isEmbedded
    });
  }, []);

  return storeContext;
}