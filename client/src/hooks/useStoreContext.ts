import { useState, useEffect } from 'react';
import { extractShopContext, getStoreIdFromShop, storeShopContext } from '../utils/shopifyAuth';

interface StoreContext {
  storeId: number | null;
  shopDomain: string | null;
  isEmbedded: boolean;
  setStore: (storeId: number, shopDomain: string) => void;
}

export function useStoreContext(): StoreContext {
  const [storeContext, setStoreContext] = useState<{
    storeId: number | null;
    shopDomain: string | null;
    isEmbedded: boolean;
  }>({
    storeId: null,
    shopDomain: null,
    isEmbedded: false
  });

  useEffect(() => {
    // Use the robust shop context extraction
    const detectedShopDomain = extractShopContext();
    
    // Get additional URL parameters for embedded detection
    const urlParams = new URLSearchParams(window.location.search);
    const host = urlParams.get('host');
    const embedded = urlParams.get('embedded');
    const storeIdParam = urlParams.get('store_id');
    
    // Check if we're in embedded mode
    const isEmbedded = !!(detectedShopDomain && (host || embedded === '1'));
    
    // Determine store ID
    let resolvedStoreId: number | null = null;
    if (storeIdParam) {
      resolvedStoreId = parseInt(storeIdParam, 10);
    } else if (detectedShopDomain) {
      resolvedStoreId = getStoreIdFromShop(detectedShopDomain);
    }
    
    // Store the shop context for future use
    if (detectedShopDomain) {
      storeShopContext(detectedShopDomain);
    }
    
    console.log('Store context detected:', {
      shopDomain: detectedShopDomain,
      resolvedStoreId,
      isEmbedded,
      storeIdParam,
      referrer: document.referrer,
      currentUrl: window.location.href
    });
    
    setStoreContext({
      storeId: resolvedStoreId,
      shopDomain: detectedShopDomain,
      isEmbedded
    });
  }, []);

  const setStore = (storeId: number, shopDomain: string) => {
    console.log('Manual store change:', { storeId, shopDomain });
    storeShopContext(shopDomain);
    setStoreContext(prev => ({
      ...prev,
      storeId,
      shopDomain
    }));
  };

  return {
    ...storeContext,
    setStore
  };
}