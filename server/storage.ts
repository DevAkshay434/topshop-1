import { 
  users,
  shopifyConnections,
  shopifyStores,
  userStores,
  blogPosts,
  syncActivities,
  contentGenRequests,
  savedProjects,
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
  type InsertContentGenRequest,
  type SavedProject,
  type InsertSavedProject
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
  
  // Saved project operations
  createSavedProject(project: InsertSavedProject): Promise<SavedProject>;
  getSavedProjects(storeId: number): Promise<SavedProject[]>;
  getSavedProject(id: number): Promise<SavedProject | undefined>;
  updateSavedProject(id: number, updates: Partial<InsertSavedProject>): Promise<SavedProject>;
  deleteSavedProject(id: number): Promise<void>;
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
  private savedProjects: Map<number, SavedProject>;
  
  private currentUserId: number;
  private currentStoreId: number;
  private currentBlogPostId: number;
  private currentSyncActivityId: number;
  private currentContentGenRequestId: number;
  private currentSavedProjectId: number;

  constructor() {
    this.users = new Map();
    this.shopifyStores = new Map();
    this.userStores = new Map();
    this.blogPosts = new Map();
    this.syncActivities = [];
    this.contentGenRequests = new Map();
    this.savedProjects = new Map();
    
    this.currentUserId = 1;
    this.currentStoreId = 1;
    this.currentBlogPostId = 1;
    this.currentSyncActivityId = 1;
    this.currentContentGenRequestId = 1;
    this.currentSavedProjectId = 1;
    
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
      contentType: "post",
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
      contentType: "post",
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
      contentType: "post",
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
    
    // Add a sample scheduled page
    const page1: BlogPost = {
      id: this.currentBlogPostId++,
      title: "About Our Store",
      content: "<h1>Welcome to our store!</h1><p>We offer the finest products...</p>",
      category: "Page",
      categories: "Page, About",
      tags: "about, info",
      status: "scheduled",
      contentType: "page",
      publishedDate: null,
      scheduledDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day in the future
      scheduledPublishDate: "2025-05-11", // 1 day in future
      scheduledPublishTime: "10:00",
      views: 0,
      featuredImage: "",
      shopifyPostId: "98765",
      shopifyBlogId: null,
      storeId: 1,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      author: "Administrator",
      authorId: 1
    };
    
    this.blogPosts.set(post1.id, post1);
    this.blogPosts.set(post2.id, post2);
    this.blogPosts.set(post3.id, post3);
    this.blogPosts.set(page1.id, page1);
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

  // Saved project operations (in-memory)
  async createSavedProject(project: InsertSavedProject): Promise<SavedProject> {
    const id = this.currentSavedProjectId++;
    const now = new Date();
    const newProject: SavedProject = {
      id,
      storeId: project.storeId,
      name: project.name,
      description: project.description || null,
      formData: project.formData,
      createdAt: now,
      updatedAt: now
    };
    this.savedProjects.set(id, newProject);
    return newProject;
  }

  async getSavedProjects(storeId: number): Promise<SavedProject[]> {
    return Array.from(this.savedProjects.values())
      .filter(project => project.storeId === storeId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getSavedProject(id: number): Promise<SavedProject | undefined> {
    return this.savedProjects.get(id);
  }

  async updateSavedProject(id: number, updates: Partial<InsertSavedProject>): Promise<SavedProject> {
    const existingProject = this.savedProjects.get(id);
    if (!existingProject) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    const updatedProject: SavedProject = {
      ...existingProject,
      ...updates,
      updatedAt: new Date()
    };
    this.savedProjects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteSavedProject(id: number): Promise<void> {
    this.savedProjects.delete(id);
  }

  // Multi-store Shopify operations (in-memory)
  async getShopifyStores(): Promise<ShopifyStore[]> {
    return Array.from(this.shopifyStores.values());
  }

  async getShopifyStoreByDomain(shopDomain: string): Promise<ShopifyStore | undefined> {
    return Array.from(this.shopifyStores.values()).find(
      (store) => store.storeName === shopDomain
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

  // User-store relationship operations (in-memory)
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

// DatabaseStorage class with PostgreSQL operations
class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Legacy Shopify connection operations (for backward compatibility)
  async getShopifyConnection(): Promise<ShopifyConnection | undefined> {
    const [connection] = await db.select().from(shopifyConnections).limit(1);
    return connection;
  }

  async createShopifyConnection(connection: InsertShopifyConnection): Promise<ShopifyConnection> {
    const [newConnection] = await db.insert(shopifyConnections).values(connection).returning();
    return newConnection;
  }

  async updateShopifyConnection(connection: Partial<ShopifyConnection>): Promise<ShopifyConnection | undefined> {
    if (!connection.id) {
      return undefined;
    }
    const [updated] = await db.update(shopifyConnections)
      .set(connection)
      .where(eq(shopifyConnections.id, connection.id))
      .returning();
    return updated;
  }

  // Multi-store Shopify operations (for public app)
  async getShopifyStores(): Promise<ShopifyStore[]> {
    return await db.select().from(shopifyStores).orderBy(desc(shopifyStores.lastSynced));
  }

  async getShopifyStoreByDomain(shopDomain: string): Promise<ShopifyStore | undefined> {
    const [store] = await db.select().from(shopifyStores)
      .where(eq(shopifyStores.storeName, shopDomain))
      .limit(1);
    return store;
  }

  async getShopifyStore(id: number): Promise<ShopifyStore | undefined> {
    const [store] = await db.select().from(shopifyStores)
      .where(eq(shopifyStores.id, id))
      .limit(1);
    return store;
  }

  async createShopifyStore(store: InsertShopifyStore): Promise<ShopifyStore> {
    const [newStore] = await db.insert(shopifyStores).values({
      storeName: store.storeName,
      accessToken: store.accessToken,
      defaultBlogId: store.defaultBlogId,
      isConnected: store.isConnected,
      lastSynced: new Date()
    }).returning();
    return {
      ...newStore,
      lastSynced: newStore.lastSynced || new Date()
    };
  }

  async updateShopifyStore(id: number, store: Partial<ShopifyStore>): Promise<ShopifyStore> {
    const [updatedStore] = await db.update(shopifyStores)
      .set(store)
      .where(eq(shopifyStores.id, id))
      .returning();
    return updatedStore;
  }

  // User-store relationship
  async getUserStores(userId: number): Promise<ShopifyStore[]> {
    const userStoreRelations = await db.select()
      .from(userStores)
      .leftJoin(shopifyStores, eq(userStores.storeId, shopifyStores.id))
      .where(eq(userStores.userId, userId));
    
    return userStoreRelations
      .map(relation => relation.shopify_stores)
      .filter((store): store is ShopifyStore => store !== null);
  }

  async createUserStore(userStore: InsertUserStore): Promise<UserStore> {
    const [newUserStore] = await db.insert(userStores).values(userStore).returning();
    return newUserStore;
  }

  // Blog post operations
  async getBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const now = new Date();
    const [newPost] = await db.insert(blogPosts).values({
      ...post,
      createdAt: now,
      updatedAt: now
    }).returning();
    return {
      id: newPost.id,
      views: newPost.views,
      scheduledPublishDate: newPost.scheduledPublishDate,
      scheduledPublishTime: newPost.scheduledPublishTime,
      title: newPost.title,
      content: newPost.content,
      status: newPost.status || 'draft',
      storeId: newPost.storeId,
      featuredImage: newPost.featuredImage,
      category: newPost.category,
      categories: newPost.categories,
      tags: newPost.tags || '',
      contentType: newPost.contentType || 'post',
      publishedDate: newPost.publishedDate,
      scheduledDate: newPost.scheduledDate,
      shopifyPostId: newPost.shopifyPostId,
      shopifyBlogId: newPost.shopifyBlogId,
      createdAt: newPost.createdAt,
      updatedAt: newPost.updatedAt,
      author: newPost.author || 'Administrator',
      authorId: newPost.authorId
    };
  }

  async updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost | undefined> {
    const [updated] = await db.update(blogPosts)
      .set({
        ...post,
        updatedAt: new Date()
      })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return result.rowCount > 0;
  }

  async getRecentPosts(limit: number): Promise<BlogPost[]> {
    return await db.select().from(blogPosts)
      .orderBy(desc(blogPosts.createdAt))
      .limit(limit);
  }

  async getScheduledPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts)
      .where(eq(blogPosts.status, 'scheduled'))
      .orderBy(asc(blogPosts.scheduledDate));
  }

  async getPublishedPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedDate));
  }

  // Sync activity operations
  async getSyncActivities(limit: number): Promise<SyncActivity[]> {
    return await db.select().from(syncActivities)
      .orderBy(desc(syncActivities.timestamp))
      .limit(limit);
  }

  async createSyncActivity(activity: InsertSyncActivity): Promise<SyncActivity> {
    const [newActivity] = await db.insert(syncActivities).values({
      ...activity,
      timestamp: new Date()
    }).returning();
    return {
      id: newActivity.id,
      timestamp: newActivity.timestamp,
      status: newActivity.status,
      activity: newActivity.activity,
      storeId: newActivity.storeId,
      details: newActivity.details
    };
  }

  // Content generation request operations
  async createContentGenRequest(request: InsertContentGenRequest): Promise<ContentGenRequest> {
    const [newRequest] = await db.insert(contentGenRequests).values({
      ...request,
      timestamp: new Date()
    }).returning();
    return {
      id: newRequest.id,
      timestamp: newRequest.timestamp,
      length: newRequest.length,
      status: newRequest.status,
      topic: newRequest.topic,
      tone: newRequest.tone,
      userId: newRequest.userId,
      storeId: newRequest.storeId,
      generatedContent: newRequest.generatedContent
    };
  }

  async updateContentGenRequest(id: number, request: Partial<ContentGenRequest>): Promise<ContentGenRequest | undefined> {
    const [updated] = await db.update(contentGenRequests)
      .set(request)
      .where(eq(contentGenRequests.id, id))
      .returning();
    return updated;
  }

  async getContentGenRequest(id: number): Promise<ContentGenRequest | undefined> {
    const [request] = await db.select().from(contentGenRequests)
      .where(eq(contentGenRequests.id, id))
      .limit(1);
    return request;
  }

  // Saved project operations (PostgreSQL database)
  async createSavedProject(project: InsertSavedProject): Promise<SavedProject> {
    const [newProject] = await db.insert(savedProjects).values({
      storeId: project.storeId,
      name: project.name,
      description: project.description || null,
      formData: project.formData
    }).returning();
    return newProject;
  }

  async getSavedProjects(storeId: number): Promise<SavedProject[]> {
    return await db.select().from(savedProjects)
      .where(eq(savedProjects.storeId, storeId))
      .orderBy(desc(savedProjects.updatedAt));
  }

  async getSavedProject(id: number): Promise<SavedProject | undefined> {
    const [project] = await db.select().from(savedProjects)
      .where(eq(savedProjects.id, id))
      .limit(1);
    return project;
  }

  async updateSavedProject(id: number, updates: Partial<InsertSavedProject>): Promise<SavedProject> {
    const [updatedProject] = await db.update(savedProjects)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(savedProjects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteSavedProject(id: number): Promise<void> {
    await db.delete(savedProjects).where(eq(savedProjects.id, id));
  }
}

// Export an instance of MemStorage for now to get server running
export const storage = new MemStorage();
