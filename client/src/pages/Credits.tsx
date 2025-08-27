import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, Zap, Package, History, Plus } from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
}

interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
}

interface UsageInfo {
  currentUsage: number;
  planLimit: number;
  planType: string;
  remainingFromPlan: number;
}

interface CreditTransaction {
  id: string;
  type: 'purchase' | 'consumption';
  amount: number;
  description: string;
  createdAt: string;
}

export default function Credits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Fetch credit packages
  const { data: packages = [] } = useQuery<CreditPackage[]>({
    queryKey: ['/api/credits/packages'],
  });

  // Fetch credit balance
  const { data: balance, isLoading: balanceLoading } = useQuery<CreditBalance>({
    queryKey: ['/api/credits/balance'],
  });

  // Fetch usage info
  const { data: usage, isLoading: usageLoading } = useQuery<UsageInfo>({
    queryKey: ['/api/credits/usage'],
  });

  // Fetch transaction history
  const { data: transactions = [] } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/credits/transactions'],
  });

  // Purchase credits mutation
  const purchaseMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const response = await apiRequest('POST', '/api/credits/purchase', { packageId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Purchase Initiated",
          description: "Your credit purchase is being processed.",
        });
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate credit purchase",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    purchaseMutation.mutate(packageId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (balanceLoading || usageLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const usagePercentage = usage ? (usage.currentUsage / usage.planLimit) * 100 : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credits & Usage</h1>
          <p className="text-muted-foreground">
            Manage your content generation credits and monitor usage
          </p>
        </div>
      </div>

      {/* Current Usage & Credits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Plan Usage</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Plan</span>
                <Badge variant="outline">{usage?.planType || 'Free'}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Used this month</span>
                <span>{usage?.currentUsage || 0} / {usage?.planLimit || 0}</span>
              </div>
              <Progress value={usagePercentage} className="w-full" />
              <div className="text-xs text-muted-foreground">
                {usage?.remainingFromPlan || 0} generations remaining from plan
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Credit Balance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {balance?.availableCredits || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Available credits for additional content generation
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total purchased:</span>
                <span>{balance?.totalCredits || 0}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Used:</span>
                <span>{balance?.usedCredits || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Purchase Credits
          </CardTitle>
          <CardDescription>
            Buy additional credits to generate content beyond your monthly plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="relative">
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <div className="text-3xl font-bold">${pkg.price}</div>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span className="text-xl font-semibold">{pkg.credits} credits</span>
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchaseMutation.isPending && selectedPackage === pkg.id}
                    className="w-full"
                  >
                    {purchaseMutation.isPending && selectedPackage === pkg.id ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Purchase
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            View your recent credit purchases and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'purchase' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'purchase' ? (
                          <Plus className="h-4 w-4" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-medium ${
                      transaction.type === 'purchase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'purchase' ? '+' : '-'}{transaction.amount}
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}