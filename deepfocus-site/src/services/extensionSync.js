import { addRevisionProblem } from './revisionService';

/**
 * Passive sync initialization.
 * The active synchronization is handled by the DeepFocus Extension's
 * content script bridge running on this page.
 */
export function startExtensionSync() {
  console.log('🔄 DeepFocus Passive Extension Sync Enabled');
}
