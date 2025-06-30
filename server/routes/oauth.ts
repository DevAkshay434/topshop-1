import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { shopifyAuthOptional, generateInstallUrl, verifyWebhookSignature } from '../middleware/shopify-auth';
import crypto from 'crypto';

const router = Router();

// Required Shopify App scopes
const REQUIRED_SCOPES = [
  'read_products',
  'read_collections',
  'read_content',
  'write_content',
  'read_themes',
  'write_themes',
  'read_files',
  'write_files'
];

/**
 * OAuth installation endpoint - generates and redirects to Shopify OAuth URL
 */
router.get('/install', shopifyAuthOptional, async (req: Request, res: Response) => {
  try {
    const shop = req.query.shop as string;
    
    if (!shop) {
      return res.status(400).json({ 
        error: 'Missing shop parameter',
        message: 'Please provide a valid shop domain'
      });
    }

    // Validate shop domain format
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$/;
    
    if (!shopRegex.test(shopDomain)) {
      return res.status(400).json({
        error: 'Invalid shop domain',
        message: 'Shop domain must be in format: shop-name.myshopify.com'
      });
    }

    // Generate OAuth URL
    const redirectUri = `${process.env.SHOPIFY_APP_URL || 'https://your-app.replit.app'}/oauth/callback`;
    const installUrl = generateInstallUrl(shopDomain, REQUIRED_SCOPES, redirectUri);

    // Store state for verification (in production, use Redis or database)
    const state = crypto.randomBytes(16).toString('hex');
    
    // Redirect to Shopify OAuth
    res.redirect(installUrl);
  } catch (error: any) {
    console.error('OAuth install error:', error);
    res.status(500).json({ 
      error: 'Installation failed', 
      message: 'Failed to initiate OAuth flow' 
    });
  }
});

/**
 * OAuth callback endpoint - handles token exchange
 */
router.get('/callback', shopifyAuthOptional, async (req: Request, res: Response) => {
  try {
    const { shop, code, state } = req.query;

    if (!shop || !code) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Shop and authorization code are required'
      });
    }

    const shopDomain = shop as string;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code: code as string,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, scope } = tokenData;

    // Verify we got the required scopes
    const grantedScopes = scope.split(',').map((s: string) => s.trim());
    const missingScopes = REQUIRED_SCOPES.filter(s => !grantedScopes.includes(s));
    
    if (missingScopes.length > 0) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Missing required scopes: ${missingScopes.join(', ')}`
      });
    }

    // Check if store already exists
    let store = await storage.getStoreByShopName(shopDomain);
    
    if (store) {
      // Update existing store
      store = await storage.updateShopifyStore(store.id, {
        accessToken: access_token,
        scope: scope,
        isConnected: true,
        uninstalledAt: null,
        lastSynced: new Date()
      });
    } else {
      // Create new store
      store = await storage.createShopifyStore({
        shopName: shopDomain,
        accessToken: access_token,
        scope: scope,
        isConnected: true
      });
    }

    // Get shop information to set default blog
    try {
      const shopInfoResponse = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': access_token,
        },
      });

      if (shopInfoResponse.ok) {
        const shopInfo = await shopInfoResponse.json();
        console.log(`Store ${shopDomain} connected successfully:`, shopInfo.shop.name);
      }

      // Get blogs to set default
      const blogsResponse = await fetch(`https://${shopDomain}/admin/api/2024-10/blogs.json`, {
        headers: {
          'X-Shopify-Access-Token': access_token,
        },
      });

      if (blogsResponse.ok) {
        const blogsData = await blogsResponse.json();
        if (blogsData.blogs && blogsData.blogs.length > 0) {
          const defaultBlog = blogsData.blogs[0];
          await storage.updateShopifyStore(store.id, {
            defaultBlogId: defaultBlog.id.toString()
          });
        }
      }
    } catch (apiError) {
      console.warn('Failed to fetch shop info during installation:', apiError);
      // Don't fail the installation for this
    }

    // Set up webhook for app uninstallation (mandatory for App Store)
    try {
      await createUninstallWebhook(shopDomain, access_token);
    } catch (webhookError) {
      console.warn('Failed to create uninstall webhook:', webhookError);
      // Don't fail installation for webhook setup
    }

    // Redirect to app (either embedded or standalone)
    const redirectUrl = req.query.embedded === 'true' 
      ? `https://${shopDomain}/admin/apps/${process.env.SHOPIFY_API_KEY}`
      : `${process.env.SHOPIFY_APP_URL || 'https://your-app.replit.app'}?shop=${shopDomain}`;

    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ 
      error: 'Installation failed', 
      message: error.message || 'Failed to complete OAuth flow' 
    });
  }
});

/**
 * Webhook endpoint for app uninstallation
 */
router.post('/webhooks/app/uninstalled', async (req: Request, res: Response) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    if (!hmacHeader || !verifyWebhookSignature(body, hmacHeader)) {
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    const { domain } = req.body;
    const shopDomain = domain.includes('.myshopify.com') ? domain : `${domain}.myshopify.com`;

    // Mark store as uninstalled
    const store = await storage.getStoreByShopName(shopDomain);
    if (store) {
      await storage.updateShopifyStore(store.id, {
        isConnected: false,
        uninstalledAt: new Date()
      });

      console.log(`App uninstalled for store: ${shopDomain}`);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Uninstall webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Health check endpoint for OAuth system
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    scopes: REQUIRED_SCOPES
  });
});

/**
 * Create mandatory app uninstallation webhook
 */
async function createUninstallWebhook(shop: string, accessToken: string): Promise<void> {
  const webhookUrl = `${process.env.SHOPIFY_APP_URL || 'https://your-app.replit.app'}/oauth/webhooks/app/uninstalled`;
  
  const webhookData = {
    webhook: {
      topic: 'app/uninstalled',
      address: webhookUrl,
      format: 'json'
    }
  };

  const response = await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create webhook: ${response.statusText}`);
  }

  console.log(`Uninstall webhook created for ${shop}`);
}

export default router;