/**
 * pageRoutes.js — currentPage <-> real URL path mapping
 *
 * capabilio-web's authenticated app has historically run on a single
 * in-memory `currentPage` state (App.jsx) instead of real routes — every
 * page (Aura, Pulse, Skill Studio, 49+ others) lived at the same
 * URL, so nothing was bookmarkable/shareable and the browser back/forward
 * buttons didn't work, unlike capabilio-recruiter (react-router-dom,
 * real paths like /recruiter/applications).
 *
 * This module is the single source of truth for every currentPage value
 * that exists (collected via `grep -n "currentPage ===" App.jsx`, the
 * institution-org `.includes(currentPage)` array, and HOME_PAGE's values)
 * and its real URL path, generated deterministically (camelCase -> kebab
 * case) so the two directions are always exact inverses of each other.
 *
 * Deliberately excludes "portfolio": that value is only ever set as a
 * side-channel flag (App.jsx, `if (pathname.startsWith("/portfolio/"))
 * setCurrentPage("portfolio")`) and is never actually rendered from a
 * `currentPage === "portfolio"` block — the real portfolio route is the
 * existing dynamic /portfolio/:username early-return in App.jsx, which
 * this module does not touch or duplicate.
 */

// Canonical list of every real currentPage value that drives a render
// block in App.jsx. Add new pages here — the path is derived, not manual,
// so there's no separate list to keep in sync.
export const PAGE_KEYS = [
  "aicopilot", "analytics",
  "aura", "authority", "candidateSearch", "communities",
  // Old Arena (College Stream, Domain Role, capability engine) retired
  // 2026-09-05 — no currentPage render block exists for any Arena key
  // any more. "arenaV2*" (17 keys, arena-v2 removal 2026-08-26), plain
  // "arena", "arenaCollegeStream", and "challenges" (Arena-backed render
  // removed 2026-08-16 along with Arena) all removed together here for the
  // same reason: none resolve to a render block, so keeping them would
  // just mean a silent blank panel on navigation. New Arena/Challenge
  // system gets its own key(s) here once it's rebuilt.
  "aura", "authority", "candidateSearch", "communities",
  "company", "events", "execnetwork", "executiveHome", "executivefeed",
  "forge", "funding", "growth", "jobPostings", "launchpad", "marketplace",
  "myTasks", "nexus", "orbit",
  "orgCohorts", "orgCommunity", "orgEvents", "orgGroups", "orgHome",
  "orgIntel", "orgOpportunities", "orgOutcomes", "orgPeople", "orgSettings",
  "orgTasks",
  "pipeline", "pricing", "professionalHome", "pulse", "recruiterHome",
  "signalrooms", "skills", "skillstudio", "startupworkspace",
  "studentCollege", "studentHome", "timemarket", "weeklycheck",
]

function toPath(key) {
  return (
    "/" +
    key
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
      .toLowerCase()
  )
}

export const PAGE_TO_PATH = Object.fromEntries(PAGE_KEYS.map((k) => [k, toPath(k)]))
export const PATH_TO_PAGE = Object.fromEntries(PAGE_KEYS.map((k) => [toPath(k), k]))

// Paths that already have their own real, dynamic-parameter routing
// (handled by early-return checks in App.jsx before the currentPage
// system ever runs) — the URL-sync logic must never touch these.
const RESERVED_PATH_PREFIXES = [
  "/portfolio/",
  "/join/",
  "/join-org/",
  "/company-invite/",
  "/attest/",
]
const RESERVED_EXACT_PATHS = new Set([
  "/career",
  "/admin/question-bank",
  "/admin/ops-dashboard",
  "/admin/skill-studio-content",
])

export function isReservedPath(pathname) {
  if (RESERVED_EXACT_PATHS.has(pathname)) return true
  return RESERVED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
