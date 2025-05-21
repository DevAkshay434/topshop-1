import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Tag, 
  CheckSquare, 
  FileText, 
  Image, 
  X,
  ArrowRight
} from "lucide-react";

// Collection interface similar to Product
interface Collection {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
  admin_url?: string;
  image_url?: string;
}

interface RelatedCollectionsSelectorProps {
  collections: Collection[];
  selectedCollections: Collection[];
  onCollectionSelect: (collection: Collection) => void;
  onCollectionRemove: (collectionId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function RelatedCollectionsSelector({
  collections,
  selectedCollections,
  onCollectionSelect,
  onCollectionRemove,
  onContinue,
  onBack
}: RelatedCollectionsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter collections based on search query
  const filteredCollections = collections.filter(collection => 
    collection.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Select Related Collections
        </CardTitle>
        <CardDescription>
          Choose collections that are related to your content to group products and categories together
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search collections..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Selected Collections Summary */}
        {selectedCollections.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-primary" />
              Selected Collections ({selectedCollections.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCollections.map((collection) => (
                <Badge 
                  key={collection.id} 
                  variant="secondary" 
                  className="flex items-center gap-1 py-1.5 pl-2 pr-1.5"
                >
                  {collection.title}
                  <Button
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => onCollectionRemove(collection.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Collection List */}
        <div>
          <div className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <Tag className="h-4 w-4 text-primary" />
            Available Collections
          </div>
          
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredCollections.length === 0 ? (
                <div className="col-span-2 p-4 text-center text-muted-foreground">
                  No collections found matching "{searchQuery}"
                </div>
              ) : (
                filteredCollections.map((collection) => {
                  const isSelected = selectedCollections.some(c => c.id === collection.id);
                  
                  // Extract image URL from collection
                  const imageUrl = collection.image_url || (collection.image ? typeof collection.image === 'string' ? collection.image : '' : '');
                  
                  return (
                    <div
                      key={collection.id}
                      className={`flex items-start gap-3 p-2 rounded-md border ${
                        isSelected ? "bg-secondary" : "hover:bg-accent"
                      }`}
                    >
                      {/* Collection Image */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-secondary">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={collection.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Collection Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium truncate" title={collection.title}>
                            {collection.title}
                          </h4>
                          <Checkbox
                            checked={isSelected}
                            id={`collection-${collection.id}`}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onCollectionSelect(collection);
                              } else {
                                onCollectionRemove(collection.id);
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {collection.handle}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} className="flex items-center gap-1">
          Continue <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}