import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Search, Check } from 'lucide-react';

interface Product {
  id: number | string;
  title: string;
  description?: string;
  image?: string;
  price?: string;
}

interface ProductSelectorProps {
  products: Product[];
  onProductsSelected: (selectedProducts: Product[]) => void;
  selectedProducts?: Product[];
  maxSelections?: number;
}

export default function ProductSelector({
  products,
  onProductsSelected,
  selectedProducts = [],
  maxSelections = 3
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selected, setSelected] = useState<Product[]>(selectedProducts);

  // Filter products based on search query
  const filteredProducts = products.filter(product => 
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle product selection/deselection
  const toggleProduct = (product: Product) => {
    const isSelected = selected.some(p => p.id === product.id);
    
    if (isSelected) {
      // Remove product if already selected
      setSelected(selected.filter(p => p.id !== product.id));
    } else {
      // Add product if not at max selections
      if (selected.length < maxSelections) {
        setSelected([...selected, product]);
      }
    }
  };

  // Handle submit - pass selected products to parent
  const handleSubmit = () => {
    onProductsSelected(selected);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Products</CardTitle>
          <CardDescription>
            Choose up to {maxSelections} products to write content about
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                No products found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const isSelected = selected.some(p => p.id === product.id);
                  
                  return (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer transition ${isSelected ? 'border-primary' : ''}`}
                      onClick={() => toggleProduct(product)}
                    >
                      <CardHeader className="pb-2 relative">
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                        <CardTitle className="text-sm truncate">{product.title}</CardTitle>
                        <CardDescription className="text-xs truncate">
                          ID: {product.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {product.image && (
                          <div className="aspect-video bg-muted rounded-sm overflow-hidden mb-2">
                            <img 
                              src={product.image} 
                              alt={product.title} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <p className="text-xs line-clamp-2 text-muted-foreground">
                          {product.description || "No description available"}
                        </p>
                      </CardContent>
                      <CardFooter>
                        {product.price && (
                          <p className="text-xs font-medium">{product.price}</p>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {selected.length} of {maxSelections} products selected
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={selected.length === 0}
            className="flex items-center"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Continue with {selected.length} {selected.length === 1 ? 'product' : 'products'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}