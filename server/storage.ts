import { 
  users,
  shopifyConnections,
  shopifyStores,
  userStores,
  blogPosts,
  syncActivities,
  contentGenRequests,
  type User, 
  type InsertUser, 
  type ShopifyConnection, 
  type InsertShopifyConnection,
  type ShopifyStore,
  type InsertShopifyStore,
  type UserStore,
  type InsertUserStore,
  type BlogPost,
  type InsertBlogPost,
  type SyncActivity,
  type InsertSyncActivity,
  type ContentGenRequest,
  type InsertContentGenRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, lte, gte, inArray } from "drizzle-orm";

// Define the storage interface with all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Legacy Shopify connection operations (for backward compatibility)
  getShopifyConnection(): Promise<ShopifyConnection | undefined>;
  createShopifyConnection(connection: InsertShopifyConnection): Promise<ShopifyConnection>;
  updateShopifyConnection(connection: Partial<ShopifyConnection>): Promise<ShopifyConnection | undefined>;
  
  // Multi-store Shopify operations (for public app)
  getShopifyStores(): Promise<ShopifyStore[]>;
  getShopifyStoreByDomain(shopDomain: string): Promise<ShopifyStore | undefined>;
  getShopifyStore(id: number): Promise<ShopifyStore | undefined>;
  createShopifyStore(store: InsertShopifyStore): Promise<ShopifyStore>;
  updateShopifyStore(id: number, store: Partial<ShopifyStore>): Promise<ShopifyStore>;
  
  // User-store relationship
  getUserStores(userId: number): Promise<ShopifyStore[]>;
  createUserStore(userStore: InsertUserStore): Promise<UserStore>;
  
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

// Database implementation of the storage interface
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Shopify connection operations
  async getShopifyConnection(): Promise<ShopifyConnection | undefined> {
    const connections = await db.select().from(shopifyConnections);
    return connections[0]; // We assume there's only one connection per account
  }
  
  async createShopifyConnection(connection: InsertShopifyConnection): Promise<ShopifyConnection> {
    // Check if there's already a connection and delete it
    const existingConnection = await this.getShopifyConnection();
    if (existingConnection) {
      await db.delete(shopifyConnections).where(eq(shopifyConnections.id, existingConnection.id));
    }
    
    const [newConnection] = await db.insert(shopifyConnections)
      .values({
        storeName: connection.storeName,
        accessToken: connection.accessToken,
        defaultBlogId: connection.defaultBlogId || null,
        isConnected: connection.isConnected !== undefined ? connection.isConnected : true,
        lastSynced: new Date()
      })
      .returning();
      
    return newConnection;
  }
  
  async updateShopifyConnection(connection: Partial<ShopifyConnection>): Promise<ShopifyConnection | undefined> {
    const existingConnection = await this.getShopifyConnection();
    if (!existingConnection) {
      return undefined;
    }
    
    // Create a clean update object with only the fields that are present
    const updateData: Record<string, any> = {};
    
    if (connection.storeName !== undefined) updateData.storeName = connection.storeName;
    if (connection.accessToken !== undefined) updateData.accessToken = connection.accessToken;
    if (connection.defaultBlogId !== undefined) updateData.defaultBlogId = connection.defaultBlogId;
    if (connection.isConnected !== undefined) updateData.isConnected = connection.isConnected;
    if (connection.lastSynced !== undefined) updateData.lastSynced = connection.lastSynced;
    
    const [updatedConnection] = await db.update(shopifyConnections)
      .set(updateData)
      .where(eq(shopifyConnections.id, existingConnection.id))
      .returning();
      
    return updatedConnection;
  }
  
  // Blog post operations
  async getBlogPosts(): Promise<BlogPost[]> {
    return db.select().from(blogPosts);
  }
  
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }
  
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    // Ensure required fields are present and nulls are handled properly
    const [newPost] = await db.insert(blogPosts)
      .values({
        title: post.title,
        content: post.content,
        status: post.status || 'draft',
        featuredImage: post.featuredImage || null,
        category: post.category || null,
        tags: post.tags || null,
        scheduledDate: post.scheduledDate || null,
        publishedDate: post.publishedDate || null,
        shopifyPostId: post.shopifyPostId || null,
        views: post.views || 0
      })
      .returning();
      
    return newPost;
  }
  
  async updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost | undefined> {
    // Create a clean update object with only the fields that are present
    const updateData: Record<string, any> = {};
    
    if (post.title !== undefined) updateData.title = post.title;
    if (post.content !== undefined) updateData.content = post.content;
    if (post.status !== undefined) updateData.status = post.status;
    if (post.featuredImage !== undefined) updateData.featuredImage = post.featuredImage;
    if (post.category !== undefined) updateData.category = post.category;
    if (post.tags !== undefined) updateData.tags = post.tags;
    if (post.scheduledDate !== undefined) updateData.scheduledDate = post.scheduledDate;
    if (post.publishedDate !== undefined) updateData.publishedDate = post.publishedDate;
    if (post.shopifyPostId !== undefined) updateData.shopifyPostId = post.shopifyPostId;
    if (post.views !== undefined) updateData.views = post.views;
    
    const [updatedPost] = await db.update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, id))
      .returning();
      
    return updatedPost;
  }
  
  async deleteBlogPost(id: number): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning({ id: blogPosts.id });
    return result.length > 0;
  }
  
  async getRecentPosts(limit: number): Promise<BlogPost[]> {
    // Get posts sorted by published date or scheduled date in descending order
    return db.select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.publishedDate))
      .limit(limit);
  }
  
  async getScheduledPosts(): Promise<BlogPost[]> {
    return db.select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'scheduled'))
      .orderBy(asc(blogPosts.scheduledDate));
  }
  
  async getPublishedPosts(): Promise<BlogPost[]> {
    return db.select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedDate));
  }
  
  // Sync activity operations
  async getSyncActivities(limit: number): Promise<SyncActivity[]> {
    return db.select()
      .from(syncActivities)
      .orderBy(desc(syncActivities.timestamp))
      .limit(limit);
  }
  
  async createSyncActivity(activity: InsertSyncActivity): Promise<SyncActivity> {
    const [newActivity] = await db.insert(syncActivities)
      .values({
        activity: activity.activity,
        status: activity.status,
        details: activity.details || null,
        timestamp: new Date()
      })
      .returning();
      
    return newActivity;
  }
  
  // Content generation operations
  async createContentGenRequest(request: InsertContentGenRequest): Promise<ContentGenRequest> {
    const [newRequest] = await db.insert(contentGenRequests)
      .values({
        topic: request.topic,
        tone: request.tone,
        length: request.length,
        status: request.status,
        generatedContent: request.generatedContent || null,
        timestamp: new Date()
      })
      .returning();
      
    return newRequest;
  }
  
  async updateContentGenRequest(id: number, request: Partial<ContentGenRequest>): Promise<ContentGenRequest | undefined> {
    // Create a clean update object with only the fields that are present
    const updateData: Record<string, any> = {};
    
    if (request.topic !== undefined) updateData.topic = request.topic;
    if (request.tone !== undefined) updateData.tone = request.tone;
    if (request.length !== undefined) updateData.length = request.length;
    if (request.status !== undefined) updateData.status = request.status;
    if (request.generatedContent !== undefined) updateData.generatedContent = request.generatedContent;
    if (request.timestamp !== undefined) updateData.timestamp = request.timestamp;
    
    const [updatedRequest] = await db.update(contentGenRequests)
      .set(updateData)
      .where(eq(contentGenRequests.id, id))
      .returning();
      
    return updatedRequest;
  }
  
  async getContentGenRequest(id: number): Promise<ContentGenRequest | undefined> {
    const [request] = await db.select().from(contentGenRequests).where(eq(contentGenRequests.id, id));
    return request;
  }

  // Multi-store Shopify operations
  async getShopifyStores(): Promise<ShopifyStore[]> {
    return db.select().from(shopifyStores);
  }

  async getShopifyStoreByDomain(shopDomain: string): Promise<ShopifyStore | undefined> {
    const [store] = await db.select()
      .from(shopifyStores)
      .where(eq(shopifyStores.shopName, shopDomain));
    return store;
  }

  async getShopifyStore(id: number): Promise<ShopifyStore | undefined> {
    const [store] = await db.select()
      .from(shopifyStores)
      .where(eq(shopifyStores.id, id));
    return store;
  }

  async createShopifyStore(store: InsertShopifyStore): Promise<ShopifyStore> {
    const [newStore] = await db.insert(shopifyStores)
      .values({
        shopName: store.shopName,
        accessToken: store.accessToken,
        scope: store.scope,
        defaultBlogId: store.defaultBlogId || null,
        isConnected: store.isConnected !== undefined ? store.isConnected : true,
        planName: store.planName || null,
        chargeId: store.chargeId || null,
        trialEndsAt: store.trialEndsAt || null
      })
      .returning();
    return newStore;
  }

  async updateShopifyStore(id: number, store: Partial<ShopifyStore>): Promise<ShopifyStore> {
    // Create a clean update object with only the fields that are present
    const updateData: Record<string, any> = {};
    
    if (store.shopName !== undefined) updateData.shopName = store.shopName;
    if (store.accessToken !== undefined) updateData.accessToken = store.accessToken;
    if (store.scope !== undefined) updateData.scope = store.scope;
    if (store.defaultBlogId !== undefined) updateData.defaultBlogId = store.defaultBlogId;
    if (store.isConnected !== undefined) updateData.isConnected = store.isConnected;
    if (store.lastSynced !== undefined) updateData.lastSynced = store.lastSynced;
    if (store.uninstalledAt !== undefined) updateData.uninstalledAt = store.uninstalledAt;
    if (store.planName !== undefined) updateData.planName = store.planName;
    if (store.chargeId !== undefined) updateData.chargeId = store.chargeId;
    if (store.trialEndsAt !== undefined) updateData.trialEndsAt = store.trialEndsAt;
    
    const [updatedStore] = await db.update(shopifyStores)
      .set(updateData)
      .where(eq(shopifyStores.id, id))
      .returning();
    
    return updatedStore;
  }

  // User-store relationship operations
  async getUserStores(userId: number): Promise<ShopifyStore[]> {
    // Get all stores associated with this user
    const userStoreRecords = await db.select({
        storeId: userStores.storeId
      })
      .from(userStores)
      .where(eq(userStores.userId, userId));
    
    if (userStoreRecords.length === 0) {
      return [];
    }
    
    // Get the actual store data
    const storeIds = userStoreRecords.map(record => record.storeId);
    return db.select()
      .from(shopifyStores)
      .where(inArray(shopifyStores.id, storeIds));
  }

  async createUserStore(userStore: InsertUserStore): Promise<UserStore> {
    const [newUserStore] = await db.insert(userStores)
      .values({
        userId: userStore.userId,
        storeId: userStore.storeId,
        role: userStore.role || 'member'
      })
      .returning();
    return newUserStore;
  }
}

// Switch from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
