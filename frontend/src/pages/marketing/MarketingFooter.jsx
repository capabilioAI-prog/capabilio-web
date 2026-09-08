/**
 * MarketingFooter.jsx — shared footer for the homepage, the 4 dedicated
 * path pages, and the About/Privacy/Terms pages, modeled on sarvam.ai's
 * real footer structure: logo+certs column, then Product/Paths/Resources/
 * Company/Legal link columns, then one giant closing wordmark. Every link
 * in every column goes to a real page — Product/Paths link into the
 * existing in-app routes and the 4 path pages; Resources anchors into real
 * homepage sections (#how-it-works/#pricing/#faq); Company/Legal link to
 * the new AboutPage.jsx/PrivacyPolicy.jsx/TermsOfService.jsx (pages/company,
 * pages/legal) built specifically so these buttons wouldn't be dead links.
 * Privacy/Terms are explicitly flagged on-page as template documents
 * needing real legal review, not published as if final.
 *
 * The wordmark's texture technique matches sarvam.ai's own: ONE wide scene
 * image, scaled with backgroundSize:"cover" (not tiled/repeated) across the
 * whole word, so each letter reveals a different part of the same
 * continuous illustration — exactly how sarvam's wood-grain photo behaves
 * behind "sarvam". An earlier pass here used a small repeating icon tile
 * instead, which read as mechanical/"boxy" rather than a real scene; this
 * is the fix.
 *
 * It cycles through seven wide illustrated scenes, each a real, named
 * Andhra Pradesh place or its cuisine — not a photograph. A prior pass
 * considered pulling stock photos the way capabilio-new's SarvamFooter.jsx
 * does (generic Unsplash images captioned with real monument names), but
 * that project's own images don't depict what their captions claim (its
 * "Borra Caves" photo is an unrelated beach/resort shot; its "Undavalli
 * Caves" photo is an unrelated circuit-board macro) — presenting a stock
 * photo, or a synthetic AI photo, as if it depicts a specific real place
 * is exactly the kind of thing that erodes trust once someone looks
 * closely, so this file uses honestly-framed original illustrations
 * instead, in the same documented-exception spirit as pathIdentity.js's
 * 4-path color system:
 *   1. Tirumala hills and the Venkateswara Temple gopuram, Tirupati.
 *   2. RK Beach, Visakhapatnam — the Bay of Bengal coastline.
 *   3. The Prakasam Barrage across the Krishna River, Vijayawada.
 *   4. The misted hills and plantation terraces of Araku Valley.
 *   5. The seated Amaravati Buddha statue.
 *   6. The Godavari river bridge at Rajahmundry.
 *   7. An Andhra thali — the region's famously fiery cuisine.
 * This is a genuinely richer palette (sky/water/hill/stone tones, not just
 * T.accent) than the rest of the site — a second deliberate departure from
 * DESIGN.md's one-accent rule, scoped entirely to this one closing visual
 * moment, the same way it's scoped for the 4-path colors. The cycle only
 * runs while this section is actually on screen (paused via useInView
 * otherwise, and skipped entirely under prefers-reduced-motion) — not a
 * page-wide ambient loop. Dot indicators (also clickable) mirror the
 * carousel-dots convention from the reference footer.
 *
 * All footer links go to real destinations only — the 4 dedicated path
 * pages, the actual in-app routes (pageRoutes.js), the real recruiter
 * portal, and the real support address already used in SettingsPanel.jsx.
 * No "About/Careers/Press" columns — those pages don't exist yet, and a
 * footer full of dead links would be worse than a short honest one.
 */
import { useState, useEffect, useRef } from "react"
import { Rocket, Factory, ShieldCheck } from "lucide-react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import { T, EASE } from "../../lib/osDesignTokens"
import { PRIMARY_PATHS, PATH_URLS } from "../../lib/pathIdentity"
import { useReveal } from "./primitives"

const PRODUCT_LINKS = [
  { label: "Arena", href: "/arena" },
  { label: "SkillStudio", href: "/skillstudio" },
  { label: "Aura", href: "/aura" },
  { label: "Pulse", href: "/pulse" },
]

const RESOURCES_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
]

const COMPANY_LINKS = [
  { label: "About us", href: "/about" },
  { label: "Contact support", href: "mailto:support@capabilio.com" },
  { label: "Recruiter portal", href: "https://recruiter.capabilio.online", external: true },
]

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
]

// Palette for the wordmark scenes only — scoped to this file (see header
// comment). Warm/earthy tones alongside the brand accent so all seven
// scenes still read as one coherent family.
const HP = {
  cream: "#FCEFDD", sand: "#F4E4C9", dune: "#E8D2A0",
  skyBlue: "#DCEFF2", water: "#3B6B7C", deepWater: "#2E5563",
  hillLight: "#7A9B6A", hillMid: "#557A47", hillDark: "#3E5C34", hillDeep: "#2C4324",
  stone: "#5C2A22", stoneDeep: "#3D1B16", stoneDeepest: "#2E1410",
  terracotta: "#8B3A2E", chili: "#B23A24",
}

// Each scene is one wide (1600×320) illustration, computed once at module
// scope — swapped every 3s behind the wordmark via backgroundSize:"cover"
// (never tiled), so every letter shows a different slice of one continuous
// picture, matching sarvam.ai's own technique.
const SCENE = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">${inner}</svg>`.trim()

const HERITAGE_SCENES = [
  {
    id: "tirumala",
    caption: "Tirumala hills and the Venkateswara Temple gopuram — Tirupati, Andhra Pradesh, one of the world's most-visited pilgrimage sites.",
    svg: SCENE(`
      <defs><linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${HP.cream}"/><stop offset="60%" stop-color="${T.accent}"/><stop offset="100%" stop-color="${HP.stone}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyA)"/>
      <circle cx="1300" cy="90" r="46" fill="${HP.cream}" opacity="0.85"/>
      <path d="M0 260 L120 190 L260 240 L420 160 L600 230 L780 150 L960 220 L1140 170 L1320 230 L1600 190 L1600 320 L0 320 Z" fill="${HP.stoneDeep}" opacity="0.85"/>
      <path d="M600 230 L630 195 L648 165 L666 195 L700 230 Z" fill="${HP.stoneDeepest}"/>
      <path d="M0 300 L200 260 L450 300 L700 270 L950 300 L1200 260 L1600 300 L1600 320 L0 320 Z" fill="${HP.stoneDeepest}"/>
    `),
  },
  {
    id: "vizag-beach",
    caption: "RK Beach, Visakhapatnam — Andhra Pradesh's long Bay of Bengal coastline.",
    svg: SCENE(`
      <defs><linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${HP.skyBlue}"/><stop offset="55%" stop-color="${HP.sand}"/><stop offset="100%" stop-color="${T.accent}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyB)"/>
      <circle cx="820" cy="150" r="52" fill="${HP.cream}" opacity="0.9"/>
      <rect y="190" width="1600" height="110" fill="${HP.water}" opacity="0.85"/>
      <path d="M0 190 Q 200 175 400 190 T 800 190 T 1200 190 T 1600 190" stroke="${HP.cream}" stroke-width="4" fill="none" opacity="0.55"/>
      <path d="M0 225 Q 200 210 400 225 T 800 225 T 1200 225 T 1600 225" stroke="${HP.cream}" stroke-width="4" fill="none" opacity="0.4"/>
      <rect y="298" width="1600" height="22" fill="${HP.dune}"/>
    `),
  },
  {
    id: "krishna-barrage",
    caption: "The Prakasam Barrage across the Krishna River — Vijayawada, Andhra Pradesh.",
    svg: SCENE(`
      <defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${HP.sand}"/><stop offset="100%" stop-color="${T.accentDark}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyC)"/>
      <rect y="220" width="1600" height="100" fill="${HP.water}" opacity="0.85"/>
      <g fill="${HP.stoneDeepest}" opacity="0.85">
        <rect x="0" y="160" width="1600" height="10"/>
        <rect x="60" y="170" width="14" height="60"/><rect x="220" y="170" width="14" height="60"/>
        <rect x="380" y="170" width="14" height="60"/><rect x="540" y="170" width="14" height="60"/>
        <rect x="700" y="170" width="14" height="60"/><rect x="860" y="170" width="14" height="60"/>
        <rect x="1020" y="170" width="14" height="60"/><rect x="1180" y="170" width="14" height="60"/>
        <rect x="1340" y="170" width="14" height="60"/><rect x="1500" y="170" width="14" height="60"/>
      </g>
    `),
  },
  {
    id: "araku-valley",
    caption: "The misted hills and plantation terraces of Araku Valley — Andhra Pradesh's coffee-growing highlands.",
    svg: SCENE(`
      <defs><linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#EAF1E2"/><stop offset="100%" stop-color="${HP.hillLight}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyD)"/>
      <path d="M0 200 L300 140 L600 190 L900 120 L1200 180 L1600 130 L1600 320 L0 320 Z" fill="${HP.hillMid}" opacity="0.6"/>
      <path d="M0 260 L350 210 L700 250 L1050 200 L1600 240 L1600 320 L0 320 Z" fill="${HP.hillDark}" opacity="0.8"/>
      <g stroke="${HP.hillDeep}" stroke-width="3" opacity="0.45" fill="none">
        <path d="M0 280 Q 400 265 800 280 T 1600 280"/>
        <path d="M0 297 Q 400 282 800 297 T 1600 297"/>
      </g>
    `),
  },
  {
    id: "amaravati-buddha",
    caption: "The seated Amaravati Buddha statue — Amaravati, Andhra Pradesh, Capabilio's own headquarters city.",
    svg: SCENE(`
      <defs><linearGradient id="skyE" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${HP.cream}"/><stop offset="100%" stop-color="${T.accent}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyE)"/>
      <circle cx="800" cy="120" r="80" fill="${HP.cream}" opacity="0.5"/>
      <g fill="${HP.stone}" opacity="0.85">
        <circle cx="800" cy="100" r="36"/>
        <path d="M736 145 Q800 112 864 145 L886 250 Q800 282 714 250 Z"/>
      </g>
      <g fill="none" stroke="${HP.stoneDeep}" stroke-width="3" opacity="0.4">
        <path d="M700 270c9-9 18-9 27 0"/><path d="M745 270c9-9 18-9 27 0"/>
        <path d="M828 270c9-9 18-9 27 0"/><path d="M873 270c9-9 18-9 27 0"/>
      </g>
    `),
  },
  {
    id: "godavari-bridge",
    caption: "The Godavari river bridge at Rajahmundry — Andhra Pradesh's Godavari river districts.",
    svg: SCENE(`
      <defs><linearGradient id="skyF" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${HP.sand}"/><stop offset="100%" stop-color="${HP.deepWater}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyF)"/>
      <rect y="220" width="1600" height="100" fill="${HP.deepWater}" opacity="0.85"/>
      <g stroke="${HP.stoneDeepest}" stroke-width="6" fill="none" opacity="0.8">
        <path d="M0 190 L1600 190"/>
        <path d="M0 190 L120 130 L240 190"/><path d="M240 190 L360 130 L480 190"/>
        <path d="M480 190 L600 130 L720 190"/><path d="M720 190 L840 130 L960 190"/>
        <path d="M960 190 L1080 130 L1200 190"/><path d="M1200 190 L1320 130 L1440 190"/>
        <path d="M1440 190 L1560 130 L1600 175"/>
      </g>
      <g stroke="${HP.hillDark}" stroke-width="6" fill="none" opacity="0.7">
        <path d="M60 320 L60 250"/><path d="M60 250q-28-8-38 10"/><path d="M60 250q28-8 38 10"/><path d="M60 250q-8-28 10-38"/><path d="M60 250q8-28-10-38"/>
      </g>
    `),
  },
  {
    id: "andhra-thali",
    caption: "An Andhra thali — the region's famously fiery, tamarind-and-chili-forward cuisine.",
    svg: SCENE(`
      <defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${HP.cream}"/><stop offset="100%" stop-color="${T.accent}"/>
      </linearGradient></defs>
      <rect width="1600" height="320" fill="url(#skyG)"/>
      <ellipse cx="800" cy="220" rx="270" ry="70" fill="${HP.sand}" opacity="0.9"/>
      <ellipse cx="800" cy="208" rx="95" ry="40" fill="#FFFFFF" opacity="0.85"/>
      <g fill="${HP.terracotta}" opacity="0.85">
        <circle cx="640" cy="215" r="28"/><circle cx="960" cy="215" r="28"/>
        <circle cx="700" cy="258" r="20"/><circle cx="900" cy="258" r="20"/>
      </g>
      <g fill="${HP.chili}" opacity="0.9">
        <path d="M555 190c-22 10-32 32-20 48c15-4 28-17 32-34c2-9-2-18-12-14Z"/>
        <path d="M1045 190c22 10 32 32 20 48c-15-4-28-17-32-34c-2-9 2-18 12-14Z"/>
      </g>
    `),
  },
].map((s) => ({ ...s, url: `url("data:image/svg+xml,${encodeURIComponent(s.svg)}")` }))

function TrustBadge({ icon: Icon, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px" }}>
      <Icon size={16} color={T.ink3} strokeWidth={1.75} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink3, marginBottom: 16 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  )
}

const footerLinkStyle = { fontSize: 13.5, color: T.ink2, textDecoration: "none" }

export default function MarketingFooter() {
  const reveal = useReveal()
  const reduceMotion = useReducedMotion()
  const wordmarkRef = useRef(null)
  const inView = useInView(wordmarkRef, { margin: "-100px" })
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!inView || reduceMotion) return
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERITAGE_SCENES.length)
    }, 3000)
    return () => clearInterval(id)
  }, [inView, reduceMotion])

  return (
    <>
      {/* ── LINK FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "56px 0 40px" }}>
        <style>{`
          .mfoot-grid { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 1fr; gap: 32px; }
          @media (max-width: 1000px) { .mfoot-grid { grid-template-columns: 1fr 1fr 1fr; row-gap: 32px; } .mfoot-logo { grid-column: 1 / -1; } }
          @media (max-width: 560px) { .mfoot-grid { grid-template-columns: 1fr 1fr; } }
        `}</style>
        <div className="lp-container mfoot-grid">
          <div className="mfoot-logo">
            <img src="/capabilio-logo-dark.png" alt="Capabilio AI" style={{ height: 22, width: "auto", marginBottom: 16 }} />
            <p style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6, maxWidth: 260, marginBottom: 18 }}>
              An AI Career Operating System that continuously builds, verifies, and showcases your professional skills.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <TrustBadge icon={Rocket} label="DPIIT Recognised" />
              <TrustBadge icon={Factory} label="Udyam Registered" />
              <TrustBadge icon={ShieldCheck} label="MCA Incorporated" />
            </div>
          </div>

          <FooterColumn title="Product">
            {PRODUCT_LINKS.map((l) => <a key={l.label} href={l.href} style={footerLinkStyle}>{l.label}</a>)}
          </FooterColumn>

          <FooterColumn title="Paths">
            {PRIMARY_PATHS.map((p) => <a key={p.key} href={PATH_URLS[p.key]} style={footerLinkStyle}>{p.title}</a>)}
          </FooterColumn>

          <FooterColumn title="Resources">
            {RESOURCES_LINKS.map((l) => <a key={l.label} href={l.href} style={footerLinkStyle}>{l.label}</a>)}
          </FooterColumn>

          <FooterColumn title="Company">
            {COMPANY_LINKS.map((l) => (
              <a key={l.label} href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined} style={footerLinkStyle}>{l.label}</a>
            ))}
          </FooterColumn>

          <FooterColumn title="Legal">
            {LEGAL_LINKS.map((l) => <a key={l.label} href={l.href} style={footerLinkStyle}>{l.label}</a>)}
          </FooterColumn>
        </div>

        <div className="lp-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.hairline}` }}>
          <span style={{ fontSize: 12, color: T.ink3 }}>निर्मित भारत में · Made in India</span>
          <span style={{ fontSize: 12, color: T.ink3 }}>© {new Date().getFullYear()} Capabilio · Amaravati, Andhra Pradesh</span>
        </div>
      </footer>

      {/* ── WORDMARK SIGNATURE ────────────────────────────────────────── */}
      <section ref={wordmarkRef} style={{ padding: "24px 0 8px", overflow: "hidden", background: T.surfaceRaised, borderTop: `1px solid ${T.hairline}` }}>
        <motion.div
          ref={reveal.ref}
          initial={reveal.initial}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={reveal.viewport}
          transition={{ duration: 0.7, ease: EASE }}
          style={{ transformOrigin: "center bottom", position: "relative" }}
        >
          {HERITAGE_SCENES.map((s, i) => (
            <motion.div
              key={s.id}
              aria-hidden={i !== activeIndex}
              animate={{ opacity: i === activeIndex ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
              style={{
                position: i === 0 ? "relative" : "absolute", inset: i === 0 ? undefined : 0,
                fontFamily: "'DM Sans',sans-serif", fontWeight: 700,
                fontSize: "clamp(110px,21vw,320px)", lineHeight: 0.92, letterSpacing: "-0.03em",
                textAlign: "center", margin: "0 -4vw", userSelect: "none",
                backgroundImage: s.url, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat",
                backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
                WebkitTextStroke: `1.75px ${T.ink}`,
                whiteSpace: "nowrap", pointerEvents: "none",
              }}
            >
              CAPABILIO
            </motion.div>
          ))}
        </motion.div>
        <p style={{ textAlign: "center", fontSize: 11, color: T.ink3, margin: "4px 0 14px", maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          {HERITAGE_SCENES[activeIndex].caption}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingBottom: 20 }}>
          {HERITAGE_SCENES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveIndex(i)}
              aria-label={`Show ${s.id} scene`}
              style={{
                width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
                background: i === activeIndex ? T.accent : T.border,
                transition: "background 150ms ease",
              }}
            />
          ))}
        </div>
      </section>
    </>
  )
}
