/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║           CAPABILIO SERVER  —  server.js  (entry point)          ║
 * ║                                                                   ║
 * ║  DEV:   npm run dev:all   (React port 3000 + server port 4000)   ║
 * ║  PROD:  npm run build && npm start                                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Route modules live in server/routes/
 * Shared clients live in server/lib/
 */

// Load .env from project root regardless of which directory the server is started from
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env") })

// ─── Clustering — use all available CPU cores ─────────────────────────────────
// ES modules require all imports to be top-level, so we use an early-exit guard:
// the primary process forks workers and exits this module's execution context.
// Each forked worker re-imports this file and gets isPrimary=false, so it falls
// through to the Express setup below.
// On Render/Railway with 1 vCPU this is a no-op (1 worker = same as before).
// On 2+ cores: each core runs a full Express process sharing the same port.
import cluster from "cluster"
import { cpus } from "os"

// PRODUCTION INCIDENT (this deploy): even after guarding app.listen() to
// workers-only and capping the worker count, the crash-loop continued —
// this time from a bind conflict BETWEEN workers themselves
// (node:internal/cluster/child, not the primary), meaning Node's cluster
// module isn't reliably handling port hand-off in Render's container
// networking. Rather than keep patching cluster internals we don't fully
// control, clustering is now opt-in only (ENABLE_CLUSTER=true) and OFF by
// default. Render scales by running multiple independent service instances,
// not by forking workers inside one process — intra-process clustering buys
// nothing on this platform except this exact failure mode. Single-process
// is simpler and was proven stable before clustering was added.
const IS_CLUSTER_PRIMARY = cluster.isPrimary && process.env.NODE_ENV === "production" && process.env.ENABLE_CLUSTER === "true"

if (IS_CLUSTER_PRIMARY) {
  // BUG FIX: os.cpus().length reads the HOST machine's core count, not the
  // vCPU share actually allocated to this container — on Render that can be
  // much higher than what you're paying for. Forking that many workers on a
  // resource-constrained instance is itself a problem; capped at 4.
  const numCPUs = Math.min(cpus().length, 4)
  console.log(`[cluster] Primary ${process.pid} — forking ${numCPUs} workers (host reports ${cpus().length} cores, capped at 4)`)
  for (let i = 0; i < numCPUs; i++) cluster.fork()

  // BUG FIX (critical): this handler used to call cluster.fork() unconditionally
  // on every worker exit, with no rate limit. Combined with the missing early
  // return below, the primary was ALSO calling app.listen(PORT) directly on the
  // same port its workers request via cluster's shared-handle IPC — a genuine
  // EADDRINUSE conflict every restart, which forked a new worker, which hit the
  // same conflict, forever (see production incident: "bind EADDRINUSE null:10000").
  // Crash-loop backoff: if workers are dying faster than once every 2s on
  // average, stop respawning — a live conflict won't resolve itself by retrying,
  // and an infinite fork loop just burns CPU/log volume without ever recovering.
  let recentExits = []
  cluster.on("exit", (worker, code, signal) => {
    console.warn(`[cluster] Worker ${worker.process.pid} died (${signal || code})`)
    const now = Date.now()
    recentExits = recentExits.filter(t => now - t < 30000)
    recentExits.push(now)
    if (recentExits.length > 15) {
      console.error(`[cluster] ${recentExits.length} worker deaths in the last 30s — not respawning further. This is a crash loop, not a transient failure; check the error above (commonly EADDRINUSE, a missing required env var, or an uncaught startup exception) rather than restarting again.`)
      return
    }
    console.warn(`[cluster] restarting worker...`)
    cluster.fork()
  })
}
// BUG FIX (critical): the primary MUST NOT fall through to the Express/
// app.listen() setup below — previously nothing stopped it from doing so
// (process.exitCode only sets the eventual exit code, it does not halt
// execution), so the primary bound the port directly while its workers
// simultaneously asked it to share that same port via cluster IPC. The guard
// on app.listen() further down is the actual fix; IS_CLUSTER_PRIMARY is
// checked there instead of using process.exit()/return here, because the
// primary process must stay alive to run the cluster.on("exit") respawn
// logic above.

// Workers (and dev mode) continue past this point
import express from "express"
import cors    from "cors"
import { logger } from "./server/lib/logger.js"
// Common Challenge Framework's Notebook workspace needs a real python3 on
// PATH — checked once at boot and logged alongside the other provider
// checks below, since there's no render.yaml/Dockerfile in this repo for
// me to confirm the production host actually has it installed.
import { checkPythonAvailable } from "./server/lib/collegeStream/pythonSandbox.js"

// ─── Process-level crash safety (2026-08-16) ───────────────────────────────────
// Previously this process had NO uncaughtException/unhandledRejection
// handlers at all — an uncaught error anywhere (including in a fire-and-
// forget promise, e.g. a background insert whose .catch() was forgotten)
// would either crash with an unstructured stack dump straight to stderr
// (uncaughtException — Node's own default) or, worse, on unhandledRejection
// specifically, be swallowed entirely by whichever library/framework code
// happened to install its own listener first, leaving the process running
// in a state Node's own docs explicitly say is no longer safe to trust.
//
// Both handlers here do the same thing on purpose: log full structured
// context (via logger.js, so this is actually greppable in Render's log
// viewer instead of a bare stack trace mixed into free-text console spam),
// then exit(1) deliberately. This is the standard Node guidance — after
// either event the process's internal state is unknown, so the safe move
// is a controlled, logged exit and let the platform (Render's own process
// supervisor in the default non-cluster deployment, or the cluster
// primary's crash-loop-aware respawn logic above when ENABLE_CLUSTER=true)
// restart a fresh process, not to keep serving requests from a process that
// might be silently corrupted.
process.on("uncaughtException", (err) => {
  logger.error("uncaughtException — exiting (Node's own guidance: process state is untrusted after this)", { err })
  process.exit(1)
})
process.on("unhandledRejection", (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason))
  logger.error("unhandledRejection — exiting (registering this listener opts back into Node's own default-exit behavior, applied consistently with uncaughtException above)", { err })
  process.exit(1)
})

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// Moved to server/lib/rateLimiters.js on 2026-07-30 — see that file's header
// for the production incident (Skill Studio's dashboard sharing one 20/min
// bucket with Arena/chat/voice/TTS/Groq) that prompted the split. Imported
// below; skillStudioV2.js/skillStudio.js also import aiLimiter directly to
// apply it at the route level on their specific generation endpoints.
import { generalLimiter, aiLimiter, strictLimiter, skillStudioLimiter } from "./server/lib/rateLimiters.js"

// ─── Route modules ────────────────────────────────────────────────────────────
import resumeRoutes           from "./server/routes/resume.js"
import assessmentRoutes       from "./server/routes/assessment.js"
// Arena rebuild 2026-08-16 — old Arena (V1/V2) deleted for a from-scratch
// redesign, split into two structurally-separate branches. College Stream
// (Phase 1, this import) is live: static/rule-based/zero-AI. Domain Role
// (config-driven, AI-generated missions) lands in a later phase as its own
// route file, mounted at its own prefix — never sharing code with this one.
import arenaCollegeStreamRoutes from "./server/routes/arenaCollegeStream.js"
import arenaDomainRoleRoutes from "./server/routes/arenaDomainRole.js"
import arenaActivityRoutes from "./server/routes/arenaActivity.js"
import arenaCapabilityRoutes from "./server/routes/arenaCapability.js"
import proofsRoutes           from "./server/routes/proofs.js"            // Portfolio redesign — public Engineering Proofs API: GET /:userId (grouped+filtered), GET /:userId/:proofId
import educationRoutes        from "./server/routes/education.js"        // Education redesign Phase 1 — GET /profile/:userId (public), POST /profile (auth, own profile only)
import verificationRoutes     from "./server/routes/verification.js"     // Trust & Verification Center Phase 1 — provider registry, hash-chained audit log, POST /verify
import skillStudioRoutes      from "./server/routes/skillStudio.js"
import skillStudioV2Routes    from "./server/routes/skillStudioV2.js"       // Skill Studio V2 — skill journeys/module runtime/memory/Arena+interview bridges/evidence (additive, same /api/skill-studio prefix, no path collisions)
import skillStudioContentAdminRoutes from "./server/routes/skillStudioContentAdmin.js" // Skill Studio V2 content/admin review queue — requireAuth+requireAdmin, dedicated namespace (see questionBankAdmin.js's 2026-07-24 routing-shadow fix for why NOT bare "/api")
import chatRoutes             from "./server/routes/chat.js"
import githubRoutes           from "./server/routes/github.js"
import internalCodeDnaScanRoutes from "./server/routes/internalCodeDnaScan.js"
import jobRoutes              from "./server/routes/jobs.js"
import paymentRoutes          from "./server/routes/payments.js"
import referralRoutes         from "./server/routes/referral.js"
import verifyRoutes           from "./server/routes/verify.js"
import skillGapRoutes         from "./server/routes/skillGap.js"
import enrichRoutes           from "./server/routes/enrich.js"
import voiceRoutes            from "./server/routes/voice.js"
import ttsRoutes              from "./server/routes/tts.js"
import securityRoutes         from "./server/routes/security.js" // security/{password,mfa,sessions,visibility,notification-preferences,ai-preferences,events,account/delete}
// ── Professional Path modules ─────────────────────────────────────────────────
import professionalProfileRoutes from "./server/routes/professionalProfile.js"
import employerAttestationRoutes from "./server/routes/employerAttestation.js"
import careerTimelineRoutes      from "./server/routes/careerTimeline.js"
import candidateTasksRoutes      from "./server/routes/candidateTasks.js"
import skillGraphRoutes          from "./server/routes/skillGraph.js"
import weeklyPulseRoutes         from "./server/routes/weeklyPulse.js"
import homeV1Routes              from "./server/routes/homeV1.js" // Career OS Workstream 1 — pro/v1/home/*
import careerEventsV1Routes      from "./server/routes/careerEventsV1.js" // Career OS Workstream 2 — pro/v1/career/timeline
import skillPulseV2Routes        from "./server/routes/skillPulseV2.js"  // Career OS Workstream 3 — pro/weekly/v2 (coverage-gated, falls back to v1)
import questionBankAdminRoutes   from "./server/routes/questionBankAdmin.js" // Career OS Workstream 3 content-ops — admin/question-bank (internal, requireAdmin-gated)
import forgeRoutes               from "./server/routes/forge.js"
import aiInterviewRoutes         from "./server/routes/aiInterview.js"
import recruiterCommsRoutes      from "./server/routes/recruiterComms.js"
import recruiterSearchRoutes     from "./server/routes/recruiterSearch.js" // GET /api/recruiter/search — opt-in candidate discovery (profiles.recruiter_discoverable), replaces "recruiters can only view a link they already have"
// mentorHub.js is DEAD CODE — it queries mentor_profiles/mentor_bookings/
// mentor_payouts tables that did not exist when it was written, and calls
// supabaseAdmin.raw() (not a real method). Zero call sites in frontend/src
// (mentorApi in frontend/src/lib/api.js is defined but never imported).
// Its mount below is commented out (not deleted — kept for reference until
// a follow-up cleanup commit removes the file entirely). The real mentor
// marketplace is Career OS Workstream 4, mounted further down as
// mentorMarketplaceRoutes / mentorMarketplaceAdminRoutes /
// mentorMarketplaceWebhookRoutes at /api/pro/v1/mentor/*.
// import mentorHubRoutes           from "./server/routes/mentorHub.js"
import mentorMarketplaceRoutes        from "./server/routes/mentorMarketplace.js"        // Career OS Workstream 4 — /api/pro/v1/mentor/*, MENTOR_MARKETPLACE_V1_ENABLED-gated
import mentorMarketplaceAdminRoutes   from "./server/routes/mentorMarketplaceAdmin.js"   // Career OS Workstream 4 — /api/admin/mentor/*, requireAdmin + flag-gated
import mentorMarketplaceWebhookRoutes from "./server/routes/mentorMarketplaceWebhook.js" // Career OS Workstream 4 — Razorpay webhook, needs raw body (mounted separately below)
import pulseNexusRoutes          from "./server/routes/pulseNexus.js"
import execIntrosRoutes          from "./server/routes/execIntros.js"       // Executive Path — real warm-introduction requests (exec_intro_requests), replaces ExecutiveNetwork.jsx's unbuilt "Introductions" tab
import orbitPlansRoutes          from "./server/routes/orbitPlans.js"
import hardwareChallengesRoutes  from "./server/routes/hardwareChallenges.js"
import copilotCoachRoutes        from "./server/routes/copilotCoach.js" // pilot: tool-augmented Capi coach intent, MCP-backed
import groqProxyRoutes           from "./server/routes/groqProxy.js"    // P0 fix: Capi's Groq calls, moved server-side off the client
import collegeRoutes             from "./server/routes/college.js"      // College Path — institution-admin operational API (roster, leaderboard, stats, branches, export, placement confirm, ELO ledger)
import collegeDirectoryRoutes    from "./server/routes/collegeDirectory.js" // Public Indian college/university lookup for onboarding autocomplete — distinct from college.js (institution-admin API)
import companyRegistryRoutes     from "./server/routes/companyRegistry.js" // MCA company master data lookup — see company_registry_mca_master_data migration + scripts/importCompanyRegistry.js
import collegeChatRoutes         from "./server/routes/collegeChat.js"  // College Path — in-house chat (admin/placement-cell/recruiter), distinct from chat.js's generic AI coach
import orgVerificationRoutes     from "./server/routes/orgVerification.js" // Institution OS bugfix — server-side profiles.verificationStatus write (PC-7 compliant)
import orgJoinLinksRoutes        from "./server/routes/orgJoinLinks.js"    // Self-serve student join links — org_members, replaces one-by-one admin invite for ~1000-student rosters
import orgCompanyLinksRoutes     from "./server/routes/orgCompanyLinks.js" // Talent Network <-> real company org account linkage + NDA workflow
import partnerBridgeRoutes       from "./server/routes/partnerBridge.js"   // Service-to-service bridge for the standalone capabilio-recruiter app (shared-secret auth, not per-user JWT) -- see route file header comment
import companyRoutes             from "./server/routes/company.js"        // Career OS Workstream 5 — /api/pro/v1/company/*, COMPANY_MODULE_V1_ENABLED-gated (404s while off)
import portfolioPublicRoutes     from "./server/routes/portfolioPublic.js" // Career OS Tranche 6 Priority 6A — /api/portfolio/lookup/:id, narrow field-whitelisted replacement for Portfolio.jsx's old client-side select("*") reads
import opsDashboardRoutes        from "./server/routes/opsDashboard.js"    // Career OS Tranche 11 — /api/admin/ops/dashboard, requireAdmin-gated read-only monitoring snapshot
import { opsMetricsMiddleware }  from "./server/lib/opsMetrics.js"         // Career OS Tranche 11 — in-process request error-rate/latency recorder
import professionalEloRoutes     from "./server/routes/professionalElo.js" // Professional ELO (2026-07-25 product decision) — pro/elo/professional status+history
import professionalCertificationsRoutes from "./server/routes/professionalCertifications.js" // Skill Rating v2 (2026-07-26) — pro/certifications claim+verify, gates cert_bonus_elo
import subscriptionWebhookRoutes from "./server/routes/subscriptionWebhook.js" // Tranche C (2026-07-25) — /api/webhooks/razorpay/subscription, needs raw body (mounted separately below)
// startGradingWorker import removed 2026-08-16 — grading-worker.js was
// Arena-exclusive (polled arena_grading_jobs, wrote arena_history), both
// dropped along with the rest of Arena. Left running it would crash-loop
// querying tables that no longer exist.

// ─── App setup ────────────────────────────────────────────────────────────────
const app  = express()
const PORT = process.env.PORT || 4000

// BUG FIX (2026-07-29): cors() used to be registered AFTER the rate limiters
// below. createRateLimiter's 429 branch (`return res.status(429).json(...)`)
// never touches CORS headers — those only get attached by the cors()
// middleware itself. Since Express runs middleware strictly in registration
// order, ANY request (including the browser's own OPTIONS preflight, which
// passes through these path-scoped limiters just like a real request) that
// arrived after this IP had already hit its rate limit got a 429 with NO
// Access-Control-Allow-Origin header — which the browser reports as a CORS
// failure ("blocked by CORS policy: Response to preflight request doesn't
// pass access control check"), not as the rate limit it actually was. This
// silently broke EVERY /api/skill-studio/* and /api/arena/* call for any
// client that had made >100 (or >20 for AI routes) requests/min — including
// a real user simply reloading Skill Studio/Arena a handful of times while
// several panels each fire their own request on mount. Moving cors() to be
// the very first middleware means it always attaches headers first, on
// every response this server ever sends, 429 or not.
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "https://capabilio.online",
    "https://capabilio.online",
    "https://www.capabilio.online",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
  ],
  credentials: true,
}))

// ─── Maintenance lockout (2026-08-26) ──────────────────────────────────────────
// Full-application shutdown for the backend, independent of the frontend's
// FLAGS.maintenance_mode (main.jsx/MaintenancePage.jsx) — the two are
// separate switches by design so either side can come down/back up on its
// own. Every request gets a 503 with a small JSON body — including direct
// API callers who never load the frontend at all — EXCEPT the two health
// routes below, which must keep returning 200 or Render's process
// supervisor will read the service as crashed and restart-loop it, which
// is worse than the outage this is meant to manage. There is no
// render.yaml in this repo (Render is configured entirely via its
// dashboard), so the exact health-check path Render pings isn't visible
// here in code — both "/" and "/health" (the only two GET routes this
// server exposes with no "/api" prefix) are excluded to cover either.
//
// Registered AFTER cors() (so the 503 still carries CORS headers and
// reaches the browser as a real response instead of failing as an opaque
// CORS/network error) but BEFORE the rate limiters and route mounts below,
// so a maintenance window doesn't burn rate-limit budget or reach any
// route handler's own logic.
//
// Read fresh via process.env on every request (not cached into a
// module-load-time const like MENTOR_MARKETPLACE_V1_ENABLED in
// mentorMarketplace.js) so flipping the var takes effect on the very next
// request IF the host delivers env var changes to a running process
// without a restart. Render does not: env vars are injected at container
// start, so on Render this still requires triggering a redeploy/restart
// after changing MAINTENANCE_MODE in the dashboard, same restart
// requirement as every other backend flag in this codebase (see
// docs/mentor-marketplace-operator-runbook.md §9). The per-request read
// here is still correct — it's what makes the flag take effect immediately
// on any platform (or any future Render feature) that does support live
// env var delivery, and it costs nothing on Render either way.
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE !== "true") return next()
  if (req.path === "/" || req.path === "/health") return next()
  res.status(503).json({ error: "maintenance", message: "Capabilio is temporarily offline for maintenance. We'll be back shortly." })
})

// ─── Rate limiters ────────────────────────────────────────────────────────────
// Instances now imported from server/lib/rateLimiters.js (see that file's
// header for the 2026-07-30 incident this split fixes). /api/skill-studio
// moved off the shared aiLimiter bucket onto its own dedicated
// skillStudioLimiter (60/min) — its actual AI-generation endpoints
// (/modules/generate, /quiz/start, /modules/:id/remedial, /modules/:id/
// revision, /modules/:id/narration, /interview/generate, legacy /lesson,
// /learning-path) still get the stricter aiLimiter too, applied at the
// route level inside skillStudioV2.js/skillStudio.js — same double-layering
// generalLimiter+aiLimiter already used elsewhere.
app.use("/api", generalLimiter)
app.use("/api/skill-studio", skillStudioLimiter)
app.use("/api/chat",         aiLimiter)
app.use("/api/voice",        aiLimiter)
app.use("/api/tts",          aiLimiter)
app.use("/api/copilot",      aiLimiter)
app.use("/api/groq",         aiLimiter)
// PC-3: these AI-backed endpoints were only under the general 100/min limit.
// Put them on the tighter AI limiter to blunt anonymous cost-abuse. (Requiring
// auth on them additionally needs the onboarding client to send its bearer token.)
app.use("/api/generate-mcq",                aiLimiter)
app.use("/api/analyse-assessment",          aiLimiter)
app.use("/api/analyse-professional-profile", aiLimiter)
app.use("/api/resolve-role",                aiLimiter)
app.use("/api/verify",       strictLimiter)
// BUG FIX (production audit): both of these are Groq-backed (question
// generation / AI profile-summary drafting) but had no rate limiter at all,
// unlike every other AI-calling route family above. weekly_pulses has a
// natural once-per-week-per-user unique constraint that limits *legitimate*
// reuse, but nothing stopped repeated GENERATION attempts (e.g. hammering
// pulse creation before the row lands) or repeated summary regeneration.
app.use("/api/pro/weekly",         aiLimiter)
app.use("/api/pro/profile/summary", aiLimiter)
// Employer attestation: /pro/attestation/request sends an email per call
// (spam/cost vector) and the public /attestation/:token/{confirm,decline}
// endpoints are token-gated rather than auth-gated — strictLimiter adds
// defense in depth against token-guessing even though the 256-bit token
// itself is already infeasible to brute force.
app.use("/api/pro/attestation", strictLimiter)
app.use("/api/attestation",     strictLimiter)
app.use("/api/security",        strictLimiter) // password change, MFA enroll/verify/disable, recovery-code login — brute-force protection

// (cors() is registered above, before the rate limiters — see the 2026-07-29
// bug-fix comment near `const app = express()` for why.)
// Roster CSV imports (college.js) need more than the 512kb default — override
// for that path specifically, before the general limit below. body-parser
// skips re-parsing a body that's already been parsed, so this is safe layering.
app.use("/api/college/institutions", express.json({ limit: "4mb" }))

// Mentor Marketplace Razorpay webhook — MUST be mounted with express.raw()
// scoped to exactly this path, BEFORE the global express.json() below.
// HMAC signature verification (webhook.js's verifyWebhookSignature) needs
// the exact raw request bytes Razorpay signed; express.json() would parse
// and re-serialize the body, changing the bytes and breaking verification.
// Because this app.use() runs before the global express.json() call, and
// Express body parsers are no-ops on a body express.json() didn't touch
// (same "skip already-parsed" layering already used for the college.js 4mb
// override above), this is safe — no other route's body parsing changes.
app.use("/api/pro/v1/mentor/webhook/razorpay", express.raw({ type: "application/json" }))
app.use("/api",              mentorMarketplaceWebhookRoutes) // pro/v1/mentor/webhook/razorpay — raw body, see above

// Subscription/plan Razorpay webhook (Tranche C, 2026-07-25) — same raw-body
// requirement and same reasoning as the mentor webhook above. This is a
// safety net for the ALREADY-LIVE /api/create-order + /api/verify-payment
// flow, which previously had no server-side recovery path if a client never
// completed /verify-payment after Razorpay actually captured the payment.
app.use("/api/webhooks/razorpay/subscription", express.raw({ type: "application/json" }))
app.use("/api",              subscriptionWebhookRoutes) // webhooks/razorpay/subscription — raw body, see above

// 512kb global limit — prevents large-body DDOS. Routes that genuinely need
// more (PDF upload, resume extract) override locally with express.json({limit:"4mb"})
app.use(express.json({ limit: "512kb" }))

// ─── Request timeout middleware ───────────────────────────────────────────────
// AI routes can take 10–30s. Without a timeout, a stalled Groq/Claude call holds
// the connection open indefinitely, eventually exhausting the server's socket pool.
// Set a 35s server-side deadline — slightly longer than the slowest AI call.
app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timed out — please try again." })
    }
  }, 35_000)
  // Clear the timer as soon as the response finishes (success or error)
  res.on("finish",  () => clearTimeout(timer))
  res.on("close",   () => clearTimeout(timer))
  next()
})

// ─── Ops metrics — Career OS Tranche 11 ────────────────────────────────────────
// Lightweight in-process request/error/latency recorder, read by
// /api/admin/ops/dashboard (opsDashboard.js). Not a new monitoring platform —
// see opsMetrics.js header for exactly what this is and its honest limits.
app.use(opsMetricsMiddleware)

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/",       (_, res) => res.json({ status: "ok", service: "Capabilio Server", version: "3.0.0" }))
app.get("/health", (_, res) => res.json({ status: "ok", ts: Date.now() }))

// Diagnostic-only — reports whether the email provider env vars are visible to
// THIS running process, with no secrets in the response. Added 2026-07-22 to
// stop guessing from Render dashboard screenshots whether a deploy actually
// picked up RESEND_API_KEY / RESEND_FROM_ADDRESS.
const __serverBootedAt = new Date().toISOString()
app.get("/api/_debug/email-config", (_, res) => res.json({
  hasResendApiKey: !!process.env.RESEND_API_KEY,
  resendApiKeyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
  fromAddress: process.env.RESEND_FROM_ADDRESS || "Capabilio <onboarding@resend.dev> (default — RESEND_FROM_ADDRESS not set)",
  pid: process.pid,
  workerBootedAt: __serverBootedAt,
}))

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use("/api",              resumeRoutes)       // extract-pdf, extract-linkedin
app.use("/api",              assessmentRoutes)   // generate-mcq, analyse-assessment, analyse-professional-profile
// Arena rebuild — College Stream branch: static curriculum reads (public,
// covered by generalLimiter above) + rule-based submit (auth). UPDATE
// (2026-08-16): submit is no longer zero-cost — the Common Challenge
// Framework's Notebook workspace can spawn real python3 subprocesses
// (lib/collegeStream/pythonSandbox.js) for code-execution challenges.
// POST /experiments/:id/submit now carries its own dedicated
// codeExecutionLimiter, applied at the route level inside
// arenaCollegeStream.js (not here as a prefix) — same reasoning as
// skillStudioLimiter/aiLimiter's per-route split (see rateLimiters.js):
// this prefix's read-only browsing traffic (all-experiments, streams,
// history) shouldn't share the stricter submit-only budget.
app.use("/api/arena/college-stream", arenaCollegeStreamRoutes)
app.use("/api/arena/domain-role", arenaDomainRoleRoutes)
app.use("/api/arena/activity", arenaActivityRoutes)
app.use("/api/arena/capability", arenaCapabilityRoutes)
app.use("/api/proofs",          proofsRoutes)            // Portfolio redesign — public Engineering Proofs API (no auth: portfolios are public pages)
app.use("/api",                 portfolioPublicRoutes)    // Career OS Tranche 6 Priority 6A — portfolio/lookup/:identifier (no auth required; optional bearer for owner/session-fallback matching)
app.use("/api/admin/ops",       opsDashboardRoutes)       // Career OS Tranche 11 — admin/ops/dashboard, requireAdmin-gated (dedicated namespace — see opsDashboard.js header for why NOT bare "/api/admin", same routing-shadow lesson as questionBankAdmin.js)
app.use("/api/education",       educationRoutes)         // Education redesign Phase 1 — academic identity (education_profile) + achievements (proof_objects)
app.use("/api/verification",    verificationRoutes)      // Trust & Verification Center Phase 1 — provider registry, hash-chained audit log
app.use("/api/skill-studio", skillStudioRoutes)  // lesson, learning-path, youtube, resources
app.use("/api/skill-studio", skillStudioV2Routes) // Skill Studio V2 — home, graph, journeys, modules, quiz, memory, arena, interview, evidence, recommendations
app.use("/api/admin/skill-studio-content", skillStudioContentAdminRoutes) // Skill Studio content/creator review queue — requireAuth+requireAdmin, dedicated namespace (see questionBankAdmin.js routing-shadow fix)
app.use("/api/chat",         chatRoutes)         // chat
app.use("/api/github",       githubRoutes)       // analyze, connect, disconnect, connection, verify-ownership, repo-interview, visibility, cross-verify
app.use("/api/internal",     internalCodeDnaScanRoutes) // code-dna/scan-batch — server-to-server only, shared-secret authenticated (see requireCronSecret), called by a Render Cron Job on a schedule
app.use("/api",              jobRoutes)          // jobs, markets/india
app.use("/api",              paymentRoutes)      // create-order, verify-payment, theme/*, exec/thought-leadership
app.use("/api/referral",     referralRoutes)     // validate, apply, profile, leaderboard
app.use("/api/verify",       verifyRoutes)       // digilocker, epfo, certification
app.use("/api",              skillGapRoutes)     // skill-gap, market analysis — Gemini Search
app.use("/api/enrich",       enrichRoutes)       // stub — replaced by ProxyCurl
app.use("/api/voice",        voiceRoutes)        // transcribe — Deepgram nova-2 + Claude eval
app.use("/api/tts",          ttsRoutes)          // speak — Deepgram Aura-2 TTS (EchoPitch audio-in-video)
app.use("/api/security",     securityRoutes)     // Settings/Security redesign — password, MFA, sessions, visibility, notification/AI preferences
// ── Professional Path ─────────────────────────────────────────────────────────
app.use("/api",              professionalProfileRoutes) // pro/profile, pro/epfo, pro/visibility
app.use("/api",              employerAttestationRoutes) // pro/attestation/{request,list} (auth), attestation/:token/{,confirm,decline} (public, token-gated)
app.use("/api",              careerTimelineRoutes)      // pro/timeline, pro/vault
app.use("/api",              candidateTasksRoutes)      // candidate/tasks — recruiter-assigned tasks via partner bridge (2026-08-06)
app.use("/api",              skillGraphRoutes)          // pro/skills
app.use("/api",              weeklyPulseRoutes)         // pro/weekly — Weekly Career Check
app.use("/api",              professionalEloRoutes)     // pro/elo/professional — Professional ELO status+history (2026-07-25 product decision)
app.use("/api",              professionalCertificationsRoutes) // pro/certifications — Skill Rating v2 verification-gated cert bonus (2026-07-26)
app.use("/api",              homeV1Routes)              // pro/v1/home — Career OS Workstream 1 priority ranking
app.use("/api",              careerEventsV1Routes)      // pro/v1/career/timeline — Career OS Workstream 2 unified timeline
app.use("/api",              skillPulseV2Routes)        // pro/weekly/v2 — Career OS Workstream 3 (coverage-gated, falls back to v1)
// 2026-07-24 ROUTING FIX: previously mounted at bare "/api", which let this
// router's match-all requireAuth+requireAdmin middleware intercept every
// request under /api handled by routers mounted after it (forge,
// aiInterview, recruiterComms, pulseNexus, orbitPlans, hardwareChallenges,
// mentor marketplace, etc.), wrongly 403'ing non-admin authenticated users
// on unrelated endpoints. Now mounted at its own dedicated namespace — see
// routes/questionBankAdmin.js header comment for the full root-cause writeup.
app.use("/api/admin/question-bank", questionBankAdminRoutes) // admin/question-bank — internal content-ops workflow, requireAdmin-gated
app.use("/api",              forgeRoutes)               // pro/forge
app.use("/api",              aiInterviewRoutes)         // pro/interview
app.use("/api",              recruiterCommsRoutes)      // jobs, recruiter/messages, offers
app.use("/api",              recruiterSearchRoutes)     // recruiter/search — opt-in candidate discovery
// app.use("/api",              mentorHubRoutes)         // DEAD CODE — see import comment above. Unmounted, not deleted.
app.use("/api/pro/v1/mentor", mentorMarketplaceRoutes)  // Career OS Workstream 4 — mentor marketplace user-facing API (flag-gated)
// 2026-07-29 ROUTING FIX: this was mounted at bare "/api" (same bug as the
// questionBankAdmin.js shadow-routing fix noted above, just never applied
// here). Its router.use(requireFlag, requireAuth, requireAdmin) has no path
// scoping, so it ran for EVERY request that reached this mount point —
// which was every /api request not already claimed by an earlier-mounted
// router, including pulse/nexus (mounted just below). Since
// MENTOR_MARKETPLACE_V1_ENABLED is false in prod, that meant pulse/feed,
// pulse/builders, nexus/connections, nexus/search, etc. were all being
// 403'd with "mentor_marketplace_v1 is disabled" before pulseNexusRoutes
// ever got a chance to handle them. Route definitions inside
// mentorMarketplaceAdmin.js were relative-ized to match (were
// "/admin/mentor/x", now "/x") so the external paths are unchanged.
app.use("/api/admin/mentor",  mentorMarketplaceAdminRoutes) // Career OS Workstream 4 — admin/mentor/* (requireAdmin + flag-gated)
app.use("/api",              pulseNexusRoutes)          // pulse/feed, pulse/market-insights (Gemini Search), nexus/*
app.use("/api",              execIntrosRoutes)          // exec/intro-requests — Executive Path warm introductions
app.use("/api",              orbitPlansRoutes)          // orbit/plans, intel/report
app.use("/api",              hardwareChallengesRoutes)  // hardware/challenges, hardware/my-attempts
app.use("/api/copilot",       copilotCoachRoutes)       // coach — pilot MCP tool-use path for Capi's career-coach intent
app.use("/api/groq",          groqProxyRoutes)          // chat — server-side Groq proxy for Capi's general chat + classifier
// ── College Path ───────────────────────────────────────────────────────────────
app.use("/api/college",       collegeRoutes)            // institutions/:id/{roster,students,leaderboard,stats,branches,export,placements/:id/confirm,students/:id/elo-adjustment}
app.use("/api/college-directory", collegeDirectoryRoutes) // search — public Indian college/university lookup for onboarding autocomplete
app.use("/api/company-registry", companyRegistryRoutes)   // search — MCA company master data lookup (data.gov.in), not yet wired into EPFO/employer verification
app.use("/api/college-chat",  collegeChatRoutes)         // threads/{,:id/messages} — in-house chat, admin/placement-cell/recruiter
app.use("/api/org",           orgVerificationRoutes)    // verify-email — server-side PC-7-compliant write to profiles.verificationStatus
app.use("/api/org",           orgJoinLinksRoutes)       // join-links (CRUD), join/:token (resolve + claim) — self-serve student onboarding
app.use("/api/org",           orgCompanyLinksRoutes)    // company-links (invite w/ real-account matching), received, accept-nda, decline
app.use("/api/partner",       partnerBridgeRoutes)      // candidates, institutions -- service-to-service bridge for capabilio-recruiter (shared-secret auth)
app.use("/api/pro/v1/company", companyRoutes)           // Career OS Workstream 5 — Company module user-facing API (flag-gated, 404s while off)

// ─── Global error handler (2026-08-16) ─────────────────────────────────────────
// Previously missing entirely — every route file relies on its own try/catch
// (correctly, per this codebase's convention), but Express itself has no
// backstop: a synchronous throw in middleware, or an async route handler
// that forgets a try/catch, would otherwise either crash the process (for a
// sync throw outside a promise) or hang the request until the 35s timeout
// middleware above fires its own generic 503 with zero diagnostic detail.
// This must be registered LAST, after every app.use(route) call — Express
// only routes to a 4-arg middleware function when something upstream calls
// next(err) or throws, and only middleware registered after the failing
// handler is eligible to catch it.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err) // let Express's own default handler close out a response already in progress
  logger.error("unhandled route error", { err, method: req.method, path: req.originalUrl })
  res.status(500).json({ error: "Internal server error" })
})

// ─── Start ────────────────────────────────────────────────────────────────────
// BUG FIX (critical, see cluster block above): the primary process in a
// production cluster must never reach this call — only workers (and the
// single process in dev/non-clustered mode) should bind the port. Before
// this guard, the primary fell through unconditionally and directly bound
// PORT itself, which is what caused the "bind EADDRINUSE null:10000"
// crash loop — its own workers' cluster-IPC bind requests for the same
// port were racing against a bind the primary had no business making.
if (!IS_CLUSTER_PRIMARY) {
app.listen(PORT, () => {
  // Background grading worker (startGradingWorker) removed 2026-08-16 —
  // was Arena-exclusive, see import-site comment above.
  const workerInfo = cluster.isWorker ? ` [worker ${process.pid}]` : ""
  console.log(`\n╔══════════════════════════════════════════════════╗`)
  console.log(`║   Capabilio Server v3.0  ·  port ${PORT}${workerInfo}`)
  console.log(`╚══════════════════════════════════════════════════╝`)
  const ok   = (s) => `✅ ${s}`
  const warn = (s) => `⚠️  ${s}`
  const err  = (s) => `❌ ${s}`
  console.log(`  Groq        ${process.env.GROQ_API_KEY       ? ok("fast generation")              : err("MISSING")}`)
  console.log(`  Anthropic   ${process.env.ANTHROPIC_API_KEY  ? ok("grading + analysis (Claude)")  : warn("Groq fallback for grading")}`)
  console.log(`  Gemini      ${process.env.GEMINI_API_KEY     ? ok("PDF + live search grounding")  : warn("Groq fallback")}`)
  console.log(`  OpenAI      ${process.env.OPENAI_API_KEY     ? ok("GPT-4o + embeddings")          : warn("not set")}`)
  console.log(`  Deepgram    ${process.env.DEEPGRAM_API_KEY   ? ok("voice interview transcription"): warn("voice interview disabled")}`)
  console.log(`  Pinecone    ${process.env.PINECONE_API_KEY   ? ok("semantic job matching")        : warn("set PINECONE_HOST too")}`)
  console.log(`  Razorpay    ${process.env.RAZORPAY_KEY_ID    ? ok("payments")                     : err("MISSING")}`)
  console.log(`  Supabase    ${process.env.SUPABASE_URL       ? ok("database")                     : err("MISSING")}`)
  console.log(`  ProxyCurl   ${process.env.PROXYCURL_API_KEY  ? ok("LinkedIn extraction")          : warn("LinkedIn limited")}`)
  console.log(`  GitHub      ${process.env.GITHUB_TOKEN       ? ok("5000 req/hr")                  : warn("60 req/hr rate limit")}`)
  console.log(`  YouTube     ${process.env.YOUTUBE_API_KEY    ? ok("real videos")                  : warn("AI fallback")}`)
  console.log(`  Python3     ${checkPythonAvailable()          ? ok("Notebook code-execution challenges enabled") : err("MISSING — code-execution submissions will 500, see pythonSandbox.js")}`)
  console.log()
})
}
