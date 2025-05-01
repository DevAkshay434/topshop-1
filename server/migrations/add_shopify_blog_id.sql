-- Add shopify_blog_id column to the blog_posts table
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS shopify_blog_id TEXT;