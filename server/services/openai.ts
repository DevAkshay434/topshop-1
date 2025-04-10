import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '' 
});

interface BlogContentRequest {
  topic: string;
  tone: string;
  length: string;
}

interface BlogContent {
  title: string;
  content: string;
  tags: string[];
}

export async function generateBlogContent(request: BlogContentRequest): Promise<BlogContent> {
  try {
    // Determine word count based on length preference
    let wordCount = "500-700";
    if (request.length === "Short (300-500 words)") {
      wordCount = "300-500";
    } else if (request.length === "Medium (500-800 words)") {
      wordCount = "500-800";
    } else if (request.length === "Long (800-1200 words)") {
      wordCount = "800-1200";
    }

    const prompt = `
      Generate a blog post about "${request.topic}" for a Shopify online store.
      The tone should be ${request.tone.toLowerCase()}.
      The post should be ${wordCount} words long.
      
      Format the response as a well-structured, detailed blog post with a catchy title.
      Add HTML formatting such as <h2>, <p>, <ul>, <li> tags as appropriate.
      Include at least one call-to-action to shop related products.
      
      Return the result as a JSON object with these fields:
      - title: A catchy, SEO-friendly title for the blog post
      - content: The fully formatted blog post content with HTML tags
      - tags: An array of 3-5 relevant tags for the post
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert content writer specializing in e-commerce and Shopify blog content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      title: result.title,
      content: result.content,
      tags: result.tags
    };
  } catch (error) {
    console.error("Error generating blog content with OpenAI:", error);
    throw new Error(`Failed to generate blog content: ${error.message}`);
  }
}
