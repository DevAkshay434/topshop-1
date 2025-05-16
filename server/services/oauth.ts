import axios from 'axios';
import crypto from 'crypto';

// Validate shop domain format
export function validateShopDomain(shop: string): boolean {
  // Validate shop domain format
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  return shopRegex.test(shop);
}

// Create auth URL for OAuth flow
export function createAuthUrl(
  shop: string,
  apiKey: string,
  redirectUri: string,
  nonce: string,
  scopes: string
): string {
  return `https://${shop}/admin/oauth/authorize?` +
    `client_id=${apiKey}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${nonce}`;
}

// Verify the HMAC signature from Shopify
export function verifyHmac(
  query: Record<string, string>,
  secret: string
): boolean {
  const hmac = query.hmac;
  
  if (!hmac) {
    return false;
  }
  
  // Create a new object without the hmac parameter
  const map = Object.assign({}, query);
  delete map['hmac'];
  
  // Sort parameters alphabetically
  const orderedMap = Object.keys(map)
    .sort()
    .reduce((obj: Record<string, string>, key) => {
      obj[key] = map[key];
      return obj;
    }, {});
  
  // Create query string and compute HMAC
  const message = Object.keys(orderedMap)
    .map(key => `${key}=${orderedMap[key]}`)
    .join('&');
  
  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(computedHmac)
  );
}

// Exchange authorization code for permanent access token
export async function getAccessToken(
  shop: string,
  code: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  try {
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code: code
      }
    );
    
    return response.data.access_token;
  } catch (error: any) {
    console.error('Error getting access token:', error.message);
    throw new Error('Failed to get access token');
  }
}