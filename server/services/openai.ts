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