import { test } from "node:test"
import assert from "node:assert/strict"
import { getExclusions } from "./taskHistory.js"

function fakeSupabase(passedRows) {
  const calls = []
  const chain = (table) => {
    const self = {
      select: (...a) => { calls.push(["select", table, a]); return self },
      eq: (...a) => { calls.push(["eq", table, a]); return self },
      in: (...a) => { calls.push(["in", table, a]); return { then: (resolve) => resolve({ data: passedRows, error: null }) } },
    }
    return self
  }
  return { deps: { supabaseAdmin: { from: chain } }, calls }
}

test("getExclusions: college_stream reads college_submissions.experiment_id where passed=true", async () => {
  const { deps, calls } = fakeSupabase([{ experiment_id: "e1" }, { experiment_id: "e2" }])
  const { passedIds } = await getExclusions({ userId: "u1", domain: "college_stream", taskIds: ["e1", "e2", "e3"] }, deps)
  assert.deepEqual([...passedIds].sort(), ["e1", "e2"])
  assert.ok(calls.some((c) => c[0] === "eq" && c[2][0] === "passed" && c[2][1] === true))
  assert.ok(calls.every((c) => c[1] === "college_submissions"))
})

test("getExclusions: domain_role reads domain_submissions.mission_id where passed=true", async () => {
  const { deps } = fakeSupabase([{ mission_id: "m1" }])
  const { passedIds } = await getExclusions({ userId: "u1", domain: "domain_role", taskIds: ["m1", "m2"] }, deps)
  assert.deepEqual([...passedIds], ["m1"])
})

test("getExclusions: unresolved-failed tasks are NOT excluded (only passed=true rows are read at all)", async () => {
  // The fake only ever returns rows for the passed=true query — a failed
  // attempt never appears here, so it can never end up in passedIds. This
  // is the whole "failed/unresolved stays the current task" policy: it's
  // not special-cased, it simply never enters the exclusion set.
  const { deps } = fakeSupabase([])
  const { passedIds } = await getExclusions({ userId: "u1", domain: "college_stream", taskIds: ["e1"] }, deps)
  assert.equal(passedIds.size, 0)
})

test("getExclusions: empty taskIds short-circuits without a query", async () => {
  const { passedIds } = await getExclusions({ userId: "u1", domain: "college_stream", taskIds: [] })
  assert.equal(passedIds.size, 0)
})

test("getExclusions: throws on unknown domain", async () => {
  await assert.rejects(() => getExclusions({ userId: "u1", domain: "nonsense", taskIds: ["x"] }))
})
