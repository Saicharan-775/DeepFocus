/**
 * constants/ — Application-wide constants for DeepFocus
 *
 * Place non-secret, read-only configuration here:
 *   - Route paths
 *   - DB table names
 *   - UI labels / copy
 *   - Feature flags (boolean, non-sensitive)
 *
 * ⚠️  Never place API keys or secrets here.
 *    Those belong in .env (VITE_* variables).
 */

// Supabase table names — single source of truth to prevent typos
export const TABLES = {
  REVISION_PROBLEMS: 'revision_problems',
  EXTENSION_CONNECTIONS: 'extension_connections',
};

// Difficulty ordering used for sorting
export const DIFFICULTY_ORDER = { Hard: 3, Medium: 2, Easy: 1 };

// Valid focus statuses (must match DB check constraint)
export const FOCUS_STATUSES = ['Cheated', 'Give Up', 'Low Focus', 'Focus Kept'];
