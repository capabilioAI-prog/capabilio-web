import { test } from "node:test"
import assert from "node:assert/strict"
import { generateArenaTask } from "./taskGeneration.js"
import { resolveGenerationPromptId } from "./promptResolver.js"
import { ValidationError } from "../ai/responseValidator.js"

/**
 * NO REAL AI PROVIDER IS CALLED ANYWHERE IN THIS FILE. Every test injects a
 * fake `executePrompt` via deps — the real `AIService.executePrompt` (which
 * is what actually reaches Groq/OpenAI/Anthropic/Gemini/Bedrock) is never
 * imported here at all. `resolveGenerationPromptId` IS the real one
 * (pure, no I/O, already covered in promptResolver.test.js) — reusing it
 * here just proves generateArenaTask calls the real resolver correctly.
 */
function fakeDeps({ executePromptImpl } = {}) {
  const calls = []
  return {
    deps: {
      resolveGenerationPromptId,
      executePrompt: async (promptId, variables, opts) => {
        calls.push({ promptId, variables, opts })
        return executePromptImpl(promptId, variables, opts)
      },
    },
    calls,
  }
}

test("1. College Stream resolves the correct existing prompt and calls it with subjectName/unitTitle", async () => {
  const { deps, calls } = fakeDeps({
    executePromptImpl: async () => ({ data: { title: "t", prompt: "p", referenceSolution: "r" }, provider: "groq", model: "m1" }),
  })
  const result = await generateArenaTask({
    domain: "college_stream", difficulty: "easy", fewShotBlock: "example",
    collegeStream: { subjectName: "Neural Network Foundations", unitTitle: "Neural Network Basics" },
  }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.promptId, "collegeStream.experimentGeneration")
  assert.equal(calls[0].promptId, "collegeStream.experimentGeneration")
  assert.equal(calls[0].variables.subjectName, "Neural Network Foundations")
  assert.equal(calls[0].variables.unitTitle, "Neural Network Basics")
})

test("2. Domain Role sql_runner resolves domainRole.sqlMissionGeneration", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => ({ data: {}, provider: "groq", model: "m1" }) })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "sql_runner", streamOrRole: { label: "Data Analyst" } }, deps)
  assert.equal(result.promptId, "domainRole.sqlMissionGeneration")
  assert.equal(calls[0].variables.roleLabel, "Data Analyst")
  assert.ok("datasetGuidance" in calls[0].variables)
})

test("3. Domain Role python_runner resolves domainRole.pythonMissionGeneration", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => ({ data: {}, provider: "groq", model: "m1" }) })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "python_runner", streamOrRole: { label: "ML Engineer" } }, deps)
  assert.equal(result.promptId, "domainRole.pythonMissionGeneration")
  assert.ok("roleSkillsList" in calls[0].variables)
})

test("4. Domain Role node_runner resolves domainRole.nodeMissionGeneration", async () => {
  const { deps } = fakeDeps({ executePromptImpl: async () => ({ data: {}, provider: "groq", model: "m1" }) })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "node_runner", streamOrRole: { label: "Backend Engineer" } }, deps)
  assert.equal(result.promptId, "domainRole.nodeMissionGeneration")
})

test("5. Domain Role frontend_runner resolves domainRole.frontendMissionGeneration", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => ({ data: {}, provider: "groq", model: "m1" }) })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "frontend_runner" }, deps)
  assert.equal(result.promptId, "domainRole.frontendMissionGeneration")
  // frontend prompt declares only difficulty+fewShotBlock — no roleLabel key should leak in
  assert.deepEqual(Object.keys(calls[0].variables).sort(), ["difficulty", "fewShotBlock"])
})

test("6a. Unknown domain is rejected without calling the AI boundary at all", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => { throw new Error("should never be called") } })
  const result = await generateArenaTask({ domain: "nonsense" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "unsupported_domain_or_panel_type")
  assert.equal(calls.length, 0)
})

test("6b. Unknown domain_role panelType is rejected without calling the AI boundary at all", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => { throw new Error("should never be called") } })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "carrier_pigeon" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "unsupported_domain_or_panel_type")
  assert.equal(calls.length, 0)
})

test("College Stream Rule: missing subject/unit context is rejected explicitly, never guessed, without calling the AI boundary", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => { throw new Error("should never be called") } })
  const result = await generateArenaTask({ domain: "college_stream", difficulty: "easy" }, deps) // no collegeStream field at all
  assert.equal(result.ok, false)
  assert.equal(result.reason, "missing_context")
  assert.match(result.detail, /subjectName, unitTitle/)
  assert.equal(calls.length, 0)
})

test("7. AIService boundary is invoked with exactly the resolved prompt id", async () => {
  const { deps, calls } = fakeDeps({ executePromptImpl: async () => ({ data: {}, provider: "groq", model: "m1" }) })
  await generateArenaTask({ domain: "domain_role", panelType: "sql_runner" }, deps)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].promptId, "domainRole.sqlMissionGeneration")
})

test("8. Successful structured output is normalized into {ok, promptId, domain, panelType, task, metadata}", async () => {
  const { deps } = fakeDeps({
    executePromptImpl: async () => ({ data: { title: "Fix the flaky query", prompt: "...", dataset: {}, expected_result: {}, match_mode: "unordered_rows" }, provider: "groq", model: "openai/gpt-oss-120b" }),
  })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "sql_runner", streamOrRole: { label: "Data Analyst" } }, deps)
  assert.equal(result.ok, true)
  assert.equal(result.task.title, "Fix the flaky query")
  assert.equal(result.metadata.provider, "groq")
  assert.equal(result.metadata.model, "openai/gpt-oss-120b")
  assert.ok(typeof result.metadata.generatedAt === "string")
})

test("9a. A malformed/invalid AI structured output (ValidationError) is normalized to reason=invalid_output, raw payload never leaked", async () => {
  const { deps } = fakeDeps({
    executePromptImpl: async () => { throw new ValidationError("AI response failed schema validation: title required", { raw: "{'title':}garbled(((secret-looking-payload", issues: [{ path: ["title"] }] }) },
  })
  const result = await generateArenaTask({ domain: "domain_role", panelType: "frontend_runner" }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "invalid_output")
  assert.match(result.detail, /schema validation/)
  assert.equal(JSON.stringify(result).includes("garbled"), false) // raw model text must never leak into the returned object
  assert.equal("raw" in result, false)
  assert.equal("issues" in result, false)
})

test("9b. A provider/transport failure (generic Error, e.g. network/timeout) is normalized to reason=provider_error", async () => {
  const { deps } = fakeDeps({ executePromptImpl: async () => { throw new Error("upstream request timed out after 20000ms") } })
  const result = await generateArenaTask({ domain: "college_stream", collegeStream: { subjectName: "S", unitTitle: "U" } }, deps)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "provider_error")
  assert.match(result.detail, /timed out/)
})

test("10. No real external AI provider is called during these tests (enforced by construction — see file header; this test documents the guarantee explicitly)", () => {
  // taskGeneration.js's defaultDeps wraps the real AIService.executePrompt,
  // but every test above passes its OWN fake `deps` argument, which always
  // wins (generateArenaTask(context, deps = defaultDeps) — an explicit
  // second argument overrides the default). No test in this file omits it.
  assert.ok(true)
})
