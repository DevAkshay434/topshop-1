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
      console.log(`DataForSEO manual keyword search for: "${keyword}"`);

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
          console.log(`Found ${suggestions.length} keyword suggestions`);
          
          const suggestedKeywords = suggestions
            .map((item: any) => item.keyword)
            .filter((kw: string) => kw && kw.length > 0)
            .slice(0, 30);
          
          if (suggestedKeywords.length > 0) {
            console.log(`Getting search volume for ${suggestedKeywords.length} suggested keywords`);
            
            const volumeRequestData = [{
              keywords: suggestedKeywords,
              language_code: "en",
              location_code: 2840
            }];
            
            const volumeResponse = await axios.post(
              `${this.apiUrl}/v3/keywords_data/google_ads/search_volume/live`,
              volumeRequestData,
              { 
                auth,
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
              }
            );
            
            if (volumeResponse.data?.status_code === 20000 && volumeResponse.data.tasks?.[0]?.result) {
              const volumeResults = volumeResponse.data.tasks[0].result;
              console.log(`Got search volume data for ${volumeResults.length} keywords`);
              
              // Debug: Check what the raw volume data looks like
              console.log("Sample volume result:", JSON.stringify(volumeResults[0], null, 2));
              
              // Filter and map with better debugging
              const filteredResults = volumeResults.filter((item: any) => {
                const hasVolume = item.search_volume && item.search_volume > 0;
                if (!hasVolume) {
                  console.log(`Filtered out keyword "${item.keyword}": search_volume = ${item.search_volume}`);
                }
                return hasVolume;
              });
              
              console.log(`After filtering: ${filteredResults.length} keywords with search volume > 0`);
              
              keywordData = filteredResults.map((item: any) => ({
                keyword: item.keyword,
                searchVolume: item.search_volume || 0,
                competition: item.competition_level || 'LOW',
                difficulty: item.competition_index || 0,
                selected: false
              }));
            } else {
              console.log("Volume response failed:", {
                status_code: volumeResponse.data?.status_code,
                has_tasks: !!volumeResponse.data?.tasks,
                has_result: !!volumeResponse.data?.tasks?.[0]?.result
              });
            }
          }
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