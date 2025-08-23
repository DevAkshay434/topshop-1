// OpenRouter unified API integration for Claude and OpenAI models
import axios from 'axios';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterService {
  private config: OpenRouterConfig;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: OpenRouterConfig) {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  /**
   * Make a chat completion request through OpenRouter
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      console.log(`🔄 OpenRouter API call - Model: ${request.model}, Messages: ${request.messages.length}`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          ...request,
          // Ensure we have generous defaults for comprehensive content generation
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 16000, // Significantly increased for comprehensive content
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.REPLIT_DOMAINS || 'http://localhost:5000',
            'X-Title': 'TopShop SEO Content Generator',
          },
          timeout: 300000, // 5 minute timeout for comprehensive content generation
        }
      );

      console.log(`✅ OpenRouter API success - Model: ${request.model}, Tokens: ${response.data.usage?.total_tokens || 'unknown'}`);
      console.log(`📝 Response content preview:`, response.data.choices?.[0]?.message?.content?.substring(0, 200) || 'No content');
      return response.data;
    } catch (error: any) {
      console.error('❌ OpenRouter API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('OpenRouter API authentication failed. Please check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('OpenRouter API rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 400) {
        throw new Error(`OpenRouter API request error: ${error.response.data?.error?.message || 'Invalid request'}`);
      } else {
        throw new Error(`OpenRouter API error: ${error.message}`);
      }
    }
  }

  /**
   * Create a Claude completion for content generation tasks
   */
  async createClaudeCompletion(request: {
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
  }): Promise<ChatCompletionResponse> {
    // Use Claude 3.7 Sonnet - Latest available model with improved reasoning
    return this.createChatCompletion({
      model: 'anthropic/claude-3.7-sonnet',
      ...request,
    });
  }

  /**
   * Create an OpenAI completion for search and analysis tasks
   */
  async createOpenAICompletion(request: {
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' };
  }): Promise<ChatCompletionResponse> {
    // Use GPT-4o for search and analysis tasks
    return this.createChatCompletion({
      model: 'openai/gpt-4o',
      ...request,
    });
  }
}

// Initialize the OpenRouter service
const openRouterService = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

// Validate API key on initialization
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('⚠️ OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable.');
}

export default openRouterService;
export { OpenRouterService };