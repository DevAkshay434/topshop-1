import axios, { AxiosInstance } from 'axios';
import { ShopifyConnection, ShopifyStore, BlogPost } from '@shared/schema';
import { createDateInTimezone } from '@shared/timezone';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

// Interface for Shopify Product
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  image?: {
    id: string;
    src: string;
    width?: number;
    height?: number;
    alt?: string;
    created_at?: string;
    updated_at?: string;
  };
  images?: Array<{
    id: string;
    src: string;
    width?: number;
    height?: number;
    alt?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  variants?: Array<{
    id: string;
    title: string;
    price?: string;
    sku?: string;
    position?: number;
    inventory_quantity?: number;
    image?: {
      id: string;
      src: string;
      width?: number;
      height?: number;
      alt?: string;
    };
  }>;
}

// Interface for Shopify Media File
export interface ShopifyMediaFile {
  id: string;
  url: string;
  filename?: string;
  mimetype?: string;
  filesize?: number;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  type?: string;
  created_at?: string;
  updated_at?: string;
}

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
      baseURL: `https://${store.shopName}/admin/api/2025-07`,
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
   * @param accessToken Optional access token to override store token
   * @returns An Axios instance configured for the store
   */
  private getClient(store: ShopifyStore | string, accessToken?: string): AxiosInstance {
    if (typeof store === 'string') {
      // If store is a string (just the store name)
      const storeName = store;
      
      // We need an access token in this case
      if (!accessToken) {
        throw new Error(`No access token provided for store ${storeName}`);
      }
      
      // Check if client exists for this store
      const client = this.clients.get(storeName);
      if (client) {
        return client;
      }
      
      // Create a temporary store object to initialize client
      const tempStore: ShopifyStore = {
        id: 0,
        shopName: storeName,
        accessToken: accessToken,
        scope: '',
        defaultBlogId: null,
        isConnected: true,
        lastSynced: null,
        installedAt: new Date(),
        uninstalledAt: null, 
        planName: null,
        chargeId: null,
        trialEndsAt: null
      };
      
      // Initialize and return a new client
      this.initializeClient(tempStore);
      return this.clients.get(storeName)!;
    } else {
      // Normal case - store is a ShopifyStore object
      const storeName = store.shopName;
      
      // Check if client exists
      const client = this.clients.get(storeName);
      
      // If client exists, return it
      if (client) {
        return client;
      }
      
      // Otherwise, initialize and return a new client
      this.initializeClient(store);
      return this.clients.get(storeName)!;
    }
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
      
      // Debug log the post object to see what meta fields are available
      console.log(`Post object received in createArticle:`, {
        id: post.id,
        title: post.title,
        metaTitle: (post as any).metaTitle,
        metaDescription: (post as any).metaDescription,
        hasMetaTitle: !!(post as any).metaTitle,
        hasMetaDescription: !!(post as any).metaDescription
      });

      // Convert categories to tags format for Shopify
      let tagsString = post.tags || "";
      
      // Add categories as tags if they exist
      if ((post as any).categories && Array.isArray((post as any).categories) && (post as any).categories.length > 0) {
        const categoryTags = (post as any).categories.join(', ');
        if (tagsString) {
          tagsString += ', ' + categoryTags;
        } else {
          tagsString = categoryTags;
        }
        console.log(`Added categories as tags: ${categoryTags}`);
      }

      // Create the article object with proper validation
      const articleData: any = {
        title: post.title,
        author: post.author || '', // No fallback to store name - require explicit author
        body_html: processedContent,
        tags: tagsString,
        summary: (post as any).summary || "", // Add summary field if available
        handle: (() => {
          if (!post.title) return 'untitled';
          const baseHandle = post.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
          return `${baseHandle}-${timestamp}`;
        })()
      };

      // CRITICAL FIX: Use article title as visible heading (NOT meta title)
      // Article title = visible blog post heading
      // Meta title = SEO only (added via metafields after creation)
      articleData.title = post.title;
      console.log(`✓ Using article title as blog post heading: ${post.title}`);
      
      // CRITICAL FIX: Add featured image if it exists and is properly formatted
      if (post.featuredImage && typeof post.featuredImage === 'string' && post.featuredImage.trim()) {
        const featuredImageUrl = post.featuredImage.trim();
        articleData.image = { src: featuredImageUrl };
        console.log(`✓ Added featured image to article: ${featuredImageUrl}`);
      } else {
        console.log(`✗ No featured image found or invalid format`);
      }

      // Add author information - prioritize selected author from database
      let authorName = ''; // No default fallback - require explicit author selection
      
      console.log(`Complete post data before Shopify:`, {
        id: post.id,
        title: post.title,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        authorId: (post as any).authorId
      });
      
      // First priority: Use the author name if already resolved in post.author
      if ((post as any).author && typeof (post as any).author === 'string') {
        authorName = (post as any).author;
        console.log(`Using resolved author name: ${authorName}`);
      }
      // Second priority: If we have authorId but no resolved name, fetch from database
      else if ((post as any).authorId) {
        const numericAuthorId = typeof (post as any).authorId === 'string' ? parseInt((post as any).authorId, 10) : (post as any).authorId;
        console.log(`Found authorId in post: ${(post as any).authorId} (converted to: ${numericAuthorId}), fetching from database`);
        try {
          const { storage } = await import('../storage');
          const authors = await storage.getAuthors();
          console.log(`Available authors in database:`, authors.map(a => ({ id: a.id, name: a.name })));
          
          const author = authors.find(a => parseInt(a.id) === numericAuthorId);
          if (author) {
            authorName = author.name;
            console.log(`✓ Successfully fetched author from storage: ${authorName} (ID: ${author.id})`);
          } else {
            console.log(`✗ Author ID ${numericAuthorId} not found in storage. Available IDs: ${authors.map(a => a.id).join(', ')}`);
          }
        } catch (error) {
          console.error('Error fetching author from storage:', error);
        }
      } else {
        console.log(`No author specified for post ${post.id} - skipping author information`);
      }
      
      articleData.author = authorName;
      console.log(`Final article author set to: ${authorName}`);
      
      // For scheduled posts, we need to implement a different approach
      // Shopify's API behavior is more complex:
      // 1. For drafts: set published=false (no published_at)
      // 2. For immediate publishing: set published=true (with current published_at)  
      // 3. For scheduled: set published=false AND use published_at for the future date
      //    (this is different from Shopify Admin UI which shows published=true)
      
      if (isScheduledPublishing && futurePublishDate) {
        console.log(`Setting up custom scheduled publishing for future date: ${futurePublishDate.toISOString()}`);
        
        // FIXED: For scheduled posts, create as draft WITHOUT published_at
        // Our custom scheduler will publish it at the right time
        articleData.published = false;
        articleData.published_at = null; // Don't set this - keeps it as true draft
        
        // Store scheduling metadata for our custom scheduler
        articleData.customScheduled = true;
        articleData.scheduledForDate = futurePublishDate.toISOString();
        
        console.log(`DRAFT CREATED: Article will remain unpublished until custom scheduler activates at ${futurePublishDate.toISOString()}`);
      } else if (post.status === 'published' || 
                (post as any).publicationType === 'publish' || 
                (post as any).postStatus === 'published') {
        // For immediate publishing - check multiple flags
        console.log("Publishing article immediately");
        articleData.published = true;
        articleData.published_at = new Date().toISOString();
      } else {
        // For drafts
        console.log("Saving article as draft");
        articleData.published = false;
        // Remove published_at to prevent scheduling
        articleData.published_at = undefined;
      }
      
      // Log the scheduling configuration
      console.log(`Article scheduling configuration:`, {
        published: articleData.published,
        published_at: articleData.published_at,
        isScheduled,
        status: post.status
      });
      
      // Add author information with avatar FIRST, before any image processing
      if (authorName && articleData.body_html) {
        const authorId = (post as any).authorId || 'author';
        
        // Get author avatar from database if available
        let authorAvatar = '';
        try {
          if ((post as any).authorId) {
            const { storage } = await import('../storage');
            const authors = await storage.getAuthors();
            const author = authors.find(a => parseInt(a.id) === parseInt((post as any).authorId.toString()));
            if (author && author.avatarUrl) {
              authorAvatar = `<img src="${author.avatarUrl}" alt="${authorName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 12px;" />`;
            } else {
              // Create initials avatar if no image
              const initials = authorName.split(' ').map(n => n[0]).join('').toUpperCase();
              authorAvatar = `<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 12px; margin-right: 12px;">${initials}</div>`;
            }
          }
        } catch (error) {
          console.error('Error fetching author avatar:', error);
          // Fallback to initials
          const initials = authorName.split(' ').map(n => n[0]).join('').toUpperCase();
          authorAvatar = `<div style="width: 32px; height: 32px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #374151; font-size: 12px; margin-right: 12px;">${initials}</div>`;
        }
        
        const writtenByHTML = `<div style="text-align: center; margin: 20px 0; padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="display: inline-flex; align-items: center; justify-content: center;">
            ${authorAvatar}
            <span style="color: #6b7280; font-size: 16px;">
              Written by <a href="#author-box" style="color: #2563eb; text-decoration: none; font-weight: 500; border-bottom: 1px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderBottomColor='#2563eb'; this.style.color='#1d4ed8'" onmouseout="this.style.borderBottomColor='transparent'; this.style.color='#2563eb'">${authorName}</a>
            </span>
          </div>
        </div>`;
        
        // Add at the very beginning of content BEFORE image processing
        articleData.body_html = writtenByHTML + articleData.body_html;
        
        console.log(`Added centered "Written by ${authorName}" with avatar at very beginning of content`);
      }

      // CRITICAL FIX: Properly handle images for Shopify while avoiding 25MP limit issues
      if (articleData.body_html) {
        console.log('Processing content for Shopify compatibility...');
        
        // First, handle secondary image placement markers by temporarily removing them from optimization
        const imageMarkers: string[] = [];
        let tempContent = articleData.body_html;
        
        // Extract and preserve existing secondary images with their alt text
        tempContent = tempContent.replace(
          /<div[^>]*secondary[^>]*>[\s\S]*?<img[^>]*src="([^"]*?)"[^>]*alt="([^"]*?)"[^>]*>[\s\S]*?<\/div>/gi,
          (match: string, url: string, altText: string) => {
            const placeholder = `<!-- SECONDARY_IMAGE_PRESERVED_${imageMarkers.length} -->`;
            imageMarkers.push(match);
            console.log(`✓ Preserved secondary image: ${altText || 'No alt text'} (${url.substring(0, 50)}...)`);
            return placeholder;
          }
        );
        
        // Now optimize remaining images with size constraints (but preserve author avatars)
        tempContent = tempContent.replace(
          /<img[^>]*src="([^"]*?)"[^>]*>/gi,
          (match: string, url: string) => {
            // Skip author avatars - they should maintain their original sizing
            if (match.includes('margin-right: 12px') || match.includes('alt="' + authorName + '"') || match.includes('width: 40px') || match.includes('width: 48px') || match.includes('object-fit: cover; margin-right')) {
              console.log(`🔒 PROTECTED author avatar from resizing: ${match.substring(0, 100)}...`);
              return match; // Return unchanged
            }
            // Extract alt text from original image tag
            const altMatch = match.match(/alt="([^"]*)"/i);
            const altText = altMatch ? altMatch[1] : '';
            
            let optimizedUrl = url;
            
            // Optimize image URLs for different sources - use smaller sizes to avoid 25MP limit
            if (url.includes('images.pexels.com')) {
              // Use small size for Pexels to avoid 25MP limit
              optimizedUrl = url.replace('/original/', '/small/');
              optimizedUrl = optimizedUrl.replace('/large2x/', '/small/');
              optimizedUrl = optimizedUrl.replace('/large/', '/small/');
              optimizedUrl = optimizedUrl.replace('/medium/', '/small/');
              
              if (!optimizedUrl.includes('/small/') && !optimizedUrl.includes('w=')) {
                const separator = optimizedUrl.includes('?') ? '&' : '?';
                optimizedUrl = optimizedUrl + `${separator}w=600&h=400&fit=crop&auto=compress&cs=tinysrgb&q=70`;
              }
            }
            else if (url.includes('cdn.shopify.com')) {
              // Use smaller Shopify image sizes to avoid 25MP limit
              optimizedUrl = url.replace('_master', '_600x600');
              optimizedUrl = optimizedUrl.replace('_original', '_600x600');
              optimizedUrl = optimizedUrl.replace('_2048x2048', '_600x600');
              optimizedUrl = optimizedUrl.replace('_1024x1024', '_600x600');
              optimizedUrl = optimizedUrl.replace('_800x800', '_600x600');
            }
            else if (url.startsWith('/uploads/')) {
              // Handle uploaded images - don't add query parameters to relative URLs
              // These should be served from the local server without transformation
              optimizedUrl = url;
            }
            else if (url.includes('shopify.com/s/files/')) {
              // Handle Shopify Files API URLs - these are already optimized
              optimizedUrl = url;
            }
            else if (url.startsWith('http') && !url.includes('youtube.com')) {
              // Add size constraints for external images
              const separator = optimizedUrl.includes('?') ? '&' : '?';
              if (!url.includes('w=') && !url.includes('width=') && !url.includes('h=') && !url.includes('height=')) {
                optimizedUrl = optimizedUrl + `${separator}w=600&h=400&fit=crop&q=70&auto=compress`;
              }
            }
            
            // Reduce extreme dimensions to avoid 25MP limit (more aggressive)
            optimizedUrl = optimizedUrl.replace(/(\?|&)(w|width)=(\d+)/g, (match, prefix, param, value) => {
              const numValue = parseInt(value);
              return numValue > 600 ? `${prefix}${param}=600` : match;
            });
            
            optimizedUrl = optimizedUrl.replace(/(\?|&)(h|height)=(\d+)/g, (match, prefix, param, value) => {
              const numValue = parseInt(value);
              return numValue > 400 ? `${prefix}${param}=400` : match;
            });
            
            // Return properly formatted image
            // Default: Secondary blog images should be normal size and rectangular
            return `<div style="text-align: center; margin: 20px 0;"><img src="${optimizedUrl}" alt="${altText}" style="max-width: 600px; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" /></div>`;
          }
        );
        
        // Restore preserved secondary images
        imageMarkers.forEach((marker, index) => {
          tempContent = tempContent.replace(`<!-- SECONDARY_IMAGE_PRESERVED_${index} -->`, marker);
        });
        
        articleData.body_html = tempContent;
        console.log(`✓ Content processing complete. Preserved ${imageMarkers.length} secondary images. Content length: ${articleData.body_html.length}`);
      }



      // Validate content before sending to Shopify
      if (articleData.body_html && articleData.body_html.length > 65000) {
        console.log(`Content length ${articleData.body_html.length} exceeds Shopify limit, truncating...`);
        articleData.body_html = articleData.body_html.substring(0, 60000) + '...</p>';
      }
      
      // Ensure title is not too long
      if (articleData.title && articleData.title.length > 255) {
        console.log(`Title too long, truncating from ${articleData.title.length} to 255 characters`);
        articleData.title = articleData.title.substring(0, 252) + '...';
      }
      
      // Log the request with detailed information to diagnose publishing issues
      console.log(`Sending to Shopify API:`, {
        title: articleData.title,
        published: articleData.published,
        published_at: articleData.published_at,
        isScheduled,
        publicationType: (post as any).publicationType,
        postStatus: (post as any).postStatus,
        status: post.status,
        endpointUrl: `/blogs/${blogId}/articles.json`,
        contentLength: articleData.body_html?.length || 0
      });
      
      // Make the API request
      const response = await client.post(`/blogs/${blogId}/articles.json`, { article: articleData });
      
      // Log the response with scheduling data and handle
      console.log(`Shopify API response:`, {
        id: response.data.article.id,
        title: response.data.article.title,
        handle: response.data.article.handle,
        published: response.data.article.published,
        published_at: response.data.article.published_at,
        sentRequest: {
          published: articleData.published,
          published_at: articleData.published_at,
          handle: articleData.handle,
          isScheduled: isScheduledPublishing
        }
      });

      // CRITICAL FIX: Add SEO metafields AFTER article creation
      // This is required because Shopify REST API doesn't support metafields during article creation
      if (post && response.data.article.id) {
        await this.addSEOMetafieldsToArticle(store, blogId.toString(), response.data.article.id.toString(), post);
      }
      
      // Verify the scheduling was successful by checking if the published_at date matches
      // what we sent (or is very close to it)
      if (isScheduledPublishing && futurePublishDate) {
        const responseDate = new Date(response.data.articleData.published_at);
        const sentDate = new Date(articleData.published_at);
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
                `/blogs/${blogId}/articles/${response.data.articleData.id}.json`, 
                { 
                  article: {
                    id: response.data.articleData.id,
                    published: false,
                    published_at: articleData.published_at
                  } 
                }
              );
              console.log(`Update response:`, {
                published: updateResponse.data.articleData.published,
                published_at: updateResponse.data.articleData.published_at
              });
            } catch (updateError) {
              console.error(`Failed to update article with scheduling:`, updateError);
            }
          }
        } else {
          console.log(`Scheduling confirmed successful: ${responseDate.toISOString()}`);
        }
      }
      
      // Ensure we have the handle in the response for URL generation
      const article = response.data.article;
      console.log(`Article created with ID: ${articleData.id}`);
      
      // If Shopify didn't return a handle, fetch the full article to get it
      if (!articleData.handle) {
        console.log(`No handle in response, fetching full article details...`);
        try {
          const fullArticleResponse = await client.get(`/blogs/${blogId}/articles/${articleData.id}.json`);
          const fullArticle = fullArticleResponse.data.article;
          console.log(`Fetched article handle: ${fullArticle.handle}`);
          
          // Merge the full article data with our created article
          Object.assign(article, fullArticle);
        } catch (fetchError) {
          console.error(`Error fetching full article details:`, fetchError);
          // Generate unique handle from title as fallback
          if (articleData.title) {
            const baseHandle = articleData.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
            articleData.handle = `${baseHandle}-${timestamp}`;
            console.log(`Generated unique handle from title: ${articleData.handle}`);
          }
        }
      }
      
      console.log(`Final article handle: ${articleData.handle}`);
      return article;
    } catch (error: any) {
      console.error(`Error creating article in Shopify store ${store.shopName}:`, error);
      
      // Log detailed error information for 422 validation errors
      if (error.response?.status === 422) {
        console.error('Shopify 422 validation error details:');
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('Article data sent:', JSON.stringify({
          title: post?.title,
          body_html_length: post?.content?.length || 0,
          published: post?.status,
          tags: post?.tags
        }, null, 2));
        
        // Check for 25MP image error and retry without images
        const errorMessages = error.response?.data?.errors?.base || [];
        const hasImageError = errorMessages.some((msg: string) => 
          msg.includes('25 megapixels') || msg.includes('pixel limit') || msg.includes('Image upload failed')
        );
        
        if (hasImageError) {
          console.log('Retrying article creation with optimized images due to 25MP limit...');
          
          try {
            // Create optimized article data with smaller images
            let optimizedContent = post.content || '';
            
            // Apply aggressive image optimization to stay under 25MP limit
            optimizedContent = optimizedContent.replace(
              /<img[^>]*src="([^"]*?)"[^>]*>/gi,
              (match: string, url: string) => {
                // Extract alt text from original image tag
                const altMatch = match.match(/alt="([^"]*)"/i);
                const altText = altMatch ? altMatch[1] : 'Article image';
                
                let optimizedUrl = url;
                
                // Apply aggressive size limits for Shopify compatibility
                if (url.includes('images.pexels.com')) {
                  // Use small size for Pexels to stay under 25MP
                  optimizedUrl = url.replace('/original/', '/small/');
                  optimizedUrl = optimizedUrl.replace('/large2x/', '/small/');
                  optimizedUrl = optimizedUrl.replace('/large/', '/small/');
                  optimizedUrl = optimizedUrl.replace('/medium/', '/small/');
                  
                  // Add aggressive size constraints
                  const separator = optimizedUrl.includes('?') ? '&' : '?';
                  optimizedUrl = optimizedUrl + `${separator}w=400&h=300&fit=crop&auto=compress&cs=tinysrgb&q=60`;
                }
                else if (url.includes('cdn.shopify.com')) {
                  // Use smaller Shopify image sizes
                  optimizedUrl = url.replace('_master', '_400x400');
                  optimizedUrl = optimizedUrl.replace('_original', '_400x400');
                  optimizedUrl = optimizedUrl.replace('_2048x2048', '_400x400');
                  optimizedUrl = optimizedUrl.replace('_1024x1024', '_400x400');
                  optimizedUrl = optimizedUrl.replace('_800x800', '_400x400');
                }
                else if (url.startsWith('/uploads/')) {
                  // Handle uploaded images - don't add query parameters to relative URLs
                  // These should be served from the local server without transformation
                  optimizedUrl = url;
                }
                else if (url.startsWith('http') && !url.includes('youtube.com')) {
                  // Add aggressive size constraints for external images
                  const separator = optimizedUrl.includes('?') ? '&' : '?';
                  optimizedUrl = optimizedUrl + `${separator}w=400&h=300&fit=crop&q=60&auto=compress`;
                }
                
                // Return properly formatted optimized image
                return `<div style="text-align: center; margin: 20px 0;"><img src="${optimizedUrl}" alt="${altText}" style="max-width: 100%; height: auto; max-height: 300px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" /></div>`;
              }
            );
            
            const fallbackData: any = {
              title: post.title,
              body_html: optimizedContent,
              published: post.status === 'published',
              tags: post.tags || '',
              handle: post.title?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ''
            };

            // Add meta description as summary if available
            if ((post as any).metaDescription) {
              fallbackData.summary = (post as any).metaDescription;
            }

            // Add author information if available
            if ((post as any).author && typeof (post as any).author === 'string') {
              fallbackData.author = (post as any).author;
            }
            
            // Count images in optimized content
            const imageCount = (optimizedContent.match(/<img[^>]*>/g) || []).length;
            console.log(`✓ Optimized content contains ${imageCount} images with smaller dimensions`);
            
            const fallbackClient = this.getClient(store);
            const fallbackResponse = await fallbackClient.post(`/blogs/${blogId}/articles.json`, {
              article: fallbackData
            });
            
            console.log(`✓ Article created successfully with ${imageCount} optimized images to avoid 25MP limit`);
            const article = fallbackResponse.data.article;
            
            // Generate handle if not provided
            if (!article.handle && article.title) {
              article.handle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              console.log(`Generated handle from title: ${article.handle}`);
            }
            
            return article;
          } catch (fallbackError: any) {
            console.error('Failed to create article even without images:', fallbackError.response?.data || fallbackError.message);
          }
        }
      }
      
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
      
      // Create the update article object with enhanced publishing support and proper author handling
      let authorName = store.shopName; // Default fallback
      
      // Prioritize selected author from database over default
      if ((post as any).author && typeof (post as any).author === 'string') {
        authorName = (post as any).author;
        console.log(`Using resolved author name for update: ${authorName}`);
      } else if ((post as any).authorId) {
        try {
          const { db } = await import('../db');
          const { authors } = await import('../../shared/schema');
          const { eq } = await import('drizzle-orm');
          
          const authorData = await db.select().from(authors).where(eq(authors.id, (post as any).authorId)).limit(1);
          if (authorData.length > 0) {
            authorName = authorData[0].name;
            console.log(`Fetched author from database for update: ${authorName} (ID: ${(post as any).authorId})`);
          }
        } catch (error) {
          console.error('Error fetching author from database for update:', error);
        }
      }
      
      const article = {
        id: articleId,
        title: post.title,
        author: authorName,
        body_html: processedContent,
        tags: post.tags || "",
        published: isPublish,
        published_at: publishedAt,
        image: post.featuredImage ? { src: post.featuredImage } : undefined
      };
      
      console.log(`Article update author set to: ${authorName}`);
      
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
        id: response.data.articleData.id,
        published: response.data.articleData.published,
        published_at: response.data.articleData.published_at
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
   * @param featuredImage Optional featured image URL
   * @param post Optional post object with metadata like categories
   * @returns The created page data
   */
  public async createPage(
    store: ShopifyStore,
    title: string,
    content: string,
    published: boolean = false,
    publishDate?: Date,
    featuredImage?: string,
    post?: any
  ): Promise<any> {
    try {
      const client = this.getClient(store);
      
      // Log the publishing request type
      const publishType = published ? 'IMMEDIATE PUBLISH' : publishDate ? 'SCHEDULED' : 'DRAFT';
      console.log(`Creating page in Shopify store ${store.shopName} with publish setting: ${publishType}`);
      
      // Handle categories for pages - convert to metafields or add to content
      let processedContent = content;
      if (post && (post as any).categories && Array.isArray((post as any).categories) && (post as any).categories.length > 0) {
        const categoryTags = (post as any).categories.join(', ');
        console.log(`Adding categories as metadata for page: ${categoryTags}`);
        
        // For pages, we can add categories as a hidden meta section in the content
        const categoryMeta = `<!-- Categories: ${categoryTags} -->`;
        processedContent = categoryMeta + '\n' + content;
      }
      
      // Set up the basic page data with SEO meta fields
      const pageData: any = {
        page: {
          title,
          body_html: processedContent,
          image: featuredImage ? { src: featuredImage } : undefined
        }
      };

      // CRITICAL FIX: Proper SEO handling - Separate Page Title and Meta Title
      // Page Title (visible headline) = post.title (passed as 'title' parameter)
      // Meta Title (SEO) = post.metaTitle -> goes to Shopify metafields
      
      // Always use the regular title as the visible page title (what users see on the page)
      pageData.page.title = title;
      console.log(`✓ Using article title as page heading: ${title}`);
      
      // NOTE: For pages, we'll add SEO metafields AFTER creation 
      // REST API doesn't support metafields during page creation

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
      
      // DEBUG: Log content structure for HTML validation
      console.log(`🔍 DEBUGGING PAGE CONTENT STRUCTURE:`);
      console.log(`   - Content length: ${processedContent.length} characters`);
      console.log(`   - Content preview (first 500 chars):`, processedContent.substring(0, 500));
      console.log(`   - Contains HTML tags: ${processedContent.includes('<')}`);
      console.log(`   - Contains opening div: ${processedContent.includes('<div')}`);
      console.log(`   - Contains paragraph tags: ${processedContent.includes('<p>')}`);
      
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

      // CRITICAL FIX: Add SEO metafields AFTER page creation
      // This is required because Shopify REST API doesn't support metafields during page creation
      if (post && response.data.page.id) {
        await this.addSEOMetafieldsToPage(store, response.data.page.id.toString(), post);
      }
      
      return response.data.page;
    } catch (error: any) {
      console.error(`Error creating page in Shopify store ${store.shopName}:`, error);
      throw new Error(`Failed to create page: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Ensure metafield definitions exist for blog posts SEO fields
   * This makes the metafields visible in Shopify admin interface
   */
  async ensureBlogPostMetafieldDefinitions(store: any): Promise<void> {
    try {
      const client = this.getClient(store);

      console.log(`🔧 Ensuring SEO metafield definitions exist for articles in store ${store.shopName}`);

      // Create title_tag definition for articles
      try {
        await client.post('/metafield_definitions.json', {
          metafield_definition: {
            namespace: 'global',
            key: 'title_tag',
            name: 'SEO Title',
            description: 'Custom page title for search engines (appears in browser tab and search results)',
            type: 'single_line_text_field',
            owner_resource: 'article',
            pin: true,
            visibilities: [{
              name: 'api'
            }, {
              name: 'storefront'
            }]
          }
        });
        console.log(`✓ Created SEO title metafield definition for articles`);
      } catch (defError: any) {
        if (defError?.response?.status === 422) {
          console.log(`SEO title definition already exists for articles`);
        } else {
          console.log(`SEO title definition creation failed:`, defError?.response?.status);
        }
      }

      // Create description_tag definition for articles
      try {
        await client.post('/metafield_definitions.json', {
          metafield_definition: {
            namespace: 'global',
            key: 'description_tag',
            name: 'SEO Description',
            description: 'Custom meta description for search engines (appears in search results)',
            type: 'single_line_text_field',
            owner_resource: 'article',
            pin: true,
            visibilities: [{
              name: 'api'
            }, {
              name: 'storefront'
            }]
          }
        });
        console.log(`✓ Created SEO description metafield definition for articles`);
      } catch (defError: any) {
        if (defError?.response?.status === 422) {
          console.log(`SEO description definition already exists for articles`);
        } else {
          console.log(`SEO description definition creation failed:`, defError?.response?.status);
        }
      }

    } catch (error: any) {
      console.log(`Note: Could not ensure metafield definitions:`, error?.response?.status || error?.message);
    }
  }

  /**
   * Add SEO metafields to a Shopify article after creation
   * @param store The store to add metafields to
   * @param blogId The ID of the blog containing the article
   * @param articleId The ID of the article to add metafields to
   * @param post The post data containing SEO information
   */
  async addSEOMetafieldsToArticle(store: any, blogId: string, articleId: string, post: any): Promise<void> {
    try {
      console.log(`🔧 CREATING SEO METAFIELDS for article ${articleId} in blog ${blogId} in store ${store.shopName}`);
      
      // Ensure metafield definitions exist first (makes fields visible in admin)
      await this.ensureBlogPostMetafieldDefinitions(store);
      
      const client = this.getClient(store);
      
      // Add meta title metafield for SEO (separate from visible title)
      if ((post as any).metaTitle && (post as any).metaTitle.trim()) {
        const titleMetafieldData = {
          metafield: {
            namespace: 'global',
            key: 'title_tag',
            value: (post as any).metaTitle,
            type: 'single_line_text_field'
          }
        };
        
        await client.post(`/blogs/${blogId}/articles/${articleId}/metafields.json`, titleMetafieldData);
        console.log(`✓ Added SEO title metafield to article: ${(post as any).metaTitle}`);
      }
      
      // Add meta description metafield for SEO
      if ((post as any).metaDescription && (post as any).metaDescription.trim()) {
        const descriptionMetafieldData = {
          metafield: {
            namespace: 'global',
            key: 'description_tag',
            value: (post as any).metaDescription,
            type: 'single_line_text_field'
          }
        };
        
        await client.post(`/blogs/${blogId}/articles/${articleId}/metafields.json`, descriptionMetafieldData);
        console.log(`✓ Added SEO description metafield to article: ${(post as any).metaDescription}`);
      }
      
    } catch (error) {
      console.error(`❌ Error adding SEO metafields to article ${articleId}:`, error);
    }
  }

  /**
   * Add SEO metafields to a Shopify page after creation
   * @param store The store to add metafields to
   * @param pageId The ID of the page to add metafields to
   * @param post The post data containing SEO information
   */
  async addSEOMetafieldsToPage(store: any, pageId: string, post: any): Promise<void> {
    try {
      console.log(`🔧 CREATING SEO METAFIELDS for page ${pageId} in store ${store.shopName}`);
      const client = this.getClient(store);
      
      // Add meta title metafield for SEO (separate from visible title)
      if ((post as any).metaTitle && (post as any).metaTitle.trim()) {
        const titleMetafield = {
          metafield: {
            namespace: 'global',
            key: 'title_tag',
            value: (post as any).metaTitle,
            type: 'single_line_text_field'
          }
        };
        
        await client.post(`/pages/${pageId}/metafields.json`, titleMetafield);
        console.log(`✓ Added SEO title metafield: ${(post as any).metaTitle}`);
      }
      
      // Add meta description metafield for SEO
      if ((post as any).metaDescription && (post as any).metaDescription.trim()) {
        const descMetafield = {
          metafield: {
            namespace: 'global',
            key: 'description_tag',
            value: (post as any).metaDescription,
            type: 'single_line_text_field'
          }
        };
        
        await client.post(`/pages/${pageId}/metafields.json`, descMetafield);
        console.log(`✓ Added SEO description metafield: ${(post as any).metaDescription}`);
      }
      
    } catch (error: any) {
      console.error(`Error adding SEO metafields to page ${pageId}:`, error?.response?.data || error?.message);
      // Don't throw error here - page creation should still succeed even if metafields fail
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
   * Make an API request to Shopify and return the response data
   * (This is used by MediaService to access Shopify API)
   */
  public async makeApiRequest(store: ShopifyStore, method: string, endpoint: string, data?: any): Promise<any> {
    try {
      const client = this.getClient(store.shopName, store.accessToken);
      
      // Log what we're doing
      console.log(`Shopify API request for ${store.shopName}: ${method} ${endpoint}`);
      
      // Make the request
      let response;
      if (method.toUpperCase() === 'GET') {
        response = await client.get(endpoint);
      } else if (method.toUpperCase() === 'POST') {
        response = await client.post(endpoint, data);
      } else if (method.toUpperCase() === 'PUT') {
        response = await client.put(endpoint, data);
      } else if (method.toUpperCase() === 'DELETE') {
        response = await client.delete(endpoint);
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      // Log success
      console.log(`Shopify API response for ${store.shopName}: ${response.status} for ${endpoint}`);
      
      // Return the data
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(`Shopify API error for ${store.shopName}: ${error.response.status} ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(`Error making Shopify API request: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw error;
    }
  }
  
  /**
   * Get content files from Shopify (assets API)
   * This method fetches files from Shopify's Assets API since Files API may not be available
   * @deprecated Use MediaService instead for better separation of concerns
   */
  public async getContentFiles(store: ShopifyStore): Promise<any[]> {
    try {
      console.log(`Fetching content files from ${store.shopName} using assets API`);
      const client = this.getClient(store.shopName, store.accessToken);

      // Use GraphQL Admin API instead of deprecated REST API
      try {
        console.log("Fetching product images as content files using GraphQL");
        const { graphqlShopifyService } = await import('./graphql-shopify');
        const productImages = await graphqlShopifyService.getProductImages(store, 20);
        
        console.log(`Found ${productImages.length} product images to use as content files`);
        if (productImages.length > 0) {
          return productImages;
        }
      } catch (productsError: any) {
        console.error("Error fetching product images:", productsError.message);
      }
      
      // First try themes/assets API which is more reliable
      try {
        // Get the active theme ID first
        const themesResponse = await client.get('/themes.json');
        const activeTheme = themesResponse.data?.themes?.find((theme: any) => theme.role === 'main');
        
        if (activeTheme) {
          // Get assets from the active theme
          const assetsResponse = await client.get(`/themes/${activeTheme.id}/assets.json`);
          
          if (assetsResponse.data && assetsResponse.data.assets) {
            // Filter for image assets only
            const imageAssets = assetsResponse.data.assets.filter((asset: any) => {
              const key = asset.key.toLowerCase();
              return key.endsWith('.jpg') || key.endsWith('.jpeg') || 
                     key.endsWith('.png') || key.endsWith('.gif') || 
                     key.endsWith('.webp');
            });
            
            // Format the response
            return imageAssets.map((asset: any) => ({
              id: `asset-${asset.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
              url: asset.public_url || `https://${store.shopName}/assets/${asset.key}`,
              filename: asset.key.split('/').pop() || 'Theme Asset',
              content_type: asset.content_type || 'image/jpeg',
              created_at: asset.created_at || new Date().toISOString(),
              alt: asset.key.split('/').pop().split('.')[0] || ''
            }));
          }
        }
      } catch (themeError: any) {
        console.log('Could not get theme assets, trying product images instead:', themeError.message);
      }
      
      // Fallback: If theme assets fail, use GraphQL API for product images
      const { graphqlShopifyService } = await import('./graphql-shopify');
      const productImages = await graphqlShopifyService.getProductImages(store, 50);
      
      if (productImages && productImages.length > 0) {
        console.log(`Found ${productImages.length} product images to use as content files`);
        return productImages;
      } else {
        console.log('No product images found as fallback');
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching content files:", error.message);
      return [];
    }
  }
  
  public async getProducts(store: ShopifyStore, limit: number = 50): Promise<any[]> {
    try {
      // Use GraphQL Admin API instead of deprecated REST API
      const { graphqlShopifyService } = await import('./graphql-shopify');
      return await graphqlShopifyService.getProducts(store, limit);
    } catch (error: any) {
      console.error(`Error fetching products from Shopify store ${store.shopName}:`, error);
      
      // Return empty array instead of throwing to prevent app failure
      console.log(`Returning empty products array due to API error`);
      return [];
    }
  }
  
  /**
   * Get collections from a store using GraphQL API (migrated from deprecated REST API)
   * @param store The store to get collections from
   * @param limit The maximum number of collections to return
   * @param collectionType For backward compatibility - GraphQL returns all collections regardless of type
   */
  public async getCollections(store: ShopifyStore, collectionType: 'custom' | 'smart' = 'custom', limit: number = 50): Promise<any[]> {
    try {
      console.log(`Fetching collections from ${store.shopName} using GraphQL API (2025-07)`);
      
      // Use GraphQL Admin API instead of deprecated REST API /custom_collections.json and /smart_collections.json
      const { graphqlShopifyService } = await import('./graphql-shopify');
      const allCollections = await graphqlShopifyService.getCollections(store, limit);
      
      // GraphQL returns all collections regardless of type, preventing duplication
      console.log(`✓ Fetched ${allCollections.length} collections using GraphQL (migrated from deprecated REST API)`);
      
      return allCollections;
    } catch (error: any) {
      console.error(`Error fetching collections from Shopify store ${store.shopName}:`, error);
      // Fallback to empty array instead of throwing to prevent app failure
      console.log(`Returning empty collections array due to GraphQL API error`);
      return [];
    }
  }
}

// Create a singleton instance
export const shopifyService = new ShopifyService();