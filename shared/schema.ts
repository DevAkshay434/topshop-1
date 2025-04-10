import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (from the starter project)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Shopify store connection schema
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
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true, 
  featuredImage: true,
  category: true,
  tags: true,
  status: true,
  scheduledDate: true,
  publishedDate: true,
  shopifyPostId: true,
  views: true
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Sync activity schema
export const syncActivities = pgTable("sync_activities", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  activity: text("activity").notNull(),
  status: text("status").notNull(), // success, failed
  details: text("details"),
});

export const insertSyncActivitySchema = createInsertSchema(syncActivities).pick({
  activity: true,
  status: true,
  details: true,
});

export type InsertSyncActivity = z.infer<typeof insertSyncActivitySchema>;
export type SyncActivity = typeof syncActivities.$inferSelect;

// Content generation request schema
export const contentGenRequests = pgTable("content_gen_requests", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  tone: text("tone").notNull(),
  length: text("length").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status").notNull(), // pending, completed, failed
  generatedContent: text("generated_content"),
});

export const insertContentGenRequestSchema = createInsertSchema(contentGenRequests).pick({
  topic: true,
  tone: true,
  length: true,
  status: true,
  generatedContent: true,
});

export type InsertContentGenRequest = z.infer<typeof insertContentGenRequestSchema>;
export type ContentGenRequest = typeof contentGenRequests.$inferSelect;

// Relations can be added later if needed
