/**
 * Pulse.jsx — LinkedIn-style professional news feed
 * 3-column layout: Profile sidebar | Feed | Trending/Suggestions sidebar
 */
import { useState, useEffect, useCallback, useRef } from "react"
import { pulseApi, nexusApi, professionalEloApi, skillsApi } from "../lib/api"
import { getRoleConfig } from "../config/roleConfig"
import { FLAGS } from "../config/featureFlags"

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      "#FAF7F2",
  surface: "#FFFFFF",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  indigo:  "#6366F1",
  indigo2: "rgba(99,102,241,0.12)",
  green:   "#10B981",
  green2:  "rgba(16,185,129,0.12)",
  amber:   "#F59E0B",
  border:  "rgba(0,0,0,0.05)",
  shadow:  "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
  r:       8,
  mono:    "'DM Mono', monospace",
  serif:   "'DM Sans', sans-serif",
  sans:    "'DM Sans', -apple-system, sans-serif",
}

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
@keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
.pcard { transition: box-shadow .15s; }
.pcard:hover { box-shadow: 0 0 0 1px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.1) !important; }
.pbtn { transition: background .12s, color .12s; cursor: pointer; }
.pbtn:hover { background: rgba(0,0,0,0.06) !important; }
.plink { color: ${T.indigo}; cursor: pointer; font-weight: 600; }
.plink:hover { text-decoration: underline; }
`

// ─── Static data ──────────────────────────────────────────────────────────────
// Pulse redesign (2026-07-26): the old TECH_NEWS / TRENDING / SUGGESTIONS
// hardcoded arrays were removed entirely — see RightSidebar below, which now
// sources news from pulseApi.marketInsights (real, Gemini/Groq-backed),
// trending topics from pulseApi.trendingTags (real tech_tags counts from
// pulse_posts), and "People you may know" from pulseApi.builders (real
// Supabase profiles ranked by elo_rating). Any of these can legitimately be
// empty — that's rendered as an honest empty state, never backfilled with
// placeholder content.

const POST_TYPES = [
  { id:"text",        icon:"📝", label:"Post"        },
  { id:"celebration", icon:"🎉", label:"Celebrate"   },
  { id:"event",       icon:"📅", label:"Event"       },
  { id:"poll",        icon:"📊", label:"Poll"        },
]

const REACTIONS = [
  { id:"acknowledge", label:"👏 Acknowledge", color:"#B24020" },
  { id:"signal",      label:"⚡ Signal",      color:T.indigo  },
  { id:"celebrate",   label:"🎉 Celebrate",   color:"#E7A33E" },
  { id:"insightful",  label:"💡 Insightful",  color:T.green   },
]

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Spin({ size=20, color=T.indigo }) {
  return <div style={{ width:size, height:size, border:`2px solid ${color}33`, borderTopColor:color, borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }}/>
}

function Avatar({ name, url, size=40, color="#0A66C2" }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${T.border}` }}>
      {url
        ? <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        : <span style={{ fontFamily:T.serif, fontSize:size*.38, fontWeight:700, color:"#fff", lineHeight:1 }}>{name?.[0]?.toUpperCase() || "?"}</span>
      }
    </div>
  )
}

function Card({ children, style={}, className="" }) {
  return (
    <div className={`pcard ${className}`} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.r, overflow:"hidden", ...style }}>
      {children}
    </div>
  )
}

function OfflinePill() {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#FFF8E1", border:"1px solid #FFE082", borderRadius:99, fontSize:11, color:"#B45309", fontWeight:600, fontFamily:T.mono, marginBottom:12 }}>
      🔌 Backend offline — start server to load live posts
    </div>
  )
}

// ─── Time helper ──────────────────────────────────────────────────────────────
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}

// Plain-language translation of the internal ELO-style rating — Career OS
// Non-negotiable Rule #1 (see ProfessionalHome.jsx/Orbit.jsx): no bare score
// number ships to a professional-facing screen without translation. This
// sidebar used to show "Your ELO rating: 1000" as a bare mono number; that's
// exactly the pattern the rule forbids (2026-07-24 fix).
const SKILL_TIER_PHRASES = [
  { min: 0,    label: "Just getting started" },
  { min: 600,  label: "Building momentum" },
  { min: 800,  label: "Solid progress" },
  { min: 1000, label: "Strong performer" },
  { min: 1200, label: "Advanced" },
  { min: 1500, label: "Top tier" },
]
const skillTierPhrase = elo => [...SKILL_TIER_PHRASES].reverse().find(t => elo >= t.min)?.label || "Just getting started"

// ─── Left sidebar ─────────────────────────────────────────────────────────────
function ProfileSidebar({ user, userData }) {
  const name    = userData?.name || userData?.displayName || user?.user_metadata?.full_name || "You"
  const path    = userData?.path || "professional"
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()

  // Tranche A (2026-07-25): this sidebar used to source its "Skill
  // assessment" phrase from userData.eloRating — the Arena-challenge score.
  // Professional Path has no Arena nav item, so for professional users that
  // number never moves off its default; it's a stale, non-representative
  // stat masquerading as a skill signal. When the real Professional ELO
  // track is on, use it (it's the one score that's actually assessment-
  // performance-driven for this user); otherwise keep the previous Arena-elo
  // fallback so behavior for students/other paths is untouched.
  const [proElo, setProElo] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (path === "professional" && FLAGS.career_os_professional_elo) {
      professionalEloApi.status().then(r => { if (!cancelled) setProElo(r) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [path])

  const usingProElo = path === "professional" && FLAGS.career_os_professional_elo && proElo?.elo != null
  const elo = usingProElo ? proElo.elo : (userData?.eloRating || 1000)

  return (
    <Card>
      {/* Cover gradient */}
      <div style={{ height:56, background:`linear-gradient(135deg, #0A66C2 0%, #6D28D9 100%)` }}/>
      {/* Avatar + identity */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ marginTop:-28, marginBottom:8 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#0A66C2", border:`3px solid ${T.surface}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontFamily:T.serif, fontSize:22, fontWeight:700, color:"#fff" }}>{initials}</span>
          </div>
        </div>
        <div style={{ fontFamily:T.serif, fontSize:15, fontWeight:800, color:T.ink, marginBottom:2 }}>{name}</div>
        <div style={{ fontSize:12, color:T.ink2, lineHeight:1.4, marginBottom:10 }}>{(() => {
          // Same fallback chain as ProfessionalHome.jsx: headline (resume title)
          // first, then current/most-recent experience title — covers users who
          // uploaded a resume before headline auto-derivation existed and haven't
          // re-uploaded since — before falling back to the generic path label.
          const currentExp = (userData?.experiences || []).find(e => e?.isCurrent || e?.current) || (userData?.experiences || [])[0]
          return userData?.headline || currentExp?.role || currentExp?.title
            || (path === "professional" ? "Software Professional" : `${path.charAt(0).toUpperCase()}${path.slice(1)} · Capabilio`)
        })()}</div>

        {/* Skill assessment — plain-language tier, not the bare internal score.
            When sourced from the real Professional ELO track, label it as
            such so it's never mistaken for a generic/static number. */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:`1px solid ${T.border}`, marginBottom:4 }}>
          <span style={{ fontSize:12, color:T.ink3 }}>{usingProElo ? "Professional ELO" : "Skill assessment"}</span>
          <span style={{ fontSize:12, fontWeight:700, color:T.indigo }}>{skillTierPhrase(elo)}</span>
        </div>
        {/* Real, not hardcoded (2026-07-26 Pulse redesign) — this used to
            always read "Recruiter visibility: Active" regardless of the
            user's actual privacy setting. profiles.searchable is the real
            "Appear in Capabilio search" toggle (see nexus/search route and
            the Profile → Privacy panel that writes it) — reflect it
            honestly instead of a hardcoded claim. */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:`1px solid ${T.border}` }}>
          <span style={{ fontSize:12, color:T.ink3 }}>Search visibility</span>
          <span style={{ fontSize:12, fontWeight:600, color: userData?.searchable === false ? T.ink3 : T.green }}>
            {userData?.searchable === false ? "Private" : "Visible"}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ─── Right sidebar ────────────────────────────────────────────────────────────
// Pulse redesign (2026-07-26): every section here is now backed by a real
// API call — no static arrays, no seeded people. Each section has its own
// honest loading/empty/error state rather than falling back to placeholder
// content when live data isn't available.
const AVATAR_COLORS = ["#4285F4","#FF5701","#6D28D9","#0891B2","#059669","#D97706","#DC2626","#0369A1"]
const colorForPerson = (id) => AVATAR_COLORS[(id ? String(id).charCodeAt(0) : 0) % AVATAR_COLORS.length]

function RightSidebar({ user, domain = "Tech", role = "Professional", skills = [] }) {
  const [newsExpanded, setNewsExpanded] = useState(false)
  const [liveNews,     setLiveNews]     = useState(null)   // null = not yet loaded / unavailable
  const [newsLoading,  setNewsLoading]  = useState(true)

  const [tagsLoading, setTagsLoading] = useState(true)
  const [tags,        setTags]        = useState([])

  const [people,        setPeople]        = useState([])
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [peopleError,   setPeopleError]   = useState(false)
  const [connectState,  setConnectState]  = useState({}) // uid -> "sending"|"sent"

  // Fetch live news once per domain (server caches 2hr, personalized further by skills)
  useEffect(() => {
    setNewsLoading(true)
    pulseApi.marketInsights(domain, role, skills)
      .then(data => { setLiveNews(data?._error ? null : data); setNewsLoading(false) })
      .catch(() => { setLiveNews(null); setNewsLoading(false) })
  }, [domain, role, JSON.stringify(skills)])

  // Real trending tags — aggregated server-side from actual recent posts.
  useEffect(() => {
    setTagsLoading(true)
    pulseApi.trendingTags(6)
      .then(data => { setTags(data?.tags || []); setTagsLoading(false) })
      .catch(() => { setTags([]); setTagsLoading(false) })
  }, [])

  // Real people, ELO-ranked, domain-filtered — reuses the existing
  // /pulse/builders endpoint (already real: queries `profiles`, orders by
  // elo_rating, excludes the current user). This is the "People you may
  // know" replacement.
  useEffect(() => {
    setPeopleLoading(true); setPeopleError(false)
    pulseApi.builders(domain, 1000, 4)
      .then(data => { setPeople(Array.isArray(data) ? data : []); setPeopleLoading(false) })
      .catch(() => { setPeopleError(true); setPeopleLoading(false) })
  }, [domain])

  const connect = async (uid, name) => {
    setConnectState(s => ({ ...s, [uid]: "sending" }))
    try {
      await nexusApi.connect(uid, `Hi ${name}, let's connect on Capabilio!`)
      setConnectState(s => ({ ...s, [uid]: "sent" }))
    } catch (e) {
      // 409 = already sent — treat as success, same as elsewhere in Pulse
      setConnectState(s => ({ ...s, [uid]: (e.message||"").includes("409") ? "sent" : null }))
    }
  }

  // Highlight/re-rank real news items against the user's own skills
  // (client-side, no extra AI call — see market-insights route comment on
  // why the cache is domain-only, not per-user). This is how "why it
  // matters to you" gets satisfied without fragmenting the shared cache.
  const skillsLower = (skills || []).map(s => s.toLowerCase())
  const matchesSkills = (text) => skillsLower.some(s => s && text?.toLowerCase().includes(s))

  const newsItems = (liveNews?.news || []).map(n => ({
    title: n.headline, time: n.date || "recently", why: n.summary,
    matched: matchesSkills(n.headline) || matchesSkills(n.summary),
  }))
  const trendingTechs = (liveNews?.trending_techs || []).map(t => ({
    name: t.name, reason: t.reason, demand: t.demand,
    matched: matchesSkills(t.name),
  }))
  // Sort so skill-matching items lead — real content, just reordered.
  newsItems.sort((a,b) => (b.matched - a.matched))
  trendingTechs.sort((a,b) => (b.matched - a.matched))

  const combinedFeed = [...trendingTechs.map(t => ({ kind:"tech", ...t })), ...newsItems.map(n => ({ kind:"news", ...n }))]
  const visibleNews = newsExpanded ? combinedFeed : combinedFeed.slice(0, 4)
  const isHonestlyEmpty = !newsLoading && combinedFeed.length === 0

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Trending topics — real tech_tags counts from recent posts */}
      <Card>
        <div style={{ padding:"12px 16px 4px" }}>
          <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:800, color:T.ink, marginBottom:12 }}>Trending in tech</div>
          {tagsLoading && <div style={{ fontSize:12, color:T.ink3, paddingBottom:8 }}>Loading…</div>}
          {!tagsLoading && tags.length === 0 && (
            <div style={{ fontSize:12, color:T.ink3, paddingBottom:8 }}>No trending topics yet — tag your posts with #hashtags to help this fill in.</div>
          )}
          {!tagsLoading && tags.map((t,i) => (
            <div key={i} className="pbtn" style={{ padding:"6px 0", cursor:"pointer", borderBottom: i<tags.length-1?`1px solid ${T.border}`:"none" }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{t.tag}</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:1 }}>{t.count} post{t.count===1?"":"s"}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tech & AI News — live via Gemini Search (or an honestly-labeled AI
          estimate when Gemini is unavailable), re-ranked against the user's
          own skills. No static fallback content. */}
      <Card>
        <div style={{ padding:"12px 16px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:800, color:T.ink, marginBottom:2 }}>Tech & AI News · {domain}</div>
            <div style={{ fontSize:11, color:T.ink3, marginBottom:12 }}>
              {newsLoading ? "Loading live news…" : liveNews?.source === "live_search" ? "Live · Updated every 2h" : liveNews?.source === "ai_estimate" ? "AI-estimated (live search unavailable)" : "Not available right now"}
            </div>
          </div>
          {liveNews?.source === "live_search" && <span style={{ fontSize:9, fontWeight:800, color:T.green, letterSpacing:"0.06em", background:T.green+"18", padding:"2px 7px", borderRadius:99 }}>LIVE</span>}
        </div>
        {newsLoading
          ? [0,1,2,3].map(i => (
              <div key={i} style={{ padding:"10px 16px", borderTop: i>0?`1px solid ${T.border}`:"none" }}>
                <div style={{ height:10, background:"#E8E3DA", borderRadius:4, marginBottom:5, width:"85%" }}/>
                <div style={{ height:9, background:"#F3F4F6", borderRadius:4, width:"50%" }}/>
              </div>
            ))
          : isHonestlyEmpty
            ? <div style={{ padding:"16px", fontSize:12, color:T.ink3 }}>No live technical news available for {domain} right now — check back shortly.</div>
            : visibleNews.map((n,i) => (
              <div key={i} className="pbtn" style={{ padding:"8px 16px", cursor:"default", borderTop: i>0?`1px solid ${T.border}`:"none", display:"flex", gap:10 }}>
                <span style={{ display:"inline-block", padding:"2px 6px", background:(n.matched?T.green:T.indigo)+"15", color:n.matched?T.green:T.indigo, borderRadius:99, fontSize:9, fontWeight:800, fontFamily:T.mono, letterSpacing:"0.06em", flexShrink:0, height:"fit-content", marginTop:2 }}>
                  {n.kind==="tech" ? "TREND" : "NEWS"}
                </span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.ink, lineHeight:1.4, marginBottom:2 }}>{n.name || n.title}</div>
                  <div style={{ fontSize:11, color:T.ink3 }}>{n.reason || n.why}</div>
                  {n.matched && <div style={{ fontSize:10, color:T.green, fontWeight:700, marginTop:2 }}>Matches your skills</div>}
                </div>
              </div>
            ))
        }
        {!newsLoading && combinedFeed.length > 4 && (
          <button onClick={() => setNewsExpanded(e=>!e)} style={{ width:"100%", padding:"10px 16px", background:"transparent", border:"none", borderTop:`1px solid ${T.border}`, fontSize:12, color:T.indigo, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
            {newsExpanded ? "Show less ↑" : `Show ${combinedFeed.length - 4} more ↓`}
          </button>
        )}
      </Card>

      {/* People you may know — real Supabase profiles, ranked by ELO
          (pulse/builders — already domain-filtered, excludes self). */}
      <Card>
        <div style={{ padding:"12px 16px 4px" }}>
          <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:800, color:T.ink, marginBottom:12 }}>People you may know</div>
          {peopleLoading && <div style={{ fontSize:12, color:T.ink3, paddingBottom:8 }}>Loading…</div>}
          {!peopleLoading && peopleError && <div style={{ fontSize:12, color:T.ink3, paddingBottom:8 }}>Couldn&apos;t load suggestions right now.</div>}
          {!peopleLoading && !peopleError && people.length === 0 && (
            <div style={{ fontSize:12, color:T.ink3, paddingBottom:8 }}>No other professionals in {domain} yet — check back as more people join.</div>
          )}
          {!peopleLoading && !peopleError && people.map((p,i) => {
            const name = p.display_name || p.name || "Professional"
            const uid = p.id
            const state = connectState[uid]
            return (
              <div key={uid||i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderTop: i>0?`1px solid ${T.border}`:"none" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:colorForPerson(uid), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:"#fff" }}>{name[0]?.toUpperCase()||"?"}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:1 }}>{name}</div>
                  <div style={{ fontSize:11, color:T.ink2, marginBottom:4 }}>{p.keyword || p.path || "Capabilio member"}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:T.mono, fontSize:10, fontWeight:700, color:T.indigo }}>{skillTierPhrase(p.elo_rating||0)}</span>
                    <button
                      onClick={()=>state==="sent"||state==="sending"?null:connect(uid,name)}
                      style={{ padding:"4px 12px", background:state==="sent"?"#F0FDF4":"transparent", border:`1.5px solid ${state==="sent"?"#BBF7D0":T.indigo}`, borderRadius:99, fontSize:11, fontWeight:700, color:state==="sent"?"#15803D":T.indigo, cursor:state?"default":"pointer" }}>
                      {state==="sending"?"Sending…":state==="sent"?"✓ Sent":"+ Connect"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

// ─── Post Composer ────────────────────────────────────────────────────────────
function Composer({ user, userData, onPosted }) {
  const [open,      setOpen]      = useState(false)
  const [content,   setContent]   = useState("")
  const [postType,  setPostType]  = useState("text")
  const [techTags,  setTechTags]  = useState([])
  const [tagInput,  setTagInput]  = useState("")
  const [posting,   setPosting]   = useState(false)
  const [mediaFiles,setMediaFiles]= useState([])
  const [error,     setError]     = useState("")
  const fileRef = useRef()

  const name     = userData?.name || user?.user_metadata?.full_name || "You"
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()

  function handleFiles(files) {
    const accepted = Array.from(files).slice(0, 4 - mediaFiles.length).map(f => ({
      file:f, preview:URL.createObjectURL(f),
      type:f.type.startsWith("video")?"video":f.type.startsWith("image")?"image":"doc",
      name:f.name,
    }))
    setMediaFiles(prev=>[...prev,...accepted])
  }
  function removeMedia(i) {
    setMediaFiles(prev=>{ URL.revokeObjectURL(prev[i].preview); return prev.filter((_,j)=>j!==i) })
  }

  async function submit() {
    if (!content.trim()) return
    setPosting(true); setError("")
    try {
      const { post } = await pulseApi.createPost({ content, post_type:postType, tech_tags:techTags })
      onPosted(post)
      setContent(""); setTechTags([]); setTagInput(""); setMediaFiles([]); setOpen(false)
    } catch(e) {
      setError(e.message?.includes("fetch") ? "Backend offline — start the server to post." : e.message)
    } finally { setPosting(false) }
  }

  return (
    <Card style={{ marginBottom:8 }}>
      {/* Collapsed row */}
      <div style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:"#fff" }}>{initials}</span>
        </div>
        <button onClick={()=>setOpen(true)} style={{ flex:1, padding:"10px 16px", background:"transparent", border:`1.5px solid ${T.border}`, borderRadius:24, fontSize:14, color:T.ink3, textAlign:"left", cursor:"pointer", fontFamily:T.sans }}>
          Share an insight, update, or achievement…
        </button>
      </div>

      {/* Quick action buttons */}
      <div style={{ padding:"0 16px 10px", display:"flex", gap:4, borderTop:`1px solid ${T.border}` }}>
        {[
          {icon:"📷",label:"Photo",accept:"image/*"},
          {icon:"🎬",label:"Video",accept:"video/*"},
          {icon:"📄",label:"Document",accept:".pdf,.doc,.docx"},
          {icon:"🎉",label:"Celebrate",},
        ].map((b,i)=>(
          <button key={i} onClick={()=>{if(b.accept){fileRef.current.accept=b.accept;fileRef.current.click()}else{setPostType("celebration");setOpen(true)}}}
            className="pbtn" style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {b.icon} {b.label}
          </button>
        ))}
        <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
      </div>

      {/* Expanded composer */}
      {open && (
        <div style={{ borderTop:`1px solid ${T.border}`, animation:"fadeUp .15s ease" }}>
          {/* Post type pills */}
          <div style={{ padding:"12px 16px 8px", display:"flex", gap:6, flexWrap:"wrap" }}>
            {POST_TYPES.map(pt=>(
              <button key={pt.id} onClick={()=>setPostType(pt.id)}
                style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 12px", background:postType===pt.id?T.indigo2:"transparent", border:`1.5px solid ${postType===pt.id?T.indigo:T.border}`, borderRadius:99, color:postType===pt.id?T.indigo:T.ink2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {pt.icon} {pt.label}
              </button>
            ))}
          </div>

          {/* Text area */}
          <div style={{ padding:"0 16px 10px" }}>
            <textarea value={content} onChange={e=>setContent(e.target.value)}
              placeholder="What do you want to talk about?" rows={5} autoFocus
              style={{ width:"100%", padding:"10px 0", border:"none", borderBottom:`1px solid ${T.border}`, fontSize:15, fontFamily:T.sans, color:T.ink, outline:"none", resize:"none", lineHeight:1.7, boxSizing:"border-box", background:"transparent" }}/>
          </div>

          {/* Media previews */}
          {mediaFiles.length > 0 && (
            <div style={{ padding:"0 16px 10px", display:"flex", gap:8, flexWrap:"wrap" }}>
              {mediaFiles.map((m,i)=>(
                <div key={i} style={{ position:"relative", borderRadius:T.r, overflow:"hidden", border:`1px solid ${T.border}` }}>
                  {m.type==="video"
                    ?<video src={m.preview} style={{ width:90,height:70,objectFit:"cover" }}/>
                    :m.type==="image"
                      ?<img src={m.preview} alt="" style={{ width:90,height:70,objectFit:"cover" }}/>
                      :<div style={{ width:90,height:70,background:T.indigo2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>📄</div>
                  }
                  <button onClick={()=>removeMedia(i)} style={{ position:"absolute",top:3,right:3,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div style={{ padding:"0 16px 8px", display:"flex", flexWrap:"wrap", gap:5, alignItems:"center" }}>
            {techTags.map((t,i)=>(
              <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",background:T.indigo2,color:T.indigo,borderRadius:99,fontSize:11,fontWeight:600,fontFamily:T.mono }}>
                #{t}<button onClick={()=>setTechTags(ts=>ts.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",cursor:"pointer",color:T.indigo,padding:0,lineHeight:1 }}>×</button>
              </span>
            ))}
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&tagInput.trim()){setTechTags(t=>[...t,tagInput.trim()]);setTagInput("")}}}
              placeholder="#add-tag" style={{ border:"none",outline:"none",fontSize:12,color:T.ink3,background:"transparent",width:90,fontFamily:T.sans }}/>
          </div>

          {/* Error */}
          {error && <div style={{ margin:"0 16px 8px", padding:"8px 12px", background:"#FFF8E1", border:"1px solid #FFE082", borderRadius:T.r, fontSize:12, color:T.amber, fontWeight:500 }}>{error}</div>}

          {/* Footer */}
          <div style={{ padding:"10px 16px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={()=>{fileRef.current.accept="image/*";fileRef.current.click()}} className="pbtn" style={{ width:34,height:34,borderRadius:"50%",border:"none",background:"transparent",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>📷</button>
              <button onClick={()=>{fileRef.current.accept="video/*";fileRef.current.click()}} className="pbtn" style={{ width:34,height:34,borderRadius:"50%",border:"none",background:"transparent",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>🎬</button>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{setOpen(false);setMediaFiles([])}} style={{ padding:"7px 16px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:99,fontSize:13,fontWeight:600,color:T.ink2,cursor:"pointer" }}>Cancel</button>
              <button onClick={submit} disabled={posting||!content.trim()}
                style={{ padding:"7px 20px",background:posting||!content.trim()?"#ccc":T.indigo,border:"none",borderRadius:99,color:"#fff",fontSize:13,fontWeight:700,cursor:posting||!content.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6 }}>
                {posting && <Spin size={12} color="#fff"/>}
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, user, onInteract }) {
  const [showComments, setShowComments] = useState(false)
  const [comments,     setComments]     = useState([])
  const [commentText,  setCommentText]  = useState("")
  const [posting,      setPosting]      = useState(false)
  const [interactions, setInteractions] = useState(new Set(post.user_interactions||[]))
  const [showReactions,setShowReactions]= useState(false)
  const [expanded,     setExpanded]     = useState(false)
  const [commentError, setCommentError] = useState(null)

  const a     = post.author || {}
  const iLong = (post.content||"").length > 280

  async function toggleReaction(id) {
    try {
      const { active } = await pulseApi.interact(post.id, id)
      setInteractions(s => { const n=new Set(s); active?n.add(id):n.delete(id); return n })
      onInteract(post.id, id, active)
    } catch(e) { console.error(e) }
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return }
    const data = await pulseApi.comments(post.id).catch(()=>[])
    setComments(data||[])
    setShowComments(true)
  }

  async function submitComment() {
    if (!commentText.trim()) return
    setPosting(true)
    setCommentError(null)
    try {
      const { comment } = await pulseApi.addComment(post.id, commentText.trim())
      setComments(c=>[...c,comment])
      setCommentText("")
    } catch(e) {
      // BUG FIX (production audit): this previously only console.error'd,
      // so a failed comment silently did nothing from the user's
      // perspective -- the text stayed in the box with no explanation.
      console.error(e)
      setCommentError(e.message || "Couldn't post your comment — try again.")
    }
    finally { setPosting(false) }
  }

  const totalReactions = (post.acknowledge_count||0)+(post.signal_count||0)+(post.celebrate_count||0)

  return (
    <Card style={{ marginBottom:8, animation:"fadeUp .2s ease" }}>
      {/* Header */}
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
          <Avatar name={a.name||"?"} url={a.profile_photo_url} size={48} color={a.color||"#0A66C2"}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:T.ink }}>{a.name||"Professional"}</span>
              {a.verification_state==="fully_trusted"&&(
                <span style={{ fontSize:10, background:T.green2, color:T.green, padding:"1px 7px", borderRadius:99, fontWeight:700, fontFamily:T.mono }}>✓ TRUSTED</span>
              )}
            </div>
            <div style={{ fontSize:12, color:T.ink2, marginTop:1 }}>{a.headline||""}{a.current_company?` · ${a.current_company}`:""}</div>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
              <span style={{ fontSize:11, color:T.ink3 }}>{timeAgo(post.created_at)}</span>
              <span style={{ fontSize:11, color:T.ink3 }}>·</span>
              <span style={{ fontSize:11 }}>🌐</span>
            </div>
          </div>
          <button style={{ width:28, height:28, borderRadius:"50%", border:"none", background:"transparent", color:T.ink2, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>⋯</button>
        </div>

        {/* Content */}
        <div style={{ fontSize:14, color:T.ink, lineHeight:1.75, marginBottom:10, whiteSpace:"pre-wrap" }}>
          {iLong&&!expanded ? (post.content||"").slice(0,280)+"…" : post.content}
          {iLong&&(
            <button onClick={()=>setExpanded(e=>!e)} style={{ border:"none", background:"none", color:T.ink2, fontSize:14, fontWeight:600, cursor:"pointer", padding:"0 4px" }}>
              {expanded?" …less":" …more"}
            </button>
          )}
        </div>

        {/* Tags */}
        {(post.tech_tags||[]).length>0&&(
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
            {post.tech_tags.map((t,i)=>(
              <span key={i} className="plink" style={{ fontSize:13, fontWeight:600, color:T.indigo }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Media */}
        {(post.media_urls||[]).length>0&&(
          <div style={{ display:"grid", gridTemplateColumns:post.media_urls.length===1?"1fr":"1fr 1fr", gap:3, marginBottom:10, borderRadius:T.r, overflow:"hidden" }}>
            {post.media_urls.map((url,i)=>(
              url.match(/\.(mp4|webm|mov)$/i)
                ?<video key={i} src={url} controls style={{ width:"100%", maxHeight:300, objectFit:"cover" }}/>
                :<img key={i} src={url} alt="" style={{ width:"100%", objectFit:"cover", maxHeight:300 }}/>
            ))}
          </div>
        )}
      </div>

      {/* Reaction summary */}
      {totalReactions>0&&(
        <div style={{ padding:"4px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", gap:3, alignItems:"center" }}>
            <span style={{ fontSize:13 }}>👏⚡🎉</span>
            <span style={{ fontSize:12, color:T.ink3 }}>{totalReactions.toLocaleString()}</span>
          </div>
          <span style={{ fontSize:12, color:T.ink3 }}>{post.comment_count||0} comments · {post.repost_count||0} reposts</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ padding:"4px 8px", borderTop:`1px solid ${T.border}`, display:"flex" }}>
        {/* Reaction button with hover popup */}
        <div style={{ position:"relative", flex:1 }}
          onMouseEnter={()=>setShowReactions(true)}
          onMouseLeave={()=>setShowReactions(false)}>
          {showReactions&&(
            <div style={{ position:"absolute", bottom:"100%", left:0, background:T.surface, border:`1px solid ${T.border}`, borderRadius:24, padding:"4px 8px", display:"flex", gap:4, zIndex:100, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", marginBottom:4 }}>
              {REACTIONS.map(r=>(
                <button key={r.id} onClick={()=>toggleReaction(r.id)}
                  style={{ padding:"5px 10px", border:`1.5px solid ${interactions.has(r.id)?r.color:T.border}`, borderRadius:99, background:interactions.has(r.id)?r.color+"18":"transparent", fontSize:12, fontWeight:600, color:interactions.has(r.id)?r.color:T.ink2, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <button className="pbtn" onClick={()=>toggleReaction("acknowledge")}
            style={{ width:"100%", padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color: interactions.size>0?T.indigo:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            {/* BUG FIX (production audit): this button previously had no
                onClick at all -- the only way to react was to hover the
                wrapping div to reveal the popup above and click one of ITS
                buttons, which doesn't work on touch devices and isn't what
                a single click on "React" itself should do. Clicking React
                directly now toggles the default "acknowledge" (👏) reaction;
                hovering still reveals the popup for picking a specific one. */}
            👏 React
          </button>
        </div>

        <button className="pbtn" onClick={loadComments}
          style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          💬 Comment
        </button>
        <button className="pbtn"
          style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          🔄 Repost
        </button>
        <button className="pbtn"
          style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          📤 Send
        </button>
      </div>

      {/* Comments */}
      {showComments&&(
        <div style={{ padding:"12px 16px 16px", borderTop:`1px solid ${T.border}`, background:"#FAFAFA" }}>
          {comments.map((c,i)=>(
            <div key={i} style={{ display:"flex", gap:10, marginBottom:12 }}>
              <Avatar name={c.author?.name||"?"} url={c.author?.profile_photo_url} size={32}/>
              <div style={{ flex:1, background:T.surface, borderRadius:T.r, padding:"8px 12px", border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:2 }}>{c.author?.name||"Anonymous"}</div>
                <div style={{ fontSize:13, color:T.ink2, lineHeight:1.5 }}>{c.content}</div>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <Avatar name={user?.user_metadata?.full_name||"?"} size={32}/>
            <div style={{ flex:1 }}>
              <div style={{ background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:24, display:"flex", alignItems:"center", gap:8, padding:"6px 12px" }}>
                <input value={commentText} onChange={e=>{setCommentText(e.target.value); if(commentError)setCommentError(null)}}
                  onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&submitComment()}
                  placeholder="Add a comment…"
                  style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:T.sans, background:"transparent", color:T.ink }}/>
                <button onClick={submitComment} disabled={posting||!commentText.trim()}
                  style={{ padding:"4px 12px", background:T.indigo, border:"none", borderRadius:99, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity:posting||!commentText.trim()?0.5:1 }}>
                  {posting ? <Spin size={12} color="#fff"/> : "Post"}
                </button>
              </div>
              {commentError&&<div style={{ fontSize:11.5, color:"#DC2626", marginTop:4, paddingLeft:12 }}>{commentError}</div>}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Feed skeleton ────────────────────────────────────────────────────────────
function SkeletonPost() {
  const shimmer = { background:"linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize:"400px 100%", animation:"shimmer 1.2s infinite" }
  return (
    <Card style={{ padding:"16px", marginBottom:8 }}>
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <div style={{ width:48,height:48,borderRadius:"50%",...shimmer }}/>
        <div style={{ flex:1 }}>
          <div style={{ height:14,borderRadius:4,marginBottom:8,width:"40%",...shimmer }}/>
          <div style={{ height:11,borderRadius:4,width:"60%",...shimmer }}/>
        </div>
      </div>
      <div style={{ height:13,borderRadius:4,marginBottom:7,...shimmer }}/>
      <div style={{ height:13,borderRadius:4,marginBottom:7,width:"88%",...shimmer }}/>
      <div style={{ height:13,borderRadius:4,width:"72%",...shimmer }}/>
    </Card>
  )
}

// ─── Empty feed ───────────────────────────────────────────────────────────────
function EmptyFeed({ offline }) {
  return (
    <Card style={{ padding:"48px 24px", textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{offline?"🔌":"📡"}</div>
      <div style={{ fontFamily:T.serif, fontSize:18, fontWeight:700, color:T.ink, marginBottom:8 }}>
        {offline ? "Backend server offline" : "No posts yet"}
      </div>
      <div style={{ fontSize:13, color:T.ink2, lineHeight:1.7, maxWidth:340, margin:"0 auto" }}>
        {offline
          ? <>Run <code style={{ fontFamily:T.mono, background:"#f4f4f0", padding:"1px 6px", borderRadius:4 }}>npm run dev:server</code> from the project root to load live posts.</>
          : "Be the first to share an insight, achievement, or career update with the community."
        }
      </div>
    </Card>
  )
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, pointerEvents:"none" }}>🔍</span>
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder="Search posts by topic, skill, or keyword…"
        style={{ width:"100%", padding:"10px 14px 10px 38px", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:24, fontSize:13, fontFamily:T.sans, color:T.ink, outline:"none", boxSizing:"border-box", transition:"border-color .15s" }}
        onFocus={e=>e.target.style.borderColor=T.indigo}
        onBlur={e=>e.target.style.borderColor=T.border}
      />
      {value && (
        <button onClick={()=>onChange("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.ink3, fontSize:16, lineHeight:1 }}>×</button>
      )}
    </div>
  )
}

// ─── Main Pulse page ──────────────────────────────────────────────────────────
// ─── Student Pulse — tech-first, role-aware community feed ──────────────────

// Pulse redesign (2026-07-26): the old ROLE_NEWS / GITHUB_REPOS /
// COMMUNITIES / TRENDING_TOPICS hardcoded blocks that used to live here were
// dead code — grepping this file confirmed none of them were ever rendered
// anywhere in StudentPulse's JSX. Removed rather than wired up, since the
// live equivalents (market insights, trending tags, ELO-matched builders)
// already exist below and are real.

function StudentPulse({ user, userData }) {
  // This component now serves both student and professional paths (see the
  // routing comment in the default export below) — isProfessional gates the
  // handful of spots where the copy/defaults/ELO-display rules genuinely
  // need to differ, everything else (tabs, feed, composer, network) is
  // already path-neutral and shared as-is.
  const isProfessional = userData?.path === "professional"
  const roleConf    = getRoleConfig(userData)
  const domain      = roleConf.label || userData?.keyword || "Tech"
  const elo         = userData?.eloRating || userData?.elo_rating || (isProfessional ? 800 : 400)
  const displayName = userData?.displayName || userData?.display_name || userData?.name || (isProfessional ? "Professional" : "Student")
  const initials    = displayName[0]?.toUpperCase() || "S"

  // ── Feed state ──────────────────────────────────────────────────────────────
  const [posts,       setPosts]       = useState([])
  const [builders,    setBuilders]    = useState([])
  // 2026-07-29: separate from builders.length===0, which conflated "still
  // fetching" with "fetched, but genuinely nobody matches" — the sidebar
  // showed "Loading builders..." forever for the (very plausible, this
  // early) second case. Defaults true, flips false once the fetch settles
  // either way.
  const [buildersLoading, setBuildersLoading] = useState(true)
  const [mentors,     setMentors]     = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedTab,     setFeedTab]     = useState("community")
  const [sortTab,     setSortTab]     = useState("foryou")
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)
  const [error,       setError]       = useState("")

  // ── Composer state ──────────────────────────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false)
  const [postText,     setPostText]     = useState("")
  const [postType,     setPostType]     = useState("insight")
  const [postTags,     setPostTags]     = useState("")
  const [posting,      setPosting]      = useState(false)
  // Structured fields — only used by their matching postType, distinct from
  // the shared postText/postTags above (see composer render for why: Win/
  // Ask/Code each need their own real inputs, not one reused textarea).
  const [winMetric,     setWinMetric]     = useState("")
  const [winResult,     setWinResult]     = useState("")
  const [askLookingFor, setAskLookingFor] = useState("advice")
  const [codeLanguage,  setCodeLanguage]  = useState("javascript")
  const [codeSnippet,   setCodeSnippet]   = useState("")

  const resetComposer = () => {
    setPostText(""); setPostTags(""); setComposerOpen(false)
    setWinMetric(""); setWinResult(""); setAskLookingFor("advice")
    setCodeLanguage("javascript"); setCodeSnippet("")
  }

  // ── Who-liked-this modal (tap a reaction count to see the list, same as
  //     Instagram/Facebook/LinkedIn) ──────────────────────────────────────
  // `type` distinguishes a post-level likers list (pulseApi.likers, keyed by
  // reaction action) from a comment-level one (pulseApi.commentLikers) —
  // same modal UI, two different sources of "who liked this."
  const [likersModal, setLikersModal] = useState({ open: false, id: null, type: "post", users: [], loading: false })
  const openLikers = async (id, type = "post") => {
    setLikersModal({ open: true, id, type, users: [], loading: true })
    try {
      const { users } = type === "comment" ? await pulseApi.commentLikers(id) : await pulseApi.likers(id, "acknowledge")
      setLikersModal({ open: true, id, type, users: users || [], loading: false })
    } catch {
      setLikersModal({ open: true, id, type, users: [], loading: false })
    }
  }

  // ── Stories (real 24h feature) ──────────────────────────────────────────────
  const [storyGroups,    setStoryGroups]    = useState([])   // [{author, stories, allSeen}]
  const [storiesLoading, setStoriesLoading] = useState(true)
  const loadStories = useCallback(() => {
    setStoriesLoading(true)
    pulseApi.storiesFeed()
      .then(d => setStoryGroups(d?.groups || []))
      .catch(() => setStoryGroups([]))
      .finally(() => setStoriesLoading(false))
  }, [])
  useEffect(() => { loadStories() }, [loadStories])

  // Story composer (create) — a photo upload or a text card, not the post composer.
  const [storyComposerOpen, setStoryComposerOpen] = useState(false)
  const [storyFile,     setStoryFile]     = useState(null)
  const [storyPreview,  setStoryPreview]  = useState(null)
  const [storyText,     setStoryText]     = useState("")
  const [storyBg,       setStoryBg]       = useState("#FF5701")
  const [storyPosting,  setStoryPosting]  = useState(false)
  const [storyError,    setStoryError]    = useState("")
  const STORY_COLORS = ["#FF5701", "#7C3AED", "#059669", "#0891B2", "#D97706", "#DB2777"]

  const pickStoryFile = (file) => {
    setStoryFile(file)
    setStoryPreview(file ? URL.createObjectURL(file) : null)
  }

  const submitStory = async () => {
    if ((!storyFile && !storyText.trim()) || storyPosting) return
    setStoryPosting(true); setStoryError("")
    try {
      await pulseApi.createStory({ file: storyFile, textContent: storyText.trim(), backgroundColor: storyBg })
      setStoryComposerOpen(false)
      setStoryFile(null); setStoryPreview(null); setStoryText(""); setStoryBg("#FF5701")
      loadStories()
    } catch (e) {
      setStoryError("Could not post story: " + e.message)
    } finally {
      setStoryPosting(false)
    }
  }

  // Story viewer (tap-to-advance, like IG/WhatsApp status)
  const [storyViewer, setStoryViewer] = useState({ open: false, groupIdx: 0, storyIdx: 0 })
  const openStoryViewer = (groupIdx) => {
    setStoryViewer({ open: true, groupIdx, storyIdx: 0 })
    const story = storyGroups[groupIdx]?.stories?.[0]
    if (story) pulseApi.viewStory(story.id).catch(() => {})
  }
  const advanceStory = (dir) => {
    setStoryViewer(v => {
      const group = storyGroups[v.groupIdx]
      if (!group) return { ...v, open: false }
      let { groupIdx, storyIdx } = v
      storyIdx += dir
      if (storyIdx < 0) {
        groupIdx -= 1
        if (groupIdx < 0) return { open: false, groupIdx: 0, storyIdx: 0 }
        storyIdx = (storyGroups[groupIdx]?.stories?.length || 1) - 1
      } else if (storyIdx >= group.stories.length) {
        groupIdx += 1
        if (groupIdx >= storyGroups.length) return { open: false, groupIdx: 0, storyIdx: 0 }
        storyIdx = 0
      }
      const nextStory = storyGroups[groupIdx]?.stories?.[storyIdx]
      if (nextStory) pulseApi.viewStory(nextStory.id).catch(() => {})
      return { open: true, groupIdx, storyIdx }
    })
  }

  // ── Proof Posts — "Share Proof" picker state ──────────────────────────────
  // Unlike the free-text composer, this never lets the user type the facts —
  // they pick from a server-fetched list of their own real achievements, and
  // the caption below is the only free-text field.
  const [proofPickerOpen,  setProofPickerOpen]  = useState(false)
  const [proofCandidates,  setProofCandidates]  = useState([])
  const [proofLoading,     setProofLoading]     = useState(false)
  const [proofSelected,    setProofSelected]    = useState(null)
  const [proofCaption,     setProofCaption]     = useState("")
  const [proofPosting,     setProofPosting]     = useState(false)

  const openProofPicker = async () => {
    setProofPickerOpen(true)
    setProofSelected(null)
    setProofCaption("")
    setProofLoading(true)
    try {
      const { candidates } = await pulseApi.proofCandidates()
      setProofCandidates(candidates || [])
    } catch {
      setProofCandidates([])
    } finally {
      setProofLoading(false)
    }
  }

  const submitProofPost = async () => {
    if (!proofSelected || proofPosting) return
    setProofPosting(true)
    setError("")
    try {
      const result = await pulseApi.createPost({
        post_type:  "proof",
        content:    proofCaption.trim(),
        proof_ref:  { sourceType: proofSelected.sourceType, sourceId: proofSelected.sourceId },
        role_tags:  [domain.toLowerCase()],
        visibility: "public",
      })
      if (result.post) {
        setPosts(p => [result.post, ...p])
        setReactions(r => ({ ...r, [result.post.id]: { acknowledge: false, save: false } }))
        setProofPickerOpen(false)
        setProofSelected(null)
        setProofCaption("")
      }
    } catch (e) {
      setError("Could not share proof: " + e.message)
    } finally {
      setProofPosting(false)
    }
  }

  // ── Per-post interaction state ──────────────────────────────────────────────
  // reactions[postId] = { acknowledge: bool, signal: bool, save: bool }
  const [reactions, setReactions] = useState({})
  // commentPanels[postId] = { open, comments, text, loading, submitting,
  //   replyingTo: commentId|null, replyText }
  const [commentPanels, setCommentPanels] = useState({})
  // commentReplies[commentId] = { open, loading, items } — replies are
  // lazy-loaded per thread, same "load on demand" idea as the likers list,
  // so opening a post with many comments doesn't pull every reply upfront.
  const [commentReplies, setCommentReplies] = useState({})
  // commentLikes[commentId] = { liked, count } — local like state for
  // comments. Count seeds from the server's like_count; "liked" is unknown
  // until the user actually taps (no bulk "did I like these" endpoint yet,
  // same tradeoff the post-level reaction state doesn't have to make since
  // that comes back on the feed payload) — a known limitation, not a bug.
  const [commentLikes, setCommentLikes] = useState({})

  // ── Domain selector ─────────────────────────────────────────────────────────
  const [showDomainPicker, setShowDomainPicker] = useState(false)

  // ── My Network state (followers / following) ───────────────────────────────
  const [myFollowing,      setMyFollowing]      = useState([])
  const [myFollowers,      setMyFollowers]      = useState([])
  const [networkLoading,   setNetworkLoading]   = useState(false)
  const [networkSubTab,    setNetworkSubTab]    = useState("following")  // following | followers
  const [suggestedUsers,   setSuggestedUsers]   = useState([])

  // ── Sparks (connections) state ────────────────────────────────────────────
  const [sparksTab,        setSparksTab]        = useState("discover")  // discover | inbox | sent
  const [userSearch,       setUserSearch]       = useState("")
  const [searchResults,    setSearchResults]    = useState([])
  const [searchLoading,    setSearchLoading]    = useState(false)
  const [pendingSparks,    setPendingSparks]    = useState([])
  const [sentSparks,       setSentSparks]       = useState([])
  const [sparksLoading,    setSparksLoading]    = useState(false)
  const [sparkActions,     setSparkActions]     = useState({})  // uid → "sending"|"sent"|"following"|"followed"
  const [sparkMsg,         setSparkMsg]         = useState("")

  // ── Load feed ────────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (pg = 1, append = false) => {
    setFeedLoading(true)
    setError("")
    try {
      let result = { posts: [], total: 0 }

      if (feedTab === "community") {
        const sortParam = sortTab === "discussed" ? "discussed"
                        : sortTab === "liked"     ? "liked"
                        : "created_at"
        result = await pulseApi.feed({ page: pg, limit: 15, sort: sortParam })
      } else if (feedTab === "capsules") {
        result = await pulseApi.saved(pg)
      }

      const newPosts = result.posts || []
      setPosts(p => append ? [...p, ...newPosts] : newPosts)
      setHasMore((pg * 15) < (result.total || 0))

      // Seed reaction state from server-returned user_interactions
      const rState = {}
      newPosts.forEach(post => {
        rState[post.id] = {
          acknowledge: (post.user_interactions || []).includes("acknowledge"),
          save:        (post.user_interactions || []).includes("save"),
        }
      })
      setReactions(r => append ? { ...r, ...rState } : rState)
    } catch (e) {
      setError(e.message || "Failed to load feed")
    } finally {
      setFeedLoading(false)
    }
  }, [feedTab, sortTab])

  // Reload when tab or sort changes
  useEffect(() => {
    setPage(1)
    loadFeed(1, false)
  }, [feedTab, sortTab, loadFeed])

  // ── Market insights state (replaces static DOMAIN_STATS) ────────────────────
  const [marketInsights, setMarketInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(true)
  // Distinguishes "genuinely no data yet" (e.g. a brand-new domain with no
  // Gemini/Groq output) from "the backend call actually failed" — the two
  // read identically as marketInsights===null otherwise, but only the
  // second one should show a Retry affordance (2026-07-28).
  const [insightsErrored, setInsightsErrored] = useState(false)

  // Real skills (2026-07-26 redesign) — same source as the professional
  // Pulse and Skills.jsx: user_skills, not a userData shortcut. Used to
  // personalize the market-insights prompt beyond just domain/role.
  const [mySkills, setMySkills] = useState([])
  useEffect(() => {
    skillsApi.list()
      .then(list => setMySkills((list || []).map(s => s.name || s.skill_name).filter(Boolean).slice(0, 8)))
      .catch(() => setMySkills([]))
  }, [])

  // Load sidebar data + market insights when domain changes.
  // 2026-07-29: these used to all fire in the same tick (6+ simultaneous
  // requests counting loadFeed's own effect below) — on the free-tier Render
  // backend this burst was consistently coming back 403 for every pulse/nexus
  // call while isolated single requests (e.g. arena/skill-graph from a
  // different page) succeeded. Staggering them with small delays spreads the
  // burst out and costs nothing (these are all background sidebar reads, not
  // anything the user is blocked on). Sequenced + delayed rather than
  // Promise.all'd on purpose.
  useEffect(() => {
    let cancelled = false
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    ;(async () => {
      setBuildersLoading(true)
      pulseApi.builders(domain, elo, 6)
        .then(d => { if (!cancelled) { setBuilders(d); setBuildersLoading(false) } })
        .catch(() => { if (!cancelled) { setBuilders([]); setBuildersLoading(false) } })
      await wait(200)
      pulseApi.mentors(domain, 4).then(d => !cancelled && setMentors(d)).catch(() => !cancelled && setMentors([]))
      await wait(200)
      // Load real Following/Followers (the `follows` table) for sidebar
      // stats. Previously this read from `connections` (Sparks) instead,
      // which is a different relationship entirely — that's why the Follow
      // button's state used to reset on every refresh and followed users
      // never showed up in Following/Followers anywhere in the UI.
      nexusApi.follows().then(data => {
        if (cancelled) return
        setMyFollowing(data?.following || [])
        setMyFollowers(data?.followers || [])
        // Pre-seed sparkActions so any already-followed user renders as
        // "✓ Following" immediately (Discover results, suggested users,
        // etc.) instead of only updating state after a button click.
        setSparkActions(a => {
          const next = { ...a }
          for (const u of (data?.following || [])) next[u.id] = "followed"
          return next
        })
      }).catch(() => {})
      await wait(200)
      // Market insights — server-cached 2hr, personalized by domain/role/skills.
      // No static fallback (2026-07-26): if the route reports `_error`, treat
      // it as unavailable rather than showing anything.
      if (!cancelled) loadMarketInsights()
    })()
    return () => { cancelled = true }
  }, [domain, elo, JSON.stringify(mySkills)]) // eslint-disable-line

  // Pulled out of the effect above so the "Retry" affordance on the failure
  // state (2026-07-28) can re-run the exact same fetch on demand, instead of
  // only ever getting one shot at load time.
  const loadMarketInsights = () => {
    setInsightsLoading(true); setInsightsErrored(false)
    pulseApi.marketInsights(domain.toLowerCase(), userData?.job_role || userData?.target_role || domain, mySkills)
      .then(data => {
        const errored = !!data?._error
        setMarketInsights(errored ? null : data)
        setInsightsErrored(errored)
        setInsightsLoading(false)
      })
      .catch(() => { setMarketInsights(null); setInsightsErrored(true); setInsightsLoading(false) })
  }

  // ── Network: load followers/following & suggested users ─────────────────────
  const loadMyNetwork = async () => {
    setNetworkLoading(true)
    try {
      // Following/Followers come from the real `follows` table now (not
      // `connections`/Sparks — those are a separate request-approve system,
      // see nexusApi.follows() doc comment).
      const [followsData, connData] = await Promise.all([
        nexusApi.follows(),
        nexusApi.connections().catch(() => []),
      ])
      const following = followsData?.following || []
      const followers = followsData?.followers || []
      setMyFollowing(following)
      setMyFollowers(followers)
      setSparkActions(a => {
        const next = { ...a }
        for (const u of following) next[u.id] = "followed"
        return next
      })

      // Suggested: load top users excluding anyone already followed or
      // already connected via Sparks.
      const all = Array.isArray(connData) ? connData : (connData?.connections || [])
      const connectedIds = new Set(all.map(c =>
        c.requester_id === user?.id ? c.addressee_id : c.requester_id))
      const followingIds = new Set(following.map(u => u.id))
      const sug = await nexusApi.search({ limit: 8 }).catch(() => ({ profiles: [] }))
      const sugList = (sug?.profiles || []).filter(p =>
        p.id !== user?.id && !connectedIds.has(p.id) && !followingIds.has(p.id))
      setSuggestedUsers(sugList.slice(0, 6))
    } catch {}
    setNetworkLoading(false)
  }

  // ── Sparks: load pending/sent when tab is active ─────────────────────────────
  const loadSparks = async () => {
    setSparksLoading(true)
    try {
      const data = await nexusApi.connections()
      const all = Array.isArray(data) ? data : (data?.connections || [])
      setPendingSparks(all.filter(c => c.status === "pending" && c.addressee_id === user?.id))
      setSentSparks(all.filter(c => c.status === "pending" && c.requester_id === user?.id))
    } catch {}
    setSparksLoading(false)
  }

  useEffect(() => {
    if (feedTab === "following") { loadSparks(); loadMyNetwork() }
  }, [feedTab]) // eslint-disable-line

  // ── Load suggested users on mount ────────────────────────────────────────────
  useEffect(() => {
    nexusApi.search({ limit: 6 })
      .then(d => setSuggestedUsers((d?.profiles || []).filter(p => p.id !== user?.id).slice(0, 6)))
      .catch(() => {})
  }, []) // eslint-disable-line

  // ── User search (debounced 400ms) ────────────────────────────────────────────
  const searchDebounceRef = useRef(null)
  const searchUsers = (q) => {
    setUserSearch(q)
    if (!q.trim() || q.trim().length < 2) { setSearchResults([]); setSearchLoading(false); return }
    setSearchLoading(true)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const data = await nexusApi.search({ q: q.trim(), limit: 12 })
        // backend returns { profiles: [...], total: N }
        const users = Array.isArray(data) ? data : (data?.profiles || data?.users || [])
        setSearchResults(users)
      } catch { setSearchResults([]) }
      setSearchLoading(false)
    }, 400)
  }

  const sendSpark = async (uid, name) => {
    setSparkActions(a => ({ ...a, [uid]: "sending" }))
    try {
      await nexusApi.connect(uid, sparkMsg || `Hi ${name}, let's connect on Capabilio!`)
      setSparkActions(a => ({ ...a, [uid]: "sent" }))
    } catch (err) {
      // 409 = already sent — treat as success
      if (err?.message?.includes("409") || err?.message?.toLowerCase().includes("already")) {
        setSparkActions(a => ({ ...a, [uid]: "sent" }))
      } else {
        setSparkActions(a => ({ ...a, [uid]: null }))
      }
    }
  }

  const handleSpark = async (spark, accept) => {
    try {
      await nexusApi.respond(spark.id, accept ? "accepted" : "rejected")
      setPendingSparks(ps => ps.filter(s => s.id !== spark.id))
    } catch {}
  }

  const handleFollow = async (uid) => {
    setSparkActions(a => ({ ...a, [uid]: "following" }))
    try {
      await nexusApi.follow(uid)
      setSparkActions(a => ({ ...a, [uid]: "followed" }))
    } catch (err) {
      // 409/duplicate = already following — treat as success
      if (err?.message?.includes("409") || err?.message?.toLowerCase().includes("already") || err?.message?.toLowerCase().includes("duplicate")) {
        setSparkActions(a => ({ ...a, [uid]: "followed" }))
      } else {
        setSparkActions(a => ({ ...a, [uid]: null }))
      }
    }
  }

  // ── Post creation ────────────────────────────────────────────────────────────
  // Each type has its own required field(s) now instead of one shared
  // textarea being valid for everything — see the composer render for the
  // matching per-type inputs (winMetric/winResult, askLookingFor,
  // codeLanguage/codeSnippet). postText is still the caption/body for every
  // type (Insight uses it as the whole post; Win/Ask/Code use it as
  // context/explanation alongside their structured field).
  const postValid = () => {
    if (postType === "win")      return !!(winMetric.trim() || winResult.trim())
    if (postType === "code")     return !!codeSnippet.trim()
    if (postType === "question") return !!postText.trim()
    return !!postText.trim()
  }

  const submitPost = async () => {
    if (!postValid() || posting) return
    setPosting(true)
    setError("")
    try {
      const tags = postTags.split(/[\s,]+/).filter(t => t.trim()).map(t =>
        t.startsWith("#") ? t.toLowerCase() : "#" + t.toLowerCase()
      ).filter(Boolean)

      const type_data =
        postType === "win"      ? { metric: winMetric.trim(), result: winResult.trim() } :
        postType === "question" ? { lookingFor: askLookingFor } :
        postType === "code"     ? { language: codeLanguage, code: codeSnippet } :
        undefined

      const result = await pulseApi.createPost({
        post_type:  postType,
        content:    postText.trim(),
        type_data,
        tech_tags:  tags,
        role_tags:  [domain.toLowerCase()],
        visibility: "public",
      })
      if (result.post) {
        setPosts(p => [result.post, ...p])
        setReactions(r => ({ ...r, [result.post.id]: { acknowledge: false, save: false } }))
        resetComposer()
      }
    } catch (e) {
      setError("Could not post: " + e.message)
    } finally {
      setPosting(false)
    }
  }

  // ── Reactions (optimistic) ───────────────────────────────────────────────────
  const handleReact = async (postId, action) => {
    const was = reactions[postId]?.[action] || false
    const countKey = { acknowledge: "acknowledge_count", signal: "signal_count", save: "save_count" }[action]

    // Optimistic update
    setReactions(r => ({ ...r, [postId]: { ...(r[postId] || {}), [action]: !was } }))
    if (countKey) {
      setPosts(ps => ps.map(p => p.id !== postId ? p
        : { ...p, [countKey]: Math.max(0, (p[countKey] || 0) + (!was ? 1 : -1)) }
      ))
    }
    try {
      await pulseApi.interact(postId, action)
    } catch {
      // Revert
      setReactions(r => ({ ...r, [postId]: { ...(r[postId] || {}), [action]: was } }))
      if (countKey) {
        setPosts(ps => ps.map(p => p.id !== postId ? p
          : { ...p, [countKey]: Math.max(0, (p[countKey] || 0) + (was ? 1 : -1)) }
        ))
      }
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────────
  const toggleComments = async (postId) => {
    const panel = commentPanels[postId]
    if (panel?.open) {
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], open: false } }))
      return
    }
    setCommentPanels(cp => ({ ...cp, [postId]: { open: true, comments: [], text: "", loading: true, submitting: false } }))
    try {
      const data = await pulseApi.comments(postId)
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], comments: data || [], loading: false } }))
    } catch {
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], loading: false } }))
    }
  }

  const updateCommentText = (postId, text) =>
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], text } }))

  // Start/cancel replying to a specific comment — Instagram/LinkedIn-style
  // "Reply" link under a comment that opens a scoped input, rather than one
  // shared box for both top-level comments and replies.
  const startReply = (postId, commentId) =>
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], replyingTo: commentId, replyText: "" } }))
  const cancelReply = (postId) =>
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], replyingTo: null, replyText: "" } }))
  const updateReplyText = (postId, text) =>
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], replyText: text } }))

  const submitComment = async (postId, parentId = null) => {
    const panel = commentPanels[postId]
    const text = parentId ? panel?.replyText : panel?.text
    if (!text?.trim() || panel?.submitting) return
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], submitting: true } }))
    try {
      const result = await pulseApi.addComment(postId, text.trim(), parentId || undefined)
      if (result.comment) {
        if (parentId) {
          // Append to the open replies thread (if the thread is currently
          // expanded) and bump the parent's visible reply_count, without a
          // full refetch.
          setCommentReplies(cr => ({
            ...cr,
            [parentId]: { open: true, loading: false, items: [...(cr[parentId]?.items || []), result.comment] }
          }))
          setCommentPanels(cp => ({
            ...cp,
            [postId]: {
              ...cp[postId],
              comments: (cp[postId]?.comments || []).map(c =>
                c.id === parentId ? { ...c, reply_count: (c.reply_count || 0) + 1 } : c),
              replyingTo: null, replyText: "", submitting: false
            }
          }))
        } else {
          setCommentPanels(cp => ({
            ...cp,
            [postId]: { ...cp[postId], comments: [...(cp[postId]?.comments || []), result.comment], text: "", submitting: false }
          }))
        }
        setPosts(ps => ps.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
      }
    } catch {
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], submitting: false } }))
    }
  }

  // Toggle a comment's replies thread open/closed, lazy-loading on first open.
  const toggleReplies = async (commentId) => {
    const existing = commentReplies[commentId]
    if (existing?.open) { setCommentReplies(cr => ({ ...cr, [commentId]: { ...existing, open: false } })); return }
    if (existing?.items?.length) { setCommentReplies(cr => ({ ...cr, [commentId]: { ...existing, open: true } })); return }
    setCommentReplies(cr => ({ ...cr, [commentId]: { open: true, loading: true, items: [] } }))
    try {
      const items = await pulseApi.commentReplies(commentId)
      setCommentReplies(cr => ({ ...cr, [commentId]: { open: true, loading: false, items: items || [] } }))
    } catch {
      setCommentReplies(cr => ({ ...cr, [commentId]: { open: true, loading: false, items: [] } }))
    }
  }

  // Toggle like on a comment — optimistic local update, same pattern as
  // handleReact for posts (see below), scoped to commentLikes since
  // comments aren't in the `reactions` map.
  const toggleCommentLike = async (commentId, baseCount) => {
    const cur = commentLikes[commentId] || { liked: false, count: baseCount || 0 }
    const next = { liked: !cur.liked, count: cur.liked ? Math.max(0, cur.count - 1) : cur.count + 1 }
    setCommentLikes(cl => ({ ...cl, [commentId]: next }))
    try {
      await pulseApi.likeComment(commentId)
    } catch {
      setCommentLikes(cl => ({ ...cl, [commentId]: cur }))
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const authorName = (post) => post.author?.display_name || post.author?.name || post.author?.username || userData?.displayName || "Member"
  const authorInitials = (post) => (authorName(post)[0] || "M").toUpperCase()
  const authorElo = (post) => post.author?.elo_rating || 400

  // ── Delete post ──────────────────────────────────────────────────────────────
  const [deletingPost, setDeletingPost] = useState(null)
  const deletePost = async (postId) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return
    setDeletingPost(postId)
    try {
      await pulseApi.deletePost(postId)
      setPosts(ps => ps.filter(p => p.id !== postId))
    } catch {}
    setDeletingPost(null)
  }
  const timeAgo = (iso) => {
    if (!iso) return ""
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const POST_TYPE_CFG = {
    insight:  { label: "INSIGHT",  color: "#7C3AED", bg: "#F4F0FF" },
    win:      { label: "WIN",      color: "#059669", bg: "#ECFDF5" },
    question: { label: "QUESTION", color: "#0891B2", bg: "#EFF6FF" },
    code:     { label: "CODE",     color: "#D97706", bg: "#FFF7ED" },
    // Not a composer-selectable type (proof posts skip the free-text
    // composer entirely — see openProofPicker/submitProofPost) but this
    // entry still drives the feed-card type badge for post_type="proof".
    proof:    { label: "✅ PROOF", color: "#059669", bg: "#ECFDF5" },
    text:     { label: "POST",     color: "#6B6560", bg: "#F3F4F6" },
  }

  // Domain picker choices — just labels for the switcher, not fake stats.
  const DOMAIN_CHOICES = ["Data Analyst", "Full-Stack", "Frontend", "Backend", "DevOps", "Machine Learning"]

  // Honest stats (2026-07-26 redesign) — every value here is either real
  // (computed from the live market-insights response) or an explicit "—"/
  // "Not available yet" placeholder. The old version always showed a
  // hardcoded per-domain percentage/salary/role-count under a "LIVE" badge
  // regardless of whether any of it was real; that's exactly the dummy-data
  // pattern this redesign removes.
  const stats = {
    hiring:     marketInsights?.market_outlook || (insightsLoading ? "…" : "Not available"),
    // Real count of companies the report actually named — not a fabricated
    // "7,840 open roles" figure.
    openRoles:  marketInsights ? `${marketInsights.companies_hiring_count ?? 0} companies` : (insightsLoading ? "…" : "—"),
    salary:     marketInsights?.hiring_companies?.[0]?.salary_lpa || (insightsLoading ? "…" : "Not available yet"),
    trending:   marketInsights?.trending_techs?.slice(0,2).map(t => t.name).join(", ") || (insightsLoading ? "…" : "Not available yet"),
  }

  // Rising skills — only ever real data from the live report. If the report
  // has no rising-skills list yet, show an honest empty note instead of a
  // static per-domain hashtag list masquerading as "rising skills".
  const trendingTags = marketInsights?.skills?.rising?.length
    ? marketInsights.skills.rising.slice(0, 6).map(s => s.startsWith("#") ? s : `#${s}`)
    : []

  const AVATAR_COLORS = ["#FF5701","#6D28D9","#0891B2","#059669","#D97706","#7C3AED","#DC2626","#0369A1"]
  const colorForId = (id) => AVATAR_COLORS[(id?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

  const P = {
    bg:"#F3F4F6", surface:"#FFFFFF", ink:"#1A1714", ink2:"#3D3935", ink3:"#6B6560", ink4:"#A8A29E",
    accent:"#FF5701", accent2:"#FFF1E8", border:"rgba(0,0,0,0.08)",
    shadow:"0 1px 3px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)", r:12,
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:P.bg, flex:1, minHeight:0, overflowY:"auto", fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pc{transition:box-shadow 0.15s;} .pc:hover{box-shadow:0 4px 16px rgba(0,0,0,0.10)!important;}
        .pb{transition:background 0.12s,color 0.12s,border-color 0.12s;cursor:pointer;}
        .pb:hover{background:rgba(0,0,0,0.05)!important;}
        .pt{transition:all 0.15s;cursor:pointer;border:none;background:transparent;font-family:inherit;}
        .story:hover{transform:scale(1.06);} .story{transition:transform 0.15s;cursor:pointer;}
        .reacted{filter:brightness(0.9);}
      `}</style>

      {/* Domain picker modal */}
      {showDomainPicker && (
        <div onClick={()=>setShowDomainPicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FFFFFF",borderRadius:16,padding:24,width:340,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:14,fontWeight:700,color:P.ink,marginBottom:16}}>Switch Domain Filter</div>
            {DOMAIN_CHOICES.map(d=>(
              <button key={d} onClick={()=>setShowDomainPicker(false)}
                style={{display:"block",width:"100%",padding:"10px 14px",marginBottom:6,borderRadius:8,border:`1.5px solid ${domain===d?P.accent+"40":P.border}`,background:domain===d?P.accent2:"#fff",color:domain===d?P.accent:P.ink2,fontSize:13,fontWeight:domain===d?700:500,textAlign:"left",cursor:"pointer"}}>
                {d} {domain===d&&"✓"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 16px 60px"}}>

        {/* ── Header ── */}
        <div style={{marginBottom:16,animation:"fadeUp 0.3s ease both"}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:P.ink4,textTransform:"uppercase",marginBottom:4}}>PULSE</div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <h1 style={{fontSize:24,fontWeight:800,color:P.ink,margin:"0 0 4px",lineHeight:1.2}}>Your Intelligence Feed</h1>
              <p style={{fontSize:13,color:P.ink3,margin:0}}>Stay ahead in <span style={{color:P.accent,fontWeight:700}}>{domain}</span> — posts, mentors, and community</p>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
              <button className="pb" onClick={()=>setShowDomainPicker(true)}
                style={{padding:"6px 14px",background:P.accent2,border:`1.5px solid ${P.accent}30`,borderRadius:99,fontSize:12,fontWeight:700,color:P.accent}}>
                ⚡ {domain} domain
              </button>
              <button className="pb" onClick={()=>{ setFeedTab("community"); setComposerOpen(true) }}
                style={{padding:"6px 16px",background:P.accent,border:"none",borderRadius:99,fontSize:12,fontWeight:700,color:"#fff"}}>
                + New Post
              </button>
            </div>
          </div>
        </div>

        {/* ── Domain stats bar — real fields only (2026-07-26 redesign).
              The old "ACTIVE PROJECTS" stat referenced stats.projects, which
              was never defined anywhere in this file — it silently rendered
              blank on every load. Removed rather than backfilled with a
              fake number. */}
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:P.r,padding:"10px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:6,overflowX:"auto",animation:"fadeUp 0.35s ease both"}}>
          <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.5)",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap",marginRight:8}}>{marketInsights ? "LIVE DOMAIN PULSE" : "DOMAIN PULSE"}</span>
          <span style={{fontSize:11,color:insightsErrored?"#FCA5A5":"rgba(255,255,255,0.4)",marginRight:8,whiteSpace:"nowrap"}}>
            {marketInsights ? <>Real-time signals for <span style={{color:P.accent,fontWeight:700}}>{domain}</span></>
              : insightsLoading ? "Loading signals…"
              : insightsErrored ? "Signals temporarily unavailable"
              : `No live signals for ${domain} yet`}
          </span>
          {insightsErrored && !insightsLoading && (
            <button onClick={loadMarketInsights}
              style={{fontSize:10,fontWeight:700,color:P.accent,background:"rgba(255,255,255,0.06)",
                border:"1px solid rgba(255,255,255,0.14)",borderRadius:99,padding:"3px 10px",cursor:"pointer",
                whiteSpace:"nowrap",marginRight:8}}>
              ↻ Retry
            </button>
          )}
          <div style={{flex:1}}/>
          {[{label:"MARKET OUTLOOK",value:stats.hiring,color:"#34D399"},{label:"AVG SALARY",value:stats.salary,color:"#FBBF24"},{label:"COMPANIES HIRING",value:stats.openRoles,color:"#F472B6"}].map((s,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"2px 16px",borderLeft:"1px solid rgba(0,0,0,0.05)",flexShrink:0}}>
              <span style={{fontSize:15,fontWeight:800,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.value}</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:1}}>{s.label}</span>
            </div>
          ))}
        </div>

        {error&&<div style={{background:"#FEF2F2",border:"1px solid rgba(220,38,38,0.2)",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:13,color:"#DC2626"}}>{error}</div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:18,alignItems:"start"}}>

          {/* ── Left feed column ── */}
          <div>
            {/* Stories row — real 24h stories now (photo or text), not an
                alias for the post composer. Your own ring always opens the
                story composer; a builder's ring (real, unexpired stories
                only — decorative avatars with no stories are just not
                shown, rather than rendering a dead click) opens the viewer. */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:"14px 16px",marginBottom:14,boxShadow:P.shadow}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:P.ink4,textTransform:"uppercase",marginBottom:12}}>STORIES · 24H</div>
              <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:4}}>
                {/* Your story */}
                {(() => {
                  const myGroup = storyGroups.find(g => g.author?.id === user?.id)
                  return (
                    <div className="story" onClick={()=> myGroup ? openStoryViewer(storyGroups.indexOf(myGroup)) : setStoryComposerOpen(true)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0,position:"relative"}}>
                      <div style={{width:52,height:52,borderRadius:"50%",padding:2,background:myGroup?`linear-gradient(135deg,${P.accent},#f97316)`:"#E5E1DA"}}>
                        <div style={{width:"100%",height:"100%",borderRadius:"50%",border:"2px solid #fff",background:P.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",overflow:"hidden"}}>
                          {initials}
                        </div>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation(); setStoryComposerOpen(true)}}
                        title="Add a story"
                        style={{position:"absolute",top:32,left:32,width:20,height:20,borderRadius:"50%",background:P.accent,border:"2px solid #fff",color:"#fff",fontSize:12,fontWeight:800,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                      <span style={{fontSize:10,fontWeight:500,color:P.ink3}}>Your Story</span>
                    </div>
                  )
                })()}
                {/* Other builders' real, unexpired stories */}
                {!storiesLoading && storyGroups.filter(g => g.author?.id !== user?.id).map((g, gi)=>{
                  const realIdx = storyGroups.indexOf(g)
                  const bName = g.author?.display_name || g.author?.name || "User"
                  const bColor = colorForId(g.author?.id || bName)
                  return (
                    <div key={g.author?.id||gi} className="story" onClick={()=>openStoryViewer(realIdx)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0}}>
                      <div style={{width:52,height:52,borderRadius:"50%",padding:2,background:g.allSeen?"#E5E1DA":`linear-gradient(135deg,${bColor},${bColor}88)`}}>
                        <div style={{width:"100%",height:"100%",borderRadius:"50%",border:"2px solid #fff",background:bColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>{bName[0]?.toUpperCase()}</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:500,color:P.ink3,maxWidth:54,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bName.split(" ")[0]}</span>
                    </div>
                  )
                })}
                {!storiesLoading && storyGroups.filter(g => g.author?.id !== user?.id).length===0 && (
                  <div style={{fontSize:11,color:P.ink4,alignSelf:"center",paddingLeft:4}}>No active stories from the community yet.</div>
                )}
              </div>
            </div>

            {/* Story composer modal */}
            {storyComposerOpen && (
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:220,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
                onClick={()=>setStoryComposerOpen(false)}>
                <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:360,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                  <div style={{padding:"14px 16px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:14,fontWeight:800,color:P.ink}}>Add to your story</div>
                    <button onClick={()=>setStoryComposerOpen(false)} style={{border:"none",background:"none",fontSize:16,color:P.ink4,cursor:"pointer"}}>✕</button>
                  </div>
                  <div style={{padding:16}}>
                    {storyPreview ? (
                      <div style={{position:"relative",marginBottom:10}}>
                        <img src={storyPreview} alt="" style={{width:"100%",height:280,objectFit:"cover",borderRadius:10}}/>
                        <button onClick={()=>pickStoryFile(null)} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.55)",color:"#fff",border:"none",borderRadius:99,width:26,height:26,cursor:"pointer"}}>✕</button>
                      </div>
                    ) : storyText.trim() ? (
                      <div style={{width:"100%",height:280,borderRadius:10,background:storyBg,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center",fontSize:20,fontWeight:700,marginBottom:10,whiteSpace:"pre-wrap"}}>
                        {storyText}
                      </div>
                    ) : (
                      <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:120,border:`1.5px dashed ${P.border}`,borderRadius:10,cursor:"pointer",marginBottom:10,color:P.ink4,fontSize:12}}>
                        📷 Choose a photo
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>pickStoryFile(e.target.files?.[0]||null)}/>
                      </label>
                    )}

                    {!storyFile && (
                      <>
                        <textarea value={storyText} onChange={e=>setStoryText(e.target.value)}
                          placeholder="...or write a text story"
                          style={{width:"100%",minHeight:50,padding:"8px 10px",border:`1.5px solid ${P.border}`,borderRadius:8,fontSize:13,color:P.ink,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
                        {storyText.trim() && (
                          <div style={{display:"flex",gap:6,marginBottom:10}}>
                            {STORY_COLORS.map(c=>(
                              <button key={c} onClick={()=>setStoryBg(c)} style={{width:22,height:22,borderRadius:"50%",background:c,border:storyBg===c?"2px solid #111":"2px solid transparent",cursor:"pointer"}}/>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {storyError && <div style={{fontSize:12,color:"#DC2626",marginBottom:8}}>{storyError}</div>}
                    <button onClick={submitStory} disabled={(!storyFile && !storyText.trim())||storyPosting}
                      style={{width:"100%",padding:10,borderRadius:8,border:"none",background:(storyFile||storyText.trim())&&!storyPosting?P.accent:"rgba(0,0,0,0.1)",color:(storyFile||storyText.trim())&&!storyPosting?"#fff":P.ink4,fontSize:13,fontWeight:700}}>
                      {storyPosting?"Sharing…":"Share to Story"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Story viewer — full-screen, tap left/right to go back/forward,
                auto-marks each story viewed via pulseApi.viewStory as you
                advance (see openStoryViewer/advanceStory). */}
            {storyViewer.open && storyGroups[storyViewer.groupIdx] && (() => {
              const group = storyGroups[storyViewer.groupIdx]
              const story = group.stories[storyViewer.storyIdx]
              if (!story) return null
              const authorName = group.author?.display_name || group.author?.name || "User"
              return (
                <div style={{position:"fixed",inset:0,background:"#000",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <button onClick={()=>setStoryViewer({open:false,groupIdx:0,storyIdx:0})}
                    style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:32,height:32,borderRadius:"50%",fontSize:16,cursor:"pointer",zIndex:2}}>✕</button>
                  <div style={{position:"absolute",top:10,left:10,right:10,display:"flex",gap:4}}>
                    {group.stories.map((s,si)=>(
                      <div key={s.id} style={{flex:1,height:3,borderRadius:2,background:si<storyViewer.storyIdx?"#fff":si===storyViewer.storyIdx?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)"}}/>
                    ))}
                  </div>
                  <div style={{position:"absolute",top:22,left:14,display:"flex",alignItems:"center",gap:8,color:"#fff"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:colorForId(group.author?.id||authorName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{authorName[0]?.toUpperCase()}</div>
                    <span style={{fontSize:13,fontWeight:700}}>{authorName}</span>
                    <span style={{fontSize:11,opacity:0.7}}>{timeAgo(story.created_at)}</span>
                  </div>
                  <div onClick={()=>advanceStory(-1)} style={{position:"absolute",left:0,top:0,bottom:0,width:"35%",cursor:"pointer"}}/>
                  <div onClick={()=>advanceStory(1)} style={{position:"absolute",right:0,top:0,bottom:0,width:"35%",cursor:"pointer"}}/>
                  {story.media_type==="image" ? (
                    <img src={story.media_url} alt="" style={{maxWidth:"100%",maxHeight:"92vh",objectFit:"contain"}}/>
                  ) : (
                    <div style={{width:"min(420px,92vw)",height:"70vh",borderRadius:12,background:story.background_color||P.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:28,textAlign:"center",fontSize:24,fontWeight:700,whiteSpace:"pre-wrap"}}>
                      {story.text_content}
                    </div>
                  )}
                  {story.media_type==="image" && story.text_content && (
                    <div style={{position:"absolute",bottom:24,left:16,right:16,color:"#fff",fontSize:14,textAlign:"center",textShadow:"0 1px 4px rgba(0,0,0,0.6)"}}>{story.text_content}</div>
                  )}
                </div>
              )
            })()}

            {/* Feed tabs + content card */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,overflow:"hidden",boxShadow:P.shadow}}>

              {/* Tab bar */}
              <div style={{display:"flex",borderBottom:`1px solid ${P.border}`}}>
                {[{id:"community",label:"🌐 Community"},{id:"following",label:"✦ Sparks"},{id:"network",label:"👥 Network"},{id:"mentors",label:"🎓 Mentors"},{id:"capsules",label:"🔖 Saved"}].map(t=>(
                  <button key={t.id} className="pt" onClick={()=>setFeedTab(t.id)}
                    style={{flex:1,padding:"12px 6px",fontSize:12,fontWeight:feedTab===t.id?700:500,color:feedTab===t.id?P.accent:P.ink3,borderBottom:feedTab===t.id?`2px solid ${P.accent}`:"2px solid transparent",whiteSpace:"nowrap"}}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Composer (shown when composerOpen OR inline) — Saved is a
                  personal bookmark list, not a place to post from, so it's
                  excluded here same as Mentors/Sparks/Network. */}
              {feedTab !== "mentors" && feedTab !== "following" && feedTab !== "network" && feedTab !== "capsules" && (
                <div style={{padding:"14px 16px",borderBottom:`1px solid ${P.border}`}}>
                  {composerOpen ? (
                    <div>
                      {/* Post type selector */}
                      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                        {/* "proof" is deliberately excluded here too — it has
                            its own dedicated picker flow (openProofPicker)
                            since facts must come from a real verified
                            achievement, never typed free text. */}
                        {Object.entries(POST_TYPE_CFG).filter(([k])=>k!=="text"&&k!=="proof").map(([k,v])=>(
                          <button key={k} className="pb" onClick={()=>setPostType(k)}
                            style={{padding:"3px 12px",borderRadius:99,border:`1.5px solid ${postType===k?v.color+"60":P.border}`,background:postType===k?v.bg:"transparent",color:postType===k?v.color:P.ink4,fontSize:11,fontWeight:700}}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                      {/* Per-type structured fields — each type below is a
                          genuinely different form, not the same textarea
                          relabeled (2026-08-13 redesign: previously Insight/
                          Win/Ask/Code were pixel-identical). */}
                      {postType === "win" && (
                        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
                          <input value={winMetric} onChange={e=>setWinMetric(e.target.value)}
                            placeholder={`What's the headline result? e.g. "Cracked 3 System Design rounds" or "+120 ELO this month"`}
                            style={{width:"100%",padding:"9px 12px",border:`1.5px solid #05966950`,borderRadius:8,fontSize:13,color:P.ink,fontFamily:"inherit",outline:"none",boxSizing:"border-box",fontWeight:700}}/>
                          <input value={winResult} onChange={e=>setWinResult(e.target.value)}
                            placeholder="Optional detail — company, score, or metric"
                            style={{width:"100%",padding:"8px 12px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,color:P.ink,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      )}
                      {postType === "question" && (
                        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                          {[["advice","💡 Advice"],["resource","📚 A resource"],["reviewer","👀 Someone to review my work"],["collaborator","🤝 A collaborator"]].map(([v,l])=>(
                            <button key={v} onClick={()=>setAskLookingFor(v)}
                              style={{padding:"4px 10px",borderRadius:99,border:`1.5px solid ${askLookingFor===v?"#0891B260":P.border}`,background:askLookingFor===v?"#EFF6FF":"transparent",color:askLookingFor===v?"#0891B2":P.ink4,fontSize:11,fontWeight:700}}>
                              {l}
                            </button>
                          ))}
                        </div>
                      )}
                      {postType === "code" && (
                        <div style={{marginBottom:8}}>
                          <select value={codeLanguage} onChange={e=>setCodeLanguage(e.target.value)}
                            style={{padding:"6px 10px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,color:P.ink,fontFamily:"inherit",outline:"none",marginBottom:6}}>
                            {["javascript","python","typescript","sql","java","go","c++","bash","other"].map(l=><option key={l} value={l}>{l}</option>)}
                          </select>
                          <textarea value={codeSnippet} onChange={e=>setCodeSnippet(e.target.value)}
                            placeholder="Paste your code snippet…"
                            style={{width:"100%",minHeight:110,padding:"10px 12px",border:`1.5px solid #D9770650`,borderRadius:10,fontSize:12,color:P.ink,resize:"vertical",fontFamily:"'DM Mono',monospace",outline:"none",boxSizing:"border-box",background:"#FFF7ED"}}/>
                        </div>
                      )}
                      <textarea value={postText} onChange={e=>setPostText(e.target.value)}
                        placeholder={
                          postType==="win"      ? "Tell the story behind it — what did it take?" :
                          postType==="question" ? `What's your question? Be specific — the ${domain} community can only help if they know what you're stuck on…` :
                          postType==="code"     ? "Explain what this snippet does or the problem it solves…" :
                          `Share an insight in ${domain}...`
                        }
                        style={{width:"100%",minHeight:postType==="win"||postType==="code"?60:90,padding:"10px 12px",border:`1.5px solid rgba(255,87,1,0.3)`,borderRadius:10,fontSize:13,color:P.ink,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                      <input value={postTags} onChange={e=>setPostTags(e.target.value)}
                        placeholder="Add tags: #python #sql #interview"
                        style={{width:"100%",padding:"8px 12px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,color:P.ink,fontFamily:"inherit",outline:"none",marginTop:8,boxSizing:"border-box"}}/>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                        <span style={{fontSize:11,color:P.ink4}}>{postText.length}/500</span>
                        <div style={{display:"flex",gap:8}}>
                          <button className="pb" onClick={resetComposer}
                            style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${P.border}`,color:P.ink3,fontSize:12,fontWeight:600}}>Cancel</button>
                          <button className="pb" onClick={submitPost} disabled={!postValid()||posting}
                            style={{padding:"7px 16px",borderRadius:8,border:"none",background:postValid()&&!posting?P.accent:"rgba(0,0,0,0.1)",color:postValid()&&!posting?"#fff":P.ink4,fontSize:12,fontWeight:700,opacity:posting?0.7:1}}>
                            {posting?"Posting...":"Post"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:P.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{initials}</div>
                      <div onClick={()=>setComposerOpen(true)} style={{flex:1,padding:"9px 14px",border:`1px solid ${P.border}`,borderRadius:20,fontSize:13,color:P.ink4,cursor:"text",background:"rgba(0,0,0,0.02)"}}>
                        Share an insight, code snippet, or win in {domain}...
                      </div>
                      {[{l:"Code",e:"💻",t:"code"},{l:"Win",e:"🏆",t:"win"},{l:"Ask",e:"❓",t:"question"}].map(b=>(
                        <button key={b.l} className="pb" onClick={()=>{setComposerOpen(true);setPostType(b.t)}}
                          style={{padding:"7px 11px",border:`1px solid ${P.border}`,borderRadius:8,background:"#FFFFFF",fontSize:12,fontWeight:600,color:P.ink2}}>
                          {b.e} {b.l}
                        </button>
                      ))}
                      {/* Share Proof — distinct from the free-text buttons above:
                          this doesn't open the composer at all, it opens a picker
                          over the user's own real verified achievements. */}
                      <button className="pb" onClick={openProofPicker}
                        style={{padding:"7px 11px",border:`1.5px solid #05966940`,borderRadius:8,background:"#ECFDF5",fontSize:12,fontWeight:700,color:"#059669"}}>
                        ✅ Proof
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Share Proof picker — fixed overlay, independent of feed tab/layout.
                  Deliberately NOT a free-text form: step 1 is choosing a real
                  achievement (server-fetched, server-verified on submit),
                  step 2 is an optional caption. There is no way to type in a
                  score, skill, or outcome — that's the whole point. */}
              {proofPickerOpen && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
                  onClick={()=>setProofPickerOpen(false)}>
                  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                    <div style={{padding:"16px 18px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:P.ink}}>✅ Share a Proof</div>
                        <div style={{fontSize:11,color:P.ink4,marginTop:2}}>Pick a real, verified achievement — facts come from Capabilio, not you</div>
                      </div>
                      <button className="pb" onClick={()=>setProofPickerOpen(false)} style={{border:"none",background:"none",fontSize:18,color:P.ink4,cursor:"pointer"}}>✕</button>
                    </div>

                    <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
                      {proofLoading ? (
                        <div style={{padding:"30px 0",textAlign:"center",fontSize:12,color:P.ink4}}>Loading your achievements…</div>
                      ) : proofCandidates.length===0 ? (
                        <div style={{padding:"30px 16px",textAlign:"center"}}>
                          <div style={{fontSize:32,marginBottom:8}}>🎯</div>
                          <div style={{fontSize:13,fontWeight:700,color:P.ink2,marginBottom:4}}>Nothing to share yet</div>
                          <div style={{fontSize:11,color:P.ink4}}>Complete a verified challenge, improve your skill rating, or earn a verified skill — it'll show up here automatically.</div>
                        </div>
                      ) : proofCandidates.map(c=>(
                        <div key={`${c.sourceType}_${c.sourceId}`} onClick={()=>setProofSelected(c)}
                          style={{padding:"11px 12px",borderRadius:10,border:`1.5px solid ${proofSelected?.sourceId===c.sourceId&&proofSelected?.sourceType===c.sourceType?"#059669":P.border}`,background:proofSelected?.sourceId===c.sourceId&&proofSelected?.sourceType===c.sourceType?"#ECFDF5":"#fff",marginBottom:8,cursor:"pointer",transition:"all 0.12s"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                            <div style={{fontSize:13,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                            {c.verified && <span style={{fontSize:9,fontWeight:800,color:"#059669",background:"#ECFDF5",padding:"2px 7px",borderRadius:99,flexShrink:0}}>✓ VERIFIED</span>}
                          </div>
                          {c.subtitle && <div style={{fontSize:11,color:P.ink4,marginTop:2}}>{c.subtitle}</div>}
                          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                            {c.score!=null && <span style={{fontSize:10,fontWeight:700,color:P.accent,background:P.accent2,padding:"2px 8px",borderRadius:99}}>Score {c.score}</span>}
                            {c.eloDelta!=null && <span style={{fontSize:10,fontWeight:700,color:"#059669",background:"#ECFDF5",padding:"2px 8px",borderRadius:99}}>+{c.eloDelta} ELO</span>}
                            {c.difficulty && <span style={{fontSize:10,fontWeight:700,color:P.ink3,background:P.cream2||"#F3F4F6",padding:"2px 8px",borderRadius:99}}>{c.difficulty}</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {proofSelected && (
                      <div style={{padding:"12px 16px",borderTop:`1px solid ${P.border}`}}>
                        <textarea value={proofCaption} onChange={e=>setProofCaption(e.target.value)}
                          placeholder="Add an optional caption…"
                          style={{width:"100%",minHeight:50,padding:"8px 10px",border:`1.5px solid ${P.border}`,borderRadius:8,fontSize:12,color:P.ink,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
                        <button className="pb" onClick={submitProofPost} disabled={proofPosting}
                          style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:"#059669",color:"#fff",fontSize:13,fontWeight:700,opacity:proofPosting?0.7:1,cursor:proofPosting?"default":"pointer"}}>
                          {proofPosting?"Sharing…":"Share Proof Post"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* "Who liked this" modal — tap a like count to see the list,
                  same as Instagram/Facebook/LinkedIn. Public data (reaction
                  counts are already public on the feed), so no auth gate. */}
              {likersModal.open && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:210,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
                  onClick={()=>setLikersModal({open:false,id:null,type:"post",users:[],loading:false})}>
                  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:340,maxHeight:"70vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                    <div style={{padding:"14px 16px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{fontSize:14,fontWeight:800,color:P.ink}}>❤️ Liked by</div>
                      <button onClick={()=>setLikersModal({open:false,id:null,type:"post",users:[],loading:false})} style={{border:"none",background:"none",fontSize:16,color:P.ink4,cursor:"pointer"}}>✕</button>
                    </div>
                    <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
                      {likersModal.loading && <div style={{padding:"24px 0",textAlign:"center",fontSize:12,color:P.ink4}}>Loading…</div>}
                      {!likersModal.loading && likersModal.users.length===0 && <div style={{padding:"24px 16px",textAlign:"center",fontSize:12,color:P.ink4}}>No likes yet.</div>}
                      {likersModal.users.map((u,ui)=>(
                        <div key={u.id||ui} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px"}}>
                          <div style={{width:32,height:32,borderRadius:"50%",background:colorForId(u.id||ui.toString()),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>
                            {(u.display_name||u.name||"U")[0]?.toUpperCase()}
                          </div>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.display_name||u.name||"Member"}</div>
                            {u.keyword && <div style={{fontSize:10,color:P.ink4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.keyword}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sort bar — not shown on Mentors/Sparks/Network/Saved. "For
                  You"/"Most Discussed"/"Most Liked" are feed-ranking modes;
                  meaningless on a personal saved list (which has no ranking,
                  just your own bookmarks), so Saved is excluded too. */}
              {feedTab !== "mentors" && feedTab !== "following" && feedTab !== "network" && feedTab !== "capsules" && (
                <div style={{padding:"8px 16px",display:"flex",alignItems:"center",gap:6,borderBottom:`1px solid ${P.border}`,overflowX:"auto"}}>
                  <span style={{fontSize:11,fontWeight:600,color:P.ink4,marginRight:4,flexShrink:0}}>SORT</span>
                  {[{id:"foryou",label:"For You"},{id:"latest",label:"Latest"},{id:"discussed",label:"Most Discussed"},{id:"liked",label:"Most Liked"}].map(s=>(
                    <button key={s.id} className="pb" onClick={()=>setSortTab(s.id)}
                      style={{padding:"4px 12px",borderRadius:99,border:`1px solid ${sortTab===s.id?P.accent+"40":P.border}`,background:sortTab===s.id?P.accent2:"transparent",color:sortTab===s.id?P.accent:P.ink3,fontSize:11,fontWeight:sortTab===s.id?700:500,flexShrink:0}}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Sparks tab (was "Following") ── */}
              {feedTab === "following" && (
                <div style={{padding:16}}>
                  {/* Sub-tab bar */}
                  <div style={{display:"flex",gap:6,marginBottom:16,background:"#F9F7F4",borderRadius:10,padding:4}}>
                    {[{id:"discover",label:"🔍 Discover"},{id:"inbox",label:`✦ Inbox${pendingSparks.length>0?" ("+pendingSparks.length+")":""}`},{id:"sent",label:"📤 Sent"}].map(st=>(
                      <button key={st.id} onClick={()=>setSparksTab(st.id)}
                        style={{flex:1,padding:"7px 6px",borderRadius:8,border:"none",cursor:"pointer",
                          background:sparksTab===st.id?"#fff":"transparent",
                          color:sparksTab===st.id?P.accent:P.ink3,
                          fontSize:11,fontWeight:sparksTab===st.id?700:500,
                          boxShadow:sparksTab===st.id?"0 1px 4px rgba(0,0,0,0.08)":"none",
                          transition:"all 0.15s"}}>
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Discover: search + follow ── */}
                  {sparksTab === "discover" && (
                    <div>
                      <div style={{position:"relative",marginBottom:14}}>
                        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:P.ink4}}>🔍</span>
                        <input value={userSearch} onChange={e=>searchUsers(e.target.value)}
                          placeholder={isProfessional ? "Search people by name, domain, company…" : "Search people by name, domain, college…"}
                          style={{width:"100%",padding:"10px 12px 10px 36px",border:`1.5px solid ${P.border}`,borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",background:"#FAFAF9",boxSizing:"border-box"}}
                          onFocus={e=>e.target.style.borderColor=P.accent}
                          onBlur={e=>e.target.style.borderColor=P.border}/>
                      </div>
                      {searchLoading && <div style={{textAlign:"center",padding:"20px 0",color:P.ink4,fontSize:13}}>Searching…</div>}
                      {!searchLoading && userSearch && searchResults.length === 0 && (
                        <div style={{textAlign:"center",padding:"24px 0",color:P.ink4}}>
                          <div style={{fontSize:28,marginBottom:6}}>🔭</div>
                          <div style={{fontSize:13,fontWeight:600,color:P.ink3}}>No users found for "{userSearch}"</div>
                        </div>
                      )}
                      {!searchLoading && searchResults.length > 0 && (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {searchResults.map((u,i) => {
                            const uName = u.display_name || u.name || u.username || "User"
                            const uColor = colorForId(u.id || u.user_id || String(i))
                            const action = sparkActions[u.id]
                            return (
                              <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                <div style={{width:40,height:40,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:13,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uName}</div>
                                  <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.domain||"Capabilio member"}{u.college?` · ${u.college}`:""}</div>
                                  {u.elo_rating&&<div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:2}}>ELO {u.elo_rating}</div>}
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                                  <button onClick={()=>action==="sent"||action==="sending"?null:sendSpark(u.id, uName)}
                                    style={{padding:"5px 12px",background:action==="sent"?"#F0FDF4":action==="sending"?"#FAF7F2":P.accent,border:`1.5px solid ${action==="sent"?"#BBF7D0":action==="sending"?P.border:P.accent}`,borderRadius:8,color:action==="sent"?"#15803D":action==="sending"?P.ink4:"#fff",fontSize:11,fontWeight:700,cursor:action?"default":"pointer",whiteSpace:"nowrap"}}>
                                    {action==="sending"?"Sparking…":action==="sent"?"✓ Sparked":"✦ Spark"}
                                  </button>
                                  <button onClick={()=>action==="followed"||action==="following"?null:handleFollow(u.id)}
                                    style={{padding:"5px 12px",background:action==="followed"?"#EEF2FF":"transparent",border:`1.5px solid ${action==="followed"?"#818CF8":P.accent}`,borderRadius:8,color:action==="followed"?"#6366F1":P.accent,fontSize:11,fontWeight:700,cursor:action==="followed"||action==="following"?"default":"pointer",whiteSpace:"nowrap"}}>
                                    {action==="following"?"Following…":action==="followed"?"✓ Following":"+ Follow"}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!userSearch && (
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:P.ink4,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>People You May Know</div>
                          {suggestedUsers.length === 0 ? (
                            <div style={{textAlign:"center",padding:"24px 0",color:P.ink4}}>
                              <div style={{fontSize:28,marginBottom:6}}>✦</div>
                              <div style={{fontSize:13,color:P.ink3}}>Search to find people on Capabilio</div>
                            </div>
                          ) : (
                            <div style={{display:"flex",flexDirection:"column",gap:10}}>
                              {suggestedUsers.map((u,i) => {
                                const uName = u.display_name || u.name || u.username || "User"
                                const uColor = colorForId(u.id || String(i))
                                const action = sparkActions[u.id]
                                return (
                                  <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                    <div style={{width:40,height:40,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{fontSize:13,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uName}</div>
                                      <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.current_role_title||"Capabilio member"}</div>
                                      <div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:1}}>ELO {u.elo_rating||400}</div>
                                    </div>
                                    <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                                      <button onClick={()=>action==="sent"||action==="sending"?null:sendSpark(u.id, uName)}
                                        style={{padding:"5px 12px",background:action==="sent"?"#F0FDF4":action==="sending"?"#FAF7F2":P.accent,border:`1.5px solid ${action==="sent"?"#BBF7D0":action==="sending"?P.border:P.accent}`,borderRadius:8,color:action==="sent"?"#15803D":action==="sending"?P.ink4:"#fff",fontSize:11,fontWeight:700,cursor:action?"default":"pointer",whiteSpace:"nowrap"}}>
                                        {action==="sending"?"Sparking…":action==="sent"?"✓ Sparked":"✦ Spark"}
                                      </button>
                                      <button onClick={()=>action==="followed"||action==="following"?null:handleFollow(u.id)}
                                        style={{padding:"5px 12px",background:action==="followed"?"#EEF2FF":"transparent",border:`1.5px solid ${action==="followed"?"#818CF8":P.accent}`,borderRadius:8,color:action==="followed"?"#6366F1":P.accent,fontSize:11,fontWeight:700,cursor:action==="followed"||action==="following"?"default":"pointer",whiteSpace:"nowrap"}}>
                                        {action==="following"?"Following…":action==="followed"?"✓ Following":"+ Follow"}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Inbox: pending incoming Sparks ── */}
                  {sparksTab === "inbox" && (
                    <div>
                      {sparksLoading ? (
                        <div style={{textAlign:"center",padding:"32px 0",color:P.ink4,fontSize:13}}>Loading Sparks…</div>
                      ) : pendingSparks.length === 0 ? (
                        <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                          <div style={{fontSize:36,marginBottom:8}}>✦</div>
                          <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No pending Sparks</div>
                          <div style={{fontSize:12,marginTop:4,color:P.ink4}}>When someone Sparks you, it shows up here</div>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {pendingSparks.map((spark,i) => {
                            const sName = spark.requester?.display_name || spark.requester?.name || "Someone"
                            const sColor = colorForId(spark.requester_id || String(i))
                            return (
                              <div key={spark.id} style={{padding:"14px 16px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                                  <div style={{width:40,height:40,borderRadius:"50%",background:sColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{sName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{sName}</div>
                                    <div style={{fontSize:11,color:P.ink4}}>{spark.requester?.keyword||"Capabilio member"}</div>
                                  </div>
                                  <div style={{fontSize:10,color:P.ink4}}>{spark.created_at ? new Date(spark.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : ""}</div>
                                </div>
                                {spark.message&&<div style={{fontSize:12,color:P.ink3,marginBottom:10,padding:"8px 10px",background:"#F9F7F4",borderRadius:8,fontStyle:"italic"}}>"{spark.message}"</div>}
                                <div style={{display:"flex",gap:8}}>
                                  <button onClick={()=>handleSpark(spark,true)}
                                    style={{flex:1,padding:"8px",background:P.accent,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                                    ✓ Accept Spark
                                  </button>
                                  <button onClick={()=>handleSpark(spark,false)}
                                    style={{flex:1,padding:"8px",background:"transparent",border:`1.5px solid ${P.border}`,borderRadius:8,color:P.ink3,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                                    Decline
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sent Sparks ── */}
                  {sparksTab === "sent" && (
                    <div>
                      {sparksLoading ? (
                        <div style={{textAlign:"center",padding:"32px 0",color:P.ink4,fontSize:13}}>Loading…</div>
                      ) : sentSparks.length === 0 ? (
                        <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                          <div style={{fontSize:36,marginBottom:8}}>📤</div>
                          <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No sent Sparks yet</div>
                          <div style={{fontSize:12,marginTop:4,color:P.ink4}}>Go to Discover and Spark someone to connect</div>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {sentSparks.map((spark,i) => {
                            const aName = spark.addressee?.display_name || spark.addressee?.name || "Someone"
                            const aColor = colorForId(spark.addressee_id || String(i))
                            return (
                              <div key={spark.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                <div style={{width:40,height:40,borderRadius:"50%",background:aColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{aName[0]?.toUpperCase()}</div>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{aName}</div>
                                  <div style={{fontSize:11,color:P.ink4}}>{spark.addressee?.keyword||"Capabilio member"}</div>
                                </div>
                                <span style={{fontSize:11,fontWeight:600,color:"#F59E0B",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:99,padding:"3px 10px"}}>Pending</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Network tab (followers / following) ── */}
              {feedTab === "network" && (
                <div style={{padding:16}}>
                  {/* Sub-tabs */}
                  <div style={{display:"flex",gap:6,marginBottom:16,background:"#F9F7F4",borderRadius:10,padding:4}}>
                    {[
                      {id:"following", label:`Following${myFollowing.length>0?" ("+myFollowing.length+")":""}`},
                      {id:"followers", label:`Followers${myFollowers.length>0?" ("+myFollowers.length+")":""}` },
                    ].map(st=>(
                      <button key={st.id} onClick={()=>setNetworkSubTab(st.id)}
                        style={{flex:1,padding:"7px 6px",borderRadius:8,border:"none",cursor:"pointer",
                          background:networkSubTab===st.id?"#fff":"transparent",
                          color:networkSubTab===st.id?P.accent:P.ink3,
                          fontSize:11,fontWeight:networkSubTab===st.id?700:500,
                          boxShadow:networkSubTab===st.id?"0 1px 4px rgba(0,0,0,0.08)":"none",
                          transition:"all 0.15s"}}>
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {networkLoading ? (
                    <div style={{textAlign:"center",padding:"32px 0",color:P.ink4,fontSize:13}}>Loading network…</div>
                  ) : (
                    <div>
                      {/* Following list */}
                      {networkSubTab === "following" && (
                        myFollowing.length === 0 ? (
                          <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                            <div style={{fontSize:36,marginBottom:8}}>👥</div>
                            <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>Not following anyone yet</div>
                            <div style={{fontSize:12,marginTop:4}}>Go to ✦ Sparks → Discover to connect</div>
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {myFollowing.map((u,i) => {
                              const uName = u.display_name || u.name || u.username || "User"
                              const uColor = colorForId(u.id || String(i))
                              return (
                                <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                  <div style={{width:42,height:42,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{uName}</div>
                                    <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.current_role_title||"Capabilio member"}</div>
                                    <div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:1}}>ELO {u.elo_rating||400}</div>
                                  </div>
                                  <button onClick={()=>nexusApi.unfollow(u.id).then(loadMyNetwork).catch(()=>{})}
                                    style={{padding:"5px 12px",background:"transparent",border:`1.5px solid ${P.border}`,borderRadius:8,color:P.ink3,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                                    Unfollow
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      )}

                      {/* Followers list */}
                      {networkSubTab === "followers" && (
                        myFollowers.length === 0 ? (
                          <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                            <div style={{fontSize:36,marginBottom:8}}>👥</div>
                            <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No followers yet</div>
                            <div style={{fontSize:12,marginTop:4}}>Share your work on Community to grow your network</div>
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {myFollowers.map((u,i) => {
                              const uName = u.display_name || u.name || u.username || "User"
                              const uColor = colorForId(u.id || String(i))
                              const action = sparkActions[u.id]
                              return (
                                <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                  <div style={{width:42,height:42,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{uName}</div>
                                    <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.current_role_title||"Capabilio member"}</div>
                                    <div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:1}}>ELO {u.elo_rating||400}</div>
                                  </div>
                                  <button onClick={()=>action==="sent"||action==="sending"?null:sendSpark(u.id, uName)}
                                    style={{padding:"5px 12px",background:action==="sent"?"#F0FDF4":P.accent,border:`1.5px solid ${action==="sent"?"#BBF7D0":P.accent}`,borderRadius:8,color:action==="sent"?"#15803D":"#fff",fontSize:11,fontWeight:700,cursor:action==="sent"?"default":"pointer",whiteSpace:"nowrap"}}>
                                    {action==="sending"?"…":action==="sent"?"✓ Sparked":"✦ Spark back"}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Mentors tab ── */}
              {feedTab === "mentors" && (
                <div style={{padding:16}}>
                  {!Array.isArray(mentors) || mentors.length === 0 ? (
                    <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                      <div style={{fontSize:32,marginBottom:8}}>🎓</div>
                      <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No mentors in your domain yet</div>
                      <div style={{fontSize:12,marginTop:4}}>Check back soon as verified mentors join Capabilio</div>
                    </div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {(Array.isArray(mentors) ? mentors : []).map((m,i)=>{
                        const mName = m.display_name || m.profile?.display_name || m.profile?.name || "Mentor"
                        const mColor = colorForId(m.user_id)
                        return (
                          <div key={m.id||i} className="pc" style={{background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
                            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                              <div style={{width:46,height:46,borderRadius:"50%",background:mColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>{mName[0]?.toUpperCase()}</div>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:700,color:P.ink}}>{mName}</div>
                                <div style={{fontSize:11,color:P.ink3}}>{m.headline||"Verified Mentor"}</div>
                              </div>
                              {m.rating&&<div style={{fontSize:12,fontWeight:700,color:"#F59E0B"}}>⭐ {m.rating}</div>}
                            </div>
                            {m.specialties&&<div style={{fontSize:12,color:P.ink2,marginBottom:10,lineHeight:1.5}}>{m.specialties}</div>}
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                              {m.hourly_rate&&<span style={{fontSize:12,fontWeight:700,color:P.ink}}>₹{m.hourly_rate}/session</span>}
                              <button className="pb" style={{padding:"7px 18px",background:P.accent,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700}}>Book Session</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Post feed (community / capsules) ── */}
              {feedTab !== "mentors" && feedTab !== "following" && feedTab !== "network" && (
                <>
                  {feedLoading && (
                    <div style={{padding:40,textAlign:"center"}}>
                      <div style={{width:24,height:24,border:`3px solid ${P.accent}33`,borderTopColor:P.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                    </div>
                  )}

                  {!feedLoading && posts.length === 0 && (
                    <div style={{textAlign:"center",padding:"50px 0",color:P.ink4}}>
                      <div style={{fontSize:40,marginBottom:10}}>{feedTab==="following"?"🔔":feedTab==="capsules"?"🔖":"🌐"}</div>
                      <div style={{fontSize:14,fontWeight:600,color:P.ink3,marginBottom:6}}>
                        {feedTab==="following" ? "No posts from people you follow yet"
                         : feedTab==="capsules" ? "No saved posts yet — save posts to find them here"
                         : "No posts yet — be the first to share!"}
                      </div>
                      {feedTab==="community"&&<button className="pb" onClick={()=>setComposerOpen(true)} style={{padding:"8px 20px",background:P.accent,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700}}>Share the first post</button>}
                    </div>
                  )}

                  {!feedLoading && posts.map((post, i)=>{
                    const pt = POST_TYPE_CFG[post.post_type] || POST_TYPE_CFG.text
                    const reacted = reactions[post.id] || {}
                    const panel = commentPanels[post.id]
                    const tags = [...(post.tech_tags||[]), ...(post.role_tags||[])].filter(Boolean)

                    const isProof = post.post_type === "proof" && post.proof_data

                    return (
                      <div key={post.id} style={{borderBottom:i<posts.length-1?`1px solid ${P.border}`:"none",background:isProof?"linear-gradient(180deg,#ECFDF5 0%,#fff 70px)":"transparent",borderLeft:isProof?"3px solid #059669":"3px solid transparent"}}>
                        <div style={{padding:16}}>
                          {/* Post header */}
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:38,height:38,borderRadius:"50%",background:colorForId(post.author_id),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{authorInitials(post)}</div>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                  <span style={{fontSize:13,fontWeight:700,color:P.ink}}>{authorName(post)}</span>
                                  {post.author?.verification_state==="verified"&&<span style={{fontSize:10,fontWeight:800,color:"#0891B2",background:"#EFF6FF",padding:"1px 7px",borderRadius:99}}>+ VERIFIED</span>}
                                  {/* Inline verified skill badge — real skill, not a claim (Proof Posts
                                      feature: author.verified_badge is batch-fetched server-side from
                                      user_skills where verified=true, see GET /pulse/feed). */}
                                  {post.author?.verified_badge&&<span style={{fontSize:10,fontWeight:800,color:"#059669",background:"#ECFDF5",padding:"1px 8px",borderRadius:99}}>✓ {post.author.verified_badge.skill}</span>}
                                  <span style={{fontSize:11,fontWeight:700,color:P.accent,background:P.accent2,padding:"1px 8px",borderRadius:99,fontFamily:"'DM Mono',monospace"}}>🔥{authorElo(post)}</span>
                                </div>
                                <div style={{fontSize:11,color:P.ink4}}>{post.author?.keyword||""} · {timeAgo(post.created_at)}</div>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                              <span style={{padding:"2px 9px",background:pt.bg,borderRadius:99,fontSize:10,fontWeight:800,color:pt.color,letterSpacing:"0.06em"}}>{pt.label}</span>
                              {post.author_id === user?.id && (
                                <button
                                  onClick={() => deletePost(post.id)}
                                  disabled={deletingPost === post.id}
                                  title="Delete post"
                                  style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:P.ink4,padding:"2px 4px",borderRadius:6,lineHeight:1,opacity:deletingPost===post.id?0.4:1}}
                                >
                                  {deletingPost === post.id ? "…" : "🗑"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Proof card — the whole point of the feature: this
                              block renders ONLY from post.proof_data, which the
                              server stamped from a real proof_objects/
                              professional_elo_events/user_skills row at post-
                              creation time (see resolveProofRef in
                              pulseNexus.js). Nothing here is user-typed. */}
                          {isProof && (
                            <div style={{background:"#fff",border:"1.5px solid #05966930",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:post.proof_data.subtitle?2:0}}>
                                <div style={{fontSize:14,fontWeight:800,color:P.ink}}>{post.proof_data.title}</div>
                                {post.proof_data.verified&&<span style={{fontSize:9,fontWeight:800,color:"#059669",background:"#ECFDF5",padding:"2px 8px",borderRadius:99,flexShrink:0,whiteSpace:"nowrap"}}>✓ VERIFIED BY CAPABILIO</span>}
                              </div>
                              {post.proof_data.subtitle&&<div style={{fontSize:11,color:P.ink4,marginBottom:8}}>{post.proof_data.subtitle}</div>}
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                {post.proof_data.score!=null&&<span style={{fontSize:10,fontWeight:700,color:P.accent,background:P.accent2,padding:"2px 8px",borderRadius:99}}>Score {post.proof_data.score}</span>}
                                {post.proof_data.eloDelta!=null&&<span style={{fontSize:10,fontWeight:700,color:"#059669",background:"#ECFDF5",padding:"2px 8px",borderRadius:99}}>+{post.proof_data.eloDelta} ELO</span>}
                                {post.proof_data.difficulty&&<span style={{fontSize:10,fontWeight:700,color:P.ink3,background:P.cream2||"#F3F4F6",padding:"2px 8px",borderRadius:99}}>{post.proof_data.difficulty}</span>}
                                {(post.proof_data.skillTags||[]).slice(0,4).map((s,si)=>(
                                  <span key={si} style={{fontSize:10,fontWeight:600,color:"#0891B2",background:"#EFF6FF",padding:"2px 8px",borderRadius:99}}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Win card — headline result + optional detail, real
                              structured fields (post.type_data), not a plain
                              paragraph like the old shared rendering. */}
                          {post.post_type==="win" && post.type_data && (
                            <div style={{background:"#ECFDF5",border:"1.5px solid #05966930",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                              <div style={{fontSize:14,fontWeight:800,color:"#065F46"}}>🏆 {post.type_data.metric}</div>
                              {post.type_data.result&&<div style={{fontSize:12,color:"#059669",marginTop:2}}>{post.type_data.result}</div>}
                            </div>
                          )}

                          {/* Ask card — the "looking for" tag up front, so
                              people scanning the feed know at a glance what
                              kind of help is being requested. */}
                          {post.post_type==="question" && post.type_data?.lookingFor && (
                            <div style={{marginBottom:8}}>
                              <span style={{fontSize:11,fontWeight:800,color:"#0891B2",background:"#EFF6FF",padding:"3px 10px",borderRadius:99}}>
                                {{advice:"💡 Looking for advice",resource:"📚 Looking for a resource",reviewer:"👀 Looking for a reviewer",collaborator:"🤝 Looking for a collaborator"}[post.type_data.lookingFor] || "❓ Question"}
                              </span>
                            </div>
                          )}

                          {/* Code card — real monospace code block with a
                              language badge, not free text. */}
                          {post.post_type==="code" && post.type_data?.code && (
                            <div style={{background:"#0f172a",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",background:"#1e293b"}}>
                                <span style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>{post.type_data.language||"code"}</span>
                                <button onClick={()=>navigator.clipboard?.writeText(post.type_data.code)} style={{fontSize:10,fontWeight:700,color:"#94a3b8",background:"none",border:"none",cursor:"pointer"}}>Copy</button>
                              </div>
                              <pre style={{margin:0,padding:"12px 14px",overflowX:"auto",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#e2e8f0",whiteSpace:"pre"}}>{post.type_data.code}</pre>
                            </div>
                          )}

                          {/* Content — for proof posts this is just the optional
                              caption; for Win/Ask/Code this is the explanation
                              text underneath the structured card above. */}
                          {post.content&&<p style={{fontSize:13,color:P.ink2,lineHeight:1.65,margin:"0 0 10px",whiteSpace:"pre-wrap"}}>{post.content}</p>}

                          {/* Tags */}
                          {tags.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                            {tags.slice(0,6).map((t,j)=><span key={j} style={{fontSize:11,color:"#0891B2",fontWeight:600,cursor:"pointer"}}>{t.startsWith("#")?t:"#"+t}</span>)}
                          </div>}

                          {/* Action bar — one Like (was Acknowledge+Signal,
                              consolidated 2026-08-13 to match IG/FB/LinkedIn's
                              single-reaction pattern), Comment, Save. Tapping
                              the like COUNT (not the heart itself) opens the
                              "who liked this" list, same split as those
                              platforms — the heart toggles your own like,
                              the number is a separate tap target. */}
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                            <button className="pb" onClick={()=>handleReact(post.id,"acknowledge")}
                              style={{padding:"5px 12px",border:`1.5px solid ${reacted.acknowledge?"#DC262640":P.border}`,borderRadius:8,fontSize:12,color:reacted.acknowledge?"#DC2626":P.ink3,fontWeight:500,background:reacted.acknowledge?"#FEF2F2":"transparent",display:"flex",alignItems:"center",gap:5}}>
                              <span>{reacted.acknowledge?"❤️":"🤍"}</span>
                              {post.acknowledge_count>0 ? (
                                <span onClick={(e)=>{e.stopPropagation();openLikers(post.id,"post")}} style={{textDecoration:"underline",textDecorationColor:"transparent"}}
                                  onMouseEnter={e=>e.currentTarget.style.textDecorationColor="currentColor"} onMouseLeave={e=>e.currentTarget.style.textDecorationColor="transparent"}>
                                  {post.acknowledge_count}
                                </span>
                              ) : "Like"}
                            </button>
                            <button className="pb" onClick={()=>toggleComments(post.id)}
                              style={{padding:"5px 12px",border:`1.5px solid ${panel?.open?"#0891B240":P.border}`,borderRadius:8,fontSize:12,color:panel?.open?"#0891B2":P.ink3,fontWeight:500,background:panel?.open?"#EFF6FF":"transparent"}}>
                              💬 {post.comment_count||0}
                            </button>
                            <button className="pb" onClick={()=>handleReact(post.id,"save")}
                              style={{padding:"5px 12px",border:`1.5px solid ${reacted.save?"#D97706"+"40":P.border}`,borderRadius:8,fontSize:12,color:reacted.save?"#D97706":P.ink3,fontWeight:500,background:reacted.save?"#FFF7ED":"transparent",marginLeft:"auto"}}>
                              {reacted.save?"🔖 Saved":"🔖 Save"}
                            </button>
                          </div>
                        </div>

                        {/* Comment panel — threaded (reply-to-comment),
                            each comment shows name · domain · ELO (same
                            identity strip as post cards) plus its own
                            like + reply actions and count, not just a bare
                            name and timestamp. */}
                        {panel?.open && (
                          <div style={{borderTop:`1px solid ${P.border}`,background:"rgba(0,0,0,0.015)",padding:"12px 16px"}}>
                            {panel.loading&&<div style={{padding:"10px 0",textAlign:"center"}}><div style={{width:18,height:18,border:`2px solid ${P.accent}33`,borderTopColor:P.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/></div>}
                            {!panel.loading&&panel.comments?.length===0&&<div style={{fontSize:12,color:P.ink4,marginBottom:10}}>No comments yet. Be first!</div>}
                            {(panel.comments||[]).map((c,ci)=>{
                              const cName = c.author?.display_name||c.author?.name||c.author?.username||"User"
                              const cDomain = c.author?.keyword||""
                              const cElo = c.author?.elo_rating
                              const cLike = commentLikes[c.id] || { liked:false, count:c.like_count||0 }
                              const replyThread = commentReplies[c.id]
                              const replyCount = c.reply_count||0
                              return (
                                <div key={c.id||ci} style={{marginBottom:12}}>
                                  <div style={{display:"flex",gap:8}}>
                                    <div style={{width:28,height:28,borderRadius:"50%",background:colorForId(c.author_id||ci.toString()),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{cName[0]?.toUpperCase()}</div>
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{background:"#FFFFFF",borderRadius:8,padding:"8px 10px",border:`1px solid ${P.border}`}}>
                                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
                                          <span style={{fontSize:11,fontWeight:700,color:P.ink}}>{cName}</span>
                                          {cDomain && <span style={{fontSize:10,color:P.ink4}}>· {cDomain}</span>}
                                          {cElo!=null && <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,color:P.accent}}>🔥{cElo}</span>}
                                          <span style={{fontSize:10,color:P.ink4}}>· {timeAgo(c.created_at)}</span>
                                        </div>
                                        <div style={{fontSize:12,color:P.ink2,lineHeight:1.5}}>{c.content}</div>
                                      </div>
                                      {/* Like / Reply row — mirrors the post action bar's split between
                                          the heart (toggles) and the count (opens who-liked-this). */}
                                      <div style={{display:"flex",alignItems:"center",gap:12,marginTop:4,paddingLeft:2}}>
                                        <button onClick={()=>toggleCommentLike(c.id,c.like_count)}
                                          style={{border:"none",background:"none",padding:0,cursor:"pointer",fontSize:11,fontWeight:700,color:cLike.liked?"#DC2626":P.ink4,display:"flex",alignItems:"center",gap:3}}>
                                          <span>{cLike.liked?"❤️":"🤍"}</span>
                                          {cLike.count>0 ? (
                                            <span onClick={(e)=>{e.stopPropagation();openLikers(c.id,"comment")}} style={{textDecoration:"underline",textDecorationColor:"transparent"}}
                                              onMouseEnter={e=>e.currentTarget.style.textDecorationColor="currentColor"} onMouseLeave={e=>e.currentTarget.style.textDecorationColor="transparent"}>
                                              {cLike.count}
                                            </span>
                                          ) : "Like"}
                                        </button>
                                        <button onClick={()=>startReply(post.id,c.id)}
                                          style={{border:"none",background:"none",padding:0,cursor:"pointer",fontSize:11,fontWeight:700,color:P.ink4}}>
                                          Reply
                                        </button>
                                        {replyCount>0 && (
                                          <button onClick={()=>toggleReplies(c.id)}
                                            style={{border:"none",background:"none",padding:0,cursor:"pointer",fontSize:11,fontWeight:700,color:P.accent}}>
                                            {replyThread?.open ? "Hide replies" : `View ${replyCount} ${replyCount===1?"reply":"replies"}`}
                                          </button>
                                        )}
                                      </div>

                                      {/* Reply input, scoped to this comment */}
                                      {panel.replyingTo===c.id && (
                                        <div style={{display:"flex",gap:6,marginTop:6}}>
                                          <input value={panel.replyText||""} onChange={e=>updateReplyText(post.id,e.target.value)}
                                            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment(post.id,c.id)}if(e.key==="Escape")cancelReply(post.id)}}
                                            placeholder={`Reply to ${cName}…`} autoFocus
                                            style={{flex:1,padding:"6px 10px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",outline:"none",color:P.ink}}/>
                                          <button className="pb" onClick={()=>submitComment(post.id,c.id)} disabled={!panel.replyText?.trim()||panel.submitting}
                                            style={{padding:"6px 12px",background:panel.replyText?.trim()&&!panel.submitting?P.accent:"rgba(0,0,0,0.08)",border:"none",borderRadius:8,color:panel.replyText?.trim()&&!panel.submitting?"#fff":P.ink4,fontSize:11,fontWeight:700}}>
                                            {panel.submitting?"...":"Reply"}
                                          </button>
                                          <button onClick={()=>cancelReply(post.id)}
                                            style={{padding:"6px 10px",background:"none",border:"none",color:P.ink4,fontSize:11,cursor:"pointer"}}>
                                            Cancel
                                          </button>
                                        </div>
                                      )}

                                      {/* Threaded replies, indented under the parent comment */}
                                      {replyThread?.open && (
                                        <div style={{marginTop:8,paddingLeft:14,borderLeft:`2px solid ${P.border}`,display:"flex",flexDirection:"column",gap:8}}>
                                          {replyThread.loading && <div style={{fontSize:11,color:P.ink4}}>Loading replies…</div>}
                                          {!replyThread.loading && (replyThread.items||[]).map((r,ri)=>{
                                            const rName = r.author?.display_name||r.author?.name||r.author?.username||"User"
                                            const rDomain = r.author?.keyword||""
                                            const rElo = r.author?.elo_rating
                                            const rLike = commentLikes[r.id] || { liked:false, count:r.like_count||0 }
                                            return (
                                              <div key={r.id||ri} style={{display:"flex",gap:6}}>
                                                <div style={{width:22,height:22,borderRadius:"50%",background:colorForId(r.author_id||ri.toString()),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{rName[0]?.toUpperCase()}</div>
                                                <div style={{flex:1,minWidth:0}}>
                                                  <div style={{background:"#FFFFFF",borderRadius:8,padding:"6px 9px",border:`1px solid ${P.border}`}}>
                                                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1,flexWrap:"wrap"}}>
                                                      <span style={{fontSize:10.5,fontWeight:700,color:P.ink}}>{rName}</span>
                                                      {rDomain && <span style={{fontSize:9,color:P.ink4}}>· {rDomain}</span>}
                                                      {rElo!=null && <span style={{fontSize:8.5,fontFamily:"'DM Mono',monospace",fontWeight:700,color:P.accent}}>🔥{rElo}</span>}
                                                      <span style={{fontSize:9,color:P.ink4}}>· {timeAgo(r.created_at)}</span>
                                                    </div>
                                                    <div style={{fontSize:11.5,color:P.ink2,lineHeight:1.5}}>{r.content}</div>
                                                  </div>
                                                  <button onClick={()=>toggleCommentLike(r.id,r.like_count)}
                                                    style={{border:"none",background:"none",padding:"2px 0 0",cursor:"pointer",fontSize:10,fontWeight:700,color:rLike.liked?"#DC2626":P.ink4,display:"flex",alignItems:"center",gap:3}}>
                                                    <span>{rLike.liked?"❤️":"🤍"}</span>
                                                    {rLike.count>0 ? (
                                                      <span onClick={(e)=>{e.stopPropagation();openLikers(r.id,"comment")}} style={{textDecoration:"underline",textDecorationColor:"transparent"}}>{rLike.count}</span>
                                                    ) : "Like"}
                                                  </button>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            {/* Add top-level comment */}
                            <div style={{display:"flex",gap:8,marginTop:8}}>
                              <div style={{width:28,height:28,borderRadius:"50%",background:P.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{initials}</div>
                              <input value={panel.text||""} onChange={e=>updateCommentText(post.id,e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment(post.id)}}}
                                placeholder="Add a comment... (Enter to send)"
                                style={{flex:1,padding:"7px 12px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",outline:"none",color:P.ink}}/>
                              <button className="pb" onClick={()=>submitComment(post.id)} disabled={!panel.text?.trim()||panel.submitting}
                                style={{padding:"7px 14px",background:panel.text?.trim()&&!panel.submitting?P.accent:"rgba(0,0,0,0.08)",border:"none",borderRadius:8,color:panel.text?.trim()&&!panel.submitting?"#fff":P.ink4,fontSize:12,fontWeight:700,opacity:panel.submitting?0.7:1}}>
                                {panel.submitting?"...":"Send"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Load more */}
                  {hasMore&&!feedLoading&&(
                    <div style={{padding:"14px",textAlign:"center"}}>
                      <button className="pb" onClick={()=>{const np=page+1;setPage(np);loadFeed(np,true)}}
                        style={{padding:"9px 28px",background:"#FFFFFF",border:`1.5px solid ${P.border}`,borderRadius:99,fontSize:13,fontWeight:600,color:P.ink2}}>
                        Load more posts
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:76}}>

            {/* Domain Pulse — live data via Gemini Search */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:10,fontWeight:800,color:P.ink4,letterSpacing:"0.1em",textTransform:"uppercase"}}>DOMAIN PULSE · {domain.toUpperCase()}</div>
                    {marketInsights && <span style={{fontSize:8,fontWeight:800,color:"#34D399",letterSpacing:"0.06em",background:"#34D39918",padding:"1px 5px",borderRadius:99}}>LIVE</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background: marketInsights?.market_outlook==="Growing"?"#34D399":marketInsights?.market_outlook==="Declining"?"#F87171":"#FCD34D"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:P.ink}}>
                      {insightsLoading ? "Loading…" : (marketInsights?.market_outlook || "Steady")}
                    </span>
                  </div>
                </div>
                <button className="pb" onClick={()=>setShowDomainPicker(true)} style={{fontSize:18,color:P.ink4,background:"transparent",border:"none",padding:4}}>⚙</button>
              </div>

              {insightsErrored && !insightsLoading && (
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,
                  background:"#FEF2F2",border:"1px solid rgba(220,38,38,0.15)",borderRadius:8,
                  padding:"7px 10px",marginBottom:10}}>
                  <span style={{fontSize:10.5,color:"#B91C1C"}}>Signals temporarily unavailable</span>
                  <button className="pb" onClick={loadMarketInsights}
                    style={{fontSize:10,fontWeight:700,color:"#B91C1C",background:"#fff",
                      border:"1px solid rgba(220,38,38,0.25)",borderRadius:99,padding:"3px 9px",cursor:"pointer"}}>
                    ↻ Retry
                  </button>
                </div>
              )}

              {/* Stats grid */}
              {insightsLoading
                ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    {[0,1,2,3].map(i=>(
                      <div key={i} style={{padding:"8px 10px",background:"rgba(0,0,0,0.02)",borderRadius:8}}>
                        <div style={{height:8,background:"#E8E3DA",borderRadius:3,marginBottom:5,width:"60%"}}/>
                        <div style={{height:10,background:"#F3F4F6",borderRadius:3}}/>
                      </div>
                    ))}
                  </div>
                : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    {[{l:"OUTLOOK",v:stats.hiring,c:"#34D399"},{l:"COMPANIES HIRING",v:stats.openRoles,c:P.ink2},{l:"AVG SALARY",v:stats.salary,c:P.ink2},{l:"TRENDING",v:stats.trending,c:P.accent}].map((s,i)=>(
                      <div key={i} style={{padding:"8px 10px",background:"rgba(0,0,0,0.02)",borderRadius:8}}>
                        <div style={{fontSize:9,color:P.ink4,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{s.l}</div>
                        <div style={{fontSize:11,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace",overflow:"hidden",wordBreak:"break-word",lineHeight:1.3}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
              }

              {/* Outlook reason from Gemini */}
              {marketInsights?.outlook_reason && (
                <div style={{fontSize:11,color:P.ink3,lineHeight:1.5,marginBottom:10,padding:"6px 8px",background:"rgba(0,0,0,0.02)",borderRadius:6}}>
                  {marketInsights.outlook_reason}
                </div>
              )}

              <div style={{fontSize:10,fontWeight:700,color:P.ink4,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>
                RISING SKILLS
              </div>
              {trendingTags.length === 0 && (
                <div style={{fontSize:11,color:P.ink4,marginBottom:4}}>
                  {insightsLoading ? "Loading…" : "No rising-skills data available for this domain yet."}
                </div>
              )}
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {trendingTags.map((t,i)=>(
                  <button key={i} className="pb" onClick={()=>setSortTab("liked")}
                    style={{padding:"3px 9px",background:P.accent2,borderRadius:99,border:"none",fontSize:11,fontWeight:600,color:P.accent,cursor:"pointer"}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Peer builders — professional gets no raw ELO numbers (Rule
                #1 applies to peers' scores here too, not just your own), just
                a relevance dot; student keeps the fire+number, which is a
                familiar part of the Arena-driven student experience. */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
              <div style={{fontSize:10,fontWeight:800,color:P.ink4,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>{isProfessional ? "PEOPLE IN YOUR FIELD" : "ELO-MATCHED BUILDERS"}</div>
              {buildersLoading ? (
                <div style={{fontSize:12,color:P.ink4,textAlign:"center",padding:"12px 0"}}>Loading builders...</div>
              ) : builders.length===0 ? (
                <div style={{fontSize:12,color:P.ink4,textAlign:"center",padding:"12px 0"}}>
                  No one else in your ELO range yet — check back as more {domain} builders join.
                </div>
              ) : builders.map((b,i)=>{
                const bName = b.display_name||b.name||"User"
                const bColor = colorForId(b.id)
                return (
                  <div key={b.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<builders.length-1?`1px solid ${P.border}`:"none"}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:bColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{bName[0]?.toUpperCase()}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:P.ink2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bName}</div>
                      <div style={{fontSize:10,color:P.ink4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.keyword||b.path||""}</div>
                    </div>
                    {isProfessional
                      ? <span style={{width:8,height:8,borderRadius:"50%",background:"#34D399",flexShrink:0}} title="Active in your field"/>
                      : <span style={{fontSize:11,fontWeight:700,color:P.accent,fontFamily:"'DM Mono',monospace",flexShrink:0}}>🔥{b.elo_rating||400}</span>
                    }
                  </div>
                )
              })}
            </div>

            {/* Mentors & Coaches preview */}
            {mentors.length>0&&(
              <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:800,color:P.ink4,letterSpacing:"0.1em",textTransform:"uppercase"}}>MENTORS & COACHES</div>
                  <div style={{width:7,height:7,borderRadius:"50%",background:"#34D399"}}/>
                </div>
                {mentors.slice(0,3).map((m,i)=>{
                  const mName = m.display_name||m.profile?.display_name||m.profile?.name||"Mentor"
                  return (
                    <div key={m.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<Math.min(mentors.length,3)-1?`1px solid ${P.border}`:"none"}}>
                      <div style={{position:"relative"}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:colorForId(m.user_id||i.toString()),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{mName[0]?.toUpperCase()}</div>
                        <div style={{position:"absolute",bottom:0,right:0,width:9,height:9,borderRadius:"50%",background:"#34D399",border:"1.5px solid #fff"}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:P.ink}}>{mName}</div>
                        <div style={{fontSize:10,color:P.ink4}}>{m.headline||"Verified Mentor"}</div>
                      </div>
                      <button className="pb" onClick={()=>setFeedTab("mentors")} style={{padding:"4px 10px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:10,fontWeight:600,color:P.ink2}}>View</button>
                    </div>
                  )
                })}
                <button className="pb" onClick={()=>setFeedTab("mentors")} style={{width:"100%",marginTop:10,padding:"8px",background:P.accent2,border:`1px solid ${P.accent}20`,borderRadius:8,fontSize:12,fontWeight:600,color:P.accent}}>
                  See all mentors →
                </button>
              </div>
            )}

            {/* Network stats */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:"12px 16px",boxShadow:P.shadow}}>
              <div style={{display:"flex",justifyContent:"space-around",marginBottom:10}}>
                <button onClick={()=>{setFeedTab("network");setNetworkSubTab("following")}} style={{background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"4px 8px",borderRadius:8}}>
                  <div style={{fontSize:16,fontWeight:800,color:P.accent,fontFamily:"'DM Mono',monospace"}}>{myFollowing.length}</div>
                  <div style={{fontSize:10,color:P.ink4,fontWeight:600,marginTop:1}}>Following</div>
                </button>
                <div style={{width:1,background:P.border}}/>
                <button onClick={()=>{setFeedTab("network");setNetworkSubTab("followers")}} style={{background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"4px 8px",borderRadius:8}}>
                  <div style={{fontSize:16,fontWeight:800,color:P.ink,fontFamily:"'DM Mono',monospace"}}>{myFollowers.length}</div>
                  <div style={{fontSize:10,color:P.ink4,fontWeight:600,marginTop:1}}>Followers</div>
                </button>
                <div style={{width:1,background:P.border}}/>
                <div style={{textAlign:"center",padding:"4px 8px"}}>
                  <div style={{fontSize:16,fontWeight:800,color:P.ink,fontFamily:"'DM Mono',monospace"}}>{pendingSparks.length}</div>
                  <div style={{fontSize:10,color:P.ink4,fontWeight:600,marginTop:1}}>Sparks</div>
                </div>
              </div>
            </div>

            {/* User standing card — Career OS Non-negotiable Rule #1: no bare
                score number ships to a professional-facing screen without a
                plain-language translation (see SKILL_TIER_PHRASES above).
                Student path is unchanged (Arena ELO is a real, visible part
                of the student experience); professional gets the tier
                phrase instead of the raw number, same treatment already
                applied in ProfileSidebar/SettingsPanel. */}
            <div style={{background:`linear-gradient(135deg,${P.accent},#f97316)`,borderRadius:P.r,padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"rgba(255,255,255,0.7)",textTransform:"uppercase",marginBottom:6}}>YOUR STANDING</div>
              {isProfessional ? (
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:"#fff",marginBottom:4}}>{skillTierPhrase(elo)}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginTop:8}}>
                    {[{l:"FOLLOWING",v:myFollowing.length},{l:"FOLLOWERS",v:myFollowers.length}].map((s,i)=>(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:800,color:"#fff",fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,letterSpacing:"0.08em"}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                  {[{l:"ELO",v:elo},{l:"TASKS",v:userData?.arena_completed||0},{l:"STREAK",v:`${userData?.arena_streak||0}d`}].map((s,i)=>(
                    <div key={i} style={{textAlign:"center"}}>
                      <div style={{fontSize:18,fontWeight:800,color:"#fff",fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,letterSpacing:"0.08em"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}


export default function Pulse({ user, userData }) {
  // 2026-07-29: StudentPulse (tabs: Community/Sparks/Network/Mentors/Saved)
  // now also serves the professional path — it was already path-neutral
  // under the hood (pulseApi/nexusApi/skillsApi calls, no student-only
  // backend routes), so rather than maintaining two parallel feed
  // implementations, professional reuses the same tab shell with a handful
  // of path-aware tweaks inside StudentPulse itself (ELO Rule #1 compliance,
  // display-name fallback, peer-search wording — see isProfessional usages
  // below). Authority/institution are org-facing accounts, not individual
  // community members, so they stay on the separate feed below.
  if (userData?.path !== "authority" && userData?.path !== "institution") {
    return <StudentPulse user={user} userData={userData} />
  }

  const [posts,      setPosts]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [offline,    setOffline]    = useState(false)
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Real skills, for personalizing the news feed (2026-07-26 Pulse
  // redesign) — same data source Skills.jsx uses, not a userData shortcut,
  // since skills live in user_skills, not on the profile row.
  const [mySkills, setMySkills] = useState([])
  useEffect(() => {
    skillsApi.list()
      .then(list => setMySkills((list || []).map(s => s.name || s.skill_name).filter(Boolean).slice(0, 8)))
      .catch(() => setMySkills([]))
  }, [])

  const load = useCallback(async (pg=1, append=false) => {
    setLoading(true); setOffline(false)
    try {
      const params = { page:pg, limit:15 }
      if (searchQuery.trim()) params.q = searchQuery.trim()
      const { posts:newPosts, total } = await pulseApi.feed(params)
      setPosts(p => append ? [...p,...(newPosts||[])] : (newPosts||[]))
      setHasMore((pg*15)<(total||0))
    } catch(e) {
      if (e.message?.includes("fetch")||e.message?.includes("network")||e.message?.includes("500")) setOffline(true)
      console.error(e)
    } finally { setLoading(false) }
  }, [searchQuery])

  useEffect(() => { setPage(1); load(1) }, [searchQuery])

  function handleInteract(postId, action, active) {
    const cf = {acknowledge:"acknowledge_count",signal:"signal_count",repost:"repost_count",save:"save_count"}[action]
    if (cf) setPosts(p=>p.map(post=>post.id===postId?{...post,[cf]:(post[cf]||0)+(active?1:-1)}:post))
  }

  return (
    <div style={{ background:T.bg, flex:1, minHeight:0, overflowY:"auto", fontFamily:T.sans, paddingBottom:40 }}>
      <style>{G}</style>

      <div style={{ maxWidth:1800, margin:"0 auto", padding:"20px 32px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"minmax(220px,280px) minmax(0,1fr) minmax(260px,360px)", gap:24, alignItems:"start" }}>

          {/* ── Left sidebar ── */}
          <div style={{ position:"sticky", top:72 }}>
            <ProfileSidebar user={user} userData={userData}/>
          </div>

          {/* ── Center feed ── */}
          <div>
            {offline && <OfflinePill />}

            {/* Composer */}
            <Composer user={user} userData={userData} onPosted={post=>setPosts(p=>[post,...p])}/>

            {/* Search bar */}
            <SearchBar value={searchQuery} onChange={v=>{setSearchQuery(v);setPage(1)}}/>

            {/* Feed */}
            {loading && page===1
              ? <>{Array(3).fill(0).map((_,i)=><SkeletonPost key={i}/>)}</>
              : posts.length===0
                ? <EmptyFeed offline={offline}/>
                : posts.map(post=><PostCard key={post.id} post={post} user={user} onInteract={handleInteract}/>)
            }

            {/* Load more */}
            {hasMore&&!loading&&(
              <div style={{ textAlign:"center", paddingTop:8 }}>
                <button onClick={()=>{const np=page+1;setPage(np);load(np,true)}}
                  style={{ padding:"10px 28px", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:99, fontSize:13, fontWeight:600, color:T.ink2, cursor:"pointer" }}>
                  Load more
                </button>
              </div>
            )}

            {/* Loading more spinner */}
            {loading&&page>1&&<div style={{ padding:20,textAlign:"center" }}><Spin size={24}/></div>}
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ position:"sticky", top:72 }}>
            <RightSidebar user={user} domain={getRoleConfig(userData).label} role={getRoleConfig(userData).label} skills={mySkills}/>
          </div>

        </div>
      </div>
    </div>
  )
}
