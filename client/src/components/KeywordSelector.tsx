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
import { CheckCircle, Filter, Search, Activity, FileText, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  selectedProducts?: Array<{
    id: string;
    title: string;
    image?: string;
    images?: Array<{
      id: number;
      src: string;
    }>;
  }>;
  selectedCollections?: Array<{
    id: string;
    title: string;
    image_url?: string;
  }>;
}

export default function KeywordSelector({
  initialKeywords = [],
  onKeywordsSelected,
  title = "Select Keywords for Your Content",
  onClose,
  productTitle,
  selectedProducts = [],
  selectedCollections = []
}: KeywordSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<KeywordData[]>(initialKeywords);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIntent, setFilterIntent] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [directTopic, setDirectTopic] = useState(productTitle || ""); // Pre-populate with product title if available
  const [sortBy, setSortBy] = useState<'searchVolume' | 'competition' | 'cpc' | 'difficulty' | 'keyword'>('searchVolume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Count selected keywords
  const selectedCount = keywords.filter(kw => kw.selected).length;
  const mainKeyword = keywords.find(kw => kw.isMainKeyword);

  // Function to get sort value
  const getSortValue = (keyword: KeywordData, sortBy: string) => {
    switch (sortBy) {
      case 'searchVolume':
        return keyword.searchVolume || 0;
      case 'competition':
        return keyword.competition || 0;
      case 'cpc':
        return keyword.cpc || 0;
      case 'difficulty':
        return keyword.difficulty || 0;
      case 'keyword':
        return keyword.keyword.toLowerCase();
      default:
        return 0;
    }
  };

  // Filter keywords based on search and intent filter, hide 0 search volume, and sort dynamically
  const filteredKeywords = keywords
    .filter(keyword => {
      const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesIntent = filterIntent ? keyword.intent === filterIntent : true;
      const hasSearchVolume = keyword.searchVolume !== 0 && keyword.searchVolume !== undefined;
      return matchesSearch && matchesIntent && hasSearchVolume;
    })
    .sort((a, b) => {
      const valueA = getSortValue(a, sortBy);
      const valueB = getSortValue(b, sortBy);
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }
      
      return sortOrder === 'asc' ? 
        (valueA as number) - (valueB as number) : 
        (valueB as number) - (valueA as number);
    });

  // Set a keyword as the main keyword
  const setAsMainKeyword = (index: number) => {
    const updatedKeywords = [...keywords];
    
    // First, clear any existing main keyword flags
    updatedKeywords.forEach(kw => {
      if (kw.isMainKeyword) {
        kw.isMainKeyword = false;
      }
    });
    
    // Set the new main keyword
    updatedKeywords[index].isMainKeyword = true;
    updatedKeywords[index].selected = true; // Ensure it's also selected
    
    setKeywords(updatedKeywords);
  };

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
    
    // Store original search volume if not already saved
    if (!currentKeyword._originalSearchVolume && currentKeyword.searchVolume) {
      currentKeyword._originalSearchVolume = currentKeyword.searchVolume;
    }
    
    // If this is the first selected keyword, automatically make it the main one
    if (selectedKeywords.length === 0 && currentKeyword.selected) {
      currentKeyword.isMainKeyword = true;
    }
    
    // If this was the main keyword and we're unselecting it, 
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

    // Store start time for minimum display duration
    const startTime = Date.now();
    const minimumLoadingTime = 800; // 800ms minimum to prevent flicker

    try {
      console.log(`Fetching keywords for ${directTopic ? 'topic' : 'URL'}: ${directTopic || productUrl}`);
      
      const requestData: any = {};
      
      // Add the direct topic or product URL
      if (directTopic) {
        requestData.topic = directTopic;
      } else if (productUrl) {
        requestData.productUrl = productUrl;
      }
      
      // Include selected products information for more relevant keywords
      if (selectedProducts && selectedProducts.length > 0) {
        requestData.selectedProducts = selectedProducts.map(product => ({
          id: product.id,
          title: product.title
        }));
      }
      
      // Include selected collections information
      if (selectedCollections && selectedCollections.length > 0) {
        requestData.selectedCollections = selectedCollections.map(collection => ({
          id: collection.id,
          title: collection.title
        }));
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
      // Ensure minimum loading time to prevent flicker
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumLoadingTime - elapsedTime);
      
      if (remainingTime > 0) {
        setTimeout(() => setIsLoading(false), remainingTime);
      } else {
        setIsLoading(false);
      }
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
          {/* Display Selected Products and Collections */}
          {(selectedProducts.length > 0 || selectedCollections.length > 0) && (
            <div className="mb-4 p-3 bg-slate-50 rounded-md border">
              <h3 className="text-sm font-medium mb-2">Generating keywords for:</h3>
              
              {selectedProducts.length > 0 && (
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Products:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map(product => {
                      // Get image source from images array or direct image property
                      const imageSrc = product.images && product.images.length > 0
                        ? product.images[0].src
                        : product.image || '';
                      
                      return (
                        <div key={product.id} className="flex items-center gap-2 bg-white rounded p-1.5 border shadow-sm">
                          {imageSrc ? (
                            <img 
                              src={imageSrc} 
                              alt={product.title}
                              className="w-8 h-8 rounded object-contain" 
                            />
                          ) : (
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                              <Search className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <span className="text-xs font-medium max-w-[120px] truncate">{product.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {selectedCollections.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Collections:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCollections.map(collection => (
                      <div key={collection.id} className="flex items-center gap-2 bg-white rounded p-1.5 border shadow-sm">
                        {collection.image_url ? (
                          <img 
                            src={collection.image_url} 
                            alt={collection.title}
                            className="w-8 h-8 rounded object-contain" 
                          />
                        ) : (
                          <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                            <FileText className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <span className="text-xs font-medium max-w-[120px] truncate">{collection.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search inputs */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="directTopic">Topic for Keyword Search</Label>
              <div className="flex space-x-2">
                <Input
                  id="directTopic"
                  placeholder="Enter a topic to search for keywords"
                  value={directTopic}
                  onChange={(e) => setDirectTopic(e.target.value)}
                  disabled={isLoading}
                />
                <Button 
                  variant="secondary" 
                  onClick={fetchKeywords}
                  disabled={isLoading || !directTopic}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter a topic related to your products to find relevant keywords.
              </p>
            </div>
          </div>

          {/* Filter and Sort controls */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b">
              <div className="flex flex-wrap items-center gap-2">
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
              
              {/* Sort controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="searchVolume">Search Volume</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="cpc">CPC</SelectItem>
                    <SelectItem value="difficulty">Difficulty</SelectItem>
                    <SelectItem value="keyword">Keyword</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Keywords table with loading state */}
          {isLoading ? (
            <div className="py-12 text-center border rounded-md bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
              <div className="relative z-10">
                <div className="mx-auto w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  <Search className="absolute inset-0 m-auto h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Searching for Keywords</h3>
                <p className="text-blue-700 mb-4">
                  Analyzing search data and competition metrics...
                </p>
                <div className="flex justify-center items-center gap-2 text-sm text-blue-600">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="ml-2">This may take a few moments</span>
                </div>
              </div>
              {/* Animated background elements */}
              <div className="absolute top-4 left-4 w-8 h-8 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute top-8 right-8 w-6 h-6 bg-indigo-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute bottom-6 left-8 w-4 h-4 bg-blue-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2s' }}></div>
              <div className="absolute bottom-4 right-6 w-10 h-10 bg-indigo-200 rounded-full opacity-15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
          ) : keywords.length > 0 ? (
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
                        <div className="flex items-center">
                          {keyword.keyword}
                          {keyword.isMainKeyword ? (
                            <Badge className="ml-2 bg-blue-500 text-white">Main Keyword</Badge>
                          ) : keyword.selected ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-2 h-6 px-2 text-xs"
                              onClick={() => setAsMainKeyword(keywords.findIndex(k => k.keyword === keyword.keyword))}
                            >
                              Set as main
                            </Button>
                          ) : null}
                        </div>
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
      <CardFooter className={`flex flex-col sm:flex-row justify-between gap-4 border-t bg-white sticky bottom-0 z-10 shadow-md ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="text-sm w-full sm:w-auto">
          {isLoading ? (
            <div className="flex items-center text-blue-600">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching for keywords...
            </div>
          ) : selectedCount > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="flex items-center text-green-700 font-medium">
                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                {selectedCount} keyword{selectedCount !== 1 ? 's' : ''} selected
              </span>
              
              <div className="flex flex-wrap gap-2 mt-1">
                {keywords.filter(k => k.selected).map((kw, idx) => (
                  <Badge 
                    key={idx} 
                    variant={kw.isMainKeyword ? "default" : "outline"}
                    className={kw.isMainKeyword ? "bg-blue-500" : ""}
                  >
                    {kw.keyword}
                    {kw.isMainKeyword && " (Main)"}
                  </Badge>
                ))}
              </div>
              
              <span className="text-xs text-muted-foreground mt-1">
                {mainKeyword ? `Main keyword: "${mainKeyword.keyword}"` : "No main keyword selected yet"}
              </span>
            </div>
          ) : (
            <span className="text-amber-600">
              Please select at least 1 keyword (up to 4 max)
            </span>
          )}
        </div>
        <div className="space-x-2 flex-shrink-0">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={selectedCount === 0 || isLoading}
          >
            Use Selected Keywords
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}