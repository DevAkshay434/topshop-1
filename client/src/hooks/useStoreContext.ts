import { useState, useEffect } from 'react';
import { extractShopContext, getStoreIdFromShop, storeShopContext } from '../utils/shopifyAuth';

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
    // Use the robust shop context extraction
    const shopDomain = extractShopContext();
    
    // Get additional URL parameters for embedded detection
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get('host');
    const embedded = urlParams.get('embedded');
    const storeIdParam = urlParams.get('store_id');
    
    // Check if we're in embedded mode
    const isEmbedded = !!(shopDomain && (host || embedded === '1'));
    
    // Store the shop context for future use
    if (shopDomain) {
      storeShopContext(shopDomain);
    }
    
    console.log('Store context detected:', {
      shopDomain,
      resolvedStoreId,
      isEmbedded,
      storeIdParam,
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