import * as React from "react";
import { X, Check, Image, ChevronsUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  images?: Array<{
    id: number;
    src: string;
    alt?: string;
  }>;
}

interface ProductSelectOption {
  product: Product;
  value: string;
}

interface ProductMultiSelectProps {
  options: Product[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ProductMultiSelect({
  options,
  selected = [],
  onChange,
  placeholder = "Select products...",
  className,
  disabled = false,
}: ProductMultiSelectProps) {
  // State for the search filter
  const [searchQuery, setSearchQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  
  // Ensure selected is always an array, even if it's undefined
  const selectedValues = Array.isArray(selected) ? selected : [];
  
  // Filter options based on search query
  const filteredOptions = options.filter(option => 
    option.title && option.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Remove an item from selection
  const handleRemove = (valueToRemove: string) => {
    onChange(selectedValues.filter(value => value !== valueToRemove));
  };
  
  // Add an item to selection
  const handleSelect = (newValue: string) => {
    if (!selectedValues.includes(newValue)) {
      onChange([...selectedValues, newValue]);
    } else {
      // If already selected, remove it (toggle behavior)
      onChange(selectedValues.filter(value => value !== newValue));
    }
  };
  
  // Find a product by its ID
  const getProductById = (id: string): Product | undefined => {
    return options.find(product => product.id === id);
  };
  
  // Get image URL for a product
  const getProductImageUrl = (product: Product | undefined): string => {
    if (!product || !product.images || product.images.length === 0) {
      return "";
    }
    return product.images[0].src;
  };
  
  // Get a comma-separated list of selected items for the trigger display
  const getSelectedDisplay = (): string => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length === 1) {
      const product = getProductById(selectedValues[0]);
      return product?.title || "1 product selected";
    }
    
    return `${selectedValues.length} products selected`;
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal h-auto py-2"
          >
            {getSelectedDisplay()}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No products found
                </div>
              ) : (
                filteredOptions.map((product) => {
                  const isSelected = selectedValues.includes(product.id);
                  const imageUrl = getProductImageUrl(product);
                  
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                        isSelected ? "bg-secondary" : "hover:bg-accent"
                      )}
                      onClick={() => handleSelect(product.id)}
                    >
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-secondary border">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={product.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Title */}
                      <div className="flex-1 truncate text-sm">
                        {product.title}
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      
      {/* Selected Products Pills */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {selectedValues.map((value) => {
            const product = getProductById(value);
            if (!product) return null;
            
            return (
              <Badge
                key={value}
                variant="secondary"
                className="py-1 pl-1 pr-1.5 gap-1.5 items-center"
              >
                {/* Tiny product image */}
                <div className="w-5 h-5 rounded overflow-hidden bg-background flex-shrink-0">
                  {getProductImageUrl(product) ? (
                    <img 
                      src={getProductImageUrl(product)} 
                      alt={product.title}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <span className="truncate max-w-[180px]">{product.title}</span>
                
                <button
                  className="hover:bg-muted rounded-full p-0.5 focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(value);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}