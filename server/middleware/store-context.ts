import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extend Request interface to include store context
declare global {
  namespace Express {
    interface Request {
      currentStore?: {
        id: number;
        shopName: string;
        accessToken: string;
        scope: string;
        defaultBlogId: string | null;
        isConnected: boolean | null;
        lastSynced: Date | null;
        installedAt: Date;
        uninstalledAt: Date | null;
        planName: string | null;
        chargeId: string | null;
        trialEndsAt: Date | null;
      };
    }
  }
}

/**
 * Middleware to detect and set the current store context
 * Based on shop parameter in query string or embedded context
 */
export async function storeContextMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log('MIDDLEWARE CALLED:', req.path, req.method);
  try {
    console.log(`=== Store Context Middleware Executing for ${req.path} ===`);
    console.log('Method:', req.method);
    console.log('Headers received:', {
      'x-shopify-shop-domain': req.headers['x-shopify-shop-domain'],
      'x-store-id': req.headers['x-store-id'],
      'referer': req.headers['referer']
    });

    // Skip store detection for non-API routes
    if (!req.path.startsWith('/api/')) {
      console.log('Skipping non-API route');
      return next();
    }

    // Get shop parameter from query string (for embedded apps)
    const shopParam = req.query.shop as string;
    
    // Get shop from headers (for webhook calls and API requests)
    const shopHeader = req.headers['x-shopify-shop-domain'] as string;
    
    // Get store ID from headers
    const storeIdHeader = req.headers['x-store-id'] as string;
    
    // Get shop from referer for embedded app context
    let shopFromReferer = '';
    if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        if (refererUrl.hostname.endsWith('.myshopify.com')) {
          shopFromReferer = refererUrl.hostname;
        } else if (refererUrl.hostname === 'admin.shopify.com') {
          // Extract store name from admin.shopify.com/store/{store-name}/apps/{app-name}
          const pathMatch = refererUrl.pathname.match(/\/store\/([^\/]+)/);
          if (pathMatch) {
            shopFromReferer = `${pathMatch[1]}.myshopify.com`;
          }
        }
      } catch (e) {
        // Ignore invalid referrer URLs
      }
    }
    
    // Determine shop domain with priority: query param > header > referer
    const shopDomain = shopParam || shopHeader || shopFromReferer;
    
    console.log(`Store context detection for ${req.path}: shop=${shopParam}, header=${shopHeader}, referer=${shopFromReferer}, storeId=${storeIdHeader}, final=${shopDomain}`);
    
    // First, try to get store by header store ID if available
    if (storeIdHeader) {
      try {
        const store = await storage.getShopifyStore(parseInt(storeIdHeader));
        if (store && store.isConnected) {
          req.currentStore = store;
          console.log(`Store context set from header store ID: ${store.shopName} (ID: ${store.id})`);
          return next();
        }
      } catch (e) {
        console.log(`Invalid store ID in header: ${storeIdHeader}`);
      }
    }
    
    if (shopDomain) {
      // Get store by domain
      const store = await storage.getShopifyStoreByDomain(shopDomain);
      
      if (store && store.isConnected) {
        req.currentStore = store;
        console.log(`Store context set from domain: ${store.shopName} (ID: ${store.id})`);
      } else {
        console.log(`Store not found or not connected: ${shopDomain}`);
        // Still try fallback for legacy compatibility
        const stores = await storage.getShopifyStores();
        
        // Priority order: rajeshshah > any connected store for fallback
        const defaultStore = stores.find(store => 
          store.isConnected && store.shopName === 'rajeshshah.myshopify.com'
        );
        
        const fallbackStore = defaultStore || stores.find(store => store.isConnected);
        
        if (fallbackStore) {
          req.currentStore = fallbackStore;
          console.log(`Using ${defaultStore ? 'default' : 'fallback'} store: ${fallbackStore.shopName} (ID: ${fallbackStore.id})`);
        }
      }
    } else {
      // Check for store ID in query parameter as fallback
      const storeId = req.query.store_id as string;
      
      if (storeId) {
        const store = await storage.getShopifyStore(parseInt(storeId));
        if (store && store.isConnected) {
          req.currentStore = store;
          console.log(`Store context set from query store_id: ${store.shopName} (ID: ${store.id})`);
          return next();
        }
      }
      
      // Fallback to default store (rajeshshah) for direct access
      const stores = await storage.getShopifyStores();
      
      // Priority order: rajeshshah > any connected store for direct access
      const defaultStore = stores.find(store => 
        store.isConnected && store.shopName === 'rajeshshah.myshopify.com'
      );
      
      const fallbackStore = defaultStore || stores.find(store => store.isConnected);
      
      if (fallbackStore) {
        req.currentStore = fallbackStore;
        console.log(`Using ${defaultStore ? 'default' : 'fallback'} store for direct access: ${fallbackStore.shopName} (ID: ${fallbackStore.id})`);
      }
    }
    
    next();
  } catch (error) {
    console.error('Store context middleware error:', error);
    next(); // Continue without store context if error occurs
  }
}

/**
 * Helper function to get current store from request
 */
export function getCurrentStore(req: Request) {
  return req.currentStore;
}

/**
 * Middleware to require store context for protected endpoints
 */
export function requireStoreContext(req: Request, res: Response, next: NextFunction) {
  if (!req.currentStore) {
    return res.status(400).json({
      error: 'Store context required',
      message: 'Please provide shop parameter or ensure store is properly connected'
    });
  }
  next();
}