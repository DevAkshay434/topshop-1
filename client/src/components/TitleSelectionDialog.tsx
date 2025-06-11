import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles, Target } from "lucide-react";

interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  image?: string;
}

export interface TitleSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  selectedCollections: Collection[];
  productTitle: string;
  onTitleSelected: (title: string) => void;
}

export function TitleSelectionDialog({
  open,
  onOpenChange,
  selectedProducts,
  selectedCollections,
  productTitle,
  onTitleSelected
}: TitleSelectionProps) {
  const [suggestedTitles] = useState([
    "Ultimate Guide to " + (productTitle || "Product Benefits"),
    "How to Choose the Perfect " + (productTitle || "Product"),
    "Top 10 Benefits of " + (productTitle || "This Product"),
    "Everything You Need to Know About " + (productTitle || "Products"),
    "The Complete " + (productTitle || "Product") + " Buying Guide"
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Select Content Title
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Choose from AI-generated title suggestions or use the custom title field
          </div>
          
          {/* Suggested Titles */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Suggested Titles
            </h3>
            
            <div className="grid gap-2">
              {suggestedTitles.map((title, index) => (
                <Card key={index} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          SEO Score: {85 + index * 2}% | Length: {title.length} chars
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onTitleSelected(title)}
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Context Information */}
          {(selectedProducts.length > 0 || selectedCollections.length > 0) && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Selected Context
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedProducts.map((product) => (
                  <Badge key={product.id} variant="secondary">
                    {product.title}
                  </Badge>
                ))}
                {selectedCollections.map((collection) => (
                  <Badge key={collection.id} variant="outline">
                    {collection.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}