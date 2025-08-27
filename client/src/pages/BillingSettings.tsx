import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

// Types
interface Plan {
  name: string;
  price: number;
  trialDays: number;
  features: string[];
}

interface BillingStatus {
  active: boolean;
  plan: string;
  trialDays: number;
  trialEndsAt: string | null;
}

// Billing settings page
export default function BillingSettings() {
  const { toast } = useToast();
  // This will need to be modified to get the connected store ID dynamically
  const [storeId, setStoreId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

  // Fetch connected stores
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['/api/shopify/stores'],
    enabled: true
  });

  // Fetch billing status once we have a store ID
  const { data: billingStatus, isLoading: statusLoading } = useQuery({
    queryKey: [`/api/billing/status/${storeId}`],
    enabled: !!storeId
  });

  // Fetch plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/billing/plans'], 
    enabled: true
  });

  // Set the default store ID when stores are loaded
  React.useEffect(() => {
    if (storesData?.stores?.length > 0 && !storeId) {
      setStoreId(storesData.stores[0].id);
    }
  }, [storesData, storeId]);

  // Subscribe to a plan mutation
  const subscribeMutation = useMutation({
    mutationFn: async (planType: string) => {
      if (!storeId) throw new Error('No store selected');
      
      const returnUrl = `${window.location.origin}/billing-callback`;
      return apiRequest('/api/billing/subscribe', {
        method: 'POST',
        data: { storeId, plan: planType, returnUrl }
      });
    },
    onSuccess: (data) => {
      if (data?.confirmationUrl) {
        setConfirmationUrl(data.confirmationUrl);
      } else {
        toast({
          title: 'Subscription Created',
          description: 'Your subscription has been created successfully.',
        });
        queryClient.invalidateQueries({ queryKey: [`/api/billing/status/${storeId}`] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Subscription Error',
        description: `Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!storeId) throw new Error('No store selected');
      
      return apiRequest('/api/billing/cancel', {
        method: 'POST',
        data: { storeId, subscriptionId }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/billing/status/${storeId}`] });
    },
    onError: (error) => {
      toast({
        title: 'Cancellation Error',
        description: `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    }
  });

  // Handle subscription
  const handleSubscribe = (planType: string) => {
    setSelectedPlan(planType);
    subscribeMutation.mutate(planType);
  };

  // Redirect to Shopify confirmation page
  const handleConfirmation = () => {
    if (confirmationUrl) {
      window.location.href = confirmationUrl;
    }
  };

  // Handle cancellation
  const handleCancel = (subscriptionId: string) => {
    cancelMutation.mutate(subscriptionId);
  };

  // Loading state
  if (storesLoading || statusLoading || plansLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p>Loading billing information...</p>
      </div>
    );
  }

  // No stores connected
  if (!storesData?.stores?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Stores Connected</h2>
        <p className="text-muted-foreground mb-4">You need to connect a Shopify store before managing billing.</p>
        <Link href="/shopify-connection">
          <Button>Connect a Store</Button>
        </Link>
      </div>
    );
  }

  // If we have confirmation URL, show dialog
  if (confirmationUrl) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <CardDescription>You need to confirm your subscription on Shopify.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p>You're about to subscribe to the {selectedPlan} plan. You'll be redirected to Shopify to complete this process.</p>
              <p className="text-sm text-muted-foreground mt-2">Note: You won't be charged until you confirm the subscription on Shopify.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setConfirmationUrl(null)}>Cancel</Button>
            <Button onClick={handleConfirmation}>Continue to Shopify</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Prepare plan data
  const plans = plansData?.plans || {
    free: {
      name: 'Free Plan',
      price: 0,
      trialDays: 0,
      features: ['Limited features']
    },
    basic: {
      name: 'Basic Plan',
      price: 9.99,
      trialDays: 14,
      features: ['Standard features']
    },
    premium: {
      name: 'Premium Plan',
      price: 19.99,
      trialDays: 14,
      features: ['All features']
    }
  };

  // Current status
  const status: BillingStatus = billingStatus?.status || {
    active: true,
    plan: 'free',
    trialDays: 0,
    trialEndsAt: null
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-sm font-bold">
            TS
          </div>
          <h1 className="text-3xl font-bold">TopShop SEO Subscription</h1>
        </div>
        <p className="text-muted-foreground">Manage your TopShop SEO subscription and billing settings.</p>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="mr-4">
              {status.active ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-1">{plans[status.plan]?.name || 'Free Plan'}</h3>
              <p className="text-muted-foreground">
                {status.active ? 'Your subscription is active.' : 'Your subscription is inactive.'}
              </p>
              {status.trialEndsAt && (
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>
                    Trial ends on {format(new Date(status.trialEndsAt), 'PPP')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="text-2xl font-semibold mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(plans).map(([planId, plan]) => (
          <Card key={planId} className={`${status.plan === planId ? 'border-primary' : ''}`}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                {plan.price > 0 ? `$${plan.price.toFixed(2)}/month` : 'Free'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-1" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.trialDays > 0 && (
                <p className="text-sm text-muted-foreground">
                  Includes {plan.trialDays}-day free trial
                </p>
              )}
            </CardContent>
            <CardFooter>
              {status.plan === planId ? (
                <Button className="w-full" variant="secondary" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(planId)}
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending && selectedPlan === planId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `${planId === 'free' ? 'Downgrade to Free' : `Upgrade to ${plan.name}`}`
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Cancel Subscription */}
      {status.plan !== 'free' && (
        <div className="mt-8">
          <Separator className="mb-8" />
          <h2 className="text-xl font-semibold mb-4">Cancel Subscription</h2>
          <p className="text-muted-foreground mb-6">
            If you cancel your subscription, your plan will be downgraded to the Free Plan
            at the end of your current billing period.
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Cancel Subscription
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will cancel your current subscription. Your account will remain
                  active until the end of the current billing period, then automatically
                  downgrade to the Free plan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleCancel('subscription-id')} // This needs to be dynamic
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : 'Confirm Cancellation'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}