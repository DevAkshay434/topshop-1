import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Store, ExternalLink, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ShopifyStore {
  id: number;
  shopName: string;
  isConnected: boolean;
  lastSynced: string;
  planName: string | null;
  installedAt: string;
}

interface StoreSelectorProps {
  onStoreChange?: (storeId: number) => void;
  currentStoreId?: number;
}

export function StoreSelector({ onStoreChange, currentStoreId }: StoreSelectorProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>(currentStoreId);

  // Fetch all connected stores
  const { data: storesData, isLoading } = useQuery({
    queryKey: ['/api/shopify/stores'],
    enabled: true,
  });

  // Fetch current store info
  const { data: currentStoreData } = useQuery({
    queryKey: ['/api/shopify/store-info'],
    enabled: true,
  });

  const stores: ShopifyStore[] = storesData?.stores || [];
  const currentStore = currentStoreData?.shopInfo;

  const handleStoreChange = (storeId: string) => {
    const id = parseInt(storeId);
    setSelectedStoreId(id);
    onStoreChange?.(id);
  };

  const getStoreName = (shopName: string) => {
    return shopName.replace('.myshopify.com', '');
  };

  const getStoreStatus = (store: ShopifyStore) => {
    if (!store.isConnected) return { label: 'Disconnected', variant: 'destructive' as const };
    if (store.planName) return { label: store.planName, variant: 'default' as const };
    return { label: 'Connected', variant: 'secondary' as const };
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Loading stores...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Store Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Active Store */}
        {currentStore && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Currently Active Store</h3>
                <p className="text-blue-700">{getStoreName(currentStore.domain || currentStore.name)}</p>
                <p className="text-sm text-blue-600">
                  Timezone: {currentStore.timezone || 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Active</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://${currentStore.domain || currentStore.name}/admin`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Admin
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Store Selector */}
        {stores.length > 1 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Switch Store Context</label>
            <Select value={selectedStoreId?.toString()} onValueChange={handleStoreChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a store to work with" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{getStoreName(store.shopName)}</span>
                      <Badge variant={getStoreStatus(store).variant} className="ml-2">
                        {getStoreStatus(store).label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Connected Stores List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">All Connected Stores ({stores.length})</h4>
          <div className="space-y-2">
            {stores.map((store) => {
              const status = getStoreStatus(store);
              return (
                <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getStoreName(store.shopName)}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Installed: {new Date(store.installedAt).toLocaleDateString()}
                      {store.lastSynced && (
                        <span className="ml-2">
                          • Last sync: {new Date(store.lastSynced).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${store.shopName}/admin`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Admin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStoreChange(store.id.toString())}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Select
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Install App in New Store</h4>
          <p className="text-sm text-gray-600 mb-3">
            To install this app in a new Shopify store, use this URL format:
          </p>
          <code className="block p-2 bg-gray-100 rounded text-sm break-all">
            {window.location.origin}/oauth/install?shop=STORE_NAME
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Replace STORE_NAME with the actual store name (without .myshopify.com)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}