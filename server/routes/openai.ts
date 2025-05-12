import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = 'gpt-4o';

const router = Router();

// Test OpenAI API connection
router.get('/test-openai', async (_req: Request, res: Response) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: 'Hello!' }],
      max_tokens: 5
    });
    
    if (response.choices && response.choices.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Successfully connected to OpenAI API'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to get a valid response from OpenAI API'
      });
    }
  } catch (error) {
    console.error('Error testing OpenAI connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing OpenAI API connection',
      error: (error as Error).message
    });
  }
});

// Import Anthropic service
import { generateTopicSuggestions as generateAnthropicTopicSuggestions } from '../services/anthropic';

// Generate topic suggestions based on products/collections and keywords
router.post('/topic-suggestions', async (req: Request, res: Response) => {
  try {
    const { products, collections, keywords } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keywords are required for topic suggestions'
      });
    }
    
    // Determine if we're working with products or collections
    const hasProducts = products && Array.isArray(products) && products.length > 0;
    const hasCollections = collections && Array.isArray(collections) && collections.length > 0;
    const contentType = hasProducts ? 'products' : 'collections';
    const contentItems = hasProducts ? products : collections || [];
    
    // Extract content information for the prompt
    let contentContext = '';
    if (contentItems.length > 0) {
      contentContext = `\n${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Information:\n`;
      contentContext += contentItems.map((item: any) => 
        `- ${item.title}${item.description ? `: ${item.description}` : ''}`
      ).join('\n');
    }
    
    console.log(`Generating topic suggestions for keywords: ${keywords.join(', ')} with ${contentItems.length} ${contentType}`);
    
    try {
      // First try with OpenAI
      // Create a system prompt for OpenAI
      const systemPrompt = `You are an expert SEO content strategist specialized in generating engaging blog topic ideas. 
Your task is to create 7-9 highly optimized topic suggestions that would generate traffic and conversions for an e-commerce store.

IMPORTANT INSTRUCTIONS:
- Generate topics that specifically target the provided keywords while incorporating the context of the ${contentType}
- Create a mix of informational, commercial, and problem-solving content ideas
- Include topics at different stages of the buyer's journey (awareness, consideration, decision)
- Each topic should have clear search intent alignment
- Make sure topics are specific enough to be helpful but broad enough to cover thoroughly
- Include the current year (2025) in at least 2-3 of the topics
- Avoid clickbait-style or overly generic topics

FORMAT YOUR RESPONSE AS A JSON ARRAY with this structure:
[
  {
    "title": "Compelling, SEO-friendly title with keyword(s)",
    "description": "Brief explanation of what the article would cover",
    "keywords": ["primary keyword", "secondary keyword"]
  }
]${contentContext}`;
      
      // Call OpenAI API for topic suggestions
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate 7-9 topic suggestions optimized for these keywords: ${keywords.join(', ')}. Focus on ${contentType}.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500
      });
      
      // Extract and process the response
      let content = '';
      if (response.choices && response.choices.length > 0 && response.choices[0].message.content) {
        content = response.choices[0].message.content;
      }
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Parse the JSON response
      try {
        const parsedContent = JSON.parse(content);
        
        // Check if the response has the expected format
        if (Array.isArray(parsedContent.topics) || Array.isArray(parsedContent)) {
          const topics = Array.isArray(parsedContent.topics) ? parsedContent.topics : parsedContent;
          
          return res.status(200).json({
            success: true,
            topics,
            contentType,
            provider: 'openai'
          });
        } else {
          throw new Error('Unexpected response format from OpenAI');
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error('Failed to parse topic suggestions from OpenAI');
      }
    } catch (openaiError) {
      // If OpenAI fails (e.g., quota exceeded), fall back to Anthropic
      console.log(`OpenAI request failed: ${(openaiError as Error).message}. Falling back to Anthropic...`);
      
      try {
        // Use Anthropic Claude as a fallback
        const topics = await generateAnthropicTopicSuggestions(keywords, contentItems, contentType);
        
        return res.status(200).json({
          success: true,
          topics,
          contentType,
          provider: 'anthropic'
        });
      } catch (anthropicError) {
        // If both APIs fail, throw a combined error
        console.error('Error using Anthropic fallback:', anthropicError);
        throw new Error(`OpenAI error: ${(openaiError as Error).message}, Anthropic fallback error: ${(anthropicError as Error).message}`);
      }
    }
  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate topic suggestions',
      error: (error as Error).message
    });
  }
});

export default router;