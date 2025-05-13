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
                        
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : content;
      const topics = JSON.parse(jsonString);
      
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
Please provide the content cluster in the following JSON format:
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
    },
    // Repeat for each subtopic
  ]
}

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
      system: "You are an expert SEO content strategist helping to create comprehensive topic clusters for online stores. Your content is detailed, engaging, and optimized for search engines.",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    // Extract JSON content from response
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    let cluster;
    
    try {
      // Find JSON in the response (sometimes Claude wraps it in code blocks)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/```\n([\s\S]*?)\n```/) || 
                         content.match(/{[\s\S]*?}/);
                         
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : content;
      cluster = JSON.parse(jsonString);
    } catch (error: any) {
      console.error("Failed to parse JSON from Claude response", error);
      return {
        success: false, 
        message: error?.message || "Failed to parse the generated content cluster"
      };
    }

    return {
      success: true,
      cluster
    };
  } catch (error: any) {
    console.error("Error generating content cluster with Claude:", error);
    return {
      success: false,
      message: error?.message || "Failed to generate content cluster with Claude AI"
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