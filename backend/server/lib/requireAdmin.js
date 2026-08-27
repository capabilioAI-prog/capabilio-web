/**
 * requireAdmin.js — Milestone 2
 * ---------------------------------------------------------------------------
 * The codebase has no admin/role model at all today (checked: no is_admin
 * column, no requireAdmin/requireRole helper anywhere in server/). Content
 * authoring (Milestone 2 CRUD) needs *some* write gate stronger than "any
 * logged-in user," so this adds the smallest thing that closes that gap: a
 * boolean `profiles.is_admin` column (additive/backward-compatible, defaults
 * false) and a middleware that checks it. This is plumbing, not a full
 * roles/permissions redesign (content-author vs. full-admin, etc) — that
 * remains future work if the platform ever needs finer-grained roles.
 * Originally added for Arena V2's content-authoring milestone (since
 * removed); this middleware outlived that system and is now the general
 * admin gate for mentorMarketplaceAdmin.js, skillStudioContentAdmin.js,
 * questionBankAdmin.js, and opsDashboard.js.
 *
 * Must run after requireAuth (reads req.user.id).
 */
import { supabaseAdmin } from "./supabase.js"

export async function requireAdmin(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" })

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", req.user.id)
      .maybeSingle()

    if (error) throw error
    if (!data?.is_admin) return res.status(403).json({ error: "Admin access required" })

    next()
  } catch (err) {
    res.status(500).json({ error: "Admin check failed", detail: err.message })
  }
}
