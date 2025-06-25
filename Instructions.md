# Fix Plan: Create and Save Project Feature

## Problem Analysis

After auditing the codebase, I've identified several critical issues preventing the "Create and Save Project" feature from working properly:

### 1. **Incomplete Data Collection in ProjectCreationDialog**
- The `ProjectCreationDialog.tsx` has a `buildComprehensiveProjectData()` function that references undefined variables
- Missing access to admin panel state variables like `selectedProducts`, `selectedCollections`, etc.
- The dialog operates in isolation without access to the main form data

### 2. **Backend API Route Missing Implementation**
- The POST `/api/projects` route is referenced in the code but the complete implementation is not found
- Need to locate or implement the full backend route

### 3. **Inconsistent Data Structure Between Save and Load**
- Save operations collect form data + state variables
- Load operations expect parsed formData object but may not restore all state properly
- Missing fields during restoration cause blank UI inputs

### 4. **Form Reset Logic Issues**
- The `handleProjectSelected` function has comprehensive restoration logic but may have timing issues
- Some state variables are restored but form fields might not update properly

## Identified Missing Fields

Based on the code analysis, these fields are at risk of not being saved/loaded properly:

1. **Template Selection** - Not captured in project data
2. **Selected Collections** - State variable, may not sync with form
3. **Selected Buyer Personas** - Form field vs state variable mismatch
4. **Keywords** - Multiple state management approaches
5. **Selected Title** - Not clearly captured in project structure
6. **Uploaded Images/Media** - Complex state with primary/secondary images
7. **Formatting & Style Options** - Form fields may not be fully captured
8. **Workflow Step State** - Current step in multi-step process
9. **Author Selection** - Uses separate state variable `selectedAuthorId`

## Step-by-Step Fix Plan

### Step 1: Locate/Fix Backend API Route
- Find the complete POST `/api/projects` route implementation
- Ensure it properly saves JSON.stringify(formData) to database
- Verify error handling and response format

### Step 2: Fix ProjectCreationDialog Data Collection
- Pass admin panel state and form data as props to ProjectCreationDialog
- Update `buildComprehensiveProjectData()` to access all required state
- Ensure all form fields and state variables are captured

### Step 3: Standardize Save Data Structure
- Create a comprehensive project data collection function
- Include all form fields from `contentFormSchema`
- Include all state variables (products, collections, keywords, media, etc.)
- Add metadata like creation time, template info

### Step 4: Fix Load/Restoration Logic
- Update `handleProjectSelected` to handle all data types properly
- Ensure form.reset() properly restores all form fields
- Verify state variable restoration (setSelectedProducts, etc.)
- Add validation for missing/malformed data

### Step 5: Add Missing Field Handling
- Ensure template selection is saved and restored
- Fix buyer personas field handling (form vs state)
- Properly handle media selection state
- Verify workflow step restoration

### Step 6: Improve Error Handling
- Add better error messages for failed saves
- Handle partial data loading gracefully
- Add validation for required fields before save

### Step 7: Testing & Validation
- Test save operation with all fields populated
- Test load operation and verify all fields restore
- Test edge cases (missing data, malformed JSON)
- Verify multi-store isolation works properly

## Implementation Priority

1. **High Priority**: Backend route implementation and basic save/load
2. **Medium Priority**: Complete data collection and restoration
3. **Low Priority**: Error handling improvements and edge cases

## Files That Need Changes

1. `server/routes.ts` - Complete POST /api/projects route
2. `client/src/components/ProjectCreationDialog.tsx` - Fix data collection
3. `client/src/pages/AdminPanel.tsx` - Improve restoration logic
4. `shared/schema.ts` - Verify project schema supports all fields

## Next Steps

1. Implement the complete backend API route
2. Fix the ProjectCreationDialog data collection
3. Test the full save/load cycle
4. Add comprehensive error handling