import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export function ReconnectionNotice() {
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      // Get the auth URL from the server
      const response = await apiRequest('/api/shopify/reconnect', { method: 'GET' });
      
      // Redirect to Shopify's OAuth flow
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        console.error('Failed to get Shopify auth URL');
        setIsReconnecting(false);
      }
    } catch (error) {
      console.error('Error reconnecting to Shopify:', error);
      setIsReconnecting(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Reconnection Required for Scheduling</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          We've updated our Shopify integration with new scheduling permissions. To enable post and page scheduling, 
          you need to reconnect your Shopify store.
        </p>
        <Button 
          onClick={handleReconnect} 
          disabled={isReconnecting}
          variant="destructive"
          size="sm"
          className="mt-2"
        >
          {isReconnecting ? "Reconnecting..." : "Reconnect Shopify Store"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}