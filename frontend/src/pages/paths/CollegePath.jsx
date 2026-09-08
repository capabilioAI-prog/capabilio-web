import { useState } from "react"
import { Landmark } from "lucide-react"
import { T } from "../../lib/osDesignTokens"
import { PATH_COLORS, selectPath } from "../../lib/pathIdentity"
import { getPlansByPath } from "../../config/plans"
import MarketingNav from "../marketing/MarketingNav"
import MarketingFooter from "../marketing/MarketingFooter"
import { PathHero, PathFeatureList, PathPricing } from "../marketing/PathPageSections"

const COLOR = PATH_COLORS.institution
const INST_TYPES = ["College", "Company", "Government", "NGO"]

const FEATURES = [
  "Live cohort ELO dashboard — per student, per batch, per department",
  "Professor Task Engine — AI-graded tasks feed straight into student ELO",
  "Placement Command Center — real-time offer tracking",
  "One-click NAAC report, auto-populated from real placement data",
  "Recruiter portal — companies filter and reach your batch directly",
  "One invite link, instant student onboarding",
]

function initialInstType() {
  try {
    const q = new URLSearchParams(window.location.search).get("type")
    const match = INST_TYPES.find((t) => t.toLowerCase() === (q || "").toLowerCase())
    return match || "College"
  } catch { return "College" }
}

export default function CollegePath({ onGetStarted, onLogin }) {
  const [instType, setInstType] = useState(initialInstType)

  const handleGetStarted = () => {
    selectPath("institution", instType)
    if (typeof onGetStarted === "function") onGetStarted({ path: "institution", source: "path-page" })
  }
  const plans = getPlansByPath("institution")

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

      <MarketingNav activePath="institution" onGetStarted={handleGetStarted} onLogin={onLogin} />

      <PathHero
        icon={Landmark} color={COLOR} title="College"
        headline="Track cohort ELO. Hire verified talent."
        subhead="Automate placements with a live view of every student's verified skill — not self-reported CGPA, and not a spreadsheet somebody forgot to update."
        onGetStarted={handleGetStarted}
        persona={{ name: "VIT Vellore", role: "College", pathKey: "institution" }}
      />

      <div className="lp-container" style={{ display: "flex", justifyContent: "center", marginTop: -48, marginBottom: 48 }}>
        <div style={{ display: "flex", background: T.surfaceRaised, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
          {INST_TYPES.map((t) => (
            <button key={t} onClick={() => setInstType(t)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: instType === t ? COLOR : "transparent",
              color: instType === t ? "#fff" : T.ink2,
              fontSize: 13, fontWeight: instType === t ? 600 : 500,
              fontFamily: "inherit", transition: "all 0.15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <PathFeatureList eyebrow="What you get" title="A live view of cohort skill, not a spreadsheet." points={FEATURES} color={COLOR} />

      <PathPricing
        plans={plans}
        color={COLOR}
        ctaLabel={(plan) => plan.ctaLabel || "Start Free Trial"}
        onSelectPlan={handleGetStarted}
        footnote="A bad hire costs ₹80,000+. One better placement decision pays for the year. Paid tiers are scoped to your student/employee count — talk to us once you're past the trial."
      />

      <MarketingFooter />
    </div>
  )
}
