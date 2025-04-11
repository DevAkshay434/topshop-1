import axios from "axios";

// Function to generate content with custom prompt
export async function generateContent(topic: string, customPrompt?: string): Promise<{ title: string; content: string; }> {
  try {
    // Prepare the request data
    const requestData = {
      topic,
      customPrompt
    };

    // Make the API request
    const response = await axios.post("/api/generate-content", requestData);
    
    // Return the generated content
    return response.data;
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content. Please try again later.");
  }
}

// Function to generate multiple content pieces at once
export async function bulkGenerateContent(
  topics: string[], 
  templateId: number, 
  customPrompt?: string
): Promise<Array<{ title: string; content: string; }>> {
  try {
    // Prepare the request data
    const requestData = {
      topics,
      templateId,
      customPrompt
    };

    // Make the API request
    const response = await axios.post("/api/generate-content/bulk", requestData);
    
    // Return the generated content
    return response.data.results;
  } catch (error) {
    console.error("Error bulk generating content:", error);
    throw new Error("Failed to generate content. Please try again later.");
  }
}