// Clean DataForSEO API Integration - No Fallbacks, Only Authentic Data
import axios from 'axios';

export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  cpc?: number;
  competition?: number;
  competitionLevel?: string;
  intent?: string;
  trend?: number[];
  difficulty?: number;
  selected?: boolean;
}

export class CleanDataForSEOService {
  private apiUrl: string;
  private username: string;
  private password: string;

  constructor() {
    this.apiUrl = 'https://api.dataforseo.com';
    
    const apiKey = process.env.DATAFORSEO_API_KEY || '';
    
    if (apiKey.includes(':')) {
      const [username, password] = apiKey.split(':');
      this.username = username;
      this.password = password;
      console.log(`DataForSEO initialized - Login: ${username}`);
    } else {
      console.error('DataForSEO credentials invalid - requires "login:password" format');
      this.username = '';
      this.password = '';
    }
  }

  private hasValidCredentials(): boolean {
    return !!(this.username && this.password);
  }

  /**
   * Get authentic keywords from DataForSEO API only
   * No fallbacks, no dummy data - returns empty array if API fails
   */
  public async getAuthenticKeywords(searchTerm: string): Promise<KeywordData[]> {
    if (!this.hasValidCredentials()) {
      console.error('DataForSEO: No valid credentials available');
      return [];
    }

    try {
      console.log(`DataForSEO: Getting authentic keywords for "${searchTerm}"`);
      
      const auth = {
        username: this.username,
        password: this.password
      };

      // Primary API call for keyword data
      const requestData = [{
        keywords: [searchTerm],
        language_code: "en",
        location_code: 2840,
        limit: 10
      }];

      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
        requestData,
        { 
          auth,
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.data?.tasks?.[0]?.result) {
        console.log('DataForSEO: No results from API');
        return [];
      }

      const results = response.data.tasks[0].result;
      const keywords: KeywordData[] = [];

      for (const result of results) {
        if (result.search_volume && result.search_volume > 0) {
          const trend = result.monthly_searches
            ? result.monthly_searches.map((monthData: any) => monthData.search_volume)
            : [];

          keywords.push({
            keyword: result.keyword,
            searchVolume: result.search_volume,
            cpc: result.cpc || 0,
            competition: result.competition || 0,
            competitionLevel: this.getCompetitionLevel(result.competition || 0),
            intent: this.determineIntent(result.keyword),
            trend,
            difficulty: this.calculateDifficulty(result),
            selected: false
          });
        }
      }

      // Get keyword suggestions only if we have valid initial results
      if (keywords.length > 0) {
        const suggestions = await this.getKeywordSuggestions(keywords[0].keyword);
        keywords.push(...suggestions);
      }

      console.log(`DataForSEO: Returned ${keywords.length} authentic keywords`);
      return keywords;

    } catch (error: any) {
      console.error(`DataForSEO API error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get keyword suggestions from DataForSEO API
   */
  private async getKeywordSuggestions(baseKeyword: string): Promise<KeywordData[]> {
    try {
      const auth = {
        username: this.username,
        password: this.password
      };

      const requestData = [{
        keyword: baseKeyword,
        language_code: "en",
        location_code: 2840,
        limit: 50
      }];

      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/keywords_for_keywords/live`,
        requestData,
        { 
          auth,
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.data?.tasks?.[0]?.result) {
        return [];
      }

      const suggestions: KeywordData[] = [];
      const results = response.data.tasks[0].result;

      for (const result of results) {
        if (result.search_volume && result.search_volume > 0) {
          const trend = result.monthly_searches
            ? result.monthly_searches.map((monthData: any) => monthData.search_volume)
            : [];

          suggestions.push({
            keyword: result.keyword,
            searchVolume: result.search_volume,
            cpc: result.cpc || 0,
            competition: result.competition || 0,
            competitionLevel: this.getCompetitionLevel(result.competition || 0),
            intent: this.determineIntent(result.keyword),
            trend,
            difficulty: this.calculateDifficulty(result),
            selected: false
          });
        }
      }

      return suggestions;
    } catch (error: any) {
      console.error(`DataForSEO suggestions error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get keywords for multiple products/collections
   */
  public async getKeywordsForProducts(products: Array<{id: string, title: string}>): Promise<KeywordData[]> {
    if (!products || products.length === 0) {
      return [];
    }

    const allKeywords: KeywordData[] = [];
    const processedKeywords = new Set<string>();

    // Process up to 3 products to avoid API limits
    const productsToProcess = products.slice(0, 3);

    for (const product of productsToProcess) {
      const keywords = await this.getAuthenticKeywords(product.title);
      
      // Add unique keywords only
      keywords.forEach(kw => {
        const keywordLower = kw.keyword.toLowerCase();
        if (!processedKeywords.has(keywordLower)) {
          processedKeywords.add(keywordLower);
          allKeywords.push(kw);
        }
      });
    }

    // Sort by search volume
    return allKeywords.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
  }

  private getCompetitionLevel(competition: number): string {
    if (competition <= 0.33) return 'Low';
    if (competition <= 0.66) return 'Medium';
    return 'High';
  }

  private determineIntent(keyword: string): string {
    const keywordLower = keyword.toLowerCase();
    
    if (keywordLower.includes('buy') || keywordLower.includes('price') || keywordLower.includes('cheap')) {
      return 'Commercial';
    }
    if (keywordLower.includes('how to') || keywordLower.includes('what is') || keywordLower.includes('guide')) {
      return 'Informational';
    }
    if (keywordLower.includes('review') || keywordLower.includes('compare') || keywordLower.includes('vs')) {
      return 'Commercial Investigation';
    }
    
    return 'Navigational';
  }

  private calculateDifficulty(result: any): number {
    const searchVolume = result.search_volume || 0;
    const competition = result.competition || 0;
    const cpc = result.cpc || 0;

    // Basic difficulty calculation based on competition and search volume
    const volumeScore = Math.min(searchVolume / 10000, 1) * 40;
    const competitionScore = competition * 40;
    const cpcScore = Math.min(cpc / 5, 1) * 20;

    return Math.round(volumeScore + competitionScore + cpcScore);
  }
}

// Export singleton instance
export const cleanDataForSEOService = new CleanDataForSEOService();