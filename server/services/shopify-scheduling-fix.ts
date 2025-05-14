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

import { ShopifyStore } from "../storage";
import axios, { AxiosInstance } from "axios";

/**
 * Creates a scheduled article in Shopify using 2023-07 API version explicitly
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
    // Create a specific client for 2023-07 API version
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Ensure date is in future
    const now = new Date();
    if (scheduledDate <= now) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      scheduledDate = tomorrow;
      console.log(`Adjusted scheduled date to tomorrow 9 AM: ${scheduledDate.toISOString()}`);
    }

    // Build the article payload with explicit status=draft
    const article: any = {
      title: title,
      author: store.shopName,
      body_html: content,
      tags: tags,
      status: "draft", // CRITICAL: Must be 'draft' for scheduling
      published_at: scheduledDate.toISOString()
    };

    if (featuredImage) {
      article.image = { src: featuredImage };
    }

    console.log(`Creating scheduled article with explicit API version 2023-07:`, {
      title,
      status: article.status,
      published_at: article.published_at
    });

    // Make the API request
    const response = await client.post(`/blogs/${blogId}/articles.json`, { article });

    console.log(`Scheduled article created. API response:`, {
      id: response.data.article.id,
      title: response.data.article.title,
      status: response.data.article.status,
      published_at: response.data.article.published_at
    });

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
 * Creates a scheduled page in Shopify using 2023-07 API version explicitly
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
    // Create a specific client for 2023-07 API version
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });

    // Ensure date is in future
    const now = new Date();
    if (scheduledDate <= now) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      scheduledDate = tomorrow;
      console.log(`Adjusted scheduled date to tomorrow 9 AM: ${scheduledDate.toISOString()}`);
    }

    // Build the page payload with explicit status=draft
    const page: any = {
      title: title,
      body_html: content,
      published: false, // Need for pages
      published_at: scheduledDate.toISOString()
    };

    console.log(`Creating scheduled page with explicit API version 2023-07:`, {
      title,
      published: page.published,
      published_at: page.published_at
    });

    // Make the API request
    const response = await client.post(`/pages.json`, { page });

    console.log(`Scheduled page created. API response:`, {
      id: response.data.page.id,
      title: response.data.page.title,
      published: response.data.page.published,
      published_at: response.data.page.published_at
    });

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