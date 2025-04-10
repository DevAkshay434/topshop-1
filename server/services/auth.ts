import axios from 'axios';
import { ShopifyStore } from '@shared/schema';
import crypto from 'crypto';

// Constants for OAuth process
const API_KEY = process.env.SHOPIFY_API_KEY || '';
const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const SCOPES = 'read_products,write_products,read_content,write_content,read_themes';
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI || '';

/**
 * Validate a Shopify myshopify.com domain
 */
export function validateShopDomain(shop: string): boolean {
  // Shopify domains are [name].myshopify.com
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
}

/**
 * Generate a random nonce for the OAuth flow
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create the authorization URL for a shop
 */
export function createAuthUrl(shop: string, state: string): string {
  return `https://${shop}/admin/oauth/authorize?` +
    `client_id=${API_KEY}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${state}`;
}

/**
 * Validate the HMAC signature from Shopify
 */
export function validateHmac(query: Record<string, string>): boolean {
  const hmac = query.hmac;
  const { hmac: _hmac, signature: _signature, ...rest } = query;

  // Create array of key=value pairs, sorted by key
  const message = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('&');

  const generatedHash = crypto
    .createHmac('sha256', API_SECRET)
    .update(message)
    .digest('hex');

  return hmac === generatedHash;
}

/**
 * Exchange the authorization code for a permanent access token
 */
export async function getAccessToken(shop: string, code: string): Promise<string> {
  try {
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: API_KEY,
        client_secret: API_SECRET,
        code
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to exchange code for access token');
  }
}

/**
 * Verify that a webhook request is legitimate
 */
export function verifyWebhook(headers: Record<string, string>, body: string): boolean {
  const hmac = headers['x-shopify-hmac-sha256'];
  const generatedHash = crypto
    .createHmac('sha256', API_SECRET)
    .update(body)
    .digest('base64');
  
  return hmac === generatedHash;
}

/**
 * Get shop data from Shopify
 */
export async function getShopData(shop: string, accessToken: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2023-07/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      }
    );
    
    return response.data.shop;
  } catch (error) {
    console.error('Error fetching shop data:', error);
    throw new Error('Failed to fetch shop data');
  }
}