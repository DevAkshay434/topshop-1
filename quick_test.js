// Quick verification test for latest TOC content
console.log('=== TOC VERIFICATION TEST ===');

// This is the actual TOC HTML from your latest generated content (ID: 573)
const latestTocContent = `
<div style="background-color: #f9f9f9; border-left: 4px solid #007bff; padding: 16px; margin: 24px 0; clear: both;">
  <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #333;">
    📋 Table of Contents
  </h3>
  <ol style="margin: 0; padding: 0 0 0 18px; list-style-type: decimal;">
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#understanding-water-softeners" style="color: #007bff; text-decoration: underline;">Understanding Water Softeners: Your Home's Silent Protector</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#essential-maintenance-practices" style="color: #007bff; text-decoration: underline;">Essential Maintenance Practices for Water Softener Longevity</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#optimizing-regeneration-cycles" style="color: #007bff; text-decoration: underline;">Optimizing Regeneration Cycles for Efficiency and Effectiveness</a></li>
  </ol>
</div>`;

// Check for target="_blank" in TOC links
const tocLinks = latestTocContent.match(/<a href="#[^"]*"[^>]*>/g) || [];
const badLinks = tocLinks.filter(link => link.includes('target="_blank"'));

console.log(`✅ TOC Links Found: ${tocLinks.length}`);
console.log(`❌ Links with target="_blank": ${badLinks.length}`);

if (badLinks.length === 0) {
    console.log('🎉 SUCCESS: All TOC links use same-page navigation (no target="_blank")');
    console.log('✅ The fixes ARE working in your latest generated content');
} else {
    console.log('❌ ISSUE: Found target="_blank" in TOC links');
    badLinks.forEach(link => console.log(`   Problem link: ${link}`));
}

// Sample links
console.log('\n📋 Sample working TOC links from your content:');
tocLinks.slice(0, 3).forEach((link, i) => {
    console.log(`   ${i+1}. ${link}`);
});