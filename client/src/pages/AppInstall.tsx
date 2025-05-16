import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AlertCircle, ExternalLink, Loader2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function AppInstall() {
  const [shopDomain, setShopDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Use window.location.origin to get the base URL of the app 
  // This ensures the OAuth URL is correct regardless of the deployment environment
  const appUrl = window.location.origin;
  
  const handleInstall = () => {
    // Basic validation
    if (!shopDomain) {
      toast({
        title: 'Shop domain required',
        description: 'Please enter your Shopify store domain',
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

    // Validate domain format
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!shopRegex.test(formattedDomain)) {
      toast({
        title: 'Invalid shop domain',
        description: 'Please enter a valid myshopify.com domain (e.g., your-store.myshopify.com)',
        variant: 'destructive'
      });
      return;
    }

    // Redirect to OAuth flow
    setIsLoading(true);
    
    // Create the auth URL and redirect to it directly with absolute URL
    // This ensures we're following Shopify's expected OAuth flow and matching the Partner Dashboard config
    window.location.href = `${appUrl}/shopify/auth?shop=${encodeURIComponent(formattedDomain)}`;
    
    toast({
      title: 'Redirecting to Shopify',
      description: 'You will be redirected to Shopify to authorize the app',
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="w-full max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-sm font-bold">
                TS
              </div>
              <CardTitle className="text-2xl font-bold text-center">Install TopShop SEO for Shopify</CardTitle>
            </div>
            <CardDescription className="text-center text-base">
              Generate and publish SEO-optimized blog posts with AI for your Shopify store
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Partner dashboard tab is hidden but still available */}
            <Tabs defaultValue="direct" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-6">
                <TabsTrigger value="direct">Store Installation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="direct" className="space-y-4">
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
                      Enter your store's .myshopify.com domain (we'll add .myshopify.com if you don't include it)
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleInstall} 
                    disabled={isLoading || !shopDomain}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        Install on Your Store
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="partner" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Partner Dashboard Installation</AlertTitle>
                  <AlertDescription>
                    If you're installing from the Shopify Partner Dashboard, follow these steps for a successful installation.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4 my-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Installation Steps:</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>In your Partner Dashboard, click the 'Test your app' button</li>
                      <li>Enter your development store URL (e.g., your-store.myshopify.com)</li>
                      <li>After redirection, if you see any connection errors, try refreshing the page</li>
                      <li>If the app doesn't load, return to your store admin and click on the app again</li>
                    </ol>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    If you continue to have issues with the Partner Dashboard installation, you can use the direct installation method on the other tab.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2 items-start">
            <p className="text-xs text-muted-foreground">
              By installing this app, you agree to the terms of service. This app requires access to your store's blogs and articles.
            </p>
            <a 
              href="https://shopify.dev/apps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs flex items-center text-primary"
            >
              Learn more about Shopify apps <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}