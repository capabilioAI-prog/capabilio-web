import { A, familyFor } from "./tokens"

/** EvidencePanel — reinforces Arena's purpose as PROOF, not learning
 *  (spec §24). Every bullet is a real backend field (skill,
 *  competency_area) — never fabricated claims about what the challenge
 *  tests. */
export default function EvidencePanel({ challenge }) {
  const family = familyFor(challenge.challenge_type)
  return (
    <div style={{ background: family.bg, borderRadius: A.radiusSm, padding: "14px 16px", marginTop: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: family.accent, textTransform: "uppercase", marginBottom: 8 }}>
        This mission evidences
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        <li style={{ fontSize: 13, color: A.ink, fontWeight: 600 }}>{challenge.skill}</li>
        <li style={{ fontSize: 12.5, color: A.ink3 }}>{challenge.competency_area}</li>
      </ul>
    </div>
  )
}
