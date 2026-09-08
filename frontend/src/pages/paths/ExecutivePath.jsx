import { Sparkles } from "lucide-react"
import { T } from "../../lib/osDesignTokens"
import { PATH_COLORS, selectPath } from "../../lib/pathIdentity"
import { getPlansByPath } from "../../config/plans"
import MarketingNav from "../marketing/MarketingNav"
import MarketingFooter from "../marketing/MarketingFooter"
import { PathHero, PathFeatureList, PathPricing } from "../marketing/PathPageSections"

const COLOR = PATH_COLORS.executive

const FEATURES = [
  "Invite-only — every profile is identity-verified before it goes live",
  "Signal Room — host up to 500 participants under your name",
  "AI ghostwriter for LinkedIn posts, in your voice",
  "Personal brand analytics dashboard, not vanity follower counts",
  "Market analysis reports on demand",
  "Time marketplace — sell your time, verified by Capabilio",
]

export default function ExecutivePath({ onGetStarted, onLogin }) {
  const handleGetStarted = () => {
    selectPath("executive")
    if (typeof onGetStarted === "function") onGetStarted({ path: "executive", source: "path-page" })
  }
  // config/plans.js's PLANS_BY_PATH key for this path is "authority", not
  // "executive" — the auth-flow vocabulary (selectPath above, AuthModal's
  // selectedPath checks) and the pricing-data vocabulary differ; this is
  // the one place that mapping has to happen explicitly.
  const plans = getPlansByPath("authority")

  return (
    <div style={{ minHeight: "100vh", background: T.surface, color: T.ink, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        .lp-container { max-width: 1120px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
        .lp-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }
        .lp-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
        @media (max-width: 960px) { .lp-hero-grid, .lp-grid-2, .lp-grid-3 { grid-template-columns: 1fr; } }
      `}</style>

      <MarketingNav activePath="executive" onGetStarted={handleGetStarted} onLogin={onLogin} />

      <PathHero
        icon={Sparkles} color={COLOR} title="Executive"
        headline="An authority profile, verified by Capabilio."
        subhead="Invite-only. Apply and our team verifies your profile within 48 hours — then sell your time and expertise through a profile nobody can fake their way into."
        onGetStarted={handleGetStarted}
        persona={{ name: "Devika Shah", role: "Executive · Founder", pathKey: "executive" }}
      />

      <PathFeatureList eyebrow="What you get" title="Verified authority, not another LinkedIn profile." points={FEATURES} color={COLOR} />

      <PathPricing
        plans={plans}
        color={COLOR}
        ctaLabel={(plan) => `Apply for ${plan.label}`}
        onSelectPlan={handleGetStarted}
        footnote="Executive access is invite-only — applying starts identity verification, which typically completes within 48 hours."
      />

      <MarketingFooter />
    </div>
  )
}
