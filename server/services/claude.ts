import Anthropic from "@anthropic-ai/sdk";
import { BlogContent, BlogContentRequest } from "@shared/schema";

// Initialize Claude with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude model to use - using Haiku for speed and cost efficiency
const CLAUDE_MODEL = "claude-3-haiku-20240307";

// Types for enhanced responses
interface EnhancedBlogContent extends BlogContent {
  usesFallback?: boolean;
}

// Comprehensive prompt builder
function buildClaudePrompt(request: BlogContentRequest): string {
  // Determine content length based on request
  let contentLength = "approximately 800-1000 words";
  if (request.length.toLowerCase().includes("short")) {
    contentLength = "approximately 500-700 words";
  } else if (request.length.toLowerCase().includes("long")) {
    contentLength = "approximately 1500-2000 words";
  } else if (request.length.toLowerCase().includes("comprehensive")) {
    contentLength = "approximately 2500-3500 words";
  }
  
  console.log(`📏 Article length requested: "${request.length}" -> Content length: "${contentLength}"`);
  
  // Enhanced base prompt for Claude with proper structure
  let toneStyle = request.tone;
  // If content style display name is provided, use it instead of the default tone
  if (request.contentStyleDisplayName) {
    toneStyle = request.contentStyleDisplayName;
    console.log(`Using custom content style: ${request.contentStyleDisplayName} (ID: ${request.contentStyleToneId || 'none'})`);
  }
  
  // Get copywriter persona if available
const copywriterPersona = request.contentStyleDisplayName ? `Write this content in the style of ${request.contentStyleDisplayName}.` : '';

  // Build media context for the prompt
  let mediaContext = '';
  if (request.primaryImage) {
    mediaContext += `\n    SELECTED PRIMARY IMAGE: A high-quality image has been selected as the featured image for this content. This will be automatically positioned as the main visual.`;
  }
  if (request.secondaryImages && request.secondaryImages.length > 0) {
    mediaContext += `\n    SELECTED SECONDARY IMAGES: ${request.secondaryImages.length} additional images have been selected to support the content. These will be automatically placed under H2 headings after the video.`;
  }
  if (request.youtubeEmbed) {
    mediaContext += `\n    SELECTED YOUTUBE VIDEO: A relevant YouTube video has been selected to enhance the content. This will be placed under the first H2 heading.`;
  }

  // Build audience-aware context
  let audienceContext = '';
  if (request.targetAudience || request.buyerPersona) {
    const audience = request.targetAudience || request.buyerPersona;
    audienceContext = `
    
    TARGET AUDIENCE FOCUS: This article is intended for the following audience: ${audience}
    - Write directly to this specific audience
    - Use language, examples, and references that resonate with them
    - Address their specific pain points and interests
    - Consider their level of expertise and adjust complexity accordingly`;
  }

  return `You are a professional content writer creating high-quality, SEO-optimized blog content.
  
  TOPIC: ${request.topic}
  
  REQUIREMENTS:
  - Length: ${contentLength}
  - Tone: ${toneStyle} ${copywriterPersona}
  - Writing Style: Clear, engaging, and informative${audienceContext}${mediaContext}
  
  STRUCTURAL REQUIREMENTS:
  - Create a compelling title (H1)
  - Use clear heading structure (H2, H3 as needed)
  - Include an engaging introduction that hooks the reader
  - Provide valuable, actionable content
  - End with a strong conclusion
  - Write in HTML format with proper tags
  
  SEO REQUIREMENTS:
  - Naturally include relevant keywords for "${request.topic}"
  - Create content that answers common questions about the topic
  - Use semantic HTML structure
  - Include internal linking opportunities where relevant
  
  CONTENT GUIDELINES:
  - Focus on providing genuine value to readers
  - Use examples and practical advice when appropriate
  - Maintain expertise and authority on the subject
  - Ensure content is original and insightful
  - Write for humans first, search engines second
  
  Please generate comprehensive, well-structured HTML content that meets all these requirements.`;
}

// Enhanced content generation function with better error handling and content processing
export async function generateBlogContentWithClaude(request: BlogContentRequest): Promise<BlogContent> {
  try {
    console.log(`🎯 CLAUDE SERVICE STARTED - Generating blog content with Claude for topic: "${request.topic}"`);
    console.log(`🎯 CLAUDE SERVICE - Request length parameter: "${request.length}"`);
    
    // Determine content length based on request
    let contentLength = "approximately 800-1000 words";
    if (request.length.toLowerCase().includes("short")) {
      contentLength = "approximately 500-700 words";
    } else if (request.length.toLowerCase().includes("long")) {
      contentLength = "approximately 1500-2000 words";
    } else if (request.length.toLowerCase().includes("comprehensive")) {
      contentLength = "approximately 2500-3500 words";
    }
    
    console.log(`📏 Article length requested: "${request.length}" -> Content length: "${contentLength}"`);
    
    // Enhanced base prompt for Claude with proper structure
    let toneStyle = request.tone;
    // If content style display name is provided, use it instead of the default tone
    if (request.contentStyleDisplayName) {
      toneStyle = request.contentStyleDisplayName;
      console.log(`Using custom content style: ${request.contentStyleDisplayName} (ID: ${request.contentStyleToneId || 'none'})`);
    }
    
    // Get copywriter persona if available
const copywriterPersona = request.contentStyleDisplayName ? `Write this content in the style of ${request.contentStyleDisplayName}.` : '';

    // Build media context for the prompt
    let mediaContext = '';
    if (request.primaryImage) {
      mediaContext += `\n    SELECTED PRIMARY IMAGE: A high-quality image has been selected as the featured image for this content. This will be automatically positioned as the main visual.`;
    }
    if (request.secondaryImages && request.secondaryImages.length > 0) {
      mediaContext += `\n    SELECTED SECONDARY IMAGES: ${request.secondaryImages.length} additional images have been selected to support the content. These will be automatically placed under H2 headings after the video.`;
    }
    if (request.youtubeEmbed) {
      mediaContext += `\n    SELECTED YOUTUBE VIDEO: A relevant YouTube video has been selected to enhance the content. This will be placed under the first H2 heading.`;
    }

    // Build audience-aware context
    let audienceContext = '';
    if (request.targetAudience || request.buyerPersona) {
      const audience = request.targetAudience || request.buyerPersona;
      audienceContext = `
    
    TARGET AUDIENCE FOCUS: This article is intended for the following audience: ${audience}
    - Write directly to this specific audience
    - Use language, examples, and references that resonate with them
    - Address their specific pain points and interests
    - Consider their level of expertise and adjust complexity accordingly`;
    }

    const prompt = `You are a professional content writer creating high-quality, SEO-optimized blog content.
  
  TOPIC: ${request.topic}
  
  REQUIREMENTS:
  - Length: ${contentLength}
  - Tone: ${toneStyle} ${copywriterPersona}
  - Writing Style: Clear, engaging, and informative${audienceContext}${mediaContext}
  
  STRUCTURAL REQUIREMENTS:
  - Create a compelling title (H1)
  - Use clear heading structure (H2, H3 as needed)
  - Include an engaging introduction that hooks the reader
  - Provide valuable, actionable content
  - End with a strong conclusion
  - Write in HTML format with proper tags
  
  SEO REQUIREMENTS:
  - Naturally include relevant keywords for "${request.topic}"
  - Create content that answers common questions about the topic
  - Use semantic HTML structure
  - Include internal linking opportunities where relevant
  
  CONTENT GUIDELINES:
  - Focus on providing genuine value to readers
  - Use examples and practical advice when appropriate
  - Maintain expertise and authority on the subject
  - Ensure content is original and insightful
  - Write for humans first, search engines second
  
  Please generate comprehensive, well-structured HTML content that meets all these requirements.`;

    console.log(`🚀 CLAUDE SERVICE - Making API call to Claude with model: ${CLAUDE_MODEL}`);
    console.log(`📝 CLAUDE SERVICE - Prompt preview: ${prompt.substring(0, 200)}...`);

    // Make the API call to Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    console.log(`✅ CLAUDE SERVICE - Received response from Claude API`);

    // Extract content from Claude's response
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    if (!content) {
      console.error('❌ CLAUDE SERVICE - No content received from Claude');
      throw new Error('No content generated by Claude');
    }

    console.log(`📊 CLAUDE SERVICE - Generated content length: ${content.length} characters`);

    // Extract title from the generated content
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const generatedTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : request.topic;

    console.log(`📝 CLAUDE SERVICE - Extracted title: "${generatedTitle}"`);

    // Process and clean the content
    const cleanedContent = content
      .replace(/<h1[^>]*>.*?<\/h1>/i, '') // Remove the H1 since we'll use the title separately
      .trim();

    console.log(`✨ CLAUDE SERVICE - Content processing completed successfully`);
    console.log(`🎯 CLAUDE SERVICE COMPLETED - Successfully generated blog content for topic: "${request.topic}"`);

    return {
      title: generatedTitle,
      content: cleanedContent,
      tags: [request.topic.toLowerCase().replace(/\s+/g, '-')]
    };

  } catch (error: any) {
    console.error('❌ CLAUDE SERVICE ERROR - Error generating content with Claude:', error);
    console.log(`🔄 CLAUDE SERVICE - Attempting fallback content generation for topic: "${request.topic}"`);
    
    // Return fallback content instead of throwing
    const fallbackTitle = `Complete Guide to ${request.topic}`;
    const fallbackContent = `
      <h2>Introduction</h2>
      <p>Welcome to our comprehensive guide on ${request.topic}. This topic is important and deserves thorough exploration.</p>
      
      <h2>Understanding ${request.topic}</h2>
      <p>${request.topic} is a significant subject that affects many aspects of our daily lives. In this section, we'll explore the fundamental concepts.</p>
      
      <h2>Key Benefits and Applications</h2>
      <p>The benefits of understanding ${request.topic} are numerous. Here are some key advantages:</p>
      <ul>
        <li>Improved knowledge and understanding</li>
        <li>Better decision-making capabilities</li>
        <li>Enhanced problem-solving skills</li>
      </ul>
      
      <h2>Best Practices</h2>
      <p>When dealing with ${request.topic}, it's important to follow established best practices to ensure success.</p>
      
      <h2>Conclusion</h2>
      <p>In conclusion, ${request.topic} is an important subject that requires careful consideration and understanding. We hope this guide has provided valuable insights.</p>
    `;

    console.log(`📋 CLAUDE SERVICE - Generated fallback content for topic: "${request.topic}"`);

    const result: EnhancedBlogContent = {
      title: fallbackTitle,
      content: fallbackContent,
      tags: [request.topic.toLowerCase().replace(/\s+/g, '-')],
      usesFallback: true
    };

    console.log(`✅ CLAUDE SERVICE COMPLETED (FALLBACK) - Successfully generated fallback content for topic: "${request.topic}"`);
    
    return result;
  }
}

// Function to generate title suggestions using Claude
export async function generateTitles(request: { 
  prompt: string, 
  responseFormat: string,
  targetAudience?: string,
  keywords?: string[],
  keywordData?: any[]
}): Promise<{ titles: string[] }> {
  try {
    console.log("Generating title suggestions with Claude model:", CLAUDE_MODEL);
    
    // Build audience-aware and keyword-optimized prompt
    let enhancedPrompt = request.prompt;
    
    // Add target audience context if provided
    if (request.targetAudience) {
      enhancedPrompt += `\n\nTARGET AUDIENCE FOCUS: These titles must clearly appeal to and engage the following audience: ${request.targetAudience}
      - Use language, tone, and messaging that resonates specifically with this audience
      - Address their pain points, interests, and needs in the titles
      - Ensure titles are compelling and relevant to this audience segment`;
    }
    
    // Add keyword optimization context if provided
    if (request.keywords && request.keywords.length > 0) {
      const keywordList = request.keywords.join(', ');
      enhancedPrompt += `\n\nKEYWORD OPTIMIZATION REQUIREMENTS (MANDATORY): Use these specific keywords in the titles:
      Keywords: ${keywordList}
      
      CRITICAL REQUIREMENT: EVERY SINGLE TITLE MUST include at least one of these provided keywords
      - Each title MUST contain at least one keyword from the provided list
      - DO NOT generate titles without keywords - this is absolutely required
      - DO NOT generate new keywords - only use the provided ones exactly as given
      - Distribute the keywords across all titles to maximize SEO coverage
      - Ensure keyword usage feels natural and engaging while being mandatory
      - Prioritize high-value keywords in title suggestions`;
    }
    
    enhancedPrompt += `\n\nEVERGREEN TITLE REQUIREMENTS:
    - Clear and engaging for the defined audience
    - MUST incorporate keywords - this is mandatory, not optional
    - NO dates, years, months, or time-specific references (create evergreen content)
    - Focus on timeless value and relevancy 
    - Avoid generic or overly promotional language
    - Each title must use at least one provided keyword exactly as given
    - Create titles that remain relevant and valuable over time
    - Focus on benefits, solutions, and guidance rather than trends`;
    
    // Make API call to Claude
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log("Claude title generation response received");

    // Extract titles from the response
    let titles: string[] = [];
    
    if (request.responseFormat === "json") {
      try {
        // Try to parse JSON response
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          titles = Array.isArray(parsed) ? parsed : [];
        }
      } catch (error) {
        console.log("Failed to parse JSON, falling back to line parsing");
        titles = content.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('Here are') && !line.startsWith('I\'ve'))
          .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, ''))
          .filter(title => title.length > 10);
      }
    } else {
      // Parse line-by-line response
      titles = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('Here are') && !line.startsWith('I\'ve'))
        .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-•]\s*/, ''))
        .filter(title => title.length > 10);
    }

    // If we have keywords, validate that each title contains at least one keyword
    if (request.keywords && request.keywords.length > 0) {
      const validatedTitles = titles.filter(title => {
        const containsKeyword = request.keywords!.some(keyword => 
          title.toLowerCase().includes(keyword.toLowerCase())
        );
        if (!containsKeyword) {
          console.warn(`Title "${title}" does not contain any keywords, excluding it`);
        }
        return containsKeyword;
      });
      
      if (validatedTitles.length < titles.length) {
        console.log(`Filtered out ${titles.length - validatedTitles.length} titles without keywords`);
      }
      
      titles = validatedTitles;
    }

    console.log(`Generated ${titles.length} title suggestions successfully`);
    return { titles };
    
  } catch (error) {
    console.error('Error generating titles with Claude:', error);
    // Return fallback titles instead of throwing
    const fallbackTitles = [
      "Complete Guide to Your Topic",
      "Everything You Need to Know About Your Subject",
      "Essential Tips for Success",
      "Best Practices and Strategies"
    ];
    return { titles: fallbackTitles };
  }
}

export async function optimizeMetaData(
  originalMeta: string,
  keywords: string[],
  type: 'title' | 'description',
  articleTitle?: string,
  contentPreview?: string
): Promise<string> {
  try {
    console.log(`Optimizing meta ${type} with Claude:`, originalMeta);
    console.log(`Keywords available:`, keywords);
    console.log(`Article title context:`, articleTitle);
    
    const isTitle = type === 'title';
    const maxLength = isTitle ? 60 : 160;
    const minLength = isTitle ? 30 : 155;
    
    // Build article context
    let articleContext = '';
    if (articleTitle) {
      articleContext = `
        ARTICLE TITLE CONTEXT: The article title is "${articleTitle}"
        - The meta ${type} MUST be highly relevant and complementary to this article title
        - Keep the core message and intent of the original article title
        - Ensure semantic alignment between the article title and meta ${type}`;
    }
    
    if (contentPreview) {
      const previewText = contentPreview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
      articleContext += `
        CONTENT CONTEXT: ${previewText}...
        - Use this content to understand the article's focus and tone`;
    }
    
    // Build keyword context
    const keywordList = keywords.join(', ');
    const keywordInstructions = keywords.length > 0 
      ? `CRITICAL KEYWORD REQUIREMENTS:
        - MUST include at least ${isTitle ? '1-2' : '2-3'} of these keywords: ${keywordList}
        - Use keywords naturally without stuffing
        - Primary keyword should appear early in the ${type}
        - DO NOT generate new keywords - only use provided ones`
      : 'Focus on compelling, SEO-friendly content';
    
    const systemPrompt = isTitle 
      ? `Create an SEO-optimized meta title that enhances the provided title while maintaining its core meaning.
        ${articleContext}
        ${keywordInstructions}
        
        TITLE OPTIMIZATION REQUIREMENTS:
        - Length: ${minLength}-${maxLength} characters (strict limit)
        - MUST stay closely related to the article title "${articleTitle}"
        - Enhance the title with keywords and power words while keeping the same topic
        - Include primary keywords naturally in the beginning when possible
        - Add value indicators: "Guide", "Tips", "How to", "Best", "Complete", etc.
        - Create urgency or curiosity: "Ultimate", "Essential", "Proven", "Expert"
        - Make it more compelling than the original while staying true to the content
        - Target search intent and click-through optimization
        
        Provide ONLY the optimized meta title, nothing else.`
      : `Create an SEO-optimized meta description that accurately summarizes the article content.
        ${articleContext}
        ${keywordInstructions}
        
        DESCRIPTION OPTIMIZATION REQUIREMENTS:
        - Length: ${minLength}-${maxLength} characters (strict limit)
        - Must accurately represent the article content based on the title and preview
        - Include a compelling call-to-action or value proposition
        - Use active voice and engaging language
        - Include 2-3 relevant keywords naturally
        - Focus on benefits and what the reader will learn/gain
        - Make it click-worthy while being informative
        - Avoid keyword stuffing
        
        Provide ONLY the optimized meta description, nothing else.`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      temperature: 0.3, // Lower temperature for more focused optimization
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nOriginal ${type}: "${originalMeta}"`
        }
      ]
    });

    const optimizedMeta = response.content[0].type === 'text' 
      ? response.content[0].text.trim() 
      : originalMeta;

    // Validate length constraints
    if (optimizedMeta.length > maxLength) {
      console.log(`Optimized meta ${type} too long (${optimizedMeta.length}), truncating...`);
      return optimizedMeta.substring(0, maxLength - 3) + '...';
    }
    
    if (optimizedMeta.length < minLength && type === 'description') {
      console.log(`Optimized meta ${type} too short (${optimizedMeta.length}), returning original`);
      return originalMeta;
    }

    console.log(`Successfully optimized meta ${type}: "${optimizedMeta}" (${optimizedMeta.length} chars)`);
    return optimizedMeta;
    
  } catch (error) {
    console.error(`Error optimizing meta ${type} with Claude:`, error);
    return originalMeta; // Return original if optimization fails
  }
}

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

export async function generateClusterTitles(clusterTopic: string, keywords: string[] = [], count: number = 10): Promise<string[]> {
  try {
    console.log(`Generating ${count} cluster titles for topic: "${clusterTopic}"`);
    
    const keywordContext = keywords.length > 0 
      ? `\n\nKeywords to incorporate: ${keywords.join(', ')}`
      : '';
      
    const prompt = `You are an expert SEO content strategist. Generate exactly ${count} unique, compelling article titles that form a comprehensive content cluster around this central topic: "${clusterTopic}"

Requirements:
1. Each title should be unique and cover a different angle/aspect of the main topic
2. Titles should be SEO-friendly and engaging for readers  
3. Include a mix of: beginner guides, advanced strategies, comparisons, case studies, tips, common mistakes, best practices
4. Each title should be 8-15 words long
5. Use actionable language and power words when appropriate
6. Ensure titles complement each other and could be interlinked naturally${keywordContext}

Generate exactly ${count} titles, one per line, without numbers or bullet points:`;

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const titles = content
      .split('\n')
      .map(title => title.trim())
      .filter(title => title.length > 0)
      .slice(0, count); // Ensure we only return the requested count

    console.log(`Generated ${titles.length} cluster titles successfully`);
    return titles;
    
  } catch (error) {
    console.error('Error generating cluster titles with Claude:', error);
    throw error;
  }
}

// Generate related keywords and titles using Claude for topical mapping
export async function generateTopicalMapping(rootKeyword: string): Promise<{
  keywords: Array<{
    keyword: string;
    searchVolume: number | null;
    difficulty: number;
    cpcCents: number | null;
  }>;
  titles: Record<string, Array<{ title: string }>>;
}> {
  try {
    console.log(`Generating topical mapping with Claude for keyword: "${rootKeyword}"`);
    
    const prompt = `You are an SEO and content marketing expert. Generate a topical mapping for the root keyword "${rootKeyword}".

Provide 5 highly relevant long-tail keywords related to "${rootKeyword}" that:
1. Are semantically related and would create good content clusters
2. Have moderate to high search intent
3. Are specific enough to rank for
4. Cover different aspects/angles of the main topic

For each keyword, also generate 8 SEO-optimized blog post titles that:
1. Include the keyword naturally
2. Are engaging and clickable
3. Follow proven title formats (How-to, Lists, Questions, Comparisons, etc.)
4. Are 50-60 characters long for optimal SEO

Format your response as valid JSON:
{
  "keywords": [
    {
      "keyword": "specific long-tail keyword",
      "estimatedSearchVolume": number between 100-5000,
      "estimatedDifficulty": number between 20-80,
      "estimatedCpcCents": number between 50-500
    }
  ],
  "titles": {
    "keyword1": [
      {"title": "SEO optimized title 1"},
      {"title": "SEO optimized title 2"}
    ]
  }
}

Focus on quality over quantity. Make sure all keywords are highly relevant and the titles are genuinely helpful and searchable.`;

    const claudeResponse = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 3000,
      temperature: 0.7,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const responseText = claudeResponse.content[0]?.text || '';
    console.log('Claude topical mapping response received');
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Transform Claude response to match our expected format
      const keywords = parsedResponse.keywords?.map((kw: any) => ({
        keyword: kw.keyword,
        searchVolume: kw.estimatedSearchVolume || null,
        difficulty: kw.estimatedDifficulty || 50,
        cpcCents: kw.estimatedCpcCents || null
      })) || [];
      
      const titles = parsedResponse.titles || {};
      
      console.log(`Claude generated ${keywords.length} keywords with titles`);
      
      return { keywords, titles };
      
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      console.log('Raw response:', responseText);
      
      // Fallback: generate basic keywords
      return generateFallbackTopicalMapping(rootKeyword);
    }
    
  } catch (error: any) {
    console.error('Claude topical mapping error:', error);
    return generateFallbackTopicalMapping(rootKeyword);
  }
}

// Fallback function for topical mapping
function generateFallbackTopicalMapping(rootKeyword: string): {
  keywords: Array<{
    keyword: string;
    searchVolume: number | null;
    difficulty: number;
    cpcCents: number | null;
  }>;
  titles: Record<string, Array<{ title: string }>>;
} {
  console.log(`Generating fallback topical mapping for: "${rootKeyword}"`);
  
  const baseSuggestions = [
    `how to ${rootKeyword}`,
    `${rootKeyword} guide`,
    `best ${rootKeyword}`,
    `${rootKeyword} tips`,
    `${rootKeyword} benefits`
  ];
  
  const keywords = baseSuggestions.map(kw => ({
    keyword: kw,
    searchVolume: Math.floor(Math.random() * 2000) + 500,
    difficulty: Math.floor(Math.random() * 40) + 30,
    cpcCents: Math.floor(Math.random() * 200) + 100
  }));
  
  const titles: Record<string, Array<{ title: string }>> = {};
  
  keywords.forEach(kw => {
    titles[kw.keyword] = [
      { title: `Complete Guide to ${kw.keyword.charAt(0).toUpperCase() + kw.keyword.slice(1)}` },
      { title: `${kw.keyword.charAt(0).toUpperCase() + kw.keyword.slice(1)}: Everything You Need to Know` },
      { title: `5 Essential ${kw.keyword.charAt(0).toUpperCase() + kw.keyword.slice(1)} Strategies` },
      { title: `Why ${kw.keyword.charAt(0).toUpperCase() + kw.keyword.slice(1)} Matters in 2025` }
    ];
  });
  
  return { keywords, titles };
}

