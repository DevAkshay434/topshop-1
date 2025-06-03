import { useState, useEffect } from 'react';

interface StoreContext {
  storeId: number | null;
  shopDomain: string | null;
  isEmbedded: boolean;
}

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
        if (referrerUrl.hostname.endsWith('.myshopify.com')) {
          shopDomain = referrerUrl.hostname;
        }
      } catch (e) {
        // Ignore invalid referrer URLs
      }
    }
    
    // Determine store ID
    let resolvedStoreId: number | null = null;
    if (storeId) {
      resolvedStoreId = parseInt(storeId);
    } else if (shopDomain) {
      // Map shop domains to store IDs based on known stores
      if (shopDomain === 'rajeshshah.myshopify.com') {
        resolvedStoreId = 1;
      } else if (shopDomain === 'reviewtesting434.myshopify.com') {
        resolvedStoreId = 2;
      }
    }
    
    console.log('Store context detected:', {
      shop,
      host,
      embedded,
      storeId: storeId,
      shopDomain,
      resolvedStoreId,
      isEmbedded,
      referrer: document.referrer
    });
    
    setStoreContext({
      storeId: resolvedStoreId,
      shopDomain,
      isEmbedded
    });
  }, []);

  return storeContext;
}