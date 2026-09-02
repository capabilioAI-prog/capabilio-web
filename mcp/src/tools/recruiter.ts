/**
 * tools/recruiter.ts — Recruiter / Nexus domain (3 working tools, 2 not yet implemented)
 *
 * Tools:
 *   recruiter.searchCandidates   — search students by name/role/domain
 *   recruiter.getCandidateProfile — full public profile of a candidate
 *   recruiter.getCandidateElo    — NOT_IMPLEMENTED (no per-uid ELO read endpoint — see tools/elo.ts)
 *   recruiter.getCandidateVault  — NOT_IMPLEMENTED (no recruiter-proof read endpoint on the rebuilt backend)
 *   recruiter.sendNexusRequest   — send a connection request via Nexus
 *
 * BACKEND WIRING NOTE (2026-07-14 fix, updated 2026-09-01): searchCandidates's
 * path/verb were already correct (/api/nexus/search) but the backend only
 * reads q/role/domain/page/limit — it does NOT support skills-array,
 * ELO-range, or location filtering. getCandidateProfile/sendNexusRequest were
 * corrected to /api/nexus/profile/:uid and /api/nexus/connect respectively —
 * both still live and unaffected by this update.
 *
 * getCandidateElo (was /api/arena/v2/elo/:uid) and getCandidateVault (was
 * /api/arena/v2/recruiter/proof/:uid) both depended on Arena V2 endpoints
 * deleted in commit c34d357 (2026-08-26). The rebuilt Arena backend has no
 * per-uid ELO read endpoint (see tools/elo.ts) and no recruiter-facing proof
 * endpoint at all — both now fail fast with a clear NOT_IMPLEMENTED error
 * instead of a raw backend 404. Building real replacements is backend work,
 * out of scope for this fix.
 *
 * Security: ALL tools in this file require role=recruiter or admin.
 * Students cannot call these tools. Data returned is scoped to the
 * student's PUBLIC-flagged information only — enforced by the backend.
 *
 * PRIVACY: We never return another student's private data (email, phone,
 * address, raw assessment scores). The backend enforces this via RLS.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { verifyJWT, extractBearer, type CapabilioUser } from "../shared/auth.js"
import { assertPermission, canViewCandidates } from "../shared/permissions.js"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import {
  parse, AuthSchema, UidSchema, PaginationSchema, CandidateSearchSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

// Fixed 2026-07-14: was a narrowed { id, role } fake of CapabilioUser, which
// broke `tsc`/`npm run build` at every call site (a full CapabilioUser was
// always what's actually passed in, and forwarded to canViewCandidates()
// which requires the full type). Widened to the real shared type — no
// behavior change, purely a type-annotation fix.
function assertRecruiter(user: CapabilioUser): void {
  if (!canViewCandidates(user)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "Only recruiters and institution admins may access candidate data"
    )
  }
}

export function registerRecruiterTools(server: McpServer): void {

  // ── recruiter.searchCandidates ─────────────────────────────────────────────
  server.tool(
    "recruiter.searchCandidates",
    "Search student candidates by free-text query and role/domain. Returns public profile summaries. Requires recruiter or institution_admin role. NOTE: the backend does not support ELO-range, location, or multi-skill filtering today — minElo/maxElo/location are accepted for forward-compat but ignored; skills are folded into the free-text query as a best effort.",
    {
      authorization: z.string().describe("Bearer JWT"),
      skills:        z.array(z.string().min(1)).min(1).max(10).describe("Required skills"),
      stream:        z.string().optional().describe("e.g. 'IT', 'ECE', 'Mechanical'"),
      minElo:        z.number().int().min(0).max(3000).optional(),
      maxElo:        z.number().int().min(0).max(3000).optional(),
      location:      z.string().max(100).optional(),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(CandidateSearchSchema)
      const { authorization, ...searchParams } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.searchCandidates", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      if (searchParams.minElo || searchParams.maxElo || searchParams.location) {
        log.warn("minElo/maxElo/location requested but not supported by backend — ignoring")
      }

      try {
        // Real route reads q/role/domain/page/limit — no skills array, no
        // ELO range, no location filter server-side.
        const data = await api.get(authorization, `/api/nexus/search`, {
          q: searchParams.skills.join(" "),
          domain: searchParams.stream,
          page: searchParams.page,
          limit: searchParams.pageSize,
        })
        log.success(t, { stream: searchParams.stream })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── recruiter.getCandidateProfile ──────────────────────────────────────────
  server.tool(
    "recruiter.getCandidateProfile",
    "Get a candidate's full public profile — role, stream, skills, ELO rank, top achievements. Private fields are excluded.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ candidateUid: UidSchema })
      const { authorization, candidateUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.getCandidateProfile", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      try {
        const data = await api.get(authorization, `/api/nexus/profile/${candidateUid}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )

  // ── recruiter.getCandidateElo ──────────────────────────────────────────────
  server.tool(
    "recruiter.getCandidateElo",
    "NOT YET IMPLEMENTED — there is no per-uid ELO read endpoint on the rebuilt Arena backend (ELO is a flat profiles.elo_rating column with no dedicated read/rank/breakdown route — same gap as tools/elo.ts). Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ candidateUid: UidSchema })
      const { authorization, candidateUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.getCandidateElo", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      log.failure(t, "NOT_IMPLEMENTED", "No per-uid ELO read endpoint exists on the rebuilt backend", { candidateUid })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "recruiter.getCandidateElo has no backend implementation yet — ELO is a flat profiles.elo_rating column with no dedicated read endpoint on the rebuilt backend. Tracked as follow-up work."
      )
    }
  )

  // ── recruiter.getCandidateVault ────────────────────────────────────────────
  server.tool(
    "recruiter.getCandidateVault",
    "NOT YET IMPLEMENTED — the recruiter-facing proof-artifacts endpoint this tool depended on no longer exists on the rebuilt backend. recruiter.getCandidateProfile may include some public achievement data as a partial substitute. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(30).default(10).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({ candidateUid: UidSchema })
      const { authorization, candidateUid } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.getCandidateVault", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      log.failure(t, "NOT_IMPLEMENTED", "No recruiter-facing proof-artifacts endpoint exists on the rebuilt backend", { candidateUid })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "recruiter.getCandidateVault has no backend implementation yet — its backing endpoint was removed with Arena V2 and has no replacement. Tracked as follow-up work."
      )
    }
  )

  // ── recruiter.sendNexusRequest ─────────────────────────────────────────────
  server.tool(
    "recruiter.sendNexusRequest",
    "Send a Nexus connection request to a candidate. The student receives it in their Nexus inbox. NOTE: the backend only supports a single generic connection type today — 'opportunity'/'internship' are accepted for forward-compat but sent as a plain connection request.",
    {
      authorization: z.string().describe("Bearer JWT"),
      candidateUid:  UidSchema.describe("UID of the student candidate"),
      message:       z.string().min(20).max(1000).describe("Personalised message to the candidate"),
      type:          z.enum(["connection", "opportunity", "internship"]).default("connection"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        candidateUid: UidSchema,
        message:      z.string().min(20).max(1000),
        type:         z.enum(["connection", "opportunity", "internship"]).default("connection"),
      })
      const { authorization, candidateUid, message, type } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("recruiter.sendNexusRequest", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "recruiter")
      assertRecruiter(user)

      if (type !== "connection") {
        log.warn("connection type requested but backend only supports generic connections — sending as plain connection", { type })
      }

      try {
        // Real route: POST /api/nexus/connect — reads addressee_id/message only.
        const data = await api.post(authorization, `/api/nexus/connect`, {
          addressee_id: candidateUid, message,
        })
        log.success(t, { type })
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )
}
