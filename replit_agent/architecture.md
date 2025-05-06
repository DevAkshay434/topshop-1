# Architecture Overview

## 1. Overview

TopShop SEO is a Shopify application designed to automate blog content generation and SEO optimization for e-commerce stores. The application uses AI to generate high-quality blog posts, manages their scheduling and publication, and integrates directly with Shopify's blogging platform.

The system follows a modern full-stack architecture with a clear separation between client and server components, using React for the frontend and Node.js for the backend, with a PostgreSQL database for data persistence.

## 2. System Architecture

The application follows a client-server architecture:

### 2.1 High-Level Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│             │      │             │      │              │
│  React      │──────│  Express    │──────│  PostgreSQL  │
│  Frontend   │      │  Backend    │      │  Database    │
│             │      │             │      │              │
└─────────────┘      └─────────────┘      └──────────────┘
       │                    │                    
       │                    │                    
       ▼                    ▼                    
┌─────────────┐      ┌─────────────┐            
│  Shopify    │      │  AI Content │            
│  Admin      │      │  Generation │            
│  (Embedded) │      │  Services   │            
└─────────────┘      └─────────────┘            
```

### 2.2 Client-Side Architecture

- Built with React and TypeScript
- Utilizes TailwindCSS for styling
- Uses Shadcn UI component library
- Implemented as a SPA (Single Page Application)
- Supports both standalone and Shopify-embedded modes

### 2.3 Server-Side Architecture

- Node.js backend with Express
- TypeScript for type safety
- Drizzle ORM for database access
- REST API endpoints for client communication
- Integration with Shopify API for store operations

### 2.4 Database Architecture

- PostgreSQL database via NeonDB serverless
- Schema managed through Drizzle ORM
- Migrations for schema evolution

## 3. Key Components

### 3.1 Frontend Components

#### 3.1.1 Page Components
- Dashboard: Main control center showing analytics and recent posts
- BlogPosts: Lists and manages published blog posts
- ScheduledPosts: Shows and manages future scheduled content
- ContentTemplates: Predefined content structures for blog generation
- ShopifyConnection: Manages store connections
- BillingSettings: Subscription and payment management
- AppInstall: Handles Shopify app installation flow

#### 3.1.2 UI Components
- Layout: Main application layout structure with sidebar and content area
- ContentGenerator: Interface for generating AI content
- PostList: Reusable component for displaying blog posts with various filters
- CreatePostModal: Form for creating and editing blog posts
- ShopifyConnectionCard: Manages store authentication

### 3.2 Backend Components

#### 3.2.1 API Routes
- `/api/posts`: Blog post CRUD operations
- `/api/generate-content`: Content generation endpoint
- `/api/shopify/auth`: Shopify OAuth flow
- `/api/billing`: Subscription management

#### 3.2.2 Services
- Content Generation: Interfaces with AI services (Claude, HuggingFace)
- Shopify Integration: Manages store connections and API operations
- Storage: Database access layer with repository pattern
- OAuth: Handles authentication with Shopify
- Billing: Manages subscription plans and payments

### 3.3 Database Models

Main entities in the database schema:
- Users: Application users with authentication details
- ShopifyStores: Connected Shopify stores with access tokens
- BlogPosts: Generated and published content
- ContentGenRequests: Tracks content generation jobs
- SyncActivities: Records of data synchronization with Shopify

## 4. Data Flow

### 4.1 Content Generation Flow

1. User requests content generation via UI
2. Frontend sends request to `/api/generate-content` endpoint
3. Backend creates a `ContentGenRequest` record in the database
4. Server calls the appropriate AI service (Claude or a template-based fallback)
5. Generated content is stored in the database
6. Content is returned to the frontend for preview/editing
7. User can publish directly to Shopify or schedule for later

### 4.2 Shopify Integration Flow

1. User initiates Shopify connection through UI
2. Application redirects to Shopify OAuth flow
3. Shopify authenticates user and returns to app with authorization code
4. Backend exchanges code for permanent access token
5. App stores token and shop details in database
6. User can now publish content directly to their Shopify blog

### 4.3 Multi-Tenant Handling

The application supports multiple users with multiple Shopify stores:
- Each user can connect to multiple Shopify stores
- Store-specific data is isolated in the database
- Content and settings are managed per-store

## 5. External Dependencies

### 5.1 AI Content Generation

Primary AI provider:
- Anthropic Claude: Used for high-quality content generation
  - Model: `claude-3-7-sonnet-20250219`
  - Integration via official SDK

Fallback mechanisms:
- Template-based generation: When AI services are unavailable or rate-limited
- HuggingFace: Alternative AI provider (integration exists but may be disabled)

### 5.2 Third-Party Services

- NeonDB: Serverless PostgreSQL database
- Shopify API: Store integration and content publication
- Optional image APIs:
  - Pexels: For image sourcing
  - Pixabay: Alternative image provider
- Optional SEO data:
  - DataForSEO: Keyword research and metrics

## 6. Deployment Strategy

### 6.1 Hosting Configuration

The application is configured to run on Replit, with specific deployment settings:
- Autoscaling deployment target
- Uses Node.js 20 runtime
- PostgreSQL 16 for database
- Port 5000 for local development, mapped to port 80 for production

### 6.2 Build Process

1. Client-side code is built using Vite
   - Output is placed in `dist/public`
2. Server-side code is bundled with esbuild
   - Output is placed in `dist`
3. Final bundle is deployed as an ESM application

### 6.3 Environment Variables

Key environment variables required:
- `DATABASE_URL`: NeonDB PostgreSQL connection string
- `ANTHROPIC_API_KEY`: API key for Claude content generation
- `SHOPIFY_API_KEY`: API key for Shopify integration
- `SHOPIFY_API_SECRET`: Secret for Shopify OAuth flow
- `SHOPIFY_REDIRECT_URI`: Callback URL for OAuth

### 6.4 Scaling Considerations

- Database connections are pooled and limited to 5 max connections
- Error handling includes reconnection logic for database failures
- Frontend optimized with code splitting and lazy loading
- Content generation is resource-intensive but handled asynchronously

## 7. Security Considerations

- CORS policy specifically configured for Shopify iframe embedding
- OAuth flow follows Shopify's security best practices
- Cross-site request forgery (CSRF) protection via state parameter in OAuth
- HMAC validation for Shopify webhook authenticity
- Database credentials and API keys stored as environment variables

## 8. Future Architecture Considerations

- Potential migration to a more scalable job queue for content generation
- Improved caching layer for generated content and Shopify API responses
- Better separation of multi-tenant data for increased isolation
- Enhanced analytics capabilities with dedicated time-series storage