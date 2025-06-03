import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Define options interface for new method signature
interface ApiRequestOptions {
  url: string;
  method: string;
  data?: unknown;
}

export async function apiRequest<T = any>(
  methodOrOptions: string | ApiRequestOptions,
  urlOrData?: string | unknown,
  data?: unknown | undefined,
): Promise<T> {
  // Handle both calling conventions:
  // 1. apiRequest({ url: '/api/posts', method: 'POST', data: {...} })
  // 2. apiRequest('POST', '/api/posts', {...})
  
  let url: string;
  let method: string;
  let requestData: unknown | undefined;
  
  if (typeof methodOrOptions === 'object') {
    // New style: options object
    url = methodOrOptions.url;
    method = methodOrOptions.method;
    requestData = methodOrOptions.data;
  } else {
    // Old style: separate arguments
    method = methodOrOptions;
    url = urlOrData as string;
    requestData = data;
  }
  
  // Get shop context for API requests
  const shopDomain = localStorage.getItem('shopify_shop_domain');
  const storeId = localStorage.getItem('shopify_store_id');
  
  console.log('API Request context:', { shopDomain, storeId, url, method });
  
  const headers: Record<string, string> = {};
  if (requestData) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add shop context to headers if available
  if (shopDomain) {
    headers['x-shopify-shop-domain'] = shopDomain;
    console.log('Adding shop domain header:', shopDomain);
  }
  if (storeId) {
    headers['x-store-id'] = storeId;
    console.log('Adding store ID header:', storeId);
  }

  // Add shop as query parameter for better compatibility
  const urlObj = new URL(url, window.location.origin);
  if (shopDomain && !urlObj.searchParams.has('shop')) {
    urlObj.searchParams.set('shop', shopDomain);
  }

  const res = await fetch(urlObj.toString(), {
    method,
    headers,
    body: requestData ? JSON.stringify(requestData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get shop context for query requests
    const shopDomain = localStorage.getItem('shopify_shop_domain');
    const storeId = localStorage.getItem('shopify_store_id');
    
    const url = queryKey[0] as string;
    console.log('Query Request context:', { shopDomain, storeId, url });
    
    const headers: Record<string, string> = {};
    
    // Add shop context to headers if available
    if (shopDomain) {
      headers['x-shopify-shop-domain'] = shopDomain;
      console.log('Adding shop domain header to query:', shopDomain);
    }
    if (storeId) {
      headers['x-store-id'] = storeId;
      console.log('Adding store ID header to query:', storeId);
    }

    // Add shop as query parameter for better compatibility
    const urlObj = new URL(url, window.location.origin);
    if (shopDomain && !urlObj.searchParams.has('shop')) {
      urlObj.searchParams.set('shop', shopDomain);
    }

    const res = await fetch(urlObj.toString(), {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
