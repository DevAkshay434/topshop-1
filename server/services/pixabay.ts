// Pixabay API Integration
import axios from 'axios';

// Interface for image data returned by Pixabay
export interface PixabayImage {
  id: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
}

// Class for Pixabay API integration
export class PixabayService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = 'https://pixabay.com/api/';
    this.apiKey = process.env.PIXABAY_API_KEY || '';
  }

  /**
   * Validate credentials are set
   * @returns True if credentials are set
   */
  public hasValidCredentials(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Search for images based on a title/prompt
   * @param prompt The title or prompt to search images for
   * @param count Number of images to retrieve
   * @returns Array of generated images
   */
  public async generateImages(prompt: string, count: number = 3): Promise<PixabayImage[]> {
    if (!this.hasValidCredentials()) {
      throw new Error('Pixabay API key not set');
    }

    try {
      // Make API request to search for images
      const response = await axios.get(`${this.apiUrl}`, {
        params: {
          key: this.apiKey,
          q: prompt,
          per_page: count,
          image_type: 'photo',
          safesearch: true
        }
      });

      // Check if we have a valid response
      if (!response.data || !response.data.hits) {
        throw new Error('Invalid response from Pixabay API');
      }

      // Map response to our interface
      const images: PixabayImage[] = response.data.hits.map((item: any) => ({
        id: item.id.toString(),
        url: item.largeImageURL,
        width: item.imageWidth,
        height: item.imageHeight,
        alt: item.tags || `Image for ${prompt}`
      }));

      return images;
    } catch (error: any) {
      console.error('Error searching images with Pixabay:', error);
      throw new Error(`Failed to search images: ${error.message}`);
    }
  }

  /**
   * Mock implementation for development when API key is not available
   * @param prompt The title or prompt to generate images for
   * @param count Number of images to generate
   * @returns Array of mock images
   */
  public async mockGenerateImages(prompt: string, count: number = 3): Promise<PixabayImage[]> {
    // Generate placeholder images for development
    return Array.from({ length: count }).map((_, index) => ({
      id: `mock-img-${index}`,
      url: `https://placehold.co/1024x1024/2563eb/ffffff?text=${encodeURIComponent(prompt)}`,
      width: 1024,
      height: 1024,
      alt: `Placeholder image for ${prompt}`
    }));
  }

  /**
   * Generate images with fallback to mock images
   * @param prompt The title or prompt to generate images for
   * @param count Number of images to generate
   * @returns Object with images and whether fallback was used
   */
  public async safeGenerateImages(prompt: string, count: number = 3): Promise<{ images: PixabayImage[], fallbackUsed: boolean }> {
    try {
      if (this.hasValidCredentials()) {
        const images = await this.generateImages(prompt, count);
        return { images, fallbackUsed: false };
      } else {
        console.log('Pixabay API key not set, using mock images');
        const images = await this.mockGenerateImages(prompt, count);
        return { images, fallbackUsed: true };
      }
    } catch (error) {
      console.error('Error in Pixabay image generation, falling back to mock images:', error);
      const images = await this.mockGenerateImages(prompt, count);
      return { images, fallbackUsed: true };
    }
  }

  /**
   * Test the connection to Pixabay API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.hasValidCredentials()) {
      return {
        success: false,
        message: 'Pixabay API key not set'
      };
    }

    try {
      // Simple API call to check if credentials are valid
      const response = await axios.get(`${this.apiUrl}`, {
        params: {
          key: this.apiKey,
          q: 'test',
          per_page: 1
        }
      });
      
      return {
        success: true,
        message: 'Connected to Pixabay API successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to Pixabay API: ${error.message}`
      };
    }
  }
}

// Create and export singleton instance
export const pixabayService = new PixabayService();