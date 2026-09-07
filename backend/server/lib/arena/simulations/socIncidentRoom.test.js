import { test } from "node:test"
import assert from "node:assert/strict"
import { pivot, detectBruteForce, generateSocIncidentState } from "./socIncidentRoom.js"

function loginEvents(n, { sourceIP, userId, hostId = "h1" }, finalOutcome) {
  const events = []
  for (let i = 0; i < n; i++) events.push({ id: `${sourceIP}-${i}`, timestamp: i, hostId, userId, sourceIP, eventType: "login", outcome: i < n - 1 ? "failure" : finalOutcome })
  return events
}

test("5+ consecutive failures followed by a success flags a compromise", () => {
  const events = loginEvents(6, { sourceIP: "10.0.0.5", userId: "alice" }, "success")
  const flagged = detectBruteForce(events, 5)
  assert.equal(flagged.length, 1)
  assert.equal(flagged[0].sourceIP, "10.0.0.5")
})

test("a single successful login with no prior failures is never flagged", () => {
  const events = [{ id: 1, timestamp: 0, hostId: "h2", userId: "bob", sourceIP: "10.0.0.9", eventType: "login", outcome: "success" }]
  assert.equal(detectBruteForce(events, 5).length, 0)
})

test("failures below the threshold followed by a success are not flagged", () => {
  const events = loginEvents(3, { sourceIP: "10.0.0.5", userId: "alice" }, "success") // only 2 failures
  assert.equal(detectBruteForce(events, 5).length, 0)
})

test("a successful login resets the failure count for that (IP, user) pair", () => {
  const events = [
    ...loginEvents(3, { sourceIP: "10.0.0.5", userId: "alice" }, "success"), // 2 failures then success — resets
    { id: "x1", timestamp: 10, hostId: "h1", userId: "alice", sourceIP: "10.0.0.5", eventType: "login", outcome: "failure" },
    { id: "x2", timestamp: 11, hostId: "h1", userId: "alice", sourceIP: "10.0.0.5", eventType: "login", outcome: "success" },
  ]
  assert.equal(detectBruteForce(events, 5).length, 0) // never reaches 5 consecutive failures after the reset
})

test("pivot returns only events matching the field/value, sorted chronologically", () => {
  const events = [
    { id: 1, timestamp: 5, hostId: "h1", userId: "alice", sourceIP: "10.0.0.5", eventType: "login", outcome: "failure" },
    { id: 2, timestamp: 1, hostId: "h1", userId: "alice", sourceIP: "10.0.0.5", eventType: "login", outcome: "failure" },
    { id: 3, timestamp: 2, hostId: "h2", userId: "bob", sourceIP: "10.0.0.9", eventType: "login", outcome: "success" },
  ]
  const result = pivot(events, "sourceIP", "10.0.0.5")
  assert.equal(result.length, 2)
  assert.deepEqual(result.map((e) => e.id), [2, 1]) // sorted by timestamp
})

test("generateSocIncidentState exposes the raw log and pivot indices without pre-flagging any pattern", () => {
  const events = loginEvents(6, { sourceIP: "10.0.0.5", userId: "alice" }, "success")
  const state = generateSocIncidentState({ events })
  assert.equal(state.simulationType, "soc_incident_room")
  assert.deepEqual(state.events, events)
  assert.ok(state.ipIndex.some((e) => e.value === "10.0.0.5" && e.eventCount === 6))
  assert.equal(state.flagged, undefined)
})
