/**
 * tools/vault.ts — Vault / Proof of Work domain (4 tools, 3 not yet implemented)
 *
 * Tools:
 *   vault.listArtifacts    — NOT_IMPLEMENTED (no matching backend shape — Group-B follow-up)
 *   vault.addArtifact      — NOT_IMPLEMENTED (no matching backend shape — Group-B follow-up)
 *   vault.updateArtifact   — NOT_IMPLEMENTED (no matching backend shape — Group-B follow-up)
 *   vault.deleteArtifact   — remove an artifact (student owns it)
 *
 * BACKEND WIRING NOTE (2026-07-14 fix): there is no /api/vault/artifacts JSON
 * CRUD backend. What exists instead: GET /api/pro/vault (careerTimeline.js,
 * self-only, no targetUid/type/pagination, returns raw vault_documents rows),
 * POST /api/pro/vault/upload (multipart file upload — doc_type/tags/is_private
 * /file, not a JSON artifact schema), and DELETE /api/pro/vault/:id (matches
 * this tool's deleteArtifact shape exactly — fixed below). listArtifacts/
 * addArtifact/updateArtifact are left as fail-fast NOT_IMPLEMENTED rather than
 * silently degraded to a different, incompatible endpoint shape — building a
 * real JSON-artifact CRUD backend (or teaching these tools the multipart
 * upload flow) is scoped as separate follow-up work.
 *
 * Security: students can only manage their own Vault entries.
 * Recruiters/admins may call listArtifacts for any uid (publicOk).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js"
import { verifyJWT, extractBearer } from "../shared/auth.js"
import { assertPermission, assertOwnership } from "../shared/permissions.js"
import {
  parse, AuthSchema, UidSchema, PaginationSchema, VaultArtifactTypeSchema,
} from "../shared/validation.js"
import { api } from "../shared/client.js"
import { createLogger, startTimer } from "../shared/logger.js"

const ArtifactInputSchema = z.object({
  title:       z.string().min(1).max(200),
  type:        VaultArtifactTypeSchema,
  url:         z.string().url("url must be a valid URL").optional(),
  description: z.string().max(2000).optional(),
  skills:      z.array(z.string().min(1)).max(20).optional(),
  dateAchieved: z.string().datetime({ offset: true }).optional(),
  isPublic:    z.boolean().default(true),
})

export function registerVaultTools(server: McpServer): void {

  // ── vault.listArtifacts ────────────────────────────────────────────────────
  server.tool(
    "vault.listArtifacts",
    "NOT YET IMPLEMENTED — there is no JSON artifact-listing backend matching this shape (targetUid/type/pagination). The closest real route, GET /api/pro/vault, is self-only with no filtering and returns a different row shape (vault_documents, not proof-of-work artifacts) — not wired here to avoid silently returning the wrong data model. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      targetUid:     UidSchema.optional().describe("UID of candidate to view (recruiters/admins only)"),
      type:          VaultArtifactTypeSchema.optional(),
      page:          z.number().int().min(1).default(1).optional(),
      pageSize:      z.number().int().min(1).max(50).default(20).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(PaginationSchema).extend({
        targetUid: UidSchema.optional(),
        type:      VaultArtifactTypeSchema.optional(),
      })
      const { authorization, targetUid, type, page, pageSize } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("vault.listArtifacts", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "vault")

      // public-flagged artifacts may be read by recruiters / admins
      const uid = targetUid ?? user.id
      assertOwnership(user, uid, /* publicOk */ true)

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for JSON artifact listing", { type, page, pageSize })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "vault.listArtifacts has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── vault.addArtifact ──────────────────────────────────────────────────────
  server.tool(
    "vault.addArtifact",
    "NOT YET IMPLEMENTED — there is no JSON artifact-creation backend matching this shape. The closest real route, POST /api/pro/vault/upload, is a multipart file upload with a different field set (doc_type/tags/is_private/file) — not wired here to avoid silently mismatching the request shape. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      title:         z.string().min(1).max(200),
      type:          VaultArtifactTypeSchema,
      url:           z.string().url().optional(),
      description:   z.string().max(2000).optional(),
      skills:        z.array(z.string().min(1)).max(20).optional(),
      dateAchieved:  z.string().datetime({ offset: true }).optional(),
      isPublic:      z.boolean().default(true).optional(),
    },
    async (args) => {
      const Schema = AuthSchema.merge(ArtifactInputSchema)
      const { authorization, ...artifact } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("vault.addArtifact", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "vault")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for JSON artifact creation", { type: artifact.type })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "vault.addArtifact has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── vault.updateArtifact ───────────────────────────────────────────────────
  server.tool(
    "vault.updateArtifact",
    "NOT YET IMPLEMENTED — there is no PUT/PATCH endpoint for either vault_documents or proof_artifacts anywhere in the backend. Tracked as follow-up work.",
    {
      authorization: z.string().describe("Bearer JWT"),
      artifactId:    z.string().uuid("artifactId must be a UUID"),
      title:         z.string().min(1).max(200).optional(),
      type:          VaultArtifactTypeSchema.optional(),
      url:           z.string().url().optional(),
      description:   z.string().max(2000).optional(),
      skills:        z.array(z.string().min(1)).max(20).optional(),
      dateAchieved:  z.string().datetime({ offset: true }).optional(),
      isPublic:      z.boolean().optional(),
    },
    async (args) => {
      const Schema = AuthSchema.extend({
        artifactId:   z.string().uuid(),
        title:        z.string().min(1).max(200).optional(),
        type:         VaultArtifactTypeSchema.optional(),
        url:          z.string().url().optional(),
        description:  z.string().max(2000).optional(),
        skills:       z.array(z.string().min(1)).max(20).optional(),
        dateAchieved: z.string().datetime({ offset: true }).optional(),
        isPublic:     z.boolean().optional(),
      })
      const { authorization, artifactId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("vault.updateArtifact", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "vault")

      log.failure(t, "NOT_IMPLEMENTED", "No backend endpoint exists for artifact updates", { artifactId })
      throw new McpError(
        ErrorCode.MethodNotFound,
        "vault.updateArtifact has no backend implementation yet. Tracked as follow-up work."
      )
    }
  )

  // ── vault.deleteArtifact ───────────────────────────────────────────────────
  server.tool(
    "vault.deleteArtifact",
    "Delete a Vault artifact. Only the owner may delete their own artifacts.",
    {
      authorization: z.string().describe("Bearer JWT"),
      artifactId:    z.string().uuid("artifactId must be a UUID"),
    },
    async (args) => {
      const Schema = AuthSchema.extend({ artifactId: z.string().uuid() })
      const { authorization, artifactId } = parse(Schema, args)
      const user = verifyJWT(extractBearer(authorization))
      const log  = createLogger("vault.deleteArtifact", user.id, user.role)
      const t    = startTimer()
      assertPermission(user, "vault")

      try {
        // Real route: DELETE /api/pro/vault/:id (careerTimeline.js, requireAuth,
        // ownership-checked server-side). Matches this tool's shape exactly.
        const data = await api.delete(authorization, `/api/pro/vault/${artifactId}`)
        log.success(t)
        return { content: [{ type: "text", text: JSON.stringify(data) }] }
      } catch (e: unknown) {
        log.failure(t, "API_ERROR", e instanceof Error ? e.message : "Unknown")
        throw e
      }
    }
  )
}
