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
  contentStyleToneId?: string;
  contentStyleDisplayName?: string;
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
    let toneStyle = request.tone;
    // If content style display name is provided, use it instead of the default tone
    if (request.contentStyleDisplayName) {
      toneStyle = request.contentStyleDisplayName;
      console.log(`Using custom content style: ${request.contentStyleDisplayName} (ID: ${request.contentStyleToneId || 'none'})`);
    }
    
    let promptText = `Generate a well-structured, SEO-optimized blog post about ${request.topic} in a ${toneStyle} tone, ${contentLength}.
    
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
    - Format the introduction paragraph special: Make the first sentence bold with <strong> tags AND add <br> after each sentence in the intro paragraph
    - DO NOT generate content that compares competitor products or prices - focus solely on the features and benefits of our products
    
    IMPORTANT IMAGE AND LINK GUIDELINES:
    - NEVER include direct image URLs or links to external websites like qualitywatertreatment.com, filterwater.com, or any other retailer sites
    - NEVER reference competitor websites or external commercial domains in any links or image sources
    - DO NOT include ANY external links except to trusted reference sites like .gov, .edu, or wikipedia.org
    - DO NOT include external images from third-party domains - the system will automatically insert optimized images
    - All images will be center-aligned and properly linked to product pages
    - Do not include any image placeholders or special markup - the system will handle image insertion automatically
    - Images will be distributed evenly throughout the content at logical section breaks
    - Each image will include a caption with a link back to the relevant product to enhance SEO value
    
    Also suggest 5-7 relevant tags for the post, focusing on SEO value and search intent.`;
    
    // Add custom prompt if provided
    if (request.customPrompt) {
      const customPromptFormatted = request.customPrompt.replace(/\[TOPIC\]/g, request.topic);
      promptText = `${promptText}
      
      IMPORTANT: Follow these specific instructions for the content:
      ${customPromptFormatted}
      
      The content must directly address these instructions while maintaining a ${toneStyle} tone and proper blog structure.`;
    }
    
    // Make API call to Claude with increased token limit for longer content
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      system: request.contentStyleToneId 
        ? `You are a professional content writer who specializes in writing in the ${request.contentStyleDisplayName || toneStyle} style.` 
        : undefined,
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
    
    console.log("Raw Claude response (first 500 chars):", responseText.substring(0, 500) + "...");
    
    // Try different strategies to extract valid JSON from Claude's response
    let jsonContent;
    
    try {
      // Strategy 1: Find the most complete JSON object in the response
      const jsonObjectRegex = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g;
      const jsonMatches = responseText.match(jsonObjectRegex);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Find the longest match, which is likely the complete JSON
        const longestMatch = jsonMatches.reduce((longest, current) => 
          current.length > longest.length ? current : longest, "");
        
        if (longestMatch) {
          console.log("Found JSON object match:", longestMatch.substring(0, 100) + "...");
          jsonContent = JSON.parse(longestMatch);
        }
      }
    } catch (jsonError: any) {
      console.log("Error parsing complete JSON object:", jsonError?.message || "Unknown error");
    }
    
    // Strategy 2: If strategy 1 fails, try to extract JSON by matching braces
    if (!jsonContent) {
      try {
        let braceCount = 0;
        let startIndex = -1;
        let jsonCandidate = "";
        
        // Find the opening brace
        startIndex = responseText.indexOf('{');
        
        if (startIndex >= 0) {
          for (let i = startIndex; i < responseText.length; i++) {
            jsonCandidate += responseText[i];
            
            if (responseText[i] === '{') braceCount++;
            if (responseText[i] === '}') braceCount--;
            
            // When braces are balanced, we've found a complete JSON object
            if (braceCount === 0 && jsonCandidate.length > 2) {
              console.log("Found balanced JSON via brace counting:", jsonCandidate.substring(0, 100) + "...");
              jsonContent = JSON.parse(jsonCandidate);
              break;
            }
          }
        }
      } catch (balancedError: any) {
        console.log("Error parsing balanced braces JSON:", balancedError?.message || "Unknown error");
      }
    }
    
    // Strategy 3: Manual extraction of key fields if JSON parsing fails
    if (!jsonContent) {
      console.log("Attempting manual extraction of content components...");
      
      // Extract title
      const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : "Blog Post";
      
      // Extract content - look for content field followed by a large HTML block
      const contentMatch = responseText.match(/"content"\s*:\s*"([\s\S]+?)(?:"\s*,\s*"|"\s*})/);
      let content = contentMatch ? contentMatch[1] : "";
      
      // Unescape content string
      content = content.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      
      // Extract tags
      const tagsMatch = responseText.match(/"tags"\s*:\s*\[([\s\S]+?)\]/);
      const tagsString = tagsMatch ? tagsMatch[1] : "";
      const tags = tagsString.split(',').map(tag => 
        tag.trim().replace(/^"|"$/g, '')
      ).filter(Boolean);
      
      // Extract meta description
      const metaMatch = responseText.match(/"metaDescription"\s*:\s*"([^"]+)"/);
      const metaDescription = metaMatch ? metaMatch[1] : "";
      
      jsonContent = {
        title,
        content,
        tags,
        metaDescription
      };
    }
    
    if (!jsonContent) {
      throw new Error("Failed to extract content from Claude response using all available methods");
    }
    
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
    console.log("Generating title suggestions with Claude model:", CLAUDE_MODEL);
    
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
    
    console.log("Claude raw response:", responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    // Parse the response based on format
    if (request.responseFormat === 'json') {
      try {
        // Find JSON content - handle any wrapping text Claude might add
        const jsonRegex = /\[[\s\S]*\]/;
        const match = responseText.match(jsonRegex);
        
        if (match) {
          console.log("Found JSON array in Claude response:", match[0]);
          const titles = JSON.parse(match[0]);
          return { titles };
        } else {
          console.log("No JSON array found, trying to parse entire response as JSON");
          // If no JSON array found, try to parse the entire response as JSON
          const jsonResponse = JSON.parse(responseText);
          if (Array.isArray(jsonResponse)) {
            console.log("Response is an array:", jsonResponse);
            return { titles: jsonResponse };
          } else if (jsonResponse.titles && Array.isArray(jsonResponse.titles)) {
            console.log("Response has titles property:", jsonResponse.titles);
            return { titles: jsonResponse.titles };
          } else {
            console.error("Unable to find titles array in JSON response:", jsonResponse);
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