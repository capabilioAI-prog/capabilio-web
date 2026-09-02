// ─── policies/blocks.js ───────────────────────────────────────────────────────
// Tiny content-block renderer shared by every policy document and by
// PolicyModal.jsx. Keeping this separate from the modal means a policy
// content file (privacyPolicy.js, termsOfService.js, ...) never touches
// JSX — it's plain data — and the modal never touches policy wording.
//
// A section's `body` is an array of blocks. Each block is either a plain
// string (a paragraph) or a small tagged object:
//   { list: ["item", "item"] }        — bullet list
//   { orderedList: ["item", "item"] } — numbered list
//   { sub: "text" }                   — bolded lead-in line (mini heading)
//   { note: "text", tone: "info" }    — callout box; tone: "info" | "warning" | "placeholder"
import { createElement as h } from "react"

export function formatPolicyDate(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    })
  } catch {
    return iso
  }
}

const NOTE_TONES = {
  info:        { bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.25)",  color: "#4338CA" },
  warning:     { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.30)",  color: "#92400E" },
  placeholder: { bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.30)",   color: "#9F1239" },
}

const pStyle = { fontSize: 13.5, color: "#475569", lineHeight: 1.7, margin: "0 0 10px" }
const listStyle = { fontSize: 13.5, color: "#475569", lineHeight: 1.7, margin: "0 0 10px", paddingLeft: 20 }
const subStyle = { fontSize: 13.5, fontWeight: 700, color: "#1A1714", margin: "12px 0 6px" }

export function renderBlock(block, key) {
  if (typeof block === "string") {
    return h("p", { key, style: pStyle }, block)
  }
  if (block.list) {
    return h("ul", { key, style: listStyle }, block.list.map((item, i) => h("li", { key: i, style: { marginBottom: 4 } }, item)))
  }
  if (block.orderedList) {
    return h("ol", { key, style: listStyle }, block.orderedList.map((item, i) => h("li", { key: i, style: { marginBottom: 4 } }, item)))
  }
  if (block.sub) {
    return h("div", { key, style: subStyle }, block.sub)
  }
  if (block.note) {
    const tone = NOTE_TONES[block.tone || "info"]
    return h("div", {
      key,
      style: {
        background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color,
        borderRadius: 10, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.6,
        margin: "10px 0", fontWeight: block.tone === "placeholder" ? 700 : 500,
      },
    }, (block.tone === "placeholder" ? "⚠ " : "") + block.note)
  }
  return null
}
