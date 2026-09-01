/**
 * tools/elo.ts — ELO domain (0 working tools, 4 not yet implemented)
 *
 * Tools:
 *   elo.getScore       — NOT_IMPLEMENTED (no per-uid ELO read endpoint on the rebuilt backend)
 *   elo.getTimeline    — NOT_IMPLEMENTED (same — no ELO history endpoint)
 *   elo.getBreakdown   — NOT_IMPLEMENTED (same — no per-dimension breakdown endpoint)
 *   elo.getComparison  — NOT YET IMPLEMENTED (no percentile/histogram backend — Group-B follow-up, unchanged)
 *
 * BACKEND WIRING NOTE (2026-09-01 fix): this file previously backed
 * getScore/getTimeline/getBreakdown with GET /api/arena/v2/elo/:uid
 * (arenaV2.js), which was deleted along with the rest of Arena V2 in commit
 * c34d357 (2026-08-26). The rebuilt Arena backend has NO equivalent —
 * ELO is a flat `profiles.elo_rating` column with no dedicated read route,
 * no history, no per-dimension breakdown, and no rank. Fabricating a
 * degraded response (e.g. just the raw number, no breakdown/history/rank)
 * would silently break these tools' documented contract instead of failing
 * loudly, so all three now fail fast with the same NOT_IMPLEMENTED pattern
 * getComparison already used. Building a real ELO-read endpoint is backend
 * work, out of scope for this fix.
 *
 * Security: students may only view their own ELO.
 * Recruiters and institution_admins may view any candidate's ELO (publicOk).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission } from "../shared/permissions.js"
import {
  parse, AuthSchema, UidSchema, EloTimelineSchema,
} from "../shared/validation.js"
import { createLogger, startTimer } from "../shared/logger.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"

export function registerEloTools(server: McpServer): void {

  // ── elo.getScore ───────────────────────────────────────────────────────────
  server.tool(
    "elo.getScore",
    "NOT YET IMPLEMENTED — there is no per-uid ELO read endpoint on the rebuilt Arena backend (ELO is a flat profiles.elo_rating column with no dedicated read route, no rank, no percentile). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid:     UidSchema.optional().describe(
        "UID of another user to view. Only recruiters and admins may pass this."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ targetUid: UidSchema.optional() })
      const { authorization, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getScore", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      // Recruiters/admins may query other users; students can only query self
      const uid = resolveTargetUid(user, targetUid)

      log.failure(t, "NOT_IMPLEMENTED", "No per-uid ELO read endpoint exists on the rebuilt backend", { uid })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "elo.getScore has no backend implementation yet — ELO is a flat profiles.elo_rating column with no dedicated read/rank/percentile endpoint. Tracked as follow-up work."
      )
    }
  )

  // ── elo.getTimeline ────────────────────────────────────────────────────────
  server.tool(
    "elo.getTimeline",
    "NOT YET IMPLEMENTED — there is no ELO history endpoint on the rebuilt Arena backend (ELO is a flat profiles.elo_rating column with no history table). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      window:        EloTimelineSchema.default("30d"),
      targetUid:     UidSchema.optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        window:    EloTimelineSchema.default("30d"),
        targetUid: UidSchema.optional(),
      })
      const { authorization, window, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getTimeline", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      const uid = resolveTargetUid(user, targetUid)

      log.failure(t, "NOT_IMPLEMENTED", "No ELO history endpoint exists on the rebuilt backend", { uid, window })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "elo.getTimeline has no backend implementation yet — ELO is a flat profiles.elo_rating column with no history table on the rebuilt backend. Tracked as follow-up work."
      )
    }
  )

  // ── elo.getBreakdown ───────────────────────────────────────────────────────
  server.tool(
    "elo.getBreakdown",
    "NOT YET IMPLEMENTED — there is no per-dimension ELO breakdown endpoint on the rebuilt Arena backend (ELO is a single flat profiles.elo_rating column, not split by Arena/Quiz/Interview/Skill Studio/Certification). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid:     UidSchema.optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ targetUid: UidSchema.optional() })
      const { authorization, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getBreakdown", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      const uid = resolveTargetUid(user, targetUid)

      log.failure(t, "NOT_IMPLEMENTED", "No per-dimension ELO breakdown endpoint exists on the rebuilt backend", { uid })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "elo.getBreakdown has no backend implementation yet — ELO is a single flat profiles.elo_rating column on the rebuilt backend, not split by dimension. Tracked as follow-up work."
      )
    }
  )

  // ── elo.getComparison ──────────────────────────────────────────────────────
  server.tool(
    "elo.getComparison",
    "NOT YET IMPLEMENTED — no backend endpoint computes cross-student percentile/histogram data by stream or college, and no other ELO tool in this file has a working substitute (all of elo.getScore/getTimeline/getBreakdown are also NOT_IMPLEMENTED — see tools/elo.ts header). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      stream:        z.string().optional().describe("Stream override; defaults to student's own stream"),
      collegeCode:   z.string().optional().describe("College scope; defaults to student's college"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        stream:      z.string().optional(),
        collegeCode: z.string().optional(),
      })
      const { authorization, stream, collegeCode } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("elo.getComparison", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "elo")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for stream/college ELO comparison", { stream, collegeCode })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "elo.getComparison has no backend implementation yet — nor does any other ELO tool in this file (see tools/elo.ts header). Tracked as follow-up work."
      )
    }
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function resolveTargetUid(
  user: { id: string; role: string },
  targetUid: string | undefined
): string {
  if (!targetUid || targetUid === user.id) return user.id

  const isPrivileged =
    user.role === "recruiter" ||
    user.role === "institution_admin" ||
    user.role === "admin"

  if (!isPrivileged) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Students may only view their own ELO data"
    )
  }

  return targetUid
}
