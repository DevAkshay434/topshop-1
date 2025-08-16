# TopShop SEO - Shopify Blog Content Generation App

## Overview
TopShop SEO is a Shopify application designed to automate blog content generation and SEO optimization for e-commerce stores. It leverages AI to create high-quality blog posts, manages their publication, and provides performance analytics. The application operates both as an embedded Shopify admin feature and a standalone tool, aiming to streamline content marketing for online retailers by providing a comprehensive solution for AI-powered content creation, media management, scheduling, and performance tracking.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Design Philosophy
The application employs a modern full-stack, client-server architecture with multi-tenant capabilities, allowing it to serve multiple Shopify stores while maintaining data isolation. It is designed to function seamlessly as an embedded Shopify app and a standalone service.

### Technology Stack
- **Frontend**: React with TypeScript, TailwindCSS for styling, Shadcn UI for components, and Wouter for routing. State management is handled with React Query and React hooks.
- **Backend**: Node.js with Express and TypeScript.
- **Database**: PostgreSQL (NeonDB serverless) managed with Drizzle ORM.
- **AI Services**: Primarily Anthropic Claude with OpenAI as a secondary option, and a template-based fallback system.
- **Build Tools**: Vite for frontend and ESBuild for backend.

### Key Features and Implementations
- **Authentication**: Shopify OAuth 2.0 with multi-store support.
- **Content Generation**: AI-powered blog post creation, including SEO optimization and multiple AI provider support, with automatic meta optimization. Dynamic AI title generation system using OpenAI/Claude with keyword-based fallbacks.
- **Media Management**: Integration with Shopify media library, Pexels, and Pixabay for image assets, including a 3-step staged upload process directly to Shopify CDN.
- **Scheduling**: Custom system for future content publication with fully dynamic timezone handling for both blog posts and pages. All timezone calculations automatically detect and use each connected store's specific timezone (fetched from Shopify API) with no static fallbacks, ensuring accurate scheduling across different geographic regions. UTC is only used as an absolute last resort when Shopify API is unavailable, with clear warnings about potential inaccuracy.
- **Analytics**: Tracking and reporting on content performance.
- **UI/UX**: Utilizes Shadcn UI for a consistent look, TailwindCSS for responsive design, focusing on a streamlined workflow with standardized navigation and enhanced loading indicators. Improved workflow step indicators show completion status and allow navigation.
- **SEO Enhancements**: Generates relevant keywords, includes comprehensive title generation with keyword integration, supports separate SEO meta titles for pages and blog posts, and focuses on evergreen content strategies. Implemented manual keyword input that preserves exact user input without external processing. Table of Contents links are optimized for in-page navigation without unwanted new tabs.
- **Project Management**: Allows users to save and load complete project configurations, including content settings, selected products, collections, keywords, and media. The save project button is always enabled with a popup-driven project creation workflow.
- **Multi-Store Support**: Ensures complete data isolation between connected Shopify stores, with automatic store detection and proper routing of API requests.
- **URL Generation**: Implements SEO-friendly URL generation using Shopify handles for both blog posts and pages, with robust fallback mechanisms.
- **Content Preview Optimization**: Intelligent featured image handling in admin panel previews prevents duplication.
- **Author Description Formatting**: Preserves formatting (spaces, line breaks) in author descriptions when saving to Shopify. Author descriptions now display in full without truncation, and reading time has been removed from the author box for cleaner presentation.
- **Duplicate Prevention System**: Comprehensive duplicate prevention for scheduled content at database level, checking both Shopify ID and title matches. AdminPanel content generation disabled from creating Shopify content directly to prevent double scheduling when users use both form submission and publish buttons.
- **Enhanced Project Management**: Implemented ProjectSaveDialog with popup-driven workflow offering "Save as New Project" and "Save into Existing Project" options with dropdown selection. This replaced the direct save functionality with a more user-friendly dialog interface.
- **UI Consistency Improvements**: Updated all video icons throughout the interface from red (bg-red-600, bg-red-100, bg-red-500, text-red-700) to blue (bg-blue-600, bg-blue-100, bg-blue-500, text-blue-700) to avoid danger color indication for non-error elements. This includes play button overlays, video thumbnails, and video labels. Improved step indicators to use green numbers instead of checkmarks for better visual consistency.
- **Secondary Images Deduplication Fix**: Completely resolved Pexels image duplication in Secondary Selected Content by centralizing data source to use only `selectedMediaContent.secondaryImages` instead of dual state management. Updated secondary content display, removal, and counting logic to prevent duplicate image entries. Enhanced duplicate detection logic in image selection to check both ID and URL matches. Added comprehensive duplicate prevention for both primary and secondary image selection from Pexels with improved debugging logs.
- **YouTube Video Integration Fix**: Resolved issue where YouTube videos were incorrectly being added as thumbnail images instead of just video embeds. YouTube videos now only add the video embed without creating separate image entries.
- **Video Overlay Overlap Fix**: Fixed overlapping blue video overlay elements in YouTube thumbnails by conditionally rendering play button overlays only when appropriate, eliminating visual duplication.
- **Individual Meta Optimization**: Separated Auto-Optimize functionality for Meta Title and Meta Description to work independently. Created individual API endpoints `/api/optimize-meta-title` and `/api/optimize-meta-description` that optimize only the specific field clicked, preventing unwanted optimization of both fields simultaneously. Each button now optimizes only its respective field using dedicated Claude AI prompts.
- **YouTube URL Parsing Fix**: Fixed malformed YouTube iframe URLs in generated content. The regex pattern in `server/services/claude.ts` was incorrectly capturing full URLs instead of just video IDs, causing iframe src to show `https://www.youtube.com/embed/https://youtu.be/VIDEO_ID` instead of `https://www.youtube.com/embed/VIDEO_ID`. Improved URL parsing to correctly extract 11-character video IDs from both youtu.be and youtube.com formats.

## External Dependencies

- **AI Content Generation**:
    - Anthropic Claude API
    - OpenAI API
- **Media Services**:
    - Pexels API
    - Pixabay API
    - Shopify Files API
- **SEO and Analytics**:
    - DataForSEO API
    - Shopify Analytics API
- **Infrastructure**:
    - NeonDB (PostgreSQL database)
    - Replit
    - Shopify Admin API