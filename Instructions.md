# Project Save/Load Logic Issue Fix Plan

## Problem Analysis
The "Create and Save Project" feature has multiple auto-trigger mechanisms causing unwanted saves:

### Root Causes Identified:
1. **React Query Auto-Polling**: `savedProjectData` query automatically refetches project data every 3 seconds
2. **Auto-Save on State Changes**: useEffect triggers save when workflow step, products, collections, keywords, or media change
3. **Form Watch Auto-Save**: useEffect with 2-second debounce triggers save on any form change
4. **Project Loading Side Effects**: Loading project data triggers auto-save mechanisms

### Files Requiring Changes:

#### 1. `/client/src/pages/AdminPanel.tsx` - Lines 290-320
- **Issue**: Query with automatic refetching
- **Fix**: Disable refetchInterval and add `enabled: false` until manual load

#### 2. `/client/src/pages/AdminPanel.tsx` - Lines 350-365  
- **Issue**: Auto-save on workflow step and state changes
- **Fix**: Remove automatic triggering, only save on manual button click

#### 3. `/client/src/pages/AdminPanel.tsx` - Lines 370-380
- **Issue**: Auto-save on form value changes with 2-second debounce
- **Fix**: Remove form.watch() auto-save completely

#### 4. `/client/src/pages/AdminPanel.tsx` - Lines 385-420
- **Issue**: Project loading effect triggers save logic
- **Fix**: Separate loading from saving, prevent save during load

### Solution Implementation:
1. **Disable Query Auto-Refetch**: Set `enabled: false` for savedProjectData query
2. **Remove Auto-Save Effects**: Delete useEffect hooks that trigger automatic saves
3. **Manual Save Only**: Ensure save functions only called from "Save Project" button
4. **Separate Load/Save Logic**: Create distinct functions for loading vs saving projects
5. **Add Save State Guards**: Prevent saves during project loading operations

### Expected Outcome:
- Projects only save when user clicks "Save Project" button
- Loading existing projects does not trigger auto-save
- No automatic polling or state-change saves
- Clean separation between load and save operations