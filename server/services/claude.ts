// Integration with Anthropic's Claude API
import Anthropic from '@anthropic-ai/sdk';

interface BlogContentRequest {
  topic: string;
  tone: string;
  length: string;
  customPrompt?: string;
  systemPrompt?: string;
  includeProducts?: boolean;
  includeCollections?: boolean;
  includeKeywords?: boolean;
  contentStyleToneId?: string;
  contentStyleDisplayName?: string;
  // Media selection fields
  primaryImage?: any;
  secondaryImages?: any[];
  youtubeEmbed?: string;
  // Product linking fields
  productIds?: string[];
  productsInfo?: any[];
  // Audience targeting fields
  targetAudience?: string;
  buyerPersona?: string;
  // Keyword optimization fields
  keywords?: string[];
  keywordData?: any[];
}

interface BlogContent {
  title: string;
  content: string;
  rawContent?: string; // Unprocessed content for the editor
  tags: string[];
  metaDescription: string;
}

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Function to automatically add id attributes to H2 headings that don't have them
function addHeadingIds(content: string): string {
  console.log('🔧 HEADING ID PROCESSING STARTED');
  let processedContent = content;
  let addedIds = 0;
  
  // COMPREHENSIVE HEADING CLEANUP - Multiple fixes applied in sequence
  console.log('🔧 COMPREHENSIVE HEADING CLEANUP STARTED');
  
  // Fix 1: Clean up malformed headings with escaped quotes and extra characters
  processedContent = processedContent.replace(/<h2([^>]*?)\\?"([^"]*?)\\?"([^>]*?)>/gi, (match, before, content, after) => {
    console.log(`🔧 FIXING MALFORMED HEADING: ${match}`);
    return `<h2${before}"${content}"${after}>`;
  });
  
  // Fix 2: Remove duplicate '>' characters  
  processedContent = processedContent.replace(/<h2([^>]*?)>>+/gi, '<h2$1>');
  
  // Fix 3: Clean up any headings with duplicate IDs (first pattern)
  processedContent = processedContent.replace(/<h2([^>]*)(id\s*=\s*["'][^"']*["'])([^>]*)(id\s*=\s*["'][^"']*["'])([^>]*)>/gi, (match, before1, firstId, between, secondId, after) => {
    console.log(`🔧 REMOVING DUPLICATE ID PATTERN 1: ${match}`);
    // Keep only the second ID (usually the more specific one like "faq")
    return `<h2${before1}${between}${secondId}${after}>`;
  });
  
  // Fix 4: Alternative duplicate ID pattern
  processedContent = processedContent.replace(/<h2\s+id\s*=\s*["']([^"']*?)["']\s+id\s*=\s*["']([^"']*?)["']([^>]*)>/gi, (match, firstId, secondId, rest) => {
    console.log(`🔧 REMOVING DUPLICATE ID PATTERN 2: ${match}`);
    return `<h2 id="${secondId}"${rest}>`;
  });
  
  // Fix 5: Clean up extra spaces around id attributes
  processedContent = processedContent.replace(/<h2(\s+)id\s*=\s*["']([^"']*?)["'](\s+)>/gi, '<h2 id="$2">');
  
  console.log('✅ COMPREHENSIVE HEADING CLEANUP COMPLETED');
  
  // Find all H2 headings without id attributes
  const h2WithoutIdRegex = /<h2(?![^>]*id=)([^>]*)>(.*?)<\/h2>/gi;
  
  processedContent = processedContent.replace(h2WithoutIdRegex, (match, attributes, title) => {
    // Generate a clean id from the title
    const cleanTitle = title.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
    const id = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    addedIds++;
    console.log(`   - Added id="${id}" to H2: "${cleanTitle}"`);
    return `<h2${attributes} id="${id}">${title}</h2>`;
  });
  
  console.log(`✅ HEADING ID PROCESSING COMPLETED: Added ${addedIds} IDs to H2 headings`);
  return processedContent;
}

function fixTOCLinks(content: string): string {
  console.log('🔧 FIXING TOC LINKS - Removing target="_blank" from internal navigation');
  
  // Remove target="_blank" and related attributes from anchor links that point to internal IDs
  let processedContent = content.replace(
    /<a\s+([^>]*href=["']#[^"']+["'][^>]*target=["']_blank["'][^>]*)>/gi,
    (match, attributes) => {
      // Remove target="_blank", rel attributes, and class attributes for TOC links
      const cleanAttributes = attributes
        .replace(/target=["']_blank["']/gi, '')
        .replace(/rel=["'][^"']*["']/gi, '')
        .replace(/class=["'][^"']*["']/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`   - Fixed TOC link: ${match} → <a ${cleanAttributes}>`);
      return `<a ${cleanAttributes}>`;
    }
  );
  
  // Also fix any TOC links that might have been processed differently
  processedContent = processedContent.replace(
    /<a\s+([^>]*target=["']_blank["'][^>]*href=["']#[^"']+["'][^>]*)>/gi,
    (match, attributes) => {
      const cleanAttributes = attributes
        .replace(/target=["']_blank["']/gi, '')
        .replace(/rel=["'][^"']*["']/gi, '')
        .replace(/class=["'][^"']*["']/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`   - Fixed TOC link (alt format): ${match} → <a ${cleanAttributes}>`);
      return `<a ${cleanAttributes}>`;
    }
  );
  
  console.log('✅ TOC LINK FIXING COMPLETED');
  return processedContent;
}

// Function to automatically generate Table of Contents from H2 headings
function addTableOfContents(content: string): string {
  console.log('🔍 TABLE OF CONTENTS PROCESSING STARTED');
  console.log(`   - Content length: ${content.length} characters`);
  console.log(`   - Has TOC marker: ${content.includes('<!-- TABLE_OF_CONTENTS_PLACEMENT -->')}`);
  
  // Check if content has TOC placement marker
  if (!content.includes('<!-- TABLE_OF_CONTENTS_PLACEMENT -->')) {
    console.log('❌ No TOC placement marker found - returning content as-is');
    return content; // No TOC marker, return content as-is
  }
  
  // First, ensure all H2 headings have id attributes
  let processedContent = addHeadingIds(content);
  console.log('✅ Added missing heading IDs to H2 elements');
  
  // Extract all H2 headings with their id attributes
  const h2Regex = /<h2[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h2>/gi;
  const headings: { id: string; title: string }[] = [];
  let match;
  
  while ((match = h2Regex.exec(processedContent)) !== null) {
    const id = match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim(); // Remove any HTML tags from title
    headings.push({ id, title });
    console.log(`   - Found H2 heading: "${title}" with id="${id}"`);
  }
  
  // Reset regex lastIndex to avoid issues with global regex
  h2Regex.lastIndex = 0;
  
  console.log(`📊 TOC STATISTICS: Found ${headings.length} H2 headings with IDs`);
  
  // If no headings found, remove the TOC marker
  if (headings.length === 0) {
    console.log('⚠️ No H2 headings with IDs found - removing TOC marker');
    return processedContent.replace('<!-- TABLE_OF_CONTENTS_PLACEMENT -->', '');
  }
  
  // Generate clean, Shopify-compatible TOC HTML with proper spacing and FORCE removal of target="_blank"
  const tocHtml = `
<div style="background-color: #f9f9f9; border-left: 4px solid #007bff; padding: 16px; margin: 24px 0; clear: both;">
  <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #333;">
    📋 Table of Contents
  </h3>
  <ol style="margin: 0; padding: 0 0 0 18px; list-style-type: decimal;">
    ${headings.map(heading => 
      `<li style="margin: 6px 0; line-height: 1.4;"><a href="#${heading.id}" style="color: #007bff; text-decoration: underline;">${heading.title}</a></li>`
    ).join('')}
  </ol>
</div>

`;
  
  console.log('🎨 Generated TOC HTML (internal links without target="_blank")');
  console.log(`   - TOC HTML length: ${tocHtml.length} characters`);
  
  // Replace the TOC marker with the generated TOC and ensure proper spacing
  // This regex handles cases where there might not be proper paragraph breaks after the marker
  const finalContent = processedContent.replace(/<!-- TABLE_OF_CONTENTS_PLACEMENT -->\s*(<p>|<[^>]+>)/i, tocHtml + '\n\n$1')
                .replace('<!-- TABLE_OF_CONTENTS_PLACEMENT -->', tocHtml);
  
  console.log('✅ TABLE OF CONTENTS PROCESSING COMPLETED');
  console.log(`   - Final content length: ${finalContent.length} characters`);
  
  return finalContent;
}

// Function to remove any H1 tags from content to prevent title duplication
function removeH1Tags(content: string): string {
  // Remove H1 tags and their content, but preserve the text inside
  return content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '');
}

// Function to process media placements and prevent duplicate secondary images
function processMediaPlacementsHandler(content: string, request: BlogContentRequest): string {
  let processedContent = content;
  
  // Handle YouTube video placement under second H2 heading
  if (request.youtubeEmbed) {
    const videoId = request.youtubeEmbed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
    
    if (videoId) {
      const videoHtml = `
<div style="margin: 20px 0; text-align: center;">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
    frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen style="max-width: 100%; border-radius: 8px;">
  </iframe>
</div>`;
      
      // Replace only the first occurrence (under second H2)
      processedContent = processedContent.replace('<!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->', videoHtml);
      
      // Remove any additional video placement markers
      processedContent = processedContent.replace(/<!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->/g, '');
    }
  }
  
  // Handle secondary images placement - ensure no duplicates and proper distribution with product links
  console.log("🔍 CLAUDE SERVICE - Secondary images processing:", {
    hasSecondaryImages: !!request.secondaryImages,
    secondaryImagesCount: request.secondaryImages?.length || 0,
    hasProductIds: !!request.productIds,
    productIdsCount: request.productIds?.length || 0,
    productIds: request.productIds || [],
    hasProductsInfo: !!request.productsInfo,
    productsInfoCount: request.productsInfo?.length || 0,
    productsInfo: request.productsInfo?.map(p => ({ id: p.id, handle: p.handle, title: p.title })) || []
  });

  // CRITICAL DEBUG: Check if we have the data needed for interlinking
  if (!request.secondaryImages || request.secondaryImages.length === 0) {
    console.log("❌ INTERLINKING BLOCKED: No secondary images provided to Claude service");
    return processedContent;
  }

  if (!request.productsInfo || request.productsInfo.length === 0) {
    console.log("⚠️ NO PRODUCTS INFO: Secondary images will be embedded without product links");
    // Continue processing secondary images even without products info
  }
  
  if (request.secondaryImages && request.secondaryImages.length > 0) {
    console.log("✅ SECONDARY IMAGES FOUND - Processing for product interlinking");
    console.log("🔍 SECONDARY IMAGES DETAILS:", request.secondaryImages.map(img => ({
      id: img.id,
      url: img.url,
      source: img.source,
      alt: img.alt
    })));
    
    // CRITICAL FIX: Filter out primary image from secondary images to prevent duplication
    const primaryImageId = request.primaryImage?.id;
    const primaryImageUrl = request.primaryImage?.url;
    
    const filteredSecondaryImages = request.secondaryImages.filter(img => {
      const isDuplicatePrimary = (img.id === primaryImageId) || (img.url === primaryImageUrl);
      if (isDuplicatePrimary) {
        console.log(`🚫 FILTERED OUT PRIMARY IMAGE DUPLICATE: ${img.id} (${img.url})`);
      }
      return !isDuplicatePrimary;
    });
    
    console.log(`🔧 PRIMARY IMAGE DUPLICATION FIX: Filtered ${request.secondaryImages.length} → ${filteredSecondaryImages.length} secondary images`);
    
    if (filteredSecondaryImages.length === 0) {
      console.log("⚠️ No secondary images remaining after primary image filtering");
      return processedContent;
    }
    
    // Find all secondary image placement markers
    const markers = processedContent.match(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g);
    const availableMarkers = markers ? markers.length : 0;
    
    console.log(`🔍 MARKER SEARCH RESULTS:`);
    console.log(`   - Found ${availableMarkers} placement markers for ${filteredSecondaryImages.length} secondary images`);
    console.log(`   - Content length: ${processedContent.length} characters`);
    console.log(`   - Content preview (first 500 chars):`, processedContent.substring(0, 500));
    
    if (availableMarkers === 0) {
      console.log(`🔍 SEARCHING FOR H2 HEADINGS IN CONTENT:`);
      const h2Matches = processedContent.match(/<h2[^>]*>.*?<\/h2>/gi);
      console.log(`   - Found ${h2Matches?.length || 0} H2 headings`);
      if (h2Matches) {
        h2Matches.forEach((h2, index) => {
          console.log(`   - H2 ${index + 1}: ${h2.substring(0, 50)}...`);
        });
      }
    }
    
    // FALLBACK SYSTEM: If no markers found, automatically insert them after H2 headings
    if (availableMarkers === 0) {
      console.log("⚠️ No secondary image markers found in content - implementing fallback system");
      
      // Find all H2 headings and add markers after them (skip first 2 H2s for intro and video)
      const h2Regex = /<h2[^>]*>.*?<\/h2>/gi;
      const h2Matches: RegExpExecArray[] = [];
      let h2Match;
      while ((h2Match = h2Regex.exec(processedContent)) !== null) {
        h2Matches.push(h2Match);
      }
      
      if (h2Matches.length > 1) {
        console.log(`Found ${h2Matches.length} H2 headings - adding markers after H2 #2 and beyond`);
        
        // Start from the 2nd H2 (index 1) and add markers after each one
        let insertOffset = 0;
        for (let i = 1; i < h2Matches.length && i < 1 + filteredSecondaryImages.length; i++) {
          const h2Match = h2Matches[i];
          const insertPosition = h2Match.index + h2Match[0].length + insertOffset;
          const marker = '\n<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->\n';
          
          processedContent = processedContent.slice(0, insertPosition) + marker + processedContent.slice(insertPosition);
          insertOffset += marker.length;
          
          console.log(`Added fallback marker after H2 #${i + 1}`);
        }
        
        // Update markers count after fallback insertion
        const newMarkers = processedContent.match(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g);
        const newAvailableMarkers = newMarkers ? newMarkers.length : 0;
        console.log(`Fallback system added ${newAvailableMarkers} markers`);
      }
    }
    
    // Re-check markers after potential fallback
    const finalMarkers = processedContent.match(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g);
    const finalAvailableMarkers = finalMarkers ? finalMarkers.length : 0;
    
    // Create a set to track used image URLs to prevent duplicates
    const usedImages = new Set<string>();
    
    // Get products information for linking (from request or from secondary image metadata)
    const availableProducts = request.productIds || [];
    
    console.log("Available products for interlinking:", availableProducts);
    console.log("Request.productsInfo:", request.productsInfo);
    console.log("Secondary images available:", request.secondaryImages?.length || 0);
    
    // Process each marker location with a unique image (using filtered secondary images)
    for (let i = 0; i < finalAvailableMarkers && i < filteredSecondaryImages.length; i++) {
      const image = filteredSecondaryImages[i];
      
      // Skip if this image URL has already been used
      if (usedImages.has(image.url)) {
        continue;
      }
      
      usedImages.add(image.url);
      
      let imageHtml = '';
      
      console.log(`🔧 PROCESSING SECONDARY IMAGE ${i + 1}:`);
      console.log(`   - Image URL: ${image.url}`);
      console.log(`   - request.productsInfo: ${request.productsInfo ? JSON.stringify(request.productsInfo) : 'undefined'}`);
      console.log(`   - availableProducts: ${JSON.stringify(availableProducts)}`);
      
      // Try to link the image to a product using product handle from productsInfo
      if (request.productsInfo && request.productsInfo.length > 0) {
        // Cycle through available products to ensure each secondary image links to a product
        const productIndex = i % request.productsInfo.length;
        const productInfo = request.productsInfo[productIndex];
        const productHandle = productInfo.handle;
        const productTitle = productInfo.title || "View Product Details";
        
        // Create product-linked image HTML matching the user's required format
        imageHtml = `<div style="text-align: center; margin: 20px 0;">
  <a href="/products/${productHandle}" title="${productTitle}" style="text-decoration: none;">
    <img src="${image.url}" alt="${image.alt || ''}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
  </a>
</div>`;
        
        console.log(`✓ Secondary image ${i + 1} linked to product: ${productTitle} (handle: ${productHandle})`);
      } else if (availableProducts.length > 0) {
        // Fallback: try to use product ID if no productsInfo available
        const productIndex = i % availableProducts.length;
        const productId = availableProducts[productIndex];
        
        // Create product-linked image HTML with product ID (less ideal but functional)
        imageHtml = `<div style="text-align: center; margin: 20px 0;">
  <a href="/products/${productId}" title="View Product Details" style="text-decoration: none;">
    <img src="${image.url}" alt="${image.alt || ''}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
  </a>
</div>`;
        
        console.log(`⚠ Secondary image ${i + 1} linked to product ID: ${productId} (no handle available)`);
      } else {
        // Fallback without product link if no products available
        imageHtml = `
<div style="margin: 20px 0; text-align: center;">
  <img src="${image.url}" alt="${image.alt || ''}" 
    style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
</div>`;
        
        console.log(`❌ Secondary image ${i + 1} added without product link (no products selected)`);
        console.log(`   - request.productsInfo: ${request.productsInfo ? request.productsInfo.length : 'undefined'}`);
        console.log(`   - availableProducts: ${availableProducts.length}`);
      }
      
      // Replace only the first remaining marker to ensure even distribution
      processedContent = processedContent.replace('<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->', imageHtml);
    }
    
    // Remove any remaining unused markers
    processedContent = processedContent.replace(/<!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->/g, '');
    
    console.log(`✅ SECONDARY IMAGES PROCESSING COMPLETE:`);
    console.log(`   - Original secondary images: ${request.secondaryImages.length}`);
    console.log(`   - After primary image filtering: ${filteredSecondaryImages.length}`);
    console.log(`   - Placement markers created: ${finalAvailableMarkers}`);
    console.log(`   - Images successfully embedded: ${Math.min(finalAvailableMarkers, filteredSecondaryImages.length)}`);
    console.log(`   - Content length after processing: ${processedContent.length} characters`);
  }
  
  return processedContent;
}

// Function to generate blog content using Claude
export async function generateBlogContentWithClaude(request: BlogContentRequest): Promise<BlogContent> {
  try {
    console.log(`Generating blog content with Claude for topic: "${request.topic}"`);
    
    // Determine content length based on request
    let contentLength = "approximately 800-1000 words";
    if (request.length.toLowerCase().includes("short")) {
      contentLength = "approximately 500-700 words";
    } else if (request.length.toLowerCase().includes("long")) {
      contentLength = "approximately 1500-2000 words";
    }
    
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
      mediaContext += `\n    SELECTED YOUTUBE VIDEO: A relevant YouTube video has been selected to enhance the content. This will be placed under the second H2 heading.`;
    }

    // Build audience-aware context
    let audienceContext = '';
    if (request.targetAudience || request.buyerPersona) {
      const audience = request.targetAudience || request.buyerPersona;
      audienceContext = `
    
    TARGET AUDIENCE FOCUS: This article is intended for the following audience: ${audience}
    - Tailor all content, tone, examples, and messaging specifically for this target audience
    - Use language, terminology, and depth appropriate for this audience level
    - Address their specific pain points, interests, and needs
    - Include relevant examples and use cases that resonate with this audience
    - Ensure the call-to-action appeals directly to this audience segment`;
    }
    
    // Build keyword optimization context
    let keywordContext = '';
    if (request.keywords && request.keywords.length > 0) {
      const keywordList = request.keywords.join(', ');
      keywordContext = `
    
    KEYWORD OPTIMIZATION: Use these specific keywords naturally throughout the content:
    Keywords: ${keywordList}
    - Incorporate these keywords in the title (at least 1 primary keyword)
    - Include keywords in H2 and H3 headings where natural
    - Use keywords in the first and last paragraphs
    - Distribute keywords naturally throughout the body content
    - DO NOT generate new keywords - only use the provided ones
    - Ensure keyword usage feels natural and not forced`;
    }

let promptText = `Generate a well-structured, SEO-optimized blog post with the EXACT title "${request.topic}" in a ${toneStyle} tone, ${contentLength}. ${copywriterPersona}${mediaContext}${audienceContext}${keywordContext}
    
    CRITICAL TITLE REQUIREMENT: You MUST use the exact title "${request.topic}" without any modifications, variations, or improvements. Do not generate your own title - use this title exactly as provided.
    
    The blog post MUST follow this exact structure:
    1. Use the provided title "${request.topic}" exactly as given (no modifications allowed)
    2. Multiple clearly defined sections with H2 headings that incorporate important keywords
    3. Appropriate H3 subheadings within each section where needed
    4. Well-organized paragraphs (2-4 paragraphs per section)
    5. Proper HTML formatting throughout (h2, h3, p, ul, li, etc.)
    6. Lists and tables where appropriate to improve readability
    7. A conclusion with a clear call to action
    
    EXTERNAL AUTHORITATIVE LINK REQUIREMENTS:
    - Include 3-5 external links to authoritative sources throughout the content
    - Prioritize links to: .edu (universities/research), .gov (government agencies), .wikipedia.org (Wikipedia articles), .org (established organizations)
    - High-authority domains to use when relevant:
      * Government: cdc.gov, epa.gov, nih.gov, fda.gov, usda.gov, energy.gov, ftc.gov, hhs.gov
      * Universities: harvard.edu, mit.edu, stanford.edu, berkeley.edu, cornell.edu, yale.edu
      * Organizations: wikipedia.org, who.int, un.org, redcross.org, acs.org, ieee.org
      * Research: ncbi.nlm.nih.gov, nature.com, sciencedirect.com, jstor.org
    - Place these links naturally within the content where they support specific claims, statistics, or provide additional credible information
    - Use proper link formatting: <a href="URL" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>
    - Make anchor text descriptive and specific (e.g., "EPA water quality standards" not "click here")
    - Distribute links across different sections of the content for better SEO value
    - Links should enhance credibility and provide readers with additional authoritative information
    - When mentioning statistics, studies, or facts, link to the authoritative source when possible
    
    MEDIA PLACEMENT RULES:
    - Selected YouTube video MUST be placed under the SECOND H2 heading only
    - Secondary images MUST be placed under H2 headings that come AFTER the video
    - Each secondary image should be placed under a different H2 heading
    - Never repeat the same secondary image multiple times
    - Distribute secondary images evenly across remaining H2 sections
    
    IMPORTANT CONTENT STRUCTURE REQUIREMENTS:
    - DO NOT include the title as H1 in the content - the title will be handled separately by the platform
    - Start the content with the Table of Contents placement marker, followed by a paragraph break, then the introduction
    - Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <table>, etc.
    - Create at least 3-4 H2 sections for proper structure with descriptive, SEO-friendly headings
    - Make sure sections flow logically and coherently
    - Include all specified keywords naturally throughout the content (especially in headings and early paragraphs)
    - Include a meta description of 155-160 characters that includes at least 2 primary keywords
    - Format the introduction paragraph special: Make the first sentence bold with <strong> tags AND add <br> after each sentence in the intro paragraph
    - DO NOT generate content that compares competitor products or prices - focus solely on the features and benefits of our products
    
    CRITICAL MEDIA PLACEMENT INSTRUCTIONS - MUST FOLLOW EXACTLY:
    - Under the SECOND H2 heading ONLY, add: <!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->
    - Under EVERY OTHER H2 heading (after the video), add: <!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->
    - IMPORTANT: You MUST include at least 3-4 secondary image placement markers: <!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->
    - Place one marker under each major H2 section to ensure even distribution
    - These markers are REQUIRED for image functionality - do not skip them
    - Example structure:
      <h2>First Section</h2>
      <p>Content...</p>
      
      <h2>Second Section</h2>
      <p>Content...</p>
      <!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->
      
      <h2>Third Section</h2>
      <p>Content...</p>
      <!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->
      
      <h2>Fourth Section</h2>
      <p>Content...</p>  
      <!-- SECONDARY_IMAGE_PLACEMENT_MARKER -->
    
    TABLE OF CONTENTS REQUIREMENTS:
    - AUTOMATICALLY include a Table of Contents at the very beginning of the content
    - Add this TOC placement marker at the start: <!-- TABLE_OF_CONTENTS_PLACEMENT -->
    - IMPORTANT: After the TOC marker, add a blank line or proper paragraph break before starting the introduction
    - The system will automatically generate a TOC using all H2 headings in your content
    - CRITICAL: EVERY H2 heading MUST have a unique id attribute for navigation (e.g., <h2 id="benefits">Benefits</h2>)
    - Use descriptive, SEO-friendly id names based on the heading text (lowercase, hyphenated)
    - Examples: <h2 id="key-benefits">Key Benefits</h2>, <h2 id="how-it-works">How It Works</h2>, <h2 id="frequently-asked-questions">Frequently Asked Questions</h2>
    - Include an id="faq" on your FAQ section if present
    - The TOC will be styled with a clean, professional appearance and will improve user navigation
    - Ensure clean separation between TOC and the introduction paragraph
    - MANDATORY: Do not create any H2 heading without an id attribute - the TOC will fail without proper IDs
    
    FAQ SECTION FORMATTING (if FAQ is enabled):
    - Format all FAQ questions with "Q:" prefix (colon, not period)
    - Format all FAQ answers with "A:" prefix (colon, not period) 
    - Use proper HTML structure: <h3>Q: Question here?</h3><p>A: Answer here.</p>
    - Make FAQ section engaging and helpful for readers
    
    IMPORTANT IMAGE AND LINK GUIDELINES:
    - NEVER include direct image URLs or links to external websites like qualitywatertreatment.com, filterwater.com, or any other retailer sites
    - NEVER reference competitor websites or external commercial domains in any links or image sources
    - DO NOT include ANY external links except to trusted reference sites like .gov, .edu, or wikipedia.org
    - DO NOT include external images from third-party domains - the system will automatically insert optimized images
    - All images will be center-aligned and properly linked to product pages
    - Do not include any image placeholders or special markup except for the placement markers mentioned above
    - The system will handle image insertion automatically at the marked locations
    - Each image will include a caption with a link back to the relevant product to enhance SEO value
    
    Also suggest 5-7 relevant tags for the post, focusing on SEO value and search intent.`;
    
    // Add media information if provided from Choose Media step
    if (request.primaryImage || (request.secondaryImages && request.secondaryImages.length > 0) || request.youtubeEmbed) {
      promptText += `
      
      SELECTED MEDIA CONTEXT (from Choose Media step):`;
      
      if (request.primaryImage) {
        promptText += `
      
      PRIMARY/FEATURED IMAGE: "${request.primaryImage.alt}" (${request.primaryImage.url})
      - This will be used as the featured image at the top of the content
      - Reference this image context in your introduction to create cohesion`;
      }
      
      if (request.secondaryImages && request.secondaryImages.length > 0) {
        promptText += `
      
      SECONDARY IMAGES (${request.secondaryImages.length} selected):`;
        request.secondaryImages.forEach((img, index) => {
          promptText += `
      ${index + 1}. "${img.alt}" (${img.url})`;
        });
        promptText += `
      - These images will be placed under H2 headings after the video
      - Reference these images in your content to create natural flow`;
      }
      
      if (request.youtubeEmbed) {
        promptText += `
      
      YOUTUBE VIDEO: ${request.youtubeEmbed}
      - This video MUST be embedded under the SECOND H2 heading only
      - Use the marker: <!-- YOUTUBE_VIDEO_PLACEMENT_MARKER -->
      - Reference this video content in your structure to create natural integration`;
      }
      
      promptText += `
      
      IMPORTANT: Structure your content to naturally incorporate these selected media elements. Make sure the content flows logically with the media placements.`;
    }
    
    // Add custom prompt if provided
    if (request.customPrompt) {
      const customPromptFormatted = request.customPrompt.replace(/\[TOPIC\]/g, request.topic);
      promptText = `${promptText}
      
      IMPORTANT: Follow these specific instructions for the content:
      ${customPromptFormatted}
      
      The content must directly address these instructions while maintaining a ${toneStyle} tone and proper blog structure.`;
    }
    
    // Make API call to Claude with retry logic for overloaded errors
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 8000,
          system: request.contentStyleToneId 
            ? `Act as the selected copywriter: ${request.contentStyleDisplayName || toneStyle}. You are a professional content writer who specializes in writing in this specific style and tone. Embody the persona, writing patterns, and expertise of this copywriter type throughout the content creation.` 
            : undefined,
          messages: [
            {
              role: 'user',
              content: `${promptText}
          
          IMPORTANT: Return the response in JSON format with the following structure:
          {
            "title": "The title of the blog post",
            "content": "The complete HTML content of the blog post",
            "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
            "metaDescription": "A compelling meta description of 155-160 characters that summarizes the content with keywords"
          }
          
          Ensure the content is properly formatted with HTML tags. Do not include explanation of your process, just return the JSON.`
        }
      ],
    });
    
    // If successful, break out of retry loop
    break;
    
  } catch (error: any) {
    console.error(`Claude API attempt ${retryCount + 1} failed:`, error);
    
    // Check if this is a 529 overloaded error
    if (error.status === 529 && error.error?.error?.type === 'overloaded_error') {
      retryCount++;
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`Claude API overloaded (529), retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
    
    // If not overloaded error or max retries reached, throw the error
    throw error;
  }
}

if (!response) {
  throw new Error("Failed to get response from Claude API after all retries");
}
    
    // Extract and parse the JSON response
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
    
    console.log("Raw Claude response (first 500 chars):", responseText.substring(0, 500) + "...");
    
    // Try different strategies to extract valid JSON from Claude's response
    let jsonContent;
    
    try {
      // Strategy 1: Find the most complete JSON object in the response
      const jsonObjectRegex = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g;
      const jsonMatches = responseText.match(jsonObjectRegex);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Find the longest match, which is likely the complete JSON
        const longestMatch = jsonMatches.reduce((longest, current) => 
          current.length > longest.length ? current : longest, "");
        
        if (longestMatch) {
          console.log("Found JSON object match:", longestMatch.substring(0, 100) + "...");
          jsonContent = JSON.parse(longestMatch);
        }
      }
    } catch (jsonError: any) {
      console.log("Error parsing complete JSON object:", jsonError?.message || "Unknown error");
    }
    
    // Strategy 2: If strategy 1 fails, try to extract JSON by matching braces
    if (!jsonContent) {
      try {
        let braceCount = 0;
        let startIndex = -1;
        let jsonCandidate = "";
        
        // Find the opening brace
        startIndex = responseText.indexOf('{');
        
        if (startIndex >= 0) {
          for (let i = startIndex; i < responseText.length; i++) {
            jsonCandidate += responseText[i];
            
            if (responseText[i] === '{') braceCount++;
            if (responseText[i] === '}') braceCount--;
            
            // When braces are balanced, we've found a complete JSON object
            if (braceCount === 0 && jsonCandidate.length > 2) {
              console.log("Found balanced JSON via brace counting:", jsonCandidate.substring(0, 100) + "...");
              jsonContent = JSON.parse(jsonCandidate);
              break;
            }
          }
        }
      } catch (balancedError: any) {
        console.log("Error parsing balanced braces JSON:", balancedError?.message || "Unknown error");
      }
    }
    
    // Strategy 3: Manual extraction of key fields if JSON parsing fails
    if (!jsonContent) {
      console.log("Attempting manual extraction of content components...");
      
      // Extract title
      const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : "Blog Post";
      
      // Extract content - look for content field followed by a large HTML block
      const contentMatch = responseText.match(/"content"\s*:\s*"([\s\S]+?)(?:"\s*,\s*"|"\s*})/);
      let content = contentMatch ? contentMatch[1] : "";
      
      // Unescape content string
      content = content.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      
      // Extract tags
      const tagsMatch = responseText.match(/"tags"\s*:\s*\[([\s\S]+?)\]/);
      const tagsString = tagsMatch ? tagsMatch[1] : "";
      const tags = tagsString.split(',').map(tag => 
        tag.trim().replace(/^"|"$/g, '')
      ).filter(Boolean);
      
      // Extract meta description
      const metaMatch = responseText.match(/"metaDescription"\s*:\s*"([^"]+)"/);
      const metaDescription = metaMatch ? metaMatch[1] : "";
      
      jsonContent = {
        title,
        content,
        tags,
        metaDescription
      };
    }
    
    if (!jsonContent) {
      throw new Error("Failed to extract content from Claude response using all available methods");
    }
    
    // CRITICAL STEP-BY-STEP CONTENT PROCESSING
    console.log('🔧 STARTING COMPREHENSIVE CONTENT PROCESSING PIPELINE');
    
    // Store the original unprocessed content for the editor
    const unprocessedContent = removeH1Tags(jsonContent.content);
    console.log('📝 Content before final processing:', unprocessedContent.substring(0, 500) + '...');
    
    // Step 1: Remove H1 tags to prevent title duplication
    let processedContent = removeH1Tags(jsonContent.content);
    console.log('✅ Step 1: Removed H1 tags');
    
    // Step 2: Fix heading IDs BEFORE TOC generation (critical for duplicate ID fixes)
    processedContent = addHeadingIds(processedContent);
    console.log('✅ Step 2: Added/fixed heading IDs');
    
    // Step 3: Generate Table of Contents based on fixed headings
    processedContent = addTableOfContents(processedContent);
    console.log('✅ Step 3: Generated Table of Contents');
    
    // Step 4: Handle media placements
    processedContent = processMediaPlacementsHandler(processedContent, request);
    console.log('✅ Step 4: Processed media placements');
    
    // Step 5: Final TOC link fixes to remove target="_blank"
    processedContent = fixTOCLinks(processedContent);
    console.log('✅ Step 5: Fixed TOC links (removed target="_blank")');
    
    // CRITICAL FIX: Clean meta description to remove Table of Contents content
    let cleanMetaDescription = jsonContent.metaDescription || '';
    if (cleanMetaDescription) {
      // Remove any TOC-related content from meta description
      cleanMetaDescription = cleanMetaDescription
        .replace(/table of contents/gi, '')
        .replace(/toc/gi, '')
        .replace(/📋/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Ensure meta description is within 155-160 character limit
      if (cleanMetaDescription.length > 160) {
        cleanMetaDescription = cleanMetaDescription.substring(0, 157) + '...';
      }
      
      console.log(`✓ Cleaned meta description: "${cleanMetaDescription}"`);
    }
    
    console.log('🎉 CONTENT PROCESSING PIPELINE COMPLETED SUCCESSFULLY');

    return {
      title: jsonContent.title,
      content: processedContent,
      rawContent: unprocessedContent, // Add the unprocessed content for the editor
      tags: jsonContent.tags,
      metaDescription: cleanMetaDescription
    };
  } catch (error: any) {
    console.error("Error generating content with Claude:", error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'Unknown error during Claude content generation';
    throw new Error(`Failed to generate content with Claude: ${errorMessage}`);
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
      ],
    });
    
    // Extract response text
    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : JSON.stringify(response.content[0]);
    
    console.log("Claude raw response:", responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    // Parse the response based on format
    if (request.responseFormat === 'json') {
      try {
        // Find JSON content - handle any wrapping text Claude might add
        const jsonRegex = /\[[\s\S]*\]/;
        const match = responseText.match(jsonRegex);
        
        if (match) {
          console.log("Found JSON array in Claude response:", match[0]);
          const titles = JSON.parse(match[0]);
          return { titles };
        } else {
          console.log("No JSON array found, trying to parse entire response as JSON");
          // If no JSON array found, try to parse the entire response as JSON
          const jsonResponse = JSON.parse(responseText);
          if (Array.isArray(jsonResponse)) {
            console.log("Response is an array:", jsonResponse);
            return { titles: jsonResponse };
          } else if (jsonResponse.titles && Array.isArray(jsonResponse.titles)) {
            console.log("Response has titles property:", jsonResponse.titles);
            return { titles: jsonResponse.titles };
          } else {
            console.error("Unable to find titles array in JSON response:", jsonResponse);
          }
        }
      } catch (parseError) {
        console.error("Error parsing JSON from Claude response:", parseError);
        // Fall back to extracting titles from text
      }
    }
    
    // If parsing fails or format is not JSON, extract titles from text
    // Look for numbered lines, bullet points, or line breaks
    const lines = responseText.split(/[\n\r]+/);
    const titleCandidates = lines.filter(line => 
      line.trim().length > 10 && // Minimum reasonable title length
      !line.includes("Here are") && // Skip intro lines
      !line.includes("suggestions") &&
      !line.includes("titles") &&
      (
        /^\d+[\.\)]\s+/.test(line.trim()) || // numbered items
        /^[-*•]\s+/.test(line.trim()) || // bullet points
        /^["'].*["']$/.test(line.trim()) // quoted text
      )
    );
    
    // Clean up the titles
    const titles = titleCandidates.map(title => 
      title.replace(/^\d+[\.\)]\s+|^[-*•]\s+|^["']|["']$/g, '').trim()
    ).filter(title => title.length > 0);
    
    // Return at least some titles
    if (titles.length === 0) {
      // If we couldn't extract any titles, just return 5 lines that look like titles
      return { 
        titles: lines
          .filter(line => line.trim().length > 15 && line.trim().length < 100)
          .slice(0, 5)
          .map(line => line.trim())
      };
    }
    
    return { titles };
  } catch (error: any) {
    console.error("Error generating titles with Claude:", error);
    throw new Error(`Failed to generate titles with Claude: ${error.message || 'Unknown error'}`);
  }
}

// Test function to check if Claude API is working
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