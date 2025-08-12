# TOC Test Content - Manual Creation Instructions

Since the automated creation is having API issues, here are the exact steps to manually create test content in your Shopify admin:

## Step 1: Create Test Blog Post

1. Go to your Shopify admin: `rajeshshah.myshopify.com/admin`
2. Navigate to **Online Store > Blog Posts**
3. Click **Add blog post**
4. Fill in these details:
   - **Title**: `TOC Test - Table of Contents Navigation Demo`
   - **Content**: Copy the HTML from `test_toc_content.html` (everything between the `<div style="background-color: #f9f9f9...` and the final `</p>`)
   - **Search engine listing preview**: `Test article demonstrating Table of Contents navigation functionality with same-page anchor links in Shopify.`
   - **Tags**: `table-of-contents, navigation, test, demo`
5. Click **Save**
6. Test the TOC links in the published blog post

## Step 2: Create Test Page

1. In Shopify admin, go to **Online Store > Pages**
2. Click **Add page**
3. Fill in these details:
   - **Title**: `TOC Test Page - Navigation Demo`
   - **Content**: Use the page-specific HTML content (modified headings):
     ```html
     <div style="background-color: #f9f9f9; border-left: 4px solid #007bff; padding: 16px; margin: 24px 0; clear: both;">
       <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #333;">📋 Table of Contents</h3>
       <ol style="margin: 0; padding: 0 0 0 18px; list-style-type: decimal;">
         <li style="margin: 6px 0; line-height: 1.4;"><a href="#page-navigation-basics" style="color: #007bff; text-decoration: underline;">Page Navigation Basics</a></li>
         <li style="margin: 6px 0; line-height: 1.4;"><a href="#shopify-page-toc-testing" style="color: #007bff; text-decoration: underline;">Shopify Page TOC Testing</a></li>
         <li style="margin: 6px 0; line-height: 1.4;"><a href="#comparison-with-blog-posts" style="color: #007bff; text-decoration: underline;">Comparison with Blog Posts</a></li>
         <li style="margin: 6px 0; line-height: 1.4;"><a href="#final-verification" style="color: #007bff; text-decoration: underline;">Final Verification</a></li>
       </ol>
     </div>
     
     <p><strong>This is a test Shopify page to verify TOC navigation functionality.</strong><br>Both Shopify pages and blog posts should have identical TOC behavior for same-page navigation.</p>
     
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
     ```
   - **Search engine listing preview**: `Test page demonstrating Table of Contents navigation functionality in Shopify pages.`
4. Click **Save**
5. Test the TOC links in the published page

## Step 3: Testing Instructions

After creating both pieces of content:

### Test the Blog Post:
1. Visit your blog post URL
2. Click ONLY on the TOC links (in the blue table of contents box)
3. Verify each link scrolls to the correct section on the same page
4. Note that the URL updates with the anchor (e.g., `#understanding-toc-navigation`)

### Test the Page:
1. Visit your page URL
2. Click ONLY on the TOC links (in the blue table of contents box)  
3. Verify each link scrolls to the correct section on the same page
4. Note that the URL updates with the anchor (e.g., `#page-navigation-basics`)

## Expected Results:
- ✅ TOC links stay on the same page
- ✅ Smooth scrolling to sections
- ✅ URL updates with anchor links
- ✅ No new tabs or windows opening
- ✅ Identical behavior in both blog posts and pages

## Note About External Links:
If you see any external reference links (like to USGS, Wikipedia, etc.) in other content, those are supposed to open in new tabs. The TOC links specifically should stay on the same page.

This test will definitively prove that the TOC navigation works correctly for both content types in Shopify.