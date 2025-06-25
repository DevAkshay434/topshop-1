# Project Save/Load Feature Removal Plan

## Overview
This document outlines the complete removal of the project save/load functionality from the Shopify admin panel. The goal is to simplify the application by removing all project management features while maintaining the core blog content generation capabilities.

## Frontend Removal Tasks

### 1. AdminPanel.tsx Changes
- Remove project creation dialog component and all related state
- Remove "New Project", "Load Project", and "Save Project" buttons
- Delete state variables:
  - `currentProject`
  - `currentProjectId`
  - `autoSaveStatus`
  - `projects` (from queries)
- Remove event handlers:
  - `handleProjectSelected`
  - `saveCurrentProject`
  - `createProjectMutation`
  - `updateProjectMutation`
- Remove project-related useQuery and useMutation hooks
- Delete ProjectCreationDialog import and usage
- Remove AutoSaveIndicator component

### 2. ProjectCreationDialog.tsx
- Delete the entire file: `client/src/components/ProjectCreationDialog.tsx`
- Remove any imports of this component

### 3. Query Client Updates
- Remove project-related API calls from queryClient
- Clean up any project-specific cache invalidation logic

## Backend Removal Tasks

### 1. API Routes (server/routes.ts)
Remove these endpoints:
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get specific project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### 2. Storage Layer (server/storage.ts)
Remove these methods:
- `createProject()`
- `getProjects()`
- `getProject()`
- `updateProject()`
- `deleteProject()`

### 3. Database Schema (shared/schema.ts)
- Remove `projects` table definition
- Remove `insertProjectSchema` and related types
- Remove project-related relations

## Database Cleanup

### 1. Drop Projects Table
```sql
DROP TABLE IF EXISTS projects;
```

### 2. Remove Project-Related Migrations
- Clean up any migration files related to projects table

## Code Cleanup Tasks

### 1. Remove Unused Imports
- Clean up all imports related to project management
- Remove unused React hooks and components
- Remove project-related utility functions

### 2. Simplify Form State
- Remove project-related form initialization logic
- Simplify form default values to static defaults
- Remove project data restoration logic

### 3. Update State Management
- Remove project-related state variables
- Simplify component initialization
- Remove project-related useEffect hooks

## Validation Steps

### 1. Functionality Tests
- Verify admin panel loads correctly
- Confirm form works for content generation
- Test all existing features (product selection, content generation, etc.)
- Ensure no project-related errors in console

### 2. Performance Check
- Verify faster load times without project queries
- Confirm no unnecessary API calls
- Check for any remaining project-related network requests

## Files to Modify

### Frontend Files
- `client/src/pages/AdminPanel.tsx` (major changes)
- `client/src/components/ProjectCreationDialog.tsx` (delete)
- `client/src/lib/queryClient.ts` (minor cleanup)

### Backend Files
- `server/routes.ts` (remove project routes)
- `server/storage.ts` (remove project methods)
- `shared/schema.ts` (remove project schema)

### Database
- Execute DROP TABLE command
- Clean migration files if needed

## Risk Assessment

### Low Risk
- Form functionality remains intact
- Core content generation unaffected
- User preferences and settings preserved

### Considerations
- Existing saved projects will be lost (acceptable per user request)
- Templates functionality may need evaluation
- Ensure no other features depend on project data

## Implementation Order

1. **Database cleanup** - Drop projects table
2. **Backend removal** - Remove API routes and storage methods
3. **Schema cleanup** - Remove project types and schemas
4. **Frontend removal** - Remove UI components and state management
5. **Code cleanup** - Remove unused imports and dead code
6. **Testing** - Verify all functionality works correctly

## Post-Implementation

### 1. Documentation Update
- Update replit.md to reflect simplified architecture
- Remove project-related sections from documentation

### 2. Performance Benefits
- Faster initial load (no project queries)
- Simplified state management
- Reduced bundle size
- Less API overhead

---

**Status**: Plan created, awaiting user confirmation to proceed with implementation.

**Estimated Time**: 30-45 minutes for complete removal and testing.