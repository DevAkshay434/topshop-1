import Anthropic from "@anthropic-ai/sdk";
import { optimizeMetaData } from "./claude";

// Initialize Claude with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Claude model to use - using Haiku for speed and cost efficiency
const CLAUDE_MODEL = "claude-3-haiku-20240307";

// Bulk content generation request interface
interface BulkContentRequest {
  topic: string;
  length: string;
  tone: string;
  contentStyleDisplayName?: string;
  contentStyleToneId?: string;
  primaryImage?: {
    url: string;
    alt: string;
    shopifyId?: string;
  };
  secondaryImages?: Array<{
    url: string;
    alt: string;
    shopifyId?: string;
  }>;
  youtubeEmbed?: string;
  targetAudience?: string;
  buyerPersona?: string;
  selectedProducts?: Array<{
    id: string;
    title: string;
    handle: string;
    url: string;
    imageUrl?: string;
  }>;
  selectedCollections?: Array<{
    id: string;
    title: string;
    handle: string;
    url: string;
  }>;
  keywords?: string[];
  customPrompt?: string;
  articleType?: string;
  headingsCount?: string;
  writingPerspective?: string;
  introType?: string;
  faqType?: string;
  enableTables?: boolean;
  enableLists?: boolean;
  enableH3s?: boolean;
  enableCitations?: boolean;
  // Author attribution (matching AdminPanel functionality)
  authorId?: string;
  author?: {
    id: string;
    name: string;
    description?: string;
    profileImage?: string;
    linkedinUrl?: string;
  };
}

// Bulk content result
interface BulkContentResult {
  title: string;
  content: string;
  tags: string[];
  usesFallback?: boolean;
  // Meta optimization (matching AdminPanel functionality)
  metaTitle?: string;
  metaDescription?: string;
}

// Build enhanced prompt for bulk generation with media and product context
function buildBulkClaudePrompt(request: BulkContentRequest): string {
  // Determine content length based on request
  let contentLength = "approximately 800-1000 words";
  if (request.length?.toLowerCase().includes("short")) {
    contentLength = "approximately 500-700 words";
  } else if (request.length?.toLowerCase().includes("long")) {
    contentLength = "approximately 1500-2000 words";
  } else if (request.length?.toLowerCase().includes("comprehensive")) {
    contentLength = "approximately 2500-3500 words";
  }
  
  console.log(`📏 Bulk article length requested: "${request.length}" -> Content length: "${contentLength}"`);
  
  // Enhanced tone and style
  let toneStyle = request.tone || "professional";
  if (request.contentStyleDisplayName) {
    toneStyle = request.contentStyleDisplayName;
    console.log(`Using custom content style for bulk: ${request.contentStyleDisplayName} (ID: ${request.contentStyleToneId || 'none'})`);
  }
  
  const copywriterPersona = request.contentStyleDisplayName ? `Write this content in the style of ${request.contentStyleDisplayName}.` : '';

  // Build comprehensive media context for the prompt
  let mediaContext = '';
  if (request.primaryImage) {
    mediaContext += `\n    SELECTED PRIMARY IMAGE: A high-quality image has been selected as the featured image for this content. This will be automatically positioned as the main visual at the top of the article.`;
  }
  
  if (request.secondaryImages && request.secondaryImages.length > 0) {
    mediaContext += `\n    SELECTED SECONDARY IMAGES: ${request.secondaryImages.length} additional images have been selected to support the content. These will be automatically placed under H2 headings after any video content.`;
    
    // Add product linking context if we have products
    if (request.selectedProducts && request.selectedProducts.length > 0) {
      mediaContext += `\n    PRODUCT INTEGRATION: Secondary images will be linked to relevant products from the store. When writing content, naturally reference and mention the products that relate to the topic.`;
    }
  }
  
  if (request.youtubeEmbed) {
    mediaContext += `\n    SELECTED YOUTUBE VIDEO: A relevant YouTube video has been selected to enhance the content. This will be placed under the first H2 heading to provide visual engagement early in the article.`;
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

  // Build product context for natural integration
  let productContext = '';
  if (request.selectedProducts && request.selectedProducts.length > 0) {
    const productTitles = request.selectedProducts.map(p => p.title).join(', ');
    productContext = `
    
    PRODUCT INTEGRATION CONTEXT: Naturally incorporate references to these relevant products: ${productTitles}
    - Mention products naturally within the content where they add value
    - Don't force product mentions - only include where genuinely relevant
    - Use product names naturally in context
    - Focus on how products solve problems or enhance the topic being discussed`;
  }

  // Build collection context
  let collectionContext = '';
  if (request.selectedCollections && request.selectedCollections.length > 0) {
    const collectionTitles = request.selectedCollections.map(c => c.title).join(', ');
    collectionContext = `
    
    COLLECTION CONTEXT: Reference these relevant product collections when appropriate: ${collectionTitles}
    - Mention collections naturally when discussing related product categories
    - Use collections to organize product recommendations
    - Focus on the value and variety within each collection`;
  }

  // Build keyword context
  let keywordContext = '';
  if (request.keywords && request.keywords.length > 0) {
    const keywordList = request.keywords.join(', ');
    keywordContext = `
    
    KEYWORD OPTIMIZATION: Naturally incorporate these keywords throughout the content: ${keywordList}
    - Use keywords naturally in headings and throughout the text
    - Prioritize primary keywords in the introduction and conclusion
    - Avoid keyword stuffing - focus on natural, valuable content
    - Use semantic variations and related terms`;
  }

  // Build structural preferences
  let structuralContext = '';
  if (request.headingsCount) {
    const headingCount = parseInt(request.headingsCount) || 3;
    structuralContext += `\n    HEADING STRUCTURE: Use approximately ${headingCount} main H2 sections to organize the content effectively.`;
  }
  
  if (request.enableTables) {
    structuralContext += `\n    TABLES: Include comparison tables or data tables where they add value to the content.`;
  }
  
  if (request.enableLists) {
    structuralContext += `\n    LISTS: Use bullet points and numbered lists to organize information clearly.`;
  }
  
  if (request.enableH3s) {
    structuralContext += `\n    SUBHEADINGS: Use H3 tags for subsections within major topics.`;
  }

  // Handle custom prompt integration
  let customPromptContext = '';
  if (request.customPrompt) {
    customPromptContext = `
    
    CUSTOM REQUIREMENTS: ${request.customPrompt}
    - Follow these specific instructions while maintaining the overall content quality
    - Integrate custom requirements naturally with the content structure`;
  }

  return `You are a professional content writer creating high-quality, SEO-optimized ${request.articleType || 'blog'} content for an e-commerce store.
  
  TOPIC: ${request.topic}
  
  REQUIREMENTS:
  - Length: ${contentLength}
  - Tone: ${toneStyle} ${copywriterPersona}
  - Writing Style: Clear, engaging, and informative${audienceContext}${mediaContext}${productContext}${collectionContext}${keywordContext}${structuralContext}${customPromptContext}
  
  STRUCTURAL REQUIREMENTS:
  - Create a compelling title using <h1> tags
  - Use clear heading structure with <h2> and <h3> HTML tags (NOT markdown)
  - Include an engaging introduction that hooks the reader
  - Provide valuable, actionable content
  - End with a strong conclusion
  - IMPORTANT: Write ONLY in HTML format with proper tags - NO MARKDOWN allowed
  - Use <h1>, <h2>, <h3> tags instead of #, ##, ### 
  - Use <p> tags for paragraphs
  - Use proper HTML structure throughout
  
  SEO REQUIREMENTS:
  - Naturally include relevant keywords for "${request.topic}"
  - Create content that answers common questions about the topic
  - Use semantic HTML structure
  - Include internal linking opportunities where relevant
  - Optimize for search intent and user engagement
  
  E-COMMERCE CONTENT GUIDELINES:
  - Focus on providing genuine value to potential customers
  - Use examples and practical advice when appropriate
  - Maintain expertise and authority on the subject
  - Ensure content is original and insightful
  - Balance informational value with subtle product promotion
  - Write for humans first, search engines second
  - Create content that encourages engagement and potential purchases
  
  Please generate comprehensive, well-structured HTML content that meets all these requirements and naturally integrates the selected products, media, and keywords.`;
}

// Enhanced content generation function for bulk operations
export async function generateBulkContentWithClaude(request: BulkContentRequest): Promise<BulkContentResult> {
  try {
    console.log(`🎯 BULK CLAUDE SERVICE STARTED - Generating bulk content for topic: "${request.topic}"`);
    console.log(`🎯 BULK CLAUDE SERVICE - Request length parameter: "${request.length}"`);
    
    const prompt = buildBulkClaudePrompt(request);
    
    console.log(`🚀 BULK CLAUDE SERVICE - Making API call to Claude with model: ${CLAUDE_MODEL}`);
    console.log(`📝 BULK CLAUDE SERVICE - Prompt preview: ${prompt.substring(0, 200)}...`);

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

    console.log(`✅ BULK CLAUDE SERVICE - Received response from Claude API`);

    // Extract content from Claude's response
    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    if (!content) {
      console.error('❌ BULK CLAUDE SERVICE - No content received from Claude');
      throw new Error('No content generated by Claude');
    }

    console.log(`📊 BULK CLAUDE SERVICE - Generated content length: ${content.length} characters`);

    // Convert any Markdown to HTML first (safety measure)
    const htmlContent = convertMarkdownToHtml(content);

    // Extract title from the HTML content
    const titleMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const generatedTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : request.topic;

    console.log(`📝 BULK CLAUDE SERVICE - Extracted title: "${generatedTitle}"`);

    // Process and clean the content
    let cleanedContent = htmlContent
      .replace(/<h1[^>]*>.*?<\/h1>/i, '') // Remove the H1 since we'll use the title separately
      .trim();

    // Apply media placement logic (same as AdminPanel)
    cleanedContent = await applyMediaPlacement(cleanedContent, request);

    // Add author attribution (matching AdminPanel functionality)
    if (request.author) {
      console.log(`👤 BULK CLAUDE SERVICE - Adding author attribution for: ${request.author.name}`);
      
      // Add "Written by" section after any featured image
      const writtenByHTML = generateWrittenByHTML(request.author, cleanedContent);
      
      // Position "Written by" section - check if content starts with an image
      if (cleanedContent.includes('<img') || cleanedContent.includes('<div class="content-image"')) {
        // Find the first image and add "Written by" after it
        const imageMatch = cleanedContent.match(/(<img[^>]*>|<div[^>]*class="[^"]*image[^"]*"[^>]*>[\s\S]*?<\/div>)/);
        if (imageMatch) {
          const imageEnd = imageMatch.index! + imageMatch[0].length;
          cleanedContent = cleanedContent.slice(0, imageEnd) + writtenByHTML + cleanedContent.slice(imageEnd);
        } else {
          // Fallback: add at the beginning
          cleanedContent = writtenByHTML + cleanedContent;
        }
      } else {
        // No featured image found, add at the beginning
        cleanedContent = writtenByHTML + cleanedContent;
      }
      
      // Add author box at the bottom (before any existing author boxes to prevent duplicates)
      if (!cleanedContent.includes('id="author-box"')) {
        const authorBoxHTML = generateAuthorBoxHTML(request.author);
        cleanedContent = cleanedContent + authorBoxHTML;
        console.log(`✅ BULK CLAUDE SERVICE - Added author box for: ${request.author.name}`);
      } else {
        console.log(`⚠️ BULK CLAUDE SERVICE - Author box already exists, skipping duplicate`);
      }
      
      console.log(`✅ BULK CLAUDE SERVICE - Author attribution completed for: ${request.author.name}`);
    }

    // Add meta optimization (matching AdminPanel functionality)
    let optimizedMetaTitle = '';
    let optimizedMetaDescription = '';
    
    try {
      console.log(`🔍 BULK CLAUDE SERVICE - Starting meta optimization for: ${generatedTitle}`);
      
      // Extract keywords for meta optimization
      const keywords = request.keywords && request.keywords.length > 0 
        ? request.keywords 
        : [request.topic.toLowerCase()];
      
      // Get content preview for context (first 300 chars without HTML)
      const contentPreview = cleanedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 300);
      
      // Optimize meta title
      console.log(`📝 BULK CLAUDE SERVICE - Optimizing meta title...`);
      optimizedMetaTitle = await optimizeMetaData(
        generatedTitle,
        keywords,
        'title',
        generatedTitle,
        contentPreview
      );
      console.log(`✅ BULK CLAUDE SERVICE - Meta title optimized: "${optimizedMetaTitle.substring(0, 50)}..."`);
      
      // Optimize meta description
      console.log(`📝 BULK CLAUDE SERVICE - Optimizing meta description...`);
      const baseDescription = contentPreview.length > 140 
        ? contentPreview.substring(0, 140) + "..." 
        : contentPreview;
      
      optimizedMetaDescription = await optimizeMetaData(
        baseDescription,
        keywords,
        'description',
        generatedTitle,
        contentPreview
      );
      console.log(`✅ BULK CLAUDE SERVICE - Meta description optimized: "${optimizedMetaDescription.substring(0, 50)}..."`);
      
    } catch (metaError) {
      console.warn(`⚠️ BULK CLAUDE SERVICE - Meta optimization failed, using fallbacks:`, metaError);
      
      // Fallback meta title
      optimizedMetaTitle = generatedTitle.length <= 60 
        ? generatedTitle 
        : generatedTitle.substring(0, 57) + '...';
      
      // Fallback meta description
      const contentPreview = cleanedContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      optimizedMetaDescription = contentPreview.length <= 160 
        ? contentPreview 
        : contentPreview.substring(0, 157) + '...';
    }

    console.log(`✨ BULK CLAUDE SERVICE - Content processing completed successfully`);
    console.log(`🎯 BULK CLAUDE SERVICE COMPLETED - Successfully generated bulk content for topic: "${request.topic}"`);

    return {
      title: generatedTitle,
      content: cleanedContent,
      tags: [request.topic.toLowerCase().replace(/\s+/g, '-')],
      metaTitle: optimizedMetaTitle,
      metaDescription: optimizedMetaDescription
    };

  } catch (error: any) {
    console.error('❌ BULK CLAUDE SERVICE ERROR - Error generating content with Claude:', error);
    console.log(`🔄 BULK CLAUDE SERVICE - Attempting fallback content generation for topic: "${request.topic}"`);
    
    // Return fallback content instead of throwing
    const fallbackTitle = `Complete Guide to ${request.topic}`;
    const fallbackContent = await generateFallbackBulkContent(request);

    console.log(`📋 BULK CLAUDE SERVICE - Generated fallback content for topic: "${request.topic}"`);

    const result: BulkContentResult = {
      title: fallbackTitle,
      content: fallbackContent,
      tags: [request.topic.toLowerCase().replace(/\s+/g, '-')],
      usesFallback: true
    };

    console.log(`✅ BULK CLAUDE SERVICE COMPLETED (FALLBACK) - Successfully generated fallback content for topic: "${request.topic}"`);
    
    return result;
  }
}

// Calculate reading time for content (matching AdminPanel functionality)
function calculateReadingTime(content: string): { minutes: number; seconds: number; display: string } {
  if (!content || typeof content !== 'string') {
    return { minutes: 0, seconds: 0, display: '1 min read' };
  }

  // Remove HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, '').trim();
  
  // Count words (split by whitespace and filter out empty strings)
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Average reading speed is 200-250 words per minute, we'll use 225
  const wordsPerMinute = 225;
  
  // Calculate total minutes as decimal
  const totalMinutes = wordCount / wordsPerMinute;
  
  // Convert to minutes and seconds
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  
  // Create display string
  let display: string;
  if (minutes === 0) {
    display = '1 min read'; // Minimum 1 minute for very short content
  } else if (minutes === 1 && seconds < 30) {
    display = '1 min read';
  } else if (minutes > 0 && seconds >= 30) {
    display = `${minutes + 1} min read`; // Round up if seconds >= 30
  } else {
    display = `${minutes} min read`;
  }
  
  return { minutes, seconds, display };
}

// Generate "Written by" HTML for inclusion in Shopify content (matching AdminPanel)
function generateWrittenByHTML(author: {
  id: string;
  name: string;
  profileImage?: string;
}, content?: string): string {
  const avatarInitials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarImg = author.profileImage 
    ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 32px !important; height: 32px !important; min-width: 32px !important; min-height: 32px !important; max-width: 32px !important; max-height: 32px !important; border-radius: 50% !important; object-fit: cover !important; flex-shrink: 0 !important; box-sizing: border-box !important;" />`
    : `<div style="width: 32px !important; height: 32px !important; min-width: 32px !important; min-height: 32px !important; max-width: 32px !important; max-height: 32px !important; border-radius: 50% !important; background: #e5e7eb !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: bold !important; color: #374151 !important; font-size: 12px !important; flex-shrink: 0 !important; box-sizing: border-box !important;">${avatarInitials}</div>`;

  // Calculate reading time if content is provided
  const readingTime = content ? calculateReadingTime(content) : null;
  const readingTimeText = readingTime ? ` • ${readingTime.display}` : '';

  return `
    <div style="display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; margin: 16px 0 !important; padding: 8px 0 !important; text-align: center !important;">
      ${avatarImg}
      <span style="color: #6b7280 !important; font-size: 14px !important;">
        Written by <a href="#author-box" style="color: #2563eb !important; text-decoration: none !important; font-weight: 500 !important; border-bottom: 1px solid transparent !important; transition: all 0.2s !important;" onmouseover="this.style.borderBottomColor='#2563eb'; this.style.color='#1d4ed8'" onmouseout="this.style.borderBottomColor='transparent'; this.style.color='#2563eb'">${author.name}</a>${readingTimeText}
      </span>
    </div>
  `;
}

// Generate full author box HTML for inclusion at bottom of content (matching AdminPanel)
function generateAuthorBoxHTML(author: {
  id: string;
  name: string;
  description?: string;
  profileImage?: string;
  linkedinUrl?: string;
}): string {
  const avatarInitials = author.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const avatarImg = author.profileImage 
    ? `<img src="${author.profileImage}" alt="${author.name}" style="width: 64px !important; height: 64px !important; min-width: 64px !important; min-height: 64px !important; max-width: 64px !important; max-height: 64px !important; border-radius: 50% !important; object-fit: cover !important; flex-shrink: 0 !important; box-sizing: border-box !important;" />`
    : `<div style="width: 64px !important; height: 64px !important; min-width: 64px !important; min-height: 64px !important; max-width: 64px !important; max-height: 64px !important; border-radius: 50% !important; background: #e5e7eb !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: bold !important; color: #374151 !important; font-size: 18px !important; flex-shrink: 0 !important; box-sizing: border-box !important;">${avatarInitials}</div>`;

  // LinkedIn "Learn More" button if LinkedIn URL is available
  const linkedinButton = author.linkedinUrl 
    ? `<a href="${author.linkedinUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block !important; margin-top: 12px !important; padding: 8px 16px !important; background: #0077b5 !important; color: white !important; text-decoration: none !important; border-radius: 4px !important; font-size: 14px !important; font-weight: 500 !important;">Learn More</a>`
    : '';

  return `
    <div id="author-box" style="border: 1px solid #e5e7eb !important; border-radius: 8px !important; padding: 24px !important; margin: 24px 0 !important; background: #ffffff !important; box-sizing: border-box !important;">
      <div style="display: flex !important; gap: 16px !important; align-items: flex-start !important;">
        ${avatarImg}
        <div style="flex: 1 !important;">
          <h3 style="font-size: 18px !important; font-weight: 600 !important; color: #111827 !important; margin: 0 0 8px 0 !important;">${author.name}</h3>
          ${author.description ? `<p style="color: #4b5563 !important; line-height: 1.6 !important; margin: 0 0 12px 0 !important;">${author.description}</p>` : ''}
          ${linkedinButton}
        </div>
      </div>
    </div>
  `;
}

// Convert any remaining Markdown to HTML
function convertMarkdownToHtml(content: string): string {
  let processedContent = content;
  
  // Convert markdown headers to HTML (safety conversion)
  processedContent = processedContent.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  processedContent = processedContent.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  processedContent = processedContent.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  processedContent = processedContent.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  
  console.log(`🔄 MARKDOWN CONVERSION - Applied safety HTML conversion`);
  
  return processedContent;
}

// Apply media placement logic matching AdminPanel behavior
async function applyMediaPlacement(content: string, request: BulkContentRequest): Promise<string> {
  let processedContent = content;
  
  try {
    console.log(`🖼️ BULK MEDIA PLACEMENT - Processing media for bulk content`);
    console.log(`🔍 MEDIA REQUEST DEBUG - primaryImage:`, request.primaryImage ? 'EXISTS' : 'NULL');
    console.log(`🔍 MEDIA REQUEST DEBUG - secondaryImages:`, request.secondaryImages?.length || 0);
    console.log(`🔍 MEDIA REQUEST DEBUG - youtubeEmbed:`, request.youtubeEmbed ? 'EXISTS' : 'NULL');
    console.log(`🔍 CONTENT DEBUG - First 500 chars:`, processedContent.substring(0, 500));
    console.log(`🔍 CONTENT DEBUG - Looking for H2 patterns in content...`);
    
    // First check for any heading patterns
    const allHeadings = processedContent.match(/#{1,6}\s.*$/gm);
    console.log(`📝 Found ${allHeadings?.length || 0} markdown headings:`, allHeadings?.slice(0, 3));
    
    // Check for HTML H2 tags
    const htmlH2Matches = Array.from(processedContent.matchAll(/<h2[^>]*>.*?<\/h2>/gi));
    console.log(`🏷️ Found ${htmlH2Matches.length} HTML H2 headings`);
    
    // Check for markdown H2 (##) headings
    const markdownH2Matches = Array.from(processedContent.matchAll(/^## .+$/gm));
    console.log(`📝 Found ${markdownH2Matches.length} Markdown H2 headings:`, markdownH2Matches.slice(0, 3).map(m => m[0]));
    
    // Use the appropriate format based on what we find
    let h2Matches = htmlH2Matches;
    if (htmlH2Matches.length === 0 && markdownH2Matches.length > 0) {
      h2Matches = markdownH2Matches;
      console.log(`🔄 Using Markdown H2 headings for media placement`);
    } else if (htmlH2Matches.length > 0) {
      console.log(`🔄 Using HTML H2 headings for media placement`);
    }
    
    console.log(`Found ${h2Matches.length} H2 headings for media placement`);
    
    // Place YouTube video under the first H2 heading (if available)
    if (request.youtubeEmbed && h2Matches.length > 0) {
      const firstMatch = h2Matches[0];
      let insertionPoint;
      
      if (htmlH2Matches.length > 0) {
        // HTML format
        insertionPoint = firstMatch.index! + firstMatch[0].length;
      } else {
        // Markdown format - find the end of the line
        const lineEnd = processedContent.indexOf('\n', firstMatch.index! + firstMatch[0].length);
        insertionPoint = lineEnd !== -1 ? lineEnd : firstMatch.index! + firstMatch[0].length;
      }
      
      const videoEmbed = `\n\n<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
        <iframe src="${request.youtubeEmbed}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
      </div>\n\n`;
      
      processedContent = processedContent.slice(0, insertionPoint) + videoEmbed + processedContent.slice(insertionPoint);
      console.log(`📹 Placed YouTube video under first H2 heading`);
    }
    
    // Place secondary images under H2 headings (after video placement)
    if (request.secondaryImages && request.secondaryImages.length > 0) {
      console.log(`📸 Processing ${request.secondaryImages.length} secondary images`);
      
      // Re-find H2 headings after video insertion
      let updatedH2Matches;
      if (htmlH2Matches.length > 0) {
        updatedH2Matches = Array.from(processedContent.matchAll(/<h2[^>]*>.*?<\/h2>/gi));
      } else {
        updatedH2Matches = Array.from(processedContent.matchAll(/^## .+$/gm));
      }
      
      // Start placing images from the second H2 (or first if no video)
      const startIndex = request.youtubeEmbed ? 1 : 0;
      let imageIndex = 0;
      
      for (let i = startIndex; i < updatedH2Matches.length && imageIndex < request.secondaryImages.length; i++) {
        const image = request.secondaryImages[imageIndex];
        const h2Match = updatedH2Matches[i];
        let insertionPoint;
        
        if (htmlH2Matches.length > 0) {
          // HTML format
          insertionPoint = h2Match.index! + h2Match[0].length;
        } else {
          // Markdown format - find the end of the line
          const lineEnd = processedContent.indexOf('\n', h2Match.index! + h2Match[0].length);
          insertionPoint = lineEnd !== -1 ? lineEnd : h2Match.index! + h2Match[0].length;
        }
        
        // Create image with product linking if available
        let imageHtml = `\n\n<div class="content-image" style="margin: 20px 0; text-align: center;">`;
        
        // Link to product if available
        if (request.selectedProducts && request.selectedProducts.length > 0) {
          const productIndex = imageIndex % request.selectedProducts.length;
          const linkedProduct = request.selectedProducts[productIndex];
          
          imageHtml += `<a href="${linkedProduct.url}" style="display: inline-block;">
            <img src="${image.url}" alt="${image.alt}" style="max-width: 100%; height: auto; width: 600px; max-height: 600px; object-fit: cover;" />
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">
            <a href="${linkedProduct.url}" style="color: #007cba; text-decoration: none;">${linkedProduct.title}</a>
          </p>`;
          
          console.log(`🔗 Linked image ${imageIndex + 1} to product: ${linkedProduct.title}`);
        } else {
          imageHtml += `<img src="${image.url}" alt="${image.alt}" style="max-width: 100%; height: auto; width: 600px; max-height: 600px; object-fit: cover;" />`;
        }
        
        imageHtml += `</div>\n\n`;
        
        processedContent = processedContent.slice(0, insertionPoint) + imageHtml + processedContent.slice(insertionPoint);
        imageIndex++;
      }
      
      console.log(`✅ Placed ${imageIndex} secondary images with product linking`);
    }
    
    console.log(`🖼️ BULK MEDIA PLACEMENT COMPLETED - All media processed successfully`);
    
  } catch (error) {
    console.error('❌ Error applying media placement:', error);
    // Return content as-is if media placement fails
  }
  
  return processedContent;
}

// Generate fallback content for bulk operations
async function generateFallbackBulkContent(request: BulkContentRequest): Promise<string> {
  console.log(`🔄 Generating fallback bulk content for: "${request.topic}"`);
  
  let content = `
    <h2>Introduction</h2>
    <p>Welcome to our comprehensive guide on ${request.topic}. This topic is important and deserves thorough exploration for our readers.</p>
    
    <h2>Understanding ${request.topic}</h2>
    <p>${request.topic} is a significant subject that affects many aspects of our daily lives. In this section, we'll explore the fundamental concepts and key insights.</p>
  `;
  
  // Add product mentions if available
  if (request.selectedProducts && request.selectedProducts.length > 0) {
    content += `
    <h2>Recommended Products</h2>
    <p>To help you get started with ${request.topic}, we recommend exploring these carefully selected products:</p>
    <ul>`;
    
    request.selectedProducts.forEach(product => {
      content += `<li><a href="${product.url}">${product.title}</a> - A great choice for ${request.topic}</li>`;
    });
    
    content += `</ul>`;
  }
  
  content += `
    <h2>Key Benefits and Applications</h2>
    <p>The benefits of understanding ${request.topic} are numerous. Here are some key advantages:</p>
    <ul>
      <li>Improved knowledge and understanding</li>
      <li>Better decision-making capabilities</li>
      <li>Enhanced problem-solving skills</li>
    </ul>
    
    <h2>Best Practices</h2>
    <p>When dealing with ${request.topic}, it's important to follow established best practices to ensure success and optimal results.</p>
    
    <h2>Conclusion</h2>
    <p>In conclusion, ${request.topic} is an important subject that requires careful consideration and understanding. We hope this guide has provided valuable insights to help you succeed.</p>
  `;
  
  // Apply media placement to fallback content too
  return await applyMediaPlacement(content, request);
}

// Export only the main function to avoid redeclaration
// generateBulkContentWithClaude is already exported above