-- This migration adds multi-store support to the existing database
-- It creates the necessary tables and adds relations while preserving existing data

-- Add new fields to users table
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "email" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN DEFAULT FALSE;

-- Create shopify_stores table for multi-tenant support
CREATE TABLE IF NOT EXISTS "shopify_stores" (
  "id" SERIAL PRIMARY KEY,
  "shop_name" TEXT NOT NULL UNIQUE,
  "access_token" TEXT NOT NULL,
  "scope" TEXT,
  "default_blog_id" TEXT,
  "is_connected" BOOLEAN DEFAULT TRUE,
  "last_synced" TIMESTAMP,
  "installed_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "uninstalled_at" TIMESTAMP,
  "plan_name" TEXT,
  "charge_id" TEXT,
  "trial_ends_at" TIMESTAMP
);

-- Create user_stores junction table
CREATE TABLE IF NOT EXISTS "user_stores" (
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "store_id" INTEGER NOT NULL REFERENCES "shopify_stores"("id"),
  "role" TEXT DEFAULT 'member',
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY ("user_id", "store_id")
);

-- Add store_id to blog_posts table
ALTER TABLE "blog_posts" 
ADD COLUMN IF NOT EXISTS "store_id" INTEGER REFERENCES "shopify_stores"("id"),
ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "author" TEXT,
ADD COLUMN IF NOT EXISTS "author_id" INTEGER REFERENCES "users"("id");

-- Add store_id to sync_activities table
ALTER TABLE "sync_activities" 
ADD COLUMN IF NOT EXISTS "store_id" INTEGER REFERENCES "shopify_stores"("id");

-- Add store_id and user_id to content_gen_requests table
ALTER TABLE "content_gen_requests" 
ADD COLUMN IF NOT EXISTS "store_id" INTEGER REFERENCES "shopify_stores"("id"),
ADD COLUMN IF NOT EXISTS "user_id" INTEGER REFERENCES "users"("id");

-- Migrate existing connection data from shopify_connections to shopify_stores
-- Only run if shopify_connections table has data and shopify_stores is empty
DO $$
DECLARE 
  connection_count INTEGER;
  store_count INTEGER;
  existing_connection RECORD;
  new_store_id INTEGER;
  admin_user_id INTEGER;
BEGIN
  -- Check if there's data to migrate
  SELECT COUNT(*) INTO connection_count FROM shopify_connections;
  SELECT COUNT(*) INTO store_count FROM shopify_stores;
  
  -- Get admin user ID (assuming first user is admin)
  SELECT id INTO admin_user_id FROM users LIMIT 1;
  
  IF connection_count > 0 AND store_count = 0 THEN
    -- Get existing connection
    SELECT * INTO existing_connection FROM shopify_connections LIMIT 1;
    
    -- Insert into shopify_stores
    INSERT INTO shopify_stores (
      shop_name, 
      access_token, 
      default_blog_id, 
      is_connected, 
      last_synced,
      scope
    ) VALUES (
      existing_connection.store_name,
      existing_connection.access_token,
      existing_connection.default_blog_id,
      existing_connection.is_connected,
      existing_connection.last_synced,
      'read_products,write_products,read_content,write_content'
    ) RETURNING id INTO new_store_id;
    
    -- Connect admin user to store
    IF admin_user_id IS NOT NULL AND new_store_id IS NOT NULL THEN
      INSERT INTO user_stores (user_id, store_id, role)
      VALUES (admin_user_id, new_store_id, 'owner');
      
      -- Update all blog posts with the store ID
      UPDATE blog_posts SET store_id = new_store_id;
      
      -- Update all sync activities with the store ID
      UPDATE sync_activities SET store_id = new_store_id;
      
      -- Update all content gen requests with the store ID and user ID
      UPDATE content_gen_requests SET store_id = new_store_id, user_id = admin_user_id;
    END IF;
  END IF;
END $$;