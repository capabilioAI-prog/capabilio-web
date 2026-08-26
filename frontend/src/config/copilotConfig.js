// ============================================================
// Capabilio AI Career Copilot — Pipeline Configuration
// ============================================================
import { getTier } from "../theme"

// ── 1. MODEL ROUTING ────────────────────────────────────────

export const GROQ_MODELS = {
  FAST:    "llama-3.1-8b-instant",      // classifier + free tier
  CAPABLE: "llama-3.3-70b-versatile",   // pro + elite
}

export const TIER_CONFIG = {
  free: {
    model:       GROQ_MODELS.FAST,
    maxTokens:   200,
    temperature: 0.3,
    questionLimit: 5,           // resets monthly
    historyTurns:  0,           // no memory
    maxWordCount:  120,
    features: {
      profilePersonalization: "basic",   // name + role only
      skillGapAnalysis:       false,
      portfolioFeedback:      false,
      strategicPlanning:      false,
      deepAnalysis:           false,
    },
  },
  pro: {
    model:       GROQ_MODELS.CAPABLE,
    maxTokens:   600,
    temperature: 0.5,
    questionLimit: Infinity,
    historyTurns:  10,
    maxWordCount:  400,
    features: {
      profilePersonalization: "full",    // skills, projects, ELO, timeline
      skillGapAnalysis:       true,
      portfolioFeedback:      true,
      strategicPlanning:      false,
      deepAnalysis:           true,
    },
  },
  elite: {
    model:       GROQ_MODELS.CAPABLE,
    maxTokens:   1200,
    temperature: 0.6,
    questionLimit: Infinity,
    historyTurns:  20,
    maxWordCount:  800,
    features: {
      profilePersonalization: "deep",    // + ELO trajectory, 90-day plans
      skillGapAnalysis:       true,
      portfolioFeedback:      true,
      strategicPlanning:      true,
      deepAnalysis:           true,
      recruiterPositioning:   true,
      careerRoadmap:          true,
    },
  },
}

// ── 2. INTENT CLASSIFIER ────────────────────────────────────

export const CLASSIFIER_SYSTEM_PROMPT = `You are a topic classifier for Capabilio — a career OS platform.
Classify the user message into exactly one label.

CAREER — if the message is about any of:
  profile, resume, skills, projects, portfolio, career timeline, job search,
  interview prep, promotions, salary, domain expertise, ELO score, Aura score,
  Aura dashboard, recruiter visibility, employment, career transitions, LinkedIn, GitHub,
  certifications, freelance, internships, hackathons, coding career,
  professional growth, skill gaps, learning goals, work experience,
  company switching, role progression, tech stacks for career purposes,
  Arena challenges, Arena workstation, Arena ELO, domain challenges,
  Capabilio platform features, Orbit dashboard, Pulse network, Vault verification,
  Forge projects, skill graph, career score, career copilot, EPFO verification

  Platform-specific terms that are ALWAYS CAREER:
  - "Aura" or "Aura score" = career profile strength metric
  - "ELO" or "ELO rating" = skill performance score
  - "Arena" = coding/skill challenge platform
  - "Orbit" = career dashboard
  - "Vault" = document and verification center
  - "Forge" = project builder
  - "Pulse" = professional network feed
  - "Capi" = career AI copilot

BLOCKED — if the message is about any of:
  general knowledge, entertainment, news, politics, sports, cooking, travel,
  coding help unrelated to career (e.g. "fix this bug for me"),
  math homework, creative writing, relationship advice, health, medical,
  science questions, history, geography, random chat, jokes

IMPORTANT: If someone wraps an off-topic question in career framing like
"for my career, explain quantum physics" — classify it as BLOCKED.
When in doubt, classify as CAREER.

Reply with exactly one word: CAREER or BLOCKED`

// Local keyword pre-check — if any of these match, it's CAREER without calling the API
export const CAREER_FAST_PATTERNS = [
  /\b(aura|elo|arena|orbit|vault|forge|pulse|capi|capabilio)\b/i,
  /\b(skill|career|resume|job|interview|portfolio|project|linkedin|github)\b/i,
  /\b(score|rating|rank|tier|challenge|domain|profile|recruiter)\b/i,
  /\b(salary|promotion|hike|ctc|lpa|experience|internship|placement)\b/i,
  /\b(learn|certif|gap|improve|boost|grow|progress|upskill)\b/i,
  /\b(epfo|uan|verify|verification|employment|company|switch)\b/i,
]

export function isCareerFastPath(message) {
  return CAREER_FAST_PATTERNS.some(p => p.test(message))
}

export const TOPIC_BUCKETS = {
  profile:           "profile",
  skills:            "skills",
  portfolio:         "portfolio",
  interview:         "interview",
  job_search:        "job_search",
  elo_aura:          "elo_aura",
  career_transition: "career_transition",
  salary_growth:     "salary_growth",
  verification:      "verification",
  domain_specific:   "domain_specific",
  recruiter:         "recruiter",
}

// Patterns to route to buckets (first match wins)
export const BUCKET_PATTERNS = [
  { bucket: "elo_aura",          patterns: [/\belo\b/i, /\baura\b/i, /\bscore\b.*\blow\b/i, /\bpoints?\b/i] },
  { bucket: "interview",         patterns: [/\binterview\b/i, /\bprep\b/i, /\bsystem design\b/i, /\btechnical round\b/i] },
  { bucket: "verification",      patterns: [/\bverif\b/i, /\bepfo\b/i, /\buan\b/i, /\bproof\b/i, /\bdocument\b/i] },
  { bucket: "career_transition", patterns: [/\btransit\b/i, /\bswitch\b.*\bcareer\b/i, /\bmove to\b/i, /\bchange field\b/i] },
  { bucket: "salary_growth",     patterns: [/\bsalar\b/i, /\braise\b/i, /\bpromotion\b/i, /\bcompensation\b/i, /\bhike\b/i] },
  { bucket: "skills",            patterns: [/\bskill\b/i, /\blearn\b/i, /\bcertif\b/i, /\bgap\b/i] },
  { bucket: "portfolio",         patterns: [/\bportfolio\b/i, /\bproject\b/i, /\bshowcase\b/i, /\bgithub\b/i] },
  { bucket: "recruiter",         patterns: [/\brecruit\b/i, /\bhire\b/i, /\bvisib\b/i, /\bstand out\b/i] },
  { bucket: "job_search",        patterns: [/\bjob\b/i, /\bappl[yi]\b/i, /\bopening\b/i, /\brole\b/i, /\bposition\b/i] },
  { bucket: "profile",           patterns: [/\bprofile\b/i, /\bheadline\b/i, /\bbio\b/i] },
]

export function classifyBucket(message) {
  for (const { bucket, patterns } of BUCKET_PATTERNS) {
    if (patterns.some(p => p.test(message))) return bucket
  }
  return TOPIC_BUCKETS.domain_specific
}

// ── Coach intent — "what should I do next" style questions ─────────────────
// ADDED 2026-07-14: routes these specific questions to the MCP-backed
// /api/copilot/coach endpoint (tool-augmented: real ELO/role/weak-skills data
// via arena.recommendNextChallenge + elo.getScore + student.getCurrentRole/
// getWeakSkills) instead of the direct-Groq path. Deliberately narrow — every
// other message keeps using the existing client-side Groq flow unchanged.
const COACH_INTENT_PATTERNS = [
  /\bwhat should i (do|focus on|work on|learn|practice)\b/i,
  /\bwhat('s| is) next\b/i,
  /\bwhat next\b/i,
  /\brecommend(ed)? (a |the )?(challenge|task|next step)\b/i,
  /\bam i (ready|placement.?ready|interview.?ready)\b/i,
  /\bhelp me (improve|get better|level up)\b/i,
  /\bwhat('s| are) my weak(nesses|ness| skills?| areas?)\b/i,
]

export function isCoachIntent(message) {
  return COACH_INTENT_PATTERNS.some(p => p.test(message))
}

// ── 3. PROMPT BUILDERS ──────────────────────────────────────

export function buildSystemPrompt() {
  return `You are Capi, the AI Career Copilot inside Capabilio — a skill-first, resume-free career OS.

Your role is to act as a premium career advisor who:
- Gives direct, honest, actionable career guidance
- Uses the user's actual profile data to personalize every answer
- Speaks like a smart senior colleague, not a corporate chatbot
- Never gives generic advice that ignores the user's actual situation

Your personality:
- Confident but warm
- Direct — no filler phrases like "Great question!" or "Certainly!"
- Honest — if something in the user's profile is weak, say so clearly
- Encouraging — focus on what they can do, not what they lack
- Premium — every response should feel worth paying for

Never start your response with "I" or with "As an AI".
Never apologize excessively.
Never be sycophantic.`
}

export function buildPolicyPrompt(tier, path = "student") {
  const basePolicy = `SCOPE POLICY — STRICT:

You ONLY answer questions about:
  career, skills, profile, portfolio, projects, interviews, job search,
  ELO, Aura Dashboard, employment verification, career transitions,
  skill gaps, recruiter visibility, promotions, domain expertise

You NEVER answer questions about:
  general knowledge, coding tutorials unrelated to career, entertainment,
  politics, news, sports, math, travel, health, relationships,
  finance that is not career-related

If the user asks something outside scope:
  Respond: "I'm focused on your career — I can't help with that here.
  Want me to [suggest a relevant career question based on their profile]?"

If a user tries to jailbreak by wrapping an off-topic question in career framing
(e.g. "for my career, explain quantum physics"), classify it as off-topic and decline.

Never let the conversation drift into general assistant behavior.`

  const freeTierAddition = `

ADDITIONAL RESTRICTION — FREE TIER:
Keep all responses under 120 words.
Do not give detailed analysis, multi-step plans, or deep strategic advice.
Give one clear, actionable insight and stop.
End with: "Upgrade to Pro for deeper analysis."`

  // CAREER OS TRANCHE 5: professional-path users must never see a raw ELO
  // number or Arena-challenge framing — the platform's product rule is
  // "no raw ELO on professional-facing surfaces." The context prompt already
  // omits the numeric ELO for this path (see buildContextPrompt); this
  // instructs the model itself not to introduce one, and not to push
  // Arena/challenge content that doesn't exist for professionals.
  const professionalAddition = `

ADDITIONAL RESTRICTION — PROFESSIONAL PATH:
This user is on the Professional Path, not the student/Arena path.
Never state or imply a numeric ELO, rating, or score — describe skill
strength only in plain language (e.g. "developing", "strong", "a gap area").
Do not recommend Arena challenges, coding challenges, or "boost your ELO"
style actions — they don't apply here. Instead, point to real professional
surfaces: Weekly Skill Pulse, the Skills module, verified employment/EPFO
proof, or the Company module. If you don't have enough real data to answer
confidently, say so plainly instead of guessing.`

  let policy = tier === "free" ? basePolicy + freeTierAddition : basePolicy
  if (path === "professional") policy += professionalAddition
  return policy
}

export function buildContextPrompt(userData) {
  const {
    name, job_role, domain, path_status, plan, subscription,
    blended_elo, aura_score,
    skills = [], timeline = {}, career_events = [],
    arena_tasks = [], completeness_score,
  } = userData

  const isProfessional = path_status === "professional"

  const topSkills = (skills.core || []).slice(0, 5)
    .map(s => `  - ${s.name} (${s.level || "unrated"})`)
    .join("\n") || "  None added yet"

  const recentProjects = (timeline.personal_projects || []).slice(0, 3)
    .map(p => `  - ${p.title}: ${(p.description || "").slice(0, 80)}`)
    .join("\n") || "  None added yet"

  const verifiedJobs = (career_events || [])
    .filter(e => e.verification_level >= 3)
    .slice(0, 2)
    .map(e => `  - ${e.role_title || "Role"} at ${e.company_name || "Company"} (${e.start_date || "?"} – ${e.end_date || "Present"})`)
    .join("\n") || "  None verified yet"

  const arenaCount  = arena_tasks.length
  const avgScore    = arenaCount
    ? Math.round(arena_tasks.reduce((s, t) => s + (t.score || 0), 0) / arenaCount)
    : 0
  const topDomain   = getTopDomain(arena_tasks)

  const eloTier     = getEloTier(blended_elo)
  const missingNote = getMissingFields(userData)

  // TRANCHE 1 FINAL CANONICAL CLEANUP (2026-07-25): the earlier Tranche 5
  // line said "no numeric score shown to professionals" — that rule was
  // REVERSED by the 2026-07-25 product decision: professionals now have a
  // real, visible, assessment-driven Professional ELO (Skills tab). What
  // must NOT be presented as a professional's score is the old Arena/
  // profile-derived `blended_elo` this function receives — so the
  // professional line points Capi at the real Professional ELO surface
  // instead of either quoting the wrong number or denying a score exists.
  // Student path keeps the exact prior numeric line unchanged.
  const skillLine = isProfessional
    ? `Skill Level:    ${eloTier} — the user's real numeric score is their Professional ELO, shown on the Skills tab; it moves only from Weekly Skill Pulse performance. Do not quote any other number as their "ELO".`
    : `ELO Rating:     ${blended_elo || 600} (${eloTier})`

  const arenaBlock = isProfessional
    ? ""
    : `

Arena Performance:
  Challenges completed: ${arenaCount}
  Average score: ${avgScore || "N/A"}
  Strongest domain: ${topDomain || "Not enough data"}`

  return `USER PROFILE CONTEXT:

Name:           ${name || "User"}
Role:           ${job_role || "Not specified"}
Domain:         ${domain || "Not specified"}
Career Path:    ${path_status || "student"}
${skillLine}
Aura Score:     ${aura_score || 0} (profile-strength/completeness signal — NOT a skill score, never present it as one)
Plan:           ${plan || subscription || "free"}

Core Skills (top 5):
${topSkills}

Recent Projects:
${recentProjects}

Verified Employment:
${verifiedJobs}${arenaBlock}

Profile Completeness: ${completeness_score || 0}%
${missingNote ? `Missing: ${missingNote}` : "Profile looks complete."}

Use this context to personalize every answer.
Reference specific skills, projects, and scores when relevant.
If the question requires data you don't have, say what is missing and how to add it.`
}

function getEloTier(elo) {
  return getTier(elo || 0).label
}

// CAREER OS TRANCHE 5: honest "what real data went into this answer" note.
// This does NOT ask the model to self-report what it used (which risks
// fabrication) — it reflects exactly the fields we actually included in the
// context prompt above, so it is true regardless of how the model responded.
export function buildGroundingNote(userData = {}) {
  const parts = []
  const skillCount = (userData.skills?.length ?? userData.skills?.core?.length) || 0
  if (skillCount > 0) parts.push(`${skillCount} tracked skill${skillCount === 1 ? "" : "s"}`)
  const role = userData?.jobRole || userData?.job_role
  if (role) parts.push(`target role "${role}"`)
  const projectCount = userData?.projects?.length || 0
  if (projectCount > 0) parts.push(`${projectCount} project${projectCount === 1 ? "" : "s"}`)
  const path = userData?.pathStatus || userData?.path_status
  if (path === "professional") {
    const verifiedCount = (userData?.careerEvents || []).filter(e => e.verification_level >= 3).length
    if (verifiedCount > 0) parts.push(`${verifiedCount} verified employment record${verifiedCount === 1 ? "" : "s"}`)
  }
  if (parts.length === 0) return "Based on: limited profile data — add skills and role details for more specific answers."
  return `Based on: ${parts.join(", ")} from your profile.`
}

function getTopDomain(tasks) {
  if (!tasks || tasks.length === 0) return null
  const counts = {}
  tasks.forEach(t => { if (t.domain) counts[t.domain] = (counts[t.domain] || 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || null
}

function getMissingFields(userData) {
  const missing = []
  if (!userData.job_role)            missing.push("job role")
  if (!userData.domain)              missing.push("domain")
  if ((userData.skills?.core?.length || 0) < 3) missing.push("core skills (add 3+)")
  if ((userData.timeline?.personal_projects?.length || 0) < 1) missing.push("projects")
  return missing.join(", ")
}

// ── 4. POST-FILTER ──────────────────────────────────────────

export const DRIFT_PATTERNS = [
  /\b(recipe|cook|weather|sport|movie|song|lyrics|president|election)\b/i,
  /\b(explain (quantum|relativity|calculus|thermodynamic))\b/i,
  /\b(write me a (story|poem|essay|joke))\b/i,
  /\b(who (invented|discovered|won the))\b/i,
  /\bstock (price|market|ticker)\b/i,
  /\b(capital of|population of|history of)\b/i,
  /\b(translate|in (Spanish|French|Hindi|Arabic))\b/i,
]

export function hasDrift(response) {
  return DRIFT_PATTERNS.some(p => p.test(response))
}

export function qualityCheck(response, tier) {
  if (!response || response.trim().length < 20) return false
  if (tier === "free" && response.split(" ").length > 160) return false
  if (/\[INSERT|TODO:|<PLACEHOLDER>/i.test(response)) return false
  return true
}

export const FALLBACK_RESPONSE = (userName) =>
  `Something went wrong on my end. Let me try again — what's the most pressing career challenge you're facing right now, ${userName || "there"}?`

// ── 5. REFUSAL TEMPLATES ────────────────────────────────────

export function buildBlockedResponse(userData, bucket) {
  const suggestions = getSuggestionChips(userData)
  const topSuggestion = suggestions[0] || "Ask me about your career progress"
  return `I'm your career copilot — that topic is outside what I can help with here.

Here's something I can help you with: **${topSuggestion}**`
}

export function buildLimitHitResponse() {
  return {
    type:    "limit_hit",
    message: "You've used all 5 free questions this month. Upgrade to Pro for unlimited career guidance, deep skill analysis, and personalized advice.",
    cta:     "Upgrade to Pro →",
    ctaPath: "/pricing",
  }
}

export function buildFreeUpsellNudge(bucket) {
  const deepTopics = ["career_transition", "salary_growth", "recruiter"]
  if (!deepTopics.includes(bucket)) return null
  return {
    message: "This topic benefits from deeper analysis. Upgrade to Pro for a full strategic breakdown.",
    cta:     "Unlock with Pro →",
    ctaPath: "/pricing",
  }
}

// ── 6. CONTEXT CHIPS ────────────────────────────────────────

export function getSuggestionChips(userData) {
  const chips = []

  if ((userData.aura_score || 0) < 50)
    chips.push("How do I improve my Aura score?")

  // CAREER OS TRANCHE 5: "boost my ELO"/Arena-challenge framing is
  // student-path only — professional users don't see Arena content or raw
  // ELO, so give them a Weekly Pulse/Skills equivalent instead.
  if (userData.path_status === "professional") {
    if ((userData.blended_elo || 600) < 700)
      chips.push("What should I focus on to strengthen my skills?")
  } else if ((userData.blended_elo || 600) < 700) {
    chips.push("Which challenges boost my ELO fastest?")
  }

  if (!userData.uan_verified && userData.path_status === "professional")
    chips.push("How do I verify my employment?")

  if ((userData.skills?.core?.length || 0) < 3)
    chips.push("What core skills should I add?")

  if ((userData.timeline?.personal_projects?.length || 0) < 2)
    chips.push("How do I build a strong portfolio?")

  if (userData.path_status === "student")
    chips.push("Am I ready to start applying for jobs?")

  if ((userData.completeness_score || 0) < 60)
    chips.push("What's missing from my profile?")

  return chips.slice(0, 3)
}

// ── 7. USAGE HELPERS ────────────────────────────────────────

export function canSendMessage(tier, questionCount) {
  if (tier === "free" && questionCount >= TIER_CONFIG.free.questionLimit) {
    return { allowed: false, reason: "limit_hit" }
  }
  return { allowed: true }
}

export function getRemainingQuestions(tier, questionCount) {
  if (tier !== "free") return Infinity
  return Math.max(0, TIER_CONFIG.free.questionLimit - questionCount)
}

export function shouldShowLimitWarning(tier, questionCount) {
  if (tier !== "free") return false
  return questionCount === TIER_CONFIG.free.questionLimit - 1  // "1 question remaining"
}

// ── 8. TYPING INDICATOR TEXT ────────────────────────────────

export function getThinkingText(tier, bucket) {
  if (bucket === "elo_aura")          return "Analyzing your ELO and Aura..."
  if (bucket === "portfolio")         return "Reviewing your portfolio..."
  if (bucket === "career_transition") return "Mapping your career path..."
  if (bucket === "interview")         return "Preparing interview guidance..."
  if (tier === "elite")               return "Building your career strategy..."
  if (tier === "pro")                 return "Analyzing your profile..."
  return "Thinking..."
}

// ── 9. CONVERSATION HISTORY BUILDER ─────────────────────────

export function buildConversationMessages({
  systemPrompt,
  policyPrompt,
  contextPrompt,
  history = [],
  userMessage,
}) {
  return [
    { role: "system", content: systemPrompt   },
    { role: "system", content: policyPrompt   },
    { role: "system", content: contextPrompt  },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user",   content: userMessage    },
  ]
}

// ── 10. MODEL SELECTOR ──────────────────────────────────────

export function selectModel(tier) {
  return tier === "free" ? GROQ_MODELS.FAST : GROQ_MODELS.CAPABLE
}

export function getTierConfig(tier) {
  return TIER_CONFIG[tier] || TIER_CONFIG.free
}
