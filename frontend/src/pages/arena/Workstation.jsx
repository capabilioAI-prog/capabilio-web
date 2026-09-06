import { lazy, Suspense, useState, useEffect } from "react"
import { A, familyFor } from "./tokens"

// Lazy — a real code editor is heavy; only the coding/SQL workstation
// types ever need it (spec §37: lazy-load heavy workstation components).
const CodeMirror = lazy(() => import("@uiw/react-codemirror"))

async function loadJsLang() { return (await import("@codemirror/lang-javascript")).javascript() }
async function loadSqlLang() { return (await import("@codemirror/lang-sql")).sql() }

// Re-exported so existing `import { getInitialResponse } from "./Workstation"`
// call sites don't need to change — the implementation itself lives in
// workstationDefaults.js (plain .js, no JSX) so it can be unit-tested
// directly with node:test, which cannot parse this file's JSX.
export { getInitialResponse } from "./workstationDefaults.js"
import { getResponseFields, buildAnswerUpdate } from "./workstationDefaults.js"

/**
 * Workstation — the primary, 80%-of-the-screen work surface (spec §20-21).
 * Dispatches on workstation_type to a genuinely distinct interface per
 * type — never the same textarea+Submit for everything.
 */
export default function Workstation({ challenge, value, onChange }) {
  const family = familyFor(challenge.challenge_type)

  switch (challenge.workstation_type) {
    case "coding":
      return <CodeEditorPanel language="javascript" code={value.code || ""} onCodeChange={(code) => onChange({ ...value, code, language: "javascript" })} />
    case "sql":
      return <CodeEditorPanel language="sql" code={value.sql || ""} onCodeChange={(sql) => onChange({ ...value, sql })} />
    case "calculation":
      return <CalculationPanel family={family} numericValue={value.numericValue || ""} onChange={(numericValue) => onChange({ ...value, numericValue })} />
    default:
      // structured_response / decision / log_investigation render one
      // control per the challenge's own response_schema (spec §19) —
      // a diagnosis mission declares exactly the fields its finding needs
      // (e.g. "diagnosis" + "cause" as selects); anything else falls back
      // to a generic answer/reasoning pair.
      return (
        <DecisionPanel
          family={family}
          workstationType={challenge.workstation_type}
          fields={getResponseFields(challenge)}
          answers={value.answers || {}}
          onFieldChange={(key, fieldValue) => onChange(buildAnswerUpdate(value, key, fieldValue))}
        />
      )
  }
}

function TerminalFrame({ label, children }) {
  return (
    <div style={{ borderRadius: A.radiusSm, overflow: "hidden", border: "1px solid #26263A", boxShadow: A.shadow }}>
      <div style={{ background: "#1B1B29", padding: "9px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#EF4444" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#F59E0B" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22C55E" }} />
        <span style={{ marginLeft: 8, fontFamily: A.mono, fontSize: 11, color: "#8A8AA0" }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function CodeEditorPanel({ language, code, onCodeChange }) {
  return (
    <TerminalFrame label={language === "sql" ? "query.sql" : "solution.js"}>
      <Suspense fallback={<div style={{ background: "#12121C", height: 260 }} />}>
        <CodeMirrorLoader language={language} value={code} onChange={onCodeChange} />
      </Suspense>
    </TerminalFrame>
  )
}

function CodeMirrorLoader({ language, value, onChange }) {
  // Load the language extension lazily alongside the editor itself —
  // avoided importing both codemirror/lang packages up front for every
  // workstation type that never uses them.
  const extPromise = language === "sql" ? loadSqlLang() : loadJsLang()
  return (
    <ExtensionGate load={extPromise}>
      {(ext) => (
        <CodeMirror
          value={value}
          height="260px"
          theme="dark"
          extensions={[ext]}
          onChange={onChange}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
          style={{ fontSize: 13.5, fontFamily: A.mono }}
        />
      )}
    </ExtensionGate>
  )
}

// Tiny helper: resolves a language-extension promise once, re-renders with it.
function ExtensionGate({ load, children }) {
  const [ext, setExt] = useState(null)
  useEffect(() => { let live = true; load.then((e) => live && setExt(e)); return () => { live = false } }, [load])
  if (!ext) return <div style={{ background: "#12121C", height: 260 }} />
  return children(ext)
}

function CalculationPanel({ family, numericValue, onChange }) {
  return (
    <div style={{
      borderRadius: A.radiusSm, border: `1px solid ${A.border}`, padding: 24,
      backgroundImage: `linear-gradient(${family.bg}55 1px, transparent 1px), linear-gradient(90deg, ${family.bg}55 1px, transparent 1px)`,
      backgroundSize: "22px 22px", backgroundColor: A.card,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: family.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
        Worksheet
      </div>
      <label style={{ display: "block", fontSize: 12.5, color: A.ink3, marginBottom: 8 }}>Your calculated answer</label>
      <input
        type="number" inputMode="decimal" value={numericValue} onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{
          width: "100%", padding: "16px 18px", borderRadius: 12, border: `2px solid ${family.accent}33`,
          fontSize: 24, fontWeight: 800, fontFamily: A.mono, color: A.ink, boxSizing: "border-box", background: A.card,
        }}
      />
    </div>
  )
}

const WORKSTATION_FRAME_LABEL = {
  structured_response: "Structured Response",
  decision: "Decision Console",
  log_investigation: "Log Investigation",
}

function DecisionPanel({ family, workstationType, fields, answers, onFieldChange }) {
  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden" }}>
      <div style={{ background: family.bg, padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: family.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {WORKSTATION_FRAME_LABEL[workstationType] || "Response"}
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, background: A.card }}>
        {fields.map((field) => (
          <ResponseField key={field.key} field={field} value={answers[field.key] || ""} onChange={(v) => onFieldChange(field.key, v)} />
        ))}
      </div>
    </div>
  )
}

function ResponseField({ field, value, onChange }) {
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: A.ink3, marginBottom: 6 }
  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${A.border}`, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit", background: "#fff" }

  if (field.type === "select") {
    return (
      <div>
        <label style={labelStyle}>{field.label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="" disabled>Choose one…</option>
          {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }
  if (field.type === "textarea") {
    return (
      <div>
        <label style={labelStyle}>{field.label}</label>
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Explain your reasoning…"}
          style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
        />
      </div>
    )
  }
  return (
    <div>
      <label style={labelStyle}>{field.label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || "Short answer — e.g. the exact option named in the instructions"}
        style={inputStyle}
      />
    </div>
  )
}
