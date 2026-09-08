import { GraduationCap } from "lucide-react"
import { T } from "../../lib/osDesignTokens"
import { PATH_COLORS, selectPath } from "../../lib/pathIdentity"
import { getPlansByPath } from "../../config/plans"
import MarketingNav from "../marketing/MarketingNav"
import MarketingFooter from "../marketing/MarketingFooter"
import { PathHero, PathFeatureList, PathPricing } from "../marketing/PathPageSections"

const COLOR = PATH_COLORS.student

const FEATURES = [
  "ELO starts at 400 and only moves on real, scored Arena tasks",
  "18+ domains — pick any, switch any time",
  "Live ELO score after every submission, no waiting on a recruiter",
  "Auto-generated portfolio page built from your actual work",
  "AI mock interviews with structured, role-specific feedback",
  "Market reports so you know what a role actually expects, not guesses",
]

export default function StudentPath({ onGetStarted, onLogin }) {
  const handleGetStarted = () => {
    selectPath("student")
    if (typeof onGetStarted === "function") onGetStarted({ path: "student", source: "path-page" })
  }
  const plans = getPlansByPath("student")

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

      <MarketingNav activePath="student" onGetStarted={handleGetStarted} onLogin={onLogin} />

      <PathHero
        icon={GraduationCap} color={COLOR} title="Student"
        headline="Prove it before anyone asks you to."
        subhead="Real, scored challenges instead of another course certificate. Your ELO starts at 400 and only moves when you actually solve something — never by claiming a skill on a resume."
        onGetStarted={handleGetStarted}
        persona={{ name: "Meera Iyer", role: "Student · Computer Science", pathKey: "student" }}
      />

      <PathFeatureList eyebrow="What you get" title="Everything you need to build a verified profile." points={FEATURES} color={COLOR} />

      <PathPricing
        plans={plans}
        color={COLOR}
        ctaLabel={(plan) => plan.badge === "Best Value" ? "Go Elite" : plan.price === 0 ? "Get started free" : `Start ${plan.label}`}
        onSelectPlan={handleGetStarted}
      />

      <MarketingFooter />
    </div>
  )
}
