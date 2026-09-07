import { test } from "node:test"
import assert from "node:assert/strict"
import { findRenamedDuplicates, timelineSortedBy, searchArtifacts, generateDigitalForensicsState } from "./digitalForensicsLab.js"

const ARTIFACTS = [
  { id: 1, filename: "invoice.pdf", path: "/docs/invoice.pdf", createdAt: 100, modifiedAt: 100, accessedAt: 100, sizeBytes: 2048, isDeleted: false, hash: "aaa" },
  { id: 2, filename: "svchost.exe", path: "/tmp/svchost.exe", createdAt: 200, modifiedAt: 200, accessedAt: 250, sizeBytes: 51200, isDeleted: false, hash: "bbb" },
  { id: 3, filename: "update.exe", path: "/tmp/hidden/update.exe", createdAt: 300, modifiedAt: 300, accessedAt: 300, sizeBytes: 51200, isDeleted: true, hash: "bbb" },
]

test("findRenamedDuplicates finds artifacts sharing a hash under different filenames", () => {
  const dupes = findRenamedDuplicates(ARTIFACTS)
  assert.equal(dupes.length, 1)
  assert.equal(dupes[0].hash, "bbb")
  assert.equal(dupes[0].artifacts.length, 2)
})

test("findRenamedDuplicates ignores artifacts that only share a hash under the SAME filename", () => {
  const dupes = findRenamedDuplicates([
    { ...ARTIFACTS[0] }, { ...ARTIFACTS[0], id: 4, createdAt: 500 },
  ])
  assert.equal(dupes.length, 0)
})

test("timelineSortedBy orders artifacts by the requested timestamp field", () => {
  const byCreated = timelineSortedBy(ARTIFACTS, "createdAt")
  assert.deepEqual(byCreated.map((a) => a.id), [1, 2, 3])
  const byAccessed = timelineSortedBy([ARTIFACTS[1], ARTIFACTS[0]], "accessedAt")
  assert.deepEqual(byAccessed.map((a) => a.id), [1, 2])
})

test("searchArtifacts matches filename or path, case-insensitively", () => {
  assert.equal(searchArtifacts(ARTIFACTS, "SVCHOST").length, 1)
  assert.equal(searchArtifacts(ARTIFACTS, "hidden").length, 1)
  assert.equal(searchArtifacts(ARTIFACTS, "nonexistent").length, 0)
})

test("generateDigitalForensicsState exposes every artifact and a hash index without pre-flagging the duplicate", () => {
  const state = generateDigitalForensicsState({ artifacts: ARTIFACTS })
  assert.equal(state.simulationType, "digital_forensics_lab")
  assert.deepEqual(state.artifacts, ARTIFACTS)
  assert.ok(state.hashIndex.some((h) => h.hash === "bbb" && h.artifactCount === 2))
  assert.equal(state.renamedDuplicates, undefined)
})

test("is deterministic", () => {
  const recipe = { artifacts: ARTIFACTS }
  assert.deepEqual(generateDigitalForensicsState(recipe), generateDigitalForensicsState(recipe))
})
