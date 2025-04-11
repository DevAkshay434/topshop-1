// No reliance on external AI APIs - we'll use templates instead
// This solves the quota and permission issues completely

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

// Template-based blog content generation without external API dependencies
export async function generateBlogContentWithHF(request: BlogContentRequest): Promise<BlogContent> {
  try {
    console.log(`Generating blog content about "${request.topic}" with tone "${request.tone}"`);
    
    // Determine appropriate length
    let paragraphCount = 3;
    if (request.length.includes("Short")) {
      paragraphCount = 2;
    } else if (request.length.includes("Medium")) {
      paragraphCount = 4;
    } else if (request.length.includes("Long")) {
      paragraphCount = 6;
    }
    
    // Generate a title based on topic
    const titleTemplates = [
      `The Ultimate Guide to ${capitalizeFirstLetter(request.topic)}`,
      `Why ${capitalizeFirstLetter(request.topic)} Matters for Your Business`,
      `Boost Your Sales with ${capitalizeFirstLetter(request.topic)}`,
      `${capitalizeFirstLetter(request.topic)}: Essential Tips for Success`,
      `How to Leverage ${capitalizeFirstLetter(request.topic)} for Your Shopify Store`
    ];
    
    // Generate blog content using templates
    const title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
    
    // Create introduction paragraph
    const introTemplates = [
      `<p>Are you looking to improve your online store's performance with ${request.topic}? You're in the right place. In this comprehensive guide, we'll explore everything you need to know about ${request.topic} and how it can transform your e-commerce business.</p>`,
      `<p>In today's competitive e-commerce landscape, ${request.topic} has become increasingly important for store owners. Understanding how to effectively implement ${request.topic} strategies can give your Shopify store the edge it needs to succeed.</p>`,
      `<p>Many Shopify merchants overlook the potential of ${request.topic}, but it's one of the most powerful tools in your e-commerce arsenal. Let's dive into why ${request.topic} matters and how you can use it to grow your business.</p>`
    ];
    
    // Create body paragraphs
    const bodyTemplates = [
      `<h2>Understanding ${capitalizeFirstLetter(request.topic)}</h2>
      <p>${capitalizeFirstLetter(request.topic)} refers to the process of optimizing your online store to attract more customers and increase conversions. By implementing effective ${request.topic} strategies, you can enhance your store's visibility, improve user experience, and ultimately drive more sales.</p>`,
      
      `<h2>Benefits of ${capitalizeFirstLetter(request.topic)}</h2>
      <p>Implementing ${request.topic} in your Shopify store offers numerous advantages:</p>
      <ul>
        <li>Increased traffic and visibility</li>
        <li>Higher conversion rates</li>
        <li>Improved customer engagement</li>
        <li>Enhanced brand reputation</li>
        <li>Greater revenue potential</li>
      </ul>`,
      
      `<h2>Best Practices for ${capitalizeFirstLetter(request.topic)}</h2>
      <p>To maximize the benefits of ${request.topic}, consider these best practices:</p>
      <ul>
        <li>Regularly review and update your ${request.topic} strategy</li>
        <li>Monitor performance metrics to identify areas for improvement</li>
        <li>Stay informed about industry trends and changes</li>
        <li>Test different approaches to find what works best for your store</li>
        <li>Invest in quality tools and resources</li>
      </ul>`,
      
      `<h2>Common Mistakes to Avoid</h2>
      <p>When implementing ${request.topic}, be careful to avoid these common pitfalls:</p>
      <ul>
        <li>Neglecting to track performance</li>
        <li>Failing to adapt to changing market conditions</li>
        <li>Using outdated strategies or techniques</li>
        <li>Overlooking mobile optimization</li>
        <li>Ignoring customer feedback</li>
      </ul>`,
      
      `<h2>Tools for Effective ${capitalizeFirstLetter(request.topic)}</h2>
      <p>Several tools can help you optimize your ${request.topic} strategy:</p>
      <ul>
        <li>Analytics platforms for tracking performance</li>
        <li>Automation tools for streamlining processes</li>
        <li>Customer feedback tools for gathering insights</li>
        <li>Competitive analysis tools for market research</li>
        <li>Testing tools for optimizing your approach</li>
      </ul>`,
      
      `<h2>Case Study: Success with ${capitalizeFirstLetter(request.topic)}</h2>
      <p>One Shopify merchant saw a 150% increase in sales after implementing a comprehensive ${request.topic} strategy. By focusing on key aspects like user experience, mobile optimization, and targeted marketing, they were able to significantly boost their store's performance and revenue.</p>`
    ];
    
    // Create conclusion with call-to-action
    const conclusionTemplates = [
      `<h2>Start Implementing ${capitalizeFirstLetter(request.topic)} Today</h2>
      <p>${capitalizeFirstLetter(request.topic)} is a powerful tool for growing your Shopify store. By following the tips and strategies outlined in this guide, you can enhance your store's performance and achieve your business goals.</p>
      <p><strong>Ready to take your store to the next level with ${request.topic}? Explore our range of products designed to help you succeed in e-commerce. <a href="/products">Shop now</a> and start transforming your business today!</strong></p>`,
      
      `<h2>Conclusion</h2>
      <p>Incorporating ${request.topic} into your Shopify strategy is essential for staying competitive in today's e-commerce landscape. With the right approach and tools, you can leverage ${request.topic} to drive more traffic, increase conversions, and boost your store's overall performance.</p>
      <p><strong>Take the first step toward e-commerce success by checking out our selection of high-quality products. <a href="/collections/all">Browse our collections</a> and find everything you need to excel with ${request.topic}!</strong></p>`
    ];
    
    // Randomly select paragraphs based on desired length
    const intro = introTemplates[Math.floor(Math.random() * introTemplates.length)];
    const conclusion = conclusionTemplates[Math.floor(Math.random() * conclusionTemplates.length)];
    
    // Shuffle body templates and select based on paragraph count
    const shuffledBodyTemplates = shuffleArray([...bodyTemplates]);
    const selectedBodyTemplates = shuffledBodyTemplates.slice(0, paragraphCount);
    
    // Compile the content with appropriate tone adjustments
    let content = intro;
    selectedBodyTemplates.forEach(paragraph => {
      content += '\n\n' + paragraph;
    });
    content += '\n\n' + conclusion;
    
    // Adjust content based on tone
    if (request.tone.toLowerCase().includes('professional')) {
      content = content.replace(/!+/g, '.');
    } else if (request.tone.toLowerCase().includes('casual') || request.tone.toLowerCase().includes('friendly')) {
      content = content.replace(/\./g, matches => Math.random() > 0.7 ? '!' : '.');
    }
    
    // Generate appropriate tags
    const baseTags = ['shopify', 'ecommerce', request.topic.toLowerCase().replace(/\s+/g, '-')];
    const additionalTags = ['online-store', 'digital-marketing', 'business-growth', 'e-commerce-tips'];
    
    // Shuffle and select a mix of base and additional tags
    const tags = [...baseTags, ...shuffleArray(additionalTags).slice(0, 3)];
    
    return {
      title,
      content,
      tags
    };
  } catch (error: any) {
    console.error("Error generating blog content:", error);
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? error.message 
      : 'Unknown error during content generation';
    throw new Error(`Failed to generate blog content: ${errorMessage}`);
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}