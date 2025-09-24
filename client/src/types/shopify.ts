// UI-focused, permissive Shopify types for AdminPanel
export interface Product {
  id: string | number;
  title?: string;
  handle?: string;
  description?: string;
  body_html?: string;
  product_type?: string;
  vendor?: string;
  status?: string;
  tags?: string | string[];
  image?: string;
  image_url?: string;
  featured_image?: any;
  admin_url?: string;
  admin_graphql_api_id?: string;
  options?: any[];
  images?: (ProductImage | string)[];
  variants?: (ProductVariant | any)[];
}

export interface Collection {
  id: string | number;
  title?: string;
  handle?: string;
  description?: string;
  admin_url?: string;
  admin_graphql_api_id?: string;
  image?: {
    id?: string | number;
    src?: string;
    alt?: string;
  } | string;
  image_url?: string;
}

export interface ProductImage {
  id?: string | number;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  position?: number;
  [key: string]: any; // Allow additional fields
}

export interface ProductVariant {
  id: string | number;
  title?: string;
  price?: string | number;
  sku?: string;
  inventory_quantity?: number;
  position?: number;
  image?: ProductImage | string;
  [key: string]: any; // Allow additional fields
}

export interface MediaItem {
  id?: string | number;
  url?: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
  source?: string;
  type?: 'image' | 'youtube';
  medium?: {
    url?: string;
  };
  [key: string]: any; // Allow additional fields
}

export interface BillingStatus {
  canGenerate: boolean;
  credits: number;
  hasCredits?: boolean;
  planLimitReached?: boolean;
}

// Defensive normalization helpers
export const normalizeProduct = (product: any): Product => {
  if (!product) return {} as Product;
  return {
    ...product,
    id: product.id || product.gid || '',
    title: product.title || '',
    handle: product.handle || '',
    tags: Array.isArray(product.tags) 
      ? product.tags 
      : (typeof product.tags === 'string' ? product.tags.split(',').map((t: string) => t.trim()) : []),
    description: product.description || product.body_html || '',
    image: product.image || product.image_url || product.featured_image || '',
  };
};

export const normalizeCollection = (collection: any): Collection => {
  if (!collection) return {} as Collection;
  return {
    ...collection,
    id: collection.id || collection.gid || '',
    title: collection.title || '',
    handle: collection.handle || '',
    description: collection.description || '',
    image_url: collection.image?.src || collection.image_url || '',
  };
};

export const mapStringUrlToMediaItem = (url: string, index: number = 0): MediaItem => ({
  id: `url-${index}-${Date.now()}`,
  url,
  src: url,
  alt: `Image ${index + 1}`,
  type: 'image',
});

export const ensureMediaItem = (item: any, index: number = 0): MediaItem => {
  if (typeof item === 'string') {
    return mapStringUrlToMediaItem(item, index);
  }
  if (!item) return mapStringUrlToMediaItem('', index);
  return {
    ...item,
    id: item.id || `item-${index}-${Date.now()}`,
    url: item.url || item.src || '',
    src: item.src || item.url || '',
    type: item.type || 'image',
  };
};