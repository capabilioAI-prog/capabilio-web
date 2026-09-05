/**
 * prompts/index.js — Phase 2.7.
 *
 * The actual aggregator: imports every feature prompt file for its
 * registerPrompt(...) side-effects. Depends on promptManager.js (via each
 * feature file); promptManager.js never depends on this file or on any
 * feature file — that one-way direction is what keeps the module graph
 * acyclic. aiService.js imports this file (not promptManager.js directly
 * for registration) so every prompt is guaranteed registered before any
 * getPrompt() lookup can run.
 */
import "./skillStudio.js" // Batch 2
// arena.js/domainRole.js/collegeStream.js prompt registrations removed
// 2026-09-05 along with the old Arena implementation.
