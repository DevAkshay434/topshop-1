import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImageSearchSuggestionsProps {
  query: string;
  onSuggestionSelect: (suggestion: string) => void;
  productTitle?: string;
  productId?: string;
  productDescription?: string;
  visible: boolean;
}

export default function ImageSearchSuggestions({
  query,
  onSuggestionSelect,
  productTitle,
  productId,
  productDescription,
  visible
}: ImageSearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestInProgressRef = useRef<boolean>(false);

  // Generate suggestions based on query and product title
  useEffect(() => {
    if (!visible) {
      setSuggestions([]);
      return;
    }

    // If product title is available, use ChatGPT to generate product-specific suggestions
    if (productTitle && productId && !requestInProgressRef.current) {
      requestInProgressRef.current = true;
      setIsLoading(true);
      
      const fetchProductSuggestions = async () => {
        try {
          console.log("Fetching AI-generated product-specific image suggestions for:", productTitle);
          
          const response = await apiRequest({
            url: '/api/admin/image-suggestions-for-product',
            method: 'POST',
            data: {
              productId: productId,
              productTitle: productTitle,
              productDescription: productDescription || '',
              productType: '',
              productTags: []
            }
          });
          
          if (response?.success && Array.isArray(response.suggestions) && response.suggestions.length > 0) {
            console.log("Using AI-generated product-specific image suggestions:", response.suggestions);
            setSuggestions(response.suggestions);
          } else {
            // Fall back to default generation if API returns no suggestions
            generateDefaultSuggestions();
          }
        } catch (error) {
          console.error("Error fetching product-specific image suggestions:", error);
          // Fall back to manual generation if API fails
          generateDefaultSuggestions();
        } finally {
          setIsLoading(false);
          requestInProgressRef.current = false;
        }
      };
      
      fetchProductSuggestions();
      return;
    }

    // Default suggestion generation
    generateDefaultSuggestions();
    
    function generateDefaultSuggestions() {
      // If query is empty or very short, show pre-filled suggestions
      if (!query || query.length < 2) {
        // Emotional and lifestyle-focused suggestions for improved engagement
        const defaultSuggestions = [
          "happy family drinking water",
          "smiling child drinking water",
          "pregnant woman drinking water",
          "baby drinking filtered water",
          "family in kitchen with water filter",
          "woman enjoying clean water",
          "athlete drinking filtered water",
          "couple installing water filter",
          "healthy lifestyle water drinking",
          "mother giving child pure water",
          "elderly person drinking clean water",
          "water filter healthy home"
        ];
        setSuggestions(defaultSuggestions);
        return;
      }

      // Emotional and lifestyle-focused prefixes and suffixes for better engagement
      const prefixes = ["happy", "smiling", "healthy", "satisfied", "relaxed"];
      const suffixes = ["for family", "lifestyle", "in kitchen", "at home", "for health"];
      
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
      
      // Product-specific suggestions using simple patterns
      if (productTitle && productTitle.toLowerCase() !== query.toLowerCase()) {
        newSuggestions.push(`${productTitle} with ${query}`);
        newSuggestions.push(`${query} for ${productTitle}`);
        newSuggestions.push(`${productTitle} ${query}`);
      }
      
      // Filter out duplicates and limit to 10 suggestions
      const uniqueSuggestions = Array.from(new Set(newSuggestions)).slice(0, 10);
      setSuggestions(uniqueSuggestions);
    }
  }, [query, productTitle, productId, productDescription, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="absolute left-0 right-0 top-full mt-1 bg-white rounded-md border border-gray-200 shadow-lg z-[100] overflow-hidden max-h-[300px] overflow-y-auto"
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader className="h-5 w-5 text-blue-500 animate-spin mr-2" />
          <span className="text-sm text-gray-600">Generating suggestions...</span>
        </div>
      ) : !suggestions.length ? (
        <div className="p-4 text-center text-sm text-gray-500">
          No suggestions available
        </div>
      ) : (
        <ul className="py-1">
          {suggestions.map((suggestion, index) => (
            <li 
              key={index} 
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
              onMouseDown={(e) => {
                // Using onMouseDown instead of onClick prevents the onBlur from firing first
                e.preventDefault();
                onSuggestionSelect(suggestion);
              }}
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}