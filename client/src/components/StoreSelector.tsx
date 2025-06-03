import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getStoreNameFromShop } from '../utils/shopifyAuth';

interface StoreSelectorProps {
  currentStoreId: number | null;
  currentShopDomain: string | null;
  onStoreChange: (storeId: number, shopDomain: string) => void;
}

const AVAILABLE_STORES = [
  { id: 1, domain: 'rajeshshah.myshopify.com', name: 'Rajesh Shah Store' },
  { id: 2, domain: 'reviewtesting434.myshopify.com', name: 'Review Testing Store' }
];

export function StoreSelector({ currentStoreId, currentShopDomain, onStoreChange }: StoreSelectorProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(currentStoreId?.toString() || '');

  const handleStoreChange = () => {
    const storeId = parseInt(selectedStoreId);
    const store = AVAILABLE_STORES.find(s => s.id === storeId);
    if (store) {
      onStoreChange(store.id, store.domain);
    }
  };

  const currentStore = AVAILABLE_STORES.find(s => s.id === currentStoreId);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Store Context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm font-medium mb-2 block">Current Store</label>
            <div className="p-2 bg-muted rounded text-sm">
              {currentStore ? (
                <div>
                  <div className="font-medium">{currentStore.name}</div>
                  <div className="text-muted-foreground">{currentStore.domain}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">No store detected</div>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Switch Store</label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Select store..." />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_STORES.map(store => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleStoreChange}
            disabled={!selectedStoreId || selectedStoreId === currentStoreId?.toString()}
          >
            Switch Store
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Store ID: {currentStoreId || 'None'} | 
          Shop Domain: {currentShopDomain || 'None'}
        </div>
      </CardContent>
    </Card>
  );
}