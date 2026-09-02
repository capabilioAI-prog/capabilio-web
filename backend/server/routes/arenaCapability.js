/**
 * routes/arenaCapability.js — Arena Capability Engine, Phase 2.
 * ---------------------------------------------------------------------------
 * Sits above the existing College Stream / Domain Role branches without
 * merging them (arenaCollegeStream.js, arenaDomainRole.js — both untouched).
 * All business logic lives in lib/arenaCapability/*; this file is routing +
 * error-status mapping only, per the "don't collapse task selection, task
 * history, and route handling into one oversized handler" requirement.
 *
 * Generation is an internal fallback inside selectBestTask, not a separate
 * endpoint — this remains the ONLY public Arena Capability route. When no
 * suitable existing task exists AND generation/fallback both come up empty,
 * selectBestTask still honestly returns taskSource: "no_suitable_task"
 * rather than fabricating one.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { logger } from "../lib/logger.js"
import { selectBestTask } from "../lib/arenaCapability/selectionEngine.js"

const router = Router()

// GET /api/arena/capability/next-task?domain=college_stream|domain_role&key=<streamSlug|roleId>
// Auth required (not optionalAuth like the two existing per-branch
// endpoints) — personalized capability-based selection has no meaningful
// anonymous behavior, unlike "browse the first item in the curriculum."
router.get("/next-task", requireAuth, async (req, res) => {
  try {
    const { domain, key } = req.query
    if (!domain || !key) {
      return res.status(400).json({ error: 'Query params "domain" and "key" are required' })
    }
    const result = await selectBestTask({ userId: req.user.id, domain, key })
    res.json(result)
  } catch (err) {
    const status = err.statusCode || 500
    if (status === 500) logger.error("[arenaCapability] GET /next-task", { err })
    res.status(status).json({ error: status === 500 ? "Internal error" : err.message })
  }
})

export default router
