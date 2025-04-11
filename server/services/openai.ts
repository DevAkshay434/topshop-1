import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate blog topic suggestions based on a niche or industry
 */
export async function generateTopicSuggestions(
  niche: string,
  count: number = 10
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: 
            "You are a blog content strategist that specializes in generating highly engaging, SEO-optimized blog topics. " +
            "Your suggestions should be specific, actionable, and have clear value for readers. " +
            "Format your response as a JSON array of strings with no additional text."
        },
        {
          role: "user",
          content: `Generate ${count} blog topic ideas related to ${niche}. These should be topics that would help drive traffic, generate leads, and establish thought leadership in this space.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    
    const parsed = JSON.parse(content);
    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error("Invalid response format from OpenAI");
    }
    
    return parsed.topics;
  } catch (error) {
    console.error("Error generating topic suggestions:", error);
    throw error;
  }
}