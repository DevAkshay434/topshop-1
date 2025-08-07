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

        // Clean the keyword to remove problematic characters and ensure proper length
        const cleanedKeyword = this.cleanKeywordString(keyword);
        console.log(`Cleaned keyword for API request: "${cleanedKeyword}" (original: "${keyword}")`);
        
        // Validate keyword length for DataForSEO API (max 5 words strictly enforced)
        const words = cleanedKeyword.split(' ');
        const baseKeyword = words.length > 5 ? words.slice(0, 5).join(' ') : cleanedKeyword;
        console.log(`Base keyword for variations: "${baseKeyword}" (${words.length} words)`);
        
        // Prepare request payload for search_volume endpoint
        // Note: search_volume expects 'keywords' array instead of a single 'keyword'
        
        // Create focused keyword variations for DataForSEO API with strict word limits
        // Each variation must be ≤5 words to pass API validation
        const focusedKeywords = [
          // Core keyword (most important)
          baseKeyword,
          
          // High-value commercial intent keywords (≤5 words each)
          `${baseKeyword} reviews`,
          `best ${baseKeyword}`,
          `${baseKeyword} price`,
          `buy ${baseKeyword}`,
          
          // Popular informational keywords (≤5 words each)
          `${baseKeyword} guide`,
          `${baseKeyword} benefits`,
          `${baseKeyword} features`,
          
          // Essential product research keywords (≤5 words each)
          `top ${baseKeyword}`,
          `${baseKeyword} brands`,
          `${baseKeyword} problems`
        ].filter(Boolean).filter(keyword => {
          // Final safety filter: ensure no keyword exceeds 5 words
          const wordCount = keyword.split(' ').length;
          if (wordCount > 5) {
            console.log(`Filtered out long keyword: "${keyword}" (${wordCount} words)`);
            return false;
          }
          return true;
        });

        
        // Use the focused keywords directly - no batching needed for smaller sets
        const uniqueKeywords = Array.from(new Set(focusedKeywords));
        
        console.log(`Sending ${uniqueKeywords.length} focused keywords to DataForSEO API:`, uniqueKeywords);
        
        const requestData = [{
          keywords: uniqueKeywords.slice(0, 25), // Reduced to 25 keywords for faster API response
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
        
        // Get additional authentic keywords using multiple DataForSEO endpoints
        console.log(`Expanding keyword list with comprehensive DataForSEO suggestions...`);
        
        if (keywordData.length > 0) {
          try {
            // Use the first valid keyword to get more suggestions
            const seedKeyword = keywordData[0].keyword;
            console.log(`Getting comprehensive keyword suggestions for: ${seedKeyword}`);
            
            const auth = {
              username: this.username,
              password: this.password
            };
            
            // Use keyword suggestions endpoint with higher limit for more results
            const suggestionsRequestData = [{
              keyword: seedKeyword,
              language_code: "en", 
              location_code: 2840,
              limit: 100, // Increase limit to get more authentic suggestions
              include_seed_keyword: false
            }];
            
            const suggestionsResponse = await axios.post(
              `${this.apiUrl}/v3/dataforseo_labs/google/keyword_suggestions/live`,
              suggestionsRequestData,
              { 
                auth,
                timeout: 45000, // Increase timeout for comprehensive results
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (suggestionsResponse.data?.status_code === 20000 && suggestionsResponse.data.tasks?.[0]?.result) {
              const suggestions = suggestionsResponse.data.tasks[0].result;
              console.log(`Found ${suggestions.length} additional keyword suggestions`);
              
              // Filter suggestions to be highly relevant and get more comprehensive results
              const suggestedKeywords = suggestions
                .map((item: any) => item.keyword)
                .filter((kw: string) => {
                  if (!kw || keywordData.some(existing => existing.keyword === kw)) {
                    return false;
                  }
                  
                  // Only include keywords that contain core terms from our main keyword
                  const mainKeywordTerms = baseKeyword.toLowerCase().split(' ').filter(term => term.length > 2);
                  const suggestionTerms = kw.toLowerCase().split(' ');
                  
                  // Must contain at least one core term from the main keyword
                  const hasRelevantTerm = mainKeywordTerms.some(mainTerm => 
                    suggestionTerms.some(suggestionTerm => 
                      suggestionTerm.includes(mainTerm) || mainTerm.includes(suggestionTerm)
                    )
                  );
                  
                  return hasRelevantTerm;
                })
                .slice(0, 30); // Increase to get more authentic keywords from DataForSEO
              
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
                    timeout: 45000,
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
          
          // Try to get even more keywords using keyword ideas endpoint if we still need more
          if (keywordData.length < 20) {
            try {
              console.log(`Attempting to get more keywords using keyword ideas endpoint...`);
              
              const seedKeyword = keywordData[0].keyword;
              const keywordIdeasRequestData = [{
                keyword: seedKeyword,
                language_code: "en",
                location_code: 2840,
                search_volume: [0, 999999], // Include all search volumes
                include_seed_keyword: false,
                limit: 100
              }];
              
              const ideasResponse = await axios.post(
                `${this.apiUrl}/v3/dataforseo_labs/google/keyword_ideas/live`,
                keywordIdeasRequestData,
                { 
                  auth: { username: this.username, password: this.password },
                  timeout: 45000,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
              
              if (ideasResponse.data?.status_code === 20000 && ideasResponse.data.tasks?.[0]?.result) {
                const ideas = ideasResponse.data.tasks[0].result;
                console.log(`Found ${ideas.length} keyword ideas from DataForSEO`);
                
                // Filter ideas to be relevant and add them to our keyword list
                const relevantIdeas = ideas
                  .filter((item: any) => {
                    if (!item.keyword || keywordData.some(existing => existing.keyword === item.keyword)) {
                      return false;
                    }
                    
                    // Check if keyword contains main terms
                    const mainKeywordTerms = cleanedKeyword.toLowerCase().split(' ').filter(term => term.length > 2);
                    const ideaTerms = item.keyword.toLowerCase().split(' ');
                    
                    return mainKeywordTerms.some(mainTerm => 
                      ideaTerms.some((ideaTerm: string) => 
                        ideaTerm.includes(mainTerm) || mainTerm.includes(ideaTerm)
                      )
                    );
                  })
                  .slice(0, 20); // Get up to 20 additional authentic ideas
                
                // Process the keyword ideas and add to our results
                for (const idea of relevantIdeas) {
                  if (keywordData.length >= 30) break; // Reasonable limit
                  
                  const keywordText = idea.keyword || '';
                  const searchVolume = idea.search_volume || 0;
                  const competition = idea.competition || 0;
                  const cpc = idea.cpc || 0;
                  
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
                    
                    console.log(`Added keyword idea: ${sanitizedKeyword} (Volume: ${searchVolume})`);
                  }
                }
                
                console.log(`Added ${relevantIdeas.length} additional keywords from keyword ideas`);
              }
            } catch (error) {
              console.log('Could not fetch keyword ideas:', error);
              // Continue with existing keywords
            }
          }
        }
        
        console.log(`Total keywords collected: ${keywordData.length} - focusing on product-specific, high-quality results`);
        
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
    console.log(`Cleaning keyword string (preserving full phrase): "${input}"`);
    
    // Light cleaning that preserves the full meaningful phrase
    // Only remove problematic characters that interfere with API calls
    let cleaned = input
      .replace(/®|™|©|℠/g, '') // Remove trademark/copyright symbols
      .replace(/\[.*?\]|\(.*?\)/g, '') // Remove text in brackets and parentheses
      .replace(/[[\]{}|<>]/g, ' ') // Remove special characters that break APIs
      .replace(/^\d+\s*[.:)]\s*/, '') // Remove list numbers (e.g., "1. ", "2) ")
      .replace(/\b\d{5,}\b/g, '') // Remove long numbers (likely SKUs, model numbers)
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim() // Remove leading/trailing whitespace
      .toLowerCase(); // Convert to lowercase for consistency

    // Remove excessive model numbers and codes but preserve product description
    cleaned = cleaned
      .replace(/\b[A-Z]\d{3,}\b/gi, '') // Remove model numbers like "A1234"  
      .replace(/\b[A-Z]{2,}\d{2,}\b/gi, '') // Remove codes like "AB123"
      .replace(/\b\d{2,}[A-Z]{1,}\b/gi, '') // Remove codes like "123A"
      .replace(/\s+/g, ' ') // Normalize spaces again
      .trim();

    // Keep stop words as they provide important context for DataForSEO
    // Remove only leading/trailing articles if they exist
    const words = cleaned.split(' ');
    
    // Remove leading articles only if there are multiple words
    if (words.length > 2 && ['the', 'a', 'an'].includes(words[0])) {
      words.shift();
    }
    
    // Remove trailing prepositions only if there are multiple words  
    if (words.length > 2 && ['for', 'with', 'by', 'of'].includes(words[words.length - 1])) {
      words.pop();
    }
    
    const finalKeyword = words.join(' ');
    
    console.log(`Preserved meaningful phrase: "${finalKeyword}" (original: "${input}")`);
    
    // Ensure we have meaningful content
    if (finalKeyword.length < 3) {
      console.warn(`Warning: Cleaned keyword too short: "${finalKeyword}"`);
      // Return original input with basic cleaning as fallback
      return input.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
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
   * Convert branded product names to searchable categories for better DataForSEO results
   * @param input The URL or product title/topic to use
   * @returns The extracted keywords as searchable category phrase
   */
  private extractKeywordFromUrl(input: string): string {
    console.log(`Extracting keywords from input: "${input}"`);
    
    // Check if this looks like a branded product name that needs category extraction
    const isBrandedProduct = this.detectBrandedProduct(input);
    
    if (input.startsWith('http://') || input.startsWith('https://')) {
      // For URLs, extract the product handle and enrich it
      let extractedKeyword;
      try {
        const urlObj = new URL(input);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        
        // Get the last segment (usually product handle)
        const handle = pathSegments[pathSegments.length - 1];
        
        // Convert handle to keywords (replace hyphens with spaces)
        extractedKeyword = handle.replace(/-/g, ' ');
        console.log(`Extracted from URL handle: "${extractedKeyword}"`);
      } catch (error) {
        extractedKeyword = input;
        console.log(`URL parsing failed, using raw input: "${extractedKeyword}"`);
      }

      // Always extract category from URL-based product data
      const enrichedKeyword = this.enrichProductDataToPhrase(extractedKeyword);
      console.log(`Final enriched keyword phrase: "${enrichedKeyword}"`);
      return enrichedKeyword;
      
    } else if (isBrandedProduct) {
      // For branded product names, extract the core category
      console.log(`Detected branded product, extracting category: "${input}"`);
      const categoryKeyword = this.enrichProductDataToPhrase(input);
      console.log(`Extracted category keyword: "${categoryKeyword}"`);
      return categoryKeyword;
      
    } else {
      // For manual user topics/searches, preserve as-is
      console.log(`Using manual topic directly: "${input}"`);
      return this.preserveFullPhrase(input);
    }
  }

  /**
   * Detect if input looks like a branded product name rather than a search query
   * @param input The input to analyze
   * @returns True if it looks like a branded product name
   */
  private detectBrandedProduct(input: string): boolean {
    console.log(`Detecting if branded product: "${input}"`);
    const text = input.toLowerCase();
    
    // Look for brand indicators
    const brandIndicators = [
      // Common brand/model patterns
      /\b(pro|elite|premium|max|plus|ultra|super|advanced)\b/,
      // Trademark symbols
      /[®™©]/,
      // Model numbers or codes
      /\b[a-z]+\d+\b/,
      // Brackets with specifications
      /\[.*?\]/,
      // Multiple capitalized words (brand names)
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+/
    ];
    
    // If it matches brand patterns and is longer than a typical search, it's probably a product name
    const hasBrandIndicators = brandIndicators.some(pattern => {
      const match = pattern.test(input);
      if (match) console.log(`Brand indicator matched: ${pattern}`);
      return match;
    });
    const isLongSpecificName = input.split(' ').length > 4;
    
    const result = hasBrandIndicators || isLongSpecificName;
    console.log(`Brand detection result: ${result} (indicators: ${hasBrandIndicators}, long: ${isLongSpecificName})`);
    
    return result;
  }

  /**
   * Preserve the full meaningful phrase instead of slicing it
   * Only clean problematic characters but keep the context intact
   * @param input The user's manual input or topic
   * @returns Cleaned but full phrase
   */
  private preserveFullPhrase(input: string): string {
    let cleaned = input
      .replace(/®|™|©|℠/g, '') // Remove trademark/copyright symbols
      .replace(/\[.*?\]|\(.*?\)/g, '') // Remove text in brackets and parentheses
      .replace(/[[\]{}|<>]/g, ' ') // Remove special characters
      .replace(/^\d+\s*[.:)]\s*/, '') // Remove list numbers (e.g., "1. ", "2) ")
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim(); // Remove leading/trailing whitespace

    // Convert to lowercase for consistency
    cleaned = cleaned.toLowerCase();

    console.log(`Preserved full phrase: "${cleaned}" (original: "${input}")`);
    return cleaned;
  }

  /**
   * Extract the core product category from branded product names for better keyword search
   * Convert specific branded names into broad, searchable product categories
   * @param productData The basic product title or extracted keyword
   * @returns A broad product category that people actually search for
   */
  private enrichProductDataToPhrase(productData: string): string {
    // Clean basic noise while preserving meaningful content
    let cleaned = productData
      .replace(/®|™|©|℠/g, '')
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/\b\d{5,}\b/g, '') // Remove long numbers (SKUs)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Remove brand names, model names, and specific identifiers to get core product type
    cleaned = cleaned
      .replace(/\b[A-Z]\d{3,}\b/gi, '') // Remove model numbers like "A1234"
      .replace(/\b[A-Z]{2,}\d{2,}\b/gi, '') // Remove codes like "AB123"
      .replace(/\b(softpro|elite|pro|premium|max|plus|ultra|super|advanced|professional)\b/gi, '') // Remove brand/quality modifiers
      .replace(/\b(series|model|type|version)\b/gi, '') // Remove product line indicators
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleaned.split(' ').filter(word => word.length > 2);
    
    if (words.length === 0) {
      return 'water treatment system'; // Generic fallback for water products
    }

    // Extract core product categories that people actually search for
    let coreCategory = '';
    
    // Look for common product categories in the cleaned text
    const productCategories = [
      // Water treatment products
      { terms: ['water', 'conditioner'], category: 'water conditioner' },
      { terms: ['water', 'softener'], category: 'water softener' },
      { terms: ['water', 'filter'], category: 'water filter' },
      { terms: ['water', 'purifier'], category: 'water purifier' },
      { terms: ['water', 'treatment'], category: 'water treatment system' },
      { terms: ['salt', 'free'], category: 'salt free water softener' },
      
      // Other common categories
      { terms: ['air', 'purifier'], category: 'air purifier' },
      { terms: ['air', 'conditioner'], category: 'air conditioner' },
      { terms: ['vacuum', 'cleaner'], category: 'vacuum cleaner' },
      { terms: ['coffee', 'maker'], category: 'coffee maker' },
      { terms: ['pressure', 'washer'], category: 'pressure washer' }
    ];

    // Find matching category
    for (const cat of productCategories) {
      const hasAllTerms = cat.terms.every(term => words.includes(term));
      if (hasAllTerms) {
        coreCategory = cat.category;
        break;
      }
    }

    // If no specific category found, use the most descriptive 2-3 words
    if (!coreCategory) {
      // Take the last 2-3 words as they often contain the product type
      const meaningfulWords = words.filter(word => 
        !['for', 'with', 'and', 'the', 'system', 'unit', 'device'].includes(word)
      );
      
      if (meaningfulWords.length >= 2) {
        coreCategory = meaningfulWords.slice(-2).join(' ');
      } else if (meaningfulWords.length === 1) {
        coreCategory = `${meaningfulWords[0]} system`;
      } else {
        coreCategory = words.slice(-2).join(' ');
      }
    }

    console.log(`Extracted core category "${coreCategory}" from "${productData}"`);
    return coreCategory;
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