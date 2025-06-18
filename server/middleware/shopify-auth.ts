import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { ShopifyStore } from '@shared/schema';

// Extend Express Request type to include Shopify store information
declare global {
  namespace Express {
    interface Request {
      shopifyStore?: ShopifyStore;
      shop?: string;
      isEmbedded?: boolean;
    }
  }
}

/**
 * Middleware to authenticate and authorize Shopify store requests
 * Extracts shop domain from various sources and validates store access
 */
export async function shopifyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract shop domain from various sources
    const shop = extractShopDomain(req);
    
    if (!shop) {
      return res.status(401).json({ 
        error: 'Missing shop parameter', 
        message: 'Shop domain is required for authentication' 
      });
    }

    // Validate shop domain format
    if (!isValidShopDomain(shop)) {
      return res.status(400).json({ 
        error: 'Invalid shop domain', 
        message: 'Shop domain must be in format: shop-name.myshopify.com' 
      });
    }

    // Get store from database
    const store = await storage.getStoreByShopName(shop);
    
    if (!store) {
      return res.status(404).json({ 
        error: 'Store not found', 
        message: 'This store is not installed or has been uninstalled' 
      });
    }

    // Check if store is still active
    if (store.uninstalledAt) {
      return res.status(403).json({ 
        error: 'Store uninstalled', 
        message: 'This store has been uninstalled. Please reinstall the app.' 
      });
    }

    // Attach store information to request
    req.shopifyStore = store;
    req.shop = shop;
    req.isEmbedded = req.headers['x-shopify-shop-domain'] !== undefined;

    next();
  } catch (error: any) {
    console.error('Shopify auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error', 
      message: 'Failed to authenticate store access' 
    });
  }
}

/**
 * Extract shop domain from request (headers, query params, or body)
 */
function extractShopDomain(req: Request): string | null {
  // Check Shopify embedded app headers first
  const headerShop = req.headers['x-shopify-shop-domain'] as string;
  if (headerShop) return headerShop;

  // Check query parameters
  const queryShop = req.query.shop as string;
  if (queryShop) return queryShop;

  // Check request body
  const bodyShop = req.body?.shop as string;
  if (bodyShop) return bodyShop;

  // Check session if available
  const sessionShop = (req as any).session?.shop as string;
  if (sessionShop) return sessionShop;

  return null;
}

/**
 * Validate Shopify shop domain format
 */
function isValidShopDomain(shop: string): boolean {
  if (!shop) return false;
  
  // Basic validation for Shopify domain format
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$/;
  return shopRegex.test(shop);
}

/**
 * Middleware that requires a valid Shopify store but is more lenient for OAuth flows
 * Used for OAuth callback routes where the store might not be fully set up yet
 */
export async function shopifyAuthOptional(req: Request, res: Response, next: NextFunction) {
  try {
    const shop = extractShopDomain(req);
    
    if (!shop) {
      req.shop = undefined;
      req.shopifyStore = undefined;
      return next();
    }

    if (!isValidShopDomain(shop)) {
      req.shop = undefined;
      req.shopifyStore = undefined;
      return next();
    }

    const store = await storage.getStoreByShopName(shop);
    
    req.shopifyStore = store || undefined;
    req.shop = shop;
    req.isEmbedded = req.headers['x-shopify-shop-domain'] !== undefined;

    next();
  } catch (error: any) {
    console.error('Optional Shopify auth error:', error);
    // Don't fail the request, just continue without store info
    req.shop = undefined;
    req.shopifyStore = undefined;
    next();
  }
}

/**
 * Utility function to generate install URL for a shop
 */
export function generateInstallUrl(shop: string, scopes: string[], redirectUri: string): string {
  const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY || '',
    scope: scopes.join(','),
    redirect_uri: redirectUri,
    state: generateNonce(), // Add CSRF protection
  });

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Generate a random nonce for CSRF protection
 */
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Verify HMAC signature from Shopify webhooks
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    console.warn('SHOPIFY_WEBHOOK_SECRET not set, skipping webhook verification');
    return true; // Allow in development, but warn
  }

  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');

  return hash === signature;
}