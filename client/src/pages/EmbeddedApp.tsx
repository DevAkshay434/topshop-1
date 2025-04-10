import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

export default function EmbeddedApp() {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleEmbeddedInstall() {
      try {
        // Extract query parameters from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');
        const hmac = urlParams.get('hmac');
        const host = urlParams.get('host');
        const timestamp = urlParams.get('timestamp');
        
        if (!shop) {
          setError('Shop parameter is missing');
          return;
        }
        
        // Check if we need to redirect to the OAuth flow
        setStatus('Checking connection status...');
        
        // Check if we already have a connection for this shop
        const connectionResponse = await axios.get('/api/shopify/connection');
        const connection = connectionResponse.data.connection;
        
        if (connection && connection.storeName === shop && connection.isConnected) {
          setStatus('Already connected. Redirecting to Shopify admin...');
          // Already connected, redirect to Shopify admin
          window.location.href = `https://${shop}/admin/apps`;
          return;
        }
        
        // Not connected yet, redirect to OAuth flow
        setStatus('Starting installation...');
        
        // Create the OAuth redirect URL
        const redirectUrl = `/shopify/auth?shop=${shop}`;
        
        // Redirect to the OAuth flow
        window.location.href = redirectUrl;
      } catch (error) {
        console.error('Error handling embedded install:', error);
        setError('An error occurred during installation. Please try again.');
      }
    }
    
    handleEmbeddedInstall();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-semibold">{error || status}</h1>
      {!error && (
        <p className="text-muted-foreground mt-2">Please wait while we set up your app connection.</p>
      )}
      {error && (
        <button 
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      )}
    </div>
  );
}