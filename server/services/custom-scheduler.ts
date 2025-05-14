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
    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Create the article as a draft (published=false, no published_at)
    const article: any = {
      title: post.title,
      author: post.author || store.shopName,
      body_html: post.content || "",
      tags: post.tags || "",
      published: false, // Always create as draft
    };

    if (post.featuredImage) {
      article.image = { src: post.featuredImage };
    }

    console.log(`Creating draft article (custom scheduling approach):`, {
      title: article.title,
      published: article.published
    });

    // Create the draft article
    const response = await client.post(`/blogs/${blogId}/articles.json`, { article });
    
    console.log(`Draft article created:`, {
      id: response.data.article.id,
      title: response.data.article.title,
      published: response.data.article.published
    });

    // Update our database with scheduling information
    if (post.id) {
      await storage.updateBlogPost(post.id, {
        shopifyPostId: response.data.article.id,
        shopifyBlogId: blogId,
        status: 'scheduled',
        scheduledDate: scheduledDate
      });

      console.log(`Local database updated with scheduling info:`, {
        postId: post.id,
        shopifyPostId: response.data.article.id,
        scheduledDate: scheduledDate.toISOString()
      });
    }

    return {
      ...response.data.article,
      scheduledDate: scheduledDate.toISOString(),
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
    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
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

    // Note: This implementation focuses on creating the draft page
    // The scheduled publishing would be handled by a background job or cron task
    // that checks for scheduled content and publishes it at the appropriate time

    return {
      ...response.data.page,
      scheduledDate: scheduledDate.toISOString(),
      customScheduled: true
    };
  } catch (error: any) {
    console.error(`Error in custom page scheduling:`, error);
    if (error.response) {
      console.error(`Shopify API error:`, {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to schedule page: ${error?.message || 'Unknown error'}`);
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
  articleId: string
): Promise<any> {
  try {
    // Create a client for the Shopify API
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    console.log(`Publishing scheduled article ${articleId} in blog ${blogId}`);

    // Update the article to published status
    const response = await client.put(
      `/blogs/${blogId}/articles/${articleId}.json`, 
      { 
        article: {
          id: articleId,
          published: true,
          published_at: new Date().toISOString()
        } 
      }
    );

    console.log(`Article published successfully:`, {
      id: response.data.article.id,
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
 * Check for posts that need to be published
 * This would be called by a cron job or background task
 */
export async function checkScheduledPosts(): Promise<void> {
  try {
    // Get all scheduled posts
    const scheduledPosts = await storage.getScheduledPosts();
    const now = new Date();

    console.log(`Checking ${scheduledPosts.length} scheduled posts`);

    for (const post of scheduledPosts) {
      // Skip posts without Shopify IDs
      if (!post.shopifyPostId || !post.shopifyBlogId) {
        console.log(`Skipping post ${post.id} - missing Shopify IDs`);
        continue;
      }

      // Skip posts without scheduled date
      if (!post.scheduledDate) {
        console.log(`Skipping post ${post.id} - no scheduled date`);
        continue;
      }

      const scheduledDate = new Date(post.scheduledDate);
      
      // If it's time to publish
      if (scheduledDate <= now) {
        console.log(`Time to publish post ${post.id} (${post.title})`);
        
        try {
          // Get the store for this post
          const stores = await storage.getShopifyStores();
          const store = stores.find(s => s.defaultBlogId === post.shopifyBlogId);
          
          if (!store) {
            console.error(`Store not found for post ${post.id}`);
            continue;
          }
          
          // Publish the post
          await publishScheduledArticle(
            store, 
            post.shopifyBlogId, 
            post.shopifyPostId
          );
          
          // Update local post status
          await storage.updateBlogPost(post.id, {
            status: 'published',
            publishedDate: new Date()
          });
          
          console.log(`Successfully published scheduled post ${post.id}`);
        } catch (error) {
          console.error(`Error publishing scheduled post ${post.id}:`, error);
        }
      } else {
        const timeUntilPublish = Math.round((scheduledDate.getTime() - now.getTime()) / (60 * 1000));
        console.log(`Post ${post.id} will be published in approximately ${timeUntilPublish} minutes`);
      }
    }
  } catch (error) {
    console.error(`Error checking scheduled posts:`, error);
  }
}