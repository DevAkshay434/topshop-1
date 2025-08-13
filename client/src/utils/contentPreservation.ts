// Content preservation utilities to protect complex HTML from TipTap editor stripping

interface ProtectedElement {
  id: string;
  content: string;
  type: 'youtube' | 'table' | 'toc' | 'product-link' | 'styled-div';
}

// Generate unique placeholder IDs
function generatePlaceholderId(type: string): string {
  return `PROTECTED_${type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Extract and protect complex HTML elements before editing
export function protectComplexHTML(content: string): { cleanContent: string; protectedElements: ProtectedElement[] } {
  let cleanContent = content;
  const protectedElements: ProtectedElement[] = [];

  // Protect YouTube iframes
  const youtubeRegex = /<div[^>]*>\s*<iframe[^>]*youtube\.com[^>]*>[\s\S]*?<\/iframe>\s*<\/div>/gi;
  cleanContent = cleanContent.replace(youtubeRegex, (match) => {
    const id = generatePlaceholderId('youtube');
    protectedElements.push({
      id,
      content: match,
      type: 'youtube'
    });
    return `<p>🎥 YouTube Video (Protected) - ${id}</p>`;
  });

  // Protect Table of Contents
  const tocRegex = /<div[^>]*background-color:\s*#f9f9f9[^>]*>[\s\S]*?📋 Table of Contents[\s\S]*?<\/div>/gi;
  cleanContent = cleanContent.replace(tocRegex, (match) => {
    const id = generatePlaceholderId('toc');
    protectedElements.push({
      id,
      content: match,
      type: 'toc'
    });
    return `<p>📋 Table of Contents (Protected) - ${id}</p>`;
  });

  // Protect styled div containers with complex content
  const styledDivRegex = /<div[^>]*style="[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  cleanContent = cleanContent.replace(styledDivRegex, (match) => {
    // Only protect divs that contain complex styling
    if (match.includes('background-color') || match.includes('border-left') || match.includes('text-align: center')) {
      const id = generatePlaceholderId('styled_div');
      protectedElements.push({
        id,
        content: match,
        type: 'styled-div'
      });
      return `<p>🎨 Styled Content (Protected) - ${id}</p>`;
    }
    return match;
  });

  // Protect product-linked images (with data attributes)
  const productLinkRegex = /<a[^>]*data-product-[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/a>/gi;
  cleanContent = cleanContent.replace(productLinkRegex, (match) => {
    const id = generatePlaceholderId('product_link');
    protectedElements.push({
      id,
      content: match,
      type: 'product-link'
    });
    return `<p>🔗 Product Linked Image (Protected) - ${id}</p>`;
  });

  // Protect tables
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  cleanContent = cleanContent.replace(tableRegex, (match) => {
    const id = generatePlaceholderId('table');
    protectedElements.push({
      id,
      content: match,
      type: 'table'
    });
    return `<p>📊 Table (Protected) - ${id}</p>`;
  });

  console.log('🛡️ CONTENT PROTECTION:', {
    originalLength: content.length,
    cleanLength: cleanContent.length,
    protectedCount: protectedElements.length,
    protectedTypes: protectedElements.map(e => e.type)
  });

  return { cleanContent, protectedElements };
}

// Restore protected elements after editing
export function restoreComplexHTML(editedContent: string, protectedElements: ProtectedElement[]): string {
  let restoredContent = editedContent;

  // Restore each protected element
  protectedElements.forEach(({ id, content, type }) => {
    const placeholderRegex = new RegExp(`<p>(?:🎥|📋|🎨|🔗|📊)[^-]+ \\(Protected\\) - ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</p>`, 'gi');
    restoredContent = restoredContent.replace(placeholderRegex, content);
  });

  console.log('🔄 CONTENT RESTORATION:', {
    editedLength: editedContent.length,
    restoredLength: restoredContent.length,
    restoredCount: protectedElements.length
  });

  return restoredContent;
}

// Ensure heading IDs are preserved
export function preserveHeadingIds(content: string): string {
  // Add IDs to H2 headings that don't have them
  return content.replace(/<h2(?![^>]*id=)([^>]*)>(.*?)<\/h2>/gi, (match, attributes, title) => {
    const id = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `<h2${attributes} id="${id}">${title}</h2>`;
  });
}

// Remove target="_blank" from internal links
export function cleanInternalLinks(content: string): string {
  // Remove target="_blank" from links that start with #
  return content.replace(/<a([^>]*)href="#([^"]*)"([^>]*)target="_blank"([^>]*)>/gi, '<a$1href="#$2"$3$4>');
}