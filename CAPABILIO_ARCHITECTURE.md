# Capabilio — Architectural and Product Document

**Version:** 1.0  
**Audience:** Full-stack developers, product engineers, new team members, technical stakeholders  
**Purpose:** Complete end-to-end system reference — product philosophy, architecture, data models, API design, module breakdown, and implementation guide  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Problem](#2-core-problem)
3. [Target Users](#3-target-users)
4. [Product Philosophy](#4-product-philosophy)
5. [Product Paths](#5-product-paths)
6. [Navigation Model](#6-navigation-model)
7. [System Modules](#7-system-modules)
8. [Arena — Execution Engine](#8-arena--execution-engine)
9. [Aura — Identity and Intelligence Layer](#9-aura--identity-and-intelligence-layer)
10. [Skill Studio — Structured Learning Engine](#10-skill-studio--structured-learning-engine)
11. [Launchpad — Job Market Bridge](#11-launchpad--job-market-bridge)
12. [Verification and Trust Layer](#12-verification-and-trust-layer)
13. [Core Data Model](#13-core-data-model)
14. [APIs and Services](#14-apis-and-services)
15. [Event Flow and System Logic](#15-event-flow-and-system-logic)
16. [Example User Journeys](#16-example-user-journeys)
17. [Example Recruiter Journeys](#17-example-recruiter-journeys)
18. [Role and Skill System](#18-role-and-skill-system)
19. [ELO and Proof System](#19-elo-and-proof-system)
20. [Recommendation Engine](#20-recommendation-engine)
21. [Frontend Architecture](#21-frontend-architecture)
22. [Backend Architecture](#22-backend-architecture)
23. [UI Examples and Screen References](#23-ui-examples-and-screen-references)
24. [Step-by-Step Build Order](#24-step-by-step-build-order)
25. [Risks and Future Extensions](#25-risks-and-future-extensions)

---

## 1. Product Overview

Capabilio is an AI-powered Career Operating System built for Indian talent. It is not a job board, not a resume builder, and not a course platform. It is the infrastructure layer between a person's actual skills and the job market's perception of them.

At its core, Capabilio solves a structural problem: resumes lie, credentials inflate, and hiring managers cannot distinguish real skill from performed competence. Capabilio replaces self-reported claims with timestamped, AI-evaluated performance artifacts — called **Proof** — that are generated through live execution in domain-specific workspaces called **Arena**.

The platform is organized around four distinct user paths (Student, Professional, Executive, Organization), a persistent skill identity system called **Aura**, a structured learning engine called **Skill Studio**, a job and opportunity bridge called **Launchpad**, and a recruiter-facing discovery and verification layer.

Every action in Capabilio feeds a live ELO score. Every challenge completion creates a proof artifact. Every proof artifact is recruiterpublic and timestamped. The system is designed to make skill visible, verifiable, and comparable at scale.

### Platform at a Glance

| Layer | Module | Purpose |
|-------|--------|---------|
| Execution | Arena | Live coding, data, design, ops challenges |
| Identity | Aura | Skill graph, proof, ELO, career positioning |
| Learning | Skill Studio | Personalized skill paths with AI lessons |
| Opportunity | Launchpad | Job matching, applications, recruiter visibility |
| Signal | Pulse | Market trends, ELO decay, readiness tracking |
| Trust | Verification | Cert validation, experience checks, proof QA |
| Recruiter | Org Tools | Search, shortlist, pipeline, team intelligence |

---

## 2. Core Problem

### The Current Hiring System is Broken

**From the candidate side:**

- Freshers with strong real skills have no way to prove them. They are filtered out before a recruiter even looks at their work.
- Professionals who have grown through self-study, side projects, or non-linear careers have no formal signal to show that growth.
- Candidates from non-tier-1 colleges are systematically deprioritized by ATS systems that filter by institution, not capability.
- Resumes are static, unverifiable documents. They describe what someone *claims*, not what they can *do*.

**From the recruiter side:**

- Recruiters spend 40–70% of screening time on candidates who fail basic technical checks.
- Interview pipelines collapse because candidates look good on paper but can't execute.
- There is no standard signal for "this person can actually do the job."
- Skill assessment tools (HackerRank, Codility, etc.) are standalone, not integrated into a continuous identity.

**What the market currently offers:**

- Job boards (Naukri, LinkedIn): profile-based, not proof-based.
- Assessment platforms (HackerRank, LeetCode): measure algorithmic thinking, not job-function skill.
- Course platforms (Coursera, Udemy): certifications exist but are not tied to execution proof.
- Resume tools (Canva, Zety): better formatting, same unverifiable claims.

**Capabilio's position:** None of these products create a persistent, verifiable, role-specific skill identity that updates continuously as a person works. Capabilio does.

---

## 3. Target Users

### 3.1 Student Path Users
**Who:** Engineering students, recent graduates (0–2 years), coding bootcamp graduates, people attempting career transitions into tech.  
**Need:** Build a credible proof-of-work portfolio before entering the job market.  
**Current pain:** No work experience → no interviews → no experience. Classic chicken-and-egg.  
**Capabilio's value:** Arena challenges simulate real job tasks. Completed challenges generate Proof artifacts that recruiters can inspect. ELO starts building from Day 1.

### 3.2 Professional Path Users
**Who:** Working professionals (2–10 years), people looking to switch roles or companies, people upskilling in new domains.  
**Need:** Reposition their profile for a new role, demonstrate current-market readiness.  
**Current pain:** Their resume reflects past roles, not current capability. Skill decay is invisible. They can't signal growth that happened outside formal employment.  
**Capabilio's value:** Skill Graph shows real domain strength. Proof artifacts prove current-state ability. Skill Studio fills gaps with a plan. Launchpad surfaces matching opportunities.

### 3.3 Executive Path Users
**Who:** Senior professionals (10+ years), team leads, CTOs, directors, VPs.  
**Need:** Communicate strategic capability and leadership track record, not just technical skills.  
**Current pain:** Standard technical assessments are irrelevant. Their value is in outcomes, decisions, and teams built — not algorithms.  
**Capabilio's value:** Executive-specific assessments, case study Arenas, strategic proof artifacts, a different profile format that emphasizes outcomes over tasks.

### 3.4 Organization Path Users
**Who:** Hiring companies, universities, bootcamps, staffing firms.  
**Need:** Internal skill mapping, hiring pipelines, team assessments, student placement intelligence.  
**Current pain:** No centralized way to assess, track, or benchmark skill across a cohort or team.  
**Capabilio's value:** Organization-level analytics, challenge deployment, team ELO benchmarking, bulk candidate evaluation.

---

## 4. Product Philosophy

These principles are non-negotiable and should inform every design, architecture, and UX decision.

### 4.1 Proof Over Claims
Every major feature must produce a verifiable artifact. A lesson completed is not a credential. A challenge *executed and scored* is. The system rewards doing, not watching.

### 4.2 Role-First Identity
Capabilio does not build a generic "tech person" profile. Every user is developing skill in a specific role context: Data Analyst, Frontend Developer, DevOps Engineer, etc. The role shapes the challenges, the skill graph, the gap analysis, and the recommendations.

### 4.3 India-First Realism
Salary bands, company names, industry benchmarks, hiring patterns, and market signals are India-specific. "Full stack at a startup" in Bengaluru is different from "full stack at a startup" in San Francisco. The system knows this distinction.

### 4.4 ELO as Live Identity
The ELO score is not a vanity number. It decays without activity, reflects actual performance, and is role-anchored. A Data Analyst with ELO 780 means something precise: this person has demonstrated that skill level through repeated challenge execution, scored by AI.

### 4.5 Recruiter Trust by Design
Proof artifacts are designed to be recruiter-readable without requiring translation. The recruiter should be able to look at a candidate's Aura and understand, in under 2 minutes, what that person can actually do.

### 4.6 Zero-Friction Architecture
The product must be functional from the first session. A student who lands on Capabilio should be able to complete a meaningful challenge, generate a Proof artifact, and see their ELO update — all within 20 minutes.

---

## 5. Product Paths

Each path is a complete product experience. They share the underlying infrastructure (ELO, Proof, Arena, Aura) but differ in navigation, module emphasis, assessment types, and profile format.

### 5.1 Student Path — "Build Me"

**Goal:** Construct a skill identity and portfolio from scratch.

**Key modules:**
- Arena (daily challenges, domain skill building)
- Skill Studio (guided learning paths)
- Aura (skill graph, proof vault, gap analysis)
- Launchpad (job readiness, opportunity matching)

**ELO starting point:** 400 (base)  
**ELO range:** 400–800 (pre-employment benchmark)  
**Profile focus:** Proof artifacts, challenge history, skill graph, domain readiness  

**Typical flow:**
1. Onboarding → select domain (e.g., "Data Analyst") → Skill Studio suggests gaps
2. Arena → complete daily challenges → Proof generated
3. Aura → skill graph updates → ELO adjusts
4. Launchpad → role-readiness check → opportunity match

### 5.2 Professional Path — "Position Me"

**Goal:** Reposition for a new role or company using current demonstrated skill.

**Key modules:**
- Aura (full career profile, experience timeline, certification vault)
- Skill Studio (targeted gap closure based on target role)
- Arena (keep ELO current, prove current-state skill)
- Launchpad (active job hunt, recruiter visibility, application tracking)

**ELO starting point:** 600–800 (based on experience + onboarding assessment)  
**Profile focus:** Career trajectory, verified experience, current-skill proof, domain positioning  

**Typical flow:**
1. Upload resume → AI extracts experience, skills → Aura auto-builds
2. Skill Gap analysis → target role selected → Studio generates learning plan
3. Arena → execute challenges in target role domain → Proof builds
4. Launchpad → set availability → recruiters can find profile

### 5.3 Executive Path — "Steer Outcomes"

**Goal:** Articulate strategic value and leadership track record.

**Key modules:**
- Aura (Authority Profile format — different layout from Standard)
- Arena (Case Study Arenas, Strategic Design challenges)
- Network (Signal Rooms, peer connections, influence visibility)
- Launchpad (senior role matching, board/advisory visibility)

**ELO starting point:** 800+ (based on seniority assessment)  
**Profile focus:** Outcomes delivered, teams built, technical decisions made, industry signals  

### 5.4 Organization Path — "Run the Institution"

**Goal:** Assess teams, benchmark candidates, track institutional skill health.

**Key modules:**
- Org Home (team skill dashboard)
- Hiring Pipeline (candidate tracking, challenge deployment)
- Org Intelligence (team benchmarks, market position, gap analysis)
- People (team member profiles, ELO history)

**Access model:** Org accounts are separate from personal accounts. An org admin can deploy challenges to a cohort and view aggregate ELO + proof data.

---

## 6. Navigation Model

Capabilio uses a **3-layer navigation model**. Each layer is always visible in context and never requires the user to lose their place.

```
Layer 1: PATH SELECTOR (top-level, persistent)
  ├── Aura          [personal identity hub]
  ├── Arena         [execution and proof engine]
  ├── Pulse         [market intelligence feed]
  ├── Skill Studio  [structured learning]
  └── Launchpad     [job and opportunity bridge]

Layer 2: CORE PAGES (main navigation within a path)
  Example — Aura path:
  ├── Dashboard
  ├── Career & Vault
  ├── Skills
  ├── AI Interview
  ├── Skill Gaps
  ├── Resilience
  ├── Code DNA
  └── Settings

Layer 3: TABS (contextual detail within a page)
  Example — Skills page:
  ├── Skill Graph
  ├── Assessments
  ├── Certifications
  └── Learning Path
```

### Navigation Rules

1. **Layer 1 is always visible** at the top of the screen. Switching paths does not lose current state.
2. **Layer 2 tabs are path-specific.** The Aura path has different core pages than the Arena path.
3. **Layer 3 tabs are context-specific** to the page and can be animated (slide, fade) to maintain spatial orientation.
4. **Mobile navigation** collapses Layer 1 into a bottom navigation bar (5 icons max). Layer 2 becomes a scrollable horizontal pill row. Layer 3 becomes an accordion.

### Header Structure

```
[Capabilio AI logo] [L1: Aura | Arena | Pulse | Studio | Launchpad]   [ELO badge] [Avatar | Name | Sign out]
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
[L2: Dashboard | Career & Vault | Skills | AI Interview | Skill Gaps | Resilience | Code DNA | Settings]
```

The ELO badge is always visible in the header. It updates in real time after challenge completions.

---

## 7. System Modules

### Module Map

```
┌─────────────────────────────────────────────────────┐
│                    CAPABILIO PLATFORM                │
├──────────┬──────────┬───────────┬───────────────────┤
│  ARENA   │   AURA   │  STUDIO   │    LAUNCHPAD       │
│          │          │           │                    │
│ Worksta- │ Skill    │ Lessons   │ Job matching       │
│ tions    │ Graph    │ Learning  │ Recruiter vis.     │
│ Missions │ Vault    │ Paths     │ Apply tracking     │
│ Proof    │ Identity │ Quizzes   │ Role readiness     │
│ ELO      │ Profile  │           │                    │
├──────────┴──────────┴───────────┴───────────────────┤
│         SHARED INFRASTRUCTURE                        │
│  ELO Engine | Proof Store | Verification Layer       │
│  AI Scoring | Skill Graph | Role System              │
│  Notification | Auth | User Profile | Analytics      │
└─────────────────────────────────────────────────────┘
```

Each module is a distinct frontend section with its own API routes, but they share the same core data entities (User, Skill, ELO, Proof, Role).

---

## 8. Arena — Execution Engine

> **Status note:** Arena is mid-rebuild as of 2026-08-16. The original Arena and the subsequent "Arena V2" content-engine rebuild (`backend/server/lib/arena-v2/`) have both been decommissioned — the latter's entire tree is deleted in the current working tree. What ships today is a single new page, `frontend/src/pages/arenaCollegeStream/ArenaCollegeStream.jsx`, built around two independent branches. This section describes that current implementation.

### 8.1 What Arena Is

Arena is where skill gets proven through graded work — not AI-generated missions, not a quiz. Landing on Arena shows two entry points, resolved automatically from the student's own profile (no manual mode picker):

| Branch | What it is | Resolved from | Status |
|---|---|---|---|
| **College Stream** | Curriculum-aligned coursework practice | `userData.branch` → `streams.slug` | Phase 1, live — only the `cse` stream has full semester/subject/unit/experiment content today; other branches exist as bare stream rows |
| **Domain Role** | Job-function-specific missions | `roleConfig` → `domain_roles` | Phase 2, live but thin — 44 `domain_roles` are seeded, but only **Data Analyst** has authored missions; the other 43 honestly return `mission: null, totalMissions: 0` rather than fabricating content |

Both branches share exactly one thing: the student's global `profiles.elo_rating`. Everything else — tables, evaluators, route files, lib directories — is kept structurally independent by explicit rebuild rule, so a bug or change in one branch's scoring logic can never leak into the other's.

**Project-wide rule, enforced in both branches' code comments: no unaudited AI scoring.** Every submission's score, pass/fail verdict, and ELO delta are decided by a deterministic, pure-function evaluator before any AI model is ever called. See §8.4.

### 8.2 College Stream Branch (Phase 1)

Curriculum tree: `streams` → `semesters` → `subjects` → `units` → `experiments`, each experiment carrying a `rubric` (jsonb), `elo_reward`, `difficulty`, and an optional `tier`.

Two ways to browse a stream, both public/no-auth to read:
- **Drill-down** — `GET /streams/:slug` walks semester → subject → unit
- **Flat grid** (`GET /streams/:slug/all-experiments`) — every experiment in the stream with its curriculum breadcrumb attached, which is what the LeetCode-style Academic Workspace grid renders directly

**Workspace type** comes from `stream_workspace_config.workspace_type` per stream (default `"text_answer"`). Two rubric shapes exist today:
- `exact_match` / `numeric_tolerance` — pure JS string/number comparison (`lib/collegeStream/evaluator.js`)
- `python_stdout_match` — student's Python source runs in a sandboxed `python3` subprocess (`lib/collegeStream/pythonSandbox.js`) and stdout is compared to an expected value

**Sandbox security model (Python):** process-level isolation, not container/VM isolation. It caps CPU/wall-clock (hard timeout + SIGKILL), memory (`ulimit -v`), process count (`ulimit -u`, anti fork-bomb), and stdout size, and strips the subprocess's environment to `PATH` only — the real process never sees `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `RAZORPAY_KEY_SECRET`, or JWT secrets. It does **not** provide filesystem or network isolation — that's flagged as explicit follow-up work (container/VM isolation via gVisor or Firecracker), not silently deferred.

**Common Challenge Framework progression tiers:** `foundation → core → applied → industry → master`. A tier unlocks once the student has passed at least half (rounded up, minimum 1) of the previous tier's experiments in that stream; untiered/legacy experiments are always unlocked. Enforced server-side on submit, not just hidden client-side.

### 8.3 Domain Role Branch (Phase 2)

Config-driven schema: `panel_types` / `domain_roles` / `evaluation_axes` / `domain_missions`. Only **one panel type is implemented today: `sql_runner`** — submitting to any other `panel_type` returns `400 "Panel type X is not yet supported."` rather than pretending to grade it.

**SQL Runner scoring (`lib/domainRole/sqlSandbox.js`):**
1. The mission's seeded `dataset` (`{tableName, columns, rows}`) is loaded fresh into an **ephemeral, per-submission, in-memory SQLite database** via `sql.js` (WASM) — never run against real application tables, so untrusted student SQL can't leak other users' data or drift against changing live data.
2. The submitted query is restricted to a single read statement: `SELECT`/`WITH` only, no statement-stacking (`;`), and `INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/ATTACH/PRAGMA/VACUUM` are all blocked.
3. The result set is compared to the mission's `expected_result` — `unordered_rows` (multiset comparison, default — real SQL doesn't guarantee order without `ORDER BY`) or `ordered_rows` for missions that explicitly test ordering. `expected_result` and the full `dataset` are never sent to the client, only a 5-row preview.

**Daily quota** (unlike College Stream, which has none): a rolling 24-hour window over the caller's own passed `domain_submissions` for that role — `free: 1`, `pro: 3`, `elite: 6` concurrent tasks, keyed off `profiles.subscription`. This is read entirely from existing submission timestamps rather than a separate mutable counter, so there's nothing to drift out of sync or corrupt via a race. An unfinished (unpassed) mission never rotates out on its own.

### 8.4 Scoring Philosophy: Deterministic Verdict, AI Commentary Only

Score, pass/fail, and ELO delta are **always** decided by the branch's own pure-function evaluator before any model call. Groq (`GROQ_FAST`) is invoked *after*, purely to generate a 2–3 sentence coaching explanation of a result that has already been finalized — its system prompt explicitly forbids inventing a verdict or score ("using ONLY the facts given... never invent a pass/fail verdict or a score; those are already decided and given to you as fact"). If `GROQ_API_KEY` is unset, Groq errors, or the call is slow, `ai_feedback` is simply `null` and the deterministic `insight`/`error`/`reason` text already computed is shown instead — a submission never fails or blocks on this call.

| | College Stream | Domain Role |
|---|---|---|
| Evaluator | `evaluate()` / `evaluatePythonStdout()` | `compareResults()` |
| Verdict basis | Rubric match (exact/tolerance/stdout) | SQL result-set match |
| AI involvement | None in scoring; optional feedback text | None in scoring; optional feedback text |

### 8.5 Submission Flow

```
POST /api/arena/{college-stream/experiments | domain-role/missions}/:id/submit
    ↓
Auth required · already-passed check (server-side lock, 409 if resubmitted)
    ↓
College Stream: tier-progression gate (403 if previous tier not cleared)
Domain Role:    daily-quota gate (429 + nextUnlockAt if exhausted)
    ↓
Deterministic evaluator runs (rubric match / SQL sandbox comparison)
    ↓
elo_delta computed:
    pass → experiment.elo_reward / mission.elo_reward (fixed per-item value)
    fail → -ELO_FAIL_PENALTY[difficulty]   (easy: -2, medium: -3, hard: -5)
    ↓
Submission row inserted (college_submissions / domain_submissions) —
    written even on a FAILED attempt, so every try has an audit record
    ↓
Best-effort Groq feedback generated (never blocks, never revises the verdict)
    ↓
profiles.elo_rating updated via atomic RPC increment_profile_elo
    (read-then-write would race under concurrent submissions; the RPC can't)
    ↓
arena_history row inserted — type: 'academic' or 'domain'
    ↓
Response: { score, passed, elo_delta, feedback, ai_feedback, ...branch-specific detail }
```

A `23505` (unique-violation) on insert is the database-level backstop for the check-then-insert race on the "already passed" lock — two near-simultaneous submissions can both pass the initial SELECT check, but only one INSERT wins; the loser gets the same `409` a sequential duplicate would.

### 8.6 ELO Economics and the Shared Activity Ledger

The two branches deliberately have **different ELO economics**, by explicit 2026-08-16 product decision:

- **Domain Role is the ELO-growth engine** — every passing task awards its full `elo_reward`, uncapped, gated instead by the daily task quota (§8.3).
- **College Stream is capped to one ELO-earning pass per calendar day** (UTC midnight boundary), no matter how many experiments the student clears that day — clearing 20 Academic tasks in one sitting earns the same ELO as clearing 1. This is intentional: College Stream exists to build the skill graph and portfolio record, not to be farmable for ELO by volume. Failing submissions are **not** capped — a wrong answer still costs ELO even after that day's pass is already banked, closing the obvious retry-farming loophole.

**`arena_history`** is the shared, denormalized event ledger that Aura's "ELO Rating History" timeline and Portfolio's task lists both read from — `type: 'academic'` vs `type: 'domain'` distinguishes the two branches' rows without guessing from free text. It was dark (no backend route wrote to it) from Arena V1's decommission until it was reactivated on 2026-08-16 alongside this rebuild — Aura showed "No arena events yet" despite a real, changing ELO in the interim.

**`GET /api/arena/activity/summary`** (`routes/arenaActivity.js`) is a read-only aggregation over *both* branches' submission tables (`domain_submissions.created_at`, `college_submissions.submitted_at`) to compute the 84-day activity calendar and streak — it writes nothing and contains no scoring logic of its own, so it doesn't violate the branch-independence rule.

### 8.7 Frontend Navigation

`ArenaCollegeStream.jsx` is a single page with in-component state-machine navigation (matching `App.jsx`'s `currentPage` pattern rather than introducing nested routes for one page):

```
landing ──┬── Stream ── semester ── subject ── unit ── experiment list ── experiment
          └── Domain ── mission list ── mission
```

Visual language matches `Aura.jsx`: same design-token set, 1160px centered content column, CSS-grid cards, small-caps eyebrow section labels — a desktop web page, not a stacked mobile card list.

---

## 9. Aura — Identity and Intelligence Layer

### 9.1 What Aura Is

Aura is the user's persistent skill identity. It is what a recruiter sees when they inspect a candidate profile. It aggregates every Arena score, every certification, every work experience, every assessed skill, and every verified artifact into a single coherent view.

Aura is never static. It updates automatically when:
- A new Arena challenge is completed
- An assessment is taken
- A certification is uploaded (and verified)
- Experience is added
- ELO changes (including decay)

### 9.2 Aura Architecture — Sub-Sections

**Tab: Dashboard**
- ELO card with trend sparkline
- Role positioning statement (AI-generated from skill graph)
- Top 3 strengths (from arena history + skill graph)
- Portfolio public link (shareable)
- Resume download button

**Tab: Career & Vault**
- Experience timeline (professional history, with verification state)
- Projects section (from resume parse or manual entry)
- Vault (uploaded documents: resume, certificates, work samples)
- Cover photo and avatar management

**Tab: Skills**
- Skill Graph visualization (radar chart or force-directed graph)
- Each node: skill name + score (0–100) + source (arena/assessment/manual)
- Skill source legend
- Assessment trigger (re-test a skill)

**Tab: AI Interview**
- AI-powered mock interview in the user's domain
- Voice-enabled (Deepgram ASR + ElevenLabs TTS)
- Post-interview scoring with STAR framework analysis
- Interview history

**Tab: Skill Gaps**
- Live market demand vs user's current skill scores
- Critical Gaps (user score < market threshold)
- Emerging skills (worth learning now)
- Skills already competitive
- "Top Action This Week" AI recommendation
- Data sourced from Gemini + Google Search grounding (live market)

**Tab: Resilience**
- Failure Resume: every failed Arena challenge, visible and explained
- Recovery Rate: how often the user retried and improved
- Resilience Score: composite metric from attempt count, recovery rate, consistency

**Tab: Code DNA**
- GitHub integration: commit pattern analysis
- Language breakdown
- Collaboration patterns
- Code quality signals (from repo scan)

### 9.3 Skill Graph — Technical Detail

The `skillGraph` is stored as a JSON array in the `profiles` table:

```json
[
  { "label": "SQL", "skill": "SQL", "value": 87, "score": 87, "source": "arena" },
  { "label": "Python", "skill": "Python", "value": 92, "score": 92, "source": "assessment" },
  { "label": "dbt", "skill": "dbt (Data Build Tool)", "value": 0, "source": "gap" },
  { "label": "Dashboard Design", "skill": "Dashboard Design", "value": 100, "source": "arena" }
]
```

**Score update logic:**
1. On Arena submission: if score ≥ previous skill score, update to weighted average
2. On assessment: replace with assessment score
3. Manual entry: score = 30 (lowest tier, flagged as "self-claimed")
4. From resume extraction: score = 30 (starting point, updates with Arena proofs)

**Score decay:** Skills that have not been exercised in 30+ days decay at 2pts/day (capped at -30 total, never below 20).

### 9.4 Aura Profile Card (Recruiter-Facing)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Cover Photo]                                                  │
│  [Avatar]  Priya Sharma                                         │
│            Data Analyst · Bengaluru                             │
│            ELO 634 · Rising Tier · 28 Proof Artifacts           │
│            ██████████ 63% market ready                          │
│  [View Full Profile]  [Contact]  [Add to Pipeline]              │
├─────────────────────────────────────────────────────────────────┤
│  TOP SKILLS                                                     │
│  SQL ████████████ 87%   Python ████████████ 92%                 │
│  Data Viz ████████ 79%  Statistics ██████ 61%                   │
├─────────────────────────────────────────────────────────────────┤
│  RECENT PROOF                                                   │
│  ✅ Cohort Analysis — Swiggy — Score 91 — 3 days ago            │
│  ✅ Funnel Analysis — Zepto — Score 84 — 1 week ago             │
├─────────────────────────────────────────────────────────────────┤
│  VERIFIED EXPERIENCE                                            │
│  • Data Analyst Intern — MakeMyTrip (Self-claimed)              │
│  • Freelance BI Projects — 3 client engagements                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Skill Studio — Structured Learning Engine

### 10.1 What Skill Studio Is

Skill Studio is the learning layer of Capabilio. It does not replace Arena (which is proof-oriented) — it prepares users to succeed in Arena. Where Arena says "can you do this?" Skill Studio says "here is how to get there."

Skill Studio is AI-generated, role-specific, and personalized to the user's current skill graph and identified gaps.

### 10.2 Learning Path Architecture

A **Learning Path** is generated per user per role:

```json
{
  "phases": [
    {
      "phase": 1,
      "title": "Foundation: SQL Mastery",
      "duration": "3 weeks",
      "focus": "Close the SQL gap — you're at 42%, market needs 81%",
      "skills": ["Advanced SQL", "Window Functions", "CTEs", "Query Optimization"],
      "actions": [
        { "type": "learn", "skill": "Window Functions", "title": "Intro to Window Functions", "level": "Beginner", "xp": 30 },
        { "type": "practice", "skill": "Window Functions", "title": "Ranking and Partitioning", "level": "Intermediate", "xp": 50 },
        { "type": "prove", "skill": "Window Functions", "title": "Arena: Swiggy Retention Query", "level": "Intermediate", "xp": 80 }
      ]
    }
  ],
  "totalDuration": "8 weeks",
  "expectedEloGain": 150,
  "milestones": ["Complete Phase 1 SQL module", "Pass Arena SQL challenge with 80+"]
}
```

### 10.3 Lesson Architecture

Each lesson is a micro-learning unit (5–15 minutes):

```json
{
  "title": "Window Functions Explained",
  "objective": "Understand RANK(), DENSE_RANK(), ROW_NUMBER() and OVER() clauses",
  "sections": [
    {
      "heading": "What is a Window Function?",
      "content": "A window function operates on a set of rows related to the current row...",
      "codeExample": "SELECT user_id, purchase_date, \n  RANK() OVER (PARTITION BY user_id ORDER BY purchase_date) as purchase_rank\nFROM orders;"
    }
  ],
  "keyPoints": ["Window functions do not collapse rows like GROUP BY", "PARTITION BY = the grouping boundary"],
  "quiz": [
    {
      "question": "Which function assigns 1,2,3 with no gaps for ties?",
      "options": ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE(4)"],
      "correct": 1,
      "explanation": "DENSE_RANK assigns consecutive ranks — ties share a rank but the next rank is not skipped"
    }
  ],
  "practiceTask": "Write a query to find the top 3 products per category by revenue",
  "nextTopics": ["CTEs", "LAG/LEAD Functions"]
}
```

### 10.4 MCQ Assessment Architecture

When a user clicks "Assess Me" for a role:

1. `POST /api/assess/generate` → Gemini generates `N` MCQs (default: 20)
2. MCQs are domain-specific, fresher-level, campus-interview calibrated
3. Results produce a skill score per category
4. Scores feed back into the Skill Graph
5. ELO adjusts based on assessment outcome

MCQ types supported:
- `mcq`: Standard 4-option multiple choice
- `code_output`: "What does this code print?" with short code snippet
- `problem_solving`: Scenario-based reasoning
- `scenario`: Real-world situation analysis
- `fill_blank`: Complete the code/sentence

---

## 11. Launchpad — Job Market Bridge

### 11.1 What Launchpad Is

Launchpad connects the skill identity built in Aura/Arena to real-world job opportunities. It is a career-stage-aware opportunity engine that shows:
- Matching jobs (based on ELO + skill graph + target role)
- Application tracking
- Recruiter visibility controls
- "Ready to apply" readiness checks

### 11.2 Launchpad for Students

```
Readiness Check:
  ✅ ELO above 500 (minimum for entry-level)
  ✅ 5+ Proof Artifacts in target domain
  ⚠️  SQL score 42% — below 70% threshold for Data Analyst roles
  ✅ Portfolio URL generated and public

Matching Opportunities:
  [Company]   [Role]              [ELO Required]  [Match]
  Swiggy      Data Analyst        ELO 480+        ✅ 92% match
  Razorpay    Junior DA           ELO 450+        ✅ 88% match
  Zepto       BI Analyst Intern   ELO 400+        ✅ 96% match
```

### 11.3 Launchpad for Professionals

- Target role positioning
- "How do you compare to other Data Analysts in Bengaluru?" → percentile view
- Salary intelligence (market range, user's estimated band based on ELO)
- Recruiter-facing toggle: "Open to opportunities" → makes profile discoverable

### 11.4 Recruiter Discovery Model

Recruiters on the Org/Recruiter side can search:
- By role
- By ELO range
- By domain
- By city / availability
- By specific skills (e.g., "SQL > 80% and Python > 70%")
- By proof count

Candidate profiles only appear in recruiter search if:
1. User has enabled "Open to opportunities"
2. ELO meets minimum threshold for the role
3. Profile has at least 3 Proof artifacts

---

## 12. Verification and Trust Layer

### 12.1 Why Verification Matters

Capabilio's value proposition depends on trust. If any user can fake their skill scores, the system collapses. Verification ensures:
- Experience claims are credible
- Certifications are real
- Proof artifacts cannot be faked
- Assessment scores reflect actual ability

### 12.2 Verification Tiers

| Tier | Label | How Achieved | Visual |
|------|-------|-------------|--------|
| 0 | Unverified | No action taken | No badge |
| 1 | Self-Claimed | User entered manually | Grey badge |
| 2 | Document-Verified | Document uploaded + AI-parsed | Blue badge |
| 3 | Cert-Verified | Certificate ID checked against issuer | Gold badge |
| 4 | Arena-Proven | Performance in live challenge | Orange badge (Proof) |
| 5 | Peer-Reviewed | Reviewed by verified professional | Purple badge |

### 12.3 Certification Verification Flow

Supported issuers: AWS, Google Cloud, Microsoft, Salesforce, CompTIA

```
User enters: AWS Certification ID = "AWS-SAA-C03-382919"
    ↓
POST /api/verify/cert
    Body: { provider: "aws", certId: "AWS-SAA-C03-382919" }
    ↓
Backend calls AWS Certification Validation API
    ↓
Response: { valid: true, name: "AWS Solutions Architect - Associate", issued: "2024-01" }
    ↓
Verification record created in DB
    ↓
Profile cert_verified = true
    ↓
Gold badge appears on profile
```

### 12.4 Experience Verification Flow

Experience verification is a 2-step signal:

1. **Document upload:** User uploads offer letter, payslip, or LinkedIn export → AI extracts company, role, dates
2. **Social signal:** System checks if company name matches LinkedIn profile URL (if provided)

Neither step provides cryptographic proof, but together they raise confidence from "self-claimed" (Tier 1) to "document-verified" (Tier 2).

### 12.5 Proof Artifact Integrity

Every Arena submission is:
- Timestamped server-side (not client-side)
- Scored by AI (not by the user)
- Stored in an append-only `arena_history` table
- The user **cannot delete or modify** submitted proofs

This makes proof artifacts tamper-evident by design.

---

## 13. Core Data Model

### 13.1 Entity Relationship Overview

```
profiles (1) ───── (N) arena_history
profiles (1) ───── (N) arena_missions
profiles (1) ───── (1) profiles.skillGraph (JSON)
profiles (1) ───── (1) profiles.experiences (JSON)
profiles (1) ───── (1) profiles.vaultFiles (JSON)
profiles (1) ───── (N) certifications
profiles (1) ───── (N) assessment_results
org_profiles (1) ── (N) hiring_pipelines
org_profiles (1) ── (N) challenge_deployments
recruiters (1) ──── (N) candidate_shortlists
```

### 13.2 `profiles` Table

```sql
CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id),
  email             TEXT UNIQUE NOT NULL,
  name              TEXT,
  display_name      TEXT,
  username          TEXT UNIQUE,
  path              TEXT CHECK (path IN ('student', 'professional', 'executive', 'org')),
  keyword           TEXT,                        -- primary role: "Data Analyst", "Frontend Developer"
  domain            TEXT,                        -- domain category: "data", "frontend", "devops"
  elo_rating        INTEGER DEFAULT 400,
  elo_history       JSONB DEFAULT '[]',           -- [{ date: "2024-01-15", elo: 420 }]
  streak            INTEGER DEFAULT 0,
  arena_completed   INTEGER DEFAULT 0,
  arena_last_active TIMESTAMPTZ,
  skill_graph       JSONB DEFAULT '[]',           -- [{ label, skill, value, score, source }]
  experiences       JSONB DEFAULT '[]',           -- professional experience array
  resume_projects   JSONB DEFAULT '[]',           -- projects from resume or manual
  resume_skills     JSONB DEFAULT '[]',           -- raw skill list from resume
  vault_files       JSONB DEFAULT '[]',           -- uploaded documents
  strengths         JSONB DEFAULT '[]',           -- AI-generated or self-reported
  weak_areas        JSONB DEFAULT '[]',           -- AI-generated or self-reported
  personal_info     JSONB DEFAULT '{}',           -- { phone, city, github_url, linkedin_url }
  github_url        TEXT,
  avatar_url        TEXT,
  cover_photo_url   TEXT,
  cover_position    JSONB DEFAULT '{"x": 50, "y": 50}',
  plan              TEXT DEFAULT 'free',           -- free | pro | team
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 13.3 `arena_history` Table

```sql
CREATE TABLE arena_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  task_id         TEXT NOT NULL,
  title           TEXT,
  difficulty      TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  domain          TEXT,
  type            TEXT,
  score           INTEGER CHECK (score BETWEEN 0 AND 100),
  elo_delta       INTEGER,
  feedback        TEXT,
  scenario        TEXT,
  code_submitted  TEXT,
  workstation     TEXT,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user history lookups
CREATE INDEX idx_arena_history_user_id ON arena_history(user_id);
CREATE INDEX idx_arena_history_completed_at ON arena_history(completed_at DESC);
```

### 13.4 `arena_missions` Table

```sql
CREATE TABLE arena_missions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  mission_data  JSONB NOT NULL,              -- full mission JSON (see Section 8.3)
  domain        TEXT,
  difficulty    TEXT,
  status        TEXT DEFAULT 'pending'       -- pending | completed | skipped | expired
                CHECK (status IN ('pending', 'completed', 'skipped', 'expired')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_arena_missions_user_status ON arena_missions(user_id, status);
```

### 13.5 `certifications` Table

```sql
CREATE TABLE certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  provider        TEXT NOT NULL,             -- "aws", "gcp", "microsoft", etc.
  cert_id         TEXT NOT NULL,
  cert_name       TEXT,
  issued_date     DATE,
  expiry_date     DATE,
  verified        BOOLEAN DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  verification_source TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 13.6 `org_profiles` Table

```sql
CREATE TABLE org_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID REFERENCES profiles(id),
  company_name    TEXT NOT NULL,
  company_slug    TEXT UNIQUE,
  industry        TEXT,
  size            TEXT,
  plan            TEXT DEFAULT 'team',
  team_members    JSONB DEFAULT '[]',        -- [{user_id, role, added_at}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 13.7 `hiring_pipelines` Table

```sql
CREATE TABLE hiring_pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES org_profiles(id),
  job_title       TEXT NOT NULL,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paused')),
  requirements    JSONB,                     -- { min_elo, required_skills, domain }
  candidates      JSONB DEFAULT '[]',        -- [{user_id, stage, added_at, notes}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 13.8 Assessment Results Table

```sql
CREATE TABLE assessment_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  role            TEXT NOT NULL,
  questions       JSONB NOT NULL,
  answers         JSONB NOT NULL,
  scores          JSONB NOT NULL,            -- { category: score } per skill
  overall_score   INTEGER,
  elo_impact      INTEGER,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 14. APIs and Services

### 14.1 Authentication

Capabilio uses Supabase Auth (magic link + OAuth).

```
POST /auth/signup              { email, password }
POST /auth/signin              { email, password }
GET  /auth/callback            OAuth callback handler
POST /auth/signout
GET  /auth/user                Returns current user JWT claims
```

### 14.2 Profile APIs

```
GET    /api/profile/:userId          Fetch full profile
PATCH  /api/profile/:userId          Update profile fields
POST   /api/profile/username         Claim username slug
POST   /api/extract-pdf              Upload resume → extract experience/skills
GET    /api/profile/public/:username Read-only public profile (no auth needed)
```

### 14.3 Arena APIs

```
POST   /api/arena/daily         Generate or fetch today's missions for a user
                                Body: { userId, domain, domainKey, keyword, path, eloRating }
                                Response: { missions: [easy, medium, hard] }

POST   /api/arena/submit        Submit a completed challenge
                                Body: { missionId, code, userId, domain, workstation }
                                Response: { score, feedback, eloGain, proofId }

GET    /api/arena/history/:userId    Fetch challenge history (paginated)

POST   /api/arena/hint          Request a hint for the current mission
                                Body: { missionId, currentCode }
                                Response: { hint: "..." }

GET    /api/arena/leaderboard   Fetch top ELO users by domain
```

### 14.4 Assessment APIs

```
POST   /api/assess/generate     Generate MCQ assessment
                                Body: { jobTitle, count, domainSkills }
                                Response: { questions: [...] }

POST   /api/assess/submit       Score a completed assessment
                                Body: { userId, role, questions, answers }
                                Response: { scores, overallScore, eloImpact, feedback }
```

### 14.5 Skill Gap API

```
POST   /api/skill-gap           Live skill gap analysis via Gemini + Google Search
                                Body: { domain, keyword, elo, path }
                                Response: {
                                  gaps: [{skill, demand, weeks, surge, pct, reason}],
                                  emerging: [...],
                                  growth: "18%",
                                  marketSignals: [...],
                                  topAction: "...",
                                  cached: true|false
                                }
                                Cache: 6 hours per domain
```

### 14.6 AI Interview API

```
POST   /api/interview/start     Initialize interview session
                                Body: { userId, domain, role }
                                Response: { sessionId, firstQuestion }

POST   /api/interview/respond   Submit answer, get next question
                                Body: { sessionId, answer }
                                Response: { feedback, nextQuestion, score }

POST   /api/interview/complete  End session, get full analysis
                                Body: { sessionId }
                                Response: { overallScore, starAnalysis, improvements }
```

### 14.7 GitHub DNA API

```
POST   /api/github/fingerprint  Analyze a GitHub profile
                                Body: { githubUrl }
                                Response: {
                                  languages: [{lang, pct}],
                                  commitPattern: "morning coder",
                                  topRepos: [...],
                                  codeStyle: {...}
                                }
```

### 14.8 Verification API

```
POST   /api/verify/cert         Verify a certification ID
                                Body: { provider, certId, userId }
                                Response: { valid, certName, issuedDate }

POST   /api/verify/experience   Verify experience via document
                                Body: { userId, document (base64), type }
                                Response: { extracted, confidence, verificationLevel }
```

### 14.9 Recruiter APIs

```
GET    /api/recruiter/search    Search candidates
                                Query: ?role=data+analyst&minElo=500&skills=SQL,Python&city=Bengaluru
                                Response: { candidates: [...] }

POST   /api/recruiter/shortlist Add candidate to pipeline
                                Body: { recruiterId, candidateId, pipelineId }

GET    /api/recruiter/pipeline/:pipelineId   View pipeline
```

### 14.10 Skill Studio APIs

```
POST   /api/studio/learning-path   Generate personalized learning path
                                   Body: { jobTitle, skillGraph, weakAreas, eloRating }
                                   Response: { phases: [...], totalDuration, milestones }

POST   /api/studio/lesson          Generate a lesson on a specific topic
                                   Body: { topic, jobTitle, skillLevel, duration }
                                   Response: { title, sections, quiz, practiceTask }
```

---

## 15. Event Flow and System Logic

### 15.1 Core Event Loop

```
USER ACTION (challenge submit, assessment complete, cert verified)
           │
           ▼
    Event Handler (backend route)
           │
           ▼
   Score / Validate / Extract
           │
           ▼
     Update DB (profile, history, certifications)
           │
           ▼
     ELO Recalculation (see 19.3)
           │
           ▼
     Skill Graph Update (weighted avg)
           │
           ▼
     Proof Artifact Created (if arena submission)
           │
           ▼
     Real-time update pushed to frontend (Supabase realtime)
           │
           ▼
     UI animates: ELO counter, skill bar, proof badge
```

### 15.2 ELO Decay Loop (Cron / Client-side trigger)

```
User opens any page after idle period
           │
           ▼
     Check: arena_last_active vs NOW()
           │
           ▼
     daysSince > 15? → YES
           │
           ▼
     decayPts = min((daysSince - 14) × 5, currentElo - roleFloor)
           │
           ▼
     newElo = max(roleFloor, currentElo - decayPts)
           │
           ▼
     PATCH profiles SET elo_rating = newElo, elo_decay_date = today
           │
           ▼
     eloHistory entry appended
```

Role floors: Student = 400, Professional = 600, Executive = 800

### 15.3 Resume Upload and Auto-Profile Flow

```
User uploads PDF resume
           │
           ▼
POST /api/extract-pdf (multipart form)
           │
           ▼
Gemini reads PDF (base64 inline data, multimodal)
Extracts: name, experience[], projects[], skills[], education[]
           │
           ▼
Frontend classifies entries:
  isProjectEntry() → if company is university/school OR title has "project/capstone"
  → true = goes to resumeProjects
  → false = goes to experiences (professional history)
           │
           ▼
Profile updated:
  experiences = [...newProfessional, ...existingFromOtherResumes, ...manual]
  resumeProjects = [...newProjects, ...otherFileProjects]
  resumeSkills = extractData.skills (top 20)
  skillGraph = initial entries at score 30 if graph was empty
  vaultFiles = resume entry added
```

### 15.4 Skill Gap Analysis Event Flow

```
User opens Skill Gaps tab (or tab auto-triggers)
           │
           ▼
fetchSkillGap() called
           │
           ▼
generateMockSkillGap() runs locally:
  - Reads user skillGraph from userData
  - Matches keyword to domain (normalizeDomain)
  - Looks up hardcoded market benchmarks for domain
  - Computes: urgentGaps, emerging, youHave, _meta, topAction
           │
           ▼
Simultaneously (race): POST /api/skill-gap
  - Gemini searches Google for live market data
  - Returns: real skill names, demand %, growth rates
           │
           ▼
If live data returns valid skills (not placeholder):
  - sgMap built from skillGraph
  - getScore() fuzzy-matches each live skill to user's known skills
  - urgentGaps = live skills where userScore < 70
  - emerging = live skills + computed user score
  - finalUrgent = live urgentGaps or localBase fallback
  - topAction, competitiveIn recalculated from finalUrgent
  - youHave = from localBase (always user-profile-aware)
           │
           ▼
If live API fails or returns placeholders:
  - localBase result used directly
           │
           ▼
setSkillGapData(...) → UI renders
```

---

## 16. Example User Journeys

### Journey 1: Riya — Final Year CS Student, Targeting Data Analyst

**Day 1 — Onboarding**
- Riya signs up, selects Student path
- Domain selection: "Data Analyst"
- ELO starts at 400
- Assessment prompt appears: "Take a 15-minute assessment to calibrate your starting ELO"
- Assessment result: SQL 45%, Python 30%, Statistics 20%
- ELO adjusts to 412 (slight upward from base due to Python score)
- Skill Gap tab auto-loads: SQL gap = 36 pts, dbt gap = 81 pts

**Day 2 — First Arena Challenge**
- Opens Arena → 3 missions generated for "Data Analyst"
- Picks Easy: "Clean a Zepto customer database"
- SQL Lab opens with starter code
- Riya writes a deduplication query
- Submits → Score: 72 → ELO +8 → 420
- Proof artifact created: "Data Cleaning — Zepto — 72 — Jun 10"
- Skill Graph: SQL updates to weighted avg of 45% and 72% = ~56%

**Week 1 — Building Pattern**
- Completes 4/5 challenges this week
- ELO reaches 462
- Skill Studio opens learning plan: Phase 1 is SQL (3 weeks)
- Completes "Window Functions" lesson, takes quiz (80%)

**Week 4 — Portfolio Ready**
- ELO: 524
- Proof artifacts: 14
- SQL score: 74% (above 70% threshold)
- Launchpad: "Role readiness: 71% for entry-level Data Analyst"
- Matches appear: Swiggy, Zepto, Nykaa junior DA roles

**Week 8 — Job Application**
- Riya enables "Open to opportunities" in Launchpad
- Profile becomes recruiter-discoverable
- Shares Aura public URL in resume, LinkedIn
- Two recruiters view profile; one sends message through Capabilio

### Journey 2: Arjun — 4-Year Backend Developer, Targeting Senior Role

**Onboarding**
- Selects Professional path
- Uploads resume → Gemini extracts: 3 work experiences, 12 skills
- ELO calibrated at 620 (4 years experience + resume skill signals)
- Skill Gap for "Senior Backend Developer": System Design = 0%, Cloud (AWS) = 20%

**Month 1**
- Completes 3 Arena challenges/week (Medium + Hard)
- Focus: System Design Workspace (draws architecture, explains trade-offs)
- ELO reaches 680
- Skill Studio: "AWS Cloud" learning path — 5 weeks

**Month 3**
- ELO: 740 ("Advanced" tier)
- Proof artifacts: 32 (mix of backend, system design, cloud)
- Launchpad: "Market-ready for Senior Backend at Series B+ startups"
- Salary band estimate shown: ₹22–28 LPA

---

## 17. Example Recruiter Journeys

### Journey 1: Divya — Recruiter at a Fintech Startup Hiring DA

**Search**
- Logs into Org dashboard
- Navigates to Talent Search
- Filters: Role = "Data Analyst", Min ELO = 500, Required Skills = SQL (>70%), Python (>60%), City = Bengaluru
- 34 candidates returned

**Shortlisting**
- Opens Riya's profile: ELO 524, SQL 74%, Python 68%, 14 proof artifacts
- Clicks "View Proof" → sees timestamped Arena submissions
- Sees cohort analysis challenge from 2 weeks ago, scored 88
- Confidence: "She's actually done this before"
- Adds Riya to pipeline: "Round 1"

**Comparison**
- Compares 3 candidates side by side (ELO, top skills, proof count, last active)
- Notes that Candidate B has higher ELO but no SQL proofs — eliminated
- Schedules AI interview for Riya through Capabilio

### Journey 2: CTO at a 50-person Startup — Evaluating Backend Team Health

**Organization Dashboard**
- Adds 8 backend engineers to Org account
- Deploys "System Design" benchmark challenge to all 8
- 7 complete within 48 hours
- Dashboard shows aggregate: Team Avg ELO = 654, Team SQL = 71%, Team Cloud = 38%
- Red flag: Cloud is 38% — market expects 62% for senior backend
- Action: Deploy Cloud Architecture learning path to the team via Skill Studio

---

## 18. Role and Skill System

### 18.1 Domain → Role Mapping

Capabilio maps user-entered keywords to canonical domains for consistent challenge generation, skill graph structure, and market benchmarking:

| User Input | Canonical Domain | Domain Key | Workstations Unlocked |
|-----------|-----------------|-----------|----------------------|
| Data Analyst, BI Analyst | Data Analyst | `data` | SQL Lab, Notebook Lab, BI Studio |
| Frontend Developer, React Dev | Frontend | `frontend` | Frontend Sandbox, Code IDE |
| Backend Developer, Node.js Dev | Backend | `backend` | API Workstation, Code IDE, SQL Lab |
| Full-Stack Developer | Full-Stack | `fullstack` | All of the above |
| DevOps, SRE, Platform Eng | DevOps | `devops` | Infra Terminal, SRE Console |
| Data Engineer, ETL Dev | Data Engineer | `data_engineer` | Data Pipeline Studio, Notebook Lab |
| Machine Learning, AI/ML | ML Engineer | `ml` | Notebook Lab, AI/LLM Studio |
| Cloud Engineer, AWS/Azure | Cloud Eng | `aws` / `azure` | Cloud Arch Lab, Infra Terminal |
| Cybersecurity, AppSec | Security | `cyber` | Security Console, Code IDE |
| Database Admin, SQL DBA | DBA | `dba` | SQL Lab |
| Medical Coder | Medical | `medical` | Markdown Board |
| QA Engineer | QA | `qa` | QA Lab, Code IDE |
| Product Manager, BA | Product/BA | `ba_product` | BA Board, Product Strategy |

### 18.2 Domain Skill List

Each domain has a canonical 12-skill list. The skill graph for that domain's users is populated from this list. Example — Data Analyst:

```
SQL | Python | Data Cleaning | Exploratory Data Analysis | Data Visualization |
Statistical Analysis | A/B Testing | Business Intelligence | Funnel Analysis |
KPI Reporting | Dashboard Design | Storytelling with Data
```

### 18.3 normalizeDomain() Function

This function is critical. It maps any string to a canonical domain so skill lists, challenge generators, and gap analysis all use the same reference:

```js
function normalizeDomain(keyword) {
  if (!keyword) return "Full-Stack"
  const k = keyword.toLowerCase()
  if (k.includes("data anal") || k.includes("bi analyst")) return "Data Analyst"
  if (k.includes("frontend") || k.includes("react dev")) return "Frontend"
  if (k.includes("backend") || k.includes("node") || k.includes("api dev")) return "Backend"
  if (k.includes("devops") || k.includes("sre") || k.includes("platform")) return "DevOps"
  if (k.includes("dba") || k.includes("database admin")) return "DBA"
  return "Full-Stack"  // safe fallback
}
```

---

## 19. ELO and Proof System

### 19.1 ELO Philosophy

ELO in Capabilio is not game-like. It is a live skill signal. The analogy is the FICO credit score: it is a persistent, updating number that reflects real behavior, not a one-time test.

### 19.2 ELO Starting Points by Path

| Path | Starting ELO | Reason |
|------|-------------|--------|
| Student | 400 | Base — no prior proof |
| Professional (resume upload) | 500–650 | Estimated from experience years + resume skills |
| Executive | 800 | Seniority floor |
| Post-assessment | Adjusted | Assessment result recalibrates from base |

### 19.3 ELO Delta Calculation

For a challenge submission with score `S`:

```
baseGain = 30 × (difficulty multiplier)
  Easy: 1.0x → max 30
  Medium: 1.5x → max 45 (but we cap eloGain at 30 for Medium, variable for Hard)
  Hard: 2.0x → max 60

actualGain = round(baseGain × (S / 100))
  Score 90 on Medium (base 18): actualGain = round(18 × 0.9) = 16

bonusStreak:
  If streak >= 7: +5
  If streak >= 14: +8
  If streak >= 30: +12

finalEloGain = actualGain + bonusStreak

ELO update: newElo = currentElo + finalEloGain
```

For below-50 scores (fail):

```
eloGain = 0 (no gain, no loss — fail doesn't punish, it just doesn't reward)
streak is reset if fail was the last attempt of the day
```

**Note:** This is asymmetric by design. Growth through success, no punishment for trying.

### 19.4 ELO Decay

```
decayGracePeriod = 15 days
decayRate = 5 ELO per day (after grace period)
maxDecay = currentElo - roleFLoor (never go below floor)
decayTrigger = client-side on any page load, checked against eloDecayDate
```

Decay is applied once per calendar day maximum, not per visit.

### 19.5 ELO Tiers

| Tier | ELO Range | Meaning |
|------|-----------|---------|
| Beginner | 400–449 | Starting, not yet assessed |
| Learning | 450–549 | Building fundamentals |
| Building | 550–649 | Intermediate, entry-job-ready |
| Rising | 650–749 | Strong candidate for junior/mid roles |
| Advanced | 750–849 | Senior-track, consistently high performance |
| Expert | 850+ | Top 5% in domain |

### 19.6 Proof Artifacts

A Proof Artifact is created every time a user completes an Arena challenge with score ≥ 40.

Proof artifact structure:

```json
{
  "proofId": "arena-history-uuid",
  "userId": "user-uuid",
  "title": "Cohort Retention Analysis",
  "company": "Swiggy",
  "domain": "data",
  "type": "Data Analysis",
  "workstation": "sql",
  "score": 88,
  "eloDelta": 16,
  "feedback": "Strong use of window functions. CTE structure is clean. Minor issue: missing NULL handling for inactive users.",
  "codeSubmitted": "SELECT ... (full code)",
  "completedAt": "2024-06-10T14:32:00Z",
  "isPublic": true
}
```

Proof artifacts are:
- Immutable after creation
- Publicly readable at `/api/profile/public/:username/proof`
- Timestamped server-side
- AI-scored (not self-reported)

### 19.7 Proof Portfolio View (Recruiter-Facing)

When a recruiter opens a candidate's profile, they see:

```
PROOF PORTFOLIO — Priya Sharma (Data Analyst)

[Filter: All | SQL | Python | Data Viz | Statistics]

┌───────────────────────────────────────────────────────┐
│ Cohort Retention Analysis · Swiggy · SQL Lab           │
│ Score: 88/100 · +16 ELO · Jun 10, 2024               │
│ "Strong window function usage. Clean CTE structure."   │
│ [View Code] [View Feedback]                           │
├───────────────────────────────────────────────────────┤
│ Customer Segmentation (RFM) · Razorpay · Notebook     │
│ Score: 91/100 · +22 ELO · Jun 8, 2024                │
│ "Excellent Pandas usage, matplotlib charts clear."    │
│ [View Code] [View Feedback]                           │
└───────────────────────────────────────────────────────┘
```

---

## 20. Recommendation Engine

### 20.1 What Gets Recommended

Capabilio's recommendation engine produces three types of output:

1. **Challenge Recommendations** — "Which Arena challenge should the user do today?"
2. **Learning Recommendations** — "Which Skill Studio module should the user do next?"
3. **Opportunity Recommendations** — "Which jobs should Launchpad show?"

### 20.2 Challenge Recommendation Logic

```
Input: { domain, eloRating, weakAreas, recentSkills, arenaHistory }

Step 1: Determine difficulty distribution
  if elo < 500: [Easy×2, Medium×1]
  if 500 ≤ elo < 650: [Easy×1, Medium×1, Hard×1]
  if elo ≥ 650: [Medium×1, Hard×2]

Step 2: Identify weak areas
  weakAreas = skillGraph entries where score < 60, sorted ascending by score

Step 3: Avoid repetition
  recentSkills = last 5 challenge tags (skills covered)
  Exclude these from the new mission prompt

Step 4: Generate mission
  POST to Gemini with: domain context + difficulty + weakAreas + avoidSkills
  Returns: 1 mission per difficulty slot

Step 5: Store in arena_missions
  Mark as 'pending', expires at midnight (IST)
```

### 20.3 Learning Path Recommendation Logic

```
Input: { jobTitle, skillGraph, weakAreas, eloRating }

Step 1: Sort skills by gap size
  gap = marketThreshold - userScore
  For Data Analyst: marketThreshold = 81 for all critical skills

Step 2: Phase ordering
  Phase 1: Largest gap skills (fastest career ROI)
  Phase 2: Supporting skills (medium gap)
  Phase 3: Advanced/emerging (nice to have)

Step 3: Action type per skill
  gap > 50: learn → practice → prove (3 steps)
  gap 20–50: practice → prove (2 steps)
  gap < 20: prove only (1 step, just go do it in Arena)

Step 4: Return phases with estimated weeks
  Each learn action = 1 week
  Each practice = 1 week
  Each prove = 0.5 weeks (Arena session)
```

### 20.4 Job Matching Logic

```
Input: { userProfile, targetRole, eloRating, skillGraph }

Step 1: Role eligibility
  Is ELO ≥ role minimum? (see tier table)
  Does user have 3+ proof artifacts in domain?
  Has user enabled "Open to opportunities"?

Step 2: Skill match score
  For each required skill in job spec:
    userScore = getUserScore(skill, skillGraph)
    if userScore >= 70: full match
    if 40 <= userScore < 70: partial match
    if userScore < 40: no match
  matchScore = (fullMatches × 1.0 + partialMatches × 0.5) / totalRequired

Step 3: Rank jobs
  Sort by: (matchScore × 0.6) + (eloProximity × 0.4)

Step 4: Serve top 10 matches
```

---

## 21. Frontend Architecture

### 21.1 Stack

- **Framework:** React 18 (Vite build)
- **Language:** JSX (no TypeScript — fast iteration priority)
- **Styling:** Inline styles with design token objects (`T.*`, `C.*`)
- **State:** React `useState` + `useEffect` + Supabase Realtime
- **Real-time:** Supabase `subscribe()` for ELO, history, and profile updates
- **Auth:** Supabase Auth (JWT) via `@supabase/supabase-js`
- **AI runtimes in browser:** Pyodide (Python), sql.js (SQLite WASM)
- **No Redux, no MobX:** State is co-located with components

### 21.2 Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                    Root router and auth gating
│   ├── main.jsx                   Vite entry point
│   ├── index.css                  Global reset + keyframes
│   ├── App.css
│   ├── pages/
│   │   ├── Aura.jsx               Full identity/profile module (~4800 lines)
│   │   ├── Arena.jsx              Challenge execution + mission desk
│   │   ├── ArenaWorkstations.jsx  Live execution workstations
│   │   ├── Pulse.jsx              Market intelligence feed
│   │   ├── SkillStudio.jsx        Lessons + learning paths
│   │   ├── Launchpad.jsx          Job matching + applications
│   │   ├── StudentHome.jsx        Student path dashboard
│   │   ├── ProfessionalHome.jsx   Professional path dashboard
│   │   ├── Onboarding.jsx         First-time setup flow
│   │   ├── LandingPage.jsx        Public homepage
│   │   ├── RecruiterDashboard.jsx Recruiter search + pipeline
│   │   ├── OrgHome.jsx            Organization dashboard
│   │   └── [other pages]
│   ├── components/
│   │   ├── Header.jsx             Top navigation (ELO badge, path switcher)
│   │   ├── PathNav.jsx            Layer 2 navigation
│   │   ├── SkillGraphView.jsx     Radar/force graph visualization
│   │   ├── CareerTimeline.jsx     Experience timeline component
│   │   ├── VaultManager.jsx       Document vault UI
│   │   └── CapUI.jsx              Shared UI primitive library
│   ├── arena/
│   │   ├── ChallengeShell.jsx     Challenge wrapper (timer, score display)
│   │   ├── MissionDesk.jsx        Mission selection desk
│   │   ├── arenaUi.jsx            Arena-specific UI components
│   │   └── workstationMeta.js     Workstation type → config map
│   ├── services/
│   │   ├── arenaSkillEngine.js    Client-side ELO + skill score logic
│   │   └── workstationEngine.js   Workstation initialization + runtime
│   ├── hooks/
│   │   ├── useArenaState.js       Arena state machine
│   │   ├── useArenaMissions.js    Mission fetch + cache
│   │   └── useDomainChallengeSlots.js
│   ├── lib/
│   │   ├── supabase.js            Supabase client init
│   │   ├── db.js                  userDoc + arenaDb helper wrappers
│   │   └── api.js                 Typed API call wrappers
│   └── config/
│       ├── plans.js               Plan features + limits
│       ├── arenaDomains.js        Domain → workstation config
│       └── domainChallenges.js    Domain → challenge slot config
```

### 21.3 Design System

Capabilio uses a consistent token-based design system defined inline:

```js
const T = {
  cream: "#F6F6F1",       // background
  cream2: "#EFEFE9",      // card background
  ink: "#1A1A18",         // primary text
  ink2: "#3A3A38",        // secondary text
  ink3: "#6B6B68",        // caption text
  ink4: "#9A9A97",        // placeholder
  indigo: "#3D4EAC",      // primary action color
  indigo2: "#5B6FD4",     // hover state
  indigo3: "#EEF0FB",     // indigo tint background
  green: "#1A7A4A",       // success
  green2: "#E8F7EF",      // success background
  amber: "#B8620A",       // warning
  amber2: "#FDF3E7",      // warning background
  red: "#C0392B",         // error / gap
  red2: "#FDECEA",        // error background
  border: "rgba(26,26,24,0.09)",
  shadow: "0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
}
```

Typography: Playfair Display (headings) + Inter (body) + JetBrains Mono (code/numbers)

### 21.4 Real-time State Sync

Profile data is kept in sync using Supabase Realtime:

```js
// In Aura.jsx — live profile subscription
const unsub = userDoc.subscribe(uid, (updatedData) => {
  setLocalUserData(updatedData)
  setSkillGraph(updatedData.skillGraph || [])
  if (setUserData) setUserData(updatedData)
})

// In ArenaWorkstations.jsx — after submission
supabase
  .from("arena_history")
  .insert({ user_id, task_id, score, elo_delta, feedback, ... })
  .then(({ data }) => {
    // triggers Realtime update → header ELO animates
  })
```

---

## 22. Backend Architecture

### 22.1 Stack

- **Runtime:** Node.js 20
- **Framework:** Express.js
- **AI — Primary:** Google Gemini (gemini-2.5-flash) via `@google/generative-ai`
- **AI — Fallback:** Groq (llama-3.1-8b-instant) for low-latency structured output
- **AI — Voice:** Deepgram (ASR) + ElevenLabs (TTS) for AI interview
- **Database:** Supabase (PostgreSQL) via `@supabase/supabase-js`
- **PDF Extraction:** Gemini multimodal (PDF inline base64)
- **Search Grounding:** Gemini with `{ googleSearch: {} }` tool
- **Payments:** Razorpay
- **Auth:** Supabase Auth (JWT validation server-side)

### 22.2 Backend Directory Structure

```
backend/
├── server.js                    Express app entry, route registration
└── server/
    ├── lib/
    │   ├── gemini.js            Gemini client (text, search, PDF, vision, MCQ, missions)
    │   ├── groq.js              Groq client (fast JSON extraction fallback)
    │   ├── supabase.js          Backend Supabase admin client
    │   ├── deepgram.js          ASR for voice interview
    │   ├── enrich.js            Profile enrichment utilities
    │   ├── openai.js            OpenAI client (legacy/optional)
    │   └── razorpay.js          Payment utilities
    └── routes/
        ├── arena.js             Daily mission generation
        ├── arenaV2.js           v2 arena routes (submission scoring)
        ├── assessment.js        MCQ generation + scoring
        ├── skillGap.js          Live skill gap (Gemini Search)
        ├── skillGraph.js        Skill graph update logic
        ├── skillStudio.js       Lesson + learning path generation
        ├── aiInterview.js       Voice/text interview session
        ├── github.js            GitHub repo analysis
        ├── resume.js            PDF extraction
        ├── verify.js            Certification + experience verification
        ├── careerTimeline.js    AI-enriched timeline generation
        ├── jobs.js              Job listing + matching
        ├── pulseNexus.js        Market pulse feed generation
        ├── recruiterComms.js    Recruiter messaging
        ├── mentorHub.js         Mentor connection logic
        ├── orbitPlans.js        Org plan management
        ├── payments.js          Razorpay webhook handler
        └── forge.js             Content generation tools
```

### 22.3 Gemini Function Reference

```js
// 1. Plain generation (no search)
gemini(prompt, { model, json, maxTokens })

// 2. Google Search grounding — for live market data
geminiSearch(prompt, { maxTokens })
  → { text, sources }

// 3. PDF extraction — multimodal
geminiExtractPDF(filePath, prompt)
  → parsed JSON object

// 4. Image extraction
geminiExtractImage(base64, mimeType, prompt)
  → parsed JSON object

// 5. Arena mission generation — sticky, domain-aware
geminiGenerateMission({ keyword, domainKey, eloRating, difficulty, weakAreas, recentSkills, eloGain })
  → mission JSON

// 6. MCQ assessment generation
geminiGenerateMCQ({ jobTitle, count, domainSkills, mix })
  → { questions: [...] }

// 7. Skill Studio lesson generation
geminiGenerateLesson({ topic, jobTitle, skillLevel, duration })
  → lesson JSON

// 8. Learning path generation
geminiGenerateLearningPath({ jobTitle, skillGraph, weakAreas, eloRating })
  → { phases, totalDuration, milestones }
```

### 22.4 Caching Strategy

| Data Type | Cache Method | TTL |
|-----------|-------------|-----|
| Skill gap market data | In-memory Map (per domain) | 6 hours |
| Arena missions | Supabase DB (per user per day) | Until midnight IST |
| MCQ assessments | Client-side React state | Until session closes |
| Lessons | Client-side React state | Until module complete |
| GitHub fingerprint | Client-side sessionStorage | 24 hours |
| Job listings | In-memory Map | 1 hour |

---

## 23. UI Examples and Screen References

### Screen 1: Path Selector / Onboarding

**Layout:** Full-screen, centered, minimal chrome
```
┌─────────────────────────────────────────────────────────────────┐
│                     Welcome to Capabilio                        │
│            Your AI Career OS — built for Indian talent          │
│                                                                 │
│  Which best describes your situation?                           │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  🎓 STUDENT       │  │  💼 PROFESSIONAL  │                    │
│  │  I'm building    │  │  I'm repositioning│                    │
│  │  my career from  │  │  for a new role  │                    │
│  │  scratch         │  │  or company      │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  🏆 EXECUTIVE     │  │  🏢 ORGANIZATION  │                    │
│  │  I lead teams    │  │  I hire or manage│                    │
│  │  and steer       │  │  talent for an   │                    │
│  │  outcomes        │  │  institution     │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```
**Key widgets:** 4 path cards, hover animation, selected state border/glow  
**After selection:** Slides to domain/keyword input step

---

### Screen 2: Student Home Dashboard

**Layout:** Single-column, card-based, mobile-first
```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, Riya 👋                                          │
│  What's your move today?                                        │
├──────────┬──────────┬──────────────────────────────────────────┤
│ ELO 524  │ 🔥 7 days│ Building Tier                            │
│ ▲ 34 wk  │ Keep it! │                                          │
├──────────┴──────────┴──────────────────────────────────────────┤
│  TODAY'S GOAL                                                   │
│  ████████████░░░░░░░░░░  Complete 1 Arena challenge             │
│                                         [Go →]                  │
├─────────────────────────────────────────────────────────────────┤
│  ⚡ RECOMMENDED NEXT SKILL                                      │
│  Advanced SQL · High demand in Data Analyst · 3+ tasks          │
│                                              [Start]            │
├─────────────────────────────────────────────────────────────────┤
│  RECENT PORTFOLIO PROOF                                         │
│  Cohort Analysis · Swiggy · Score: 88 · +16 ELO · 3 days ago   │
│  Funnel Analysis · Zepto · Score: 84 · +12 ELO · 1 week ago    │
├─────────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS                                                  │
│  [⚔️ Open Arena]  [📡 Check Pulse]  [✦ My Aura]  [👥 Community] │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 3: Arena Homepage

**Layout:** Header with domain/ELO, mission cards row, progress section, history list
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔️ ARENA — Data Analyst    ELO 524    🔥 7    [Generate New]  │
├─────────────────────────────────────────────────────────────────┤
│  TODAY'S MISSIONS                    [Daily Reset: 11h 14m]    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ 🟢 EASY      │  │ 🟡 MEDIUM    │  │ 🔴 HARD              │ │
│  │ Zepto        │  │ Swiggy       │  │ CRED                 │ │
│  │ Clean messy  │  │ Cohort       │  │ ETL pipeline for     │ │
│  │ customer DB  │  │ retention    │  │ 10M transactions     │ │
│  │ SQL Lab      │  │ Notebook Lab │  │ Data Pipeline Studio │ │
│  │ 25 min       │  │ 40 min       │  │ 60 min               │ │
│  │ +8 ELO       │  │ +18 ELO      │  │ +30 ELO              │ │
│  │ [Start]      │  │ [Start]      │  │ [Start]              │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                                                                 │
│  THIS WEEK   ████████░░ 4/5 challenges complete                 │
├─────────────────────────────────────────────────────────────────┤
│  PROOF HISTORY                                                  │
│  ✅ Score 88 — Cohort Analysis — Swiggy — SQL — 3d ago          │
│  ✅ Score 91 — RFM Segmentation — Razorpay — Python — 5d ago    │
│  ❌ Score 31 — ETL Pipeline — CRED — Hard — 1w ago [Retry]      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 4: Challenge Workspace (SQL Lab)

**Layout:** Split panel — left: mission brief, right: code editor + output
```
┌──────────────────────────────┬──────────────────────────────────┐
│  MISSION BRIEF               │  SQL LAB                         │
│                              │                                  │
│  Company: Swiggy             │  ┌──────────────────────────┐   │
│  Difficulty: Medium          │  │ SELECT                   │   │
│  Time: 40 min  ⏱ 31:22       │  │   user_id,               │   │
│                              │  │   DATE_TRUNC('month',    │   │
│  Scenario:                   │  │     signup_date) AS       │   │
│  "Swiggy's growth team       │  │     cohort,              │   │
│  noticed a 12% drop in       │  │   ...                    │   │
│  90-day user retention..."   │  └──────────────────────────┘   │
│                              │                                  │
│  Task:                       │  RESULTS                         │
│  Write a SQL query that       │  ┌──────────────────────────┐   │
│  returns a cohort matrix     │  │ cohort  | 30d  | 60d | 90d│  │
│  with retention % for        │  │ Jan 24  | 68%  | 52% | 41%│  │
│  30/60/90 day buckets        │  │ Feb 24  | 71%  | 55% | 43%│  │
│                              │  └──────────────────────────┘   │
│  Hints:                      │                                  │
│  [💡 Get Hint]               │  [▶ Run Query]  [✅ Submit]      │
│                              │                                  │
│  Expected:                   │  ────────────────────────────── │
│  Table with dates as rows    │  SCHEMA REFERENCE                │
│  and retention % columns     │  orders(user_id, order_date...)  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

### Screen 5: Skill Gap Analysis (Aura → Skill Gaps Tab)

**Layout:** Market overview card + 3-column gap grid
```
┌─────────────────────────────────────────────────────────────────┐
│  📡 MARKET OVERVIEW — DATA ANALYST                    [Refresh] │
│  Live market data: Data Analyst roles growing 18% YoY.          │
│  dbt adoption up 67% in job postings. Your profile: 4 skills.   │
│                                                                  │
│  Overall Market Readiness:                                       │
│  Your avg: 17%  ████░░░░░░░░░░░░░░  Market avg: 63%             │
│                               │ Market threshold (81%)           │
│  17% market-ready · 5 skills below market threshold             │
│                                                                  │
│  ┌ 8w ┐  🎯 Top Action This Week                                │
│  │ TO │  Bridge your biggest gap: dbt — you're at 0%,           │
│  │ BE │  market needs 81%. 81-point gap closable in 4 weeks.    │
│  └────┘                                                         │
├───────────────┬──────────────────┬──────────────────────────────┤
│ 🔴 CRITICAL   │ 🟡 LEARN SOON    │ 🟢 YOU HAVE                  │
│ GAPS          │                  │                              │
│               │                  │                              │
│ 🔺+67% SURGE  │ Apache Airflow   │ Python        High           │
│ dbt           │ Medium           │ 100% ████████  100%          │
│ You:    0%    │ You:    0%       │ Market:        100% ████████  │
│ Market: 81%   │ Market: 81%      │ Above 40% threshold ✅        │
│ Gap: 81 pts   │ Gap: 81 pts ─4w  │                              │
│               │                  │ Dashboard Design  High       │
│ 🔺+42% SURGE  │ Looker/Metabase  │ 100% ████████  100%          │
│ Advanced SQL  │ Medium           │                              │
│ You:    0%    │                  │                              │
│ Market: 81%   │                  │                              │
│ Gap: 81 pts   │                  │                              │
├───────────────┴──────────────────┴──────────────────────────────┤
│  🎓 Ready to close these gaps?                                  │
│  Skill Studio has AI-generated paths for your exact gaps.       │
│                                          [Go to Skill Studio →] │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 6: Recruiter Dashboard

**Layout:** Left sidebar (filters) + right results grid + candidate modal
```
┌──────────────────────────────────────────────────────────────────┐
│  TALENT SEARCH                          [New Pipeline] [Filters] │
├─────────────────┬────────────────────────────────────────────────┤
│  FILTERS        │  34 candidates found                           │
│                 │                                                │
│  Role:          │  ┌────────────────┐  ┌────────────────┐       │
│  [Data Analyst] │  │ Priya Sharma   │  │ Arjun Kumar    │       │
│                 │  │ ELO 524        │  │ ELO 612        │       │
│  Min ELO: 500   │  │ SQL 74% ✅     │  │ SQL 82% ✅     │       │
│  ────────────── │  │ Python 68% ✅  │  │ Python 71% ✅  │       │
│  Skills:        │  │ 14 proofs      │  │ 22 proofs      │       │
│  [SQL]  [Python]│  │ Bengaluru      │  │ Mumbai         │       │
│                 │  │ Last: 3d ago   │  │ Last: 1d ago   │       │
│  City:          │  │ [View] [+Add]  │  │ [View] [+Add]  │       │
│  [Bengaluru ▾]  │  └────────────────┘  └────────────────┘       │
│                 │                                                │
│  Availability:  │  PIPELINE: Junior DA Role                      │
│  [✅ Open only] │  Riya S. [Round 1] → Arjun K. [Round 2]        │
│                 │                                                │
└─────────────────┴────────────────────────────────────────────────┘
```

---

### Screen 7: Verification Flow

**Layout:** Step-by-step wizard with progress indicator
```
┌─────────────────────────────────────────────────────────────────┐
│  VERIFY YOUR CREDENTIALS                                        │
│  Step 2 of 3: Certification                                     │
│  ─────────────────────────────────────                          │
│                                                                 │
│  Provider:  [AWS ☁️ ▾]                                          │
│                                                                 │
│  Certificate ID:                                                │
│  ┌──────────────────────────────────────────┐                   │
│  │ AWS-SAA-C03-382919                       │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                 │
│  [Verify Certificate]                                           │
│                                                                 │
│  ─────────────────────────────────────                          │
│  ✅ VERIFIED                                                    │
│  AWS Solutions Architect — Associate                            │
│  Issued: January 2024 · Valid until: January 2027               │
│  Gold badge added to your Aura profile                          │
│                                                                 │
│                  [Continue →]                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 24. Step-by-Step Build Order

This section gives an engineer a clear implementation sequence. Each phase builds on the previous and delivers a shippable increment.

### Phase 1: Core Infrastructure (Weeks 1–2)

1. Supabase project setup — auth, profiles table, arena_history table
2. Express backend with route scaffolding (no AI yet)
3. React frontend: App.jsx with auth gating + basic routing
4. Header + Layer 2 nav components
5. Onboarding flow: path selector → domain input → profile creation

**Deliverable:** User can sign up, select a path, and see a blank dashboard.

### Phase 2: Arena MVP (Weeks 3–4)

1. Gemini mission generation endpoint (`/api/arena/daily`)
2. Domain context map in `gemini.js` (DOMAIN_CONTEXT object)
3. ArenaWorkstations.jsx: SQL Lab (sql.js WASM), Code IDE (Monaco/CodeMirror)
4. ChallengeShell.jsx: timer, mission brief panel
5. Submission endpoint with Gemini scoring (`/api/arena/submit`)
6. arena_history insert + ELO update logic
7. ELO badge in header with animation

**Deliverable:** User can complete a SQL or Python challenge, get a score, and see ELO update.

### Phase 3: Aura + Skill Graph (Weeks 5–6)

1. Profile API routes (GET, PATCH)
2. Skill graph computation: update on arena submission
3. Aura.jsx: Skills tab with radar visualization
4. Aura.jsx: Career & Vault tab with resume upload
5. PDF extraction endpoint (`/api/extract-pdf`) using Gemini multimodal
6. Experience + projects extraction and classification (isProjectEntry)
7. Public profile endpoint (`/api/profile/public/:username`)

**Deliverable:** User has a public Aura profile with skill graph, experiences, and vault.

### Phase 4: Assessment + Skill Gap (Weeks 7–8)

1. MCQ generation endpoint (`/api/assess/generate`)
2. Assessment UI in Aura → Skills tab
3. Assessment scoring + skill graph update
4. Skill Gap endpoint (`/api/skill-gap`) with Gemini Google Search grounding
5. Skill Gap UI (3-column layout with bars)
6. generateMockSkillGap() local fallback with domain benchmarks

**Deliverable:** User can assess skills and see a skill gap analysis against live market data.

### Phase 5: Skill Studio (Weeks 9–10)

1. Learning path generation endpoint (`/api/studio/learning-path`)
2. Lesson generation endpoint (`/api/studio/lesson`)
3. Skill Studio UI: phase navigation + lesson viewer + quiz
4. Progress tracking: completed lessons stored in profile
5. Link: Skill Gap → "Go to Skill Studio" → auto-selects first gap skill

**Deliverable:** User can follow a personalized AI-generated learning path.

### Phase 6: Launchpad + Job Matching (Weeks 11–12)

1. Job listing data model + seeding
2. Matching algorithm (ELO + skill score + domain)
3. Launchpad UI: readiness check, matched jobs, application tracking
4. "Open to opportunities" toggle → recruiter discoverability
5. Basic recruiter search endpoint (`/api/recruiter/search`)

**Deliverable:** Candidates are discoverable by recruiters; job matches surface.

### Phase 7: Recruiter + Org Tools (Weeks 13–14)

1. Org profile + admin setup
2. Recruiter dashboard UI
3. Candidate search with filters (ELO, skills, city)
4. Pipeline management (add, stage, notes)
5. Challenge deployment to a cohort
6. Team ELO dashboard for Org admins

**Deliverable:** Organizations can find, evaluate, and pipeline candidates.

### Phase 8: Verification + Trust (Weeks 15–16)

1. Certification verification API (per provider)
2. Verification badge system (tiers 1–5)
3. Resume experience verification (document upload + AI extraction)
4. Proof artifact immutability enforcement (no delete/edit on submitted proofs)
5. Verification state display in Aura + recruiter view

**Deliverable:** Trust layer live — verified users have visible credential signals.

### Phase 9: AI Interview + Advanced Features (Weeks 17–18)

1. AI interview session management (`/api/interview/*`)
2. Interview UI with voice input (Deepgram) and TTS response (ElevenLabs)
3. STAR framework analysis in post-interview report
4. GitHub Code DNA integration (`/api/github/fingerprint`)
5. ELO decay cron logic (client-side trigger on page load)
6. Pulse market feed generation

**Deliverable:** Full AI interview capability + advanced profile intelligence.

### Phase 10: Scale + Polish (Weeks 19–20)

1. Rate limiting on all AI endpoints (express-rate-limit)
2. Request queuing for expensive Gemini calls
3. Frontend performance: code splitting, lazy loading workstations
4. Mobile nav optimization (bottom nav, responsive layouts)
5. Analytics integration (Mixpanel or Amplitude events)
6. Plan gating (Free vs Pro features)
7. Payment integration (Razorpay)
8. Error monitoring (Sentry)

---

## 25. Risks and Future Extensions

### 25.1 Current Risks

**Risk 1: AI scoring consistency**  
Gemini scores can vary for the same submission if prompts are not deterministic. Mitigation: rubric-first prompts with explicit scoring criteria, test suite of known-good submissions with expected score ranges.

**Risk 2: ELO gaming**  
Users could create multiple accounts to inflate ELO. Mitigation: device fingerprinting, IP rate limiting per account creation, ELO floor reset on detected anomaly patterns.

**Risk 3: WASM performance on low-end devices**  
Pyodide (~10MB download) and sql.js are heavy for mobile. Mitigation: lazy-load workstations only when user enters Arena, progressive enhancement fallback (server-side execution for mobile).

**Risk 4: Gemini API cost at scale**  
Mission generation, scoring, skill gap, interviews, and MCQs all call Gemini. Mitigation: aggressive caching (missions are sticky per user per day; skill gap is 6h cache per domain), Groq fallback for structured extraction tasks.

**Risk 5: Data sovereignty and privacy (DPDPA India)**  
Proof artifacts include submitted code which may contain sensitive business logic or personal data. Mitigation: clear ToS on ownership, resume extraction data is user-deletable, no third-party sharing of proof content without consent.

**Risk 6: Recruiter trust in AI-scored proofs**  
Recruiters may be skeptical of AI-generated scores. Mitigation: transparent rubric display ("this is how the score was computed"), show raw code alongside score, offer proctored challenge mode for serious applications.

### 25.2 Technical Debt to Watch

1. **Aura.jsx is monolithic (~4800 lines).** Should be split into: SkillGapTab.jsx, CareerVaultTab.jsx, SkillsTab.jsx, ResilienceTab.jsx, CodeDNATab.jsx
2. **skillGraph as JSON column** works now but doesn't support querying at scale. Future: separate `skill_scores` table with `(user_id, skill_name, score, updated_at)`.
3. **ELO decay on client side** is fragile — a user who never opens the app doesn't decay. Future: server-side cron job (Supabase Edge Function, daily at 2am IST).
4. **No search indexing** on profiles for recruiter queries. Future: PostgreSQL full-text search + `pg_vector` for semantic skill matching.

### 25.3 Future Extensions

**Extension 1: Peer Review Layer**  
Allow verified professionals (ELO 700+) to review submitted proofs and add human annotations. Human-reviewed proofs = Tier 5 verification (highest trust).

**Extension 2: Company Challenges (Sponsored Arena)**  
Companies can publish real hiring challenges. A candidate who solves a company's actual problem gets a direct pipeline interview. Creates revenue (companies pay for challenge deployment + candidate data access).

**Extension 3: Team Arena (Multiplayer)**  
Two candidates compete on the same challenge simultaneously. Winner takes +5 bonus ELO. Creates engagement loop, leaderboard energy.

**Extension 4: Capabilio for Colleges**  
Bulk onboarding of students via institution code. College gets aggregate dashboard: placement readiness % by department, top performers, skill gap per batch. Revenue: institution license fee.

**Extension 5: Skill Passport (Portable Credential)**  
Export Aura profile as a verifiable PDF with QR code that links to a tamper-evident, time-locked snapshot of the profile. Valid for 90 days. Used for job applications outside Capabilio.

**Extension 6: AI Mentor**  
Persistent AI tutor that tracks learning across Skill Studio + Arena. Remembers what the user struggled with, proactively surfaces remediation content, answers follow-up questions on past challenge feedback.

**Extension 7: B2B Upskilling for Enterprises**  
Organizations deploy custom learning paths for their teams. L&D team defines role → Capabilio generates challenges + lessons + tracking. Revenue: per-seat SaaS.

**Extension 8: Regional Language Support**  
Hindi, Tamil, Telugu, and Kannada interfaces. Lower barrier to entry for talent in Tier 2/3 cities — a critical market for India-first positioning.

**Extension 9: Semantic Skill Matching**  
Replace string-based skill matching with `pg_vector` embeddings. "pandas" and "data manipulation" would match. Enables richer recruiter search and more accurate skill gap computation.

**Extension 10: Interview Recording + Analysis**  
Candidates can record video responses to interview questions. AI analyzes: speech pace, filler word frequency, confidence signals, STAR structure compliance. Adds a behavioral layer on top of technical proof.

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| Arena | The execution engine where users complete domain-specific challenges |
| Aura | The user's persistent skill identity profile |
| Proof Artifact | A timestamped, AI-scored submission from Arena — the core unit of evidence |
| ELO | The live skill score that reflects performance history, decays with inactivity |
| Mission | A single Arena challenge with scenario, task, workstation, and rubric |
| Domain | A canonical job function category (Data Analyst, Frontend, DevOps, etc.) |
| Domain Key | The internal string that maps to a domain's workstation + context config |
| Skill Graph | JSON array of skill name + score + source stored per user |
| Sticky Mission | A mission generated once and stored until completed (not regenerated per visit) |
| WASM | WebAssembly — enables Python (Pyodide) and SQLite (sql.js) to run in the browser |
| Verification Tier | Trust level 0–5 assigned to an experience claim or credential |
| ELO Floor | The minimum ELO a user can decay to (role-specific: 400/600/800) |
| normalizeDomain() | Function that maps any keyword to a canonical domain string |
| Launchpad | The job market bridge module connecting skill identity to opportunities |
| Skill Studio | The AI-generated learning engine with lessons, paths, and quizzes |
| Pulse | The market intelligence feed showing role trends and ELO signals |

---

## Appendix B: Environment Variables Reference

```env
# Supabase
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend API
VITE_API_URL=https://capabilio-server.onrender.com

# Backend (server.env)
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_SECRET=...
OPENAI_API_KEY=sk-...  # optional fallback
```

---

*Document version 1.0 — Capabilio Engineering Team*  
*Last updated: June 2026*  
*For questions or updates, edit this file and commit with a version bump.*
