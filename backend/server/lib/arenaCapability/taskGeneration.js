/**
 * taskGeneration.js — Arena Capability Engine, Phase 3, Checkpoint B.
 * ---------------------------------------------------------------------------
 * Structured generation orchestration ONLY. Not wired into selectionEngine
 * yet (Checkpoint D). Does not persist anything, does not fingerprint,
 * does not deduplicate, does not call any evaluation sandbox. Those are
 * later checkpoints — see the file-level comments in selectionEngine.js/
 * dedup.js once they exist for the full picture.
 *
 * Call path (provider-neutral, confirmed in Checkpoint A):
 *   generateArenaTask(context)
 *     -> promptResolver.resolveGenerationPromptId({domain, panelType})
 *     -> AIService.executePrompt(promptId, variables)
 *     -> providerManager -> configured adapter
 *
 * Zero provider names, model names, or provider-specific request/response
 * shapes appear anywhere below — this file only ever deals in promptId +
 * variables (plain strings the existing prompts already declare) and the
 * normalized {data, provider, model} AIService.executePrompt already
 * returns. Reuses the EXISTING, already-registered, already-realistic
 * prompts verbatim (backend/server/lib/ai/prompts/{collegeStream,
 * domainRole}.js) — no new prompt text, no modified prompt text.
 *
 * "Never trust the AI's claim" is preserved structurally: the returned
 * `task` is only Zod-shape-valid (AIService.executePrompt's own
 * responseSchema check), not verified-correct — reference-solution
 * execution against the real sandboxes is Checkpoint C's job, not this
 * file's.
 */
import { resolveGenerationPromptId as defaultResolveGenerationPromptId } from "./promptResolver.js"
import { AIService } from "../ai/aiService.js"
import { ValidationError } from "../ai/responseValidator.js"

export const defaultDeps = {
  resolveGenerationPromptId: defaultResolveGenerationPromptId,
  executePrompt: AIService.executePrompt,
}

// One variable-builder per existing generation prompt id — the only place
// this file knows each prompt's exact declared `variables` list (see
// prompts/{collegeStream,domainRole}.js). Returning `null` signals "this
// request's context is insufficient to call this prompt at all" (distinct
// from a provider/validation failure), handled explicitly below.
//
// Richer signals (competency label, inferred weakness, avoided-task
// context) are NOT threaded into these variables — the existing prompts
// have no placeholder for them (adding one would be "modifying the
// existing prompt content", explicitly out of scope). A later
// context-resolution layer (fewShot.js) can fold such signals into
// `fewShotBlock`/`datasetGuidance` as free text without this file, or the
// prompts, needing to change.
const VARIABLE_BUILDERS = {
  "collegeStream.experimentGeneration": (ctx) => {
    const subjectName = ctx.collegeStream?.subjectName
    const unitTitle = ctx.collegeStream?.unitTitle
    if (!subjectName || !unitTitle) return null // College Stream Rule: hard-required, never guessed
    return {
      subjectName,
      unitTitle,
      difficulty: ctx.difficulty || "easy",
      fewShotBlock: ctx.fewShotBlock || "",
    }
  },
  "domainRole.sqlMissionGeneration": (ctx) => ({
    roleLabel: roleLabelOf(ctx),
    difficulty: ctx.difficulty || "easy",
    fewShotBlock: ctx.fewShotBlock || "",
    datasetGuidance: ctx.datasetGuidance || "Design a small, realistic dataset relevant to this role's day-to-day work.",
  }),
  "domainRole.pythonMissionGeneration": (ctx) => ({
    roleLabel: roleLabelOf(ctx),
    roleSkillsList: ctx.roleSkillsList || "",
    difficulty: ctx.difficulty || "easy",
    fewShotBlock: ctx.fewShotBlock || "",
  }),
  "domainRole.nodeMissionGeneration": (ctx) => ({
    roleLabel: roleLabelOf(ctx),
    roleSkillsList: ctx.roleSkillsList || "",
    difficulty: ctx.difficulty || "easy",
    fewShotBlock: ctx.fewShotBlock || "",
  }),
  "domainRole.frontendMissionGeneration": (ctx) => ({
    difficulty: ctx.difficulty || "easy",
    fewShotBlock: ctx.fewShotBlock || "",
  }),
}

function roleLabelOf(ctx) {
  return ctx.streamOrRole?.label || ctx.streamOrRole?.name || ctx.streamOrRole?.id || "the role"
}

/**
 * Normalized Arena generation context. Every field is optional except
 * `domain` (and `panelType` for domain_role) — callers pass through
 * whatever Phase 2's capability/profile data already has; this file does
 * not fetch or compute any of it itself.
 *
 * @typedef {Object} ArenaGenerationContext
 * @property {"college_stream"|"domain_role"} domain
 * @property {string} [panelType] - required for domain_role
 * @property {{id?:string, slug?:string, label?:string, name?:string}} [streamOrRole]
 * @property {{skillGraphNodeId?:string, label?:string, confidence?:number|null}} [competencyTarget]
 * @property {"easy"|"medium"|"hard"} [difficulty]
 * @property {string[]} [avoidedTaskIds] - not used by any existing prompt's variables; carried through for later checkpoints (dedup/logging)
 * @property {string} [fewShotBlock] - required (as non-empty content) for realistic output; empty string is structurally valid but yields generic content
 * @property {string} [datasetGuidance] - domainRole.sqlMissionGeneration only
 * @property {string} [roleSkillsList] - domainRole.py/node MissionGeneration only
 * @property {{subjectName:string, unitTitle:string}} [collegeStream] - REQUIRED when domain==="college_stream"
 */

/**
 * @param {ArenaGenerationContext} context
 * @param {typeof defaultDeps} deps
 * @returns {Promise<{ok:boolean, promptId:string|null, domain:string, panelType:string|null, reason?:string, detail?:string, task?:object, metadata?:object}>}
 */
export async function generateArenaTask(context, deps = defaultDeps) {
  const { domain, panelType = null } = context || {}

  let promptId
  try {
    promptId = deps.resolveGenerationPromptId({ domain, panelType })
  } catch (err) {
    return { ok: false, promptId: null, domain, panelType, reason: "unsupported_domain_or_panel_type", detail: err.message }
  }

  const buildVariables = VARIABLE_BUILDERS[promptId]
  const variables = buildVariables(context)
  if (variables === null) {
    return {
      ok: false,
      promptId,
      domain,
      panelType,
      reason: "missing_context",
      detail: domain === "college_stream"
        ? 'College Stream generation requires context.collegeStream = { subjectName, unitTitle }'
        : "Missing required generation context",
    }
  }

  let result
  try {
    result = await deps.executePrompt(promptId, variables)
  } catch (err) {
    // Never throw a raw provider/validation error upward, and never carry
    // err.raw (the raw model text a ValidationError attaches) or err.issues
    // into the returned object — only a short, human-authored message.
    // err.message on ValidationError is always the typed, safe summary
    // string constructed in responseValidator.js, never the raw payload.
    return {
      ok: false,
      promptId,
      domain,
      panelType,
      reason: err instanceof ValidationError ? "invalid_output" : "provider_error",
      detail: (err?.message ? String(err.message) : "AI generation failed").slice(0, 300),
    }
  }

  return {
    ok: true,
    promptId,
    domain,
    panelType,
    task: result.data, // Zod-shape-valid only — NOT verified-correct; see file header
    metadata: {
      provider: result.provider,
      model: result.model,
      generatedAt: new Date().toISOString(),
    },
  }
}
