import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/**
 * Embedded App page shown when the app is loaded within the Shopify Admin
 */
export default function EmbeddedApp() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [shop, setShop] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Parse URL query parameters to get shop info
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    
    if (shopParam) {
      setShop(shopParam);
    }
    
    setIsLoading(false);
  }, []);

  // Effect to handle redirection to Dashboard once embedded
  useEffect(() => {
    if (!isLoading && shop) {
      // Small delay to ensure App Bridge is initialized
      const timeout = setTimeout(() => {
        navigate('/dashboard');
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, shop, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-t-primary rounded-full animate-spin"></div>
          <p className="text-lg">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Blog Creator</CardTitle>
          <CardDescription>
            Your app is now connected to {shop}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            You'll be redirected to the dashboard automatically.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}