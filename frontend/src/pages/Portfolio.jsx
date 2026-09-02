/**
 * Portfolio.jsx — Role-Aware Professional Portfolio
 *
 * Archetype-driven rendering: each role (Frontend, Backend, DevOps, Data,
 * Designer, PM, Founder, Student, Full Stack, Mobile) gets a distinct
 * visual identity, section order, proof emphasis, and recruiter summary.
 *
 * Archetype detection: userData.archetype > path > keyword/job_role > ELO
 */

import { useEffect, useState, useRef } from "react"
import { getPortfolioConfig, ARCHETYPES } from "../config/portfolioArchetypes"
import { userDoc } from "../lib/db"
import { supabase } from "../lib/supabase"
import { portfolioApi } from "../lib/api"
import { ELO_TIERS as CANONICAL_TIERS } from "../theme"
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from "recharts"

// ─── Design tokens — GenZ premium dark ───────────────────────────────────────
const C = {
  bg:      "#07080F",           // near-black with deep indigo tint
  bgCard:  "rgba(255,255,255,0.04)",
  bgCard2: "rgba(255,255,255,0.07)",
  bgInner: "rgba(0,0,0,0.3)",
  ink:     "#F4F1FF",           // slight purple-tinted white
  ink2:    "#C8C4D8",
  ink3:    "#7E7A8F",
  ink4:    "#4A4658",
  border:  "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
  borderStr:"rgba(255,255,255,0.24)",
  blue:    "#4F8EF7",
  blue2:   "#7FB3FF",
  blue3:   "rgba(79,142,247,0.14)",
  teal:    "#00D4FF",
  teal2:   "#44E4FF",
  teal3:   "rgba(0,212,255,0.12)",
  green:   "#00E5A0",
  green2:  "rgba(0,229,160,0.12)",
  amber:   "#FFB800",
  amber2:  "rgba(255,184,0,0.12)",
  red:     "#FF4757",
  red2:    "rgba(255,71,87,0.12)",
  purple:  "#A855F7",
  purple2: "rgba(168,85,247,0.14)",
  brand:   "#7C3AED",           // deep violet — GenZ brand
  brand2:  "rgba(124,58,237,0.15)",
  pink:    "#EC4899",
  pink2:   "rgba(236,72,153,0.12)",
  shadow:  "0 4px 16px rgba(0,0,0,0.5)",
  shadow2: "0 20px 60px rgba(0,0,0,0.7)",
  shadowGlow: (col) => `0 0 32px ${col}35, 0 4px 16px rgba(0,0,0,0.5)`,
  glass:   "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.10)",
  // legacy aliases
  surface: "rgba(255,255,255,0.04)",
  surface2:"rgba(255,255,255,0.07)",
}

const PATH_CONFIG = {
  student:      { label:"Student",      icon:"🎓",
    heroBg:"radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.65) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.4) 0%, transparent 45%), radial-gradient(ellipse at 60% 80%, rgba(236,72,153,0.25) 0%, transparent 40%), #07080F",
    accent:"#A855F7" },
  professional: { label:"Professional", icon:"💼",
    heroBg:"radial-gradient(ellipse at 15% 50%, rgba(0,212,255,0.55) 0%, transparent 50%), radial-gradient(ellipse at 85% 30%, rgba(0,229,160,0.35) 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, rgba(79,142,247,0.3) 0%, transparent 40%), #07080F",
    accent:"#00D4FF" },
  authority:    { label:"Expert",       icon:"⭐",
    heroBg:"radial-gradient(ellipse at 25% 40%, rgba(168,85,247,0.7) 0%, transparent 50%), radial-gradient(ellipse at 75% 60%, rgba(236,72,153,0.45) 0%, transparent 45%), radial-gradient(ellipse at 55% 15%, rgba(0,212,255,0.2) 0%, transparent 40%), #07080F",
    accent:"#EC4899" },
}

// ─── Skill icon mapping (skillicons.dev slugs) ────────────────────────────────
const SKILL_SLUG = {
  // Languages
  "python":"python","javascript":"js","typescript":"ts","java":"java",
  "c++":"cpp","c#":"cs","c":"c","go":"go","golang":"go","rust":"rust",
  "swift":"swift","kotlin":"kotlin","dart":"dart","php":"php","ruby":"ruby",
  "r":"r","scala":"scala","elixir":"elixir","perl":"perl","lua":"lua",
  "julia":"julia","matlab":"matlab","haskell":"haskell","clojure":"clojure",
  "fortran":"fortran","crystal":"crystal","nim":"nim","zig":"zig","v":"v",
  "solidity":"solidity","wasm":"wasm","webassembly":"wasm",
  // Web
  "html":"html","css":"css","sass":"sass","less":"less",
  "react":"react","vue":"vue","angular":"angular","svelte":"svelte",
  "next.js":"nextjs","nextjs":"nextjs","nuxtjs":"nuxtjs","nuxt":"nuxtjs",
  "gatsby":"gatsby","remix":"remix","astro":"astro","alpinejs":"alpinejs",
  "jquery":"jquery","tailwind":"tailwind","tailwindcss":"tailwind",
  "bootstrap":"bootstrap","styledcomponents":"styledcomponents","emotion":"emotion",
  "three.js":"threejs","threejs":"threejs","d3.js":"d3","d3":"d3",
  "redux":"redux","graphql":"graphql","apollo":"apollo","pug":"pug",
  // Backend / runtime
  "node.js":"nodejs","nodejs":"nodejs","deno":"deno","bun":"bun",
  "express":"express","fastapi":"fastapi","django":"django","flask":"flask",
  "spring":"spring","laravel":"laravel","rails":"ruby","adonis":"adonis",
  "tauri":"tauri","electron":"electron","webpack":"webpack","vite":"vite",
  "babel":"babel","jest":"jest","selenium":"selenium","sequelize":"sequelize",
  "prisma":"prisma","hibernate":"hibernate","maven":"maven","gradle":"gradle",
  // Cloud & DevOps
  "docker":"docker","kubernetes":"kubernetes","aws":"aws","gcp":"gcp","azure":"azure",
  "terraform":"terraform","ansible":"ansible","cloudflare":"cloudflare",
  "netlify":"netlify","heroku":"heroku","firebase":"firebase","supabase":"supabase",
  "appwrite":"appwrite","openstack":"openstack","workers":"workers",
  "prometheus":"prometheus","sentry":"sentry","nginx":"nginx","bash":"bash",
  "linux":"linux","ubuntu":"ubuntu","debian":"debian","arch":"arch","bsd":"bsd",
  "powershell":"powershell","vim":"vim","git":"git","github":"github","gitlab":"gitlab",
  // Databases
  "postgresql":"postgres","postgres":"postgres","mysql":"mysql","sqlite":"sqlite",
  "mongodb":"mongodb","redis":"redis","dynamodb":"dynamodb","cassandra":"cassandra",
  "elasticsearch":"elasticsearch","kafka":"kafka","planetscale":"planetscale",
  "sql":"sqlite",
  // AI / ML — map to closest visual match
  "tensorflow":"tensorflow","pytorch":"pytorch",
  "machine learning":"tensorflow","deep learning":"pytorch",
  "artificial intelligence":"tensorflow","ai":"tensorflow","ml":"tensorflow",
  "pandas":"py","numpy":"py","matplotlib":"py","seaborn":"py",
  "jupyter":"py","anaconda":"anaconda","scikit-learn":"py","sklearn":"py",
  "scipy":"py","statsmodels":"py",
  // Data / Analytics — map best-fit
  "power bi":"visualstudio","tableau":"visualstudio",
  "excel":"visualstudio","google sheets":"visualstudio",
  "spark":"scala","apache spark":"scala","hadoop":"java","airflow":"py",
  "dbt":"sqlite","snowflake":"azure","databricks":"py","bigquery":"gcp",
  "looker":"gcp","redshift":"aws",
  // Tools / Design
  "figma":"figma","xd":"xd","sketchup":"sketchup","blender":"blender",
  "unity":"unity","unreal":"unreal","godot":"godot","gamemaker":"gamemakerstudio",
  "postman":"postman","vscode":"vscode","idea":"idea","eclipse":"eclipse",
  "rider":"rider","sublime":"sublime","atom":"atom",
  "notion":"notion","obsidian":"obsidian","stackoverflow":"stackoverflow",
  // Mobile
  "flutter":"flutter","react native":"react","android":"android","ios":"swift",
  // Other
  "regex":"regex","latex":"latex","processing":"processing","processing.js":"processing",
  "replit":"replit","codepen":"codepen","devto":"devto",
}

// Color palettes for generated logos — 10 vibrant options
const LOGO_GRADIENTS = [
  ["#FF6B6B","#FF8E53"],["#4ECDC4","#44CF6C"],["#A855F7","#EC4899"],
  ["#00D4FF","#0066FF"],["#FFB347","#FF6B35"],["#11998e","#38ef7d"],
  ["#FC466B","#3F5EFB"],["#f7971e","#ffd200"],["#8360c3","#2ebf91"],
  ["#ff9966","#ff5e62"],
]
function logoColors(name) {
  let h = 0
  for (const ch of (name||"")) h = (h * 31 + ch.charCodeAt(0)) & 0xffff
  return LOGO_GRADIENTS[h % LOGO_GRADIENTS.length]
}
function skillAbbr(name) {
  const words = (name||"").split(/[\s\-_\/\.]+/).filter(Boolean)
  if (words.length >= 2) return words.map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3)
  return (name||"").slice(0,3).toUpperCase()
}

// ── 3D Generated logo for skills without a skillicons.dev entry ───────────────
function GeneratedSkillIcon({ name, size=22 }) {
  const abbr = skillAbbr(name)
  const [c1,c2] = logoColors(name)
  const fs   = abbr.length <= 2 ? Math.round(size*0.46) : Math.round(size*0.33)
  const r    = Math.round(size * 0.24)
  return (
    <div style={{
      width:size, height:size, borderRadius:r,
      // Base gradient — slightly angled for 3D feel
      background:`linear-gradient(145deg, ${c1} 0%, ${c2} 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      position:"relative", flexShrink:0, userSelect:"none", overflow:"hidden",
      // 3D depth: top-left highlight + drop shadow + bottom-right shadow
      boxShadow:`
        inset 0 1px 2px rgba(255,255,255,0.40),
        inset 0 -2px 4px rgba(0,0,0,0.35),
        0 6px 18px rgba(0,0,0,0.55),
        0 2px 6px rgba(0,0,0,0.45),
        0 1px 0px rgba(255,255,255,0.08)
      `,
      border:`1px solid rgba(255,255,255,0.14)`,
    }}>
      {/* Top specular gleam */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:"42%",
        background:"linear-gradient(180deg,rgba(255,255,255,0.28) 0%,transparent 100%)",
        borderRadius:`${r}px ${r}px 0 0`, pointerEvents:"none",
      }}/>
      {/* Bottom dark edge */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0, height:"20%",
        background:"rgba(0,0,0,0.22)", borderRadius:`0 0 ${r}px ${r}px`,
        pointerEvents:"none",
      }}/>
      <span style={{
        position:"relative", zIndex:1,
        fontFamily:"'DM Mono',monospace", fontSize:fs, fontWeight:900, color:"#fff",
        textShadow:"0 1px 4px rgba(0,0,0,0.7)", letterSpacing:"-0.5px",
      }}>
        {abbr}
      </span>
    </div>
  )
}

function getSkillIcon(name) {
  const slug = SKILL_SLUG[(name||"").toLowerCase().trim()]
  if (!slug) return null
  return `https://skillicons.dev/icons?i=${slug}&theme=dark`
}

// Returns a React element — skillicons.dev img with 3D wrapper, or generated logo
function SkillIconEl({ name, size=22 }) {
  const [failed, setFailed] = useState(false)
  const src = getSkillIcon(name)
  const r = Math.round(size * 0.22)
  if (!src || failed) return <GeneratedSkillIcon name={name} size={size}/>
  return (
    <div style={{
      width:size, height:size, borderRadius:r,
      flexShrink:0, position:"relative", overflow:"hidden",
      boxShadow:`
        inset 0 1px 1px rgba(255,255,255,0.18),
        0 6px 18px rgba(0,0,0,0.55),
        0 2px 5px rgba(0,0,0,0.4)
      `,
      border:"1px solid rgba(255,255,255,0.10)",
    }}>
      <img src={src} alt={name} style={{width:size,height:size,display:"block"}}
        onError={()=>setFailed(true)}/>
      {/* Specular top gleam over real icon too */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:"35%",
        background:"linear-gradient(180deg,rgba(255,255,255,0.14) 0%,transparent 100%)",
        pointerEvents:"none",
      }}/>
    </div>
  )
}

// Tier name/boundary sourced from ../theme's canonical ELO_TIERS (Rookie→Elite);
// this page's own color palette (C.*) is preserved by recoloring the canonical
// tiers rather than importing them as-is.
const TIER_COLOR = {
  Rookie:       C.ink4,   // was Beginner's muted gray
  Apprentice:   C.green,
  Practitioner: C.blue,   // was Proficient's blue
  Expert:       C.purple,
  Master:       C.amber,  // was Developing's amber
  Elite:        C.red,    // was Elite's red, unchanged
}
const ELO_TIERS = CANONICAL_TIERS.map(t => ({ ...t, color: TIER_COLOR[t.label] }))
const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

// Professional-path career stage label (2026-07-26) — deliberately decoupled
// from the Arena ELO tier system above. Professionals have no Arena
// challenges, so ELO_TIERS/getTier() would either show a fabricated default
// (untouched profiles get a static elo_rating=800 -> "Proficient", implying
// earned performance that never happened) or reference "Arena", which
// doesn't exist on this path. This is driven only by a real, self-reported-
// but-verifiable field (years of experience), never a game-style score.
const PRO_STAGE = [
  { min:0, label:"Emerging Professional" },
  { min:1, label:"Early-Career" },
  { min:4, label:"Mid-Career" },
  { min:8, label:"Senior" },
]
const getProStage = years => [...PRO_STAGE].reverse().find(s => (years||0) >= s.min) || PRO_STAGE[0]
// CSS clamp helper for responsive font sizes
const clamp = (minPx, vw, maxPx) => `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`

const DIFF = {
  Easy:   { color:C.green,  bg:C.green2 },
  Medium: { color:C.amber,  bg:C.amber2 },
  Hard:   { color:C.red,    bg:C.red2   },
  Expert: { color:C.purple, bg:C.purple2},
}

const fmt     = iso => { if(!iso) return ""; const d=new Date(iso); return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) }
const fmtFull = iso => { if(!iso) return ""; const d=new Date(iso); return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) }
const gradeFor = s => s>=90?"A+":s>=80?"A":s>=70?"B+":s>=60?"B":s>=50?"C":"D"
const scoreColor = s => s>=80?C.green:s>=60?C.amber:s>=40?C.red:C.ink4

// ─── Reusable components ───────────────────────────────────────────────────────

function Avatar({ name, url, size=80, fontSize=28 }) {
  if (url) return <img src={url} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
  const initials = (name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"linear-gradient(135deg,#2563EB,#0F766E)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize, fontWeight:800, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  )
}

function DiffBadge({ diff }) {
  const d = DIFF[diff] || DIFF.Medium
  return <span style={{ fontSize:11, fontWeight:700, color:d.color, background:d.bg, padding:"2px 8px", borderRadius:99 }}>{diff}</span>
}

function ScoreRing({ score, size=48 }) {
  const r = (size-8)/2, circ = 2*Math.PI*r, fill=(score/100)*circ, col=scoreColor(score)
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={`${fill} ${circ-fill}`} strokeLinecap="round" />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:12, fontWeight:800, color:col }}>
        {score}
      </div>
    </div>
  )
}

function Card({ children, style={}, accent=null }) {
  return (
    <div className="pf-card" style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: 24,
      border: `1px solid rgba(255,255,255,0.10)`,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      padding: "28px 32px",
      position: "relative",
      overflow: "hidden",
      ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
      ...style,
    }}>
      {accent && <div className="pf-decor" style={{
        position:"absolute", top:0, left:0, right:0, height:120,
        background:`linear-gradient(180deg, ${accent}10 0%, transparent 100%)`,
        pointerEvents:"none", borderRadius:"24px 24px 0 0",
      }}/>}
      <div style={{ position:"relative", zIndex:1 }}>{children}</div>
    </div>
  )
}

function SectionTitle({ icon, title, sub, accent=C.blue }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8,
        background:`${accent}14`, border:`1px solid ${accent}30`,
        borderRadius:99, padding:"5px 14px 5px 10px", marginBottom:sub?8:0 }}>
        <span style={{ fontSize:14 }}>{icon}</span>
        <span style={{ fontSize:10, fontWeight:900, color:accent, letterSpacing:1.8, textTransform:"uppercase" }}>
          {title}
        </span>
      </div>
      {sub && <p style={{ margin:"6px 0 0", fontSize:13, color:C.ink3, lineHeight:1.6 }}>{sub}</p>}
    </div>
  )
}

function StatChip({ icon, value, label, color=C.blue }) {
  return (
    <div style={{
      textAlign:"center", padding:"20px 16px",
      background:"rgba(255,255,255,0.05)",
      backdropFilter:"blur(20px)",
      WebkitBackdropFilter:"blur(20px)",
      borderRadius:18,
      border:`1px solid rgba(255,255,255,0.10)`,
      borderTop:`2px solid ${color}`,
      boxShadow:`0 8px 32px rgba(0,0,0,0.4), 0 0 0 0 ${color}00`,
      minWidth:90,
      flex:1,
      position:"relative", overflow:"hidden",
      transition:"transform 0.2s, box-shadow 0.2s",
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 65%)`,
        pointerEvents:"none",
      }}/>
      <div style={{ fontSize:22, marginBottom:6, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:900, color, fontFamily:"'DM Mono',monospace", lineHeight:1.1,
        textShadow:`0 0 20px ${color}60` }}>{value}</div>
      <div style={{ fontSize:9, color:C.ink3, marginTop:6, fontWeight:800, textTransform:"uppercase", letterSpacing:1.2 }}>{label}</div>
    </div>
  )
}

function SkillBadge({ label, pct, color=C.blue }) {
  const p = Math.min(100, Math.max(0, pct))
  const ring = 2 * Math.PI * 20
  const filled = (p / 100) * ring
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      background:"linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
      border:`1px solid rgba(255,255,255,0.12)`,
      borderTop:`1px solid rgba(255,255,255,0.20)`,
      borderRadius:16, padding:"11px 14px", marginBottom:8,
      backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
      position:"relative", overflow:"hidden",
      boxShadow:`
        0 2px 0 rgba(255,255,255,0.06) inset,
        0 -1px 0 rgba(0,0,0,0.3) inset,
        0 8px 24px rgba(0,0,0,0.4),
        0 2px 8px rgba(0,0,0,0.3),
        0 0 0 1px rgba(0,0,0,0.2)
      `,
      transition:"transform 0.15s ease, box-shadow 0.15s ease",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 2px 0 rgba(255,255,255,0.06) inset,0 -1px 0 rgba(0,0,0,0.3) inset,0 16px 36px rgba(0,0,0,0.5),0 4px 12px ${color}25,0 0 0 1px ${color}30`}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=`0 2px 0 rgba(255,255,255,0.06) inset,0 -1px 0 rgba(0,0,0,0.3) inset,0 8px 24px rgba(0,0,0,0.4),0 2px 8px rgba(0,0,0,0.3),0 0 0 1px rgba(0,0,0,0.2)`}}
    >
      {/* Top specular highlight */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",
        background:"linear-gradient(180deg,rgba(255,255,255,0.06) 0%,transparent 100%)",
        pointerEvents:"none",borderRadius:"16px 16px 0 0"}}/>
      {/* Left accent bar */}
      <div style={{position:"absolute",left:0,top:"15%",bottom:"15%",width:3,
        background:`linear-gradient(180deg,${color},${color}44)`,
        borderRadius:"0 3px 3px 0",boxShadow:`0 0 8px ${color}60`}}/>
      {/* Icon inside circular progress ring */}
      <div style={{ position:"relative", width:46, height:46, flexShrink:0 }}>
        <svg width="46" height="46" style={{ transform:"rotate(-90deg)", position:"absolute", top:0, left:0 }}>
          <circle cx="23" cy="23" r="20" fill="none" stroke={`${color}18`} strokeWidth="3.5"/>
          <circle cx="23" cy="23" r="20" fill="none" stroke={`${color}30`} strokeWidth="3.5"
            strokeDasharray={`${ring} 0`} strokeLinecap="round"/>
          <circle cx="23" cy="23" r="20" fill="none" stroke={color} strokeWidth="3.5"
            strokeDasharray={`${filled} ${ring}`} strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 5px ${color})` }}/>
        </svg>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}>
          <SkillIconEl name={label} size={22}/>
        </div>
      </div>
      {/* Label + bar */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
          <span className="pf-skill-label" style={{ fontSize:13, fontWeight:700, color:C.ink, whiteSpace:"nowrap", overflow:"hidden",
            textOverflow:"ellipsis", maxWidth:130 }}>{label}</span>
          <span style={{
            fontSize:11, fontWeight:900, color:"#fff",
            fontFamily:"'DM Mono',monospace", flexShrink:0, marginLeft:6,
            background:`linear-gradient(135deg, ${color}, ${color}aa)`,
            padding:"2px 7px", borderRadius:6,
            boxShadow:`0 2px 8px ${color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}>{p}%</span>
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:99,
          boxShadow:"inset 0 1px 2px rgba(0,0,0,0.3)" }}>
          <div style={{ height:"100%", width:`${p}%`,
            background:`linear-gradient(90deg, ${color}77, ${color})`,
            borderRadius:99,
            boxShadow:`0 0 12px ${color}60, 0 0 4px ${color}80`,
            transition:"width 1s cubic-bezier(0.4,0,0.2,1)",
            position:"relative",
          }}>
            {/* Shimmer on bar */}
            <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,
              background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)",
              borderRadius:99}}/>
          </div>
        </div>
      </div>
    </div>
  )
}

// keep alias for any remaining direct SkillBar calls
const SkillBar = SkillBadge

function SkillGrid({ skills, aConfig, max=12 }) {
  const [expanded, setExpanded] = useState(false)
  const accent = aConfig?.palette?.accent || C.blue
  const tag    = aConfig?.palette?.tag    || C.teal
  const visible = expanded ? skills : skills.slice(0, max)
  const hasMore = skills.length > max
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {visible.map((s,i) => (
          <SkillBadge key={i} label={s.skill} pct={s.percentage}
            color={i%2===0 ? accent : tag} />
        ))}
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(e=>!e)} style={{
          marginTop:12, width:"100%", padding:"9px 0",
          background:"rgba(255,255,255,0.04)", border:`1px solid rgba(255,255,255,0.10)`,
          borderRadius:10, color:C.ink3, fontSize:12, fontWeight:700,
          cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:0.3,
        }}>
          {expanded ? `▲ Show less` : `▼ Show all ${skills.length} skills`}
        </button>
      )}
    </div>
  )
}

function TLine({ icon, title, sub, score, time, meta, last }) {
  return (
    <div style={{ display:"flex", gap:14, position:"relative" }}>
      {!last && <div style={{ position:"absolute", left:19, top:40, bottom:0, width:2, background:C.border2, zIndex:0 }} />}
      <div style={{ width:40, height:40, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, zIndex:1 }}>
        {icon}
      </div>
      <div style={{ flex:1, paddingBottom: last?0:20, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.ink, flex:1 }}>{title}</span>
          {score!=null && <ScoreRing score={score} size={44} />}
        </div>
        {sub && <div style={{ fontSize:13, color:C.ink3, marginTop:4, lineHeight:1.6 }}>{sub}</div>}
        <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6, flexWrap:"wrap" }}>
          {meta}
          {time && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmt(time)}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Full-screen detail modal for a completed challenge ───────────────────────
function ChallengeDetailModal({ t, onClose }) {
  const col = scoreColor(t.score)
  // close on backdrop click or Escape
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const answerStr = t.userAnswer
    ? (typeof t.userAnswer === "object" ? JSON.stringify(t.userAnswer, null, 2) : t.userAnswer)
    : null

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:C.bg, border:`1px solid ${C.border2}`, borderRadius:20,
          width:"100%", maxWidth:760, maxHeight:"92vh", overflow:"hidden",
          boxShadow:"0 40px 120px rgba(0,0,0,0.7)", display:"flex", flexDirection:"column" }}
      >
        {/* ── Modal header — NOT sticky-within-scroll: it's a normal
            flex-shrink-0 sibling of the scrollable body below, outside the
            scroll region entirely, so it can never visually overlap content
            scrolling underneath it (the previous sticky-inside-the-scroll-
            container approach clipped content, see the footer's comment
            below for the full explanation — same fix, same reason). ── */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", gap:16, flexShrink:0, background:C.bg, borderRadius:"20px 20px 0 0" }}>
          <ScoreRing score={t.score} size={56} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:800, color:C.ink, marginBottom:5, lineHeight:1.3 }}>{t.title}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <DiffBadge diff={t.difficulty} />
              {t.domain && t.domain !== "dsa" && (
                <span style={{ fontSize:11, color:C.teal, fontWeight:700, background:C.teal3, padding:"2px 8px", borderRadius:99 }}>{t.domain}</span>
              )}
              {t.attempts > 1 && (
                <span style={{ fontSize:11, color:C.amber, fontWeight:700, background:C.amber2, padding:"2px 8px", borderRadius:99 }}>🔁 {t.attempts} attempt{t.attempts>1?"s":""}</span>
              )}
              {t.completedAt && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmtFull(t.completedAt)}</span>}
            </div>
          </div>
          {/* Score + ELO + Close */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:26, fontWeight:900, color:col, fontFamily:"monospace", lineHeight:1 }}>{gradeFor(t.score)}</div>
              <div style={{ fontSize:11, color:col, fontWeight:700, marginTop:1 }}>{t.score}/100</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:C.blue, fontFamily:"monospace", lineHeight:1 }}>+{t.eloDelta}</div>
              <div style={{ fontSize:9, color:C.ink4, fontWeight:700, letterSpacing:0.5, marginTop:1 }}>ELO</div>
            </div>
            <button onClick={onClose}
              style={{ width:40, height:40, borderRadius:"50%", background:"rgba(239,68,68,0.15)",
                border:"2px solid rgba(239,68,68,0.5)",
                color:"#EF4444", fontSize:20, fontWeight:900, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"inherit", marginLeft:4, lineHeight:1, flexShrink:0 }}>✕</button>
          </div>
        </div>

        {/* ── Scrollable body — the ONLY scrolling region in this modal.
            flex:1 makes it fill whatever space is left between the
            fixed-height header above and footer below; overflowY:auto
            scrolls just this region. Previously overflowY:auto was on the
            OUTER modal box, with the header/footer set to position:sticky
            inside it — sticky elements reserve no extra clearance in the
            surrounding scroll content, so the sticky footer's own height
            visually overlapped (clipped) the bottom of Result Summary /
            AI Feedback for most of the scroll, and the sticky header did
            the same to whatever content started at the very top. Moving
            header/footer entirely outside the scroll region removes the
            overlap structurally instead of trying to pad around it. ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Scenario */}
          {t.scenario && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.teal, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>📋 Challenge Scenario</div>
              <div style={{ fontSize:13, color:C.ink2, lineHeight:1.8, background:C.surface, padding:"14px 18px",
                borderRadius:12, border:`1px solid ${C.border}`, whiteSpace:"pre-wrap" }}>
                {t.scenario}
              </div>
            </div>
          )}

          {/* Objective */}
          {t.objective && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.amber, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>🎯 Objective</div>
              <div style={{ fontSize:13, color:C.ink2, lineHeight:1.8, background:C.surface, padding:"14px 18px",
                borderRadius:12, border:`1px solid ${C.border}` }}>
                {t.objective}
              </div>
            </div>
          )}

          {/* Submitted Solution — FULL, no truncation */}
          {answerStr && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.blue2, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>
                💻 Submitted Solution <span style={{ fontSize:9, color:C.ink4, fontWeight:600, textTransform:"none", letterSpacing:0 }}>({answerStr.length.toLocaleString()} characters)</span>
              </div>
              <pre style={{ margin:0, fontSize:11.5, color:"#E8E3DA", background:"#0B1120",
                padding:"16px 18px", borderRadius:12, border:`1px solid ${C.border2}`,
                whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'DM Mono','DM Mono',monospace",
                lineHeight:1.65, maxHeight:380, overflowY:"auto" }}>
                {answerStr}
              </pre>
            </div>
          )}

          {/* Program output — the field name (expectedOutput) predates this
              being wired to real data; what's actually shown here is the
              output the submission produced, not a reference answer, so
              the label says "Program Output" to match History's own
              wording for the same underlying data. */}
          {t.expectedOutput && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>📤 Program Output</div>
              <pre style={{ margin:0, fontSize:11.5, color:C.ink2, background:C.green2,
                padding:"14px 18px", borderRadius:12, border:`1px solid rgba(34,197,94,0.2)`,
                whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'DM Mono','DM Mono',monospace",
                lineHeight:1.65, maxHeight:200, overflowY:"auto" }}>
                {t.expectedOutput}
              </pre>
            </div>
          )}

          {/* AI Feedback */}
          {t.feedback && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:C.purple, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>🤖 AI Feedback</div>
              <div style={{ fontSize:13, color:C.ink2, lineHeight:1.8, background:C.purple2,
                padding:"14px 18px", borderRadius:12, border:`1px solid rgba(167,139,250,0.2)`,
                borderLeft:`3px solid ${C.purple}` }}>
                {t.feedback}
              </div>
            </div>
          )}

          {/* Full stats row */}
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:C.ink4, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>📊 Result Summary</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
              {[
                { label:"Score",    value:`${t.score}/100`,  color:col      },
                { label:"Grade",    value:gradeFor(t.score), color:col      },
                { label:"ELO Earned",value:`+${t.eloDelta}`, color:C.blue   },
                { label:"Attempts", value: String(t.attempts||1),  color:C.amber  },
                { label:"Completed",value:fmt(t.completedAt), color:C.ink3  },
              ].filter(s=>s.value).map((s,i)=>(
                <div key={i} style={{ padding:"10px 8px", background:C.surface2, borderRadius:10,
                  border:`1px solid ${C.border}`, textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
                  <div style={{ fontSize:9, color:C.ink4, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:0.8, marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer close bar — a normal flex-shrink-0 sibling of the
            scrollable body above, outside the scroll region (see that
            div's comment for why this moved out of sticky-within-scroll). ── */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"center", flexShrink:0, background:C.bg, borderRadius:"0 0 20px 20px" }}>
          <button onClick={onClose} style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"10px 32px", borderRadius:99,
            background:"rgba(239,68,68,0.12)", border:"1.5px solid rgba(239,68,68,0.4)",
            color:"#EF4444", fontSize:14, fontWeight:700, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", letterSpacing:0.3,
          }}>
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact challenge card — click "View Details" to open full modal
function ChallengeCard({ t, last }) {
  const [showModal, setShowModal] = useState(false)
  const col = scoreColor(t.score)
  return (
    <div style={{ position:"relative" }}>
      {!last && <div style={{ position:"absolute", left:19, top:52, bottom:0, width:2,
        background:C.border2, zIndex:0 }} />}
      <div style={{ border:`1px solid ${C.border2}`, borderRadius:14, overflow:"hidden",
        background:C.surface2, boxShadow:C.shadow, marginBottom: last?0:16, position:"relative", zIndex:1 }}>

        {/* Header row */}
        <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
          <ScoreRing score={t.score} size={48} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:3 }}>{t.title}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <DiffBadge diff={t.difficulty} />
              {t.domain && t.domain !== "dsa" && (
                <span style={{ fontSize:11, color:C.teal, fontWeight:700, background:C.teal3,
                  padding:"2px 8px", borderRadius:99 }}>{t.domain}</span>
              )}
              {t.attempts > 1 && (
                <span style={{ fontSize:11, color:C.amber, fontWeight:700, background:C.amber2,
                  padding:"2px 8px", borderRadius:99 }}>🔁 {t.attempts} attempt{t.attempts>1?"s":""}</span>
              )}
              {t.completedAt && <span style={{ fontSize:11, color:C.ink4 }}>📅 {fmt(t.completedAt)}</span>}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ fontSize:22, fontWeight:900, color:col, fontFamily:"monospace" }}>{gradeFor(t.score)}</span>
              <span style={{ fontSize:12, color:col, fontWeight:700 }}>{t.score}/100</span>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:t.eloDelta<0?C.red:C.blue }}>{t.eloDelta>=0?"+":""}{t.eloDelta} ELO</div>
            <button onClick={() => setShowModal(true)}
              style={{ padding:"6px 14px", background:"rgba(59,130,246,0.12)",
                border:"1px solid rgba(59,130,246,0.35)",
                borderRadius:8, color:C.blue2, fontSize:11, fontWeight:700, cursor:"pointer",
                fontFamily:"inherit", letterSpacing:0.3 }}>
              View Details →
            </button>
          </div>
        </div>

        {/* Compact preview of scenario */}
        {t.scenario && (
          <div style={{ padding:"0 18px 14px" }}>
            <div style={{ fontSize:11, color:C.ink4, lineHeight:1.6,
              background:C.surface, padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`,
              overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {t.scenario}
            </div>
          </div>
        )}
      </div>

      {showModal && <ChallengeDetailModal t={t} onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ── Redesigned Arena Challenges section ──────────────────────────────────────
// Compact, recruiter-friendly: stats dashboard + top 3 featured + compact grouped list
function ArenaChallengesSection({ tasks, commonTasks, domainTasks, avgScore, aConfig }) {
  const [showAllCommon, setShowAllCommon] = useState(false)
  const [expandedDomains, setExpandedDomains] = useState({})
  const [modalTask, setModalTask] = useState(null)
  const ROWS_PREVIEW = 6

  if (tasks.length === 0) return null

  const accent = aConfig?.palette?.accent || C.blue
  const totalElo = tasks.reduce((s, t) => s + (t.eloDelta || 0), 0)
  const hardPlus = tasks.filter(t => t.difficulty === "Hard" || t.difficulty === "Expert").length

  // Top 3 by score — featured "best performances"
  const featured = [...tasks].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
  const featuredIds = new Set(featured.map(t => t.id))

  // Remaining common tasks beyond featured
  const remainingCommon = commonTasks.filter(t => !featuredIds.has(t.id))

  // Domain tasks grouped by domain
  const domainGroups = {}
  domainTasks.filter(t => !featuredIds.has(t.id)).forEach(t => {
    const key = t.domain || "Other"
    if (!domainGroups[key]) domainGroups[key] = []
    domainGroups[key].push(t)
  })

  const toggleDomain = key => setExpandedDomains(p => ({ ...p, [key]: !p[key] }))

  // Compact single-line row (click opens modal)
  const CompactRow = ({ t }) => {
    const col = scoreColor(t.score)
    const dc = DIFF[t.difficulty] || DIFF.Medium
    return (
      <div
        onClick={() => setModalTask(t)}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
          borderRadius:8, cursor:"pointer", borderLeft:`3px solid ${dc.color}`,
          transition:"background 0.15s", marginBottom:2 }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.ink2, whiteSpace:"nowrap",
            overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</div>
          {t.completedAt && <div style={{ fontSize:9, color:C.ink4, marginTop:1 }}>{fmt(t.completedAt)}</div>}
        </div>
        <span style={{ fontSize:10, fontWeight:700, color:dc.color, background:dc.bg,
          padding:"2px 7px", borderRadius:99, flexShrink:0 }}>{t.difficulty}</span>
        <span style={{ fontSize:13, fontWeight:900, color:col, fontFamily:"monospace",
          flexShrink:0, minWidth:36, textAlign:"right" }}>{t.score}</span>
        <span style={{ fontSize:10, fontWeight:700, color:t.eloDelta<0?C.red:C.blue,
          flexShrink:0, minWidth:44, textAlign:"right" }}>{t.eloDelta>=0?"+":""}{t.eloDelta}</span>
      </div>
    )
  }

  return (
    <>
      {/* Stats dashboard */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:22 }}>
        {[
          { label:"Completed",  value:tasks.length,   icon:"⚔️",  color:accent   },
          { label:"Avg Score",  value:`${avgScore}%`, icon:"📊",  color:C.green  },
          { label:"ELO Earned", value:`+${totalElo}`, icon:"⚡",  color:C.amber  },
          { label:"Hard+",      value:hardPlus,       icon:"🔥",  color:C.red    },
        ].map((s, i) => (
          <div key={i} style={{ background:`linear-gradient(135deg,${s.color}18,${s.color}06)`,
            border:`1px solid ${s.color}30`, borderRadius:12, padding:"12px 8px", textAlign:"center" }}>
            <div style={{ fontSize:15, marginBottom:3 }}>{s.icon}</div>
            <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:"monospace", lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:9, color:C.ink4, textTransform:"uppercase", letterSpacing:"0.07em", marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Difficulty proportion bar */}
      <div style={{ marginBottom:22 }}>
        <div style={{ display:"flex", height:6, borderRadius:99, overflow:"hidden", gap:2, marginBottom:8 }}>
          {["Easy","Medium","Hard","Expert"].map(d => {
            const n = tasks.filter(t => t.difficulty === d).length
            if (!n) return null
            return <div key={d} style={{ flex:n, background:(DIFF[d]||DIFF.Medium).color, borderRadius:99 }}/>
          })}
        </div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          {["Easy","Medium","Hard","Expert"].map(d => {
            const n = tasks.filter(t => t.difficulty === d).length
            if (!n) return null
            const dc = DIFF[d] || DIFF.Medium
            return (
              <div key={d} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:dc.color }}/>
                <span style={{ fontSize:10, color:C.ink3, fontWeight:600 }}>{d}</span>
                <span style={{ fontSize:10, fontWeight:800, color:dc.color }}>{n}</span>
                <span style={{ fontSize:9, color:C.ink4 }}>({Math.round((n/tasks.length)*100)}%)</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ⭐ Best Performances (top 3) */}
      {featured.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:3, height:18, background:`linear-gradient(180deg,${C.amber},${accent})`, borderRadius:99 }}/>
            <span style={{ fontSize:13, fontWeight:800, color:C.ink2 }}>⭐ Best Performances</span>
            <span style={{ fontSize:11, color:C.ink4 }}>· Top {featured.length} by score</span>
          </div>
          {featured.map((t, i) => <ChallengeCard key={t.id+i} t={t} last={i===featured.length-1}/>)}
        </div>
      )}

      {/* Remaining common challenges — compact list */}
      {remainingCommon.length > 0 && (
        <div style={{ marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:3, height:16, background:C.blue, borderRadius:99 }}/>
            <span style={{ fontSize:12, fontWeight:700, color:C.ink3 }}>Academic Tasks — DSA / Algorithms</span>
            <span style={{ fontSize:11, color:C.ink4 }}>· {remainingCommon.length} more</span>
          </div>
          <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}`, borderRadius:12, padding:"6px 6px 2px" }}>
            {(showAllCommon ? remainingCommon : remainingCommon.slice(0, ROWS_PREVIEW)).map((t, i) => (
              <CompactRow key={t.id+i} t={t}/>
            ))}
            {remainingCommon.length > ROWS_PREVIEW && (
              <button onClick={() => setShowAllCommon(p => !p)} style={{ width:"100%", padding:"9px",
                background:"transparent", border:"none", borderTop:`1px solid ${C.border}`,
                color:C.blue, fontSize:11, fontWeight:700, cursor:"pointer", marginTop:2 }}>
                {showAllCommon ? "▲ Show less" : `▼ Show all ${remainingCommon.length} challenges`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Domain challenges — grouped & collapsible */}
      {Object.keys(domainGroups).length > 0 && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:3, height:16, background:C.teal, borderRadius:99 }}/>
            <span style={{ fontSize:12, fontWeight:700, color:C.ink3 }}>Domain Tasks</span>
            <span style={{ fontSize:11, color:C.ink4 }}>
              · {domainTasks.filter(t=>!featuredIds.has(t.id)).length} across {Object.keys(domainGroups).length} domain{Object.keys(domainGroups).length>1?"s":""}
            </span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(domainGroups).map(([domain, dTasks]) => {
              const isOpen = expandedDomains[domain]
              const domainAvg = Math.round(dTasks.reduce((s,t)=>s+(t.score||0),0)/dTasks.length)
              const domainElo = dTasks.reduce((s,t)=>s+(t.eloDelta||0),0)
              const topDiff = dTasks.some(t=>t.difficulty==="Expert")?"Expert"
                :dTasks.some(t=>t.difficulty==="Hard")?"Hard"
                :dTasks.some(t=>t.difficulty==="Medium")?"Medium":"Easy"
              const dc = DIFF[topDiff] || DIFF.Medium
              return (
                <div key={domain} style={{ border:`1px solid ${C.border2}`, borderRadius:12, overflow:"hidden" }}>
                  <div
                    onClick={() => toggleDomain(domain)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px",
                      cursor:"pointer", background:"rgba(255,255,255,0.03)", transition:"background 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                  >
                    <div style={{ width:10, height:10, borderRadius:"50%", background:dc.color, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:C.ink2, textTransform:"capitalize" }}>{domain}</span>
                    </div>
                    <span style={{ fontSize:10, color:C.ink4, fontWeight:600 }}>{dTasks.length} solved</span>
                    <span style={{ fontSize:11, fontWeight:800, color:scoreColor(domainAvg), fontFamily:"monospace", marginLeft:8 }}>{domainAvg}%</span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.blue, marginLeft:8 }}>+{domainElo} ELO</span>
                    <span style={{ fontSize:10, color:C.ink4, marginLeft:6, display:"inline-block",
                      transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▼</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding:"6px 8px 6px", borderTop:`1px solid ${C.border}` }}>
                      {dTasks.map((t, i) => <CompactRow key={t.id+i} t={t}/>)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modalTask && <ChallengeDetailModal t={modalTask} onClose={() => setModalTask(null)}/>}
    </>
  )
}

// Interview card with expandable detail
function InterviewCard({ iv }) {
  const [open, setOpen] = useState(false)
  const score = iv.overall_score || 0
  return (
    <div style={{ border:`1px solid ${C.border2}`, borderRadius:14, overflow:"hidden", background:C.surface2, boxShadow:C.shadow }}>
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
        onClick={() => setOpen(o=>!o)}>
        <ScoreRing score={score} size={52} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:3 }}>
            {iv.role_target || iv.domain || "Interview Session"}
          </div>
          <div style={{ fontSize:12, color:C.ink3 }}>
            {iv.interview_mode && <span style={{ marginRight:8 }}>{iv.interview_mode}</span>}
            {iv.total_questions && <span>{iv.answered_count||0}/{iv.total_questions} Qs</span>}
            {iv.duration_mins && <span style={{ marginLeft:8 }}>· {iv.duration_mins} min</span>}
          </div>
          <div style={{ fontSize:11, color:C.ink4, marginTop:2 }}>📅 {fmtFull(iv.completed_at||iv.started_at)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:900, color:scoreColor(score), fontFamily:"monospace" }}>{gradeFor(score)}</div>
          <div style={{ fontSize:11, color:C.ink4 }}>{open?"▲ Hide":"▼ View"}</div>
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border2}`, padding:"18px 20px", background:C.bg }}>
          {iv.strengths?.length>0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.green, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>✓ Strengths</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {iv.strengths.map((s,i)=><span key={i} style={{ fontSize:12, color:C.green, background:C.green2, padding:"3px 10px", borderRadius:99 }}>{s}</span>)}
              </div>
            </div>
          )}
          {iv.improvements?.length>0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.amber, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>△ To Improve</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {iv.improvements.map((s,i)=><span key={i} style={{ fontSize:12, color:C.amber, background:C.amber2, padding:"3px 10px", borderRadius:99 }}>{s}</span>)}
              </div>
            </div>
          )}
          {iv.insights && (
            <div style={{ fontSize:13, color:C.ink2, lineHeight:1.7, background:C.blue3, padding:"12px 14px", borderRadius:10, borderLeft:`3px solid ${C.blue}` }}>
              {iv.insights}
            </div>
          )}
          {iv.skill_scores && Object.keys(iv.skill_scores).length>0 && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.ink3, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Skill Scores</div>
              {Object.entries(iv.skill_scores).map(([sk,v])=>(
                <SkillBar key={sk} label={sk} pct={typeof v==="number"?v:(v.score||0)} color={C.purple} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ p, last }) {
  const [open, setOpen] = useState(false)
  const accent = C.teal
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${C.border}`, paddingBottom: last ? 0 : 18, marginBottom: last ? 0 : 18 }}>
      <div onClick={() => setOpen(o => !o)} style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}18`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {p.emoji || "🔧"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{p.name || p.title || "Project"}</span>
            {p.role && <span style={{ fontSize: 11, color: accent, background: `${accent}14`, border: `1px solid ${accent}28`, borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>{p.role}</span>}
            {p.status === "live" && <span style={{ fontSize: 10, color: C.green, background: C.green2, borderRadius: 99, padding: "2px 7px", fontWeight: 700 }}>● Live</span>}
          </div>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 3, lineHeight: 1.55 }}>
            {p.description || p.summary || ""}
          </div>
          {/* techStack is the field resume-extracted projects actually use
              (see Aura.jsx's resume parser) — added as a fallback so those
              projects' tech chips render too, not just manually-added ones. */}
          {(p.technologies || p.tech || p.techStack || []).length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
              {(p.technologies || p.tech || p.techStack || []).slice(0, 6).map((t, j) => (
                <span key={j} style={{ fontSize: 10, color: C.blue, background: C.blue3, padding: "2px 7px", borderRadius: 99, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {p.githubUrl && (
            <a href={p.githubUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: C.ink3, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 9px", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              ⌥ Code
            </a>
          )}
          {(p.liveUrl || p.demoUrl || p.url) && (
            <a href={p.liveUrl || p.demoUrl || p.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              style={{ fontSize: 11, color: C.teal, background: C.teal3, border: `1px solid ${C.teal}30`, borderRadius: 7, padding: "4px 9px", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              ↗ Live
            </a>
          )}
          <span style={{ fontSize: 11, color: C.ink4, transform: open ? "rotate(180deg)" : "none", transition: "0.2s", marginTop: 3 }}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 14, marginLeft: 52, display: "flex", flexDirection: "column", gap: 10 }}>
          {p.problem && (
            <div style={{ background: `${C.amber}08`, border: `1px solid ${C.amber}20`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Problem</div>
              <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.6 }}>{p.problem}</div>
            </div>
          )}
          {(p.outcome || p.impact) && (
            <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Impact / Outcome</div>
              <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.6 }}>{p.outcome || p.impact}</div>
            </div>
          )}
          {(p.startDate || p.endDate || p.duration) && (
            <div style={{ fontSize: 11, color: C.ink4 }}>
              📅 {p.duration || [p.startDate, p.endDate || "Present"].filter(Boolean).join(" – ")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Certificate Card ──────────────────────────────────────────────────────────
function CertCard({ cert, last }) {
  const color = C.amber
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: last ? 0 : 16, marginBottom: last ? 0 : 16, borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        🏅
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{cert.name || cert.title || cert.label || "Certificate"}</div>
          {cert.verificationStatus === "verified"
            ? <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 9px", borderRadius:100, background:C.green2, color:C.green, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>✓ VERIFIED{cert.verificationSource?` · ${cert.verificationSource}`:""}</span>
            : <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 9px", borderRadius:100, background:C.amber2, color:C.amber, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>SELF-CLAIMED{cert.verificationSource?` · ${cert.verificationSource}`:(cert._source==="resume"?" · Resume":"")}</span>}
        </div>
        <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{cert.issuer || cert.organization || cert.provider || ""}{cert.date ? ` · ${cert.date}` : ""}</div>
        {(cert.credentialId||cert.certId) && <div style={{ fontSize: 11, color: C.ink4, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>ID: {cert.credentialId||cert.certId}</div>}
        {(cert.skills || []).length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
            {cert.skills.slice(0, 5).map((s, i) => (
              <span key={i} style={{ fontSize: 10, color: color, background: `${color}12`, borderRadius: 99, padding: "2px 7px", fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        )}
      </div>
      {cert.url && (
        <a href={cert.url} target="_blank" rel="noreferrer"
          style={{ fontSize: 11, color: color, background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 7, padding: "4px 9px", textDecoration: "none", fontWeight: 700, flexShrink: 0 }}>
          Verify ↗
        </a>
      )}
    </div>
  )
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function TestimonialCard({ t }) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7, fontStyle: "italic", marginBottom: 12 }}>
        "{t.text || t.content || ""}"
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {(t.name || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{t.name || "Reviewer"}</div>
          <div style={{ fontSize: 11, color: C.ink4 }}>{[t.role, t.company].filter(Boolean).join(" at ")}</div>
        </div>
        {t.relationship && <span style={{ marginLeft: "auto", fontSize: 10, color: C.ink4, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 99, padding: "2px 8px" }}>{t.relationship}</span>}
      </div>
    </div>
  )
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────
function ActivityHeatmap({ tasks, streak }) {
  const DAYS = 91
  const today = new Date(); today.setHours(0,0,0,0)
  const countMap = {}
  tasks.forEach(t => {
    if(!t.completedAt) return
    const d = new Date(t.completedAt); d.setHours(0,0,0,0)
    const key = d.toISOString().slice(0,10)
    countMap[key] = (countMap[key]||0) + 1
  })
  const cells = []
  for(let i=DAYS-1; i>=0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i)
    const key = d.toISOString().slice(0,10)
    cells.push({ date:key, count:countMap[key]||0, dayOfWeek:d.getDay() })
  }
  const firstDay = cells[0]?.dayOfWeek || 0
  const padded   = [...Array(firstDay).fill(null), ...cells]
  const cols     = Math.ceil(padded.length/7)
  const today0   = today.toISOString().slice(0,10)

  // Streak calculations from actual data
  let cs=0
  for(let i=cells.length-1; i>=0; i--) { if(cells[i].count>0) cs++; else break }
  let bs=0, cur=0
  cells.forEach(c => { if(c.count>0){cur++;bs=Math.max(bs,cur)}else cur=0 })
  const currentStreak  = cs||streak||0
  const bestStreak     = bs
  const activeDays     = cells.filter(c=>c.count>0).length
  const consistency    = Math.round((activeDays/DAYS)*100)
  const totalChallenges= cells.reduce((s,c)=>s+c.count,0)

  const cellColor = n => n===0?C.border:n===1?"#BFDBFE":n===2?"#60A5FA":"#2563EB"

  // Month labels
  const months=[], seen=new Set()
  cells.forEach((c,i) => {
    const m=new Date(c.date).getMonth()
    if(!seen.has(m)){ seen.add(m); months.push({label:new Date(c.date).toLocaleString("en-IN",{month:"short"}),col:Math.floor((firstDay+i)/7)}) }
  })

  return (
    <div>
      {/* Stats */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {[
          {icon:"🔥",label:"Current Streak",value:`${currentStreak}d`,color:C.amber},
          {icon:"🏆",label:"Best Streak",   value:`${bestStreak}d`,  color:C.blue},
          {icon:"📅",label:"Active Days",   value:`${activeDays}/90`,color:C.teal},
          {icon:"📊",label:"Consistency",   value:`${consistency}%`, color:consistency>=70?C.green:consistency>=40?C.amber:C.red},
          {icon:"✅",label:"Solved (90d)",  value:totalChallenges,   color:C.ink2},
        ].map((s,i)=>(
          <div key={i} style={{padding:"10px 14px",background:C.surface,borderRadius:12,
            border:`1px solid ${C.border}`,boxShadow:C.shadow,textAlign:"center",minWidth:75}}>
            <div style={{fontSize:16,marginBottom:2}}>{s.icon}</div>
            <div style={{fontSize:17,fontWeight:900,color:s.color,fontFamily:"monospace",lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.7,marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{overflowX:"auto"}}>
        <div style={{display:"inline-block"}}>
          {/* Month labels */}
          <div style={{display:"flex",marginBottom:4,paddingLeft:24}}>
            {Array.from({length:cols},(_,ci)=>{
              const ml=months.find(m=>m.col===ci)
              return <div key={ci} style={{width:13,marginRight:3,fontSize:9,color:C.ink4,fontWeight:600,whiteSpace:"nowrap"}}>{ml?.label||""}</div>
            })}
          </div>
          <div style={{display:"flex",gap:0}}>
            {/* Day labels */}
            <div style={{display:"flex",flexDirection:"column",gap:3,marginRight:6}}>
              {["","M","","W","","F",""].map((d,i)=>(
                <div key={i} style={{height:13,fontSize:9,color:C.ink4,lineHeight:"13px",width:16,textAlign:"right"}}>{d}</div>
              ))}
            </div>
            {/* Cells */}
            {Array.from({length:cols},(_,ci)=>(
              <div key={ci} style={{display:"flex",flexDirection:"column",gap:3,marginRight:3}}>
                {Array.from({length:7},(_,ri)=>{
                  const cell=padded[ci*7+ri]
                  if(!cell) return <div key={ri} style={{width:13,height:13}}/>
                  return (
                    <div key={ri}
                      title={`${cell.date}: ${cell.count} challenge${cell.count!==1?"s":""}`}
                      style={{width:13,height:13,borderRadius:3,background:cellColor(cell.count),
                        border:cell.date===today0?`1.5px solid ${C.blue}`:"none",
                        cursor:cell.count>0?"pointer":"default",transition:"transform 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.4)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginTop:8,justifyContent:"flex-end"}}>
            <span style={{fontSize:10,color:C.ink4,marginRight:2}}>Less</span>
            {[0,1,2,3].map(n=><div key={n} style={{width:12,height:12,borderRadius:2,background:cellColor(n)}}/>)}
            <span style={{fontSize:10,color:C.ink4,marginLeft:2}}>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Performance Summary ──────────────────────────────────────────────────────
function PerformanceSummary({ ud, skills, tasks, interviews, accent }) {
  const tier      = getTier(ud.eloRating)
  const avgScore  = tasks.length ? Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length) : 0
  const best      = tasks.reduce((b,t)=>t.score>b?t.score:b,0)
  const hardCount = tasks.filter(t=>t.difficulty==="Hard"||t.difficulty==="Expert").length
  const passCount = tasks.filter(t=>t.score>=80).length
  const passRate  = tasks.length ? Math.round((passCount/tasks.length)*100) : 0
  const avgIv     = interviews.length ? Math.round(interviews.reduce((s,iv)=>s+(iv.overall_score||0),0)/interviews.length) : 0
  const topSkill  = skills[0]
  const tierNext  = ELO_TIERS.find(t=>t.min>ud.eloRating)
  const tierProg  = tierNext ? Math.round(((ud.eloRating-tier.min)/(tierNext.min-tier.min))*100) : 100

  return (
    <Card accent={accent||C.blue}>
      <SectionTitle icon="📊" title="Performance Summary" accent={accent||C.blue}
        sub="Arena tier, challenge scores, and growth trajectory"/>

      {/* Score metrics — large dark metric cards. Product rule REVERSED
          2026-08-16 (explicit product decision, supersedes the 2026-07-26
          "no raw ELO" rule): recruiters now see the exact ELO number
          alongside the tier label, for full transparency into student
          standing — not just a qualitative bucket. */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          tasks.length>0
            ? {icon:"⚡",label:"Arena Tier", value:tier.label,sub:`ELO ${ud.eloRating} · ${Math.round(tierProg)}% to next tier`, color:tier.color,  bar:Math.min(((ud.eloRating-tier.min)/Math.max(1,(tier.max||ud.eloRating+1)-tier.min))*100,100)}
            : {icon:"⚡",label:"Arena Tier", value:"—",sub:`ELO ${ud.eloRating}`,color:C.ink4,bar:0},
          {icon:"🎯",label:"Avg Score",  value:`${avgScore}/100`,sub:`${passRate}% pass rate`,color:scoreColor(avgScore),bar:avgScore},
          {icon:"🏆",label:"Best Score", value:best>0?`${best}/100`:"–",sub:best>=90?"Excellent":best>=80?"Strong":best>=60?"Good":"No data",color:scoreColor(best),bar:best},
        ].map((m,i)=>(
          <div key={i} style={{
            padding:"18px 14px",background:C.surface2,borderRadius:14,
            border:`1px solid ${C.border2}`,textAlign:"center",
            position:"relative",overflow:"hidden",
          }}>
            <div style={{
              position:"absolute",inset:0,
              background:`radial-gradient(circle at 50% 0%, ${m.color}10 0%, transparent 70%)`,
              pointerEvents:"none",
            }}/>
            <div style={{fontSize:20,marginBottom:6}}>{m.icon}</div>
            <div style={{fontSize:22,fontWeight:900,color:m.color,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{m.value}</div>
            <div style={{fontSize:11,color:C.ink4,marginTop:4,fontWeight:500}}>{m.sub}</div>
            <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:99,marginTop:10}}>
              <div style={{height:"100%",width:`${m.bar}%`,background:m.color,borderRadius:99,boxShadow:`0 0 6px ${m.color}66`}}/>
            </div>
            <div style={{fontSize:9,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:5}}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Highlight chips */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {[
          hardCount>0&&{icon:"💪",text:`${hardCount} Hard/Expert solved`,color:C.red},
          tasks.length>0&&{icon:"✅",text:`${tasks.length} challenges total`,color:C.green},
          topSkill&&{icon:"🧠",text:`Top: ${topSkill.skill} ${topSkill.percentage}%`,color:C.teal},
          interviews.length>0&&{icon:"🎤",text:`${interviews.length} interviews · avg ${avgIv}/100`,color:C.purple},
          ud.arenaStreak>0&&{icon:"🔥",text:`${ud.arenaStreak}-day streak`,color:C.amber},
        ].filter(Boolean).map((h,i)=>(
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:7,padding:"7px 14px",
            background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:99,
          }}>
            <span style={{fontSize:13}}>{h.icon}</span>
            <span style={{fontSize:12,color:C.ink2,fontWeight:500}}>{h.text}</span>
          </div>
        ))}
      </div>

      {/* Tier progress to next tier — only meaningful once the user has an
          actual Arena track record (Tranche A: no progress bar toward a
          "next tier" for a score that has never moved). Raw ELO shown
          alongside the tier label (product decision, 2026-08-16). */}
      {tierNext && tasks.length>0 && (
        <div style={{padding:"16px 18px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border2}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:tier.color}}>● {tier.label} <span style={{fontWeight:500,color:C.ink4}}>· ELO {ud.eloRating}</span></span>
            <span style={{fontSize:12,color:C.ink4}}>Next tier: <strong style={{color:tierNext.color}}>{tierNext.label}</strong></span>
          </div>
          <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${tierProg}%`,
              background:`linear-gradient(90deg,${tier.color},${tierNext.color})`,
              borderRadius:99,transition:"width 1.2s ease",
              boxShadow:`0 0 10px ${tier.color}55`}}/>
          </div>
          <div style={{fontSize:11,color:C.ink4,marginTop:6,textAlign:"center"}}>{tierProg}% progress to {tierNext.label}</div>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function Portfolio({ username: usernameProp }) {
  // Accept username as prop (from App.jsx router) or derive from URL path
  const username = usernameProp || window.location.pathname.replace("/portfolio/","").split("/")[0]

  const [pd,          setPd]          = useState(null)
  const [interviews,  setInterviews]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")
  const [summary,     setSummary]     = useState("")
  const [scrolled,    setScrolled]    = useState(false)
  const [currentUid,  setCurrentUid]  = useState(null)
  // Engineering Proofs tab (EngineeringProofsPanel) removed 2026-07-30 — it
  // read from proof_objects, a table Arena V1 challenge completions never
  // populate, so it always showed "0 verified proofs" even for users with
  // real completed challenges (those render correctly in the separate
  // Challenges tab, which reads arena_history directly). Only "overview"
  // is a real value now; kept as state (not simplified away) since other
  // code in this file still branches on it defensively.
  const [activeView,  setActiveView]  = useState("overview")

  // PDF export fix (2026-07-30) — recharts' <ResponsiveContainer> measures its
  // parent's pixel box once via ResizeObserver, sized for the live on-screen
  // viewport. When window.print() switches the page into print layout (a
  // different width/margins), the chart doesn't automatically re-measure, so
  // the Skill Radar printed cut-off/oddly-scaled. Bumping this key right
  // before printing forces React to unmount+remount the chart, giving
  // ResponsiveContainer a fresh measurement against the actual print layout.
  const [printKey, setPrintKey] = useState(0)
  useEffect(() => {
    const bump = () => setPrintKey(k => k + 1)
    window.addEventListener("beforeprint", bump)
    window.addEventListener("afterprint", bump)
    return () => {
      window.removeEventListener("beforeprint", bump)
      window.removeEventListener("afterprint", bump)
    }
  }, [])

  const refs = { overview:useRef(), summary:useRef(), activity:useRef(), skills:useRef(), challenges:useRef(), interviews:useRef(), experience:useRef(), certificates:useRef(), testimonials:useRef(), codeDna:useRef() }

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(data?.session?.user?.id) setCurrentUid(data.session.user.id)
    })
    const onScroll=()=>setScrolled(window.scrollY>70)
    window.addEventListener("scroll",onScroll)
    return ()=>window.removeEventListener("scroll",onScroll)
  },[])

  useEffect(()=>{ if(username) load() },[username])

  // PDF export
  useEffect(()=>{
    const p=new URLSearchParams(window.location.search)
    if(p.get("pdf")==="1"&&!loading) { const t=setTimeout(()=>window.print(),1200); return ()=>clearTimeout(t) }
  },[loading])

  function buildProfessionalSummary(ud, skills, tasks) {
    const tier      = getTier(ud.eloRating)
    const avgScore  = tasks.length ? Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length) : 0
    const hardCount = tasks.filter(t=>t.difficulty==="Hard"||t.difficulty==="Expert").length
    const topSkills = skills.slice(0,3).map(s=>s.skill).join(", ")
    const name      = ud.displayName !== "Anonymous" ? ud.displayName : "This professional"
    const domain    = ud.keyword || "technology"
    const pathLabel = ud.path === "authority" ? "expert" : ud.path || "professional"

    // Sentence 1 — identity + tier + raw ELO (product decision, 2026-08-16,
    // supersedes the 2026-07-26 "no raw ELO number" rule — recruiters get
    // the exact figure, not just the qualitative tier bucket)
    let s1 = `${name} is a ${tier.label.toLowerCase()} ${pathLabel} in ${domain}, holding an ELO of ${ud.eloRating} — placing them in the ${tier.label} tier on Capabilio.`

    // Sentence 2 — performance record
    if(tasks.length === 0) {
      s1 = `${name} is a ${pathLabel} in ${domain} who has joined Capabilio to build and validate their technical skills.`
      return `${s1} Their Arena journey is just beginning — check back as they complete challenges and grow their rating.`
    }
    const hardStr = hardCount > 0 ? `, including ${hardCount} Hard or Expert-level challenge${hardCount>1?"s":""}` : ""
    const s2 = `They have completed ${tasks.length} Arena challenge${tasks.length>1?"s":""}${hardStr} with an average score of ${avgScore}/100.`

    // Sentence 3 — skills + streak
    const skillStr = topSkills ? `Their strongest areas include ${topSkills}.` : ""
    const streakStr = ud.arenaStreak >= 3 ? ` Maintaining a ${ud.arenaStreak}-day streak demonstrates consistent daily practice.` : ""
    const s3 = (skillStr + streakStr).trim() || `They are actively building expertise through structured, performance-tracked challenges.`

    return `${s1} ${s2} ${s3}`
  }

  // Legacy stub — kept so any stale references don't crash (unused)
  async function genSummary(ud, skills, tasks) {
    // replaced by buildProfessionalSummary — no-op
    void ud; void skills; void tasks
  }

  async function load() {
    setLoading(true); setError("")
    try {
      const raw   = username.trim()
      const mkSlug = s => (s||"").toLowerCase().trim()
        .replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")

      // Fetch auth session once upfront — used for name fallback only now.
      // CAREER OS TRANCHE 6 / PRIORITY 6A: the actual profile row lookup
      // (previously 6 direct supabase.from("profiles").select("*") calls
      // right here) now happens server-side via portfolioApi.lookup(), which
      // returns only a whitelisted, portfolio-safe field set — never a raw
      // "*" row. See backend/server/routes/portfolioPublic.js for why this
      // mattered: select("*") on this table exposed email + uan_number to
      // any authenticated viewer of any verified profile.
      const { data:{ session: authSession } } = await supabase.auth.getSession()
      const authMeta = authSession?.user?.user_metadata || {}

      let row = null
      try {
        const res = await portfolioApi.lookup(raw)
        row = res?.profile || null
      } catch {
        row = null
      }

      if(!row) {
        setError("Portfolio not found.")
        setLoading(false)
        return
      }

      // 2026-08-05 bug fix: profiles has BOTH a camelCase "resumeProjects"
      // column and a snake_case "resume_projects" column (confirmed live in
      // DB — an orphaned/legacy duplicate, not something to migrate away
      // right now). The dashboard's save path (Aura.jsx) writes real data
      // into resume_projects, leaving resumeProjects permanently `[]`. Every
      // `row.camelCase || row.snake_case || []` pattern below silently
      // picked the empty array because `[] || x` evaluates to `[]` — empty
      // arrays are truthy in JS. Real user data (2 saved projects) was
      // therefore always discarded before it reached the public Portfolio
      // page. Fix: prefer whichever side actually has entries.
      const firstNonEmptyArr = (...candidates) => {
        for (const c of candidates) if (Array.isArray(c) && c.length > 0) return c
        return []
      }

      const ud={
        uid:           row.id,
        displayName:   row.display_name   ||row.displayName    ||row.full_name||row.name
                     ||authMeta.full_name||authMeta.name      ||authSession?.user?.email?.split("@")[0]
                     ||"Anonymous",
        email:         row.email          ||"",
        username:      row.username       ||"",
        path:          row.path           ||"student",
        keyword:       row.keyword        ||"",
        // Prefer snake_case (Supabase Arena writes) then camelCase (onboarding writes)
        eloRating:     row.elo_rating     ??row.eloRating      ??400,
        arenaStreak:   row.arena_streak   ??row.arenaStreak    ??0,
        arenaCompleted:row.arena_completed??row.arenaCompleted  ??0,
        jobReadiness:  row.job_readiness  ??row.jobReadiness   ??0,
        skillGraph:    firstNonEmptyArr(row.skill_graph, row.skillGraph),
        skills:        row.skills         ||[],
        strengths:     row.strengths      ||[],
        weakAreas:     row.weak_areas     ||row.weakAreas      ||[],
        profileSummary:row.profile_summary||row.profileSummary ||"",
        experiences:   row.experiences   ||[],
        resumeProjects:firstNonEmptyArr(row.resumeProjects, row.resume_projects),
        education:     row.education     ||[],
        githubUsername:row.githubUsername||row.github_username ||"",
        linkedInUrl:   row.linkedInUrl   ||row.linkedin_url    ||"",
        githubUrl:     row.githubUrl     ||row.github_url      ||"",
        avatarUrl:     row.profilePhotoURL||row.profile_photo_url||row.avatarUrl||"",
        location:      row.location      ||row.city            ||"",
        createdAt:     row.createdAt     ||row.created_at      ||"",
        certificates:  firstNonEmptyArr(row.certificates, row.certifications),
        testimonials:  firstNonEmptyArr(row.testimonials, row.recommendations),
        portfolioUrl:  row.portfolioUrl  ||row.portfolio_url   ||"",
        websiteUrl:    row.websiteUrl    ||row.website_url     ||"",
        jobRole:       row.keyword       ||row.job_role        ||"",
        // Professional-path recruiter signals (2026-07-26) — real,
        // verification-gated facts only, never a raw ELO number.
        uanVerified:           !!row.uan_verified,
        yearsOfExperience:     row.years_of_experience ?? null,
        verifiedCertsCount:    row.verified_certifications_count ?? null,
        // GitHub / Code DNA recruiter view (2026-08-05) — {verification,
        // capabilitySignals, repoInterview, createdAt, title} or undefined
        // when the candidate hasn't analyzed a GitHub profile / it isn't
        // portfolio-visible. See backend/server/routes/portfolioPublic.js.
        codeDna:               row.codeDna || null,
      }

      const rawSkillGraph = ud.skillGraph || []
      const allZero = rawSkillGraph.length > 0 && rawSkillGraph.every(s=>(s.value||s.score||s.percentage||0)===0)
      let skills = rawSkillGraph
        .filter(s=>{const l=s.label||s.skill||"";return l&&l!=="undefined"&&l.trim()})
        .map(s=>({skill:s.label||s.skill||"Skill",percentage:s.value??s.percentage??s.score??0}))
        .filter(s=>s.percentage>0)
        .sort((a,b)=>b.percentage-a.percentage)
        .slice(0,12)
      // Fallback: if skillGraph is empty or all-zero, derive from skills list (same as Aura)
      if (skills.length===0) {
        const skillsList = ud.skills || []
        const expCount = (ud.experiences||[]).length
        const baseScore = Math.min(65, 30 + expCount * 8)
        if (skillsList.length > 0) {
          skills = skillsList.slice(0,12).map((s,i)=>{
            const name = typeof s==="string" ? s : (s.label||s.skill||s.name||"Skill")
            return { skill:name, percentage:Math.max(20, Math.round(baseScore - i*4)) }
          })
        } else if (allZero && rawSkillGraph.length > 0) {
          // At least show the skills with estimated scores
          skills = rawSkillGraph
            .filter(s=>{const l=s.label||s.skill||"";return l&&l!=="undefined"&&l.trim()})
            .map((s,i)=>({skill:s.label||s.skill||"Skill",percentage:Math.max(20,Math.round(baseScore-i*4))}))
            .slice(0,12)
        }
      }

      let tasks=[]
      try{
        const{data:h}=await supabase.from("arena_history").select("*").eq("user_id",row.id)
          .order("completed_at",{ascending:false}).limit(200)
        // Group by task_id to count attempts
        const attemptMap = {}
        h.forEach(r => {
          const key = r.task_id || r.title || r.id
          attemptMap[key] = (attemptMap[key] || 0) + 1
        })
        // Only keep latest attempt per challenge (first in desc order = latest)
        const seen = new Set()
        tasks = h.filter(r => {
          const key = r.task_id || r.title || r.id
          if(seen.has(key)) return false
          seen.add(key); return true
        }).map((r,i)=>({
          id:             r.task_id||String(i),
          title:          r.title||"Arena Challenge",
          difficulty:     r.difficulty||"Medium",
          domain:         r.domain||r.type||"dsa",
          type:           r.type||r.domain||"dsa",
          score:          r.score??0,
          eloDelta:       r.elo_delta??0,
          feedback:       r.feedback||"",
          scenario:       r.scenario||"",
          objective:      r.objective||"",
          expectedOutput: r.expected_output||"",
          userAnswer:     r.user_answer||"",
          completedAt:    r.completed_at||"",
          attempts:       attemptMap[r.task_id||r.title||r.id] || 1,
        }))

        // arena_history only ever stores the summary shown on each card
        // (score/ELO/title) — scenario/userAnswer/expectedOutput/feedback
        // above are always "" in practice, since those columns don't exist
        // on this table. The real detail lives in domain_submissions/
        // college_submissions, the same tables Arena's own History tab
        // reads its expanded per-attempt view from. Batch-fetch it for
        // every task with a real (domain|academic) type so the "View
        // Details" modal opens instantly with full detail already in
        // state, matching this page's existing no-per-click-fetch modal
        // pattern instead of adding a new loading state to the modal.
        const detailable = tasks.filter(t => t.type === "domain" || t.type === "academic")
        if (detailable.length) {
          try {
            const { details } = await portfolioApi.getTaskDetails(
              row.id,
              detailable.map(t => ({ taskId: t.id, type: t.type })),
            )
            tasks = tasks.map(t => {
              const d = details?.[`${t.type}:${t.id}`]
              if (!d) return t
              return {
                ...t,
                scenario: t.scenario || d.scenario || "",
                userAnswer: t.userAnswer || d.userAnswer || "",
                expectedOutput: t.expectedOutput || d.output || "",
                feedback: t.feedback || d.feedback || "",
              }
            })
          } catch {
            // Best-effort enrichment — a failure here still leaves the
            // existing score/grade/ELO/attempts summary intact (same as
            // before this feature existed); the modal's rich sections just
            // stay hidden, since they're already conditionally rendered on
            // these fields being non-empty, rather than failing the whole
            // Portfolio page load.
          }
        }
      } catch {}

      let ivs=[]
      try{
        const{data:iv}=await supabase.from("ai_interview_sessions").select("*")
          .eq("user_id",row.id).eq("status","completed")
          .order("completed_at",{ascending:false}).limit(20)
        if(iv?.length) ivs=iv
      } catch {}

      setPd({ud,skills,tasks})
      setInterviews(ivs)
      // Always generate a deterministic LinkedIn-style summary — no API dependency
      const autoSummary = buildProfessionalSummary(ud, skills, tasks)
      setSummary(ud.profileSummary || autoSummary)
    } catch(e){
      console.error("Portfolio error:",e)
      setError("Failed to load portfolio.")
    }
    setLoading(false)
  }

  const scrollTo=(k)=>{ setActiveView("overview"); requestAnimationFrame(()=>refs[k]?.current?.scrollIntoView({behavior:"smooth",block:"start"})) }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if(loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');body{background:${C.bg}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:48,height:48,border:`3px solid ${C.border2}`,borderTopColor:C.blue,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <p style={{color:C.ink4,fontSize:14,margin:0,fontWeight:500}}>Loading portfolio…</p>
    </div>
  )

  if(error||!pd) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14}}>
      <style>{`body{background:${C.bg}}`}</style>
      <div style={{fontSize:52}}>🔒</div>
      <p style={{color:C.red,fontSize:16,fontWeight:700,margin:0}}>{error||"Portfolio not found"}</p>
      <p style={{color:C.ink4,fontSize:13,margin:0}}>This profile may be private or the username doesn't exist.</p>
    </div>
  )

  const {ud,skills,tasks}=pd
  const pc    = PATH_CONFIG[ud.path]||PATH_CONFIG.student
  const tier  = getTier(ud.eloRating)
  const isOwner = !!(ud.uid&&currentUid&&currentUid===ud.uid)
  const isPro   = ud.path==="professional"||ud.path==="authority"

  // ── Archetype detection ────────────────────────────────────────────────────
  const { archetype, seniority, config: aConfig } = getPortfolioConfig(ud)

  // Archetype-aware hero background — override PATH_CONFIG heroBg
  const heroBg = aConfig?.palette?.hero || pc.heroBg

  // Role-specific recruiter summary (only if no custom profileSummary)
  const archetypeSummary = (aConfig && tasks.length > 0)
    ? aConfig.recruiterSummary(ud, tier, tasks.length)
    : null

  // arena_history.type is stamped reliably by the backend now — 'academic'
  // (College Stream submissions) or 'domain' (Domain Role submissions), see
  // arenaCollegeStream.js / arenaDomainRole.js. Preferred over the older
  // challenge_type/domain-string heuristics below, which remain only as a
  // fallback for legacy or third-party-sourced rows that predate the type
  // field being set consistently.
  const isCommonTask = t => {
    if (t.type === "academic") return true
    if (t.type === "domain") return false
    const ct = (t.challenge_type || "").toLowerCase()
    if (ct === "dsa" || ct === "common" || ct === "common_challenge") return true
    if (ct === "domain") return false
    return ["dsa","algorithm","common_challenge"].includes((t.domain||"").toLowerCase())
  }
  const commonTasks = tasks.filter(isCommonTask)
  const domainTasks = tasks.filter(t => !isCommonTask(t))

  const radarData = skills.slice(0,8).map(s=>({
    subject:s.skill.length>10?s.skill.slice(0,10)+"…":s.skill,
    score:s.percentage, fullMark:100,
  }))

  const avgScore = tasks.length ? Math.round(tasks.reduce((s,t)=>s+t.score,0)/tasks.length) : 0

  return (
    <div style={{fontFamily:"DM Sans,system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.ink}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        *{box-sizing:border-box}
        body{background:${C.bg}}
        ::selection{background:rgba(59,130,246,0.35)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .ps{animation:fadeUp 0.5s ease both}
        @keyframes archetypePulse{0%,100%{box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 0 var(--accent-glow)}50%{box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 6px var(--accent-glow-mid)}}
        @keyframes glowOrbit{0%{transform:translate(-50%,-50%) rotate(0deg) translateX(110px) rotate(0deg)}100%{transform:translate(-50%,-50%) rotate(360deg) translateX(110px) rotate(-360deg)}}
        @keyframes liveDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}
        @keyframes scanLine{0%{transform:translateY(-100%);opacity:0}20%{opacity:0.6}80%{opacity:0.6}100%{transform:translateY(400%);opacity:0}}
        @keyframes archetypeFloat{0%,100%{transform:translateY(0px)}50%{transform:translateY(-4px)}}
        @media print{
          /* PDF export fix (2026-07-30) — window.print() had almost no print
             stylesheet before this (only .np{display:none}), so the dark
             theme + card grid layout printed badly broken. Root causes found
             by tracing the actual print output:
             1. Chrome's print pipeline strips background-color/backdrop-filter
                by default ("background graphics" off) — since every card here
                uses a NEAR-WHITE text color (C.ink) meant to sit on a
                near-black background, stripping the background silently
                produced near-white text on a white PDF page: invisible words,
                exactly what was reported. print-color-adjust:exact forces the
                browser to print backgrounds/colors as authored instead.
             2. CSS Grid/Flexbox card layouts (Skill Radar, Skill Levels,
                Activity heatmap, every <Card>) have no atomicity hint for the
                print paginator, so browsers freely slice a card in half
                across a page boundary. break-inside:avoid on .pf-card fixes
                this for every card at once (single shared Card component).
             3. The skill-label span had a hard maxWidth:130 ellipsis that
                clips text even harder once print margins/scale are applied
                ("SQL (Advan…" never resolving) — relaxed for print only. */
          .np{display:none!important}
          html,body,*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
          .pf-card{break-inside:avoid;page-break-inside:avoid}
          .pf-skill-label{max-width:none!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
          .pf-decor{display:none!important}
        }
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px}
      `}</style>

      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <nav className="np" style={{
        position:"sticky",top:0,zIndex:100,
        background:scrolled?"rgba(10,15,30,0.92)":"transparent",
        backdropFilter:scrolled?"blur(20px)":"none",
        borderBottom:scrolled?`1px solid ${C.border}`:"none",
        transition:"all 0.3s",
        padding:scrolled?"10px 32px":"14px 32px",
        display:"flex",alignItems:"center",gap:16,
      }}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
          {scrolled&&<><Avatar name={ud.displayName} url={ud.avatarUrl} size={30} fontSize={11}/><span style={{fontSize:14,fontWeight:700,color:C.ink}}>{ud.displayName}</span></>}
        </div>
        <div style={{display:"flex",gap:4}}>
          {[
            {k:"overview",   l:"Overview"},
            {k:"summary",    l:"Summary"},
            tasks.length>0&&{k:"activity",   l:"Activity"},
            skills.length>0&&{k:"skills",    l:"Skills"},
            tasks.length>0&&{k:"challenges", l:"Challenges"},
            interviews.length>0&&{k:"interviews",l:"Interviews"},
            (ud.experiences?.length>0||ud.resumeProjects?.length>0)&&{k:"experience",l:"Timeline"},
            ud.certificates?.length>0&&{k:"certificates",l:"Certificates"},
            ud.testimonials?.length>0&&{k:"testimonials",l:"Reviews"},
            ud.codeDna&&{k:"codeDna",l:"GitHub"},
          ].filter(Boolean).map(({k,l})=>(
            <button key={k} onClick={()=>scrollTo(k)}
              style={{padding:"6px 14px",borderRadius:99,border:"none",
                background:activeView==="overview"?"transparent":"transparent",
                color:C.ink3,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
        {isOwner&&(
          <button onClick={()=>window.print()} className="np"
            style={{padding:"7px 16px",borderRadius:99,border:`1px solid ${C.border2}`,
              background:C.surface2,color:C.ink3,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            ⬇ PDF
          </button>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* HERO — existing scroll-sectioned page, unchanged below. Wrapped so   */}
      {/* the Engineering Proofs tab can fully replace the body instead of    */}
      {/* being threaded into the scroll-nav (keeps refs/PDF export intact).  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeView==="overview" && (
      <>
      <div ref={refs.overview}>
        {/* ── GENZ HERO — 2-col split: left=text, right=avatar ───────────── */}
        <div style={{background:heroBg,position:"relative",overflow:"hidden",minHeight:520}}>
          {/* Dot grid */}
          <div style={{position:"absolute",inset:0,opacity:0.04,
            backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"30px 30px",pointerEvents:"none"}}/>
          {/* Big accent glows */}
          <div style={{position:"absolute",top:-200,left:-100,width:700,height:700,
            background:aConfig?.palette?.accent||C.purple,borderRadius:"50%",
            filter:"blur(130px)",opacity:0.2,pointerEvents:"none"}}/>
          <div style={{position:"absolute",bottom:-200,right:-100,width:600,height:600,
            background:pc.accent||C.teal,borderRadius:"50%",
            filter:"blur(110px)",opacity:0.15,pointerEvents:"none"}}/>
          {/* Diagonal line accents */}
          <div style={{position:"absolute",top:0,right:"38%",width:1,height:"100%",
            background:"linear-gradient(180deg,transparent,rgba(255,255,255,0.06),transparent)",pointerEvents:"none"}}/>

          <div style={{position:"relative",maxWidth:1100,margin:"0 auto",
            padding:"80px 40px 90px",display:"flex",alignItems:"center",
            gap:48,flexWrap:"wrap"}}>

            {/* ── LEFT: Text content ── */}
            <div style={{flex:"1 1 380px",minWidth:0}}>
              {/* Role label pill */}
              <div style={{
                display:"inline-flex",alignItems:"center",gap:8,marginBottom:20,
                background:`${aConfig?.palette?.accent||C.purple}18`,
                border:`1px solid ${aConfig?.palette?.accent||C.purple}40`,
                padding:"6px 16px",borderRadius:99,
                backdropFilter:"blur(12px)",
              }}>
                <span style={{fontSize:13}}>{pc.icon}</span>
                <span style={{fontSize:11,fontWeight:800,
                  color:aConfig?.palette?.accent||C.purple,
                  textTransform:"uppercase",letterSpacing:1.5}}>
                  {ud.keyword||pc.label}
                </span>
              </div>

              {/* Big name — GenZ style */}
              <h1 style={{
                fontSize:clamp(36,5.8,68),fontWeight:900,
                margin:"0 0 8px",lineHeight:1.0,letterSpacing:"-0.03em",
                color:"rgba(255,255,255,0.92)",
              }}>
                Hi, I'm <span style={{
                  background:`linear-gradient(135deg, ${aConfig?.palette?.accent||C.purple}, ${pc.accent||C.teal})`,
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                  backgroundClip:"text",
                }}>
                  {(ud.displayName||"").split(" ")[0]}
                </span>
              </h1>
              {/* Full name subtitle */}
              {(ud.displayName||"").split(" ").length>1&&(
                <div style={{fontSize:clamp(18,2.5,28),fontWeight:700,
                  color:"rgba(255,255,255,0.45)",marginBottom:16,letterSpacing:"-0.01em"}}>
                  {ud.displayName}
                </div>
              )}

              {/* Archetype tagline */}
              {aConfig?.heroTagline&&(
                <p style={{fontSize:14,fontStyle:"italic",
                  color:"rgba(255,255,255,0.4)",marginBottom:8,fontWeight:500}}>
                  {aConfig.heroTagline}
                </p>
              )}

              {/* Bio summary */}
              <p style={{
                fontSize:14,color:"rgba(255,255,255,0.5)",
                lineHeight:1.9,maxWidth:480,margin:"0 0 24px",
              }}>
                {summary||archetypeSummary||`${pc.label} building real skills on Capabilio Arena.`}
              </p>

              {/* Location */}
              {ud.location&&(
                <div style={{
                  display:"inline-flex",alignItems:"center",gap:5,
                  marginBottom:20,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.10)",
                  padding:"4px 14px",borderRadius:99,fontSize:12,
                  color:"rgba(255,255,255,0.45)",fontWeight:500,
                }}>
                  📍 {ud.location}
                </div>
              )}

              {/* CTA Buttons */}
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:32}}>
                {ud.linkedInUrl&&(
                  <a href={ud.linkedInUrl} target="_blank" rel="noreferrer" style={{
                    display:"inline-flex",alignItems:"center",gap:8,
                    padding:"12px 24px",borderRadius:99,
                    background:`linear-gradient(135deg,${aConfig?.palette?.accent||C.purple},${pc.accent||C.teal})`,
                    color:"#fff",fontSize:13,fontWeight:800,textDecoration:"none",
                    boxShadow:`0 8px 24px ${aConfig?.palette?.accent||C.purple}40`,
                    letterSpacing:0.3,
                  }}>
                    <span style={{fontWeight:900}}>in</span> LinkedIn ↗
                  </a>
                )}
                {(ud.githubUrl||ud.githubUsername)&&(
                  <a href={ud.githubUrl||`https://github.com/${ud.githubUsername}`} target="_blank" rel="noreferrer" style={{
                    display:"inline-flex",alignItems:"center",gap:8,
                    padding:"11px 22px",borderRadius:99,
                    background:"rgba(255,255,255,0.07)",
                    border:"1.5px solid rgba(255,255,255,0.20)",
                    color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",
                    backdropFilter:"blur(10px)",
                  }}>
                    ⌥ GitHub ↗
                  </a>
                )}
                {(ud.portfolioUrl||ud.websiteUrl)&&(
                  <a href={ud.portfolioUrl||ud.websiteUrl} target="_blank" rel="noreferrer" style={{
                    display:"inline-flex",alignItems:"center",gap:8,
                    padding:"11px 22px",borderRadius:99,
                    background:"rgba(255,255,255,0.07)",
                    border:"1.5px solid rgba(255,255,255,0.18)",
                    color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",
                    backdropFilter:"blur(10px)",
                  }}>
                    🌐 Website ↗
                  </a>
                )}
              </div>

              {/* Tech stack icons strip */}
              {skills.length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.3)",
                    textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>
                    Technologies I work with
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                    {skills.slice(0,10).map((s,i)=>(
                      <div key={i} title={s.skill}>
                        <SkillIconEl name={s.skill} size={44}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Avatar with glow rings + floating stat card ── */}
            <div style={{flex:"0 0 auto",display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
              {/* Avatar ring stack */}
              <div style={{position:"relative",width:220,height:220}}>
                {/* Outer pulse ring */}
                <div style={{
                  position:"absolute",inset:-16,borderRadius:"50%",
                  border:`2px solid ${aConfig?.palette?.accent||C.purple}25`,
                }}/>
                <div style={{
                  position:"absolute",inset:-8,borderRadius:"50%",
                  border:`2px solid ${aConfig?.palette?.accent||C.purple}40`,
                }}/>
                {/* Glow backdrop */}
                <div style={{
                  position:"absolute",inset:0,borderRadius:"50%",
                  background:`radial-gradient(circle, ${aConfig?.palette?.accent||C.purple}30 0%, transparent 70%)`,
                  filter:"blur(20px)",
                }}/>
                {/* Avatar */}
                <div style={{
                  position:"absolute",inset:0,borderRadius:"50%",padding:4,
                  background:`linear-gradient(135deg,${aConfig?.palette?.accent||C.purple},${pc.accent||C.teal},${aConfig?.palette?.accent||C.purple})`,
                  boxShadow:`0 0 80px ${aConfig?.palette?.accent||C.purple}50,0 20px 60px rgba(0,0,0,0.7)`,
                }}>
                  <div style={{borderRadius:"50%",overflow:"hidden",width:"100%",height:"100%"}}>
                    <Avatar name={ud.displayName} url={ud.avatarUrl} size={212} fontSize={64}/>
                  </div>
                </div>
                {/* Tier badge — Tranche A: a "Building" tier badge on a
                    profile with zero Arena challenges is a naked, unearned
                    label (Arena isn't even in the Professional nav, so most
                    professional users have never touched it). Only show the
                    tier once there's real challenge history behind it. */}
                {tasks.length>0 && (
                  <div style={{
                    position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",
                    background:tier.color,color:"#fff",fontSize:10,fontWeight:900,
                    padding:"5px 16px",borderRadius:99,whiteSpace:"nowrap",
                    border:"2px solid rgba(0,0,0,0.5)",
                    boxShadow:`0 4px 16px ${tier.color}60`,letterSpacing:1,textTransform:"uppercase",
                  }}>
                    ⚡ {tier.label}
                  </div>
                )}
              </div>

              {/* Floating credibility card — Arena Rating for students/
                  Arena-track users; Professional Verification for the
                  professional path. Shows the raw ELO number front and
                  center (product decision, 2026-08-16, supersedes the prior
                  "never a bare digit" rule) — the tier label is secondary
                  context under it, not a substitute for the number. */}
              {!isPro ? (
                <div style={{
                  background:"rgba(255,255,255,0.06)",
                  backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
                  border:`1px solid rgba(255,255,255,0.12)`,
                  borderTop:`2px solid ${aConfig?.palette?.accent||C.purple}`,
                  borderRadius:16,padding:"14px 24px",textAlign:"center",
                  boxShadow:`0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.04)`,
                  minWidth:180,
                }}>
                  <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.35)",
                    textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Arena Rating</div>
                  <div style={{fontSize:26,fontWeight:900,color:"#fff",fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                    {ud.eloRating}
                  </div>
                  {tasks.length>0 ? (
                    <div style={{fontSize:12,fontWeight:700,color:tier.color,marginTop:4}}>
                      {tier.label} Tier
                    </div>
                  ) : (
                    <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.4)",marginTop:4}}>
                      Not started
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  background:"rgba(255,255,255,0.06)",
                  backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
                  border:`1px solid rgba(255,255,255,0.12)`,
                  borderTop:`2px solid ${aConfig?.palette?.accent||C.blue}`,
                  borderRadius:16,padding:"14px 24px",textAlign:"center",
                  boxShadow:`0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.04)`,
                  minWidth:180,
                }}>
                  <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.35)",
                    textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Verification</div>
                  <div style={{fontSize:13,fontWeight:800,color:ud.uanVerified?C.green:"rgba(255,255,255,0.4)"}}>
                    {ud.uanVerified ? "✓ Employment Verified" : "Not yet verified"}
                  </div>
                  {ud.verifiedCertsCount>0 && (
                    <div style={{fontSize:11,color:C.amber,fontWeight:700,marginTop:4}}>
                      {ud.verifiedCertsCount} verified cert{ud.verifiedCertsCount===1?"":"s"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── STATS BAR — horizontal chips below hero ──────────────────────── */}
        <div style={{
          background:"rgba(7,8,15,0.92)",
          backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
          borderBottom:`1px solid rgba(255,255,255,0.07)`,
          borderTop:`1px solid rgba(255,255,255,0.05)`,
          padding:"20px 40px",
        }}>
          <div style={{maxWidth:1100,margin:"0 auto",display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
            {/* Arena/challenge-specific stats — not relevant to the
                professional path (no Arena challenges or day-streak concept
                there); professionals get a different, recruiter-relevant set
                below instead of these always showing "0". */}
            {!isPro && <StatChip icon="✅" value={tasks.length} label="Challenges" color={C.green}/>}
            {!isPro && <StatChip icon="🔥" value={ud.arenaStreak||0} label="Day Streak" color={C.amber}/>}
            {interviews.length>0&&<StatChip icon="🎤" value={interviews.length} label="Interviews" color={C.purple}/>}
            {skills.length>0&&<StatChip icon="🧠" value={`${Math.round(skills.reduce((s,k)=>s+k.percentage,0)/skills.length)}%`} label="Avg Skill" color={C.teal}/>}
            {!isPro && avgScore>0&&<StatChip icon="📊" value={`${avgScore}`} label="Avg Score" color={aConfig?.palette?.accent||C.blue}/>}
            {ud.resumeProjects?.length>0&&<StatChip icon="📂" value={ud.resumeProjects.length} label="Projects" color={C.teal}/>}
            {ud.certificates?.length>0&&<StatChip icon="🏅" value={ud.certificates.length} label="Certs" color={C.amber}/>}
            {isPro && ud.verifiedCertsCount>0 && <StatChip icon="✅" value={ud.verifiedCertsCount} label="Verified Certs" color={C.green}/>}
            {isPro && ud.yearsOfExperience>0 && <StatChip icon="💼" value={`${ud.yearsOfExperience}y`} label="Experience" color={C.blue}/>}
            {isPro && ud.uanVerified && <StatChip icon="🔐" value="✓" label="Employment Verified" color={C.green}/>}
            {!isPro && ud.jobReadiness>0&&<StatChip icon="🚀" value={`${ud.jobReadiness}%`} label="Job Ready" color={C.blue2}/>}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div style={{maxWidth:1100,margin:"36px auto",padding:"0 32px 80px",display:"flex",flexDirection:"column",gap:24}}>

        {/* ══ AI PROFESSIONAL IDENTITY CARD ══════════════════════════════════ */}
        {aConfig&&(
          <div className="ps" style={{
            background:`linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.07) 100%)`,
            backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
            borderRadius:24, border:`1px solid ${aConfig.palette.accent}35`,
            borderLeft:`4px solid ${aConfig.palette.accent}`,
            "--accent-glow":`${aConfig.palette.accent}22`,
            "--accent-glow-mid":`${aConfig.palette.accent}18`,
            animation:"archetypePulse 3s ease-in-out infinite",
            overflow:"hidden", position:"relative",
          }}>
            {/* Animated scan line */}
            <div style={{
              position:"absolute", top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg, transparent 0%, ${aConfig.palette.accent}80 50%, transparent 100%)`,
              animation:"scanLine 4s ease-in-out infinite",
              pointerEvents:"none", zIndex:2,
            }}/>
            {/* Accent radial glow */}
            <div style={{
              position:"absolute", top:"-30%", left:"-5%", width:400, height:300,
              background:`radial-gradient(ellipse, ${aConfig.palette.accent}18 0%, transparent 70%)`,
              pointerEvents:"none",
            }}/>
            <div style={{ padding:"28px 32px", display:"flex", gap:0, flexWrap:"wrap", position:"relative" }}>

              {/* LEFT: Identity */}
              <div style={{display:"flex",alignItems:"flex-start",gap:20,flex:"1 1 300px",
                paddingRight:32, borderRight:`1px solid rgba(255,255,255,0.08)`, marginRight:0}}>
                {/* 3D icon — floats */}
                <div style={{
                  width:64, height:64, borderRadius:20, flexShrink:0,
                  background:`linear-gradient(145deg,${aConfig.palette.accent},${aConfig.palette.tag||aConfig.palette.accent}99)`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:30,
                  boxShadow:`inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3), 0 8px 24px ${aConfig.palette.accent}55, 0 0 0 1px ${aConfig.palette.accent}30`,
                  border:`1px solid rgba(255,255,255,0.15)`,
                  position:"relative", overflow:"hidden",
                  animation:"archetypeFloat 3s ease-in-out infinite",
                }}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:"40%",
                    background:"linear-gradient(180deg,rgba(255,255,255,0.25),transparent)",pointerEvents:"none",borderRadius:"20px 20px 0 0"}}/>
                  {aConfig.icon}
                </div>
                <div style={{flex:1}}>
                  {/* What is this */}
                  <div style={{
                    display:"inline-flex",alignItems:"center",gap:6,marginBottom:8,
                    background:`${aConfig.palette.accent}14`,border:`1px solid ${aConfig.palette.accent}35`,
                    borderRadius:99,padding:"3px 12px",
                  }}>
                    {/* Live pulse dot */}
                    <span style={{
                      width:6,height:6,borderRadius:"50%",
                      background:aConfig.palette.accent,flexShrink:0,
                      animation:"liveDot 1.4s ease-in-out infinite",
                      boxShadow:`0 0 6px ${aConfig.palette.accent}`,
                    }}/>
                    <span style={{fontSize:9,fontWeight:900,color:aConfig.palette.accent,
                      textTransform:"uppercase",letterSpacing:1.8}}>
                      AI-Assigned Professional Identity
                    </span>
                  </div>
                  <div style={{fontSize:22,fontWeight:900,color:C.ink,lineHeight:1.1,marginBottom:6}}>
                    {aConfig.name}
                  </div>
                  <div style={{fontSize:13,color:C.ink3,fontStyle:"italic",lineHeight:1.6,marginBottom:12}}>
                    {aConfig.tagline}
                  </div>
                  {/* Plain-English explanation */}
                  <div style={{
                    fontSize:12,color:C.ink2,lineHeight:1.8,
                    background:"rgba(0,0,0,0.2)",borderRadius:10,
                    padding:"10px 14px",border:`1px solid rgba(255,255,255,0.06)`,
                  }}>
                    💡 <strong style={{color:C.ink}}>What this means:</strong> {isPro
                      ? "Capabilio's AI analyzed your real skills, work experience, and Weekly Skill Pulse assessments to assign this professional persona. Recruiters use it to instantly understand your specialization — like a headline, but backed by verified signals instead of a self-written bio."
                      : "Capabilio's AI analyzed your Arena scores, skill graph, and challenge history to assign you this role persona. Recruiters use it to instantly understand your specialization — like a professional headline, but backed by real performance data."}
                  </div>
                </div>
              </div>

              {/* RIGHT: Proof signals + seniority */}
              <div style={{
                flex:"1 1 260px", paddingLeft:32,
                display:"flex",flexDirection:"column",justifyContent:"center",gap:14,
              }}>
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:C.ink3,
                    textTransform:"uppercase",letterSpacing:1.8,marginBottom:10}}>
                    🎯 What Recruiters See You Excel At
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {aConfig.proofElements.slice(0,4).map((pe,i)=>(
                      <div key={i} style={{
                        padding:"6px 14px",
                        background: i===0 ? `${aConfig.palette.accent}18` : "rgba(255,255,255,0.05)",
                        border:`1px solid ${i===0 ? aConfig.palette.accent+"40" : "rgba(255,255,255,0.10)"}`,
                        borderRadius:99, fontSize:11, fontWeight:700,
                        color:i===0 ? aConfig.palette.accent : C.ink2,
                      }}>
                        {pe.replace(/_/g," ")}
                      </div>
                    ))}
                  </div>
                </div>
                {isPro ? (
                  // Professional path: career-stage + live verification badges,
                  // built entirely from real signals (years of experience, UAN/
                  // employment verification, verified certifications) — no
                  // Arena reference, no ELO tier, nothing fabricated.
                  <div style={{
                    display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
                    background:"rgba(255,255,255,0.04)",borderRadius:12,
                    padding:"10px 14px",border:"1px solid rgba(255,255,255,0.07)",
                  }}>
                    <span style={{fontSize:11,color:C.ink3,fontWeight:600}}>Career stage:</span>
                    <span style={{fontSize:12,fontWeight:900,color:aConfig?.palette?.accent||C.blue}}>
                      {getProStage(ud.yearsOfExperience).label}
                    </span>
                    {ud.uanVerified && (
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:800,color:C.green,
                        background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:99,padding:"3px 10px"}}>
                        🔐 Employment Verified
                      </span>
                    )}
                    {ud.verifiedCertsCount>0 && (
                      <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:800,color:C.amber,
                        background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:99,padding:"3px 10px"}}>
                        🏅 {ud.verifiedCertsCount} Cert{ud.verifiedCertsCount>1?"s":""} Verified
                      </span>
                    )}
                    <div style={{marginLeft:"auto",fontSize:10,color:C.ink4,fontStyle:"italic",maxWidth:200,lineHeight:1.5}}>
                      Complete more Weekly Skill Pulse check-ins to strengthen this signal
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
                    background:"rgba(255,255,255,0.04)",borderRadius:12,
                    padding:"10px 14px",border:"1px solid rgba(255,255,255,0.07)",
                  }}>
                    <span style={{fontSize:11,color:C.ink3,fontWeight:600}}>Your level:</span>
                    <span style={{
                      fontSize:12,fontWeight:900,textTransform:"capitalize",
                      color:seniority==="senior"?C.purple:seniority==="mid"?C.blue:C.amber,
                    }}>
                      {seniority} · {tier.label}
                    </span>
                    <span style={{fontSize:11,color:C.ink4}}>•</span>
                    <span style={{fontSize:11,color:C.ink3,fontFamily:"'DM Mono',monospace"}}>
                      {tier.label} tier
                    </span>
                    <div style={{marginLeft:"auto",fontSize:10,color:C.ink4,fontStyle:"italic",maxWidth:180,lineHeight:1.5}}>
                      Complete more Arena challenges to level up your archetype
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ PERFORMANCE SUMMARY (Arena-specific — students/Arena-track only,
              per product rule: professionals don't have Arena challenges) ══ */}
        {!isPro && (
          <div ref={refs.summary} className="ps">
            <PerformanceSummary
              ud={ud} skills={skills} tasks={tasks}
              interviews={interviews}
              accent={aConfig?.palette?.accent}
            />
          </div>
        )}

        {/* ══ PROFESSIONAL CREDIBILITY (professional path only) ══════════════
            Recruiter-relevant, real, verification-gated signals — no raw ELO
            number anywhere (product rule applies to both paths). Replaces
            the Arena-specific Performance Summary/Challenges/Streak content
            that doesn't apply to professionals. */}
        {isPro && (
          <div ref={refs.summary} className="ps">
            <Card accent={aConfig?.palette?.accent||C.blue}>
              <SectionTitle icon="✅" title="Verified Credibility" accent={aConfig?.palette?.accent||C.blue}
                sub="Real, verification-gated signals recruiters can trust — not self-reported"/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16}}>
                <div style={{padding:"16px 14px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border2}`,textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:6}}>🔐</div>
                  <div style={{fontSize:14,fontWeight:800,color:ud.uanVerified?C.green:C.ink4}}>{ud.uanVerified?"Verified":"Not yet"}</div>
                  <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>Employment (EPFO/UAN)</div>
                </div>
                <div style={{padding:"16px 14px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border2}`,textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:6}}>🏅</div>
                  <div style={{fontSize:20,fontWeight:900,color:C.amber,fontFamily:"'DM Mono',monospace"}}>{ud.verifiedCertsCount||0}</div>
                  <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>Verified Certifications</div>
                </div>
                {ud.yearsOfExperience>0 && (
                  <div style={{padding:"16px 14px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border2}`,textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:6}}>💼</div>
                    <div style={{fontSize:20,fontWeight:900,color:C.blue,fontFamily:"'DM Mono',monospace"}}>{ud.yearsOfExperience}y</div>
                    <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>Experience</div>
                  </div>
                )}
                {skills.length>0 && (
                  <div style={{padding:"16px 14px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border2}`,textAlign:"center"}}>
                    <div style={{fontSize:20,marginBottom:6}}>🧠</div>
                    <div style={{fontSize:20,fontWeight:900,color:C.teal,fontFamily:"'DM Mono',monospace"}}>{Math.round(skills.reduce((s,k)=>s+k.percentage,0)/skills.length)}%</div>
                    <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginTop:4}}>Avg Skill Confidence</div>
                  </div>
                )}
              </div>
              {(ud.uanVerified || ud.verifiedCertsCount>0) && (
                <div style={{padding:"10px 14px",background:C.surface2,borderRadius:10,border:`1px solid ${C.border2}`,fontSize:12,color:C.ink3}}>
                  💡 Everything above is independently verified — {ud.uanVerified?"employment cross-matched via EPFO/UAN":""}{ud.uanVerified&&ud.verifiedCertsCount>0?" and ":""}{ud.verifiedCertsCount>0?"certifications confirmed via document verification":""}. Nothing here is self-reported.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ ACTIVITY HEATMAP (Arena challenge activity — not applicable to
              the professional path, which has no Arena challenges) ═══════ */}
        {!isPro && tasks.length>0&&(
          <div ref={refs.activity} className="ps">
            <Card accent={C.amber}>
              <SectionTitle icon="📅" title="Activity & Streak Consistency" accent={C.amber}
                sub="90-day challenge activity — hover a square to see the date"/>
              <ActivityHeatmap tasks={tasks} streak={ud.arenaStreak||0}/>
            </Card>
          </div>
        )}

        {/* ELO Journey sparkline removed (2026-07-26) — plotted a raw ELO
            number over time, which violates the product rule that portfolios
            never show a bare ELO score to either students or professionals.
            The qualitative tier badge in the hero above still communicates
            standing without a number. */}

        {/* ══ SKILLS ══════════════════════════════════════════════════════════ */}
        {skills.length>0&&(
          <div ref={refs.skills} className="ps">
            {/* 3D outer shell */}
            <div style={{
              borderRadius:28,
              background:"linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 60%, rgba(0,0,0,0.1) 100%)",
              border:`1px solid rgba(255,255,255,0.14)`,
              borderTop:`1px solid rgba(255,255,255,0.22)`,
              backdropFilter:"blur(32px)", WebkitBackdropFilter:"blur(32px)",
              boxShadow:`
                0 32px 80px rgba(0,0,0,0.6),
                0 8px 24px rgba(0,0,0,0.4),
                0 2px 0 rgba(255,255,255,0.08) inset,
                0 -2px 0 rgba(0,0,0,0.3) inset,
                0 0 0 1px rgba(0,0,0,0.3)
              `,
              overflow:"hidden", position:"relative",
            }}>
              {/* Floating accent glow behind content */}
              <div style={{
                position:"absolute", top:"-20%", right:"-5%", width:320, height:280,
                background:`radial-gradient(ellipse, ${(aConfig?.palette?.accent||C.teal)}18 0%, transparent 65%)`,
                pointerEvents:"none",
              }}/>
              {/* Top shimmer bar */}
              <div style={{position:"absolute",top:0,left:0,right:0,height:1,
                background:`linear-gradient(90deg, transparent 0%, ${aConfig?.palette?.accent||C.teal}60 50%, transparent 100%)`,
                pointerEvents:"none"}}/>
              <div style={{padding:"28px 32px 32px", position:"relative"}}>
                <SectionTitle icon="🧠" title="Skills & Expertise" accent={aConfig?.palette?.accent||C.teal}
                  sub={`${skills.length} skills tracked from Arena challenges and assessments`}/>
                <div style={{display:"grid",gridTemplateColumns:radarData.length>=3?"1fr 1fr":"1fr",gap:28,alignItems:"start",marginTop:4}}>
                  {radarData.length>=3&&(
                    <div style={{
                      background:"rgba(0,0,0,0.25)",borderRadius:18,padding:"18px 16px",
                      border:"1px solid rgba(255,255,255,0.07)",
                      boxShadow:"inset 0 2px 8px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
                    }}>
                      <div style={{fontSize:10,fontWeight:800,color:aConfig?.palette?.accent||C.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:4,height:14,background:aConfig?.palette?.accent||C.teal,borderRadius:2,display:"inline-block"}}/>
                        Skill Radar
                      </div>
                      <ResponsiveContainer key={printKey} width="100%" height={220}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                          <PolarAngleAxis dataKey="subject" tick={{fill:C.ink3,fontSize:10,fontWeight:600}}/>
                          <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
                          <Radar name="Score" dataKey="score"
                            stroke={aConfig?.palette?.accent||C.teal}
                            fill={aConfig?.palette?.accent||C.teal}
                            fillOpacity={0.18} strokeWidth={2.5}
                            dot={{fill:aConfig?.palette?.accent||C.teal,r:3}}/>
                          <Tooltip
                            contentStyle={{background:"rgba(7,8,15,0.95)",border:`1px solid ${aConfig?.palette?.accent||C.teal}40`,borderRadius:10,fontSize:12,color:C.ink,backdropFilter:"blur(12px)"}}
                            formatter={v=>[`${v}%`,"Score"]}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div style={{
                    background:"rgba(0,0,0,0.2)",borderRadius:18,padding:"18px 16px",
                    border:"1px solid rgba(255,255,255,0.06)",
                    boxShadow:"inset 0 2px 8px rgba(0,0,0,0.35)",
                  }}>
                    <div style={{fontSize:10,fontWeight:800,color:aConfig?.palette?.accent||C.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:4,height:14,background:aConfig?.palette?.accent||C.teal,borderRadius:2,display:"inline-block"}}/>
                      Skill Levels
                    </div>
                    <SkillGrid skills={skills} aConfig={aConfig}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ STRENGTHS & WEAKNESSES ══════════════════════════════════════════ */}
        {(ud.strengths?.length>0||ud.weakAreas?.length>0)&&(
          <div className="ps">
            <Card accent={aConfig?.palette?.accent}>
              <SectionTitle icon="⚖️" title="Strengths & Focus Areas" accent={aConfig?.palette?.accent||C.blue}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                {ud.strengths?.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>✓ Strengths</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {ud.strengths.map((s,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                          padding:"10px 14px",background:C.green2,borderRadius:10,
                          border:`1px solid rgba(22,163,74,0.15)`}}>
                          <span style={{color:C.green,fontSize:15}}>✓</span>
                          <span style={{fontSize:13,color:C.ink2,fontWeight:500}}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ud.weakAreas?.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:C.amber,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>△ Focus Areas</div>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {ud.weakAreas.map((s,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                          padding:"10px 14px",background:C.amber2,borderRadius:10,
                          border:`1px solid rgba(217,119,6,0.15)`}}>
                          <span style={{color:C.amber,fontSize:15}}>△</span>
                          <span style={{fontSize:13,color:C.ink2,fontWeight:500}}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ══ CHALLENGES ══════════════════════════════════════════════════════ */}
        {tasks.length>0&&(
          <div ref={refs.challenges} className="ps">
            <Card accent={aConfig?.palette?.accent||C.blue}>
              <SectionTitle icon="⚔️"
                title={aConfig?.proofBadgeLabel ? `Arena Challenges · ${aConfig.proofBadgeLabel}` : "Arena Challenges"}
                accent={aConfig?.palette?.accent||C.blue}
                sub={`${tasks.length} challenges completed · avg score ${avgScore}/100`}/>

              <ArenaChallengesSection
                tasks={tasks}
                commonTasks={commonTasks}
                domainTasks={domainTasks}
                avgScore={avgScore}
                aConfig={aConfig}
              />
            </Card>
          </div>
        )}

        {/* ══ INTERVIEW SESSIONS ══════════════════════════════════════════════ */}
        {interviews.length>0&&(
          <div ref={refs.interviews} className="ps">
            <Card accent={C.purple}>
              <SectionTitle icon="🎤" title="Interview Sessions" accent={C.purple}
                sub={`${interviews.length} sessions completed — click any card to expand feedback`}/>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {interviews.map((iv,i)=><InterviewCard key={iv.id||i} iv={iv}/>)}
              </div>
            </Card>
          </div>
        )}

        {/* ══ PROJECTS & EXPERIENCE — all users ══════════════════════════════ */}
        {(ud.experiences?.length>0||ud.resumeProjects?.length>0)&&(
          <div ref={refs.experience} className="ps">
            <Card accent={aConfig?.palette?.accent}>
              <SectionTitle icon="🗂️"
                title="Career Timeline"
                sub="Professional experience, internships, and verified work history"
                accent={aConfig?.palette?.accent||C.teal}/>

              {/* Work / internship history */}
              {ud.experiences?.length>0&&(()=>{
                // Compat shim: normalize both flat and legacy roles[] nested formats
                const normExps = ud.experiences.map(e => {
                  const r0 = e.roles?.[0] || {}
                  const skillsRaw = r0.skills || e.skills || ""
                  return {
                    ...e,
                    role:      e.role || r0.title || e.title || "",
                    startDate: e.startDate || e.start_date || r0.startDate || "",
                    endDate:   e.endDate   || e.end_date   || r0.endDate   || "",
                    isCurrent: !!(e.isCurrent ?? e.current ?? r0.current ?? false),
                    description: e.description || e.summary || (Array.isArray(r0.responsibilities) ? r0.responsibilities.join("\n") : (r0.responsibilities || "")),
                    skills: Array.isArray(e.skills) && e.skills.length
                      ? e.skills
                      : typeof skillsRaw === "string"
                        ? skillsRaw.split(",").map(s=>s.trim()).filter(Boolean)
                        : Array.isArray(skillsRaw) ? skillsRaw : [],
                  }
                })
                const fmtDate = d => {
                  if (!d) return ""
                  const p = String(d).split("-")
                  if (p.length >= 2 && /^\d{4}$/.test(p[0]) && /^\d{1,2}$/.test(p[1])) {
                    try { return new Date(+p[0],+p[1]-1).toLocaleDateString("en-US",{month:"short",year:"numeric"}) } catch { return d }
                  }
                  return d
                }
                return (
                <div style={{marginBottom:ud.resumeProjects?.length>0?28:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>
                    Work Experience & Internships
                  </div>
                  {normExps.map((e,i)=>{
                    const isLast = i === normExps.length - 1
                    const startLabel = fmtDate(e.startDate)
                    const endLabel   = e.isCurrent ? "Present" : (fmtDate(e.endDate) || "Present")
                    const dateStr    = startLabel ? `${startLabel} – ${endLabel}` : endLabel || null
                    const descLines  = (e.description||"").split("\n").filter(Boolean)
                    const skillList  = (Array.isArray(e.skills) ? e.skills.filter(Boolean) : []).slice(0,6)
                    return (
                      <div key={i} style={{ display:"flex", gap:14, position:"relative", marginBottom: isLast ? 0 : 20 }}>
                        {!isLast && <div style={{ position:"absolute", left:19, top:40, bottom:-20, width:2, background:C.border2, zIndex:0 }}/>}
                        <div style={{ width:40, height:40, borderRadius:12, background:C.surface2, border:`1px solid ${C.border2}`,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, zIndex:1 }}>
                          {ud.path==="student" ? "🏫" : "🏢"}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Company name + verification badge (public-safe: no UAN, no internal IDs) */}
                          <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:1 }}>
                            <span style={{ fontSize:14, fontWeight:700, color:C.ink }}>{e.company||"Company"}</span>
                            {e.verificationStatus==="verified"
                              ? <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:100, background:"#e6f9f4", color:"#0D9E72", fontSize:9, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>✓ Verified</span>
                              : <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:100, background:"#F5F5F5", color:"#888", fontSize:9, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }}>Self-reported</span>}
                          </div>
                          {/* Legal entity — shows registered name, never UAN or internal IDs */}
                          {e.legalName && e.legalName !== e.company && e.verificationStatus==="verified" && (
                            <div style={{ fontSize:10, color:C.ink4, marginBottom:2 }}>
                              Registered as: <span style={{ fontWeight:600 }}>{e.legalName}</span>
                            </div>
                          )}
                          {/* Role + dates */}
                          <div style={{ fontSize:13, fontWeight:600, color:C.ink2 }}>{e.role||"Role"}</div>
                          {dateStr && <div style={{ fontSize:11, color:C.ink4, marginTop:2 }}>📅 {dateStr}</div>}
                          {descLines.length > 0 && (
                            <div style={{ marginTop:8 }}>
                              {descLines.map((line,li)=>(
                                <div key={li} style={{ display:"flex", gap:7, marginBottom:3 }}>
                                  <span style={{ color:C.teal||"#00B4A6", fontSize:10, flexShrink:0, marginTop:3 }}>▸</span>
                                  <span style={{ fontSize:13, color:C.ink3, lineHeight:1.6 }}>{line.replace(/^[•\-▸]\s*/,"")}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {skillList.length > 0 && (
                            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                              {skillList.map((sk,si)=>(
                                <span key={si} style={{ background:C.surface2, border:`1px solid ${C.border2}`, borderRadius:100,
                                  padding:"2px 9px", fontSize:11, color:C.ink3, fontWeight:600 }}>{sk}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                )
              })()}

              {/* Projects — rich cards with proof links + outcome */}
              {ud.resumeProjects?.length>0&&(
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:C.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>
                    Personal & Academic Projects
                  </div>
                  {ud.resumeProjects.map((p,i)=>(
                    <ProjectCard key={i} p={p} last={i===ud.resumeProjects.length-1}/>
                  ))}
                </div>
              )}

              {/* GitHub CTA if no projects yet */}
              {!ud.resumeProjects?.length && ud.githubUrl && (
                <div style={{marginTop:12,padding:"12px 14px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:16}}>⌥</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.ink}}>View code on GitHub</div>
                    <div style={{fontSize:11,color:C.ink4}}>Projects and repositories</div>
                  </div>
                  <a href={ud.githubUrl} target="_blank" rel="noreferrer"
                    style={{fontSize:12,color:C.blue,background:C.blue3,border:`1px solid ${C.blue}30`,borderRadius:8,padding:"5px 12px",textDecoration:"none",fontWeight:600}}>
                    Open ↗
                  </a>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ══ EDUCATION ═══════════════════════════════════════════════════════ */}
        {ud.education?.length>0&&(
          <div className="ps">
            <Card>
              <SectionTitle icon="🎓" title="Education" accent={C.blue}/>
              {ud.education.map((e,i)=>{
                // 2026-08-05: education is year-granularity, not a specific
                // day — passing endDate/year into TLine's `time` prop ran it
                // through fmt() (new Date(iso).toLocaleDateString(...)),
                // which renders "Invalid Date" for anything that isn't a
                // real ISO date string (e.g. a bare year like "2025" or a
                // "2021-2025" range). Show the year via `meta` only — no
                // `time` prop, no fmt() call, no fabricated day/month.
                const yearLabel = e.year || (e.endDate||e.end_date||"").toString().slice(0,4) || ""
                return (
                  <TLine key={i}
                    icon="🏫"
                    title={`${e.degree||e.course||"Degree"} — ${e.institution||e.school||"Institution"}`}
                    sub={e.field||e.specialization||""}
                    last={i===ud.education.length-1}
                    meta={yearLabel && <span style={{fontSize:12,color:C.ink4}}>📅 {yearLabel}</span>}
                  />
                )
              })}
            </Card>
          </div>
        )}

        {/* ══ CERTIFICATES & TRAINING ═════════════════════════════════════════ */}
        {ud.certificates?.length>0&&(
          <div ref={refs.certificates} className="ps">
            <Card accent={C.amber}>
              <SectionTitle icon="🏅" title="Certificates & Training"
                sub={`${ud.certificates.length} credential${ud.certificates.length>1?"s":""} earned`}
                accent={C.amber}/>
              <div>
                {ud.certificates.map((cert,i)=>(
                  <CertCard key={i} cert={cert} last={i===ud.certificates.length-1}/>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ TESTIMONIALS & RECOMMENDATIONS ══════════════════════════════════ */}
        {ud.testimonials?.length>0&&(
          <div ref={refs.testimonials} className="ps">
            <Card accent={C.purple}>
              <SectionTitle icon="💬" title="Recommendations"
                sub="From mentors, supervisors, and collaborators"
                accent={C.purple}/>
              <div>
                {ud.testimonials.map((t,i)=>(
                  <TestimonialCard key={i} t={t}/>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ GITHUB / CODE DNA (recruiter view) ═══════════════════════════════
            2026-08-05: what recruiters actually look for in a candidate's
            GitHub is less about star counts and follower numbers (popularity,
            not skill) and more about: is this genuinely their own work, is
            there real engineering practice behind it (README/CI/tests), and
            can they explain what they built. This section shows exactly
            that — the same curated view already used by Capabilio's internal
            recruiter tools — and deliberately never exposes raw repo names,
            star counts, or language percentages. ═══════════════════════════ */}
        {ud.codeDna&&(
          <div ref={refs.codeDna} className="ps">
            <Card accent={C.green}>
              <SectionTitle icon="⌥" title="GitHub Verification"
                sub="What we check, and why it matters more than stars or followers"
                accent={C.green}/>

              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:16}}>
                <div style={{
                  display:"inline-flex",alignItems:"center",gap:6,
                  padding:"6px 14px",borderRadius:99,fontSize:12,fontWeight:700,
                  background:ud.codeDna.verification?.startsWith("Verified")?"rgba(0,229,160,0.12)":"rgba(255,184,0,0.12)",
                  color:ud.codeDna.verification?.startsWith("Verified")?C.green:C.amber,
                  border:`1px solid ${ud.codeDna.verification?.startsWith("Verified")?C.green:C.amber}40`,
                }}>
                  {ud.codeDna.verification?.startsWith("Verified")?"✓":"◐"} {ud.codeDna.verification}
                </div>
                {(ud.githubUrl||ud.githubUsername)&&(
                  <a href={ud.githubUrl||`https://github.com/${ud.githubUsername}`} target="_blank" rel="noreferrer"
                    style={{fontSize:12,color:C.blue,textDecoration:"none",fontWeight:600}}>
                    View profile ↗
                  </a>
                )}
              </div>

              {/* Headline Code DNA numbers (2026-09-03) — the canonical
                  connection's denormalized summary (github_connections),
                  same three figures Settings/Career & Vault already show,
                  so this public view matches what the owner sees rather
                  than presenting a differently-derived picture. Absent
                  entirely for a profile that has capabilitySignals from an
                  older analysis but no canonical connection yet. */}
              {typeof ud.codeDna.score==="number" && (
                <div style={{display:"flex",flexWrap:"wrap",gap:20,marginBottom:16,padding:"12px 16px",background:C.bgInner,border:`1px solid ${C.border}`,borderRadius:12}}>
                  <div>
                    <div style={{fontSize:22,fontWeight:800,color:C.green,lineHeight:1}}>{ud.codeDna.score}</div>
                    <div style={{fontSize:9,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>Code DNA Score</div>
                  </div>
                  {ud.codeDna.confidenceLevel&&(
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.ink2}}>{ud.codeDna.confidenceLevel==="high"?"High":ud.codeDna.confidenceLevel==="moderate"?"Moderate":"Low"}</div>
                      <div style={{fontSize:9,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>Confidence</div>
                    </div>
                  )}
                  {typeof ud.codeDna.repositoriesAnalyzed==="number"&&(
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.ink2}}>{ud.codeDna.repositoriesAnalyzed}</div>
                      <div style={{fontSize:9,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>Repositories Analyzed</div>
                    </div>
                  )}
                </div>
              )}

              {ud.codeDna.capabilitySignals?.length>0 && (
                <div style={{marginBottom:ud.codeDna.repoInterview?18:4}}>
                  <div style={{fontSize:10,color:C.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
                    Real signals from analyzed code — not self-reported
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {ud.codeDna.capabilitySignals.filter(s=>s.value).map((s,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,229,160,0.08)",border:`1px solid ${C.green}30`,borderRadius:8,padding:"7px 12px",fontSize:12,color:C.ink2,fontWeight:600}}>
                        <span style={{color:C.green}}>✓</span>{s.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ud.codeDna.repoInterview&&(
                <div style={{background:C.bgInner,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:13}}>🎤</span>
                    <span style={{fontSize:12,fontWeight:800,color:C.ink}}>Can explain their own code</span>
                    <span style={{fontSize:9,color:C.ink4,fontWeight:700,background:"rgba(255,255,255,0.06)",borderRadius:6,padding:"2px 7px"}}>AI-ASSESSED</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:ud.codeDna.repoInterview.verdict==="Genuine understanding"?C.green:ud.codeDna.repoInterview.verdict==="Doesn't match stated project"?C.red:C.amber,marginBottom:4}}>
                    {ud.codeDna.repoInterview.verdict}
                  </div>
                  {ud.codeDna.repoInterview.summary&&<div style={{fontSize:12,color:C.ink3,lineHeight:1.6}}>{ud.codeDna.repoInterview.summary}</div>}
                </div>
              )}

              <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`,fontSize:11,color:C.ink4,lineHeight:1.7}}>
                We deliberately don't show star counts, follower numbers, or activity graphs here — those measure popularity and luck, not skill. What's shown above is: confirmed ownership, real engineering practice (documentation, CI/CD, working tooling) detected in the actual code, and whether the candidate can genuinely explain what they built.
              </div>
            </Card>
          </div>
        )}

        {/* ══ EMPTY STATE (no activity yet) ═══════════════════════════════════ */}
        {tasks.length===0&&interviews.length===0&&skills.length===0&&(
          <Card style={{textAlign:"center",padding:"48px 32px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🚀</div>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,marginBottom:8}}>Portfolio in progress</div>
            <div style={{fontSize:13,color:C.ink3}}>
              {isOwner
                ?"Complete Arena challenges and interview sessions to build your portfolio."
                :"This user hasn't completed any Arena activity yet."}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",padding:"20px 0",borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,color:C.ink4,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap"}}>
            Powered by{" "}
            <a href="https://capabilio.online" target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center"}}>
              <img src="/capabilio-logo-light.png" alt="Capabilio AI" style={{height:14,width:"auto",display:"block"}} />
            </a>
            {ud.createdAt&&<span>· Member since {fmt(ud.createdAt)}</span>}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
