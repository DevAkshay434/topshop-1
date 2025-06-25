# Create and Save Project Feature Implementation Plan

## Overview
This document outlines the complete implementation plan for adding Create and Save Project functionality to the Shopify app's admin panel. This feature will allow users to create named content projects that store the full form state, enabling them to reload and continue working without re-entering data.

## Objective
Allow users to create named content projects that store the full form state (product selections, formatting options, media, etc.) so they can reload and continue working without re-entering data.

## Frontend Implementation Plan

### 1. Database Schema Updates (`shared/schema.ts`)

Add new `projects` table:
```typescript
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => shopifyStores.id),
  name: text("name").notNull(),
  description: text("description"),
  projectData: text("project_data").notNull(), // JSON string of form state
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Add schema and types:
```typescript
export const insertProjectSchema = createInsertSchema(projects).pick({
  storeId: true,
  name: true,
  description: true,
  projectData: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
```

### 2. Backend API Routes (`server/routes.ts`)

Add project management endpoints:
- `GET /api/projects` - List all projects for current store
- `GET /api/projects/:id` - Get specific project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update existing project
- `DELETE /api/projects/:id` - Delete project (optional)

### 3. Storage Layer Updates (`server/storage.ts`)

Add project management methods to IStorage interface:
- `createProject(project: InsertProject): Promise<Project>`
- `getProjects(storeId: number): Promise<Project[]>`
- `getProject(id: number, storeId: number): Promise<Project | null>`
- `updateProject(id: number, project: Partial<InsertProject>, storeId: number): Promise<Project>`
- `deleteProject(id: number, storeId: number): Promise<void>`

### 4. Frontend Components

#### 4.1 Project Creation Dialog Component
Create `client/src/components/ProjectCreationDialog.tsx`:
- Modal dialog with project name (required) and description (optional)
- Form validation using Zod
- Integration with React Query for API calls

#### 4.2 Project Load Dialog Component
Create `client/src/components/ProjectLoadDialog.tsx`:
- Modal dialog showing list of saved projects
- Search/filter functionality for large project lists
- Project preview with creation date and description

#### 4.3 Project Management Buttons
Add to AdminPanel.tsx:
- "Create New Project" button (top of form)
- "Load Saved Project" button (top of form)
- "Save Project" button (bottom of form, near Generate Content)

### 5. AdminPanel.tsx Updates

#### 5.1 State Management
Add new state variables:
```typescript
const [currentProject, setCurrentProject] = useState<Project | null>(null);
const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
const [showLoadProjectDialog, setShowLoadProjectDialog] = useState(false);
```

#### 5.2 Form State Tracking
Track all form fields in a centralized state object:
```typescript
const [formState, setFormState] = useState({
  selectedProducts: [],
  selectedCollections: [],
  buyerPersonas: [],
  selectedKeywords: [],
  selectedTitle: "",
  mediaContent: {
    primaryImage: null,
    secondaryImages: [],
    youtubeEmbed: ""
  },
  selectedAuthorId: null,
  articleLength: "",
  headingsCount: "",
  writingPerspective: "",
  toneOfVoice: "",
  contentStyle: "",
  introType: "",
  faqType: "",
  categories: [],
  postStatus: "",
  publicationType: ""
});
```

#### 5.3 Project Operations
Add functions:
- `handleCreateProject(name: string, description?: string)`
- `handleLoadProject(project: Project)`
- `handleSaveProject()`
- `populateFormFromProject(projectData: any)`
- `extractFormStateForSaving()`

### 6. React Query Integration

Add queries and mutations:
```typescript
// List projects
const { data: projects } = useQuery({
  queryKey: ['/api/projects'],
  enabled: !!storeId
});

// Create project mutation
const createProjectMutation = useMutation({
  mutationFn: (data: InsertProject) => apiRequest('/api/projects', 'POST', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  }
});

// Update project mutation
const updateProjectMutation = useMutation({
  mutationFn: ({ id, data }: { id: number, data: Partial<InsertProject> }) => 
    apiRequest(`/api/projects/${id}`, 'PUT', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  }
});
```

## Form Fields to Track

The following form fields will be saved and restored:

### Content Configuration
- `selectedProducts` - Array of selected product IDs
- `selectedCollections` - Array of selected collection IDs
- `buyerPersonas` - Array of selected buyer persona objects
- `selectedKeywords` - Array of selected keywords
- `selectedTitle` - Selected title string

### Media Content
- `mediaContent.primaryImage` - Primary image object
- `mediaContent.secondaryImages` - Array of secondary image objects
- `mediaContent.youtubeEmbed` - YouTube embed URL

### Writing Configuration
- `selectedAuthorId` - Selected author ID
- `articleLength` - Article length setting
- `headingsCount` - Number of headings
- `writingPerspective` - Writing perspective setting
- `toneOfVoice` - Tone of voice setting
- `contentStyle` - Content style setting

### Content Structure
- `introType` - Introduction type
- `faqType` - FAQ type
- `categories` - Selected categories array

### Publishing Settings
- `postStatus` - Post status (draft/published/scheduled)
- `publicationType` - Publication type (post/page)

## Implementation Requirements

### Data Serialization
- All form state must be JSON serializable
- Complex objects (like images) need proper serialization/deserialization
- Date objects should be stored as ISO strings
- File objects should store metadata, not binary data

### Multi-Store Support
- Projects are isolated per store using `storeId`
- All queries include store context via X-Store-ID header
- Project names can be duplicated across different stores

### User Experience
- Projects auto-fill form but don't override unsaved changes
- Clear visual indication when a project is loaded
- Confirmation dialogs for destructive actions
- Loading states for all async operations

### Error Handling
- Graceful handling of malformed project data
- Validation of project names (required, length limits)
- Network error handling with user feedback
- Form state preservation during errors

## Security Considerations

### Data Validation
- Server-side validation of all project data
- Sanitize project names and descriptions
- Validate JSON structure of projectData field
- Ensure store isolation (users can only access their store's projects)

### Access Control
- Projects are scoped to specific stores
- Users can only access projects for stores they have access to
- Proper authentication checks on all endpoints

## Testing Strategy

### Unit Tests
- Form state serialization/deserialization
- Project CRUD operations
- Validation logic

### Integration Tests
- End-to-end project creation flow
- Form auto-fill functionality
- Multi-store project isolation

### User Acceptance Testing
- Create project with complex form state
- Load project and verify all fields populated
- Save changes to existing project
- Test with multiple stores

## Migration Strategy

### Database Migration
- Create projects table with proper indexes
- Add foreign key constraints for store isolation
- Set up proper permissions and indexes

### Backward Compatibility
- Feature is additive - existing functionality unchanged
- Form works with or without active project
- No breaking changes to existing APIs

## Future Enhancements

### Phase 2 Features
- Project templates/duplication
- Project sharing between team members
- Project history/versioning
- Bulk project operations
- Project search and filtering
- Export/import project functionality

### Performance Optimizations
- Project data caching
- Lazy loading of project lists
- Optimistic updates for better UX
- Background auto-save functionality

## Implementation Timeline

### Phase 1: Core Infrastructure (Days 1-2)
- Database schema updates
- Backend API endpoints
- Storage layer implementation

### Phase 2: Frontend Components (Days 3-4)
- Project creation/load dialogs
- AdminPanel integration
- React Query setup

### Phase 3: Form Integration (Days 5-6)
- Form state tracking
- Auto-fill functionality
- Save project implementation

### Phase 4: Testing & Polish (Days 7-8)
- Comprehensive testing
- Error handling
- UX improvements
- Documentation updates

## Success Criteria

1. Users can create named projects from admin panel
2. All specified form fields are saved and restored correctly
3. Projects are properly isolated per store
4. Form continues to work without active project
5. No performance degradation in admin panel
6. All existing functionality remains intact
7. Comprehensive error handling and user feedback
8. Clean, maintainable code following project patterns

This implementation plan provides a complete roadmap for adding project management functionality while maintaining the existing application's architecture and user experience.