/**
 * aiService.js — Phase 2.7 (Enterprise AI Engine), Task 4.
 *
 * The ONLY thing business code (routes, lib files) should import for AI
 * calls. `executePrompt` is the one shared engine — look up the prompt,
 * build the request, retry, log, validate — so every named business
 * method added per migration batch is a thin one-or-two-line wrapper
 * around it, not a place duplicate retry/validation/logging logic
 * accumulates.
 *
 * Named, business-facing methods (generateArenaFeedback, extractResume,
 * generateInterviewQuestion, ...) are added incrementally as each
 * migration batch actually moves a call site onto this service — Batch 0
 * (infrastructure) ships zero named methods, per "no speculative
 * implementations."
 */
import crypto from "crypto"
import "./prompts/index.js" // registers every feature prompt file's entries before any getPrompt() lookup below
import { getPrompt } from "./prompts/promptManager.js"
import { providerManager, getActiveProviderName } from "./providerManager.js"
import { executeWithRetry } from "./retryManager.js"
import { validateJSON, validateShape, ValidationError } from "./responseValidator.js"
import { resolveModel } from "./modelRegistry.js"
import { logUsage } from "./usageLogger.js"

function classifyFailureStatus(err) {
  if (err instanceof ValidationError) return "validation_failed"
  if (/timed out/i.test(err?.message || "")) return "timeout"
  if (err?.status === 429 || /rate.?limit/i.test(err?.message || "")) return "rate_limited"
  return "error"
}

/**
 * @param {string} promptId — a registered prompts/promptManager.js entry id
 * @param {object} variables — values for the prompt's declared `variables`
 * @param {{provider?: string, fallbackProvider?: string, timeoutMs?: number, maxRetries?: number}} opts
 * @returns {Promise<{data: any, provider: string, model: string|null}>} —
 *   `data` is the validated/parsed object (if the prompt has a
 *   responseSchema) or the raw text (if not). `provider`/`model` expose
 *   which one actually served the request — real information some
 *   callers need (e.g. Skill Studio persists generated_by per lesson) and
 *   that pre-migration code always had access to via its own try/catch
 *   branching; collapsing it to a constant would be a real information
 *   loss, not a harmless simplification.
 */
async function executePrompt(promptId, variables, opts = {}) {
  const entry = getPrompt(promptId)
  const requestId = crypto.randomUUID()
  const capability = entry.defaultOpts.capability || "generateText"
  const callOpts = { ...entry.defaultOpts, requestId, feature: promptId }
  // Precedence: an explicit per-call override (opts.provider) beats a
  // prompt's own declared preference (entry.defaultOpts.provider), which
  // beats the global AI_PROVIDER default (providerManager's own fallback
  // when `provider` is left undefined here). A prompt CAN declare its own
  // provider/fallbackProvider — e.g. Skill Studio's lesson generation has
  // always preferred Gemini first, Groq second, independent of whatever
  // the platform-wide default is — without every caller needing to repeat
  // that preference on every executePrompt() call.
  const resolvedProvider = opts.provider || entry.defaultOpts.provider
  const resolvedFallback = opts.fallbackProvider || entry.defaultOpts.fallbackProvider
  // Model selection is independent of provider selection (Phase 2.7
  // architecture refinement, Requirement 4): a prompt declares an
  // abstract modelTier ("fast"|"quality"), resolved here against
  // whichever provider ends up serving the request — never a raw,
  // provider-specific model string baked into the prompt entry. An
  // explicit opts.model/entry.defaultOpts.model always wins if present
  // (escape hatch for a caller that genuinely needs one exact model).
  function resolveModelFor(providerName) {
    return opts.model || callOpts.model || resolveModel(providerName || getActiveProviderName(), callOpts.modelTier)
  }

  const start = Date.now()
  let outcome // { result, retryCount, providerUsed, fallbackUsed } — see retryManager.js
  try {
    if (capability === "extractFromImage") {
      const { base64Image, mimeType, prompt } = entry.buildExtraction(variables)
      outcome = await executeWithRetry(
        (providerOverride) => {
          const p = providerOverride || resolvedProvider
          return providerManager.extractFromImage(base64Image, mimeType, prompt, { ...callOpts, provider: p, model: resolveModelFor(p) })
        },
        { fallbackProvider: resolvedFallback, timeoutMs: opts.timeoutMs, maxRetries: opts.maxRetries }
      )
    } else {
      const messages = entry.buildMessages(variables)
      outcome = await executeWithRetry(
        (providerOverride) => {
          const p = providerOverride || resolvedProvider
          return providerManager[capability](messages, { ...callOpts, provider: p, model: resolveModelFor(p) })
        },
        { fallbackProvider: resolvedFallback, timeoutMs: opts.timeoutMs, maxRetries: opts.maxRetries }
      )
    }
  } catch (err) {
    // Transport/retry failure — every attempt across every provider was
    // exhausted. Logged ONCE here (not per attempt — see providerManager.js
    // and retryManager.js's headers for why that changed in this pass).
    await logUsage({
      requestId, feature: promptId, provider: resolvedProvider || getActiveProviderName(), model: null,
      inputTokens: null, outputTokens: null, latencyMs: Date.now() - start,
      retryCount: err.retryCount ?? 0, status: classifyFailureStatus(err), errorMessage: err.message,
    })
    throw err
  }

  const result = outcome.result
  const provider = outcome.providerUsed || resolvedProvider || null
  const model = result.model ?? null
  const usageFields = { requestId, feature: promptId, provider, model, inputTokens: result.inputTokens ?? null, outputTokens: result.outputTokens ?? null, latencyMs: Date.now() - start, retryCount: outcome.retryCount }

  if (!entry.responseSchema) {
    await logUsage({ ...usageFields, status: "success" })
    return { data: result.text ?? result.parsed ?? result, provider, model }
  }

  try {
    const data = result.parsed !== undefined
      ? validateShape(result.parsed, entry.responseSchema)
      : validateJSON(result.text, entry.responseSchema)
    await logUsage({ ...usageFields, status: "success" })
    return { data, provider, model }
  } catch (validationErr) {
    await logUsage({ ...usageFields, status: classifyFailureStatus(validationErr), errorMessage: validationErr.message })
    throw validationErr
  }
}

export const AIService = {
  executePrompt,
  // generateArenaFeedback/generateCodeMissionFeedback/
  // generateFrontendMissionFeedback (arena.sqlFeedback,
  // domainRole.codeMissionFeedback, domainRole.frontendMissionFeedback)
  // removed 2026-09-05 along with the old Arena implementation — their only
  // caller was routes/arenaDomainRole.js.
}
