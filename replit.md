# TopShop SEO - Shopify Blog Content Generation App

## Overview
TopShop SEO is a Shopify application designed to automate blog content generation and SEO optimization for e-commerce stores. It leverages AI to create high-quality blog posts, manages their publication, and provides performance analytics. The application aims to streamline content marketing for online retailers by providing a comprehensive solution for AI-powered content creation, media management, scheduling, and performance tracking.

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
- **Media Management**: Integration with Shopify media library, Pexels, and Pixabay for image assets, including a 3-step staged upload process directly to Shopify CDN. YouTube video embedding is supported with correct URL parsing and placement.
- **Scheduling**: Custom system for future content publication with fully dynamic timezone handling, detecting and using each connected store's specific timezone from the Shopify API.
- **Analytics**: Tracking and reporting on content performance.
- **UI/UX**: Utilizes Shadcn UI for a consistent look, TailwindCSS for responsive design, focusing on a streamlined workflow with standardized navigation and enhanced loading indicators. Video icons are consistently blue for non-error elements.
- **SEO Enhancements**: Generates relevant keywords, includes comprehensive title generation with keyword integration, supports separate SEO meta titles for pages and blog posts, and focuses on evergreen content strategies. Manual keyword input preserves exact user input. Table of Contents links are optimized for in-page navigation. Meta optimization for title and description works independently and enforces character limits. External links automatically include `rel="nofollow noopener noreferrer"`.
- **Project Management**: Allows users to save and load complete project configurations, including content settings, selected products, collections, keywords, and media, via a popup-driven workflow.
- **Multi-Store Support**: Ensures complete data isolation between connected Shopify stores, with automatic store detection and proper routing of API requests.
- **URL Generation**: Implements SEO-friendly URL generation using Shopify handles for both blog posts and pages, with robust fallback mechanisms.
- **Duplicate Prevention System**: Comprehensive duplicate prevention for scheduled content at the database level, checking both Shopify ID and title matches. Includes image deduplication for Pexels and prevents YouTube video duplication.
- **Author Information Management**: Preserves formatting in author descriptions, displays full descriptions, and ensures consistent author avatar sizing (64x64px) across blog posts and pages, including during project loads.
- **Workflow Step Validation**: Requires completion of preceding steps before content generation, enhancing workflow progression.

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