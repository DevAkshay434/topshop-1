import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate topic suggestions using Anthropic Claude
 */
export async function generateTopicSuggestions(
  keywords: string[],
  contentItems: any[],
  contentType: string
): Promise<any[]> {
  try {
    // Create a system prompt for Claude
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
    
    CRITICAL JSON FORMATTING REQUIREMENTS (TOP PRIORITY):
    - Response MUST be valid, parseable JSON with no markdown formatting
    - DO NOT wrap your JSON in code blocks or backticks
    - DO NOT include any explanatory text before or after the JSON
    - Double-check that all quotes, brackets, and commas are properly placed
    - Use this exact structure with no deviations:
    
    {
      "topics": [
        {
          "title": "Compelling, SEO-friendly title with keyword(s)",
          "description": "Brief explanation of what the article would cover",
          "keywords": ["primary keyword", "secondary keyword"]
        }
      ]
    }
    
    Your entire response should be ONLY the JSON object without any wrapper text or markdown formatting.`;

    // Extract content information for the prompt
    let contentContext = '';
    if (contentItems.length > 0) {
      contentContext = `\n${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Information:\n`;
      contentContext += contentItems.map((item: any) => 
        `- ${item.title}${item.description ? `: ${item.description}` : ''}`
      ).join('\n');
    }

    const userPrompt = `Generate 7-9 topic suggestions optimized for these keywords: ${keywords.join(', ')}. Focus on ${contentType}.
    
    ${contentContext}`;

    console.log('Calling Claude API for topic suggestions...');

    // Call Claude API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      system: systemPrompt,
      max_tokens: 1500,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    // Extract the content from the response
    const content = response.content[0].text;

    if (!content) {
      throw new Error('Empty response from Claude');
    }

    // Handle JSON parsing with multiple fallback strategies
    try {
      // Log the raw content for debugging
      console.log('Raw Claude response (first 200 chars):', content.substring(0, 200));
      
      // Strategy 1: Try to extract JSON from markdown code blocks
      let extractedJson = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          console.log('Found code block, extracting JSON');
          extractedJson = jsonBlockMatch[1].trim();
        } else {
          // If we have ```json markers but couldn't extract properly
          extractedJson = content
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        }
      }
      
      // Strategy 2: If no code blocks, try to find any JSON object
      if (extractedJson === content) {
        const jsonObjectMatch = content.match(/\{\s*"topics"\s*:\s*\[[\s\S]*?\]\s*\}/);
        if (jsonObjectMatch) {
          console.log('Found JSON object pattern');
          extractedJson = jsonObjectMatch[0];
        } else {
          // Try to find any array that might contain our data
          const jsonArrayMatch = content.match(/\[\s*\{\s*"title"[\s\S]*?\}\s*\]/);
          if (jsonArrayMatch) {
            console.log('Found JSON array pattern');
            extractedJson = jsonArrayMatch[0];
            // Wrap in a topics object for consistent handling
            extractedJson = `{"topics": ${extractedJson}}`;
          }
        }
      }
      
      console.log('Cleaned Claude response for parsing (first 100 chars):', extractedJson.substring(0, 100));
      
      // Try to parse the extracted JSON
      try {
        const parsedContent = JSON.parse(extractedJson);
        
        // Check if we have a valid structure
        if (parsedContent.topics && Array.isArray(parsedContent.topics) && parsedContent.topics.length > 0) {
          return parsedContent.topics;
        } else if (Array.isArray(parsedContent) && parsedContent.length > 0 && parsedContent[0].title) {
          return parsedContent;
        }
        
        // Look for any array property that might contain topics
        for (const key in parsedContent) {
          if (Array.isArray(parsedContent[key]) && 
              parsedContent[key].length > 0 && 
              typeof parsedContent[key][0] === 'object' &&
              parsedContent[key][0].title) {
            return parsedContent[key];
          }
        }
      } catch (jsonError) {
        console.log('Failed to parse extracted JSON, trying alternative approach');
      }
      
      // Strategy 3: Manual extraction of topic data as a last resort
      console.log('Attempting manual extraction of topic data');
      const topics = [];
      
      // Look for title patterns like "title": "Some Title" or title: "Some Title"
      const titleMatches = content.matchAll(/"title"\s*:\s*"([^"]+)"/g);
      const descMatches = content.matchAll(/"description"\s*:\s*"([^"]+)"/g);
      
      // Convert iterator to array
      const titles = Array.from(titleMatches, m => m[1]);
      const descriptions = Array.from(descMatches, m => m[1]);
      
      if (titles.length > 0) {
        for (let i = 0; i < titles.length; i++) {
          topics.push({
            title: titles[i],
            description: descriptions[i] || `Article about ${titles[i]}`,
            keywords: []
          });
        }
        
        if (topics.length > 0) {
          console.log(`Manually extracted ${topics.length} topics`);
          return topics;
        }
      }
      
      // If we get here, we couldn't parse the data
      throw new Error('Could not extract valid topic data from Claude response');
    } catch (parseError) {
      console.error('Error processing Claude response:', parseError);
      
      // Last resort: Generate mock topics based on the keywords
      // This should only happen if all other parsing strategies fail
      const fallbackTopics = keywords.slice(0, 5).map((keyword, index) => ({
        id: `emergency-topic-${index}`,
        title: `Guide to ${keyword} (2025)`,
        description: `A comprehensive guide about ${keyword} for the current market.`,
        keywords: [keyword]
      }));
      
      // Only use fallback if requested to do so
      if (process.env.USE_FALLBACK_TOPICS === 'true') {
        console.warn('Using emergency fallback topics due to parsing failure');
        return fallbackTopics;
      }
      
      throw new Error('Failed to parse topic suggestions from Claude');
    }
  } catch (error) {
    console.error('Error generating topic suggestions with Claude:', error);
    throw error;
  }
}