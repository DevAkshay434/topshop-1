import axios from 'axios';

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: string;
  intent: string;
  trend: number[];
  difficulty: number;
  selected: boolean;
}

export class DataForSEOService {
  private username: string;
  private password: string;
  private apiUrl: string = 'https://api.dataforseo.com';

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  // Clean product titles to extract meaningful keywords
  private cleanProductTitle(title: string): string {
    // Remove common product-related terms and brand indicators
    const cleanedTitle = title
      .replace(/\b(best|top|premium|deluxe|pro|master|aio|model|series|edition)\b/gi, '')
      .replace(/\b[A-Z]{2,}\b/g, '') // Remove ALL CAPS words (likely model numbers)
      .replace(/\b\w*\d+\w*\b/g, '') // Remove alphanumeric model numbers
      .replace(/\[.*?\]/g, '') // Remove bracketed text
      .replace(/\(.*?\)/g, '') // Remove parenthetical text
      .replace(/[-_/\\]/g, ' ') // Replace separators with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
    
    // Extract 1-2 most meaningful words
    const words = cleanedTitle.split(' ').filter(word => 
      word.length > 2 && 
      !['for', 'the', 'and', 'with', 'from'].includes(word)
    );
    
    return words.slice(0, 2).join(' ');
  }

  // Get authentic keywords using only DataForSEO suggestions
  async getKeywordsForProduct(productTitle: string): Promise<KeywordData[]> {
    try {
      console.log(`🔍 Getting authentic keywords for product: "${productTitle}"`);
      
      // Clean the product title to get meaningful search terms
      const cleanedKeyword = this.cleanProductTitle(productTitle);
      console.log(`📝 Cleaned keyword: "${cleanedKeyword}" (from: "${productTitle}")`);
      
      if (!cleanedKeyword || cleanedKeyword.length < 3) {
        throw new Error('Cannot generate meaningful keywords from this product title');
      }

      const auth = {
        username: this.username,
        password: this.password
      };

      // Step 1: Get authentic keyword suggestions from DataForSEO
      const suggestionsRequestData = [{
        keyword: cleanedKeyword,
        language_code: "en", 
        location_code: 2840, // US
        limit: 50,
        include_seed_keyword: true,
        ignore_synonyms: false
      }];

      console.log(`🌐 Getting keyword suggestions from DataForSEO...`);
      
      const suggestionsResponse = await axios.post(
        `${this.apiUrl}/v3/dataforseo_labs/google/keyword_suggestions/live`,
        suggestionsRequestData,
        { 
          auth,
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (suggestionsResponse.data?.status_code !== 20000) {
        throw new Error(`DataForSEO suggestions API error: ${suggestionsResponse.data?.status_message}`);
      }

      const suggestions = suggestionsResponse.data.tasks?.[0]?.result || [];
      console.log(`📊 Found ${suggestions.length} keyword suggestions`);

      if (suggestions.length === 0) {
        throw new Error('No keyword suggestions found. Try different search terms.');
      }

      // Extract relevant keywords from suggestions
      const relevantKeywords = suggestions
        .map((item: any) => item.keyword)
        .filter((kw: string) => kw && kw.length > 0 && kw.split(' ').length <= 4)
        .slice(0, 30); // Limit to top 30

      console.log(`🎯 Selected ${relevantKeywords.length} relevant keywords for volume check`);

      // Step 2: Get search volume data for suggested keywords
      const volumeRequestData = [{
        keywords: relevantKeywords,
        language_code: "en",
        location_code: 2840
      }];

      const volumeResponse = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
        volumeRequestData,
        { 
          auth,
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (volumeResponse.data?.status_code !== 20000) {
        throw new Error(`DataForSEO volume API error: ${volumeResponse.data?.status_message}`);
      }

      const volumeResults = volumeResponse.data.tasks?.[0]?.result || [];
      console.log(`📈 Got search volume data for ${volumeResults.length} keywords`);

      // Process keywords with actual search volume
      const keywordData: KeywordData[] = [];

      for (const result of volumeResults) {
        const keyword = result.keyword;
        const searchVolume = result.search_volume;
        const cpc = result.cpc;
        const competition = result.competition;

        // Only include keywords with meaningful search volume
        if (searchVolume && searchVolume > 0) {
          keywordData.push({
            keyword: keyword,
            searchVolume: searchVolume,
            cpc: cpc || 0,
            competition: competition || 0,
            competitionLevel: competition > 0.7 ? 'High' : competition > 0.3 ? 'Medium' : 'Low',
            intent: keyword.includes('buy') || keyword.includes('price') ? 'Transactional' : 'Informational',
            trend: result.monthly_searches 
              ? result.monthly_searches.map((m: any) => m.search_volume) 
              : Array(12).fill(searchVolume),
            difficulty: Math.min(100, Math.round((searchVolume / 1000) + (competition * 50))),
            selected: false
          });

          console.log(`✅ ${keyword}: ${searchVolume} searches/month`);
        }
      }

      // Sort by search volume
      keywordData.sort((a, b) => b.searchVolume - a.searchVolume);

      if (keywordData.length === 0) {
        throw new Error('No keywords with search volume found. Please try different terms.');
      }

      console.log(`🎉 Successfully found ${keywordData.length} keywords with search volume`);

      return keywordData;

    } catch (error: any) {
      console.error('DataForSEO keyword generation failed:', error.message);
      throw new Error(`Keyword generation failed: ${error.message}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const auth = {
        username: this.username,
        password: this.password
      };

      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
        [{ keywords: ['test'], language_code: 'en', location_code: 2840 }],
        { auth, timeout: 10000 }
      );

      if (response.data?.status_code === 20000) {
        return { success: true, message: 'DataForSEO API connection successful' };
      } else {
        return { success: false, message: `API returned status: ${response.data?.status_message}` };
      }
    } catch (error: any) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }
}

// Create and export a singleton instance
const username = process.env.DATAFORSEO_USERNAME || 'justin@justinlofton.com';
const password = process.env.DATAFORSEO_PASSWORD || 'e6d8c94e4c68fa60';

export const dataForSEOService = new DataForSEOService(username, password);