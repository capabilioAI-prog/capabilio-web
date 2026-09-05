// arena/tokens.js — small, self-contained style tokens for the new Arena.
// Deliberately its own palette (not inherited from Aura/StudentHome) but
// consistent with Capabilio's light, warm-neutral base — no dark-theme
// leftovers, no gradients-for-their-own-sake.
export const A = {
  ink: "#1A1A24",
  ink2: "#4A4A57",
  ink3: "#6B6B78",
  muted: "#8A8A96",
  border: "#E4E2DD",
  cream: "#FAF9F6",
  card: "#FFFFFF",
  indigo: "#4F46E5",
  indigo2: "#EEF0FF",
  emerald: "#059669",
  emerald2: "#ECFDF5",
  rose: "#DC2626",
  rose2: "#FEF2F2",
  amber: "#D97706",
  amber2: "#FFFBEB",
  shadow: "0 1px 2px rgba(20,20,30,0.04), 0 4px 16px rgba(20,20,30,0.06)",
  radius: 16,
}

export const DIFFICULTY_COLOR = { easy: A.emerald, medium: A.amber }

export const WORKSTATION_LABEL = {
  coding: "Coding", sql: "SQL", structured_response: "Structured Response",
  calculation: "Calculation", decision: "Decision", log_investigation: "Log Investigation",
}
