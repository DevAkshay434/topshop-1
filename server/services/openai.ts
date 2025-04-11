import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type for blog content response
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
  try {
    // Ensure API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      throw new Error("OpenAI API key is missing");
    }

    // Default prompt if none is provided
    const defaultPrompt = 
      "You are an expert blog writer with deep knowledge in various industries. " +
      "Write a comprehensive, engaging blog post about [TOPIC]. " +
      "The content should be well-structured with clear headings, informative, and SEO-friendly. " +
      "Include practical tips and actionable advice. " +
      "Format your response as a JSON object with 'title' and 'content' fields. " +
      "The content should be in Markdown format with proper headings, lists, and emphasis. " +
      "Keep it around 1000-1500 words.";
    
    // Use custom prompt if provided, replacing [TOPIC] placeholder with the actual topic
    const prompt = customPrompt 
      ? customPrompt.replace(/\[TOPIC\]/g, topic) 
      : defaultPrompt.replace(/\[TOPIC\]/g, topic);
    
    console.log(`Generating content about "${topic}" ${customPrompt ? "with custom prompt" : "with default prompt"}`);
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: `Please write a blog post about "${topic}". Format the response as JSON with "title" and "content" fields.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content received from OpenAI");
      throw new Error("Failed to generate content");
    }
    
    try {
      const parsed = JSON.parse(content);
      if (!parsed.title || !parsed.content) {
        console.error("Invalid response format from OpenAI:", content);
        throw new Error("Invalid response format");
      }
      
      // Extract tags from content if available
      const tags = parsed.tags || [];
      
      return {
        title: parsed.title,
        content: parsed.content,
        tags
      };
    } catch (parseError) {
      console.error("Failed to parse JSON response:", content, parseError);
      throw new Error("Failed to process generated content");
    }
  } catch (error) {
    console.error("Error generating blog content:", error);
    throw error;
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
  const results: BlogContent[] = [];
  
  for (const topic of topics) {
    try {
      const content = await generateBlogContent(topic, customPrompt);
      results.push(content);
    } catch (error) {
      console.error(`Error generating content for topic "${topic}":`, error);
      // Continue with the next topic instead of failing completely
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
    // Ensure API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY environment variable");
      // Return fallback topics instead of throwing error
      return [
        `${niche} Best Practices`,
        `Top 10 ${niche} Trends`,
        `How to Improve Your ${niche} Strategy`,
        `${niche} for Beginners`,
        `Advanced ${niche} Techniques`,
        `The Future of ${niche}`,
        `${niche} Case Studies`,
        `${niche} Tools and Resources`,
        `${niche} vs Traditional Methods`,
        `${niche} ROI Calculation`
      ].slice(0, count);
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 
            "You are a blog content strategist that specializes in generating highly engaging, SEO-optimized blog topics. " +
            "Your suggestions should be specific, actionable, and have clear value for readers. " +
            "Format your response as a JSON object with a 'topics' array of strings with no additional text. Example: {\"topics\": [\"Topic 1\", \"Topic 2\"]}"
        },
        {
          role: "user",
          content: `Generate ${count} blog topic ideas related to ${niche}. These should be topics that would help drive traffic, generate leads, and establish thought leadership in this space.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content received from OpenAI");
      throw new Error("Failed to generate topics");
    }
    
    try {
      const parsed = JSON.parse(content);
      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        console.error("Invalid response format from OpenAI:", content);
        throw new Error("Invalid response format");
      }
      
      return parsed.topics;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", content, parseError);
      throw new Error("Failed to process generated topics");
    }
  } catch (error) {
    console.error("Error generating topic suggestions:", error);
    
    // Return fallback topics instead of throwing error
    return [
      `${niche} Best Practices`,
      `Top 10 ${niche} Trends`,
      `How to Improve Your ${niche} Strategy`,
      `${niche} for Beginners`,
      `Advanced ${niche} Techniques`,
      `The Future of ${niche}`,
      `${niche} Case Studies`,
      `${niche} Tools and Resources`,
      `${niche} vs Traditional Methods`,
      `${niche} ROI Calculation`
    ].slice(0, count);
  }
}