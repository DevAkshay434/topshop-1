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
import { eq, desc, asc, lte, gte, sql } from "drizzle-orm";

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
  private shopifyStores: Map<number, ShopifyStore>;
  private userStores: Map<string, UserStore>; // Composite key: "userId:storeId"
  private blogPosts: Map<number, BlogPost>;
  private syncActivities: SyncActivity[];
  private contentGenRequests: Map<number, ContentGenRequest>;
  
  private currentUserId: number;
  private currentStoreId: number;
  private currentBlogPostId: number;
  private currentSyncActivityId: number;
  private currentContentGenRequestId: number;

  constructor() {
    this.users = new Map();
    this.shopifyStores = new Map();
    this.userStores = new Map();
    this.blogPosts = new Map();
    this.syncActivities = [];
    this.contentGenRequests = new Map();
    
    this.currentUserId = 1;
    this.currentStoreId = 1;
    this.currentBlogPostId = 1;
    this.currentSyncActivityId = 1;
    this.currentContentGenRequestId = 1;
    
    // Add some initial data for testing
    const now = new Date();
    
    // Add a default user
    this.users.set(1, {
      id: 1,
      username: "admin",
      password: "admin",
      email: "admin@example.com",
      name: "Administrator",
      createdAt: now,
      isAdmin: true
    });
    
    // Add a sample shopify connection
    this.shopifyConnection = {
      id: 1,
      storeName: "fashion-boutique.myshopify.com",
      accessToken: "sample_token",
      defaultBlogId: "fashion-blog",
      isConnected: true,
      lastSynced: now
    };
    
    // Add a sample store for multi-store support
    const defaultStore: ShopifyStore = {
      id: 1,
      shopName: "fashion-boutique.myshopify.com",
      accessToken: "sample_token",
      scope: "read_products,write_products,read_content,write_content",
      defaultBlogId: "fashion-blog",
      isConnected: true,
      lastSynced: now,
      installedAt: now,
      uninstalledAt: null,
      planName: "free",
      chargeId: null,
      trialEndsAt: null
    };
    this.shopifyStores.set(1, defaultStore);
    
    // Connect user to store
    this.userStores.set("1:1", {
      userId: 1,
      storeId: 1,
      role: "owner",
      createdAt: now
    });
    
    // Add some sample sync activities
    this.syncActivities.push({
      id: this.currentSyncActivityId++,
      timestamp: now,
      activity: "Sync completed successfully",
      status: "success",
      details: "Successfully synchronized 5 posts",
      storeId: 1
    });
    
    this.syncActivities.push({
      id: this.currentSyncActivityId++,
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // yesterday
      activity: "Published \"Summer Collection\"",
      status: "success",
      details: "Successfully published post to Shopify",
      storeId: 1
    });
    
    // Add some sample blog posts
    const post1: BlogPost = {
      id: this.currentBlogPostId++,
      title: "Summer Fashion Trends 2023: What's Hot This Season",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      category: "Fashion",
      categories: "Fashion, Summer",
      tags: "summer, fashion, trends",
      status: "published",
      publishedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      views: 342,
      featuredImage: "",
      scheduledDate: null,
      scheduledPublishDate: null,
      scheduledPublishTime: null,
      shopifyPostId: "12345",
      shopifyBlogId: "116776337722",
      storeId: 1,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      author: "Administrator",
      authorId: 1
    };
    
    const post2: BlogPost = {
      id: this.currentBlogPostId++,
      title: "How to Style Sustainable Clothing for Every Occasion",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      category: "Style Tips",
      categories: "Style Tips, Fashion",
      tags: "sustainable, fashion, styling",
      status: "published",
      publishedDate: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      views: 278,
      featuredImage: "",
      scheduledDate: null,
      scheduledPublishDate: null,
      scheduledPublishTime: null,
      shopifyPostId: "12346",
      shopifyBlogId: "116776337722",
      storeId: 1,
      createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      author: "Administrator",
      authorId: 1
    };
    
    const post3: BlogPost = {
      id: this.currentBlogPostId++,
      title: "10 Must-Have Accessories for Your Summer Wardrobe",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
      category: "Accessories",
      categories: "Accessories, Fashion",
      tags: "accessories, summer, fashion",
      status: "scheduled",
      publishedDate: null,
      scheduledDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      scheduledPublishDate: "2025-05-13", // 3 days in future
      scheduledPublishTime: "09:30",
      views: 0,
      featuredImage: "",
      shopifyPostId: null,
      shopifyBlogId: "116776337722",
      storeId: 1,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      author: "Administrator",
      authorId: 1
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
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
      email: insertUser.email || null,
      name: insertUser.name || null,
      isAdmin: insertUser.isAdmin || false
    };
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
    console.log("MemStorage.createBlogPost - Input:", JSON.stringify(post, null, 2));
    const id = this.currentBlogPostId++;
    const newPost: BlogPost = { 
      ...post, 
      id,
      views: post.views || 0,
      // Explicitly handle the scheduledPublishDate and scheduledPublishTime fields
      scheduledPublishDate: post.scheduledPublishDate || null,
      scheduledPublishTime: post.scheduledPublishTime || null
    };
    console.log("MemStorage.createBlogPost - Created post:", JSON.stringify(newPost, null, 2));
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
  
  // Multi-store Shopify operations
  async getShopifyStores(): Promise<ShopifyStore[]> {
    return Array.from(this.shopifyStores.values());
  }
  
  async getShopifyStoreByDomain(shopDomain: string): Promise<ShopifyStore | undefined> {
    return Array.from(this.shopifyStores.values()).find(
      (store) => store.shopName === shopDomain
    );
  }
  
  async getShopifyStore(id: number): Promise<ShopifyStore | undefined> {
    return this.shopifyStores.get(id);
  }
  
  async createShopifyStore(store: InsertShopifyStore): Promise<ShopifyStore> {
    const id = this.currentStoreId++;
    const newStore: ShopifyStore = {
      ...store,
      id,
      installedAt: new Date(),
      lastSynced: new Date(),
      uninstalledAt: null,
      chargeId: null,
      trialEndsAt: null,
      defaultBlogId: store.defaultBlogId || null,
      isConnected: store.isConnected !== undefined ? store.isConnected : true,
      planName: store.planName || null
    };
    this.shopifyStores.set(id, newStore);
    return newStore;
  }
  
  async updateShopifyStore(id: number, store: Partial<ShopifyStore>): Promise<ShopifyStore> {
    const existingStore = this.shopifyStores.get(id);
    if (!existingStore) {
      throw new Error(`Store with ID ${id} not found`);
    }
    
    const updatedStore = { ...existingStore, ...store };
    this.shopifyStores.set(id, updatedStore);
    return updatedStore;
  }
  
  // User-store relationship operations
  async getUserStores(userId: number): Promise<ShopifyStore[]> {
    // Find all user-store relationships for this user
    const userStoreIds = Array.from(this.userStores.entries())
      .filter(([key, value]) => value.userId === userId)
      .map(([key, value]) => value.storeId);
    
    // Get the store objects
    return userStoreIds
      .map(storeId => this.shopifyStores.get(storeId))
      .filter(store => store !== undefined) as ShopifyStore[];
  }
  
  async createUserStore(userStore: InsertUserStore): Promise<UserStore> {
    // Create composite key
    const key = `${userStore.userId}:${userStore.storeId}`;
    
    // Check if relationship already exists
    if (this.userStores.has(key)) {
      throw new Error('User-store relationship already exists');
    }
    
    // Create new relationship
    const newUserStore: UserStore = {
      userId: userStore.userId,
      storeId: userStore.storeId,
      role: userStore.role || null,
      createdAt: new Date()
    };
    
    this.userStores.set(key, newUserStore);
    return newUserStore;
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
    console.log("DatabaseStorage.createBlogPost - Input:", JSON.stringify(post, null, 2));
    // Ensure required fields are present and nulls are handled properly
    const [newPost] = await db.insert(blogPosts)
      .values({
        title: post.title,
        content: post.content,
        status: post.status || 'draft',
        featuredImage: post.featuredImage || null,
        category: post.category || null,
        categories: post.categories || null,
        tags: post.tags || null,
        scheduledDate: post.scheduledDate || null,
        scheduledPublishDate: post.scheduledPublishDate || null,
        scheduledPublishTime: post.scheduledPublishTime || null,
        publishedDate: post.publishedDate || null,
        shopifyPostId: post.shopifyPostId || null,
        shopifyBlogId: post.shopifyBlogId || null,
        storeId: post.storeId || 1,
        views: post.views || 0,
        author: post.author || null,
        authorId: post.authorId || null
      })
      .returning();
      
    console.log("DatabaseStorage.createBlogPost - Created post:", JSON.stringify(newPost, null, 2));
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
    // Join user_stores with shopify_stores to get all stores for a user
    const stores = await db.select({
        id: shopifyStores.id,
        shopName: shopifyStores.shopName,
        accessToken: shopifyStores.accessToken,
        scope: shopifyStores.scope,
        defaultBlogId: shopifyStores.defaultBlogId,
        isConnected: shopifyStores.isConnected,
        lastSynced: shopifyStores.lastSynced,
        installedAt: shopifyStores.installedAt,
        uninstalledAt: shopifyStores.uninstalledAt,
        planName: shopifyStores.planName,
        chargeId: shopifyStores.chargeId,
        trialEndsAt: shopifyStores.trialEndsAt
      })
      .from(shopifyStores)
      .innerJoin(userStores, eq(userStores.storeId, shopifyStores.id))
      .where(eq(userStores.userId, userId));
    
    return stores;
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

// Use MemStorage as the database connection is having issues
const memStorage = new MemStorage();
const dbStorage = new DatabaseStorage();

// Create a fallback storage that tries DatabaseStorage first and falls back to MemStorage
class FallbackStorage implements IStorage {
  private async tryOrFallback<T>(dbOperation: () => Promise<T>, memOperation: () => Promise<T>): Promise<T> {
    try {
      return await dbOperation();
    } catch (error) {
      console.warn("Database operation failed, falling back to in-memory storage:", error);
      return await memOperation();
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getUser(id),
      () => memStorage.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getUserByUsername(username),
      () => memStorage.getUserByUsername(username)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.tryOrFallback(
      () => dbStorage.createUser(user),
      () => memStorage.createUser(user)
    );
  }

  async getShopifyConnection(): Promise<ShopifyConnection | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getShopifyConnection(),
      () => memStorage.getShopifyConnection()
    );
  }

  async createShopifyConnection(connection: InsertShopifyConnection): Promise<ShopifyConnection> {
    return this.tryOrFallback(
      () => dbStorage.createShopifyConnection(connection),
      () => memStorage.createShopifyConnection(connection)
    );
  }

  async updateShopifyConnection(connection: Partial<ShopifyConnection>): Promise<ShopifyConnection | undefined> {
    return this.tryOrFallback(
      () => dbStorage.updateShopifyConnection(connection),
      () => memStorage.updateShopifyConnection(connection)
    );
  }

  async getShopifyStores(): Promise<ShopifyStore[]> {
    return this.tryOrFallback(
      () => dbStorage.getShopifyStores(),
      () => memStorage.getShopifyStores()
    );
  }

  async getShopifyStoreByDomain(shopDomain: string): Promise<ShopifyStore | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getShopifyStoreByDomain(shopDomain),
      () => memStorage.getShopifyStoreByDomain(shopDomain)
    );
  }

  async getShopifyStore(id: number): Promise<ShopifyStore | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getShopifyStore(id),
      () => memStorage.getShopifyStore(id)
    );
  }

  async createShopifyStore(store: InsertShopifyStore): Promise<ShopifyStore> {
    return this.tryOrFallback(
      () => dbStorage.createShopifyStore(store),
      () => memStorage.createShopifyStore(store)
    );
  }

  async updateShopifyStore(id: number, store: Partial<ShopifyStore>): Promise<ShopifyStore> {
    return this.tryOrFallback(
      () => dbStorage.updateShopifyStore(id, store),
      () => memStorage.updateShopifyStore(id, store)
    );
  }

  async getUserStores(userId: number): Promise<ShopifyStore[]> {
    return this.tryOrFallback(
      () => dbStorage.getUserStores(userId),
      () => memStorage.getUserStores(userId)
    );
  }

  async createUserStore(userStore: InsertUserStore): Promise<UserStore> {
    return this.tryOrFallback(
      () => dbStorage.createUserStore(userStore),
      () => memStorage.createUserStore(userStore)
    );
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    return this.tryOrFallback(
      () => dbStorage.getBlogPosts(),
      () => memStorage.getBlogPosts()
    );
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getBlogPost(id),
      () => memStorage.getBlogPost(id)
    );
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    return this.tryOrFallback(
      () => dbStorage.createBlogPost(post),
      () => memStorage.createBlogPost(post)
    );
  }

  async updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost | undefined> {
    return this.tryOrFallback(
      () => dbStorage.updateBlogPost(id, post),
      () => memStorage.updateBlogPost(id, post)
    );
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    return this.tryOrFallback(
      () => dbStorage.deleteBlogPost(id),
      () => memStorage.deleteBlogPost(id)
    );
  }

  async getRecentPosts(limit: number): Promise<BlogPost[]> {
    return this.tryOrFallback(
      () => dbStorage.getRecentPosts(limit),
      () => memStorage.getRecentPosts(limit)
    );
  }

  async getScheduledPosts(): Promise<BlogPost[]> {
    return this.tryOrFallback(
      () => dbStorage.getScheduledPosts(),
      () => memStorage.getScheduledPosts()
    );
  }

  async getPublishedPosts(): Promise<BlogPost[]> {
    return this.tryOrFallback(
      () => dbStorage.getPublishedPosts(),
      () => memStorage.getPublishedPosts()
    );
  }

  async getSyncActivities(limit: number): Promise<SyncActivity[]> {
    return this.tryOrFallback(
      () => dbStorage.getSyncActivities(limit),
      () => memStorage.getSyncActivities(limit)
    );
  }

  async createSyncActivity(activity: InsertSyncActivity): Promise<SyncActivity> {
    return this.tryOrFallback(
      () => dbStorage.createSyncActivity(activity),
      () => memStorage.createSyncActivity(activity)
    );
  }

  async createContentGenRequest(request: InsertContentGenRequest): Promise<ContentGenRequest> {
    return this.tryOrFallback(
      () => dbStorage.createContentGenRequest(request),
      () => memStorage.createContentGenRequest(request)
    );
  }

  async updateContentGenRequest(id: number, request: Partial<ContentGenRequest>): Promise<ContentGenRequest | undefined> {
    return this.tryOrFallback(
      () => dbStorage.updateContentGenRequest(id, request),
      () => memStorage.updateContentGenRequest(id, request)
    );
  }

  async getContentGenRequest(id: number): Promise<ContentGenRequest | undefined> {
    return this.tryOrFallback(
      () => dbStorage.getContentGenRequest(id),
      () => memStorage.getContentGenRequest(id)
    );
  }
}

// Export an instance of FallbackStorage that will use MemStorage if DatabaseStorage fails
export const storage = new FallbackStorage();
