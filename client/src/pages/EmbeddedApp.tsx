import React, { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import axios from 'axios';

export default function EmbeddedApp() {
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isAppConnected, setIsAppConnected] = useState(false);
  
  // Load Shopify's App Bridge script for embedded app
  useEffect(() => {
    const loadAppBridge = () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge-api/v3.0.0/app-bridge-api.js';
      script.async = true;
      script.onload = () => {
        setStatus('App Bridge loaded');
      };
      script.onerror = () => {
        console.error('Failed to load App Bridge script');
      };
      document.head.appendChild(script);
      
      return () => {
        document.head.removeChild(script);
      };
    };
    
    loadAppBridge();
  }, []);

  useEffect(() => {
    async function handleEmbeddedInstall() {
      try {
        // Extract query parameters from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');
        const hmac = urlParams.get('hmac');
        const host = urlParams.get('host');
        const timestamp = urlParams.get('timestamp');
        
        // Add debug info
        setDebugInfo(`Shop: ${shop || 'missing'}, Host: ${host || 'missing'}`);
        
        if (!shop) {
          setError('Shop parameter is missing');
          return;
        }
        
        // For Partner Dashboard installations, redirect to OAuth flow but include host parameter
        if (host) {
          setStatus(`Detected Partner Dashboard install. Starting OAuth flow for ${shop}...`);
          // Give a slight delay to ensure the user sees the message
          setTimeout(() => {
            // Redirect to OAuth flow with host parameter
            window.location.href = `/shopify/auth?shop=${shop}&host=${host}`;
          }, 1500);
          return;
        }
        
        // Check if we need to redirect to the OAuth flow
        setStatus('Checking connection status...');
        
        // Check if we already have a connection for this shop
        const connectionResponse = await axios.get('/api/shopify/connection');
        const connection = connectionResponse.data.connection;
        
        if (connection && connection.storeName === shop && connection.isConnected) {
          setStatus('Already connected. Redirecting to dashboard...');
          // Already connected, redirect to internal dashboard
          window.location.href = `/dashboard`;
          return;
        }
        
        // Not connected yet, redirect to OAuth flow with host parameter if available
        setStatus('Starting installation...');
        
        // Create the OAuth redirect URL, including host param if present
        let redirectUrl = `/shopify/auth?shop=${shop}`;
        if (host) {
          redirectUrl += `&host=${host}`;
        }
        
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
      {debugInfo && (
        <div className="mt-6 p-4 bg-gray-100 rounded text-xs text-gray-600 max-w-md overflow-x-auto">
          <p>Debug Info:</p>
          <pre>{debugInfo}</pre>
        </div>
      )}
    </div>
  );
}