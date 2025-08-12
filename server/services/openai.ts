import OpenAI from "openai";

// Initialize the OpenAI client with API key from environment
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the structure of blog content
export interface BlogContent {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * Generate blog content with a custom prompt
 * @param topic The topic of the blog post
 * @param customPrompt Optional custom prompt template
 * @returns Generated blog content with title and body
 */
export async function generateBlogContent(
  topic: string,
  customPrompt?: string
): Promise<BlogContent> {
  console.log(`Generating blog content for topic: "${topic}" ${customPrompt ? "with custom prompt" : ""}`);
  
  try {
    // Log the OpenAI key status (not the actual key)
    const apiKeyStatus = process.env.OPENAI_API_KEY ? 
      `API key present (starts with: ${process.env.OPENAI_API_KEY.substring(0, 3)}...)` : 
      "API key missing";
    console.log(`OpenAI API status: ${apiKeyStatus}`);
    
    // Create a system prompt based on whether a custom prompt was provided
    let systemPrompt = "";
    
    if (customPrompt) {
      // Replace [TOPIC] placeholder with the actual topic in the custom prompt
      systemPrompt = customPrompt.replace(/\[TOPIC\]/g, topic);
      
      // Add default instructions if they're not in the custom prompt
      if (!systemPrompt.includes("JSON")) {
        systemPrompt += "\n\nRespond with JSON that includes 'title', 'content', and 'tags' fields.";
      }
    } else {
      // Default system prompt
      systemPrompt = `You are a professional blog writer creating a high-quality blog post about "${topic}".
      
Write a well-structured blog post that is informative, engaging, and optimized for SEO.
Include a compelling title, an introduction that hooks the reader, several subheadings with detailed content, and a conclusion.
Make the content approximately 500-800 words, with proper formatting including paragraphs and subheadings.

Respond with JSON that includes the following fields:
- title: A catchy, SEO-friendly title for the blog post
- content: The full blog post content with proper formatting (HTML is acceptable)
- tags: An array of 3-5 relevant tags/keywords for this content`;
    }
    
    console.log("Preparing to call OpenAI API with prompt...");
    
    // Call OpenAI API to generate the content
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    console.log("Calling OpenAI Chat Completions API...");
    
    let userPrompt = "";
    if (customPrompt) {
      // If we have a custom prompt, use a simple user message to avoid conflicting instructions
      userPrompt = `Generate content for "${topic}" using the instructions provided.`;
      console.log("Using custom prompt in system message with simplified user message");
    } else {
      // With the default system prompt, use a more specific user message
      userPrompt = `Write a blog post about "${topic}"`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    console.log("Received response from OpenAI API");
    
    // Parse the response
    const generatedText = response.choices[0].message.content;
    
    if (!generatedText) {
      throw new Error("OpenAI returned empty content");
    }
    
    try {
      // Parse the JSON response
      const blogContent: BlogContent = JSON.parse(generatedText);
      
      // Validate the required fields
      if (!blogContent.title || !blogContent.content) {
        throw new Error("Generated content missing required fields");
      }
      
      // Ensure tags is always an array
      if (!blogContent.tags) {
        blogContent.tags = generateDefaultTags(topic);
      }
      
      return blogContent;
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      console.log("Raw response:", generatedText);
      
      // Handle the case where the response is not valid JSON
      // Create a fallback structure with the raw text
      return {
        title: `Blog Post about ${topic}`,
        content: generatedText,
        tags: generateDefaultTags(topic)
      };
    }
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Rethrow with a more specific error message
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

/**
 * Bulk generate blog content for multiple topics
 * @param topics Array of topics to generate content for
 * @param customPrompt Optional custom prompt template
 * @returns Array of generated blog content
 */
export async function bulkGenerateBlogContent(
  topics: string[],
  customPrompt?: string
): Promise<BlogContent[]> {
  console.log(`Bulk generating content for ${topics.length} topics ${customPrompt ? "with custom prompt" : ""}`);
  
  // Generate content for each topic sequentially
  const results: BlogContent[] = [];
  
  for (const topic of topics) {
    try {
      const content = await generateBlogContent(topic, customPrompt);
      results.push(content);
      
      // Add a short delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error generating content for topic "${topic}":`, error);
      // Continue with the next topic instead of failing the entire batch
    }
  }
  
  return results;
}

/**
 * Generate blog topic suggestions based on a niche or industry
 */
export async function generateTopicSuggestions(
  niche: string,
  count: number = 10
): Promise<string[]> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a blog content strategist. Generate ${count} blog topic ideas for the ${niche} niche. 
          Focus on topics that will drive traffic and engage readers. 
          Create topics that would be helpful for the target audience.
          
          Respond with a JSON array of strings, with each string being a topic idea.`
        },
        { 
          role: "user", 
          content: `Generate ${count} blog topic ideas for the ${niche} niche.` 
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      // Check if the response has a topics array
      if (Array.isArray(parsedResponse.topics)) {
        return parsedResponse.topics;
      }
      
      // If the response is an array directly
      if (Array.isArray(parsedResponse)) {
        return parsedResponse;
      }
      
      // If there's no proper array, extract any string array property
      const firstArrayProperty = Object.values(parsedResponse).find(value => 
        Array.isArray(value) && value.length > 0 && typeof value[0] === 'string'
      );
      
      if (firstArrayProperty) {
        return firstArrayProperty as string[];
      }
      
      throw new Error("Could not find topics array in response");
    } catch (parseError) {
      console.error("Error parsing topic suggestions:", parseError);
      throw new Error("Failed to parse topic suggestions");
    }
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to generate topic suggestions: ${error.message}`);
  }
}

/**
 * Generate dynamic title suggestions using ChatGPT based on keywords and products
 * @param keywords Array of selected keywords
 * @param products Array of selected products
 * @param count Number of titles to generate (default: 12)
 * @param targetAudience Optional target audience
 * @returns Array of dynamic title suggestions
 */
export async function generateDynamicTitles(
  keywords: string[],
  products: any[] = [],
  count: number = 12,
  targetAudience?: string
): Promise<string[]> {
  try {
    console.log(`Generating ${count} dynamic titles with OpenAI using keywords:`, keywords);
    
    // Build context from keywords and products
    const keywordContext = keywords.length > 0 ? keywords.join(', ') : '';
    const productTitles = products.map(p => p.title || p.name).filter(Boolean);
    const productContext = productTitles.length > 0 ? productTitles.join(', ') : '';
    
    // Create a comprehensive prompt for dynamic title generation
    let systemPrompt = `You are an expert SEO content strategist specializing in creating compelling, keyword-optimized blog titles.

Generate ${count} dynamic, engaging blog post titles that:

KEYWORD REQUIREMENTS (MANDATORY):
- EVERY title MUST include at least one of these exact keywords: ${keywordContext}
- Use keywords exactly as provided - do not modify them
- Distribute different keywords across titles for maximum SEO coverage
- Ensure keyword usage feels natural and compelling

${productContext ? `PRODUCT CONTEXT:
- Incorporate these products when relevant: ${productContext}
- Create titles that highlight product benefits, comparisons, or guides
- Focus on how these products solve customer problems

` : ''}${targetAudience ? `TARGET AUDIENCE:
- Create titles that appeal specifically to: ${targetAudience}
- Use language and messaging that resonates with this audience
- Address their specific needs, pain points, and interests

` : ''}TITLE STYLE REQUIREMENTS:
- Mix of formats: "How to", "Best", "Ultimate Guide", "Top X", "Why", "What", etc.
- 50-65 characters for optimal SEO performance
- Evergreen content (no dates, years, or time-specific references)
- Compelling and click-worthy
- Professional but engaging tone
- Include numbers where appropriate (e.g., "7 Best", "10 Ways")

RESPONSE FORMAT:
Return a JSON object with a "titles" array containing exactly ${count} title strings.

Example structure:
{
  "titles": [
    "Title 1 with keyword",
    "Title 2 with different keyword",
    ...
  ]
}`;

    const userPrompt = `Generate ${count} SEO-optimized blog titles using the provided keywords${productContext ? ' and products' : ''}. Every title must include at least one keyword and be compelling for the target audience.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    try {
      const parsedResponse = JSON.parse(content);
      
      if (Array.isArray(parsedResponse.titles)) {
        console.log(`Successfully generated ${parsedResponse.titles.length} dynamic titles`);
        return parsedResponse.titles;
      }
      
      throw new Error("Invalid response format - missing titles array");
    } catch (parseError) {
      console.error("Error parsing title suggestions:", parseError);
      throw new Error("Failed to parse dynamic title suggestions");
    }
  } catch (error: any) {
    console.error("OpenAI API error for dynamic titles:", error);
    throw new Error(`Failed to generate dynamic titles: ${error.message}`);
  }
}

/**
 * Generate default tags based on a topic
 * @param topic The blog post topic
 * @returns Array of default tags
 */
function generateDefaultTags(topic: string): string[] {
  // Convert the topic to tags
  const mainTag = topic.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
  
  // Add some generic tags
  return [mainTag, 'blog', 'article', 'guide'];
}