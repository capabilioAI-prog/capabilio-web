// ─── SettingsPanel.jsx ────────────────────────────────────────────────────────
// Comprehensive settings control center for Capabilio Aura.
// Rendered inside the "settings" tab of Aura.jsx.
//
// Props:
//   userData       — profile object from Supabase (profiles row)
//   user           — Supabase auth user object
//   save           — async (patch) => void — writes patch to Supabase profiles
//   setUserData    — optimistic React state setter (d => {...d, ...patch})
//   path           — userData.path shortcut
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { getPlan } from "../config/plans"
import { upsertProfileEducation } from "../lib/profileEducation"
import { securityApi } from "../lib/api"
import PolicyModal from "../components/PolicyModal"
import { POLICIES } from "../config/policies"
import { formatPolicyDate } from "../config/policies/blocks"

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

// ── Design tokens (mirrors Aura.jsx T) ───────────────────────────────────────
const T = {
  cream:   "#FAF7F2",
  cream2:  "#FFFFFF",
  cream3:  "rgba(0,0,0,0.05)",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  indigo:  "#6366F1",
  indigo2: "#818CF8",
  indigo3: "rgba(99,102,241,0.12)",
  green:   "#10B981",
  green2:  "rgba(16,185,129,0.12)",
  amber:   "#F59E0B",
  amber2:  "rgba(245,158,11,0.12)",
  red:     "#F43F5E",
  red2:    "rgba(244,63,94,0.12)",
  blue:    "#3B82F6",
  blue2:   "rgba(59,130,246,0.12)",
  border:  "rgba(0,0,0,0.07)",
  shadow:  "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  shadow2: "0 4px 16px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)",
}

// ── ELO tiers (mirrors Arena / Aura) ─────────────────────────────────────────
const ELO_TIERS = [
  { min:0,    max:600,  label:"Rookie",       color:"#A8A29E", icon:"🌱" },
  { min:600,  max:800,  label:"Apprentice",   color:"#22C55E", icon:"⚡" },
  { min:800,  max:1000, label:"Practitioner", color:"#3B82F6", icon:"🔵" },
  { min:1000, max:1200, label:"Expert",       color:"#8B5CF6", icon:"💜" },
  { min:1200, max:1500, label:"Master",       color:"#F59E0B", icon:"🏆" },
  { min:1500, max:9999, label:"Elite",        color:"#EF4444", icon:"🔥" },
]
const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

// ── Path colors ───────────────────────────────────────────────────────────────
const PATH_META = {
  student:      { label:"Student",      color:"#FF5701", bg:"rgba(255,87,1,0.1)",   icon:"🎓" },
  professional: { label:"Professional", color:"#6D28D9", bg:"rgba(109,40,217,0.1)", icon:"💼" },
  authority:    { label:"Authority",    color:"#1D4ED8", bg:"rgba(29,78,216,0.1)",  icon:"🏛️" },
  institution:  { label:"Institution",  color:"#0F766E", bg:"rgba(15,118,110,0.1)", icon:"🏫" },
}

// ── Nav sections ──────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Identity",
    items: [
      { id:"profile",      icon:"👤", label:"Profile",         desc:"Name, photo, bio" },
      { id:"account",      icon:"🔑", label:"Account",         desc:"Email, plan, username" },
    ],
  },
  {
    label: "Career",
    items: [
      { id:"path",         icon:"🧭", label:"Path & Roles",    desc:"Career path, keywords" },
      { id:"arena",        icon:"⚔️", label:"Arena Prefs",     desc:"Domain, difficulty" },
      { id:"employment",   icon:"🏛️", label:"Employment Verify",desc:"UAN / EPFO verification" },
    ],
  },
  {
    label: "Visibility",
    items: [
      { id:"privacy",      icon:"🔒", label:"Visibility",      desc:"Profile, page & search visibility" },
      { id:"proof",        icon:"🔗", label:"Proof & Portfolio",desc:"Links & certifications" },
    ],
  },
  {
    label: "Notifications",
    items: [
      { id:"notifications",icon:"🔔", label:"Notifications",   desc:"Alerts & digests" },
    ],
  },
  {
    label: "Personalization",
    items: [
      { id:"appearance",   icon:"🎨", label:"Appearance",      desc:"Theme & display" },
      { id:"ai",           icon:"🤖", label:"AI Preferences",  desc:"Tone & language" },
    ],
  },
  {
    label: "Data",
    items: [
      { id:"data",         icon:"📦", label:"Data & Export",   desc:"Download your data" },
      { id:"security",     icon:"🛡️", label:"Login & Security", desc:"Password, 2FA & sessions" },
    ],
  },
  {
    label: "Info",
    items: [
      { id:"help",         icon:"💬", label:"Help & Support",  desc:"Docs & contact" },
      { id:"about",        icon:"ℹ️",  label:"About",           desc:"Version & changelog" },
      { id:"policies",     icon:"📜", label:"Policies",        desc:"Terms & privacy" },
      { id:"advanced",     icon:"⚙️", label:"Advanced",        desc:"Danger zone" },
    ],
  },
]

// ── Profile completeness scoring ──────────────────────────────────────────────
function calcCompleteness(ud) {
  if (!ud) return { score: 0, items: [] }
  const items = [
    { label:"Display name",   done: !!(ud.displayName && ud.displayName !== "Anonymous"), pts:15 },
    { label:"Headline / bio", done: !!(ud.bio || ud.headline),                            pts:15 },
    { label:"Profile photo",  done: !!(ud.avatarUrl || ud.avatar_url),                   pts:10 },
    { label:"Username set",   done: !!(ud.username),                                     pts:10 },
    { label:"LinkedIn URL",   done: !!(ud.linkedinUrl || ud.linkedin_url),               pts:10 },
    { label:"GitHub URL",     done: !!(ud.githubUrl   || ud.github_url),                 pts:10 },
    { label:"Skills added",   done: !!(ud.skill_graph?.length > 0 || ud.skillGraph?.length > 0), pts:15 },
    { label:"Arena challenge",done: !!(ud.eloRating > 500),                              pts:15 },
  ]
  const score = items.filter(i => i.done).reduce((s, i) => s + i.pts, 0)
  return { score, items }
}

// ── Primitive components ───────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.border}`,
      borderRadius: 14, boxShadow: T.shadow, padding: "20px 22px", ...style
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:"flex", alignItems:"center", gap: 9 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: T.ink, margin: 0 }}>{title}</h3>
      </div>
      {subtitle && <p style={{ fontSize: 12, color: T.ink3, margin:"5px 0 0 29px" }}>{subtitle}</p>}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.ink4,
      textTransform:"uppercase", letterSpacing:"0.07em", marginBottom: 6
    }}>{children}</div>
  )
}

function Input({ value, onChange, placeholder, type="text", disabled=false, monospace=false }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width:"100%", padding:"9px 12px", borderRadius:9,
        border:`1.5px solid ${focused ? T.indigo : T.border}`,
        fontSize:13, color: disabled ? T.ink4 : T.ink,
        fontFamily: monospace ? "'DM Mono',monospace" : "inherit",
        background: disabled ? T.cream : "#fff",
        outline:"none", transition:"border 0.15s", boxSizing:"border-box",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows=3 }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width:"100%", padding:"9px 12px", borderRadius:9,
        border:`1.5px solid ${focused ? T.indigo : T.border}`,
        fontSize:13, color:T.ink, fontFamily:"inherit",
        outline:"none", resize:"vertical", transition:"border 0.15s",
        boxSizing:"border-box", lineHeight:1.55,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function Toggle({ value, onChange, label, desc, disabled=false }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"13px 16px", background:"#fff",
      border:`1px solid ${T.border}`, borderRadius:11,
      boxShadow:T.shadow, opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{label}</div>
        {desc && <div style={{ fontSize:11, color:T.ink3, marginTop:2 }}>{desc}</div>}
      </div>
      <div
        onClick={() => !disabled && onChange(!value)}
        style={{
          width:42, height:23, borderRadius:12, cursor: disabled?"not-allowed":"pointer",
          background: value ? T.indigo : T.cream3,
          border:`1.5px solid ${value ? "rgba(99,102,241,0.4)" : T.border}`,
          position:"relative", transition:"all 0.2s", flexShrink:0,
        }}
      >
        <div style={{
          position:"absolute", top:2, left: value ? 20 : 2,
          width:15, height:15, borderRadius:"50%",
          background: value ? "#fff" : T.ink4,
          transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
        }}/>
      </div>
    </div>
  )
}

// BUG FIX (2026-07-25, Career OS Tranche 3): every section's handleSave used
// to call save(patch) and unconditionally show "✓ Saved" right after,
// without checking the return value — save() (userDoc.update) returns false
// on a real DB write failure rather than throwing, so a rejected write (e.g.
// the searchable/certVisible/vaultVisible column-mismatch bug fixed in this
// same pass) still showed a success state with the data never actually
// persisted. `error` is optional and additive — sections that don't pass it
// keep their exact previous behavior.
function SaveBtn({ onClick, saved, loading, error }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding:"10px 24px", background: error ? T.red : saved ? T.green : T.indigo,
      border:"none", borderRadius:9, color:"#fff",
      fontSize:13, fontWeight:700, cursor: loading?"wait":"pointer",
      transition:"background 0.25s", display:"flex", alignItems:"center", gap:7,
    }}>
      {loading ? "Saving…" : error ? "⚠ Save failed — try again" : saved ? "✓ Saved" : "Save Changes"}
    </button>
  )
}

function InfoBox({ icon, text, color=T.blue, bg=T.blue2 }) {
  return (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:10,
      padding:"12px 14px", background:bg, borderRadius:10,
      border:`1px solid ${color}22`, marginTop:14,
    }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <p style={{ fontSize:12, color:T.ink2, margin:0, lineHeight:1.6 }}>{text}</p>
    </div>
  )
}

// ── Section: Profile ──────────────────────────────────────────────────────────
function ProfileSection({ userData, save, setUserData }) {
  const isStudent = userData?.path === "student"
  const [form, setForm] = useState({
    displayName: userData?.displayName || userData?.display_name || "",
    headline:    userData?.headline || "",
    bio:         userData?.bio || "",
    location:    userData?.location || "",
    website:     userData?.website || "",
    college:     userData?.college || "",
    // 2026-08-08: self-service roll number -- previously the institution
    // roster's Roll No. column had no way for a student to fill it in
    // themselves at all; only institution staff could set it, manually,
    // per student. Read live by college.js's roster route the same way
    // branch/ELO/career track already are.
    rollNumber:  userData?.rollNumber || userData?.roll_number || "",
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = {
        displayName: form.displayName,
        display_name: form.displayName,
        headline:    form.headline,
        bio:         form.bio,
        location:    form.location,
        website:     form.website,
      }
      if (isStudent) {
        patch.college = form.college.trim()
        patch.education = upsertProfileEducation(userData?.education, form.college)
        patch.rollNumber = form.rollNumber.trim()
        patch.roll_number = form.rollNumber.trim()
      }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="👤" title="Profile" subtitle="Your public identity on Capabilio" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Display Name</FieldLabel>
        <Input value={form.displayName} onChange={f("displayName")} placeholder="Your full name" />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>This is your name as it appears everywhere on Capabilio.</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Professional Headline</FieldLabel>
        <Input value={form.headline} onChange={f("headline")} placeholder="e.g. Senior Software Engineer at Infosys" />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Shown below your name on your public profile and Portfolio.</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Bio</FieldLabel>
        <Textarea value={form.bio} onChange={f("bio")} placeholder="Tell your professional story in 2–3 sentences…" rows={3} />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>{form.bio.length}/300 characters</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <FieldLabel>Location</FieldLabel>
            <Input value={form.location} onChange={f("location")} placeholder="City, State / Country" />
          </div>
          <div>
            <FieldLabel>Personal Website</FieldLabel>
            <Input value={form.website} onChange={f("website")} placeholder="https://yoursite.com" />
          </div>
        </div>
      </Card>

      {isStudent && (
        <Card style={{ marginBottom:14 }}>
          <FieldLabel>College / University</FieldLabel>
          <Input value={form.college} onChange={f("college")} placeholder="e.g. VIT Vellore" />
          <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Updates here also show up in your Education timeline on the Aura dashboard automatically.</div>
        </Card>
      )}

      {isStudent && (
        <Card style={{ marginBottom:14 }}>
          <FieldLabel>Roll Number</FieldLabel>
          <Input value={form.rollNumber} onChange={f("rollNumber")} placeholder="e.g. 21A91A0501" />
          <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Shown to your college's placement team on their student roster. Leave blank if your college hasn't assigned one yet.</div>
        </Card>
      )}

      <InfoBox
        icon="🖼️"
        text="To change your profile photo, go to the Aura Dashboard main page — the avatar upload button appears in your top profile banner."
      />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Account ──────────────────────────────────────────────────────────
function AccountSection({ userData, user, save, setUserData }) {
  const [username, setUsername] = useState(userData?.username || "")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const plan = getPlan(userData)
  const email = user?.email || userData?.email || "—"

  const handleSave = async () => {
    const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (!slug) return
    setLoading(true)
    try {
      if (save) await save({ username: slug })
      if (setUserData) setUserData(d => ({ ...d, username: slug }))
      setUsername(slug)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  const portfolioUrl = `${window.location.origin}/portfolio/${username || "your-username"}`

  return (
    <div>
      <SectionTitle icon="🔑" title="Account" subtitle="Email, plan, and your unique Capabilio URL" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Email Address</FieldLabel>
        <Input value={email} onChange={() => {}} disabled={true} />
        <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Email is managed by your sign-in provider (Google / GitHub). Contact support to change it.</div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Current Plan</FieldLabel>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"12px 14px", background:T.indigo3, borderRadius:9,
        }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:T.indigo }}>{plan.label}</div>
            {plan.price > 0
              ? <div style={{ fontSize:11, color:T.ink3 }}>₹{plan.price}/month</div>
              : <div style={{ fontSize:11, color:T.ink3 }}>Free tier — upgrade for more features</div>
            }
          </div>
          <a href="/plans" style={{
            padding:"7px 14px", background:T.indigo, borderRadius:8,
            color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none",
          }}>
            {plan.price === 0 ? "Upgrade" : "Manage"}
          </a>
        </div>
        {plan.price === 0 && (
          <div style={{ marginTop:10, fontSize:11, color:T.ink3, lineHeight:1.6 }}>
            You're on the Free plan. Upgrade to Pro or Elite to unlock more Arena slots, AI interviews, and market reports.
          </div>
        )}
      </Card>

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Portfolio Username</FieldLabel>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{
            flex:1, display:"flex", alignItems:"center",
            border:`1.5px solid ${T.border}`, borderRadius:9, overflow:"hidden",
          }}>
            <span style={{
              padding:"9px 10px", background:T.cream, fontSize:11,
              color:T.ink4, whiteSpace:"nowrap", borderRight:`1px solid ${T.border}`, flexShrink:0,
            }}>
              {window.location.host}/portfolio/
            </span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="your-username"
              style={{
                flex:1, padding:"9px 10px", border:"none", fontSize:13,
                color:T.ink, fontFamily:"'DM Mono',monospace", outline:"none",
              }}
            />
          </div>
          <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
        </div>
        <div style={{ marginTop:6, fontSize:11, color:T.ink4 }}>
          Lowercase letters, numbers, and hyphens only.
        </div>
        {username && (
          <div style={{
            marginTop:8, display:"flex", alignItems:"center", gap:6,
            fontSize:11, color:T.indigo,
          }}>
            <span>🔗</span>
            <span>{portfolioUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(portfolioUrl)} style={{
              padding:"3px 8px", background:T.indigo3, border:"none",
              borderRadius:5, color:T.indigo, fontSize:10, fontWeight:700, cursor:"pointer",
            }}>Copy</button>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Section: Path & Roles ─────────────────────────────────────────────────────
function PathSection({ userData, save, setUserData, path }) {
  const [form, setForm] = useState({
    keyword:    userData?.keyword || userData?.job_role || "",
    targetRole: userData?.targetRole || userData?.target_role || "",
    yearsExp:   userData?.yearsExp || userData?.years_of_experience || "",
    targetComp: userData?.targetComp || "",
    arenaKey:   userData?.arenaKey || userData?.domain || "",
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))
  const pm = PATH_META[path] || PATH_META.student

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = {
        keyword:    form.keyword,
        job_role:   form.keyword,
        targetRole: form.targetRole,
        target_role: form.targetRole,
        yearsExp:   form.yearsExp,
        years_of_experience: form.yearsExp,
        targetComp: form.targetComp,
        arenaKey:   form.arenaKey || undefined,
        domain:     form.arenaKey || undefined,
      }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🧭" title="Path & Roles" subtitle="Your career focus and goals — this powers your Arena domain, Launchpad matches, and AI recommendations" />

      <Card style={{ marginBottom:14 }}>
        <div style={{
          display:"inline-flex", alignItems:"center", gap:8, padding:"5px 12px",
          background:pm.bg, borderRadius:20, marginBottom:14,
        }}>
          <span>{pm.icon}</span>
          <span style={{ fontSize:12, fontWeight:700, color:pm.color }}>{pm.label} Path</span>
        </div>
        <div style={{ fontSize:11, color:T.ink3, lineHeight:1.6 }}>
          Your career path shapes which features and plans are available to you. To switch paths, contact Capabilio support — path changes reset certain signals.
        </div>
      </Card>

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <FieldLabel>Current / Target Job Role</FieldLabel>
            <Input value={form.keyword} onChange={f("keyword")} placeholder="e.g. Full Stack Developer, Data Analyst, DevOps Engineer" />
            <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Used to seed your Arena domain, Launchpad job feed, and skill graph.</div>
          </div>
          <div>
            <FieldLabel>Target Role (aspiration)</FieldLabel>
            <Input value={form.targetRole} onChange={f("targetRole")} placeholder="e.g. Senior Backend Engineer, Engineering Manager" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <FieldLabel>Years of Experience</FieldLabel>
              <select
                value={form.yearsExp}
                onChange={e => f("yearsExp")(e.target.value)}
                style={{
                  width:"100%", padding:"9px 12px", borderRadius:9,
                  border:`1.5px solid ${T.border}`, fontSize:13,
                  color:T.ink, background:"#fff", outline:"none",
                }}
              >
                <option value="">Select…</option>
                <option value="0">Fresher (0 years)</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="5">5 years</option>
                <option value="7">7+ years</option>
                <option value="10">10+ years</option>
                <option value="15">15+ years</option>
              </select>
            </div>
            <div>
              <FieldLabel>Target Company (optional)</FieldLabel>
              <Input value={form.targetComp} onChange={f("targetComp")} placeholder="e.g. Google, Infosys, Startup" />
            </div>
          </div>
          <div>
            <FieldLabel>Arena Domain Override (optional)</FieldLabel>
            <Input value={form.arenaKey} onChange={f("arenaKey")} placeholder="Leave blank to auto-detect from job role" monospace />
            <div style={{ marginTop:3, fontSize:11, color:T.ink4 }}>Override the domain key used for Arena challenges. Options: frontend, backend, fullstack, swe, data, devops, aws, cyber…</div>
          </div>
        </div>
      </Card>

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Privacy ──────────────────────────────────────────────────────────
function PrivacySection({ userData, save, setUserData, path }) {
  const pages = path === "professional" ? [
    { id:"forge",     icon:"⚒️", label:"Forge",       desc:"5-min skill maintenance tasks" },
    { id:"pulse",     icon:"📡", label:"Pulse",        desc:"Market signals and community feed" },
    { id:"arena",     icon:"⚔️", label:"Arena",        desc:"Full skill challenges for ELO" },
    { id:"launchpad", icon:"🚀", label:"Launchpad",    desc:"Job matches and applications" },
  ] : [
    { id:"arena",       icon:"⚔️", label:"Arena",        desc:"Daily skill challenges and ELO" },
    { id:"pulse",       icon:"📡", label:"Pulse",         desc:"Community feed and updates" },
    { id:"skillstudio", icon:"🎯", label:"Skill Studio",  desc:"Learning resources" },
    { id:"launchpad",   icon:"🚀", label:"Launchpad",     desc:"Job matches and applications" },
  ]

  const [vis, setVis] = useState(userData?.pageVisibility || {})
  const [searchable, setSearchable] = useState(userData?.searchable !== false)
  const [analyticsOn, setAnalyticsOn] = useState(userData?.analyticsEnabled !== false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  // Profile Visibility: settings/security redesign (2026-09-02). Separate
  // save flow (its own endpoint, POST /api/security/visibility) from the
  // toggles below — it needs its own audit-log entry and is the one
  // control that gates the database's own row-level-security policy, not
  // just an application-layer query filter like `searchable` below.
  const [profileVisibility, setProfileVisibility] = useState(userData?.profile_visibility || "public")
  const [visSaved, setVisSaved] = useState(false)
  const [visLoading, setVisLoading] = useState(false)
  const saveVisibility = async (next) => {
    setVisLoading(true)
    try {
      await securityApi.setProfileVisibility(next)
      setProfileVisibility(next)
      if (setUserData) setUserData(d => ({ ...d, profile_visibility: next }))
      setVisSaved(true)
      setTimeout(() => setVisSaved(false), 2000)
    } catch { /* keep the previous selection visible on failure */ }
    finally { setVisLoading(false) }
  }

  const toggle = (id) => setVis(v => ({ ...v, [id]: !(v[id] !== false) }))

  const handleSave = async () => {
    setLoading(true)
    setError(false)
    try {
      const patch = { pageVisibility: vis, searchable, analyticsEnabled: analyticsOn }
      const ok = save ? await save(patch) : true
      if (ok === false) { setError(true); setTimeout(() => setError(false), 3500); return }
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  const VISIBILITY_OPTIONS = [
    { value:"public",          icon:"🌐", label:"Public",           desc:"Anyone with your profile link can view it, signed in or not" },
    { value:"capabilio_users", icon:"👥", label:"Capabilio users only", desc:"Only people signed in to Capabilio can view your profile" },
    { value:"private",         icon:"🔒", label:"Private",          desc:"Only you can view your profile" },
  ]

  return (
    <div>
      <SectionTitle icon="🔒" title="Visibility" subtitle="Control what others see and how you appear on Capabilio" />

      <div style={{ marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Profile Visibility</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        {VISIBILITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => !visLoading && saveVisibility(opt.value)}
            disabled={visLoading}
            style={{
              display:"flex", alignItems:"center", gap:12, textAlign:"left", width:"100%",
              padding:"12px 16px", background: profileVisibility === opt.value ? T.indigo3 : "#fff",
              border:`1.5px solid ${profileVisibility === opt.value ? T.indigo : T.border}`,
              borderRadius:11, cursor: visLoading ? "wait" : "pointer", font:"inherit",
            }}
          >
            <span style={{ fontSize:18 }}>{opt.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color: profileVisibility === opt.value ? T.indigo : T.ink }}>{opt.label}</div>
              <div style={{ fontSize:11, color:T.ink4 }}>{opt.desc}</div>
            </div>
            {profileVisibility === opt.value && <span style={{ color:T.indigo, fontWeight:800 }}>{visSaved ? "✓" : "●"}</span>}
          </button>
        ))}
      </div>

      <div style={{ marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Page Visibility</div>
      {pages.map(p => {
        const isOn = vis[p.id] !== false
        return (
          <div key={p.id} style={{ marginBottom:10 }}>
            <Toggle
              value={isOn}
              onChange={() => toggle(p.id)}
              label={`${p.icon} ${p.label}`}
              desc={p.desc}
            />
          </div>
        )
      })}

      <div style={{ marginTop:20, marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Discovery & Analytics</div>

      <div style={{ marginBottom:10 }}>
        <Toggle
          value={searchable}
          onChange={setSearchable}
          label="🔍 Appear in Capabilio search"
          desc="Allow other users and recruiters to find your profile"
        />
      </div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={analyticsOn}
          onChange={setAnalyticsOn}
          label="📊 Profile view analytics"
          desc="Track who views your public portfolio page"
        />
      </div>

      <InfoBox icon="ℹ️" text="Aura Dashboard itself is always private to you. The toggles below control your public-facing pages only." />
      <InfoBox icon="🔒" text="Profile Visibility and search visibility are both enforced server-side — including at the database level — not just hidden by a UI toggle. A private profile returns 'not found' to anyone else who tries to view it directly." />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} error={error} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Proof & Portfolio ────────────────────────────────────────────────
function ProofSection({ userData, save, setUserData }) {
  const [form, setForm] = useState({
    linkedinUrl:  userData?.linkedinUrl   || userData?.linkedin_url  || "",
    githubUrl:    userData?.githubUrl     || userData?.github_url    || "",
    leetcodeUrl:  userData?.leetcodeUrl   || "",
    portfolioUrl: userData?.portfolioUrl  || "",
  })
  const [certVisible, setCertVisible] = useState(userData?.certVisible !== false)
  const [vaultVisible, setVaultVisible] = useState(userData?.vaultVisible !== false)
  // 2026-08-05: opt-in recruiter search discoverability. Note the inverted
  // default vs. certVisible/vaultVisible above (`!== false` = defaults ON) —
  // this one is `=== true` = defaults OFF, matching profiles.recruiter_discoverable's
  // real default of false (product decision: opt-in, not opt-out).
  const [recruiterDiscoverable, setRecruiterDiscoverable] = useState(userData?.recruiterDiscoverable === true)
  // 2026-08-06: employment status — a SECOND, mandatory gate on top of
  // recruiterDiscoverable above. Product rule: an actively-employed
  // professional must never be visible to recruiters, even if they once
  // flipped "Discoverable to Recruiters" on and forgot about it. Defaults
  // to 'active_hidden' regardless of userData, matching profiles.
  // employment_status's real DB default — recruiter search now requires
  // BOTH recruiter_discoverable=true AND employment_status IN
  // ('notice_period','discoverable') server-side (recruiterSearch.js,
  // partnerBridge.js), so leaving this at the default hides you from
  // search results even with the toggle above turned on.
  const [employmentStatus, setEmploymentStatus] = useState(userData?.employmentStatus || "active_hidden")
  // Code DNA visibility (2026-08-05) — lives on the proof_objects row, not a
  // plain profiles column like certVisible/vaultVisible above, so it needs
  // its own fetch/save via GET+POST /api/github/visibility rather than
  // riding along in the normal save(patch) call. Was previously hardcoded
  // always-visible with no user control at all — see
  // lib/codeDna/repository.js's setVisibility().
  const [codeDnaVisible, setCodeDnaVisible] = useState(true)
  const [codeDnaHasAnalysis, setCodeDnaHasAnalysis] = useState(false)
  const codeDnaInitialRef = useRef(true)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${API}/api/github/visibility`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }).then(r => r.json())
        if (cancelled) return
        setCodeDnaVisible(res.isPortfolioVisible !== false)
        codeDnaInitialRef.current = res.isPortfolioVisible !== false
        setCodeDnaHasAnalysis(!!res.hasAnalysis)
      } catch { /* non-fatal — toggle just stays at its default */ }
    })()
    return () => { cancelled = true }
  }, [])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    setError(false)
    try {
      const patch = {
        ...form,
        linkedin_url: form.linkedinUrl,
        github_url:   form.githubUrl,
        certVisible,
        vaultVisible,
        recruiterDiscoverable,
        employmentStatus,
      }
      const ok = save ? await save(patch) : true
      if (ok === false) { setError(true); setTimeout(() => setError(false), 3500); return }
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      // Separate call — proof_objects, not profiles — only fired if the
      // toggle actually changed, and only if there's an analysis to toggle
      // (setVisibility() 404s otherwise, which is expected/harmless here).
      if (codeDnaHasAnalysis && codeDnaVisible !== codeDnaInitialRef.current) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          await fetch(`${API}/api/github/visibility`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ isPortfolioVisible: codeDnaVisible, isRecruiterVisible: codeDnaVisible }),
          })
          codeDnaInitialRef.current = codeDnaVisible
        } catch { /* non-fatal — profile save above already succeeded */ }
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="🔗" title="Proof & Portfolio" subtitle="External profiles and what's shown on your public Portfolio page" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <FieldLabel>LinkedIn URL</FieldLabel>
            <Input value={form.linkedinUrl} onChange={f("linkedinUrl")} placeholder="https://linkedin.com/in/your-profile" />
          </div>
          <div>
            <FieldLabel>GitHub URL</FieldLabel>
            <Input value={form.githubUrl} onChange={f("githubUrl")} placeholder="https://github.com/your-username" />
          </div>
          <div>
            <FieldLabel>LeetCode / HackerRank (optional)</FieldLabel>
            <Input value={form.leetcodeUrl} onChange={f("leetcodeUrl")} placeholder="https://leetcode.com/u/your-username" />
          </div>
          <div>
            <FieldLabel>Personal / Other Portfolio URL</FieldLabel>
            <Input value={form.portfolioUrl} onChange={f("portfolioUrl")} placeholder="https://yourportfolio.com" />
          </div>
        </div>
      </Card>

      <div style={{ marginBottom:14, fontSize:12, fontWeight:700, color:T.ink2 }}>Portfolio Visibility</div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={certVisible}
          onChange={setCertVisible}
          label="🏅 Show Certifications"
          desc="Display your uploaded certifications on your public Portfolio"
        />
      </div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={vaultVisible}
          onChange={setVaultVisible}
          label="🗄️ Show Vault Projects"
          desc="Display your Vault files and projects on your public Portfolio"
        />
      </div>
      <div style={{ marginBottom:10 }}>
        <Toggle
          value={recruiterDiscoverable}
          onChange={setRecruiterDiscoverable}
          label="🎯 Discoverable to Recruiters"
          desc="Let recruiters find your profile through Capabilio's candidate search (by skill, ELO, domain, verification status). Off by default — your profile stays link-only until you turn this on."
        />
      </div>
      {recruiterDiscoverable && (
        <div style={{ marginBottom:10, padding:14, borderRadius:10, border:`1.5px solid ${T.border}`, background:"#FAFAF8" }}>
          <FieldLabel>Employment status shown to recruiters</FieldLabel>
          <select
            value={employmentStatus}
            onChange={e => setEmploymentStatus(e.target.value)}
            style={{
              width:"100%", padding:"9px 12px", borderRadius:9,
              border:`1.5px solid ${T.border}`, fontSize:13,
              color:T.ink, background:"#fff", outline:"none",
            }}
          >
            <option value="active_hidden">Actively employed — stay hidden from recruiter search</option>
            <option value="notice_period">In notice period — visible to recruiters</option>
            <option value="discoverable">Open to offers — visible to recruiters</option>
          </select>
          <div style={{ marginTop:6, fontSize:11, color:T.ink4 }}>
            This is required in addition to the toggle above — leaving it at "Actively employed" keeps you out of recruiter search results even with discoverability turned on. This protects you from being cold-approached while employed.
          </div>
        </div>
      )}
      {codeDnaHasAnalysis && (
        <div style={{ marginBottom:10 }}>
          <Toggle
            value={codeDnaVisible}
            onChange={setCodeDnaVisible}
            label="🧬 Show Code DNA"
            desc="Display your GitHub capability signals and AI Repository Interview on your public Portfolio. Analyzing your GitHub makes this visible by default — turn off anytime."
          />
        </div>
      )}
      <InfoBox icon="🔒" text="Enforced server-side on non-owner profile reads (GET /api/pro/profile/:uid) — turning these off actually removes the data from the response, not just hides it in the UI." />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} error={error} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: UAN / EPFO Verification ─────────────────────────────────────────
// 2026-08-05: switched from the Eko/UAN edge function (verify-uan →
// staging.eko.in advance-employment lookup) — confirmed by the product owner
// not to work in practice — to AuthBridge's real company-search + confirm
// flow. Same integration Aura.jsx (Student) and Orbit.jsx VaultTab
// (Professional) already use — see routes/verify.js's
// /epfo/search-company + /epfo/confirm and lib/authbridgeEpfo.js. This is a
// deliberate feature reduction, not a bug: AuthBridge only confirms
// "this person worked at this company" (name + establishment match), it
// does not return UAN, gender, DOB, or a bulk employment-history list the
// old Eko flow displayed — those fields are dropped rather than fabricated.
function UANVerificationSection({ userData, user, save, setUserData }) {
  const experiences = userData?.experiences || []
  const [epfoStep, setEpfoStep] = useState(1)
  const [epfoExpIndex, setEpfoExpIndex] = useState(null)
  const [companyQuery, setCompanyQuery] = useState("")
  const [companyCandidates, setCompanyCandidates] = useState([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [personName, setPersonName] = useState(userData?.displayName || userData?.display_name || "")
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null) // { verified, employer } | { error }

  const isVerified = experiences.some(e => e.verificationStatus === "verified" && e.verificationSource === "AuthBridge/EPFO")

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    return { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` }
  }

  function resetFlow() {
    setEpfoStep(1); setEpfoExpIndex(null); setCompanyQuery("")
    setCompanyCandidates([]); setSelectedCompany(""); setResult(null)
  }

  async function pickEpfoExperience(idx) {
    setEpfoExpIndex(idx); setSelectedCompany(""); setCompanyCandidates([]); setResult(null)
    const exp = experiences[idx]
    const q = exp?.company || exp?.displayCompany || ""
    setCompanyQuery(q)
    if (q.trim()) await searchEpfoCompany(q)
  }

  async function searchEpfoCompany(qOverride) {
    const q = (qOverride ?? companyQuery).trim()
    if (!q) { setResult({ error: "Enter a company name to search" }); return }
    setVerifying(true); setResult(null); setCompanyCandidates([])
    try {
      const res = await fetch(`${API}/api/verify/epfo/search-company`, {
        method: "POST", headers: await authHeaders(), body: JSON.stringify({ companyName: q }),
      }).then(r => r.json())
      if (res.companies) {
        setCompanyCandidates(res.companies)
        if (res.companies.length === 0) setResult({ error: "No EPFO-registered companies found matching that name — try a shorter or different spelling." })
      } else {
        setResult({ error: res.error || "Company search failed." })
      }
    } catch { setResult({ error: "Server error." }) }
    setVerifying(false)
  }

  async function confirmEpfoEmployment() {
    if (epfoExpIndex === null) { setResult({ error: "Pick which job to verify" }); return }
    if (!selectedCompany) { setResult({ error: "Pick the matching company from the list" }); return }
    if (!personName.trim()) { setResult({ error: "Enter your name as it appears on EPFO records" }); return }
    setVerifying(true); setResult(null)
    try {
      const res = await fetch(`${API}/api/verify/epfo/confirm`, {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ expIndex: epfoExpIndex, companyName: selectedCompany, personName: personName.trim() }),
      }).then(r => r.json())
      if (res.verified) {
        setResult({ verified: true, employer: res.data?.employerName })
        const patch = { uanVerified: true, uanVerifiedAt: new Date().toISOString() }
        if (res.data?.updatedExperiences?.length) patch.experiences = res.data.updatedExperiences
        if (save) await save(patch)
        if (setUserData) setUserData(d => ({ ...d, ...patch }))
      } else {
        setResult({ error: res.reason || res.error || "Couldn't confirm this employment — check the name and company, or try a different job entry." })
      }
    } catch { setResult({ error: "Server error." }) }
    setVerifying(false)
  }

  // ─── VERIFIED STATE ───────────────────────────────────────────────────────
  if (isVerified && epfoStep === 1 && !companyCandidates.length && epfoExpIndex === null) {
    const verifiedExp = experiences.find(e => e.verificationStatus === "verified" && e.verificationSource === "AuthBridge/EPFO")
    return (
      <div>
        <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Confirmed via AuthBridge / EPFO" />
        <div style={{
          background:"linear-gradient(135deg,#1A1714,#1A1714)", borderRadius:14,
          padding:"18px 22px", marginBottom:16, color:"#fff",
          display:"flex", alignItems:"center", gap:14,
        }}>
          <span style={{ fontSize:28 }}>✅</span>
          <div>
            <div style={{ fontSize:14, fontWeight:800 }}>EPFO Verified</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:3 }}>
              {verifiedExp?.legalName || verifiedExp?.company || "—"} · Verified via AuthBridge
            </div>
          </div>
          <span style={{
            marginLeft:"auto", fontSize:10, fontWeight:800, padding:"4px 12px",
            background:T.green, color:"#fff", borderRadius:99, letterSpacing:0.5,
          }}>EPFO VERIFIED</span>
        </div>
        <InfoBox icon="ℹ️" text="AuthBridge confirms your name against government EPFO establishment records for the selected employer. You can verify additional jobs from your career timeline below." />
        <button onClick={() => { setEpfoExpIndex(-1); resetFlow(); setEpfoExpIndex(null) }}
          style={{
            fontSize:11, color:T.ink4, background:"none",
            border:`1px solid ${T.border}`, borderRadius:8,
            padding:"5px 12px", cursor:"pointer", marginTop:12,
          }}>
          Verify another job
        </button>
      </div>
    )
  }

  // ─── STEP 2: confirm name ─────────────────────────────────────────────────
  if (epfoStep === 2) {
    return (
      <div>
        <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Confirm your name" />
        <InfoBox icon="ℹ️" text={`Matching against ${selectedCompany}. Use the name your EPFO records are under — it may differ slightly from your profile name.`} />
        <Card style={{ marginBottom:16 }}>
          <FieldLabel>Full Name</FieldLabel>
          <Input value={personName} onChange={setPersonName} placeholder="Full name" />
        </Card>
        {result?.error && (
          <div style={{ background:T.red2, border:`1px solid ${T.red}30`, borderRadius:10, padding:"10px 14px", color:T.red, fontSize:12, fontWeight:600, marginBottom:14 }}>
            {result.error}
          </div>
        )}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={() => setEpfoStep(1)}
            style={{ padding:"9px 18px", borderRadius:10, border:`1px solid ${T.border}`, background:"#fff", color:T.ink2, fontSize:13, cursor:"pointer" }}>
            ← Back
          </button>
          <button onClick={confirmEpfoEmployment} disabled={verifying}
            style={{
              padding:"9px 24px", borderRadius:10, border:"none",
              background:T.green, color:"#fff", fontSize:13,
              fontWeight:700, cursor:verifying ? "not-allowed" : "pointer", opacity:verifying?0.7:1,
            }}>
            {verifying ? "Verifying…" : "✅ Verify"}
          </button>
        </div>
      </div>
    )
  }

  // ─── STEP 1: pick job + company ───────────────────────────────────────────
  return (
    <div>
      <SectionTitle icon="🏛️" title="Employment Verification" subtitle="Verify a job from your timeline against government EPFO records" />
      <InfoBox icon="ℹ️" text="Pick a job from your career timeline, confirm the matching EPFO-registered company, then confirm your name." />

      {result?.error && (
        <div style={{ background:T.red2, border:`1px solid ${T.red}30`, borderRadius:10, padding:"10px 14px", color:T.red, fontSize:12, fontWeight:600, marginBottom:14 }}>
          {result.error}
        </div>
      )}

      {experiences.length === 0 ? (
        <Card><div style={{ fontSize:12, color:T.ink4 }}>Add a job to your career timeline first — EPFO verification checks against a specific employer.</div></Card>
      ) : (
        <Card style={{ marginBottom:16 }}>
          <FieldLabel>Which job?</FieldLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6, marginBottom:epfoExpIndex!==null?14:0 }}>
            {experiences.map((e, i) => (
              <button key={i} onClick={() => pickEpfoExperience(i)}
                style={{
                  textAlign:"left", padding:"9px 12px", borderRadius:10, cursor:"pointer",
                  background: epfoExpIndex===i ? T.indigo3 : "#fff",
                  border:`1.5px solid ${epfoExpIndex===i ? T.indigo : T.border}`,
                  fontSize:12, color:T.ink, fontWeight: epfoExpIndex===i ? 700 : 500,
                }}>
                {e.company || e.displayCompany || "Company"}{e.role ? ` — ${e.role}` : ""}
                {e.verificationStatus === "verified" && <span style={{ marginLeft:6, color:T.green, fontSize:10 }}>✓ verified</span>}
              </button>
            ))}
          </div>

          {epfoExpIndex !== null && (
            <>
              <FieldLabel>Search EPFO-registered company name</FieldLabel>
              <Input value={companyQuery} onChange={setCompanyQuery} placeholder="e.g. Capabilio" />
              <button onClick={() => searchEpfoCompany()} disabled={verifying}
                style={{
                  marginTop:8, marginBottom: companyCandidates.length ? 10 : 0,
                  padding:"8px 16px", borderRadius:8, border:`1px solid ${T.border}`,
                  background:"#fff", color:T.ink2, fontSize:12, fontWeight:600,
                  cursor:verifying ? "not-allowed" : "pointer",
                }}>
                {verifying ? "Searching…" : "Search"}
              </button>
              {companyCandidates.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                  {companyCandidates.map((c, i) => (
                    <button key={i} onClick={() => { setSelectedCompany(c); setEpfoStep(2) }}
                      style={{
                        textAlign:"left", padding:"8px 12px", borderRadius:8, cursor:"pointer",
                        background:"#fff", border:`1px solid ${T.border}`, fontSize:11, color:T.ink2,
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  )
}

// ── Section: Arena Preferences ────────────────────────────────────────────────
function ArenaSection({ userData, save, setUserData }) {
  const [form, setForm] = useState({
    preferredDifficulty: userData?.arenaPrefs?.difficulty  || "auto",
    dailyGoal:           userData?.arenaPrefs?.dailyGoal   || "1",
    autoAdvance:         userData?.arenaPrefs?.autoAdvance !== false,
    showTimer:           userData?.arenaPrefs?.showTimer   !== false,
    eloDecayReminder:    userData?.arenaPrefs?.decayReminder !== false,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const plan = getPlan(userData)

  const handleSave = async () => {
    setLoading(true)
    try {
      const patch = { arenaPrefs: { ...form } }
      if (save) await save(patch)
      if (setUserData) setUserData(d => ({ ...d, ...patch }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="⚔️" title="Arena Preferences" subtitle="Customise how your Arena experience works" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <FieldLabel>Preferred Difficulty</FieldLabel>
            <select
              value={form.preferredDifficulty}
              onChange={e => setForm(p => ({ ...p, preferredDifficulty: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="auto">Auto (based on ELO)</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div>
            <FieldLabel>Daily Challenge Goal</FieldLabel>
            <select
              value={form.dailyGoal}
              onChange={e => setForm(p => ({ ...p, dailyGoal: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="1">1 challenge/day</option>
              <option value="2">2 challenges/day</option>
              <option value="3">3 challenges/day</option>
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
        <Toggle
          value={form.showTimer}
          onChange={v => setForm(p => ({ ...p, showTimer: v }))}
          label="⏱️ Show challenge timer"
          desc="Display a countdown during Arena challenges"
        />
        <Toggle
          value={form.autoAdvance}
          onChange={v => setForm(p => ({ ...p, autoAdvance: v }))}
          label="⏭️ Auto-advance after submission"
          desc="Automatically show your next slot after completing a challenge"
        />
        <Toggle
          value={form.eloDecayReminder}
          onChange={v => setForm(p => ({ ...p, eloDecayReminder: v }))}
          label="⚠️ ELO decay reminders"
          desc="Warn you when inactivity is approaching the 14-day decay threshold"
        />
      </div>

      <InfoBox
        icon="⚔️"
        text={`Your plan (${plan.label}) gives you ${plan.arenaTasks} Arena slot${plan.arenaTasks !== 1 ? "s" : ""} per day, each refreshing every 24 hours.`}
        color={T.indigo}
        bg={T.indigo3}
      />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Notifications ────────────────────────────────────────────────────
// Settings/Security redesign (2026-09-02): this used to write to
// userData.notifPrefs, a column (profiles.notif_prefs) that never existed —
// every save silently failed server-side and this section still showed a
// fake "✓ Saved" regardless, since it never checked save()'s return value.
// Now backed by the real notification_preferences table via securityApi —
// see backend/server/lib/reengagementSignals.js for the one existing
// notification writer that actually reads and respects these.
function NotificationsSection() {
  const [prefs, setPrefs] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    securityApi.getNotificationPreferences()
      .then(r => setPrefs(r.preferences))
      .catch(() => setPrefs({}))
  }, [])

  const togglePref = (k) => setPrefs(p => ({ ...p, [k]: !(p[k] !== false) }))

  const handleSave = async () => {
    setLoading(true); setError(false)
    try {
      await securityApi.updateNotificationPreferences(prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3500)
    } finally {
      setLoading(false)
    }
  }

  const items = [
    { key:"career_recommendations", icon:"🧭", label:"Career recommendations",   desc:"Suggestions based on your profile and Arena activity" },
    { key:"arena_mission_ready",    icon:"⚔️", label:"Mission slot ready",        desc:"Notify when your 24-hour cooldown expires and a new slot is available" },
    { key:"arena_achievements",     icon:"🏆", label:"Achievement unlocks",       desc:"Notify when you hit a new ELO tier or earn a milestone" },
    { key:"arena_streak_reminders", icon:"⚠️", label:"Streak & ELO decay alerts", desc:"Alert before a streak breaks or the 14-day inactivity decay threshold" },
    { key:"market_reports",         icon:"📊", label:"New market report available", desc:"Alert when a fresh market analysis report is ready" },
    { key:"launchpad_matches",      icon:"🚀", label:"New job matches",           desc:"Digest of new Launchpad jobs matching your profile" },
    { key:"weekly_digest",          icon:"📧", label:"Weekly email digest",       desc:"Summary of your ELO progress and completed challenges" },
    { key:"marketing_emails",       icon:"📣", label:"Product news & offers",     desc:"Occasional email about new features or promotions — off by default" },
  ]

  if (!prefs) return <div style={{ fontSize:12, color:T.ink4 }}>Loading…</div>

  return (
    <div>
      <SectionTitle icon="🔔" title="Notifications" subtitle="Choose which alerts and digests you receive" />

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {items.map(item => (
          <Toggle
            key={item.key}
            value={prefs[item.key] !== false}
            onChange={() => togglePref(item.key)}
            label={`${item.icon} ${item.label}`}
            desc={item.desc}
          />
        ))}
      </div>

      <InfoBox icon="📭" text="Account and security notices (like a password change) are always sent and can't be turned off here." />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} error={error} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Appearance ───────────────────────────────────────────────────────
// Settings/Security redesign (2026-09-02): "Compact mode" used to write to
// userData.compactMode, a column (profiles.compact_mode) that never
// existed — the save silently failed AND, independent of that bug, nothing
// anywhere in Aura.jsx ever reads compactMode to actually change any
// layout density. It was decorative twice over. Rather than half-fix the
// persistence bug and still ship a toggle with zero visual effect, it's
// removed and folded into an honest "coming soon" note alongside dark
// mode — matching the design brief's "every row is functional now, clearly
// coming soon, or hidden" rule. The path-based accent color below is real
// and unchanged.
function AppearanceSection({ path }) {
  const pm = PATH_META[path] || PATH_META.student

  return (
    <div>
      <SectionTitle icon="🎨" title="Appearance" subtitle="Display preferences for your Capabilio experience" />

      <Card style={{ marginBottom:14 }}>
        <FieldLabel>Accent Color (Path-based)</FieldLabel>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
          {Object.entries(PATH_META).map(([key, meta]) => (
            <div key={key} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"7px 14px", borderRadius:20,
              background: key === path ? meta.bg : T.cream3,
              border:`1.5px solid ${key === path ? meta.color + "50" : "transparent"}`,
            }}>
              <div style={{ width:12, height:12, borderRadius:"50%", background:meta.color }} />
              <span style={{ fontSize:12, fontWeight:700, color: key === path ? meta.color : T.ink4 }}>{meta.label}</span>
              {key === path && <span style={{ fontSize:10, color:meta.color }}>● active</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop:8, fontSize:11, color:T.ink4 }}>
          Your accent color is automatically set by your career path ({pm.label}). It applies to navigation highlights, ELO badges, and active states throughout the app.
        </div>
      </Card>

      <InfoBox icon="🌙" text="Dark mode and a compact layout density option are on the Capabilio roadmap. Follow our announcements to stay informed when they launch." color={T.amber} bg={T.amber2} />
    </div>
  )
}

// ── Section: AI Preferences ───────────────────────────────────────────────────
// Settings/Security redesign (2026-09-02): previously wrote to
// userData.aiPrefs, a column (profiles.ai_prefs) that never existed — every
// save silently failed and this section still showed a fake "✓ Saved". Now
// backed by the real ai_preferences table. Every field here has a real,
// wired consumer: summary_tone/content_language feed
// POST /pro/profile/summary/generate's prompt (professionalProfile.js);
// feedback_style feeds Arena's AI-explanation generator
// (arenaCollegeStream.js's generateAiFeedback). The old "Auto-generate
// Portfolio summary" toggle is removed — nothing in this codebase
// auto-triggers summary generation (it's always a user-clicked button), so
// a toggle for it would have been decorative.
function AISection() {
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    securityApi.getAiPreferences()
      .then(r => setForm({
        summary_tone: r.preferences.summary_tone || "professional",
        content_language: r.preferences.content_language || "en",
        feedback_style: r.preferences.feedback_style || "detailed",
        personalization_enabled: r.preferences.personalization_enabled !== false,
        use_activity_for_recommendations: r.preferences.use_activity_for_recommendations !== false,
      }))
      .catch(() => setForm({ summary_tone: "professional", content_language: "en", feedback_style: "detailed", personalization_enabled: true, use_activity_for_recommendations: true }))
  }, [])

  const handleSave = async () => {
    setLoading(true); setError(false)
    try {
      await securityApi.updateAiPreferences(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3500)
    } finally {
      setLoading(false)
    }
  }

  if (!form) return <div style={{ fontSize:12, color:T.ink4 }}>Loading…</div>

  return (
    <div>
      <SectionTitle icon="🤖" title="AI Preferences" subtitle="How Capabilio AI generates content for you" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <FieldLabel>Profile Summary Tone</FieldLabel>
            <select
              value={form.summary_tone}
              onChange={e => setForm(p => ({ ...p, summary_tone: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="professional">Professional & formal</option>
              <option value="conversational">Conversational & warm</option>
              <option value="achievement">Achievement-focused</option>
              <option value="concise">Concise & punchy</option>
            </select>
          </div>
          <div>
            <FieldLabel>Content Language</FieldLabel>
            <select
              value={form.content_language}
              onChange={e => setForm(p => ({ ...p, content_language: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
            </select>
          </div>
          <div>
            <FieldLabel>Arena Feedback Style</FieldLabel>
            <select
              value={form.feedback_style}
              onChange={e => setForm(p => ({ ...p, feedback_style: e.target.value }))}
              style={{
                width:"100%", padding:"9px 12px", borderRadius:9,
                border:`1.5px solid ${T.border}`, fontSize:13,
                color:T.ink, background:"#fff", outline:"none",
              }}
            >
              <option value="detailed">Detailed (2-3 sentences)</option>
              <option value="concise">Concise (1 sentence)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>
          <Toggle
            value={form.personalization_enabled}
            onChange={v => setForm(p => ({ ...p, personalization_enabled: v }))}
            label="🧠 AI personalization"
            desc="Let Capabilio use your profile information to personalize AI-generated content"
          />
          <Toggle
            value={form.use_activity_for_recommendations}
            onChange={v => setForm(p => ({ ...p, use_activity_for_recommendations: v }))}
            label="📈 Use activity for recommendations"
            desc="Let Capabilio use your Arena history and skill activity to suggest what to practice next"
          />
        </div>
      </Card>

      <InfoBox icon="⚠️" text="AI-generated content can be wrong or incomplete. Don't treat it as professional, legal, medical, or financial advice, and avoid entering confidential or sensitive information into AI-assisted fields." color={T.amber} bg={T.amber2} />

      <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
        <SaveBtn onClick={handleSave} saved={saved} error={error} loading={loading} />
      </div>
    </div>
  )
}

// ── Section: Security ─────────────────────────────────────────────────────────
// ── Sub-section: Change Password ──────────────────────────────────────────────
function ChangePasswordCard() {
  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const reset = () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setError(""); setDone(false) }

  const handleSubmit = async () => {
    setError("")
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.")
    if (newPassword !== confirmPassword) return setError("New passwords don't match.")
    setLoading(true)
    try {
      await securityApi.changePassword(currentPassword, newPassword)
      setDone(true)
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
      setTimeout(() => { setDone(false); setOpen(false) }, 2000)
    } catch (e) {
      setError(e.message || "Could not change your password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <FieldLabel>Password</FieldLabel>
          <div style={{ fontSize:12, color:T.ink3 }}>Change the password you use to sign in.</div>
        </div>
        {!open && (
          <button onClick={() => { reset(); setOpen(true) }} style={{
            padding:"8px 16px", background:T.indigo3, border:"none", borderRadius:8,
            color:T.indigo, fontSize:12, fontWeight:700, cursor:"pointer",
          }}>Change Password</button>
        )}
      </div>

      {open && (
        <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:10 }}>
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <Input type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Enter your current password" />
          </div>
          <div>
            <FieldLabel>New Password</FieldLabel>
            <Input type="password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" />
          </div>
          <div>
            <FieldLabel>Confirm New Password</FieldLabel>
            <Input type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your new password" />
          </div>
          {error && <div style={{ fontSize:12, color:T.red, fontWeight:600 }}>{error}</div>}
          {done && <div style={{ fontSize:12, color:T.green, fontWeight:700 }}>✓ Password changed</div>}
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handleSubmit} disabled={loading || !currentPassword || !newPassword} style={{
              padding:"9px 18px", background: loading ? T.cream3 : T.indigo, border:"none", borderRadius:8,
              color: loading ? T.ink4 : "#fff", fontSize:12, fontWeight:700, cursor: loading ? "wait" : "pointer",
            }}>{loading ? "Changing…" : "Confirm Change"}</button>
            <button onClick={() => setOpen(false)} style={{
              padding:"9px 18px", background:T.cream3, border:"none", borderRadius:8,
              color:T.ink2, fontSize:12, fontWeight:700, cursor:"pointer",
            }}>Cancel</button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Sub-section: Two-Factor Authentication ────────────────────────────────────
// Built directly on Supabase Auth's own native TOTP MFA (auth.mfa.enroll/
// challenge/verify/unenroll) via backend/server/routes/security.js — this
// backend never generates, sees, or stores the TOTP secret itself; Supabase
// does. Recovery codes are Capabilio's own addition on top, since Supabase
// has no native backup-code mechanism (their documented recommendation is a
// second TOTP factor instead — see the design report for why hashed
// recovery codes were chosen here instead).
function RecoveryCodesDisplay({ codes }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <InfoBox icon="🔑" text="Save these recovery codes somewhere safe — each one can be used once if you lose access to your authenticator app. They will not be shown again." color={T.amber} bg={T.amber2} />
      <div style={{
        display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10,
        padding:14, background:T.ink, borderRadius:10,
      }}>
        {codes.map(c => (
          <div key={c} style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#E8E8E1", letterSpacing:0.5 }}>{c}</div>
        ))}
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(codes.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        style={{ marginTop:10, padding:"8px 16px", background:T.indigo3, border:"none", borderRadius:8, color:T.indigo, fontSize:12, fontWeight:700, cursor:"pointer" }}
      >{copied ? "✓ Copied" : "Copy all codes"}</button>
    </div>
  )
}

function TwoFactorSetupWizard({ onDone, onCancel }) {
  const [step, setStep] = useState("password") // password -> qr -> verify -> codes
  const [password, setPassword] = useState("")
  const [factorId, setFactorId] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState(null)
  const [code, setCode] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const startEnroll = async () => {
    setError(""); setLoading(true)
    try {
      const res = await securityApi.mfaEnroll(password)
      setFactorId(res.factorId); setQrCode(res.qrCode); setSecret(res.secret)
      setStep("qr")
    } catch (e) { setError(e.message || "Could not start setup.") } finally { setLoading(false) }
  }

  const submitVerify = async () => {
    setError(""); setLoading(true)
    try {
      const res = await securityApi.mfaVerify(factorId, code)
      setRecoveryCodes(res.recoveryCodes)
      setStep("codes")
    } catch (e) { setError(e.message || "Incorrect code.") } finally { setLoading(false) }
  }

  return (
    <Card style={{ marginTop:14, border:`1.5px solid ${T.indigo}33` }}>
      {step === "password" && (
        <div>
          <FieldLabel>Confirm your password to continue</FieldLabel>
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <Input type="password" value={password} onChange={setPassword} placeholder="Current password" />
          </div>
          {error && <div style={{ fontSize:12, color:T.red, marginTop:8, fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button onClick={startEnroll} disabled={loading || !password} style={{ padding:"9px 18px", background:T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{loading ? "Starting…" : "Continue"}</button>
            <button onClick={onCancel} style={{ padding:"9px 18px", background:T.cream3, border:"none", borderRadius:8, color:T.ink2, fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {step === "qr" && (
        <div>
          <FieldLabel>Scan this QR code with your authenticator app</FieldLabel>
          <div style={{ fontSize:12, color:T.ink3, marginBottom:10 }}>Google Authenticator, Microsoft Authenticator, Authy, or 1Password all work.</div>
          {qrCode && <img src={qrCode} alt="Two-factor authentication QR code" style={{ width:180, height:180, borderRadius:10, border:`1px solid ${T.border}` }} />}
          {secret && (
            <div style={{ marginTop:10, fontSize:11, color:T.ink4 }}>
              Can&apos;t scan it? Enter this key manually: <span style={{ fontFamily:"'DM Mono',monospace", color:T.ink2 }}>{secret}</span>
            </div>
          )}
          <div style={{ marginTop:14 }}>
            <FieldLabel>Enter the 6-digit code from your app</FieldLabel>
            <Input value={code} onChange={setCode} placeholder="123456" monospace />
          </div>
          {error && <div style={{ fontSize:12, color:T.red, marginTop:8, fontWeight:600 }}>{error}</div>}
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button onClick={submitVerify} disabled={loading || code.length < 6} style={{ padding:"9px 18px", background:T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{loading ? "Verifying…" : "Verify & Enable"}</button>
            <button onClick={onCancel} style={{ padding:"9px 18px", background:T.cream3, border:"none", borderRadius:8, color:T.ink2, fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {step === "codes" && recoveryCodes && (
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:T.green, marginBottom:10 }}>✓ Two-factor authentication is now enabled</div>
          <RecoveryCodesDisplay codes={recoveryCodes} />
          <button onClick={onDone} style={{ marginTop:14, padding:"9px 18px", background:T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Done</button>
        </div>
      )}
    </Card>
  )
}

function DisableTwoFactorFlow({ factorId, onDone, onCancel }) {
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState("code") // code | recoveryCode
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(""); setLoading(true)
    try {
      await securityApi.mfaDisable(password, factorId, mode === "code" ? { code } : { recoveryCode: code })
      onDone()
    } catch (e) { setError(e.message || "Could not disable two-factor authentication.") } finally { setLoading(false) }
  }

  return (
    <Card style={{ marginTop:14, border:`1.5px solid ${T.red}33` }}>
      <FieldLabel>Disable two-factor authentication</FieldLabel>
      <div style={{ fontSize:12, color:T.ink3, marginBottom:10 }}>This requires your password and a current code — an attacker with just your browser session can&apos;t turn this off.</div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <Input type="password" value={password} onChange={setPassword} placeholder="Current password" />
        <div style={{ display:"flex", gap:14, fontSize:12 }}>
          <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
            <input type="radio" checked={mode === "code"} onChange={() => { setMode("code"); setCode("") }} /> Authenticator code
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
            <input type="radio" checked={mode === "recoveryCode"} onChange={() => { setMode("recoveryCode"); setCode("") }} /> Recovery code
          </label>
        </div>
        <Input value={code} onChange={setCode} placeholder={mode === "code" ? "6-digit code" : "XXXX-XXXX"} monospace />
      </div>
      {error && <div style={{ fontSize:12, color:T.red, marginTop:8, fontWeight:600 }}>{error}</div>}
      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <button onClick={submit} disabled={loading || !password || !code} style={{ padding:"9px 18px", background:T.red, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{loading ? "Disabling…" : "Disable 2FA"}</button>
        <button onClick={onCancel} style={{ padding:"9px 18px", background:T.cream3, border:"none", borderRadius:8, color:T.ink2, fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</button>
      </div>
    </Card>
  )
}

function TwoFactorCard() {
  const [status, setStatus] = useState(null) // null = loading
  const [mode, setMode] = useState(null) // null | "setup" | "disable" | "regenerate"
  const [regenCode, setRegenCode] = useState("")
  const [regenPassword, setRegenPassword] = useState("")
  const [regenCodes, setRegenCodes] = useState(null)
  const [regenError, setRegenError] = useState("")
  const [regenLoading, setRegenLoading] = useState(false)

  const load = () => securityApi.mfaStatus().then(setStatus).catch(() => setStatus({ enabled: false, error: true }))
  useEffect(() => { load() }, [])

  const submitRegenerate = async () => {
    setRegenError(""); setRegenLoading(true)
    try {
      const res = await securityApi.regenerateRecoveryCodes(regenPassword, regenCode)
      setRegenCodes(res.recoveryCodes)
    } catch (e) { setRegenError(e.message || "Could not regenerate recovery codes.") } finally { setRegenLoading(false) }
  }

  if (!status) return <Card style={{ marginBottom:14 }}><div style={{ fontSize:12, color:T.ink4 }}>Loading…</div></Card>

  return (
    <Card style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <FieldLabel>Two-Factor Authentication</FieldLabel>
          <div style={{ fontSize:12, color:T.ink3 }}>
            {status.enabled
              ? `Enabled since ${status.createdAt ? new Date(status.createdAt).toLocaleDateString("en-IN") : "—"} · ${status.recoveryCodesRemaining} recovery code${status.recoveryCodesRemaining === 1 ? "" : "s"} remaining`
              : "Add an authenticator app as a second sign-in step."}
          </div>
        </div>
        {status.enabled ? (
          <span style={{ padding:"6px 12px", background:T.green2, borderRadius:20, color:T.green, fontSize:11, fontWeight:800 }}>● Enabled</span>
        ) : (
          !mode && <button onClick={() => setMode("setup")} style={{ padding:"8px 16px", background:T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Set Up</button>
        )}
      </div>

      {status.enabled && !mode && (
        <div style={{ display:"flex", gap:10, marginTop:12 }}>
          <button onClick={() => setMode("regenerate")} style={{ padding:"8px 14px", background:T.cream3, border:"none", borderRadius:8, color:T.ink2, fontSize:12, fontWeight:700, cursor:"pointer" }}>Regenerate Recovery Codes</button>
          <button onClick={() => setMode("disable")} style={{ padding:"8px 14px", background:"transparent", border:`1.5px solid ${T.red}`, borderRadius:8, color:T.red, fontSize:12, fontWeight:700, cursor:"pointer" }}>Disable 2FA</button>
        </div>
      )}

      {mode === "setup" && (
        <TwoFactorSetupWizard onDone={() => { setMode(null); load() }} onCancel={() => setMode(null)} />
      )}
      {mode === "disable" && (
        <DisableTwoFactorFlow factorId={status.factorId} onDone={() => { setMode(null); load() }} onCancel={() => setMode(null)} />
      )}
      {mode === "regenerate" && (
        <Card style={{ marginTop:14 }}>
          {!regenCodes ? (
            <>
              <FieldLabel>Regenerate recovery codes</FieldLabel>
              <div style={{ fontSize:12, color:T.ink3, marginBottom:10 }}>This invalidates every existing recovery code immediately.</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <Input type="password" value={regenPassword} onChange={setRegenPassword} placeholder="Current password" />
                <Input value={regenCode} onChange={setRegenCode} placeholder="6-digit authenticator code" monospace />
              </div>
              {regenError && <div style={{ fontSize:12, color:T.red, marginTop:8, fontWeight:600 }}>{regenError}</div>}
              <div style={{ display:"flex", gap:10, marginTop:14 }}>
                <button onClick={submitRegenerate} disabled={regenLoading || !regenPassword || !regenCode} style={{ padding:"9px 18px", background:T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{regenLoading ? "Regenerating…" : "Regenerate"}</button>
                <button onClick={() => setMode(null)} style={{ padding:"9px 18px", background:T.cream3, border:"none", borderRadius:8, color:T.ink2, fontSize:12, fontWeight:700, cursor:"pointer" }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <RecoveryCodesDisplay codes={regenCodes} />
              <button onClick={() => { setMode(null); setRegenCodes(null); setRegenPassword(""); setRegenCode(""); load() }} style={{ marginTop:14, padding:"9px 18px", background:T.indigo, border:"none", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Done</button>
            </>
          )}
        </Card>
      )}
    </Card>
  )
}

// ── Sub-section: Active Sessions ──────────────────────────────────────────────
// Lists Supabase's own real session records (see backend's
// get_user_sessions_admin). Per-row "revoke this one device" isn't offered
// deliberately — Supabase's documented signOut() API only supports
// scope global/local/others (no single-session-by-id revocation), so this
// exposes only actions that are genuinely, fully backed server-side. See
// the design report's "Recovery and session management design" section.
function SessionsCard() {
  const [sessions, setSessions] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => { securityApi.sessions().then(r => setSessions(r.sessions)).catch(() => setSessions([])) }, [])

  const signOutOthers = async () => {
    setBusy(true); setMessage("")
    try {
      await supabase.auth.signOut({ scope: "others" })
      setMessage("Signed out of every other session.")
      securityApi.sessions().then(r => setSessions(r.sessions))
    } catch { setMessage("Could not sign out other sessions.") } finally { setBusy(false) }
  }

  const signOutEverywhere = async () => {
    setBusy(true)
    try { await supabase.auth.signOut({ scope: "global" }) }
    finally { setBusy(false) }
  }

  return (
    <Card style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <FieldLabel>Active Sessions</FieldLabel>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={signOutOthers} disabled={busy} style={{ padding:"7px 12px", background:T.cream3, border:"none", borderRadius:7, color:T.ink2, fontSize:11, fontWeight:700, cursor:"pointer" }}>Sign out other sessions</button>
          <button onClick={signOutEverywhere} disabled={busy} style={{ padding:"7px 12px", background:"transparent", border:`1.5px solid ${T.red}`, borderRadius:7, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer" }}>Sign out everywhere</button>
        </div>
      </div>
      {message && <div style={{ fontSize:12, color:T.green, fontWeight:600, marginBottom:8 }}>{message}</div>}
      {sessions === null ? (
        <div style={{ fontSize:12, color:T.ink4 }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div style={{ fontSize:12, color:T.ink4 }}>No session records found.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {sessions.map(s => (
            <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:T.cream, borderRadius:8, fontSize:12 }}>
              <div>
                <span style={{ fontWeight:700, color:T.ink }}>{s.userAgent ? s.userAgent.slice(0, 60) : "Unknown device"}</span>
                {s.isCurrent && <span style={{ marginLeft:8, padding:"1px 7px", background:T.indigo3, color:T.indigo, borderRadius:20, fontSize:10, fontWeight:800 }}>This device</span>}
                <div style={{ color:T.ink4, fontSize:11, marginTop:2 }}>Last active {new Date(s.lastActiveAt).toLocaleString("en-IN")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Sub-section: Recent Security Activity ─────────────────────────────────────
const SECURITY_EVENT_LABEL = {
  mfa_enabled: "Two-factor authentication enabled",
  mfa_disabled: "Two-factor authentication disabled",
  mfa_challenge_failed: "Failed two-factor verification attempt",
  recovery_codes_regenerated: "Recovery codes regenerated",
  recovery_code_used: "Signed in with a recovery code",
  password_changed: "Password changed",
  session_revoked: "A session was signed out",
  all_sessions_revoked: "Signed out of all sessions",
  profile_visibility_changed: "Profile visibility changed",
  account_deletion_requested: "Account deletion requested",
}

function SecurityActivityCard() {
  const [events, setEvents] = useState(null)
  useEffect(() => { securityApi.events().then(r => setEvents(r.events)).catch(() => setEvents([])) }, [])
  if (events === null) return null
  if (events.length === 0) return null
  return (
    <Card style={{ marginBottom:14 }}>
      <FieldLabel>Recent Security Activity</FieldLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
        {events.slice(0, 8).map((e, i) => (
          <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.ink2 }}>{SECURITY_EVENT_LABEL[e.event_type] || e.event_type}</span>
            <span style={{ color:T.ink4, fontFamily:"'DM Mono',monospace", fontSize:11 }}>{new Date(e.created_at).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SecuritySection({ user }) {
  const providers = user?.app_metadata?.providers || [user?.app_metadata?.provider].filter(Boolean) || []
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("en-IN") : "—"
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "—"

  return (
    <div>
      <SectionTitle icon="🛡️" title="Login & Security" subtitle="Password, two-factor authentication, and active sessions" />

      <ChangePasswordCard />
      <TwoFactorCard />
      <SessionsCard />
      <SecurityActivityCard />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <FieldLabel>Account Created</FieldLabel>
            <div style={{ fontSize:13, color:T.ink, fontWeight:600 }}>{createdAt}</div>
          </div>
          <div>
            <FieldLabel>Last Sign In</FieldLabel>
            <div style={{ fontSize:13, color:T.ink, fontWeight:600 }}>{lastSignIn}</div>
          </div>
        </div>
      </Card>

      {providers.length > 0 && (
        <InfoBox icon="🔗" text={`Connected sign-in: ${providers.join(", ")}`} />
      )}
    </div>
  )
}

// ── Section: Data & Export ────────────────────────────────────────────────────
function DataSection({ userData, user }) {
  const [exportLoading, setExportLoading] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  const handleExport = async () => {
    setExportLoading(true)
    try {
      // Fetch full profile + arena history
      const uid = user?.id
      const [{ data: profile }, { data: history }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("arena_history").select("*").eq("user_id", uid).order("completed_at", { ascending: false }),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile,
        arenaHistory: history || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type:"application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `capabilio-profile-${profile?.username || uid?.slice(0,8)}-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="📦" title="Data & Export" subtitle="Download your Capabilio data" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:6 }}>Export Profile Data</div>
        <div style={{ fontSize:12, color:T.ink3, marginBottom:16, lineHeight:1.6 }}>
          Download a complete JSON export of your Capabilio profile including: personal information, ELO history, Arena submission history, skill graph, certifications, and all settings.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            style={{
              padding:"10px 20px", background:exportDone ? T.green : T.indigo,
              border:"none", borderRadius:9, color:"#fff", fontSize:13,
              fontWeight:700, cursor: exportLoading ? "wait" : "pointer",
              display:"flex", alignItems:"center", gap:7, transition:"background 0.25s",
            }}
          >
            {exportLoading ? "⏳ Preparing…" : exportDone ? "✓ Downloaded" : "⬇️ Download JSON"}
          </button>
        </div>
      </Card>

      <InfoBox
        icon="🇮🇳"
        text="Under the Digital Personal Data Protection Act (DPDPA) 2023, you have the right to access and receive a copy of your personal data. Your export includes all data Capabilio holds about your account."
        color={T.green}
        bg={T.green2}
      />

      <Card style={{ marginTop:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:6 }}>Data Retention</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12, color:T.ink3 }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span>Profile data</span><span style={{ fontWeight:700, color:T.ink2 }}>Kept while account is active</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span>Arena history</span><span style={{ fontWeight:700, color:T.ink2 }}>Kept indefinitely</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span>Deleted account data</span><span style={{ fontWeight:700, color:T.ink2 }}>Purged within 30 days</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Section: Help & Support ───────────────────────────────────────────────────
function HelpSection() {
  const links = [
    { icon:"📖", label:"Documentation",       desc:"Guides for all Capabilio features",     href:"https://docs.capabilio.com",   color:T.blue },
    { icon:"💬", label:"Community Forum",     desc:"Questions, tips, and announcements",    href:"https://community.capabilio.com", color:T.indigo },
    { icon:"🐛", label:"Report a Bug",        desc:"Found something broken? Tell us",       href:"mailto:support@capabilio.com",  color:T.amber },
    { icon:"✉️", label:"Contact Support",     desc:"Get help from the Capabilio team",      href:"mailto:support@capabilio.com",  color:T.green },
    { icon:"🗺️", label:"Feature Roadmap",     desc:"See what's coming next on Capabilio",   href:"https://capabilio.com/roadmap", color:T.ink2 },
  ]

  return (
    <div>
      <SectionTitle icon="💬" title="Help & Support" subtitle="Resources, documentation, and ways to reach us" />

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {links.map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration:"none" }}
          >
            <div style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"14px 16px", background:"#fff",
              border:`1px solid ${T.border}`, borderRadius:12,
              boxShadow:T.shadow, cursor:"pointer", transition:"box-shadow 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = T.shadow2}
              onMouseLeave={e => e.currentTarget.style.boxShadow = T.shadow}
            >
              <div style={{
                width:38, height:38, borderRadius:10, display:"flex",
                alignItems:"center", justifyContent:"center",
                background:`${link.color}15`, fontSize:18,
              }}>{link.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{link.label}</div>
                <div style={{ fontSize:11, color:T.ink3 }}>{link.desc}</div>
              </div>
              <span style={{ fontSize:14, color:T.ink4 }}>→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Section: About ────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <div>
      <SectionTitle icon="ℹ️" title="About Capabilio" subtitle="Version and platform information" />

      <Card style={{ marginBottom:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { label:"Platform",          value:"Capabilio AI — Professional Growth Platform" },
            { label:"Version",           value:"2.1.0" },
            { label:"Build",             value:"React 18 + Vite 5 (Vercel)" },
            { label:"Auth Provider",     value:"Supabase Auth" },
            { label:"Arena Engine",      value:"Domain Challenge Slots v2 — 24hr cooldown" },
            { label:"ELO System",        value:"Custom ELO with decay (−5/day after 14-day grace)" },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${T.border}`, paddingBottom:10, gap:12 }}>
              <span style={{ fontSize:12, color:T.ink4, fontWeight:600 }}>{row.label}</span>
              <span style={{ fontSize:12, color:T.ink2, fontWeight:700, textAlign:"right" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <InfoBox
        icon="🇮🇳"
        text="Capabilio is built in India, for India. Our mission is to make talent provable, not just claimable — turning skills into verifiable, ranked credentials through real performance data."
        color={T.indigo}
        bg={T.indigo3}
      />
    </div>
  )
}

// ── Section: Policies ─────────────────────────────────────────────────────────
// Content lives in config/policies/* (one file per document, data-only —
// see privacyPolicy.js's header comment) so this component never has to
// hold five giant hardcoded legal documents. PolicyModal is the one shared,
// reusable presentation layer for all of them.
const POLICY_CARDS = [
  { id: "privacy", icon: "🔒" },
  { id: "terms",   icon: "📜" },
  { id: "cookies", icon: "🍪" },
  { id: "dpdp",    icon: "🇮🇳" },
  { id: "refund",  icon: "💳" },
]

function PoliciesSection() {
  const [openPolicyId, setOpenPolicyId] = useState(null)
  const openPolicy = openPolicyId ? POLICIES[openPolicyId] : null

  return (
    <div>
      <SectionTitle icon="📜" title="Policies" subtitle="Legal documents governing your use of Capabilio" />

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {POLICY_CARDS.map(card => {
          const doc = POLICIES[card.id]
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setOpenPolicyId(card.id)}
              style={{
                display:"flex", alignItems:"center", gap:12, textAlign:"left",
                padding:"13px 16px", background:"#fff", width:"100%",
                border:`1px solid ${T.border}`, borderRadius:11, boxShadow:T.shadow,
                cursor:"pointer", font:"inherit",
              }}
            >
              <span style={{ fontSize:20 }}>{card.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{doc.title}</div>
                <div style={{ fontSize:11, color:T.ink4 }}>Last updated: {formatPolicyDate(doc.lastUpdated)}</div>
              </div>
              <span style={{ fontSize:11, color:T.indigo, fontWeight:700 }}>View →</span>
            </button>
          )
        })}
      </div>

      <PolicyModal policy={openPolicy} onClose={() => setOpenPolicyId(null)} />
    </div>
  )
}

// ── Section: Advanced ─────────────────────────────────────────────────────────
// Settings/Security redesign (2026-09-02): two fixes here beyond wiring
// real re-authentication —
//  1. Deletion previously wrote deletion_requested_at directly from the
//     client with no password check at all; now goes through
//     POST /api/security/account/delete, which re-verifies the password
//     server-side AND immediately revokes every active session (global
//     sign-out), not just the current tab's local one.
//  2. The "Debug Information" card (raw User ID, internal state) shown to
//     every normal user in production is exactly the kind of internal/
//     development-facing detail the redesign brief says must never reach
//     a normal user's Settings page — removed, not relocated.
function AdvancedSection() {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [password, setPassword] = useState("")
  const [deleteInput, setDeleteInput] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return
    setDeleteLoading(true); setError("")
    try {
      await securityApi.deleteAccount(password, "user_requested")
      setDone(true)
      setTimeout(() => { window.location.href = "/" }, 2500)
    } catch (e) {
      setError(e.message || "Could not process the deletion request.")
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <SectionTitle icon="⚙️" title="Advanced" subtitle="Account management" />

      {/* Danger Zone */}
      <div style={{
        border:`2px solid ${T.red}33`, borderRadius:14,
        padding:"18px 20px", background:T.red2,
      }}>
        <div style={{ fontSize:12, fontWeight:800, color:T.red, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          ⚠️ Danger Zone
        </div>

        {done ? (
          <div style={{ fontSize:13, color:T.green, fontWeight:700 }}>
            ✓ Deletion request recorded and you&apos;ve been signed out everywhere. Redirecting…
          </div>
        ) : !confirmDelete ? (
          <>
            <div style={{ fontSize:12, color:T.ink2, marginBottom:14, lineHeight:1.6 }}>
              Permanently delete your Capabilio account. This removes your profile, ELO history, Arena submissions, and all data. <strong>This cannot be undone.</strong> Data removal is a manual process today, not an instant automated purge — see our DPDP Compliance Notice.
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding:"9px 18px", background:"transparent",
                border:`1.5px solid ${T.red}`, borderRadius:8,
                color:T.red, fontSize:12, fontWeight:700, cursor:"pointer",
              }}
            >
              Delete Account…
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize:12, color:T.red, marginBottom:12, fontWeight:700 }}>
              Confirm your password, then type DELETE to permanently delete your account:
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Current password"
                style={{
                  padding:"9px 12px", borderRadius:8,
                  border:`1.5px solid ${T.red}`, fontSize:13,
                  color:T.ink, outline:"none", background:"#fff",
                }}
              />
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder='Type "DELETE"'
                  style={{
                    flex:1, padding:"9px 12px", borderRadius:8,
                    border:`1.5px solid ${T.red}`, fontSize:13,
                    color:T.ink, fontFamily:"'DM Mono',monospace",
                    outline:"none", background:"#fff",
                  }}
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== "DELETE" || !password || deleteLoading}
                  style={{
                    padding:"9px 16px", background: deleteInput === "DELETE" && password ? T.red : T.cream3,
                    border:"none", borderRadius:8, color: deleteInput === "DELETE" && password ? "#fff" : T.ink4,
                    fontSize:12, fontWeight:700,
                    cursor: deleteInput === "DELETE" && password ? "pointer" : "not-allowed",
                  }}
                >
                  {deleteLoading ? "Deleting…" : "Confirm Delete"}
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteInput(""); setPassword(""); setError("") }}
                  style={{
                    padding:"9px 16px", background:T.cream3,
                    border:"none", borderRadius:8, color:T.ink2,
                    fontSize:12, fontWeight:700, cursor:"pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
              {error && <div style={{ fontSize:12, color:T.red, fontWeight:600 }}>{error}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Right Contextual Panel ────────────────────────────────────────────────────
function ContextPanel({ userData, activeSection, eloRating }) {
  const { score, items } = calcCompleteness(userData)
  // eloRating is passed down from SettingsPanel's own (now path-aware)
  // computation rather than recomputed here from userData.eloRating alone —
  // this panel used to independently derive its tier from the legacy field
  // even for professional users, so its "Your Standing" tier LABEL could
  // disagree with the identity-card badge above even after that badge was
  // fixed to use the real Professional ELO track. Falls back to the legacy
  // field only if the prop wasn't passed (defensive, shouldn't happen).
  const tier = getTier(eloRating ?? userData?.eloRating ?? 500)
  const pm = PATH_META[userData?.path] || PATH_META.student

  const tips = {
    profile: [
      "A professional headline increases profile views by 3×",
      "Profiles with photos get 21× more attention than those without",
      "Keep your bio under 200 characters for LinkedIn compatibility",
    ],
    account: [
      "Set a memorable username — it's your permanent Portfolio URL",
      "Your portfolio link works without logging in",
    ],
    path: [
      "Your job keyword directly seeds your Arena domain",
      "Accurate experience level improves Launchpad job relevance",
    ],
    privacy: [
      "Enabling search visibility can bring recruiter attention",
      "You can always re-enable hidden pages without losing data",
    ],
    proof: [
      "LinkedIn + GitHub boosts your trust score significantly",
      "Recruiters check certifications — keep them visible",
    ],
    employment: [
      "UAN verification adds an EPFO-verified badge to your profile",
      "Employment history from EPFO is trusted by recruiters as ground truth",
      "Mismatched details are automatically corrected to match EPFO records",
    ],
    arena: [
      "Consistent daily practice prevents ELO decay",
      "Hard/Expert challenges give the highest ELO gains",
    ],
    notifications: [
      "Mission ready alerts help you never waste a slot",
      "Weekly digest keeps you informed without noise",
    ],
    ai: [
      "Achievement-focused tone works best for job applications",
      "Auto-summary keeps your Portfolio always up-to-date",
    ],
    default: [
      "Your profile strength directly impacts Launchpad matches",
      "Complete your profile to unlock all Capabilio features",
    ],
  }

  const activeTips = tips[activeSection] || tips.default

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Profile Completeness */}
      <Card>
        <div style={{ fontSize:11, fontWeight:800, color:T.indigo, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          Profile Strength
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
          <span style={{ fontSize:28, fontWeight:900, color: score >= 80 ? T.green : score >= 50 ? T.amber : T.red }}>{score}</span>
          <span style={{ fontSize:14, color:T.ink4 }}>/100</span>
          <span style={{
            marginLeft:"auto", fontSize:11, fontWeight:700,
            color: score >= 80 ? T.green : score >= 50 ? T.amber : T.red,
          }}>
            {score >= 80 ? "Strong ✓" : score >= 50 ? "Good" : "Needs work"}
          </span>
        </div>
        <div style={{
          height:6, background:T.cream3, borderRadius:99, overflow:"hidden", marginBottom:12,
        }}>
          <div style={{
            height:"100%", borderRadius:99, transition:"width 0.5s ease",
            width:`${score}%`,
            background: score >= 80 ? T.green : score >= 50 ? T.amber : T.red,
          }}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {items.map(item => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ fontSize:11, color: item.done ? T.green : T.ink4 }}>
                {item.done ? "✓" : "○"}
              </span>
              <span style={{ fontSize:11, color: item.done ? T.ink2 : T.ink4, fontWeight: item.done ? 600 : 400 }}>
                {item.label}
              </span>
              <span style={{ marginLeft:"auto", fontSize:10, color:T.ink4 }}>+{item.pts}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Standing — Arena/ELO tier is a student-path concept (chess-style
          rating tied to daily missions). Professional/authority users don't
          engage with Arena the same way, so showing a bare "ELO 800" number
          here with no translation doesn't mean anything to them (Career OS
          Non-negotiable Rule #1: no bare score number ships without a
          plain-language translation). Student path keeps the full tier +
          number; professional/authority get the tier label only, framed as a
          plain sentence, no raw figure. */}
      <Card>
        <div style={{ fontSize:11, fontWeight:800, color:T.ink3, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          Your Standing
        </div>
        {(userData?.path === "professional" || userData?.path === "authority") ? (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{tier.icon}</span>
            <div style={{ fontSize:12, color:T.ink3, lineHeight:1.5 }}>
              Your Arena skill tier is <strong style={{ color:tier.color }}>{tier.label}</strong>{userData?.eloRating ? " — recorded from your completed challenges." : ", based on your baseline assessment."}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <span style={{ fontSize:24 }}>{tier.icon}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:tier.color }}>{tier.label}</div>
              <div style={{ fontSize:11, color:T.ink4 }}>ELO {userData?.eloRating || 500}</div>
            </div>
          </div>
        )}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px",
          background:pm.bg, borderRadius:20,
        }}>
          <span style={{ fontSize:12 }}>{pm.icon}</span>
          <span style={{ fontSize:11, fontWeight:700, color:pm.color }}>{pm.label} Path</span>
        </div>
      </Card>

      {/* Contextual Tips */}
      <Card>
        <div style={{ fontSize:11, fontWeight:800, color:T.amber, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
          💡 Tips
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {activeTips.map((tip, i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <span style={{ fontSize:11, color:T.amber, marginTop:1 }}>▸</span>
              <span style={{ fontSize:11, color:T.ink3, lineHeight:1.55 }}>{tip}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Main SettingsPanel export ─────────────────────────────────────────────────
export default function SettingsPanel({ userData, user, save, setUserData, path, initialSection }) {
  const [activeSection, setActiveSection] = useState(initialSection || "profile")
  const mainRef = useRef(null)

  const go = (id) => {
    setActiveSection(id)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }

  const allSections = NAV_GROUPS.flatMap(g => g.items)
  const current = allSections.find(s => s.id === activeSection)

  // Mirrors App.jsx's top-nav ELO badge fix (2026-07-26) exactly — same
  // source, same "professional path uses the real Professional Skill Rating
  // track, everyone else keeps the legacy Arena/profile-completeness field"
  // logic, so this identity-card badge can never disagree with the number
  // right above it in the nav. This badge was previously reading
  // userData.eloRating unconditionally for every path, which is how it ended
  // up showing a different number ("1050") than the nav pill ("987") for the
  // same professional user at the same moment — two real ELO systems
  // (profiles.elo_rating vs professional_elo_state), read inconsistently.
  const effectivePath = path || userData?.path
  const [proElo, setProElo] = useState(null)
  useEffect(() => {
    if (effectivePath !== "professional") { setProElo(null); return }
    let cancelled = false
    import("../lib/api").then(({ professionalEloApi }) => {
      professionalEloApi.status()
        .then(res => { if (!cancelled) setProElo(res) })
        .catch(() => { if (!cancelled) setProElo(null) })
    })
    return () => { cancelled = true }
  }, [effectivePath])
  const eloRating = (effectivePath === "professional" && proElo != null)
    ? (proElo.overall_elo ?? proElo.elo ?? userData?.eloRating ?? 500)
    : (userData?.eloRating || 500)
  const tier = getTier(eloRating)
  const pm = PATH_META[path || userData?.path] || PATH_META.student
  const plan = getPlan(userData)
  const avatarUrl = userData?.avatarUrl || userData?.avatar_url
  const displayName = userData?.displayName || userData?.display_name || user?.user_metadata?.full_name || "User"
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()

  // Render active section
  const renderSection = () => {
    const props = { userData, user, save, setUserData, path: path || userData?.path }
    switch(activeSection) {
      case "profile":       return <ProfileSection {...props} />
      case "account":       return <AccountSection {...props} />
      case "path":          return <PathSection {...props} />
      case "arena":         return <ArenaSection {...props} />
      case "privacy":       return <PrivacySection {...props} />
      case "proof":         return <ProofSection {...props} />
      case "employment":    return <UANVerificationSection {...props} />
      case "notifications": return <NotificationsSection {...props} />
      case "appearance":    return <AppearanceSection {...props} />
      case "ai":            return <AISection {...props} />
      case "data":          return <DataSection {...props} />
      case "security":      return <SecuritySection {...props} />
      case "help":          return <HelpSection />
      case "about":         return <AboutSection />
      case "policies":      return <PoliciesSection />
      case "advanced":      return <AdvancedSection {...props} />
      default:              return <ProfileSection {...props} />
    }
  }

  return (
    <div style={{ animation:"fadeUp .3s ease both" }}>

      {/* ── Top Profile Identity Card ─────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1A1714 0%, #1A1714 60%, #312e81 100%)",
        borderRadius: 16, padding:"22px 24px", marginBottom:20,
        boxShadow:"0 4px 20px rgba(0,0,0,0.15)", color:"#fff",
        display:"flex", alignItems:"center", gap:18, flexWrap:"wrap",
      }}>
        {/* Avatar */}
        <div style={{
          width:60, height:60, borderRadius:"50%",
          background: avatarUrl ? "transparent" : `linear-gradient(135deg,${pm.color},${T.indigo})`,
          border:"3px solid rgba(255,255,255,0.2)",
          overflow:"hidden", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span style={{ fontSize:22, fontWeight:900, color:"#fff" }}>{initials}</span>
          }
        </div>

        {/* Name + badges */}
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:6 }}>
            <h2 style={{ fontSize:18, fontWeight:900, color:"#fff", margin:0 }}>{displayName}</h2>
            {eloRating >= 800 && (
              <span style={{
                fontSize:10, fontWeight:800, padding:"3px 8px",
                background:"rgba(255,255,255,0.15)", borderRadius:99, letterSpacing:0.5,
              }}>✓ Verified</span>
            )}
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px",
              background:pm.bg, color:pm.color, borderRadius:20,
            }}>{pm.icon} {pm.label}</span>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px",
              background:`${tier.color}22`, color:tier.color, borderRadius:20,
            }}>{tier.icon} {tier.label} · {eloRating} ELO</span>
            <span style={{
              fontSize:11, fontWeight:700, padding:"3px 10px",
              background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.75)", borderRadius:20,
            }}>🎟️ {plan.label}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {userData?.username && (
            <a
              href={`/portfolio/${userData.username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding:"8px 14px", background:"rgba(255,255,255,0.12)",
                border:"1px solid rgba(255,255,255,0.2)", borderRadius:9,
                color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none",
                display:"flex", alignItems:"center", gap:5,
              }}
            >
              🔗 Portfolio
            </a>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(
              userData?.username ? `${window.location.origin}/portfolio/${userData.username}` : window.location.href
            )}
            style={{
              padding:"8px 14px", background:"rgba(255,255,255,0.12)",
              border:"1px solid rgba(255,255,255,0.2)", borderRadius:9,
              color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer",
            }}
          >
            📋 Copy Link
          </button>
        </div>
      </div>

      {/* ── Three-column layout ───────────────────────────────────────── */}
      {/* Mobile-responsiveness fix (2026-09-02): this grid had no
          breakpoint at all — the 210px nav rail + flexible content +
          240px context panel just squeezed into a horizontally-scrolling
          row below ~900px. Same scoped-<style> pattern already used
          elsewhere in this codebase (see SqlWorkspace.jsx's own comment on
          why — no CSS-in-JS system here) rather than introducing one just
          for this. Stacks to nav -> content -> context panel, each full
          width, with sticky positioning turned off (nothing to stick to
          usefully in a single column). */}
      <style>{`
        @media (max-width: 900px) {
          .settings-3col { flex-direction: column !important; }
          .settings-nav-rail { width: 100% !important; position: static !important; }
          .settings-context-panel { width: 100% !important; position: static !important; }
        }
      `}</style>
      <div className="settings-3col" style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

        {/* Left Nav Rail */}
        <div className="settings-nav-rail" style={{
          width:210, flexShrink:0,
          background:"#fff", border:`1px solid ${T.border}`,
          borderRadius:14, boxShadow:T.shadow, overflow:"hidden",
          position:"sticky", top:16,
        }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <div style={{
                fontSize:9, fontWeight:800, color:T.ink4,
                textTransform:"uppercase", letterSpacing:2,
                padding:"12px 14px 5px",
              }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.id)}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:9,
                      padding:"9px 14px", border:"none", cursor:"pointer",
                      background: isActive ? T.indigo3 : "transparent",
                      borderLeft: isActive ? `3px solid ${T.indigo}` : "3px solid transparent",
                      transition:"all 0.15s", textAlign:"left",
                    }}
                  >
                    <span style={{ fontSize:14 }}>{item.icon}</span>
                    <span style={{
                      fontSize:12, fontWeight: isActive ? 700 : 500,
                      color: isActive ? T.indigo : T.ink2,
                    }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Main Content Panel */}
        <div
          ref={mainRef}
          style={{
            flex:1, minWidth:0,
            background:"#fff", border:`1px solid ${T.border}`,
            borderRadius:14, boxShadow:T.shadow, padding:"22px 24px",
            maxHeight:"72vh", overflowY:"auto",
          }}
        >
          {/* Breadcrumb */}
          <div style={{
            fontSize:11, color:T.ink4, marginBottom:18,
            display:"flex", alignItems:"center", gap:6,
          }}>
            <span>Settings</span>
            <span>›</span>
            <span style={{ color:T.indigo, fontWeight:700 }}>{current?.label}</span>
          </div>

          {renderSection()}
        </div>

        {/* Right Contextual Panel */}
        <div className="settings-context-panel" style={{ width:240, flexShrink:0, position:"sticky", top:16 }}>
          <ContextPanel userData={userData} activeSection={activeSection} eloRating={eloRating} />
        </div>

      </div>
    </div>
  )
}
