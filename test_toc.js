// Test script to verify Table of Contents processing
const fs = require('fs');

// Mock content that Claude might generate (without proper IDs)
const mockClaudeContent = `
<!-- TABLE_OF_CONTENTS_PLACEMENT -->

<p><strong>Clean water is essential for every home.</strong><br>Many families struggle with contaminated water sources.<br>This guide will help you find the perfect water filtration system.</p>

<h2>Understanding Water Contamination</h2>
<p>Water contamination affects millions of households worldwide...</p>

<h2>Types of Water Filters</h2>
<p>There are several types of water filters available...</p>

<h2>Installation and Maintenance</h2>
<p>Proper installation is crucial for optimal performance...</p>

<h2>Cost Considerations</h2>
<p>Budget planning for water filtration systems...</p>
`;

// Function to add id attributes to H2 headings that don't have them
function addHeadingIds(content) {
  console.log('🔧 HEADING ID PROCESSING STARTED');
  let processedContent = content;
  let addedIds = 0;
  
  const h2WithoutIdRegex = /<h2(?![^>]*id=)([^>]*)>(.*?)<\/h2>/gi;
  
  processedContent = processedContent.replace(h2WithoutIdRegex, (match, attributes, title) => {
    const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
    const id = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    addedIds++;
    console.log(`   - Added id="${id}" to H2: "${cleanTitle}"`);
    return `<h2${attributes} id="${id}">${title}</h2>`;
  });
  
  console.log(`✅ HEADING ID PROCESSING COMPLETED: Added ${addedIds} IDs to H2 headings`);
  return processedContent;
}

// Function to generate Table of Contents
function addTableOfContents(content) {
  console.log('🔍 TABLE OF CONTENTS PROCESSING STARTED');
  console.log(`   - Content length: ${content.length} characters`);
  console.log(`   - Has TOC marker: ${content.includes('<!-- TABLE_OF_CONTENTS_PLACEMENT -->')}`);
  
  if (!content.includes('<!-- TABLE_OF_CONTENTS_PLACEMENT -->')) {
    console.log('❌ No TOC placement marker found - returning content as-is');
    return content;
  }
  
  let processedContent = addHeadingIds(content);
  console.log('✅ Added missing heading IDs to H2 elements');
  
  const h2Regex = /<h2[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h2>/gi;
  const headings = [];
  let match;
  
  while ((match = h2Regex.exec(processedContent)) !== null) {
    const id = match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    headings.push({ id, title });
    console.log(`   - Found H2 heading: "${title}" with id="${id}"`);
  }
  
  h2Regex.lastIndex = 0;
  
  console.log(`📊 TOC STATISTICS: Found ${headings.length} H2 headings with IDs`);
  
  if (headings.length === 0) {
    console.log('⚠️ No H2 headings with IDs found - removing TOC marker');
    return processedContent.replace('<!-- TABLE_OF_CONTENTS_PLACEMENT -->', '');
  }
  
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
  
  const finalContent = processedContent.replace(/<!-- TABLE_OF_CONTENTS_PLACEMENT -->\s*(<p>|<[^>]+>)/i, tocHtml + '\n\n$1')
                .replace('<!-- TABLE_OF_CONTENTS_PLACEMENT -->', tocHtml);
  
  console.log('✅ TABLE OF CONTENTS PROCESSING COMPLETED');
  console.log(`   - Final content length: ${finalContent.length} characters`);
  
  return finalContent;
}

// Test the processing
console.log('=== TESTING TABLE OF CONTENTS PROCESSING ===\n');
const result = addTableOfContents(mockClaudeContent);

console.log('\n=== FINAL RESULT ANALYSIS ===');
console.log('📋 Checking for TOC links without target="_blank":');
const tocLinks = result.match(/<a href="#[^"]*"[^>]*>/g) || [];
tocLinks.forEach(link => {
  if (link.includes('target="_blank"')) {
    console.log(`❌ Found target="_blank" in TOC link: ${link}`);
  } else {
    console.log(`✅ TOC link OK (no target="_blank"): ${link.substring(0, 50)}...`);
  }
});

console.log('\n📋 Checking H2 headings have IDs:');
const h2WithIds = result.match(/<h2[^>]*id=["'][^"']+["'][^>]*>/g) || [];
const h2WithoutIds = result.match(/<h2(?![^>]*id=)[^>]*>/g) || [];
console.log(`✅ H2 headings WITH IDs: ${h2WithIds.length}`);
console.log(`❌ H2 headings WITHOUT IDs: ${h2WithoutIds.length}`);

if (h2WithoutIds.length === 0 && tocLinks.length > 0) {
  console.log('\n🎉 SUCCESS: Table of Contents processing is working correctly!');
} else {
  console.log('\n❌ ISSUES FOUND in Table of Contents processing');
}
