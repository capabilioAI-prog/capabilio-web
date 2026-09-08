import { Briefcase } from "lucide-react"
import { T } from "../../lib/osDesignTokens"
import { PATH_COLORS, selectPath } from "../../lib/pathIdentity"
import { getPlansByPath } from "../../config/plans"
import MarketingNav from "../marketing/MarketingNav"
import MarketingFooter from "../marketing/MarketingFooter"
import { PathHero, PathFeatureList, PathPricing } from "../marketing/PathPageSections"

const COLOR = PATH_COLORS.professional

const FEATURES = [
  "UAN/EPFO-backed employment verification, not a self-typed timeline",
  "Compensation Intelligence — know your market rate, not a guess",
  "Passive job matching that runs in the background",
  "Gap Mode + Gap Narrative Engine for career transitions",
  "Nexus — a verified professional network, not another feed",
  "Full submission history with AI review on every Forge challenge",
]

export default function ProfessionalPath({ onGetStarted, onLogin }) {
  const handleGetStarted = () => {
    selectPath("professional")
    if (typeof onGetStarted === "function") onGetStarted({ path: "professional", source: "path-page" })
  }
  const plans = getPlansByPath("professional")

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

      <MarketingNav activePath="professional" onGetStarted={handleGetStarted} onLogin={onLogin} />

      <PathHero
        icon={Briefcase} color={COLOR} title="Professional"
        headline="Your career intelligence, verified — not self-reported."
        subhead="Capabilio cross-checks your employment history against UAN/EPFO records, tracks your market value, and keeps your skills verified automatically as you work — no manual resume updates."
        onGetStarted={handleGetStarted}
        persona={{ name: "Vikram Nair", role: "Professional · Full Stack Developer", pathKey: "professional" }}
      />

      <PathFeatureList eyebrow="What you get" title="Career intelligence that updates itself." points={FEATURES} color={COLOR} />

      <PathPricing
        plans={plans}
        color={COLOR}
        ctaLabel={(plan) => plan.ctaLabel || (plan.price === 0 ? "Start free" : `Go ${plan.label}`)}
        onSelectPlan={handleGetStarted}
      />

      <MarketingFooter />
    </div>
  )
}
