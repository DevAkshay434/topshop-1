import { Router } from 'express';
import { storage } from '../storage';
import { 
  PlanType, 
  PLANS, 
  getPlanConfig, 
  canGenerateContent, 
  incrementUsage, 
  getUsageStats,
  getStoreUsageAndCredits,
  createSubscription,
  getSubscriptionStatus,
  cancelSubscription
} from '../services/billing';

const router = Router();

/**
 * Get all available plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = Object.entries(PLANS).map(([key, config]) => ({
      id: key,
      ...config
    }));
    
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
});

/**
 * Get usage statistics for a store
 */
router.get('/usage/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const storeData = await getStoreUsageAndCredits(storeId);
    
    // Optional: Auto-sync if there seems to be a discrepancy
    // This happens when ?sync=true parameter is passed
    if (req.query.sync === 'true') {
      try {
        const store = await storage.getShopifyStore(storeId);
        if (store) {
          const subscriptionStatus = await getSubscriptionStatus(store);
          
          // Check if there's a mismatch between database and Shopify
          if (storeData.usage.planType !== subscriptionStatus.plan) {
            console.log(`Plan mismatch detected for store ${storeId}: DB=${storeData.usage.planType}, Shopify=${subscriptionStatus.plan}. Auto-syncing...`);
            
            await storage.updateShopifyStore(storeId, {
              planName: subscriptionStatus.plan
            });
            
            // Get updated usage stats
            const updatedStoreData = await getStoreUsageAndCredits(storeId);
            return res.json({
              success: true,
              usage: updatedStoreData.usage,
              credits: updatedStoreData.credits,
              synced: true,
              oldPlan: storeData.usage.planType,
              newPlan: subscriptionStatus.plan
            });
          }
        }
      } catch (syncError) {
        console.error('Error during auto-sync:', syncError);
        // Continue with original usage data if sync fails
      }
    }
    
    res.json({
      success: true,
      usage: storeData.usage,
      credits: storeData.credits
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics'
    });
  }
});

/**
 * Check if a store can generate content
 */
router.get('/check-limits/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const limitCheck = await canGenerateContent(storeId);
    
    res.json({
      success: true,
      ...limitCheck
    });
  } catch (error) {
    console.error('Error checking content limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check content limits'
    });
  }
});

/**
 * Increment usage for a store (called after successful content generation)
 */
router.post('/increment-usage/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    await incrementUsage(storeId);
    
    res.json({
      success: true,
      message: 'Usage incremented successfully'
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment usage'
    });
  }
});

/**
 * Create a subscription for a store
 */
router.post('/subscribe/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    const { planType, returnUrl } = req.body;

    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    if (!Object.values(PlanType).includes(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type'
      });
    }

    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        error: 'Return URL is required'
      });
    }

    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Handle free plan directly without Shopify subscription
    if (planType === PlanType.FREE) {
      await storage.updateShopifyStore(storeId, {
        planName: planType,
        chargeId: null
      });

      return res.json({
        success: true,
        message: 'Successfully subscribed to free plan',
        planType: planType
      });
    }

    // Handle custom plan - requires manual setup
    if (planType === PlanType.CUSTOM) {
      return res.json({
        success: true,
        message: 'Custom plan requires manual setup. Please contact support.',
        requiresContact: true,
        planType: planType
      });
    }

    // Create Shopify subscription for paid plans
    const subscription = await createSubscription(store, planType, returnUrl);
    
    res.json({
      success: true,
      confirmationUrl: subscription.confirmationUrl,
      planType: planType
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription'
    });
  }
});

/**
 * Get current subscription status for a store
 */
router.get('/subscription/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    const subscriptionStatus = await getSubscriptionStatus(store);
    
    res.json({
      success: true,
      subscription: subscriptionStatus
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription status'
    });
  }
});

/**
 * Update store plan (for webhook or manual updates)
 */
router.put('/plan/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    const { planType, chargeId } = req.body;

    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    if (!Object.values(PlanType).includes(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type'
      });
    }

    const updatedStore = await storage.updateShopifyStore(storeId, {
      planName: planType,
      chargeId: chargeId || null
    });

    res.json({
      success: true,
      store: updatedStore,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan'
    });
  }
});

/**
 * Get subscription status for a store - alias for /subscription/:storeId
 */
router.get('/status/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    const subscriptionStatus = await getSubscriptionStatus(store);
    
    res.json({
      success: true,
      subscription: subscriptionStatus
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription status'
    });
  }
});

/**
 * Create subscription without store ID in URL (gets store ID from request body)
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { storeId, planType, returnUrl } = req.body;
    
    if (!storeId || isNaN(parseInt(storeId))) {
      return res.status(400).json({
        success: false,
        error: 'Valid store ID is required'
      });
    }

    if (!Object.values(PlanType).includes(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type'
      });
    }

    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        error: 'Return URL is required'
      });
    }

    const store = await storage.getShopifyStore(parseInt(storeId));
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Handle free plan - no Shopify subscription needed
    if (planType === PlanType.FREE) {
      await storage.updateShopifyStore(store.id, {
        planName: planType,
        chargeId: null
      });
      
      return res.json({
        success: true,
        message: 'Successfully switched to free plan',
        planType: planType
      });
    }

    // Handle custom plan - requires manual setup
    if (planType === PlanType.CUSTOM) {
      return res.json({
        success: true,
        message: 'Custom plan requires manual setup. Please contact support.',
        requiresContact: true,
        planType: planType
      });
    }

    // Create Shopify subscription for paid plans
    const subscription = await createSubscription(store, planType, returnUrl);
    
    res.json({
      success: true,
      confirmationUrl: subscription.confirmationUrl,
      planType: planType
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription'
    });
  }
});

/**
 * Cancel subscription for a store
 */
router.post('/cancel', async (req, res) => {
  try {
    const { storeId } = req.body;
    
    if (!storeId || isNaN(parseInt(storeId))) {
      return res.status(400).json({
        success: false,
        error: 'Valid store ID is required'
      });
    }

    const store = await storage.getShopifyStore(parseInt(storeId));
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Cancel the subscription
    const subscriptionId = store.chargeId || '';
    if (!subscriptionId) {
      // Just update the store to free plan if no active subscription
      await storage.updateShopifyStore(store.id, {
        planName: PlanType.FREE,
        chargeId: null
      });
      
      return res.json({
        success: true,
        message: 'Plan updated to free - no active subscription to cancel'
      });
    }
    
    const result = await cancelSubscription(store, subscriptionId);
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      result
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription'
    });
  }
});

/**
 * Sync plan from Shopify to database (resolves discrepancies)
 */
router.post('/sync-plan/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Get current subscription status from Shopify
    const subscriptionStatus = await getSubscriptionStatus(store);
    
    // Update database with current Shopify plan
    const updatedStore = await storage.updateShopifyStore(storeId, {
      planName: subscriptionStatus.plan
    });
    
    res.json({
      success: true,
      message: 'Plan synced successfully from Shopify',
      oldPlan: store.planName || 'free',
      newPlan: subscriptionStatus.plan,
      subscriptionStatus,
      store: updatedStore
    });
  } catch (error) {
    console.error('Error syncing plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync plan'
    });
  }
});

/**
 * Webhook handler for Shopify subscription events
 */
router.post('/webhook/subscription', async (req, res) => {
  try {
    const { topic, shop, ...eventData } = req.body;
    
    console.log(`Received Shopify webhook: ${topic} for shop: ${shop}`);
    
    // Find the store by shop domain
    const store = await storage.getShopifyStoreByDomain(shop);
    if (!store) {
      console.error(`Store not found for domain: ${shop}`);
      return res.status(404).json({ error: 'Store not found' });
    }
    
    switch (topic) {
      case 'app_subscriptions/update':
        // Handle subscription updates (including payment failures and successes)
        if (eventData.status === 'CANCELLED' || eventData.status === 'DECLINED') {
          console.log(`Subscription ${eventData.status.toLowerCase()} for store ${store.id}. Downgrading to free plan.`);
          
          await storage.updateShopifyStore(store.id, {
            planName: PlanType.FREE,
            chargeId: null
          });
        } else if (eventData.status === 'ACTIVE') {
          console.log(`Subscription payment successful for store ${store.id}. Resetting monthly usage.`);
          
          // Reset usage for the new billing period
          const currentDate = new Date();
          await storage.updateShopifyStore(store.id, {
            currentMonthlyUsage: 0,
            lastUsageReset: currentDate
          });
          
          console.log(`Usage reset completed for store ${store.id} - new billing cycle`);
        }
        break;
        
      case 'app/uninstalled':
        // Handle app uninstallation
        console.log(`App uninstalled for store ${store.id}. Setting as uninstalled.`);
        
        await storage.updateShopifyStore(store.id, {
          isConnected: false,
          uninstalledAt: new Date(),
          planName: PlanType.FREE,
          chargeId: null
        });
        break;
        
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing subscription webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Monthly payment verification job (can be called via cron)
 */
router.post('/verify-payments', async (req, res) => {
  try {
    const stores = await storage.getShopifyStores();
    const results = [];
    
    for (const store of stores) {
      // Skip free plans and unconnected stores
      if (!store.isConnected || store.planName === PlanType.FREE) {
        continue;
      }
      
      try {
        const subscriptionStatus = await getSubscriptionStatus(store);
        
        // Check if subscription is still active and payments are current
        if (!subscriptionStatus.active || subscriptionStatus.plan === PlanType.FREE) {
          console.log(`Monthly verification: Downgrading store ${store.id} due to payment failure`);
          
          await storage.updateShopifyStore(store.id, {
            planName: PlanType.FREE
          });
          
          results.push({
            storeId: store.id,
            shop: store.shopName,
            action: 'downgraded',
            reason: 'payment_failed'
          });
        } else {
          results.push({
            storeId: store.id,
            shop: store.shopName,
            action: 'verified',
            plan: subscriptionStatus.plan
          });
        }
      } catch (error) {
        console.error(`Error verifying payments for store ${store.id}:`, error);
        
        results.push({
          storeId: store.id,
          shop: store.shopName,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Verified ${stores.length} stores`,
      results
    });
  } catch (error) {
    console.error('Error in payment verification job:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

// Webhook endpoint for handling Stripe subscription events
router.post('/webhook', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }

    // For now, we'll handle this via Shopify's own webhook system
    // But this endpoint is ready for direct Stripe webhooks if needed
    res.json({ received: true, message: 'Webhook handling via Shopify subscriptions' });
  } catch (error: any) {
    console.error('Error processing billing webhook:', error);
    res.status(400).json({ error: error.message });
  }
});

// Enhanced usage reset endpoint for recurring payment success
router.post('/reset-usage/:storeId', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid store ID'
      });
    }

    // Reset usage and update last reset date
    const currentDate = new Date();
    const updatedStore = await storage.updateShopifyStore(storeId, {
      currentMonthlyUsage: 0,
      lastUsageReset: currentDate
    });

    console.log(`Manual usage reset for store ${storeId} completed`);

    res.json({
      success: true,
      message: 'Usage reset successfully',
      resetDate: currentDate,
      store: updatedStore
    });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset usage'
    });
  }
});

export default router;