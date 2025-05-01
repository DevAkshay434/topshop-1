// Pixaway API Integration
import axios from 'axios';

// Interface for image data returned by Pixaway
export interface PixawayImage {
  id: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
}

// Class for Pixaway API integration
export class PixawayService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = 'https://api.pixaway.com/v1'; // Replace with actual Pixaway API URL
    this.apiKey = process.env.PIXAWAY_API_KEY || '';
  }

  /**
   * Validate credentials are set
   * @returns True if credentials are set
   */
  public hasValidCredentials(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Generate images based on a title/prompt
   * @param prompt The title or prompt to generate images for
   * @param count Number of images to generate
   * @returns Array of generated images
   */
  public async generateImages(prompt: string, count: number = 3): Promise<PixawayImage[]> {
    if (!this.hasValidCredentials()) {
      throw new Error('Pixaway API key not set');
    }

    try {
      // Make API request to generate images
      const response = await axios.post(
        `${this.apiUrl}/generate`,
        {
          prompt,
          n: count,
          size: '1024x1024',
          response_format: 'url'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Check if we have a valid response
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Pixaway API');
      }

      // Map response to our interface
      const images: PixawayImage[] = response.data.data.map((item: any, index: number) => ({
        id: item.id || `img-${index}`,
        url: item.url,
        width: item.width || 1024,
        height: item.height || 1024,
        alt: `Generated image for ${prompt}`
      }));

      return images;
    } catch (error: any) {
      console.error('Error generating images with Pixaway:', error);
      throw new Error(`Failed to generate images: ${error.message}`);
    }
  }

  /**
   * Mock implementation for development when API key is not available
   * @param prompt The title or prompt to generate images for
   * @param count Number of images to generate
   * @returns Array of mock images
   */
  public async mockGenerateImages(prompt: string, count: number = 3): Promise<PixawayImage[]> {
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
  public async safeGenerateImages(prompt: string, count: number = 3): Promise<{ images: PixawayImage[], fallbackUsed: boolean }> {
    try {
      if (this.hasValidCredentials()) {
        const images = await this.generateImages(prompt, count);
        return { images, fallbackUsed: false };
      } else {
        console.log('Pixaway API key not set, using mock images');
        const images = await this.mockGenerateImages(prompt, count);
        return { images, fallbackUsed: true };
      }
    } catch (error) {
      console.error('Error in Pixaway image generation, falling back to mock images:', error);
      const images = await this.mockGenerateImages(prompt, count);
      return { images, fallbackUsed: true };
    }
  }

  /**
   * Test the connection to Pixaway API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.hasValidCredentials()) {
      return {
        success: false,
        message: 'Pixaway API key not set'
      };
    }

    try {
      // Simple API call to check if credentials are valid
      const response = await axios.get(`${this.apiUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'Connected to Pixaway API successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect to Pixaway API: ${error.message}`
      };
    }
  }
}

// Create and export singleton instance
export const pixawayService = new PixawayService();