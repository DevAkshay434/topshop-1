import Anthropic from '@anthropic-ai/sdk';

// Note that the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL_NAME = 'claude-3-7-sonnet-20250219';

/**
 * Generate improved content based on an existing draft
 * @param content The current content draft
 * @param instructions Additional instructions for improving the content
 * @returns Improved content
 */
export async function improveContent(content: string, instructions: string): Promise<string> {
  try {
    // Create a new Anthropic client when the function is called
    // This ensures we always use the latest API key and avoids initializing
    // the client before the API key is available
    const anthropic = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    });
    
    const prompt = `
I need help improving the following content for a blog post. Here's my current draft:

${content}

Please improve this content following these instructions:
${instructions}

Return the full improved content that I can use directly in my blog post.
`;

    const response = await anthropic.messages.create({
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      model: MODEL_NAME,
    });

    // Simple string extraction - we know the Claude API returns text content
    // We're using a simplified approach to avoid TypeScript errors with the SDK
    return response.content[0]?.['text'] || '';
    
  } catch (error) {
    console.error('Error improving content with Claude:', error);
    throw new Error('Failed to improve content with Claude');
  }
}

/**
 * Generate a set of relevant SEO tags for a blog post
 * @param title The blog post title
 * @param content The blog post content
 * @returns A comma-separated list of suggested tags
 */
export async function generateSeoTags(title: string, content: string): Promise<string> {
  try {
    // Create a new Anthropic client when the function is called
    const anthropic = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
    });
    
    const prompt = `
I need to generate 5-7 relevant SEO tags for a blog post. Here's the content:

Title: ${title}

Content (partial):
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Please generate a comma-separated list of relevant, specific tags that would help with SEO for this post. 
Make tags concise (1-3 words each), specific to the topic, and likely to be searched by users.
Return ONLY the comma-separated tags, nothing else.
`;

    const response = await anthropic.messages.create({
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
      model: MODEL_NAME,
    });

    // Simple string extraction
    return response.content[0]?.['text']?.trim() || '';
    
  } catch (error) {
    console.error('Error generating SEO tags with Claude:', error);
    throw new Error('Failed to generate SEO tags with Claude');
  }
}

export default {
  improveContent,
  generateSeoTags
};