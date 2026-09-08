/**
 * PathPageSections.jsx — shared building blocks for the 4 dedicated path
 * pages (pages/paths/*.jsx). Each page supplies its own copy/data; these
 * components supply the shared visual structure so the 4 pages stay
 * consistent with each other and with the homepage's existing visual
 * language (LiftCard, Eyebrow, PrimaryButton, the plan-card layout that
 * used to live in LandingPage.jsx's tab-switcher Pricing section).
 */
import { ArrowRight, Check } from "lucide-react"
import { motion } from "framer-motion"
import { T, EASE } from "../../lib/osDesignTokens"
import { withAlpha } from "../../lib/pathIdentity"
import { Eyebrow, PrimaryButton, GhostButton, IllustrativeTag, JourneyProof } from "./primitives"

// ─── Hero ───────────────────────────────────────────────────────────────
export function PathHero({ icon: Icon, color, title, headline, subhead, onGetStarted, persona }) {
  const article = /^[aeiou]/i.test(title) ? "an" : "a"
  return (
    <section style={{ padding: "72px 0 80px" }}>
      <div className="lp-container lp-hero-grid">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: withAlpha(color, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={18} color={color} strokeWidth={1.75} />
            </div>
            <Eyebrow>For {title}s</Eyebrow>
          </div>
          <h1 style={{ fontSize: "clamp(32px,4.2vw,50px)", lineHeight: 1.1, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 20px" }}>
            {headline}
          </h1>
          <p style={{ fontSize: 16.5, color: T.ink2, lineHeight: 1.6, maxWidth: 480, margin: "0 0 32px" }}>
            {subhead}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton onClick={onGetStarted}>Get started as {article} {title} <ArrowRight size={15} /></PrimaryButton>
            <GhostButton href="/#how-it-works">See how it works</GhostButton>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>
          <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 20, padding: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{persona.name}</div>
            <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 3 }}>{persona.role}</div>
            <IllustrativeTag style={{ display: "block", marginBottom: 14 }} />
            <JourneyProof pathKey={persona.pathKey} color={color} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Feature checklist ──────────────────────────────────────────────────
export function PathFeatureList({ eyebrow, title, points, color }) {
  return (
    <section style={{ padding: "0 0 96px" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 style={{ fontSize: "clamp(26px,3.4vw,36px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>{title}</h2>
        </div>
        <div className="lp-grid-2" style={{ maxWidth: 760, margin: "0 auto" }}>
          {points.map((p) => (
            <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: T.ink2, lineHeight: 1.5 }}>
              <Check size={16} color={color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing — sourced from config/plans.js's getPlansByPath(), never
// LandingPage.jsx's old hardcoded (and stale) PRICING object. Shows only
// the plans passed in — one path's plans, never another's.
export function PathPricing({ plans, color, ctaLabel, onSelectPlan, footnote }) {
  return (
    <section id="pricing" style={{ padding: "0 0 96px" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Eyebrow>Pricing</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>
            {plans.length > 1 ? "Simple pricing." : "One plan. Everything included."}
          </h2>
        </div>
        <div className={plans.length === 1 ? "" : plans.length === 2 ? "lp-grid-2" : "lp-grid-3"} style={plans.length === 1 ? { maxWidth: 420, margin: "0 auto" } : undefined}>
          {plans.map((plan) => {
            const priceLabel = plan.price === 0 ? "Free" : `₹${plan.price}/mo`
            const sub = plan.yearlyPrice ? `₹${plan.yearlyPrice}/yr — ${plan.yearlySaving}` : plan.tagline || null
            return (
              <div key={plan.id} style={{
                border: `1px solid ${T.border}`, borderTop: plan.highlight ? `3px solid ${color}` : `1px solid ${T.border}`,
                borderRadius: 16, padding: "24px 22px", display: "flex", flexDirection: "column",
              }}>
                {plan.highlight && plan.badge && (
                  <div style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>{plan.badge}</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 6 }}>{plan.label}</div>
                <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, marginBottom: sub ? 4 : 18 }}>{priceLabel}</div>
                {sub && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 18, lineHeight: 1.5 }}>{sub}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22, flex: 1 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: T.ink2 }}>
                      <Check size={14} color={color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                    </div>
                  ))}
                </div>
                {plan.highlight
                  ? <PrimaryButton onClick={() => onSelectPlan(plan)}>{ctaLabel(plan)}</PrimaryButton>
                  : <GhostButton onClick={() => onSelectPlan(plan)}>{ctaLabel(plan)}</GhostButton>}
              </div>
            )
          })}
        </div>
        {footnote && <p style={{ textAlign: "center", fontSize: 12.5, color: T.ink3, marginTop: 24, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>{footnote}</p>}
      </div>
    </section>
  )
}
