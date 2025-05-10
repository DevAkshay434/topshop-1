import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface StoreInfo {
  name: string;
  domain: string;
  email: string;
  country: string;
  currency: string;
  timezone: string;
  iana_timezone: string;
  timezone_abbreviation?: string; // Optional timezone abbreviation (e.g., EST, PST)
}

interface StoreContextType {
  storeInfo: StoreInfo | null;
  isLoading: boolean;
  error: Error | null;
  refreshStoreInfo: () => Promise<void>;
}

// Default context value
const initialContext: StoreContextType = {
  storeInfo: null,
  isLoading: true,
  error: null,
  refreshStoreInfo: async () => {}
};

// Create context
const StoreContext = createContext<StoreContextType>(initialContext);

// Provider component
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch store info
  const fetchStoreInfo = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/shopify/store-info');
      
      if (response.success && response.shopInfo) {
        setStoreInfo(response.shopInfo);
      } else {
        // No error but also no store info
        setStoreInfo(null);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch store information');
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching store info:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching store info'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch store info on mount
  useEffect(() => {
    fetchStoreInfo();
  }, []);

  // Context value
  const contextValue: StoreContextType = {
    storeInfo,
    isLoading,
    error,
    refreshStoreInfo: fetchStoreInfo
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

// Hook for consuming context
export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}