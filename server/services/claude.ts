// Integration with Anthropic's Claude API
import Anthropic from '@anthropic-ai/sdk';

interface BlogContentRequest {
  topic: string;
  tone: string;
  length: string;
  customPrompt?: string;
}

interface BlogContent {
  title: string;
  content: string;
  tags: string[];
}

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Function to generate blog content using Claude
export async function generateBlogContentWithClaude(request: BlogContentRequest): Promise<BlogContent> {
  try {
    console.log(`Generating blog content with Claude for topic: "${request.topic}"`);
    
    // Determine content length based on request
    let contentLength = "approximately 700-900 words";
    if (request.length.toLowerCase().includes("short")) {
      contentLength = "approximately 400-600 words";
    } else if (request.length.toLowerCase().includes("long")) {
      contentLength = "approximately 1200-1500 words";
    }
    
    // Base prompt for Claude
    let promptText = `Generate a well-structured, engaging blog post about ${request.topic} in a ${request.tone} tone, ${contentLength}.
    
    The blog post should include:
    1. A compelling title
    2. Clear section headings
    3. Well-organized paragraphs
    4. HTML formatting (h1, h2, p, ul, li, etc.)
    5. A conclusion with a call to action
    
    Also suggest 5-7 relevant tags for the post, focusing on SEO value.`;
    
    // Add custom prompt if provided
    if (request.customPrompt) {
      const customPromptFormatted = request.customPrompt.replace(/\[TOPIC\]/g, request.topic);
      promptText = `${promptText}
      
      IMPORTANT: Follow these specific instructions for the content:
      ${customPromptFormatted}
      
      The content must directly address these instructions while maintaining a ${request.tone} tone and proper blog structure.`;
    }
    
    // Make API call to Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `${promptText}
          
          IMPORTANT: Return the response in JSON format with the following structure:
          {
            "title": "The title of the blog post",
            "content": "The complete HTML content of the blog post",
            "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
          }
          
          Ensure the content is properly formatted with HTML tags. Do not include explanation of your process, just return the JSON.`
        }
      ],
    });
    
    // Extract and parse the JSON response
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
    
    // Find JSON content - handle any wrapping text Claude might add
    const jsonRegex = /\{[\s\S]*\}/;
    const match = responseText.match(jsonRegex);
    
    if (!match) {
      throw new Error("Failed to parse JSON from Claude response");
    }
    
    const jsonContent = JSON.parse(match[0]);
    
    return {
      title: jsonContent.title,
      content: jsonContent.content,
      tags: jsonContent.tags
    };
  } catch (error: any) {
    console.error("Error generating content with Claude:", error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'Unknown error during Claude content generation';
    throw new Error(`Failed to generate content with Claude: ${errorMessage}`);
  }
}

// Test function to check if Claude API is working
export async function testClaudeConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Hello, please respond with "Claude API is connected successfully!" if you receive this message.'
        }
      ],
    });
    
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
      
    return {
      success: true,
      message: responseText.trim()
    };
  } catch (error: any) {
    console.error("Claude connection test failed:", error);
    return {
      success: false,
      message: error.message || "Failed to connect to Claude API"
    };
  }
}