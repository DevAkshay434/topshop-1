import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PartnerInstall() {
  const [shopDomain, setShopDomain] = useState('');
  const [fullUrl, setFullUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // Get the base URL of the application
    const protocol = window.location.protocol;
    const host = window.location.host;
    setCurrentUrl(`${protocol}//${host}`);
    
    // Check if we were redirected from the Shopify Partner Dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    const hostParam = urlParams.get('host');
    const hmacParam = urlParams.get('hmac');
    
    // If we have shop parameter, we might be coming from Partner Dashboard
    if (shopParam) {
      // First, try to decode the host parameter if it exists
      let decodedHost = hostParam;
      
      if (hostParam) {
        try {
          const decoded = Buffer.from(hostParam, 'base64').toString('utf-8');
          if (decoded.includes('shopify.com')) {
            decodedHost = decoded;
          }
        } catch (err) {
          console.warn('Failed to decode host parameter:', err);
        }
      }
      
      setDebugInfo(`Detected Partner Dashboard params: shop=${shopParam}, host=${hostParam || 'not provided'}, decoded host=${decodedHost || 'not decoded'}`);
      setLoading(true);
      
      // Brief delay to allow user to see the loading state
      setTimeout(() => {
        // Instead of directly redirecting to admin, redirect to the OAuth flow
        // This ensures the app gets installed properly
        let authUrl = `/shopify/auth?shop=${shopParam}`;
        
        // Add host parameter if available
        if (hostParam) {
          authUrl += `&host=${hostParam}`;
        }
        
        console.log(`Redirecting to OAuth flow: ${authUrl}`);
        window.location.href = authUrl;
      }, 2000);
    }
  }, []);

  const handleGenerateUrl = () => {
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

    // Generate the full URL
    const generatedUrl = `${currentUrl}/shopify/auth?shop=${encodeURIComponent(formattedDomain)}`;
    setFullUrl(generatedUrl);
  };

  const handleCopyUrl = () => {
    if (fullUrl) {
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: 'URL copied',
        description: 'Installation URL copied to clipboard'
      });
    }
  };

  const handleInstall = () => {
    if (fullUrl) {
      window.location.href = fullUrl;
    }
  };

  // If we're in loading state, show loading UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-semibold">Redirecting to Shopify Admin...</h1>
        <p className="text-muted-foreground mt-2">
          You will be redirected to your Shopify admin panel in a moment.
        </p>
        {debugInfo && (
          <div className="mt-6 p-4 bg-gray-100 rounded text-xs text-gray-600 max-w-md overflow-x-auto">
            <p>Debug Info:</p>
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
    );
  }
  
  // Otherwise show normal UI
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Partner Dashboard Installation</CardTitle>
          <CardDescription>
            Generate an installation URL for the Shopify Partner Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-2">
            <label htmlFor="shop" className="text-sm font-medium">
              Development Store Domain
            </label>
            <div className="flex gap-2">
              <Input
                id="shop"
                placeholder="your-store.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
              />
              <Button onClick={handleGenerateUrl}>Generate URL</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your myshopify.com domain
            </p>
          </div>
          
          {fullUrl && (
            <Alert className="mt-4">
              <AlertTitle>Installation URL</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="bg-muted p-3 rounded-md overflow-x-auto text-sm font-mono break-all">
                  {fullUrl}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyUrl}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Partner Dashboard Instructions</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Copy the generated URL above</li>
              <li>Go to your Shopify Partner Dashboard</li>
              <li>Navigate to your app listing</li>
              <li>Under "Test your app," select your development store</li>
              <li>Click "Select store"</li>
              <li>In the prompt, select "Install app manually"</li>
              <li>Paste the URL you copied</li>
              <li>Follow the installation flow in Shopify</li>
            </ol>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          
          <Button
            onClick={handleInstall}
            disabled={!fullUrl}
          >
            Install App Directly
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}