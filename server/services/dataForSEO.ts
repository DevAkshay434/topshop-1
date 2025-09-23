import axios from 'axios';

interface DataForSEOCredentials {
  login: string;
  password: string;
}

interface KeywordData {
  keyword: string;
  location_code: number;
  language_code: string;
  search_partners: boolean;
  competition?: number;
  competition_level?: string;
  cpc?: number;
  search_volume?: number;
  low_top_of_page_bid?: number;
  high_top_of_page_bid?: number;
  monthly_searches?: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
}

interface DataForSEOResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: {
      api_version: string;
      function: string;
      se: string;
      se_type: string;
      location_code: number;
      language_code: string;
      total_count: number;
      items_count: number;
      items: KeywordData[];
    };
  }>;
}

export class DataForSEOService {
  private credentials: DataForSEOCredentials;
  private baseUrl = 'https://api.dataforseo.com/v3';

  constructor() {
    this.credentials = {
      login: process.env.DATAFORSEO_LOGIN || '',
      password: process.env.DATAFORSEO_PASSWORD || ''
    };

    if (!this.credentials.login || !this.credentials.password) {
      throw new Error('DataForSEO credentials not found in environment variables');
    }

    console.log('DataForSEO credentials parsed - Login:', this.credentials.login, ', Password length:', this.credentials.password.length);
  }

  private getAuthHeader(): string {
    const auth = Buffer.from(`${this.credentials.login}:${this.credentials.password}`).toString('base64');
    return `Basic ${auth}`;
  }

  /**
   * Get keyword suggestions based on a seed keyword
   * This uses the DataForSEO Labs API to get related keywords
   */
  async getKeywordSuggestions(seedKeyword: string, locationCode: string = '2840', languageCode: string = 'en', limit: number = 5): Promise<KeywordData[]> {
    try {
      console.log(`DataForSEO: Getting keyword suggestions for "${seedKeyword}"`);
      
      const requestData = [
        {
          keyword: seedKeyword,
          location_code: parseInt(locationCode),
          language_name: languageCode === 'en' ? 'English' : languageCode,
          limit: limit * 2, // Get more keywords to filter and return the best ones
          offset: 0,
          filters: [
            ["keyword_data.keyword_info.search_volume", ">", 100] // Only keywords with decent search volume
          ],
          order_by: ["keyword_data.keyword_info.search_volume,desc"] // Order by search volume descending
        }
      ];

      const response = await axios.post(
        `${this.baseUrl}/dataforseo_labs/google/related_keywords/live`,
        requestData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      const dataForSEOResponse = response.data as DataForSEOResponse;
      
      console.log('DataForSEO Full Response:', JSON.stringify(dataForSEOResponse, null, 2));
      
      if (dataForSEOResponse.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${dataForSEOResponse.status_message}`);
      }

      if (!dataForSEOResponse.tasks || dataForSEOResponse.tasks.length === 0) {
        console.log('DataForSEO: No tasks returned');
        return [];
      }

      const task = dataForSEOResponse.tasks[0];
      console.log('DataForSEO Task Response:', JSON.stringify(task, null, 2));
      
      if (task.status_code !== 20000) {
        throw new Error(`DataForSEO task error: ${task.status_message}`);
      }

      if (!task.data || !task.data.items) {
        console.log('DataForSEO: No items in task data');
        console.log('Task data:', task.data);
        return [];
      }

      // Transform DataForSEO Labs response to match our KeywordData interface
      const filteredKeywords = task.data.items
        .filter((item: any) => 
          item.keyword_data?.keyword_info?.search_volume && 
          item.keyword_data.keyword_info.search_volume > 100 && // Must have decent search volume
          item.keyword_data?.keyword && 
          item.keyword_data.keyword.toLowerCase() !== seedKeyword.toLowerCase() && // Don't include the seed keyword
          item.keyword_data.keyword.length <= 100 // Reasonable keyword length
        )
        .map((item: any) => ({
          keyword: item.keyword_data.keyword,
          location_code: parseInt(locationCode),
          language_code: languageCode,
          search_partners: false,
          search_volume: item.keyword_data.keyword_info.search_volume,
          competition: item.keyword_data.keyword_info.competition || null,
          cpc: item.keyword_data.keyword_info.cpc || null,
          competition_level: item.keyword_data.keyword_info.competition_level || null
        }))
        .sort((a, b) => {
          // Sort by search volume first, then by competition level (lower is better)
          const volumeDiff = (b.search_volume || 0) - (a.search_volume || 0);
          if (volumeDiff !== 0) return volumeDiff;
          
          const competitionA = a.competition || 1;
          const competitionB = b.competition || 1;
          return competitionA - competitionB;
        })
        .slice(0, limit); // Take the top results

      console.log(`DataForSEO: Found ${filteredKeywords.length} relevant keywords for "${seedKeyword}"`);
      
      return filteredKeywords;

    } catch (error: any) {
      console.error('DataForSEO API error:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(`Failed to get keyword suggestions: ${error.message}`);
    }
  }

  /**
   * Get keyword difficulty and additional metrics for a list of keywords
   */
  async getKeywordMetrics(keywords: string[], locationCode: string = '2840', languageCode: string = 'en'): Promise<KeywordData[]> {
    try {
      console.log(`DataForSEO: Getting metrics for ${keywords.length} keywords`);
      
      const requestData = [
        {
          keywords: keywords,
          location_code: parseInt(locationCode),
          language_code: languageCode,
          include_serp_info: false
        }
      ];

      const response = await axios.post(
        `${this.baseUrl}/keywords_data/google_ads/keywords_for_keywords/live`,
        requestData,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const dataForSEOResponse = response.data as DataForSEOResponse;
      
      if (dataForSEOResponse.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${dataForSEOResponse.status_message}`);
      }

      const task = dataForSEOResponse.tasks[0];
      if (task.status_code !== 20000) {
        throw new Error(`DataForSEO task error: ${task.status_message}`);
      }

      return task.data?.items || [];

    } catch (error: any) {
      console.error('DataForSEO API error:', error);
      throw new Error(`Failed to get keyword metrics: ${error.message}`);
    }
  }

  /**
   * Get available locations for targeting
   */
  async getAvailableLocations(): Promise<Array<{ location_code: number; location_name: string; country_iso_code: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/keywords_data/google_ads/locations`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      const dataForSEOResponse = response.data as DataForSEOResponse;
      
      if (dataForSEOResponse.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${dataForSEOResponse.status_message}`);
      }

      const task = dataForSEOResponse.tasks[0];
      return (task.data?.items || []) as Array<{ location_code: number; location_name: string; country_iso_code: string }>;

    } catch (error: any) {
      console.error('DataForSEO API error:', error);
      throw new Error(`Failed to get available locations: ${error.message}`);
    }
  }

  /**
   * Get available languages for targeting
   */
  async getAvailableLanguages(): Promise<Array<{ language_code: string; language_name: string }>> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/keywords_data/google_ads/languages`,
        {
          headers: {
            'Authorization': this.getAuthHeader()
          }
        }
      );

      const dataForSEOResponse = response.data as DataForSEOResponse;
      
      if (dataForSEOResponse.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${dataForSEOResponse.status_message}`);
      }

      const task = dataForSEOResponse.tasks[0];
      return (task.data?.items || []) as Array<{ language_code: string; language_name: string }>;

    } catch (error: any) {
      console.error('DataForSEO API error:', error);
      throw new Error(`Failed to get available languages: ${error.message}`);
    }
  }
}

// Create a singleton instance
export const dataForSEOService = new DataForSEOService();