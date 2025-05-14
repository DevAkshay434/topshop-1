/**
 * Types for Shopify API integration
 */

export type ShopifyStore = {
  id: number;
  shopName: string;
  accessToken: string;
  scope: string;
  isConnected: boolean | null;
  defaultBlogId?: string | null;
  lastSynced?: Date | null;
  installedAt?: Date;
  uninstalledAt?: Date | null;
  planName?: string | null;
  chargeId?: string | null;
  trialEndsAt?: Date | null;
};

export interface ShopifyBlog {
  id: string;
  title: string;
}

export interface ShopifyShop {
  id: string;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  source: string;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  currency: string;
  iana_timezone: string; // IANA timezone format (e.g., "America/New_York")
  timezone: string; // String representation (e.g., "Eastern Time (US & Canada)")
}

export interface ShopifyArticle {
  id: string;
  title: string;
  author: string;
  published_at: string;
  updated_at: string;
  created_at: string;
  body_html: string;
  blog_id: string;
  summary_html: string;
  published: boolean;
  tags: string;
  status?: string; // 'active' or 'draft'
}

export interface ShopifyBlogPost {
  id: number;
  status: string;
  title: string;
  content: string;
  featuredImage?: string | null;
  publishedDate?: Date | null;
  scheduledDate?: Date | null;
  scheduledPublishDate?: string | null;
  scheduledPublishTime?: string | null;
  shopifyPostId?: string | null;
  shopifyBlogId?: string | null;
  author?: string | null;
  tags?: string | null;
  category?: string | null;
  categories?: string | null;
  publicationType?: string | null;
}