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
  console.log('=== SHOPIFY AUTH DEBUG ===');
  console.log('Current URL:', window.location.href);
  console.log('Referrer:', document.referrer);
  console.log('Search params:', window.location.search);
  console.log('Hash:', window.location.hash);

  // Method 1: Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const shopParam = urlParams.get('shop');
  console.log('Shop param from URL:', shopParam);
  if (shopParam) {
    const domain = ensureShopDomain(shopParam);
    console.log('Using shop from URL params:', domain);
    return domain;
  }

  // Method 2: Check URL hash parameters (sometimes used by Shopify)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const shopHash = hashParams.get('shop');
    console.log('Shop param from hash:', shopHash);
    if (shopHash) {
      const domain = ensureShopDomain(shopHash);
      console.log('Using shop from hash params:', domain);
      return domain;
    }
  }

  // Method 3: Extract from parent frame URL (when embedded)
  try {
    if (window !== window.parent) {
      console.log('App is in iframe, checking parent');
      // Try to get shop info from parent frame
      const message = { type: 'GET_SHOP_INFO' };
      window.parent.postMessage(message, '*');
    }
  } catch (e) {
    console.log('Cannot access parent frame:', e);
  }

  // Method 4: Check referrer for admin context
  if (document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      console.log('Referrer hostname:', referrerUrl.hostname);
      console.log('Referrer pathname:', referrerUrl.pathname);
      
      if (referrerUrl.hostname === 'admin.shopify.com') {
        const storeMatch = referrerUrl.pathname.match(/\/store\/([^\/]+)/);
        console.log('Store match from referrer:', storeMatch);
        if (storeMatch) {
          const domain = `${storeMatch[1]}.myshopify.com`;
          console.log('Using shop from referrer:', domain);
          return domain;
        }
      } else if (referrerUrl.hostname.endsWith('.myshopify.com')) {
        console.log('Using shop from referrer hostname:', referrerUrl.hostname);
        return referrerUrl.hostname;
      }
    } catch (e) {
      console.log('Error parsing referrer:', e);
    }
  }

  // Method 5: Check current URL for embedded context patterns
  const currentUrl = window.location.href;
  console.log('Checking current URL for patterns...');
  
  // Pattern 1: Direct admin URL
  if (currentUrl.includes('admin.shopify.com')) {
    const storeMatch = currentUrl.match(/\/store\/([^\/\?&]+)/);
    if (storeMatch) {
      const domain = `${storeMatch[1]}.myshopify.com`;
      console.log('Using shop from current URL admin pattern:', domain);
      return domain;
    }
  }

  // Method 6: Check localStorage for previous session
  try {
    const storedShop = localStorage.getItem('shopify_shop_domain');
    console.log('Stored shop in localStorage:', storedShop);
    if (storedShop) {
      console.log('Using shop from localStorage:', storedShop);
      return ensureShopDomain(storedShop);
    }
  } catch (e) {
    console.log('Error accessing localStorage:', e);
  }

  console.log('No shop context found, returning null');
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