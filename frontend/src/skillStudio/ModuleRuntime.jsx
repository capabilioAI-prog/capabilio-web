/**
 * ModuleRuntime — the module experience (spec §21). Composes: overview + AI
 * explanation, visuals, playground, tutor, adaptive quiz, memory touchpoint,
 * Arena gate, interview gate, evidence summary, next-step CTA.
 *
 * props:
 *   moduleRequest: { skillGraphNodeId, skillJourneyId, skillName, skillLabel,
 *                    domainKey, jobTitle, level }
 *   onExitToJourney()
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, cardStyle } from "./tokens"
import { FLAGS } from "../config/featureFlags"
import AIExplainPanel from "./AIExplainPanel"
import TutorPanel from "./TutorPanel"
import QuizPanel from "./QuizPanel"
import InterviewGatePanel from "./InterviewGatePanel"
import NextSkillPanel from "./NextSkillPanel"
import RevisePanel from "./RevisePanel"
import WatchPanel from "./WatchPanel"

// Visual, Playground, Memory, Arena, and Evidence tabs removed 2026-07-30 —
// Visual had no real diagram generation (static "no diagram yet" placeholder
// for every module), and the other three weren't delivering working content
// either. Kept: Learn, Tutor, Quiz, Interview. Revise added 2026-07-30
// (Phase 1 part B) — real cached content from module_revision_content, not a
// placeholder. Watch added 2026-07-30 (Phase 2a) — real narrated walkthrough
// from module_narration, behind FLAGS.skill_studio_video (see below, built
// with the tab list dynamically rather than statically so it can be turned
// off independently of the rest of Skill Studio V2). If any of the removed
// tabs are rebuilt with real functioning content later, re-add the tab entry
// + panel import.
const BASE_TABS = [
  { id: "learn", label: "Learn" },
  { id: "tutor", label: "Tutor" },
  { id: "quiz", label: "Quiz" },
  { id: "revise", label: "Revise" },
  { id: "interview", label: "Interview" },
]

export default function ModuleRuntime({ moduleRequest, onExitToJourney, recommendations = [] }) {
  const [level, setLevel] = useState(moduleRequest.level || "intermediate")
  const [mode, setMode] = useState("intermediate")
  const [module, setModule] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [activeTab, setActiveTab] = useState("learn")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quizPassed, setQuizPassed] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [remedial, setRemedial] = useState(null)
  const [remedialLoading, setRemedialLoading] = useState(false)
  const [remedialError, setRemedialError] = useState(null)

  const generate = useCallback(async (nextLevel, nextMode) => {
    setLoading(true); setError(null)
    try {
      const result = await skillStudioV2Api.generateModule({
        skillName: moduleRequest.skillName,
        skillGraphNodeId: moduleRequest.skillGraphNodeId,
        skillJourneyId: moduleRequest.skillJourneyId,
        jobTitle: moduleRequest.jobTitle,
        level: nextLevel, teachingMode: nextMode,
      })
      setModule(result.module)
      setBlocks(result.blocks || [])
      await skillStudioV2Api.startModule(result.module.id)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [moduleRequest.skillName, moduleRequest.skillGraphNodeId, moduleRequest.skillJourneyId, moduleRequest.jobTitle])

  useEffect(() => { generate(level, mode) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function changeMode(nextMode) {
    setMode(nextMode)
    generate(level, nextMode)
  }

  async function completeModule(result) {
    if (!module) return
    const score = result?.score ?? quizPassed?.score ?? 0
    const passed = result?.passed ?? quizPassed?.passed ?? false
    const sessionId = result?.sessionId ?? quizPassed?.sessionId ?? null
    try {
      // sessionId lets the server recompute score/passed from quiz_attempts
      // itself (quizEngine.getSessionResult) instead of trusting these
      // client-sent values — see POST /modules/:id/complete's 2026-07-30 fix.
      const completion = await skillStudioV2Api.completeModule(module.id, { sessionId, quizScore: score, passed })
      // Evidence tab was removed (2026-07-30) — there's nowhere left to route
      // to, so just surface a completion banner in place instead of switching
      // to a tab that no longer renders anything.
      setCompleted(true)
      // Server is authoritative: if it disagreed with the client's "passed"
      // guess (e.g. stale state), reflect that back into quizPassed/missedTopics
      // so the remedial-regeneration UI stays consistent with what actually happened.
      setQuizPassed((prev) => ({ ...prev, score: completion.quizScore, passed: completion.passed, missedTopics: completion.missedTopics }))
    } catch (e) {
      setError(e.message)
    }
  }

  // Phase 1 part C: on a failed session, fetch ONE targeted remedial
  // supplement (extra explanation + example aimed at the missed topics)
  // instead of just telling the learner to "revisit" the same static content.
  // Never persisted server-side — regenerated fresh each time it's requested.
  const fetchRemedial = useCallback(async (missedTopics) => {
    if (!module) return
    setRemedialLoading(true); setRemedialError(null)
    try {
      const { supplement } = await skillStudioV2Api.moduleRemedial(module.id, { missedTopics })
      setRemedial(supplement)
    } catch (e) {
      setRemedialError(e.message)
    }
    setRemedialLoading(false)
  }, [module])

  if (loading && !module) {
    return <div style={{ padding: 40, textAlign: "center", color: D.muted, fontSize: 13 }}>Assembling your module…</div>
  }

  if (error && !module) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ color: D.rose, fontSize: 13, marginBottom: 10 }}>Couldn&apos;t generate this module: {error}</div>
        <button onClick={() => generate(level, mode)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${D.border}`, background: D.glass, cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
      </div>
    )
  }

  const skillLabel = moduleRequest.skillLabel || moduleRequest.skillName
  // Watch tab inserted right after Learn when the flag is on — placed there
  // (not at the end) since it's an alternate way to consume the SAME lesson
  // content Learn shows, not a separate downstream step like Quiz/Interview.
  const TABS = FLAGS.skill_studio_video
    ? [BASE_TABS[0], { id: "watch", label: "Watch" }, ...BASE_TABS.slice(1)]
    : BASE_TABS

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <button onClick={onExitToJourney} style={{ fontSize: 11, color: D.muted, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 4 }}>← Back to journey</button>
          <div style={{ fontSize: 20, fontWeight: 900, color: D.text1 }}>{skillLabel}</div>
        </div>
        <select value={level} onChange={(e) => { setLevel(e.target.value); generate(e.target.value, mode) }} style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${D.border}`, fontSize: 11, fontFamily: "inherit" }}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap", background: D.glass, borderRadius: 12, padding: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "7px 12px", borderRadius: 9, border: "none",
            background: activeTab === t.id ? D.indigo + "20" : "transparent",
            color: activeTab === t.id ? D.indigo : D.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 20, minHeight: 260 }}>
        {activeTab === "learn" && <AIExplainPanel contentBlocks={blocks} mode={mode} onModeChange={changeMode} />}
        {activeTab === "watch" && FLAGS.skill_studio_video && (
          <WatchPanel moduleId={module.id} diagramSpec={blocks.find((b) => b.block_type === "diagram_spec")?.content} />
        )}
        {activeTab === "tutor" && <TutorPanel skillLabel={skillLabel} moduleOverview={blocks.find((b) => b.block_type === "overview")?.content} />}
        {activeTab === "quiz" && (
          <QuizPanel skillGraphNodeId={moduleRequest.skillGraphNodeId} skillLabel={skillLabel} moduleId={module.id}
            onSessionComplete={(result) => {
              setQuizPassed(result)
              setRemedial(null)
              if (result.passed) {
                completeModule(result)
              } else {
                // QuizPanel's client-side result only carries score/passed/
                // sessionId, not the missed-topic prompts (those live in
                // quiz_attempts server-side, see quizEngine.getSessionResult).
                // The remedial route tolerates an empty missedTopics array
                // (falls back to a general targeted-review supplement), so
                // this is a safe request even without that detail.
                fetchRemedial([])
              }
            }} />
        )}
        {activeTab === "revise" && (
          <RevisePanel moduleId={module.id} skillLabel={skillLabel} jobTitle={moduleRequest.jobTitle} level={level} />
        )}
        {activeTab === "interview" && <InterviewGatePanel moduleId={module.id} skillLabel={skillLabel} domainKey={moduleRequest.domainKey} />}
      </div>

      {completed && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: D.indigo + "12", color: D.indigo, fontSize: 12, fontWeight: 700 }}>
          ✓ Module completed — quiz score {quizPassed?.score ?? 0}%.
        </div>
      )}

      {quizPassed && !quizPassed.passed && !completed && (
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: D.amber + "12", border: `1px solid ${D.amber}33` }}>
          <div style={{ fontSize: 12, color: D.amber, fontWeight: 700, marginBottom: 6 }}>
            Quiz score was below the 80% pass mark — here's a targeted follow-up before you retry.
          </div>
          {remedialLoading && <div style={{ fontSize: 12, color: D.muted }}>Preparing a targeted example…</div>}
          {remedialError && <div style={{ fontSize: 12, color: D.rose }}>{remedialError}</div>}
          {remedial?.extra_explanation && (
            <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.6, marginBottom: 8 }}>{remedial.extra_explanation}</div>
          )}
          {remedial?.extra_example?.scenario && (
            <div style={{ fontSize: 12, color: D.text1 }}>
              <strong>{remedial.extra_example.scenario}</strong>
              {remedial.extra_example.walkthrough && (
                <div style={{ color: D.text2, marginTop: 4, whiteSpace: "pre-wrap" }}>{remedial.extra_example.walkthrough}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <NextSkillPanel recommendations={recommendations} title="What's Next" />
      </div>
    </div>
  )
}
