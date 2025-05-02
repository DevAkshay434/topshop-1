// Pexels API Integration Service
import axios from 'axios';

// Interface for Pexels image data
export interface PexelsImage {
  id: string;
  width: number;
  height: number;
  url: string;
  src: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
  photographer: string;
  photographer_url: string;
  alt: string;
  avg_color?: string;
}

export class PexelsService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY || 'WV6MTEoHntfeFldjjKUHn94CtcwTAyPYxlFHS7oUDF7r5gtIPiyXA0pr';
    this.apiUrl = 'https://api.pexels.com/v1';
  }

  /**
   * Check if API key is set
   */
  public hasValidApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Search for images using Pexels API
   * @param query Search query term
   * @param count Number of images to return
   * @returns Array of image data
   */
  public async searchImages(query: string, count: number = 5): Promise<PexelsImage[]> {
    try {
      if (!this.hasValidApiKey()) {
        throw new Error('No Pexels API key found');
      }

      console.log(`Searching Pexels for: "${query}"`);
      
      // Make request to Pexels API
      const response = await axios.get(`${this.apiUrl}/search`, {
        headers: {
          'Authorization': this.apiKey
        },
        params: {
          query: query,
          per_page: count,
          orientation: 'landscape' // Prefer landscape images for blogs
        }
      });

      console.log(`Pexels search returned ${response.data.photos.length} results`);
      
      // Map response to our PexelsImage interface
      const images = response.data.photos.map((photo: any) => ({
        id: photo.id.toString(),
        width: photo.width,
        height: photo.height,
        url: photo.url,
        src: {
          original: photo.src.original,
          large: photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small,
          thumbnail: photo.src.tiny
        },
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        alt: photo.alt || query
      }));

      return images;
    } catch (error: any) {
      console.error('Error searching Pexels API:', error.message);
      throw new Error(`Failed to search Pexels: ${error.message}`);
    }
  }

  /**
   * Get curated images from Pexels
   * @param count Number of images to return
   * @returns Array of image data
   */
  public async getCuratedImages(count: number = 5): Promise<PexelsImage[]> {
    try {
      if (!this.hasValidApiKey()) {
        throw new Error('No Pexels API key found');
      }

      console.log(`Getting ${count} curated images from Pexels`);
      
      // Make request to Pexels API
      const response = await axios.get(`${this.apiUrl}/curated`, {
        headers: {
          'Authorization': this.apiKey
        },
        params: {
          per_page: count
        }
      });

      console.log(`Pexels curated returned ${response.data.photos.length} results`);
      
      // Map response to our PexelsImage interface
      const images = response.data.photos.map((photo: any) => ({
        id: photo.id.toString(),
        width: photo.width,
        height: photo.height,
        url: photo.url,
        src: {
          original: photo.src.original,
          large: photo.src.large,
          medium: photo.src.medium,
          small: photo.src.small,
          thumbnail: photo.src.tiny
        },
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        alt: photo.alt || 'Curated image from Pexels'
      }));

      return images;
    } catch (error: any) {
      console.error('Error getting curated images from Pexels API:', error.message);
      throw new Error(`Failed to get curated images from Pexels: ${error.message}`);
    }
  }

  /**
   * Generate fallback images when API fails
   * @param count Number of fallback images
   * @returns Array of fallback image data
   */
  private generateFallbackImages(count: number = 5): PexelsImage[] {
    console.log(`Generating ${count} fallback images`);
    
    // Placeholder image URLs 
    const placeholderColors = ['555555', '777777', '999999', 'bbbbbb', 'dddddd'];
    
    // Generate array of fallback images
    return Array.from({ length: count }).map((_, index) => ({
      id: `fallback-${index}`,
      width: 800,
      height: 600,
      url: `https://placeholder.com/800x600/${placeholderColors[index % placeholderColors.length]}`,
      src: {
        original: `https://placeholder.com/800x600/${placeholderColors[index % placeholderColors.length]}`,
        large: `https://placeholder.com/800x600/${placeholderColors[index % placeholderColors.length]}`,
        medium: `https://placeholder.com/600x400/${placeholderColors[index % placeholderColors.length]}`,
        small: `https://placeholder.com/400x300/${placeholderColors[index % placeholderColors.length]}`,
        thumbnail: `https://placeholder.com/200x150/${placeholderColors[index % placeholderColors.length]}`
      },
      photographer: 'Placeholder',
      photographer_url: 'https://placeholder.com',
      alt: 'Placeholder image'
    }));
  }

  /**
   * Safely search for images with fallback
   * @param query Search query term
   * @param count Number of images to return
   * @returns Images and fallback status
   */
  public async safeSearchImages(query: string, count: number = 5): Promise<{ 
    images: PexelsImage[], 
    fallbackUsed: boolean 
  }> {
    try {
      // First try to get images from Pexels API
      const images = await this.searchImages(query, count);
      return { images, fallbackUsed: false };
    } catch (error) {
      console.error("Error fetching Pexels images, using fallback:", error);
      
      // If API fails, use fallback images
      return {
        images: this.generateFallbackImages(count),
        fallbackUsed: true
      };
    }
  }

  /**
   * Test connection to Pexels API
   * @returns Success status and message
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.hasValidApiKey()) {
      return {
        success: false,
        message: 'Pexels API key not set'
      };
    }

    try {
      // Test by getting a single curated image
      await this.getCuratedImages(1);
      
      return {
        success: true,
        message: 'Successfully connected to Pexels API'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to Pexels API: ${error.message}`
      };
    }
  }
}

// Create and export singleton instance
export const pexelsService = new PexelsService();