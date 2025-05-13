import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

// Initialize the Anthropic client with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

export interface ContentGenerationOptions {
  toneOfVoice?: string;
  writingPerspective?: string;
  introStyle?: string;
  buyerProfile?: string;
  copywriter?: string;
  style?: string;
  gender?: string;
  faqStyle?: string;
  articleLength?: string;
  numH2s?: number;
  enableTables?: boolean;
  enableLists?: boolean;
  enableCitations?: boolean;
}

export interface ClaudeContentResponse {
  success: boolean;
  message?: string;
  article?: any;
  cluster?: any;
  topics?: any[];
}

/**
 * Generate a single blog post with Claude AI
 */
export async function generateSinglePost(
  topic: string,
  keywords: string[] = [],
  products: any[] = [],
  options: ContentGenerationOptions = {}
): Promise<ClaudeContentResponse> {
  try {
    // Validate the topic
    if (!topic || topic.trim().length === 0) {
      return {
        success: false,
        message: 'A topic is required to generate content'
      };
    }

    // Build product information section
    let productInfo = "";
    if (products && products.length > 0) {
      productInfo = "Information about the products mentioned in this post:\n\n";
      
      products.forEach((product, index) => {
        productInfo += `Product ${index + 1}: ${product.title}\n`;
        if (product.description) productInfo += `Description: ${product.description}\n`;
        if (product.price) productInfo += `Price: ${product.price}\n`;
        productInfo += "\n";
      });
    }

    // Build keywords section
    let keywordsText = "";
    if (keywords && keywords.length > 0) {
      keywordsText = "Keywords to incorporate into the content:\n";
      keywordsText += keywords.join(", ");
      keywordsText += "\n\n";
    }

    // Format options for the prompt
    const optionsText = formatOptionsForPrompt(options);

    // Construct the prompt
    const prompt = `You are an expert SEO content writer creating a high-quality blog post for an online store. 
Your goal is to create engaging, informative content that ranks well in search engines.

# TOPIC
${topic}

# CONTENT REQUIREMENTS
${keywordsText}
${optionsText}
${productInfo}

# OUTPUT FORMAT
Please provide the blog post in the following JSON format:
{
  "title": "Compelling SEO-optimized title",
  "content": "The full HTML content of the blog post",
  "meta_description": "A compelling meta description under 160 characters",
  "estimated_reading_time": "Estimated reading time in minutes",
  "suggested_tags": ["tag1", "tag2", "tag3"]
}

Remember, high-quality content:
1. Has an engaging introduction that hooks the reader
2. Contains well-structured sections with clear H2 and H3 headings
3. Includes useful information and actionable advice
4. Naturally incorporates keywords without keyword stuffing
5. Has a clear call-to-action in the conclusion
6. Uses proper HTML formatting for headings, paragraphs, lists, etc.`;

    // Generate content with Claude
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4000,
      system: "You are an expert SEO content writer helping to create high-quality blog posts for online stores. Your content is detailed, engaging, and optimized for search engines.",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    // Extract JSON content from response
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    let article;
    
    try {
      // Find JSON in the response (sometimes Claude wraps it in code blocks)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/```\n([\s\S]*?)\n```/) || 
                         content.match(/{[\s\S]*?}/);
                         
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : content;
      article = JSON.parse(jsonString);
    } catch (error: any) {
      console.error("Failed to parse JSON from Claude response", error);
      return {
        success: false, 
        message: error?.message || "Failed to parse the generated content"
      };
    }

    return {
      success: true,
      article
    };
  } catch (error: any) {
    console.error("Error generating content with Claude:", error);
    return {
      success: false,
      message: error?.message || "Failed to generate content with Claude AI"
    };
  }
}

/**
 * Generate a content cluster with Claude AI
 */
export async function generateTopicSuggestions(
  keywords: string[] = [],
  products: any[] = [],
  collections: any[] = [],
  contentType: string = 'blog'
): Promise<ClaudeContentResponse> {
  try {
    // Validate inputs
    if (keywords.length === 0 && products.length === 0 && collections.length === 0) {
      return {
        success: false,
        message: 'At least one keyword or product/collection is required'
      };
    }

    // Prepare context for Claude
    let contentContext = '';
    
    if (products.length > 0) {
      contentContext += `\n\nProducts Information:\n`;
      products.forEach((product, index) => {
        contentContext += `${index + 1}. "${product.title}"${product.description ? ': ' + product.description : ''}\n`;
      });
    }
    
    if (collections.length > 0) {
      contentContext += `\n\nCollections Information:\n`;
      collections.forEach((collection, index) => {
        contentContext += `${index + 1}. "${collection.title}"${collection.description ? ': ' + collection.description : ''}\n`;
      });
    }

    // Create the prompt for Claude
    const systemPrompt = `You are a professional SEO content strategist helping a Shopify store owner create engaging, high-quality ${contentType} content. 
    
I need you to generate topic suggestions that are optimized for SEO, engaging to readers, and relevant to the provided keywords and products.

FORMAT YOUR RESPONSE AS A JSON ARRAY with this structure:
[
  {
    "title": "Compelling, SEO-friendly title with keyword(s)",
    "description": "Brief explanation of what the article would cover",
    "keywords": ["primary keyword", "secondary keyword"]
  }
]${contentContext}`;
    
    // Call Claude API for topic suggestions
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Generate 7-9 topic suggestions optimized for these keywords: ${keywords.join(', ')}. Focus on ${contentType} content.` }
      ],
    });

    // Get the text content from Claude's response
    let content = '';
    if (response.content && response.content.length > 0) {
      const block = response.content[0];
      if (block.type === 'text') {
        content = block.text;
      }
    }
    
    if (!content) {
      throw new Error('Empty response from Claude');
    }
    
    // Parse the JSON response
    try {
      // Find JSON in the response (sometimes Claude wraps it in code blocks)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        content.match(/\[([\s\S]*?)\]/);
                        
      let jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : content;
      
      // Additional sanitization for common JSON parsing issues
      // Fix trailing commas in arrays
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
      // Fix any unquoted property names
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Ensure it's a proper array
      if (!jsonString.trim().startsWith('[')) {
        jsonString = '[' + jsonString + ']';
      }
      
      let topics;
      try {
        topics = JSON.parse(jsonString);
      } catch (parseError) {
        console.log("First JSON parse attempt failed for topics, trying alternative approach");
        
        // If direct parsing fails, try to find any array structure
        const arrayMatch = jsonString.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
          const cleanJson = arrayMatch[0];
          topics = JSON.parse(cleanJson);
        } else {
          // If still failing, throw the error to be handled by outer catch
          throw parseError;
        }
      }
      
      return {
        success: true,
        topics: Array.isArray(topics) ? topics : []
      };
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      throw new Error('Failed to parse topic suggestions from Claude');
    }
  } catch (error: any) {
    console.error('Claude API error:', error);
    throw new Error(`Failed to generate topic suggestions: ${error.message}`);
  }
}

export async function generateContentCluster(
  topic: string,
  keywords: string[] = [],
  products: any[] = [],
  options: ContentGenerationOptions = {}
): Promise<ClaudeContentResponse> {
  // Create a fallback cluster in case of JSON parsing issues
  const fallbackCluster = {
    pillar: {
      title: topic,
      meta_description: `A comprehensive guide about ${topic}`,
      content: `<h1>${topic}</h1><p>Content generation is currently having difficulties. Please try again later.</p>`,
      suggested_tags: keywords.slice(0, 3)
    },
    subtopics: Array(3).fill(null).map((_, i) => ({
      title: `${topic} - Aspect ${i+1}`,
      meta_description: `Learn about important aspects of ${topic}`,
      content: `<h1>${topic} - Aspect ${i+1}</h1><p>Content generation is currently having difficulties. Please try again later.</p>`,
      suggested_tags: []
    }))
  };
  try {
    // Validate the topic
    if (!topic || topic.trim().length === 0) {
      return {
        success: false,
        message: 'A topic is required to generate content cluster'
      };
    }

    // Build product information section
    let productInfo = "";
    if (products && products.length > 0) {
      productInfo = "Information about the products related to this topic cluster:\n\n";
      
      products.forEach((product, index) => {
        productInfo += `Product ${index + 1}: ${product.title}\n`;
        if (product.description) productInfo += `Description: ${product.description}\n`;
        if (product.price) productInfo += `Price: ${product.price}\n`;
        productInfo += "\n";
      });
    }

    // Build keywords section
    let keywordsText = "";
    if (keywords && keywords.length > 0) {
      keywordsText = "Keywords to incorporate into the cluster content:\n";
      keywordsText += keywords.join(", ");
      keywordsText += "\n\n";
    }

    // Format options for the prompt
    const optionsText = formatOptionsForPrompt(options);

    // Calculate number of subtopics based on the topic complexity
    const numSubtopics = Math.min(Math.max(3, Math.floor(topic.length / 10)), 7);

    // Construct the prompt
    const prompt = `You are an expert SEO content strategist creating a topic cluster for an online store.

# MAIN TOPIC
${topic}

# CONTENT REQUIREMENTS
${keywordsText}
${optionsText}
${productInfo}

Create a topic cluster with a pillar article and ${numSubtopics} subtopic articles. The pillar article should provide a comprehensive overview of the main topic, while each subtopic article should dive deeper into a specific aspect.

# OUTPUT FORMAT
EXTREMELY IMPORTANT: You MUST return a properly formatted JSON object exactly as specified below.
Do not include any explanatory text, markdown formatting, or other content outside of the JSON structure.

{
  "pillar": {
    "title": "SEO-optimized title for the pillar article",
    "meta_description": "Compelling meta description under 160 characters",
    "content": "Full HTML content of the pillar article",
    "suggested_tags": ["tag1", "tag2", "tag3"]
  },
  "subtopics": [
    {
      "title": "SEO-optimized title for subtopic 1",
      "meta_description": "Compelling meta description for subtopic 1",
      "content": "Full HTML content of subtopic 1 article",
      "suggested_tags": ["tag1", "tag2", "tag3"]
    }
  ]
}

REMEMBER: Your entire response must be valid JSON. No text before or after the JSON object.

Remember that:
1. Each article should have an engaging introduction
2. Use proper HTML formatting with h2 and h3 tags for structure
3. Include internal linking between the pillar and subtopic articles
4. Naturally incorporate keywords without keyword stuffing
5. Each article should have a clear call-to-action`;

    // Generate content with Claude
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 12000,
      temperature: 0.3, // Lower temperature for more structured output
      system: "You are an expert SEO content strategist who ONLY responds with valid JSON. Your output MUST be a single valid JSON object with no other text before or after it. If asked to generate content, always provide it in the exact JSON structure requested.",
      messages: [
        { 
          role: "user", 
          content: prompt
        }
      ],
    });

    // Extract JSON content from response
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    let cluster;
    
    try {
      // Log the raw response for debugging
      console.log('Raw Claude cluster response (first 200 chars):', content.substring(0, 200));
      
      // Find JSON in the response (sometimes Claude wraps it in code blocks)
      let jsonString = '';
      
      // Try to extract JSON from code blocks first
      const jsonBlockMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonString = jsonBlockMatch[1];
        console.log('Extracted JSON from code block');
      } else {
        // Look for JSON object pattern
        const jsonObjectMatch = content.match(/{[\s\S]*}/);
        if (jsonObjectMatch) {
          jsonString = jsonObjectMatch[0];
          console.log('Extracted JSON object pattern');
        } else {
          // Use the full content as a last resort
          jsonString = content;
          console.log('Using full content and attempting to clean');
        }
      }
      
      // Additional sanitization
      jsonString = jsonString.trim();
      // Remove non-standard JSON artifacts that Claude might add
      jsonString = jsonString.replace(/[\u0000-\u001F]+/g, ' ');
      // Fix trailing commas
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
      // Fix missing quotes around property names
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      console.log('Cleaned Claude cluster JSON (first 100 chars):', jsonString.substring(0, 100));
      
      try {
        // Parse the sanitized JSON
        cluster = JSON.parse(jsonString);
      } catch (parseError) {
        console.log('JSON parse error:', parseError);
        
        // Last attempt - use regex to extract just the object structure
        console.log('Attempting to fix JSON syntax errors...');
        const extractJson = jsonString.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
        try {
          cluster = JSON.parse(extractJson);
        } catch (finalError) {
          console.log('Failed to fix JSON syntax:', finalError);
          console.log('Attempting manual extraction of topic data');
          
          // If we still can't parse JSON, use a very basic fallback structure
          console.log('Creating fallback response structure');
          throw new Error('Could not parse JSON from Claude response');
        }
      }
    } catch (error: any) {
      console.error("Failed to parse JSON from Claude response", error);
      
      // Use the fallback cluster instead of returning an error
      console.log("Using fallback cluster due to JSON parsing error");
      cluster = fallbackCluster;
      
      // Return success with the fallback cluster
      return {
        success: true,
        cluster
      };
    }

    return {
      success: true,
      cluster
    };
  } catch (error: any) {
    console.error("Error generating content cluster with Claude:", error);
    
    // Use the fallback cluster instead of returning an error
    console.log("Using fallback cluster due to API error");
    
    // Return success with the fallback cluster
    return {
      success: true,
      cluster: fallbackCluster
    };
  }
}

/**
 * Format the options for the prompt
 */
function formatOptionsForPrompt(options: ContentGenerationOptions): string {
  const {
    toneOfVoice = 'professional',
    writingPerspective = 'third-person',
    introStyle = 'problem-focused',
    buyerProfile = 'general',
    copywriter = 'Expert SEO Content Writer',
    style = 'authoritative',
    gender = 'neutral',
    faqStyle = 'detailed',
    articleLength = 'medium',
    numH2s = 5,
    enableTables = true,
    enableLists = true,
    enableCitations = true
  } = options;

  return `Style and formatting requirements:
- Tone of voice: ${toneOfVoice}
- Writing perspective: ${writingPerspective}
- Introduction style: ${introStyle}
- Target audience: ${buyerProfile}
- Writing style: ${style}
- Gender perspective: ${gender}
- Article length: ${articleLength} (${articleLength === 'short' ? '800-1000 words' : articleLength === 'medium' ? '1200-1500 words' : '1800-2200 words'})
- Include approximately ${numH2s} main sections with H2 headings
${enableTables ? '- Include at least one comparison table where appropriate' : '- Do not include tables'}
${enableLists ? '- Include bulleted or numbered lists where appropriate' : '- Do not include lists'}
${enableCitations ? '- Include citations or references where appropriate' : '- Do not include citations'}
${faqStyle !== 'none' ? `- Include a FAQ section with ${faqStyle === 'brief' ? '3-4 brief' : '5-7 detailed'} questions and answers` : '- Do not include a FAQ section'}
`;
}