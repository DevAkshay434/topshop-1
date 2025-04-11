import { apiRequest } from "@lib/queryClient";

/**
 * Generate content for a topic with optional custom prompt
 * @param topic The topic to generate content for
 * @param customPrompt Optional custom prompt for AI generation
 * @returns The generated content with title, content and tags
 */
export async function generateContent(
  topic: string, 
  customPrompt?: string
): Promise<{ title: string; content: string; tags?: string[]; }> {
  const response = await apiRequest({
    url: "/generate-content",
    method: "POST",
    data: { 
      topic,
      customPrompt
    }
  });
  
  if (!response.success) {
    throw new Error(response.error || "Failed to generate content");
  }
  
  return {
    title: response.title,
    content: response.content,
    tags: response.tags
  };
}

/**
 * Bulk generate content for multiple topics
 * @param topics Array of topics to generate content for
 * @param templateId Optional template ID to use for generation
 * @param customPrompt Optional custom prompt for AI generation
 * @returns Information about the generated posts
 */
export async function bulkGenerateContent(
  topics: string[],
  templateId?: number,
  customPrompt?: string
): Promise<{ 
  success: boolean;
  generatedCount: number;
  createdCount: number;
  posts: any[];
}> {
  const response = await apiRequest({
    url: "/generate-content/bulk",
    method: "POST",
    data: { 
      topics,
      templateId,
      customPrompt
    }
  });
  
  if (!response.success) {
    throw new Error(response.error || "Failed to bulk generate content");
  }
  
  return {
    success: response.success,
    generatedCount: response.generatedCount,
    createdCount: response.createdCount,
    posts: response.posts
  };
}

/**
 * Get topic suggestions for a niche
 * @param niche The niche/industry to get topic suggestions for
 * @param count Number of suggestions to get
 * @returns Array of topic suggestions
 */
export async function getTopicSuggestions(
  niche: string,
  count: number = 10
): Promise<string[]> {
  const response = await apiRequest({
    url: "/topic-suggestions",
    method: "GET",
    params: {
      niche,
      count
    }
  });
  
  if (!response.topics) {
    throw new Error("Failed to get topic suggestions");
  }
  
  return response.topics;
}