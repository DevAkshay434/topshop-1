import * as React from "react";
import { X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected = [],
  onChange,
  placeholder = "Select options...",
  className,
  disabled = false,
}: MultiSelectProps) {
  // Ensure selected is always an array, even if it's undefined
  const selectedValues = Array.isArray(selected) ? selected : [];
  
  // For debugging
  React.useEffect(() => {
    if (selected === undefined) {
      console.log("MultiSelect received undefined selected value");
    }
  }, [selected]);
  
  // Remove an item from selection
  const handleRemove = (valueToRemove: string) => {
    onChange(selectedValues.filter(value => value !== valueToRemove));
  };
  
  // Add an item to selection
  const handleAdd = (newValue: string) => {
    if (!selectedValues.includes(newValue)) {
      onChange([...selectedValues, newValue]);
    }
  };
  
  // Get available options (those not already selected)
  const availableOptions = options.filter(option => !selectedValues.includes(option.value));

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Display selected items as badges */}
      <div className="flex flex-wrap gap-1 min-h-[36px] p-1 border rounded-md">
        {selectedValues.length === 0 && (
          <div className="text-muted-foreground text-sm px-2 py-1">{placeholder}</div>
        )}
        
        {selectedValues.map(value => {
          const option = options.find(o => o.value === value);
          return (
            <Badge key={value} variant="secondary" className="flex items-center gap-1 px-2 py-1">
              {option?.label || value}
              <button
                type="button"
                onClick={() => handleRemove(value)}
                className="rounded-full hover:bg-muted"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
      
      {/* Dropdown to add more items */}
      {!disabled && availableOptions.length > 0 && (
        <Select
          onValueChange={handleAdd}
          value=""
        >
          <SelectTrigger className="w-full h-8 px-2 text-xs">
            <SelectValue placeholder="Add item..." />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}