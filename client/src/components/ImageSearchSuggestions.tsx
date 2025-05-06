import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface ImageSearchSuggestionsProps {
  query: string;
  onSuggestionSelect: (suggestion: string) => void;
  productTitle?: string;
  visible: boolean;
}

export default function ImageSearchSuggestions({
  query,
  onSuggestionSelect,
  productTitle,
  visible
}: ImageSearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate suggestions based on query and product title
  useEffect(() => {
    if (!query || query.length < 2 || !visible) {
      setSuggestions([]);
      return;
    }

    // Generic search prefixes and suffixes
    const prefixes = ["high quality", "professional", "detailed", "beautiful", "modern"];
    const suffixes = ["photo", "image", "photography", "picture", "close-up"];
    
    // Generate suggestions
    const newSuggestions: string[] = [];
    
    // Direct matches
    newSuggestions.push(query);
    
    // Prefix combinations
    prefixes.forEach(prefix => {
      newSuggestions.push(`${prefix} ${query}`);
    });
    
    // Suffix combinations
    suffixes.forEach(suffix => {
      newSuggestions.push(`${query} ${suffix}`);
    });
    
    // Product-specific suggestions
    if (productTitle && productTitle.toLowerCase() !== query.toLowerCase()) {
      newSuggestions.push(`${productTitle} with ${query}`);
      newSuggestions.push(`${query} for ${productTitle}`);
      newSuggestions.push(`${productTitle} ${query}`);
    }
    
    // Filter out duplicates and limit to 10 suggestions
    const uniqueSuggestions = [...new Set(newSuggestions)].slice(0, 10);
    setSuggestions(uniqueSuggestions);
  }, [query, productTitle, visible]);

  if (!visible || !suggestions.length) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="absolute left-0 right-0 top-full mt-1 bg-white rounded-md border border-gray-200 shadow-lg z-50 overflow-hidden"
    >
      <ul className="py-1">
        {suggestions.map((suggestion, index) => (
          <li 
            key={index} 
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
            onClick={() => onSuggestionSelect(suggestion)}
          >
            <Search className="h-4 w-4 text-gray-400" />
            <span>{suggestion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}