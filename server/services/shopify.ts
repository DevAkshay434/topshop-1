import axios, { AxiosInstance } from 'axios';
import { ShopifyConnection, ShopifyStore, BlogPost } from '@shared/schema';
import { createDateInTimezone } from '@shared/timezone';

// Define a separate interface for the Shopify service
interface ShopifyBlogPost {
  id: number;
  status: string;
  title: string;
  content: string;
  featuredImage?: string | null;
  publishedDate?: Date | null;
  scheduledDate?: Date | null;
  scheduledPublishDate?: string | null;
  scheduledPublishTime?: string | null;
  shopifyPostId?: string | null;
  shopifyBlogId?: string | null;
  author?: string | null;
  tags?: string | null;
  category?: string | null;
  categories?: string | null;
  publicationType?: string | null;
}

interface ShopifyBlog {
  id: string;
  title: string;
}

interface ShopifyShop {
  id: string;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  source: string;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  currency: string;
  iana_timezone: string; // IANA timezone format (e.g., "America/New_York")
  timezone: string; // String representation (e.g., "Eastern Time (US & Canada)")
}

interface ShopifyArticle {
  id: string;
  title: string;
  author: string;
  published_at: string;
  updated_at: string;
  created_at: string;
  body_html: string;
  blog_id: string;
  summary_html: string;
  published: boolean;
  tags: string;
}

interface PexelsImage {
  id: number;
  url: string;
  width: number;
  height: number;
  alt?: string;
  src?: {
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  };
}

/**
 * Service class for interacting with the Shopify API
 */
export class ShopifyService {
  private clients: Map<string, AxiosInstance> = new Map();
  private pexelsImages: Map<number, PexelsImage> = new Map();
  
  /**
   * Initialize the Shopify client for a specific store
   * @param store The store to initialize the client for
   */
  public initializeClient(store: ShopifyStore) {
    if (!store.accessToken) {
      throw new Error('Store does not have an access token');
    }
    
    // Create a reusable axios client for this store
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-10`,
      headers: {
        'X-Shopify-Access-Token': store.accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    // Add request interceptor to log requests
    client.interceptors.request.use(request => {
      console.log(`Shopify API request for ${store.shopName}: ${request.method?.toUpperCase()} ${request.url}`);
      return request;
    });
    
    // Add response interceptor to log responses
    client.interceptors.response.use(response => {
      console.log(`Shopify API response for ${store.shopName}: ${response.status} for ${response.config.url}`);
      return response;
    }, error => {
      console.error(`Shopify API error for ${store.shopName}:`, error?.response?.status, error?.response?.data || error.message);
      return Promise.reject(error);
    });
    
    // Store the client in the map
    this.clients.set(store.shopName, client);
    
    console.log(`Initializing Shopify client for store: ${store.shopName}`);
    console.log(`Access token (first 5 chars): ${store.accessToken.substring(0, 5)}...`);
  }
  
  /**
   * Get the Shopify client for a specific store
   * @param store The store to get the client for
   * @returns An Axios instance configured for the store
   */
  private getClient(store: ShopifyStore): AxiosInstance {
    // Check if client exists
    const client = this.clients.get(store.shopName);
    
    // If client exists, return it
    if (client) {
      return client;
    }
    
    // Otherwise, initialize and return a new client
    this.initializeClient(store);
    return this.clients.get(store.shopName)!;
  }
  
  /**
   * Get blogs from a specific store
   * @param store The store to get blogs from
   * @returns Array of Shopify blogs
   */
  public async getBlogs(store: ShopifyStore): Promise<ShopifyBlog[]> {
    try {
      const client = this.getClient(store);
      const response = await client.get('/blogs.json');
      return response.data.blogs;
    } catch (error: any) {
      console.error(`Error fetching blogs from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch blogs: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get blog details including handle/slug
   * @param store The store to get the blog from
   * @param blogId The ID of the blog to fetch
   * @returns The Shopify blog with handle
   */
  public async getBlogById(store: ShopifyStore, blogId: string): Promise<any> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/blogs/${blogId}.json`);
      return response.data.blog;
    } catch (error: any) {
      console.error(`Error fetching blog from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch blog: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Create an article in a specific store
   * @param store The store to create the article in
   * @param blogId The ID of the blog to create the article in
   * @param post The blog post to create
   * @param publishDate Optional Date object for scheduled publishing
   * @returns The created Shopify article
   */
  public async createArticle(
    store: ShopifyStore, 
    blogId: string, 
    post: BlogPost | ShopifyBlogPost,
    publishDate?: Date
  ): Promise<ShopifyArticle> {
    try {
      const client = this.getClient(store);
      
      // Log detailed information about the post being created
      console.log(`Creating Shopify article for post with status: ${post.status}`, {
        postId: post.id,
        title: post.title,
        status: post.status,
        scheduledPublishDate: post.scheduledPublishDate,
        scheduledPublishTime: post.scheduledPublishTime,
        hasExplicitPublishDate: !!publishDate
      });
      
      // Process content to handle any proxied image URLs
      let processedContent = post.content;
      
      // Replace proxy image URLs with their source URLs if needed
      const proxyImagePattern = /src="\/api\/proxy\/image\/(\d+)"/g;
      let proxyMatch;
      
      // Process direct image references
      while ((proxyMatch = proxyImagePattern.exec(processedContent)) !== null) {
        const [fullMatch, imageId] = proxyMatch;
        
        // Only replace if we have an image ID
        if (imageId) {
          try {
            // Check if this is a Pexels image
            const pexelsImage = await this.getPexelsImageById(parseInt(imageId));
            
            if (pexelsImage) {
              // Use the original Pexels image URL
              const directImageUrl = pexelsImage.src?.large || pexelsImage.url;
              
              // Replace the proxy URL with the direct Pexels URL
              processedContent = processedContent.replace(
                `src="/api/proxy/image/${imageId}"`, 
                `src="${directImageUrl}"`
              );
            }
          } catch (imageError) {
            console.error(`Error processing proxied image ${imageId}:`, imageError);
            // Continue with other images if one fails
          }
        }
      }
      
      // Determine if this is a scheduled post
      const isScheduled = post.status === 'scheduled' && 
                         post.scheduledPublishDate && 
                         post.scheduledPublishTime;
      
      // Prepare the published_at date for the article
      let publishedAt: string | undefined = undefined;
      
      if (isScheduled) {
        // For scheduled posts, parse the date and time
        try {
          // Parse the date parts
          const [year, month, day] = post.scheduledPublishDate!.split('-').map(Number);
          const [hours, minutes] = post.scheduledPublishTime!.split(':').map(Number);
          
          // Get shop's timezone
          let timezone = 'UTC';
          try {
            const shopInfo = await this.getShopInfo(store);
            timezone = shopInfo.timezone || 'UTC';
            console.log(`Using shop timezone for scheduling: ${timezone}`);
          } catch (tzError) {
            console.warn(`Could not get shop timezone, using UTC`);
          }
          
          // Create a date in the shop's timezone
          try {
            const scheduledDate = createDateInTimezone(
              post.scheduledPublishDate!,
              post.scheduledPublishTime!,
              timezone
            );
            publishedAt = scheduledDate.toISOString();
          } catch (dateError) {
            // Fallback to UTC if timezone conversion fails
            const scheduledDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
            publishedAt = scheduledDate.toISOString();
          }
          
          // Ensure the scheduled date is in the future
          const now = new Date();
          const scheduledDate = new Date(publishedAt);
          
          if (scheduledDate <= now) {
            // Move to one hour in the future if the scheduled time is in the past
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 1);
            publishedAt = futureDate.toISOString();
            console.log(`Adjusted past scheduled date to future: ${publishedAt}`);
          }
        } catch (err) {
          console.error('Error parsing scheduled date:', err);
          // If there's an error, default to one hour from now
          const futureDate = new Date();
          futureDate.setHours(futureDate.getHours() + 1);
          publishedAt = futureDate.toISOString();
        }
      } else if (post.status === 'published') {
        // For published posts, use the current time
        publishedAt = new Date().toISOString();
      }
      
      // Handle scheduled posts specifically
      const isScheduledPublishing = (post.status === 'scheduled' || isScheduled || 
        ((post as any).publicationType === 'schedule'));
      
      // Calculate the future publish date (if scheduled)
      let futurePublishDate: Date | null = null;
      
      if (isScheduledPublishing && publishedAt) {
        try {
          futurePublishDate = new Date(publishedAt);
          console.log(`Parsed scheduled date: ${futurePublishDate.toISOString()}`);
        } catch (e) {
          console.error('Failed to parse scheduled date:', e);
        }
      } else if (publishDate) {
        futurePublishDate = publishDate;
        console.log(`Using explicit publish date: ${futurePublishDate.toISOString()}`);
      }
      
      // Create the article object
      const article: any = {
        title: post.title,
        author: post.author || store.shopName,
        body_html: processedContent,
        tags: post.tags || "",
        image: post.featuredImage ? { src: post.featuredImage } : undefined
      };
      
      // For scheduled posts, we need to implement a different approach
      // Shopify's API behavior is more complex:
      // 1. For drafts: set published=false (no published_at)
      // 2. For immediate publishing: set published=true (with current published_at)  
      // 3. For scheduled: set published=false AND use published_at for the future date
      //    (this is different from Shopify Admin UI which shows published=true)
      
      if (isScheduledPublishing && futurePublishDate) {
        console.log(`Setting up scheduled publishing for future date: ${futurePublishDate.toISOString()}`);
        
        // CRITICAL FIX - UPDATED: For Shopify API v2023-07 and above:
        // When scheduling content, we need TWO parameters:
        // 1. published: false - to keep it as a draft until the scheduled date
        // 2. published_at: future date - when it should be published
        article.published = false;
        
        // Make sure the date is in the future (at least tomorrow)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Use the future date (ensuring it's actually future)
        const scheduledTime = futurePublishDate.getTime();
        const tomorrowTime = tomorrow.getTime();
        if (scheduledTime <= tomorrowTime) {
          console.log(`WARNING: Schedule date not far enough in future, adjusting to tomorrow`);
          article.published_at = tomorrow.toISOString();
        } else {
          article.published_at = futurePublishDate.toISOString();
        }
        
        // For debugging
        console.log(`CRITICAL SCHEDULING UPDATE: Article will publish at ${article.published_at}`);
        
        // Add a custom property for tracking in the response
        article.isScheduledPost = true;
      } else if (post.status === 'published' || 
                (post as any).publicationType === 'publish' || 
                (post as any).postStatus === 'published') {
        // For immediate publishing - check multiple flags
        console.log("Publishing article immediately");
        article.published = true;
        article.published_at = new Date().toISOString();
      } else {
        // For drafts
        console.log("Saving article as draft");
        article.published = false;
        // Remove published_at to prevent scheduling
        article.published_at = undefined;
      }
      
      // Log the scheduling configuration
      console.log(`Article scheduling configuration:`, {
        published: article.published,
        published_at: article.published_at,
        isScheduled,
        status: post.status
      });
      
      // Log the request with detailed information to diagnose publishing issues
      console.log(`Sending to Shopify API:`, {
        title: article.title,
        published: article.published,
        published_at: article.published_at,
        isScheduled,
        publicationType: (post as any).publicationType,
        postStatus: (post as any).postStatus,
        status: post.status,
        endpointUrl: `/blogs/${blogId}/articles.json`
      });
      
      // Make the API request
      const response = await client.post(`/blogs/${blogId}/articles.json`, { article });
      
      // Log the response with scheduling data
      console.log(`Shopify API response:`, {
        id: response.data.article.id,
        title: response.data.article.title,
        published: response.data.article.published,
        published_at: response.data.article.published_at,
        sentRequest: {
          published: article.published,
          published_at: article.published_at,
          isScheduled: isScheduledPublishing
        }
      });
      
      // Verify the scheduling was successful by checking if the published_at date matches
      // what we sent (or is very close to it)
      if (isScheduledPublishing && futurePublishDate) {
        const responseDate = new Date(response.data.article.published_at);
        const sentDate = new Date(article.published_at);
        const timeDiff = Math.abs(responseDate.getTime() - sentDate.getTime());
        const oneHourInMs = 60 * 60 * 1000;
        
        if (timeDiff > oneHourInMs) {
          console.warn(`WARNING: Scheduled publish time doesn't match what was sent!`);
          console.warn(`  Sent: ${sentDate.toISOString()}`);
          console.warn(`  Received: ${responseDate.toISOString()}`);
          console.warn(`  Difference: ${Math.round(timeDiff / (60 * 1000))} minutes`);
          
          // If today's date was returned instead of the future date,
          // it means Shopify likely published immediately
          const now = new Date();
          const nowDiff = Math.abs(responseDate.getTime() - now.getTime());
          if (nowDiff < oneHourInMs) {
            console.error(`CRITICAL ERROR: Shopify appears to have published immediately instead of scheduling!`);
            // Attempt to fix by making a second API call to update the article
            try {
              console.log(`Attempting to fix by updating the article with scheduled date...`);
              const updateResponse = await client.put(
                `/blogs/${blogId}/articles/${response.data.article.id}.json`, 
                { 
                  article: {
                    id: response.data.article.id,
                    published: false,
                    published_at: article.published_at
                  } 
                }
              );
              console.log(`Update response:`, {
                published: updateResponse.data.article.published,
                published_at: updateResponse.data.article.published_at
              });
            } catch (updateError) {
              console.error(`Failed to update article with scheduling:`, updateError);
            }
          }
        } else {
          console.log(`Scheduling confirmed successful: ${responseDate.toISOString()}`);
        }
      }
      
      return response.data.article;
    } catch (error: any) {
      console.error(`Error creating article in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to create article: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Update an existing Shopify article
   * @param store The store to update the article in
   * @param blogId The blog ID containing the article
   * @param articleId The article ID to update
   * @param post The updated post data
   */
  public async updateArticle(store: ShopifyStore, blogId: string, articleId: string, post: BlogPost | ShopifyBlogPost): Promise<ShopifyArticle> {
    try {
      const client = this.getClient(store);
      
      console.log(`Updating Shopify article ${articleId} in blog ${blogId}`);
      
      // Process content to handle proxied image URLs
      let processedContent = post.content;
      
      // Replace proxy image URLs with their Pexels source URLs
      const proxyImagePattern = /src="\/api\/proxy\/image\/(\d+)"/g;
      let proxyMatch;
      
      while ((proxyMatch = proxyImagePattern.exec(processedContent)) !== null) {
        const [fullMatch, imageId] = proxyMatch;
        
        if (imageId) {
          try {
            const pexelsImage = await this.getPexelsImageById(parseInt(imageId));
            
            if (pexelsImage) {
              const directImageUrl = pexelsImage.src?.large || pexelsImage.url;
              processedContent = processedContent.replace(
                `src="/api/proxy/image/${imageId}"`, 
                `src="${directImageUrl}"`
              );
            }
          } catch (error) {
            console.error(`Error processing proxied image ${imageId}:`, error);
          }
        }
      }
      
      // Determine if this is a scheduled post
      const isScheduled = post.status === 'scheduled' && 
                         post.scheduledPublishDate && 
                         post.scheduledPublishTime;
      
      // Prepare the published_at date
      let publishedAt: string | undefined = undefined;
      
      if (isScheduled) {
        try {
          // Get shop's timezone
          let timezone = 'UTC';
          try {
            const shopInfo = await this.getShopInfo(store);
            timezone = shopInfo.timezone || 'UTC';
          } catch (error) {
            console.warn(`Could not get shop timezone, using UTC`);
          }
          
          // Create a timezone-aware date
          const scheduledDate = createDateInTimezone(
            post.scheduledPublishDate!,
            post.scheduledPublishTime!,
            timezone
          );
          
          publishedAt = scheduledDate.toISOString();
          
          // Ensure the date is in the future
          const now = new Date();
          if (scheduledDate <= now) {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 1);
            publishedAt = futureDate.toISOString();
          }
        } catch (error) {
          console.error('Error creating scheduled date:', error);
          // Default to one hour from now
          const futureDate = new Date();
          futureDate.setHours(futureDate.getHours() + 1);
          publishedAt = futureDate.toISOString();
        }
      } else if (post.status === 'published') {
        // For published articles, use the current time
        publishedAt = new Date().toISOString();
      }
      
      // Check for multiple publishing flags to ensure proper state
      const isPublish = post.status === 'published' || 
                       (post as any).publicationType === 'publish' || 
                       (post as any).postStatus === 'published';
      
      // Create the update article object with enhanced publishing support
      const article = {
        id: articleId,
        title: post.title,
        author: post.author || store.shopName,
        body_html: processedContent,
        tags: post.tags || "",
        published: isPublish,
        published_at: publishedAt,
        image: post.featuredImage ? { src: post.featuredImage } : undefined
      };
      
      // Critical for scheduling: published must be false
      if (isScheduled) {
        article.published = false;
        console.log("Setting up scheduled article with published=false for future publication");
      } else if (isPublish) {
        console.log("Publishing article immediately with published=true");
      } else {
        console.log("Saving article as draft with published=false");
      }
      
      // Log the update request
      console.log(`Updating article with data:`, {
        title: article.title,
        published: article.published,
        published_at: article.published_at,
        isScheduled
      });
      
      // Make the API request
      const response = await client.put(`/blogs/${blogId}/articles/${articleId}.json`, { article });
      
      console.log(`Article updated successfully:`, {
        id: response.data.article.id,
        published: response.data.article.published,
        published_at: response.data.article.published_at
      });
      
      return response.data.article;
    } catch (error: any) {
      console.error(`Error updating article in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to update article: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Delete an article from a specific store
   * @param store The store to delete the article from
   * @param blogId The blog ID containing the article
   * @param articleId The article ID to delete
   */
  public async deleteArticle(store: ShopifyStore, blogId: string, articleId: string): Promise<void> {
    try {
      const client = this.getClient(store);
      
      console.log(`Deleting Shopify article ${articleId} from blog ${blogId}`);
      
      // Make the API request
      await client.delete(`/blogs/${blogId}/articles/${articleId}.json`);
      
      console.log(`Article deleted successfully`);
    } catch (error: any) {
      console.error(`Error deleting article from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to delete article: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get articles from a specific blog
   * @param store The store to get articles from
   * @param blogId The blog ID to get articles from
   * @param limit The maximum number of articles to return
   */
  public async getArticles(store: ShopifyStore, blogId: string, limit: number = 50): Promise<ShopifyArticle[]> {
    try {
      const client = this.getClient(store);
      
      console.log(`Fetching articles from blog ${blogId} in store ${store.shopName}`);
      
      const response = await client.get(`/blogs/${blogId}/articles.json?limit=${limit}`);
      
      console.log(`Fetched ${response.data.articles.length} articles`);
      
      return response.data.articles;
    } catch (error: any) {
      console.error(`Error fetching articles from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch articles: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get information about a Shopify store
   * @param store The store to get information for
   */
  public async getShopInfo(store: ShopifyStore): Promise<ShopifyShop> {
    try {
      const client = this.getClient(store);
      
      console.log(`Fetching shop information for ${store.shopName}`);
      
      const response = await client.get('/shop.json');
      
      // Log the timezone information for debugging
      if (response.data.shop.timezone) {
        console.log(`Shop timezone for ${store.shopName}: ${response.data.shop.timezone}`);
      }
      
      return response.data.shop;
    } catch (error: any) {
      console.error(`Error fetching shop information for ${store.shopName}:`, error);
      throw new Error(`Failed to fetch shop information: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Get a Pexels image by ID from the cache or return undefined
   * @param id The Pexels image ID
   * @returns The Pexels image if found in the cache
   */
  public async getPexelsImageById(id: number): Promise<PexelsImage | undefined> {
    return this.pexelsImages.get(id);
  }
  
  /**
   * Test the connection to a Shopify store
   * @param store The store to test the connection for
   */
  public async testConnection(store: ShopifyStore): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.getClient(store);
      const response = await client.get('/shop.json');
      
      if (response.data && response.data.shop) {
        return { 
          success: true, 
          message: `Connected to Shopify store ${response.data.shop.name} successfully` 
        };
      }
      
      return { 
        success: false, 
        message: 'Unable to verify store connection' 
      };
    } catch (error: any) {
      console.error(`Error testing connection to Shopify store ${store.shopName}:`, error);
      return { 
        success: false, 
        message: `Failed to connect to store: ${error?.message || 'Unknown error'}` 
      };
    }
  }
  
  /**
   * Create a page in a Shopify store
   * @param store The store to create the page in
   * @param title The title of the page
   * @param content The HTML content of the page
   * @param published Whether the page should be published or not
   * @param publishDate Optional publish date for scheduling
   * @returns The created page data
   */
  public async createPage(
    store: ShopifyStore,
    title: string,
    content: string,
    published: boolean = false,
    publishDate?: Date
  ): Promise<any> {
    try {
      const client = this.getClient(store);
      
      // Log the publishing request type
      const publishType = published ? 'IMMEDIATE PUBLISH' : publishDate ? 'SCHEDULED' : 'DRAFT';
      console.log(`Creating page in Shopify store ${store.shopName} with publish setting: ${publishType}`);
      
      // Set up the basic page data
      const pageData: any = {
        page: {
          title,
          body_html: content
        }
      };

      // CRITICAL FIX: Shopify Pages API requires specific handling for each publishing type
      
      // Case 1: Immediate publishing - must set published=true AND published_at=current time
      if (published) {
        const currentTime = new Date().toISOString();
        pageData.page.published = true;
        pageData.page.published_at = currentTime;
        console.log(`Page - IMMEDIATE PUBLISH: Setting published=true with current timestamp: ${currentTime}`);
      } 
      // Case 2: Scheduled publishing - must set published=false AND published_at=future date
      else if (publishDate) {
        const futureDate = publishDate.toISOString();
        console.log(`Page - SCHEDULED: Setting future date: ${futureDate}`);
        pageData.page.published = false;
        pageData.page.published_at = futureDate;
      }
      // Case 3: Draft - must set published=false and NOT include published_at
      else {
        pageData.page.published = false;
        console.log('Page - DRAFT: Setting published=false with no publish date');
      }
      
      // Send the page creation request to Shopify
      console.log(`Sending page data to Shopify:`, {
        title: pageData.page.title,
        published: pageData.page.published,
        published_at: pageData.page.published_at
      });
      
      // Make the API request to create the page
      const response = await client.post('/pages.json', pageData);
      
      // Log the response details
      console.log(`Page created successfully with ID: ${response.data.page.id}`, {
        title: response.data.page.title,
        published: response.data.page.published,
        published_at: response.data.page.published_at,
        sentRequest: {
          published: pageData.page.published,
          published_at: pageData.page.published_at,
          isScheduled: !!publishDate
        }
      });
      
      // For scheduled pages, verify the response to ensure scheduling worked
      if (publishDate) {
        const responseDate = new Date(response.data.page.published_at);
        const sentDate = new Date(pageData.page.published_at);
        const timeDiff = Math.abs(responseDate.getTime() - sentDate.getTime());
        const oneHourInMs = 60 * 60 * 1000;
        
        // If the dates are significantly different (more than 1 hour), the scheduling likely failed
        if (timeDiff > oneHourInMs) {
          console.warn(`WARNING: Scheduling issue detected with page!`);
          console.warn(`  Requested scheduled time: ${sentDate.toISOString()}`);
          console.warn(`  Received time from Shopify: ${responseDate.toISOString()}`);
          console.warn(`  Time difference: ${Math.round(timeDiff / (60 * 1000))} minutes`);
          
          // If today's date was returned instead of the future date,
          // Shopify likely published immediately instead of scheduling
          const now = new Date();
          const nowDiff = Math.abs(responseDate.getTime() - now.getTime());
          
          if (nowDiff < oneHourInMs) {
            console.error(`CRITICAL ERROR: Shopify published the page immediately instead of scheduling!`);
            
            // Attempt to fix by updating the page with the correct scheduled date
            try {
              console.log(`Attempting to fix scheduling by updating the page...`);
              const updateResponse = await client.put(
                `/pages/${response.data.page.id}.json`, 
                { 
                  page: {
                    id: response.data.page.id,
                    published: false,
                    published_at: pageData.page.published_at
                  } 
                }
              );
              
              console.log(`Scheduling fix attempt result:`, {
                id: updateResponse.data.page.id,
                published: updateResponse.data.page.published,
                published_at: updateResponse.data.page.published_at,
                requested_date: pageData.page.published_at
              });
            } catch (updateError) {
              console.error(`Failed to fix page scheduling:`, updateError);
            }
          }
        } else {
          console.log(`✓ Page scheduling confirmed successful for: ${responseDate.toISOString()}`);
        }
      }
      
      return response.data.page;
    } catch (error: any) {
      console.error(`Error creating page in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to create page: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Register a Pexels image in the cache
   * @param image The Pexels image to register
   * @returns The registered image
   */
  public registerPexelsImage(image: PexelsImage): PexelsImage {
    this.pexelsImages.set(image.id, image);
    return image;
  }
  
  /**
   * Get products from a store
   * @param store The store to get products from
   * @param limit The maximum number of products to return
   */
  /**
   * Get content files from Shopify (files API)
   * This method fetches files from Shopify's Files API
   */
  public async getContentFiles(store: ShopifyStore): Promise<any[]> {
    try {
      console.log(`Fetching content files from ${store.shopName}`);
      const client = this.getClient(store.shopName, store.accessToken);
      
      // Query files from Shopify
      const response = await client.get('/files.json');
      
      if (response.data && response.data.files) {
        // Return all files from Shopify
        return response.data.files.map((file: any) => ({
          id: file.id,
          url: file.src || file.url,
          filename: file.filename || file.name || 'Shopify File',
          content_type: file.content_type || 'image/jpeg',
          created_at: file.created_at,
          alt: file.alt || ''
        }));
      }
      
      return [];
    } catch (error: any) {
      console.error("Error fetching content files:", error.message);
      return [];
    }
  }
  
  public async getProducts(store: ShopifyStore, limit: number = 50): Promise<any[]> {
    try {
      // Get store client
      const client = this.getClient(store);
      
      // Try with current API version first
      try {
        console.log(`Fetching products from ${store.shopName} with limit ${limit}`);
        const response = await client.get(`/products.json?limit=${limit}`);
        console.log(`Successfully fetched ${response.data.products.length} products`);
        return response.data.products;
      } catch (firstError: any) {
        // Log first attempt error
        console.error(`Error in first attempt to fetch products from ${store.shopName}:`, firstError.message);
        
        // If it's a 404 error, try with the stable 2023-07 API version
        if (firstError.response && firstError.response.status === 404) {
          console.log(`Retrying with 2023-07 API version`);
          
          // Create a client with explicit API version
          const fallbackClient = axios.create({
            baseURL: `https://${store.shopName}/admin/api/2023-07`,
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': store.accessToken
            }
          });
          
          try {
            const fallbackResponse = await fallbackClient.get(`/products.json?limit=${limit}`);
            console.log(`Fallback succeeded, fetched ${fallbackResponse.data.products.length} products`);
            return fallbackResponse.data.products;
          } catch (fallbackError: any) {
            console.error(`Fallback attempt also failed:`, fallbackError.message);
            throw fallbackError;
          }
        } else {
          // Not a 404, rethrow original error
          throw firstError;
        }
      }
    } catch (error: any) {
      console.error(`Error fetching products from Shopify store ${store.shopName}:`, error);
      
      // Return empty array instead of throwing to prevent app failure
      console.log(`Returning empty products array due to API error`);
      return [];
    }
  }
  
  /**
   * Get collections from a store
   * @param store The store to get collections from
   * @param limit The maximum number of collections to return
   */
  public async getCollections(store: ShopifyStore, collectionType: 'custom' | 'smart', limit: number = 50): Promise<any[]> {
    try {
      const client = this.getClient(store);
      
      // Choose the endpoint based on collection type
      const endpoint = collectionType === 'custom' ? 'custom_collections' : 'smart_collections';
      
      const response = await client.get(`/${endpoint}.json?limit=${limit}`);
      
      return response.data[endpoint];
    } catch (error: any) {
      console.error(`Error fetching ${collectionType} collections from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch collections: ${error?.message || 'Unknown error'}`);
    }
  }
}

// Create a singleton instance
export const shopifyService = new ShopifyService();