import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

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
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.target as HTMLInputElement;
    if (input.value === "" && e.key === "Backspace") {
      onChange(selected.slice(0, -1));
    }
  };

  // Create a map of the selected values for O(1) lookup
  const selectedMap = React.useMemo(() => {
    return selected.reduce<Record<string, boolean>>((acc, curr) => {
      acc[curr] = true;
      return acc;
    }, {});
  }, [selected]);

  return (
    <div
      className={cn(
        "w-full border border-input rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-10 relative",
        className
      )}
    >
      <div className="flex flex-wrap gap-1 p-1.5">
        {selected.map((value) => {
          const option = options.find((opt) => opt.value === value);
          return (
            <Badge key={value} variant="secondary" className="rounded-sm">
              {option?.label || value}
              {!disabled && (
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}

        <CommandPrimitive
          className="flex items-center flex-1 min-w-[120px]"
          onKeyDown={handleKeyDown}
        >
          <input
            disabled={disabled}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setOpen(true)}
            className="placeholder:text-muted-foreground px-1 py-0.5 outline-none flex-1 bg-transparent text-sm"
            placeholder={selected.length === 0 ? placeholder : ""}
          />
        </CommandPrimitive>
      </div>

      <div className="relative">
        {open && (
          <Command
            className="absolute w-full z-10 bg-popover text-popover-foreground shadow-md rounded-md border mt-1 max-h-60 overflow-auto"
            filter={(value, search) => {
              const option = options.find((opt) => opt.value === value);
              if (!option) return 0;
              return option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandGroup>
              {options.map((option) => {
                const isSelected = !!selectedMap[option.value];
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        handleUnselect(option.value);
                      } else {
                        onChange([...selected, option.value]);
                      }
                      setInputValue("");
                    }}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      isSelected ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    {option.label}
                  </CommandItem>
                );
              })}
              {options.length === 0 && (
                <div className="py-2 px-3 text-center text-sm text-muted-foreground">
                  No results found.
                </div>
              )}
            </CommandGroup>
          </Command>
        )}
      </div>
    </div>
  );
}