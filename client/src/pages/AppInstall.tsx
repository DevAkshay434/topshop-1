import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AppInstall() {
  const [shopDomain, setShopDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInstall = () => {
    // Basic validation
    if (!shopDomain) {
      toast({
        title: 'Shop domain required',
        description: 'Please enter a valid Shopify shop domain',
        variant: 'destructive'
      });
      return;
    }

    // Format the shop domain
    let formattedDomain = shopDomain.trim().toLowerCase();
    
    // Add .myshopify.com if not present
    if (!formattedDomain.includes('.myshopify.com')) {
      formattedDomain = `${formattedDomain}.myshopify.com`;
    }

    // Redirect to OAuth flow
    setIsLoading(true);
    
    // Create the auth URL and redirect to it directly with absolute URL
    // This ensures we're following Shopify's expected OAuth flow and matching the Partner Dashboard config
    window.location.href = `https://e351400e-4d91-4b59-8d02-6b2e1e1d3ebd-00-2dn7uhcj3pqiy.worf.replit.dev/shopify/auth?shop=${encodeURIComponent(formattedDomain)}`;
    
    toast({
      title: 'Redirecting to Shopify',
      description: 'You will be redirected to Shopify to authorize the app',
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Install Shopify App</CardTitle>
          <CardDescription>
            Enter your Shopify store domain to install BlogifyAI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="shop" className="text-sm font-medium">
                Store Domain
              </label>
              <Input
                id="shop"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Enter your myshopify.com domain
              </p>
            </div>
            
            <Button 
              onClick={handleInstall} 
              disabled={isLoading || !shopDomain}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : 'Install App'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}