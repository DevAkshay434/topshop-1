import axios from 'axios';
import { ShopifyStore } from '@shared/schema';
import { storage } from '../storage';

// Define the subscription plan options
export enum PlanType {
  FREE = 'free',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
  CUSTOM = 'custom'
}

export interface PlanConfig {
  name: string;
  price: number; // Price in USD
  trialDays: number;
  features: string[];
  blogPostsPerMonth: number; // Monthly limit for blog/page generation
  description: string;
}

// Configure different plan tiers
export const PLANS: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    name: 'Free Plan',
    price: 0,
    trialDays: 0,
    blogPostsPerMonth: 5,
    description: 'Perfect for trying out our AI content generation',
    features: [
      'Generate up to 5 blog posts/pages per month',
      'Basic SEO tools',
      'Manual publishing',
      'Standard AI content quality',
      'Community support'
    ]
  },
  [PlanType.SILVER]: {
    name: 'Silver Plan',
    price: 19.99,
    trialDays: 14,
    blogPostsPerMonth: 25,
    description: 'Great for small businesses starting their content journey',
    features: [
      'Generate up to 25 blog posts/pages per month',
      'Advanced SEO suggestions',
      'Scheduled publishing',
      'Enhanced AI content quality',
      'Post analytics',
      'Email support'
    ]
  },
  [PlanType.GOLD]: {
    name: 'Gold Plan',
    price: 39.99,
    trialDays: 14,
    blogPostsPerMonth: 75,
    description: 'Perfect for growing businesses with regular content needs',
    features: [
      'Generate up to 75 blog posts/pages per month',
      'Premium AI content quality',
      'Advanced analytics dashboard',
      'Keyword research tools',
      'Custom content templates',
      'Priority email support',
      'Bulk content generation'
    ]
  },
  [PlanType.DIAMOND]: {
    name: 'Diamond Plan',
    price: 79.99,
    trialDays: 14,
    blogPostsPerMonth: 200,
    description: 'For enterprises and agencies with high-volume content needs',
    features: [
      'Generate up to 200 blog posts/pages per month',
      'Premium AI content quality',
      'Advanced analytics with custom reports',
      'Priority support with dedicated account manager',
      'Custom branding and white-label options',
      'API access for integrations',
      'Multi-store management dashboard',
      'Advanced scheduling and automation'
    ]
  },
  [PlanType.CUSTOM]: {
    name: 'Custom Plan',
    price: 0, // Price determined during consultation
    trialDays: 30,
    blogPostsPerMonth: -1, // Unlimited or custom limit
    description: 'Tailored solutions for unique business requirements',
    features: [
      'Custom blog post/page generation limits',
      'Bespoke AI content optimization',
      'Custom integrations and workflows',
      'Dedicated support team',
      'Service level agreements (SLA)',
      'Custom training and onboarding',
      'Enterprise security compliance',
      'Custom reporting and analytics'
    ]
  }
};

/**
 * Create a subscription for a store
 */
export async function createSubscription(
  store: ShopifyStore, 
  plan: PlanType,
  returnUrl: string
): Promise<{ confirmationUrl: string }> {
  if (!store?.accessToken || !store?.shopName) {
    throw new Error('Invalid store data for subscription creation');
  }

  // Get plan configuration
  const planConfig = PLANS[plan];
  if (!planConfig) {
    throw new Error(`Invalid plan type: ${plan}`);
  }

  try {
    // Create a GraphQL client for the store
    const shopGraphQLUrl = `https://${store.shopName}/admin/api/2025-07/graphql.json`;
    
    // Create a recurring application charge
    const response = await axios({
      url: shopGraphQLUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      },
      data: {
        query: `
          mutation {
            appSubscriptionCreate(
              name: "${planConfig.name}",
              returnUrl: "${returnUrl}",
              test: ${process.env.NODE_ENV !== 'production'},
              lineItems: [
                {
                  plan: {
                    appRecurringPricingDetails: {
                      price: { amount: ${planConfig.price}, currencyCode: USD }
                    }
                  }
                }
              ],
              trialDays: ${planConfig.trialDays}
            ) {
              appSubscription {
                id
                status
              }
              confirmationUrl
              userErrors {
                field
                message
              }
            }
          }
        `
      }
    });

    const result = response.data?.data?.appSubscriptionCreate;
    
    // Check for errors
    if (result?.userErrors?.length > 0) {
      throw new Error(`Shopify subscription error: ${result.userErrors[0].message}`);
    }
    
    return {
      confirmationUrl: result.confirmationUrl
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current subscription status for a store
 */
export async function getSubscriptionStatus(store: ShopifyStore): Promise<{
  active: boolean;
  plan: PlanType;
  trialDays: number;
  trialEndsAt: string | null;
}> {
  if (!store?.accessToken || !store?.shopName) {
    throw new Error('Invalid store data for subscription status check');
  }
  
  try {
    // Create a GraphQL client for the store
    const shopGraphQLUrl = `https://${store.shopName}/admin/api/2025-07/graphql.json`;
    
    // Query the active subscriptions
    const response = await axios({
      url: shopGraphQLUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      },
      data: {
        query: `
          {
            currentAppInstallation {
              activeSubscriptions {
                id
                name
                status
                trialDays
                currentPeriodEnd
                test
              }
            }
          }
        `
      }
    });

    const activeSubscriptions = response.data?.data?.currentAppInstallation?.activeSubscriptions || [];
    
    // Check if there's an active subscription
    if (activeSubscriptions.length > 0) {
      const subscription = activeSubscriptions[0];
      
      // Determine plan type from subscription name
      let plan = PlanType.FREE;
      if (subscription.name.toLowerCase().includes('diamond')) {
        plan = PlanType.DIAMOND;
      } else if (subscription.name.toLowerCase().includes('gold')) {
        plan = PlanType.GOLD;
      } else if (subscription.name.toLowerCase().includes('silver')) {
        plan = PlanType.SILVER;
      } else if (subscription.name.toLowerCase().includes('custom')) {
        plan = PlanType.CUSTOM;
      }
      
      return {
        active: subscription.status === 'ACTIVE',
        plan,
        trialDays: subscription.trialDays || 0,
        trialEndsAt: subscription.currentPeriodEnd || null
      };
    }
    
    // Default to free plan if no active subscriptions
    return {
      active: true, // Free plan is always active
      plan: PlanType.FREE,
      trialDays: 0,
      trialEndsAt: null
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    // Default to free plan on error
    return {
      active: true,
      plan: PlanType.FREE,
      trialDays: 0,
      trialEndsAt: null
    };
  }
}

/**
 * Cancel a subscription for a store
 */
export async function cancelSubscription(store: ShopifyStore, subscriptionId: string): Promise<boolean> {
  if (!store?.accessToken || !store?.shopName) {
    throw new Error('Invalid store data for subscription cancellation');
  }
  
  try {
    // Create a GraphQL client for the store
    const shopGraphQLUrl = `https://${store.shopName}/admin/api/2025-07/graphql.json`;
    
    // Cancel the subscription
    const response = await axios({
      url: shopGraphQLUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      },
      data: {
        query: `
          mutation {
            appSubscriptionCancel(
              id: "${subscriptionId}"
            ) {
              appSubscription {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `
      }
    });

    const result = response.data?.data?.appSubscriptionCancel;
    
    // Check for errors
    if (result?.userErrors?.length > 0) {
      throw new Error(`Shopify subscription cancellation error: ${result.userErrors[0].message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get plan configuration for a plan type
 */
export function getPlanConfig(planType: PlanType): PlanConfig {
  return PLANS[planType];
}

/**
 * Check if a store can generate more content based on their plan
 */
export async function canGenerateContent(storeId: number): Promise<{
  canGenerate: boolean;
  currentUsage: number;
  limit: number;
  planType: PlanType;
  message?: string;
}> {
  try {
    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    // Determine current plan
    const currentPlan = (store.planName as PlanType) || PlanType.FREE;
    const planConfig = PLANS[currentPlan];

    // Check if we need to reset monthly usage (new month)
    const currentDate = new Date();
    const lastReset = store.lastUsageReset ? new Date(store.lastUsageReset) : new Date();
    const shouldReset = currentDate.getMonth() !== lastReset.getMonth() || 
                       currentDate.getFullYear() !== lastReset.getFullYear();

    let currentUsage = store.currentMonthlyUsage || 0;

    // Reset usage if it's a new month
    if (shouldReset) {
      currentUsage = 0;
      await storage.updateShopifyStore(storeId, {
        currentMonthlyUsage: 0,
        lastUsageReset: currentDate
      });
    }

    // Check limits
    const limit = planConfig.blogPostsPerMonth;
    const canGenerate = limit === -1 || currentUsage < limit; // -1 means unlimited

    return {
      canGenerate,
      currentUsage,
      limit,
      planType: currentPlan,
      message: canGenerate ? undefined : `You have reached your monthly limit of ${limit} blog posts/pages. Please upgrade your plan to generate more content.`
    };
  } catch (error) {
    console.error('Error checking content generation limits:', error);
    return {
      canGenerate: false,
      currentUsage: 0,
      limit: 0,
      planType: PlanType.FREE,
      message: 'Unable to verify plan limits. Please try again.'
    };
  }
}

/**
 * Increment usage count for a store after successful content generation
 */
export async function incrementUsage(storeId: number): Promise<void> {
  try {
    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    const currentUsage = (store.currentMonthlyUsage || 0) + 1;
    await storage.updateShopifyStore(storeId, {
      currentMonthlyUsage: currentUsage
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    // Don't throw here to avoid blocking content generation for tracking errors
  }
}

/**
 * Get usage statistics for a store
 */
export async function getUsageStats(storeId: number): Promise<{
  currentUsage: number;
  limit: number;
  planType: PlanType;
  percentUsed: number;
  daysUntilReset: number;
}> {
  try {
    const store = await storage.getShopifyStore(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    const currentPlan = (store.planName as PlanType) || PlanType.FREE;
    const planConfig = PLANS[currentPlan];
    
    // Check if we need to reset monthly usage
    const currentDate = new Date();
    const lastReset = store.lastUsageReset ? new Date(store.lastUsageReset) : new Date();
    const shouldReset = currentDate.getMonth() !== lastReset.getMonth() || 
                       currentDate.getFullYear() !== lastReset.getFullYear();

    let currentUsage = store.currentMonthlyUsage || 0;
    if (shouldReset) {
      currentUsage = 0;
    }

    const limit = planConfig.blogPostsPerMonth;
    const percentUsed = limit === -1 ? 0 : Math.round((currentUsage / limit) * 100);
    
    // Calculate days until next reset (beginning of next month)
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      currentUsage,
      limit,
      planType: currentPlan,
      percentUsed,
      daysUntilReset
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      currentUsage: 0,
      limit: 5,
      planType: PlanType.FREE,
      percentUsed: 0,
      daysUntilReset: 30
    };
  }
}

/**
 * Enhanced content generation check that considers both plan limits and available credits
 */
export async function canGenerateContentWithCredits(storeId: number): Promise<{
  canGenerate: boolean;
  usePlanAllowance: boolean;
  useCredits: boolean;
  currentUsage: number;
  planLimit: number;
  availableCredits: number;
  planType: PlanType;
  message?: string;
}> {
  try {
    // First check plan limits
    const planCheck = await canGenerateContent(storeId);
    
    // Get store credits
    const storeCredits = await storage.getStoreCredits(storeId);
    const availableCredits = storeCredits?.availableCredits || 0;
    
    // Logic: Use plan allowance first, then fall back to credits
    if (planCheck.canGenerate) {
      return {
        canGenerate: true,
        usePlanAllowance: true,
        useCredits: false,
        currentUsage: planCheck.currentUsage,
        planLimit: planCheck.limit,
        availableCredits,
        planType: planCheck.planType
      };
    } else if (availableCredits > 0) {
      return {
        canGenerate: true,
        usePlanAllowance: false,
        useCredits: true,
        currentUsage: planCheck.currentUsage,
        planLimit: planCheck.limit,
        availableCredits,
        planType: planCheck.planType,
        message: `Plan limit reached. Using 1 credit (${availableCredits - 1} remaining after this post).`
      };
    } else {
      return {
        canGenerate: false,
        usePlanAllowance: false,
        useCredits: false,
        currentUsage: planCheck.currentUsage,
        planLimit: planCheck.limit,
        availableCredits,
        planType: planCheck.planType,
        message: `You have reached your monthly limit of ${planCheck.limit} posts/pages and have no credits available. Please upgrade your plan or purchase credits to continue.`
      };
    }
  } catch (error) {
    console.error('Error checking content generation with credits:', error);
    return {
      canGenerate: false,
      usePlanAllowance: false,
      useCredits: false,
      currentUsage: 0,
      planLimit: 0,
      availableCredits: 0,
      planType: PlanType.FREE,
      message: 'Unable to verify plan limits and credits. Please try again.'
    };
  }
}

/**
 * Consume usage after successful content generation (handles both plan and credit usage)
 */
export async function consumeUsageForContentGeneration(storeId: number, useCredits: boolean, postId?: number): Promise<void> {
  try {
    if (useCredits) {
      // Use 1 credit
      await storage.useCreditsFromStore(storeId, 1);
      
      // Record credit transaction
      await storage.createCreditTransaction({
        storeId,
        postId: postId || null,
        creditsUsed: 1,
        transactionType: 'usage',
        description: `Used 1 credit for content generation${postId ? ` (Post ID: ${postId})` : ''}`
      });
    } else {
      // Use plan allowance
      await incrementUsage(storeId);
    }
  } catch (error) {
    console.error('Error consuming usage for content generation:', error);
    throw error;
  }
}

/**
 * Get comprehensive usage and credit information for a store
 */
export async function getStoreUsageAndCredits(storeId: number): Promise<{
  usage: {
    currentUsage: number;
    limit: number;
    planType: PlanType;
    percentUsed: number;
    daysUntilReset: number;
  };
  credits: {
    availableCredits: number;
    totalPurchased: number;
    totalUsed: number;
  };
  canGenerate: {
    usePlan: boolean;
    useCredits: boolean;
    message?: string;
  };
}> {
  try {
    const usageStats = await getUsageStats(storeId);
    const storeCredits = await storage.getStoreCredits(storeId);
    const generationCheck = await canGenerateContentWithCredits(storeId);
    
    return {
      usage: usageStats,
      credits: {
        availableCredits: storeCredits?.availableCredits || 0,
        totalPurchased: storeCredits?.totalPurchased || 0,
        totalUsed: storeCredits?.totalUsed || 0
      },
      canGenerate: {
        usePlan: generationCheck.usePlanAllowance,
        useCredits: generationCheck.useCredits,
        message: generationCheck.message
      }
    };
  } catch (error) {
    console.error('Error getting store usage and credits:', error);
    throw error;
  }
}