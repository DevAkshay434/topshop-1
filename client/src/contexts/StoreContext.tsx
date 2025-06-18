import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

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
    setSelectedStoreId(storeId);
    // Store selection in localStorage for persistence
    localStorage.setItem('selectedStoreId', storeId.toString());
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