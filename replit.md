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

### Security Incident Resolution - COMPLETED ✅
- **Issue**: Shopify API credentials exposed in GitHub repository (database-export file)
- **Actions Taken**: 
  - Removed dangerous database export file containing access tokens
  - Enhanced .gitignore with comprehensive security patterns
  - Rotated Shopify app credentials (new API key/secret configured)
  - Configured secure environment variables in Replit
  - Created security incident documentation
- **Remaining**: User must uninstall/reinstall app on stores to revoke old access tokens
- **Deadline**: August 11, 2025 (Shopify Partner Governance response required)
- **Status**: Technical resolution complete, user action required
- **Date Completed**: January 8, 2025

### Subscription Plans System - IN PROGRESS ⚡
- **New Plan Structure**: Updated from 3-tier (FREE, BASIC, PREMIUM) to 4-tier system plus custom option
- **Plan Details**: 
  - **FREE**: 5 blog posts/pages per month, basic features ($0)
  - **SILVER**: 25 blog posts/pages per month, enhanced features ($19.99)
  - **GOLD**: 75 blog posts/pages per month, premium features ($39.99)
  - **DIAMOND**: 200 blog posts/pages per month, enterprise features ($79.99)
  - **CUSTOM**: Unlimited/custom limits, bespoke solutions (contact sales)
- **Technical Implementation**:
  - Added usage tracking fields to shopify_stores table (current_monthly_usage, last_usage_reset)
  - Created comprehensive billing service with plan management and usage enforcement
  - Implemented API endpoints for plan management, usage tracking, and subscription handling
  - Added frontend Plans page with usage visualization and subscription management
- **Features**: Monthly usage limits, automatic reset, usage statistics, plan upgrade/downgrade
- **Date Started**: January 8, 2025

### Manual Keyword Search Implementation - COMPLETED ✅
- **Goal**: Implemented manual keyword input that preserves exact user input without DataForSEO processing
- **Changes Made**:
  - Moved manual keyword input from KeywordSelector popup to main Keywords step in AdminPanel
  - Removed DataForSEO lookup for manual keywords - they are added exactly as user enters them
  - Manual keywords get basic metadata (searchVolume: 0, competition: 'MANUAL', difficulty: 0)
  - Manual keywords appear at top of keyword list when displayed (isManual: true flag)
  - Updated helper text to clarify that keywords are added "as-is without modification"
  - Removed automatic keyword processing, cleaning, or enhancement for manual entries
- **Technical Implementation**:
  - Manual keyword input field placed below "Generate Keywords" button
  - Simple validation checks for duplicates and empty strings
  - Keywords marked with `isManual: true` flag for special handling in UI
  - No API calls or external processing - pure client-side addition
  - DataForSEO service still available for "Generate Keywords" functionality
- **User Experience**: Users can add their exact target keywords without any system modifications
- **Date Completed**: August 11, 2025

### Enhanced Workflow Step Indicators - COMPLETED ✅
- **Goal**: Improved workflow step indicators to show completion status and allow navigation
- **Changes Made**:
  - Added Step 10 "Post" to workflow (now shows 10 steps instead of 9)
  - Made all step indicators clickable for easy navigation between workflow steps
  - Step 9 "Generate" shows green checkmark when content is successfully generated through Claude AI
  - Step 10 "Post" shows green checkmark when content is published/scheduled to Shopify
  - Improved spacing and layout - steps no longer appear cramped together
  - Added hover effects and tooltips for better user experience
  - Integrated step labels directly into clickable buttons (removed separate label row)
  - Added intelligent clickable logic - users can only navigate to completed steps or next available step
- **Technical Implementation**:
  - Added isContentGenerated and isContentPosted state variables
  - Updated completion logic to override default step progression for Generate and Post steps
  - Added click handlers with scrollToCurrentStep functionality
  - Enhanced visual styling with proper spacing and hover states
  - Updated WorkflowStep type and getStepOrder function to include 'post' step
- **User Experience**: Clean, intuitive workflow navigation with clear completion indicators
- **Date Completed**: August 11, 2025

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