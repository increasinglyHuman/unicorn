/**
 * Public barrel for the help-preference subsystem (ADR-003).
 * Re-exports named symbols only; keeps the entry point tree-shakeable.
 *
 * Depends on: ./classifyFlavor, ./helpPrefStore
 * Depended on by: src/index.ts (public entry), UnicornProvider
 */
export { classifyFlavor, resolveHelpEnabled } from './classifyFlavor';
export { createLocalStorageHelpPrefStore } from './helpPrefStore';
