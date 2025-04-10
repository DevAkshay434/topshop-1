import { 
  type User, 
  type InsertUser, 
  type ShopifyConnection, 
  type InsertShopifyConnection,
  type BlogPost,
  type InsertBlogPost,
  type SyncActivity,
  type InsertSyncActivity,
  type ContentGenRequest,
  type InsertContentGenRequest
} from "@shared/schema";

// Define the storage interface with all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Shopify connection operations
  getShopifyConnection(): Promise<ShopifyConnection | undefined>;
  createShopifyConnection(connection: InsertShopifyConnection): Promise<ShopifyConnection>;
  updateShopifyConnection(connection: Partial<ShopifyConnection>): Promise<ShopifyConnection | undefined>;
  
  // Blog post operations
  getBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<boolean>;
  getRecentPosts(limit: number): Promise<BlogPost[]>;
  getScheduledPosts(): Promise<BlogPost[]>;
  getPublishedPosts(): Promise<BlogPost[]>;
  
  // Sync activity operations
  getSyncActivities(limit: number): Promise<SyncActivity[]>;
  createSyncActivity(activity: InsertSyncActivity): Promise<SyncActivity>;
  
  // Content generation operations
  createContentGenRequest(request: InsertContentGenRequest): Promise<ContentGenRequest>;
  updateContentGenRequest(id: number, request: Partial<ContentGenRequest>): Promise<ContentGenRequest | undefined>;
  getContentGenRequest(id: number): Promise<ContentGenRequest | undefined>;
}

// In-memory implementation of the storage interface
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private shopifyConnection: ShopifyConnection | undefined;
  private blogPosts: Map<number, BlogPost>;
  private syncActivities: SyncActivity[];
  private contentGenRequests: Map<number, ContentGenRequest>;
  
  private currentUserId: number;
  private currentBlogPostId: number;
  private currentSyncActivityId: number;
  private currentContentGenRequestId: number;

  constructor() {
    this.users = new Map();
    this.blogPosts = new Map();
    this.syncActivities = [];
    this.contentGenRequests = new Map();
    
    this.currentUserId = 1;
    this.currentBlogPostId = 1;
    this.currentSyncActivityId = 1;
    this.currentContentGenRequestId = 1;
    
    // Add some initial data for testing
    const now = new Date();
    
    // Add a sample shopify connection
    this.shopifyConnection = {
      id: 1,
      storeName: "fashion-boutique.myshopify.com",
      accessToken: "sample_token",
      defaultBlogId: "fashion-blog",
      isConnected: true,
      lastSynced: now
    };
    
    // Add some sample sync activities
    this.syncActivities.push({
      id: this.currentSyncActivityId++,
      timestamp: now,
      activity: "Sync completed successfully",
      status: "success",
      details: "Successfully synchronized 5 posts"
    });
    
    this.syncActivities.push({
      id: this.currentSyncActivityId++,
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // yesterday
      activity: "Published \"Summer Collection\"",
      status: "success",
      details: "Successfully published post to Shopify"
    });
    
    // Add some sample blog posts
    const post1: BlogPost = {
      id: this.currentBlogPostId++,
      title: "Summer Fashion Trends 2023: What's Hot This Season",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      category: "Fashion",
      tags: "summer, fashion, trends",
      status: "published",
      publishedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      views: 342,
      featuredImage: "",
      scheduledDate: null,
      shopifyPostId: "12345"
    };
    
    const post2: BlogPost = {
      id: this.currentBlogPostId++,
      title: "How to Style Sustainable Clothing for Every Occasion",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      category: "Style Tips",
      tags: "sustainable, fashion, styling",
      status: "published",
      publishedDate: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      views: 278,
      featuredImage: "",
      scheduledDate: null,
      shopifyPostId: "12346"
    };
    
    const post3: BlogPost = {
      id: this.currentBlogPostId++,
      title: "10 Must-Have Accessories for Your Summer Wardrobe",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      category: "Accessories",
      tags: "accessories, summer, fashion",
      status: "scheduled",
      publishedDate: null,
      scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      views: 0,
      featuredImage: "",
      shopifyPostId: null
    };
    
    this.blogPosts.set(post1.id, post1);
    this.blogPosts.set(post2.id, post2);
    this.blogPosts.set(post3.id, post3);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Shopify connection operations
  async getShopifyConnection(): Promise<ShopifyConnection | undefined> {
    return this.shopifyConnection;
  }
  
  async createShopifyConnection(connection: InsertShopifyConnection): Promise<ShopifyConnection> {
    this.shopifyConnection = { 
      id: 1,
      ...connection,
      lastSynced: new Date()
    };
    return this.shopifyConnection;
  }
  
  async updateShopifyConnection(connection: Partial<ShopifyConnection>): Promise<ShopifyConnection | undefined> {
    if (!this.shopifyConnection) {
      return undefined;
    }
    
    this.shopifyConnection = { 
      ...this.shopifyConnection,
      ...connection 
    };
    
    return this.shopifyConnection;
  }
  
  // Blog post operations
  async getBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values());
  }
  
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }
  
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const id = this.currentBlogPostId++;
    const newPost: BlogPost = { 
      ...post, 
      id,
      views: post.views || 0
    };
    this.blogPosts.set(id, newPost);
    return newPost;
  }
  
  async updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const existingPost = this.blogPosts.get(id);
    if (!existingPost) {
      return undefined;
    }
    
    const updatedPost = { ...existingPost, ...post };
    this.blogPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async deleteBlogPost(id: number): Promise<boolean> {
    return this.blogPosts.delete(id);
  }
  
  async getRecentPosts(limit: number): Promise<BlogPost[]> {
    // Sort by published date or scheduled date in descending order
    return Array.from(this.blogPosts.values())
      .sort((a, b) => {
        const dateA = a.publishedDate || a.scheduledDate || new Date(0);
        const dateB = b.publishedDate || b.scheduledDate || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, limit);
  }
  
  async getScheduledPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => post.status === 'scheduled')
      .sort((a, b) => {
        const dateA = a.scheduledDate || new Date(0);
        const dateB = b.scheduledDate || new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
  }
  
  async getPublishedPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => post.status === 'published')
      .sort((a, b) => {
        const dateA = a.publishedDate || new Date(0);
        const dateB = b.publishedDate || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }
  
  // Sync activity operations
  async getSyncActivities(limit: number): Promise<SyncActivity[]> {
    return this.syncActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async createSyncActivity(activity: InsertSyncActivity): Promise<SyncActivity> {
    const id = this.currentSyncActivityId++;
    const newActivity: SyncActivity = {
      ...activity,
      id,
      timestamp: new Date()
    };
    this.syncActivities.push(newActivity);
    return newActivity;
  }
  
  // Content generation operations
  async createContentGenRequest(request: InsertContentGenRequest): Promise<ContentGenRequest> {
    const id = this.currentContentGenRequestId++;
    const newRequest: ContentGenRequest = {
      ...request,
      id,
      timestamp: new Date()
    };
    this.contentGenRequests.set(id, newRequest);
    return newRequest;
  }
  
  async updateContentGenRequest(id: number, request: Partial<ContentGenRequest>): Promise<ContentGenRequest | undefined> {
    const existingRequest = this.contentGenRequests.get(id);
    if (!existingRequest) {
      return undefined;
    }
    
    const updatedRequest = { ...existingRequest, ...request };
    this.contentGenRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  async getContentGenRequest(id: number): Promise<ContentGenRequest | undefined> {
    return this.contentGenRequests.get(id);
  }
}

export const storage = new MemStorage();
