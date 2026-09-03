// ─── Capabilio Portfolio Archetype System ─────────────────────────────────────
//
// Role-aware, domain-aware, seniority-aware portfolio configuration.
// Each archetype controls: section order, visual style, proof emphasis,
// recruiter summary style, color palette, UI widgets, and hide rules.
//
// Consumed by Portfolio.jsx to select the correct rendering strategy per user.
// ─────────────────────────────────────────────────────────────────────────────

// ── Archetype IDs ─────────────────────────────────────────────────────────────
export const ARCHETYPES = {
  CRAFTSMAN:   "craftsman",    // Frontend Developer
  ARCHITECT:   "architect",    // Backend Developer
  COMMANDER:   "commander",    // DevOps / SRE
  ANALYST:     "analyst",      // Data Analyst / BI
  DESIGNER:    "designer",     // UX/UI Designer
  PM:          "pm",           // Product Manager
  FOUNDER:     "founder",      // Founder / Executive / Authority
  GROWTH:      "growth",       // Student / Fresher
  FULLSTACK:   "fullstack",    // Full Stack / SWE
  MOBILE:      "mobile",       // Mobile Developer
  ENGINEER:    "engineer",     // Hardware/ECE/EEE/Mech/Civil engineer
  PROFESSIONAL:"professional", // Pharmacy, MBA, non-engineering professional
}

// ── Domain keyword → Archetype mapping ───────────────────────────────────────
// Lower priority overridden by explicit userData.archetype if set
const DOMAIN_MAP = [
  // Frontend
  { keywords: ["frontend","front-end","front end","react developer","angular","vue","ui developer","next.js","nuxt"],
    archetype: ARCHETYPES.CRAFTSMAN },

  // Backend
  { keywords: ["backend","back-end","back end","node.js","django","spring","fastapi","api developer","server-side","java developer","python developer","rust developer","golang"],
    archetype: ARCHETYPES.ARCHITECT },

  // DevOps / SRE / Cloud
  { keywords: ["devops","sre","platform engineer","infrastructure","cloud engineer","kubernetes","docker","terraform","ci/cd","devsecops"],
    archetype: ARCHETYPES.COMMANDER },

  // Data
  { keywords: ["data analyst","data analysis","business analyst","bi analyst","analytics","power bi","tableau","sql analyst","data engineer","etl"],
    archetype: ARCHETYPES.ANALYST },

  // Designer
  { keywords: ["ux","ui","designer","product designer","visual designer","interaction design","figma"],
    archetype: ARCHETYPES.DESIGNER },

  // PM
  { keywords: ["product manager","product owner","pm ","program manager","head of product"],
    archetype: ARCHETYPES.PM },

  // Mobile
  { keywords: ["mobile","android","ios","flutter","react native","swift","kotlin"],
    archetype: ARCHETYPES.MOBILE },

  // Full Stack / SWE catch-alls
  { keywords: ["full stack","fullstack","software engineer","software developer","swe","mern","mean","sde"],
    archetype: ARCHETYPES.FULLSTACK },

  // Hardware / Engineering (ECE, EEE, Mech, Civil, VLSI, Embedded, IoT, RF)
  { keywords: [
      "embedded","firmware","iot","rtos","microcontroller","fpga",
      "vlsi","asic","rtl","verilog","vhdl","physical design","chip design",
      "rf engineer","antenna","microwave","analog","mixed signal","ic design",
      "electrical engineer","eee","power systems","electrical machines","power electronics",
      "control systems","instrumentation","plc","scada",
      "mechanical engineer","thermal","fluid mechanics","cad engineer","solidworks","catia","ansys",
      "civil engineer","structural engineer","geotechnical","highway","transportation engineer",
      "construction management","bim","revit","staad","etabs",
      "electronics","circuit design","pcb","signal processing","telecom","5g engineer",
    ],
    archetype: ARCHETYPES.ENGINEER },

  // Professional non-engineering (Pharmacy, MBA, HR, Finance, Marketing)
  { keywords: [
      "pharmacist","pharmacy","clinical pharmacology","drug","regulatory affairs","pharmacovigilance",
      "mba","business analyst","management consultant","strategy consultant","operations manager",
      "hr manager","human resources","talent acquisition","recruiter",
      "finance","financial analyst","investment","chartered accountant","ca",
      "marketing manager","brand manager","growth hacker","digital marketing",
    ],
    archetype: ARCHETYPES.PROFESSIONAL },
]

// ── Archetype detection ───────────────────────────────────────────────────────
export function detectArchetype(userData) {
  // 1. Explicit override
  if (userData?.archetype && Object.values(ARCHETYPES).includes(userData.archetype)) {
    return userData.archetype
  }

  // 2. Capabilio path → authority/founder
  if (userData?.path === "authority") return ARCHETYPES.FOUNDER
  if (userData?.path === "institution") return ARCHETYPES.FOUNDER

  // 3. Keyword/role matching
  const kw = (
    userData?.keyword ||
    userData?.job_role ||
    userData?.target_role ||
    userData?.headline ||
    userData?.bio ||
    ""
  ).toLowerCase()

  for (const entry of DOMAIN_MAP) {
    if (entry.keywords.some(k => kw.includes(k))) return entry.archetype
  }

  // 4. ELO + path = student/fresher
  const elo = userData?.eloRating || 500
  if (userData?.path === "student" && elo < 700) return ARCHETYPES.GROWTH

  // 5. Default
  return ARCHETYPES.FULLSTACK
}

// ── Seniority detection ───────────────────────────────────────────────────────
export function detectSeniority(userData) {
  const yoe = parseInt(userData?.yearsExp || userData?.years_of_experience || 0)
  const elo = userData?.eloRating || 500
  const tasks = userData?.taskCount || 0

  if (yoe >= 8 || elo >= 1400) return "senior"
  if (yoe >= 3 || elo >= 900  || tasks >= 30) return "mid"
  return "junior"
}

// ── Archetype configs ─────────────────────────────────────────────────────────

export const ARCHETYPE_CONFIG = {

  // ── CRAFTSMAN — Frontend Developer ─────────────────────────────────────────
  [ARCHETYPES.CRAFTSMAN]: {
    name:      "The Craftsman's Gallery",
    tagline:   "UI quality, live demos, component mastery",
    icon:      "🎨",

    palette: {
      hero:       "linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#2563EB",
      accentSoft: "#EFF6FF",
      tag:        "#3B82F6",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    52,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "summary",
      "stats",           // ELO, challenges, avg score, streak
      "projects",        // live build links, GitHub, screenshots
      "skills",          // radar — UI/CSS/JS/TS/React etc.
      "arena",           // challenge timeline
      "certifications",
      "contact",
    ],

    sectionEmphasis: {
      projects:   "LEAD",    // biggest section, browser mockups
      skills:     "STRONG",  // radar chart prominent
      arena:      "MEDIUM",
      experience: "HIDE",    // de-emphasise
    },

    proofElements: [
      "live_demo_links",       // clickable "Live ↗" badges
      "github_repo_links",     // per-project GitHub links
      "lighthouse_score",      // Perf / A11y / Best Practices
      "component_preview",     // iframe or screenshot
      "tech_stack_badges",     // React, TypeScript, Tailwind chips
      "arena_ui_score",        // domain-specific ELO
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const yoe = ud.yearsExp || ud.years_of_experience
      const yoeStr = yoe ? `${yoe} year${yoe > 1 ? "s" : ""} of` : ""
      const topSkills = (ud.skill_graph || []).slice(0, 3).map(s => s.label || s.skill).join(", ")
      const role = ud.keyword || "Frontend Developer"
      return `${yoeStr ? yoeStr + " " : ""}${role} · ${tier.label} tier${topSkills ? ` · ${topSkills}` : ""}${tasks > 0 ? ` · ${tasks} Arena challenges` : ""}`
    },

    heroTagline:     "Crafting interfaces that users trust",
    proofBadgeLabel: "Live Builds",

    uniqueWidgets: [
      { id:"live_preview",   label:"Live Project Preview",  desc:"iframe thumbnail or screenshot of deployed project" },
      { id:"tech_badges",    label:"Technology Stack",      desc:"color-coded skill chips per project" },
      { id:"lighthouse",     label:"Lighthouse Score",      desc:"Performance / Accessibility / SEO score ring" },
    ],

    hideWhenEmpty: ["experience", "publications", "infra_diagrams"],
    minimise:      ["bio_text", "education_heavy"],
  },


  // ── ARCHITECT — Backend Developer ───────────────────────────────────────────
  [ARCHETYPES.ARCHITECT]: {
    name:      "The Architect's Blueprint",
    tagline:   "Systems, APIs, scale, reliability",
    icon:      "🏗️",

    palette: {
      hero:       "linear-gradient(135deg,#ECFDF5 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#10B981",
      accentSoft: "#ECFDF5",
      tag:        "#059669",
      terminal:   true,    // enables monospace-dominant rendering
    },

    typography: {
      headingFont: "'DM Mono', monospace",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 700,
      heroSize:    44,
      monoAccent:  true,
    },

    sections: [
      "hero",
      "summary",
      "stats",           // ELO, challenges, avg score
      "system_design",   // architecture diagrams / descriptions
      "projects",        // API-focused, include endpoints table
      "skills",          // radar — DB, APIs, Performance, Security
      "arena",           // challenge feed focused on backend tasks
      "certifications",
      "contact",
    ],

    sectionEmphasis: {
      system_design: "LEAD",
      projects:      "STRONG",   // with API endpoint snippets
      skills:        "STRONG",
      arena:         "MEDIUM",
    },

    proofElements: [
      "api_endpoint_table",    // GET /api/users → response preview
      "architecture_diagram",  // system design visual
      "performance_numbers",   // "handles 10k req/s"
      "database_schema",       // ER diagram or schema snippet
      "tech_stack_badges",     // Node/PostgreSQL/Redis/Kafka chips
      "arena_backend_score",
      "github_repo_links",
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Backend Engineer"
      const elo = ud.eloRating
      const topSkills = (ud.skill_graph || []).slice(0, 3).map(s => s.label || s.skill).join(", ")
      return `${role} · ${tier.label} tier${topSkills ? ` · ${topSkills}` : ""}${tasks > 0 ? ` · ${tasks} backend challenges` : ""}`
    },

    heroTagline:     "Systems that scale. Code that survives.",
    proofBadgeLabel: "Architecture Proofs",

    uniqueWidgets: [
      { id:"api_table",      label:"API Showcase",           desc:"endpoint list with method, path, response shape" },
      { id:"arch_diagram",   label:"System Design",          desc:"described or visual architecture" },
      { id:"perf_metrics",   label:"Performance Metrics",    desc:"requests/s, latency, throughput numbers" },
    ],

    hideWhenEmpty: ["css_skills", "ui_components", "design_portfolio"],
    minimise:      ["visual_design", "motion_design"],
  },


  // ── COMMANDER — DevOps / SRE ────────────────────────────────────────────────
  [ARCHETYPES.COMMANDER]: {
    name:      "The Pipeline Commander",
    tagline:   "Reliability, automation, infrastructure at scale",
    icon:      "⚙️",

    palette: {
      hero:       "linear-gradient(135deg,#FFFBEB 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#F59E0B",
      accentSoft: "#FFFBEB",
      tag:        "#D97706",
      terminal:   true,
    },

    typography: {
      headingFont: "'DM Mono', monospace",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 700,
      heroSize:    44,
      monoAccent:  true,
    },

    sections: [
      "hero",
      "summary",
      "metrics_bar",     // uptime %, MTTR, deploy frequency, cost saved
      "stats",
      "pipelines",       // CI/CD project showcases
      "infrastructure",  // infra descriptions with cloud logos
      "skills",          // radar — K8s, Docker, Terraform, Monitoring
      "certifications",  // AWS/GCP/Azure certs prominent
      "arena",
      "contact",
    ],

    sectionEmphasis: {
      metrics_bar:   "LEAD",    // big numbers at the top
      pipelines:     "STRONG",
      certifications:"STRONG",
      skills:        "MEDIUM",
      arena:         "MEDIUM",
    },

    proofElements: [
      "uptime_badge",        // 99.9% uptime indicator
      "deployment_freq",     // deployments/day badge
      "cost_savings",        // "reduced infra cost by X%"
      "pipeline_screenshot", // CI/CD screenshot
      "cert_badges",         // AWS, GCP, CKA, etc.
      "tech_stack_badges",   // Kubernetes, Terraform, Prometheus chips
      "arena_devops_score",
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "DevOps Engineer"
      const elo = ud.eloRating
      return `${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} infrastructure challenges` : ""}`
    },

    heroTagline:     "Zero downtime. Infinite scale. Total observability.",
    proofBadgeLabel: "Pipeline Proofs",

    uniqueWidgets: [
      { id:"uptime_meter",    label:"Uptime Meter",           desc:"visual 99.9% uptime indicator" },
      { id:"deploy_chart",    label:"Deploy Frequency",       desc:"daily/weekly deployment count chart" },
      { id:"cert_wall",       label:"Certification Wall",     desc:"AWS / GCP / CKA badge grid" },
    ],

    hideWhenEmpty: ["css_work", "ui_demos", "design_case_studies"],
    minimise:      ["visual_design", "animation_work"],
  },


  // ── ANALYST — Data Analyst / BI ─────────────────────────────────────────────
  [ARCHETYPES.ANALYST]: {
    name:      "The Insight Engine",
    tagline:   "Data storytelling, business impact, analytical rigor",
    icon:      "📊",

    palette: {
      hero:       "linear-gradient(135deg,#ECFEFF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#0891B2",
      accentSoft: "#ECFEFF",
      tag:        "#0E7490",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    48,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "impact_headline",  // single biggest business outcome first
      "summary",
      "stats",
      "dashboards",       // dashboard screenshots / embeds
      "case_studies",     // problem → analysis → outcome per project
      "sql_showcase",     // highlighted SQL snippets with context
      "skills",           // radar — SQL, Python, Tableau, Excel, Stats
      "certifications",
      "arena",
      "contact",
    ],

    sectionEmphasis: {
      impact_headline: "LEAD",
      dashboards:      "STRONG",
      case_studies:    "STRONG",
      sql_showcase:    "MEDIUM",
      arena:           "MEDIUM",
    },

    proofElements: [
      "dashboard_screenshot",  // Tableau/Power BI/Looker screenshot
      "business_outcome",      // "reduced churn by 23%"
      "sql_snippet",           // key SQL query with annotation
      "case_study",            // narrative proof block
      "tech_stack_badges",     // Python/SQL/Tableau/Excel chips
      "arena_data_score",
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Data Analyst"
      const elo = ud.eloRating
      const topSkills = (ud.skill_graph || []).slice(0, 3).map(s => s.label || s.skill).join(", ")
      return `${role} · ${tier.label} tier${topSkills ? ` · ${topSkills}` : ""}${tasks > 0 ? ` · ${tasks} data challenges` : ""}`
    },

    heroTagline:     "Turning numbers into decisions.",
    proofBadgeLabel: "Impact Proofs",

    uniqueWidgets: [
      { id:"impact_card",    label:"Business Impact Card",   desc:"outcome metric with before/after numbers" },
      { id:"sql_block",      label:"SQL Showcase",           desc:"annotated query block with result context" },
      { id:"dash_preview",   label:"Dashboard Preview",      desc:"screenshot with description" },
    ],

    hideWhenEmpty: ["ci_cd", "infrastructure", "component_demos"],
    minimise:      ["deployment_work", "infra_design"],
  },


  // ── DESIGNER — UX/UI ────────────────────────────────────────────────────────
  [ARCHETYPES.DESIGNER]: {
    name:      "The Experience Architect",
    tagline:   "Design process, visual systems, user outcomes",
    icon:      "✦",

    palette: {
      hero:       "linear-gradient(135deg,#F5F3FF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#7C3AED",
      accentSoft: "#F5F3FF",
      tag:        "#6D28D9",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    54,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "summary",
      "case_studies",     // LEAD — problem, research, solution, outcome
      "design_system",    // color, type, component showcase
      "before_after",     // before/after design comparisons
      "skills",           // radar — Figma, Research, Prototyping, Systems
      "stats",
      "arena",
      "contact",
    ],

    sectionEmphasis: {
      case_studies:  "LEAD",
      design_system: "STRONG",
      before_after:  "STRONG",
      arena:         "MEDIUM",
    },

    proofElements: [
      "case_study",           // full narrative with images
      "before_after_slider",  // visual comparison
      "figma_embed",          // Figma prototype link or screenshot
      "design_system_tokens", // color/type tokens
      "user_testing_results", // "SUS score improved from 62 to 84"
      "tool_badges",          // Figma, FigJam, Miro, Principle chips
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "UX Designer"
      const elo = ud.eloRating
      return `${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} design challenges` : ""}`
    },

    heroTagline:     "Designing the gap between intent and experience.",
    proofBadgeLabel: "Design Proofs",

    uniqueWidgets: [
      { id:"before_after",   label:"Before / After",         desc:"side-by-side design comparison slider" },
      { id:"case_study",     label:"Case Study Block",       desc:"full narrative — problem, process, outcome" },
      { id:"design_tokens",  label:"Design System Preview",  desc:"color / type / spacing token showcase" },
    ],

    hideWhenEmpty: ["deployment", "backend_apis", "database_schema"],
    minimise:      ["code_snippets", "ci_cd_work"],
  },


  // ── PM — Product Manager ─────────────────────────────────────────────────────
  [ARCHETYPES.PM]: {
    name:      "The Outcome Ledger",
    tagline:   "Decisions, experiments, business outcomes",
    icon:      "📋",

    palette: {
      hero:       "linear-gradient(135deg,#F0F9FF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#0284C7",
      accentSoft: "#F0F9FF",
      tag:        "#0369A1",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    48,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "outcome_ledger",   // LEAD — table of products + their outcomes
      "summary",
      "case_studies",     // problem, hypothesis, experiment, result
      "skills",           // radar — Strategy, Data, Collaboration, Execution
      "stats",
      "contact",
    ],

    sectionEmphasis: {
      outcome_ledger: "LEAD",
      case_studies:   "STRONG",
      skills:         "MEDIUM",
    },

    proofElements: [
      "outcome_table",    // product | metric | before | after | impact
      "experiment_card",  // A/B test description with results
      "roadmap_snippet",  // redacted roadmap screenshot or narrative
      "nps_metric",       // "NPS improved from 32 → 67"
      "arr_impact",       // "$1.2M ARR attributed to launch"
      "tool_badges",      // JIRA, Amplitude, Figma, SQL chips
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Product Manager"
      const elo = ud.eloRating
      return `${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} product challenges` : ""}`
    },

    heroTagline:     "Outcomes, not outputs.",
    proofBadgeLabel: "Product Proofs",

    uniqueWidgets: [
      { id:"outcome_ledger", label:"Outcome Ledger",         desc:"table — product, metric, before, after, impact" },
      { id:"experiment",     label:"Experiment Card",        desc:"A/B test with hypothesis and result" },
      { id:"impact_metric",  label:"Business Impact",        desc:"ARR / NPS / MAU improvement card" },
    ],

    hideWhenEmpty: ["code_snippets", "infrastructure", "deployment"],
    minimise:      ["technical_depth", "code_quality"],
  },


  // ── FOUNDER — Executive / Authority ─────────────────────────────────────────
  [ARCHETYPES.FOUNDER]: {
    name:      "The Authority Page",
    tagline:   "Vision, traction, thought leadership, impact",
    icon:      "🏛️",

    palette: {
      hero:       "linear-gradient(135deg,#FFFBEB 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#F59E0B",
      accentSoft: "#FFFBEB",
      tag:        "#B45309",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Sans', sans-serif",
      headingWeight: 900,
      heroSize:    58,
      monoAccent:  false,
    },

    sections: [
      "hero",             // editorial — large photo, mission statement
      "mission",          // what I'm building and why
      "traction",         // key company/project metrics
      "thought_leadership",// articles, talks, media
      "press",            // logo wall — featured in...
      "experience",       // career arc, compressed
      "contact",
    ],

    sectionEmphasis: {
      hero:             "LEAD",
      mission:          "STRONG",
      traction:         "STRONG",
      thought_leadership:"MEDIUM",
      press:            "MEDIUM",
    },

    proofElements: [
      "traction_metrics",   // ARR, users, growth %, team size
      "press_logos",        // featured in TechCrunch, YC, etc.
      "talk_videos",        // conference talk embeds
      "published_articles", // blog / LinkedIn articles
      "testimonials",       // team / customer quotes
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Executive"
      const elo = ud.eloRating
      return `${role} · ${tier.label} · ${elo} ELO`
    },

    heroTagline:     "Building what the world needs next.",
    proofBadgeLabel: "Impact Signals",

    uniqueWidgets: [
      { id:"traction_bar",  label:"Traction Dashboard",      desc:"ARR, users, team size, growth % cards" },
      { id:"press_wall",    label:"Press Logo Wall",          desc:"media mentions with logos" },
      { id:"testimony",     label:"Social Proof",             desc:"team / customer / press quote carousel" },
    ],

    hideWhenEmpty: ["arena_history", "individual_code", "certifications"],
    minimise:      ["individual_tasks", "exam_scores"],
  },


  // ── GROWTH — Student / Fresher ───────────────────────────────────────────────
  [ARCHETYPES.GROWTH]: {
    name:      "The Growth Map",
    tagline:   "Learning velocity, proof of potential, consistent progress",
    icon:      "🌱",

    palette: {
      hero:       "linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#EA580C",
      accentSoft: "#FFF7ED",
      tag:        "#C2410C",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    46,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "aspiration",      // what I'm building towards — 1 sentence
      "elo_journey",     // ELO growth sparkline — the core proof
      "stats",           // challenges completed, avg score, streak
      "projects",        // 2-3 projects with learning context ("Built to learn X")
      "skills",          // radar — honest, current level
      "arena",           // full challenge history feed
      "education",
      "contact",
    ],

    sectionEmphasis: {
      elo_journey: "LEAD",    // the ELO growth chart is the headline proof
      projects:    "STRONG",  // with learning context annotations
      arena:       "STRONG",  // shows consistency
      education:   "MEDIUM",
    },

    proofElements: [
      "elo_sparkline",        // ELO growth over time chart
      "challenge_count",      // "23 Arena challenges completed"
      "streak_badge",         // "7-day active streak"
      "learning_annotation",  // per-project "I built this to learn X"
      "github_activity",      // contribution calendar
      "course_certificates",  // Coursera / freeCodeCamp / etc.
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Software Developer"
      const elo = ud.eloRating
      const streak = ud.arenaStreak || 0
      return `Fresher ${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} challenges completed` : ""}${streak >= 5 ? ` · ${streak}-day streak` : ""}`
    },

    heroTagline:     "Proving skills, one challenge at a time.",
    proofBadgeLabel: "Growth Signals",

    uniqueWidgets: [
      { id:"elo_journey",    label:"ELO Journey",             desc:"sparkline chart showing ELO growth over time" },
      { id:"progress_grid",  label:"Skills Progress Grid",    desc:"skills grid with honest confidence levels" },
      { id:"learning_card",  label:"What I'm Learning Now",   desc:"current focus + next milestone" },
    ],

    hideWhenEmpty: ["years_experience", "leadership", "press", "publications"],
    minimise:      ["executive_summary", "compensation_expectations"],
  },


  // ── FULLSTACK — Full Stack / SWE ──────────────────────────────────────────
  [ARCHETYPES.FULLSTACK]: {
    name:      "The Breadth Map",
    tagline:   "End-to-end ownership, shipping ability, range",
    icon:      "⚡",

    palette: {
      hero:       "linear-gradient(135deg,#EEF2FF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#6366F1",
      accentSoft: "#EEF2FF",
      tag:        "#4F46E5",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    48,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "summary",
      "stats",
      "projects",         // end-to-end built products — "I shipped this solo"
      "skills",           // split radar — frontend half + backend half
      "arena",
      "certifications",
      "contact",
    ],

    sectionEmphasis: {
      projects: "LEAD",    // full-stack shipped products are the proof
      skills:   "STRONG",  // split FE/BE radar
      arena:    "STRONG",
    },

    proofElements: [
      "shipped_product",      // "Built end-to-end by me" badge
      "tech_stack_badges",    // full stack — React + Node + PostgreSQL
      "github_repo_links",
      "live_demo_links",
      "arena_score",
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Full Stack Developer"
      const elo = ud.eloRating
      const topSkills = (ud.skill_graph || []).slice(0, 3).map(s => s.label || s.skill).join(", ")
      return `${role} · ${tier.label} tier${topSkills ? ` · ${topSkills}` : ""}${tasks > 0 ? ` · ${tasks} Arena challenges` : ""}`
    },

    heroTagline:     "From idea to production — end to end.",
    proofBadgeLabel: "Shipped Products",

    uniqueWidgets: [
      { id:"split_radar",    label:"Split Skill Radar",       desc:"frontend skills left, backend skills right" },
      { id:"shipped_badge",  label:"Shipped by Me",           desc:"'Solo shipped' badge per project" },
    ],

    hideWhenEmpty: ["press", "thought_leadership"],
    minimise:      ["executive_bio"],
  },


  // ── MOBILE — Mobile Developer ─────────────────────────────────────────────
  [ARCHETYPES.MOBILE]: {
    name:      "The App Showcase",
    tagline:   "Shipped apps, mobile UX, store performance",
    icon:      "📱",

    palette: {
      hero:       "linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#3B82F6",
      accentSoft: "#EFF6FF",
      tag:        "#2563EB",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    48,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "summary",
      "apps",           // phone mockup grid — app name, store links, ratings
      "stats",
      "skills",         // radar — Swift/Kotlin/Flutter, UX, Performance
      "arena",
      "certifications",
      "contact",
    ],

    sectionEmphasis: {
      apps:  "LEAD",     // phone mockup gallery is the hero section
      skills:"STRONG",
      arena: "MEDIUM",
    },

    proofElements: [
      "app_store_link",      // App Store / Play Store link + rating
      "download_count",      // "50k+ downloads"
      "phone_mockup",        // screenshot in phone frame
      "store_rating",        // ⭐ 4.7 / 5.0
      "tech_stack_badges",   // Swift, Kotlin, Flutter, React Native
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || "Mobile Developer"
      const elo = ud.eloRating
      return `${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} challenges` : ""}`
    },

    heroTagline:     "Building apps people actually open.",
    proofBadgeLabel: "Published Apps",

    uniqueWidgets: [
      { id:"phone_mockup",  label:"Phone Mockup Gallery",     desc:"app screenshots in device frames" },
      { id:"store_badge",   label:"App Store Badge",          desc:"store rating + download count" },
    ],

    hideWhenEmpty: ["web_demos", "infra_diagrams"],
    minimise:      ["backend_apis", "deployment_pipelines"],
  },


  // ── ENGINEER — Hardware / ECE / EEE / Mech / Civil ───────────────────────
  [ARCHETYPES.ENGINEER]: {
    name:      "The Build Map",
    tagline:   "Hardware expertise, simulation proof, real-world projects",
    icon:      "⚙️",

    palette: {
      hero:       "linear-gradient(135deg,#ECFDF5 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#10B981",
      accentSoft: "#ECFDF5",
      tag:        "#059669",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    48,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "summary",
      "projects",        // hardware/simulation projects with tools used
      "stats",
      "skills",          // radar: domain tools (ANSYS, Verilog, AutoCAD, ETABS…)
      "arena",           // engineering challenge completions
      "certifications",  // GATE, domain certs, professional memberships
      "education",
      "contact",
    ],

    sectionEmphasis: {
      projects:      "LEAD",    // hardware/simulation projects are the proof
      skills:        "STRONG",  // domain tools radar matters to hiring engineers
      certifications:"STRONG",  // GATE score, professional certs
      arena:         "MEDIUM",
      education:     "MEDIUM",
    },

    proofElements: [
      "simulation_screenshot",  // ANSYS/MATLAB/LTSpice/AutoCAD output images
      "project_specs",          // specs: power rating, load capacity, frequency, etc.
      "tool_badges",            // ANSYS, MATLAB, Verilog, SolidWorks, AutoCAD, ETABS…
      "gate_score",             // GATE percentile if present
      "publication_link",       // paper or report link
      "elo_score",              // Arena engineering challenge ELO
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || ud.job_role || "Engineer"
      const elo = ud.eloRating
      return `${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} engineering challenges` : ""}`
    },

    heroTagline:     "Engineering solutions that work in the real world.",
    proofBadgeLabel: "Engineering Proof",

    uniqueWidgets: [
      { id:"simulation_gallery", label:"Simulation Gallery",      desc:"ANSYS/MATLAB/LTSpice/PCB screenshots with annotations" },
      { id:"tool_proficiency",   label:"Tools & Software",        desc:"domain software radar — CAD, EDA, simulation, BIM" },
      { id:"project_specs",      label:"Project Specifications",  desc:"key specs: voltage, load, frequency, material grade, etc." },
    ],

    hideWhenEmpty: ["app_store_link", "web_demos", "api_docs"],
    minimise:      ["javascript_stack", "cloud_services"],
  },


  // ── PROFESSIONAL — Pharmacy / MBA / HR / Finance / Marketing ─────────────
  [ARCHETYPES.PROFESSIONAL]: {
    name:      "The Impact Map",
    tagline:   "Domain expertise, measurable outcomes, professional credentials",
    icon:      "🎯",

    palette: {
      hero:       "linear-gradient(135deg,#F5F3FF 0%,#FFFFFF 55%,#FAF7F2 100%)",
      accent:     "#8B5CF6",
      accentSoft: "#F5F3FF",
      tag:        "#7C3AED",
      terminal:   false,
    },

    typography: {
      headingFont: "'DM Sans', sans-serif",
      codeFont:    "'DM Mono', monospace",
      headingWeight: 800,
      heroSize:    48,
      monoAccent:  false,
    },

    sections: [
      "hero",
      "summary",
      "impact",          // 3-4 bullet impact statements (₹, %, patients, projects)
      "skills",          // domain skills radar: pharmacology, strategy, financial modelling…
      "projects",        // case studies, research, campaigns, clinical work
      "certifications",  // CDSCO, CFA, SHRM, PMP, Six Sigma, MBA specialisation
      "arena",
      "education",
      "contact",
    ],

    sectionEmphasis: {
      impact:        "LEAD",    // quantified outcomes headline the portfolio
      certifications:"STRONG",  // professional credentials matter in these fields
      skills:        "STRONG",
      projects:      "MEDIUM",
      arena:         "MEDIUM",
    },

    proofElements: [
      "impact_metrics",     // ₹ saved, % improvement, patients served, deals closed
      "credential_badges",  // professional credential logos
      "case_study_link",    // MBA/pharmacy/HR case study PDFs or links
      "publication_link",   // research papers, pharmacovigilance reports
      "elo_score",          // Arena professional-track ELO
    ],

    recruiterSummary: (ud, tier, tasks) => {
      const role = ud.keyword || ud.job_role || "Professional"
      const elo = ud.eloRating
      return `${role} · ${tier.label} tier${tasks > 0 ? ` · ${tasks} domain challenges` : ""}`
    },

    heroTagline:     "Domain expertise backed by measurable outcomes.",
    proofBadgeLabel: "Credentials & Impact",

    uniqueWidgets: [
      { id:"impact_bullets",  label:"Impact Statements",     desc:"3-4 quantified outcomes: '₹2Cr revenue impact', '200 patients counselled'" },
      { id:"credential_wall", label:"Credential Wall",       desc:"professional certifications, licenses, memberships" },
      { id:"case_study",      label:"Case Study Spotlight",  desc:"one deep case study with context, analysis, and outcome" },
    ],

    hideWhenEmpty: ["github_activity", "app_store_link", "deployment_pipelines"],
    minimise:      ["code_challenges", "system_design"],
  },
}

// ── Visual style presets per archetype ────────────────────────────────────────
export const SECTION_VISIBILITY = {
  LEAD:   { opacity:1, scale:1.0, order: 1, padding:"large" },
  STRONG: { opacity:1, scale:0.95, order: 2, padding:"medium" },
  MEDIUM: { opacity:1, scale:0.9, order:  3, padding:"medium" },
  HIDE:   { opacity:0, scale:0, order: 99, padding:"none" },
}

// ── Helper: get config for a user ─────────────────────────────────────────────
export function getPortfolioConfig(userData) {
  const archetype  = detectArchetype(userData)
  const seniority  = detectSeniority(userData)
  const config     = ARCHETYPE_CONFIG[archetype]
  return { archetype, seniority, config }
}
