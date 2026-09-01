/**
 * tools/student.ts — Student domain (6 working tools, 3 not yet implemented)
 *
 * Tools:
 *   student.getProfile          — fetch own profile
 *   student.updateProfile       — update profile fields
 *   student.getOrbitStats       — NOT_IMPLEMENTED (no backend route)
 *   student.getActivityFeed     — NOT_IMPLEMENTED (no backend route)
 *   student.getPulseInsights    — AI market pulse for this role/stream
 *   student.resolveRole         — resolve keyword/slug → full RoleConfig
 *   student.getCurrentRole      — resolve role from the caller's OWN profile (no hint needed)
 *   student.getWeakSkills       — NOT_IMPLEMENTED (no weak-topics endpoint on the rebuilt backend — see tools/arena.ts)
 *
 * ADDED 2026-07-14: getCurrentRole is a thin wrapper that exposes logic/data
 * that already existed but wasn't independently callable — no new backend
 * endpoints, no duplicated calculations:
 *   - getCurrentRole reuses the same GET /api/pro/profile/:uid call as
 *     getProfile, then resolves role locally via resolveRoleFromProfile()
 *     (shared/registry.ts) — the same registry student.resolveRole uses.
 *
 * UPDATED 2026-09-01: getWeakSkills previously called
 * GET /api/arena/v2/weak-topics/:uid, the same endpoint
 * arena.recommendNextChallenge called internally. That endpoint was deleted
 * along with the rest of Arena V2 in commit c34d357 (2026-08-26) and has no
 * replacement on the rebuilt backend — getWeakSkills now fails fast with a
 * clear NOT_IMPLEMENTED error instead of an opaque 404 (same treatment as
 * tools/arena.ts, tools/elo.ts, tools/recruiter.ts in this same fix).
 *
 * Security: every tool verifies JWT → uid ownership → namespace permission.
 * Never exposes another student's profile unless user is recruiter/admin.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission, assertOwnership } from "../shared/permissions.js"
import { resolveRole, resolveRoleFromProfile } from "../shared/registry.js"
import { parse, AuthSchema, UidSchema, PaginationSchema, RoleHintSchema } from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

export function registerStudentTools(server: McpServer): void {

  // ── student.getProfile ─────────────────────────────────────────────────────
  server.tool(
    "student.getProfile",
    "Fetch the authenticated student's profile including skills, ELO, stream, and role.",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.getProfile", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      try {
        // Real route: GET /api/pro/profile/:uid (professionalProfile.js) —
        // there is no bare /api/profile endpoint. Self-fetch uses the JWT uid.
        const data = await api.get(authorization, `/api/pro/profile/${user.id}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg)
        throw e
      }
    }
  )

  // ── student.updateProfile ──────────────────────────────────────────────────
  server.tool(
    "student.updateProfile",
    "Update the authenticated student's profile fields (displayName, skills, career goal, etc.).",
    {
      authorization: z.string().describe("Bearer JWT"),
      updates: z.record(z.unknown()).describe(
        "Map of profile fields to update. Only whitelisted fields are applied by the backend."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        updates: z.record(z.unknown()).refine(
          (u) => Object.keys(u).length > 0,
          "updates must not be empty"
        ),
      })
      const { authorization, updates } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.updateProfile", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      try {
        // Real route: POST /api/pro/profile (professionalProfile.js) — it's an
        // upsert keyed off req.user.id from the JWT, not a PATCH on /api/profile.
        const data = await api.post(authorization, `/api/pro/profile`, updates)
        log.success(t, { fieldCount: Object.keys(updates).length })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg)
        throw e
      }
    }
  )

  // ── student.getOrbitStats ──────────────────────────────────────────────────
  server.tool(
    "student.getOrbitStats",
    "Get the student's Orbit radar chart data — skill dimension scores used for the Orbit dashboard.",
    {
      authorization: z.string().describe("Bearer JWT"),
    },
    async (args) => {
      const { authorization } = parse(AuthSchema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.getOrbitStats", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      // NOT_IMPLEMENTED: no backend route serves Orbit radar data today (no
      // /api/orbit/stats or equivalent exists anywhere in backend/server/routes).
      // Fail loudly and immediately rather than calling a path that will 404 —
      // the AI client should not be told "no data" when the real answer is
      // "this feature isn't wired up yet." Tracked as Group-B follow-up work.
      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for Orbit stats")
      throw new McpError(
        ErrorCode.MethodNotFound,
        "student.getOrbitStats has no backend implementation yet — Orbit radar data is not available via any existing API route. This is tracked as follow-up work, not a transient failure."
      )
    }
  )

  // ── student.getActivityFeed ────────────────────────────────────────────────
  server.tool(
    "student.getActivityFeed",
    "Get the student's recent activity timeline — Arena completions, skill completions, ELO changes, certifications.",
    {
      authorization: z.string().describe("Bearer JWT"),
      page:     z.number().int().min(1).default(1).optional(),
      pageSize: z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema)
      const { authorization, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.getActivityFeed", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      // NOT_IMPLEMENTED: no /api/activity route (or equivalent) exists in the
      // backend. Fail loudly rather than call a nonexistent endpoint.
      // Tracked as Group-B follow-up work.
      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for the activity feed", { page, pageSize })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "student.getActivityFeed has no backend implementation yet — there is no activity-timeline API route. This is tracked as follow-up work, not a transient failure."
      )
    }
  )

  // ── student.getPulseInsights ───────────────────────────────────────────────
  server.tool(
    "student.getPulseInsights",
    "Get AI-generated market pulse insights (trending skills, hiring trends, salary bands) for the student's role and stream.",
    {
      authorization: z.string().describe("Bearer JWT"),
      roleHint: RoleHintSchema,
    },
    async (args) => {
      const Schema = AuthSchema.extend({ roleHint: RoleHintSchema })
      const { authorization, roleHint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.getPulseInsights", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      try {
        // Real route: GET /api/pulse/market-insights (pulseNexus.js), reads
        // `domain`/`role` query params — there is no /api/pulse/insights path.
        const params = roleHint ? { domain: roleHint } : {}
        const data = await api.get(authorization, `/api/pulse/market-insights`, params)
        log.success(t, { roleHint })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg)
        throw e
      }
    }
  )

  // ── student.resolveRole ────────────────────────────────────────────────────
  server.tool(
    "student.resolveRole",
    "Resolve a role keyword, id, or slug into the full Capabilio RoleConfig (stream, categories, launchpad tags, Aura skills). Use before any role-dependent recommendation.",
    {
      authorization: z.string().describe("Bearer JWT"),
      hint: z.string().min(1).describe(
        "Role identifier: roleId (e.g. 'frontend'), keyword (e.g. 'Frontend Development'), or slug (e.g. 'it-software')"
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ hint: z.string().min(1) })
      const { authorization, hint } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.resolveRole", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      const config = resolveRole(hint)
      if (!config) {
        log.failure(t, "NOT_FOUND", `No role matched hint: ${hint}`)
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Role not found", hint }) }],
          isError: true,
        }
      }

      log.success(t, { resolvedId: config.id })
      return { content: [{ type: "text", text: JSON.stringify(config) }] }
    }
  )

  // ── student.getCurrentRole ─────────────────────────────────────────────────
  server.tool(
    "student.getCurrentRole",
    "Resolve the caller's current role directly from their profile — no role hint required. Thin wrapper: fetches the profile via the same route as student.getProfile, then resolves it locally with the same registry logic as student.resolveRole (resolveRoleFromProfile in shared/registry.ts). Recruiters/institution_admins/admins may pass targetUid to resolve a candidate's role instead of their own.",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid: UidSchema.optional().describe(
        "UID of another user to resolve. Only recruiters/institution_admins/admins may pass this."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ targetUid: UidSchema.optional() })
      const { authorization, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.getCurrentRole", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      const uid = targetUid ?? user.id
      // publicOk: the underlying /api/pro/profile/:uid route already strips
      // sensitive fields for non-owners — same privacy model as getProfile.
      assertOwnership(user, uid, /* publicOk */ true)

      try {
        const profile = await api.get<Record<string, unknown>>(authorization, `/api/pro/profile/${uid}`)
        const config = resolveRoleFromProfile(profile)
        log.success(t, { resolvedId: config.id })
        return { content: [{ type: "text", text: JSON.stringify(config) }] }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error"
        log.failure(t, "API_ERROR", msg)
        throw e
      }
    }
  )

  // ── student.getWeakSkills ──────────────────────────────────────────────────
  server.tool(
    "student.getWeakSkills",
    "NOT YET IMPLEMENTED — the weak-topics endpoint this tool depended on no longer exists on the rebuilt Arena backend (removed with Arena V2, no replacement — see tools/arena.ts). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid: UidSchema.optional().describe(
        "UID of another user to view. Only recruiters/institution_admins/admins may pass this."
      ),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ targetUid: UidSchema.optional() })
      const { authorization, targetUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("student.getWeakSkills", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "student")

      const uid = targetUid ?? user.id
      assertOwnership(user, uid, /* publicOk */ true)

      log.failure(t, "NOT_IMPLEMENTED", "No weak-topics endpoint exists on the rebuilt backend", { uid })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "student.getWeakSkills has no backend implementation yet — its backing endpoint was removed with Arena V2 and has no replacement. Tracked as follow-up work."
      )
    }
  )
}
