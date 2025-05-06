import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImagePromptSuggestionsProps {
  onPromptSelected: (prompt: string) => void;
  productTitle?: string;
}

export default function ImagePromptSuggestions({ 
  onPromptSelected, 
  productTitle 
}: ImagePromptSuggestionsProps) {
  // Base prompt suggestions
  const generalPrompts = [
    "product lifestyle photography",
    "product in use",
    "minimalist product display",
    "luxury product showcase",
    "product flat lay photography"
  ];
  
  // Context-specific prompts
  const contextPrompts = [
    "people using product",
    "product in natural setting",
    "product with complementary items",
    "close-up product details",
    "product in modern home",
    "product in office setting"
  ];
  
  // Aesthetic style prompts
  const stylePrompts = [
    "professional product photography",
    "bright clean product photography",
    "moody dramatic product photography",
    "colorful product display",
    "monochrome product photography",
    "vintage style product photography"
  ];
  
  // Product-specific prompts if product title is provided
  const getProductSpecificPrompts = () => {
    if (!productTitle) return [];
    
    // Extract key terms from product title
    const terms = productTitle
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(' ')
      .filter(term => term.length > 3 && !['with', 'that', 'this', 'from', 'for'].includes(term));
    
    if (terms.length === 0) return [];
    
    // Generate product-specific prompts
    return [
      `${productTitle} in use`,
      `${productTitle} close-up`,
      `${productTitle} lifestyle photography`,
      `${productTitle} on white background`,
      `${terms[0]} product photography`
    ];
  };
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium mb-2">Click a suggestion to search for images:</div>
      
      <ScrollArea className="h-64 rounded-md border p-2">
        <div className="space-y-4">
          {/* Product-specific suggestions if available */}
          {productTitle && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Product Specific</h3>
              <div className="grid grid-cols-1 gap-2">
                {getProductSpecificPrompts().map((prompt, index) => (
                  <Card 
                    key={`product-${index}`}
                    className="p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onPromptSelected(prompt)}
                  >
                    <span className="text-sm">{prompt}</span>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* General prompts */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">General Product Photos</h3>
            <div className="grid grid-cols-1 gap-2">
              {generalPrompts.map((prompt, index) => (
                <Card 
                  key={`general-${index}`}
                  className="p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onPromptSelected(prompt)}
                >
                  <span className="text-sm">{prompt}</span>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Context prompts */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Context & Setting</h3>
            <div className="grid grid-cols-1 gap-2">
              {contextPrompts.map((prompt, index) => (
                <Card 
                  key={`context-${index}`}
                  className="p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onPromptSelected(prompt)}
                >
                  <span className="text-sm">{prompt}</span>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Style prompts */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Photo Styles</h3>
            <div className="grid grid-cols-1 gap-2">
              {stylePrompts.map((prompt, index) => (
                <Card 
                  key={`style-${index}`}
                  className="p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => onPromptSelected(prompt)}
                >
                  <span className="text-sm">{prompt}</span>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // Get a random prompt from all categories
            const allPrompts = [
              ...generalPrompts,
              ...contextPrompts,
              ...stylePrompts,
              ...getProductSpecificPrompts()
            ];
            const randomIndex = Math.floor(Math.random() * allPrompts.length);
            onPromptSelected(allPrompts[randomIndex]);
          }}
        >
          Random Suggestion
        </Button>
        
        <Button 
          size="sm"
          onClick={() => {
            // If product title exists, use it as base, otherwise use generic term
            const basePrompt = productTitle || "product";
            onPromptSelected(basePrompt);
          }}
        >
          Use Simple Search
        </Button>
      </div>
    </div>
  );
}