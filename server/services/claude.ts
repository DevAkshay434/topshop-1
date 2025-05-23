import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

export interface ContentGenerationRequest {
  title: string;
  productDescription?: string;
  keywords: string[];
  toneOfVoice: string;
  writingPerspective: string;
  articleLength: string;
  enableTables: boolean;
  enableLists: boolean;
  enableH3s: boolean;
  headingsCount: string;
  introType: string;
  enableCitations: boolean;
  faqType: string;
  region: string;
  buyerProfile: string;
}

export interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  suggestedKeywords: string[];
  suggestedTags: string[];
  metaDescription: string;
}

/**
 * Generates blog content using Claude AI
 */
export async function generateBlogContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
  try {
    console.log('Generating content with Claude AI...');
    
    // Build the prompt for Claude
    const prompt = buildContentPrompt(request);
    
    // Call Claude with the generated prompt
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      system: getSystemPrompt(request),
    });
    
    // Extract the response content
    const responseContent = response.content[0].text;
    
    // Parse the response to extract structured content
    const parsedContent = parseClaudeResponse(responseContent);
    
    return {
      title: request.title,
      content: parsedContent.content,
      excerpt: parsedContent.excerpt,
      suggestedKeywords: parsedContent.suggestedKeywords,
      suggestedTags: parsedContent.suggestedTags,
      metaDescription: parsedContent.metaDescription,
    };
  } catch (error) {
    console.error('Error generating content with Claude:', error);
    throw new Error('Failed to generate content with Claude AI');
  }
}

/**
 * Builds the system prompt for Claude
 */
function getSystemPrompt(request: ContentGenerationRequest): string {
  return `You are an expert SEO content writer specializing in e-commerce product blogs.
Your task is to write high-quality, SEO-optimized content for Shopify stores.
Always aim to be helpful, accurate, and engaging to readers while incorporating relevant keywords naturally.
Structure your response with clear HTML formatting that's ready to publish on a Shopify blog.`;
}

/**
 * Builds the content generation prompt based on user parameters
 */
function buildContentPrompt(request: ContentGenerationRequest): string {
  // Map perspective to actual pronouns for instructions
  const perspectiveMap: Record<string, string> = {
    first_person_plural: 'We/Us/Our',
    first_person_singular: 'I/Me/My',
    second_person: 'You/Your',
    third_person: 'They/Them/Their'
  };
  
  // Map article length to word count
  const lengthMap: Record<string, string> = {
    short: '600-800',
    medium: '1000-1500',
    long: '2000-2500'
  };
  
  // Start building the prompt
  let prompt = `Write a comprehensive, SEO-optimized blog post about "${request.title}" for a Shopify store.

PRODUCT CONTEXT:
${request.productDescription || 'No specific product provided'}

WRITING SPECIFICATIONS:
- Use a ${request.toneOfVoice} tone of voice
- Write from the ${perspectiveMap[request.writingPerspective]} perspective
- Target word count: ${lengthMap[request.articleLength]} words
- Use ${request.headingsCount} subheadings (H2 tags)
${request.enableH3s ? '- Include H3 subheadings under main sections' : ''}
${request.enableLists ? '- Include bulleted or numbered lists where appropriate' : ''}
${request.enableTables ? '- Include a comparison table if relevant' : ''}
${request.enableCitations ? '- Include citations and references' : ''}

PRIMARY KEYWORDS TO INCLUDE:
${request.keywords.join(', ')}

ARTICLE STRUCTURE:
1. Engaging introduction ${request.introType === 'search_intent' ? 'addressing search intent' : 'with a hook'} 
2. Clear subheadings for scannable content
3. Relevant product recommendations
4. Benefits and features
5. Practical advice for readers
6. ${request.faqType === 'short' ? 'Short FAQ section (3-4 questions)' : 'Comprehensive FAQ section (5-7 questions)'}
7. Strong conclusion with call-to-action

FORMAT YOUR RESPONSE AS:
1. The complete HTML blog post content with proper formatting
2. A short excerpt (150 characters max)
3. 5-7 suggested additional SEO keywords 
4. 3-5 suggested tags for the blog post
5. Meta description (150-160 characters)

Use proper HTML formatting with <h2>, <h3>, <p>, <ul>, <li>, <table>, <strong> tags etc.
Make sure all HTML is correctly formatted.`;

  return prompt;
}

/**
 * Parses Claude's response to extract structured content
 */
function parseClaudeResponse(responseText: string): {
  content: string;
  excerpt: string;
  suggestedKeywords: string[];
  suggestedTags: string[];
  metaDescription: string;
} {
  // Default values in case parsing fails
  let content = responseText;
  let excerpt = '';
  let suggestedKeywords: string[] = [];
  let suggestedTags: string[] = [];
  let metaDescription = '';
  
  try {
    // Split the response by numbered sections
    const sections = responseText.split(/\d+\.\s/).filter(Boolean);
    
    if (sections.length >= 5) {
      // HTML content is usually the first section
      content = sections[0].trim();
      
      // Excerpt is usually the second section
      excerpt = sections[1].trim();
      
      // Keywords are usually the third section
      const keywordsText = sections[2].trim();
      suggestedKeywords = keywordsText
        .split(/,|\n/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && !k.includes(':'));
      
      // Tags are usually the fourth section
      const tagsText = sections[3].trim();
      suggestedTags = tagsText
        .split(/,|\n/)
        .map(t => t.trim())
        .filter(t => t.length > 0 && !t.includes(':'));
      
      // Meta description is usually the fifth section
      metaDescription = sections[4].trim();
    }
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    // Return the full response as content if parsing fails
  }
  
  return {
    content,
    excerpt,
    suggestedKeywords,
    suggestedTags,
    metaDescription
  };
}

export default {
  generateBlogContent
};