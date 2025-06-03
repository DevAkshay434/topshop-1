// Shopify authentication and store detection utilities

interface ShopifyAppContext {
  shop?: string;
  host?: string;
  embedded?: string;
  id_token?: string;
  timestamp?: string;
  session?: string;
}

/**
 * Extract shop context from various Shopify authentication methods
 */
export function extractShopContext(): string | null {
  // Method 1: Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const shopParam = urlParams.get('shop');
  if (shopParam) {
    return ensureShopDomain(shopParam);
  }

  // Method 2: Check URL hash parameters (sometimes used by Shopify)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const shopHash = hashParams.get('shop');
    if (shopHash) {
      return ensureShopDomain(shopHash);
    }
  }

  // Method 3: Check for embedded context in URL
  const currentUrl = window.location.href;
  
  // Check if URL contains embedded Shopify context
  if (currentUrl.includes('admin.shopify.com')) {
    const storeMatch = currentUrl.match(/\/store\/([^\/\?&]+)/);
    if (storeMatch) {
      return `${storeMatch[1]}.myshopify.com`;
    }
  }

  // Method 4: Check referrer for admin context
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      if (referrerUrl.hostname === 'admin.shopify.com') {
        const storeMatch = referrerUrl.pathname.match(/\/store\/([^\/]+)/);
        if (storeMatch) {
          return `${storeMatch[1]}.myshopify.com`;
        }
      } else if (referrerUrl.hostname.endsWith('.myshopify.com')) {
        return referrerUrl.hostname;
      }
    } catch (e) {
      // Ignore invalid referrer URLs
    }
  }

  // Method 5: Check localStorage for previous session
  try {
    const storedShop = localStorage.getItem('shopify_shop_domain');
    if (storedShop) {
      return ensureShopDomain(storedShop);
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  return null;
}

/**
 * Ensure shop domain is in the correct format
 */
function ensureShopDomain(shop: string): string {
  if (!shop) return shop;
  
  // If it's already a full domain, return as is
  if (shop.includes('.myshopify.com')) {
    return shop;
  }
  
  // If it's just the shop name, add the domain
  return `${shop}.myshopify.com`;
}

/**
 * Store the shop domain for future reference
 */
export function storeShopContext(shop: string) {
  try {
    localStorage.setItem('shopify_shop_domain', shop);
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Map shop domain to internal store ID
 */
export function getStoreIdFromShop(shop: string): number | null {
  const STORE_MAPPING: Record<string, number> = {
    'rajeshshah.myshopify.com': 1,
    'reviewtesting434.myshopify.com': 2
  };
  
  return STORE_MAPPING[shop] || null;
}

/**
 * Get store name from shop domain
 */
export function getStoreNameFromShop(shop: string): string {
  if (!shop) return '';
  return shop.replace('.myshopify.com', '');
}