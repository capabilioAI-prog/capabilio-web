import { test } from "node:test"
import assert from "node:assert/strict"
import { runAgainstDataset, compareResults, computeInsight, buildChecklist, SqlSandboxError } from "./sqlSandbox.js"

const dataset = {
  tableName: "orders",
  columns: ["id", "customer", "city", "product", "quantity", "price"],
  rows: [
    [1, "Amit", "Mumbai", "Laptop", 1, 55000],
    [2, "Priya", "Delhi", "Mouse", 3, 500],
    [3, "Amit", "Mumbai", "Mouse", 2, 500],
  ],
}

test("runs a correct SELECT and returns matching rows", async () => {
  const result = await runAgainstDataset(dataset, "SELECT id, customer, product FROM orders WHERE city = 'Mumbai'")
  assert.equal(result.rows.length, 2)
})

test("rejects statement stacking", async () => {
  await assert.rejects(
    () => runAgainstDataset(dataset, "SELECT 1; DROP TABLE orders;"),
    SqlSandboxError
  )
})

test("rejects non-SELECT statements", async () => {
  await assert.rejects(
    () => runAgainstDataset(dataset, "DELETE FROM orders"),
    SqlSandboxError
  )
})

test("rejects malformed SQL with a sandbox error, not a crash", async () => {
  await assert.rejects(
    () => runAgainstDataset(dataset, "SELECT FROM WHERE"),
    SqlSandboxError
  )
})

test("compareResults: unordered_rows ignores order", () => {
  const expected = { columns: ["a"], rows: [[1], [2]] }
  const actual = { columns: ["a"], rows: [[2], [1]] }
  const cmp = compareResults(actual, expected, "unordered_rows")
  assert.equal(cmp.passed, true)
})

test("compareResults: ordered_rows requires exact sequence", () => {
  const expected = { columns: ["a"], rows: [[1], [2]] }
  const actual = { columns: ["a"], rows: [[2], [1]] }
  const cmp = compareResults(actual, expected, "ordered_rows")
  assert.equal(cmp.passed, false)
})

test("compareResults: row-count mismatch fails", () => {
  const expected = { columns: ["a"], rows: [[1], [2]] }
  const actual = { columns: ["a"], rows: [[1]] }
  const cmp = compareResults(actual, expected, "unordered_rows")
  assert.equal(cmp.passed, false)
})

test("compareResults: numeric float rounding tolerance", () => {
  const expected = { columns: ["a"], rows: [[170000]] }
  const actual = { columns: ["a"], rows: [[170000.0000001]] }
  const cmp = compareResults(actual, expected, "unordered_rows")
  assert.equal(cmp.passed, true)
})

test("computeInsight: summarizes row count and column aggregates", () => {
  const insight = computeInsight({ columns: ["id", "customer", "product"], rows: [[1, "Amit", "Laptop"], [3, "Amit", "Mouse"]] })
  assert.match(insight, /2 rows returned/)
  assert.match(insight, /unique customer/)
})

test("computeInsight: empty result set", () => {
  assert.match(computeInsight({ columns: [], rows: [] }), /No rows returned/)
})

test("buildChecklist: flags column mismatch", () => {
  const expected = { columns: ["id", "customer"], rows: [[1, "Amit"]] }
  const actual = { columns: ["id", "product"], rows: [[1, "Laptop"]] }
  const checklist = buildChecklist(actual, expected, false)
  const columnsCheck = checklist.find(c => c.key === "columns")
  assert.equal(columnsCheck.passed, false)
})

test("buildChecklist: all pass when output matches", () => {
  const expected = { columns: ["id", "customer"], rows: [[1, "Amit"]] }
  const actual = { columns: ["id", "customer"], rows: [[1, "Amit"]] }
  const checklist = buildChecklist(actual, expected, true)
  assert.ok(checklist.every(c => c.passed))
})
