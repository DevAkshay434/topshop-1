import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Test the Claude connection by making a simple request
export async function testClaudeConnection(): Promise<boolean> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Hello!' }
      ],
    });
    
    return response.content && response.content.length > 0;
  } catch (error) {
    console.error('Claude connection test failed:', error);
    return false;
  }
}

// Generate blog content using Claude
export async function generateBlogContentWithClaude(
  topic: string, 
  keywords: string[] = [], 
  customPrompt: string = '', 
  productName: string = '', 
  productDescription: string = ''
): Promise<any> {
  try {
    // Build the prompt based on inputs
    let promptText = customPrompt || 
      `Please write a comprehensive blog post about ${topic}.`;
    
    // Add product context if provided
    if (productName) {
      promptText += ` The blog should focus on our product ${productName}.`;
      
      if (productDescription) {
        promptText += ` Product details: ${productDescription}`;
      }
    }
    
    // Add keyword optimization if provided
    if (keywords.length > 0) {
      promptText += ` Please optimize the content for these keywords: ${keywords.join(', ')}.`;
    }
    
    promptText += ' Include a compelling title, meta description, and naturally incorporate the keywords throughout the content.';
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: `You are an expert content writer creating SEO-optimized blog content. 
Your writing should be professional, engaging, and formatted properly with headings and paragraphs.
Generate content with the following structure:
1. Title (compelling, SEO-friendly)
2. Meta description (under 160 characters)
3. Main content with appropriate headings (H2, H3)
4. Include a conclusion section`,
      messages: [
        { role: 'user', content: promptText }
      ],
    });
    
    // Extract the content from Claude's response
    let content = '';
    if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
      content = response.content[0].text;
    }
    
    if (!content) {
      throw new Error('Empty response from Claude');
    }
    
    // Extract title, meta description, and main content
    const titleMatch = content.match(/^#\s*(.*?)\s*$/m) ||
                      content.match(/^(.*?)\s*$/m);
    const metaDescMatch = content.match(/(?:Meta description:|META DESCRIPTION:)\s*(.*?)(?:\n|$)/i);
    
    // Remove title and meta description from the main content
    let mainContent = content;
    if (titleMatch) {
      mainContent = mainContent.replace(titleMatch[0], '').trim();
    }
    if (metaDescMatch) {
      mainContent = mainContent.replace(metaDescMatch[0], '').trim();
    }
    
    return {
      title: titleMatch ? titleMatch[1].trim() : topic,
      metaDescription: metaDescMatch ? metaDescMatch[1].trim() : '',
      content: mainContent,
      rawResponse: content,
    };
  } catch (error) {
    console.error('Error generating content with Claude:', error);
    throw error;
  }
}

export interface ClusterArticle {
  title: string;
  content: string;
  keywords: string[];
}

export interface ClusterTopic {
  mainTopic: string;
  subtopics: ClusterArticle[];
}

export async function generateCluster(
  topic: string,
  productName?: string,
  productDescription?: string,
  keywords?: string[]
): Promise<ClusterTopic> {
  try {
    // Format keywords for the prompt
    const keywordsText = keywords && keywords.length > 0 
      ? `The following keywords should be incorporated into the articles: ${keywords.join(', ')}.` 
      : '';

    // Format product information for the prompt
    const productText = productName 
      ? `Create content focused on the product: ${productName}.${productDescription ? ` Product details: ${productDescription}` : ''}`
      : '';

    // Create the system prompt for Claude
    const systemPrompt = `You are an expert content strategist and SEO specialist. 
Create a comprehensive content cluster on the topic provided, following these guidelines:

1. Generate one main pillar article and 3-4 supporting articles that create a complete content cluster
2. The pillar article should be comprehensive (800-1000 words) and cover the primary topic in detail
3. Support articles should be focused on specific subtopics (500-700 words each)
4. All content should be SEO optimized, factually accurate, and written in a professional tone
5. Each article should include a clear title and well-structured content with appropriate headings
6. Include references to the other articles in the cluster where relevant for internal linking opportunities
${productText ? `\n7. ${productText}` : ''}
${keywordsText ? `\n8. ${keywordsText}` : ''}

Return the response as a JSON object with this structure:
{
  "mainTopic": "The main pillar topic title",
  "subtopics": [
    {
      "title": "Article title",
      "content": "Article content with markdown formatting",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}`;

    // Make the API call to Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Create a content cluster for the topic: "${topic}"`
        }
      ],
    });

    // Extract the JSON response from Claude's output
    let content = '';
    if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
      content = response.content[0].text;
    }
    
    if (!content) {
      throw new Error("Empty response from Claude");
    }
    
    // Find the JSON portion within the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Invalid response format from Claude");
    }
    
    // Parse and validate the cluster data
    const clusterData = JSON.parse(jsonMatch[0]) as ClusterTopic;
    
    // Ensure the response has the correct structure
    if (!clusterData.mainTopic || !Array.isArray(clusterData.subtopics)) {
      throw new Error("Malformed response from Claude");
    }
    
    return clusterData;
    
  } catch (error) {
    console.error("Error generating content cluster with Claude:", error);
    throw error;
  }
}