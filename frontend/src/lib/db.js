/**
 * db.js — Drop-in compatibility layer replacing Firebase/Firestore
 *
 * OLD IMPORT (in each page):
 *
 * NEW IMPORT (replace with this):
 *   import { userDoc, arenaDb, skillDb } from "../lib/db"
 *
 * Every function below is a direct equivalent of the Firebase call it replaces.
 */

import { supabase } from './supabase'
import { profileRealtime, arenaHistoryRealtime } from './realtimeSingletons'

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA NORMALISATION
// The profiles table uses snake_case columns exclusively.
// Legacy code (onboarding, Aura, Arena) writes camelCase keys.
// toSnake() converts before every DB write so nothing is silently dropped.
// toCompat() merges both names after every DB read so all existing reads work.
// ─────────────────────────────────────────────────────────────────────────────
const CAMEL_TO_SNAKE = {
  // Core identity
  displayName:          'display_name',
  profilePhotoURL:      'profile_photo_url',
  profilePhotoUrl:      'profile_photo_url',   // lowercase-url alias
  avatarUrl:            'profile_photo_url',   // avatar alias → same column
  coverPhotoURL:        'cover_photo_url',
  coverPhotoUrl:        'cover_photo_url',     // lowercase-url alias
  // Onboarding / path
  onboardingComplete:   'onboarding_complete',
  // ELO / Arena
  eloRating:            'elo_rating',
  baseElo:              'elo_rating',          // alias — map to elo_rating
  initialElo:           'elo_rating',          // alias
  arenaCompleted:       'arena_completed',
  arenaStreak:          'arena_streak',
  arenaLastActive:      'arena_last_active',
  lastArenaDate:        'last_arena_day',
  // ELO decay tracking — single source of truth, written by Arena, read by Aura
  arenaDecayAppliedAt:  'arena_decay_applied_at',
  eloDecayDate:         'arena_decay_applied_at',  // Aura's legacy field → same column
  eloDecayToday:        null,                       // computed on-the-fly, no DB column — drop
  // Profile content
  skillGraph:           'skill_graph',
  weakAreas:            'weak_areas',
  profileSummary:       'profile_summary',
  resumeProjects:       'resume_projects',
  resumeFileName:       'resume_file_name',
  resumeUploadedAt:     'resume_uploaded_at',
  // BUG FIX: targetRole was never mapped here at all, so writing
  // userDoc.update({ targetRole }) silently tried (and failed) to write a
  // literal "targetRole" column that doesn't exist — the real column is
  // target_role. SettingsPanel.jsx was working around this by sending both
  // keys itself. This is the real mapping so every other caller (resume
  // import, Skill Gap Analysis) works without needing that workaround.
  targetRole:           'target_role',
  // Career data — camelCase aliases to snake_case columns
  certificates:         'certifications',      // DB column is certifications
  testimonials:         'testimonials',        // passthrough (column added via migration)
  // Social
  githubUsername:       'github_username',
  githubData:           'github_data',
  githubUrl:            'github_url',            // BUG FIX (2026-08-04): was unmapped, fell through
                                                   // toSnake()'s else-branch and wrote a literal
                                                   // "githubUrl" column — only worked by accident
                                                   // because a duplicate quoted "githubUrl" column
                                                   // also exists live. Now properly normalised onto
                                                   // the real snake_case column toCompat() already reads.
  linkedInUrl:          'linkedin_url',
  portfolioUrl:         'portfolio_url',          // same class of bug — was unmapped, no duplicate
                                                   // quoted column existed for this one, so every
                                                   // portfolioUrl save has likely been silently failing.
  // BUG FIX (2026-09-03): same failure class as githubUrl/portfolioUrl above
  // — leetcodeUrl (SettingsPanel.jsx's Proof & Portfolio form) had no
  // mapping and no column existed at all, so PostgREST rejected the ENTIRE
  // save with PGRST204 whenever this field was present — not just this
  // field, every field in the same save. Real column added via
  // 2026-09-03_profiles_leetcode_url.sql; deliberately snake_case, no
  // duplicate quoted camelCase column created.
  leetcodeUrl:          'leetcode_url',
  // Portfolio/vault
  vaultFiles:           'vault_files',
  purchasedThemes:      'purchased_themes',
  purchasedTemplates:   'purchased_templates',
  activePortfolioTheme: 'active_portfolio_theme',
  // Misc
  jobReadiness:         'job_readiness',
  auraScore:            'aura_score',
  auraScoreBreakdown:   'aura_score_breakdown',
  coverPosition:        'cover_position',
  personalInfo:         'personal_info',
  subscriptionCycleStart: 'subscription_cycle_start',
  eloHistory:           'raw_data',            // stored in raw_data jsonb
  // Assessment (student path)
  assessmentType:       'assessment_type',
  assessmentScore:      'assessment_score',
  assessmentTotal:      'assessment_total',
  // Resume tracking
  lastResumeUpload:     'last_resume_upload',
  // Recommendations
  recommendedTasks:     'recommended_tasks',
  // Keys to silently drop — no DB column exists; including them kills the whole update
  resumeSkills:         null,                  // no column — drop silently
  // EPFO verification: backend writes epfo_verified/epfo_data directly via service_role.
  // Frontend onUpdate just updates local state; don't try to write these columns.
  epfoVerified:         null,
  epfoData:             null,
  uan:                  null,
  // BUG FIX (2026-07-25, Career OS Tranche 3): SettingsPanel's Privacy and
  // Proof & Portfolio sections have been sending these 4 keys since they
  // were built, but none had a matching column — every save silently failed
  // in full (see career_os_ws0_privacy_toggle_columns migration). Real
  // columns now exist; map the two that need snake_case translation
  // (searchable is already a valid single-word column name, no mapping
  // needed — falls through the `else` branch in toSnake unchanged).
  analyticsEnabled:     'analytics_enabled',
  certVisible:           'cert_visible',
  vaultVisible:          'vault_visible',
  // 2026-08-05: recruiter_discoverable_opt_in migration — without this
  // explicit mapping, toSnake()'s else-branch would pass "recruiterDiscoverable"
  // through UNCHANGED (it only auto-passes keys that are ALREADY snake_case),
  // and PostgREST would reject the whole update with "column not found" —
  // same failure class as the certVisible/vaultVisible bug fixed above.
  recruiterDiscoverable: 'recruiter_discoverable',
  // 2026-08-06: employment_status_recruiter_visibility migration — same
  // failure class as recruiterDiscoverable above if left unmapped. This is
  // the mandatory second gate on recruiter visibility (see
  // employment_status_recruiter_visibility_migration.sql and
  // SettingsPanel.jsx's employmentStatus state).
  employmentStatus: 'employment_status',
  // BUG FIX (2026-07-27): buildStudentSavePayload (Onboarding.jsx) sends
  // roleId/roleLabel/roleSlug/roleStream/arenaKey whenever a student picks a
  // canonical role from RoleSearchPicker — none of these had a mapping here,
  // so onboarding save always hit PostgREST's "Could not find the 'arenaKey'
  // column of 'profiles' in the schema cache" (or roleId/roleLabel/etc,
  // whichever key iterated first) and the whole upsert was rejected (unknown
  // column fails the ENTIRE request, not just that key), falling through to
  // userDoc.set()'s core-columns-only fallback on every single onboarding
  // save. Verified against the live schema (Supabase MCP, public.profiles):
  // domain_key is a real, existing column already written elsewhere
  // (Arena.jsx's resolveDomain sync) — arenaKey maps onto it. role_id/
  // role_label/role_slug/role_stream have no column at all, so they're
  // dropped (silently, same pattern as resumeSkills above) rather than left
  // to break every save; add real columns in a migration first if canonical
  // role tracking is ever needed downstream.
  //
  // Same investigation also found college/branch/career_track_slug — sent on
  // literally every student signup, and actually read back by Arena.jsx for
  // domain resolution — had no columns either, meaning that data has never
  // once been persisted and Arena.jsx's branch-based resolution has been a
  // permanent no-op. Fixed at the schema level (migration
  // add_profiles_college_branch_career_track_slug, 2026-07-27) rather than
  // here, since these are already valid snake_case names needing no
  // camelCase mapping — see CORE_COLS below, now updated to include them.
  arenaKey:             'domain_key',
  roleId:               null,
  roleLabel:             null,
  roleSlug:              null,
  roleStream:            null,
}

/**
 * Convert any camelCase keys in a payload to their snake_case equivalents.
 * Unknown keys that are ALREADY snake_case are passed through unchanged.
 * Keys that map to an already-present snake_case key are merged (snake_case wins).
 */
const toSnake = (payload) => {
  if (!payload || typeof payload !== 'object') return payload
  const out = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined) continue
    const mapped = CAMEL_TO_SNAKE[k]
    if (mapped === null) continue          // null → explicitly drop (no DB column)
    if (mapped) {
      // Only write the mapped key if we haven't already written it via its snake_case form
      if (out[mapped] === undefined) out[mapped] = v
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * After reading from DB, add camelCase aliases for every snake_case column so
 * all existing component reads (userData.eloRating, userData.arenaStreak, etc.) work.
 */
const toCompat = (data) => {
  if (!data) return null
  return {
    ...data,
    // Identity
    displayName:          data.display_name        || data.displayName        || '',
    // ELO / Arena
    eloRating:            data.elo_rating           ?? data.eloRating           ?? 400,
    arenaCompleted:       data.arena_completed      ?? data.arenaCompleted      ?? 0,
    arenaStreak:          data.arena_streak         ?? data.arenaStreak         ?? 0,
    arenaLastActive:      data.arena_last_active    || data.arenaLastActive    || null,
    lastArenaDate:        data.last_arena_day       || data.lastArenaDate      || null,
    arenaDecayAppliedAt:  data.arena_decay_applied_at || data.arenaDecayAppliedAt || null,
    // Aura's legacy eloDecayDate reads from the same column
    eloDecayDate:         data.arena_decay_applied_at
                            ? data.arena_decay_applied_at.slice(0, 10)
                            : (data.eloDecayDate || null),
    // Profile content
    skillGraph:           data.skill_graph          || data.skillGraph          || [],
    weakAreas:            data.weak_areas           || data.weakAreas           || [],
    profileSummary:       data.profile_summary      || data.profileSummary      || '',
    resumeProjects:       data.resume_projects      || data.resumeProjects      || [],
    resumeFileName:       data.resume_file_name     || data.resumeFileName      || '',
    // Social
    githubUsername:       data.github_username      || data.githubUsername      || '',
    githubData:           data.github_data          || data.githubData          || null,
    linkedInUrl:          data.linkedin_url         || data.linkedInUrl         || '',
    githubUrl:            data.github_url           || data.githubUrl           || '',
    portfolioUrl:         data.portfolio_url        || data.portfolioUrl        || '',
    leetcodeUrl:          data.leetcode_url         || data.leetcodeUrl         || '',
    // Portfolio/vault
    vaultFiles:           data.vault_files          || data.vaultFiles          || [],
    purchasedThemes:      data.purchased_themes     || data.purchasedThemes     || {},
    purchasedTemplates:   data.purchased_templates  || data.purchasedTemplates  || {},
    activePortfolioTheme: data.active_portfolio_theme || data.activePortfolioTheme || null,
    // Misc
    jobReadiness:         data.job_readiness        ?? data.jobReadiness        ?? 0,
    auraScore:            data.aura_score           ?? data.auraScore           ?? 0,
    coverPosition:        data.cover_position       || data.coverPosition       || { x:50, y:50 },
    personalInfo:         data.personal_info        || data.personalInfo        || {},
    // ELO history stored in raw_data.eloHistory
    eloHistory:           data.raw_data?.eloHistory || data.eloHistory          || [],
    // Onboarding flags
    onboardingComplete:   data.onboarding_complete  ?? data.onboardingComplete  ?? false,
    // Profile photo
    profilePhotoURL:      data.profile_photo_url    || data.profilePhotoURL     || null,
    // BUG FIX (2026-08-08): avatarUrl is written to profile_photo_url on save
    // (see CAMEL_TO_SNAKE above) but was never aliased back on read here --
    // only profilePhotoURL was. Every render site (Aura.jsx, SettingsPanel.jsx)
    // reads userData.avatarUrl/avatar_url, not profilePhotoURL, so an upload
    // appeared to work (optimistic local state) and then vanished on refresh
    // once userDoc.get() re-fetched without this alias. avatar_url (snake_case,
    // no such column exists) kept only as a defensive fallback, not a real source.
    avatarUrl:             data.profile_photo_url    || data.avatarUrl          || data.avatar_url || null,
    coverPhotoURL:        data.cover_photo_url      || data.coverPhotoURL       || null,
    // Career data — these columns are snake_case = camelCase so spread already
    // brings them in, but alias here for any code that might expect camelCase
    experiences:          data.experiences          || [],
    education:            data.education            || [],
    certifications:       data.certifications       || [],
    certificates:         data.certifications       || [],   // alias: code saving 'certificates' reads back here
    testimonials:         data.testimonials         || [],
    strengths:            data.strengths            || [],
    weakAreas:            data.weak_areas           || data.weakAreas           || [],
    auraScoreBreakdown:   data.aura_score_breakdown || data.auraScoreBreakdown  || {},
    subscriptionCycleStart: data.subscription_cycle_start || data.subscriptionCycleStart || null,
    lastResumeUpload:     data.last_resume_upload   || data.lastResumeUpload    || null,
    resumeUploadedAt:     data.resume_uploaded_at   || data.resumeUploadedAt    || null,
    // BUG FIX: see CAMEL_TO_SNAKE note above — target_role was never aliased
    // back to targetRole on read, so every component reading userData.targetRole
    // (Home hero, Skill Gap Analysis, Orbit gap cards) always saw undefined.
    targetRole:           data.target_role          || data.targetRole          || null,
    // Student/Job Seeker onboarding split (2026-08-03) — sub-classification
    // within path="student" only; null for every other path and for
    // pre-existing student profiles created before this field existed.
    studentStage:         data.student_stage        || data.studentStage        || null,
    // Privacy/consent toggles (Career OS Tranche 3) — real columns now,
    // default true (visible) matches the pre-existing frontend assumption.
    searchable:           data.searchable        ?? true,
    analyticsEnabled:     data.analytics_enabled ?? true,
    certVisible:          data.cert_visible      ?? true,
    vaultVisible:         data.vault_visible     ?? true,
    // 2026-08-05: opt-in recruiter search (recruiter_discoverable_opt_in
    // migration) — deliberately defaults FALSE, unlike the toggles above.
    // Product decision: recruiter visibility is a stricter trust boundary
    // than `searchable` (Pulse/peer search, default true).
    recruiterDiscoverable: data.recruiter_discoverable ?? false,
    // 2026-08-06: mandatory second gate on recruiter visibility — see the
    // employmentStatus mapping above. Defaults to the safest state
    // ('active_hidden') if the column is somehow null, never to something
    // that would make a profile visible by accident.
    employmentStatus:      data.employment_status ?? 'active_hidden',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE  (replaces: doc(db,"users",uid) + getDoc/setDoc/updateDoc/onSnapshot)
// ─────────────────────────────────────────────────────────────────────────────
export const userDoc = {

  /** Get user profile once. Returns normalised data object or null. */
  get: async (uid) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('userDoc.get error:', error)
      return null
    }
    return data ? toCompat(data) : null
  },

  /** Create or fully replace a user profile. Normalises all keys to snake_case first. */
  set: async (uid, payload) => {
    const normalised = toSnake({ id: uid, ...payload, updated_at: new Date().toISOString() })
    // onConflict:"id" ensures we merge on the PK, never hitting the username unique constraint
    const { error } = await supabase.from('profiles').upsert(normalised, { onConflict: 'id' })
    if (!error) return true
    // If upsert still fails, try with only the guaranteed core columns
    console.warn('Profile upsert failed:', error.message)
    // NOTE: only list columns confirmed to actually exist on public.profiles
    // (verified live via Supabase MCP, 2026-07-27) — listing a column that
    // doesn't exist here defeats the entire purpose of this fallback, since
    // PostgREST rejects the whole request on ANY unknown column, guaranteed
    // or not. college/branch/career_track_slug were added via the
    // add_profiles_college_branch_career_track_slug migration (2026-07-27) —
    // see CAMEL_TO_SNAKE's note above for why they were missing before that.
    const CORE_COLS = ['id','email','display_name','username','path','keyword',
      'elo_rating','arena_completed','arena_streak','onboarding_complete',
      'subscription','updated_at','domain_key','target_role',
      'college','branch','career_track_slug','student_stage']
    const core = {}
    for (const k of CORE_COLS) { if (normalised[k] !== undefined) core[k] = normalised[k] }
    const { error: err2 } = await supabase.from('profiles').upsert(core, { onConflict: 'id' })
    if (err2) console.error('Core save also failed:', err2.message)
    return !err2
  },

  /** Partial update — normalises camelCase keys to snake_case before writing.
   *  username is intentionally excluded here: it must only be set via userDoc.set()
   *  during onboarding, or via the explicit setUsername helper below.
   *  Including it in routine updates risks 409 conflicts on the unique index. */
  update: async (uid, updates) => {
    // Allow username through only if it's the sole field being set (intentional username fix)
    const isUsernameOnlyUpdate = Object.keys(updates).filter(k => k !== 'username' && k !== 'updated_at').length === 0
    const safeUpdates = isUsernameOnlyUpdate ? updates : Object.fromEntries(Object.entries(updates).filter(([k]) => k !== 'username'))
    const normalised = toSnake({ ...safeUpdates, updated_at: new Date().toISOString() })
    const { error } = await supabase
      .from('profiles')
      .update(normalised)
      .eq('id', uid)
    // BUG FIX (2026-07-18): this was gated behind `NODE_ENV !== 'production'`,
    // which silently swallowed every real write failure on the actual live
    // site — exactly where it matters most, since this writes ELO,
    // arena_completed, and skill_graph (real scoring/progress data, not
    // cosmetic state). Always log now so a failed write is never invisible.
    if (error) {
      console.error('userDoc.update error:', error.code, error.message, { attemptedKeys: Object.keys(normalised) })
    }
    return !error
  },

  /**
   * Real-time listener. Returns normalised (camelCase + snake_case) data on every change.
   */
  subscribe: (uid, callback) => {
    // Fetch current data immediately and normalise before calling back
    supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()
      .then(({ data }) => { if (data) callback(toCompat(data)) })

    // Shared singleton channel — one connection per uid regardless of how many
    // consumers call subscribe() simultaneously.
    const unsub = profileRealtime.subscribe(uid, (row) => callback(toCompat(row)))
    return unsub
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ARENA  (replaces: users/{uid}/arenaHistory subcollection + arenaLeaderboard)
// ─────────────────────────────────────────────────────────────────────────────
export const arenaDb = {

  /** Add a submission to arena_history */
  addSubmission: async (uid, data) => {
    const row = {
      user_id:              uid,
      task_id:              data.task_id || data.id || null,
      title:                data.title   || "Arena Challenge",
      domain:               data.domain  || data.domain_key || "swe",
      difficulty:           data.difficulty || "Medium",
      // Bumped 2026-07-27: 2000 chars was truncating the composed full
      // mission brief (scenario + objective + steps + hints) Arena.jsx now
      // sends here — see the "missionBrief" comment at its call site. 8000
      // comfortably covers a ~20-sentence brief with headroom.
      scenario:             (data.scenario || "").slice(0, 8000),
      objective:            (data.objective || "").slice(0, 2000),
      expected_output:      (data.expected_output || "").slice(0, 2000),
      user_answer:          (data.submitted_answer || data.user_answer || "").slice(0, 3000),
      feedback:             (data.summary || data.feedback || "").slice(0, 1000),
      score:                data.score   || 0,
      elo_delta:            data.elo_delta || 0,
      type:                 data.challenge_type || "dsa",
      visible_in_portfolio: true,
      visible_in_aura:      true,
      completed_at:         new Date().toISOString(),
    }
    const { error } = await supabase.from('arena_history').insert(row)
    if (error) {
      // 42P01 = table does not exist — user needs to run the migration
      if (error.code === '42P01') {
        console.error(
          '❌ arena_history table missing in your Supabase project.\n' +
          '   Run supabase-arena-history-migration.sql in your Supabase SQL Editor.\n' +
          '   Project: https://supabase.com/dashboard/project/cbrjdfllxfmmvalijpej/sql/new'
        )
      } else {
        console.error('arenaDb.addSubmission error:', error.code, error.message)
      }
    }
    return !error
  },

  /** Listen to arena history from arena_history table */
  subscribeHistory: (uid, callback) => {
    const fetchHistory = () =>
      supabase
        .from('arena_history')
        .select('*')
        .eq('user_id', uid)
        .order('completed_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            if (error.code === '42P01') {
              console.warn('arena_history table missing — run supabase-arena-history-migration.sql')
            } else {
              console.error('subscribeHistory error:', error.message)
            }
            callback([])
            return
          }
          callback((data || []).map(r => ({
            ...r,
            completedAt: r.completed_at,
            submittedAt: r.completed_at,
            eloDelta:    r.elo_delta,
            review: { score: r.score, eloDelta: r.elo_delta, summary: r.feedback },
          })))
        })

    fetchHistory()

    // Shared singleton — one arena_history channel per uid
    const unsub = arenaHistoryRealtime.subscribe(uid, () => fetchHistory())
    return unsub
  },

  // NOTE (2026-07-30 fix): arena_leaderboard's REAL columns, per
  // missing_tables_migration.sql, are `domain`, `elo_rating`, `arena_completed`
  // — NOT `domain_key`, `elo`, `tasks_done` as every call site here and in
  // Arena.jsx previously assumed, and there is no `rank` column at all. Every
  // read against this table filtered/ordered on a column that doesn't exist,
  // which made PostgREST return an error on every single call — silently
  // swallowed by `if (error || !data?.length) fetchProfiles()` — so the app
  // ALWAYS fell through to the profiles-wide fallback ranking, never actually
  // using arena_leaderboard at all. That fallback then rendered "Anonymous"
  // for any account whose profiles.display_name/username were both empty
  // (see the parallel display_name backfill added in App.jsx's auth-state
  // handler), and "0" missions always, because the fallback's field names
  // (`user_id`, `tasks_done`) never matched what LeaderboardWidget reads
  // (`uid`, `missionsCompleted`). Both code paths below are now normalized to
  // emit the exact same shape the widget expects:
  // { id, uid, display_name, elo, missionsCompleted, streak }

  /** Upsert leaderboard — gracefully skips if table missing */
  upsertLeaderboard: async (uid, domainKey, data) => {
    const row = { id: `${uid}_${domainKey}`, user_id: uid, domain: domainKey, updated_at: new Date().toISOString() }
    if (data.display_name !== undefined)      row.display_name = data.display_name
    if (data.elo !== undefined)               row.elo_rating = data.elo
    if (data.elo_delta !== undefined)         row.elo_delta = data.elo_delta
    if (data.tasks_done !== undefined)        row.arena_completed = data.tasks_done
    if (data.arena_streak !== undefined)      row.arena_streak = data.arena_streak
    // `rank` isn't a persisted column — it's always computed client-side
    // from ordered position (see LeaderboardWidget) or via getRankCount().
    const { error } = await supabase
      .from('arena_leaderboard')
      .upsert(row, { onConflict: 'id' })
    if (error && error.code !== '42P01') console.error('arenaDb.upsertLeaderboard error:', error.message)
    return !error
  },

  getLeaderboardEntry: async (uid, domainKey) => {
    const { data } = await supabase.from('arena_leaderboard').select('*').eq('id', `${uid}_${domainKey}`).single()
    if (!data) return null
    return {
      id: data.id,
      uid: data.user_id,
      display_name: data.display_name,
      elo: data.elo_rating ?? 0,
      tasks_done: data.arena_completed ?? 0,
      missionsCompleted: data.arena_completed ?? 0,
      streak: data.arena_streak ?? 0,
    }
  },

  /** Listen to leaderboard — falls back to profiles.elo_rating ranking if table missing */
  subscribeLeaderboard: (domainKey, callback) => {
    const fetchProfiles = () =>
      supabase
        .from('profiles')
        .select('id, display_name, username, elo_rating, arena_streak, arena_completed')
        .order('elo_rating', { ascending: false })
        .limit(20)
        .then(({ data }) => callback((data || []).map(p => ({
          id: p.id,
          uid: p.id,
          display_name: p.display_name || p.username || "Anonymous",
          elo:      p.elo_rating || 0,
          missionsCompleted: p.arena_completed || 0,
          streak:   p.arena_streak || 0,
        }))))

    // Initial fetch
    supabase
      .from('arena_leaderboard')
      .select('*')
      .eq('domain', domainKey)
      .order('elo_rating', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error || !data?.length) {
          fetchProfiles()
        } else {
          callback(data.map(row => ({
            id: row.id,
            uid: row.user_id,
            display_name: row.display_name || row.username || "Anonymous",
            elo: row.elo_rating ?? 0,
            missionsCompleted: row.arena_completed ?? 0,
            streak: row.arena_streak ?? 0,
          })))
        }
      })

    // Poll every 30s instead of a broadcast Realtime channel on the entire
    // profiles table (which would fan out to every connected user on every
    // profile update — very expensive on the free-tier connection cap).
    const timer = setInterval(fetchProfiles, 30_000)
    return () => clearInterval(timer)
  },

  getRankCount: async (domainKey, elo) => {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gt('elo_rating', elo)
    return (count || 0) + 1
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL ASSESSMENTS  (new — powers skill graph, Half-Life, Signal)
// ─────────────────────────────────────────────────────────────────────────────
export const skillDb = {

  /** Upsert a skill score */
  upsert: async (uid, skill, score, source = 'arena') => {
    const { error } = await supabase
      .from('skill_assessments')
      .upsert({
        user_id: uid,
        skill,
        score,
        source,
        validated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,skill' })
    if (error) console.error('skillDb.upsert error:', error)
    return !error
  },

  /** Get all skills for a user */
  getAll: async (uid) => {
    const { data } = await supabase
      .from('skill_assessments')
      .select('*')
      .eq('user_id', uid)
      .order('score', { ascending: false })
    return data || []
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PULSE / POSTS  (replaces Firestore posts collection)
// ─────────────────────────────────────────────────────────────────────────────
export const pulseDb = {

  /** Fetch recent verified posts */
  getPosts: async (limit = 30) => {
    const { data } = await supabase
      .from('pulse_posts')
      .select('*, profiles!user_id(displayName, avatarUrl, elo, path_type, verified)')
      .eq('profiles.verified', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  },

  /** Add a new post */
  addPost: async (uid, content, type = 'post') => {
    const { error } = await supabase
      .from('pulse_posts')
      .insert({ user_id: uid, content, type, created_at: new Date().toISOString() })
    if (error) console.error('pulseDb.addPost error:', error)
    return !error
  },

  /** Subscribe to live post feed */
  subscribe: (callback) => {
    const channel = supabase
      .channel('pulse-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pulse_posts' },
        () => pulseDb.getPosts().then(callback)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCHPAD / JOBS  (replaces Firestore jobs collection)
// ─────────────────────────────────────────────────────────────────────────────
export const launchpadDb = {

  /** Get matching jobs for a user */
  getJobs: async (filters = {}) => {
    let q = supabase
      .from('jobs')
      .select('*, companies(name, logo_url, company_elo, verified)')
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (filters.domain)   q = q.eq('domain', filters.domain)
    if (filters.min_elo)  q = q.gte('min_elo', filters.min_elo)
    if (filters.location) q = q.ilike('location', `%${filters.location}%`)

    const { data } = await q.limit(50)
    return data || []
  },

  /** Apply to a job */
  apply: async (uid, jobId) => {
    const { error } = await supabase
      .from('job_applications')
      .upsert({ user_id: uid, job_id: jobId, applied_at: new Date().toISOString() })
    if (error) console.error('launchpadDb.apply error:', error)
    return !error
  },

  /** Get user's applications */
  getApplications: async (uid) => {
    const { data } = await supabase
      .from('job_applications')
      .select('*, jobs(title, companies(name, logo_url))')
      .eq('user_id', uid)
      .order('applied_at', { ascending: false })
    return data || []
  },
}
