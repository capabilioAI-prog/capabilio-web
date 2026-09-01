/**
 * tools/arena.ts — Arena domain (1 working tool + 7 not yet implemented)
 *
 * Tools:
 *   arena.getCatalog             — NOT_IMPLEMENTED (no unified catalog endpoint)
 *   arena.getChallenge           — NOT_IMPLEMENTED (no unified challenge-id space)
 *   arena.submitSolution         — NOT_IMPLEMENTED (async job-queue model no longer exists)
 *   arena.getSubmissionResult    — NOT_IMPLEMENTED (no job queue to poll)
 *   arena.getLeaderboard         — NOT_IMPLEMENTED (no global/unified leaderboard)
 *   arena.getWorkbenchForRole    — resolve a role's IDE/workbench (pure local registry lookup, unaffected)
 *   arena.getMissionHistory      — NOT_IMPLEMENTED (no per-uid stats/proof-artifacts endpoint)
 *   arena.recommendNextChallenge — NOT_IMPLEMENTED (depends entirely on the above)
 *
 * BACKEND WIRING NOTE (2026-09-01 fix): this file previously called
 * /api/arena/v2/* (backend/server/routes/arenaV2.js) — that backend, along
 * with the rest of "Arena V2", was fully deleted in commit c34d357
 * (2026-08-26, "chore: remove arena-v2 and legacy Arena"). The rebuilt Arena
 * (backend/server/routes/arenaCollegeStream.js + arenaDomainRole.js) is not
 * a drop-in path rename — it has NO unified catalog/challenge-id space, NO
 * async job-queue submission (submit is synchronous, result comes back in
 * the same response), and NO per-uid /elo, /stats, /proof-artifacts,
 * /weak-topics, or /daily-assignment endpoint (ELO is a flat
 * profiles.elo_rating column with no dedicated read route). Building a
 * unified layer over the two structurally-independent live branches
 * (College Stream: streams→...→experiments; Domain Role: role-scoped
 * missions) is new backend/product design work, out of scope for this fix.
 * Every tool below that depended on a dead endpoint now fails fast with a
 * clear McpError instead of an opaque backend 404 — same precedent as
 * elo.getComparison (tools/elo.ts) and vault.listArtifacts (tools/vault.ts).
 *
 * Security: every tool verifies JWT. Submission tools assert the uid in the
 * submission matches the authenticated user.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission } from "../shared/permissions.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import {
  parse, AuthSchema, PaginationSchema, DifficultySchema, RoleHintSchema,
} from "../shared/validation.js"
import { createLogger, startTimer } from "../shared/logger.js"
import { getWorkbenchForRole as lookupWorkbench } from "../shared/registry.js"

export function registerArenaTools(server: McpServer): void {

  // ── arena.getCatalog ───────────────────────────────────────────────────────
  server.tool(
    "arena.getCatalog",
    "NOT YET IMPLEMENTED — the rebuilt Arena backend has no unified catalog endpoint spanning both branches. Use student.getCurrentRole to determine the student's domain, then browse via the live UI; a real MCP-facing catalog needs new backend work. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      category:    z.string().optional().describe("Problem category, e.g. 'DSA', 'ECE', 'SQL'"),
      difficulty:  DifficultySchema.optional(),
      search:      z.string().max(200).optional(),
      page:        z.number().int().min(1).default(1).optional(),
      pageSize:    z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        category:   z.string().optional(),
        difficulty: DifficultySchema.optional(),
        search:     z.string().max(200).optional(),
      })
      const { authorization, category, difficulty, search, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getCatalog", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No unified Arena catalog endpoint exists on the rebuilt backend", { category, difficulty, search, page, pageSize })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.getCatalog has no backend implementation yet — the rebuilt Arena backend has two separate branches (College Stream, Domain Role) with no unified catalog. Tracked as follow-up work."
      )
    }
  )

  // ── arena.getChallenge ─────────────────────────────────────────────────────
  server.tool(
    "arena.getChallenge",
    "NOT YET IMPLEMENTED — the rebuilt Arena backend has no unified challenge-id space; a raw UUID can't be resolved to either College Stream's experiments or Domain Role's missions without knowing which branch it belongs to. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      challengeId:   z.string().uuid("challengeId must be a UUID"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ challengeId: z.string().uuid() })
      const { authorization, challengeId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getChallenge", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No unified challenge-id lookup exists on the rebuilt backend", { challengeId })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.getChallenge has no backend implementation yet — there is no unified challenge-id space across College Stream and Domain Role. Tracked as follow-up work."
      )
    }
  )

  // ── arena.submitSolution ───────────────────────────────────────────────────
  server.tool(
    "arena.submitSolution",
    "NOT YET IMPLEMENTED — the async job-queue submission model (submit → jobId → poll) this tool was built for no longer exists. The rebuilt Arena backend's submit endpoints are synchronous and scoped per-branch (College Stream experiment or Domain Role mission), which this tool's flat challengeId/code shape cannot address. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      challengeId:   z.string().uuid("challengeId must be a UUID"),
      code:          z.string().min(1).max(50_000, "code too large (max 50 kB)"),
      language:      z.string().min(1).max(30).optional().describe(
        "Informational only — the grading worker infers language from the challenge, this field is not read by the backend today."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        challengeId: z.string().uuid(),
        code:        z.string().min(1).max(50_000),
        language:    z.string().min(1).max(30).optional(),
      })
      const { authorization, challengeId, code } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.submitSolution", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No async submission/job-queue model exists on the rebuilt backend", { challengeId, codeLength: code.length })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.submitSolution has no backend implementation yet — the rebuilt Arena backend submits synchronously per-branch, not via an async job queue. Tracked as follow-up work."
      )
    }
  )

  // ── arena.getSubmissionResult ──────────────────────────────────────────────
  server.tool(
    "arena.getSubmissionResult",
    "NOT YET IMPLEMENTED — there is no grading job queue to poll. The rebuilt Arena backend returns the graded result synchronously from the submit call itself (see arena.submitSolution). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      challengeId:   z.string().uuid("challengeId must be a UUID"),
      jobId:         z.string().min(1).describe("job_id returned by arena.submitSolution"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        challengeId: z.string().uuid(),
        jobId:       z.string().min(1),
      })
      const { authorization, challengeId, jobId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getSubmissionResult", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No grading job queue exists on the rebuilt backend", { challengeId, jobId })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.getSubmissionResult has no backend implementation yet — the rebuilt Arena backend has no job queue; results return synchronously from submit. Tracked as follow-up work."
      )
    }
  )

  // ── arena.getLeaderboard ───────────────────────────────────────────────────
  server.tool(
    "arena.getLeaderboard",
    "NOT YET IMPLEMENTED — there is no global/unified Arena leaderboard on the rebuilt backend, only per-branch leaderboards scoped to a specific College Stream slug or Domain Role id, which this tool's flat stream/collegeCode shape cannot address without a real design pass. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      stream:        z.string().optional().describe("Domain/stream filter — should be an arena domain key (e.g. from student.resolveRole's arenaKey), e.g. 'swe', 'ece_embedded'"),
      collegeCode:   z.string().optional().describe("NOT YET SUPPORTED by the backend — accepted for forward-compat but ignored"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(100).default(50).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        stream:      z.string().optional(),
        collegeCode: z.string().optional(),
      })
      const { authorization, stream, collegeCode, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getLeaderboard", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No global/unified Arena leaderboard endpoint exists on the rebuilt backend", { stream, collegeCode, page, pageSize })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.getLeaderboard has no backend implementation yet — the rebuilt Arena backend only exposes per-branch leaderboards (a specific College Stream slug or Domain Role id), not a global/unified one. Tracked as follow-up work."
      )
    }
  )

  // ── arena.getWorkbenchForRole ──────────────────────────────────────────────
  server.tool(
    "arena.getWorkbenchForRole",
    "Resolve the Arena workbench (IDE/renderer) for a role — code editor, firmware IDE, HDL IDE, circuit workbench, layout studio, engineering calculator, etc. Covers all streams (IT/ECE/EEE/Mech/Civil/etc.), driven entirely by the generated role/workbench registry — never hardcode a renderer per role.",
    {
      authorization: z.string().describe("Bearer JWT"),
      roleHint: z.string().min(1).describe(
        "Role identifier: roleId, keyword, or slug — same resolution as student.resolveRole"
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ roleHint: z.string().min(1) })
      const { authorization, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getWorkbenchForRole", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      // Pure local lookup against the generated registry — no backend call,
      // no Supabase access. See shared/registry.ts.
      const workbench = lookupWorkbench(roleHint)
      if (!workbench) {
        log.failure(t, "NOT_FOUND", `No role/workbench matched hint: ${roleHint}`)
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "No workbench found for role", roleHint }) }],
          isError: true,
        }
      }

      log.success(t, { workbenchId: workbench.id })
      return { content: [{ type: "text", text: JSON.stringify(workbench) }] }
    }
  )

  // ── arena.getMissionHistory ────────────────────────────────────────────────
  server.tool(
    "arena.getMissionHistory",
    "NOT YET IMPLEMENTED — the per-uid stats and proof-artifacts endpoints this tool depended on no longer exist on the rebuilt backend. College Stream's GET /streams/:slug/history and Domain Role's GET /:roleId/history are live but per-branch and per-user-session-scoped (not directly callable with a bare uid from here). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.getMissionHistory", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No per-uid stats/proof-artifacts endpoint exists on the rebuilt backend")
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.getMissionHistory has no backend implementation yet — the stats/proof-artifacts endpoints it depended on were removed with Arena V2. Tracked as follow-up work."
      )
    }
  )

  // ── arena.recommendNextChallenge ───────────────────────────────────────────
  server.tool(
    "arena.recommendNextChallenge",
    "NOT YET IMPLEMENTED — this tool composed elo/weak-topics/daily-assignment/catalog, all of which were removed with Arena V2. Domain Role's GET /:roleId/next-mission is a live, real partial equivalent (role-scoped 'what's next' with quota awareness) but is not a drop-in replacement for this tool's cross-domain reasoning shape. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      roleHint: RoleHintSchema,
    },
    async (args) => {
      const Schema = AuthSchema.extend({ roleHint: RoleHintSchema })
      const { authorization, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("arena.recommendNextChallenge", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "arena")

      log.failure(t, "NOT_IMPLEMENTED", "No elo/weak-topics/daily-assignment/catalog endpoints exist on the rebuilt backend", { roleHint })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "arena.recommendNextChallenge has no backend implementation yet — every endpoint it composed was removed with Arena V2. See the live GET /:roleId/next-mission route for a role-scoped partial equivalent. Tracked as follow-up work."
      )
    }
  )
}
