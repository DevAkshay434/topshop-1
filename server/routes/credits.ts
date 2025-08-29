import { Router, Request, Response } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { storage } from "../storage";
import { canGenerateContentWithCredits, consumeUsageForContentGeneration, getStoreUsageAndCredits } from "../services/billing";

// Initialize Stripe only if the secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-07-30.basil",
  });
  console.log('Stripe initialized successfully for credit purchases');
} else {
  console.warn('STRIPE_SECRET_KEY not found - credit purchase functionality will be disabled');
}

const creditsRouter = Router();

// Helper function to get store from request headers (similar to other routes)
async function getStoreFromRequest(req: Request) {
  try {
    const storeIdHeader = req.headers['x-store-id'];
    if (storeIdHeader) {
      const storeId = parseInt(storeIdHeader as string, 10);
      if (!isNaN(storeId)) {
        const store = await storage.getShopifyStore(storeId);
        if (store) {
          return store;
        }
      }
    }
    
    // Fallback to first connected store
    const stores = await storage.getShopifyStores();
    const connectedStore = stores.find(store => store.isConnected);
    if (connectedStore) {
      console.log(`Using fallback store: ${connectedStore.shopName} (ID: ${connectedStore.id})`);
      return connectedStore;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting store from request:', error);
    return null;
  }
}

// Get available credit packages
creditsRouter.get("/packages", async (req: Request, res: Response) => {
  try {
    const packages = await storage.getActiveCreditPackages();
    res.json({
      success: true,
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        credits: pkg.credits,
        price: pkg.price / 100, // Convert cents to dollars
        pricePerCredit: (pkg.price / 100 / pkg.credits).toFixed(2)
      }))
    });
  } catch (error: any) {
    console.error('Error fetching credit packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit packages',
      message: error.message
    });
  }
});

// Get store's current credits and usage
creditsRouter.get("/status", async (req: Request, res: Response) => {
  try {
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: 'Store not found'
      });
    }

    const storeStatus = await getStoreUsageAndCredits(store.id);
    
    res.json({
      success: true,
      storeId: store.id,
      storeName: store.shopName,
      ...storeStatus
    });
  } catch (error: any) {
    console.error('Error fetching store credits status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credits status',
      message: error.message
    });
  }
});

// Create payment intent for credit purchase
creditsRouter.post("/purchase", async (req: Request, res: Response) => {
  try {
    // Check if Stripe is available
    if (!stripe) {
      return res.status(503).json({
        success: false,
        error: 'Credit purchases unavailable',
        message: 'Payment processing is not configured. Please contact support.'
      });
    }

    const reqSchema = z.object({
      packageId: z.number().int().positive()
    });
    
    const { packageId } = reqSchema.parse(req.body);
    
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Get the credit package
    const packages = await storage.getCreditPackages();
    const selectedPackage = packages.find(pkg => pkg.id === packageId);
    
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        error: 'Credit package not found'
      });
    }

    if (!selectedPackage.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Credit package is not available'
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPackage.price, // Amount in cents
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        storeId: store.id.toString(),
        packageId: packageId.toString(),
        credits: selectedPackage.credits.toString(),
        type: 'credit_purchase'
      }
    });

    // Create pending credit purchase record
    const creditPurchase = await storage.createCreditPurchase({
      storeId: store.id,
      packageId: packageId,
      creditsAdded: selectedPackage.credits,
      pricePaid: selectedPackage.price,
      paymentIntentId: paymentIntent.id,
      status: 'pending'
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      purchaseId: creditPurchase.id,
      packageDetails: {
        name: selectedPackage.name,
        credits: selectedPackage.credits,
        price: selectedPackage.price / 100
      }
    });

  } catch (error: any) {
    console.error('Error creating credit purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create credit purchase',
      message: error.message
    });
  }
});

// Webhook to handle successful credit purchase
creditsRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Check if Stripe is available
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Webhooks unavailable',
        message: 'Payment processing is not configured'
      });
    }

    const sig = req.headers['stripe-signature'];
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      if (paymentIntent.metadata.type === 'credit_purchase') {
        const storeId = parseInt(paymentIntent.metadata.storeId);
        const credits = parseInt(paymentIntent.metadata.credits);
        
        // Update credit purchase status
        const purchases = await storage.getCreditPurchaseHistory(storeId);
        const purchase = purchases.find(p => p.paymentIntentId === paymentIntent.id);
        
        if (purchase) {
          await storage.updateCreditPurchase(purchase.id, { status: 'completed' });
          
          // Add credits to store
          await storage.addCreditsToStore(storeId, credits);
          
          console.log(`Successfully added ${credits} credits to store ${storeId}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing credit purchase webhook:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get credit purchase history
creditsRouter.get("/history", async (req: Request, res: Response) => {
  try {
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: 'Store not found'
      });
    }

    const history = await storage.getCreditPurchaseHistory(store.id);
    const packages = await storage.getCreditPackages();
    
    // Enrich history with package details
    const enrichedHistory = history.map(purchase => {
      const packageInfo = packages.find(pkg => pkg.id === purchase.packageId);
      return {
        id: purchase.id,
        credits: purchase.creditsAdded,
        price: purchase.pricePaid / 100,
        status: purchase.status,
        purchaseDate: purchase.purchaseDate,
        packageName: packageInfo?.name || 'Unknown Package'
      };
    });

    res.json({
      success: true,
      history: enrichedHistory
    });
  } catch (error: any) {
    console.error('Error fetching credit purchase history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase history',
      message: error.message
    });
  }
});

// Get credit transactions (usage history)
creditsRouter.get("/transactions", async (req: Request, res: Response) => {
  try {
    const store = await getStoreFromRequest(req);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: 'Store not found'
      });
    }

    const transactions = await storage.getCreditTransactions(store.id);
    
    res.json({
      success: true,
      transactions: transactions.map(txn => ({
        id: txn.id,
        creditsUsed: txn.creditsUsed,
        type: txn.transactionType,
        description: txn.description,
        date: txn.transactionDate,
        postId: txn.postId
      }))
    });
  } catch (error: any) {
    console.error('Error fetching credit transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit transactions',
      message: error.message
    });
  }
});

// Demo endpoint for adding credits (bypasses Stripe for testing)
creditsRouter.post("/add-demo-credits", async (req: Request, res: Response) => {
  try {
    const reqSchema = z.object({
      storeId: z.number().int().positive(),
      credits: z.number().int().positive(),
      reason: z.string().optional()
    });
    
    const { storeId, credits, reason } = reqSchema.parse(req.body);
    
    // Add credits directly to the store
    await storage.addCreditsToStore(storeId, credits);
    
    // Create a transaction record
    await storage.createCreditTransaction({
      storeId,
      creditsUsed: 0, // This is credits added, not used
      transactionType: 'purchase',
      description: reason || `Demo credit purchase: ${credits} credits added`
    });
    
    console.log(`Demo: Added ${credits} credits to store ${storeId}`);
    
    res.json({
      success: true,
      message: `Successfully added ${credits} credits to your account`,
      creditsAdded: credits
    });
    
  } catch (error: any) {
    console.error('Error adding demo credits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add demo credits',
      message: error.message
    });
  }
});

export default creditsRouter;