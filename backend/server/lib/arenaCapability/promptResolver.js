/**
 * promptResolver.js — Arena Capability Engine, Phase 3, Checkpoint A.
 * ---------------------------------------------------------------------------
 * The smallest possible Arena-specific integration onto the existing,
 * already-provider-neutral AI stack:
 *
 *   Arena (this file)
 *     -> AIService.executePrompt(promptId, variables, opts)   [aiService.js]
 *     -> providerManager[capability](...)                     [providerManager.js]
 *     -> configured adapter (groq/openai/anthropic/gemini/bedrock)
 *
 * This file does NOT call any provider, does NOT know any provider-specific
 * request/response shape, and does NOT add a second AI abstraction — it only
 * maps (domain, panelType) to the correct EXISTING, already-registered,
 * already-realistic prompt id from backend/server/lib/ai/prompts/
 * {collegeStream,domainRole}.js. No new prompts are defined here or anywhere
 * in Phase 3 — see those two files for the actual prompt text.
 *
 * Reusing the PROVEN-WORKING domain_missions shape for Phase 3 (explicit
 * product decision): domainRole.sqlMissionGeneration is registered as v2
 * ("Vision Reset" ticket framing, requires a `starter_query` column that does
 * not exist on the live domain_missions table — confirmed via live schema
 * query). Using it as-is today would produce inserts Phase 4/generation
 * cannot actually persist. That mismatch is a real, pre-existing issue,
 * explicitly NOT fixed here — see
 * docs/arena-phase3-followups.md for the tracked follow-up. Phase 3's
 * generation code (Checkpoint B) is responsible for using only the fields
 * that already exist live (dataset/expected_result/match_mode), regardless
 * of which extra fields a prompt's Zod schema happens to also produce.
 */

// domain_role panel_type -> the existing, already-registered generation
// prompt id for that panel type (backend/server/lib/ai/prompts/domainRole.js).
const DOMAIN_ROLE_PROMPT_BY_PANEL_TYPE = {
  sql_runner: "domainRole.sqlMissionGeneration",
  python_runner: "domainRole.pythonMissionGeneration",
  node_runner: "domainRole.nodeMissionGeneration",
  frontend_runner: "domainRole.frontendMissionGeneration",
}

const COLLEGE_STREAM_PROMPT_ID = "collegeStream.experimentGeneration"

/**
 * @param {{ domain: "college_stream"|"domain_role", panelType?: string }} args
 * @returns {string} an existing, already-registered prompt id
 */
export function resolveGenerationPromptId({ domain, panelType }) {
  if (domain === "college_stream") return COLLEGE_STREAM_PROMPT_ID

  if (domain === "domain_role") {
    const promptId = DOMAIN_ROLE_PROMPT_BY_PANEL_TYPE[panelType]
    if (!promptId) {
      throw new Error(`promptResolver: no generation prompt registered for domain_role panel_type "${panelType}"`)
    }
    return promptId
  }

  throw new Error(`promptResolver: unknown domain "${domain}" — expected "college_stream" or "domain_role"`)
}

export const KNOWN_PANEL_TYPES = Object.keys(DOMAIN_ROLE_PROMPT_BY_PANEL_TYPE)
