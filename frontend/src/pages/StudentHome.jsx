/**
 * StudentHome.jsx — Dark Bento Grid Dashboard
 * Dark atmosphere · bento layout · glass morphism · animated counters
 */
import { useState, useEffect, useRef } from "react"
import { arenaDb } from "../lib/db"
import { getRoleConfig } from "../config/roleConfig"
import { getTier } from "../theme"

// ── Design tokens ─────────────────────────────────────────────────────────
const D = {
  void:    '#FFFFFF',
  deep:    '#FAFAFA',
  base:    '#FAF7F2',
  raised:  '#FFFFFF',
  float:   '#F5F5F5',
  glass:   'rgba(0,0,0,0.03)',
  glassH:  'rgba(0,0,0,0.06)',
  border:  '#E8E3DA',
  borderH: '#D6D0C8',
  indigo:  '#6366F1',
  gold:    '#F59E0B',
  emerald: '#10B981',
  rose:    '#F43F5E',
  violet:  '#8B5CF6',
  text1:   '#1A1714',
  text2:   '#475569',
  muted:   '#A8A29E',
}

// ── Animated number counter ────────────────────────────────────────────────
function useCountUp(target, duration = 900, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf
    let startTime = null
    const start = 0
    const timer = setTimeout(() => {
      const step = (ts) => {
        if (!startTime) startTime = ts
        const progress = Math.min((ts - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setVal(Math.round(start + (target - start) * eased))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [target, duration, delay])
  return val
}

// ── ELO tier ──────────────────────────────────────────────────────────────
// Tier name/boundary sourced from ../theme's canonical ELO_TIERS (Rookie→Elite);
// this page's own color/bg/border palette (D.*) is preserved per tier.
const TIER_STYLE = {
  Rookie:       { color: D.muted,   bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.20)" },
  Apprentice:   { color: D.gold,    bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.20)" },
  Practitioner: { color: D.emerald, bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.30)" },
  Expert:       { color: D.indigo,  bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.30)" },
  Master:       { color: D.violet,  bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.30)" },
  Elite:        { color: D.rose,    bg: "rgba(244,63,94,0.15)",   border: "rgba(244,63,94,0.30)" },
}
function eloTier(elo) {
  const { label } = getTier(elo)
  return { tier: label, ...TIER_STYLE[label] }
}

function toProof(sub) {
  return {
    title: sub.challenge_title || sub.title || "Arena Challenge",
    company: sub.company || sub.domain || null,
    score: sub.score ?? sub.final_score ?? null,
    badge: sub.percentile ? `Top ${sub.percentile}%` : null,
    time: (sub.submittedAt || sub.completed_at)
      ? new Date(sub.submittedAt || sub.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "Recent",
    elo: sub.eloDelta ?? sub.elo_delta ?? 0,
  }
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────
function Skeleton({ h = 14, w = "100%", radius = 8, style = {} }) {
  return (
    <div className="bento-skeleton" style={{ height: h, width: w, borderRadius: radius, ...style }} />
  )
}

// ── Fire SVG icon ─────────────────────────────────────────────────────────
function FireIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 7.5 7 12.5C7 15.5 9.5 18 12 18C14.5 18 17 15.5 17 12.5C17 9.5 14 6 13 4C13 4 12.8 7 11 8.5C11 8.5 9 6.5 12 2Z" fill="#F59E0B"/>
      <path d="M12 14C12 14 10 12.5 10 11C10 9.5 11 8.5 12 8C12 8 12 10 13 11C13.5 11.5 14 12 14 13C14 14.1 13.1 15 12 15C11.5 15 11 14.8 10.7 14.4" fill="#FCD34D" opacity="0.8"/>
    </svg>
  )
}

export default function StudentHome({ user, userData, onNavigate }) {
  const [submissions,  setSubmissions]  = useState([])
  const [loadingProof, setLoadingProof] = useState(true)
  const [mounted,      setMounted]      = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!user?.id && !user?.uid) { setLoadingProof(false); return }
    const uid   = user.id || user.uid
    const unsub = arenaDb.subscribeHistory(uid, (data) => {
      setSubmissions(data || [])
      setLoadingProof(false)
    })
    return unsub
  }, [user?.id, user?.uid])

  const name      = userData?.name || user?.displayName || "Student"
  const firstName = name.split(" ")[0]
  const elo       = userData?.eloRating || 400
  const streak    = userData?.streak    || 0
  const domain    = userData?.domain    || userData?.keyword || getRoleConfig(userData).label
  const { tier, color: tierColor, bg: tierBg, border: tierBorder } = eloTier(elo)

  const recentEloGained = submissions
    .filter(s => Date.now() - new Date(s.submittedAt || s.completed_at || 0).getTime() < 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, s) => sum + (s.eloDelta || s.elo_delta || 0), 0)

  const recentProof      = submissions.slice(0, 3).map(toProof)
  const todaySubmissions = submissions.filter(s => {
    const t = s.submittedAt || s.completed_at
    return t && new Date(t).toDateString() === new Date().toDateString()
  }).length
  const missionProgress  = Math.min(100, todaySubmissions * 100)
  const goalDone         = todaySubmissions >= 1

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const skillScores = {}
  submissions.forEach(s => {
    const skill = s.domain || s.skill || "General"
    if (!skillScores[skill]) skillScores[skill] = []
    skillScores[skill].push(s.score || 0)
  })
  const weakestSkill = Object.entries(skillScores)
    .map(([k, v]) => ({ skill: k, avg: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => a.avg - b.avg)[0]?.skill || "System Design"

  // Animated ELO counter
  const eloDisplay  = useCountUp(mounted ? elo : 0, 900, 200)
  const streakNum   = useCountUp(mounted ? streak : 0, 700, 300)

  return (
    <div style={{
      background: `radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
                   radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 50%),
                   ${D.void}`,
      minHeight: "100vh",
      padding: "24px 24px 48px",
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');

        @keyframes bentoReveal {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fillBar {
          from { width: 0%; }
        }
        @keyframes shimmerDark {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }

        .bento-card {
          transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease;
        }
        .bento-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08)) !important;
          border-color: rgba(0,0,0,0.08) !important;
        }
        .bento-skeleton {
          background: linear-gradient(90deg,
            rgba(0,0,0,0.02) 25%,
            rgba(0,0,0,0.05) 37%,
            rgba(0,0,0,0.02) 63%
          );
          background-size: 1200px 100%;
          animation: shimmerDark 1.4s ease-in-out infinite;
        }
        .gold-btn {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 10px 18px;
          transition: transform 200ms ease, box-shadow 200ms ease;
          white-space: nowrap;
        }
        .gold-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245,158,11,0.4);
        }
        .gold-btn:active { transform: scale(0.97); }

        .secondary-btn {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 8px;
          color: ${D.text2};
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 7px 14px;
          transition: background 180ms ease, transform 180ms ease;
        }
        .secondary-btn:hover {
          background: rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }

        .quick-action-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(0,0,0,0.02);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: ${D.text2};
          transition: background 180ms ease, border-color 180ms ease, transform 200ms ease;
          width: 100%;
          text-align: left;
        }
        .quick-action-row:hover {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .quick-action-row:active { transform: scale(0.98); }

        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: 1fr 1fr !important; }
          .bento-span2 { grid-column: span 2 !important; }
          .bento-span4 { grid-column: span 2 !important; }
          .bento-span1 { grid-column: span 1 !important; }
        }
        @media (max-width: 560px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-span2, .bento-span4, .bento-span1 { grid-column: span 1 !important; }
        }
      `}</style>

      {/* ── Greeting row ── */}
      <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease-out both" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: D.muted, letterSpacing: "0.01em" }}>
          {greeting}, {firstName}
        </p>
        <h1 style={{
          margin: "6px 0 0",
          fontSize: 36,
          fontWeight: 800,
          color: D.text1,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
        }}>
          What's your move today?
        </h1>
      </div>

      {/* ── Bento grid ── */}
      <div
        className="bento-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        {/* ── Row 1 · Goal Card (col-span-2) ── */}
        <div
          className="bento-card bento-span2"
          style={{
            gridColumn: "span 2",
            background: D.glass,
            border: `1px solid ${D.glassH}`,
            borderRadius: 20,
            padding: "22px 24px",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            animation: "bentoReveal 0.4s ease-out 0ms both",
          }}
        >
          {/* Label */}
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "#A5B4FC",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            Today's Goal
          </div>

          {/* Headline */}
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: D.text1,
            marginBottom: 16,
            lineHeight: 1.3,
          }}>
            {goalDone
              ? "Goal complete! Well done."
              : "Complete 1 Arena challenge"}
          </div>

          {/* Progress bar */}
          <div style={{
            height: 6,
            borderRadius: 999,
            background: "rgba(0,0,0,0.06)",
            overflow: "hidden",
            marginBottom: 20,
          }}>
            <div style={{
              height: "100%",
              width: mounted ? `${missionProgress || (goalDone ? 100 : 0)}%` : "0%",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${D.indigo}, ${D.violet})`,
              transition: "width 0.9s cubic-bezier(0,0,0.2,1) 0.4s",
            }} />
          </div>

          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 12, color: D.muted }}>
              {goalDone
                ? `${todaySubmissions} challenge${todaySubmissions > 1 ? "s" : ""} done today`
                : "Earn evidence recruiters can inspect"}
            </span>
            <button className="gold-btn" onClick={() => onNavigate("arenaCollegeStream")}>
              Enter Arena →
            </button>
          </div>
        </div>

        {/* ── Row 1 · ELO Card (col-span-1) ── */}
        <div
          className="bento-card bento-span1"
          style={{
            gridColumn: "span 1",
            background: D.raised,
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: 20,
            padding: "22px 20px",
            animation: "bentoReveal 0.4s ease-out 60ms both",
          }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(245,158,11,0.6)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            ELO
          </div>

          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 44,
            fontWeight: 800,
            color: D.gold,
            lineHeight: 1,
            marginBottom: 6,
          }}>
            {eloDisplay.toLocaleString()}
          </div>

          {recentEloGained !== 0 && (
            <div style={{
              fontSize: 12,
              color: recentEloGained > 0 ? D.emerald : D.rose,
              fontWeight: 600,
              marginBottom: 12,
            }}>
              {recentEloGained > 0 ? "▲" : "▼"} {recentEloGained > 0 ? "+" : ""}{recentEloGained} this week
            </div>
          )}

          {/* Sparkline placeholder */}
          <div style={{
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, rgba(245,158,11,0.2), ${D.gold}, rgba(245,158,11,0.2))`,
            marginBottom: 14,
            marginTop: recentEloGained !== 0 ? 0 : 12,
          }} />

          {/* Tier badge */}
          <span style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: 100,
            background: tierBg,
            border: `1px solid ${tierBorder}`,
            color: tierColor,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.06em",
          }}>
            {tier}
          </span>
        </div>

        {/* ── Row 1 · Streak Card (col-span-1) ── */}
        <div
          className="bento-card bento-span1"
          style={{
            gridColumn: "span 1",
            background: D.raised,
            border: "1px solid rgba(245,158,11,0.15)",
            borderRadius: 20,
            padding: "22px 20px",
            animation: "bentoReveal 0.4s ease-out 120ms both",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <FireIcon size={28} />
          </div>

          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 32,
            fontWeight: 800,
            color: D.gold,
            lineHeight: 1,
            marginBottom: 4,
          }}>
            {streakNum}
          </div>

          <div style={{ fontSize: 12, color: D.muted, marginBottom: 8, fontWeight: 500 }}>
            day streak
          </div>

          <div style={{
            fontSize: 11,
            color: streak > 0 ? D.gold : D.muted,
            fontWeight: 600,
          }}>
            {streak > 0 ? "Keep it alive!" : "Start today!"}
          </div>
        </div>

        {/* ── Row 2 · Today's Mission Banner (col-span-4) ── */}
        <div
          className="bento-card bento-span4"
          style={{
            gridColumn: "span 4",
            background: "linear-gradient(135deg, rgba(99,102,241,0.20), rgba(139,92,246,0.12))",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 16,
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            animation: "bentoReveal 0.4s ease-out 180ms both",
          }}
        >
          {/* Left */}
          <div>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              color: "#A5B4FC",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              Today's Missions
            </div>
            <div style={{ fontSize: 14, color: D.text2, fontWeight: 500 }}>
              3 challenges ready · <span style={{ color: D.muted }}>{domain}</span>
            </div>
          </div>

          {/* Difficulty pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Easy",   elo: "+8 ELO",  color: D.emerald, bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.25)"  },
              { label: "Medium", elo: "+18 ELO", color: D.gold,    bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.25)"  },
              { label: "Hard",   elo: "+30 ELO", color: D.rose,    bg: "rgba(244,63,94,0.15)",   border: "rgba(244,63,94,0.25)"   },
            ].map(pill => (
              <span key={pill.label} style={{
                padding: "5px 12px",
                borderRadius: 100,
                background: pill.bg,
                border: `1px solid ${pill.border}`,
                color: pill.color,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap",
              }}>
                {pill.label} <span style={{ opacity: 0.8 }}>{pill.elo}</span>
              </span>
            ))}
          </div>

          {/* CTA */}
          <button className="gold-btn" onClick={() => onNavigate("arenaCollegeStream")}>
            Enter Arena →
          </button>
        </div>

        {/* ── Row 3 · Recommended Skill (col-span-1) ── */}
        <div
          className="bento-card bento-span1"
          style={{
            gridColumn: "span 1",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: 20,
            padding: "22px 20px",
            animation: "bentoReveal 0.4s ease-out 240ms both",
          }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "#A5B4FC",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}>
            ⚡ Next Skill
          </div>

          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: D.text1,
            marginBottom: 6,
            lineHeight: 1.3,
          }}>
            {weakestSkill}
          </div>

          <div style={{
            fontSize: 12,
            color: D.emerald,
            fontWeight: 600,
            marginBottom: 18,
          }}>
            High market demand
          </div>

          <button className="secondary-btn" onClick={() => onNavigate("arenaCollegeStream")}>
            Start in Studio →
          </button>
        </div>

        {/* ── Row 3 · Recent Proof (col-span-2) ── */}
        <div
          className="bento-card bento-span2"
          style={{
            gridColumn: "span 2",
            background: D.raised,
            border: `1px solid ${D.border}`,
            borderRadius: 20,
            padding: "22px 20px",
            animation: "bentoReveal 0.4s ease-out 300ms both",
          }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: D.muted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Recent Proof
          </div>

          {loadingProof ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  padding: "12px 14px",
                  background: "#FAFAFA",
                  borderRadius: 12,
                  borderLeft: `3px solid rgba(99,102,241,0.2)`,
                }}>
                  <Skeleton h={13} w="65%" style={{ marginBottom: 8 }} />
                  <Skeleton h={10} w="40%" />
                </div>
              ))}
            </div>
          ) : recentProof.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "28px 16px",
              color: D.muted,
              fontSize: 13,
              fontWeight: 500,
            }}>
              No proofs yet · Complete an Arena challenge →
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentProof.map((p, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#FAFAFA",
                  borderRadius: 12,
                  borderLeft: `3px solid ${D.indigo}`,
                  animation: `bentoReveal 0.4s ease-out ${320 + i * 60}ms both`,
                  gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: D.text1,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {p.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.company && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#A5B4FC",
                          background: "rgba(99,102,241,0.12)",
                          border: "1px solid rgba(99,102,241,0.20)",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontFamily: "'DM Mono', monospace",
                        }}>
                          {p.company}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: D.muted }}>{p.time}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {p.score != null && (
                      <div style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 20,
                        fontWeight: 800,
                        color: p.score >= 80 ? D.emerald : p.score >= 50 ? D.gold : D.rose,
                        lineHeight: 1,
                        marginBottom: 2,
                      }}>
                        {p.score}
                      </div>
                    )}
                    {p.elo > 0 && (
                      <div style={{ fontSize: 11, color: D.emerald, fontWeight: 700 }}>
                        +{p.elo} ELO
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Row 3 · Quick Actions (col-span-1) ── */}
        <div
          className="bento-card bento-span1"
          style={{
            gridColumn: "span 1",
            background: D.raised,
            border: `1px solid ${D.border}`,
            borderRadius: 20,
            padding: "22px 20px",
            animation: "bentoReveal 0.4s ease-out 360ms both",
          }}
        >
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: D.muted,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}>
            Quick Actions
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { icon: "⚔️", label: "Arena",     page: "arenaCollegeStream", accentColor: D.indigo },
              { icon: "📡", label: "Pulse",     page: "pulse",    accentColor: "#38BDF8" },
              { icon: "✦",  label: "Aura",      page: "aura",     accentColor: D.violet  },
              { icon: "👥", label: "Community", page: "nexus",    accentColor: D.emerald },
            ].map((a, i) => (
              <button
                key={a.page}
                className="quick-action-row"
                onClick={() => onNavigate(a.page)}
                style={{ animation: `bentoReveal 0.4s ease-out ${380 + i * 40}ms both` }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ flex: 1, color: D.text2 }}>{a.label}</span>
                <span style={{ color: D.muted, fontSize: 13 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
