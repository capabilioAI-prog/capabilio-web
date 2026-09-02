// ─── Internal Code DNA batch scanner ──────────────────────────────────────────
// POST /api/internal/code-dna/scan-batch — the only caller is a Render Cron
// Job hitting this endpoint on a schedule (e.g. every 15-30 minutes) with a
// shared secret, same authentication pattern as routes/partnerBridge.js's
// requirePartnerSecret: server-to-server, never a per-user session, the
// secret never reaches a browser on either side.
//
// Deliberately processes a bounded BATCH per invocation (default 20), not
// "every eligible user in one request" — a Render Cron Job's own invocation
// still runs inside a normal HTTP-request-shaped process with a timeout, so
// this must stay fast per call. Being invoked frequently (every 15-30 min)
// with a small batch size is what actually delivers "roughly every 24
// hours per user" without ever blocking on a single giant scan — see the
// design report for the staggering rationale (github_connections.next_scan_at
// is spread out by each user's own connect time, not reset to midnight for
// everyone at once).
import express from "express"
import { claimEligibleForScan, markScanning, markScanFailed } from "../lib/codeDna/connection.js"
import { analyzeGithubProfile } from "./github.js"

const router = express.Router()

const DEFAULT_BATCH_SIZE = 20

function requireCronSecret(req, res, next) {
  const expected = process.env.INTERNAL_CRON_SECRET
  if (!expected) {
    return res.status(503).json({ error: "Code DNA scanner not configured on this deployment." })
  }
  const provided = req.headers["x-internal-cron-secret"]
  if (provided !== expected) {
    return res.status(401).json({ error: "Invalid credentials." })
  }
  next()
}

router.post("/code-dna/scan-batch", requireCronSecret, async (req, res) => {
  const batchSize = Math.min(Number(req.body?.batchSize) || DEFAULT_BATCH_SIZE, 50)
  let claimed = []
  try {
    claimed = await claimEligibleForScan(batchSize)
  } catch (e) {
    console.error("[code-dna scan-batch] claim failed:", e.message)
    return res.status(500).json({ error: "Could not select users for scanning." })
  }

  if (claimed.length === 0) {
    return res.json({ processed: 0, succeeded: 0, failed: 0 })
  }

  let succeeded = 0, failed = 0
  // Sequential, not Promise.all — this is a background batch job, not a
  // user-facing request; there's no reason to burst every claimed user's
  // GitHub calls simultaneously against the same rate-limit budget, and
  // sequential processing makes a mid-batch crash easy to reason about
  // (everything before it is already durably marked completed/failed).
  for (const { user_id: userId, username } of claimed) {
    try {
      await markScanning(userId)
      const result = await analyzeGithubProfile({ userId, githubUrl: `https://github.com/${username}` })
      if (result.status === 200) {
        succeeded++
        // analyzeGithubProfile already calls markScanCompleted internally
        // on success (see routes/github.js) — nothing further to do here.
      } else {
        failed++
        await markScanFailed(userId, { errorCategory: result.errorCategory || "unknown" })
      }
    } catch (e) {
      failed++
      console.error(`[code-dna scan-batch] user ${userId} threw:`, e.message)
      try { await markScanFailed(userId, { errorCategory: "unknown" }) } catch {}
    }
  }

  res.json({ processed: claimed.length, succeeded, failed })
})

export default router
