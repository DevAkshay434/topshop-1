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
- June 17, 2025. CRITICAL FIX: Fixed TOC links opening in new tabs - enhanced JavaScript click handlers with event.preventDefault() and event.stopPropagation() for proper internal scrolling
- June 17, 2025. CRITICAL FIX: Fixed secondary images not clickable - implemented proper product linking with handles, hover effects, and visual feedback for clickable images
- June 17, 2025. CRITICAL FIX: Fixed SEO metadata misuse - separated visible titles/descriptions from SEO fields, ensuring meta title and meta description are stored only in Shopify SEO metafields, never embedded in visible content
- June 17, 2025. CRITICAL FIX: Enhanced TipTap editor - added post-processing to strip target="_blank" from internal anchor links and improved link configuration
- June 17, 2025. CRITICAL FIX: Enhanced timezone scheduling - improved createDateInTimezone function to properly handle store timezone conversion for accurate scheduled publication
- June 17, 2025. CRITICAL FIX: Added timezone context to UI - scheduling forms now clearly indicate time will be in store's timezone with visual confirmation
- June 17, 2025. CRITICAL FIX: Fixed invalid HTML structure in rich text editor - configured TipTap to prevent nested <p> tags inside <li> elements
- June 17, 2025. CRITICAL FIX: Cleaned up deprecated template UI - removed Save/Load Template buttons and related dialog components
- June 17, 2025. CRITICAL FIX: Implemented professional TipTap rich text editor - replaced contentEditable with full-featured WYSIWYG editor including formatting, links, images, lists, and character count
- June 17, 2025. CRITICAL FIX: Resolved Meta Title vs Page Title distinction - Meta Title now properly stored as SEO metafield while Page Title remains visible headline
- June 17, 2025. CRITICAL FIX: Implemented AI-powered Auto Optimize functionality for meta title and description using Claude with audience targeting, keywords, and tone
- June 17, 2025. CRITICAL FIX: Fixed image upload bug - improved image processing to preserve secondary images while avoiding Shopify's 25MP limit
- June 17, 2025. CRITICAL FIX: Fixed meta description bug - removed Table of Contents content from Claude-generated descriptions
- June 17, 2025. Enhanced title suggestion system to provide 12 titles instead of 8, with improved audience targeting
- June 16, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```