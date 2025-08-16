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
- **YouTube Duplicate Processing Fix**: Resolved duplicate YouTube video embedding issue where videos appeared twice in generated content (one broken, one correct). Removed duplicate video processing logic from `server/routes/admin.ts` that was creating malformed iframe URLs. YouTube video embedding is now handled exclusively by `server/services/claude.ts` with proper video ID extraction and single placement under the second H2 heading.
- **YouTube Secondary Images Prevention**: Fixed root cause of YouTube video duplication by preventing YouTube videos from being incorrectly added to the `secondaryImages` array. YouTube videos are now exclusively stored in `youtubeEmbed` field only. Added safety filters to remove any existing YouTube entries from secondary images when a video is added, and explicit `type: 'image'` marking for all actual images to prevent type confusion.
- **YouTube Second H2 Placement Enhancement**: Reinforced YouTube video placement logic to ensure videos are always inserted under the second H2 heading specifically. Enhanced prompt instructions with critical placement rules and added debugging logs to track marker detection and video embedding confirmation.
- **Independent Meta Optimization Fix**: Fixed the auto-optimize buttons for Meta Title and Meta Description to work completely independently. Separated loading states (`isOptimizingMetaTitle` and `isOptimizingMetaDescription`) so clicking one button doesn't interfere with the other button's functionality.
- **Meta Description SEO Character Limit Fix**: Enhanced meta description optimization to strictly enforce the 160-character SEO limit. Improved Claude prompts with explicit character counting instructions and added server-side validation to truncate descriptions that exceed 160 characters, ensuring optimal search engine display.
- **Auto-Optimize Fallback Logic Fix**: Removed poor-quality fallback logic that simply truncated content with "..." when AI optimization failed. Now displays proper error notification encouraging users to retry AI optimization or manually edit, ensuring only high-quality AI-generated descriptions are used.
- **Project Load Secondary Images Duplication Fix**: Fixed Pexels image duplication issue when loading projects by implementing clean state reset and deduplication logic. Removed multiple state synchronization attempts that were causing duplicate entries in Selected Secondary Content. Added unique image filtering based on ID and URL to prevent duplicate secondary images during project restoration.
- **External Links NoFollow Attribute Fix**: Enhanced Claude AI content generation to automatically add `rel="nofollow noopener noreferrer"` attribute to all external links for SEO compliance. Updated Claude prompts to specify nofollow requirements and added post-processing function to ensure all external links include proper SEO attributes regardless of Claude's output format.
- **Workflow Step Validation Implementation**: Added proper workflow step validation to Generate Content button requiring users to complete Step 8 (Style & Formatting) before generating content. Enhanced workflow progression with "Next to Style & Formatting" button from Author step and proper step header for Style & Formatting section. Generate Content button now requires reaching step 9 (content generation step) in the workflow sequence.
- **Content Introduction Formatting Enhancement**: Updated Claude AI prompt to add an extra line break after the first bold sentence in content introduction paragraphs for improved readability and visual separation.
- **Manual Keywords Display Improvement**: Removed misleading "0" values from manual keywords in both the keyword selector table and selected keywords display section. Manual keywords now display "N/A" for search volume and difficulty in the table, "Manual" for competition level, and "(Manual)" label instead of "(0)" in the selected keywords badges, providing cleaner visual representation.
- **Meta Fields Border Color Enhancement**: Updated Meta Title and Meta Description border colors in Content Preview. Meta Title now shows green border when ≤60 characters (was yellow), Meta Description shows green border when ≤160 characters (was yellow). Only exceeding limits shows red borders, providing clearer visual feedback for optimal SEO lengths.

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