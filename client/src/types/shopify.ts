// Shopify domain types for AdminPanel
export interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string;
  body_html?: string;
  product_type?: string;
  tags?: string | string[];
  image?: string;
  admin_url?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
  description?: string;
  image?: {
    id: string;
    src: string;
    alt?: string;
  };
  image_url?: string;
}

export interface ProductImage {
  id: string | number;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  position?: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price?: string;
  sku?: string;
  inventory_quantity?: number;
  position?: number;
  image?: ProductImage;
}

export interface MediaItem {
  id: string;
  url: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  isPrimary?: boolean;
  source?: string;
  medium?: {
    url: string;
  };
}

export interface BillingStatus {
  canGenerate: boolean;
  credits: number;
  hasCredits?: boolean;
  planLimitReached?: boolean;
}

// Normalization helpers
export const normalizeProduct = (product: any): Product => ({
  ...product,
  tags: Array.isArray(product.tags) 
    ? product.tags 
    : (product.tags?.split(',').map((t: string) => t.trim()) ?? []),
  description: product.description || product.body_html || '',
});

export const normalizeCollection = (collection: any): Collection => ({
  ...collection,
  description: collection.description || '',
  image_url: collection.image?.src || collection.image_url || '',
});

export const mapStringUrlToMediaItem = (url: string, index: number = 0): MediaItem => ({
  id: `url-${index}-${Date.now()}`,
  url,
  src: url,
  alt: `Image ${index + 1}`,
});

export const ensureMediaItem = (item: string | MediaItem, index: number = 0): MediaItem => {
  if (typeof item === 'string') {
    return mapStringUrlToMediaItem(item, index);
  }
  return {
    ...item,
    url: item.url || item.src || '',
    src: item.src || item.url || '',
  };
};