import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export default function ReauthenticatePage() {
  const [authUrl, setAuthUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await fetch('/api/shopify/check-permissions', {
        headers: {
          'X-Store-ID': '1'
        }
      });
      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      setError('Failed to check permissions');
    }
  };

  const generateAuthUrl = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/shopify/reconnect', {
        headers: {
          'X-Store-ID': '1'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAuthUrl(data.authUrl);
      } else {
        setError(data.message || 'Failed to generate authentication URL');
      }
    } catch (err) {
      setError('Failed to generate authentication URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReauthenticate = () => {
    if (authUrl) {
      window.open(authUrl, '_blank');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Store Re-authentication Required
          </CardTitle>
          <CardDescription>
            Your store needs updated permissions to upload images directly to Shopify's CDN
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current Status */}
          {permissions && (
            <div className="space-y-3">
              <h3 className="font-semibold">Current Permissions Status</h3>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  {permissions.hasPermission ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    General Permissions: {permissions.hasPermission ? 'OK' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {permissions.hasFileUploadPermission ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    File Upload Permissions: {permissions.hasFileUploadPermission ? 'OK' : 'Missing'}
                  </span>
                </div>
              </div>
              
              {permissions.missingPermissions.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Missing permissions: {permissions.missingPermissions.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Why Re-authentication is Needed */}
          <div className="space-y-3">
            <h3 className="font-semibold">Why Re-authentication is Needed</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                • Your store was connected before file upload permissions were added
              </p>
              <p>
                • Shopify Files API requires <code>read_files</code> and <code>write_files</code> permissions
              </p>
              <p>
                • Re-authentication will update your store's permissions to include file uploads
              </p>
              <p>
                • After re-authentication, uploaded images will go directly to Shopify's CDN
              </p>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="space-y-3">
            <h3 className="font-semibold">What Happens Next</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>1. Click "Generate Authentication URL" below</p>
              <p>2. Click "Re-authenticate Store" to open Shopify's permission page</p>
              <p>3. Review and approve the updated permissions</p>
              <p>4. Return to this app - your images will now upload to Shopify CDN</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!authUrl ? (
              <Button 
                onClick={generateAuthUrl} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Generating...' : 'Generate Authentication URL'}
              </Button>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Authentication URL generated successfully! Click below to re-authenticate your store.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={handleReauthenticate}
                  className="w-full"
                  size="lg"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Re-authenticate Store
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  This will open Shopify's permission page in a new tab
                </p>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current vs Required Permissions */}
          {permissions && (
            <div className="space-y-3">
              <h3 className="font-semibold">Permission Details</h3>
              <div className="grid gap-2 text-xs">
                <div>
                  <strong>Current:</strong> {permissions.currentScope}
                </div>
                <div>
                  <strong>Required:</strong> {permissions.requiredScope}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}