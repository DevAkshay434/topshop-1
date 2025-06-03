import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoreQuery } from "@/hooks/useStoreQuery";
import { useStoreApiRequest } from "@/hooks/useStoreApiRequest";
import { Building, Database, TestTube } from "lucide-react";

export default function MultiStoreTest() {
  const [testStoreId, setTestStoreId] = useState<string>("1");
  const { storeApiRequest } = useStoreApiRequest();

  // Test queries for different stores
  const { data: store1Blogs, refetch: refetchStore1 } = useStoreQuery<{ blogs: any[] }>(["/api/admin/blogs?store_id=1"]);
  const { data: store2Blogs, refetch: refetchStore2 } = useStoreQuery<{ blogs: any[] }>(["/api/admin/blogs?store_id=2"]);

  const handleTestStoreIsolation = async () => {
    console.log("Testing store isolation...");
    
    // Refetch data for both stores
    await Promise.all([refetchStore1(), refetchStore2()]);
    
    console.log("Store 1 blogs:", store1Blogs);
    console.log("Store 2 blogs:", store2Blogs);
  };

  const handleSimulateStoreContext = async (storeId: string) => {
    console.log(`Simulating store context for store ${storeId}`);
    
    // Test API call with specific store context
    try {
      const response = await fetch(`/api/admin/blogs?store_id=${storeId}`);
      const data = await response.json();
      console.log(`Store ${storeId} data:`, data);
    } catch (error) {
      console.error(`Error fetching store ${storeId} data:`, error);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Multi-Store Isolation Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Store 1 (rajeshshah)
            </h4>
            <div className="text-sm text-gray-600">
              Blog ID: {store1Blogs?.blogs?.[0]?.id || 'Loading...'}
            </div>
            <div className="text-sm text-gray-600">
              Blogs Count: {store1Blogs?.blogs?.length || 0}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Building className="h-4 w-4" />
              Store 2 (reviewtesting434)
            </h4>
            <div className="text-sm text-gray-600">
              Blog ID: {store2Blogs?.blogs?.[0]?.id || 'Loading...'}
            </div>
            <div className="text-sm text-gray-600">
              Blogs Count: {store2Blogs?.blogs?.length || 0}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={testStoreId} onValueChange={setTestStoreId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select store to test" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Store 1 (rajeshshah)</SelectItem>
              <SelectItem value="2">Store 2 (reviewtesting434)</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => handleSimulateStoreContext(testStoreId)} variant="outline">
            Test Store Context
          </Button>
        </div>

        <Button onClick={handleTestStoreIsolation} className="w-full">
          <Database className="mr-2 h-4 w-4" />
          Test Data Isolation
        </Button>
      </CardContent>
    </Card>
  );
}