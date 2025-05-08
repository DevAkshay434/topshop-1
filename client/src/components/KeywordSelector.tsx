import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Filter, Search, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

// Interface for keyword data
interface KeywordData {
  keyword: string;
  searchVolume?: number;
  cpc?: number;
  competition?: number;
  competitionLevel?: string;
  intent?: string;
  difficulty?: number;
  selected: boolean;
  isMainKeyword?: boolean; // Flag to mark main keyword
  _originalSearchVolume?: number; // Store original search volume when marking as main
}

interface KeywordSelectorProps {
  initialKeywords?: KeywordData[];
  onKeywordsSelected: (keywords: KeywordData[]) => void;
  title?: string;
  onClose?: () => void;
  productTitle?: string; // Add this to use selected product title
}

export default function KeywordSelector({
  initialKeywords = [],
  onKeywordsSelected,
  title = "Select Keywords for Your Content",
  onClose,
  productTitle
}: KeywordSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<KeywordData[]>(initialKeywords);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIntent, setFilterIntent] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [directTopic, setDirectTopic] = useState(productTitle || ""); // Pre-populate with product title if available

  // Count selected keywords
  const selectedCount = keywords.filter(kw => kw.selected).length;

  // Filter keywords based on search and intent filter
  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIntent = filterIntent ? keyword.intent === filterIntent : true;
    return matchesSearch && matchesIntent;
  });

  // Handle keyword selection with limits (1 main + up to 3 secondary)
  const toggleKeywordSelection = (index: number) => {
    const updatedKeywords = [...keywords];
    const currentKeyword = updatedKeywords[index];
    const currentlySelected = currentKeyword.selected;
    
    // Count currently selected keywords
    const selectedKeywords = updatedKeywords.filter(kw => kw.selected);
    
    // If trying to select and already have 4 selected, prevent it
    if (!currentlySelected && selectedKeywords.length >= 4) {
      alert("You can only select up to 4 keywords (1 main + 3 secondary)");
      return;
    }
    
    // Toggle the selection
    currentKeyword.selected = !currentlySelected;
    
    // If this is the first selected keyword, mark it as the main one
    // We'll use searchVolume to store the original placement order for sorting
    if (selectedKeywords.length === 0 && currentKeyword.selected) {
      // Store the original search volume before modifying
      updatedKeywords.forEach(kw => {
        if (!kw._originalSearchVolume && kw.searchVolume) {
          kw._originalSearchVolume = kw.searchVolume;
        }
      });
      
      // Mark as main keyword by giving it highest search volume
      currentKeyword.isMainKeyword = true;
    }
    
    // If this was a main keyword and we're unselecting it, 
    // promote the next selected keyword to main if any exist
    if (!currentlySelected && currentKeyword.isMainKeyword) {
      currentKeyword.isMainKeyword = false;
      
      // Find the next selected keyword to promote to main
      const nextSelected = updatedKeywords.find(kw => kw.selected && !kw.isMainKeyword);
      if (nextSelected) {
        nextSelected.isMainKeyword = true;
      }
    }
    
    setKeywords(updatedKeywords);
  };

  // Automatically fetch keywords when component mounts if productTitle is provided
  useEffect(() => {
    if (productTitle && keywords.length === 0) {
      fetchKeywords();
    }
  }, []);
  
  // Fetch keywords based on product URL or direct topic
  const fetchKeywords = async () => {
    if (!productUrl && !directTopic) {
      return;
    }

    setIsLoading(true);
    setKeywords([]); // Clear previous keywords when starting a new search

    try {
      console.log(`Fetching keywords for ${directTopic ? 'topic' : 'URL'}: ${directTopic || productUrl}`);
      
      const requestData: any = {};
      if (directTopic) {
        requestData.topic = directTopic;
      } else if (productUrl) {
        requestData.productUrl = productUrl;
      }

      const response = await apiRequest<{ success: boolean; keywords: KeywordData[] }>({
        url: "/api/admin/keywords-for-product",
        method: "POST",
        data: requestData
      });

      if (response.success && response.keywords && response.keywords.length > 0) {
        // Process keywords, clean up formatting and ensure we don't show product titles as keywords
        const keywordsWithSelection = response.keywords.map(kw => {
          let processedKeyword = kw.keyword;
          
          // Clean up the keyword by removing special characters and brackets
          processedKeyword = processedKeyword
            .replace(/®|™|©/g, '') // Remove trademark symbols
            .replace(/\[.*?\]|\(.*?\)/g, '') // Remove text in brackets/parentheses
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
          
          // If the keyword is still the full product name, try to extract a shorter version
          if (directTopic && processedKeyword.length > 30 && 
              (processedKeyword.toLowerCase() === directTopic.toLowerCase().replace(/®|™|©|\[.*?\]|\(.*?\)/g, '').trim())) {
            // Extract meaningful part (e.g., "water softener" from "SoftPro Elite Salt Free Water Conditioner")
            const parts = processedKeyword.split(' ');
            if (parts.length > 3) {
              // Try to find meaningful pairs of words
              const keywords = [
                'water softener', 'water conditioner', 'water filter', 
                'salt free', 'water treatment', 'softener system'
              ];
              
              for (const keyword of keywords) {
                if (processedKeyword.toLowerCase().includes(keyword)) {
                  processedKeyword = keyword;
                  break;
                }
              }
              
              // If no specific keyword found, use last 2-3 words which often contain the product category
              if (processedKeyword.length > 30) {
                processedKeyword = parts.slice(-Math.min(3, parts.length)).join(' ');
              }
            }
          }

          return {
            ...kw,
            keyword: processedKeyword,
            selected: false
          };
        });
        
        setKeywords(keywordsWithSelection);
        console.log(`Received ${keywordsWithSelection.length} keywords from API`);
      } else {
        console.log("No keywords returned from API");
      }
    } catch (error) {
      console.error("Error fetching keywords:", error);
      // Keep any existing keywords
    } finally {
      setIsLoading(false);
    }
  };

  // Filter by intent
  const handleFilterByIntent = (intent: string) => {
    setFilterIntent(filterIntent === intent ? null : intent);
  };

  // Handle form submission
  const handleSubmit = () => {
    const selectedKeywords = keywords.filter(kw => kw.selected);
    onKeywordsSelected(selectedKeywords);
  };

  // Get color based on competition level
  const getCompetitionColor = (level?: string) => {
    switch (level) {
      case "Low":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-orange-100 text-orange-800";
      case "High":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get class for difficulty progress bar
  const getDifficultyClass = (difficulty?: number) => {
    if (!difficulty) return "bg-gray-500";
    if (difficulty < 30) return "bg-green-500";
    if (difficulty < 60) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Select up to 4 keywords (1 main + 3 secondary) to include in your content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productUrl">Product URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="productUrl"
                  placeholder="Enter a product URL to find keywords"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="directTopic">Direct Topic</Label>
              <div className="flex space-x-2">
                <Input
                  id="directTopic"
                  placeholder="Or enter a topic directly"
                  value={directTopic}
                  onChange={(e) => setDirectTopic(e.target.value)}
                  disabled={isLoading}
                />
                <Button 
                  variant="secondary" 
                  onClick={fetchKeywords}
                  disabled={isLoading || (!productUrl && !directTopic)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </div>

          {/* Filter controls */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 py-2">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-sm font-medium mr-2">Filter by intent:</span>
              </div>
              <Badge 
                variant={filterIntent === "Informational" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleFilterByIntent("Informational")}
              >
                Informational
              </Badge>
              <Badge 
                variant={filterIntent === "Transactional" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleFilterByIntent("Transactional")}
              >
                Transactional
              </Badge>
              <Badge 
                variant={filterIntent === "Commercial" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleFilterByIntent("Commercial")}
              >
                Commercial
              </Badge>
              <Badge 
                variant={filterIntent === "Navigational" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleFilterByIntent("Navigational")}
              >
                Navigational
              </Badge>
              <div className="flex-1"></div>
              <div className="flex items-center">
                <Input 
                  placeholder="Filter keywords..." 
                  className="max-w-[200px]" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Keywords table */}
          {keywords.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Search Volume</TableHead>
                    <TableHead>Competition</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Intent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeywords.map((keyword, index) => (
                    <TableRow key={index} className={keyword.selected ? (keyword.isMainKeyword ? "bg-blue-100" : "bg-muted/30") : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={keyword.selected} 
                          onCheckedChange={() => toggleKeywordSelection(
                            keywords.findIndex(k => k.keyword === keyword.keyword)
                          )}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {keyword.keyword}
                        {keyword.isMainKeyword && (
                          <Badge className="ml-2 bg-blue-500 text-white">Main</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {keyword.searchVolume !== undefined ? keyword.searchVolume.toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCompetitionColor(keyword.competitionLevel)}>
                          {keyword.competitionLevel || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={keyword.difficulty || 0} 
                            max={100} 
                            className={`h-2 ${getDifficultyClass(keyword.difficulty)}`}
                          />
                          <span className="text-xs">{keyword.difficulty || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {keyword.intent || 'Unknown'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center border rounded-md">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Enter a product URL or topic and click Search to find relevant keywords
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm">
          {selectedCount > 0 ? (
            <span className="flex items-center text-muted-foreground">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              {selectedCount} keyword{selectedCount !== 1 ? 's' : ''} selected
            </span>
          ) : null}
        </div>
        <div className="space-x-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={selectedCount === 0}
          >
            Use Selected Keywords
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}