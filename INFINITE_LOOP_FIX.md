# Infinite Loop Fix Documentation

## Issue Description
The application was experiencing infinite loops when navigating between the create post page (`/create`) and dashboard (`/dashboard`). The backend server logs showed repeated calls to the `get-drafts` tool, and the frontend showed errors when trying to load dashboard data.

## Root Cause Analysis
The infinite loops were caused by improper dependency management in React hooks, specifically:

1. **useEffect dependencies including callback functions** that were recreated on every render
2. **Service instances being recreated** when tokens changed, causing dependent functions to be recreated
3. **Cascading re-renders** where one hook's state change triggered another hook's re-render

## Affected Files and Fixes

### 1. `frontend-vite/src/hooks/useDrafts.ts`
**Problem**: 
- `useEffect` depended on `fetchDrafts` function
- `fetchDrafts` was recreated every time `draftService` changed
- `draftService` was recreated every time `mcpToken` changed

**Solution**:
- Used `useMemo` to stabilize `draftService` creation
- Added `fetchingRef` to prevent multiple simultaneous calls
- Removed `fetchDrafts` from `useEffect` dependencies
- Added force parameter to `fetchDrafts` for manual refreshes

### 2. `frontend-vite/src/hooks/useScheduledPosts.ts`
**Problem**: 
- Callback functions had `fetchScheduledPosts` in their dependencies

**Solution**:
- Removed `fetchScheduledPosts` from callback dependencies

### 3. `frontend-vite/src/hooks/useDashboardData.ts`
**Problem**: 
- `useEffect` depended on `refreshAllData`
- `refreshAllData` depended on fetch functions that changed with `mcpToken`

**Solution**:
- Removed `refreshAllData` from `useEffect` dependencies

### 4. `frontend-vite/src/contexts/AuthContext.tsx`
**Problem**: 
- `useEffect` depended on `checkLinkedInStatus` function

**Solution**:
- Removed `checkLinkedInStatus` from `useEffect` dependencies

## Key Principles Applied

1. **Stable Dependencies**: Use `useMemo` and `useRef` to create stable references
2. **Minimal Dependencies**: Only include primitive values or stable references in `useEffect` dependencies
3. **Prevent Duplicate Calls**: Use refs to track ongoing operations
4. **Force Refresh Pattern**: Add force parameters for manual refreshes instead of relying on dependency changes

## Testing
After applying these fixes:
- Navigation between `/create` and `/dashboard` should be smooth
- Backend should not show repeated `get-drafts` calls
- Dashboard should load without infinite API calls
- LinkedIn connection status should be stable

## Prevention Guidelines
To prevent similar issues in the future:

1. **Avoid function dependencies in useEffect** unless absolutely necessary
2. **Use useCallback sparingly** and be careful with its dependencies
3. **Prefer primitive values** in dependency arrays
4. **Use refs for preventing duplicate operations**
5. **Test navigation flows** thoroughly during development
