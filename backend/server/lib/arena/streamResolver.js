/**
 * arena/streamResolver.js — the ONLY source of truth for "what stream is
 * this student in" (spec §4, §5). Never accepts a stream from the request.
 *
 * profiles.stream_id (added 2026-09-05) is the authoritative link. It is
 * either already resolved (self-selected once, or backfilled from the
 * older `branch` field for an unambiguous match) or NULL. This module
 * never infers/guesses a stream from role, year, semester, keyword, or
 * any other profile field — those are explicitly out of scope per spec §4.
 */
import { supabaseAdmin } from "../supabase.js"

/**
 * @param {string} userId
 * @returns {Promise<{streamId: string, slug: string, name: string} | null>}
 */
export async function resolveAuthoritativeStream(userId) {
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles").select("stream_id").eq("id", userId).maybeSingle()
  if (profileErr) throw profileErr
  if (!profile?.stream_id) return null

  const { data: stream, error: streamErr } = await supabaseAdmin
    .from("streams").select("id, slug, name").eq("id", profile.stream_id).maybeSingle()
  if (streamErr) throw streamErr
  if (!stream) return null // dangling reference — treat as unresolved rather than throw

  return { streamId: stream.id, slug: stream.slug, name: stream.name }
}

/** Full canonical stream list, for the one-time self-service picker. */
export async function listStreams() {
  const { data, error } = await supabaseAdmin.from("streams").select("id, slug, name").order("name")
  if (error) throw error
  return data || []
}

/**
 * One-time self-service stream selection. Deliberately narrow: only sets
 * stream_id when it is currently NULL (first-time profile completion, the
 * same trust level as the original `branch` onboarding dropdown) — never a
 * per-request override, and never callable to silently reroute an already-
 * resolved student onto a different stream's Common Challenges.
 */
export async function setStreamIfUnset(userId, streamId) {
  const { data: stream, error: streamErr } = await supabaseAdmin
    .from("streams").select("id, slug, name").eq("id", streamId).maybeSingle()
  if (streamErr) throw streamErr
  if (!stream) return { ok: false, reason: "invalid_stream" }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("profiles").update({ stream_id: streamId }).eq("id", userId).is("stream_id", null).select("id")
  if (updateErr) throw updateErr
  if (!updated || updated.length === 0) return { ok: false, reason: "stream_already_set" }

  return { ok: true, stream: { streamId: stream.id, slug: stream.slug, name: stream.name } }
}
