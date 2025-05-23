import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ContentGenerationRequest {
  title: string;
  productDescription?: string;
  keywords?: string[];
  toneOfVoice?: string;
  writingPerspective?: string;
  articleLength?: string;
  headingsCount?: string;
  introType?: string;
  enableLists?: boolean;
  enableTables?: boolean;
  enableH3s?: boolean;
  enableCitations?: boolean;
  faqType?: string;
  region?: string;
  buyerProfile?: string;
}

export interface ContentGenerationResponse {
  title: string;
  content: string;
  excerpt: string;
  suggestedKeywords: string[];
  suggestedTags: string[];
  metaDescription: string;
}

// Helper to determine word count from article length setting
function getWordCountRange(articleLength: string = 'medium'): string {
  switch (articleLength) {
    case 'short':
      return '600-800';
    case 'medium':
      return '1000-1500';
    case 'long':
      return '2000-2500';
    default:
      return '1000-1500';
  }
}

// Helper to determine headings count from setting
function getHeadingsCount(headingsCount: string = '3'): number {
  switch (headingsCount) {
    case '1':
      return 1;
    case '3':
      return 3;
    case '5':
      return 5;
    case '7':
      return 7;
    default:
      return 3;
  }
}

// Build detailed writing instructions based on user preferences
function buildContentInstructions(request: ContentGenerationRequest): string {
  const {
    toneOfVoice = 'friendly',
    writingPerspective = 'first_person_plural',
    articleLength = 'medium',
    headingsCount = '3',
    introType = 'search_intent',
    enableLists = true,
    enableTables = true,
    enableH3s = true,
    enableCitations = true,
    faqType = 'short',
    region = 'us',
    buyerProfile = 'auto'
  } = request;
  
  const wordCount = getWordCountRange(articleLength);
  const numHeadings = getHeadingsCount(headingsCount);
  
  // Perspective formatting
  let perspectiveText = 'we/us/our';
  if (writingPerspective === 'first_person_singular') {
    perspectiveText = 'I/me/my';
  } else if (writingPerspective === 'second_person') {
    perspectiveText = 'you/your';
  } else if (writingPerspective === 'third_person') {
    perspectiveText = 'they/them/their';
  }
  
  // Region-specific formatting
  let regionText = 'the United States';
  if (region === 'ca') {
    regionText = 'Canada';
  } else if (region === 'uk') {
    regionText = 'the United Kingdom';
  } else if (region === 'au') {
    regionText = 'Australia';
  }
  
  let instructions = `
Write a SEO-optimized blog post about "${request.title}"`;

  if (request.productDescription) {
    instructions += ` related to the following product: "${request.productDescription}"`;
  }

  instructions += `

WRITING INSTRUCTIONS:
- Use a ${toneOfVoice} tone
- Write from the ${writingPerspective} perspective (${perspectiveText})
- Create a ${wordCount} word article
- Include ${numHeadings} H2 headings (plus an introduction and conclusion)
${enableH3s ? '- Include H3 subheadings under each main H2 heading' : '- Do not use H3 subheadings'}
- Create an introduction that ${introType === 'search_intent' ? 'addresses search intent and explains what the reader will learn' : 'tells a story to hook the reader'}
${enableLists ? '- Include at least 2 bulleted or numbered lists' : '- Do not use lists'}
${enableTables ? '- Include at least 1 table where appropriate' : '- Do not use tables'}
${enableCitations ? '- Include in-content citations to authoritative sources' : '- Do not include citations'}
- Create a ${faqType === 'short' ? 'short FAQ section with 3 questions' : 'detailed FAQ section with 5-7 questions'} at the end
- Optimize for readers in ${regionText}
${buyerProfile !== 'auto' ? `- Target a buyer profile that is: ${buyerProfile}` : '- Target a general audience'}`;

  if (request.keywords && request.keywords.length > 0) {
    instructions += `\n- Include these keywords naturally throughout the content: ${request.keywords.join(', ')}`;
  }

  instructions += `\n
OUTPUT FORMAT:
- Return well-formatted HTML content using semantic tags
- Use <h2> for main headings and <h3> for subheadings if applicable
- Use <p> for paragraphs
- Use <ul> and <li> for unordered lists
- Use <ol> and <li> for ordered lists
- Use <table>, <tr>, <th>, and <td> for tables if applicable
- Use <blockquote> for quotes or testimonials
- Include a meta description of approximately 155 characters that would appear in search results
- Include 5-7 suggested tags for the article

Present the blog post content in valid HTML format, organized with proper headings and structure.`;

  return instructions;
}

// Main function to generate content with Claude
export async function generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
  try {
    console.log('Generating content with Claude for:', request.title);
    
    const contentInstructions = buildContentInstructions(request);
    
    // Create the system prompt for Claude
    const systemPrompt = `You are an expert SEO content writer for e-commerce. Your task is to write high-quality, engaging, and SEO-optimized content. Follow the writing instructions exactly and use the output format specified.`;
    
    // Make the API call to Claude
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", // Most advanced Claude model
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { 
          role: "user", 
          content: contentInstructions 
        }
      ],
    });

    // Process the response text
    const responseText = response.content[0].text;
    
    // Extract the different parts - This is a simple implementation and might need refinement
    // Parse HTML content, meta description, and tags from the response
    let content = responseText;
    let metaDescription = '';
    let suggestedTags: string[] = [];
    
    // Extract meta description if included
    const metaDescMatch = responseText.match(/Meta Description:[\s\n]*(.*?)[\s\n]*(\n|$)/i);
    if (metaDescMatch && metaDescMatch[1]) {
      metaDescription = metaDescMatch[1].trim();
      // Remove the meta description part from the content
      content = content.replace(/Meta Description:[\s\n]*(.*?)[\s\n]*(\n|$)/i, '');
    }
    
    // Extract suggested tags if included
    const tagsMatch = responseText.match(/Suggested Tags:[\s\n]*(.*?)[\s\n]*(\n|$)/i);
    if (tagsMatch && tagsMatch[1]) {
      suggestedTags = tagsMatch[1].split(',').map(tag => tag.trim());
      // Remove the tags part from the content
      content = content.replace(/Suggested Tags:[\s\n]*(.*?)[\s\n]*(\n|$)/i, '');
    }
    
    // Create a short excerpt from the beginning of the content (first paragraph)
    // Remove HTML tags for excerpt
    const textContent = content.replace(/<[^>]*>/g, '');
    const firstParagraphMatch = textContent.match(/^(.*?[.!?])\s/);
    const excerpt = firstParagraphMatch 
      ? firstParagraphMatch[1].substring(0, 155) + (firstParagraphMatch[1].length > 155 ? '...' : '') 
      : textContent.substring(0, 155) + (textContent.length > 155 ? '...' : '');
    
    // Generate keyword suggestions based on the content
    const words = textContent.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    const wordFrequency: Record<string, number> = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    // Sort words by frequency and get top 10 as keyword suggestions
    const suggestedKeywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return {
      title: request.title,
      content,
      excerpt,
      suggestedKeywords,
      suggestedTags: suggestedTags.length > 0 ? suggestedTags : suggestedKeywords.slice(0, 5),
      metaDescription: metaDescription || excerpt
    };
  } catch (error) {
    console.error('Error generating content with Claude:', error);
    throw new Error(`Failed to generate content: ${error.message || 'Unknown error'}`);
  }
}

// Image prompt generation for related images
export async function generateImagePrompt(title: string, productDescription?: string): Promise<string> {
  try {
    const prompt = `Given the blog post title "${title}"${productDescription ? ` about this product: "${productDescription}"` : ''}, create a detailed and specific image prompt that will help generate a compelling featured image for this blog post. The prompt should describe a real-world scene related to the topic that would make an engaging header image.`;
    
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 300,
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    return response.content[0].text.trim();
  } catch (error) {
    console.error('Error generating image prompt:', error);
    return `Professional high-quality image related to ${title}`;
  }
}

// Content analysis to suggest improvements
export async function analyzeContent(content: string): Promise<string> {
  try {
    const prompt = `Analyze this blog post content for SEO optimization and readability. Provide 3-5 specific suggestions for improvement.

Content to analyze:
${content.substring(0, 8000)}`;  // Limiting input size

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 500,
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    return response.content[0].text.trim();
  } catch (error) {
    console.error('Error analyzing content:', error);
    return "Unable to analyze content at this time.";
  }
}

export default {
  generateContent,
  generateImagePrompt,
  analyzeContent
};