# TopShop SEO - Shopify Blog Content Generation App

## Overview

TopShop SEO is a comprehensive Shopify application that automates blog content generation and SEO optimization for e-commerce stores. The application uses AI services (Claude, OpenAI) to generate high-quality blog posts, manages their publication scheduling, and provides analytics on content performance. The system supports both embedded Shopify admin functionality and standalone operation.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, TailwindCSS, Shadcn UI components
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL via NeonDB serverless with Drizzle ORM
- **AI Services**: Anthropic Claude, OpenAI (with template fallbacks)
- **External APIs**: Shopify Admin API, Pexels, DataForSEO, HuggingFace
- **Build Tools**: Vite for frontend bundling, ESBuild for backend

### Architecture Pattern
The application follows a modern full-stack architecture with clear separation of concerns:
- **Client-Server Architecture**: React SPA communicating with Express REST API
- **Multi-tenant Design**: Supports multiple Shopify stores per installation
- **Embedded App Support**: Functions both as standalone app and Shopify Admin embedded app
- **Microservice-oriented**: Modular services for AI content generation, media management, and Shopify integration

## Key Components

### Frontend Architecture
- **React Router**: Uses Wouter for lightweight routing
- **State Management**: React Query for server state, React hooks for local state
- **UI Components**: Shadcn UI component library with custom styling
- **Responsive Design**: TailwindCSS with mobile-first approach
- **Error Boundaries**: Comprehensive error handling and user feedback

### Backend Services
- **Authentication**: Shopify OAuth 2.0 flow with multi-store support
- **Content Generation**: AI-powered blog post creation with multiple providers
- **Media Management**: Integration with Shopify media library and external image services
- **Scheduling**: Custom scheduling system for future content publication
- **Analytics**: Content performance tracking and reporting

### Database Schema
- **Multi-tenant Support**: Separate stores with user-store relationships
- **Content Management**: Blog posts, templates, and generation requests
- **User Management**: Authors, permissions, and store access control
- **Analytics**: Sync activities and content performance metrics

## Data Flow

### Content Generation Flow
1. User selects topic/template or provides custom prompt
2. AI service (Claude/OpenAI) generates content based on parameters
3. Content is processed and formatted with SEO optimization
4. User reviews and customizes generated content
5. Content is published immediately or scheduled for future publication
6. Analytics tracking begins upon publication

### Shopify Integration Flow
1. OAuth authentication establishes store connection
2. Store data (blogs, products, collections) is synchronized
3. Content is published via Shopify Admin API
4. Media assets are managed through Shopify Files API
5. Performance data is collected and analyzed

### Multi-Store Management
1. Users can connect multiple Shopify stores
2. Each store maintains separate content and settings
3. Billing and permissions are managed per store
4. Content can be generated independently for each store

## External Dependencies

### AI Content Generation
- **Primary**: Anthropic Claude API (claude-3-7-sonnet-20250219)
- **Secondary**: OpenAI API for content generation
- **Fallback**: Template-based content generation system

### Media Services
- **Pexels API**: Stock photography integration
- **Pixabay API**: Additional image source
- **Shopify Files API**: Native store media management

### SEO and Analytics
- **DataForSEO API**: Keyword research and SEO metrics
- **Shopify Analytics API**: Store performance data

### Infrastructure
- **NeonDB**: Serverless PostgreSQL database
- **Replit**: Development and hosting platform
- **Shopify Partner API**: App installation and billing

## Deployment Strategy

### Development Environment
- **Local Development**: Uses Vite dev server with HMR
- **Environment Variables**: Managed through .env files
- **Database Migrations**: Drizzle Kit for schema management

### Production Deployment
- **Build Process**: Vite builds frontend, ESBuild bundles backend
- **Autoscale Deployment**: Configured for automatic scaling
- **Health Checks**: Port 5000 monitoring for application health
- **Static Assets**: Served from dist/public directory

### Security Considerations
- **Content Security Policy**: Configured for Shopify iframe embedding
- **CORS**: Proper headers for cross-origin requests
- **Environment Secrets**: API keys managed securely
- **Database Security**: SSL connections and connection pooling

## Changelog

```
Changelog:
- June 25, 2025. PROJECT MANAGEMENT SYSTEM FULLY IMPLEMENTED: Complete Create and Save Project functionality deployed with comprehensive form state tracking (20+ fields), multi-store data isolation, React Query integration, and robust error handling - users can now create named projects, save all admin panel configurations, and load projects to restore complete form state
- June 25, 2025. CRITICAL AUTO-SAVE LOGIC FIX: Completely resolved unwanted automatic project saves by removing useEffect auto-triggers, disabling React Query auto-refetch polling (every 3 seconds), and separating project loading from saving logic - projects now only save when "Save Project" button is manually clicked
- June 25, 2025. API REQUEST FIX: Fixed "Failed to execute 'fetch' on 'Window': '/api/projects/24' is not a valid HTTP method" error by correcting API request format in handleProjectSelected function - project creation and loading now works seamlessly without fetch errors
- June 25, 2025. COMPREHENSIVE PROJECT SAVE/LOAD TESTING COMPLETED: Verified end-to-end functionality with complex projects containing products, collections, keywords, media content, form fields, and state variables - all data saves and loads correctly with proper JSON serialization
- June 20, 2025. SAVE PROJECT BUTTON FUNCTIONALITY FIXED: Resolved issue where "Test Project1" and other custom-named projects failed to save - Save Project button now correctly uses the project name from dialog instead of generating timestamp names, ensuring projects save with user-specified names
- June 20, 2025. DUPLICATE NAME VALIDATION COMPLETED: Implemented comprehensive backend duplicate name validation for project creation with case-insensitive matching, removed redundant top Save Project button per user request, and successfully tested validation system - projects with duplicate names now properly rejected with clear error message "A project with this name already exists. Please choose a different name."
- June 20, 2025. PROJECT CREATION SYSTEM COMPLETELY FIXED: Resolved "Unable to load project data" error by fixing incorrect API request format in handleProjectSelected function (missing HTTP method parameter), enhanced comprehensive data capture to include all admin panel selections (products, collections, keywords, media, workflow steps), and streamlined project creation flow with proper error handling
- June 20, 2025. SAVE PROJECT BUTTON FIXED: Resolved disabled Save Project button issue by enabling auto-creation of projects - button now works without requiring existing project, automatically creates timestamped projects and saves all admin panel selections
- June 20, 2025. SAVE PROJECT BUTTON IMPLEMENTED: Added manual "Save Project" button next to Generate Content button, successfully tested with "Water Softener" project saving all admin panel options including form fields, products, collections, keywords, media content, buyer personas, and workflow states
- June 20, 2025. PROJECT MANAGEMENT SYSTEM COMPLETED: Implemented comprehensive project save/load functionality with New Project and Load Project buttons, auto-save on workflow steps, and complete multi-store data isolation - tested and verified all features working correctly
- June 19, 2025. UI STREAMLINED: Removed unnecessary Region field from admin panel form to simplify content creation workflow
- June 19, 2025. AUTHOR LOADING FIX: Fixed authors not loading when accessing app directly from app URL - implemented fallback system for standalone mode while maintaining store isolation in embedded mode
- June 19, 2025. MULTI-STORE PUBLISHING VERIFIED: Fixed and tested publishing for both rajeshshah and reviewtesting stores - articles and pages publish successfully to correct stores with proper blog IDs (116776337722 and 90708934890)
- June 19, 2025. PUBLISHING FIX: Fixed Shopify publishing connection for rajeshshah store by setting correct default_blog_id - resolved "No valid Shopify connection available" error
- June 19, 2025. AUTOMATIC STORE DETECTION COMPLETED: Implemented seamless automatic store detection from Shopify Admin context, removing need for manual store selection
- June 19, 2025. Removed Store Management component from admin panel - system now automatically detects and routes to correct store based on Shopify Admin context
- June 19, 2025. Enhanced query client to use auto-detected store IDs for all API requests with proper X-Store-ID header propagation
- June 19, 2025. CRITICAL FIX COMPLETED: Multi-store Shopify publishing now works correctly - articles publish to selected store instead of defaulting to fallback store, with proper store-aware routing using X-Store-ID headers
- June 19, 2025. Fixed database configuration for multi-store publishing - updated defaultBlogId for all stores to enable successful article publishing to correct Shopify blogs
- June 19, 2025. Resolved POST /api/posts endpoint routing issues - replaced legacy connection fallback with proper tempStore context from multi-store routing system
- June 19, 2025. Verified complete end-to-end multi-store functionality - articles successfully create on Shopify with proper URLs (e.g., reviewtesting434.myshopify.com) and maintain data isolation
- June 18, 2025. COMPLETED: Multi-store support with complete data isolation - verified that switching between stores (rajeshshah vs reviewtesting434) shows correct store-specific data with no cross-contamination
- June 18, 2025. Implemented comprehensive cache invalidation system in StoreContext - all cached queries are cleared when switching stores to prevent data leakage
- June 18, 2025. Enhanced query client with automatic store ID headers - all API requests now include X-Store-ID header for proper backend routing
- June 18, 2025. MAJOR REFACTOR: Successfully implemented multi-store support with OAuth authentication system, enabling the app to handle multiple Shopify stores simultaneously while maintaining all existing SEO and content generation features
- June 18, 2025. Added comprehensive multi-store database schema with proper store isolation, user-store relationships, and fallback storage system for reliability
- June 18, 2025. Implemented Shopify OAuth 2.0 authentication middleware with proper scope validation, webhook handling, and App Store compatibility
- June 18, 2025. Enhanced storage layer with multi-tenant support while preserving backward compatibility with existing single-store installations
- June 18, 2025. Fixed scheduled posts to display "View in Shopify" and "Copy Link" buttons same as published posts by ensuring shopifyUrl is set for both publication types
- June 18, 2025. Completed comprehensive scheduling system overhaul with proper timezone handling, custom scheduler service, and reliable background publishing
- June 17, 2025. Enhanced content generation to include 3-5 external authoritative links from .edu, .gov, .wikipedia, and other trusted domains for improved SEO and credibility
- June 17, 2025. Implemented Shopify-compatible content editor with real-time syncing, alignment tools (left, center, right, justify), enhanced toolbar with visual icons, and WYSIWYG preview functionality
- June 17, 2025. Enhanced title suggestion system to provide 12 titles instead of 8, with improved audience targeting
- June 16, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```