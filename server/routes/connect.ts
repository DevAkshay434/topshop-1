import { Router, Request, Response } from 'express';
import crypto from 'crypto';
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
    const shopDomain = validateShopDomain(shop);
    
    if (!shopDomain) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop domain"
      });
    }
    
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
    // Using the createAuthUrl helper from oauth service
    const authUrl = createAuthUrl(
      shopDomain,
      apiKey,
      redirectUri,
      nonce,
      'read_products,write_products,read_content,write_content,read_themes,write_publications'
    );
    
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

export default router;