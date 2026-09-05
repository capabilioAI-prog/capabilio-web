/**
 * SkillJourneyPage — the "course page" replacement (spec §2). One skill's
 * full lifecycle: overview, module entry point, Arena bridge, evidence
 * trail, next-skill recommendation.
 */
import { D, cardStyle, sectionLabel } from "./tokens"
import EvidencePanel from "./EvidencePanel"
import NextSkillPanel from "./NextSkillPanel"

export default function SkillJourneyPage({ journey, jobTitle, onOpenModule, onBack, recommendations = [] }) {
  const node = journey.skill_graph_nodes || {}
  const skillLabel = node.label || "Skill"

  return (
    <div>
      <button onClick={onBack} style={{ fontSize: 11, color: D.muted, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 10 }}>← Learning Home</button>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: D.text1 }}>{skillLabel}</div>
        <div style={{ fontSize: 13, color: D.text2, marginTop: 4 }}>
          Target role: {journey.target_role || jobTitle || "your career track"}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 20 }}>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Skill Journey</div>
        <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, marginBottom: 16 }}>
          A living module for {skillLabel} — adaptive explanation, practice, a quiz that adapts to what you get
          wrong, and a memory system that brings this back before you forget it.
        </p>
        <button onClick={() => onOpenModule({
          skillGraphNodeId: node.id, skillJourneyId: journey.id, skillName: skillLabel,
          skillLabel, domainKey: node.domain_key, jobTitle,
        })} style={{
          padding: "10px 20px", borderRadius: 12, border: "none", background: D.indigo, color: "#fff",
          fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>Start Module</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <EvidencePanel skillLabel={skillLabel} />
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <NextSkillPanel recommendations={recommendations} />
        </div>
      </div>
    </div>
  )
}
