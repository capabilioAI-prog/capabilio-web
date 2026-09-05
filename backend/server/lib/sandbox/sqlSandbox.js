/**
 * sqlSandbox.js — Domain Role branch, SQL Runner panel evaluator
 * ---------------------------------------------------------------------------
 * Runs a student's submitted SQL against an EPHEMERAL, per-submission
 * in-memory SQLite database (via sql.js, already a project dependency —
 * no new dependency added), built fresh from the mission's seeded
 * `dataset`, then compares the result set to the mission's canonical
 * `expected_result`.
 *
 * Why not run against Supabase/Postgres directly: the student's SQL is
 * arbitrary and untrusted. Running it against real application tables
 * (even read-only) would risk leaking other users' data through crafted
 * queries and ties scoring correctness to live data that can change.
 * An in-memory sandbox seeded per-mission is isolated, deterministic, and
 * disposed of after each submission — nothing persists but the verdict.
 *
 * Deterministic, rule-based comparison only. No AI involved in scoring —
 * consistent with backend/server/lib/collegeStream/evaluator.js and the
 * project rule against unaudited AI scoring.
 */
import initSqlJs from "sql.js"

export class SqlSandboxError extends Error {}

let SQLPromise = null
function getSQL() {
  if (!SQLPromise) SQLPromise = initSqlJs()
  return SQLPromise
}

/**
 * @param {{tableName:string, columns:string[], rows:any[][]}} dataset
 * @param {string} sqlText — student-submitted SQL, read against the seeded table only
 * @returns {Promise<{columns:string[], rows:any[][]}>}
 */
export async function runAgainstDataset(dataset, sqlText) {
  if (!dataset || !dataset.tableName || !Array.isArray(dataset.columns) || !Array.isArray(dataset.rows)) {
    throw new SqlSandboxError("Mission dataset is malformed.")
  }
  if (!sqlText || !sqlText.trim()) {
    throw new SqlSandboxError("SQL query is empty.")
  }
  // Only allow a single read statement — block statement-stacking / DDL /
  // DML so the sandbox can't be abused to do anything but SELECT, even
  // though it's ephemeral and disposed of immediately after.
  const normalized = sqlText.trim().replace(/;+\s*$/, "")
  if (/;/.test(normalized)) {
    throw new SqlSandboxError("Only a single SELECT statement is allowed.")
  }
  if (!/^\s*(select|with)\b/i.test(normalized)) {
    throw new SqlSandboxError("Only SELECT queries are allowed.")
  }
  if (/\b(insert|update|delete|drop|alter|create|attach|pragma|vacuum)\b/i.test(normalized)) {
    throw new SqlSandboxError("Only read-only SELECT queries are allowed.")
  }

  const SQL = await getSQL()
  const db = new SQL.Database()
  try {
    const colDefs = dataset.columns.map(c => `"${c}"`).join(", ")
    db.run(`CREATE TABLE "${dataset.tableName}" (${colDefs});`)
    const placeholders = dataset.columns.map(() => "?").join(", ")
    const stmt = db.prepare(`INSERT INTO "${dataset.tableName}" VALUES (${placeholders})`)
    for (const row of dataset.rows) {
      stmt.run(row)
    }
    stmt.free()

    const startNs = process.hrtime.bigint()
    const result = db.exec(normalized)
    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6

    if (!result || result.length === 0) {
      return { columns: [], rows: [], executionTimeMs: Math.round(elapsedMs * 100) / 100 }
    }
    return { columns: result[0].columns, rows: result[0].values, executionTimeMs: Math.round(elapsedMs * 100) / 100 }
  } catch (e) {
    throw new SqlSandboxError(`SQL error: ${e.message}`)
  } finally {
    db.close()
  }
}

/**
 * Deterministic, generic summary of a result set — NOT an AI call. Row
 * count plus per-column aggregates (sum for numeric columns, distinct
 * values for low-cardinality text columns). Kept generic so it works for
 * any mission's dataset rather than hardcoding per-mission copy.
 */
export function computeInsight({ columns, rows }) {
  if (!rows || rows.length === 0) return "No rows returned — check your filter conditions."
  const lines = [`${rows.length} row${rows.length === 1 ? "" : "s"} returned.`]
  columns.forEach((col, idx) => {
    if (/^id$/i.test(col)) return
    const values = rows.map(r => r[idx])
    const allNumeric = values.every(v => typeof v === "number")
    if (allNumeric) {
      const sum = values.reduce((a, b) => a + b, 0)
      lines.push(`Total ${col}: ${Math.round(sum * 100) / 100}.`)
    } else {
      const distinct = [...new Set(values.map(v => String(v)))]
      if (distinct.length <= 8) {
        lines.push(`${distinct.length} unique ${col}${distinct.length === 1 ? "" : "s"}: ${distinct.join(", ")}.`)
      }
    }
  })
  return lines.join(" ")
}

/**
 * Deterministic checklist shown in the output panel. Every entry is a
 * real, computable comparison against the mission's expected_result —
 * nothing here is a fabricated percentage.
 */
export function buildChecklist(actual, expected, comparisonPassed) {
  const normSet = arr => new Set((arr || []).map(c => String(c).trim().toLowerCase()))
  const actualCols = normSet(actual.columns)
  const expectedCols = normSet(expected.columns)
  const columnsMatch = actualCols.size === expectedCols.size && [...actualCols].every(c => expectedCols.has(c))
  const rowCountMatch = (actual.rows || []).length === (expected.rows || []).length

  return [
    { key: "syntax", label: "Query Syntax", passed: true },
    { key: "columns", label: "Correct Columns", passed: columnsMatch },
    { key: "rows", label: "Correct Row Count", passed: rowCountMatch },
    { key: "output", label: "Correct Output", passed: comparisonPassed },
  ]
}

function normalizeCell(v) {
  if (v === null || v === undefined) return "null"
  if (typeof v === "number") return String(Math.round(v * 1e6) / 1e6) // tolerate float rounding
  return String(v).trim().toLowerCase()
}

function normalizeRow(row) {
  return row.map(normalizeCell)
}

/**
 * Compares an actual result set to the mission's expected_result.
 * match_mode "unordered_rows" (default) ignores row order (real-world SQL
 * doesn't guarantee order without ORDER BY); "ordered_rows" requires exact
 * sequence — used only for missions that explicitly test ORDER BY.
 */
export function compareResults(actual, expected, matchMode = "unordered_rows") {
  const expectedRows = (expected.rows || []).map(normalizeRow)
  const actualRows = (actual.rows || []).map(normalizeRow)

  if (actualRows.length !== expectedRows.length) {
    return { passed: false, score: 0, reason: `Expected ${expectedRows.length} row(s), got ${actualRows.length}.` }
  }

  if (matchMode === "ordered_rows") {
    const allMatch = actualRows.every((row, i) => JSON.stringify(row) === JSON.stringify(expectedRows[i]))
    return allMatch
      ? { passed: true, score: 100, reason: null }
      : { passed: false, score: 0, reason: "Row values or order don't match the expected result." }
  }

  // unordered_rows: multiset comparison
  const toKey = row => JSON.stringify(row)
  const expectedCounts = new Map()
  for (const row of expectedRows) expectedCounts.set(toKey(row), (expectedCounts.get(toKey(row)) || 0) + 1)
  const actualCounts = new Map()
  for (const row of actualRows) actualCounts.set(toKey(row), (actualCounts.get(toKey(row)) || 0) + 1)

  let matched = true
  for (const [key, count] of expectedCounts) {
    if (actualCounts.get(key) !== count) { matched = false; break }
  }
  if (matched && actualCounts.size !== expectedCounts.size) matched = false

  return matched
    ? { passed: true, score: 100, reason: null }
    : { passed: false, score: 0, reason: "Row values don't match the expected result (order doesn't matter)." }
}
