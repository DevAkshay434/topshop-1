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
   * Direct API call without any term extraction or fallback logic
   */
  public async getAuthenticKeywords(searchTerm: string): Promise<KeywordData[]> {
    if (!this.hasValidCredentials()) {
      console.error('DataForSEO: No valid credentials available');
      return [];
    }

    try {
      console.log(`DataForSEO: Direct API call for keywords "${searchTerm}"`);
      
      const auth = {
        username: this.username,
        password: this.password
      };

      const allKeywords: KeywordData[] = [];
      const processedKeywords = new Set<string>();

      // Make multiple API calls sequentially to get comprehensive results
      await this.fetchDirectFromAPI(searchTerm, auth, allKeywords, processedKeywords);
      await this.fetchKeywordSuggestions(searchTerm, auth, allKeywords, processedKeywords);
      await this.fetchRelatedKeywords(searchTerm, auth, allKeywords, processedKeywords);

      console.log(`DataForSEO: Retrieved ${allKeywords.length} authentic keywords`);
      return allKeywords.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));

    } catch (error: any) {
      console.error(`DataForSEO API error: ${error.message}`);
      return [];
    }
  }

  /**
   * Direct fetch from DataForSEO API without any term modification
   */
  private async fetchDirectFromAPI(
    searchTerm: string,
    auth: any,
    allKeywords: KeywordData[],
    processedKeywords: Set<string>
  ): Promise<void> {
    try {
      console.log(`DataForSEO: Direct API call for "${searchTerm}"`);
      
      const requestData = [{
        keywords: [searchTerm.trim()],
        language_code: "en",
        location_code: 2840,
        limit: 25 // Increased limit for more comprehensive results
      }];

      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/search_volume/live`,
        requestData,
        { 
          auth,
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data?.tasks?.[0]?.result) {
        const results = response.data.tasks[0].result;
        console.log(`DataForSEO: API returned ${results.length} keyword results`);

        for (const result of results) {
          // Include keywords even with low search volume to get comprehensive data
          if (result.keyword && result.search_volume >= 0) {
            const keywordLower = result.keyword.toLowerCase();
            if (!processedKeywords.has(keywordLower)) {
              processedKeywords.add(keywordLower);

              const trend = result.monthly_searches
                ? result.monthly_searches.map((monthData: any) => monthData.search_volume || 0)
                : [];

              allKeywords.push({
                keyword: result.keyword,
                searchVolume: result.search_volume || 0,
                cpc: result.cpc || 0,
                competition: result.competition || 0,
                competitionLevel: this.getCompetitionLevel(result.competition || 0),
                intent: this.determineIntent(result.keyword),
                trend,
                difficulty: this.calculateDifficulty(result),
                selected: false
              });

              console.log(`DataForSEO: Added "${result.keyword}" (${result.search_volume} searches)`);
            }
          }
        }
      } else {
        console.log(`DataForSEO: No results from API for "${searchTerm}"`);
      }
    } catch (error: any) {
      console.error(`DataForSEO: API call failed for "${searchTerm}": ${error.message}`);
    }
  }

  /**
   * Fetch keyword suggestions from DataForSEO API
   */
  private async fetchKeywordSuggestions(
    searchTerm: string,
    auth: any,
    allKeywords: KeywordData[],
    processedKeywords: Set<string>
  ): Promise<void> {
    try {
      console.log(`DataForSEO: Getting suggestions for "${searchTerm}"`);
      
      const requestData = [{
        keyword: searchTerm,
        language_code: "en",
        location_code: 2840,
        limit: 30
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

      if (response.data?.tasks?.[0]?.result) {
        const results = response.data.tasks[0].result;
        console.log(`DataForSEO: Got ${results.length} keyword suggestions`);

        for (const result of results) {
          if (result.keyword && result.search_volume >= 0) {
            const keywordLower = result.keyword.toLowerCase();
            if (!processedKeywords.has(keywordLower)) {
              processedKeywords.add(keywordLower);

              const trend = result.monthly_searches
                ? result.monthly_searches.map((monthData: any) => monthData.search_volume || 0)
                : [];

              allKeywords.push({
                keyword: result.keyword,
                searchVolume: result.search_volume || 0,
                cpc: result.cpc || 0,
                competition: result.competition || 0,
                competitionLevel: this.getCompetitionLevel(result.competition || 0),
                intent: this.determineIntent(result.keyword),
                trend,
                difficulty: this.calculateDifficulty(result),
                selected: false
              });

              console.log(`DataForSEO: Added suggestion "${result.keyword}" (${result.search_volume} searches)`);
            }
          }
        }
      } else {
        console.log(`DataForSEO: No suggestions found for "${searchTerm}"`);
      }
    } catch (error: any) {
      console.error(`DataForSEO: Suggestions API call failed for "${searchTerm}": ${error.message}`);
    }
  }

  /**
   * Fetch related keywords using keywords_for_site endpoint
   */
  private async fetchRelatedKeywords(
    searchTerm: string,
    auth: any,
    allKeywords: KeywordData[],
    processedKeywords: Set<string>
  ): Promise<void> {
    try {
      console.log(`DataForSEO: Getting related keywords for "${searchTerm}"`);
      
      const requestData = [{
        target: searchTerm,
        language_code: "en",
        location_code: 2840,
        limit: 20
      }];

      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/keyword_ideas/live`,
        requestData,
        { 
          auth,
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.data?.tasks?.[0]?.result) {
        const results = response.data.tasks[0].result;
        console.log(`DataForSEO: Got ${results.length} related keywords`);

        for (const result of results) {
          if (result.keyword && result.search_volume >= 0) {
            const keywordLower = result.keyword.toLowerCase();
            if (!processedKeywords.has(keywordLower)) {
              processedKeywords.add(keywordLower);

              const trend = result.monthly_searches
                ? result.monthly_searches.map((monthData: any) => monthData.search_volume || 0)
                : [];

              allKeywords.push({
                keyword: result.keyword,
                searchVolume: result.search_volume || 0,
                cpc: result.cpc || 0,
                competition: result.competition || 0,
                competitionLevel: this.getCompetitionLevel(result.competition || 0),
                intent: this.determineIntent(result.keyword),
                trend,
                difficulty: this.calculateDifficulty(result),
                selected: false
              });

              console.log(`DataForSEO: Added related "${result.keyword}" (${result.search_volume} searches)`);
            }
          }
        }
      } else {
        console.log(`DataForSEO: No related keywords found for "${searchTerm}"`);
      }
    } catch (error: any) {
      console.error(`DataForSEO: Related keywords API call failed for "${searchTerm}": ${error.message}`);
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

    // Add water-related terms only if explicitly water-related
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
      !['with', 'for', 'and', 'the', 'this', 'that', 'imerys', 'from', 'by'].includes(word)
    );

    // Add specific searchable terms based on product categories
    const searchableTerms = [
      // Water treatment terms
      { word: 'media', term: 'filter media', category: 'water' },
      { word: 'calcite', term: 'calcite media', category: 'water' },
      { word: 'carbon', term: 'carbon filter', category: 'water' },
      { word: 'filter', term: 'water filter', category: 'water' },
      { word: 'softener', term: 'water softener', category: 'water' },
      { word: 'treatment', term: 'water treatment', category: 'water' },
      { word: 'purification', term: 'water purification', category: 'water' },
      { word: 'conditioner', term: 'water conditioner', category: 'water' },
      
      // Gardening terms
      { word: 'raised', term: 'raised beds', category: 'garden' },
      { word: 'beds', term: 'raised beds', category: 'garden' },
      { word: 'gardening', term: 'raised garden beds', category: 'garden' },
      { word: 'fabric', term: 'fabric raised beds', category: 'garden' },
      { word: 'planting', term: 'garden beds', category: 'garden' },
      { word: 'soil', term: 'garden soil', category: 'garden' },
      { word: 'grow', term: 'grow bags', category: 'garden' },
      { word: 'container', term: 'container gardening', category: 'garden' }
    ];

    // Determine if this is a water-related product
    const isWaterProduct = cleanName.includes('water') || cleanName.includes('ph') || 
                          cleanName.includes('filter') || cleanName.includes('softener') ||
                          cleanName.includes('calcite') || cleanName.includes('treatment');

    // Determine if this is a gardening product
    const isGardenProduct = cleanName.includes('garden') || cleanName.includes('raised') ||
                           cleanName.includes('bed') || cleanName.includes('soil') ||
                           cleanName.includes('plant') || cleanName.includes('grow');

    for (const mapping of searchableTerms) {
      if (words.includes(mapping.word) && !terms.includes(mapping.term)) {
        // Only add terms that match the product category
        if ((mapping.category === 'water' && isWaterProduct) ||
            (mapping.category === 'garden' && isGardenProduct)) {
          terms.push(mapping.term);
          console.log(`DataForSEO: Added "${mapping.term}" from word "${mapping.word}"`);
        }
      }
    }

    // If no specific terms found, add generic water treatment fallbacks
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