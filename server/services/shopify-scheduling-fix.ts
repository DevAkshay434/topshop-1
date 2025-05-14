/**
 * Direct implementation of Shopify scheduling based on latest Admin API docs
 * https://shopify.dev/docs/api/admin-rest/2023-07/resources/article
 * 
 * The key insight is that we need to use Shopify's status field correctly:
 * - active: The article is active (published)
 * - draft: The article is a draft and not published
 * 
 * For scheduling, we need:
 * 1. status: 'draft'
 * 2. published_at: future date
 */

// Define the ShopifyStore type inline for our implementation
interface ShopifyStore {
  id: number;
  shopName: string;
  accessToken: string;
  scope: string;
  isConnected: boolean;
  defaultBlogId?: string;
}
import axios, { AxiosInstance } from "axios";

/**
 * Creates a scheduled article in Shopify using 2023-10 API version explicitly
 * which has better handling of scheduled content
 * @param store Shopify store details
 * @param blogId The blog ID to create the article in
 * @param title Article title
 * @param content Article HTML content
 * @param scheduledDate Future date when article should be published
 * @param tags Optional tags for the article
 * @param featuredImage Optional featured image URL
 */
export async function createScheduledArticle(
  store: ShopifyStore,
  blogId: string,
  title: string,
  content: string,
  scheduledDate: Date,
  tags: string = "",
  featuredImage?: string
): Promise<any> {
  try {
    // Create a specific client for 2023-10 API version (latest with better scheduling)
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Ensure date is in future
    const now = new Date();
    if (scheduledDate <= now) {
      // Set to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      scheduledDate = tomorrow;
      console.log(`Adjusted scheduled date to tomorrow 9 AM: ${scheduledDate.toISOString()}`);
    }

    // Make sure date is at least 2 hours in the future to avoid scheduling issues
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    if (scheduledDate < twoHoursFromNow) {
      scheduledDate = twoHoursFromNow;
      console.log(`Adjusted scheduled date to be at least 2 hours in future: ${scheduledDate.toISOString()}`);
    }

    // Build the article payload with explicit status=scheduled
    const article: any = {
      title: title,
      author: store.shopName,
      body_html: content,
      tags: tags,
      // Using explicit published=false and published_at in the future date
      // This is the most reliable way to schedule in recent Shopify API versions
      published: false,
      published_at: scheduledDate.toISOString()
    };

    if (featuredImage) {
      article.image = { src: featuredImage };
    }

    console.log(`Creating scheduled article with explicit API version 2023-10 (better scheduling):`, {
      title,
      published: article.published,
      published_at: article.published_at
    });

    // Make the API request
    const response = await client.post(`/blogs/${blogId}/articles.json`, { article });

    console.log(`Article created with schedule:`, {
      id: response.data.article.id,
      title: response.data.article.title,
      published: response.data.article.published,
      published_at: response.data.article.published_at
    });

    // Verify the publishing date matches what we expect
    if (response.data.article.published_at) {
      const responseDate = new Date(response.data.article.published_at);
      const sentDate = new Date(article.published_at);
      const timeDiffMinutes = Math.abs(responseDate.getTime() - sentDate.getTime()) / (60 * 1000);
      
      console.log(`Schedule verification: 
        - Sent date: ${sentDate.toISOString()}
        - Response date: ${responseDate.toISOString()}
        - Difference: ${Math.round(timeDiffMinutes)} minutes`);
      
      // If published immediately instead of scheduled, try to update it to scheduled
      if (response.data.article.published === true) {
        console.log("⚠️ WARNING: Article was published immediately, attempting to fix...");
        
        try {
          // Make a second request to update the article to be scheduled
          const updateResponse = await client.put(
            `/blogs/${blogId}/articles/${response.data.article.id}.json`, 
            { 
              article: {
                id: response.data.article.id,
                published: false,
                published_at: scheduledDate.toISOString()
              } 
            }
          );
          
          console.log("Article scheduling fix response:", {
            id: updateResponse.data.article.id,
            published: updateResponse.data.article.published,
            published_at: updateResponse.data.article.published_at
          });
          
          return updateResponse.data.article;
        } catch (updateError) {
          console.error("Failed to update article scheduling:", updateError);
        }
      }
    }

    return response.data.article;
  } catch (error: any) {
    console.error(`Error creating scheduled article:`, error);
    if (error.response) {
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to create scheduled article: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Creates a scheduled page in Shopify using 2023-10 API version explicitly
 * which has better handling of scheduled content
 * @param store Shopify store details 
 * @param title Page title
 * @param content Page HTML content
 * @param scheduledDate Future date when page should be published
 */
export async function createScheduledPage(
  store: ShopifyStore,
  title: string,
  content: string,
  scheduledDate: Date
): Promise<any> {
  try {
    // Create a specific client for 2023-10 API version (latest with better scheduling)
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Ensure date is in future
    const now = new Date();
    if (scheduledDate <= now) {
      // Set to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      scheduledDate = tomorrow;
      console.log(`Adjusted scheduled date to tomorrow 9 AM: ${scheduledDate.toISOString()}`);
    }
    
    // Make sure date is at least 2 hours in the future to avoid scheduling issues
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    if (scheduledDate < twoHoursFromNow) {
      scheduledDate = twoHoursFromNow;
      console.log(`Adjusted scheduled date to be at least 2 hours in future: ${scheduledDate.toISOString()}`);
    }

    // Build the page payload for scheduling
    const page: any = {
      title: title,
      body_html: content,
      published: false, // Must be false for scheduled pages
      published_at: scheduledDate.toISOString()
    };

    console.log(`Creating scheduled page with explicit API version 2023-10 (better scheduling):`, {
      title,
      published: page.published,
      published_at: page.published_at
    });

    // Make the API request
    const response = await client.post(`/pages.json`, { page });

    console.log(`Page created with schedule:`, {
      id: response.data.page.id,
      title: response.data.page.title,
      published: response.data.page.published,
      published_at: response.data.page.published_at
    });
    
    // Verify the publishing date matches what we expect
    if (response.data.page.published_at) {
      const responseDate = new Date(response.data.page.published_at);
      const sentDate = new Date(page.published_at);
      const timeDiffMinutes = Math.abs(responseDate.getTime() - sentDate.getTime()) / (60 * 1000);
      
      console.log(`Schedule verification: 
        - Sent date: ${sentDate.toISOString()}
        - Response date: ${responseDate.toISOString()}
        - Difference: ${Math.round(timeDiffMinutes)} minutes`);
      
      // If published immediately instead of scheduled, try to update it to scheduled
      if (response.data.page.published === true) {
        console.log("⚠️ WARNING: Page was published immediately, attempting to fix...");
        
        try {
          // Make a second request to update the page to be scheduled
          const updateResponse = await client.put(
            `/pages/${response.data.page.id}.json`, 
            { 
              page: {
                id: response.data.page.id,
                published: false,
                published_at: scheduledDate.toISOString()
              } 
            }
          );
          
          console.log("Page scheduling fix response:", {
            id: updateResponse.data.page.id,
            published: updateResponse.data.page.published,
            published_at: updateResponse.data.page.published_at
          });
          
          return updateResponse.data.page;
        } catch (updateError) {
          console.error("Failed to update page scheduling:", updateError);
        }
      }
    }

    return response.data.page;
  } catch (error: any) {
    console.error(`Error creating scheduled page:`, error);
    if (error.response) {
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to create scheduled page: ${error?.message || 'Unknown error'}`);
  }
}