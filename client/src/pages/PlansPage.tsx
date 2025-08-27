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

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/billing/plans'],
    enabled: true,
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: [`/api/billing/usage/${storeId}`],
    enabled: !!storeId,
  });

  const { data: limitData, isLoading: limitLoading } = useQuery({
    queryKey: [`/api/billing/check-limits/${storeId}`],
    enabled: !!storeId,
  });

  const subscribeMutation = useMutation({
    mutationFn: (planType: string) => 
      apiRequest(`/api/billing/subscribe/${storeId}`, {
        method: 'POST',
        body: JSON.stringify({
          planType,
          returnUrl: window.location.origin + '/plans?success=true'
        }),
        headers: { 'Content-Type': 'application/json' }
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
        toast({
          title: "Success!",
          description: data.message || "Plan updated successfully",
        });
        // Refetch usage and limit data
        queryClient.invalidateQueries({ queryKey: [`/api/billing/usage/${storeId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/billing/check-limits/${storeId}`] });
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