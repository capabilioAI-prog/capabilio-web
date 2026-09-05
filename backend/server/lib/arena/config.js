/**
 * arena/config.js — single source of truth for Arena-wide settings that
 * would otherwise get scattered/hard-coded across the codebase (spec §6, §7).
 *
 * ARENA_TIMEZONE: no app-wide timezone setting existed anywhere in this
 * codebase (checked before writing this). One env-configurable constant,
 * defaulting to Asia/Kolkata (this product's install base), used
 * exclusively by week.js — never assume the browser's clock.
 */
import { supabaseAdmin } from "../supabase.js"

export const ARENA_TIMEZONE = process.env.ARENA_TIMEZONE || "Asia/Kolkata"

const DEFAULT_WHEEL_OUTCOMES = [5, 7, 9]

/** Reads arena_config.wheel_outcomes (service-role only — no client RLS
 *  grant on this table, see the 2026-09-05 migration). Falls back to the
 *  hard-coded default only if the row is missing/malformed, never throws. */
export async function getWheelOutcomes() {
  try {
    const { data, error } = await supabaseAdmin
      .from("arena_config").select("value").eq("key", "wheel_outcomes").maybeSingle()
    if (error) throw error
    const outcomes = Array.isArray(data?.value) ? data.value.filter((n) => Number.isInteger(n) && n > 0) : null
    return outcomes && outcomes.length > 0 ? outcomes : DEFAULT_WHEEL_OUTCOMES
  } catch {
    return DEFAULT_WHEEL_OUTCOMES
  }
}
