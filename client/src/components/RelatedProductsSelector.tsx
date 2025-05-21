import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Tag, 
  CheckSquare, 
  Package, 
  Image, 
  X,
  ArrowRight
} from "lucide-react";
// Use the Product interface from the AdminPanel
interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
  admin_url?: string;
}

interface RelatedProductsSelectorProps {
  products: Product[];
  selectedProducts: Product[];
  onProductSelect: (product: Product) => void;
  onProductRemove: (productId: string) => void;
  onContinue: () => void;
}

export function RelatedProductsSelector({
  products,
  selectedProducts,
  onProductSelect,
  onProductRemove,
  onContinue
}: RelatedProductsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter products based on search query
  const filteredProducts = products.filter(product => 
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Select Related Products
        </CardTitle>
        <CardDescription>
          Choose products that are related to your content to improve cross-selling opportunities
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Selected Products Summary */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-primary" />
              Selected Products ({selectedProducts.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProducts.map((product) => (
                <Badge 
                  key={product.id} 
                  variant="secondary" 
                  className="flex items-center gap-1 py-1.5 pl-2 pr-1.5"
                >
                  {product.title}
                  <Button
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => onProductRemove(product.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Product List */}
        <div>
          <div className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            Available Products
          </div>
          
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 p-4 text-center text-muted-foreground">
                  No products found matching "{searchQuery}"
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedProducts.some(p => p.id === product.id);
                  
                  return (
                    <div
                      key={product.id}
                      className={`flex items-start gap-3 p-2 rounded-md border ${
                        isSelected ? "bg-secondary" : "hover:bg-accent"
                      }`}
                    >
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-secondary">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium truncate" title={product.title}>
                            {product.title}
                          </h4>
                          <Checkbox
                            checked={isSelected}
                            id={`product-${product.id}`}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onProductSelect(product);
                              } else {
                                onProductRemove(product.id);
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {product.handle}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button">
          Skip
        </Button>
        <Button onClick={onContinue} className="flex items-center gap-1">
          Continue <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}