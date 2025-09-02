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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// SEO keyword sanitization functions
const sanitizeKeywordForSEO = (keyword: string): string => {
  if (!keyword || typeof keyword !== 'string') {
    return '';
  }

  let sanitized = keyword
    // Convert to lowercase
    .toLowerCase()
    // Remove special characters and symbols
    .replace(/[®™©℠]/g, '')
    // Remove hyphens and dashes (replace with spaces)
    .replace(/[-–—_]/g, ' ')
    // Remove extra punctuation
    .replace(/[!@#$%^&*()+={}[\]|\\:";'<>?,./]/g, ' ')
    // Remove numbers that look like model numbers or SKUs
    .replace(/\b[a-z]*\d+[a-z]*\d*\b/gi, '')
    // Remove text in parentheses or brackets
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Remove stop words from beginning and end (but keep them in middle)
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = sanitized.split(' ');
  
  // Remove leading stop words
  while (words.length > 1 && stopWords.includes(words[0])) {
    words.shift();
  }
  
  // Remove trailing stop words
  while (words.length > 1 && stopWords.includes(words[words.length - 1])) {
    words.pop();
  }

  sanitized = words.join(' ');

  // Ensure reasonable length for SEO (2-8 words typically)
  if (words.length > 8) {
    sanitized = words.slice(0, 8).join(' ');
  }

  return sanitized;
};

const isValidSEOKeyword = (keyword: string): boolean => {
  if (!keyword || keyword.length < 2) {
    return false;
  }

  // Check for minimum meaningful content
  if (keyword.length < 3 && !keyword.match(/[a-zA-Z]/)) {
    return false;
  }

  // Reject keywords that are just numbers or single characters
  if (keyword.match(/^\d+$/) || keyword.length === 1) {
    return false;
  }

  // Reject keywords that are too generic or meaningless
  const meaninglessKeywords = [
    'item', 'product', 'thing', 'stuff', 'new', 'old', 'good', 'bad',
    'big', 'small', 'cheap', 'expensive', 'free', 'sale', 'buy', 'get'
  ];
  
  if (meaninglessKeywords.includes(keyword.toLowerCase())) {
    return false;
  }

  // Reject keywords with excessive repetition
  const words = keyword.split(' ');
  const uniqueWords = new Set(words);
  if (words.length > 2 && uniqueWords.size < words.length / 2) {
    return false;
  }

  return true;
};

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
  isManual?: boolean; // Flag to mark manually added keywords 
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
  const [isFetchingVolumes, setIsFetchingVolumes] = useState(false);
  


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

  // Filter keywords based on search and intent filter - show ALL authentic DataForSEO keywords
  const filteredKeywords = keywords
    .filter(keyword => {
      const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesIntent = filterIntent ? keyword.intent === filterIntent : true;
      // Show ALL keywords from DataForSEO API (including those with 0 or null search volume)
      // Only exclude completely invalid keywords
      const isValidKeyword = keyword.keyword && keyword.keyword.trim().length > 0;
      return matchesSearch && matchesIntent && isValidKeyword;
    })
    .sort((a, b) => {
      // First, prioritize manual keywords (those marked as isManual) to appear at the top
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;
      
      // Then sort by the selected sort criteria
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

  // Fetch search volumes for existing manual keywords when component mounts
  useEffect(() => {
    const manualKeywords = initialKeywords.filter(kw => kw.isManual && kw.searchVolume === 0);
    if (manualKeywords.length > 0) {
      fetchSearchVolumesForManualKeywords(manualKeywords);
    }
  }, [initialKeywords]);

  // Function to fetch search volumes for manual keywords
  const fetchSearchVolumesForManualKeywords = async (manualKeywords: KeywordData[]) => {
    if (manualKeywords.length === 0) return;

    setIsFetchingVolumes(true);
    console.log('Fetching search volumes for manual keywords:', manualKeywords.map(kw => kw.keyword));

    try {
      // Extract just the keyword strings
      const keywordStrings = manualKeywords.map(kw => kw.keyword);
      
      const response = await apiRequest<{ success: boolean; keywords: KeywordData[] }>({
        url: `/api/admin/keywords-for-product?t=${Date.now()}`,
        method: "POST",
        data: {
          topic: keywordStrings.join(', '), // Pass manual keywords as search terms
          includeProductData: false // Don't include product data for this request
        }
      });

      if (response.success && response.keywords && response.keywords.length > 0) {
        console.log('Received search volumes for manual keywords:', response.keywords);
        
        // Update existing keywords with search volume data
        setKeywords(prevKeywords => {
          return prevKeywords.map(existingKeyword => {
            if (existingKeyword.isManual) {
              // First try exact match (case insensitive)
              let matchedKeyword = response.keywords.find(
                apiKeyword => apiKeyword.keyword.toLowerCase() === existingKeyword.keyword.toLowerCase()
              );
              
              // If no exact match, try to find the best matching keyword
              if (!matchedKeyword) {
                const manualKeywordLower = existingKeyword.keyword.toLowerCase();
                
                // Find keywords that contain the manual keyword or vice versa
                const possibleMatches = response.keywords.filter(apiKeyword => {
                  const apiKeywordLower = apiKeyword.keyword.toLowerCase();
                  return apiKeywordLower.includes(manualKeywordLower) || 
                         manualKeywordLower.includes(apiKeywordLower);
                });
                
                // If we have matches, pick the one with highest search volume
                if (possibleMatches.length > 0) {
                  matchedKeyword = possibleMatches.reduce((best, current) => 
                    (current.searchVolume || 0) > (best.searchVolume || 0) ? current : best
                  );
                  
                  console.log(`Found best match for "${existingKeyword.keyword}": "${matchedKeyword.keyword}" with ${matchedKeyword.searchVolume} volume`);
                }
              } else {
                console.log(`Found exact match for "${existingKeyword.keyword}": ${matchedKeyword.searchVolume} volume`);
              }
              
              if (matchedKeyword) {
                // Update manual keyword with search volume data while preserving its manual flag
                return {
                  ...existingKeyword,
                  searchVolume: matchedKeyword.searchVolume || 0,
                  competition: matchedKeyword.competition,
                  competitionLevel: matchedKeyword.competitionLevel,
                  cpc: matchedKeyword.cpc,
                  difficulty: matchedKeyword.difficulty,
                  intent: matchedKeyword.intent,
                  isManual: true // Keep the manual flag
                };
              }
            }
            return existingKeyword;
          });
        });
      }
    } catch (error) {
      console.error('Error fetching search volumes for manual keywords:', error);
    } finally {
      setIsFetchingVolumes(false);
    }
  };
  
  // Fetch keywords based on product URL or direct topic
  const fetchKeywords = async () => {
    if (!productUrl && !directTopic) {
      return;
    }

    setIsLoading(true);
    
    // Preserve existing manual keywords (with their selection state) before fetching new ones
    const existingManualKeywords = keywords.filter(kw => kw.isManual);
    
    // Invalidate any cached keyword queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/admin/keywords-for-product'] });

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
      
      // Note: Removed automatic product/collection inclusion to focus on manual keyword search only

      // Add timestamp to ensure fresh requests (bypass React Query cache)
      const response = await apiRequest<{ success: boolean; keywords: KeywordData[] }>({
        url: `/api/admin/keywords-for-product?t=${Date.now()}`,
        method: "POST",
        data: requestData
      });

      console.log("API Response:", {
        success: response.success,
        keywordCount: response.keywords?.length || 0,
        hasKeywords: !!(response.keywords && response.keywords.length > 0)
      });

      if (response.success && response.keywords && response.keywords.length > 0) {
        console.log("Raw keywords from API:", response.keywords.slice(0, 3));
        
        // Keep keywords as-is from DataForSEO API without aggressive sanitization
        const keywordsWithSelection = response.keywords.map(kw => {
          console.log("Processing keyword:", kw.keyword);
          return {
            ...kw,
            selected: false
          };
        }); // Show all authentic DataForSEO keywords without filtering
        
        console.log("Keywords after sanitization:", keywordsWithSelection.length);
        console.log("Filtered keywords sample:", keywordsWithSelection.slice(0, 3));
        
        // Merge preserved manual keywords with newly fetched keywords
        const mergedKeywords = [...existingManualKeywords, ...keywordsWithSelection];
        console.log(`Merging ${existingManualKeywords.length} manual keywords with ${keywordsWithSelection.length} fetched keywords`);
        
        setKeywords(mergedKeywords);
        console.log(`✅ Successfully set ${keywordsWithSelection.length} keywords in state`);
      } else {
        console.log("❌ No valid keywords returned from API");
        console.log("Response details:", {
          success: response.success,
          keywords: response.keywords,
          keywordCount: response.keywords?.length || 0
        });
        // Keep manual keywords even if API fails
        setKeywords(existingManualKeywords);
      }
    } catch (error: any) {
      console.error("Error fetching keywords:", error);
      
      // Handle different types of errors - preserve manual keywords
      if (error.response?.status === 408) {
        // DataForSEO API timeout - keep manual keywords
        setKeywords(existingManualKeywords);
        alert("The keyword search is taking longer than expected. Please try a simpler search term or try again later.");
      } else if (error.response?.status === 500) {
        // API configuration error - keep manual keywords
        setKeywords(existingManualKeywords);
        alert("Unable to fetch authentic keyword data. Please check your API configuration.");
      } else {
        // For any other error, keep manual keywords and show error message
        console.log("Error occurred, preserving manual keywords:", error.message);
        setKeywords(existingManualKeywords);
        
        // Show user-friendly error message
        const errorMessage = error.response?.data?.message || error.message || "Failed to fetch keywords";
        console.error("Keyword fetch error:", errorMessage);
      }
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
    if (!difficulty) return "bg-gray-200";
    if (difficulty < 20) return "bg-green-500"; // Very Easy - Bright Green
    if (difficulty < 40) return "bg-lime-500"; // Easy - Lime Green
    if (difficulty < 60) return "bg-yellow-500"; // Medium - Yellow
    if (difficulty < 80) return "bg-orange-500"; // Hard - Orange
    return "bg-red-600"; // Very Hard - Deep Red
  }

  const getDifficultyLabel = (difficulty?: number) => {
    if (!difficulty) return "Unknown";
    if (difficulty < 20) return "Very Easy";
    if (difficulty < 40) return "Easy";
    if (difficulty < 60) return "Medium";
    if (difficulty < 80) return "Hard";
    return "Very Hard";
  }

  const getDifficultyTextColor = (difficulty?: number) => {
    if (!difficulty) return "text-gray-600";
    if (difficulty < 20) return "text-green-700";
    if (difficulty < 40) return "text-lime-700";
    if (difficulty < 60) return "text-yellow-700";
    if (difficulty < 80) return "text-orange-700";
    return "text-red-700";
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
              <Label htmlFor="directTopic">Search or Add Keywords</Label>
              <div className="flex space-x-2">
                <Input
                  id="directTopic"
                  placeholder="Enter a topic to search for keywords or add manual keywords"
                  value={directTopic}
                  onChange={(e) => setDirectTopic(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchKeywords();
                    }
                  }}
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
                Enter a topic to search for related keywords. Manual keywords can be added from the main Keywords step.
              </p>
            </div>
            

          </div>

          {/* Loading indicator for fetching manual keyword search volumes */}
          {isFetchingVolumes && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Fetching search volumes for manual keywords...</span>
              </div>
            </div>
          )}

          {/* Difficulty Legend */}
          {keywords.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 border">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium text-slate-700">Difficulty Scale:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-green-700">Very Easy (0-19)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-lime-500"></div>
                  <span className="text-lime-700">Easy (20-39)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span className="text-yellow-700">Medium (40-59)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span className="text-orange-700">Hard (60-79)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-600"></div>
                  <span className="text-red-700">Very Hard (80+)</span>
                </div>
              </div>
            </div>
          )}

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
                          {keyword.intent === "Manual" && (
                            <Badge className="ml-2 bg-purple-100 text-purple-800 border-purple-300">Manual</Badge>
                          )}
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
                        {keyword.intent === "Manual" ? "N/A" : (keyword.searchVolume !== undefined && keyword.searchVolume !== null ? keyword.searchVolume.toLocaleString() : 'N/A')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={keyword.intent === "Manual" ? "bg-purple-100 text-purple-800 border-purple-300" : getCompetitionColor(keyword.competitionLevel)}>
                          {keyword.intent === "Manual" ? "Manual" : (keyword.competitionLevel || 'Unknown')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[80px]">
                            <div className="relative">
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-300 ${getDifficultyClass(keyword.difficulty)}`}
                                  style={{ width: `${Math.min(keyword.difficulty || 0, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-xs min-w-[50px]">
                            <span className={`font-medium ${getDifficultyTextColor(keyword.difficulty)}`}>
                              {keyword.intent === "Manual" ? "N/A" : (keyword.difficulty || 0)}
                            </span>
                            <span className={`text-[10px] ${getDifficultyTextColor(keyword.difficulty)}`}>
                              {keyword.intent === "Manual" ? "Manual" : getDifficultyLabel(keyword.difficulty)}
                            </span>
                          </div>
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
                Enter a topic and click Search to find relevant keywords, or add your own manual keywords below
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