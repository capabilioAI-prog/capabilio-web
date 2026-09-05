import { useState } from "react"
import { A } from "./tokens"

/**
 * StreamPicker — shown exactly once, only when profiles.stream_id is
 * still null (spec §5). After this one selection, the stream is
 * authoritative and server-resolved for every future Arena request —
 * this component never appears again for this student.
 */
export default function StreamPicker({ streams, onSelect }) {
  const [selecting, setSelecting] = useState(null)

  async function handleSelect(streamId) {
    if (selecting) return
    setSelecting(streamId)
    try {
      await onSelect(streamId)
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: A.ink, marginBottom: 6 }}>Select your stream</div>
      <div style={{ fontSize: 14, color: A.ink3, marginBottom: 24 }}>
        This is a one-time selection — your Arena Common Challenges are drawn from your stream every week from now on.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {streams.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            disabled={!!selecting}
            style={{
              padding: "16px 14px", borderRadius: A.radius, border: `1.5px solid ${A.border}`, background: A.card,
              textAlign: "left", cursor: selecting ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: selecting && selecting !== s.id ? 0.5 : 1,
              boxShadow: A.shadow,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: A.ink }}>{s.name}</div>
            {selecting === s.id && <div style={{ fontSize: 11, color: A.indigo, marginTop: 4 }}>Saving…</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
