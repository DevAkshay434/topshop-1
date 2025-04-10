import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function EmbeddedApp() {
  useEffect(() => {
    // Extract query parameters from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop');
    
    if (shop) {
      // Redirect to the Shopify admin panel
      window.location.href = `https://${shop}/admin/apps`;
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-semibold">Redirecting to Shopify admin...</h1>
      <p className="text-muted-foreground mt-2">You will be redirected to your Shopify admin panel shortly.</p>
    </div>
  );
}