import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface TitleSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTitleSelected: (title: string) => void;
  selectedKeywords: any[];
  selectedProducts?: any[];
  productTitle?: string;
  targetAudience?: string;
  buyerPersona?: string;
}

export default function TitleSelector({
  open,
  onOpenChange,
  onTitleSelected,
  selectedKeywords,
  selectedProducts = [],
  productTitle,
  targetAudience,
  buyerPersona
}: TitleSelectionProps) {
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate title suggestions when the component is opened
  useEffect(() => {
    if (open && selectedKeywords.length > 0) {
      generateTitles();
    }
  }, [open, selectedKeywords]);

  const generateTitles = async () => {
    setIsLoading(true);
    setError(null);
    
    // Prepare keywords array from selectedKeywords
    const keywords = selectedKeywords.map(k => k.keyword).filter(Boolean);
    
    // Prepare products array for enhanced context
    const products = selectedProducts.map(p => ({
      title: p.title,
      id: p.id,
      description: p.description || ''
    }));
    
    // Log the request data for debugging
    const requestData = {
      keywords,
      products,
      count: 12,
      targetAudience: targetAudience || buyerPersona
    };
    
    console.log("Generating dynamic AI titles with data:", requestData);
    
    try {
      // First try the new dynamic title generation endpoint
      const response = await apiRequest({
        url: '/api/dynamic-title-suggestions',
        method: 'POST',
        data: requestData
      });
      
      console.log("Dynamic title suggestions response:", response);
      
      if (response.success && response.titles && response.titles.length > 0) {
        console.log("Setting new dynamic AI-generated titles:", response.titles);
        setTitleSuggestions(response.titles);
        
        if (response.usedFallback) {
          toast({
            title: 'Titles Generated',
            description: 'Using keyword-based suggestions (AI service temporarily unavailable)',
            variant: 'default'
          });
        } else {
          toast({
            title: 'AI Titles Generated',
            description: `${response.titles.length} dynamic titles created using ChatGPT`,
            variant: 'default'
          });
        }
      } else {
        throw new Error('Failed to generate dynamic titles');
      }
    } catch (err: any) {
      console.error('Dynamic title generation failed, falling back to original endpoint:', err);
      
      // Fallback to original title suggestions endpoint
      try {
        const fallbackData = {
          keywords: selectedKeywords.map(k => k.keyword),
          keywordData: selectedKeywords,
          productTitle: productTitle,
          targetAudience: targetAudience,
          buyerPersona: buyerPersona
        };
        
        const fallbackResponse = await apiRequest({
          url: '/api/admin/title-suggestions',
          method: 'POST',
          data: fallbackData
        });
        
        if (fallbackResponse.success && fallbackResponse.titles && fallbackResponse.titles.length > 0) {
          setTitleSuggestions(fallbackResponse.titles);
          toast({
            title: 'Titles Generated',
            description: 'Using fallback title generation',
            variant: 'default'
          });
        } else {
          throw new Error('Both title generation methods failed');
        }
      } catch (fallbackErr: any) {
        console.error('All title generation methods failed:', fallbackErr);
        setError('Could not generate title suggestions. Please try again.');
        toast({
          title: 'Error',
          description: 'Failed to generate title suggestions. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleSelect = (title: string) => {
    onTitleSelected(title);
    onOpenChange(false);
  };

  return (
    <div className="space-y-4 py-4">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="mt-4 text-center text-muted-foreground">
            Generating title suggestions based on your selected keywords...
          </p>
        </div>
      ) : error ? (
        <div className="text-center p-4 space-y-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={generateTitles}>Try Again</Button>
        </div>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Choose an SEO-optimized title:</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {titleSuggestions.length > 0 ? (
                titleSuggestions.map((title, index) => (
                  <Card
                    key={index}
                    className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors border-2 ${index < 3 ? 'border-blue-200' : 'border-transparent'}`}
                    onClick={() => handleTitleSelect(title)}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-md text-blue-700">{title}</h3>
                        {index < 3 && (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {index === 0 ? 'Best for SEO' : index === 1 ? 'Trending format' : 'High CTR'}
                          </span>
                        )}
                      </div>
                      <span className="ml-2 text-sm text-slate-400 opacity-75">#{index + 1}</span>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center p-4 col-span-2">
                  <p>No title suggestions available</p>
                  <Button 
                    onClick={generateTitles} 
                    className="mt-2"
                    disabled={selectedKeywords.length === 0}
                  >
                    Generate Titles
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={generateTitles}
              disabled={isLoading || selectedKeywords.length === 0}
            >
              Generate New Suggestions
            </Button>
          </div>
        </>
      )}
    </div>
  );
}