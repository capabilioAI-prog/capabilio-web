/**
 * featureFlags.js — Career OS rollout flags (Workstream 0)
 *
 * Every new Career OS surface ships behind a flag so it can be turned off
 * instantly (no destructive DB rollback, no redeploy) if it regresses
 * something live. Flags read from Vite env vars first (so ops can flip them
 * per-environment without a code change), falling back to the default below.
 *
 * To disable a flag in an environment, set the matching env var to "false"
 * in Vercel/`.env` — e.g. VITE_FF_CAREER_OS_COMPANY=false.
 *
 * See docs/career-os-implementation-plan.md for what each flag gates and
 * which workstream turns it on for the first time.
 */

function envFlag(name, fallback) {
  const raw = import.meta.env[`VITE_FF_${name}`]
  if (raw === undefined || raw === "") return fallback
  return raw === "true" || raw === "1"
}

// Defaults reflect actual implementation status as of this workstream.
// Flip a default to true only in the same PR that finishes its workstream.
export const FLAGS = {
  // Workstream 0 — nav split (Career + Skills back to top-level, local tab
  // state fix). Real, implemented, on by default.
  career_os_nav: envFlag("CAREER_OS_NAV", true),

  // Workstream 1 — Home command-center sections. Today's Priority (server-
  // computed, GET /pro/v1/home/priority) ships real this workstream; the
  // remaining Home sections (Promotion Readiness, Salary Position, Company
  // Status, Mentor Area) depend on Workstream 2/4/5 tables and are not yet
  // gated by this flag individually — they'll get their own checks as they
  // land, same pattern as Today's Priority.
  career_os_home: envFlag("CAREER_OS_HOME", true),

  // Workstream 5 — Company module. Off until real company-link data model +
  // routes exist; keeps the nav item hidden rather than shipping a dead page.
  career_os_company: envFlag("CAREER_OS_COMPANY", false),

  // Workstream 6 — Anonymous company reviews. Off until the k-anonymity
  // aggregate views and eligibility jobs are built and tested.
  career_os_company_reviews: envFlag("CAREER_OS_COMPANY_REVIEWS", false),

  // Workstream 4 — Mentor marketplace. Off until mentor_profiles/bookings/
  // payouts tables + Razorpay Route payout flow are built (current
  // mentorHub.js references these tables but they don't exist yet in
  // Supabase — see audit in docs/career-os-implementation-plan.md).
  career_os_mentor_marketplace: envFlag("CAREER_OS_MENTOR_MARKETPLACE", false),

  // Workstream 2 (Career Replay) — premium visual career timeline. Off until built.
  career_os_career_replay: envFlag("CAREER_OS_CAREER_REPLAY", false),

  // Workstream 3 — Weekly Skill Pulse V2 (15 questions, reviewed question
  // bank). Off until the question_bank table has approved coverage; current
  // 5-question weeklyPulse.js keeps running unaffected either way.
  career_os_skill_pulse_v2: envFlag("CAREER_OS_SKILL_PULSE_V2", false),

  // Workstream 4 — Mentor Marketplace v1 (real implementation: reservation
  // model, idempotency, Razorpay webhook, reconciliation, admin-triggered
  // payout batches). Schema + RLS + RPCs are applied in production, but this
  // flag stays OFF until all 9 release gates in
  // docs/mentor-marketplace-ws4-design-proposal.md (v2) §9 are cleared —
  // several are only unit-tested in-sandbox, not live/integration-verified
  // (no real Razorpay Test Mode account here). See
  // docs/career-os-implementation-plan.md for the honest per-gate status.
  // Mirrors the same VITE_FF_<NAME> override convention as every flag above.
  // (career_os_mentor_marketplace above predates this workstream and stays
  // as-is; mentor_marketplace_v1 is the flag this workstream's routes and
  // backend actually check.)
  mentor_marketplace_v1: envFlag("MENTOR_MARKETPLACE_V1", false),

  // Professional ELO — product decision 2026-07-25: professional users get a
  // visible, real, assessment-performance-driven ELO (separate track from
  // the older profile-completeness-driven ELO fields — see
  // backend/server/lib/professionalElo/eloEngine.js). Backend is real and
  // tested; off by default here for the same reason every other Career OS
  // surface in this codebase ships flag-off first — a live number newly
  // shown to real users should be turned on deliberately, not by default.
  career_os_professional_elo: envFlag("CAREER_OS_PROFESSIONAL_ELO", false),

  // Skill Studio V2 (2026-07-29) — skill-journey redesign: persisted module
  // runtime, memory/decay engine, Arena readiness gate, interview bridge,
  // recruiter evidence trail (docs/skill-studio-v2-production-spec-2026-07-29.md).
  // Backend + migration are real and live (17 new tables, RLS-verified via
  // Supabase advisors). Off by default per the same "new surface ships
  // flag-off first" convention as every other flag here — the legacy
  // pages/SkillStudio.jsx heuristic experience keeps running unaffected
  // either way, and stays the instant rollback path if V2 needs to be
  // turned back off after launch.
  skill_studio_v2: envFlag("SKILL_STUDIO_V2", false),

  // Skill Studio Phase 2a (2026-07-30) — narrated visual walkthrough ("Watch"
  // tab): real Deepgram Aura-2 TTS narration synced to the existing
  // diagram_spec animation, cached per module (see module_narration /
  // narrationEngine.js). Deliberately a SEPARATE flag from skill_studio_v2
  // (not nested under it) so narration can be rolled back independently if
  // TTS/storage misbehaves, without having to disable all of Skill Studio V2.
  // Still requires skill_studio_v2 to be on too — narration only renders
  // inside ModuleRuntime, which only exists when V2 is enabled. Off by
  // default per the same "new surface ships flag-off first" convention.
  skill_studio_video: envFlag("SKILL_STUDIO_VIDEO", false),

  // Site-wide maintenance gate (2026-08-16) — when on, main.jsx renders only
  // MaintenancePage.jsx and never mounts <App/> at all, so no route, auth
  // check, or page-level effect runs underneath it. Off by default; flip via
  // VITE_FF_MAINTENANCE_MODE=true in Vercel env vars for the deployment you
  // want gated, then redeploy. Set back to false (or unset) and redeploy to
  // reopen the site — no code change needed either way.
  maintenance_mode: envFlag("MAINTENANCE_MODE", false),
  // Site-wide "heads up" deploy banner (2026-08-26) — a thin, dismissible
  // bar rendered above the whole app (see components/MaintenanceBanner.jsx).
  // Deliberately a separate, unrelated mechanism from the full-page
  // maintenance-mode takeover flag (main.jsx/MaintenancePage.jsx, landing
  // in a different branch) — this one never blocks the app, the site stays
  // fully usable underneath it. Off by default; flip via
  // VITE_FF_MAINTENANCE_BANNER=true in Vercel env vars + redeploy for the
  // deployment you want it on, no code change either way.
  maintenance_banner: envFlag("MAINTENANCE_BANNER", false),
}

// Plain string override for the banner's copy — kept outside FLAGS since
// envFlag() above only handles true/false toggles. Empty string means "use
// MaintenanceBanner.jsx's own default wording". Set
// VITE_MAINTENANCE_BANNER_MESSAGE in Vercel env vars + redeploy to change
// the message without a code change.
export const MAINTENANCE_BANNER_MESSAGE = import.meta.env.VITE_MAINTENANCE_BANNER_MESSAGE || ""

export function isEnabled(flag) {
  return !!FLAGS[flag]
}
