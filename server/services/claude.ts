// Integration with Anthropic's Claude API
import Anthropic from '@anthropic-ai/sdk';

interface BlogContentRequest {
  topic: string;
  tone: string;
  length: string;
  customPrompt?: string;
  systemPrompt?: string;
  includeProducts?: boolean;
  includeCollections?: boolean;
  includeKeywords?: boolean;
}

interface BlogContent {
  title: string;
  content: string;
  tags: string[];
  metaDescription: string;
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
    let contentLength = "approximately 800-1000 words";
    if (request.length.toLowerCase().includes("short")) {
      contentLength = "approximately 500-700 words";
    } else if (request.length.toLowerCase().includes("long")) {
      contentLength = "approximately 1500-2000 words";
    }
    
    // Enhanced base prompt for Claude with proper structure
    let promptText = `Generate a well-structured, SEO-optimized blog post about ${request.topic} in a ${request.tone} tone, ${contentLength}.
    
    The blog post MUST follow this exact structure:
    1. A compelling title that includes the main topic and primary keywords
    2. Multiple clearly defined sections with H2 headings that incorporate important keywords
    3. Appropriate H3 subheadings within each section where needed
    4. Well-organized paragraphs (2-4 paragraphs per section)
    5. Proper HTML formatting throughout (h2, h3, p, ul, li, etc.)
    6. Lists and tables where appropriate to improve readability
    7. A conclusion with a clear call to action
    
    IMPORTANT FORMATTING REQUIREMENTS:
    - Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <table>, etc.
    - DO NOT use <h1> tags, as this will be the post title
    - Make sure sections flow logically and coherently
    - Include all specified keywords naturally throughout the content (especially in headings and early paragraphs)
    - Include a meta description of 155-160 characters that includes at least 2 primary keywords
    
    Also suggest 5-7 relevant tags for the post, focusing on SEO value and search intent.`;
    
    // Add custom prompt if provided
    if (request.customPrompt) {
      const customPromptFormatted = request.customPrompt.replace(/\[TOPIC\]/g, request.topic);
      promptText = `${promptText}
      
      IMPORTANT: Follow these specific instructions for the content:
      ${customPromptFormatted}
      
      The content must directly address these instructions while maintaining a ${request.tone} tone and proper blog structure.`;
    }
    
    // Make API call to Claude with increased token limit for longer content
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `${promptText}
          
          IMPORTANT: Return the response in JSON format with the following structure:
          {
            "title": "The title of the blog post",
            "content": "The complete HTML content of the blog post",
            "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
            "metaDescription": "A compelling meta description of 155-160 characters that summarizes the content with keywords"
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
      tags: jsonContent.tags,
      metaDescription: jsonContent.metaDescription || ''
    };
  } catch (error: any) {
    console.error("Error generating content with Claude:", error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'Unknown error during Claude content generation';
    throw new Error(`Failed to generate content with Claude: ${errorMessage}`);
  }
}

// Function to generate title suggestions using Claude
export async function generateTitles(request: { prompt: string, responseFormat: string }): Promise<{ titles: string[] }> {
  try {
    console.log("Generating title suggestions with Claude");
    
    // Make API call to Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
    });
    
    // Extract response text
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
    
    // Parse the response based on format
    if (request.responseFormat === 'json') {
      try {
        // Find JSON content - handle any wrapping text Claude might add
        const jsonRegex = /\[[\s\S]*\]/;
        const match = responseText.match(jsonRegex);
        
        if (match) {
          const titles = JSON.parse(match[0]);
          return { titles };
        } else {
          // If no JSON array found, try to parse the entire response as JSON
          const jsonResponse = JSON.parse(responseText);
          if (Array.isArray(jsonResponse)) {
            return { titles: jsonResponse };
          } else if (jsonResponse.titles && Array.isArray(jsonResponse.titles)) {
            return { titles: jsonResponse.titles };
          }
        }
      } catch (parseError) {
        console.error("Error parsing JSON from Claude response:", parseError);
        // Fall back to extracting titles from text
      }
    }
    
    // If parsing fails or format is not JSON, extract titles from text
    // Look for numbered lines, bullet points, or line breaks
    const lines = responseText.split(/[\n\r]+/);
    const titleCandidates = lines.filter(line => 
      line.trim().length > 10 && // Minimum reasonable title length
      !line.includes("Here are") && // Skip intro lines
      !line.includes("suggestions") &&
      !line.includes("titles") &&
      (
        /^\d+[\.\)]\s+/.test(line.trim()) || // numbered items
        /^[-*•]\s+/.test(line.trim()) || // bullet points
        /^["'].*["']$/.test(line.trim()) // quoted text
      )
    );
    
    // Clean up the titles
    const titles = titleCandidates.map(title => 
      title.replace(/^\d+[\.\)]\s+|^[-*•]\s+|^["']|["']$/g, '').trim()
    ).filter(title => title.length > 0);
    
    // Return at least some titles
    if (titles.length === 0) {
      // If we couldn't extract any titles, just return 5 lines that look like titles
      return { 
        titles: lines
          .filter(line => line.trim().length > 15 && line.trim().length < 100)
          .slice(0, 5)
          .map(line => line.trim())
      };
    }
    
    return { titles };
  } catch (error: any) {
    console.error("Error generating titles with Claude:", error);
    throw new Error(`Failed to generate titles with Claude: ${error.message || 'Unknown error'}`);
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