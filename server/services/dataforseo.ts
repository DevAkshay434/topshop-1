// DataForSEO API Integration
import axios from 'axios';

// Interface for the keyword data returned by DataForSEO
export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  cpc?: number;
  competition?: number;
  competitionLevel?: string; // Low, Medium, High
  intent?: string;
  trend?: number[]; // Monthly trend data
  difficulty?: number; // Keyword difficulty score (0-100)
  selected?: boolean; // For frontend selection
}

// Class for DataForSEO API integration
export class DataForSEOService {
  private apiUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.apiUrl = 'https://api.dataforseo.com';
    
    // DataForSEO requires credentials in the format 'username:password'
    // The DATAFORSEO_API_KEY should be set to "login:password" from DataForSEO account
    const apiKey = process.env.DATAFORSEO_API_KEY || '';
    
    console.log(`Initializing DataForSEO service with key format: ${apiKey.includes(':') ? 'username:password' : 'invalid format'}`);
    
    if (apiKey.includes(':')) {
      // Split the API key into username and password
      const [username, password] = apiKey.split(':');
      this.username = username;
      this.password = password;
      
      console.log(`DataForSEO credentials parsed - Login: ${username}, Password length: ${password.length}`);
    } else {
      // Log warning about invalid format
      console.warn('WARNING: DataForSEO credentials not in correct format. Should be "login:password"');
      
      // Still try to use whatever was provided as both username and password
      this.username = apiKey;
      this.password = apiKey;
    }
    
    if (this.hasValidCredentials()) {
      console.log(`DataForSEO service initialized successfully with login: ${this.username}`);
    } else {
      console.warn('WARNING: DataForSEO service initialized without valid credentials');
    }
  }

  /**
   * Validate credentials are set
   * @returns True if credentials are set
   */
  public hasValidCredentials(): boolean {
    return this.username.length > 0 && this.password.length > 0;
  }

  /**
   * Get keywords for a specific product URL
   * @param productUrl The URL of the product to get keywords for
   * @returns Array of keyword data
   */
  public async getKeywordsForProduct(productUrl: string): Promise<KeywordData[]> {
    try {
      // Extract keyword from URL or use as direct input
      const keyword = this.extractKeywordFromUrl(productUrl);
      console.log(`DataForSEO search for keyword: "${keyword}"`);
      console.log('DATAFORSEO DEBUG - Original input:', productUrl);
      console.log('DATAFORSEO DEBUG - Extracted keyword:', keyword);

      // Check if we have valid credentials
      if (!this.hasValidCredentials()) {
        console.error("No valid DataForSEO credentials provided");
        throw new Error("DataForSEO API credentials not configured. Please provide valid credentials.");
      }

      try {
        // Create basic auth header
        const auth = {
          username: this.username,
          password: this.password
        };

        console.log(`Using DataForSEO credentials - Login: ${this.username}, Password length: ${this.password.length}`);

        // Clean the keyword to remove problematic characters
        const cleanedKeyword = this.cleanKeywordString(keyword);
        console.log(`Cleaned keyword for API request: "${cleanedKeyword}" (original: "${keyword}")`);
        
        // Prepare request payload for search_volume endpoint
        // Note: search_volume expects 'keywords' array instead of a single 'keyword'
        
        // Extract some common variations to include in the API request to get more data
        const baseKeyword = cleanedKeyword;
        
        // Create a focused set of diverse keywords for DataForSEO API
        const mainKeywords = [baseKeyword];
        
        // Extract generic terms (limit to most relevant)
        const genericTerms = this.extractGenericTerms(baseKeyword).slice(0, 2);
        
        // Create focused keyword set with high-value variations
        const focusedKeywords = [
          // Main keyword
          baseKeyword,
          // Generic category terms
          ...genericTerms,
          // High-value modifiers
          `best ${baseKeyword}`,
          `${baseKeyword} reviews`,
          // Generic term variations
          ...genericTerms.map(term => `best ${term}`),
          ...genericTerms.map(term => `${term} reviews`),
          // Purchase-intent keywords
          `buy ${baseKeyword}`,
          `${baseKeyword} price`,
          // Information-seeking keywords  
          `${baseKeyword} guide`,
          `how to choose ${genericTerms[0] || baseKeyword}`
        ].filter(Boolean);

        
        // Use the focused keywords directly - no batching needed for smaller sets
        const uniqueKeywords = Array.from(new Set(focusedKeywords));
        
        console.log(`Sending ${uniqueKeywords.length} focused keywords to DataForSEO API:`, uniqueKeywords);
        
        const requestData = [{
          keywords: uniqueKeywords.slice(0, 50), // Use up to 50 keywords to get comprehensive data
          language_code: "en",
          location_code: 2840 // United States
        }];

        console.log("DataForSEO request payload:", JSON.stringify(requestData));

        // POST request to DataForSEO API to get comprehensive keyword data
        // Use search volume endpoint for full data including search volume, competition, CPC
        const endpoint = `/v3/keywords_data/google/search_volume/live`;
        console.log(`Using DataForSEO search volume endpoint: ${endpoint}`);
        
        const response = await axios.post(
          `${this.apiUrl}${endpoint}`,
          requestData,
          { 
            auth,
            timeout: 45000, // 45 second timeout for DataForSEO API
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`DataForSEO API status code: ${response.status}`);
        
        // Additional logging to troubleshoot issues
        if (response.data?.status_code) {
          console.log(`DataForSEO API response status code: ${response.data.status_code}`);
          console.log(`DataForSEO API response status message: ${response.data.status_message || 'No message'}`);
        }

        // Full response logging for debugging
        console.log("DataForSEO API full response:", JSON.stringify(response.data));
        
        // Check if the API response has the expected format
        if (!response.data?.tasks || !Array.isArray(response.data.tasks) || response.data.tasks.length === 0) {
          console.error("DataForSEO API returned no tasks in response");
          throw new Error("DataForSEO API returned invalid response format. Please check your API configuration.");
        }

        // Check if the response is successful
        if (response.data.tasks[0]?.status_code !== 20000) {
          const errorMessage = response.data.tasks[0]?.status_message || 'Unknown error';
          console.error(`DataForSEO API error: ${errorMessage}`);
          throw new Error(`DataForSEO API error: ${errorMessage}`);
        }

        // Extract keyword data from response
        const keywordData: KeywordData[] = [];
        const results = response.data.tasks[0]?.result || [];
        
        // Using focused keywords approach - no additional batch processing needed
        console.log(`Processing single focused API call with ${results.length} results`);
        
        if (results.length === 0) {
          console.error("DataForSEO API returned no keyword results");
          throw new Error("No keyword data available from DataForSEO API. Please try different search terms or check your API limits.");
        }
        
        // For search_volume endpoint, results is a direct array of keyword data
        console.log(`Processing ${results.length} keyword results`);
        if (results.length > 0) {
          console.log("Sample result structure:", JSON.stringify(results[0]));
        }
        
        // Process search volume data from search_volume endpoint
        let hasValidData = false;
        
        for (const result of results) {
          // Extract keyword data based on the search_volume endpoint structure
          const keywordText = result.keyword || '';
          const searchVolume = result.search_volume;
          const competition = result.competition; // Standard field name in search volume API
          const cpc = result.cpc;
          const keywordDifficulty = result.keyword_difficulty; // May not be available in search volume endpoint
          
          // Include all keywords from DataForSEO API, even with null/zero search volume
          // Assign a fallback value for null/undefined search volumes to ensure display
          let adjustedSearchVolume = searchVolume;
          if (searchVolume === null || searchVolume === undefined) {
            adjustedSearchVolume = 0; // Use 0 instead of skipping
            console.log(`Keyword with null search volume included: ${keywordText} (assigned 0)`);
          }
          
          const competitionLevel = this.getCompetitionLevel(competition || 0);
          
          // Process monthly_searches data if available
          const trend = result.monthly_searches
            ? result.monthly_searches.map((monthData: any) => monthData.search_volume)
            : Array(12).fill(adjustedSearchVolume); // Use adjusted search volume if monthly data unavailable
            
          // Use direct keyword difficulty from API or calculate if not available
          const difficulty = keywordDifficulty || this.calculateKeywordDifficulty({
            search_volume: adjustedSearchVolume,
            competition: competition || 0,
            cpc: cpc || 0
          });
          
          // Sanitize and format the keyword properly
          const sanitizedKeyword = this.sanitizeKeywordForSEO(keywordText);
          
          // Include ALL keywords regardless of search volume (including zero volume)
          if (this.isValidSEOKeyword(sanitizedKeyword)) {
            keywordData.push({
              keyword: sanitizedKeyword,
              searchVolume: adjustedSearchVolume,
              cpc: cpc || 0,
              competition: competition || 0,
              competitionLevel,
              intent: this.determineIntent({ keyword: sanitizedKeyword }),
              trend,
              difficulty,
              selected: false
            });
            
            hasValidData = true;
            
            // Log keyword inclusion for transparency
            if (adjustedSearchVolume === 0) {
              console.log(`Included zero-volume keyword: ${sanitizedKeyword}`);
            } else if (adjustedSearchVolume < 50) {
              console.log(`Included low-volume keyword: ${sanitizedKeyword} (${adjustedSearchVolume} searches)`);
            }
          }
        }
        
        // Get additional related keywords using keyword suggestions API to expand our list
        console.log(`Expanding keyword list with related suggestions...`);
        
        if (keywordData.length > 0) {
          try {
            // Use the first valid keyword to get more suggestions
            const seedKeyword = keywordData[0].keyword;
            console.log(`Getting additional keyword suggestions for: ${seedKeyword}`);
            
            const auth = {
              username: this.username,
              password: this.password
            };
            
            // Use keyword suggestions endpoint to get broader keyword ideas
            const suggestionsRequestData = [{
              keyword: seedKeyword,
              language_code: "en",
              location_code: 2840,
              limit: 50,
              include_seed_keyword: false
            }];
            
            const suggestionsResponse = await axios.post(
              `${this.apiUrl}/v3/dataforseo_labs/google/keyword_suggestions/live`,
              suggestionsRequestData,
              { 
                auth,
                timeout: 30000,
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (suggestionsResponse.data?.status_code === 20000 && suggestionsResponse.data.tasks?.[0]?.result) {
              const suggestions = suggestionsResponse.data.tasks[0].result;
              console.log(`Found ${suggestions.length} additional keyword suggestions`);
              
              // Extract the suggested keywords and get their search volume data
              const suggestedKeywords = suggestions
                .map((item: any) => item.keyword)
                .filter((kw: string) => kw && !keywordData.some(existing => existing.keyword === kw))
                .slice(0, 30); // Limit to 30 additional keywords
              
              if (suggestedKeywords.length > 0) {
                console.log(`Getting search volume data for ${suggestedKeywords.length} suggested keywords`);
                
                // Get search volume data for the suggested keywords
                const volumeRequestData = [{
                  keywords: suggestedKeywords,
                  language_code: "en",
                  location_code: 2840
                }];
                
                const volumeResponse = await axios.post(
                  `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
                  volumeRequestData,
                  { 
                    auth,
                    timeout: 30000,
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  }
                );
                
                if (volumeResponse.data?.status_code === 20000 && volumeResponse.data.tasks?.[0]?.result) {
                  const volumeData = volumeResponse.data.tasks[0].result;
                  console.log(`Received search volume data for ${volumeData.length} additional keywords`);
                  
                  // Process the additional keywords
                  for (const result of volumeData) {
                    const keywordText = result.keyword || '';
                    const searchVolume = result.search_volume || 0;
                    const competition = result.competition || 0;
                    const cpc = result.cpc || 0;
                    
                    const sanitizedKeyword = this.sanitizeKeywordForSEO(keywordText);
                    
                    if (this.isValidSEOKeyword(sanitizedKeyword)) {
                      const difficulty = this.calculateKeywordDifficulty({
                        search_volume: searchVolume,
                        competition: competition,
                        cpc: cpc
                      });
                      
                      keywordData.push({
                        keyword: sanitizedKeyword,
                        searchVolume: searchVolume,
                        cpc: cpc,
                        competition: competition,
                        competitionLevel: this.getCompetitionLevel(competition),
                        intent: this.determineIntent({ keyword: sanitizedKeyword }),
                        trend: Array(12).fill(searchVolume),
                        difficulty,
                        selected: false
                      });
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.log('Could not fetch additional keyword suggestions:', error);
            // Continue with existing keywords if expansion fails
          }
        }
        
        console.log(`Total keywords collected: ${keywordData.length}`);
        
        // If insufficient keywords found, implement aggressive expansion strategy
        if (keywordData.length < 15) {
          console.log(`Only ${keywordData.length} keywords found, implementing aggressive expansion to reach 15-20 keywords`);
          
          // Strategy 1: Generate additional related keywords using broader category terms
          const broadTerms = this.generateBroadCategoryTerms(keyword);
          console.log(`Generated ${broadTerms.length} broader category terms for expansion`);
          
          // Try each broader term to get more keywords
          for (const broadTerm of broadTerms.slice(0, 5)) {
            if (broadTerm !== keyword && keywordData.length < 25) {
              console.log(`Searching for additional keywords with broader term: ${broadTerm}`);
              
              try {
                // Get generic terms for the broader category
                const genericTerms = this.extractGenericTerms(broadTerm);
                console.log(`Generated ${genericTerms.length} generic terms from: ${broadTerm}`);
                
                // Create keyword variations for the generic terms
                const expansionKeywords: string[] = [];
                for (const term of genericTerms.slice(0, 3)) {
                  const variations = [
                    term,
                    `best ${term}`,
                    `${term} reviews`,
                    `${term} guide`,
                    `buy ${term}`,
                    `${term} price`,
                    `cheap ${term}`,
                    `${term} comparison`
                  ];
                  
                  // Only add variations as candidates for API lookup - don't generate synthetic data
                  variations.forEach(variation => {
                    if (!keywordData.some(existing => existing.keyword === variation) && 
                        !expansionKeywords.includes(variation)) {
                      expansionKeywords.push(variation);
                    }
                  });
                }
                
                // Get authentic search volume data for expansion keywords
                if (expansionKeywords.length > 0) {
                  console.log(`Getting authentic DataForSEO data for ${expansionKeywords.length} expansion keywords`);
                  
                  try {
                    const auth = { username: this.username, password: this.password };
                    const volumeRequestData = [{
                      keywords: expansionKeywords.slice(0, 15), // Limit API call
                      language_code: "en",
                      location_code: 2840
                    }];
                    
                    const volumeResponse = await axios.post(
                      `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
                      volumeRequestData,
                      { auth, timeout: 30000, headers: { 'Content-Type': 'application/json' } }
                    );
                    
                    if (volumeResponse.data?.status_code === 20000 && volumeResponse.data.tasks?.[0]?.result) {
                      const expansionResults = volumeResponse.data.tasks[0].result;
                      console.log(`Received authentic data for ${expansionResults.length} expansion keywords`);
                      
                      for (const item of expansionResults) {
                        if (item.keyword) {
                          const searchVolume = item.search_volume || 0;
                          const cpc = item.cpc || 0;
                          const competition = item.competition || 0;
                          const competitionLevel = this.getCompetitionLevel(competition);
                          const trend = item.monthly_searches ? 
                            item.monthly_searches.map((m: any) => m.search_volume || 0) : 
                            Array(12).fill(searchVolume);
                          const difficulty = this.calculateKeywordDifficulty({
                            search_volume: searchVolume,
                            competition: competition,
                            cpc: cpc
                          });
                          
                          const sanitizedKeyword = this.sanitizeKeywordForSEO(item.keyword);
                          
                          if (this.isValidSEOKeyword(sanitizedKeyword)) {
                            keywordData.push({
                              keyword: sanitizedKeyword,
                              searchVolume: searchVolume,
                              cpc: cpc,
                              competition: competition,
                              competitionLevel,
                              intent: this.determineIntent({ keyword: sanitizedKeyword }),
                              trend,
                              difficulty,
                              selected: false
                            });
                            
                            // Log inclusion of zero/low volume keywords
                            if (searchVolume === 0) {
                              console.log(`Included zero-volume expansion keyword: ${sanitizedKeyword}`);
                            } else if (searchVolume < 50) {
                              console.log(`Included low-volume expansion keyword: ${sanitizedKeyword} (${searchVolume} searches)`);
                            }
                          }
                        }
                      }
                      
                      console.log(`Added ${expansionResults.length} authentic expansion keywords from: ${broadTerm}`);
                    }
                  } catch (error) {
                    console.log(`Failed to get authentic data for expansion keywords: ${error}`);
                  }
                }
                
                if (keywordData.length >= 15) break;
              } catch (error) {
                console.log(`Expansion failed for ${broadTerm}: ${error}`);
              }
            }
          }
          
          console.log(`After expansion strategy: ${keywordData.length} total keywords`);
        }
        
        if (!hasValidData && keywordData.length === 0) {
          console.error("No valid keyword data found");
          throw new Error("No valid keywords found. Please try different search terms.");
        }
        
        // Sort keywords by search volume (highest first)
        keywordData.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
        
        console.log(`Successfully fetched ${keywordData.length} keywords from DataForSEO API`);
        console.log(`Generated ${keywordData.length} authentic keywords for: "${keyword}"`);
        
        return keywordData;
      } catch (apiError: any) {
        console.error('Error fetching keywords from DataForSEO API:', apiError.message);
        
        if (apiError.response) {
          console.error('DataForSEO API error details:');
          console.error('Status:', apiError.response.status);
          console.error('Data:', JSON.stringify(apiError.response.data));
        }
        
        throw new Error(`DataForSEO API error: ${apiError.message}`);
      }
    } catch (error: any) {
      console.error('Error in keyword processing:', error);
      throw new Error(`Failed to fetch keywords: ${error.message}`);
    }
  }

  /**
   * Clean and sanitize keyword string following SEO best practices
   * @param input The raw keyword string
   * @returns Cleaned, lowercase keyword string
   */
  private cleanKeywordString(input: string): string {
    console.log(`Cleaning keyword string: "${input}"`);
    
    // Universal dynamic cleaning - no static product assumptions
    let cleaned = input
      .replace(/®|™|©|℠/g, '') // Remove trademark/copyright symbols
      .replace(/\[.*?\]|\(.*?\)/g, '') // Remove text in brackets and parentheses
      .replace(/[[\]{}|<>]/g, ' ') // Remove special characters
      .replace(/^\d+\s*[.:)]\s*/, '') // Remove list numbers (e.g., "1. ", "2) ")
      .replace(/\b\d{5,}\b/g, '') // Remove long numbers (likely SKUs, model numbers)
      .replace(/\s+-\s+.*$/, '') // Remove everything after a dash with spaces around it
      .replace(/\s*-\s*$/, '') // Remove trailing dash with spaces
      .replace(/\s*-$/, '') // Remove trailing dash without spaces
      .replace(/^-\s*/, '') // Remove leading dash
      .replace(/\b\d+\s*(lbs?|pounds?|kg|grams?|oz|ounces?)\b/gi, '') // Remove weight specifications
      .replace(/\b(pack|piece|set|count|ct)\b/gi, '') // Remove quantity indicators
      .replace(/\s*,\s*([a-z])/g, ' $1') // Convert commas to spaces when followed by lowercase
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim(); // Remove leading/trailing whitespace
      
    // Remove brand names, model numbers and codes that don't add search value
    cleaned = cleaned
      .replace(/\b[A-Z]\d{3,}\b/g, '') // Remove model numbers like "A1234"
      .replace(/\b[A-Z]{2,}\d{2,}\b/g, '') // Remove codes like "AB123"
      .replace(/\b\d{2,}[A-Z]{1,}\b/g, '') // Remove codes like "123A"
      .replace(/\b[A-Z][a-z]*\s+[A-Z][a-z]*\b/g, ' ') // Remove brand names like "Imerys Calcite"
      .replace(/\s+/g, ' ') // Normalize spaces again
      .trim();
      
    // Convert to lowercase for SEO best practices
    cleaned = cleaned.toLowerCase();
    
    // Remove common stop words and noise
    const stopWords = ['for', 'with', 'by', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of'];
    const words = cleaned.split(' ').filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      !['brand', 'model', 'series', 'type', 'style', 'size'].includes(word)
    );
    
    // Extract the most meaningful product terms
    let finalKeyword = '';
    
    if (words.length >= 2) {
      // Use the most descriptive 2-3 words that best represent the product
      // Priority: last words (often product category) + meaningful descriptors
      const meaningfulWords = words.slice(-3); // Take last 3 words as they're often most descriptive
      finalKeyword = meaningfulWords.join(' ');
    } else if (words.length === 1) {
      finalKeyword = words[0];
    } else {
      // Fallback to first few words if no meaningful terms found
      const fallbackWords = input.toLowerCase().split(' ').slice(0, 2);
      finalKeyword = fallbackWords.join(' ');
    }
    
    console.log(`After universal cleaning: "${finalKeyword}"`);
    
    // Ensure minimum keyword length
    if (finalKeyword.length < 3) {
      console.warn(`Warning: Cleaned keyword too short: "${finalKeyword}"`);
      // Use original input first 2-3 words as emergency fallback
      const emergencyFallback = input.toLowerCase().split(' ').slice(0, 3).join(' ');
      return emergencyFallback;
    }
    
    return finalKeyword;
  }

  /**
   * Sanitize keyword for SEO best practices
   * @param keyword Raw keyword string
   * @returns Properly formatted SEO keyword
   */
  private sanitizeKeywordForSEO(keyword: string): string {
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
  }

  /**
   * Validate if keyword meets SEO quality standards
   * @param keyword Sanitized keyword
   * @returns True if keyword is valid for SEO
   */
  private isValidSEOKeyword(keyword: string): boolean {
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
  }

  /**
   * Extract meaningful keywords from a product URL or title
   * This improved method focuses on pulling out the most relevant search terms
   * @param input The URL or product title/topic to use
   * @returns The extracted keywords
   */
  private extractKeywordFromUrl(input: string): string {
    console.log(`Extracting keywords from input: "${input}"`);
    
    // First check if input is a URL or direct topic
    let extractedKeyword;

    if (input.startsWith('http://') || input.startsWith('https://')) {
      try {
        // Extract product name from URL
        const urlObj = new URL(input);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        
        // Get the last segment (usually product handle)
        const handle = pathSegments[pathSegments.length - 1];
        
        // Convert handle to keywords (replace hyphens with spaces)
        extractedKeyword = handle.replace(/-/g, ' ');
        console.log(`Extracted from URL handle: "${extractedKeyword}"`);
      } catch (error) {
        // If URL parsing fails, just use the input
        extractedKeyword = input;
        console.log(`URL parsing failed, using raw input: "${extractedKeyword}"`);
      }
    } else {
      // If it's not a URL, use the input directly
      extractedKeyword = input;
      console.log(`Using direct input as keyword: "${extractedKeyword}"`);
    }

    // Special case: Sometimes we get product titles that are very long and specific
    // Extract the most relevant parts to use as keyword
    if (extractedKeyword.length > 30) {
      console.log(`Long keyword detected (${extractedKeyword.length} chars), extracting core terms...`);
      
      // Remove common product identifiers and model numbers that don't make good search keywords
      // e.g. "(Model: ABC123)" or "- XYZ456"
      extractedKeyword = extractedKeyword
        .replace(/\s*[-–—]\s*[A-Z0-9]{3,8}\b/g, '') // Remove model numbers after dashes
        .replace(/\bmodel[:\s]+[A-Z0-9\-]{3,10}\b/i, '') // Remove model numbers with "model:" prefix
        .replace(/\b(?:model|type|item|sku|part|size|style)\b[:\s]+[\w\d\-]{3,10}\b/gi, '') // Remove various product identifiers
        .replace(/\b[A-Z0-9]{2,3}[-–—][A-Z0-9]{3,6}\b/g, '') // Remove formatted model numbers like "AB-12345"
        .replace(/\([^)]*\)/g, '') // Remove text in parentheses
        .replace(/\sby\s[\w\s]+$/i, ''); // Remove "by [Brand]" at the end
      
      // Extract core product terms (the first 3-5 words usually contain the key product terms)
      const words = extractedKeyword.split(/\s+/);
      
      if (words.length > 5) {
        // Use universal approach: extract the most meaningful product category words
        // Look for the core product category (usually the last 1-2 words are the main category)
        const potentialCategoryWords = words.filter(word => 
          word.length > 3 && 
          !word.match(/^(pro|elite|premium|plus|max|mini|super|ultra|best|top|new|model|series)$/i) &&
          !word.match(/^\d/) // Skip words starting with numbers
        );
        
        if (potentialCategoryWords.length >= 2) {
          // Use the last 2-3 meaningful words as they typically contain the product category
          const coreTerms = potentialCategoryWords.slice(-3);
          extractedKeyword = coreTerms.join(' ');
          console.log(`Extracted dynamic core category terms: "${extractedKeyword}"`);
        } else {
          // Fallback: use the first 3-4 words which typically contain the main product type
          extractedKeyword = words.slice(0, 4).join(' ');
          console.log(`Extracted first 4 words as core terms: "${extractedKeyword}"`);
        }
      }
    }

    // Apply final cleaning to the keyword
    const cleanedKeyword = this.cleanKeywordString(extractedKeyword);
    console.log(`Final cleaned keyword: "${cleanedKeyword}"`);
    
    return cleanedKeyword;
  }

  /**
   * Determine intent from keyword data
   * @param keywordItem The keyword data to determine intent from
   * @returns The determined intent
   */
  private determineIntent(keywordItem: any): string {
    // This is a simplified intent determination based on common patterns
    // In a real implementation, this would be more sophisticated
    const keyword = keywordItem.keyword?.toLowerCase() || '';
    
    if (keyword.includes('buy') || keyword.includes('price') || keyword.includes('cost') || keyword.includes('shop')) {
      return 'Transactional';
    } else if (keyword.includes('how to') || keyword.includes('guide') || keyword.includes('tutorial')) {
      return 'Informational';
    } else if (keyword.includes('best') || keyword.includes('vs') || keyword.includes('review')) {
      return 'Commercial';
    } else {
      return 'Navigational';
    }
  }

  /**
   * Get competition level description from competition value
   * @param competition Competition value from 0-1
   * @returns Competition level description (Low, Medium, High)
   */
  private getCompetitionLevel(competition: number): string {
    if (competition < 0.33) {
      return "Low";
    } else if (competition < 0.66) {
      return "Medium";
    } else {
      return "High";
    }
  }

  /**
   * Calculate keyword difficulty based on available metrics
   * @param keywordItem Keyword data item
   * @returns Keyword difficulty score from 0-100
   */
  private calculateKeywordDifficulty(keywordItem: any): number {
    // This is a simplified calculation
    // In a real implementation, this would be more sophisticated
    
    // Use competition as a base factor (0-1)
    const competitionFactor = keywordItem.competition || 0;
    
    // Factor in search volume (more searches = more difficult)
    const volumeFactor = Math.min(1, (keywordItem.search_volume || 0) / 10000);
    
    // Factor in CPC (higher CPC = more difficult)
    const cpcFactor = Math.min(1, (keywordItem.cpc || 0) / 5);
    
    // Calculate and return difficulty score from 0-100
    return Math.round((competitionFactor * 0.5 + volumeFactor * 0.3 + cpcFactor * 0.2) * 100);
  }

  /**
   * Extract generic terms dynamically from any product name
   * Works universally for any product category without hardcoded assumptions
   * @param productName The specific product name to extract generic terms from
   * @returns Array of generic terms in order of relevance
   */
  private extractGenericTerms(productName: string): string[] {
    console.log(`Extracting universal dynamic terms from: ${productName}`);
    const terms: string[] = [];
    
    // Convert to lowercase and clean the input
    const normalizedInput = productName.toLowerCase()
      .replace(/®|™|©|\[.*?\]|\(.*?\)/g, '') // Remove trademark symbols and bracketed text
      .replace(/[^\w\s-]/g, ' ')             // Replace special chars with spaces
      .replace(/\b\d+\s*(lbs?|pounds?|kg|grams?|oz|ounces?)\b/gi, '') // Remove weights
      .replace(/\b(pack|piece|set|count|ct)\b/gi, '') // Remove quantity indicators
      .replace(/\s+/g, ' ')                  // Normalize spaces
      .trim();
      
    console.log(`Normalized input for universal extraction: ${normalizedInput}`);
    
    // Universal dynamic extraction - no hardcoded product categories
    const words = normalizedInput.split(' ').filter(word => 
      word.length > 2 && 
      !['best', 'top', 'new', 'premium', 'series', 'model', 'brand', 'type', 'style', 'size'].includes(word) &&
      !['for', 'with', 'by', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of'].includes(word)
    );
    
    // Strategy 1: Extract meaningful word combinations from the actual product name
    if (words.length >= 2) {
      // Add 2-word combinations that represent product categories
      for (let i = 0; i < words.length - 1; i++) {
        const combination = `${words[i]} ${words[i + 1]}`;
        if (combination.length > 5 && !terms.includes(combination)) {
          terms.push(combination);
        }
      }
      
      // Add 3-word combinations if they seem meaningful
      if (words.length >= 3) {
        for (let i = 0; i < words.length - 2; i++) {
          const combination = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (combination.length > 8 && !terms.includes(combination)) {
            terms.push(combination);
          }
        }
      }
    }
    
    // Strategy 2: Add individual significant words as category terms
    words.slice(0, 3).forEach(word => {
      if (word.length > 3 && !terms.includes(word)) {
        terms.push(word);
      }
    });
    
    // Strategy 3: If we have very few terms, add the full cleaned input
    if (terms.length < 2 && normalizedInput.length > 5) {
      terms.push(normalizedInput);
    }
    
    // Limit to most relevant terms to focus the search
    const finalTerms = terms.slice(0, 6); // Limit to top 6 most relevant terms
    console.log(`Extracted universal dynamic terms: ${finalTerms.join(', ')}`);
    return finalTerms;
  }

  /**
   * Sort keywords by relevance based on various metrics
   * This ensures the most valuable keywords for content creation are prioritized
   * @param keywords The array of keywords to sort
   * @returns Sorted array of keywords
   */
  private sortKeywordsByRelevance(keywords: KeywordData[]): KeywordData[] {
    console.log(`Sorting ${keywords.length} keywords by relevance`);
    
    // If there's only one keyword, no need to sort
    if (keywords.length <= 1) {
      return keywords;
    }

    // Keep the first keyword (main keyword) in position
    const mainKeyword = keywords[0];
    const otherKeywords = keywords.slice(1);
    
    // Create a scoring function to rank keywords by their value for content creation
    const getKeywordScore = (keyword: KeywordData): number => {
      let score = 0;
      
      // Start with search volume as the base score
      score += keyword.searchVolume ? keyword.searchVolume / 1000 : 0;
      
      // Adjust score based on intent (highest value for informational keywords)
      if (keyword.intent === 'Informational') {
        score *= 1.5; // Best for blog posts
      } else if (keyword.intent === 'Commercial') {
        score *= 1.2; // Good for product comparison
      } else if (keyword.intent === 'Navigational') {
        score *= 0.7; // Less useful for content
      }
      
      // Adjust for competition (lower competition is better)
      if (keyword.competition) {
        score *= (1 - keyword.competition * 0.3); // Reduce score by up to 30% for high competition
      }
      
      // Adjust for specific patterns ideal for blog content
      const lowercaseKeyword = keyword.keyword.toLowerCase();
      if (lowercaseKeyword.includes('how to') || 
          lowercaseKeyword.includes('guide') || 
          lowercaseKeyword.includes('tips')) {
        score *= 1.3;
      }
      
      // Adjust for specific patterns that make great blog titles
      if (lowercaseKeyword.includes('best') || 
          lowercaseKeyword.includes('vs') || 
          lowercaseKeyword.match(/^\d+\s+/)) { // Starts with number, like "10 best..."
        score *= 1.2;
      }
      
      return score;
    };
    
    // Sort other keywords by their content value score
    otherKeywords.sort((a, b) => {
      const scoreA = getKeywordScore(a);
      const scoreB = getKeywordScore(b);
      return scoreB - scoreA; // Descending order
    });
    
    // Return the main keyword followed by the sorted other keywords
    return [mainKeyword, ...otherKeywords];
  }

  /**
   * Generate related keywords based on a main keyword
   * This creates variations that maintain most of the metrics from the main keyword
   * @param mainKeyword The main keyword to generate variations from
   * @returns Array of related keyword data
   */
  private async generateRelatedKeywords(mainKeyword: KeywordData): Promise<KeywordData[]> {
    console.log(`Skipping fallback keyword generation for: ${mainKeyword.keyword}`);
    return []; // Return empty array instead of generating fallback keywords
  }

  /**
   * Generate broader category terms dynamically from any product name
   * Works universally for any product category without hardcoded terms
   * @param originalKeyword The original specific keyword
   * @returns Array of broader category terms
   */
  private generateBroadCategoryTerms(originalKeyword: string): string[] {
    console.log(`Generating universal dynamic category terms for "${originalKeyword}"`);
    const broadTerms: string[] = [];
    
    // Clean and extract meaningful words from the keyword
    const words = originalKeyword.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(' ')
      .filter(word => 
        word.length > 2 && 
        !['the', 'a', 'an', 'and', 'or', 'for', 'with', 'by', 'best', 'top', 'new'].includes(word)
      );
    
    if (words.length === 0) {
      console.log('No meaningful words found for category generation');
      return [];
    }
    
    // Strategy 1: Use the actual product terms as category bases
    // Last word is often the main product category
    const lastWord = words[words.length - 1];
    if (lastWord) {
      broadTerms.push(lastWord);
    }
    
    // Second-to-last word for compound categories
    if (words.length >= 2) {
      const secondLastWord = words[words.length - 2];
      broadTerms.push(secondLastWord);
      broadTerms.push(`${secondLastWord} ${lastWord}`);
    }
    
    // First word if it's different from the last words (often descriptive)
    const firstWord = words[0];
    if (firstWord && firstWord !== lastWord && firstWord !== words[words.length - 2]) {
      broadTerms.push(firstWord);
    }
    
    // Strategy 2: Generate universal search modifiers that work for any product
    const primaryCategory = lastWord || words[0];
    if (primaryCategory) {
      const universalModifiers = [
        `best ${primaryCategory}`,
        `${primaryCategory} reviews`,
        `${primaryCategory} buying guide`,
        `top ${primaryCategory}`,
        `${primaryCategory} comparison`,
        `${primaryCategory} brands`,
        `cheap ${primaryCategory}`,
        `affordable ${primaryCategory}`
      ];
      
      universalModifiers.forEach(modifier => {
        if (!broadTerms.includes(modifier)) {
          broadTerms.push(modifier);
        }
      });
    }
    
    // Remove duplicates and limit to most relevant terms
    const uniqueTerms = [...new Set(broadTerms)];
    const finalTerms = uniqueTerms.slice(0, 8);
    
    console.log(`Generated universal category terms: ${finalTerms.join(', ')}`);
    return finalTerms;
  }



  /**
   * Test the connection to DataForSEO API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.hasValidCredentials()) {
      return {
        success: false,
        message: 'DataForSEO credentials not set'
      };
    }

    try {
      console.log(`Testing DataForSEO connection with login: ${this.username}`);
      console.log(`Auth details - username length: ${this.username.length}, password length: ${this.password.length}`);
      
      // Use a simple POST request instead of GET for testing
      // DataForSEO's API prefers POST requests for most endpoints
      const auth = {
        username: this.username,
        password: this.password
      };

      // Use a keyword search endpoint that's known to work
      // For search_volume endpoint, use 'keywords' array instead of 'keyword'
      const requestData = [{
        keywords: ["test connection"], // Keywords array for search volume endpoint
        language_code: "en", 
        location_code: 2840 // United States
      }];

      // Add more detailed logging  
      const endpoint = `/v3/keywords_data/google/search_volume/live`;
      console.log(`DataForSEO test request URL: ${this.apiUrl}${endpoint}`);
      console.log(`DataForSEO test request data: ${JSON.stringify(requestData)}`);
      
      try {
        const response = await axios.post(
          `${this.apiUrl}${endpoint}`,
          requestData,
          { 
            auth,
            timeout: 45000, // 45 second timeout for DataForSEO API
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`DataForSEO test connection HTTP status: ${response.status}`);
        
        // Check DataForSEO specific status code in the response data
        if (response.data && response.data.status_code) {
          console.log(`DataForSEO API status code: ${response.data.status_code}`);
          console.log(`DataForSEO API status message: ${response.data.status_message || 'No message'}`);
          
          // DataForSEO uses 20000 as their success code
          if (response.data.status_code === 20000) {
            return {
              success: true,
              message: 'Connected to DataForSEO API successfully'
            };
          } else {
            return {
              success: false,
              message: `DataForSEO API error: ${response.data.status_message || 'Unknown error'}`
            };
          }
        }
        
        // If no DataForSEO specific status code, fall back to HTTP status
        if (response.status >= 200 && response.status < 300) {
          return {
            success: true,
            message: 'Connected to DataForSEO API successfully'
          };
        } else {
          return {
            success: false,
            message: `DataForSEO API returned unexpected status: ${response.status}`
          };
        }
      } catch (axiosError: any) {
        // Special handling for 401 errors which indicate authentication problems
        if (axiosError.response?.status === 401) {
          console.error("DataForSEO authentication failed. Status 401 Unauthorized");
          
          // Show the exact error response to help debug
          if (axiosError.response?.data) {
            console.error("DataForSEO error response:", JSON.stringify(axiosError.response.data));
          }
          
          return {
            success: false,
            message: 'Authentication failed: Invalid DataForSEO API credentials. Make sure your API key is in the format "username:password".'
          };
        }
        
        throw axiosError; // Re-throw to be caught by the outer catch block
      }
    } catch (error: any) {
      console.error("DataForSEO connection test error:", error.message);
      
      // Log the full error object for debugging
      console.error("DataForSEO error details:", error);
      
      // Extract more detailed error information if available
      const errorResponse = error.response?.data;
      const errorDetails = errorResponse?.status_message || error.message || 'Unknown error';
      
      // Enhanced error messages based on common DataForSEO errors
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'Could not connect to DataForSEO API server. Please check your internet connection.'
        };
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Connection to DataForSEO API timed out. Please try again later.'
        };
      } else if (errorDetails.toLowerCase().includes('unauthorized') || 
                 errorDetails.toLowerCase().includes('authentication')) {
        return {
          success: false,
          message: 'Invalid DataForSEO API credentials. Please check your API key format (should be username:password).'
        };
      }
      
      return {
        success: false,
        message: `Failed to connect to DataForSEO API: ${errorDetails}`
      };
    }
  }
}

// Create and export singleton instance
export const dataForSEOService = new DataForSEOService();