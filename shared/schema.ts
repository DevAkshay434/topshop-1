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
  categories: text("categories"), // Comma-separated list of category IDs
  tags: text("tags"),
  status: text("status").notNull().default("draft"), // draft, published, scheduled
  contentType: text("content_type").default("post"), // post or page
  scheduledDate: timestamp("scheduled_date"),
  scheduledPublishDate: text("scheduled_publish_date"), // Date in YYYY-MM-DD format
  scheduledPublishTime: text("scheduled_publish_time"), // Time in HH:MM format
  publishedDate: timestamp("published_date"),
  shopifyPostId: text("shopify_post_id"),
  shopifyBlogId: text("shopify_blog_id"),
  metaTitle: text("meta_title"), // SEO meta title
  metaDescription: text("meta_description"), // SEO meta description
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  author: text("author"),
  authorId: integer("author_id").references(() => authors.id),
});

// Create a modified schema that properly handles dates
export const insertBlogPostSchema = createInsertSchema(blogPosts, {
  scheduledDate: z.union([
    z.date().optional(), 
    z.string().transform(val => val ? new Date(val) : undefined).optional(),
    z.null().optional(),
    z.undefined()
  ]),
  publishedDate: z.union([
    z.date().optional(), 
    z.string().transform(val => val ? new Date(val) : undefined).optional(),
    z.null().optional(),
    z.undefined()
  ]),
}).pick({
  storeId: true,
  title: true,
  content: true, 
  featuredImage: true,
  category: true,
  categories: true,
  tags: true,
  status: true,
  contentType: true,
  scheduledDate: true,
  publishedDate: true,
  shopifyPostId: true,
  shopifyBlogId: true,
  metaTitle: true,
  metaDescription: true,
  views: true,
  author: true,
  authorId: true
}).extend({
  // Add these fields to support scheduling in the UI
  scheduledPublishDate: z.union([z.string(), z.null()]).optional(),
  scheduledPublishTime: z.union([z.string(), z.null()]).optional(),
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Define blog post relations
export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  store: one(shopifyStores, {
    fields: [blogPosts.storeId],
    references: [shopifyStores.id],
  }),
  author: one(authors, {
    fields: [blogPosts.authorId],
    references: [authors.id],
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

// Gender schema for copywriting style
export const genders = pgTable("genders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGenderSchema = createInsertSchema(genders).pick({
  name: true,
  description: true,
  isActive: true,
});

export type InsertGender = z.infer<typeof insertGenderSchema>;
export type Gender = typeof genders.$inferSelect;

// Style schema for copywriting style combinations
export const styles = pgTable("styles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  genderId: integer("gender_id").notNull().references(() => genders.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStyleSchema = createInsertSchema(styles).pick({
  name: true,
  description: true,
  genderId: true,
  isActive: true,
});

export type InsertStyle = z.infer<typeof insertStyleSchema>;
export type Style = typeof styles.$inferSelect;

// Tone schema for copywriting style combinations
export const tones = pgTable("tones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  styleId: integer("style_id").notNull().references(() => styles.id),
  displayName: text("display_name").notNull(), // The name to add to the final prompt
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertToneSchema = createInsertSchema(tones).pick({
  name: true,
  description: true,
  styleId: true,
  displayName: true,
  isActive: true,
});

export type InsertTone = z.infer<typeof insertToneSchema>;
export type Tone = typeof tones.$inferSelect;

// Define relations
export const gendersRelations = relations(genders, ({ many }) => ({
  styles: many(styles),
}));

export const stylesRelations = relations(styles, ({ one, many }) => ({
  gender: one(genders, {
    fields: [styles.genderId],
    references: [genders.id],
  }),
  tones: many(tones),
}));

export const tonesRelations = relations(tones, ({ one }) => ({
  style: one(styles, {
    fields: [tones.styleId],
    references: [styles.id],
  }),
}));

// Author schema for managing post authors (database-backed instead of Shopify metaobjects)
export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id"),
  shopifyMetaobjectId: text("shopify_metaobject_id"),
  name: text("name").notNull(),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  linkedinUrl: text("linkedin_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertAuthorSchema = createInsertSchema(authors).pick({
  storeId: true,
  shopifyMetaobjectId: true,
  name: true,
  description: true,
  avatarUrl: true,
  linkedinUrl: true,
  isActive: true,
});

export type InsertAuthor = z.infer<typeof insertAuthorSchema>;
export type Author = typeof authors.$inferSelect;

// Define author relations
export const authorsRelations = relations(authors, ({ one, many }) => ({
  store: one(shopifyStores, {
    fields: [authors.storeId],
    references: [shopifyStores.id],
  }),
  posts: many(blogPosts),
}));
