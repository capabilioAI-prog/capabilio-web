/**
 * SkillStudioShell — Skill Studio V2 top-level shell.
 * ---------------------------------------------------------------------------
 * Same (user, userData) prop contract as the legacy pages/SkillStudio.jsx so
 * App.jsx can swap between them behind FLAGS.skill_studio_v2 with zero other
 * changes (spec Phase 6 rollback path — legacy stays reachable).
 *
 * Owns top-level view state: home | graph | journey | module. Deliberately
 * NOT a react-router route tree — this app is a currentPage-string SPA
 * (see App.jsx), so Skill Studio's own internal navigation is local state,
 * consistent with how the rest of the app already works.
 */
import { useState, useCallback } from "react"
import { getRoleConfig, resolveArenaKey } from "../config/roleConfig"
import { D, FONT } from "./tokens"
import LearningHome from "./LearningHome"
import SkillGraphView from "./SkillGraphView"
import SkillJourneyPage from "./SkillJourneyPage"
import ModuleRuntime from "./ModuleRuntime"
import { skillStudioV2Api } from "../lib/api"

export default function SkillStudioShell({ userData, onNavigate }) {
  const [view, setView] = useState("home")
  const [activeJourney, setActiveJourney] = useState(null)
  const [moduleRequest, setModuleRequest] = useState(null)
  const [recommendations, setRecommendations] = useState([])

  const jobTitle = getRoleConfig(userData).label
  const domainKey = resolveArenaKey(jobTitle)

  const refreshRecs = useCallback(async () => {
    try {
      const { recommendations } = await skillStudioV2Api.recommendations()
      setRecommendations(recommendations || [])
    } catch {
      // Home surface already falls back to its own last-good snapshot
      // server-side (spec §27) — nothing to do here beyond leaving the rail empty.
    }
  }, [])

  async function openJourney(journey) {
    if (!journey.id) {
      // Came from a Skill Graph node or a recommendation with no journey yet
      // — create the real journey row before entering it, rather than
      // rendering a journey page backed by nothing.
      try {
        const { journey: created, node } = await skillStudioV2Api.createJourney(
          journey.skill_graph_nodes?.label, journey.skill_graph_nodes?.domain_key, journey.target_role
        )
        setActiveJourney({ ...created, skill_graph_nodes: node })
      } catch {
        return
      }
    } else {
      setActiveJourney(journey)
    }
    setView("journey")
    refreshRecs()
  }

  function openModule(request) {
    setModuleRequest({ ...request, domainKey: request.domainKey || domainKey, jobTitle })
    setView("module")
  }

  return (
    <div style={{
      background: `radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.10), transparent 60%), ${D.void}`,
      minHeight: "100%", height: "100%", overflowY: "auto", fontFamily: FONT,
      padding: "24px 24px 60px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {view === "home" && (
          <LearningHome jobTitle={jobTitle} domainKey={domainKey} onOpenJourney={openJourney} onOpenGraph={() => setView("graph")} />
        )}
        {view === "graph" && (
          <div>
            <button onClick={() => setView("home")} style={{ fontSize: 11, color: D.muted, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>← Learning Home</button>
            <SkillGraphView domainKey={domainKey} onSelectNode={(node) => openJourney({ id: null, skill_graph_nodes: node, target_role: jobTitle })} />
          </div>
        )}
        {view === "journey" && activeJourney && (
          <SkillJourneyPage journey={activeJourney} jobTitle={jobTitle} onOpenModule={openModule} onBack={() => setView("home")} recommendations={recommendations} />
        )}
        {view === "module" && moduleRequest && (
          <ModuleRuntime moduleRequest={moduleRequest} onExitToJourney={() => setView("journey")} recommendations={recommendations} />
        )}
      </div>
    </div>
  )
}
