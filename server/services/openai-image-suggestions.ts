// Integration with OpenAI via OpenRouter API
import openRouterService from './openrouter';

/**
 * Generate image search term suggestions specifically tailored to products
 * @param productDetails Object containing product information
 * @param count Number of suggestions to generate
 * @returns Array of image search terms
 */
export async function generateProductImageSuggestions(
  productDetails: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    type?: string;
  },
  count: number = 5
): Promise<string[]> {
  try {
    console.log(`Generating product-specific image search terms for: "${productDetails.title}"`);
    
    // Extract product information to help guide suggestions
    const productTitle = productDetails.title || '';
    const productDescription = productDetails.description || '';
    const productCategory = productDetails.category || '';
    const productTags = productDetails.tags || [];
    const productType = productDetails.type || '';
    
    // Construct a detailed system prompt that limits to product-relevant suggestions
    const systemPrompt = `You are a product photography expert specializing in e-commerce. 
Your task is to generate ${count} specific, descriptive search terms for finding product photos
that would be perfect to include in a blog post about ${productTitle}.

Focus STRICTLY on terms that would find images showing:
1. The product itself or very similar products
2. The product in use by customers in realistic scenarios
3. Close-ups or detailed views highlighting product features
4. The product in appropriate settings or environments

DO NOT suggest terms for:
- Generic lifestyle scenes unrelated to the product
- Abstract concepts or emotions not directly tied to the product
- Competing products or alternatives
- Any imagery that wouldn't directly feature this specific type of product

The terms should be highly specific and focused on ${productTitle} and its use cases.
Respond ONLY with a JSON array containing your suggestions.`;

    // Using OpenAI via OpenRouter for search tasks
    const response = await openRouterService.createOpenAICompletion({
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: `
Product Title: ${productTitle}
${productDescription ? `Description: ${productDescription}` : ''}
${productCategory ? `Category: ${productCategory}` : ''}
${productTags.length > 0 ? `Tags: ${productTags.join(', ')}` : ''}
${productType ? `Type: ${productType}` : ''}

Generate ${count} specific image search terms for high-quality product photos that would work well in a blog post about this product.` 
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      // Extract suggestions from response - check common property names
      let suggestions: string[] = [];
      
      if (Array.isArray(parsedResponse.suggestions)) {
        suggestions = parsedResponse.suggestions;
      } else if (Array.isArray(parsedResponse.terms)) {
        suggestions = parsedResponse.terms;
      } else if (Array.isArray(parsedResponse.searchTerms)) {
        suggestions = parsedResponse.searchTerms;
      } else if (Array.isArray(parsedResponse.results)) {
        suggestions = parsedResponse.results;
      } else if (Array.isArray(parsedResponse)) {
        suggestions = parsedResponse;
      } else {
        // If no array found, look for any string array property
        const firstArrayProperty = Object.values(parsedResponse).find(value => 
          Array.isArray(value) && value.length > 0 && typeof value[0] === 'string'
        );
        
        if (firstArrayProperty) {
          suggestions = firstArrayProperty as string[];
        }
      }
      
      // Return a fallback if no valid suggestions found
      if (!suggestions || suggestions.length === 0) {
        return [
          `${productTitle} product photo`,
          `${productTitle} in use`,
          `${productTitle} lifestyle`,
          `${productTitle} detailed view`,
          `${productTitle} features`
        ]; 
      }
      
      // Return suggestions, ensuring we have at most the requested count
      return suggestions.slice(0, count);
      
    } catch (parseError) {
      console.error("Error parsing image suggestions:", parseError);
      console.log("Raw response:", content);
      
      // Return fallback suggestions based on product title if parsing fails
      return [
        `${productTitle} product photo`,
        `${productTitle} in use`,
        `${productTitle} lifestyle`,
        `${productTitle} detailed view`,
        `${productTitle} features`
      ];
    }
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
    // Fallback suggestions if the API call fails
    return [
      `${productDetails.title} product photo`,
      `${productDetails.title} in use`,
      `${productDetails.title} lifestyle`,
      `${productDetails.title} detailed view`,
      `${productDetails.title} features`
    ];
  }
}

/**
 * Test the OpenAI connection
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Make a simple API call to test the connection via OpenRouter
    const response = await openRouterService.createOpenAICompletion({
      messages: [
        { role: "user", content: "Hello, is the connection working? Respond with just yes or no." }
      ],
      max_tokens: 5
    });
    
    return {
      success: true,
      message: "OpenAI connection successful"
    };
  } catch (error: any) {
    return {
      success: false,
      message: `OpenAI connection failed: ${error.message}`
    };
  }
}