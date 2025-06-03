import { useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useStoreContext } from './useStoreContext';

export function useStoreApiRequest() {
  const { storeId, shopDomain } = useStoreContext();

  const storeApiRequest = useCallback(
    async (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, data?: any) => {
      // Add store context parameters to URL
      let finalUrl = url;
      const params = new URLSearchParams();
      
      if (storeId) {
        params.append('store_id', storeId.toString());
      }
      
      if (shopDomain) {
        params.append('shop', shopDomain);
      }
      
      if (params.toString()) {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = `${url}${separator}${params.toString()}`;
      }
      
      console.log(`API Request with store context: ${method} ${finalUrl}`);
      
      return apiRequest(method, finalUrl, data);
    },
    [storeId, shopDomain]
  );

  return { storeApiRequest, storeId, shopDomain };
}