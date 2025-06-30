import axios from 'axios';
import { ShopifyStore } from '@shared/schema';

// Define the subscription plan options
export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium'
}

export interface PlanConfig {
  name: string;
  price: number; // Price in USD
  trialDays: number;
  features: string[];
}

// Configure different plan tiers
export const PLANS: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    name: 'Free Plan',
    price: 0,
    trialDays: 0,
    features: [
      'Generate up to 5 blog posts per month',
      'Basic SEO tools',
      'Manual publishing'
    ]
  },
  [PlanType.BASIC]: {
    name: 'Basic Plan',
    price: 9.99,
    trialDays: 14,
    features: [
      'Generate up to 20 blog posts per month',
      'Advanced SEO suggestions',
      'Scheduled publishing',
      'Post analytics'
    ]
  },
  [PlanType.PREMIUM]: {
    name: 'Premium Plan',
    price: 19.99,
    trialDays: 14,
    features: [
      'Unlimited blog post generation',
      'Premium AI content quality',
      'Advanced analytics',
      'Priority support',
      'Custom branding'
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
    const shopGraphQLUrl = `https://${store.shopName}/admin/api/2024-10/graphql.json`;
    
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
    throw new Error(`Failed to create subscription: ${error.message}`);
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
    const shopGraphQLUrl = `https://${store.shopName}/admin/api/2024-10/graphql.json`;
    
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
      if (subscription.name.toLowerCase().includes('premium')) {
        plan = PlanType.PREMIUM;
      } else if (subscription.name.toLowerCase().includes('basic')) {
        plan = PlanType.BASIC;
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
    const shopGraphQLUrl = `https://${store.shopName}/admin/api/2024-10/graphql.json`;
    
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
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}