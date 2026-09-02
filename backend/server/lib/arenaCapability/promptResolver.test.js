import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveGenerationPromptId, KNOWN_PANEL_TYPES } from "./promptResolver.js"
// Importing AIService (not promptManager directly) mirrors exactly how real
// Arena code will call this — it guarantees prompts/index.js's registration
// side-effects have run, the same way aiService.js itself requires.
import { AIService } from "../ai/aiService.js"
import { getPrompt } from "../ai/prompts/promptManager.js"

test("resolveGenerationPromptId: college_stream always resolves to the existing experiment-generation prompt", () => {
  assert.equal(resolveGenerationPromptId({ domain: "college_stream" }), "collegeStream.experimentGeneration")
})

test("resolveGenerationPromptId: each domain_role panel type resolves to its existing generation prompt", () => {
  assert.equal(resolveGenerationPromptId({ domain: "domain_role", panelType: "sql_runner" }), "domainRole.sqlMissionGeneration")
  assert.equal(resolveGenerationPromptId({ domain: "domain_role", panelType: "python_runner" }), "domainRole.pythonMissionGeneration")
  assert.equal(resolveGenerationPromptId({ domain: "domain_role", panelType: "node_runner" }), "domainRole.nodeMissionGeneration")
  assert.equal(resolveGenerationPromptId({ domain: "domain_role", panelType: "frontend_runner" }), "domainRole.frontendMissionGeneration")
})

test("resolveGenerationPromptId: throws on an unknown domain", () => {
  assert.throws(() => resolveGenerationPromptId({ domain: "nonsense" }), /unknown domain/)
})

test("resolveGenerationPromptId: throws on an unknown domain_role panel type", () => {
  assert.throws(() => resolveGenerationPromptId({ domain: "domain_role", panelType: "carrier_pigeon" }), /no generation prompt registered/)
})

test("every prompt id this resolver can return is genuinely registered (catches drift between this file and prompts/*.js)", () => {
  const ids = [
    resolveGenerationPromptId({ domain: "college_stream" }),
    ...KNOWN_PANEL_TYPES.map((panelType) => resolveGenerationPromptId({ domain: "domain_role", panelType })),
  ]
  for (const id of ids) {
    assert.doesNotThrow(() => getPrompt(id), `prompt "${id}" must be registered in prompts/{collegeStream,domainRole}.js`)
  }
})

test("the resolved prompts are structurally callable through AIService.executePrompt's real contract — generateText capability, a real Zod schema, no provider-specific shape leaking through", () => {
  const ids = [
    resolveGenerationPromptId({ domain: "college_stream" }),
    ...KNOWN_PANEL_TYPES.map((panelType) => resolveGenerationPromptId({ domain: "domain_role", panelType })),
  ]
  for (const id of ids) {
    const entry = getPrompt(id)
    assert.equal(entry.defaultOpts.capability, "generateText")
    assert.equal(typeof entry.buildMessages, "function")
    assert.equal(typeof entry.responseSchema.parse, "function") // a real Zod schema, not a provider-shaped object
  }
  // AIService.executePrompt itself is the one and only call path this resolver
  // feeds — confirming it's the real, callable function Arena will invoke.
  assert.equal(typeof AIService.executePrompt, "function")
})
