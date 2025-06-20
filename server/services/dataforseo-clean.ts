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
      
      // Extract searchable terms from product names
      const searchableTerms = this.extractSearchableTerms(searchTerm);
      console.log(`DataForSEO: Extracted searchable terms: [${searchableTerms.join(', ')}]`);
      
      // If no searchable terms found, return empty array
      if (searchableTerms.length === 0) {
        console.log('DataForSEO: No searchable terms extracted from product name');
        return [];
      }
      
      const auth = {
        username: this.username,
        password: this.password
      };

      const allKeywords: KeywordData[] = [];
      const processedKeywords = new Set<string>();

      // Try each searchable term
      for (const term of searchableTerms) {
        console.log(`DataForSEO: Trying term "${term}"`);
        
        if (!term || term.trim().length < 2) {
          console.log(`DataForSEO: Skipping invalid term "${term}"`);
          continue;
        }
        try {
          const requestData = [{
            keywords: [term],
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

          if (response.data?.tasks?.[0]?.result) {
            const results = response.data.tasks[0].result;

            for (const result of results) {
              if (result.search_volume && result.search_volume > 0) {
                const keywordLower = result.keyword.toLowerCase();
                if (!processedKeywords.has(keywordLower)) {
                  processedKeywords.add(keywordLower);

                  const trend = result.monthly_searches
                    ? result.monthly_searches.map((monthData: any) => monthData.search_volume)
                    : [];

                  allKeywords.push({
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
            }

            // Get suggestions for terms that returned results
            if (results.length > 0) {
              const suggestions = await this.getKeywordSuggestions(term);
              suggestions.forEach(suggestion => {
                const keywordLower = suggestion.keyword.toLowerCase();
                if (!processedKeywords.has(keywordLower)) {
                  processedKeywords.add(keywordLower);
                  allKeywords.push(suggestion);
                }
              });
            }
          }
        } catch (termError: any) {
          console.log(`DataForSEO: No results for term "${term}"`);
        }
      }

      console.log(`DataForSEO: Returned ${allKeywords.length} authentic keywords`);
      return allKeywords.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));

    } catch (error: any) {
      console.error(`DataForSEO API error: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract searchable terms from product names
   */
  private extractSearchableTerms(productName: string): string[] {
    console.log(`DataForSEO: Extracting terms from "${productName}"`);
    
    const terms: string[] = [];
    const originalName = productName.toLowerCase();
    
    // Clean the product name
    const cleanName = originalName
      .replace(/®|™|©/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\d+\s*(lbs?|oz|gallon|gal|kg|mg|ml|l)\b/gi, ' ')
      .replace(/\b\d+[\s-]*\d*\b/g, ' ')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`DataForSEO: Cleaned name "${cleanName}"`);

    // Primary category mapping - identifies main product categories
    const categoryMappings = [
      { keywords: ['calcite', 'calcium carbonate'], category: 'calcite media' },
      { keywords: ['ph correction', 'ph control'], category: 'ph correction' },
      { keywords: ['water softener', 'softener'], category: 'water softener' },
      { keywords: ['water filter', 'filtration'], category: 'water filter' },
      { keywords: ['water treatment', 'water conditioner'], category: 'water treatment' },
      { keywords: ['carbon filter', 'activated carbon'], category: 'carbon filter' },
      { keywords: ['reverse osmosis', 'ro system'], category: 'reverse osmosis' },
      { keywords: ['sediment filter'], category: 'sediment filter' },
      { keywords: ['filter media', 'filtration media'], category: 'filter media' }
    ];

    // Find matching categories
    for (const mapping of categoryMappings) {
      for (const keyword of mapping.keywords) {
        if (cleanName.includes(keyword)) {
          terms.push(mapping.category);
          console.log(`DataForSEO: Found category "${mapping.category}" from keyword "${keyword}"`);
          break;
        }
      }
    }

    // Add water-related terms if applicable
    if (cleanName.includes('water') || cleanName.includes('ph') || cleanName.includes('mineral')) {
      if (!terms.includes('water treatment')) {
        terms.push('water treatment');
        console.log('DataForSEO: Added "water treatment" - water-related product');
      }
      if (!terms.includes('water filtration')) {
        terms.push('water filtration');
        console.log('DataForSEO: Added "water filtration" - water-related product');
      }
    }

    // Extract meaningful product terms
    const words = cleanName.split(/\s+/).filter(word => 
      word.length > 3 && 
      !['with', 'for', 'and', 'the', 'this', 'that', 'imerys', 'from'].includes(word)
    );

    // Add specific searchable terms based on common water treatment keywords
    const searchableTerms = [
      { word: 'media', term: 'filter media' },
      { word: 'calcite', term: 'calcite media' },
      { word: 'carbon', term: 'carbon filter' },
      { word: 'filter', term: 'water filter' },
      { word: 'softener', term: 'water softener' },
      { word: 'treatment', term: 'water treatment' },
      { word: 'purification', term: 'water purification' },
      { word: 'conditioner', term: 'water conditioner' }
    ];

    for (const mapping of searchableTerms) {
      if (words.includes(mapping.word) && !terms.includes(mapping.term)) {
        terms.push(mapping.term);
        console.log(`DataForSEO: Added "${mapping.term}" from word "${mapping.word}"`);
      }
    }

    // If still no terms found, add generic water industry terms
    if (terms.length === 0) {
      console.log('DataForSEO: No specific terms found, adding generic water treatment terms');
      terms.push('water treatment');
      terms.push('water filtration');
    }

    // Remove duplicates and limit to top 3
    const uniqueTerms = [...new Set(terms)];
    const finalTerms = uniqueTerms.slice(0, 3);
    
    console.log(`DataForSEO: Final extracted terms: [${finalTerms.join(', ')}]`);
    return finalTerms;
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