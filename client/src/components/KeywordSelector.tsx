import { useState } from "react";
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
}

interface KeywordSelectorProps {
  initialKeywords?: KeywordData[];
  onKeywordsSelected: (keywords: KeywordData[]) => void;
  title?: string;
  onClose?: () => void;
}

export default function KeywordSelector({
  initialKeywords = [],
  onKeywordsSelected,
  title = "Select Keywords for Your Content",
  onClose
}: KeywordSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [keywords, setKeywords] = useState<KeywordData[]>(initialKeywords);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIntent, setFilterIntent] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [directTopic, setDirectTopic] = useState("");

  // Count selected keywords
  const selectedCount = keywords.filter(kw => kw.selected).length;

  // Filter keywords based on search and intent filter
  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIntent = filterIntent ? keyword.intent === filterIntent : true;
    return matchesSearch && matchesIntent;
  });

  // Handle keyword selection
  const toggleKeywordSelection = (index: number) => {
    const updatedKeywords = [...keywords];
    updatedKeywords[index].selected = !updatedKeywords[index].selected;
    setKeywords(updatedKeywords);
  };

  // Fetch keywords based on product URL
  const fetchKeywords = async () => {
    if (!productUrl && !directTopic) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest<{ success: boolean; keywords: KeywordData[] }>({
        url: "/api/admin/keywords-for-product",
        method: "POST",
        data: {
          productUrl: productUrl || "https://example.com/placeholder",
          topic: directTopic || undefined
        }
      });

      if (response.success && response.keywords) {
        // Add selected flag to each keyword
        const keywordsWithSelection = response.keywords.map(kw => ({
          ...kw,
          selected: false
        }));
        setKeywords(keywordsWithSelection);
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
          Find and select keywords to include in your content
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
                    <TableRow key={index} className={keyword.selected ? "bg-muted/30" : ""}>
                      <TableCell>
                        <Checkbox 
                          checked={keyword.selected} 
                          onCheckedChange={() => toggleKeywordSelection(
                            keywords.findIndex(k => k.keyword === keyword.keyword)
                          )}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{keyword.keyword}</TableCell>
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