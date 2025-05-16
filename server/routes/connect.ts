import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { storage } from '../storage';
import { validateShopDomain, createAuthUrl } from '../services/oauth';

// Store nonce data for CSRF protection
export const nonceStore = new Map<string, NonceData>();

// Define the nonce data interface
export interface NonceData {
  shop: string;
  timestamp: number;
  host?: string;
}

const router = Router();

// Initialize the Shopify OAuth flow
router.post("/initiate", async (req: Request, res: Response) => {
  try {
    const { shop } = req.body;
    
    if (!shop) {
      return res.status(400).json({
        success: false,
        message: "Shop domain is required"
      });
    }
    
    // Validate shop domain
    if (!validateShopDomain(shop)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop domain"
      });
    }
    
    // Use the shop domain provided by the user
    const shopDomain = shop;
    
    // Check if API key is configured
    const apiKey = process.env.SHOPIFY_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Missing Shopify API credentials"
      });
    }
    
    // Generate a nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Store nonce data
    const nonceData: NonceData = {
      shop: shopDomain,
      timestamp: Date.now()
    };
    
    nonceStore.set(nonce, nonceData);
    
    // Use app URL for OAuth callback
    const hostname = req.headers.host || 'localhost:5000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${hostname}`;
    
    const redirectUri = `${baseUrl}/oauth/shopify/callback`;
    
    // Create the auth URL with the required scopes
    // Create the URL manually since the helper function might not be compatible
    const scopes = 'read_products,write_products,read_content,write_content,read_themes,write_publications';
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${nonce}`;
    
    // Return the URL to the client
    return res.json({
      success: true,
      authUrl
    });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate authentication URL"
    });
  }
});

// OAuth callback handler
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { shop, code, state } = req.query;
    
    // Validate required parameters
    if (!shop || !code || !state) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }
    
    // Validate shop domain
    if (!validateShopDomain(shop as string)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop domain"
      });
    }
    
    // Verify the state/nonce matches one we stored
    const nonceData = nonceStore.get(state as string);
    
    if (!nonceData || nonceData.shop !== shop) {
      return res.status(403).json({
        success: false,
        message: "Invalid state parameter"
      });
    }
    
    // Check if nonce is expired (10 minute expiry)
    const expiryTime = nonceData.timestamp + (10 * 60 * 1000);
    if (Date.now() > expiryTime) {
      nonceStore.delete(state as string);
      return res.status(403).json({
        success: false,
        message: "Authorization request expired"
      });
    }
    
    // Exchange the code for an access token
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        success: false,
        message: "Missing API credentials"
      });
    }
    
    // Get the access token from Shopify
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: apiKey,
        client_secret: apiSecret,
        code
      }
    );
    
    const { access_token, scope } = tokenResponse.data;
    
    if (!access_token) {
      return res.status(500).json({
        success: false,
        message: "Failed to get access token"
      });
    }
    
    // Get the shop info
    const shopResponse = await axios.get(
      `https://${shop}/admin/api/2023-10/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': access_token
        }
      }
    );
    
    const shopData = shopResponse.data.shop;
    
    // Check if the store is already connected
    let existingStore = await storage.getShopifyStoreByDomain(shop as string);
    
    if (existingStore) {
      // Update the existing store connection
      existingStore = await storage.updateShopifyStore(existingStore.id, {
        accessToken: access_token,
        scope,
        isConnected: true,
        uninstalledAt: null
      });
      
      // Create success sync activity
      await storage.createSyncActivity({
        storeId: existingStore.id,
        activity: `Reconnected to Shopify store ${shopData.name}`,
        status: "success",
        details: "Updated connection details"
      });
    } else {
      // Create a new store connection
      existingStore = await storage.createShopifyStore({
        shopName: shop as string,
        accessToken: access_token,
        scope,
        isConnected: true
      });
      
      // Create success sync activity
      await storage.createSyncActivity({
        storeId: existingStore.id,
        activity: `Connected to Shopify store ${shopData.name}`,
        status: "success",
        details: "Established new connection"
      });
    }
    
    // Clean up the nonce
    nonceStore.delete(state as string);
    
    // Redirect back to the admin with success message
    return res.redirect(`/?success=true&store=${encodeURIComponent(shop as string)}`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    // Redirect back to the admin with error message
    return res.redirect(`/?error=${encodeURIComponent(error.message || "Connection failed")}`);
  }
});

export default router;