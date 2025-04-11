import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face inference client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

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

// Using Hugging Face to generate blog content
export async function generateBlogContentWithHF(request: BlogContentRequest): Promise<BlogContent> {
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

    // Create a prompt for the blog generation
    const prompt = `
      Generate a blog post about "${request.topic}" for a Shopify online store.
      The tone should be ${request.tone.toLowerCase()}.
      The post should be ${wordCount} words long.
      
      Format the response as a well-structured, detailed blog post with a catchy title.
      Add HTML formatting such as <h2>, <p>, <ul>, <li> tags as appropriate.
      Include at least one call-to-action to shop related products.
      
      Response format:
      TITLE: [Blog post title]
      
      CONTENT:
      [Blog post content with HTML formatting]
      
      TAGS:
      [tag1, tag2, tag3, tag4, tag5]
    `;

    // Use the Hugging Face model for text generation
    // We'll use meta-llama/Llama-2-70b-chat-hf, a good open model for this task
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2', // Free accessible model
      inputs: prompt,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false,
      }
    });

    // Process the response to extract title, content and tags
    const text = response.generated_text.trim();
    
    // Extract title (between "TITLE:" and "CONTENT:") - avoid 's' flag for compatibility
    const titleMatch = text.match(/TITLE:\s*([\s\S]*?)(?=\s*CONTENT:|$)/);
    const title = titleMatch ? titleMatch[1].trim() : "Generated Blog Post";
    
    // Extract content (between "CONTENT:" and "TAGS:") - avoid 's' flag for compatibility
    const contentMatch = text.match(/CONTENT:\s*([\s\S]*?)(?=\s*TAGS:|$)/);
    const content = contentMatch ? contentMatch[1].trim() : text;
    
    // Extract tags (after "TAGS:") - avoid 's' flag for compatibility
    const tagsMatch = text.match(/TAGS:\s*([\s\S]*?)$/i);
    let tags: string[] = [];
    
    if (tagsMatch && tagsMatch[1]) {
      // Extract tags, handling different formats like comma-separated or bracketed
      tags = tagsMatch[1].trim()
        .replace(/[\[\]]/g, '') // Remove brackets if present
        .split(/,\s*/) // Split on commas
        .filter(tag => tag.trim().length > 0)
        .map(tag => tag.trim());
    }
    
    // If tags extraction failed, generate some default tags from the title
    if (tags.length === 0) {
      tags = ['shopify', 'ecommerce', request.topic.toLowerCase().replace(/\s+/g, '-')];
    }
    
    // If we couldn't properly parse the output, fallback to a simpler approach
    if (!title || !content || title === "Generated Blog Post") {
      // Simple fallback strategy
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      // Assume first line might be the title if we couldn't extract it properly
      const extractedTitle = lines[0].replace(/^#\s*/, '').trim();
      
      return {
        title: extractedTitle || "Blog Post about " + request.topic,
        content: text,
        tags: tags.length ? tags : ['shopify', 'ecommerce', request.topic.toLowerCase().replace(/\s+/g, '-')]
      };
    }

    return {
      title,
      content,
      tags
    };
  } catch (error: any) {
    console.error("Error generating blog content with Hugging Face:", error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'Unknown error during content generation';
    throw new Error(`Failed to generate blog content: ${errorMessage}`);
  }
}