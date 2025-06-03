import { useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useStoreContext } from './useStoreContext';

export function useStoreApiRequest() {
  const { storeId } = useStoreContext();

  const storeApiRequest = useCallback(
    async (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', url: string, data?: any) => {
      // Add store_id parameter to URL if we have a store context
      let finalUrl = url;
      if (storeId) {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = `${url}${separator}store_id=${storeId}`;
      }
      
      console.log(`API Request with store context: ${method} ${finalUrl}`);
      
      return apiRequest(method, finalUrl, data);
    },
    [storeId]
  );

  return { storeApiRequest, storeId };
}