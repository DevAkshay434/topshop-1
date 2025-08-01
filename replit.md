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