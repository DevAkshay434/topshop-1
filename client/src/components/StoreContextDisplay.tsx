import { useStoreContext } from "@/hooks/useStoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

export default function StoreContextDisplay() {
  const { storeId, shopDomain, isEmbedded } = useStoreContext();

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Store Context
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div><strong>Store ID:</strong> {storeId || 'Not detected'}</div>
          <div><strong>Shop Domain:</strong> {shopDomain || 'Not detected'}</div>
          <div><strong>Embedded Mode:</strong> {isEmbedded ? 'Yes' : 'No'}</div>
          <div><strong>URL Params:</strong> {window.location.search || 'None'}</div>
        </div>
      </CardContent>
    </Card>
  );
}