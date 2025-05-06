import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImagePromptSuggestionsProps {
  onPromptSelected: (prompt: string) => void;
  productTitle?: string;
}

export default function ImagePromptSuggestions({ 
  onPromptSelected,
  productTitle
}: ImagePromptSuggestionsProps) {
  
  // Pre-defined prompt categories
  const categories = {
    product: [
      "Professional product showcase",
      "Product in use by customer",
      "Product with natural background",
      "Product detail closeup",
      "Product with lifestyle setting"
    ],
    household: [
      "Modern home interior with product",
      "Beautiful kitchen showcase",
      "Clean bathroom design",
      "Organized living room",
      "Luxury home design"
    ],
    people: [
      "Happy family using product",
      "Satisfied customer testimonial",
      "Child safely using product",
      "Professional installing product",
      "Customer experiencing benefits"
    ],
    lifestyle: [
      "Healthy lifestyle representation",
      "Eco-friendly sustainable living",
      "Modern lifestyle with product",
      "Outdoor activity with product",
      "Wellness and self-care scene"
    ],
    nature: [
      "Natural landscape with product",
      "Environmental benefits visual",
      "Eco-friendly product showcase",
      "Product in natural setting",
      "Clean environment imagery"
    ]
  };
  
  // Custom prompts if product title is provided
  const getCustomPrompts = () => {
    if (!productTitle) return [];
    
    return [
      `${productTitle} in modern home setting`,
      `Person using ${productTitle}`,
      `${productTitle} with stylish background`,
      `Benefits of ${productTitle} visual`,
      `Close-up details of ${productTitle}`
    ];
  };
  
  const customPrompts = getCustomPrompts();
  
  return (
    <div className="w-full border rounded-md">
      <Tabs defaultValue="product">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
          <TabsTrigger value="nature">Nature</TabsTrigger>
        </TabsList>
        
        {Object.entries(categories).map(([key, prompts]) => (
          <TabsContent key={key} value={key} className="p-4">
            <ScrollArea className="h-[120px] rounded-md">
              <div className="flex flex-wrap gap-2">
                {prompts.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => onPromptSelected(prompt)}
                    className="text-xs"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
      
      {customPrompts.length > 0 && (
        <div className="p-4 border-t">
          <h4 className="text-sm font-medium mb-2">Product-specific suggestions</h4>
          <div className="flex flex-wrap gap-2">
            {customPrompts.map((prompt, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => onPromptSelected(prompt)}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}