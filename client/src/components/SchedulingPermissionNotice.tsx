import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SchedulingPermissionNoticeProps {
  storeName: string;
}

export function SchedulingPermissionNotice({ storeName }: SchedulingPermissionNoticeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleReconnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/shopify/reconnect');
      
      if (response.success && response.authUrl) {
        // Redirect to Shopify auth URL
        window.location.href = response.authUrl;
      } else {
        setError('Could not generate reconnection URL. Please try again.');
      }
    } catch (err) {
      console.error('Error reconnecting with Shopify:', err);
      setError('An error occurred while reconnecting. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Scheduling permission required</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          Your Shopify store connection for <strong>{storeName}</strong> needs additional permissions to schedule posts.
          Posts will publish immediately until this is fixed.
        </p>
        <Button 
          variant="outline" 
          onClick={handleReconnect} 
          disabled={isLoading}
        >
          {isLoading ? 'Reconnecting...' : 'Grant Permission'}
        </Button>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
      </AlertDescription>
    </Alert>
  );
}