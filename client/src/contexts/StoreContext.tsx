import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface ShopifyStore {
  id: number;
  shopName: string;
  accessToken: string;
  scope: string;
  defaultBlogId: string | null;
  isConnected: boolean;
  lastSynced: Date | null;
  installedAt: Date;
  uninstalledAt: Date | null;
  planName: string | null;
  chargeId: string | null;
  trialEndsAt: Date | null;
}

interface StoreContextType {
  currentStore: ShopifyStore | null;
  autoDetectedStoreId: number | null;
  stores: ShopifyStore[];
  isLoading: boolean;
  refreshStores: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [autoDetectedStoreId, setAutoDetectedStoreId] = useState<number | null>(null);

  // Automatic store detection from Shopify Admin context
  useEffect(() => {
    const detectStoreFromShopifyAdmin = async () => {
      try {
        // Method 1: Extract shop from URL parameters (embedded apps)
        const urlParams = new URLSearchParams(window.location.search);
        const shopParam = urlParams.get('shop');
        
        if (shopParam) {
          console.log(`Detected shop from URL parameter: ${shopParam}`);
          
          // Fetch stores and find matching store
          const response = await fetch('/api/shopify/stores');
          const data = await response.json();
          const stores = data.stores || [];
          
          const matchedStore = stores.find((store: ShopifyStore) => 
            store.shopName === shopParam || 
            store.shopName === `${shopParam}.myshopify.com` ||
            shopParam.includes(store.shopName.replace('.myshopify.com', ''))
          );
          
          if (matchedStore) {
            setAutoDetectedStoreId(matchedStore.id);
            (window as any).__autoDetectedStoreId = matchedStore.id;
            console.log(`Auto-detected store from URL: ${matchedStore.shopName} (ID: ${matchedStore.id})`);
            return;
          }
        }

        // Method 2: Get from current store info API (server-side detection)
        const storeInfoResponse = await fetch('/api/shopify/store-info');
        const storeInfoData = await storeInfoResponse.json();
        
        if (storeInfoData?.success && storeInfoData?.shopInfo?.domain) {
          const currentShopDomain = storeInfoData.shopInfo.domain;
          console.log(`Detected shop from store-info API: ${currentShopDomain}`);
          
          const storesResponse = await fetch('/api/shopify/stores');
          const storesData = await storesResponse.json();
          const stores = storesData.stores || [];
          
          const matchedStore = stores.find((store: ShopifyStore) => 
            currentShopDomain.includes(store.shopName.replace('.myshopify.com', ''))
          );
          
          if (matchedStore) {
            setAutoDetectedStoreId(matchedStore.id);
            (window as any).__autoDetectedStoreId = matchedStore.id;
            console.log(`Auto-detected store from API: ${matchedStore.shopName} (ID: ${matchedStore.id})`);
            return;
          }
        }

        // Method 3: Fallback to first connected store
        const storesResponse = await fetch('/api/shopify/stores');
        const storesData = await storesResponse.json();
        const stores = storesData.stores || [];
        
        if (stores.length > 0) {
          const firstConnectedStore = stores.find((store: ShopifyStore) => store.isConnected) || stores[0];
          setAutoDetectedStoreId(firstConnectedStore.id);
          (window as any).__autoDetectedStoreId = firstConnectedStore.id;
          console.log(`Fallback to first connected store: ${firstConnectedStore.shopName} (ID: ${firstConnectedStore.id})`);
        }
      } catch (error) {
        console.error('Error auto-detecting store:', error);
      // Fallback: Set store ID to 1 if auto-detection fails due to API issues
      console.log('Setting fallback store ID to 1 due to auto-detection failure');
      (window as any).__autoDetectedStoreId = 1;
      }
    };

    detectStoreFromShopifyAdmin();
  }, []);

  // Fetch all stores
  const { 
    data: storesData, 
    isLoading: storesLoading, 
    refetch: refetchStores 
  } = useQuery({
    queryKey: ['/api/shopify/stores'],
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const stores: ShopifyStore[] = storesData?.stores || [];
  const currentStore = stores.find(store => store.id === autoDetectedStoreId) || null;

  const refreshStores = () => {
    refetchStores();
  };

  const value: StoreContextType = {
    currentStore,
    autoDetectedStoreId,
    stores,
    isLoading: storesLoading,
    refreshStores,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}