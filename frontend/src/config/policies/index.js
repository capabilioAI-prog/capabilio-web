// ─── policies/index.js ────────────────────────────────────────────────────────
// Registry of every policy document, keyed by id. Adding a new policy is:
// write a new content file next to these (same shape — see privacyPolicy.js),
// import it here, add one line to POLICIES, and one card to
// SettingsPanel.jsx's PoliciesSection list. PolicyModal itself never changes.
import privacy from "./privacyPolicy"
import terms from "./termsOfService"
import cookies from "./cookiePolicy"
import dpdp from "./dpdpNotice"
import refund from "./refundPolicy"

export const POLICIES = { privacy, terms, cookies, dpdp, refund }
