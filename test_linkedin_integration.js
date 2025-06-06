// Test script to verify LinkedIn integration fixes
import axios from 'axios';

async function testLinkedInIntegration() {
  try {
    console.log('Creating test page with LinkedIn integration...');
    
    const response = await axios.post('http://localhost:5000/api/posts', {
      title: 'LinkedIn Integration Verification Page',
      content: '<h2>Testing LinkedIn Integration</h2><p>This page tests the author box LinkedIn integration and anchor linking fixes.</p>',
      status: 'published',
      articleType: 'page',
      authorId: 6,
      metaTitle: 'LinkedIn Integration Test',
      metaDescription: 'Testing LinkedIn integration for author boxes'
    });
    
    console.log('Test page created:', response.data);
    
    if (response.data.success && response.data.shopifyUrl) {
      console.log('Page URL:', response.data.shopifyUrl);
      
      // Wait a moment for page to be available
      setTimeout(async () => {
        try {
          const pageResponse = await axios.get(response.data.shopifyUrl);
          const pageContent = pageResponse.data;
          
          // Check for LinkedIn integration
          const hasLearnMore = pageContent.includes('Learn More');
          const hasAuthorBox = pageContent.includes('author-box');
          const hasWrittenBy = pageContent.includes('Written by');
          const hasLinkedInUrl = pageContent.includes('linkedin.com');
          
          console.log('\nLinkedIn Integration Test Results:');
          console.log('- Has "Learn More" button:', hasLearnMore);
          console.log('- Has author-box ID:', hasAuthorBox);
          console.log('- Has "Written by" text:', hasWrittenBy);
          console.log('- Has LinkedIn URL:', hasLinkedInUrl);
          
          if (hasLearnMore && hasAuthorBox && hasWrittenBy && hasLinkedInUrl) {
            console.log('\n✅ LinkedIn integration test PASSED');
          } else {
            console.log('\n❌ LinkedIn integration test FAILED');
          }
        } catch (error) {
          console.error('Error fetching page content:', error.message);
        }
      }, 3000);
    }
  } catch (error) {
    console.error('Error creating test page:', error.message);
  }
}

testLinkedInIntegration();