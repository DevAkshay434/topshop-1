import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema (from the starter project)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isAdmin: boolean("is_admin").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  isAdmin: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define user relations
export const usersRelations = relations(users, ({ many }) => ({
  stores: many(shopifyStores),
}));

// Shopify stores schema for multi-tenant app
export const shopifyStores = pgTable("shopify_stores", {
  id: serial("id").primaryKey(),
  shopName: text("shop_name").notNull().unique(),
  accessToken: text("access_token").notNull(),
  scope: text("scope").notNull(),
  defaultBlogId: text("default_blog_id"),
  isConnected: boolean("is_connected").default(true),
  lastSynced: timestamp("last_synced"),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  uninstalledAt: timestamp("uninstalled_at"),
  planName: text("plan_name"),
  chargeId: text("charge_id"),
  trialEndsAt: timestamp("trial_ends_at"),
});

export const insertShopifyStoreSchema = createInsertSchema(shopifyStores).pick({
  shopName: true, 
  accessToken: true,
  scope: true,
  defaultBlogId: true,
  isConnected: true,
  planName: true,
  chargeId: true,
  trialEndsAt: true,
});

export type InsertShopifyStore = z.infer<typeof insertShopifyStoreSchema>;
export type ShopifyStore = typeof shopifyStores.$inferSelect;

// Define store relations
export const shopifyStoresRelations = relations(shopifyStores, ({ many }) => ({
  users: many(users),
  posts: many(blogPosts),
  activities: many(syncActivities),
  requests: many(contentGenRequests),
}));

// User to store mapping for multi-user per store and multi-store per user
export const userStores = pgTable("user_stores", {
  userId: integer("user_id").notNull().references(() => users.id),
  storeId: integer("store_id").notNull().references(() => shopifyStores.id),
  role: text("role").default("member"), // Could be 'owner', 'admin', 'member', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.storeId] }),
}));

export const insertUserStoreSchema = createInsertSchema(userStores).pick({
  userId: true,
  storeId: true,
  role: true,
});

export type InsertUserStore = z.infer<typeof insertUserStoreSchema>;
export type UserStore = typeof userStores.$inferSelect;

// For backward compatibility, maintaining the old shopifyConnections table
export const shopifyConnections = pgTable("shopify_connections", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull(),
  accessToken: text("access_token").notNull(),
  defaultBlogId: text("default_blog_id"),
  isConnected: boolean("is_connected").default(true),
  lastSynced: timestamp("last_synced"),
});

export const insertShopifyConnectionSchema = createInsertSchema(shopifyConnections).pick({
  storeName: true, 
  accessToken: true,
  defaultBlogId: true,
  isConnected: true,
});

export type InsertShopifyConnection = z.infer<typeof insertShopifyConnectionSchema>;
export type ShopifyConnection = typeof shopifyConnections.$inferSelect;

// Blog post schema
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => shopifyStores.id), // Add store reference for multi-store support
  title: text("title").notNull(),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  category: text("category"),
  tags: text("tags"),
  status: text("status").notNull().default("draft"), // draft, published, scheduled
  scheduledDate: timestamp("scheduled_date"),
  publishedDate: timestamp("published_date"),
  shopifyPostId: text("shopify_post_id"),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  author: text("author"),
  authorId: integer("author_id").references(() => users.id),
});

// Create a modified schema that properly handles dates
export const insertBlogPostSchema = createInsertSchema(blogPosts, {
  scheduledDate: z.date().nullable().or(z.string().transform(val => val ? new Date(val) : null)).or(z.null()),
  publishedDate: z.date().nullable().or(z.string().transform(val => val ? new Date(val) : null)).or(z.null()),
}).pick({
  storeId: true,
  title: true,
  content: true, 
  featuredImage: true,
  category: true,
  tags: true,
  status: true,
  scheduledDate: true,
  publishedDate: true,
  shopifyPostId: true,
  views: true,
  author: true,
  authorId: true
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Define blog post relations
export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  store: one(shopifyStores, {
    fields: [blogPosts.storeId],
    references: [shopifyStores.id],
  }),
  user: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}));

// Sync activity schema
export const syncActivities = pgTable("sync_activities", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => shopifyStores.id), // Add store reference
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  activity: text("activity").notNull(),
  status: text("status").notNull(), // success, failed
  details: text("details"),
});

export const insertSyncActivitySchema = createInsertSchema(syncActivities).pick({
  storeId: true,
  activity: true,
  status: true,
  details: true,
});

export type InsertSyncActivity = z.infer<typeof insertSyncActivitySchema>;
export type SyncActivity = typeof syncActivities.$inferSelect;

// Define sync activity relations
export const syncActivitiesRelations = relations(syncActivities, ({ one }) => ({
  store: one(shopifyStores, {
    fields: [syncActivities.storeId],
    references: [shopifyStores.id],
  }),
}));

// Content generation request schema
export const contentGenRequests = pgTable("content_gen_requests", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => shopifyStores.id), // Add store reference
  userId: integer("user_id").references(() => users.id), // Add user reference
  topic: text("topic").notNull(),
  tone: text("tone").notNull(),
  length: text("length").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull(), // pending, completed, failed
  generatedContent: text("generated_content"),
});

export const insertContentGenRequestSchema = createInsertSchema(contentGenRequests).pick({
  storeId: true,
  userId: true,
  topic: true,
  tone: true,
  length: true,
  status: true,
  generatedContent: true,
});

export type InsertContentGenRequest = z.infer<typeof insertContentGenRequestSchema>;
export type ContentGenRequest = typeof contentGenRequests.$inferSelect;

// Define content gen request relations
export const contentGenRequestsRelations = relations(contentGenRequests, ({ one }) => ({
  store: one(shopifyStores, {
    fields: [contentGenRequests.storeId],
    references: [shopifyStores.id],
  }),
  user: one(users, {
    fields: [contentGenRequests.userId],
    references: [users.id],
  }),
}));

// Relations can be added later if needed
