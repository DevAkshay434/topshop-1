/**
 * Permission utilities for Shopify API scopes
 */

/**
 * Checks if the store has the required scopes for scheduling content
 * @param storeScopes The scope string for a store
 * @returns True if the store has write_publications scope, false otherwise
 */
export function hasSchedulingPermission(storeScopes: string): boolean {
  if (!storeScopes) return false;
  
  // Parse the scopes string to check for write_publications
  const scopeList = storeScopes.split(',');
  return scopeList.includes('write_publications');
}

/**
 * Get the list of missing permissions required for scheduling
 * @param storeScopes The scope string for a store
 * @returns Array of missing permission scopes
 */
export function getMissingSchedulingPermissions(storeScopes: string): string[] {
  if (!storeScopes) return ['write_publications'];
  
  const scopeList = storeScopes.split(',');
  const missingScopes: string[] = [];
  
  if (!scopeList.includes('write_publications')) {
    missingScopes.push('write_publications');
  }
  
  return missingScopes;
}

/**
 * Returns the full scope string needed for the app
 * @returns The complete scope string
 */
export function getFullScopeString(): string {
  return 'read_products,write_products,read_content,write_content,read_themes,write_publications';
}