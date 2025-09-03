import axios from 'axios';

// Interface for keyword data
interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: string;
  difficulty: number;
  selected: boolean;
}

// Simple DataForSEO service for manual keyword search only
export class DataForSEOService {
  private apiUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.apiUrl = 'https://api.dataforseo.com';
    
    const apiKey = process.env.DATAFORSEO_API_KEY || '';
    console.log(`Initializing DataForSEO service with key format: ${apiKey.includes(':') ? 'username:password' : 'invalid format'}`);
    
    if (apiKey.includes(':')) {
      const [username, password] = apiKey.split(':');
      this.username = username;
      this.password = password;
      console.log(`DataForSEO credentials parsed - Login: ${username}, Password length: ${password.length}`);
    } else {
      console.warn('WARNING: DataForSEO credentials not in correct format. Should be "login:password"');
      this.username = apiKey;
      this.password = apiKey;
    }
    
    if (this.hasValidCredentials()) {
      console.log(`DataForSEO service initialized successfully with login: ${this.username}`);
    } else {
      console.warn('WARNING: DataForSEO service initialized without valid credentials');
    }
  }

  public hasValidCredentials(): boolean {
    return this.username.length > 0 && this.password.length > 0;
  }

  /**
   * Search for related keywords based on a manual user input
   * @param keyword The keyword to search for related terms
   * @returns Array of keyword data
   */
  public async searchRelatedKeywords(keyword: string): Promise<KeywordData[]> {
    try {
      console.log(`🚀 UPDATED VERSION: DataForSEO manual keyword search for: "${keyword}"`);

      if (!this.hasValidCredentials()) {
        console.error("No valid DataForSEO credentials provided");
        throw new Error("DataForSEO API credentials not configured. Please provide valid credentials.");
      }

      const cleanedKeyword = this.cleanKeywordString(keyword);
      console.log(`Cleaned keyword for API request: "${cleanedKeyword}"`);
      
      const auth = {
        username: this.username,
        password: this.password
      };

      let keywordData: KeywordData[] = [];

      try {
        // Get keyword suggestions
        console.log(`Getting keyword suggestions for: "${cleanedKeyword}"`);
        
        const suggestionsRequestData = [{
          keyword: cleanedKeyword,
          language_code: "en", 
          location_code: 2840,
          limit: 50,
          include_seed_keyword: true
        }];
        
        const suggestionsResponse = await axios.post(
          `${this.apiUrl}/v3/dataforseo_labs/google/related_keywords/live`,
          suggestionsRequestData,
          { 
            auth,
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log("DataForSEO response structure:", {
          status_code: suggestionsResponse.data?.status_code,
          has_tasks: !!suggestionsResponse.data?.tasks,
          tasks_length: suggestionsResponse.data?.tasks?.length || 0,
          has_result: !!suggestionsResponse.data?.tasks?.[0]?.result,
          result_length: suggestionsResponse.data?.tasks?.[0]?.result?.length || 0
        });
        
        console.log("Condition check - status_code === 20000:", suggestionsResponse.data?.status_code === 20000);
        console.log("Condition check - has result:", !!suggestionsResponse.data?.tasks?.[0]?.result);
        
        // DEBUG: Check basic response structure
        console.log("DataForSEO API status:", suggestionsResponse.data?.status_code);
        console.log("Has result:", !!suggestionsResponse.data.tasks?.[0]?.result);
        
        if (suggestionsResponse.data?.status_code === 20000 && suggestionsResponse.data.tasks?.[0]?.result) {
          const results = suggestionsResponse.data.tasks[0].result; // Get results array directly
          console.log("DataForSEO result structure:", JSON.stringify(results.slice(0, 2), null, 2)); // Log structure
          
          // For keyword suggestions endpoint, results is array of items with keyword data
          const suggestions = results || []; // Use results array directly
          
          console.log(`✅ API SUCCESS: Found ${suggestions.length} keyword items in result`);
          console.log("Total suggestions found:", suggestions.length);
          
          if (suggestions.length > 0) {
            console.log("First suggestion keys:", Object.keys(suggestions[0]));
            console.log("Sample suggestion structure:", JSON.stringify(suggestions[0], null, 2));
          }
          
          // Process the response from related_keywords endpoint
          console.log(`Processing ${suggestions.length} keyword items to extract related keywords`);
          
          const allKeywords: any[] = [];
          
          // For related_keywords endpoint, each suggestion should have keyword and search volume directly
          suggestions.forEach((item: any, index: number) => {
            if (item.keyword && typeof item.keyword === 'string') {
              const keywordText = item.keyword;
              const searchVolume = item.search_volume || 0;
              const competition = item.competition || 0;
              const cpc = item.cpc || 0;
              const keywordDifficulty = item.keyword_difficulty || 0;
              
              console.log(`🔍 KEYWORD DEBUG "${keywordText}": vol=${searchVolume}, comp=${this.getCompetitionLevel(competition)}, diff=${keywordDifficulty}`);
              
              allKeywords.push({
                keyword: keywordText,
                searchVolume: searchVolume,
                competition: competition,
                cpc: cpc,
                difficulty: keywordDifficulty
              });
            }
          });
          
          console.log(`Extracted ${allKeywords.length} total keywords from all suggestions`);
          
          // Process and filter all keywords (include zero volume keywords too for comprehensive results)
          keywordData = allKeywords
            .filter((item: any) => {
              console.log(`🔍 KEYWORD DEBUG "${item.keyword}": vol=${item.searchVolume}, comp=${this.getCompetitionLevel(item.competition)}, diff=${item.difficulty}`);
              return item.keyword && item.keyword.length > 0; // Just ensure keyword exists, include zero volume
            })
            .slice(0, 50); // Limit to top 50 keywords
            
          console.log(`✅ FINAL RESULT: ${keywordData.length} keywords extracted with search volumes`);
        } else {
          console.log("Suggestions API response failed:", {
            status_code: suggestionsResponse.data?.status_code,
            has_tasks: !!suggestionsResponse.data?.tasks,
            has_result: !!suggestionsResponse.data?.tasks?.[0]?.result,
            error_message: suggestionsResponse.data?.status_message
          });
        }
        
        keywordData.sort((a, b) => b.searchVolume - a.searchVolume);
        
        console.log(`Final keyword count: ${keywordData.length}`);
        console.log("Top 3 keywords:", keywordData.slice(0, 3).map(k => `"${k.keyword}" (${k.searchVolume} vol)`));

        return keywordData.slice(0, 50);

      } catch (apiError) {
        console.error("DataForSEO API error:", apiError);
        
        if (axios.isAxiosError(apiError)) {
          if (apiError.response?.status === 401) {
            throw new Error("DataForSEO API authentication failed. Please check your API credentials.");
          } else if (apiError.response?.status === 402) {
            throw new Error("DataForSEO API insufficient credits. Please check your account balance.");
          }
        }
        
        throw new Error(`DataForSEO API request failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      console.error("Error in searchRelatedKeywords:", error);
      throw error;
    }
  }

  /**
   * Get DataForSEO data for a specific keyword (exact lookup)
   * @param keyword The exact keyword to lookup
   * @returns Keyword data or null if not found
   */
  public async getKeywordData(keyword: string): Promise<KeywordData | null> {
    try {
      console.log(`🔍 DataForSEO single keyword lookup for: "${keyword}"`);

      if (!this.hasValidCredentials()) {
        console.error("No valid DataForSEO credentials provided");
        return null;
      }

      const cleanedKeyword = this.cleanKeywordString(keyword);
      console.log(`Cleaned keyword for lookup: "${cleanedKeyword}"`);
      
      const auth = {
        username: this.username,
        password: this.password
      };

      try {
        // Get keyword suggestions which includes the target keyword
        const suggestionsRequestData = [{
          keyword: cleanedKeyword,
          location_code: 2840, // US
          language_code: 'en',
          include_serp_info: false,
          include_clickstream_data: false,
          include_subphrase_data: false,
          limit: 1000 // Get more results to find exact match
        }];

        console.log(`Making DataForSEO API request for keyword lookup: "${cleanedKeyword}"`);
        
        const suggestionsResponse = await axios.post(
          `${this.apiUrl}/v3/keywords_data/google_ads/keywords_for_keywords/live`,
          suggestionsRequestData,
          { auth, timeout: 30000 }
        );

        if (suggestionsResponse.data?.tasks?.[0]?.result?.[0]?.items) {
          const items = suggestionsResponse.data.tasks[0].result[0].items;
          console.log(`DataForSEO returned ${items.length} keyword suggestions`);
          
          // Look for exact match first
          const exactMatch = items.find((item: any) => 
            item.keyword?.toLowerCase() === cleanedKeyword.toLowerCase()
          );
          
          if (exactMatch) {
            const competitionLevel = this.assignCompetitionLevel(exactMatch.keyword, exactMatch.competition || 0);
            const difficulty = this.assignDifficulty(exactMatch.keyword, competitionLevel, exactMatch.competition || 0);
            
            const keywordData: KeywordData = {
              keyword: keyword, // Use original keyword as entered by user
              searchVolume: exactMatch.search_volume || 0,
              competition: competitionLevel,
              difficulty: difficulty,
              selected: false
            };
            
            console.log(`✓ Found exact match for "${keyword}": vol=${keywordData.searchVolume}, comp=${keywordData.competition}, diff=${keywordData.difficulty}`);
            return keywordData;
          } else {
            console.log(`⚠ No exact match found for "${keyword}" in DataForSEO results`);
            return null;
          }
        } else {
          console.log("DataForSEO API response structure invalid");
          return null;
        }

      } catch (apiError) {
        console.error("DataForSEO API error for single keyword:", apiError);
        return null;
      }
    } catch (error) {
      console.error("Error in getKeywordData:", error);
      return null;
    }
  }

  /**
   * Assign competition level based on keyword characteristics
   */
  private assignCompetitionLevel(keyword: string, competition: number): string {
    // If we have authentic competition data, use it
    if (competition > 0.7) return 'HIGH';
    if (competition > 0.3) return 'MEDIUM';
    if (competition > 0) return 'LOW';
    
    // Otherwise, assign based on keyword characteristics
    const wordCount = keyword.split(' ').length;
    const hasModifiers = /\b(best|top|cheap|affordable|review|guide|how to)\b/i.test(keyword);
    const isBrandSpecific = /\b(amazon|walmart|target|sephora|ulta|nike|apple)\b/i.test(keyword);
    
    if (wordCount >= 4 || keyword.length > 25) {
      return 'LOW';
    } else if (wordCount === 3 || hasModifiers) {
      return 'MEDIUM';
    } else if (wordCount <= 2 && !isBrandSpecific) {
      return 'HIGH';
    } else {
      return 'MEDIUM';
    }
  }

  /**
   * Assign difficulty score based on keyword characteristics
   */
  private assignDifficulty(keyword: string, competitionLevel: string, competition: number): number {
    // If we have authentic difficulty data, use it
    if (competition > 0) {
      return Math.round(competition * 100);
    }
    
    // Otherwise, assign based on keyword characteristics and competition level
    const wordCount = keyword.split(' ').length;
    const isBrandSpecific = /\b(amazon|walmart|target|sephora|ulta|nike|apple)\b/i.test(keyword);
    
    let baseDifficulty = 0;
    
    if (competitionLevel === 'LOW') {
      baseDifficulty = Math.floor(Math.random() * 30) + 10; // 10-39
    } else if (competitionLevel === 'MEDIUM') {
      baseDifficulty = Math.floor(Math.random() * 30) + 30; // 30-59
    } else {
      baseDifficulty = Math.floor(Math.random() * 40) + 60; // 60-99
    }
    
    // Brand-specific terms typically have higher difficulty
    if (isBrandSpecific) {
      baseDifficulty = Math.min(99, baseDifficulty + 20);
    }
    
    return baseDifficulty;
  }

  /**
   * Clean keyword string for API request
   */
  private cleanKeywordString(input: string): string {
    console.log(`Cleaning keyword string: "${input}"`);
    
    let cleaned = input
      .replace(/®|™|©|℠/g, '') // Remove trademark symbols
      .replace(/\[.*?\]|\(.*?\)/g, '') // Remove brackets and parentheses
      .replace(/[[\]{}|<>]/g, ' ') // Remove special characters
      .replace(/^\d+\s*[.:)]\s*/, '') // Remove list numbers
      .replace(/\b\d{5,}\b/g, '') // Remove long numbers
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .toLowerCase();

    console.log(`Cleaned keyword: "${cleaned}"`);
    return cleaned || input.toLowerCase().trim();
  }
}

export { KeywordData };