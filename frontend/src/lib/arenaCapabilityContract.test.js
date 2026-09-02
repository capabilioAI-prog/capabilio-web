import { test } from "node:test"
import assert from "node:assert/strict"
import { isOpenableCapabilityTask } from "./arenaCapabilityContract.js"

// The regression this guards against: the frontend used to gate on
// taskSource === "existing_verified" only, so a real generated/regenerated/
// fallback task response was discarded as "no suitable task available."

test("existing_verified with a task is openable", () => {
  assert.equal(isOpenableCapabilityTask({ taskSource: "existing_verified", task: { id: "e1" } }), true)
})

test("generated with a task is openable — this is the Checkpoint E regression", () => {
  assert.equal(isOpenableCapabilityTask({ taskSource: "generated", task: { id: "gen-1" } }), true)
})

test("regenerated with a task is openable", () => {
  assert.equal(isOpenableCapabilityTask({ taskSource: "regenerated", task: { id: "gen-2" } }), true)
})

test("fallback with a task is openable", () => {
  assert.equal(isOpenableCapabilityTask({ taskSource: "fallback", task: { id: "fb-1" } }), true)
})

test("no_suitable_task with task:null is not openable", () => {
  assert.equal(isOpenableCapabilityTask({ taskSource: "no_suitable_task", task: null }), false)
})

test("a missing/undefined response is not openable", () => {
  assert.equal(isOpenableCapabilityTask(undefined), false)
  assert.equal(isOpenableCapabilityTask({}), false)
})
