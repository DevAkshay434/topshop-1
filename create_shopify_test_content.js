// Create test content directly in Shopify
const testBlogPostData = {
  article: {
    title: "TOC Test - Table of Contents Navigation Demo",
    author: "Testing",
    tags: "table-of-contents, navigation, test, demo",
    body_html: `
<div style="background-color: #f9f9f9; border-left: 4px solid #007bff; padding: 16px; margin: 24px 0; clear: both;">
  <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #333;">
    📋 Table of Contents
  </h3>
  <ol style="margin: 0; padding: 0 0 0 18px; list-style-type: decimal;">
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#understanding-toc-navigation" style="color: #007bff; text-decoration: underline;">Understanding TOC Navigation</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#how-toc-links-work" style="color: #007bff; text-decoration: underline;">How TOC Links Work</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#testing-same-page-navigation" style="color: #007bff; text-decoration: underline;">Testing Same-Page Navigation</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#conclusion-and-next-steps" style="color: #007bff; text-decoration: underline;">Conclusion and Next Steps</a></li>
  </ol>
</div>

<p><strong>Welcome to our Table of Contents navigation test!</strong><br>
This demo article will help you understand the difference between TOC navigation links (which stay on the same page) and external reference links (which open in new tabs).</p>

<h2 id="understanding-toc-navigation">Understanding TOC Navigation</h2>

<p>Table of Contents (TOC) navigation is designed to help readers quickly jump to specific sections within the same article or page. These links use anchor navigation to scroll smoothly to the corresponding section without leaving the current page.</p>

<p><strong>Key characteristics of TOC links:</strong></p>
<ul>
  <li>Use href="#section-id" format</li>
  <li>Do NOT have target="_blank" attributes</li>
  <li>Navigate within the same page</li>
  <li>Provide smooth scrolling to sections</li>
</ul>

<h2 id="how-toc-links-work">How TOC Links Work</h2>

<p>When you click a TOC link above, your browser automatically scrolls to the corresponding H2 heading that has the matching id attribute. This creates a seamless reading experience that keeps you on the same page while providing easy navigation.</p>

<p><strong>Technical implementation:</strong></p>
<ul>
  <li>Each H2 heading receives a unique id attribute</li>
  <li>TOC links reference these ids using href="#id-name"</li>
  <li>No page reload or new tab opening occurs</li>
  <li>The URL updates to show the current section</li>
</ul>

<h2 id="testing-same-page-navigation">Testing Same-Page Navigation</h2>

<p>To test the TOC navigation on this page:</p>

<ol>
  <li>Scroll back to the Table of Contents section at the top</li>
  <li>Click on any of the numbered TOC links</li>
  <li>Notice how you stay on the same page and smoothly scroll to the section</li>
  <li>Check your browser address bar - it shows the section anchor</li>
</ol>

<p><strong>What you should observe:</strong></p>
<ul>
  <li>Smooth scrolling to the target section</li>
  <li>No new tabs or windows opening</li>
  <li>URL updates to include the section anchor</li>
  <li>You remain on the same page throughout</li>
</ul>

<h2 id="conclusion-and-next-steps">Conclusion and Next Steps</h2>

<p>This test demonstrates that TOC navigation works correctly for same-page navigation. The links in the Table of Contents section will take you to the corresponding sections without opening new tabs or leaving the current page.</p>

<p><strong>Remember the distinction:</strong></p>
<ul>
  <li><strong>TOC Links:</strong> Navigate within the same page (no target="_blank")</li>
  <li><strong>External Reference Links:</strong> Open in new tabs (have target="_blank")</li>
</ul>

<p>Both behaviors are correct and serve different purposes. TOC links help with internal navigation, while external links preserve your place in the current article.</p>

<p><em>This test content was created specifically to demonstrate Table of Contents functionality in Shopify.</em></p>
`,
    summary: "Test article demonstrating Table of Contents navigation functionality with same-page anchor links in Shopify.",
    published: true
  }
};

const testPageData = {
  page: {
    title: "TOC Test Page - Navigation Demo",
    body_html: `
<div style="background-color: #f9f9f9; border-left: 4px solid #007bff; padding: 16px; margin: 24px 0; clear: both;">
  <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #333;">
    📋 Table of Contents
  </h3>
  <ol style="margin: 0; padding: 0 0 0 18px; list-style-type: decimal;">
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#page-navigation-basics" style="color: #007bff; text-decoration: underline;">Page Navigation Basics</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#shopify-page-toc-testing" style="color: #007bff; text-decoration: underline;">Shopify Page TOC Testing</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#comparison-with-blog-posts" style="color: #007bff; text-decoration: underline;">Comparison with Blog Posts</a></li>
    <li style="margin: 6px 0; line-height: 1.4;"><a href="#final-verification" style="color: #007bff; text-decoration: underline;">Final Verification</a></li>
  </ol>
</div>

<p><strong>This is a test Shopify page to verify TOC navigation functionality.</strong><br>
Both Shopify pages and blog posts should have identical TOC behavior for same-page navigation.</p>

<h2 id="page-navigation-basics">Page Navigation Basics</h2>

<p>Shopify pages handle Table of Contents navigation the same way as blog posts. The anchor links should provide smooth scrolling to the corresponding sections without opening new tabs or windows.</p>

<p>This ensures consistent user experience across all content types in your Shopify store.</p>

<h2 id="shopify-page-toc-testing">Shopify Page TOC Testing</h2>

<p>Test the TOC functionality by clicking the links in the Table of Contents section above. Each link should:</p>

<ul>
  <li>Scroll smoothly to the corresponding section</li>
  <li>Update the URL to include the anchor</li>
  <li>Keep you on the same page</li>
  <li>Not open any new tabs or windows</li>
</ul>

<h2 id="comparison-with-blog-posts">Comparison with Blog Posts</h2>

<p>The TOC functionality works identically in both Shopify pages and blog posts:</p>

<ul>
  <li>Same HTML structure for TOC sections</li>
  <li>Identical anchor link behavior</li>
  <li>Same smooth scrolling experience</li>
  <li>Consistent URL anchor updates</li>
</ul>

<h2 id="final-verification">Final Verification</h2>

<p>If you can successfully navigate between sections using the TOC links above, then the Table of Contents functionality is working correctly for Shopify pages.</p>

<p>Compare this experience with the blog post test to confirm both content types behave identically.</p>

<p><em>Test page created to verify TOC navigation in Shopify pages.</em></p>
`,
    summary_description: "Test page demonstrating Table of Contents navigation functionality in Shopify pages.",
    published: true
  }
};

console.log("Test data ready for Shopify API calls");