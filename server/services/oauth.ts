import axios from 'axios';
import crypto from 'crypto';

// Constants for OAuth process (would come from environment variables in production)
const SCOPES = 'read_products,write_products,read_content,write_content,read_themes';

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
export function createAuthUrl(shop: string, apiKey: string, redirectUri: string, state: string): string {
  return `https://${shop}/admin/oauth/authorize?` +
    `client_id=${apiKey}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;
}

/**
 * Validate the HMAC signature from Shopify
 */
export function validateHmac(query: Record<string, string>, apiSecret: string): boolean {
  const hmac = query.hmac;
  const { hmac: _hmac, signature: _signature, ...rest } = query;

  // Create array of key=value pairs, sorted by key
  const message = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('&');

  const generatedHash = crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('hex');

  return hmac === generatedHash;
}

/**
 * Exchange the authorization code for a permanent access token
 */
export async function getAccessToken(shop: string, code: string, apiKey: string, apiSecret: string): Promise<string> {
  try {
    // Use the exact same redirect_uri that was used in the initial auth request
    const redirectUri = `https://e351400e-4d91-4b59-8d02-6b2e1e1d3ebd-00-2dn7uhcj3pqiy.worf.replit.dev/shopify/callback`;
    
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code,
        redirect_uri: redirectUri
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
export function verifyWebhook(headers: Record<string, string>, body: string, apiSecret: string): boolean {
  const hmac = headers['x-shopify-hmac-sha256'];
  const generatedHash = crypto
    .createHmac('sha256', apiSecret)
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