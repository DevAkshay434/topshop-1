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
  selectedStoreId: number | null;
  stores: ShopifyStore[];
  isLoading: boolean;
  selectStore: (storeId: number) => void;
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
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

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

  // Fetch current store info (fallback for initial load)
  const { data: currentStoreData } = useQuery({
    queryKey: ['/api/shopify/store-info'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const stores: ShopifyStore[] = storesData?.stores || [];
  
  // Determine current store based on selection or fallback
  const currentStore = selectedStoreId 
    ? stores.find(store => store.id === selectedStoreId) || null
    : stores.find(store => 
        currentStoreData?.shopInfo?.domain?.includes(store.shopName.replace('.myshopify.com', ''))
      ) || stores[0] || null;

  // Auto-select the first available store if none selected
  useEffect(() => {
    if (!selectedStoreId && stores.length > 0 && currentStore) {
      setSelectedStoreId(currentStore.id);
    }
  }, [stores, currentStore, selectedStoreId]);

  const selectStore = (storeId: number) => {
    console.log(`StoreContext: Switching to store ID: ${storeId}`);
    
    // Store selection in localStorage FIRST for persistence
    localStorage.setItem('selectedStoreId', storeId.toString());
    console.log(`StoreContext: Saved to localStorage: ${localStorage.getItem('selectedStoreId')}`);
    
    // Clear all cached queries to prevent data leakage between stores
    queryClient.clear();
    
    // Set the new store ID in state
    setSelectedStoreId(storeId);
    
    // Force re-fetch of store-dependent data after clearing cache
    setTimeout(() => {
      console.log(`StoreContext: Invalidating queries after store switch to ${storeId}`);
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/authors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blogs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopify/check-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopify/store-info'] });
    }, 100);
    
    console.log(`StoreContext: Store switched to: ${storeId}, localStorage value: ${localStorage.getItem('selectedStoreId')}`);
  };

  const refreshStores = () => {
    refetchStores();
  };

  // Load stored selection on mount
  useEffect(() => {
    const storedStoreId = localStorage.getItem('selectedStoreId');
    if (storedStoreId && !selectedStoreId) {
      setSelectedStoreId(parseInt(storedStoreId));
    }
  }, [selectedStoreId]);

  const value: StoreContextType = {
    currentStore,
    selectedStoreId,
    stores,
    isLoading: storesLoading,
    selectStore,
    refreshStores,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}