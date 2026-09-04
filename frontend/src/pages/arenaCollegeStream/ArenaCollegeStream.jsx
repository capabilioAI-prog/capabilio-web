/**
 * ArenaCollegeStream.jsx — Arena rebuild
 * ---------------------------------------------------------------------------
 * Landing: 2 cards (Domain / Stream), resolved from the user's profile
 * (roleConfig for Domain, userData.branch -> streams.slug for Stream).
 *
 * Stream branch (Phase 1): static, curriculum-aligned, rule-based. Every
 * score comes back from the backend's pure rubric evaluator
 * (backend/server/lib/collegeStream/evaluator.js), not a model call.
 *
 * Domain branch (Phase 2): panel_types/domain_roles/evaluation_axes-driven
 * (backend/server/lib/domainRole/*). Deliberately deterministic too — see
 * backend/server/lib/domainRole/sqlSandbox.js header for why SQL missions
 * are scored by exact result-set comparison rather than an AI judge.
 *
 * Visual language matches Aura.jsx (frontend/src/pages/Aura.jsx): same
 * color tokens (T.*), 1160px centered content column, CSS-grid card
 * layouts, small-caps eyebrow section labels — this is a desktop web page,
 * not a stacked mobile card list.
 *
 * Navigation is in-component state (landing -> stream -> semester -> subject
 * -> unit -> experiment list -> experiment, or landing -> domain -> mission
 * list -> mission), not per-level URL routing — matches App.jsx's single
 * currentPage state-machine pattern rather than introducing nested routes
 * for one page.
 */
import { useState, useEffect, useCallback } from "react"
import { arenaCollegeStreamApi, arenaDomainRoleApi, arenaActivityApi, arenaPaymentsApi, arenaCapabilityApi } from "../../lib/api"
import { isOpenableCapabilityTask } from "../../lib/arenaCapabilityContract"
import { getRoleConfig } from "../../config/roleConfig"
import { useRazorpay } from "../../hooks/useRazorpay"
import WorkspaceRenderer from "./workspaces/WorkspaceRenderer"
import { getPanelMetadata } from "./workspaces/panelMetadata"
import WorkspaceShell from "./shell/WorkspaceShell"
import { T, MONO, BODY, DIFFICULTY_COLOR } from "./shared/tokens"
import { Eyebrow, LoadingRow, StatChip, ResultTable, ChecklistPanel } from "./shared/primitives"
import { useCountdown } from "./shared/useCountdown"

// Maps userData.branch (set at Onboarding, e.g. "AI_DS", "ECE") to the
// `streams.slug` seeded in Supabase (see college_stream_seed_cse migration —
// only "cse" has full semester/subject/unit/experiment content today; the
// rest exist as bare stream rows). IT/MCA/DevOps/Other/IoT/Pharmacy have no
// direct seeded stream yet, so they fall back to the generic streams list
// rather than guessing.
const BRANCH_TO_STREAM_SLUG = {
  CSE: "cse",
  IT: "cse",       // IT path shares CSE's generic DSA/SQL content (see Onboarding.jsx BRANCH_TO_CAREER_SLUG)
  MCA: "mca",
  DevOps: "cse",
  AI_DS: "ai-ds",
  AI_ML: "ai-ml",
  ECE: "ece",
  EEE: "eee",
  Mechanical: "mechanical",
  Civil: "civil",
  MBA: "mba",
  // IoT, Pharmacy, Other: no stream row seeded yet — falls back to the
  // generic streams list rather than guessing a match.
}

// Common Challenge Framework progression tiers — display label only, the
// gating math itself lives server-side (computeTierLocks in
// arenaCollegeStream.js) so the client never has to be trusted for lock
// state, only for showing it.
const TIER_LABEL = { foundation: "Foundation", core: "Core", applied: "Applied", industry: "Industry", master: "Master" }
const PREV_TIER = { core: "foundation", applied: "core", industry: "applied", master: "industry" }

function GridCard({ onClick, children, disabled, accent }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: 18, background: T.cream2, border: `1px solid ${T.border}`,
        borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
        borderRadius: 16, cursor: disabled ? "default" : "pointer",
        fontFamily: BODY, boxShadow: T.shadow,
      }}
    >
      {children}
    </button>
  )
}

// LeetCode-style problem card — used by both the Professional Workspace
// grid (missions) and the Academic Workspace grid (experiments). Three
// states only: completed (passed — locked, checkmark, can't resubmit,
// enforced server-side too), locked (not yet done, but blocked — either
// today's quota is used up on Professional, or the Common Challenge
// Framework tier isn't cleared yet on Academic), or available (clickable).
function TaskCard({ item, accent, locked, lockedReason, onOpen, subtitle }) {
  const passed = item.passed
  const disabled = passed || locked
  return (
    <button
      onClick={() => !disabled && onOpen(item)}
      disabled={disabled}
      style={{
        display: "block", width: "100%", textAlign: "left", padding: 16,
        background: passed ? T.green2 : locked ? T.cream : T.cream2,
        border: `1px solid ${passed ? T.green + "40" : T.border}`,
        borderTop: `3px solid ${passed ? T.green : locked ? T.ink3 : accent}`,
        borderRadius: 14, cursor: disabled ? "default" : "pointer", fontFamily: BODY,
        boxShadow: disabled ? "none" : T.shadow, opacity: locked ? 0.6 : 1, position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        {subtitle && <Eyebrow color={T.ink3}>{subtitle}</Eyebrow>}
        {passed && <span style={{ fontSize: 16 }} title="Completed">✓</span>}
        {!passed && locked && <span style={{ fontSize: 14 }} title={lockedReason}>🔒</span>}
      </div>
      <div style={{ fontWeight: 700, color: T.ink, fontSize: 15, marginBottom: 8 }}>{item.title}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: MONO, fontSize: 11, flexWrap: "wrap" }}>
        {item.tier && (
          <span style={{ padding: "2px 8px", borderRadius: 20, background: T.indigo3, color: T.indigo, fontWeight: 700 }}>
            {TIER_LABEL[item.tier] || item.tier}
          </span>
        )}
        <span style={{ color: DIFFICULTY_COLOR[item.difficulty] || T.ink3, fontWeight: 700, textTransform: "uppercase" }}>
          {item.difficulty}
        </span>
        <span style={{ color: passed ? T.green : accent, fontWeight: 700 }}>+{item.elo_reward} ELO</span>
        {item.time_limit_minutes && <span style={{ color: T.ink3 }}>· {item.time_limit_minutes} min</span>}
      </div>
      {passed && <div style={{ fontSize: 11, color: T.green, fontWeight: 700, marginTop: 8 }}>Completed — locked</div>}
      {!passed && locked && <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, marginTop: 8 }}>{lockedReason}</div>}
    </button>
  )
}

function TaskGrid({ items, accent, quotaLocked, quotaLockedReason, onOpen, emptyMessage, loading }) {
  if (loading) return <LoadingRow />
  if (!items || items.length === 0) {
    return <div style={{ color: T.ink3, fontSize: 14, padding: 20 }}>{emptyMessage || "No tasks yet."}</div>
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
      {items.map(item => {
        // Two independent lock sources: Professional's daily quota
        // (global, same reason for every card) and the Common Challenge
        // Framework's tier gate (per-card, computed server-side in
        // computeTierLocks — never trust the client for the real check,
        // only for showing why a card is greyed out).
        const tierLockedReason = item.tierLocked
          ? `Locked — clear more of the ${TIER_LABEL[PREV_TIER[item.tier]] || "previous"} tier to unlock ${TIER_LABEL[item.tier] || item.tier}.`
          : null
        const locked = !item.passed && (quotaLocked || !!item.tierLocked)
        const lockedReason = !item.passed && quotaLocked ? quotaLockedReason : tierLockedReason
        return (
          <TaskCard
            key={item.id}
            item={item}
            accent={accent}
            onOpen={onOpen}
            locked={locked}
            lockedReason={lockedReason}
            subtitle={item.subtitle}
          />
        )
      })}
    </div>
  )
}

function Breadcrumb({ crumbs, onJump }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 22, fontSize: 13, fontFamily: MONO, color: T.ink3 }}>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ opacity: 0.5 }}>/</span>}
          {i === crumbs.length - 1 ? (
            <span style={{ color: T.ink, fontWeight: 700 }}>{c.label}</span>
          ) : (
            <button
              onClick={() => onJump(i)}
              style={{ background: "none", border: "none", color: T.indigo, cursor: "pointer", fontFamily: MONO, fontSize: 13, padding: 0 }}
            >
              {c.label}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

function BackButton({ onClick, label = "Back" }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
        background: "none", border: "none", color: T.ink4, fontWeight: 700,
        fontFamily: BODY, fontSize: 13, cursor: "pointer", padding: 0,
      }}
    >
      ← {label}
    </button>
  )
}

function ErrorRow({ message, onRetry }) {
  return (
    <div style={{ padding: 20, color: T.red, fontSize: 14 }}>
      {message || "Something went wrong."}{" "}
      {onRetry && (
        <button onClick={onRetry} style={{ color: T.indigo, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
          Retry
        </button>
      )}
    </div>
  )
}


/**
 * Full-width top tab bar for the whole Domain Role section — "Workspace"
 * (mission list / current mission), "Leaderboard", "History" — as their
 * own dedicated pages rather than squeezed into a sidebar.
 */
function TopTabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 22 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          style={{
            padding: "10px 18px", fontSize: 13, fontWeight: 700, fontFamily: BODY,
            border: "none", borderBottom: `2px solid ${active === t.key ? T.indigo : "transparent"}`,
            background: "none", color: active === t.key ? T.indigo : T.ink3, cursor: "pointer",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// Small segmented control — reused for both the window (All-time/Weekly/
// Monthly) and scope (This Role/Global/College) leaderboard dimensions.
// `disabledKeys` renders an option greyed-out with its own tooltip reason
// instead of hiding it — used for College, a real documented extension
// point (see arenaDomainRole.js's leaderboard route comment), not silently
// omitted.
function SegmentedControl({ options, active, onSelect, disabledKeys }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, background: T.cream, borderRadius: 8 }}>
      {options.map(opt => {
        const isDisabled = disabledKeys?.[opt.key]
        return (
          <button
            key={opt.key}
            onClick={() => !isDisabled && onSelect(opt.key)}
            disabled={isDisabled}
            title={isDisabled || undefined}
            style={{
              padding: "5px 11px", fontSize: 12, fontWeight: 700, fontFamily: BODY, borderRadius: 6, border: "none",
              background: active === opt.key ? T.cream2 : "transparent",
              boxShadow: active === opt.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              color: isDisabled ? T.ink3 : (active === opt.key ? T.ink : T.ink4),
              cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.6 : 1,
            }}
          >
            {opt.label}{isDisabled ? " (soon)" : ""}
          </button>
        )
      })}
    </div>
  )
}

const LEADERBOARD_WINDOW_OPTIONS = [{ key: "all_time", label: "All-Time" }, { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" }]
const LEADERBOARD_SCOPE_OPTIONS = [{ key: "role", label: "This Role" }, { key: "global", label: "Global" }, { key: "college", label: "College" }]

// `items` normalized to { rank, userId, displayName, elo, isYou } by the
// caller — Domain (roleElo) and Stream (streamElo) leaderboards use
// different backend field names, mapped to this common shape before
// reaching this shared component. `window`/`scope`/`onWindowChange`/
// `onScopeChange` are optional — the College Stream branch's leaderboard
// doesn't pass them and simply renders without the segmented controls,
// unchanged from before.
function LeaderboardPage({ items, loading, label, window: activeWindow, scope, onWindowChange, onScopeChange }) {
  const medals = ["🥇", "🥈", "🥉"]
  return (
    <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, boxShadow: T.shadow, maxWidth: 640 }}>
      <Eyebrow color={T.indigo}>{label} Leaderboard</Eyebrow>
      <div style={{ fontSize: 13, color: T.ink4, marginBottom: 18 }}>Ranked by ELO earned on {label} — real, computed from passed submissions.</div>
      {onWindowChange && onScopeChange && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <SegmentedControl options={LEADERBOARD_WINDOW_OPTIONS} active={activeWindow || "all_time"} onSelect={onWindowChange} />
          <SegmentedControl
            options={LEADERBOARD_SCOPE_OPTIONS} active={scope || "role"} onSelect={onScopeChange}
            disabledKeys={{ college: "College leaderboard needs student-to-college membership resolved first — coming in a later phase." }}
          />
        </div>
      )}
      {loading && <LoadingRow />}
      {!loading && (!items || items.length === 0) && <div style={{ color: T.ink3, fontSize: 14, padding: "12px 0" }}>No one has scored yet — be the first.</div>}
      {!loading && items && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(row => (
            <div
              key={row.userId}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "10px 14px",
                borderRadius: 10, background: row.isYou ? T.indigo3 : T.cream,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, color: T.ink, fontWeight: row.isYou ? 800 : 600 }}>
                <span style={{ width: 28, textAlign: "center", fontFamily: MONO, color: T.ink3 }}>{medals[row.rank - 1] || `#${row.rank}`}</span>
                {row.displayName}{row.isYou ? " (You)" : ""}
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ color: T.indigo, fontWeight: 800, fontFamily: MONO }}>+{row.elo} ELO here</span>
                {row.totalElo != null && (
                  <span style={{ color: T.ink3, fontWeight: 700, fontFamily: MONO, fontSize: 11 }}>{row.totalElo} total ELO</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// `items` normalized to { id, title, timestamp, passed, score, elo_delta,
// scenario, submittedLabel, submitted, result, checklist, insight,
// executionTimeMs, error } by the caller (see loadHistory/loadStreamHistory)
// — same reasoning as LeaderboardPage above. Every field here is either
// stored at submission time or joined from the mission/experiment's own
// static content; nothing is recomputed or fabricated for display.
function HistoryRow({ h }) {
  const [open, setOpen] = useState(false)
  const hasDetail = h.scenario || h.submitted || h.result || h.checklist || h.insight || h.error || h.ai_feedback
  return (
    <div style={{ borderRadius: 10, background: T.cream, overflow: "hidden" }}>
      <div
        onClick={() => hasDetail && setOpen(o => !o)}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px",
          cursor: hasDetail ? "pointer" : "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasDetail && <span style={{ color: T.ink3, fontSize: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }}>▶</span>}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{h.title}</div>
            <div style={{ fontSize: 11, color: T.ink3, fontFamily: MONO }}>{new Date(h.timestamp).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: h.passed ? T.green : T.red, fontWeight: 800, fontSize: 13 }}>{h.passed ? "✓ Passed" : "✗ Failed"}</div>
          <div style={{ fontSize: 11, color: T.ink3, fontFamily: MONO }}>Score {h.score} · ELO {h.elo_delta > 0 ? `+${h.elo_delta}` : h.elo_delta}</div>
        </div>
      </div>

      {open && (
        <div style={{ padding: "4px 16px 18px 34px", display: "flex", flexDirection: "column", gap: 14 }}>
          {h.scenario && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Scenario Given</div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{h.scenario}</div>
              {(h.company || h.manager || h.sprint) && (
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: MONO, marginTop: 4 }}>
                  {[h.company, h.manager, h.sprint].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          )}

          {h.submitted && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{h.submittedLabel}</div>
              <pre style={{ margin: 0, padding: 12, background: T.ink, color: "#E8E8E1", borderRadius: 8, fontFamily: MONO, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>{h.submitted}</pre>
            </div>
          )}

          {h.error && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Feedback</div>
              <div style={{ fontSize: 13, color: T.red }}>{h.error}</div>
            </div>
          )}

          {h.result && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1 }}>Output Received</div>
                {h.executionTimeMs != null && <div style={{ fontSize: 11, color: T.ink3, fontFamily: MONO }}>{h.executionTimeMs} ms</div>}
              </div>
              <ResultTable columns={h.result.columns} rows={h.result.rows} />
            </div>
          )}

          {h.insight && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Feedback</div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{h.insight}</div>
            </div>
          )}

          {h.checklist && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Validation Checklist</div>
              <ChecklistPanel checklist={h.checklist} />
            </div>
          )}

          {h.executionOutput && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Program Output</div>
              {h.executionOutput.error && <div style={{ fontSize: 12, color: T.red, marginBottom: 6 }}>{h.executionOutput.error}</div>}
              <pre style={{ margin: 0, padding: 12, background: T.ink, color: "#E8E8E1", borderRadius: 8, fontFamily: MONO, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {h.executionOutput.stdout || "(no output)"}
              </pre>
            </div>
          )}

          {h.ai_feedback && (
            <div style={{ background: T.indigo3, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.indigo, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🤖 AI Coach</div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{h.ai_feedback}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Manages a Passed/Failed toggle + cursor pagination for one branch's
// History tab, plus the aggregate passed/failed counts both the toggle
// labels and the Achievements tab's "completed" figure need.
//
// Both branches (Domain Role / College Stream) use this same shape — only
// which API functions and row-normalizer get passed in differ, keeping
// their actual data/tables structurally separate per the rebuild spec
// while sharing this UI-only pagination glue. Same reasoning as
// backend/server/lib/pagination.js being shared between the two branches'
// route files: it's generic infra, not evaluation/scoring logic.
//
// countsEnabled/itemsEnabled are separate flags because the Achievements
// tab only ever needs `counts` — no reason to fetch or hold the paginated
// item list for a tab that never renders it.
//
// Each filter ("passed"/"failed") keeps its own independent item list and
// cursor, so switching the toggle never re-fetches or loses the other
// filter's already-loaded pages.
function useHistoryTabs({ getHistory, getCounts, normalize, countsEnabled, itemsEnabled }) {
  const [activeFilter, setActiveFilter] = useState("passed")
  const [itemsByFilter, setItemsByFilter] = useState({ passed: null, failed: null })
  const [cursorByFilter, setCursorByFilter] = useState({ passed: null, failed: null })
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [counts, setCounts] = useState(null)

  const loadPage = useCallback((filter, cursor) => {
    const setBusy = cursor ? setLoadingMore : setLoading
    setBusy(true)
    setError(false)
    getHistory({ passed: filter === "passed", cursor: cursor || undefined })
      .then(res => {
        const rows = (res.history || []).map(normalize)
        setItemsByFilter(prev => ({ ...prev, [filter]: cursor ? [...(prev[filter] || []), ...rows] : rows }))
        setCursorByFilter(prev => ({ ...prev, [filter]: res.pagination?.nextCursor || null }))
      })
      .catch(() => setError(true))
      .finally(() => setBusy(false))
  }, [getHistory, normalize])

  useEffect(() => {
    if (countsEnabled && counts === null) {
      getCounts().then(setCounts).catch(() => setCounts({ passed: 0, failed: 0 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsEnabled])

  useEffect(() => {
    if (itemsEnabled && itemsByFilter[activeFilter] === null) loadPage(activeFilter, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsEnabled, activeFilter])

  return {
    activeFilter, setActiveFilter,
    items: itemsByFilter[activeFilter],
    hasMore: !!cursorByFilter[activeFilter],
    loading, loadingMore, error, counts,
    loadMore: () => loadPage(activeFilter, cursorByFilter[activeFilter]),
  }
}

// `history` is the return value of useHistoryTabs() — kept in the parent
// (ArenaCollegeStream) rather than inside this component so switching away
// from the History tab and back doesn't lose already-loaded pages, same
// caching behavior the single-list version had.
function HistoryPage({ label, history }) {
  const { activeFilter, setActiveFilter, items, hasMore, loading, loadingMore, error, counts, loadMore } = history
  const tabs = [
    { key: "passed", label: `Passed${counts ? ` (${counts.passed})` : ""}` },
    { key: "failed", label: `Failed${counts ? ` (${counts.failed})` : ""}` },
  ]
  return (
    <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, boxShadow: T.shadow, maxWidth: 700 }}>
      <Eyebrow color={T.indigo}>{label} History</Eyebrow>
      <div style={{ fontSize: 13, color: T.ink4, marginBottom: 14 }}>Every attempt you've submitted, most recent first — click one to see the full detail.</div>
      <TopTabBar tabs={tabs} active={activeFilter} onSelect={setActiveFilter} />
      {loading && <LoadingRow />}
      {!loading && error && <ErrorRow message="Couldn't load your history." onRetry={loadMore} />}
      {!loading && !error && (!items || items.length === 0) && (
        <div style={{ color: T.ink3, fontSize: 14, padding: "12px 0" }}>
          {activeFilter === "passed" ? "No passed attempts yet." : "No failed attempts — nice."}
        </div>
      )}
      {!loading && !error && items && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map(h => <HistoryRow key={h.id} h={h} />)}
        </div>
      )}
      {!loading && !error && hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{
            marginTop: 14, width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, fontFamily: BODY,
            border: `1px solid ${T.border}`, borderRadius: 10, background: T.cream, color: T.indigo,
            cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1,
          }}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  )
}

// Portal-style landing cards — deliberately show NO stats, ELO, timers,
// streaks, or leaderboard data. Arena's landing is an entry point (like
// opening a repo in GitHub or a project in Figma): pick a workspace first,
// see performance metrics only after you're inside it. Both the floating
// background words and the hover flow-diagram are config-driven — the
// Professional card pulls from roleConfig.auraSkills so this works for any
// of the 44 seeded domain_roles, not just Data Analyst.
const DEFAULT_PRO_WORDS = ["SQL", "Dashboard", "Cloud", "Python", "Git", "API", "Analytics"]
const ACADEMIC_WORDS = ["Books", "Projects", "Assignments", "Circuit", "Lab", "Notebook", "University"]

const PORTAL_VARIANTS = {
  professional: {
    icon: "💼",
    eyebrow: "Professional Workspace",
    gradient: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 55%, #6366F1 100%)",
  },
  academic: {
    icon: "🎓",
    eyebrow: "Academic Workspace",
    gradient: "linear-gradient(135deg, #064E3B 0%, #16A34A 60%, #4ADE80 100%)",
  },
}

function PortalCard({ variant, subtitle, description, quote, backgroundWords, flowSteps, onOpen }) {
  const [hovered, setHovered] = useState(false)
  const v = PORTAL_VARIANTS[variant]
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpen() }}
      style={{
        position: "relative", flex: 1, minWidth: 320, borderRadius: 20, overflow: "hidden",
        background: v.gradient, boxShadow: hovered ? "0 14px 40px rgba(0,0,0,0.28)" : "0 8px 26px rgba(0,0,0,0.16)",
        minHeight: 340, cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)", transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.16, pointerEvents: "none" }}>
        {backgroundWords.map((w, i) => (
          <span
            key={w}
            style={{
              position: "absolute", left: `${(i * 37) % 88}%`, top: `${(i * 53) % 82}%`,
              fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap",
              animation: `arenaDrift ${20 + (i % 5) * 4}s linear infinite`, animationDelay: `${-(i * 3)}s`,
            }}
          >{w}</span>
        ))}
      </div>

      <div style={{ position: "relative", padding: "30px 28px", display: "flex", flexDirection: "column", height: "100%", minHeight: 340 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>{v.icon}</div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
          {v.eyebrow}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{subtitle}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 18 }}>{description}</div>

        {!hovered && (
          <div style={{
            borderLeft: "2px solid rgba(255,255,255,0.35)", paddingLeft: 14, fontSize: 14, fontStyle: "italic",
            color: "rgba(255,255,255,0.9)", marginBottom: 22,
          }}>
            “{quote}”
          </div>
        )}

        {hovered && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 22 }}>
            {flowSteps.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.16)", padding: "4px 10px", borderRadius: 20 }}>
                  {step}
                </span>
                {i < flowSteps.length - 1 && <span style={{ color: "rgba(255,255,255,0.5)" }}>↓</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", fontWeight: 800, color: "#fff", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          Open Workspace
          <span style={{ transition: "transform 0.2s ease", transform: hovered ? "translateX(4px)" : "translateX(0)" }}>→</span>
        </div>
      </div>

      <style>{`@keyframes arenaDrift { 0% { transform: translate(0,0); opacity: 0.5; } 50% { transform: translate(-14px,-10px); opacity: 1; } 100% { transform: translate(0,0); opacity: 0.5; } }`}</style>
    </div>
  )
}

// Two distinct visual identities so the Professional and College cards
// read as genuinely different "worlds" (company workspace vs. academic
// notebook) rather than two copies of the same box with different text.
const WORKSPACE_VARIANTS = {
  professional: {
    headerBg: "linear-gradient(135deg, #1E1B4B 0%, #4338CA 60%, #6366F1 100%)",
    headerPattern: "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)",
    patternSize: "14px 14px",
    badgeBg: "rgba(255,255,255,0.15)",
    titleColor: "#fff",
  },
  college: {
    headerBg: "linear-gradient(135deg, #064E3B 0%, #16A34A 65%, #4ADE80 100%)",
    headerPattern: "repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 26px)",
    patternSize: "auto",
    badgeBg: "rgba(255,255,255,0.15)",
    titleColor: "#fff",
  },
}

function WorkspaceCard({ icon, title, variant, timerMinutes, children }) {
  const v = WORKSPACE_VARIANTS[variant] || WORKSPACE_VARIANTS.professional
  return (
    <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadow, flex: 1, minWidth: 340, overflow: "hidden" }}>
      <div style={{ background: v.headerBg, backgroundImage: `${v.headerPattern}, ${v.headerBg}`, backgroundSize: v.patternSize, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: v.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: v.titleColor, letterSpacing: 1.5, textTransform: "uppercase", flex: 1 }}>{title}</span>
        {timerMinutes != null && (
          <span style={{
            display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
            background: v.badgeBg, color: v.titleColor, fontFamily: MONO, fontSize: 11, fontWeight: 700,
          }}>
            ⏱ {timerMinutes} min
          </span>
        )}
      </div>
      <div style={{ padding: 22 }}>{children}</div>
    </div>
  )
}

function WorkspaceField({ label, value }) {
  if (value === null || value === undefined) return null
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ color: T.ink3 }}>{label}</span>
      <span style={{ color: T.ink, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function QuotaLockedNotice({ quota, planLabel }) {
  const { text, expired } = useCountdown(quota?.nextUnlockAt)
  return (
    <div style={{ padding: "14px 0" }}>
      <div style={{ fontSize: 13, color: T.ink2, marginBottom: 8 }}>
        You've used today's {quota.used}/{quota.limit} task{quota.limit === 1 ? "" : "s"} on the <b>{planLabel}</b> plan.
      </div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: expired ? T.green : T.indigo }}>
        {expired ? "Refreshing…" : `Next task in ${text}`}
      </div>
    </div>
  )
}

function ProfessionalWorkspaceCard({ domainLabel, skills, loading, mission, meta, quota, planLabel, onContinue, onPersonalizedPick, personalizedLoading, personalizedError }) {
  const timerMinutes = !loading && !quota?.nextUnlockAt ? mission?.time_limit_minutes : null
  return (
    <WorkspaceCard icon="🏢" title="Professional Workspace" variant="professional" timerMinutes={timerMinutes}>
      <WorkspaceField label="Role" value={domainLabel} />
      {loading && <div style={{ padding: "16px 0", color: T.ink3, fontSize: 13 }}>Loading…</div>}

      {!loading && quota?.nextUnlockAt && <QuotaLockedNotice quota={quota} planLabel={planLabel} />}

      {!loading && !quota?.nextUnlockAt && mission && (
        <>
          <WorkspaceField label="Today's Mission" value={mission.title} />
          {mission.company && <WorkspaceField label="Company" value={mission.company} />}
          {mission.manager && <WorkspaceField label="Manager" value={mission.manager} />}
          {mission.sprint && <WorkspaceField label="Sprint" value={mission.sprint} />}
          {mission.estimated_minutes && <WorkspaceField label="Estimated Time" value={`${mission.estimated_minutes} mins`} />}
          <WorkspaceField label="Difficulty" value={mission.difficulty} />
          <WorkspaceField label="Reward" value={`+${mission.elo_reward} ELO`} />
          {skills?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, marginBottom: 14 }}>
              {skills.slice(0, 5).map(s => (
                <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: T.indigo3, color: T.indigo, fontWeight: 700 }}>{s}</span>
              ))}
            </div>
          )}
          <button
            onClick={onContinue}
            style={{ marginTop: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: T.indigo, color: "#fff", fontWeight: 700, fontFamily: BODY, cursor: "pointer", fontSize: 13 }}
          >
            Continue Mission →
          </button>
          {onPersonalizedPick && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={onPersonalizedPick}
                disabled={personalizedLoading}
                style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.indigo}`, background: "transparent", color: T.indigo, fontWeight: 700, fontFamily: BODY, cursor: personalizedLoading ? "default" : "pointer", fontSize: 12 }}
              >
                🎯 {personalizedLoading ? "Finding your next task…" : "Get my personalized pick"}
              </button>
              {personalizedError && <div style={{ marginTop: 6, fontSize: 12, color: T.red || "#DC2626" }}>{personalizedError}</div>}
            </div>
          )}
        </>
      )}

      {!loading && !quota?.nextUnlockAt && !mission && meta?.completed && (
        <div style={{ padding: "12px 0", fontSize: 13, color: T.green, fontWeight: 700 }}>
          All {domainLabel} missions completed — nice work.
        </div>
      )}

      {!loading && !quota?.nextUnlockAt && !mission && !meta?.completed && (
        <div style={{ padding: "12px 0", fontSize: 13, color: T.ink3 }}>
          No missions built yet for {domainLabel}. This role is already wired into Arena — content is next.
        </div>
      )}
    </WorkspaceCard>
  )
}

const ARENA_PLAN_TIERS = [
  { key: "pro", label: "Pro", tasksPerDay: 3, accent: T.indigo, gradient: "linear-gradient(135deg, #312E81 0%, #6366F1 100%)" },
  { key: "elite", label: "Elite", tasksPerDay: 6, accent: T.amber, gradient: "linear-gradient(135deg, #78350F 0%, #D97706 60%, #FBBF24 100%)" },
]

function ArenaPlanCard({ tier, currentPlan, onUpgrade, busy }) {
  const rank = { free: 0, pro: 1, elite: 2 }
  const isCurrent = currentPlan === tier.key
  const alreadyAhead = (rank[currentPlan] ?? 0) > rank[tier.key]
  const disabled = isCurrent || alreadyAhead || busy
  return (
    <div style={{ flex: 1, minWidth: 260, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
      <div style={{ background: tier.gradient, padding: "18px 20px", color: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.85 }}>Arena Plan</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{tier.label}</div>
      </div>
      <div style={{ background: T.cream2, padding: "18px 20px" }}>
        <div style={{ fontSize: 14, color: T.ink2, marginBottom: 14 }}>
          <b style={{ color: T.ink }}>{tier.tasksPerDay} tasks</b> per day, across Professional and Stream branches.
        </div>
        <button
          onClick={() => onUpgrade(tier.key)}
          disabled={disabled}
          style={{
            width: "100%", padding: "10px 16px", borderRadius: 10, border: "none",
            background: disabled ? T.border : tier.accent,
            color: disabled ? T.ink3 : "#fff",
            fontWeight: 700, fontFamily: BODY, fontSize: 13,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          {isCurrent ? "Current Plan" : alreadyAhead ? "Included in your plan" : busy ? "Opening checkout…" : `Upgrade to ${tier.label}`}
        </button>
      </div>
    </div>
  )
}

// Goes straight into the real Razorpay checkout modal for the tapped plan —
// no intermediate plan-selection page. Mirrors Pricing.jsx's handleUpgrade
// (create-order -> openCheckout -> verify-payment) exactly, since that's
// the one real payment path in the app; this just skips Pricing's own UI.
function ArenaPlanTeaser({ currentPlan, onUpgrade, upgradingPlan, error }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.ink3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        More tasks per day
      </div>
      {error && <div style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {ARENA_PLAN_TIERS.map(tier => (
          <ArenaPlanCard key={tier.key} tier={tier} currentPlan={currentPlan} onUpgrade={onUpgrade} busy={upgradingPlan === tier.key} />
        ))}
      </div>
    </div>
  )
}

// Achievement milestones — deterministic, computed only from real fields
// already fetched elsewhere on this page (userData.eloRating, the unified
// Activity summary's streak, and the role's own completed-mission count).
// No fabricated progress, no new table — a badge is either earned by real
// history or it isn't.
// Extended 2026-08-18 (Phase 2). The three new booleans below (completed,
// hasCleanPass, hasFastPass) come from GET /:roleId/history/counts (see
// arenaDomainRole.js's comment on that route for exactly what each one
// means and why it's a real, non-fabricated signal) — modeled as value=1
// target=1 to fit the same value(ctx)>=target pattern every existing
// threshold achievement already uses, no change to AchievementBadge.
const DOMAIN_ACHIEVEMENT_DEFS = [
  { id: "first-mission", icon: "🚀", label: "First Mission", desc: "Complete your first mission", tier: "bronze", value: ctx => ctx.completed, target: 1 },
  { id: "ten-queries", icon: "🧮", label: "10 SQL Queries", desc: "Submit 10 SQL attempts (pass or fail)", tier: "bronze", value: ctx => ctx.totalAttempts, target: 10 },
  { id: "five-missions", icon: "🎯", label: "Five Down", desc: "Complete 5 missions", tier: "silver", value: ctx => ctx.completed, target: 5 },
  { id: "clean-pass", icon: "🎖️", label: "No Wrong Attempts", desc: "Pass a mission on your very first try", tier: "silver", value: ctx => (ctx.hasCleanPass ? 1 : 0), target: 1 },
  { id: "flawless-record", icon: "💎", label: "Perfect Score", desc: "Every attempt so far has been a pass — zero failures", tier: "silver", value: ctx => (ctx.completed > 0 && ctx.failed === 0 ? 1 : 0), target: 1 },
  { id: "fast-query", icon: "⚙️", label: "Fast Query", desc: "Beat the median query time on a mission, vs. every other student", tier: "silver", value: ctx => (ctx.hasFastPass ? 1 : 0), target: 1 },
  { id: "streak-3", icon: "🔥", label: "On a Roll", desc: "3-day activity streak", tier: "bronze", value: ctx => ctx.streakCurrent, target: 3 },
  { id: "streak-7", icon: "⚡", label: "Consistent", desc: "7-day activity streak (current or best)", tier: "silver", value: ctx => ctx.streakLongest, target: 7 },
  { id: "streak-10", icon: "🌟", label: "10 Day Streak", desc: "10-day activity streak (current or best)", tier: "gold", value: ctx => ctx.streakLongest, target: 10 },
  { id: "elo-1000", icon: "🧭", label: "1000 ELO", desc: "Reach 1000 ELO", tier: "bronze", value: ctx => ctx.elo || 0, target: 1000 },
  { id: "elo-1300", icon: "📈", label: "Rising", desc: "Reach 1300 ELO", tier: "silver", value: ctx => ctx.elo || 0, target: 1300 },
  { id: "elo-1500", icon: "🏆", label: "Sharpshooter", desc: "Reach 1500 ELO", tier: "gold", value: ctx => ctx.elo || 0, target: 1500 },
]

const ACHIEVEMENT_TIER_STYLE = {
  bronze: { ring: "linear-gradient(135deg, #B45309, #F59E0B)", glow: "rgba(180,83,9,0.35)" },
  silver: { ring: "linear-gradient(135deg, #64748B, #CBD5E1)", glow: "rgba(100,116,139,0.35)" },
  gold:   { ring: "linear-gradient(135deg, #B45309, #FDE68A)", glow: "rgba(251,191,36,0.4)" },
}

// Trophy-case treatment — earned badges get their tier's metallic ring and a
// soft glow; locked ones sit greyscale behind a lock icon with a real
// progress bar (current/target, both from live data) instead of a vague
// "keep going" message.
function AchievementBadge({ a, ctx }) {
  const value = a.value(ctx)
  const earned = value >= a.target
  const pct = Math.min(100, Math.round((value / a.target) * 100))
  const style = ACHIEVEMENT_TIER_STYLE[a.tier]
  return (
    <div style={{
      position: "relative", background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 16px",
      textAlign: "center", boxShadow: earned ? `0 6px 20px ${style.glow}` : "none", overflow: "hidden",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, background: earned ? style.ring : T.border, filter: earned ? "none" : "grayscale(1)",
        boxShadow: earned ? `inset 0 0 0 3px rgba(255,255,255,0.5)` : "none",
      }}>
        {earned ? a.icon : "🔒"}
      </div>
      <div style={{ fontWeight: 700, color: T.ink, fontSize: 14, marginBottom: 2 }}>{a.label}</div>
      <div style={{ fontSize: 11, color: T.ink3, marginBottom: 10 }}>{a.desc}</div>
      {earned ? (
        <div style={{ fontSize: 11, color: T.green, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>Earned</div>
      ) : (
        <>
          <div style={{ height: 5, borderRadius: 5, background: T.border, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: style.ring, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 10, color: T.ink3, fontFamily: MONO, marginTop: 6 }}>{Math.min(value, a.target)}/{a.target}</div>
        </>
      )}
    </div>
  )
}

function AchievementsPanel({ elo, completed, failed, totalAttempts, hasCleanPass, hasFastPass, streakCurrent, streakLongest }) {
  const ctx = {
    elo, completed: completed || 0, failed: failed || 0, totalAttempts: totalAttempts || 0,
    hasCleanPass: !!hasCleanPass, hasFastPass: !!hasFastPass,
    streakCurrent: streakCurrent || 0, streakLongest: streakLongest || 0,
  }
  const earnedCount = DOMAIN_ACHIEVEMENT_DEFS.filter(a => a.value(ctx) >= a.target).length
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.ink3, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
        {earnedCount} of {DOMAIN_ACHIEVEMENT_DEFS.length} earned
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {DOMAIN_ACHIEVEMENT_DEFS.map(a => <AchievementBadge key={a.id} a={a} ctx={ctx} />)}
      </div>
    </div>
  )
}

function CollegeWorkspaceCard({ streamName, branch, loading, next, meta, onContinue, onBrowse, onPersonalizedPick, personalizedLoading, personalizedError }) {
  const timerMinutes = !loading && next ? next.experiment?.time_limit_minutes : null
  return (
    <WorkspaceCard icon="🎓" title="College Workspace" variant="college" timerMinutes={timerMinutes}>
      <WorkspaceField label="Stream" value={streamName || (branch ? `${branch} (not matched)` : "Not set")} />
      {!streamName && (
        <div style={{ padding: "12px 0" }}>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 8 }}>No curriculum stream matched to your branch yet.</div>
          <button onClick={onBrowse} style={{ background: "none", border: "none", color: T.indigo, fontWeight: 700, cursor: "pointer", fontFamily: BODY, fontSize: 13, padding: 0 }}>Browse all streams →</button>
        </div>
      )}

      {streamName && loading && <div style={{ padding: "16px 0", color: T.ink3, fontSize: 13 }}>Loading…</div>}

      {streamName && !loading && next && (
        <>
          <WorkspaceField label="Semester" value={next.semester?.number} />
          <WorkspaceField label="Subject" value={next.subject?.name} />
          <WorkspaceField label="Today's Experiment" value={next.experiment?.title} />
          <WorkspaceField label="Difficulty" value={next.experiment?.difficulty} />
          <WorkspaceField label="Reward" value={`+${next.experiment?.elo_reward} ELO`} />
          <button
            onClick={onContinue}
            style={{ marginTop: 12, padding: "10px 18px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontWeight: 700, fontFamily: BODY, cursor: "pointer", fontSize: 13 }}
          >
            Continue Experiment →
          </button>
          {onPersonalizedPick && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={onPersonalizedPick}
                disabled={personalizedLoading}
                style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.green}`, background: "transparent", color: T.green, fontWeight: 700, fontFamily: BODY, cursor: personalizedLoading ? "default" : "pointer", fontSize: 12 }}
              >
                🎯 {personalizedLoading ? "Finding your next task…" : "Get my personalized pick"}
              </button>
              {personalizedError && <div style={{ marginTop: 6, fontSize: 12, color: T.red || "#DC2626" }}>{personalizedError}</div>}
            </div>
          )}
        </>
      )}

      {streamName && !loading && !next && meta?.completed && (
        <div style={{ padding: "12px 0" }}>
          <div style={{ fontSize: 13, color: T.green, fontWeight: 700, marginBottom: 8 }}>All experiments completed for {streamName} — nice work.</div>
          <button onClick={onBrowse} style={{ background: "none", border: "none", color: T.indigo, fontWeight: 700, cursor: "pointer", fontFamily: BODY, fontSize: 13, padding: 0 }}>Browse curriculum →</button>
        </div>
      )}

      {streamName && !loading && !next && !meta?.completed && (
        <div style={{ padding: "12px 0", fontSize: 13, color: T.ink3 }}>
          No experiments seeded yet for {streamName}.
        </div>
      )}
    </WorkspaceCard>
  )
}

const CALENDAR_CELL_COLOR = (count) => {
  if (count === 0) return T.border
  if (count === 1) return "rgba(22,163,74,0.35)"
  if (count === 2) return "rgba(22,163,74,0.65)"
  return T.green
}

function ActivityCalendar({ calendar }) {
  // 84 cells laid out GitHub-style: 12 week-columns of 7 day-rows,
  // oldest day first (top-left) chronologically.
  const weeks = []
  for (let i = 0; i < calendar.length; i += 7) weeks.push(calendar.slice(i, i + 7))
  return (
    <div style={{ display: "flex", gap: 3, overflowX: "auto" }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {week.map(day => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} activit${day.count === 1 ? "y" : "ies"}`}
              style={{ width: 11, height: 11, borderRadius: 2, background: CALENDAR_CELL_COLOR(day.count) }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Streak milestones — same "next tier" concept as the achievement badges,
// used here just to draw a progress rail under the streak number. Purely
// derived from the real current-streak count, nothing fabricated.
const STREAK_MILESTONES = [3, 7, 14, 30]

function StreakMilestoneRail({ current }) {
  const nextGoal = STREAK_MILESTONES.find(m => m > current) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1]
  const prevGoal = [0, ...STREAK_MILESTONES].reverse().find(m => m <= current) ?? 0
  const span = nextGoal - prevGoal || 1
  const pct = Math.min(100, Math.round(((current - prevGoal) / span) * 100))
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #FDBA74, #F97316)", borderRadius: 6, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: MONO }}>
        <span>{prevGoal}d</span>
        <span>{current >= nextGoal ? "Milestone reached" : `${nextGoal - current} day${nextGoal - current === 1 ? "" : "s"} to ${nextGoal}-day streak`}</span>
        <span>{nextGoal}d</span>
      </div>
    </div>
  )
}

function ActivitySection({ loading, summary }) {
  if (loading) return null
  if (!summary) return null
  return (
    <div>
      {/* Distinct "streak hero" identity — dark ember gradient, not another
          plain cream card, so Streak reads as its own place in the app. */}
      <div style={{
        borderRadius: 18, padding: "26px 28px", marginBottom: 18, boxShadow: T.shadow, color: "#fff",
        background: "linear-gradient(135deg, #1C1006 0%, #7C2D12 55%, #EA580C 100%)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
          Current Streak
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 40 }}>🔥</span>
          <span style={{ fontSize: 42, fontWeight: 800 }}>{summary.streak.current}</span>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>day{summary.streak.current === 1 ? "" : "s"}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: MONO }}>
            Best: {summary.streak.longest} day{summary.streak.longest === 1 ? "" : "s"}
          </span>
        </div>
        <StreakMilestoneRail current={summary.streak.current} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <StatChip label="Missions This Week" value={summary.week.missionsCompleted} />
        <StatChip label="Experiments This Week" value={summary.week.experimentsCompleted} />
        <StatChip label="ELO This Week" value={`+${summary.week.eloEarned}`} />
      </div>

      <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
        <Eyebrow color={T.ink3}>Last 12 Weeks</Eyebrow>
        <ActivityCalendar calendar={summary.calendar} />
      </div>
    </div>
  )
}

export default function ArenaCollegeStream({ userData, onNavigate, user, setUserData }) {
  // "level" drives which grid is shown: landing (2 cards) -> streams ->
  // semesters -> subjects -> units -> experiments -> experiment (Stream
  // branch); or landing -> domainMissions -> domainMission (Domain branch).
  const [level, setLevel] = useState("landing")

  const roleConfig = getRoleConfig(userData)
  const domainLabel = roleConfig?.label || "Your Domain"
  const branch = userData?.branch || null
  const matchedSlug = branch ? BRANCH_TO_STREAM_SLUG[branch] : null
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Arena Capability Engine (Phase 2) — additive personalized-pick entry
  // point, alongside (not replacing) the existing sequential "Continue"
  // flow below. See goToCapabilityNextTask.
  const [capabilityLoading, setCapabilityLoading] = useState(false)
  const [capabilityError, setCapabilityError] = useState(null)

  // Subscription tab — real Razorpay checkout, triggered directly from
  // Arena (no detour through the Pricing page). Same create-order ->
  // openCheckout -> verify-payment sequence Pricing.jsx uses; `subscription`
  // itself is still granted server-side by /verify-payment, this only
  // reflects it locally afterward for immediate UI feedback.
  const { openCheckout } = useRazorpay()
  const [upgradingPlan, setUpgradingPlan] = useState(null)
  const [upgradeError, setUpgradeError] = useState(null)

  function handleArenaUpgrade(planId) {
    if (planId === "free") return
    const uid = user?.id || user?.uid
    if (!uid) { setUpgradeError("Please sign in to upgrade."); return }
    setUpgradingPlan(planId); setUpgradeError(null)
    // Routed through arenaPaymentsApi (lib/api.js's shared request() helper)
    // instead of a raw fetch() — request() retries once on the Render
    // free-tier cold-start "Failed to fetch" that a bare fetch() doesn't
    // recover from, which is what was breaking this button.
    arenaPaymentsApi.createOrder(planId, uid)
      .then(({ orderId, amount, currency, keyId }) => {
        openCheckout({
          orderId, amount, currency, keyId,
          userEmail: user?.email,
          userName: userData?.name || user?.user_metadata?.full_name,
          userPhone: user?.phone || userData?.phone || "",
          onSuccess: async (paymentData) => {
            try {
              await arenaPaymentsApi.verifyPayment({ ...paymentData, planId, uid })
              if (setUserData) setUserData(prev => ({ ...prev, subscription: planId }))
              setUpgradingPlan(null)
            } catch (e) {
              setUpgradeError(e.message || "Payment verification failed.")
              setUpgradingPlan(null)
            }
          },
          onError: (msg) => {
            if (msg !== "Payment cancelled.") setUpgradeError(msg)
            setUpgradingPlan(null)
          },
        })
      })
      .catch(e => { setUpgradeError(e.message || "Upgrade failed. Please try again."); setUpgradingPlan(null) })
  }

  const [streams, setStreams] = useState([])
  const [semesters, setSemesters] = useState([])
  const [subjects, setSubjects] = useState([])
  const [units, setUnits] = useState([])
  const [experiments, setExperiments] = useState([])
  const [experiment, setExperiment] = useState(null)

  const [selectedStream, setSelectedStream] = useState(null)
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)

  const [answer, setAnswer] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)

  // Flat, LeetCode-style problem list for the matched stream — every
  // experiment across all semesters/subjects/units in one grid, each
  // carrying a real `passed` flag from the API. This is now the primary
  // way into the Academic Workspace; the semester -> subject -> unit
  // drill-down still exists underneath for the rare "browse a stream I'm
  // not matched to" fallback.
  const [allExperiments, setAllExperiments] = useState([])
  const [allExperimentsLoading, setAllExperimentsLoading] = useState(false)
  const [streamCategories, setStreamCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)

  function loadAllExperiments(slug) {
    setAllExperimentsLoading(true)
    setActiveCategory(null)
    arenaCollegeStreamApi.getAllExperiments(slug)
      .then(res => {
        setAllExperiments(res.experiments || [])
        setStreamCategories(res.categories || [])
      })
      .catch(() => { setAllExperiments([]); setStreamCategories([]) })
      .finally(() => setAllExperimentsLoading(false))
  }

  // Domain branch (Phase 2) state — separate from the Stream branch state
  // above per the "keep them structurally separate in code" requirement.
  const [domainMissions, setDomainMissions] = useState([])
  const [domainMission, setDomainMission] = useState(null)
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainError, setDomainError] = useState(null)
  const [sql, setSql] = useState("")
  // python_runner's own editor state (Career Workspace refactor) — kept
  // separate from `sql` per SqlWorkspace.jsx's own documented contract
  // ("state's own contents are workspace-specific"), not a shared/renamed
  // field. domainSubmitting/domainResult/domainSubmitError below are
  // shared across both panel types (submission outcome, not editor input).
  const [code, setCode] = useState("")
  const [domainSubmitting, setDomainSubmitting] = useState(false)
  const [domainResult, setDomainResult] = useState(null)
  const [domainSubmitError, setDomainSubmitError] = useState(null)
  const [missionDeadline, setMissionDeadline] = useState(null)
  // Non-scoring preflight ("Run Preview," Phase 2) — deliberately separate
  // from domainSubmitting/domainResult/domainSubmitError above, never a
  // fork of that state, so a preview run can never be mistaken for or
  // interfere with a real scored submission.
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState(null)
  const [validateError, setValidateError] = useState(null)

  // Top-level tabs for the whole Domain Role section — Workspace (mission
  // list / current mission), Leaderboard (role-scoped, real ELO ranking),
  // History (own real submissions). Full-width tabs, not a side panel —
  // both fetched lazily only once their tab is actually opened.
  const [domainMainTab, setDomainMainTab] = useState("workspace")
  const [leaderboardItems, setLeaderboardItems] = useState(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardWindow, setLeaderboardWindow] = useState("all_time")
  const [leaderboardScope, setLeaderboardScope] = useState("role")

  // History (Passed/Failed toggle + pagination) and its counts — see
  // useHistoryTabs above. Achievements needs `counts` only (a real
  // passed-mission total, not the "all done" boolean the landing summary
  // uses); History needs both counts (for its toggle labels) and items.
  const domainHistory = useHistoryTabs({
    getHistory: (params) => arenaDomainRoleApi.getHistory(roleConfig.id, params),
    getCounts: () => arenaDomainRoleApi.getHistoryCounts(roleConfig.id),
    normalize: h => ({
      id: h.id, title: h.mission_title, timestamp: h.created_at, passed: h.passed, score: h.score, elo_delta: h.elo_delta,
      scenario: h.prompt, company: h.company, manager: h.manager, sprint: h.sprint,
      submittedLabel: "SQL Submitted", submitted: h.sql_text,
      result: h.result_json || null, checklist: h.checklist_json || null, insight: h.insight,
      executionTimeMs: h.execution_time_ms, error: h.error, ai_feedback: h.ai_feedback,
    }),
    countsEnabled: domainMainTab === "history" || domainMainTab === "achievements",
    itemsEnabled: domainMainTab === "history",
  })

  function loadLeaderboard(windowParam, scopeParam) {
    setLeaderboardLoading(true)
    arenaDomainRoleApi.getLeaderboard(roleConfig.id, { window: windowParam || leaderboardWindow, scope: scopeParam || leaderboardScope })
      .then(res => setLeaderboardItems((res.leaderboard || []).map(r => ({ ...r, elo: r.roleElo }))))
      .catch(() => setLeaderboardItems([]))
      .finally(() => setLeaderboardLoading(false))
  }

  function selectDomainMainTab(tab) {
    setDomainMainTab(tab)
    if (tab === "leaderboard" && leaderboardItems === null) loadLeaderboard()
  }

  function changeLeaderboardWindow(w) { setLeaderboardWindow(w); loadLeaderboard(w, leaderboardScope) }
  function changeLeaderboardScope(s) { setLeaderboardScope(s); loadLeaderboard(leaderboardWindow, s) }

  // Stream branch gets the same Workspace/Leaderboard/History/Streaks tab
  // set as the Domain branch — separate state (own history/leaderboard
  // fetches, scoped to the matched stream) but identical UI pattern.
  const [streamMainTab, setStreamMainTab] = useState("workspace")
  const [streamLeaderboardItems, setStreamLeaderboardItems] = useState(null)
  const [streamLeaderboardLoading, setStreamLeaderboardLoading] = useState(false)

  // matchedStream isn't assigned until further down this component (it's
  // derived from the streams list, which loads separately from mount) —
  // these closures read it lazily when actually invoked (post-render, from
  // useHistoryTabs' effects), same as the pre-pagination loadStreamHistory
  // did, so the textual ordering here is safe. If matchedStream genuinely
  // never resolves (e.g. a branch with no seeded stream), resolve with an
  // empty page instead of hanging — same end state the old silent `return`
  // produced (an empty History tab), just via a defined value instead of a
  // stuck `null`.
  const streamHistory = useHistoryTabs({
    getHistory: (params) => matchedStream
      ? arenaCollegeStreamApi.getHistory(matchedStream.slug, params)
      : Promise.resolve({ history: [], pagination: { hasMore: false, nextCursor: null } }),
    getCounts: () => matchedStream
      ? arenaCollegeStreamApi.getHistoryCounts(matchedStream.slug)
      : Promise.resolve({ passed: 0, failed: 0 }),
    normalize: h => ({
      id: h.id, title: h.experiment_title, timestamp: h.submitted_at, passed: h.passed, score: h.score, elo_delta: h.elo_delta,
      scenario: h.prompt,
      submittedLabel: h.execution_output ? "Code Submitted" : "Answer Submitted",
      submitted: h.answer && typeof h.answer === "object" ? (h.answer.value ?? JSON.stringify(h.answer)) : h.answer,
      ai_feedback: h.ai_feedback,
      executionOutput: h.execution_output,
    }),
    countsEnabled: streamMainTab === "history",
    itemsEnabled: streamMainTab === "history",
  })

  function loadStreamLeaderboard() {
    if (!matchedStream) return
    setStreamLeaderboardLoading(true)
    arenaCollegeStreamApi.getLeaderboard(matchedStream.slug)
      .then(res => setStreamLeaderboardItems((res.leaderboard || []).map(r => ({ ...r, elo: r.streamElo }))))
      .catch(() => setStreamLeaderboardItems([]))
      .finally(() => setStreamLeaderboardLoading(false))
  }

  function selectStreamMainTab(tab) {
    setStreamMainTab(tab)
    if (tab === "leaderboard" && streamLeaderboardItems === null) loadStreamLeaderboard()
  }

  // Streams load in the background from mount (needed to resolve the Stream
  // card's personalized name/match) but must NOT block the landing screen —
  // hence a separate loading flag from the click-driven `loading` used by
  // the rest of the drill-down flow.
  const [streamsLoading, setStreamsLoading] = useState(true)
  const [streamsError, setStreamsError] = useState(null)

  const loadStreams = useCallback(() => {
    setStreamsLoading(true); setStreamsError(null)
    arenaCollegeStreamApi.listStreams()
      .then(res => setStreams(res.streams || []))
      .catch(e => setStreamsError(e.message))
      .finally(() => setStreamsLoading(false))
  }, [])

  useEffect(() => { loadStreams() }, [loadStreams])

  // Phase B — cross-branch activity (calendar/streak/week), fetched once
  // for the landing page. Real numbers only, computed server-side from the
  // user's own submission history across both branches.
  const [activitySummary, setActivitySummary] = useState(null)
  const [activityLoading, setActivityLoading] = useState(true)
  useEffect(() => {
    arenaActivityApi.getSummary()
      .then(res => setActivitySummary(res))
      .catch(() => setActivitySummary(null))
      .finally(() => setActivityLoading(false))
  }, [])

  const matchedStream = matchedSlug ? streams.find(s => s.slug === matchedSlug) || null : null

  // Landing hero data — fetched once, generic across ALL domain roles and
  // ALL streams (not hardcoded to Data Analyst/CSE). For the 43 roles and
  // 9 streams without content yet, these endpoints honestly return
  // mission/next: null rather than a fabricated task.
  const [nextMission, setNextMission] = useState(null)
  const [nextMissionMeta, setNextMissionMeta] = useState(null) // { totalMissions, completed }
  const [nextMissionQuota, setNextMissionQuota] = useState(null) // { used, limit, nextUnlockAt? }
  const [nextMissionLoading, setNextMissionLoading] = useState(true)
  const planLabel = userData?.subscription ? userData.subscription[0].toUpperCase() + userData.subscription.slice(1) : "Free"

  const [nextExperimentCtx, setNextExperimentCtx] = useState(null) // { experiment, unit, subject, semester }
  const [nextExperimentMeta, setNextExperimentMeta] = useState(null)
  const [nextExperimentLoading, setNextExperimentLoading] = useState(false)

  // Default recommended task is now the Arena Capability Engine's adaptive
  // pick (2026-09-04 — "default = adaptive, browsing stays available"),
  // not the plain curriculum-order /next-mission. Falls back to the
  // original static endpoint whenever the capability engine has nothing to
  // recommend (no eligible task, generation unavailable, or a transient
  // error) — that fallback is UNCHANGED from the prior behavior, so a role
  // with no capability data yet still gets a real next task, honestly, same
  // as before this change. Deliberately does not touch openDomainMissions
  // (the manual browse grid) or the daily quota/lock logic at all.
  const loadNextMission = useCallback(() => {
    setNextMissionLoading(true)
    arenaCapabilityApi.getNextTask({ domain: "domain_role", key: roleConfig.id })
      .then(async capRes => {
        if (!isOpenableCapabilityTask(capRes)) throw new Error("no_suitable_task")
        // The capability response is a narrow, answer-safe task shape (id/
        // title/prompt/difficulty/panelType/timeLimitMinutes) — re-fetch the
        // full mission record (already public, same one openDomainMission
        // itself re-fetches when opening any task) so the dashboard preview
        // card keeps showing company/manager/sprint/reward exactly as it did
        // before this change, regardless of which task is recommended.
        const { mission } = await arenaDomainRoleApi.getMission(capRes.task.id)
        setNextMission(mission || null)
        setNextMissionMeta({ totalMissions: null, completed: false })
        setNextMissionQuota(null)
      })
      .catch(() =>
        arenaDomainRoleApi.getNextMission(roleConfig.id)
          .then(res => {
            setNextMission(res.mission || null)
            setNextMissionMeta({ totalMissions: res.totalMissions, completed: res.completed })
            setNextMissionQuota(res.quota || null)
          })
          .catch(() => setNextMission(null))
      )
      .finally(() => setNextMissionLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleConfig.id])

  useEffect(() => { loadNextMission() }, [loadNextMission])

  // Same default-to-adaptive change as loadNextMission above, for the
  // College Stream branch. The capability response has no semester/subject
  // breadcrumb (it isn't asked to resolve one — see contextResolution.js),
  // so those two WorkspaceField rows simply don't render for an adaptively-
  // picked experiment (gracefully hidden, same as goToCapabilityNextTask's
  // existing personalized-pick button already does) — an honest omission,
  // not fabricated data. Falls back to the original static
  // next-experiment endpoint, unchanged, whenever capability has nothing
  // to recommend.
  useEffect(() => {
    if (!matchedStream) return
    setNextExperimentLoading(true)
    arenaCapabilityApi.getNextTask({ domain: "college_stream", key: matchedStream.slug })
      .then(async capRes => {
        if (!isOpenableCapabilityTask(capRes)) throw new Error("no_suitable_task")
        const { experiment } = await arenaCollegeStreamApi.getExperiment(capRes.task.id)
        setNextExperimentCtx(experiment ? { experiment, unit: null, subject: null, semester: null } : null)
        setNextExperimentMeta({ totalExperiments: null, completed: false })
      })
      .catch(() =>
        arenaCollegeStreamApi.getNextExperiment(matchedStream.slug)
          .then(res => {
            setNextExperimentCtx(res.next || null)
            setNextExperimentMeta({ totalExperiments: res.totalExperiments, completed: res.completed })
          })
          .catch(() => setNextExperimentCtx(null))
      )
      .finally(() => setNextExperimentLoading(false))
  }, [matchedStream])

  function goToNextMission() {
    if (!nextMission) return
    if (domainMissions.length === 0) {
      arenaDomainRoleApi.listMissions(roleConfig.id).then(res => setDomainMissions(res.missions || [])).catch(() => {})
    }
    openDomainMission(nextMission)
  }

  function goToNextExperiment() {
    if (!nextExperimentCtx || !matchedStream) return
    setSelectedStream(matchedStream)
    setSelectedSemester(nextExperimentCtx.semester)
    setSelectedSubject(nextExperimentCtx.subject)
    setSelectedUnit(nextExperimentCtx.unit)
    openExperiment(nextExperimentCtx.experiment)
  }

  // Arena Capability Engine (Phase 2/3) — GET /api/arena/capability/next-task
  // returns { task, taskSource, domain, ... }, where taskSource is one of
  // "existing_verified" | "generated" | "regenerated" | "fallback" (a real,
  // already-persisted, already-verified task in every case) or
  // "no_suitable_task" (task: null). Auto-opens the correct EXISTING
  // workstation for the returned task by handing its id straight to
  // openExperiment/openDomainMission — both already own "how do I open this
  // task" for their branch (each re-fetches full task detail itself from
  // exp.id/mission.id, the same persisted row regardless of how it was
  // produced), so this never duplicates that logic; it only decides WHICH of
  // the two existing openers to call, from `res.domain`. Checkpoint E fix:
  // this used to gate on `res.taskSource === "existing_verified"` only,
  // which silently discarded every real generated/regenerated/fallback task
  // as "no suitable task available" — the only real signal for "nothing to
  // open" is a missing `task`, regardless of source.
  // Deliberately additive: does not replace goToNextExperiment/
  // goToNextMission above — those keep working exactly as before.
  function goToCapabilityNextTask(domain, key) {
    if (!key || capabilityLoading) return
    setCapabilityLoading(true); setCapabilityError(null)
    arenaCapabilityApi.getNextTask({ domain, key })
      .then(res => {
        if (!isOpenableCapabilityTask(res)) {
          // An honest message — never a fabricated task.
          setCapabilityError(res.selectionReason || "No suitable task available right now.")
          return
        }
        if (res.domain === "college_stream") {
          setSelectedStream(matchedStream)
          openExperiment({ id: res.task.id })
        } else {
          if (domainMissions.length === 0) {
            arenaDomainRoleApi.listMissions(roleConfig.id).then(r => setDomainMissions(r.missions || [])).catch(() => {})
          }
          openDomainMission({ id: res.task.id })
        }
      })
      .catch(e => setCapabilityError(e.message || "Could not load a personalized task."))
      .finally(() => setCapabilityLoading(false))
  }

  // "Open Workspace" on the landing portal cards — lands straight on the
  // user's current/next task (matching the "task remains until finished"
  // rule) rather than a list. Falls back to the browse list when there's
  // nothing pending yet (new user, or all caught up with no next item).
  // "Open Workspace" now always lands on the LeetCode-style task grid (not
  // an auto-picked "next" task) — the student chooses which one to attempt,
  // per the explicit ask for a pick-your-own-problem layout on both
  // branches.
  function openProfessionalWorkspace() {
    openDomainMissions()
  }

  function openAcademicWorkspace() {
    if (matchedStream) {
      setSelectedStream(matchedStream)
      setLevel("streams")
      loadAllExperiments(matchedStream.slug)
    } else {
      openStreamsList()
    }
  }

  function openStreamsList() {
    setLevel("streams")
  }

  function openMatchedOrBrowse() {
    if (matchedStream) openStream(matchedStream)
    else openStreamsList()
  }

  function openStream(stream) {
    setSelectedStream(stream)
    setLoading(true); setError(null)
    arenaCollegeStreamApi.listSemesters(stream.slug)
      .then(res => { setSemesters(res.semesters || []); setLevel("semesters") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  function openSemester(semester) {
    setSelectedSemester(semester)
    setLoading(true); setError(null)
    arenaCollegeStreamApi.listSubjects(semester.id)
      .then(res => { setSubjects(res.subjects || []); setLevel("subjects") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  function openSubject(subject) {
    setSelectedSubject(subject)
    setLoading(true); setError(null)
    arenaCollegeStreamApi.listUnits(subject.id)
      .then(res => { setUnits(res.units || []); setLevel("units") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  function openUnit(unit) {
    setSelectedUnit(unit)
    setLoading(true); setError(null)
    arenaCollegeStreamApi.listExperiments(unit.id)
      .then(res => { setExperiments(res.experiments || []); setLevel("experiments") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  // "Back to experiments" from a result panel — for matched students, the
  // LeetCode-style grid (allExperiments) is already loaded in state, so
  // this is a same-tick state change with zero network round trip. Only
  // falls back to the slower openUnit() re-fetch for the unmatched-branch
  // nested drill-down, where there's no flat grid to return to.
  function backFromExperiment() {
    if (matchedStream) {
      setLevel("streams")
    } else if (selectedUnit) {
      openUnit(selectedUnit)
    } else {
      openStreamsList()
    }
  }

  function openExperiment(exp) {
    setAnswer(""); setResult(null); setSubmitError(null)
    setLoading(true); setError(null)
    arenaCollegeStreamApi.getExperiment(exp.id)
      .then(res => { setExperiment(res.experiment); setLevel("experiment") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  // Opening directly from the LeetCode-style grid (not the semester ->
  // subject -> unit drill-down) — reuses openExperiment as-is, just makes
  // sure selectedStream is set first so the breadcrumb still reads
  // sensibly ("Arena / Academic Workspace / {stream} / {problem}").
  function openExperimentFromGrid(exp) {
    if (matchedStream) setSelectedStream(matchedStream)
    openExperiment(exp)
  }

  function submitAnswer() {
    if (!answer.trim() || submitting) return
    setSubmitting(true); setSubmitError(null)
    arenaCollegeStreamApi.submit(experiment.id, answer.trim())
      .then(res => {
        setResult(res.submission)
        // Refresh the grid's lock states in the background on a pass —
        // without touching level/tab, so the result currently on screen
        // doesn't get yanked away.
        if (res.submission?.passed && matchedStream) loadAllExperiments(matchedStream.slug)
      })
      .catch(e => setSubmitError(e.message))
      .finally(() => setSubmitting(false))
  }

  // ── Domain branch handlers (Phase 2) ────────────────────────────────────
  function openDomainMissions() {
    setLevel("domainMissions")
    setDomainMainTab("workspace")
    setDomainLoading(true); setDomainError(null)
    arenaDomainRoleApi.listMissions(roleConfig.id)
      .then(res => setDomainMissions(res.missions || []))
      .catch(e => setDomainError(e.message))
      .finally(() => setDomainLoading(false))
  }

  function openDomainMission(mission) {
    setSql(""); setCode(""); setDomainResult(null); setDomainSubmitError(null); setMissionDeadline(null); setDomainMainTab("workspace")
    setValidateResult(null); setValidateError(null)
    setDomainLoading(true); setDomainError(null)
    arenaDomainRoleApi.getMission(mission.id)
      .then(res => {
        setDomainMission(res.mission)
        // Vision Reset: real Week-1 work means inheriting someone else's
        // (broken) code, not typing into a blank file — seed the editor
        // with the ticket's starter artifact when the mission has one.
        // Older missions generated before this schema have neither field,
        // and correctly fall back to an empty editor.
        if (res.mission?.starter_code) setCode(res.mission.starter_code)
        if (res.mission?.starter_query) setSql(res.mission.starter_query)
        setLevel("domainMission")
        // Deadline is a countdown display only (informational pressure) —
        // reaching zero does NOT block submission. "task remains until
        // finished" (the daily-quota rule) takes priority over a hard
        // per-attempt cutoff, which isn't part of what was asked for.
        if (res.mission?.time_limit_minutes) {
          setMissionDeadline(new Date(Date.now() + res.mission.time_limit_minutes * 60000).toISOString())
        }
      })
      .catch(e => setDomainError(e.message))
      .finally(() => setDomainLoading(false))
  }

  // Non-scoring preflight — same sandbox, never writes a submission, never
  // touches ELO/quota. Kept fully separate from submitSql below so a
  // preview run can never be confused with, or block, a real attempt.
  function validateSql() {
    if (!sql.trim() || validating) return
    setValidating(true); setValidateError(null); setValidateResult(null)
    arenaDomainRoleApi.validateMission(domainMission.id, sql.trim())
      .then(res => setValidateResult(res))
      .catch(e => setValidateError(e.message))
      .finally(() => setValidating(false))
  }

  function submitSql() {
    if (!sql.trim() || domainSubmitting) return
    setDomainSubmitting(true); setDomainSubmitError(null)
    setValidateResult(null); setValidateError(null) // clear the preview panel — the real scored result below takes over
    arenaDomainRoleApi.submitMission(domainMission.id, sql.trim())
      .then(res => {
        setDomainResult(res.submission)
        // A pass changes what the landing hero/quota AND the task grid's
        // lock states should show next time they're visited — refresh both
        // in the background (without touching level/tab, so the result the
        // student is looking at right now doesn't get yanked away).
        if (res.submission?.passed) {
          loadNextMission()
          arenaDomainRoleApi.listMissions(roleConfig.id).then(r => setDomainMissions(r.missions || [])).catch(() => {})
        }
      })
      .catch(e => {
        // Quota (429) and lock (409) are real, expected outcomes now that
        // submit enforces them server-side — surface the backend's own
        // message rather than a generic one.
        setDomainSubmitError(e.message)
      })
      .finally(() => setDomainSubmitting(false))
  }

  // Shared submit for every code-execution panel type (python_runner,
  // node_runner — identical state shape and behavior, just different
  // sandboxes server-side) — same shape/error handling as submitSql,
  // posts `code` under arenaDomainRoleApi.submitMission's existing `sql`
  // request field (the backend reads req.body.sql ?? req.body.code; the
  // API wrapper's own param name is just local naming, not a wire
  // format). Renamed from submitPython now that node_runner is the
  // second real caller — the body never actually branched on language.
  function submitCode() {
    if (!code.trim() || domainSubmitting) return
    setDomainSubmitting(true); setDomainSubmitError(null)
    arenaDomainRoleApi.submitMission(domainMission.id, code.trim())
      .then(res => {
        setDomainResult(res.submission)
        if (res.submission?.passed) {
          loadNextMission()
          arenaDomainRoleApi.listMissions(roleConfig.id).then(r => setDomainMissions(r.missions || [])).catch(() => {})
        }
      })
      .catch(e => setDomainSubmitError(e.message))
      .finally(() => setDomainSubmitting(false))
  }

  // The standard workspace prop contract (Phase 2.6, Task 1) — every
  // current/future Domain Role workspace receives exactly this shape via
  // <WorkspaceRenderer workspace={...}/>. Built once here since this is
  // where all the underlying state already lives; only accessed when
  // domainMission is set (see the render guard below), so it's safe to
  // construct unconditionally from current state.
  // state/actions/permissions branch by panel_type — each workspace type
  // owns its own field names/shape here (documented as intentional in
  // SqlWorkspace.jsx's own header: "state's own contents are
  // workspace-specific"). Not a switch statement in the registry-dispatch
  // sense (PANEL_REGISTRY/EXECUTION_REGISTRY/EVALUATION_REGISTRY are all
  // still plain lookups) — this is the one integration point translating
  // this page's own state into whichever shape the resolved workspace
  // component expects, same role getPanelMetadata() plays for `meta` above.
  const CODE_EXECUTION_PANEL_TYPES = new Set(["python_runner", "node_runner", "frontend_runner"])
  const isCodeExecution = CODE_EXECUTION_PANEL_TYPES.has(domainMission?.panel_type)
  const workspace = {
    mission: domainMission,
    submission: { result: domainResult, submitting: domainSubmitting, error: domainSubmitError },
    preview: { validateResult, validateError, validating },
    state: isCodeExecution ? { code, setCode } : { sql, setSql },
    actions: isCodeExecution
      ? { onSubmit: submitCode, onOpenMission: openDomainMission, onBackToMissions: openDomainMissions }
      : { onSubmit: submitSql, onPreview: validateSql, onOpenMission: openDomainMission, onBackToMissions: openDomainMissions },
    permissions: isCodeExecution
      ? { canSubmit: !!code.trim() && !domainSubmitting }
      : { canSubmit: !!sql.trim() && !domainSubmitting, canPreview: !!sql.trim() && !domainSubmitting && !validating },
    navigation: { missions: domainMissions },
    timer: { deadline: missionDeadline },
    // Optional shell-only extension point (Phase 3.0) — WorkspaceHeader
    // reads workspace.meta for its "Workspace Type" chip without shell/*
    // importing workspaces/panelMetadata.js itself; translated here at the
    // one integration point that's allowed to know about both worlds. See
    // shell/WorkspaceShell.jsx's header comment.
    meta: domainMission ? (() => {
      const panelMeta = getPanelMetadata(domainMission.panel_type)
      return { workspaceTypeLabel: panelMeta.workspace_title, workspaceTypeIcon: panelMeta.workspace_icon }
    })() : undefined,
  }

  // Landing isn't part of either branch's drill-down, so it gets a
  // one-crumb trail; the full trail only builds once the user is inside
  // a branch.
  const inStreamBranch = ["streams", "semesters", "subjects", "units", "experiments", "experiment"].includes(level)
  const inDomainBranch = ["domainMissions", "domainMission"].includes(level)
  const crumbs = [{ label: "Arena", level: "landing" }]
  if (inStreamBranch) {
    crumbs.push({ label: "Academic Workspace", level: "streams" })
    if (selectedStream) crumbs.push({ label: selectedStream.name, level: "semesters" })
    if (selectedSemester) crumbs.push({ label: `Semester ${selectedSemester.number}`, level: "subjects" })
    if (selectedSubject) crumbs.push({ label: selectedSubject.name, level: "units" })
    if (selectedUnit) crumbs.push({ label: selectedUnit.title, level: "experiments" })
    if (experiment) crumbs.push({ label: experiment.title, level: "experiment" })
  } else if (inDomainBranch) {
    crumbs.push({ label: domainLabel, level: "domainMissions" })
    if (domainMission) crumbs.push({ label: domainMission.title, level: "domainMission" })
  }

  // Jumping backward must clear every selection deeper than the target
  // level, not just the `level` string — otherwise a stale selectedStream/
  // selectedSemester/etc. stays set while the shallower level renders,
  // producing a contradictory UI (breadcrumb still shows the child crumb,
  // content underneath is the parent's). That mismatch was the actual bug
  // behind "the back button doesn't work."
  function jumpTo(index) {
    const target = crumbs[index].level
    if (target === "landing" || target === "streams") {
      setSelectedStream(null); setSelectedSemester(null); setSelectedSubject(null); setSelectedUnit(null); setExperiment(null)
    } else if (target === "semesters") {
      setSelectedSemester(null); setSelectedSubject(null); setSelectedUnit(null); setExperiment(null)
    } else if (target === "subjects") {
      setSelectedSubject(null); setSelectedUnit(null); setExperiment(null)
    } else if (target === "units") {
      setSelectedUnit(null); setExperiment(null)
    } else if (target === "experiments") {
      setExperiment(null)
    }
    if (target === "landing" || target === "domainMissions") {
      setDomainMission(null); setSql(""); setDomainResult(null); setDomainSubmitError(null); setMissionDeadline(null)
    }
    setLevel(target)
  }

  // Career Workspace refactor, Phase 4 — the workspace is no longer a
  // floating card inside the page's 1160px-max reading column. When it's
  // active, this component drops that constraint entirely (full browser
  // width, minimal chrome) — same "professional IDE, not a popup" goal
  // driving the Professional Workspace Shell itself. Every OTHER level
  // (landing, mission list, stream browsing) keeps the original centered
  // page layout unchanged.
  const isWorkspaceActive = domainMainTab === "workspace" && level === "domainMission" && !!domainMission

  // App.jsx's page-content wrapper (the real viewport-height owner) is
  // `calc(100vh - 56px)` — matching its 56px global header exactly — and is
  // itself a flex column. `minHeight: 0` (rather than the old, disconnected
  // `minHeight: "100vh"`) is what lets THIS div actually receive its share
  // of that already-correct height via `flex: 1` instead of independently
  // re-deriving the viewport and guaranteed-overflowing its parent by the
  // header's own height on every render. Only the workspace-active state
  // turns off this div's own scrolling (`overflowY: "hidden"`): once it's a
  // properly bounded flex child, WorkspaceShell's internal panels become the
  // one true scroll boundary, instead of this wrapper scrolling too.
  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: isWorkspaceActive ? "hidden" : "auto", fontFamily: BODY,
      display: "flex", flexDirection: "column",
      background: isWorkspaceActive ? T.cream : `radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 15%, rgba(99,102,241,0.07) 0%, transparent 50%), ${T.cream}`,
    }}>
      <div style={isWorkspaceActive
        ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "12px 20px 20px", boxSizing: "border-box" }
        : { maxWidth: 1800, margin: "0 auto", padding: "32px 40px 60px" }
      }>
        {!isWorkspaceActive && level !== "landing" && (
          <>
            <div style={{ fontSize: 30, fontWeight: 800, color: T.ink, marginBottom: 4, letterSpacing: -0.5 }}>
              Arena
            </div>
            <div style={{ fontSize: 14, color: T.ink4, marginBottom: 28 }}>
              {inDomainBranch
                ? `${domainLabel} tasks, generated for your profile.`
                : "Curriculum-aligned practice, scored instantly by rule — no AI involved."}
            </div>
          </>
        )}

        <Breadcrumb crumbs={crumbs} onJump={jumpTo} />
        {!isWorkspaceActive && level !== "landing" && crumbs.length > 1 && (
          <BackButton onClick={() => jumpTo(crumbs.length - 2)} label={crumbs[crumbs.length - 2].label} />
        )}

        {level === "landing" && (
          <>
            <div style={{ fontSize: 30, fontWeight: 800, color: T.ink, marginBottom: 6, letterSpacing: -0.5 }}>
              Arena
            </div>
            <div style={{ fontSize: 14, color: T.ink4, marginBottom: 26 }}>
              Choose where you want to practice today.
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <PortalCard
                variant="professional"
                subtitle={domainLabel}
                description="Real company work. AI-generated missions. Build recruiter-visible proof."
                quote="Practice the work you'll actually do after getting hired."
                backgroundWords={roleConfig?.auraSkills?.length ? roleConfig.auraSkills.slice(0, 7) : DEFAULT_PRO_WORDS}
                flowSteps={[
                  domainLabel,
                  ...(roleConfig?.auraSkills?.slice(0, 3) || []),
                  "Recruiter Ready",
                ]}
                onOpen={openProfessionalWorkspace}
              />
              <PortalCard
                variant="academic"
                subtitle={matchedStream?.name || (branch ? `${branch} (not matched)` : "Not set")}
                description="Semester-based labs. Experiments. Projects."
                quote="Master your curriculum while preparing for placements."
                backgroundWords={ACADEMIC_WORDS}
                flowSteps={["Semester", "Subject", "Unit", "Experiment", "Assessment"]}
                onOpen={openAcademicWorkspace}
              />
            </div>

            {streamsError && <ErrorRow message={streamsError} onRetry={loadStreams} />}
          </>
        )}

        {/* ── Domain branch (Phase 2) ─────────────────────────────────── */}
        {inDomainBranch && (
          <>
            <TopTabBar
              tabs={[
                { key: "workspace", label: "Workspace" },
                { key: "leaderboard", label: "Leaderboard" },
                { key: "history", label: "History" },
                { key: "streaks", label: "Streak" },
                { key: "achievements", label: "Achievements" },
                { key: "subscription", label: "Subscription" },
              ]}
              active={domainMainTab}
              onSelect={selectDomainMainTab}
            />

            {domainMainTab === "leaderboard" && (
              <LeaderboardPage
                items={leaderboardItems} loading={leaderboardLoading} label={domainLabel}
                window={leaderboardWindow} scope={leaderboardScope}
                onWindowChange={changeLeaderboardWindow} onScopeChange={changeLeaderboardScope}
              />
            )}

            {domainMainTab === "history" && (
              <HistoryPage label={domainLabel} history={domainHistory} />
            )}

            {domainMainTab === "streaks" && (
              <ActivitySection loading={activityLoading} summary={activitySummary} />
            )}

            {domainMainTab === "achievements" && (
              <AchievementsPanel
                elo={userData?.eloRating}
                completed={domainHistory.counts?.passed}
                failed={domainHistory.counts?.failed}
                totalAttempts={domainHistory.counts?.totalAttempts}
                hasCleanPass={domainHistory.counts?.hasCleanPass}
                hasFastPass={domainHistory.counts?.hasFastPass}
                streakCurrent={activitySummary?.streak?.current}
                streakLongest={activitySummary?.streak?.longest}
              />
            )}

            {domainMainTab === "subscription" && (
              <ArenaPlanTeaser
                currentPlan={userData?.subscription || "free"}
                onUpgrade={handleArenaUpgrade}
                upgradingPlan={upgradingPlan}
                error={upgradeError}
              />
            )}

            {/* Workspace tab = the current/next task with its timer only — no
                grid of every seeded mission. Missions still load quietly in
                the background (openDomainMissions/domainMissions) purely to
                power "Continue to next mission" sequencing inside
                SqlWorkspace after a pass; that's a non-blocking
                prefetch, not something worth its own error/loading UI. */}
            {domainMainTab === "workspace" && level === "domainMissions" && (
              <>
                <div style={{ marginBottom: 18 }}>
                  <ProfessionalWorkspaceCard
                    domainLabel={domainLabel}
                    skills={roleConfig?.auraSkills}
                    loading={nextMissionLoading}
                    mission={nextMission}
                    meta={nextMissionMeta}
                    quota={nextMissionQuota}
                    planLabel={planLabel}
                    onContinue={goToNextMission}
                    onPersonalizedPick={() => goToCapabilityNextTask("domain_role", roleConfig?.id)}
                    personalizedLoading={capabilityLoading}
                    personalizedError={capabilityError}
                  />
                </div>
                <Eyebrow color={T.ink3}>{domainLabel} Problems</Eyebrow>
                <div style={{ fontSize: 12, color: T.ink3, marginBottom: 12 }}>
                  Pick any mission below. Once passed it locks — no resubmitting a completed task.
                </div>
                {domainError && <ErrorRow message={domainError} onRetry={openDomainMissions} />}
                <TaskGrid
                  items={domainMissions}
                  accent={T.indigo}
                  loading={domainLoading}
                  quotaLocked={!!nextMissionQuota?.nextUnlockAt}
                  quotaLockedReason="Daily quota reached — locked until it resets."
                  onOpen={openDomainMission}
                  emptyMessage={`No ${domainLabel} missions seeded yet.`}
                />
              </>
            )}

            {isWorkspaceActive && (
              // Was `height: calc(100vh - 90px)` — a guessed constant that
              // didn't match the real 56px global header (see App.jsx) and
              // never accounted for the breadcrumb/padding above it, so the
              // box was sized independently of its actual available space.
              // `flex: 1` instead lets it consume exactly what's left in the
              // now-correct flex chain above; `minHeight: 560` keeps the same
              // small-viewport floor the previous code already had.
              <div style={{ flex: 1, minHeight: 560 }}>
                <WorkspaceShell workspace={workspace} userId={user?.id}>
                  <WorkspaceRenderer workspace={workspace} />
                </WorkspaceShell>
              </div>
            )}
          </>
        )}

        {/* ── Stream branch (Phase 1) ─────────────────────────────────── */}
        {inStreamBranch && selectedStream && (
          <TopTabBar
            tabs={[
              { key: "workspace", label: "Workspace" },
              { key: "history", label: "History" },
              { key: "leaderboard", label: "Leaderboard" },
              { key: "streaks", label: "Streak" },
            ]}
            active={streamMainTab}
            onSelect={selectStreamMainTab}
          />
        )}

        {selectedStream && streamMainTab === "leaderboard" && (
          <LeaderboardPage items={streamLeaderboardItems} loading={streamLeaderboardLoading} label={selectedStream.name} />
        )}

        {selectedStream && streamMainTab === "history" && (
          <HistoryPage label={selectedStream.name} history={streamHistory} />
        )}

        {selectedStream && streamMainTab === "streaks" && (
          <ActivitySection loading={activityLoading} summary={activitySummary} />
        )}

        {(!selectedStream || streamMainTab === "workspace") && (
          <>
        {error && <ErrorRow message={error} onRetry={() => window.location.reload()} />}
        {loading && <LoadingRow />}

        {/* Students already picked their stream at account creation
            (userData.branch -> matchedStream), so this is their fixed
            Academic Workspace — not a directory to browse everyone else's
            streams. The full streams grid only makes sense as a fallback
            for the handful of branches with no mapped stream row at all
            (IoT/Pharmacy/Other — see BRANCH_TO_STREAM_SLUG), where there's
            genuinely no fixed destination to send them to. */}
        {!loading && !error && level === "streams" && (
          <>
            {/* Matched students land straight on the task grid below — the
                old summary card duplicated "today's task" info the grid
                already shows per-card, so it's only kept for the unmatched-
                branch fallback where there's no fixed stream to grid yet. */}
            {!matchedStream && (
              <div style={{ marginBottom: 18 }}>
                <CollegeWorkspaceCard
                  streamName={matchedStream?.name}
                  branch={branch}
                  loading={streamsLoading || nextExperimentLoading}
                  next={nextExperimentCtx}
                  meta={nextExperimentMeta}
                  onContinue={goToNextExperiment}
                  onBrowse={openMatchedOrBrowse}
                  onPersonalizedPick={matchedStream ? () => goToCapabilityNextTask("college_stream", matchedStream.slug) : undefined}
                  personalizedLoading={capabilityLoading}
                  personalizedError={capabilityError}
                />
              </div>
            )}
            {!matchedStream && (
              streamsLoading ? <LoadingRow /> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {streams.map(s => (
                    <GridCard key={s.id} onClick={() => openStream(s)} accent={T.green}>
                      <div style={{ fontWeight: 700, color: T.ink }}>{s.name}</div>
                    </GridCard>
                  ))}
                </div>
              )
            )}

            {/* LeetCode-style problem list — every experiment in the
                matched stream, flat, with real solved/locked state.
                Replaces drilling through semester -> subject -> unit as
                the primary way in; that nested path still exists for the
                unmatched-branch browse fallback above. */}
            {matchedStream && (
              <>
                <Eyebrow color={T.green}>{matchedStream.name} Problems</Eyebrow>
                <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span>Pick any experiment below. Once passed it locks — no resubmitting a completed one.</span>
                  <button
                    onClick={() => goToCapabilityNextTask("college_stream", matchedStream.slug)}
                    disabled={capabilityLoading}
                    style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${T.green}`, background: "transparent", color: T.green, fontWeight: 700, fontFamily: BODY, cursor: capabilityLoading ? "default" : "pointer", fontSize: 11 }}
                  >
                    🎯 {capabilityLoading ? "Finding…" : "Get my personalized pick"}
                  </button>
                </div>
                {capabilityError && <div style={{ fontSize: 12, color: T.red || "#DC2626", marginBottom: 8 }}>{capabilityError}</div>}

                {/* Category filter — only real categories that currently
                    have at least one experiment are shown, so every chip
                    actually does something (no decorative filters that
                    lead to an empty grid). */}
                {(() => {
                  const presentCategories = [...new Set(allExperiments.map(e => e.category).filter(Boolean))]
                  if (presentCategories.length < 2) return null
                  const orderedNames = streamCategories.map(c => c.name)
                  const sorted = [...presentCategories].sort((a, b) => {
                    const ia = orderedNames.indexOf(a), ib = orderedNames.indexOf(b)
                    if (ia === -1 && ib === -1) return a.localeCompare(b)
                    if (ia === -1) return 1
                    if (ib === -1) return -1
                    return ia - ib
                  })
                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      <button
                        onClick={() => setActiveCategory(null)}
                        style={{
                          padding: "6px 14px", borderRadius: 20, border: `1px solid ${T.border}`, cursor: "pointer",
                          fontFamily: BODY, fontSize: 12, fontWeight: 700,
                          background: !activeCategory ? T.green : T.cream2,
                          color: !activeCategory ? "#fff" : T.ink3,
                        }}
                      >
                        All
                      </button>
                      {sorted.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          style={{
                            padding: "6px 14px", borderRadius: 20, border: `1px solid ${T.border}`, cursor: "pointer",
                            fontFamily: BODY, fontSize: 12, fontWeight: 700,
                            background: activeCategory === cat ? T.green : T.cream2,
                            color: activeCategory === cat ? "#fff" : T.ink3,
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )
                })()}

                <TaskGrid
                  items={allExperiments
                    .filter(e => !activeCategory || e.category === activeCategory)
                    .map(e => ({ ...e, subtitle: e.category || e.subject_name }))}
                  accent={T.green}
                  loading={allExperimentsLoading}
                  onOpen={openExperimentFromGrid}
                  emptyMessage={`No experiments seeded yet for ${matchedStream.name}.`}
                />
              </>
            )}
          </>
        )}

        {!loading && !error && level === "semesters" && (
          semesters.length === 0
            ? <div style={{ color: T.ink3, fontSize: 14, padding: 20 }}>No semesters seeded for {selectedStream?.name} yet.</div>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {semesters.map(sem => (
                  <GridCard key={sem.id} onClick={() => openSemester(sem)} accent={T.green}>
                    <div style={{ fontWeight: 700, color: T.ink }}>Semester {sem.number}</div>
                  </GridCard>
                ))}
              </div>
            )
        )}

        {!loading && !error && level === "subjects" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {subjects.map(sub => (
              <GridCard key={sub.id} onClick={() => openSubject(sub)} accent={T.green}>
                <div style={{ fontWeight: 700, color: T.ink }}>{sub.name}</div>
              </GridCard>
            ))}
          </div>
        )}

        {!loading && !error && level === "units" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {units.map(u => (
              <GridCard key={u.id} onClick={() => openUnit(u)} accent={T.green}>
                <div style={{ fontWeight: 700, color: T.ink }}>{u.title}</div>
              </GridCard>
            ))}
          </div>
        )}

        {!loading && !error && level === "experiments" && (
          experiments.length === 0
            ? <div style={{ color: T.ink3, fontSize: 14, padding: 20 }}>No experiments in this unit yet.</div>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {experiments.map(exp => (
                  <GridCard key={exp.id} onClick={() => openExperiment(exp)} accent={T.green}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, color: T.ink }}>{exp.title}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: MONO, fontSize: 11, marginTop: 8 }}>
                      <span style={{ color: DIFFICULTY_COLOR[exp.difficulty] || T.ink3, fontWeight: 700, textTransform: "uppercase" }}>
                        {exp.difficulty}
                      </span>
                      <span style={{ color: T.indigo, fontWeight: 700 }}>+{exp.elo_reward} ELO</span>
                    </div>
                  </GridCard>
                ))}
              </div>
            )
        )}

        {!loading && !error && level === "experiment" && experiment && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Problem statement */}
              <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
                <Eyebrow color={T.ink3}>Problem Statement</Eyebrow>
                <div style={{ fontSize: 16, lineHeight: 1.6, color: T.ink }}>{experiment.prompt}</div>
              </div>

              {/* Answer editor — code editor styling for code-execution
                  challenges (isCodeChallenge, run through the Python
                  sandbox), plain short-answer input otherwise. */}
              {!result && (
                <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
                  <Eyebrow color={T.ink3}>{experiment.isCodeChallenge ? "Your Code" : "Your Answer"}</Eyebrow>
                  {experiment.isCodeChallenge && (
                    <div style={{ fontSize: 12, lineHeight: 1.55, color: T.ink2, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                      This is a real Python interpreter, not a quiz box. Write working code and call <code style={{ fontFamily: MONO, background: T.ink, color: "#E8E8E1", padding: "1px 5px", borderRadius: 4 }}>print()</code> for every value the problem asks for — your score comes only from what your program prints, not from logic that "would" be correct. Before you submit, re-read the problem statement and check your printed output matches the expected format exactly (spacing, line breaks, capitalization).
                    </div>
                  )}
                  <textarea
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder={experiment.isCodeChallenge ? "# Write your Python code here — use print() to show your answer" : "Type your answer…"}
                    rows={experiment.isCodeChallenge ? 10 : 4}
                    spellCheck={false}
                    disabled={submitting}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`,
                      fontFamily: experiment.isCodeChallenge ? MONO : BODY, fontSize: 13.5, resize: "vertical", marginBottom: 12, boxSizing: "border-box",
                      background: experiment.isCodeChallenge ? T.ink : T.cream,
                      color: experiment.isCodeChallenge ? "#E8E8E1" : T.ink,
                      tabSize: 4,
                    }}
                  />
                  {experiment.isCodeChallenge && (
                    <div style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>
                      Runs in a sandboxed process — file, network, and system access are disallowed. Output is compared as exact text, so a right answer with no print() or extra debug prints will still fail.
                    </div>
                  )}
                  {submitError && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{submitError}</div>}
                  <button
                    onClick={submitAnswer}
                    disabled={!answer.trim() || submitting}
                    style={{
                      padding: "10px 20px", borderRadius: 10, border: "none",
                      background: !answer.trim() || submitting ? T.border : T.indigo,
                      color: !answer.trim() || submitting ? T.ink3 : "#fff",
                      fontWeight: 700, fontFamily: BODY, cursor: !answer.trim() || submitting ? "default" : "pointer",
                    }}
                  >
                    {submitting ? (experiment.isCodeChallenge ? "Running…" : "Checking…") : (experiment.isCodeChallenge ? "Run & Submit" : "Submit Answer")}
                  </button>
                </div>
              )}

              {/* Result — matches the Professional workspace's output treatment */}
              {result && (
                <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <Eyebrow color={result.passed ? T.green : T.red}>
                      {result.passed ? "Correct" : "Not Quite — Try the Next Attempt Carefully"}
                    </Eyebrow>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <StatChip label="Result" value={result.passed ? "Passed" : "Failed"} />
                      <StatChip label="Score" value={`${result.score}/100`} />
                      <StatChip label="ELO" value={result.elo_delta > 0 ? `+${result.elo_delta}` : result.elo_delta} />
                    </div>
                  </div>

                  {result.execution_output && (
                    <div>
                      <Eyebrow color={T.ink3}>Program Output</Eyebrow>
                      {result.execution_output.error && (
                        <div style={{ fontSize: 12, color: T.red, marginBottom: 6 }}>{result.execution_output.error}</div>
                      )}
                      <pre style={{ margin: 0, padding: 12, background: T.ink, color: "#E8E8E1", borderRadius: 8, fontFamily: MONO, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                        {result.execution_output.stdout || "(no output)"}
                      </pre>
                      {result.execution_output.stderr && (
                        <pre style={{ margin: "8px 0 0", padding: 12, background: T.red2, color: T.red, borderRadius: 8, fontFamily: MONO, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                          {result.execution_output.stderr}
                        </pre>
                      )}
                    </div>
                  )}

                  {result.ai_feedback && (
                    <div style={{ background: T.indigo3, borderRadius: 10, padding: 14 }}>
                      <Eyebrow color={T.indigo}>🤖 AI Coach</Eyebrow>
                      <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{result.ai_feedback}</div>
                    </div>
                  )}

                  <div style={{ paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                    <button
                      onClick={backFromExperiment}
                      style={{ background: "none", border: "none", color: T.ink4, fontWeight: 700, cursor: "pointer", fontFamily: BODY, fontSize: 13, padding: 0 }}
                    >
                      ← Back to experiments
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Meta sidebar — mirrors the Professional workspace's mission-info panel */}
            <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, boxShadow: T.shadow, height: "fit-content" }}>
              <Eyebrow color={T.ink3}>Experiment</Eyebrow>
              <div style={{ fontWeight: 700, color: T.ink, fontSize: 15, marginBottom: 12 }}>{experiment.title}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: MONO, fontSize: 11, marginBottom: 12 }}>
                <span style={{
                  padding: "3px 9px", borderRadius: 20, background: T.cream,
                  color: DIFFICULTY_COLOR[experiment.difficulty] || T.ink3, fontWeight: 700, textTransform: "uppercase",
                }}>
                  {experiment.difficulty}
                </span>
                <span style={{ color: T.indigo, fontWeight: 700 }}>+{experiment.elo_reward} ELO</span>
              </div>
              <div style={{ fontSize: 12, color: T.ink4, lineHeight: 1.5 }}>Scored deterministically against the rubric — AI adds explanation only, never the verdict.</div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
