import axios, { AxiosInstance } from 'axios';
import { ShopifyConnection, BlogPost } from '@shared/schema';

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
  private client: AxiosInstance | null = null;
  private shopName: string = '';
  
  constructor(private connection?: ShopifyConnection) {
    if (connection && connection.isConnected) {
      this.initializeClient(connection);
    }
  }
  
  private initializeClient(connection: ShopifyConnection) {
    this.shopName = connection.storeName;
    
    console.log(`Initializing Shopify client for store: ${connection.storeName}`);
    console.log(`Access token (first 5 chars): ${connection.accessToken.substring(0, 5)}...`);
    
    this.client = axios.create({
      baseURL: `https://${connection.storeName}/admin/api/2023-07`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': connection.accessToken
      }
    });
    
    // Add request and response interceptors for debugging
    this.client.interceptors.request.use(config => {
      console.log(`Shopify API request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });
    
    this.client.interceptors.response.use(
      response => {
        console.log(`Shopify API response: ${response.status} for ${response.config.url}`);
        return response;
      },
      error => {
        if (error.response) {
          console.error(`Shopify API error: ${error.response.status} for ${error.config.url}`);
          console.error(`Error data:`, error.response.data);
        } else {
          console.error(`Shopify API error:`, error.message);
        }
        return Promise.reject(error);
      }
    );
  }
  
  public setConnection(connection: ShopifyConnection) {
    this.connection = connection;
    this.initializeClient(connection);
  }
  
  public async getBlogs(): Promise<ShopifyBlog[]> {
    if (!this.client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      const response = await this.client.get('/blogs.json');
      return response.data.blogs;
    } catch (error) {
      console.error('Error fetching blogs from Shopify:', error);
      throw new Error(`Failed to fetch blogs: ${error.message}`);
    }
  }
  
  public async createArticle(blogId: string, post: BlogPost): Promise<ShopifyArticle> {
    if (!this.client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      const article = {
        title: post.title,
        author: "Blog Publisher App",
        body_html: post.content,
        tags: post.tags || "",
        published: post.status === 'published',
        published_at: post.publishedDate ? post.publishedDate.toISOString() : undefined,
        image: post.featuredImage ? { src: post.featuredImage } : undefined
      };
      
      const response = await this.client.post(`/blogs/${blogId}/articles.json`, {
        article
      });
      
      return response.data.article;
    } catch (error) {
      console.error('Error creating article in Shopify:', error);
      throw new Error(`Failed to create article: ${error.message}`);
    }
  }
  
  public async updateArticle(blogId: string, articleId: string, post: Partial<BlogPost>): Promise<ShopifyArticle> {
    if (!this.client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      const article: any = {};
      
      if (post.title) article.title = post.title;
      if (post.content) article.body_html = post.content;
      if (post.tags) article.tags = post.tags;
      if (post.status === 'published') {
        article.published = true;
        article.published_at = post.publishedDate ? post.publishedDate.toISOString() : new Date().toISOString();
      } else if (post.status === 'draft') {
        article.published = false;
      }
      if (post.featuredImage) article.image = { src: post.featuredImage };
      
      const response = await this.client.put(`/blogs/${blogId}/articles/${articleId}.json`, {
        article
      });
      
      return response.data.article;
    } catch (error) {
      console.error('Error updating article in Shopify:', error);
      throw new Error(`Failed to update article: ${error.message}`);
    }
  }
  
  public async deleteArticle(blogId: string, articleId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      await this.client.delete(`/blogs/${blogId}/articles/${articleId}.json`);
      return true;
    } catch (error) {
      console.error('Error deleting article from Shopify:', error);
      throw new Error(`Failed to delete article: ${error.message}`);
    }
  }
  
  public async getArticles(blogId: string): Promise<ShopifyArticle[]> {
    if (!this.client) {
      throw new Error('Shopify client not initialized. Please connect to a store first.');
    }
    
    try {
      const response = await this.client.get(`/blogs/${blogId}/articles.json`);
      return response.data.articles;
    } catch (error) {
      console.error('Error fetching articles from Shopify:', error);
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }
  }
  
  public async testConnection(): Promise<boolean> {
    try {
      await this.getBlogs();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  public getStoreUrl(): string {
    if (!this.shopName) {
      return '';
    }
    
    return `https://${this.shopName}`;
  }
}

export const shopifyService = new ShopifyService();
