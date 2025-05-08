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

  // Generate suggestions based on query keywords only
  useEffect(() => {
    if (!visible) {
      setSuggestions([]);
      return;
    }

    // Default suggestion generation
    generateKeywordSuggestions();
    
    function generateKeywordSuggestions() {
      // If query is empty or very short, show pre-filled suggestions
      if (!query || query.length < 2) {
        // Emotional and lifestyle-focused suggestions for improved engagement
        const defaultSuggestions = [
          "happy family lifestyle",
          "smiling person in kitchen",
          "children playing at home",
          "relaxed family moments",
          "healthy lifestyle choices", 
          "satisfied customer portrait",
          "people drinking water",
          "family in kitchen",
          "modern home interior",
          "healthy lifestyle",
          "clean water splash",
          "nature landscape"
        ];
        setSuggestions(defaultSuggestions);
        return;
      }

      // Generate variations with emotional and artistic modifiers
      const prefixes = ["happy", "smiling", "healthy", "satisfied", "relaxed", "beautiful", "modern", "elegant"];
      const suffixes = ["lifestyle", "in home", "at home", "portrait", "close-up", "landscape", "scene"];
      
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
      
      // Filter out duplicates and limit to 10 suggestions
      const uniqueSuggestions = Array.from(new Set(newSuggestions)).slice(0, 10);
      setSuggestions(uniqueSuggestions);
    }
  }, [query, visible]);

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