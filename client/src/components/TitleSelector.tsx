import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the interface for title suggestions
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
  const [isLoading, setIsLoading] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const { toast } = useToast();

  // Generate title suggestions based on keywords when dialog opens
  useEffect(() => {
    if (open && selectedKeywords.length > 0 && titleSuggestions.length === 0) {
      generateTitleSuggestions();
    }
  }, [open, selectedKeywords]);

  // Function to generate title suggestions
  const generateTitleSuggestions = async () => {
    if (!selectedKeywords || selectedKeywords.length === 0) {
      toast({
        title: "No keywords selected",
        description: "Please select keywords first to generate title suggestions",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiRequest({
        url: '/api/admin/title-suggestions',
        method: 'POST',
        data: {
          keywords: selectedKeywords,
          productTitle: productTitle,
          count: 5
        }
      });
      
      if (response.success && response.titles && response.titles.length > 0) {
        setTitleSuggestions(response.titles);
        setSelectedTitle(response.titles[0]); // Default select the first suggestion
      } else {
        throw new Error("No title suggestions were returned");
      }
    } catch (error: any) {
      console.error('Failed to generate title suggestions:', error);
      toast({
        title: "Title generation failed",
        description: error.message || "Could not generate title suggestions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selection confirmation
  const handleConfirm = () => {
    if (selectedTitle) {
      onTitleSelected(selectedTitle);
      onOpenChange(false);
    } else {
      toast({
        title: "No title selected",
        description: "Please select a title suggestion",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShieldCheck className="h-6 w-6 mr-2 text-blue-500" />
            Title Suggestions
          </DialogTitle>
          <DialogDescription>
            Choose an SEO-optimized title for your content based on your selected keywords.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-sm text-muted-foreground">Generating title suggestions...</p>
          </div>
        ) : (
          <>
            {titleSuggestions.length > 0 ? (
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <RadioGroup 
                  value={selectedTitle} 
                  onValueChange={setSelectedTitle}
                  className="space-y-3"
                >
                  {titleSuggestions.map((title, index) => (
                    <div key={index} className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted">
                      <RadioGroupItem value={title} id={`title-${index}`} />
                      <Label 
                        htmlFor={`title-${index}`} 
                        className="font-medium text-base cursor-pointer"
                      >
                        {title}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            ) : (
              <div className="py-4 text-center">
                <p className="text-muted-foreground">
                  No title suggestions available. Please select keywords first.
                </p>
              </div>
            )}
          </>
        )}
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => generateTitleSuggestions()}
            disabled={isLoading || selectedKeywords.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Regenerate Titles'
            )}
          </Button>
          
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={isLoading || !selectedTitle}
          >
            Use Selected Title
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}