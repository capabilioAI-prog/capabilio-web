// arena/tokens.js — Arena's own design system. Deliberately its own
// palette (not inherited from Aura/StudentHome) but consistent with
// Capabilio's light, warm-neutral base — no dark-theme leftovers, no
// gradients-for-their-own-sake, no rainbow UI.
export const A = {
  ink: "#181822",
  ink2: "#46465266",
  inkSolid2: "#45455499",
  ink3: "#6B6B78",
  muted: "#8E8E9A",
  border: "#E7E4DD",
  borderStrong: "#D8D4CA",
  cream: "#FAF8F4",
  card: "#FFFFFF",
  paper: "#F5F3EE",

  indigo: "#4F46E5",
  indigo2: "#EEF0FF",
  indigoDeep: "#3730A3",
  emerald: "#059669",
  emerald2: "#ECFDF5",
  rose: "#DC2626",
  rose2: "#FEF2F2",
  amber: "#B45309",
  amber2: "#FFFBEB",
  gold: "#C08A1E",

  shadow: "0 1px 2px rgba(24,24,34,0.05), 0 6px 20px rgba(24,24,34,0.06)",
  shadowLift: "0 4px 10px rgba(24,24,34,0.07), 0 16px 32px rgba(24,24,34,0.10)",
  radius: 18,
  radiusSm: 12,

  font: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', 'SF Mono', Menlo, monospace",
}

export const DIFFICULTY_META = {
  easy:   { label: "Easy",   color: A.emerald, bg: A.emerald2 },
  medium: { label: "Medium", color: A.amber,   bg: A.amber2 },
}

export const WORKSTATION_LABEL = {
  coding: "Coding", sql: "SQL", structured_response: "Structured Response",
  calculation: "Calculation", decision: "Decision", log_investigation: "Log Investigation",
}

/**
 * Challenge-type visual "family" — a restrained, coordinated palette
 * (spec §12-13: subtle fields, not a rainbow; distinct-but-related motifs
 * per family, never decorative-for-no-reason). Each family gets:
 *   - a soft background field for cards in that family
 *   - an accent ink for icon/label/CTA-arrow
 *   - a short glyph (semantic, not illustrative) used as the family mark
 *   - a one-word motif name driving the workstation's visual signature
 */
export const CHALLENGE_FAMILY = {
  debugging:           { bg: "#EEF0FF", accent: "#4338CA", glyph: "◆", motif: "trace" },
  implementation:      { bg: "#EEF0FF", accent: "#4338CA", glyph: "◆", motif: "trace" },
  data_interpretation: { bg: "#EAF6F0", accent: "#0F766E", glyph: "▤", motif: "grid" },
  calculation:         { bg: "#EAF6F0", accent: "#0F766E", glyph: "▤", motif: "grid" },
  diagnosis:           { bg: "#FDF1E7", accent: "#B45309", glyph: "◎", motif: "signal" },
  investigation:       { bg: "#FDF1E7", accent: "#B45309", glyph: "◎", motif: "signal" },
  decision_making:     { bg: "#F3EEFB", accent: "#6D28D9", glyph: "◇", motif: "path" },
  design_choice:       { bg: "#F3EEFB", accent: "#6D28D9", glyph: "◇", motif: "path" },
  scenario_analysis:   { bg: "#FBEFF0", accent: "#BE123C", glyph: "▧", motif: "case" },
  case_analysis:       { bg: "#FBEFF0", accent: "#BE123C", glyph: "▧", motif: "case" },
  concept_application: { bg: "#EEF6FB", accent: "#0369A1", glyph: "○", motif: "concept" },
  simulation:          { bg: "#EEF6FB", accent: "#0369A1", glyph: "○", motif: "concept" },
}
export const DEFAULT_FAMILY = { bg: "#F3F2ED", accent: "#57534E", glyph: "•", motif: "concept" }

export function familyFor(challengeType) {
  return CHALLENGE_FAMILY[challengeType] || DEFAULT_FAMILY
}

/** Frames the raw `scenario` text as a stream-appropriate "report" —
 *  typographic framing only (spec §19); never invents structured fields
 *  the backend didn't provide. */
export const STREAM_REPORT_LABEL = {
  cse: "BUG REPORT", mca: "BUG REPORT", it: "INCIDENT LOG",
  ece: "DIAGNOSTIC LOG", eee: "DIAGNOSTIC LOG", "cyber-security": "INCIDENT LOG",
  mechanical: "INSPECTION NOTE", civil: "SITE REPORT",
  mba: "CASE BRIEF", "ai-ml": "LAB NOTE", "ai-ds": "LAB NOTE",
}
export function reportLabelFor(streamSlug) {
  return STREAM_REPORT_LABEL[streamSlug] || "MISSION BRIEF"
}
