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
    const host = window.location.host;
    const protocol = window.location.protocol;
    const redirectUri = `${protocol}//${host}/shopify/callback`;
    
    // Create OAuth URL - this is a simpler version that redirects to our server endpoint
    // which will handle the full OAuth process
    window.location.href = `/shopify/auth?shop=${encodeURIComponent(formattedDomain)}`;
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