# TopShop SEO - Shopify Blog Content Generation App

## Overview
TopShop SEO is a Shopify application designed to automate blog content generation and SEO optimization for e-commerce stores. It leverages AI (Claude, OpenAI) to create high-quality blog posts, manages their publication, and provides performance analytics. The application operates both as an embedded Shopify admin feature and a standalone tool, aiming to streamline content marketing for online retailers by providing a comprehensive solution for AI-powered content creation, media management, scheduling, and performance tracking.

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
- **Content Generation**: AI-powered blog post creation, including SEO optimization and multiple AI provider support, with automatic meta optimization.
- **Media Management**: Integration with Shopify media library, Pexels, and Pixabay for image assets, including a 3-step staged upload process directly to Shopify CDN.
- **Scheduling**: Custom system for future content publication with robust timezone handling for both blog posts and pages, ensuring content publishes at the correct local time.
- **Analytics**: Tracking and reporting on content performance.
- **UI/UX**: Utilizes Shadcn UI for a consistent look, TailwindCSS for responsive design, focusing on a streamlined workflow with standardized navigation and enhanced loading indicators.
- **SEO Enhancements**: Generates relevant keywords, includes comprehensive title generation with keyword integration, supports separate SEO meta titles for pages and blog posts, and focuses on evergreen content strategies.
- **Project Management**: Allows users to save and load complete project configurations, including content settings, selected products, collections, keywords, and media.
- **Multi-Store Support**: Ensures complete data isolation between connected Shopify stores, with automatic store detection and proper routing of API requests.
- **URL Generation**: Implements SEO-friendly URL generation using Shopify handles for both blog posts and pages, with robust fallback mechanisms.
- **Content Preview Optimization**: Intelligent featured image handling in admin panel previews - prevents duplication by removing featured images from page content body when displayed separately in preview mode.

## Recent Changes (January 2025)

### Product Carousel Feature - COMPLETED ✅
- **Feature Added**: AI-generated content now includes product carousels when collections are selected in the admin panel
- **Technical Implementation**:
  - Enhanced Claude AI prompt to include product carousel placement marker `<!-- PRODUCT_CAROUSEL_PLACEMENT -->`
  - Added `generateProductCarousel()` function to create responsive HTML carousel with product cards
  - Extended Shopify services with `getProductsFromCollection()` method using GraphQL API
  - Integrated carousel processing in content generation pipeline after YouTube/image placement
  - Carousel displays up to 8 products with images, titles, prices, and direct product links
- **User Experience**: Carousels only appear when a collection is selected, maintaining content relevance
- **Styling**: Responsive design with horizontal scrolling and professional product card styling
- **Date Completed**: August 7, 2025

### Keyword Generation System - COMPLETED ✅
- **Issue Fixed**: Branded product names (e.g., "SoftPro® Elite Salt Free Water Conditioner") were generating zero search volume because specific brand/model combinations don't have search data
- **Solution Implemented**: Advanced branded product detection system that extracts core product categories from specific brand names
- **Technical Changes**: 
  - Added `detectBrandedProduct()` method to identify branded vs. generic search terms
  - Enhanced `enrichProductDataToPhrase()` to extract searchable categories from branded names
  - Implemented pattern matching for common product categories (water conditioners, air purifiers, etc.)
  - Maintains 5-word limit for DataForSEO API compatibility
- **Results**: System now converts "SoftPro® Elite Salt Free Water Conditioner" → "water conditioner" → generates 22,200+ search volume keywords
- **Date Completed**: January 8, 2025

## External Dependencies

- **AI Content Generation**:
    - Anthropic Claude API
    - OpenAI API
- **Media Services**:
    - Pexels API
    - Pixabay API
    - Shopify Files API (for native media management)
- **SEO and Analytics**:
    - DataForSEO API (for keyword research and search volume data)
    - Shopify Analytics API (for store performance)
- **Infrastructure**:
    - NeonDB (PostgreSQL database)
    - Replit (development and hosting)
    - Shopify Admin API (for app installation, billing, and core Shopify functionalities)