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
  productTitle?: string;
}

export default function TitleSelector({
  open,
  onOpenChange,
  onTitleSelected,
  selectedKeywords,
  productTitle
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
    
    try {
      const response = await apiRequest({
        url: '/api/admin/title-suggestions',
        method: 'POST',
        data: {
          keywords: selectedKeywords.map(k => k.keyword),
          keywordData: selectedKeywords,
          productTitle: productTitle
        }
      });
      
      if (response.success && response.titles && response.titles.length > 0) {
        setTitleSuggestions(response.titles);
      } else {
        setError('Could not generate title suggestions');
        toast({
          title: 'Error',
          description: 'Failed to generate title suggestions',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      console.error('Title suggestion error:', err);
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate title suggestions',
        variant: 'destructive'
      });
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
          <div className="space-y-4">
            {titleSuggestions.length > 0 ? (
              titleSuggestions.map((title, index) => (
                <Card
                  key={index}
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleTitleSelect(title)}
                >
                  <h3 className="font-medium text-lg text-blue-700">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click to select this title
                  </p>
                </Card>
              ))
            ) : (
              <div className="text-center p-4">
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
          
          <div className="flex justify-between pt-2">
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