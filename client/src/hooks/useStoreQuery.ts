import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useStoreContext } from './useStoreContext';

export function useStoreQuery<T>(
  baseQueryKey: string[],
  options?: Omit<UseQueryOptions<T>, 'queryKey'>
) {
  const { storeId } = useStoreContext();

  // Include store ID in query key for proper cache isolation
  const queryKey = storeId ? [...baseQueryKey, 'store', storeId] : baseQueryKey;
  
  // Modify the query function to include store_id parameter
  const queryFn = async () => {
    const baseUrl = baseQueryKey[0];
    let url = baseUrl;
    
    if (storeId) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}store_id=${storeId}`;
    }

    console.log(`Store-aware query: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  return useQuery<T>({
    queryKey,
    queryFn,
    ...options,
  });
}