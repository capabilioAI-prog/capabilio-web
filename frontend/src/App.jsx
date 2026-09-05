import { useState, useEffect, useRef, lazy, Suspense } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  Eye, EyeOff, Check, Circle, X, AlertCircle, Lock, Sparkles, Mail,
} from "lucide-react"
import { PAGE_TO_PATH, PATH_TO_PAGE, isReservedPath } from "./lib/pageRoutes"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { supabase } from "./lib/supabase"
import { userDoc } from "./lib/db"
import { Analytics as PH, identifyUser, resetAnalytics } from "./lib/analytics"
import { FLAGS } from "./config/featureFlags"
import { nexusApi } from "./lib/api"
import { T, EASE } from "./lib/osDesignTokens"
import { PRIMARY_PATHS, withAlpha } from "./lib/pathIdentity"

import PathNav     from "./components/PathNav"
import { PageLoader } from "./components/CapUI"
import ErrorBoundary from "./components/ErrorBoundary"
import CopilotWidget from "./components/CopilotWidget"

// ── Always needed for auth flow — keep static ────────────────────────────────
import MyTasks      from "./pages/MyTasks"
import LandingPage  from "./pages/LandingPage"
import AccountType  from "./pages/AccountType"
import Onboarding   from "./pages/Onboarding"
import JoinPage     from "./pages/JoinPage"
import JoinOrgPage  from "./pages/JoinOrgPage"
import AttestPage   from "./pages/AttestPage"
import CompanyInvitePage from "./pages/CompanyInvitePage"
import CareerPicker from "./pages/CareerPicker"

// ── Feature pages — lazy-loaded per navigation ───────────────────────────────
// Each import() creates a separate chunk loaded only when the user visits that page.
const Aura               = lazy(() => import("./pages/Aura"))
const Pulse              = lazy(() => import("./pages/Pulse"))
const HardwareChallenges = lazy(() => import("./pages/HardwareChallenges"))
const SkillStudio        = lazy(() => import("./pages/SkillStudio"))
const SkillStudioShell   = lazy(() => import("./skillStudio/SkillStudioShell")) // Skill Studio V2 — behind FLAGS.skill_studio_v2, see featureFlags.js
const Launchpad          = lazy(() => import("./pages/Launchpad"))
const Portfolio          = lazy(() => import("./pages/Portfolio"))
const AuthorityProfile   = lazy(() => import("./pages/AuthorityProfile"))
const Nexus              = lazy(() => import("./pages/Nexus"))
const Pricing            = lazy(() => import("./pages/Pricing"))
// ── Path-specific home dashboards ────────────────────────────────────────────
const StudentHome        = lazy(() => import("./pages/StudentHome"))
// 2026-08-02: student-facing task inbox — only shown in nav for students
// GET /college/me/tasks reports as actually org-linked (see the fetch below).
const StudentCollegePage = lazy(() => import("./pages/StudentCollegePage"))
const ProfessionalHome   = lazy(() => import("./pages/ProfessionalHome"))
const ExecutiveHome      = lazy(() => import("./pages/ExecutiveHome"))
const StartupWorkspace   = lazy(() => import("./pages/StartupWorkspace"))
const ExecutiveFeed      = lazy(() => import("./pages/ExecutiveFeed"))
const ExecutiveComingSoon = lazy(() => import("./pages/ExecutiveComingSoon"))
const Growth              = lazy(() => import("./pages/Growth"))
const ExecutiveAnalytics  = lazy(() => import("./pages/ExecutiveAnalytics"))
// ── Professional pages ────────────────────────────────────────────────────────
const Forge              = lazy(() => import("./pages/Forge"))
const Orbit              = lazy(() => import("./pages/Orbit"))
const WeeklyCareerCheck  = lazy(() => import("./pages/WeeklyCareerCheck"))
const Skills             = lazy(() => import("./pages/Skills"))
// ── Executive pages ───────────────────────────────────────────────────────────
const SignalRooms        = lazy(() => import("./pages/SignalRooms"))
const ExecutiveNetwork   = lazy(() => import("./pages/ExecutiveNetwork"))
// ── Organisation pages ────────────────────────────────────────────────────────
const InstitutionOS      = lazy(() => import("./pages/InstitutionOS"))
// ── Recruiter pages ───────────────────────────────────────────────────────────
const Company             = lazy(() => import("./pages/Company"))
const RecruiterDashboard = lazy(() => import("./pages/RecruiterDashboard"))
const HiringPipeline     = lazy(() => import("./pages/HiringPipeline"))
const CandidateSearch    = lazy(() => import("./pages/CandidateSearch")) // 2026-08-05 — opt-in candidate discovery, GET /api/recruiter/search
const JobPostings        = lazy(() => import("./pages/JobPostings"))
// ── Internal-only admin tools — never in nav, reached by direct URL only ──
const AdminQuestionBank  = lazy(() => import("./pages/AdminQuestionBank"))
const AdminOpsDashboard  = lazy(() => import("./pages/AdminOpsDashboard"))
const AdminSkillStudioContent = lazy(() => import("./pages/AdminSkillStudioContent"))

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

// ── Auth Modal ────────────────────────────────────────────────────────────────
// Derived from pathIdentity.js's PRIMARY_PATHS — the same list LandingPage.jsx's
// journey cards and this modal's own step-1 chooser both render from, keyed by
// "path" (institution, not "college") so it lines up with `selectedPath` below.
// Per-path color is back (2026-08-18, amends DESIGN.md rule 9's "single
// accent always" — see that file) for these four signup-path entry points
// specifically; not used anywhere else in the app.
const PATH_META = Object.fromEntries(PRIMARY_PATHS.map(p => [p.path, { icon: p.icon, label: p.title, desc: p.desc, color: p.color }]))

// College / University typeahead for the signup modal's Student path field.
// Hits the same public GET /api/college-directory/search used by the
// post-signup Onboarding.jsx flow (see CollegeSearchPicker there) — kept as
// a separate component here because this file has its own input styling
// convention (inputStyle/accent) rather than Onboarding.jsx's T theme.
// Never blocks free text: selecting a suggestion just fills the field,
// exactly like typing does, so a college missing from the AICTE-derived
// dataset is still saved as entered.
function CollegeAutocomplete({ value, setValue, accent, inputStyle, setError, onSelect, disabled = false }) {
  const [results, setResults]   = useState([])
  const [open, setOpen]         = useState(false)
  const inputRef = useRef(null)
  const dropRef  = useRef(null)
  const debounceRef = useRef(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const handle = e => {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  useEffect(() => {
    if (disabled) return
    const q = (value || "").trim()
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      const myReqId = ++reqIdRef.current
      try {
        const res = await fetch(`${API}/api/college-directory/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: AbortSignal.timeout(6000),
        })
        if (myReqId !== reqIdRef.current) return
        if (res.ok) {
          const { colleges } = await res.json()
          setResults(colleges || [])
          setOpen(true)
        }
      } catch (_) { /* network hiccup — free text still works */ }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={e => { setValue(e.target.value); setError?.("") }}
        onFocus={e => { if (disabled) return; e.target.style.borderColor = accent; if (results.length > 0) setOpen(true) }}
        onBlur={e => { e.target.style.borderColor = T.border }}
        type="text" placeholder="College / University name" autoComplete="off"
        style={disabled ? { ...inputStyle, background: T.hairline, color: T.ink3, cursor: "not-allowed" } : inputStyle}
      />
      {!disabled && open && results.length > 0 && (
        <div
          ref={dropRef}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
            boxShadow: "0 4px 16px rgba(20,22,26,0.08)", zIndex: 1000,
            overflow: "hidden", maxHeight: 260, overflowY: "auto",
          }}
        >
          {results.map(c => (
            <div
              key={c.id}
              onMouseDown={e => { e.preventDefault(); setValue(c.name); onSelect?.(c); setOpen(false); setResults([]) }}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.hairline}`, fontSize: 13 }}
            >
              <div style={{ fontWeight: 600, color: T.ink }}>{c.name}</div>
              {(c.district || c.state) && (
                <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>
                  {[c.district, c.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const COUNTRY_CODES = [
  { dial:"+91",  flag:"🇮🇳", name:"India" },
  { dial:"+1",   flag:"🇺🇸", name:"United States" },
  { dial:"+44",  flag:"🇬🇧", name:"United Kingdom" },
  { dial:"+61",  flag:"🇦🇺", name:"Australia" },
  { dial:"+1",   flag:"🇨🇦", name:"Canada" },
  { dial:"+971", flag:"🇦🇪", name:"United Arab Emirates" },
  { dial:"+65",  flag:"🇸🇬", name:"Singapore" },
  { dial:"+60",  flag:"🇲🇾", name:"Malaysia" },
  { dial:"+49",  flag:"🇩🇪", name:"Germany" },
  { dial:"+33",  flag:"🇫🇷", name:"France" },
  { dial:"+86",  flag:"🇨🇳", name:"China" },
  { dial:"+81",  flag:"🇯🇵", name:"Japan" },
  { dial:"+82",  flag:"🇰🇷", name:"South Korea" },
  { dial:"+55",  flag:"🇧🇷", name:"Brazil" },
  { dial:"+52",  flag:"🇲🇽", name:"Mexico" },
  { dial:"+64",  flag:"🇳🇿", name:"New Zealand" },
]

// ── Password strength checker ─────────────────────────────────────────────────
function pwStrength(pw) {
  const checks = {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  }
  const passed = Object.values(checks).filter(Boolean).length
  const level  = passed <= 2 ? "weak" : passed <= 3 ? "fair" : passed === 4 ? "good" : "strong"
  const color  = { weak: T.error, fair: T.warning, good: T.info, strong: T.success }[level]
  const pct    = (passed / 5) * 100
  return { checks, passed, level, color, pct }
}

// Invite links carry a free-text department name (e.g. "Computer Science")
// that doesn't line up 1:1 with the fixed codes the Branch dropdown below
// uses. This maps common phrasings to a real option value so an invite-locked
// signup shows something real instead of a blank "Select branch". Mirrors
// Onboarding.jsx's normalizeBranchCode — kept as a local copy since the two
// pages don't share a module. Conservative: unrecognized text returns "" and
// the caller leaves Branch editable rather than force-locking a guess.
const AUTH_DEPARTMENT_TO_BRANCH_CODE = [
  [/comp(uter)?\s*sci|^cse$/i, "CSE"],
  [/information\s*tech|^it$/i, "IT"],
  [/^mca$/i, "MCA"],
  [/data\s*sci|ai\s*&?\s*ds|ai\/ds/i, "AI_DS"],
  [/artificial\s*intell|ai\s*&?\s*ml|ai\/ml|machine\s*learn/i, "AI_ML"],
  [/electronics|^ece$/i, "ECE"],
  [/electrical|^eee$/i, "EEE"],
  [/mechanical|^mech$/i, "Mechanical"],
  [/^civil$/i, "Civil"],
  [/internet of things|^iot$/i, "IoT"],
  [/pharma/i, "Pharmacy"],
  [/^mba$|management/i, "MBA"],
]
function normalizeAuthBranchCode(deptText) {
  const t = (deptText || "").trim()
  if (!t) return ""
  for (const [re, code] of AUTH_DEPARTMENT_TO_BRANCH_CODE) if (re.test(t)) return code
  return ""
}

// AuthModal's step-1 path chooser — same PRIMARY_PATHS list and colors as
// LandingPage.jsx's "Choose Your Journey" cards (pathIdentity.js), only
// shown when the modal opens with no path already known (generic nav/hero
// "Get started"). Picking a card writes localStorage exactly the way
// LandingPage.jsx's openPath() does, then hands the chosen path back up.
function AuthPathChooser({ onPick }) {
  return (
    <div>
      <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:3, letterSpacing:"-0.01em" }}>
        Let&apos;s get started
      </h3>
      <p style={{ fontSize:12.5, color:T.ink3, marginBottom:18 }}>Choose the path that fits you.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {PRIMARY_PATHS.map(p => {
          const Icon = p.icon
          return (
            <button key={p.key} onClick={() => onPick(p)}
              style={{
                textAlign:"left", padding:14, borderRadius:12, border:`1px solid ${T.border}`,
                background:T.surface, cursor:"pointer", fontFamily:"inherit",
                transition:"border-color 150ms ease, transform 150ms ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = withAlpha(p.color, 0.5); e.currentTarget.style.transform = "translateY(-2px)" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)" }}
            >
              <div style={{ width:32, height:32, borderRadius:9, background:withAlpha(p.color, 0.12), display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <Icon size={15} color={p.color} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:3 }}>{p.title}</div>
              <div style={{ fontSize:11, color:T.ink3, lineHeight:1.4 }}>{p.points[0]}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AuthModal({ show, onClose, mode, setMode }) {
  // College invite links (JoinOrgPage.jsx) stash {college, department, batch}
  // in sessionStorage before bouncing an unauthenticated student here to sign
  // up. Read once — lazy initializer keeps it stable across re-renders. Left
  // in sessionStorage (not cleared) so Onboarding.jsx can read the same key
  // afterwards; Onboarding is the one that clears it once the flow completes.
  const [orgJoinContext] = useState(() => {
    try {
      const raw = sessionStorage.getItem("capabilio_org_join_context")
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const collegeLocked = !!orgJoinContext?.college
  const lockedBranchCode = normalizeAuthBranchCode(orgJoinContext?.department)
  const branchLocked = !!lockedBranchCode

  // ── Shared fields ────────────────────────────────────────────────
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [showCfm,  setShowCfm]  = useState(false)
  const [confirm,  setConfirm]  = useState("")
  const [first,    setFirst]    = useState("")
  const [last,     setLast]     = useState("")
  // Student fields
  const [college,  setCollege]  = useState("")
  const [branch,   setBranch]   = useState("")
  const [refCode,  setRefCode]  = useState("")
  const [refValid, setRefValid] = useState(null)
  const [refData,  setRefData]  = useState(null)
  // Professional fields
  const [company,     setCompany]     = useState("")
  const [jobTitle,    setJobTitle]    = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [experience,  setExperience]  = useState("")
  // Executive fields
  const [orgName,   setOrgName]   = useState("")
  const [execTitle, setExecTitle] = useState("")
  // Institution fields
  const [instName,    setInstName]    = useState("")
  const [instType,    setInstType]    = useState("College")
  const [instCity,    setInstCity]    = useState("")
  const [instWebsite, setInstWebsite] = useState("")
  // shared
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)
  // Set to the just-registered email right after a successful signup —
  // renders the "verify your email" notice below in place of the form
  // instead of immediately closing the modal (see handleEmailSubmit).
  // null the rest of the time, including for sign-in (which still closes
  // immediately on success, unchanged).
  const [verifyEmailFor, setVerifyEmailFor] = useState(null)
  // "choose" (step-1 path picker) or "form" (existing create-account/sign-in) —
  // see the reset effect below for how this is set when the modal opens.
  const [step, setStep] = useState("choose")

  const selectedPath = (() => { try { return localStorage.getItem("capabilio_selected_path") } catch { return null } })()
  // 2026-08-03: Student/Job Seeker split — set by AccountType.jsx only when
  // selectedPath==="student". Job seekers skip the college/branch
  // requirement below (they may not currently be enrolled anywhere).
  const studentStage = (() => { try { return localStorage.getItem("capabilio_student_stage") } catch { return null } })()
  // 2026-08-18: landing page's institution-path entry points (the College
  // journey card, the "company profile instead" link) set this alongside
  // capabilio_selected_path so AuthModal opens with the right instType
  // toggle pre-selected instead of always defaulting to "College".
  const preselectedInstType = (() => { try { return localStorage.getItem("capabilio_selected_inst_type") } catch { return null } })()
  const isJobSeeker = (!selectedPath || selectedPath === "student") && studentStage === "job_seeker"
  const pw = pwStrength(password)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (show) {
      setEmail(""); setPassword(""); setConfirm(""); setShowPw(false); setShowCfm(false)
      setFirst(""); setLast("")
      setCollege(orgJoinContext?.college || "")
      setBranch(lockedBranchCode || "")
      setRefCode(""); setRefValid(null); setRefData(null)
      setCompany(""); setJobTitle(""); setLinkedinUrl(""); setExperience("")
      setOrgName(""); setExecTitle("")
      setInstName(""); setInstType(preselectedInstType === "Company" ? "Company" : "College"); setInstCity(""); setInstWebsite("")
      setError(""); setLoading(false); setVerifyEmailFor(null)
      // A path is already known (journey card / pricing CTA / invite link
      // already wrote capabilio_selected_path before opening this modal) —
      // skip straight to the form, pre-colored. Otherwise (generic nav/hero
      // "Get started") start at the step-1 chooser. Signing in never needs
      // a path at all, so it always skips straight to the form too.
      setStep(mode === "signup" && !selectedPath ? "choose" : "form")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  // "Verify your email" notice — shown in place of the form right after a
  // successful signup (see handleEmailSubmit). Same overlay/card visual
  // language as the main form below (White/Graphite tokens, T.accent),
  // just a single centered card instead of the two-panel form layout.
  // No resend button, no countdown, no new route, no toast/alert — a
  // plain modal the user dismisses with "Got it".
  if (verifyEmailFor) {
    const closeVerifyModal = () => { setVerifyEmailFor(null); onClose() }
    return (
      <div style={{ position:"fixed", inset:0, zIndex:9999, fontFamily:"'DM Sans',sans-serif" }}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: EASE }}
          style={{ position:"absolute", inset:0, background:"rgba(17,24,39,0.5)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}
          onClick={closeVerifyModal}
        />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            style={{ width:"100%", maxWidth:420, background:T.surface, borderRadius:20, border:`1px solid ${T.border}`, boxShadow:"0 4px 12px rgba(20,22,26,0.04), 0 16px 40px rgba(20,22,26,0.08)", padding:"32px 28px" }}
          >
            <div style={{ width:44, height:44, borderRadius:12, background:T.accentDim, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
              <Mail size={20} color={T.accent} strokeWidth={1.75} />
            </div>
            <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:19, fontWeight:700, color:T.ink, marginBottom:10, letterSpacing:"-0.01em" }}>
              Verify your email
            </h2>
            <p style={{ fontSize:13.5, color:T.ink2, lineHeight:1.7, marginBottom:22 }}>
              We've sent a verification link to <strong style={{ color:T.ink }}>{verifyEmailFor}</strong>.
              Please check your inbox.<br /><br />
              If you don't see it, check your Spam, Junk or Promotions folder.<br /><br />
              After verifying your email you can log in to Capabilio.
            </p>
            <button
              onClick={closeVerifyModal}
              style={{ width:"100%", padding:"13px", background:T.accent, border:"none", borderRadius:10, color:"#fff", fontSize:15, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}
            >
              Got it
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  const validatePassword = (pw) => {
    if (pw.length < 8)            return "Password must be at least 8 characters."
    if (!/[A-Z]/.test(pw))        return "Add at least one uppercase letter (A–Z)."
    if (!/[a-z]/.test(pw))        return "Add at least one lowercase letter (a–z)."
    if (!/[0-9]/.test(pw))        return "Add at least one number (0–9)."
    if (!/[^A-Za-z0-9]/.test(pw)) return "Add at least one special character (!@#$%...)."
    return null
  }

  const handleEmailSubmit = async () => {
    setLoading(true); setError("")
    try {
      if (mode === "signup") {
        if (!first.trim()) { setError("First name is required"); setLoading(false); return }
        if (!last.trim())  { setError("Last name is required");  setLoading(false); return }

        const pwErr = validatePassword(password)
        if (pwErr) { setError(pwErr); setLoading(false); return }
        if (password !== confirm) { setError("Passwords do not match."); setLoading(false); return }

        const fullName = `${first.trim()} ${last.trim()}`
        let signupMeta = { full_name: fullName, first_name: first.trim(), last_name: last.trim() }

        if (selectedPath === "professional") {
          if (!company.trim())  { setError("Company name is required"); setLoading(false); return }
          if (!jobTitle.trim()) { setError("Job title is required");    setLoading(false); return }
          signupMeta = { ...signupMeta, company: company.trim(), job_title: jobTitle.trim(), linkedin_url: linkedinUrl.trim(), experience, path: "professional" }
        } else if (selectedPath === "executive") {
          if (!orgName.trim()) { setError("Organisation name is required");     setLoading(false); return }
          if (!execTitle)      { setError("Please select your executive title"); setLoading(false); return }
          signupMeta = { ...signupMeta, org_name: orgName.trim(), exec_title: execTitle, linkedin_url: linkedinUrl.trim(), path: "authority" }
        } else if (selectedPath === "institution") {
          if (!instName.trim())  { setError("Institution name is required"); setLoading(false); return }
          if (!instCity.trim())  { setError("City / State is required");     setLoading(false); return }
          signupMeta = { ...signupMeta, institution_name: instName.trim(), institution_type: instType, city: instCity.trim(), website: instWebsite.trim(), admin_name: fullName, path: "institution" }
        } else {
          // Student (default)
          if (!isJobSeeker) {
            if (!college.trim()) { setError("College name is required");  setLoading(false); return }
            if (!branch)         { setError("Please select your branch"); setLoading(false); return }
          }
          signupMeta = {
            ...signupMeta,
            college: college.trim(), branch, path: "student",
            ...(studentStage ? { student_stage: studentStage } : {}),
          }
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: signupMeta },
        })
        if (signUpError) throw signUpError

        // Apply voucher — student path only
        if (!selectedPath || selectedPath === "student") {
          if (refCode.trim() && data.user) {
            try {
              await fetch(`${API}/api/referral/apply`, {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ refereeUid:data.user.id, refereeName:fullName, referrerCode:refCode.trim().toUpperCase() }),
              })
            } catch (_) { /* voucher apply failure is non-fatal — account was already created */ }
          }
        }
        // Signup success shows the "verify your email" notice below (in
        // place of the form) instead of closing the modal immediately —
        // the account exists but can't sign in until the link is clicked.
        setLoading(false)
        setVerifyEmailFor(email)
        return
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
      onClose()
    } catch (e) {
      const msg = e.message || ""
      setError(
        msg.includes("Invalid login")            ? "Incorrect email or password."
        : msg.includes("Email not confirmed")    ? "Please verify your email address first."
        : msg.includes("User already registered")? "Email already registered — sign in instead."
        : msg.includes("Password should")        ? "Password must meet all strength requirements."
        : msg.includes("Unable to validate")     ? "Please enter a valid email address."
        : msg || "Something went wrong. Try again."
      )
      setLoading(false)
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: T.surfaceRaised,
    border: `1.5px solid ${T.border}`, borderRadius: 10, color: T.ink,
    fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.15s",
  }

  const pm     = PATH_META[selectedPath] || null
  const accent = pm?.color || T.accent

  // Step-1 chooser selection — mirrors LandingPage.jsx's openPath() so
  // reopening the modal later (or Onboarding.jsx reading the same key)
  // sees the same shape regardless of which entry point set it.
  const handlePickPath = (p) => {
    try {
      localStorage.setItem("capabilio_selected_path", p.path)
      if (p.instType) localStorage.setItem("capabilio_selected_inst_type", p.instType)
      else localStorage.removeItem("capabilio_selected_inst_type")
    } catch (_) { /* localStorage unavailable */ }
    setStep("form")
  }

  const inp = (val, setter, type="text", placeholder="", extra={}) => (
    <input value={val} onChange={e=>{setter(e.target.value);setError("")}}
      onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
      type={type} placeholder={placeholder}
      style={{...inputStyle,...extra}}
      onFocus={e=>e.target.style.borderColor=accent}
      onBlur={e=>e.target.style.borderColor=T.border}/>
  )

  // canSubmit logic per path
  const canSubmitEmail = mode === "signup" ? (() => {
    const base = first && last && email && password && confirm
    if (selectedPath === "professional") return !!(base && company && jobTitle)
    if (selectedPath === "executive")    return !!(base && orgName && execTitle)
    if (selectedPath === "institution")  return !!(base && instName && instCity)
    if (isJobSeeker) return !!base
    return !!(base && college && branch)
  })() : !!(email && password)

  // Path-specific form fields (signup only)
  const renderPathFields = () => {
    if (selectedPath === "professional") return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "First name")}
          {inp(last,  setLast,  "text", "Last name")}
        </div>
        {inp(company,  setCompany,  "text", "Current company / employer")}
        {inp(jobTitle, setJobTitle, "text", "Job title / designation")}
        <select value={experience} onChange={e=>{setExperience(e.target.value);setError("")}}
          style={{ ...inputStyle, color: experience ? T.ink : T.ink3 }}
          onFocus={e=>e.target.style.borderColor=accent}
          onBlur={e=>e.target.style.borderColor=T.border}>
          <option value="">Years of experience (optional)</option>
          <option value="0-1">0–1 years (Fresher / Entry level)</option>
          <option value="1-3">1–3 years</option>
          <option value="3-5">3–5 years</option>
          <option value="5-10">5–10 years</option>
          <option value="10+">10+ years</option>
        </select>
        {inp(linkedinUrl, setLinkedinUrl, "url", "LinkedIn profile URL (optional)")}
      </>
    )

    if (selectedPath === "executive") return (
      <>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px", background: T.accentDim, border: `1px solid ${T.accent}30`, borderRadius:10, fontSize:12, color: T.ink2, marginBottom:2 }}>
          <Sparkles size={14} color={T.accent} strokeWidth={1.75} style={{ flexShrink:0, marginTop:1 }} />
          Executive path is invite-only. Apply and our team will verify your profile within 48 hours.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "First name")}
          {inp(last,  setLast,  "text", "Last name")}
        </div>
        {inp(orgName, setOrgName, "text", "Organisation / Company name")}
        <select value={execTitle} onChange={e=>{setExecTitle(e.target.value);setError("")}}
          style={{ ...inputStyle, color: execTitle ? T.ink : T.ink3 }}
          onFocus={e=>e.target.style.borderColor=accent}
          onBlur={e=>e.target.style.borderColor=T.border}>
          <option value="">Select executive title</option>
          <option value="CEO">CEO – Chief Executive Officer</option>
          <option value="Founder">Founder / Co-Founder</option>
          <option value="CTO">CTO – Chief Technology Officer</option>
          <option value="CFO">CFO – Chief Financial Officer</option>
          <option value="COO">COO – Chief Operating Officer</option>
          <option value="CMO">CMO – Chief Marketing Officer</option>
          <option value="CPO">CPO – Chief Product Officer</option>
          <option value="President">President / MD / GM</option>
          <option value="VP">VP / SVP / EVP</option>
          <option value="Director">Director / Board Member</option>
          <option value="Partner">Partner / Investor</option>
          <option value="Other-C">Other C-Suite / Executive</option>
        </select>
        {inp(linkedinUrl, setLinkedinUrl, "url", "LinkedIn profile URL (speeds up verification)")}
      </>
    )

    if (selectedPath === "institution") return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "Admin first name")}
          {inp(last,  setLast,  "text", "Admin last name")}
        </div>
        {instType === "College"
          ? <CollegeAutocomplete
              value={instName} setValue={setInstName} accent={accent} inputStyle={inputStyle} setError={setError}
              onSelect={c => setInstCity([c.district, c.state].filter(Boolean).join(", "))}
            />
          : inp(instName, setInstName, "text", "Institution / Organisation name")}
        <div style={{ display:"flex", background: T.surfaceRaised, borderRadius:10, padding:3, border:`1px solid ${T.border}` }}>
          {["College","Company","Government","NGO"].map(t=>(
            <button key={t} onClick={()=>{setInstType(t);setError("")}}
              style={{ flex:1, padding:"8px 4px", borderRadius:8, border:"none", cursor:"pointer",
                background: instType===t ? accent : "transparent",
                color: instType===t ? "#fff" : T.ink2,
                fontSize:12, fontWeight: instType===t ? 600 : 500,
                fontFamily:"inherit", transition:"all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>
        {inp(instCity, setInstCity, "text", instType === "College" ? "City, State (auto-filled — edit if needed)" : "City, State")}
        {inp(instWebsite, setInstWebsite, "url", "Website URL (optional)")}
      </>
    )

    // Default: Student
    return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "First name")}
          {inp(last,  setLast,  "text", "Last name")}
        </div>
        {isJobSeeker && (
          <div style={{ fontSize:11.5, color:"#4B5563", marginTop:-4, marginBottom:2 }}>
            Optional for job seekers — add your most recent college if you&apos;d like it on your profile.
          </div>
        )}
        <CollegeAutocomplete value={college} setValue={setCollege} accent={accent} inputStyle={inputStyle} setError={setError} disabled={collegeLocked} />
        <select value={branch} onChange={e=>{setBranch(e.target.value);setError("")}} disabled={branchLocked}
          style={{ ...inputStyle, color: branch ? T.ink : T.ink3, ...(branchLocked ? { background: T.hairline, cursor: "not-allowed" } : {}) }}
          onFocus={e=>{ if (!branchLocked) e.target.style.borderColor=accent }}
          onBlur={e=>e.target.style.borderColor=T.border}>
          <option value="">{isJobSeeker ? "Select your branch / stream (optional)" : "Select your branch / stream"}</option>
          <optgroup label="IT / CS Streams">
            <option value="CSE">Computer Science Engineering (CSE)</option>
            <option value="IT">Information Technology (IT)</option>
            <option value="MCA">MCA / Computer Applications</option>
            <option value="AI_DS">AI &amp; Data Science (AI/DS)</option>
            <option value="AI_ML">AI &amp; Machine Learning (AI/ML)</option>
          </optgroup>
          <optgroup label="Core Engineering">
            <option value="ECE">Electronics &amp; Communication (ECE)</option>
            <option value="EEE">Electrical &amp; Electronics (EEE)</option>
            <option value="Mechanical">Mechanical Engineering</option>
            <option value="Civil">Civil Engineering</option>
            <option value="IoT">Internet of Things (IoT)</option>
          </optgroup>
          <optgroup label="Management / Science">
            <option value="MBA">MBA / Business Administration</option>
            <option value="BBA">BBA / Business Management</option>
            <option value="BCom">B.Com / Commerce</option>
            <option value="BSc">B.Sc / Science</option>
          </optgroup>
          <optgroup label="Other">
            <option value="Pharmacy">Pharmacy / Pharma</option>
            <option value="Law">Law (LLB / LLM)</option>
            <option value="Arts">Arts / Humanities</option>
            <option value="Other">Other</option>
          </optgroup>
        </select>
        {collegeLocked && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:11.5, color: T.ink2, background: T.accentDim, border: `1px solid ${T.accent}30`, borderRadius:10, padding:"7px 10px", marginTop:-4 }}>
            <Lock size={13} color={T.accent} strokeWidth={1.75} style={{ flexShrink:0, marginTop:1 }} />
            Set by your college&apos;s invite link{branchLocked ? "" : " — branch wasn't recognized from the link, please pick yours"}. Contact your placement cell if this is wrong.
          </div>
        )}
      </>
    )
  }

  const trustPills = selectedPath === "institution"
    ? ["Free to get started","No setup fee","Built in India"]
    : selectedPath === "executive"
    ? ["Invite-only","Verified profiles","Built in India"]
    : selectedPath === "professional"
    ? ["Free to join","UAN-backed","No resume","Built in India"]
    : ["Free forever","No credit card","No resume","Built in India"]

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@500;600&display=swap');
        @keyframes authSpin { to{transform:rotate(360deg)} }
      `}</style>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: EASE }}
        style={{ position:"absolute", inset:0, background:"rgba(17,24,39,0.5)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}
        onClick={onClose}
      />

      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{ width:"100%", maxWidth:880, background:T.surface, borderRadius:20, overflow:"hidden", border:`1px solid ${T.border}`, boxShadow:"0 4px 12px rgba(20,22,26,0.04), 0 16px 40px rgba(20,22,26,0.08)", display:"flex", maxHeight:"96vh" }}
        >

          {/* Left panel */}
          <div style={{ flex:"0 0 36%", background: T.surfaceRaised, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"36px 28px", borderRight:`1px solid ${T.border}` }}>
            <div>
              <img src="/capabilio-logo-dark.png" alt="Capabilio AI" style={{ height:24, width:"auto", display:"block", marginBottom:16 }} />
              {pm && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:T.surface, border:`1px solid ${accent}30`, borderRadius:999, padding:"6px 14px", marginBottom:16 }}>
                  <pm.icon size={14} color={accent} strokeWidth={1.75} />
                  <span style={{ fontSize:10.5, fontWeight:600, color:accent, letterSpacing:"0.08em", textTransform:"uppercase" }}>{pm.label} path</span>
                </div>
              )}
              <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:T.ink, lineHeight:1.25, marginBottom:10, letterSpacing:"-0.01em" }}>
                {pm ? pm.desc.split(".")[0]+"." : "Prove your skills."}<br/>
                <span style={{ color:accent }}>{pm ? pm.desc.split(".").slice(1).join(".").trim() : "Not just claim them."}</span>
              </h2>
              <p style={{ fontSize:12.5, color:T.ink2, lineHeight:1.7 }}>
                {pm ? `Your account will be set for the ${pm.label} path. Change during onboarding.` : "ELO earned through real challenges — not a Word doc."}
              </p>
            </div>
            <div style={{ padding:"9px 12px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, fontSize:11.5, color:T.ink2 }}>
              Free forever for candidates
            </div>
          </div>

          {/* Right form */}
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", display:"flex", flexDirection:"column", justifyContent:"center", position:"relative" }}>
            <button onClick={onClose} style={{ position:"absolute", top:14, right:14, width:28, height:28, borderRadius:8, background:T.surfaceRaised, border:`1px solid ${T.border}`, color:T.ink3, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={14} strokeWidth={2} />
            </button>

            {/* Create / Sign in toggle — always visible, even on the step-1
                chooser: picking "Sign in" never needs a path, so it jumps
                straight to the form regardless of what step we're on. */}
            <div style={{ display:"flex", background:T.surfaceRaised, borderRadius:10, padding:3, marginBottom:20, border:`1px solid ${T.border}` }}>
              {[["signup","Create account"],["login","Sign in"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>{setMode(m);setError(""); if (m==="login") setStep("form")}}
                  style={{ flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:mode===m?accent:"transparent", color:mode===m?"#fff":T.ink2, fontSize:13, fontWeight:mode===m?600:500, fontFamily:"inherit", transition:"all 0.15s" }}>
                  {lbl}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step === "choose" ? "choose" : mode}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
              {step === "choose" ? (
                <AuthPathChooser onPick={handlePickPath} />
              ) : (
                <>
                <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:3, letterSpacing:"-0.01em" }}>
                  {mode==="signup" ? "Create your account" : "Welcome back"}
                </h3>
                <p style={{ fontSize:12.5, color:T.ink3, marginBottom:16 }}>
                  {mode==="signup"
                    ? selectedPath === "executive"  ? "Apply for executive access — reviewed within 48 hours."
                    : selectedPath === "institution" ? "Set up your organisation account in minutes."
                    : "Free forever. No credit card required."
                    : "Sign in to your Capabilio profile."}
                </p>

                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {mode === "signup" && renderPathFields()}

                  {inp(email, setEmail, "email", selectedPath === "institution" ? (instType === "College" ? "College email ID" : "Official email ID") : "Email address")}

                  {/* Password */}
                  <div>
                    <div style={{ position:"relative" }}>
                      <input value={password} onChange={e=>{setPassword(e.target.value);setError("")}}
                        onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
                        type={showPw?"text":"password"}
                        placeholder={mode==="signup"?"Create password":"Password"}
                        style={{...inputStyle, paddingRight:44}}
                        onFocus={e=>e.target.style.borderColor=accent}
                        onBlur={e=>e.target.style.borderColor=T.border}/>
                      <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.ink3, padding:2, display:"flex" }}>
                        {showPw ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                      </button>
                    </div>
                    {mode === "signup" && password.length > 0 && (
                      <div style={{ marginTop:6 }}>
                        <div style={{ height:3, background:T.border, borderRadius:99, overflow:"hidden", marginBottom:5 }}>
                          <div style={{ height:"100%", width:`${pw.pct}%`, background:pw.color, borderRadius:99, transition:"all 0.3s" }}/>
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                          {[{key:"length",label:"8+ chars"},{key:"uppercase",label:"A–Z"},{key:"lowercase",label:"a–z"},{key:"number",label:"0–9"},{key:"special",label:"!@#..."}].map(c=>(
                            <span key={c.key} style={{ fontSize:10, fontWeight:500, color:pw.checks[c.key]?T.success:T.ink3, display:"flex", alignItems:"center", gap:3 }}>
                              {pw.checks[c.key] ? <Check size={10} strokeWidth={2.5} /> : <Circle size={10} strokeWidth={2} />}{c.label}
                            </span>
                          ))}
                          <span style={{ marginLeft:"auto", fontSize:10, fontWeight:600, color:pw.color, textTransform:"capitalize" }}>{pw.level}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {mode === "signup" && (
                    <>
                      <div style={{ position:"relative" }}>
                        <input value={confirm} onChange={e=>{setConfirm(e.target.value);setError("")}}
                          onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
                          type={showCfm?"text":"password"} placeholder="Confirm password"
                          style={{ ...inputStyle, paddingRight:44, borderColor: confirm&&password ? (confirm===password?T.success:T.error) : T.border }}
                          onFocus={e=>e.target.style.borderColor=accent}
                          onBlur={e=>e.target.style.borderColor=confirm&&password?(confirm===password?T.success:T.error):T.border}/>
                        <button onClick={()=>setShowCfm(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.ink3, padding:2, display:"flex" }}>
                          {showCfm ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                        </button>
                      </div>
                      {confirm && password && confirm !== password && (
                        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.error, marginTop:-4 }}>
                          <X size={11} strokeWidth={2.5} /> Passwords do not match
                        </div>
                      )}

                      {/* Voucher — student only */}
                      {(!selectedPath || selectedPath === "student") && (
                        <div>
                          <div style={{ fontSize:11, fontWeight:500, color:T.ink2, marginBottom:5 }}>Skill voucher code <span style={{ fontWeight:400, color:T.ink3 }}>(optional)</span></div>
                          <input value={refCode}
                            onChange={async e=>{
                              const val=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)
                              setRefCode(val); setRefData(null); setRefValid(null)
                              if(val.length===8){try{const r=await fetch(`${API}/api/referral/validate/${val}`);const d=await r.json();setRefValid(d.valid);setRefData(d)}catch(_){setRefValid(false)}}
                            }}
                            placeholder="Enter 8-char voucher code" maxLength={8}
                            style={{ width:"100%", padding:"11px 14px", background:T.surfaceRaised, border:`1.5px solid ${refCode.length===8?(refValid?T.success:T.error):T.border}`, borderRadius:10, color:T.ink, fontSize:13, fontFamily:"'DM Mono',monospace", letterSpacing:3, outline:"none", boxSizing:"border-box" }}/>
                          {refCode.length===8&&refValid===true&&(
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5, padding:"6px 10px", background:T.successDim, border:`1px solid ${T.success}30`, borderRadius:8, fontSize:11, color:T.success }}>
                              <Check size={12} strokeWidth={2.5} /> {refData?.message} · +50 ELO + 14-day Pro
                            </div>
                          )}
                          {refCode.length===8&&refValid===false&&(
                            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, fontSize:11, color:T.error }}>
                              <X size={11} strokeWidth={2.5} /> Invalid voucher code
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {error && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"9px 12px", background:T.errorDim, border:`1px solid ${T.error}30`, borderRadius:10, fontSize:12, color:T.error }}>
                      <AlertCircle size={14} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} /> {error}
                    </div>
                  )}

                  <button onClick={handleEmailSubmit} disabled={loading || !canSubmitEmail}
                    style={{ width:"100%", padding:"13px", background:canSubmitEmail?accent:T.hairline, border:"none", borderRadius:10, color:canSubmitEmail?"#fff":T.ink3, fontSize:15, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:canSubmitEmail?"pointer":"not-allowed", transition:"background 0.15s" }}
                    onMouseEnter={e=>{if(canSubmitEmail)e.currentTarget.style.background=T.accentDark}}
                    onMouseLeave={e=>{if(canSubmitEmail)e.currentTarget.style.background=accent}}
                  >
                    {loading
                      ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"authSpin 0.7s linear infinite" }}/>Please wait…</span>
                      : mode==="signup"
                        ? selectedPath === "executive"  ? "Apply for executive access"
                        : selectedPath === "institution" ? "Create organisation account"
                        : "Create account"
                      : "Sign in"}
                  </button>
                </div>

                <div style={{ textAlign:"center", marginTop:14, fontSize:13, color:T.ink3 }}>
                  {mode==="signup" ? "Already have an account? " : "New to Capabilio? "}
                  <button onClick={()=>{setMode(m=>m==="signup"?"login":"signup");setError("")}}
                    style={{ background:"none", border:"none", color:accent, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    {mode==="signup" ? "Sign in" : "Create free account"}
                  </button>
                </div>

                {mode==="signup"&&(
                  <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginTop:12 }}>
                    {trustPills.map((b,i)=>(
                      <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10.5, color:T.ink3, background:T.surfaceRaised, border:`1px solid ${T.border}`, borderRadius:100, padding:"3px 9px" }}>
                        <Check size={10} color={accent} strokeWidth={2.5} />{b}
                      </span>
                    ))}
                  </div>
                )}
                </>
              )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════
function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user,           setUser]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [onboardingDone, setOnboardingDone] = useState(false)
  // Lazy-init from the real URL so a direct/bookmarked visit to e.g.
  // /arena renders Arena on the very first paint instead of flashing
  // studentHome first — same pattern the /portfolio/:username and
  // /admin/* early-return checks below already use with raw
  // window.location.pathname. See lib/pageRoutes.js for the full mapping
  // and why "portfolio" is deliberately excluded from it.
  const [currentPage,    setCurrentPage]    = useState(
    () => PATH_TO_PAGE[window.location.pathname] || "studentHome"
  )
  const [activeTab,      setActiveTab]      = useState("dashboard")
  const [activeNavItem,  setActiveNavItem]  = useState("home")
  const [userData,       setUserData]       = useState(null)
  const [appStage,       setAppStage]       = useState("landing")
  const [showAuth,       setShowAuth]       = useState(false)
  const [authMode,       setAuthMode]       = useState("login")
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  // 2026-08-05: real notification bell for the actual live top bar. Found
  // (while building this) that components/Header.jsx already had a bell UI
  // wired to real-looking data, but that whole component is dead code —
  // never imported anywhere (confirmed via grep; App.jsx renders this inline
  // <header> instead). The `notifications` table + GET/POST
  // /api/nexus/notifications routes are real and already used by
  // Nexus.jsx's Notifications tab and written to by recruiterComms.js/
  // pulseNexus.js — this just surfaces that existing feed platform-wide,
  // and is what the re-engagement digest (lib/reengagementSignals.js)
  // writes into so its nudges are actually visible to users.
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notifMenuRef = useRef(null)
  // 2026-08-02: whether this student is linked to any org (college/company)
  // via org_members — drives whether the "College" nav tab appears at all.
  // null = not checked yet, so the tab stays hidden until we know for sure
  // rather than flashing in and out.
  const [collegeLinked, setCollegeLinked] = useState(null)

  useEffect(() => {
    if (window.location.pathname.startsWith("/portfolio/")) setCurrentPage("portfolio")
  }, [])

  // Auto-complete a pending org-join-link claim once login/signup finishes.
  // JoinOrgPage stashes the token in sessionStorage when a visitor isn't
  // logged in yet (mirrors JoinPage's existing capabilio_invite pattern); by
  // the time `user` becomes truthy here, they've navigated away from
  // /join-org/:token, so this is the only place left to actually claim it.
  useEffect(() => {
    if (!user) return
    // 2026-08-01: same guard as JoinOrgPage — never claim a stashed student
    // invite into a non-student account (e.g. an admin logging back in with
    // a stale token in sessionStorage). userData absent = fresh signup, the
    // intended case, proceed.
    if (userData?.path && userData.path !== "student") {
      try { sessionStorage.removeItem("capabilio_org_join_token") } catch {}
      return
    }
    let token
    try { token = sessionStorage.getItem("capabilio_org_join_token") } catch { return }
    if (!token) return
    try { sessionStorage.removeItem("capabilio_org_join_token") } catch {}
    import("./lib/api").then(({ orgApi }) => {
      orgApi.claimJoinLink(token).catch(err => console.warn("[org-join] pending claim failed:", err.message))
    })
  }, [user, userData?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2026-08-02: resolve whether this student has any org_members link at all
  // — determines whether the "College" nav tab appears (see STUDENT_HEADER_NAV
  // below). Cheap, self-scoped, read-only; runs once userData confirms this
  // is a student account so it never fires for professional/institution/
  // authority logins the tab is irrelevant to.
  useEffect(() => {
    if (!user || (userData?.path && userData.path !== "student")) { setCollegeLinked(false); return }
    let cancelled = false
    import("./lib/api").then(({ collegeApi }) => {
      collegeApi.getMyTasks()
        .then(res => { if (!cancelled) setCollegeLinked(!!res?.linked) })
        .catch(() => { if (!cancelled) setCollegeLinked(false) })
    })
    return () => { cancelled = true }
  }, [user, userData?.path])

  // Auto-complete a pending company-invite acceptance once the visitor is
  // logged in AND their profile has finished company onboarding (org_type ===
  // 'company') — accepting requires that, so unlike the student join-link
  // effect above, this one deliberately does NOT clear the token until the
  // accept call actually succeeds, so it can retry after onboarding completes
  // rather than silently dropping the invite if they weren't a company yet.
  useEffect(() => {
    if (!user || userData?.org_type !== "company") return
    let token
    try { token = sessionStorage.getItem("capabilio_company_invite_token") } catch { return }
    if (!token) return
    import("./lib/api").then(({ orgApi }) => {
      orgApi.acceptCompanyInvite(token)
        .then(() => { try { sessionStorage.removeItem("capabilio_company_invite_token") } catch {} })
        .catch(err => console.warn("[company-invite] pending accept failed:", err.message))
    })
  }, [user, userData?.org_type])

  useEffect(() => {
    let profileUnsub = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 2026-07-27 P0 fix: Supabase's implicit-flow magic-link/signup redirect
      // puts access_token/refresh_token/expires_at into the URL hash.
      // detectSessionInUrl (the createClient() default, see lib/supabase.js)
      // parses this ONCE to establish the session — but this app never
      // stripped it from the visible URL afterward. Every later full
      // reinitialization of the supabase client (a hard navigation, a page
      // refresh, sometimes just a lazy-loaded page chunk mounting fresh)
      // re-parses that now-STALE hash and OVERWRITES the current valid
      // session with the old one. That's exactly what produced the "Session
      // as retrieved from URL expires in -33359s" console warning and the
      // cascading 403 (/auth/v1/user) + 406 (profiles select, RLS rejecting
      // the now-invalid JWT) + "violates foreign key constraint
      // profiles_id_fkey" (profile write attempted under a session that no
      // longer resolves to a valid auth.users row) errors seen landing on
      // Aura straight after the onboarding assessment. This callback firing
      // at all is the signal that supabase-js has already finished reading
      // the hash (parsing happens synchronously before the event fires) — so
      // stripping it here, on every event, is always safe and means it can
      // never be re-parsed on a later reload.
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search)
      }

      const u = session?.user || null

      if (u) {
        setUser(u)
        if (event === "SIGNED_IN")    PH.signedIn(u.app_metadata?.provider || "email")
        if (event === "USER_UPDATED") PH.signedUp(u.app_metadata?.provider || "email")

        if (profileUnsub) profileUnsub()
        profileUnsub = userDoc.subscribe(u.id, async (data) => {
          if (data) {
            if (!data.username) {
              // Add 6-char random suffix so same-name users never collide on the unique index.
              // Guard with a flag so we only attempt once per session, not on every subscribe fire.
              if (!window.__usernameSetAttempted) {
                window.__usernameSetAttempted = true
                const base = (u.user_metadata?.full_name || u.email?.split("@")[0] || u.id)
                  .toLowerCase().trim()
                  .replace(/[^a-z0-9]/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, "")
                const suffix = Math.random().toString(36).slice(2, 8)
                const autoUsername = `${base}-${suffix}`
                await userDoc.update(u.id, { username: autoUsername }).catch(() => {})
                data.username = autoUsername
              }
            }
            // Backfill missing display_name from auth metadata — same pattern as the
            // username backfill above. Root cause of Arena leaderboard showing
            // "Anonymous": arena_leaderboard reads fall back to profiles.display_name
            // / profiles.username when the domain-scoped table query errors, and for
            // any profile row where both are empty (older accounts, or accounts
            // created before this field was reliably written on onboarding) that
            // fallback had nothing to show. This runs once per session per the same
            // window.__displayNameSetAttempted guard style as __usernameSetAttempted.
            if (!data.display_name) {
              if (!window.__displayNameSetAttempted) {
                window.__displayNameSetAttempted = true
                const autoDisplayName = u.user_metadata?.full_name || u.email?.split("@")[0] || "Member"
                await userDoc.update(u.id, { display_name: autoDisplayName }).catch(() => {})
                data.display_name = autoDisplayName
              }
            }
            const isDone =
              data.onboarding_complete === true ||
              data.onboardingComplete === true
            setOnboardingDone(isDone)
            setUserData(data)
            identifyUser(u, data)
          } else {
            setOnboardingDone(false)
          }
          setLoading(false)
        })

        const existing = await userDoc.get(u.id)
        if (!existing) {
          setOnboardingDone(false)
          setLoading(false)
        }
      } else {
        if (profileUnsub) { profileUnsub(); profileUnsub = null }
        setUser(null)
        setOnboardingDone(false)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (profileUnsub) profileUnsub()
    }
  }, [])

  const handleSignOut = async () => {
    PH.signedOut()
    resetAnalytics()
    await supabase.auth.signOut()
    setUser(null); setOnboardingDone(false); setUserData(null)
    setCurrentPage("studentHome"); setAppStage("landing")
  }

  useEffect(() => {
    if (!profileMenuOpen) return
    const handler = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [profileMenuOpen])

  useEffect(() => {
    if (!showNotifications) return
    const handler = (e) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showNotifications])

  const loadNotifications = () => {
    if (!user) return
    nexusApi.notifications().then(d => setNotifications(Array.isArray(d) ? d : [])).catch(() => {})
  }
  useEffect(() => { loadNotifications() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (showNotifications) loadNotifications() }, [showNotifications]) // eslint-disable-line react-hooks/exhaustive-deps
  const unreadNotifCount = notifications.filter(n => !n.is_read).length
  const markAllNotificationsRead = () => {
    if (unreadNotifCount === 0) return
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
    nexusApi.markRead().catch(() => {})
  }
  const NOTIF_TYPE_META = {
    connection_request:  { icon: "🤝", color: "#6366F1" },
    connection_accepted: { icon: "✅", color: "#10B981" },
    recruiter_message:   { icon: "💬", color: "#6366F1" },
    post_acknowledge:    { icon: "👏", color: "#8B5CF6" },
    post_signal:         { icon: "⚡", color: "#6366F1" },
    interview_scheduled: { icon: "📅", color: "#F59E0B" },
    offer_received:      { icon: "🎁", color: "#10B981" },
    offer_response:      { icon: "🎁", color: "#10B981" },
    new_application:     { icon: "💼", color: "#10B981" },
    new_follower:        { icon: "👤", color: "#6366F1" },
    streak_break_risk:   { icon: "🔥", color: "#F59E0B" },
    elo_decay_risk:      { icon: "⚡", color: "#DC2626" },
    skill_stale:         { icon: "🧠", color: "#8B5CF6" },
  }
  const notifRelTime = (iso) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  useEffect(() => {
    if (user && currentPage) PH.pageViewed(currentPage)
  }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const HOME_PAGE = {
    student:      "studentHome",
    // Professional Path redesign: Home is now a real, distinct landing module
    // (per the 8-module IA — Home/Orbit/Forge/Launchpad/Pulse/Connect/Profile/
    // Settings) instead of dropping users straight onto Orbit.
    professional: "professionalHome",
    authority:    "executiveHome",
    institution:  "orgHome",
    recruiter:    "recruiterHome",
  }

  const navPath = (() => {
    const p = userData?.path || "student"
    if (p === "authority")    return "authority"
    if (p === "institution")  return "institution"
    if (p === "professional") return "professional"
    if (p === "recruiter")    return "recruiter"
    return "student"
  })()

  // Professional path nav ELO badge (2026-07-26 fix): this badge used to
  // read userData.eloRating (profiles.elo_rating) unconditionally for every
  // path — that's the LEGACY, profile-completeness/Arena-linked ELO field,
  // completely disconnected from the real, verification-gated Professional
  // Skill Rating track (professional_elo_state / eloEngine.js /
  // GET /api/pro/elo/professional). That disconnect is exactly why a
  // completed Weekly Skill Pulse could show "-13 ELO" in Skill Test History
  // while this badge never moved — the two numbers were never the same
  // number. Fetched here (not lower down in Skills.jsx alone) so it updates
  // the persistent top-nav badge on every page, not just Skills.
  //
  // Student/Authority/Institution/Recruiter paths are UNCHANGED — they keep
  // reading userData.eloRating exactly as before (real Arena rating for
  // students; not touched by this fix; see "Keep student Arena logic
  // intact" standing rule).
  const [proNavElo, setProNavElo] = useState(null)
  useEffect(() => {
    if (navPath !== "professional") { setProNavElo(null); return }
    let cancelled = false
    import("./lib/api").then(({ professionalEloApi }) => {
      professionalEloApi.status()
        .then(res => { if (!cancelled) setProNavElo(res) })
        .catch(() => { if (!cancelled) setProNavElo(null) })
    })
    return () => { cancelled = true }
    // Re-fetch whenever the user navigates — cheap read, and it's the
    // simplest reliable way to reflect a just-completed Weekly Skill Pulse
    // (or a just-verified EPFO/certification bonus) in the badge without
    // building a separate global event bus for one number.
  }, [navPath, currentPage])

  // Bug fix (2026-08-13): this effect used to fire on EVERY resolution of
  // userData?.path (which happens on every fresh page load, since userData
  // loads asynchronously after auth), unconditionally overwriting
  // currentPage back to the user's home page. That silently defeated the
  // deep-linking system pageRoutes.js exists to provide (see its header:
  // "bookmarkable/shareable" URLs, tasks #106-108) -- a signed-in user
  // hard-navigating to, or refreshing, any non-home URL (e.g. a shared
  // /arena-v2-ml-pilot link) was bounced straight back to /aura or
  // /professional-home before ever seeing the requested page.
  // Fix: only apply the home redirect once per page load, and only when the
  // page actually loaded on a URL that ISN'T a recognized deep link (e.g.
  // "/" right after sign-in/onboarding, which is the real case this effect
  // exists for). If the user arrived on a valid, mapped URL, respect it --
  // currentPage's initial useState value (PATH_TO_PAGE[pathname]) already
  // resolved it correctly before this effect ever runs.
  const didInitialHomeRedirect = useRef(false)
  const initialPathWasValidPage = useRef(!!PATH_TO_PAGE[window.location.pathname])
  useEffect(() => {
    if (userData?.path && onboardingDone && !didInitialHomeRedirect.current) {
      didInitialHomeRedirect.current = true
      if (initialPathWasValidPage.current) return
      const home = navPath === "student" ? "aura" : (HOME_PAGE[navPath] || "studentHome")
      setCurrentPage(home)
      setActiveNavItem("home")
    }
  }, [userData?.path, onboardingDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL <-> currentPage sync ──────────────────────────────────────────────
  // Two-way sync so every one of the 59 pages in PAGE_TO_PATH gets a real,
  // bookmarkable, back/forward-capable URL, without changing any of the 50+
  // existing setCurrentPage call sites or the currentPage-driven render tree
  // below. Both effects bail out immediately on the reserved special routes
  // (/portfolio/:username, /admin/*, /join/*, /career, /company-invite/*) so
  // they keep behaving exactly as before -- this never touches those.
  //
  // Both directions only apply once we're actually in the main authenticated
  // app (signed in + onboarding complete) -- currentPage is meaningless
  // before that (landing page, account-type picker, auth modal, onboarding
  // wizard don't render from it at all), so syncing it to the URL during
  // those stages would incorrectly redirect a logged-out visitor away from
  // "/" to e.g. "/student-home" the instant the component mounts.
  const inMainApp = !!user && onboardingDone

  // Direction 1: in-app navigation (setCurrentPage(x) called anywhere) pushes
  // the matching real path into the URL bar.
  useEffect(() => {
    if (!inMainApp || isReservedPath(location.pathname)) return
    const path = PAGE_TO_PATH[currentPage]
    if (path && path !== location.pathname) navigate(path)
  }, [currentPage, inMainApp]) // eslint-disable-line react-hooks/exhaustive-deps

  // Direction 2: the URL changing from outside in-app navigation (browser
  // back/forward, a bookmarked/shared link, typing a URL directly) updates
  // currentPage to match. Guarded so it never fights direction 1 above --
  // if currentPage already matches the URL there's nothing to do.
  useEffect(() => {
    if (!inMainApp || isReservedPath(location.pathname)) return
    const page = PATH_TO_PAGE[location.pathname]
    if (page && page !== currentPage) {
      setCurrentPage(page)
      setActiveNavItem(page)
    }
  }, [location.pathname, inMainApp]) // eslint-disable-line react-hooks/exhaustive-deps

  if (window.location.pathname.startsWith("/portfolio/")) {
    const username = window.location.pathname.replace("/portfolio/", "").split("/")[0]
    return <Portfolio username={username} />
  }

  if (window.location.pathname === "/career") {
    return <CareerPicker user={user} />
  }

  // Internal-only, no nav entry — access control is server-side
  // (requireAuth + requireAdmin on every backend/server/routes/
  // questionBankAdmin.js route this page calls). See AdminQuestionBank.jsx
  // header for why this exists (Career OS Tranche 4).
  if (window.location.pathname === "/admin/question-bank") {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AdminQuestionBank user={user} />
        </Suspense>
      </ErrorBoundary>
    )
  }

  // Internal-only, no nav entry — access control is server-side
  // (requireAuth + requireAdmin on backend/server/routes/opsDashboard.js).
  // See AdminOpsDashboard.jsx header for why this exists (Career OS
  // Tranche D, 2026-07-25) — the ops snapshot API existed since Tranche 11
  // but had no frontend, so it was only reachable via curl/Postman.
  if (window.location.pathname === "/admin/ops-dashboard") {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AdminOpsDashboard user={user} />
        </Suspense>
      </ErrorBoundary>
    )
  }

  // Internal-only, no nav entry — access control is server-side
  // (requireAuth + requireAdmin on backend/server/routes/
  // skillStudioContentAdmin.js). See AdminSkillStudioContent.jsx header for
  // why this exists (Skill Studio V2 loop closure, 2026-07-29) — the
  // generated module/quiz review queue existed since Skill Studio V2 but had
  // no frontend, so it was only reachable via curl/Postman.
  if (window.location.pathname === "/admin/skill-studio-content") {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AdminSkillStudioContent user={user} />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (window.location.pathname.startsWith("/join/")) {
    const inviteCode = window.location.pathname.replace("/join/", "").split("/")[0]
    return (
      <JoinPage
        code={inviteCode}
        onDone={() => {
          window.history.replaceState({}, "", "/")
          setAppStage("landing")
        }}
      />
    )
  }

  if (window.location.pathname.startsWith("/join-org/")) {
    const orgToken = window.location.pathname.replace("/join-org/", "").split("/")[0]
    return (
      <JoinOrgPage
        token={orgToken}
        user={user}
        userData={userData}
        onDone={() => {
          window.history.replaceState({}, "", "/")
          if (user) { window.location.reload(); return } // refresh so the new org_members row is picked up
          // 2026-07-31: student-role invite links pre-set capabilio_selected_path
          // ("student") in JoinOrgPage before this fires — skip the account-type
          // chooser and go straight to signup, matching how LandingPage/
          // AccountType already open the modal for a pre-known path.
          let preSelected = null
          try { preSelected = localStorage.getItem("capabilio_selected_path") } catch {}
          if (preSelected === "student") {
            setAuthMode("signup"); setShowAuth(true)
          } else {
            setAppStage("accountType")
          }
        }}
      />
    )
  }

  if (window.location.pathname.startsWith("/attest/")) {
    // Employer attestation link — the visitor is a former employer/manager
    // with no Capabilio account, so this never gates on `user` at all
    // (unlike /join-org/ above, which needs a logged-in student).
    const attestToken = window.location.pathname.replace("/attest/", "").split("/")[0]
    return <AttestPage token={attestToken} />
  }

  if (window.location.pathname.startsWith("/company-invite/")) {
    const inviteToken = window.location.pathname.replace("/company-invite/", "").split("/")[0]
    return (
      <CompanyInvitePage
        token={inviteToken}
        user={user}
        userData={userData}
        onDone={() => {
          window.history.replaceState({}, "", "/")
          if (user) window.location.reload()
          else setAppStage("accountType")
        }}
        onSignOut={handleSignOut}
      />
    )
  }

  if (loading) return <PageLoader />

  if (!user) {
    return (
      <>
        {appStage === "accountType" ? (
          <AccountType
            onSelect={(type, extra) => {
              try {
                localStorage.setItem("capabilio_selected_path", type)
                // 2026-08-03: Student/Job Seeker split — extra.studentStage is
                // only ever set when type==="student". Stored under its own
                // key (not overloading capabilio_selected_path) so Onboarding
                // can read it independently; cleared alongside the path key
                // once onboarding consumes it (see Onboarding.jsx).
                if (extra?.studentStage) localStorage.setItem("capabilio_student_stage", extra.studentStage)
                else localStorage.removeItem("capabilio_student_stage")
              } catch {}
              setAuthMode("signup"); setShowAuth(true)
            }}
            onLogin={() => { setAuthMode("login"); setShowAuth(true) }}
            onBack={() => setAppStage("landing")}
          />
        ) : (
          <LandingPage
            // 2026-08-18: landing page no longer routes through the separate
            // AccountType.jsx page — AuthModal now has its own in-modal
            // step-1 path chooser (used when LandingPage's openPath(null,...)
            // clears capabilio_selected_path, e.g. the generic nav/hero
            // "Get started"). AccountType.jsx itself is untouched and still
            // used by the unrelated /join-org/ and /company-invite/ deep-link
            // flows above, which set appStage directly.
            onGetStarted={() => { setAuthMode("signup"); setShowAuth(true) }}
            onLogin={() => { setAuthMode("login"); setShowAuth(true) }}
          />
        )}
        <AuthModal show={showAuth} onClose={() => setShowAuth(false)} mode={authMode} setMode={setAuthMode} />
      </>
    )
  }

  if (!onboardingDone) {
    return (
      <Onboarding
        user={user}
        onComplete={async (pathHint) => {
          await new Promise(r => setTimeout(r, 400))
          const fresh = await userDoc.get(user.id)
          const confirmedPath = pathHint || fresh?.path || "student"
          if (fresh) setUserData({ ...fresh, path: confirmedPath })
          try {
            await userDoc.update(user.id, {
              onboarding_complete: true,
              path: confirmedPath,
            })
          } catch {}
          PH.onboardingCompleted({
            path:         confirmedPath,
            keyword:      fresh?.keyword,
            subscription: fresh?.subscription,
            eloRating:    fresh?.eloRating || fresh?.elo_rating,
          })
          // Institution/company accounts: force a full reload rather than
          // trusting in-memory state here. org_type (college vs company) is
          // set mid-wizard, well before this callback fires, so the DB value
          // is already correct — but this callback's own setUserData/realtime
          // paths have shown stale-state symptoms in practice (dashboard
          // rendering the wrong org_type right after finishing onboarding).
          // A reload guarantees the very next render reads org_type fresh
          // from userDoc.get(), matching the same defensive pattern already
          // used by JoinOrgPage.jsx and CompanyInvitePage.jsx after their own
          // profile-changing actions.
          if (confirmedPath === "institution") {
            window.location.reload()
            return
          }
          setOnboardingDone(true)
          const home = confirmedPath === "student" ? "aura" : (HOME_PAGE[confirmedPath] || "studentHome")
          setCurrentPage(home)
          setActiveNavItem("home")
        }}
        onBack={() => { setUser(null); setOnboardingDone(false) }}
      />
    )
  }

  const isAuthority = (
    userData?.path === "authority" ||
    userData?.path === "institution" ||
    userData?.account_type === "authority" ||
    userData?.account_type === "institution"
  )

  const handleBottomNavTap = (itemId, page, tab) => {
    setActiveNavItem(itemId)
    setCurrentPage(page)
    if (tab) setActiveTab(tab)
  }

  const navAccent   = { student:"#FF5701", professional:"#6D28D9", authority:"#1D4ED8", institution:"#0F766E" }[navPath] || "#FF5701"
  const avatarUrl   = userData?.profilePhotoURL || null
  const initials    = (userData?.name || user?.displayName || "U").charAt(0).toUpperCase()
  const displayName = userData?.displayName || userData?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  // Nav decluttered 2026-07-28 (second, final pass): header stays at exactly
  // five items.
  // Arena nav item removed 2026-09-05 — old Arena implementation retired
  // (College Stream / Domain Role / capability engine). New Arena/Challenge
  // system to be rebuilt separately; nav entry returns once that lands.
  const STUDENT_HEADER_NAV = [
    { id: "aura",        label: "Aura",         page: "aura",        prefix: "+" },
    { id: "pulse",       label: "Pulse",        page: "pulse",       prefix: "⚡" },
    { id: "skillstudio", label: "Skill Studio", page: "skillstudio",   prefix: "🎓" },
    { id: "launchpad",   label: "Launchpad",    page: "launchpad",     prefix: "🚀" },
    { id: "myTasks",     label: "Tasks",        page: "myTasks",       prefix: "📋" },
    // 2026-08-02: only shown once GET /college/me/tasks confirms this student
    // is actually org-linked — collegeLinked starts null (unresolved) so this
    // never flashes in and then disappears; it simply appears once known true.
    ...(collegeLinked ? [{ id: "college", label: "College", page: "studentCollege", prefix: "🏫" }] : []),
  ]

  // Sprint 5 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14 / EXECUTIVE_PATH_INFORMATION_ARCHITECTURE.md:
  // the full 10-module Founder OS IA. BottomNav carries only the 5 highest-frequency
  // items (Home/Startup/Funding/Network/Copilot); this scrollable header carries all
  // ten so every module has a real destination — Funding/Growth/Communities/Events/
  // Marketplace/Analytics/AI-Copilot render an honest "not built yet" state
  // (ExecutiveComingSoon) rather than being unreachable or faked.
  // Professional Path redesign v2 — 7-module IA per updated spec. Orbit is no
  // longer a standalone nav destination: its dashboard (OrbitDash) is now
  // embedded directly in Home, and its Timeline/Verification/Compensation/
  // Readiness tabs are reached via "Career" (still page id "orbit" internally
  // — only the nav label changed, no route rename needed). Forge folded out
  // of top-level nav; Settings remains reachable via Profile's Settings tab.
  // Career and Skills were removed as separate top-level nav items — Profile
  // Career OS Workstream 0 nav split (docs/career-os-implementation-plan.md
  // §A, behind the career_os_nav flag): Career and Skills return to the
  // top-level nav as standalone modules (Orbit.jsx / Skills.jsx — both
  // already real, already working pages, previously reachable only as deep
  // links from Profile/Home). Company is defined here but gated behind its
  // own flag (career_os_company, off by default) — it's added to the array
  // only once the real module ships in Workstream 5, so users never see a
  // nav entry pointing at an unbuilt page.
  const PROFESSIONAL_HEADER_NAV = FLAGS.career_os_nav ? [
    { id: "home",      label: "Home",      page: "professionalHome", prefix: "🏠" },
    { id: "orbit",     label: "Career",    page: "orbit",            prefix: "📈" },
    { id: "skills",    label: "Skills",    page: "skills",           prefix: "🧠" },
    { id: "launchpad", label: "Launchpad", page: "launchpad",        prefix: "🚀" },
    { id: "pulse",     label: "Pulse",     page: "pulse",            prefix: "📰" },
    { id: "nexus",     label: "Connect",   page: "nexus",            prefix: "🤝" },
    ...(FLAGS.career_os_company ? [{ id: "company", label: "Company", page: "company", prefix: "🏢" }] : []),
    { id: "aura",      label: "Profile",   page: "aura",             prefix: "👤" },
  ] : [
    // Pre-Career-OS nav (instant rollback path if career_os_nav is disabled).
    { id: "home",      label: "Home",      page: "professionalHome", prefix: "🏠" },
    { id: "launchpad", label: "Launchpad", page: "launchpad",        prefix: "🚀" },
    { id: "pulse",     label: "Pulse",     page: "pulse",            prefix: "📰" },
    { id: "nexus",     label: "Connect",   page: "nexus",            prefix: "🤝" },
    { id: "aura",      label: "Profile",   page: "aura",             prefix: "👤" },
  ]
  // "Tasks" (My Tasks — recruiter-assigned work samples reached via
  // College placement-cell approval, see MyTasks.jsx) removed from
  // PROFESSIONAL_HEADER_NAV (2026-08-12): the feature is designed for the
  // Student path only (student->college->recruiter access flow), left in
  // STUDENT_HEADER_NAV above where it belongs.

  const AUTHORITY_HEADER_NAV = [
    { id: "home",        label: "Home",        page: "executiveHome",    prefix: "⌂" },
    { id: "startup",     label: "Startup",     page: "startupworkspace", prefix: "◆" },
    { id: "funding",     label: "Funding",     page: "funding",          prefix: "$" },
    { id: "growth",      label: "Growth",      page: "growth",           prefix: "↗" },
    { id: "network",     label: "Network",     page: "execnetwork",      prefix: "◎" },
    { id: "communities", label: "Communities", page: "communities",      prefix: "◫" },
    { id: "events",      label: "Events",      page: "events",           prefix: "▤" },
    { id: "marketplace", label: "Marketplace", page: "marketplace",      prefix: "▣" },
    { id: "analytics",   label: "Analytics",   page: "analytics",        prefix: "▲" },
    { id: "aicopilot",   label: "AI Copilot",  page: "aicopilot",        prefix: "✦" },
  ]

  return (
    <div style={{ background: "var(--cap-bg-page)", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');
        .cap-nav-item { transition: color 0.12s, background 0.12s; }
        .cap-nav-item:hover { background: rgba(0,0,0,0.04) !important; }
      `}</style>

      <header style={{
        position: "sticky", top: 0, zIndex: 90,
        background: "#fff",
        borderBottom: "1px solid #E8E3DA",
        height: 56,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        gap: 12,
      }}>
        <img src="/capabilio-logo-dark.png" alt="Capabilio AI" style={{ height: 22, width: "auto", display: "block", flexShrink: 0 }} />

        {(navPath === "student" || navPath === "authority" || navPath === "professional") && (
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "flex-start", marginLeft: 8, overflowX: "auto" }}>
            {({ student: STUDENT_HEADER_NAV, authority: AUTHORITY_HEADER_NAV, professional: PROFESSIONAL_HEADER_NAV }[navPath]).map(item => {
              const active = activeNavItem === item.id || (currentPage === item.page && (!item.tab || activeTab === item.tab))
              return (
                <button key={item.id} className="cap-nav-item"
                  onClick={() => handleBottomNavTap(item.id, item.page, item.tab)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 8, border: "none",
                    background: active ? `${navAccent}12` : "transparent",
                    color: active ? navAccent : "#6B6560",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    borderBottom: active ? `2px solid ${navAccent}` : "2px solid transparent",
                  }}>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, opacity: active ? 1 : 0.6 }}>{item.prefix}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* 2026-08-03: Student/Job Seeker split — light framing chip only,
              does not gate any page/route (that's handled elsewhere: College
              tab visibility, self-link, Arena prompt tone). */}
          {navPath === "student" && userData?.studentStage === "job_seeker" && (
            <div style={{ padding: "4px 10px", background: "#FFF1E8", border: `1px solid ${navAccent}30`, borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: navAccent, letterSpacing: "0.02em" }}>
              🎯 Job Seeker
            </div>
          )}
          {!isAuthority && navPath === "professional" && proNavElo ? (
            <div style={{ padding: "4px 10px", background: `${navAccent}10`, border: `1px solid ${navAccent}30`, borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: navAccent }}>
              ELO {(proNavElo.overall_elo ?? proNavElo.elo).toLocaleString()}
            </div>
          ) : !isAuthority && navPath !== "professional" && userData?.eloRating ? (
            <div style={{ padding: "4px 10px", background: navPath === "student" ? "#FFF1E8" : `${navAccent}10`, border: `1px solid ${navAccent}30`, borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: navAccent }}>
              ELO {userData.eloRating.toLocaleString()}
            </div>
          ) : null}

          <div ref={notifMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(o => !o)}
              style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 99, border: "1px solid #E8E3DA",
                background: showNotifications ? `${navAccent}10` : "#fff", cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6560" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadNotifCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, padding: "0 3px",
                  borderRadius: 99, background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace",
                }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340,
                background: "#fff", border: "1px solid #E8E3DA", borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                maxHeight: 420, overflowY: "auto", zIndex: 200,
              }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1714", fontFamily: "'DM Sans', sans-serif" }}>Notifications</span>
                  <button onClick={markAllNotificationsRead} disabled={unreadNotifCount === 0}
                    style={{ border: "none", background: "transparent", color: unreadNotifCount === 0 ? "#A8A29E" : navAccent, fontSize: 11, fontWeight: 700, cursor: unreadNotifCount === 0 ? "default" : "pointer" }}>
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 && (
                  <div style={{ padding: "22px 14px", textAlign: "center", fontSize: 12, color: "#A8A29E" }}>No notifications yet.</div>
                )}
                {notifications.slice(0, 10).map((n) => {
                  const meta = NOTIF_TYPE_META[n.type] || { icon: "🔔", color: navAccent }
                  return (
                    <div key={n.id} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "1px solid #F9F7F3", background: !n.is_read ? `${meta.color}08` : "transparent" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#3D3935", fontWeight: n.is_read ? 400 : 600, lineHeight: 1.4 }}>{n.title || n.body}</div>
                        {n.title && n.body && <div style={{ fontSize: 11, color: "#6B6560", lineHeight: 1.4, marginTop: 1 }}>{n.body}</div>}
                        <div style={{ fontSize: 10, color: "#A8A29E", marginTop: 3 }}>{notifRelTime(n.created_at)}</div>
                      </div>
                      {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: 99, background: meta.color, marginTop: 5, flexShrink: 0 }} />}
                    </div>
                  )
                })}
                <div style={{ padding: "10px 14px", textAlign: "center", borderTop: "1px solid #E8E3DA" }}>
                  <button onClick={() => { setShowNotifications(false); setCurrentPage("nexus"); setActiveNavItem("nexus") }}
                    style={{ border: "none", background: "transparent", color: navAccent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    View all →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={profileMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px 4px 4px",
                background: profileMenuOpen ? `${navAccent}10` : "#fff",
                border: `1px solid ${profileMenuOpen ? navAccent + "50" : "#E8E3DA"}`,
                borderRadius: 99, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!profileMenuOpen) { e.currentTarget.style.borderColor = navAccent + "50"; e.currentTarget.style.background = `${navAccent}08` } }}
              onMouseLeave={e => { if (!profileMenuOpen) { e.currentTarget.style.borderColor = "#E8E3DA"; e.currentTarget.style.background = "#fff" } }}
            >
              <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `2px solid ${navAccent}44`, background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: navAccent }}>{initials}</span>
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#3D3935", fontFamily: "'DM Sans', sans-serif", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: "transform 0.2s", transform: profileMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M2 4l4 4 4-4" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {profileMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", border: "1px solid #E8E3DA",
                borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                minWidth: 200, overflow: "hidden", zIndex: 200,
              }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1714", fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 2 }}>{user?.email || ""}</div>
                </div>

                <button
                  onClick={() => {
                    // 2026-08-01 bugfix: this always routed to currentPage
                    // "aura" regardless of the signed-in account's path.
                    // Aura.jsx treats userData.path==="institution" the same
                    // as "authority" (its isExecutive flag merges both) and
                    // hands off to ExecutiveAura — so an institution admin
                    // clicking this Settings button landed on the Executive
                    // Path's settings screen instead of their own. Institution
                    // accounts now route into InstitutionOS's own Settings
                    // tab (orgSettings + initialPage="settings", wired above
                    // at the InstitutionOS mount site) instead of "aura".
                    if (navPath === "institution") {
                      setCurrentPage("orgSettings")
                      setActiveNavItem("orgSettings")
                    } else {
                      setCurrentPage("aura")
                      setActiveTab("settings")
                      setActiveNavItem("aura")
                    }
                    setProfileMenuOpen(false)
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#3D3935",
                    textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FAF7F2" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 15 }}>⚙️</span>
                  Settings
                </button>

                <div style={{ height: 1, background: "#F3F4F6", margin: "2px 0" }} />

                <button
                  onClick={() => { setProfileMenuOpen(false); handleSignOut() }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#EF4444",
                    textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FFF5F5" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 15 }}>🚪</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Professional path's full nav now lives in the scrollable header
          (PROFESSIONAL_HEADER_NAV) — PathNav's icon row would just duplicate it. */}
      {navPath !== "student" && navPath !== "institution" && navPath !== "professional" && (
        <PathNav
          path={navPath}
          activeItem={activeNavItem}
          onNavigate={handleBottomNavTap}
        />
      )}

      <div style={{ height: "calc(100vh - 56px)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Suspense: lazy page chunks load on first navigation — PageLoader shows briefly.
            Wrapped in ErrorBoundary: if a chunk 404s (stale index.html pointing at a
            hash a newer deploy purged), this used to unmount the ENTIRE app to a blank
            white screen with no recovery path. ErrorBoundary now catches it and either
            auto-reloads once (the common case, self-heals silently) or shows a visible
            "Refresh page" fallback instead of a blank screen. */}
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {currentPage === "studentHome"      && <StudentHome      user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "studentCollege"   && <StudentCollegePage onBack={() => { setCurrentPage("studentHome"); setActiveNavItem("home") }} />}
          {currentPage === "professionalHome" && <ProfessionalHome user={user} userData={userData} setUserData={setUserData} activeTab={activeTab} setActiveTab={setActiveTab} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />}
          {currentPage === "skills" && <Skills user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "company" && <Company user={user} />}
          {currentPage === "executiveHome"    && <ExecutiveHome    user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {["orgHome","orgIntel","orgTasks","orgPeople","orgSettings","orgCommunity","orgGroups","orgCohorts","orgEvents","orgOpportunities","orgOutcomes"].includes(currentPage) && (
            // 2026-08-01 bugfix: these 11 currentPage values previously all
            // mounted the exact same InstitutionOS with no way to land on
            // anything but its default Home tab — orgSettings existed as a
            // currentPage value but did nothing differently. InstitutionOS
            // now accepts initialPage so orgSettings actually opens Settings
            // (see the header Settings button below, and InstitutionOS.jsx's
            // initialPage prop comment for the full bug this fixes).
            //
            // key forces a remount when the request is specifically for
            // Settings — initialPage alone only affects a component's FIRST
            // render (useState semantics), so without this, clicking the
            // header Settings button while already inside InstitutionOS
            // (the exact scenario in the bug report) would re-render with a
            // new initialPage prop that useState silently ignores, leaving
            // the user on whatever org tab they already had open. A user is
            // never mid-edit in a way a remount here would lose data — this
            // is a top-level nav action, not a form.
            <InstitutionOS key={currentPage === "orgSettings" ? "org-settings" : "org-default"}
              user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }}
              initialPage={currentPage === "orgSettings" ? "settings" : "home"} />
          )}

          {currentPage === "orbit" && (
            <Orbit user={user} userData={userData} setUserData={setUserData}
              activeTab={activeTab} setActiveTab={setActiveTab}
              onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }}
              onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />
          )}

          {currentPage === "weeklycheck" && (
            <WeeklyCareerCheck user={user} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />
          )}

          {currentPage === "aura" && (
            <Aura user={user} activeTab={activeTab} setActiveTab={setActiveTab}
              onNavigate={setCurrentPage} onNavigatePricing={() => setCurrentPage("pricing")}
              userData={userData} setUserData={setUserData} />
          )}
          {currentPage === "nexus"     && <Nexus user={user} userData={userData} setUserData={setUserData} />}
          {currentPage === "myTasks"   && <MyTasks />}
          {/* Old Arena (College Stream / Domain Role / capability engine)
              retired 2026-09-05. New Arena/Challenge system to be rebuilt
              separately as its own component. */}
          {currentPage === "pulse"     && <Pulse user={user} userData={userData} />}
          {currentPage === "authority" && <AuthorityProfile user={user} userData={{ ...userData, uid: user?.id }} setUserData={setUserData} onNavigate={setCurrentPage} />}
          {currentPage === "startupworkspace" && <StartupWorkspace user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "executivefeed" && <ExecutiveFeed user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "funding"      && <ExecutiveComingSoon module="funding" />}
          {currentPage === "growth"       && <Growth user={user} userData={userData} />}
          {currentPage === "communities"  && <ExecutiveComingSoon module="communities" />}
          {currentPage === "events"       && <ExecutiveComingSoon module="events" />}
          {currentPage === "marketplace"  && <ExecutiveComingSoon module="marketplace" />}
          {currentPage === "analytics"    && <ExecutiveAnalytics user={user} userData={userData} />}
          {currentPage === "aicopilot"    && <ExecutiveComingSoon module="aicopilot" />}
          {currentPage === "skillstudio" && (FLAGS.skill_studio_v2
            ? <SkillStudioShell user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />
            : <SkillStudio user={user} userData={userData} />)}
          {currentPage === "launchpad"   && <Launchpad   user={user} userData={userData} onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />}
          {currentPage === "pricing"     && <Pricing     user={user} userData={userData} setUserData={setUserData} onBack={() => { const home = HOME_PAGE[navPath] || "studentHome"; setCurrentPage(home); setActiveNavItem("home") }} />}

          {currentPage === "forge"       && <Forge          user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {/* "challenges" page and its Arena-backed render removed 2026-08-16 along with Arena. */}

          {currentPage === "timemarket"  && <Launchpad      user={user} userData={userData} />}
          {currentPage === "signalrooms" && <SignalRooms     user={user} userData={userData} />}
          {currentPage === "execnetwork" && <ExecutiveNetwork user={user} userData={userData} />}

          {currentPage === "recruiterHome" && <RecruiterDashboard user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "pipeline"      && <HiringPipeline     user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "jobPostings"   && <JobPostings        user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
          {currentPage === "candidateSearch" && <CandidateSearch  user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        </Suspense>
        </ErrorBoundary>
      </div>

      {/* Excluded from authority/executive path: that path has its own dedicated
          AI Copilot nav module (ExecutiveComingSoon "aicopilot" today, the
          proactive founder-briefing engine in Sprint 6) rather than the
          generic career-Q&A widget used by student/professional. */}
      {user && navPath !== "institution" && navPath !== "authority" && <CopilotWidget user={user} userData={userData} />}

      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
