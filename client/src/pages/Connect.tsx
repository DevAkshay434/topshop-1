import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ConnectPage() {
  const [shopUrl, setShopUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Handle shop URL input change
  const handleShopUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim().toLowerCase();
    
    // Remove https:// and www. if present
    value = value.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    
    // If the domain doesn't end with .myshopify.com, add it
    if (!value.endsWith('.myshopify.com') && value.length > 0) {
      value = `${value}.myshopify.com`;
    }
    
    setShopUrl(value);
  };

  // Connect to Shopify store
  const handleConnect = async () => {
    if (!shopUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a valid Shopify store URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Directly redirect to the auth URL with the shop parameter
      // This uses our new direct auth endpoint
      window.location.href = `/shopify/auth?shop=${encodeURIComponent(shopUrl)}`;
      return; // Early return since we're redirecting
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message || 'Could not connect to Shopify. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Connect Your Shopify Store</CardTitle>
          <CardDescription className="text-center">
            Enter your Shopify store URL to get started with content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopUrl">Shopify Store URL</Label>
              <Input
                id="shopUrl"
                placeholder="yourstore.myshopify.com"
                value={shopUrl}
                onChange={handleShopUrlChange}
              />
              <p className="text-xs text-gray-500">
                Enter your Shopify store URL in the format: yourstore.myshopify.com
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            onClick={handleConnect} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect Store'}
          </Button>
          <p className="text-xs text-center text-gray-500">
            By connecting your store, you're granting this app permission to access and manage your Shopify store data according to the requested scopes.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}