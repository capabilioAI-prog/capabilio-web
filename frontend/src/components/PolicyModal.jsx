// ─── PolicyModal.jsx ──────────────────────────────────────────────────────────
// Renders one policy document (see frontend/src/config/policies/*) as an
// accessible modal: table of contents, scroll-to-section, sticky close
// button, Escape/backdrop dismissal, focus trap, and focus restoration to
// whatever triggered it. Content is entirely data-driven (see
// config/policies/blocks.js's renderBlock) so updating a policy never
// touches this file — only its content module.
//
// Usage: <PolicyModal policy={POLICIES.privacy} onClose={() => setOpen(null)} />
// Renders nothing when `policy` is falsy.
import { useEffect, useMemo, useRef, useState } from "react"
import { renderBlock, formatPolicyDate } from "../config/policies/blocks"

const T = {
  ink: "#1A1714", ink2: "#475569", ink3: "#A8A29E", ink4: "#6B6560",
  indigo: "#6366F1", indigo3: "rgba(99,102,241,0.12)",
  border: "rgba(0,0,0,0.08)", bg: "#FFFFFF", bgSubtle: "#FAF7F2",
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export default function PolicyModal({ policy, onClose }) {
  const [activeSectionId, setActiveSectionId] = useState(policy?.sections?.[0]?.id)
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)
  const sectionRefs = useRef({})
  const previouslyFocusedRef = useRef(null)

  // Focus management: remember what had focus before opening, move focus
  // into the dialog, restore it on close — the same discipline a native
  // <dialog> gives you for free, done by hand since this app has no shared
  // modal primitive yet.
  useEffect(() => {
    if (!policy) return
    previouslyFocusedRef.current = document.activeElement
    dialogRef.current?.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR)
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
      // Return focus to whatever opened the modal (the "View →" card) —
      // without this, keyboard/screen-reader users lose their place.
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.id])

  // Track which section is nearest the top of the scroll area so the TOC
  // can highlight it — a plain IntersectionObserver, no scroll-event math.
  useEffect(() => {
    if (!policy || !bodyRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveSectionId(topMost.target.dataset.sectionId)
      },
      { root: bodyRef.current, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.id])

  const showToc = (policy?.sections?.length || 0) > 3

  const titleId = useMemo(() => `policy-modal-title-${policy?.id || "none"}`, [policy?.id])

  if (!policy) return null

  function scrollToSection(id) {
    const el = sectionRefs.current[id]
    if (el && bodyRef.current) {
      bodyRef.current.scrollTo({ top: el.offsetTop - 12, behavior: "smooth" })
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(20,18,15,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Same pattern as SqlWorkspace.jsx's own scoped <style> tag — this
          codebase has no CSS-in-JS system, so a media query for the
          TOC/content layout has to land this way. Below the breakpoint the
          TOC stacks above the content instead of sitting beside it, and
          gets a bounded height so it doesn't crowd out the actual policy
          text on a phone screen. */}
      <style>{`
        @media (max-width: 640px) {
          .policy-modal-body { flex-direction: column !important; }
          .policy-modal-toc { width: 100% !important; max-height: 160px; border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.08); }
        }
      `}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          background: T.bg, borderRadius: 18, minWidth: 0,
          width: "min(920px, calc(100vw - 32px))",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 30px 90px rgba(0,0,0,0.45)", overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Header — flex-shrink:0, outside the scroll region entirely so it
            never overlaps scrolling content underneath it. */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 16, padding: "20px 24px", borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.ink }}>
              {policy.title}
            </h2>
            <div style={{ marginTop: 5, fontSize: 12, color: T.ink4 }}>
              Last updated: <strong style={{ color: T.ink2 }}>{formatPolicyDate(policy.lastUpdated)}</strong>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${T.border}`, background: T.bgSubtle,
              color: T.ink3, fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body — the ONLY scrolling region. TOC sits alongside on wide
            viewports; stacks above the content on narrow ones. */}
        <div className="policy-modal-body" style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {showToc && (
            <nav
              aria-label={`${policy.title} sections`}
              className="policy-modal-toc"
              style={{
                width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`,
                padding: "16px 12px", overflowY: "auto", background: T.bgSubtle,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: T.ink4, textTransform: "uppercase", letterSpacing: 0.6, padding: "4px 10px 8px" }}>
                On this page
              </div>
              {policy.sections.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 10px", marginBottom: 1, borderRadius: 8,
                    border: "none", cursor: "pointer", fontSize: 12.5, lineHeight: 1.4,
                    background: activeSectionId === s.id ? T.indigo3 : "transparent",
                    color: activeSectionId === s.id ? T.indigo : T.ink2,
                    fontWeight: activeSectionId === s.id ? 700 : 500,
                  }}
                >
                  {s.heading}
                </button>
              ))}
            </nav>
          )}

          <div
            ref={bodyRef}
            style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "22px 28px" }}
          >
            {policy.intro && (
              <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.7, marginTop: 0 }}>{policy.intro}</p>
            )}
            {policy.sections.map(s => (
              <section
                key={s.id}
                id={`policy-section-${s.id}`}
                data-section-id={s.id}
                ref={el => { sectionRefs.current[s.id] = el }}
                style={{ marginBottom: 26, scrollMarginTop: 12 }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 800, color: T.ink, margin: "0 0 10px" }}>{s.heading}</h3>
                {s.body.map((block, i) => <div key={i}>{renderBlock(block, i)}</div>)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
