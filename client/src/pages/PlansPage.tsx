import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Crown, Diamond, Star, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Plan {
  id: string;
  name: string;
  price: number;
  trialDays: number;
  features: string[];
  blogPostsPerMonth: number;
  description: string;
}

interface UsageStats {
  currentUsage: number;
  limit: number;
  planType: string;
  percentUsed: number;
  daysUntilReset: number;
}

interface LimitCheck {
  canGenerate: boolean;
  currentUsage: number;
  limit: number;
  planType: string;
  message?: string;
}

interface CreditPackage {
  id: number;
  name: string;
  description: string;
  credits: number;
  price: number;
  pricePerCredit: string;
}

const planIcons = {
  free: Star,
  silver: Zap,
  gold: Crown,
  diamond: Diamond,
  custom: Crown
};

const planColors = {
  free: "text-gray-600",
  silver: "text-slate-600", 
  gold: "text-yellow-600",
  diamond: "text-blue-600",
  custom: "text-purple-600"
};

export default function PlansPage() {
  const queryClient = useQueryClient();

  // Get current store ID from localStorage or context
  const storeId = localStorage.getItem('selectedStoreId') || '1';

  // Check if user returned from successful Shopify payment
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
      
      // Sync plan from Shopify to ensure database is updated
      const syncPlan = async () => {
        try {
          await apiRequest({
            url: `/api/billing/sync-plan/${storeId}`,
            method: 'POST'
          });
          
          // Refresh billing data after successful sync
          queryClient.invalidateQueries({ queryKey: [`/api/billing/usage/${storeId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/billing/check-limits/${storeId}`] });
          
          toast({
            title: "Payment Successful!",
            description: "Your subscription has been activated successfully.",
          });
        } catch (error) {
          console.error('Error syncing plan:', error);
          // Still refresh data even if sync fails
          queryClient.invalidateQueries({ queryKey: [`/api/billing/usage/${storeId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/billing/check-limits/${storeId}`] });
          
          toast({
            title: "Payment Successful!",
            description: "Your subscription has been updated. Please refresh if you don't see changes.",
          });
        }
      };
      
      syncPlan();
    }
  }, [queryClient, storeId]);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/billing/plans'],
    enabled: true,
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: [`/api/billing/usage/${storeId}`],
    enabled: !!storeId,
    refetchInterval: 30000, // Refetch every 30 seconds to catch plan updates
  });

  const { data: limitData, isLoading: limitLoading } = useQuery({
    queryKey: [`/api/billing/check-limits/${storeId}`],
    enabled: !!storeId,
  });

  // Get credit packages
  const { data: creditPackagesData } = useQuery({
    queryKey: ['/api/credits/packages'],
    enabled: true,
  });

  const creditPurchaseMutation = useMutation({
    mutationFn: async (packageData: { packageId: number; credits: number }) => {
      // For demo purposes, simulate successful credit purchase
      // In production, this would integrate with Stripe
      
      // Add credits directly to the store (mock purchase)
      const response = await apiRequest({
        url: '/api/credits/add-demo-credits',
        method: 'POST',
        data: { 
          storeId: parseInt(storeId),
          credits: packageData.credits,
          reason: 'Demo credit purchase'
        }
      });
      
      return response;
    },
    onSuccess: (data: any, variables) => {
      // Invalidate queries to refresh the usage data
      queryClient.invalidateQueries({ queryKey: [`/api/billing/usage/${storeId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/billing/check-limits/${storeId}`] });
      
      toast({
        title: "Credits Added Successfully!",
        description: `${variables.credits} credits have been added to your account.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: (planType: string) => 
      apiRequest({
        url: `/api/billing/subscribe/${storeId}`,
        method: 'POST',
        data: {
          planType,
          returnUrl: window.location.origin + '/plans?success=true'
        }
      }),
    onSuccess: (data: any) => {
      if (data.confirmationUrl) {
        // Redirect to Shopify subscription confirmation
        window.location.href = data.confirmationUrl;
      } else if (data.requiresContact) {
        toast({
          title: "Custom Plan Request",
          description: "Please contact our support team to set up your custom plan.",
        });
      } else {
        // For free plan updates, also sync to ensure consistency
        if (data.planType === 'free') {
          const syncPlan = async () => {
            try {
              await apiRequest({
                url: `/api/billing/sync-plan/${storeId}`,
                method: 'POST'
              });
            } catch (error) {
              console.error('Error syncing free plan:', error);
            }
            // Refetch usage and limit data
            queryClient.invalidateQueries({ queryKey: [`/api/billing/usage/${storeId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/billing/check-limits/${storeId}`] });
          };
          syncPlan();
        } else {
          // Refetch usage and limit data
          queryClient.invalidateQueries({ queryKey: [`/api/billing/usage/${storeId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/billing/check-limits/${storeId}`] });
        }
        
        toast({
          title: "Success!",
          description: data.message || "Plan updated successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  const plans: Plan[] = plansData?.plans || [];
  const usage: UsageStats | undefined = usageData?.usage;
  const limits: LimitCheck | undefined = limitData;
  const creditPackages: CreditPackage[] = creditPackagesData?.packages || [];

  const currentPlan = usage?.planType || 'free';

  const handleSubscribe = (planType: string) => {
    if (planType === currentPlan) {
      toast({
        title: "Already Subscribed",
        description: "You are already on this plan.",
      });
      return;
    }
    
    subscribeMutation.mutate(planType);
  };

  if (plansLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select the perfect plan for your content generation needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Current Usage Section */}
      {usage && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Usage
              <Badge variant={limits?.canGenerate ? "secondary" : "destructive"}>
                {currentPlan.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              {usage.limit === -1 
                ? "Unlimited blog posts/pages" 
                : `${usage.currentUsage} of ${usage.limit} blog posts/pages used this month`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usage.limit !== -1 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly Usage</span>
                  <span>{usage.currentUsage}/{usage.limit}</span>
                </div>
                <Progress value={usage.percentUsed} className="h-2" />
              </div>
            )}
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Current Plan</span>
              <span>{usage.planType.charAt(0).toUpperCase() + usage.planType.slice(1)} Plan</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Resets in</span>
              <span>{usage.daysUntilReset} days</span>
            </div>
            {!limits?.canGenerate && limits?.message && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{limits.message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit Packages Section - Show when limit is reached */}
      {!limits?.canGenerate && creditPackages.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-6">
            <h2 className="text-3xl font-bold text-orange-600">Need More Content?</h2>
            <p className="text-lg text-muted-foreground">
              You've reached your monthly limit. Purchase credits to continue generating content immediately!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {creditPackages.map((pkg) => (
              <Card key={pkg.id} className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      ${pkg.price}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pkg.credits} credits (${pkg.pricePerCredit}/credit)
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-orange-600 hover:bg-orange-700" 
                    onClick={() => creditPurchaseMutation.mutate({ packageId: pkg.id, credits: pkg.credits })}
                    disabled={creditPurchaseMutation.isPending}
                  >
                    {creditPurchaseMutation.isPending ? 'Processing...' : 'Buy Credits'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id as keyof typeof planIcons] || Star;
          const isCurrentPlan = plan.id === currentPlan;
          const isCustomPlan = plan.id === 'custom';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''} ${plan.id === 'diamond' ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50' : ''}`}
            >
              {isCurrentPlan && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Current Plan
                </Badge>
              )}
              
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${planColors[plan.id as keyof typeof planColors]}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold">
                    {isCustomPlan ? (
                      <span className="text-2xl">Contact Us</span>
                    ) : plan.price === 0 ? (
                      'Free'
                    ) : (
                      <>
                        ${plan.price}
                        <span className="text-lg font-normal text-muted-foreground">/month</span>
                      </>
                    )}
                  </div>
                  {plan.trialDays > 0 && (
                    <Badge variant="secondary">{plan.trialDays}-day free trial</Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {plan.blogPostsPerMonth === -1 
                      ? 'Unlimited' 
                      : plan.blogPostsPerMonth
                    } blog posts/pages
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={isCurrentPlan ? "secondary" : "default"}
                  disabled={isCurrentPlan || subscribeMutation.isPending}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {subscribeMutation.isPending 
                    ? 'Processing...' 
                    : isCurrentPlan 
                      ? 'Current Plan' 
                      : isCustomPlan
                        ? 'Contact Sales'
                        : plan.price === 0 
                          ? 'Get Started' 
                          : 'Upgrade Now'
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ or additional info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          All plans include access to our AI content generation, SEO optimization tools, and customer support.
          You can upgrade, downgrade, or cancel your subscription at any time.
        </p>
      </div>
    </div>
  );
}