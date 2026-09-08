/**
 * LegalPageShell.jsx — shared layout for PrivacyPolicy.jsx and
 * TermsOfService.jsx. Both are template documents (see the banner this
 * shell renders) written so the footer's Legal links go somewhere real
 * rather than nowhere — not a substitute for actual legal review. Content
 * only references data-handling touchpoints that genuinely exist in this
 * codebase (Supabase auth/storage, Razorpay payments, LinkedIn/resume
 * extraction during onboarding, UAN/EPFO verification for professionals),
 * nothing invented.
 */
import { T } from "../../lib/osDesignTokens"
import { AlertTriangle } from "lucide-react"
import MarketingNav from "../marketing/MarketingNav"
import MarketingFooter from "../marketing/MarketingFooter"

export default function LegalPageShell({ title, updated, sections, onGetStarted, onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: T.surface, color: T.ink, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        .lp-container { max-width: 1120px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
      `}</style>

      <MarketingNav activePath="none" onGetStarted={onGetStarted} onLogin={onLogin} />

      <div className="lp-container" style={{ maxWidth: 760, padding: "56px 24px 80px" }}>
        <h1 style={{ fontSize: "clamp(28px,3.6vw,38px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 8px" }}>{title}</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginBottom: 28 }}>Last updated {updated}</p>

        <div style={{ display: "flex", gap: 10, padding: "14px 16px", background: T.warningDim, border: `1px solid ${T.warning}40`, borderRadius: 12, marginBottom: 36 }}>
          <AlertTriangle size={18} color={T.warning} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: 0 }}>
            This is a template document, not a substitute for legal advice. It hasn&apos;t been reviewed by a lawyer —
            replace it with counsel-reviewed terms before relying on it for compliance.
          </p>
        </div>

        {sections.map((s) => (
          <div key={s.heading} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 10 }}>{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} style={{ fontSize: 14, color: T.ink2, lineHeight: 1.7, margin: "0 0 10px" }}>{p}</p>
            ))}
          </div>
        ))}
      </div>

      <MarketingFooter />
    </div>
  )
}
