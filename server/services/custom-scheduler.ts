/**
 * Custom Content Scheduler Service
 * 
 * This service implements a custom scheduling solution that works around Shopify's API limitations.
 * The approach is:
 * 1. Create content as draft (published=false, published_at=null)
 * 2. Store scheduling information in our own database
 * 3. Check for content that needs to be published periodically
 * 4. When the time comes, publish the content via API update
 */

import { ShopifyStore } from "../types/shopify";
import axios from "axios";
import { BlogPost } from "@shared/schema";
import { storage } from "../storage";
import { createDateInTimezone, getCurrentDateInTimezone } from "@shared/timezone";

/**
 * Schedule a blog post for future publishing
 * @param store Shopify store details
 * @param blogId Shopify blog ID
 * @param post Blog post content
 * @param scheduledDate Date when the post should be published
 */
export async function schedulePost(
  store: ShopifyStore,
  blogId: string,
  post: BlogPost,
  scheduledDate: Date
): Promise<any> {
  try {
    console.log(`Scheduling post for future publishing at ${scheduledDate.toISOString()}`);
    
    // Get shop information to get the timezone
    let shopInfo: any;
    try {
      const shopClient = axios.create({
        baseURL: `https://${store.shopName}/admin/api/2025-07`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      console.log(`Fetching shop information for ${store.shopName}`);
      const shopResponse = await shopClient.get('/shop.json');
      shopInfo = shopResponse.data.shop;
      console.log(`Shop timezone for ${store.shopName}: ${shopInfo.iana_timezone}`);
    } catch (shopError: any) {
      console.error(`Failed to get shop timezone, using UTC: ${shopError.message}`);
      shopInfo = { iana_timezone: 'UTC' };
    }
    
    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2025-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Create the article as a draft (published=false, no published_at)
    const article: any = {
      title: post.title,
      author: post.author || '', // No fallback to store name - require explicit author
      body_html: post.content || "",
      tags: post.tags || "",
      published: false, // Always create as draft
      published_at: null, // Explicitly set to null to ensure it stays in draft mode
    };

    if (post.featuredImage) {
      article.image = { src: post.featuredImage };
    }

    console.log(`Creating draft article (custom scheduling approach):`, {
      title: article.title,
      published: article.published,
      published_at: article.published_at
    });

    // Create the draft article
    const response = await client.post(`/blogs/${blogId}/articles.json`, { article });
    
    const createdArticle = response.data.article;
    
    console.log(`Draft article created successfully:`, {
      id: createdArticle.id,
      title: createdArticle.title,
      published: createdArticle.published,
      published_at: createdArticle.published_at
    });

    // Format dates in the store's timezone for accurate scheduling
    const storeTimezone = shopInfo.iana_timezone || 'UTC';
    
    // Get the formatted date and time strings using the timezone
    let scheduledPublishDate: string;
    let scheduledPublishTime: string;
    
    if (post.scheduledPublishDate && post.scheduledPublishTime) {
      // If the post already has date and time strings, use those
      scheduledPublishDate = post.scheduledPublishDate;
      scheduledPublishTime = post.scheduledPublishTime;
    } else {
      // Otherwise format the date using the store's timezone
      scheduledPublishDate = formatDate(scheduledDate);
      scheduledPublishTime = formatTime(scheduledDate);
    }
    
    console.log(`Using store timezone ${storeTimezone} for scheduled publish date: ${scheduledPublishDate} at ${scheduledPublishTime}`);

    // Update our database with scheduling information
    if (post.id) {
      const updateData = {
        shopifyPostId: String(createdArticle.id),
        shopifyBlogId: blogId,
        status: 'scheduled',
        scheduledDate: scheduledDate,
        scheduledPublishDate: scheduledPublishDate,
        scheduledPublishTime: scheduledPublishTime,
        storeId: store.id
      };
      
      console.log(`Updating local database with scheduling info:`, updateData);
      
      await storage.updateBlogPost(post.id, updateData);

      console.log(`Local database updated successfully for post ID ${post.id}`);
    }

    return {
      ...createdArticle,
      scheduledDate: scheduledDate.toISOString(),
      scheduledPublishDate,
      scheduledPublishTime,
      customScheduled: true
    };
  } catch (error: any) {
    console.error(`Error in custom scheduling:`, error);
    if (error.response) {
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to schedule post: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a time as HH:MM
 */
export function formatTime(date: Date): string {
  return date.toISOString().split('T')[1].substring(0, 5);
}

/**
 * Schedule a page for future publishing
 * @param store Shopify store details
 * @param title Page title
 * @param content Page HTML content
 * @param scheduledDate Date when the page should be published
 */
export async function schedulePage(
  store: ShopifyStore,
  title: string,
  content: string,
  scheduledDate: Date
): Promise<any> {
  try {
    // Get shop information to get the timezone
    let shopInfo: any;
    try {
      const shopClient = axios.create({
        baseURL: `https://${store.shopName}/admin/api/2025-07`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      console.log(`Fetching shop information for ${store.shopName}`);
      const shopResponse = await shopClient.get('/shop.json');
      shopInfo = shopResponse.data.shop;
      console.log(`Shop timezone for ${store.shopName}: ${shopInfo.iana_timezone}`);
    } catch (shopError: any) {
      console.error(`Failed to get shop timezone, using UTC: ${shopError.message}`);
      shopInfo = { iana_timezone: 'UTC' };
    }

    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2025-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Create the page as a draft
    const page: any = {
      title: title,
      body_html: content,
      published: false, // Always create as draft
    };

    console.log(`Creating draft page (custom scheduling approach):`, {
      title: page.title,
      published: page.published
    });

    // Create the draft page
    const response = await client.post(`/pages.json`, { page });
    
    console.log(`Draft page created:`, {
      id: response.data.page.id,
      title: response.data.page.title,
      published: response.data.page.published
    });

    // Format dates in the store's timezone for accurate scheduling
    const storeTimezone = shopInfo.iana_timezone || 'UTC';
    
    // Get the formatted date and time strings
    const scheduledPublishDate = formatDate(scheduledDate);
    const scheduledPublishTime = formatTime(scheduledDate);
    
    console.log(`Using store timezone ${storeTimezone} for scheduled publish date: ${scheduledPublishDate} at ${scheduledPublishTime}`);

    // The page ID for later publishing
    const pageId = response.data.page.id;

    // Create activity record for tracking
    await storage.createSyncActivity({
      storeId: store.id,
      activity: `Scheduled page "${title}" for ${scheduledPublishDate} at ${scheduledPublishTime}`,
      status: 'success',
      details: `Page ID: ${pageId}, Shopify store: ${store.shopName}`
    });

    // Store the page in our database with scheduling information
    // Note: Add to BlogPost database with contentType = 'page' to track it
    const pageData = {
      title: title,
      content: content,
      status: 'scheduled',
      scheduledDate: scheduledDate,
      scheduledPublishDate: scheduledPublishDate,
      scheduledPublishTime: scheduledPublishTime,
      storeId: store.id,
      shopifyPostId: String(pageId),
      contentType: 'page', // Add this field to identify as a page
      author: '', // No default author - require explicit selection
      tags: 'page,scheduled' // Add default tags for tracking
    };
    
    console.log(`Saving page to database with scheduling info:`, pageData);
    // Create a new blog post entry for this page to track its scheduling
    const savedPage = await storage.createBlogPost(pageData);
    
    // Log the successful scheduling
    console.log(`Successfully scheduled page "${title}" with ID ${savedPage.id} for ${scheduledPublishDate} at ${scheduledPublishTime}`);
    
    // Return additional information for the client
    return {
      ...response.data.page,
      scheduledDate: scheduledDate.toISOString(),
      scheduledPublishDate,
      scheduledPublishTime,
      customScheduled: true,
      localId: savedPage.id // Include our local database ID for tracking
    };
  } catch (error: any) {
    console.error(`Error in custom page scheduling:`, error);
    
    // Log the error to our database for tracking
    try {
      await storage.createSyncActivity({
        storeId: store.id,
        activity: `Failed to schedule page "${title}"`,
        status: 'failed',
        details: error?.message || 'Unknown error'
      });
    } catch (logError) {
      console.error('Failed to log scheduling error:', logError);
    }
    
    // Handle different error types
    if (error.response) {
      // Shopify API error
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
      
      // Provide more specific error messages based on status code
      if (error.response.status === 401) {
        throw new Error(`Authentication failed. Please reconnect your Shopify store.`);
      } else if (error.response.status === 403) {
        throw new Error(`Permission denied. Your app may not have the required access scopes.`);
      } else if (error.response.status === 422) {
        throw new Error(`Invalid page data: ${JSON.stringify(error.response.data.errors || {})}`);
      } else if (error.response.status === 429) {
        throw new Error(`Rate limit exceeded. Please try again later.`);
      }
    }
    
    // Default error message
    throw new Error(`Failed to schedule page: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Publish a scheduled page
 * @param store Shopify store details
 * @param pageId Page ID to publish
 * @param post BlogPost data containing the page information
 */
export async function publishScheduledPage(
  store: ShopifyStore,
  pageId: string,
  post?: BlogPost
): Promise<any> {
  try {
    console.log(`Publishing scheduled page ${pageId} for store ${store.shopName}`);
    
    // Get shop information for accurate timezone handling
    let shopInfo: any;
    try {
      const shopClient = axios.create({
        baseURL: `https://${store.shopName}/admin/api/2025-07`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      console.log(`Fetching shop information for timezone`);
      const shopResponse = await shopClient.get('/shop.json');
      shopInfo = shopResponse.data.shop;
      console.log(`Shop timezone: ${shopInfo.iana_timezone}`);
    } catch (shopError: any) {
      console.error(`Failed to get shop timezone, using UTC: ${shopError.message}`);
      shopInfo = { iana_timezone: 'UTC' };
      
      // Log the error for tracking
      await storage.createSyncActivity({
        storeId: store.id,
        activity: `Warning: Timezone fetch failed when publishing page`,
        status: 'warning',
        details: `Using UTC as fallback. Error: ${shopError.message}`
      });
    }
    
    // Get the store's timezone
    const storeTimezone = shopInfo.iana_timezone || 'UTC';
    
    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2025-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // First, get the current page to ensure it exists and verify its state
    let existingPage: any;
    try {
      const getResponse = await client.get(`/pages/${pageId}.json`);
      existingPage = getResponse.data.page;
      console.log(`Retrieved page for publishing:`, {
        id: existingPage.id,
        title: existingPage.title,
        published: existingPage.published
      });
    } catch (getError: any) {
      console.error(`Error retrieving page before publishing:`, getError);
      throw new Error(`Page ${pageId} not found or inaccessible`);
    }

    console.log(`Sending publish request for page ${pageId}`);
    
    // Determine the correct publish time
    let publishTime = new Date().toISOString();
    
    // If we have the post data with scheduled time, use it for more accurate publishing
    if (post && post.scheduledPublishDate && post.scheduledPublishTime) {
      try {
        // Create a date from the scheduled time in the store's timezone
        const scheduledDate = createDateInTimezone(
          post.scheduledPublishDate,
          post.scheduledPublishTime,
          storeTimezone
        );
        
        // Get the current time in the store's timezone
        const now = getCurrentDateInTimezone(storeTimezone);
        
        // If the scheduled time is not too far in the past (within 30 minutes),
        // use it as the publish time to maintain accuracy
        const timeDiff = now.getTime() - scheduledDate.getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;
        
        if (timeDiff < thirtyMinutesInMs) {
          publishTime = scheduledDate.toISOString();
          console.log(`Using original scheduled time for publishing: ${publishTime}`);
        } else {
          console.log(`Original schedule time too old, using current time: ${publishTime}`);
        }
      } catch (dateError) {
        console.error(`Error creating publication date: ${dateError}`);
      }
    }

    // Update the page to published status
    const response = await client.put(
      `/pages/${pageId}.json`, 
      { 
        page: {
          id: pageId,
          published: true,
          published_at: publishTime
        } 
      }
    );

    console.log(`Page published successfully:`, {
      id: response.data.page.id,
      title: response.data.page.title,
      published: response.data.page.published,
      published_at: response.data.page.published_at
    });

    return response.data.page;
  } catch (error: any) {
    console.error(`Error publishing scheduled page:`, error);
    if (error.response) {
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to publish scheduled page: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Publish a scheduled article
 * @param store Shopify store details
 * @param blogId Blog ID
 * @param articleId Article ID to publish
 */
export async function publishScheduledArticle(
  store: ShopifyStore,
  blogId: string,
  articleId: string,
  post?: BlogPost
): Promise<any> {
  try {
    console.log(`Publishing scheduled article ${articleId} in blog ${blogId} for store ${store.shopName}`);
    
    // Get shop information for accurate timezone handling
    let shopInfo: any;
    try {
      const shopClient = axios.create({
        baseURL: `https://${store.shopName}/admin/api/2025-07`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken
        }
      });
      
      console.log(`Fetching shop information for timezone`);
      const shopResponse = await shopClient.get('/shop.json');
      shopInfo = shopResponse.data.shop;
      console.log(`Shop timezone: ${shopInfo.iana_timezone}`);
    } catch (shopError: any) {
      console.error(`Failed to get shop timezone, using UTC: ${shopError.message}`);
      shopInfo = { iana_timezone: 'UTC' };
    }
    
    // Get the store's timezone
    const storeTimezone = shopInfo.iana_timezone || 'UTC';
    
    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2025-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // First, get the current article to ensure it exists and verify its state
    let existingArticle: any;
    try {
      const getResponse = await client.get(`/blogs/${blogId}/articles/${articleId}.json`);
      existingArticle = getResponse.data.article;
      console.log(`Retrieved article for publishing:`, {
        id: existingArticle.id,
        title: existingArticle.title,
        published: existingArticle.published,
        published_at: existingArticle.published_at
      });
    } catch (getError: any) {
      console.error(`Error retrieving article before publishing:`, getError);
      throw new Error(`Article ${articleId} not found or inaccessible`);
    }

    console.log(`Sending publish request for article ${articleId}`);
    
    // Determine the correct publish time
    let publishTime = new Date().toISOString();
    
    // If we have the post data with scheduled time, use it for more accurate publishing
    if (post && post.scheduledPublishDate && post.scheduledPublishTime) {
      try {
        // Create a date from the scheduled time in the store's timezone
        const scheduledDate = createDateInTimezone(
          post.scheduledPublishDate,
          post.scheduledPublishTime,
          storeTimezone
        );
        
        // Get the current time in the store's timezone
        const now = getCurrentDateInTimezone(storeTimezone);
        
        // If the scheduled time is not too far in the past (within 30 minutes),
        // use it as the publish time to maintain accuracy
        const timeDiff = now.getTime() - scheduledDate.getTime();
        const thirtyMinutesInMs = 30 * 60 * 1000;
        
        if (timeDiff < thirtyMinutesInMs) {
          publishTime = scheduledDate.toISOString();
          console.log(`Using original scheduled time for publishing: ${publishTime}`);
        } else {
          console.log(`Original schedule time too old, using current time: ${publishTime}`);
        }
      } catch (dateError) {
        console.error(`Error creating publication date: ${dateError}`);
      }
    }

    // Update the article to published status
    const response = await client.put(
      `/blogs/${blogId}/articles/${articleId}.json`, 
      { 
        article: {
          id: articleId,
          published: true,
          published_at: publishTime
        } 
      }
    );

    console.log(`Article published successfully:`, {
      id: response.data.article.id,
      title: response.data.article.title,
      published: response.data.article.published,
      published_at: response.data.article.published_at
    });

    return response.data.article;
  } catch (error: any) {
    console.error(`Error publishing scheduled article:`, error);
    if (error.response) {
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to publish scheduled article: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Check for posts and pages that need to be published
 * This would be called by a cron job or background task
 */
export async function checkScheduledPosts(): Promise<void> {
  try {
    // Get all scheduled posts
    const scheduledPosts = await storage.getScheduledPosts();
    
    // Get all stores for timezone information
    const stores = await storage.getShopifyStores();
    
    console.log(`Checking ${scheduledPosts.length} scheduled posts/pages`);

    for (const post of scheduledPosts) {
      try {
        // Check if this is a page or a blog post
        const isPage = post.contentType === 'page';
        
        // For blog posts, we need both shopifyPostId and shopifyBlogId
        // For pages, we only need shopifyPostId
        if (!post.shopifyPostId) {
          console.log(`Skipping ${isPage ? 'page' : 'post'} ${post.id} - missing Shopify ID`);
          continue;
        }
        
        // Blog posts need a blog ID
        if (!isPage && !post.shopifyBlogId) {
          console.log(`Skipping post ${post.id} - missing Shopify Blog ID`);
          continue;
        }

        // Skip posts without scheduled date
        if (!post.scheduledDate) {
          console.log(`Skipping ${isPage ? 'page' : 'post'} ${post.id} - no scheduled date`);
          continue;
        }
        
        // Find the store for this post/page - first try by store ID
        let store = post.storeId ? stores.find(s => s.id === post.storeId) : undefined;
        
        // If store not found by ID, try by blog ID (for posts only)
        if (!store && !isPage) {
          store = stores.find(s => s.defaultBlogId === post.shopifyBlogId);
        }
        
        if (!store) {
          console.log(`Skipping ${isPage ? 'page' : 'post'} ${post.id} - store not found`);
          continue;
        }
        
        // Fetch shop information to get timezone
        let shopInfo: any;
        try {
          const client = axios.create({
            baseURL: `https://${store.shopName}/admin/api/2025-07`,
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': store.accessToken
            }
          });
          
          const shopResponse = await client.get('/shop.json');
          shopInfo = shopResponse.data.shop;
          console.log(`Using store timezone: ${shopInfo.iana_timezone} for post ${post.id}`);
        } catch (shopError: any) {
          console.error(`Failed to get shop info for timezone, using UTC: ${shopError.message}`);
          shopInfo = { iana_timezone: 'UTC' };
        }

        // Create a proper Date object from the scheduled date using store's timezone
        let scheduledDate: Date;
        
        // Get the store's timezone
        const storeTimezone = shopInfo.iana_timezone || 'UTC';
        console.log(`Using store timezone: ${storeTimezone} for post ${post.id}`);
        
        // ALWAYS prioritize scheduledPublishDate and scheduledPublishTime if they exist
        // This ensures we use the time the user specifically selected in the UI
        if (post.scheduledPublishDate && post.scheduledPublishTime) {
          try {
            // Use the timezone utility to create a date in the store's timezone
            scheduledDate = createDateInTimezone(
              post.scheduledPublishDate,
              post.scheduledPublishTime,
              storeTimezone
            );
            console.log(`Created scheduled date from date/time fields: ${scheduledDate.toISOString()}`);
          } catch (dateError) {
            console.error(`Error creating date in timezone: ${dateError}`);
            // Fallback to simple date parsing
            const dateStr = `${post.scheduledPublishDate}T${post.scheduledPublishTime}:00`;
            scheduledDate = new Date(dateStr);
          }
        } 
        // Fall back to scheduledDate if needed
        else if (post.scheduledDate) {
          if (typeof post.scheduledDate === 'string') {
            scheduledDate = new Date(post.scheduledDate);
          } else {
            scheduledDate = post.scheduledDate;
          }
          console.log(`Using fallback scheduledDate: ${scheduledDate.toISOString()}`);
        }
        else {
          console.log(`Skipping post ${post.id} - no valid scheduling information`);
          continue;
        }
        
        // Handle invalid dates
        if (isNaN(scheduledDate.getTime())) {
          console.log(`Skipping post ${post.id} - invalid scheduled date`);
          continue;
        }
        
        // Get current time, also considering the store's timezone
        const now = getCurrentDateInTimezone(storeTimezone);
        console.log(`Current time in store timezone (${storeTimezone}): ${now.toISOString()}`);
        console.log(`Post ${post.id} scheduled time: ${scheduledDate.toISOString()}`);
        
        // Check if the original date/time (before any adjustments) has passed
        let originalScheduledDate: Date | null = null;
        if (post.scheduledPublishDate && post.scheduledPublishTime) {
          // Recreate the original date without safety adjustments
          const [year, month, day] = post.scheduledPublishDate.split('-').map(Number);
          const [hour, minute] = post.scheduledPublishTime.split(':').map(Number);
          
          if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour) && !isNaN(minute)) {
            originalScheduledDate = new Date(Date.UTC(
              year,
              month - 1,  // JS months are 0-indexed
              day,
              hour,
              minute,
              0
            ));
            console.log(`Original scheduled date (before adjustments): ${originalScheduledDate.toISOString()}`);
          }
        }
        
        // If the original scheduled time has passed OR the adjusted time is now or in the past, publish
        const shouldPublish = (originalScheduledDate && originalScheduledDate <= now) || scheduledDate <= now;
        
        // If it's time to publish
        if (shouldPublish) {
          // Check if this is a page or a blog post
          const isPage = post.contentType === 'page';
          
          console.log(`Time to publish ${isPage ? 'page' : 'post'} ${post.id} - "${post.title}"`);
          console.log(`Scheduled time: ${scheduledDate.toISOString()}, Current time: ${now.toISOString()}`);
          
          // Get the store for this post/page - first try by store ID
          const stores = await storage.getShopifyStores();
          let store = post.storeId ? stores.find(s => s.id === post.storeId) : undefined;
          
          // If store not found by ID and this is a post, try by blog ID
          if (!store && !isPage) {
            store = stores.find(s => s.defaultBlogId === post.shopifyBlogId);
          }
          
          if (!store) {
            console.error(`Store not found for ${isPage ? 'page' : 'post'} ${post.id}`);
            continue;
          }
          
          console.log(`Found store: ${store.shopName} (ID: ${store.id})`);
          
          try {
            if (isPage) {
              // Publish page
              console.log(`Publishing page with ID ${post.shopifyPostId}`);
              const publishedPage = await publishScheduledPage(
                store,
                post.shopifyPostId,
                post
              );
              
              // Update local post status
              await storage.updateBlogPost(post.id, {
                status: 'published',
                publishedDate: new Date(),
                updatedAt: new Date()
              });
              
              console.log(`Successfully published scheduled page ${post.id} - "${post.title}"`);
              console.log(`Published at ${publishedPage.published_at}`);
            } else {
              // Publish blog post
              const publishedArticle = await publishScheduledArticle(
                store, 
                post.shopifyBlogId, 
                post.shopifyPostId,
                post
              );
              
              // Update local post status
              await storage.updateBlogPost(post.id, {
                status: 'published',
                publishedDate: new Date(),
                updatedAt: new Date()
              });
              
              console.log(`Successfully published scheduled post ${post.id} - "${post.title}"`);
              console.log(`Published at ${publishedArticle.published_at}`);
            }
          } catch (publishError) {
            console.error(`Error publishing ${isPage ? 'page' : 'post'} ${post.id}:`, publishError.message);
          }
        } else {
          // Calculate minutes until publishing
          const timeUntilPublish = Math.round((scheduledDate.getTime() - now.getTime()) / (60 * 1000));
          console.log(`Post ${post.id} - "${post.title}" will be published in approximately ${timeUntilPublish} minutes`);
          console.log(`Scheduled time: ${scheduledDate.toISOString()}`);
        }
      } catch (postError: any) {
        console.error(`Error processing scheduled post ${post.id}:`, postError.message);
      }
    }
    
    console.log(`Finished checking scheduled posts`);
  } catch (error: any) {
    console.error(`Error in checkScheduledPosts:`, error.message);
  }
}