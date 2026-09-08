/**
 * AboutPage.jsx — deliberately minimal. Only states facts already
 * established elsewhere in this codebase (hero copy, footer trust badges,
 * HQ location) — no invented founding story, no fabricated team bios.
 */
import { Rocket, Factory, ShieldCheck } from "lucide-react"
import { T } from "../../lib/osDesignTokens"
import MarketingNav from "../marketing/MarketingNav"
import MarketingFooter from "../marketing/MarketingFooter"
import { Eyebrow, PrimaryButton } from "../marketing/primitives"

function Fact({ icon: Icon, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px", border: `1px solid ${T.border}`, borderRadius: 12 }}>
      <Icon size={18} color={T.accent} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{label}</div>
        <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  )
}

export default function AboutPage({ onGetStarted, onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: T.surface, color: T.ink, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        .lp-container { max-width: 1120px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
      `}</style>

      <MarketingNav activePath="none" onGetStarted={onGetStarted} onLogin={onLogin} />

      <div className="lp-container" style={{ maxWidth: 720, padding: "64px 24px 32px" }}>
        <Eyebrow>About Capabilio</Eyebrow>
        <h1 style={{ fontSize: "clamp(30px,4vw,44px)", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 20px" }}>
          An AI Career Operating System.
        </h1>
        <p style={{ fontSize: 16, color: T.ink2, lineHeight: 1.7, marginBottom: 16 }}>
          Capabilio continuously builds, verifies, and showcases professional skills — for students, professionals,
          executives, and the colleges and companies that work with them. The core idea is simple: a skill claim
          should be backed by real, scored work, not a self-reported line on a resume.
        </p>
        <p style={{ fontSize: 16, color: T.ink2, lineHeight: 1.7, marginBottom: 40 }}>
          That shows up as ELO — a rating, like chess.com&apos;s, that only moves when you complete real, scored Arena
          tasks. It can&apos;t be typed in, and it can&apos;t be inflated.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
          <Fact icon={Rocket} label="DPIIT Recognised" sub="Registered under Startup India" />
          <Fact icon={Factory} label="Udyam Registered" sub="MSME, Government of India" />
          <Fact icon={ShieldCheck} label="MCA Incorporated" sub="Ministry of Corporate Affairs, headquartered in Amaravati, Andhra Pradesh" />
        </div>

        <PrimaryButton onClick={onGetStarted}>Get started</PrimaryButton>
      </div>

      <MarketingFooter />
    </div>
  )
}
