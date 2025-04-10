import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AppInstallation() {
  const [shopDomain, setShopDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = () => {
    // Reset state
    setError(null);
    setIsLoading(true);

    // Simple validation
    let domain = shopDomain.trim().toLowerCase();
    
    // If the user didn't include .myshopify.com, add it
    if (!domain.includes('.myshopify.com')) {
      domain = `${domain}.myshopify.com`;
    }
    
    // Validate shop domain format
    const shopRegex = /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/;
    if (!shopRegex.test(domain)) {
      setError('Please enter a valid Shopify store domain (e.g., mystore.myshopify.com)');
      setIsLoading(false);
      return;
    }

    // Redirect to the auth endpoint
    window.location.href = `/shopify/auth?shop=${encodeURIComponent(domain)}`;
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Install BlogifyAI</CardTitle>
        <CardDescription>
          Connect your Shopify store to get started with automated blog content generation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-1">
              Shopify Store Domain
            </label>
            <Input
              id="shopDomain"
              placeholder="yourstorename.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              className="w-full"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter your Shopify store domain to install the app.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleInstall} 
          disabled={isLoading || !shopDomain.trim()} 
          className="w-full"
        >
          {isLoading ? 'Installing...' : 'Install App'}
        </Button>
      </CardFooter>
    </Card>
  );
}