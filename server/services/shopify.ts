import axios, { AxiosInstance } from 'axios';
import { ShopifyConnection, ShopifyStore, BlogPost } from '@shared/schema';

interface ShopifyBlog {
  id: string;
  title: string;
}

interface ShopifyArticle {
  id: string;
  title: string;
  handle: string;
  created_at: string;
  updated_at: string;
  published_at: string;
  body_html: string;
  blog_id: string;
  author: string;
  user_id: string;
  summary_html: string;
  template_suffix: string;
  tags: string;
  admin_graphql_api_id: string;
}

export class ShopifyService {
  private clients: Map<number, AxiosInstance> = new Map();
  private shopDomains: Map<number, string> = new Map();
  
  /**
   * Initialize a client for a specific store
   * @param store The Shopify store information
   * @returns The created axios instance
   */
  private initializeClient(store: ShopifyStore): AxiosInstance {
    console.log(`Initializing Shopify client for store: ${store.shopName}`);
    console.log(`Access token (first 5 chars): ${store.accessToken.substring(0, 5)}...`);
    
    const client = axios.create({
      baseURL: `https://${store.shopName}/admin/api/2023-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.accessToken
      }
    });
    
    // Add request and response interceptors for debugging
    client.interceptors.request.use(config => {
      console.log(`Shopify API request for ${store.shopName}: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
    
    client.interceptors.response.use(
      response => {
        console.log(`Shopify API response for ${store.shopName}: ${response.status} for ${response.config.url}`);
        return response;
      },
      error => {
        if (error.response) {
          console.error(`Shopify API error for ${store.shopName}: ${error.response.status} for ${error.config.url}`);
          console.error(`Error data:`, error.response.data);
        } else {
          console.error(`Shopify API error for ${store.shopName}:`, error.message);
        }
        return Promise.reject(error);
      }
    );
    
    // Cache the client and domain name
    this.clients.set(store.id, client);
    this.shopDomains.set(store.id, store.shopName);
    
    return client;
  }
  
  /**
   * Get the client for a specific store, initializing it if necessary
   * @param store The Shopify store to get a client for
   * @returns The axios client for the store
   */
  private getClient(store: ShopifyStore): AxiosInstance {
    // Check if we already have a client for this store
    let client = this.clients.get(store.id);
    
    // If not, initialize one
    if (!client || !store.isConnected) {
      client = this.initializeClient(store);
    }
    
    return client;
  }
  
  /**
   * For backward compatibility with old connection interface
   * @param connection Legacy ShopifyConnection 
   */
  public setConnection(connection: ShopifyConnection) {
    console.log("Warning: Using legacy setConnection method");
    
    // Create a temporary store object to use with the new client system
    const store: ShopifyStore = {
      id: connection.id,
      shopName: connection.storeName,
      accessToken: connection.accessToken,
      scope: '', // Not available in legacy connection
      defaultBlogId: connection.defaultBlogId,
      isConnected: connection.isConnected || true,
      lastSynced: connection.lastSynced,
      installedAt: new Date(),
      uninstalledAt: null,
      planName: null,
      chargeId: null,
      trialEndsAt: null
    };
    
    // Initialize the client
    this.initializeClient(store);
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
    } catch (error) {
      console.error(`Error fetching blogs from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch blogs: ${error.message}`);
    }
  }
  
  /**
   * Create an article in a specific store
   * @param store The store to create the article in
   * @param blogId The ID of the blog to create the article in
   * @param post The blog post to create
   * @returns The created Shopify article
   */
  public async createArticle(store: ShopifyStore, blogId: string, post: BlogPost): Promise<ShopifyArticle> {
    try {
      const client = this.getClient(store);
      
      // Properly handle the date formatting for Shopify API
      // Use current date if no publishedDate is provided
      let publishedAt: string | undefined = undefined;
      
      if (post.status === 'published') {
        publishedAt = post.publishedDate 
          ? new Date(post.publishedDate).toISOString() 
          : new Date().toISOString();
      }
      
      const article = {
        title: post.title,
        author: "Blog Publisher App",
        body_html: post.content,
        tags: post.tags || "",
        published: post.status === 'published',
        published_at: publishedAt,
        image: post.featuredImage ? { src: post.featuredImage } : undefined
      };
      
      const response = await client.post(`/blogs/${blogId}/articles.json`, {
        article
      });
      
      return response.data.article;
    } catch (error) {
      console.error(`Error creating article in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to create article: ${error.message}`);
    }
  }
  
  /**
   * Update an article in a specific store
   * @param store The store to update the article in
   * @param blogId The ID of the blog containing the article
   * @param articleId The ID of the article to update
   * @param post The updated blog post data
   * @returns The updated Shopify article
   */
  public async updateArticle(store: ShopifyStore, blogId: string, articleId: string, post: Partial<BlogPost>): Promise<ShopifyArticle> {
    try {
      const client = this.getClient(store);
      const article: any = {};
      
      // Log the post data to help diagnose issues
      console.log("Updating Shopify article with post data:", JSON.stringify({
        id: post.id,
        title: post.title,
        contentLength: post.content ? post.content.length : 0,
        tags: post.tags,
        status: post.status
      }));
      
      // Make sure we have required fields
      if (!post.title) {
        console.warn("No title provided for Shopify article update!");
        article.title = "Untitled Post";
      } else {
        article.title = post.title;
      }
      
      // Handle content with fallback
      if (post.content && post.content.length > 0) {
        article.body_html = post.content;
      } else {
        console.warn("Empty content for Shopify article update!");
        article.body_html = `<p>Content for "${article.title}" is being updated.</p>`;
      }
      
      if (post.tags) article.tags = post.tags;
      
      // Properly handle date formatting for Shopify API
      if (post.status === 'published') {
        article.published = true;
        
        // Make sure the date is properly formatted as an ISO string
        let publishedAt: string;
        if (post.publishedDate) {
          publishedAt = new Date(post.publishedDate).toISOString();
        } else {
          publishedAt = new Date().toISOString();
        }
        article.published_at = publishedAt;
      } else if (post.status === 'draft') {
        article.published = false;
      }
      
      if (post.featuredImage) article.image = { src: post.featuredImage };
      
      console.log(`Sending article update to Shopify: ${JSON.stringify(article)}`);
      
      const response = await client.put(`/blogs/${blogId}/articles/${articleId}.json`, {
        article
      });
      
      return response.data.article;
    } catch (error) {
      console.error(`Error updating article in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to update article: ${error.message}`);
    }
  }
  
  /**
   * Delete an article from a specific store
   * @param store The store to delete the article from
   * @param blogId The ID of the blog containing the article
   * @param articleId The ID of the article to delete
   * @returns True if successful
   */
  public async deleteArticle(store: ShopifyStore, blogId: string, articleId: string): Promise<boolean> {
    try {
      const client = this.getClient(store);
      await client.delete(`/blogs/${blogId}/articles/${articleId}.json`);
      return true;
    } catch (error) {
      console.error(`Error deleting article from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to delete article: ${error.message}`);
    }
  }
  
  /**
   * Get articles from a specific store and blog
   * @param store The store to get articles from
   * @param blogId The ID of the blog to get articles from
   * @returns Array of Shopify articles
   */
  public async getArticles(store: ShopifyStore, blogId: string): Promise<ShopifyArticle[]> {
    try {
      const client = this.getClient(store);
      const response = await client.get(`/blogs/${blogId}/articles.json`);
      return response.data.articles;
    } catch (error) {
      console.error(`Error fetching articles from Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }
  }
  
  /**
   * Test the connection to a specific store
   * @param store The store to test the connection to
   * @returns True if the connection is successful
   */
  public async testConnection(store: ShopifyStore): Promise<boolean> {
    try {
      await this.getBlogs(store);
      return true;
    } catch (error) {
      console.error(`Failed to connect to Shopify store ${store.shopName}:`, error);
      return false;
    }
  }
  
  /**
   * Get the URL for a specific store
   * @param store The store to get the URL for
   * @returns The store URL
   */
  public getStoreUrl(store: ShopifyStore): string {
    return `https://${store.shopName}`;
  }
  
  /**
   * Legacy compatibility methods for backward compatibility
   * These will be removed once the app is fully migrated to multi-store
   */
  
  // Legacy getBlogs method
  public async getBlogsLegacy(): Promise<ShopifyBlog[]> {
    const storeIds = Array.from(this.clients.keys());
    if (storeIds.length === 0) {
      throw new Error('No Shopify clients initialized. Please connect to a store first.');
    }
    
    // Use the first store in the list (for backward compatibility)
    const storeId = storeIds[0];
    const client = this.clients.get(storeId);
    
    if (!client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      const response = await client.get('/blogs.json');
      return response.data.blogs || [];
    } catch (error: any) {
      console.error('Error fetching blogs from Shopify:', error);
      throw new Error(`Failed to fetch blogs: ${error.message}`);
    }
  }
  
  // Legacy test connection method
  public async testConnectionLegacy(): Promise<boolean> {
    try {
      await this.getBlogsLegacy();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create a singleton instance
const shopifyServiceInstance = new ShopifyService();

// Export the singleton instance and individual methods
export const shopifyService = shopifyServiceInstance;
export const getBlogs = (store: ShopifyStore) => shopifyServiceInstance.getBlogs(store);
export const createArticle = (store: ShopifyStore, blogId: string, post: BlogPost) => shopifyServiceInstance.createArticle(store, blogId, post);
export const updateArticle = (store: ShopifyStore, blogId: string, articleId: string, post: Partial<BlogPost>) => shopifyServiceInstance.updateArticle(store, blogId, articleId, post);
export const deleteArticle = (store: ShopifyStore, blogId: string, articleId: string) => shopifyServiceInstance.deleteArticle(store, blogId, articleId);
export const getArticles = (store: ShopifyStore, blogId: string) => shopifyServiceInstance.getArticles(store, blogId);
export const testConnection = (store: ShopifyStore) => shopifyServiceInstance.testConnection(store);
export const getStoreUrl = (store: ShopifyStore) => shopifyServiceInstance.getStoreUrl(store);

// Legacy compatibility exports
export const setConnection = (connection: ShopifyConnection) => shopifyServiceInstance.setConnection(connection);
export const getBlogsLegacy = () => shopifyServiceInstance.getBlogsLegacy();
export const testConnectionLegacy = () => shopifyServiceInstance.testConnectionLegacy();
