# TopShop SEO - Shopify Blog Content Generation App

## Overview
TopShop SEO is a Shopify application designed to automate blog content generation and SEO optimization for e-commerce stores. It leverages AI (Claude, OpenAI) to create high-quality blog posts, manages their publication, and provides performance analytics. The application operates both as an embedded Shopify admin feature and a standalone tool, aiming to streamline content marketing for online retailers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Design Philosophy
The application employs a modern full-stack, client-server architecture with multi-tenant capabilities, allowing it to serve multiple Shopify stores while maintaining data isolation. It is designed to function seamlessly as an embedded Shopify app and a standalone service.

### Technology Stack
- **Frontend**: React with TypeScript, TailwindCSS for styling, Shadcn UI for components, and Wouter for routing. State management is handled with React Query and React hooks.
- **Backend**: Node.js with Express and TypeScript.
- **Database**: PostgreSQL (NeonDB serverless) managed with Drizzle ORM.
- **AI Services**: Primarily Anthropic Claude (claude-3-7-sonnet-20250219) with OpenAI as a secondary option, and a template-based fallback system.
- **Build Tools**: Vite for frontend and ESBuild for backend.

### Key Features and Implementations
- **Authentication**: Shopify OAuth 2.0 with multi-store support.
- **Content Generation**: AI-powered blog post creation, including SEO optimization and multiple AI provider support.
- **Media Management**: Integration with Shopify media library, Pexels, and Pixabay for image assets.
- **Scheduling**: Custom system for future content publication.
- **Analytics**: Tracking and reporting on content performance.
- **UI/UX**: Utilizes Shadcn UI for a consistent look, TailwindCSS for responsive design, and focuses on a streamlined workflow with standardized navigation.
- **SEO Enhancements**: Generates 35+ relevant keywords using DataForSEO, includes comprehensive title generation with keyword integration, and focuses on evergreen content strategies.
- **Image Handling**: Implements a 3-step staged upload process directly to Shopify CDN for reliable image display in published content.
- **Project Management**: Allows users to save and load complete project configurations, including content settings, selected products, collections, keywords, and media.
- **Multi-Store Support**: Ensures complete data isolation between connected Shopify stores, with automatic store detection and proper routing of API requests.

## External Dependencies

- **AI Content Generation**:
    - Anthropic Claude API
    - OpenAI API
- **Media Services**:
    - Pexels API
    - Pixabay API
    - Shopify Files API (for native media management)
- **SEO and Analytics**:
    - DataForSEO API (for keyword research)
    - Shopify Analytics API (for store performance)
- **Infrastructure**:
    - NeonDB (PostgreSQL database)
    - Replit (development and hosting)
    - Shopify Admin API (for app installation, billing, and core Shopify functionalities)

## Recent Changes

### August 1, 2025
**COMPLETE SHOPIFY TITLE/META TITLE SEPARATION FOR BOTH PAGES AND BLOG POSTS**: Successfully implemented two-step approach for proper SEO title separation in both Shopify pages AND blog posts. Created addSEOMetafieldsToArticle method matching the page implementation. Both use global.title_tag and global.description_tag metafields after resource creation. Verified with API logs showing successful 201 responses for metafield creation on both pages and articles. Complete separation achieved where article titles appear as visible headings while meta titles are stored separately for SEO optimization in search engines only. **IMPORTANT**: Blog post SEO metafields appear in the "Search engine listing preview" section of Shopify admin (not directly in title field like pages), but the technical implementation works identically for both resource types.

**ENHANCED AI META OPTIMIZATION WITH LOADING INDICATORS**: Upgraded Claude AI auto-optimize functionality with comprehensive user experience improvements: (1) Added strict requirements to eliminate ellipsis and date references from AI-generated content, (2) Enforced keyword inclusion validation with fallback prepending, (3) Implemented smart word-boundary truncation to avoid cutting words mid-sentence, (4) Added comprehensive loading states with spinning indicators in both Auto-Optimize buttons and input fields, (5) Enhanced user feedback with disabled states, contextual placeholders, and visual loading spinners during AI processing. The system now provides clear visual feedback during the 1-2 second AI optimization process while maintaining all quality requirements.

**GENERATE CONTENT BUTTON ENHANCED UX**: Improved the content generation experience with: (1) Auto-scroll functionality that smoothly scrolls to the top when "Generate Content" is clicked, ensuring users can immediately see the content preview area and loading indicators, (2) Enhanced loading state in the content preview with more informative messaging including estimated time (30-60 seconds), visual pulsing effects, and contextual descriptions of what AI is processing. The button already had proper loading states with spinner and "Generating Content..." text, now users get better visual feedback and automatic positioning to view the progress.

**AUTOMATIC META OPTIMIZATION DURING CONTENT GENERATION**: Implemented automatic AI-powered meta title and meta description optimization that occurs immediately after Claude generates content. When content is generated through the admin panel with keywords selected, the system automatically: (1) Optimizes the meta title using Claude AI with keyword integration and SEO best practices, (2) Optimizes the meta description with keyword inclusion and character limit compliance, (3) Returns both optimized meta fields in the API response for immediate preview, (4) Provides fallback handling if optimization fails to ensure content generation never breaks. This eliminates the need for manual meta optimization in most cases while maintaining the manual optimization buttons for fine-tuning. The optimization uses the same Claude AI service as manual optimization but happens seamlessly during content generation.

### August 6, 2025
**SCHEDULED POSTS UI REFRESH AND TIMEZONE HANDLING FIXES**: Completely resolved UI refresh issues in the Schedule Posts management system with comprehensive improvements: (1) Fixed API request structure by correcting parameter naming from 'body' to 'data' in apiRequest calls, enabling actual PUT requests to reach the server, (2) Implemented optimistic updates with proper cache invalidation and error rollback for instant UI feedback, (3) **CRITICAL TIMEZONE FIX**: Completely rewrote timezone validation logic to compare times within the store's timezone rather than UTC. The system now properly validates that 5:30 AM Eastern is rejected when current Eastern time is 3:24 AM, while 9:30 AM Eastern is accepted. Backend now parses both current time and scheduled time in store timezone and compares them directly without UTC conversion confusion, (4) Enhanced UX with prominent current store time display in schedule update modals showing accurate Eastern Time, improved error messages, and date input constraints, (5) Verified through comprehensive testing that timezone validation works correctly: rejects past times and accepts future times within store timezone boundaries. The system now operates entirely within the connected store's timezone (GMT-05:00 Eastern Time) for all scheduling operations.

**COMPLETE AUTOMATIC SCHEDULER TIMEZONE FIX**: Fixed critical timezone inconsistency in the automatic publishing scheduler that was preventing past due posts from being published. The scheduler was comparing UTC dates with store timezone dates, causing posts to never trigger for publication even when past due. (1) Rewrote scheduler timezone comparison logic to match the fixed API endpoint logic, ensuring both use identical store timezone-aware date comparisons, (2) Replaced UTC Date.UTC() creation with store timezone parsing for accurate past due detection, (3) Verified automatic publishing works correctly: posts scheduled for 3:29 AM Eastern Time were automatically detected as past due at 3:34 AM Eastern and successfully published to Shopify, (4) **COMPLETE SYSTEM CONSISTENCY**: Both the "Past Due" status indicators in the UI AND the automatic scheduler now operate entirely within the connected store's timezone (GMT-05:00 Eastern Time), eliminating all UTC-related scheduling conflicts. The scheduling system now functions reliably end-to-end with proper timezone awareness throughout.

**SEO-FRIENDLY URL GENERATION WITH HANDLE SUPPORT**: Completely resolved URL generation issues where published content was showing numeric IDs instead of proper slugs/handles. (1) Fixed URL generation logic to correctly distinguish between blog posts and pages, preventing blog posts from being treated as pages, (2) Added `shopifyHandle` column to database schema and implemented comprehensive handle-fetching system that searches all available blogs when `shopifyBlogId` is missing, (3) Enhanced URL generation to use actual Shopify handles/slugs whenever available, generating SEO-friendly URLs like `/blogs/news/article-title-slug` instead of `/blogs/news/123456789`, (4) Implemented intelligent fallback system that gracefully handles deleted or non-existent articles by using numeric IDs when handles cannot be retrieved, (5) **COMPLETE URL SYSTEM**: Blog posts now generate proper `/blogs/{blog-handle}/{article-handle}` URLs, pages generate `/pages/{page-handle}` URLs, and the system automatically updates the database with retrieved handles for future use. The URL generation system now prioritizes SEO-friendly slugs while maintaining robust fallback mechanisms for edge cases.