import Anthropic from '@anthropic-ai/sdk';
import { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY as string
});

// Template for cluster content generation
const CLUSTER_PROMPT_TEMPLATE = `
You are a top-tier SEO content strategist and AI writing assistant.

Generate a full **content cluster** based on the topic: **{topic}** with a tone of voice: **{tone}** and introduction style: **{introStyle}**. Write from the **{writingPerspective}** point of view. The target audience is: **{buyerProfile}**. All content must reflect the writing style, tone, and structure of the selected copywriter: **{copywriter}**.

---

Each cluster must include:

### 🔷 STRUCTURE:
1. **Main Pillar Article**:
   - Acts as the central guide on the topic
   - Must include broad coverage, with deep internal linking to sub-articles
   - Include a Table of Contents and summary

2. **5-7 Sub-Topic Articles (Cluster Articles)**:
   - Each article must focus on one aspect or question related to the main topic
   - Follow SEO blog structure (title, intro, H2s, H3s, conclusion)
   - Interlink articles within the cluster (use anchor text naturally)
   - All articles must include an SEO-optimized meta description (155–160 characters with primary keywords)

---

### 🔷 FORMATTING & CONTENT RULES:
- Use proper HTML tags: \`<h2>\`, \`<h3>\`, \`<p>\`, \`<ul>\`, \`<li>\`, \`<table>\`, \`<strong>\`, etc.
- Each article should contain **{numberOfH2Headings} H2 sections**.
- Add **lists, bullet points**, and **tables** where relevant to improve readability.
- Use **bold formatting** with \`<strong>\` for key phrases and intro sentences.
- Include **citations** only from trusted sources: **.gov, .edu, Wikipedia** (no commercial links).
- Use a \`<iframe>\` embed for **one relevant YouTube video** per article.
- Insert placeholders for a **featured image** and **content images**.
  - **Content images must be linked** to the selected product (image link anchor: "View Product")
  - Position featured image at the top; inline images should match paragraph context.
- Include an **FAQ section** at the end of each article using a {faqStyle} format.
- Add a clear **conclusion** with a call-to-action (CTA) tailored to the audience's intent.
- Incorporate **author info** in the footer using:
  - Author: **{copywriter}** (Copywriter profile style: {style}, Tone: {tone}, Gender: {gender})
  - Writing perspective: **{writingPerspective}**

---

### 🔷 ARTICLE LENGTH:
- Pillar article: **{articleLengthPillar}**
- Sub-topic articles: **{articleLengthCluster}**

---

### 🔷 OUTPUT FORMAT:
Return all cluster articles as a **list of objects** in valid JSON format:
\`\`\`json
[
  {
    "title": "Title of Article",
    "metaDescription": "SEO meta description",
    "content": "<html-formatted content including TOC, H2s, lists, images, tables, FAQs, embedded video, author info, and CTA>",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  }
]
\`\`\`
`;

// Template for single post content generation
const SINGLE_POST_PROMPT_TEMPLATE = `
You are a professional SEO content writer trained in high-converting blog frameworks.

Generate a well-structured, SEO-optimized blog post about **{topic}** in a **{tone}** tone, from a **{writingPerspective}** perspective, and following the writing style and tone of copywriter **{copywriter}** (Style: {style}, Gender: {gender}).

---

### ✍️ ARTICLE STRUCTURE & FORMAT REQUIREMENTS:

#### 1. **Title**
- A compelling, keyword-optimized title for SEO and click-throughs.
- Should contain the **main keyword(s)** and clearly reflect the content.

#### 2. **Meta Description**
- 155–160 characters
- Must include at least two primary keywords
- Persuasive and action-oriented

#### 3. **Introduction**
- First sentence bold using \`<strong>\` tags
- Add \`<br>\` after each sentence in the intro paragraph
- Intro must hook the reader and introduce the problem or benefit

#### 4. **Body Sections**
Structure with clear **H2 headings** (number: {numberOfH2Headings}) and **H3 subheadings**:
- Use \`<h2>\` for each section
- Use \`<h3>\` for sub-points within those sections
- Write 2–4 paragraphs per section

Include:
- **Lists & Bullet Points** using \`<ul>\` and \`<li>\` tags when appropriate
- **Tables** (if {includeTables} is true) for comparison or data
- **Bold important phrases** throughout using \`<strong>\`
- Interlink product images: "<a href='[productURL]'><img src='[image-placeholder]' alt='Product'></a>"

#### 5. **Multimedia**
- Insert placeholder for a **YouTube video iframe**: \`<iframe src="YOUTUBE_URL" ... ></iframe>\`
- Use a **Featured Image** placeholder at the top of the article
- Insert **Content Images** in relevant sections, linking them to product pages

#### 6. **FAQs**
- Add an FAQ section at the bottom with 3–5 questions
- Use the style: **{faqStyle}**
- Format each question with \`<h3>\` and answer in \`<p>\`

#### 7. **Conclusion**
- Summarize key takeaways
- End with a **strong call to action** appropriate for the buyer intent

#### 8. **Author Info Block**
- Include author profile summary at the end:
  - Name: {copywriter}
  - Tone: {tone}
  - Perspective: {writingPerspective}
  - Style Category: {style}

---

### ✅ TECHNICAL FORMATTING RULES:
- Use only proper HTML tags: \`<h2>\`, \`<h3>\`, \`<p>\`, \`<ul>\`, \`<li>\`, \`<strong>\`, \`<table>\`, \`<iframe>\`, \`<img>\`
- DO NOT use \`<h1>\` (reserved for blog title)
- DO NOT link to competitor sites or use external images
- DO NOT include any external links except to \`.gov\`, \`.edu\`, or \`wikipedia.org\` for citations
- DO NOT hardcode image URLs – use placeholders instead

---

### 📦 Additional Context:
- **Target Buyer Profile**: {buyerProfile}
- **Include Tables**: {includeTables}
- **Include Lists & Bullets**: {includeLists}
- **Include H1**: false
- **Use Bold Formatting**: true
- **Include Citations**: {includeCitations}
- **Featured Image Placeholder**: Yes
- **Content Images (interlinked to products)**: Yes

---

### 📌 Tags:
Provide 5–7 relevant, SEO-optimized **tags** based on:
- Primary keyword intent
- Subtopics
- Product use cases
- Audience pain points

Output in valid JSON format:
\`\`\`json
{
  "title": "SEO optimized title",
  "metaDescription": "155-160 character meta description with keywords",
  "content": "Full HTML content with proper tags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
\`\`\`
`;

/**
 * Generate cluster content using Claude AI
 */
export async function generateClusterContent(request: any) {
  try {
    // Fill in template values
    const prompt = CLUSTER_PROMPT_TEMPLATE
      .replace('{topic}', request.topic || '')
      .replace('{tone}', request.options?.toneOfVoice || 'professional')
      .replace('{introStyle}', request.options?.introStyle || 'problem-focused')
      .replace('{writingPerspective}', request.options?.writingPerspective || 'neutral')
      .replace('{buyerProfile}', request.options?.buyerProfile || 'homeowners')
      .replace('{copywriter}', request.options?.copywriter || 'Expert Content Writer')
      .replace('{numberOfH2Headings}', request.options?.numH2s?.toString() || '5')
      .replace('{faqStyle}', request.options?.faqStyle || 'detailed')
      .replace('{style}', request.options?.style || 'authoritative')
      .replace('{gender}', request.options?.gender || 'neutral')
      .replace('{articleLengthPillar}', getArticleLengthDescription(request.options?.articleLength || 'medium', true))
      .replace('{articleLengthCluster}', getArticleLengthDescription(request.options?.articleLength || 'medium', false));

    // Make request to Claude
    console.log('Calling Claude API for cluster content generation...');
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 100000,
      temperature: 0.7,
      messages: [
        { role: 'user', content: prompt }
      ],
      system: 'You are a professional SEO content writer specializing in e-commerce and product marketing. You create detailed, well-structured content with proper HTML formatting. Always respond with valid JSON that can be parsed directly.'
    });

    // Extract and parse the JSON content
    const content = response.content[0].text;
    console.log('Raw Claude cluster response (first 200 chars):', content.substring(0, 200));
    
    // Try to find and extract JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonContent = '';
    
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1].trim();
      console.log('Found JSON object pattern');
    } else {
      // If no JSON block found, try to use the whole response
      jsonContent = content.trim();
      console.log('No JSON block found, using full response');
    }
    
    console.log('Cleaned Claude response for parsing (first 100 chars):', jsonContent.substring(0, 100));
    
    try {
      // Try to parse the JSON
      const articles = JSON.parse(jsonContent);
      
      // Return the result
      return {
        success: true,
        cluster: {
          mainTopic: request.topic,
          subtopics: articles
        }
      };
    } catch (parseError) {
      console.error('Failed to parse JSON from Claude:', parseError);
      
      // Attempt to fix common JSON syntax errors
      console.log('Attempting to fix JSON syntax errors...');
      
      try {
        // Replace any non-valid JSON quotes or syntax issues
        const fixedJson = jsonContent
          .replace(/([''])/g, '"')          // Replace single quotes with double quotes
          .replace(/(\w+):/g, '"$1":')      // Add quotes to keys
          .replace(/,\s*}/g, '}')           // Remove trailing commas
          .replace(/,\s*]/g, ']');          // Remove trailing commas in arrays
          
        const articles = JSON.parse(fixedJson);
        return {
          success: true,
          cluster: {
            mainTopic: request.topic,
            subtopics: articles
          }
        };
      } catch (fixError) {
        console.error('Failed to fix JSON syntax:', fixError);
        
        // Manual extraction as fallback
        console.log('Attempting manual extraction of topic data');
        
        // Attempt very basic extraction of articles by splitting on something that might separate them
        const articleMatches = content.split(/(?:Article|Subtopic)\s+\d+:/i);
        
        if (articleMatches.length > 1) {
          // Create minimal article objects
          const manuallyExtractedArticles = articleMatches.slice(1).map((article, index) => {
            // Try to extract title
            const titleMatch = article.match(/(?:Title|#)[:\s]*([^\n]+)/i);
            const title = titleMatch ? titleMatch[1].trim() : `Article ${index + 1}`;
            
            // Try to extract some content
            const contentSample = article.replace(/(?:Title|Meta|Tags)[:\s]*[^\n]+/gi, '').trim();
            
            return {
              id: `manual-extract-${Date.now()}-${index}`,
              title: title,
              content: contentSample.substring(0, 5000), // Limit content length
              tags: [`topic-${index + 1}`, request.topic],
            };
          });
          
          console.log(`Manually extracted ${manuallyExtractedArticles.length} articles`);
          
          return {
            success: true,
            cluster: {
              mainTopic: request.topic,
              subtopics: manuallyExtractedArticles
            }
          };
        }
        
        // If all extraction attempts fail
        throw new Error('Failed to parse content from Claude API. Response format not recognized.');
      }
    }
  } catch (error) {
    console.error('Error generating cluster content with Claude:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate content with Claude AI'
    };
  }
}

/**
 * Generate single post content using Claude AI
 */
export async function generateSinglePostContent(request: any) {
  try {
    // Fill in template values
    const prompt = SINGLE_POST_PROMPT_TEMPLATE
      .replace('{topic}', request.topic || '')
      .replace('{tone}', request.options?.toneOfVoice || 'professional')
      .replace('{writingPerspective}', request.options?.writingPerspective || 'neutral')
      .replace('{copywriter}', request.options?.copywriter || 'Expert Content Writer')
      .replace('{style}', request.options?.style || 'authoritative')
      .replace('{gender}', request.options?.gender || 'neutral')
      .replace('{numberOfH2Headings}', request.options?.numH2s?.toString() || '5')
      .replace('{includeTables}', (request.options?.enableTables ? 'true' : 'false'))
      .replace('{includeLists}', (request.options?.enableLists ? 'true' : 'false'))
      .replace('{includeCitations}', (request.options?.enableCitations ? 'true' : 'false'))
      .replace('{faqStyle}', request.options?.faqStyle || 'detailed')
      .replace('{buyerProfile}', request.options?.buyerProfile || 'homeowners');

    // Make request to Claude
    console.log('Calling Claude API for single post content generation...');
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 40000,
      temperature: 0.7,
      messages: [
        { role: 'user', content: prompt }
      ],
      system: 'You are a professional SEO content writer specializing in e-commerce and product marketing. You create detailed, well-structured content with proper HTML formatting. Always respond with valid JSON that can be parsed directly.'
    });

    // Extract and parse the JSON content
    const content = response.content[0].text;
    console.log('Raw Claude single post response (first 200 chars):', content.substring(0, 200));
    
    // Try to find and extract JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonContent = '';
    
    if (jsonMatch && jsonMatch[1]) {
      jsonContent = jsonMatch[1].trim();
      console.log('Found JSON object pattern');
    } else {
      // If no JSON block found, try to use the whole response
      jsonContent = content.trim();
      console.log('No JSON block found, using full response');
    }
    
    console.log('Cleaned Claude response for parsing (first 100 chars):', jsonContent.substring(0, 100));
    
    try {
      // Try to parse the JSON
      const article = JSON.parse(jsonContent);
      
      // Return the result
      return {
        success: true,
        article
      };
    } catch (parseError) {
      console.error('Failed to parse JSON from Claude:', parseError);
      
      // Attempt to fix common JSON syntax errors
      console.log('Attempting to fix JSON syntax errors...');
      
      try {
        // Replace any non-valid JSON quotes or syntax issues
        const fixedJson = jsonContent
          .replace(/([''])/g, '"')          // Replace single quotes with double quotes
          .replace(/(\w+):/g, '"$1":')      // Add quotes to keys
          .replace(/,\s*}/g, '}')           // Remove trailing commas
          .replace(/,\s*]/g, ']');          // Remove trailing commas in arrays
          
        const article = JSON.parse(fixedJson);
        return {
          success: true,
          article
        };
      } catch (fixError) {
        console.error('Failed to fix JSON syntax:', fixError);
        
        // Manual extraction as fallback
        console.log('Attempting manual extraction of article data');
        
        // Try to extract title
        const titleMatch = content.match(/(?:Title|#)[:\s]*([^\n]+)/i);
        const title = titleMatch ? titleMatch[1].trim() : request.topic;
        
        // Try to extract content (everything that's not clearly metadata)
        const contentSample = content
          .replace(/(?:Title|Meta Description|Tags)[:\s]*[^\n]+/gi, '')
          .replace(/```json[\s\S]*?```/g, '') // Remove JSON blocks
          .trim();
        
        // Create a minimal article object
        const manualArticle = {
          id: `manual-extract-${Date.now()}`,
          title: title,
          content: contentSample.substring(0, 20000), // Limit content length
          tags: [request.topic],
        };
        
        console.log('Manually extracted article data');
        
        return {
          success: true,
          article: manualArticle
        };
      }
    }
  } catch (error) {
    console.error('Error generating single post content with Claude:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate content with Claude AI'
    };
  }
}

/**
 * Helper function to convert article length to word count description
 */
function getArticleLengthDescription(length: string, isPillar: boolean): string {
  if (isPillar) {
    // Pillar articles are longer
    switch (length) {
      case 'short': return '1500-2000 words';
      case 'medium': return '2500-3000 words';
      case 'long': return '3500-4500 words';
      default: return '2500-3000 words';
    }
  } else {
    // Regular cluster articles
    switch (length) {
      case 'short': return '800-1000 words';
      case 'medium': return '1200-1500 words';
      case 'long': return '1800-2500 words';
      default: return '1200-1500 words';
    }
  }
}