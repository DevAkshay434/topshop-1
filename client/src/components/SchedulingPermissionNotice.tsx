import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface SchedulingPermissionNoticeProps {
  storeName: string;
}

export function SchedulingPermissionNotice({ storeName }: SchedulingPermissionNoticeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Force update permissions directly in the database
  const handleForceUpdatePermissions = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Call the new direct endpoint
      const response = await fetch('/api/shopify/force-update-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Permissions updated successfully! Refreshing the page...');
        
        // Invalidate permission check cache so the UI updates
        await queryClient.invalidateQueries({
          queryKey: ['/api/shopify/check-permissions']
        });
        
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError(data.message || 'Failed to update permissions');
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError('An error occurred while updating permissions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Original OAuth reconnect flow (as fallback)
  const handleReconnect = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Using fetch directly since we're doing a GET request
      const response = await fetch('/api/shopify/reconnect');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Display manual instructions if we detect localhost in the URL
        if (data.authUrl.includes('localhost')) {
          // Extract the shop and client_id from the URL
          const url = new URL(data.authUrl);
          const shop = url.hostname; 
          const clientId = url.searchParams.get('client_id');
          
          // Create a direct URL with the correct callback URL for this environment
          const replitUrl = "https://e351400e-4d91-4b59-8d02-6b2e1e1d3ebd-00-2dn7uhcj3pqiy.worf.replit.dev/oauth/shopify/callback";
          const directUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=read_products,write_products,read_content,write_content,read_themes,write_publications&redirect_uri=${encodeURIComponent(replitUrl)}`;
          
          // Copy to clipboard if available
          if (navigator.clipboard) {
            navigator.clipboard.writeText(directUrl)
              .then(() => {
                setError('Authorization URL copied to clipboard. Please open it in a new tab to grant permissions.');
              })
              .catch(() => {
                setError(`Please open this URL in your browser: ${directUrl}`);
              });
          } else {
            setError(`Please open this URL in your browser: ${directUrl}`);
          }
        } else {
          // Normal redirect for production environments
          window.location.href = data.authUrl;
        }
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
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleForceUpdatePermissions} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Enable Scheduling Permission'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReconnect} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Reconnect with Shopify'}
          </Button>
        </div>
        {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
        {success && <p className="text-green-600 mt-2 text-sm">{success}</p>}
      </AlertDescription>
    </Alert>
  );
}