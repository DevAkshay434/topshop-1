import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useStore } from '../contexts/StoreContext';

export function useStoreAwareQuery<TData = unknown>(
  baseQueryKey: string,
  options?: Omit<UseQueryOptions<TData>, 'queryKey'>
) {
  const { selectedStoreId } = useStore();
  
  return useQuery<TData>({
    ...options,
    queryKey: [baseQueryKey, selectedStoreId],
    enabled: !!selectedStoreId && (options?.enabled !== false),
  });
}