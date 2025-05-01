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
    this.apiUrl = 'https://api.dataforseo.com/';
    // Use API_KEY as both username and password as per DataForSEO documentation
    this.username = process.env.DATAFORSEO_API_KEY || '';
    this.password = process.env.DATAFORSEO_API_KEY || '';
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
    if (!this.hasValidCredentials()) {
      throw new Error('DataForSEO credentials not set');
    }

    try {
      // Create basic auth header
      const auth = {
        username: this.username,
        password: this.password
      };

      // POST request to DataForSEO API to get related keywords
      const response = await axios.post(
        `${this.apiUrl}/v3/keywords_data/google/related_keywords/live`,
        [
          {
            keyword: this.extractKeywordFromUrl(productUrl),
            language_code: "en",
            location_code: 2840, // United States
            limit: 20
          }
        ],
        { auth }
      );

      // Check if the response is successful
      if (response.data?.tasks?.[0]?.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${response.data?.tasks?.[0]?.status_message || 'Unknown error'}`);
      }

      // Extract keyword data from response
      const keywordData: KeywordData[] = [];
      const results = response.data?.tasks?.[0]?.result || [];
      
      for (const result of results) {
        for (const item of result.items || []) {
          // Get competition level based on competition value
          const competitionLevel = this.getCompetitionLevel(item.competition || 0);
          
          // Process monthly trend data if available
          const trend = item.monthly_searches?.map((monthData: any) => monthData.search_volume) || [];
          
          // Calculate keyword difficulty if not provided directly
          const difficulty = item.keyword_difficulty || this.calculateKeywordDifficulty(item);
          
          keywordData.push({
            keyword: item.keyword || '',
            searchVolume: item.search_volume || 0,
            cpc: item.cpc || 0,
            competition: item.competition || 0,
            competitionLevel,
            intent: this.determineIntent(item),
            trend,
            difficulty,
            selected: false // Default to not selected
          });
        }
      }

      return keywordData;
    } catch (error: any) {
      console.error('Error fetching keywords from DataForSEO:', error);
      throw new Error(`Failed to fetch keywords: ${error.message}`);
    }
  }

  /**
   * Extract keywords from a product URL
   * @param url The URL to extract keywords from
   * @returns The extracted keywords
   */
  private extractKeywordFromUrl(url: string): string {
    try {
      // Extract product name from URL
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      // Get the last segment (usually product handle)
      const handle = pathSegments[pathSegments.length - 1];
      
      // Convert handle to keywords (replace hyphens with spaces)
      return handle.replace(/-/g, ' ');
    } catch (error) {
      // If URL parsing fails, just return the URL
      return url;
    }
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
      // Simple API call to check if credentials are valid
      const auth = {
        username: this.username,
        password: this.password
      };

      const response = await axios.get(`${this.apiUrl}/v3/merchant/api_status`, { auth });
      
      return {
        success: true,
        message: 'Connected to DataForSEO API successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to DataForSEO API: ${error.message}`
      };
    }
  }
}

// Create and export singleton instance
export const dataForSEOService = new DataForSEOService();