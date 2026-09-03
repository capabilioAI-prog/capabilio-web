/**
 * Capabilio API Client
 * Centralizes all API calls with auth token injection, error handling, and typed responses.
 */
import { supabase } from "./supabase"

// 2026-07-29: fixed a wrong fallback here — "capabilio-web.onrender.com"
// was never a real service (confirmed via Render dashboard: the only actual
// backend is "capabilio-web", srv-d8lu178g4nts73fr1i20). A VITE_API_URL
// override had been silently masking this for a while; when it briefly went
// unset/wrong in production every single API route 404'd at once. Fixing
// the fallback to the real service so this can't happen again if the env
// var is ever missing.
const BASE = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function request(method, path, body = null, opts = {}) {
  const token = await getToken()
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const config = { method, headers }
  if (body && method !== "GET") config.body = JSON.stringify(body)

  const url = path.startsWith("http") ? path : `${BASE}/api${path}`

  // 2026-08-02: Render's backend can take a moment to respond to the first
  // request after being idle (free/starter tier cold start) or during a
  // brief deploy restart — the browser's fetch() throws a bare network
  // error ("Failed to fetch") in that window, before the request ever
  // reaches our server. That's what surfaced as Groups' "Failed to fetch"
  // on create. This retries ONLY on that network-level failure (never on a
  // real HTTP error response — a 400/403/500 means the server DID respond
  // and retrying won't help and could double-submit a non-idempotent POST).
  // Two retries with a short backoff covers a cold start without making the
  // user manually resubmit the form.
  let lastNetworkErr
  for (let attempt = 0; attempt <= 2; attempt++) {
    let res
    try {
      res = await fetch(url, config)
    } catch (networkErr) {
      lastNetworkErr = networkErr
      if (attempt < 2) { await sleep(attempt === 0 ? 700 : 1800); continue }
      const error = new Error("Could not reach the server — it may be starting up. Please try again in a few seconds.")
      error.status = 0
      error.cause = lastNetworkErr
      throw error
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      const error = new Error(err.error || err.message || `Request failed: ${res.status}`)
      error.status = res.status
      error.data = err // full parsed error body (e.g. company/create's 409 { error, company }) for callers that need more than .message
      throw error
    }
    return res.json()
  }
}

async function upload(path, formData) {
  const token = await getToken()
  const headers = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const url = `${BASE}/api${path}`
  const res = await fetch(url, { method: "POST", headers, body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }))
    throw new Error(err.error || `Upload failed: ${res.status}`)
  }
  return res.json()
}

// ══════════════════════════════════════════
// PROFESSIONAL PROFILE
// ══════════════════════════════════════════
export const profileApi = {
  get:         (uid) => request("GET", `/pro/profile/${uid}`),
  update:      (data) => request("POST", "/pro/profile", data),
  uploadPhoto: (file, type = "profile") => {
    const fd = new FormData(); fd.append("photo", file); fd.append("type", type)
    return upload("/pro/photo", fd)
  },
  setVisibility: (mode) => request("POST", "/pro/visibility", { mode }),
  recomputeElo:  ()     => request("POST", "/pro/elo/recompute"),
  generateSummary: () => request("POST", "/pro/profile/summary/generate"),
  saveSummary:     (summary) => request("POST", "/pro/profile/summary", { summary }),
}

// ══════════════════════════════════════════
// SECURITY — Settings/Security/Privacy redesign (2026-09-02)
// Password change, 2FA (Supabase native TOTP + our own recovery codes),
// sessions, profile visibility, notification/AI preferences. See
// backend/server/routes/security.js — every one of these has a real,
// tested server-side effect; none of them is a local-state-only toggle.
// ══════════════════════════════════════════
// ══════════════════════════════════════════
// GITHUB CODE DNA — canonical connection (2026-09-03)
// One connect/disconnect/status surface every UI (Settings, Career & Vault,
// Portfolio, Profile Strength) reads from, instead of each computing its
// own idea of "is GitHub connected" from a raw URL field. See
// backend/server/routes/github.js's /connect, /disconnect, /connection.
// ══════════════════════════════════════════
export const githubApi = {
  connect: (githubUrl, keyword) => request("POST", "/github/connect", { githubUrl, keyword }),
  disconnect: () => request("POST", "/github/disconnect"),
  connection: () => request("GET", "/github/connection"),
  refresh: () => request("POST", "/github/refresh"),
  analyze: (githubUrl, keyword) => request("POST", "/github/analyze", { githubUrl, keyword }),
  // verification-code now also returns the canonical connection/verification
  // status (connected/username/verified) — not just the raw code.
  verificationCode: () => request("GET", "/github/verification-code"),
  // 2026-09-03: no longer takes a githubUrl — the backend always checks the
  // canonical github_connections identity, never a client-supplied one.
  verifyOwnership: () => request("POST", "/github/verify-ownership"),
  visibility: () => request("GET", "/github/visibility"),
  setVisibility: (patch) => request("POST", "/github/visibility", patch),
}

export const securityApi = {
  changePassword: (currentPassword, newPassword) => request("POST", "/security/password/change", { currentPassword, newPassword }),

  mfaStatus:  () => request("GET", "/security/mfa/status"),
  mfaEnroll:  (currentPassword) => request("POST", "/security/mfa/enroll", { currentPassword }),
  mfaVerify:  (factorId, code) => request("POST", "/security/mfa/verify", { factorId, code }),
  mfaDisable: (currentPassword, factorId, { code, recoveryCode } = {}) =>
    request("POST", "/security/mfa/disable", { currentPassword, factorId, code, recoveryCode }),
  regenerateRecoveryCodes: (currentPassword, code) => request("POST", "/security/mfa/recovery-codes/regenerate", { currentPassword, code }),
  recoveryLogin: (email, password, recoveryCode) => request("POST", "/security/mfa/recovery-login", { email, password, recoveryCode }),

  sessions: () => request("GET", "/security/sessions"),

  setProfileVisibility: (profileVisibility) => request("POST", "/security/visibility", { profileVisibility }),

  getNotificationPreferences: () => request("GET", "/security/notification-preferences"),
  updateNotificationPreferences: (patch) => request("PUT", "/security/notification-preferences", patch),

  getAiPreferences: () => request("GET", "/security/ai-preferences"),
  updateAiPreferences: (patch) => request("PUT", "/security/ai-preferences", patch),

  events: () => request("GET", "/security/events"),

  deleteAccount: (currentPassword, reason) => request("POST", "/security/account/delete", { currentPassword, reason }),
}

// ══════════════════════════════════════════
// ORG / INSTITUTION OS — server-side writes to PC-7-protected profiles columns
// ══════════════════════════════════════════
export const orgApi = {
  verifyEmail: () => request("POST", "/org/verify-email"),
  verifyDocument: (url, docType = "naac_certificate") => request("POST", "/org/verify-document", { url, docType }),

  // Self-serve student join links — share one link instead of inviting
  // hundreds of students one at a time via the "+ Invite" modal.
  createJoinLink: (opts = {}) => request("POST", "/org/join-links", opts),
  listJoinLinks:  ()          => request("GET",  "/org/join-links"),
  revokeJoinLink: (id)        => request("PATCH", `/org/join-links/${id}/revoke`),
  resolveJoinLink: (token)    => request("GET",  `/org/join/${token}`),
  claimJoinLink:  (token)     => request("POST", `/org/join/${token}`),

  // Talent Network <-> real company org account linkage + NDA workflow.
  inviteCompany:        (opts)  => request("POST", "/org/company-links", opts),
  listAllCompanyLinks:  ()      => request("GET",  "/org/company-links"),           // college's own full network, every status
  updateCompanyLink:    (id, opts) => request("PATCH", `/org/company-links/${id}`, opts),
  deleteCompanyLink:    (id)    => request("DELETE", `/org/company-links/${id}`),
  resendCompanyInvite:  (id)    => request("POST", `/org/company-links/${id}/resend`),
  listReceivedCompanyLinks: ()  => request("GET",  "/org/company-links/received"),
  getCompanyLinkStudents: (id)  => request("GET",  `/org/company-links/${id}/students`),
  // Token-based — works whether or not the company had a matched account at
  // invite time. Real consent always flows through these, never a college
  // self-activate shortcut.
  resolveCompanyInvite: (token) => request("GET",  `/org/company-invite/${token}`),
  acceptCompanyInvite:  (token) => request("POST", `/org/company-invite/${token}/accept`),
  declineCompanyInvite: (token) => request("POST", `/org/company-invite/${token}/decline`),

  // Placement cell: approve/deny a recruiter's request to contact one
  // specific student (2026-08-06) — see backend/server/routes/
  // orgCompanyLinks.js's access-requests routes.
  listAccessRequests:  (status = "pending") => request("GET", `/org/company-links/access-requests?status=${status}`),
  decideAccessRequest: (id, decision) => request("POST", `/org/company-links/access-requests/${id}/decide`, { decision }),
}

// ══════════════════════════════════════════
// COLLEGE PATH — canonical institution_* schema (backend/server/routes/college.js)
// Distinct from orgApi above, which is the legacy org_* family. Added
// 2026-07-31 as part of bridging the dashboard onto the FK-correct schema.
// ══════════════════════════════════════════
export const collegeApi = {
  // Student-side: best-effort auto-link to a registered institution based on
  // their own profile.college text. Safe to call repeatedly (idempotent).
  selfLink: () => request("POST", "/college/self-link"),

  // Staff-side: resolve "which institution am I looking at" for the signed-in user.
  // 2026-08-02: optional institutionId lets a multi-campus university admin
  // explicitly switch which campus their dashboard is scoped to. Omitting it
  // keeps the original auto-picked behavior unchanged.
  myInstitution: (institutionId) =>
    request("GET", `/college/institutions/mine${institutionId ? `?institutionId=${institutionId}` : ""}`),

  getStudents: (institutionId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college/institutions/${institutionId}/students${qs ? `?${qs}` : ""}`)
  },
  // 2026-08-07: full-profile drilldown for a roster row click — see
  // backend/server/routes/college.js's GET /institutions/:id/students/:studentUserId.
  getStudentDetail: (institutionId, studentUserId) =>
    request("GET", `/college/institutions/${institutionId}/students/${studentUserId}`),
  getStats:      (institutionId) => request("GET", `/college/institutions/${institutionId}/stats`),
  getBranches:   (institutionId) => request("GET", `/college/institutions/${institutionId}/branches`),
  getLeaderboard: (institutionId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college/institutions/${institutionId}/leaderboard${qs ? `?${qs}` : ""}`)
  },
  exportReport:  (institutionId, format = "json") => request("GET", `/college/institutions/${institutionId}/export?format=${format}`),
  confirmPlacement: (institutionId, placementId) => request("POST", `/college/institutions/${institutionId}/placements/${placementId}/confirm`),
  approveStudent: (institutionId, studentId) => request("POST", `/college/institutions/${institutionId}/students/${studentId}/approve`),
  updateStudent:  (institutionId, studentId, fields) => request("PATCH", `/college/institutions/${institutionId}/students/${studentId}`, fields),
  removeStudent:  (institutionId, studentId) => request("DELETE", `/college/institutions/${institutionId}/students/${studentId}`),
  rejectStudent:  (institutionId, studentId) => request("POST", `/college/institutions/${institutionId}/students/${studentId}/reject`),
  shareStudent:   (institutionId, studentId, shared) => request("PATCH", `/college/institutions/${institutionId}/students/${studentId}/share`, { shared }),

  // Phase 3 — recruiter discovery / invite / interview workflow.
  recruiterSearch: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college/recruiter/search${qs ? `?${qs}` : ""}`)
  },
  inviteStudent:   (institutionId, studentId, type = "profile_view") =>
    request("POST", `/college/institutions/${institutionId}/students/${studentId}/invite`, { type }),
  requestInterview: (institutionId, studentId, opts = {}) =>
    request("POST", `/college/institutions/${institutionId}/students/${studentId}/interview`, opts),
  listRecruiterInvites: (institutionId) => request("GET", `/college/institutions/${institutionId}/recruiter-invites`),
  listInterviews:       (institutionId) => request("GET", `/college/institutions/${institutionId}/interviews`),
  updateInterviewStatus: (institutionId, interviewId, status) =>
    request("PATCH", `/college/institutions/${institutionId}/interviews/${interviewId}`, { status }),

  // Phase 4 — offers, placement records, student response.
  sendOffer:     (institutionId, studentId, opts) =>
    request("POST", `/college/institutions/${institutionId}/students/${studentId}/offer`, opts),
  listOffers:    (institutionId) => request("GET", `/college/institutions/${institutionId}/offers`),
  respondToOffer: (offerId, response) => request("POST", `/college/offers/${offerId}/respond`, { response }),
  // 2026-08-02: student-facing task inbox — self-scoped, no org/institution id needed.
  getMyTasks:    () => request("GET", `/college/me/tasks`),
  getMyDrives:   () => request("GET", `/college/me/drives`),
  listPlacements: (institutionId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college/institutions/${institutionId}/placements${qs ? `?${qs}` : ""}`)
  },

  // Staff access management (2026-08-01) — admin-created staff logins.
  createStaffLogin: (institutionId, opts) => request("POST", `/college/institutions/${institutionId}/staff`, opts),
  listStaff:        (institutionId) => request("GET", `/college/institutions/${institutionId}/staff`),
  revokeStaff:      (institutionId, staffId) => request("PATCH", `/college/institutions/${institutionId}/staff/${staffId}/revoke`),
  getStaffRoster:   (institutionId) => request("GET", `/college/institutions/${institutionId}/staff/roster`),
  recordOutcome:    (institutionId, opts) => request("POST", `/college/institutions/${institutionId}/outcomes`, opts),
  listOutcomes:     (institutionId, academicYear) => request("GET", `/college/institutions/${institutionId}/outcomes${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ""}`),
  deleteOutcome:    (institutionId, outcomeId) => request("DELETE", `/college/institutions/${institutionId}/outcomes/${outcomeId}`),
  getNaacReport:    (institutionId, batch) => request("GET", `/college/institutions/${institutionId}/naac-report${batch ? `?batch=${encodeURIComponent(batch)}` : ""}`),
  getPlacementTrend:(institutionId) => request("GET", `/college/institutions/${institutionId}/placement-trend`),

  // Groups (2026-08-02) — cohort/club/study-group membership, feeds task assignment.
  listGroups:        (institutionId) => request("GET", `/college/institutions/${institutionId}/groups`),
  createGroup:       (institutionId, opts) => request("POST", `/college/institutions/${institutionId}/groups`, opts),
  updateGroup:       (institutionId, groupId, opts) => request("PATCH", `/college/institutions/${institutionId}/groups/${groupId}`, opts),
  deleteGroup:       (institutionId, groupId) => request("DELETE", `/college/institutions/${institutionId}/groups/${groupId}`),
  listGroupMembers:  (institutionId, groupId) => request("GET", `/college/institutions/${institutionId}/groups/${groupId}/members`),
  addGroupMembers:   (institutionId, groupId, studentIds) => request("POST", `/college/institutions/${institutionId}/groups/${groupId}/members`, { studentIds }),
  removeGroupMember: (institutionId, groupId, studentId) => request("DELETE", `/college/institutions/${institutionId}/groups/${groupId}/members/${studentId}`),

  // Coordination layer (2026-07-31) — placement drives.
  createDrive: (institutionId, opts) => request("POST", `/college/institutions/${institutionId}/drives`, opts),
  listDrives: (institutionId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college/institutions/${institutionId}/drives${qs ? `?${qs}` : ""}`)
  },
  updateDriveStatus: (institutionId, driveId, status) =>
    request("PATCH", `/college/institutions/${institutionId}/drives/${driveId}`, { status }),
  getDriveEligibleStudents: (institutionId, driveId) =>
    request("GET", `/college/institutions/${institutionId}/drives/${driveId}/eligible-students`),
  updateDrive: (institutionId, driveId, opts) =>
    request("PATCH", `/college/institutions/${institutionId}/drives/${driveId}`, opts),

  // Placement-day parity (2026-08-02) — proctored assessment sessions.
  startDriveSession: (institutionId, driveId) =>
    request("POST", `/college/institutions/${institutionId}/drives/${driveId}/sessions`),
  logDriveViolation: (sessionId, type) => request("POST", `/college/drive-sessions/${sessionId}/violation`, { type }),
  endDriveSession: (sessionId, status = "completed") => request("POST", `/college/drive-sessions/${sessionId}/end`, { status }),
  listDriveSessions: (institutionId, driveId) => request("GET", `/college/institutions/${institutionId}/drives/${driveId}/sessions`),

  // Multi-campus support (2026-08-02) — university-level grouping of campus institutions.
  createUniversityGroup:  (name) => request("POST", "/college/university-groups", { name }),
  getMyUniversityGroup:   () => request("GET", "/college/university-groups/mine"),
  addCampusToGroup:       (groupId, opts) => request("POST", `/college/university-groups/${groupId}/campuses`, opts),
  removeCampusFromGroup:  (groupId, institutionId) => request("DELETE", `/college/university-groups/${groupId}/campuses/${institutionId}`),
  getUniversityOverview:  (groupId) => request("GET", `/college/university-groups/${groupId}/overview`),

  // Jobs tab (2026-08-03) — college_admin only for create/edit; any staff can view.
  listJobs:   (institutionId) => request("GET", `/college/institutions/${institutionId}/jobs`),
  createJob:  (institutionId, opts) => request("POST", `/college/institutions/${institutionId}/jobs`, opts),
  updateJob:  (institutionId, jobId, opts) => request("PATCH", `/college/institutions/${institutionId}/jobs/${jobId}`, opts),
}

// ══════════════════════════════════════════
// COLLEGE PATH — in-house chat (backend/server/routes/collegeChat.js)
// Phase 5, added 2026-07-31. Distinct from the generic AI chat.js endpoint.
// ══════════════════════════════════════════
export const collegeChatApi = {
  listThreads:  (institutionId) => request("GET", `/college-chat/threads?institutionId=${institutionId}`),
  // opts may now include contextType/contextId/statusTag/recruiterId/subject
  // (coordination layer, 2026-07-31) — all optional, omitting them keeps
  // the original plain-channel/recruiter-thread behavior.
  startThread:  (institutionId, firstMessage, opts = {}) =>
    request("POST", "/college-chat/threads", { institutionId, firstMessage, ...opts }),
  updateThread: (threadId, opts) => request("PATCH", `/college-chat/threads/${threadId}`, opts),
  getMessages:  (threadId) => request("GET", `/college-chat/threads/${threadId}/messages`),
  sendMessage:  (threadId, body) => request("POST", `/college-chat/threads/${threadId}/messages`, { body }),

  // Coordination layer (2026-07-31) — message-to-task / message-to-approval.
  createFollowup: (threadId, opts) => request("POST", `/college-chat/threads/${threadId}/followups`, opts),
  listFollowups: (institutionId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college-chat/followups?institutionId=${institutionId}${qs ? `&${qs}` : ""}`)
  },
  updateFollowup: (followupId, status) => request("PATCH", `/college-chat/followups/${followupId}`, { status }),

  createApproval: (threadId, opts) => request("POST", `/college-chat/threads/${threadId}/approvals`, opts),
  listApprovals: (institutionId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/college-chat/approvals?institutionId=${institutionId}${qs ? `&${qs}` : ""}`)
  },
  decideApproval: (approvalId, decision) => request("PATCH", `/college-chat/approvals/${approvalId}/decide`, { decision }),

  // Flagged (ENABLE_THREAD_EXPLICIT_PARTICIPANTS) — 404s until the backend flag is on.
  addParticipant: (threadId, userId, roleInThread = "cc") =>
    request("POST", `/college-chat/threads/${threadId}/participants`, { userId, roleInThread }),
}

// ══════════════════════════════════════════
// EPFO VERIFICATION
// ══════════════════════════════════════════
export const epfoApi = {
  submit: (uan, employerList = []) => request("POST", "/pro/epfo/submit", { uan, employerList }),
  status: () => request("GET", "/pro/epfo/status"),
}

// ══════════════════════════════════════════
// EMPLOYER ATTESTATION — second, independent employment-verification path:
// a former employer/manager confirms a claimed role via a one-time emailed
// link. resolve/confirm/decline are PUBLIC (no Capabilio account on the
// attester's side, so request() runs with no auth token — same pattern as
// orgApi.resolveJoinLink/claimJoinLink).
// ══════════════════════════════════════════
export const attestationApi = {
  request: (expIndex, attesterName, attesterEmail, attesterTitle = "") =>
    request("POST", "/pro/attestation/request", { expIndex, attesterName, attesterEmail, attesterTitle }),
  list:    ()               => request("GET", "/pro/attestation/list"),
  resolve: (token)          => request("GET",  `/attestation/${token}`),
  confirm: (token, note="") => request("POST", `/attestation/${token}/confirm`, { note }),
  decline: (token, note="") => request("POST", `/attestation/${token}/decline`, { note }),
}

// ══════════════════════════════════════════
// CAREER TIMELINE
// ══════════════════════════════════════════
export const timelineApi = {
  list:          ()      => request("GET", "/pro/timeline"),
  create:        (data)  => request("POST", "/pro/timeline", data),
  update:        (id, d) => request("PUT", `/pro/timeline/${id}`, d),
  remove:        (id)    => request("DELETE", `/pro/timeline/${id}`),
  approveChange: (id)    => request("POST", `/pro/timeline/${id}/approve-change`),
  rejectChange:  (id)    => request("POST", `/pro/timeline/${id}/reject-change`),
}

// ══════════════════════════════════════════
// VAULT
// ══════════════════════════════════════════
export const vaultApi = {
  list:   (startupId) => request("GET", `/pro/vault${startupId ? `?startup_id=${startupId}` : ""}`),
  upload: (file, docType, tags = [], isPrivate = false, startupId = null, folder = null) => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("doc_type", docType)
    fd.append("tags", JSON.stringify(tags))
    fd.append("is_private", String(isPrivate))
    if (startupId) fd.append("startup_id", startupId)
    if (folder) fd.append("folder", folder)
    return upload("/pro/vault/upload", fd)
  },
  getUrl:  (id) => request("GET", `/pro/vault/${id}/url`),
  remove:  (id) => request("DELETE", `/pro/vault/${id}`),
}

// ══════════════════════════════════════════
// TRUST & VERIFICATION CENTER
// 2026-08-02: this export was missing entirely — VaultTrustCenter.jsx already
// imported `verificationApi` from this file, which resolved to undefined and
// would have thrown the moment the component mounted. Adding it is what
// makes that component load-bearing rather than a dead import.
// ══════════════════════════════════════════
export const verificationApi = {
  providers: () => request("GET", "/verification/providers"),
  auditMine: () => request("GET", "/verification/audit/mine"),
  integrity: () => request("GET", "/verification/integrity"),
  // opts: { file?: File, claim: object, documentId?: string, proofObjectId?: string }
  verify: (providerId, opts = {}) => {
    const fd = new FormData()
    fd.append("providerId", providerId)
    fd.append("claim", JSON.stringify(opts.claim || {}))
    if (opts.file) fd.append("file", opts.file)
    if (opts.documentId) fd.append("documentId", opts.documentId)
    if (opts.proofObjectId) fd.append("proofObjectId", opts.proofObjectId)
    return upload("/verification/verify", fd)
  },
}

// ══════════════════════════════════════════
// SKILL GRAPH
// ══════════════════════════════════════════
export const skillsApi = {
  list:          () => request("GET", "/pro/skills"),
  add:           (data) => request("POST", "/pro/skills", data),
  bulkUpsert:    (skills, source = "resume") => request("POST", "/pro/skills/bulk", { skills, source }),
  update:        (id, data) => request("PUT", `/pro/skills/${id}`, data),
  remove:        (id) => request("DELETE", `/pro/skills/${id}`),
  submitProof:   (id, data) => request("POST", `/pro/skills/${id}/proof`, data),
  getGaps:       (targetRole) => request("GET", `/pro/skills/gaps${targetRole ? `?target_role=${encodeURIComponent(targetRole)}` : ""}`),
  enrichIcons:   () => request("POST", "/pro/skills/enrich-icons"),
  // Live skill graph (2026-08-12) — pulls real Arena challenge performance +
  // GitHub Code DNA signals into user_skills. Additive/non-destructive on
  // the backend (never downgrades or touches a verified row) — see
  // routes/skillGraph.js's POST /pro/skills/sync-from-work header.
  syncFromWork:  () => request("POST", "/pro/skills/sync-from-work"),
}

// ══════════════════════════════════════════
// WEEKLY CAREER CHECK ("Weekly Refresh Engine")
// UI must never call this "assessment" — see weeklyPulse.js header.
// ══════════════════════════════════════════
export const weeklyCheckApi = {
  current:    ()               => request("GET", "/pro/weekly/current"),
  generate:   ()               => request("POST", "/pro/weekly/generate"),
  answer:     (pulseId, data)  => request("POST", `/pro/weekly/${pulseId}/answer`, data),
  complete:   (pulseId)        => request("POST", `/pro/weekly/${pulseId}/complete`),
  // Career OS Workstream 3 — coverage-gated v2 (15-question bank flow).
  // Always safe to call: server-side decides v1 vs v2 and falls back
  // automatically when coverage is insufficient — status() never writes.
  v2Status:   ()               => request("GET", "/pro/weekly/v2/status"),
  v2Generate: ()               => request("POST", "/pro/weekly/v2/generate"),
  v2DecayStates: ()            => request("GET", "/pro/weekly/v2/decay-states"),
  // Timer + anti-cheat (2026-07-26) — real, backend-persisted signals.
  flagSuspicious: (pulseId, type) => request("POST", `/pro/weekly/${pulseId}/flag-suspicious`, { type }),
  timeout:        (pulseId, questionId) => request("POST", `/pro/weekly/${pulseId}/timeout`, { question_id: questionId }),
  history:        (limit = 20) => request("GET", `/pro/weekly/history?limit=${limit}`),
}

// ══════════════════════════════════════════
// QUESTION BANK ADMIN (Career OS Tranche 4 — internal-only review UI)
// Every route requires requireAuth + requireAdmin server-side
// (backend/server/routes/questionBankAdmin.js) — this client has no
// separate admin check of its own; a non-admin calling any of these just
// gets a 403/401 from the API, same defense-in-depth pattern used
// throughout this codebase (real gate is always server-side).
// ══════════════════════════════════════════
export const questionBankAdminApi = {
  list:            (params = {}) => request("GET", `/admin/question-bank${toQuery(params)}`),
  coverage:        () => request("GET", "/admin/question-bank/coverage"),
  get:             (id) => request("GET", `/admin/question-bank/${id}`),
  submitForReview: (id) => request("POST", `/admin/question-bank/${id}/submit-for-review`),
  bulkSubmitForReview: (payload) => request("POST", `/admin/question-bank/bulk-submit-for-review`, payload),
  approve:         (id) => request("POST", `/admin/question-bank/${id}/approve`),
  reject:          (id, reason) => request("POST", `/admin/question-bank/${id}/reject`, { reason }),
}

// ══════════════════════════════════════════
// OPS DASHBOARD (Career OS Tranche 11 / Tranche D — /api/admin/ops/*)
// ══════════════════════════════════════════
export const opsDashboardApi = {
  get: () => request("GET", "/admin/ops/dashboard"),
}

function toQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  if (!entries.length) return ""
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
}

// ══════════════════════════════════════════
// HOME (Career OS Workstream 1 — /pro/v1/home/*)
// ══════════════════════════════════════════
export const homeApi = {
  getPriority: () => request("GET", "/pro/v1/home/priority"),
}

// ══════════════════════════════════════════
// CAREER EVENTS — unified timeline (Career OS Workstream 2 — /pro/v1/career/*)
// The only endpoint Career Timeline / Career Replay may read from — never
// combine profiles/experiences/career_timeline directly in the frontend.
// ══════════════════════════════════════════
export const careerEventsApi = {
  getTimeline: ({ cursor, limit, eventType, visibility } = {}) => {
    const params = new URLSearchParams()
    if (cursor) params.set("cursor", cursor)
    if (limit) params.set("limit", String(limit))
    if (eventType) params.set("event_type", eventType)
    if (visibility) params.set("visibility", visibility)
    const qs = params.toString()
    return request("GET", `/pro/v1/career/timeline${qs ? `?${qs}` : ""}`)
  },
}

// ══════════════════════════════════════════
// FORGE
// ══════════════════════════════════════════
export const forgeApi = {
  init:           (tracks) => request("POST", "/pro/forge/init", { tracks }),
  list:           (track)  => request("GET", `/pro/forge${track ? `?track=${track}` : ""}`),
  update:         (id, data) => request("PUT", `/pro/forge/${id}`, data),
  submit:         (id, data) => request("POST", `/pro/forge/${id}/submit`, data),
  evaluate:       (id, submission_id) => request("POST", `/pro/forge/${id}/evaluate`, { submission_id }),
  getSubmissions: (id) => request("GET", `/pro/forge/${id}/submissions`),
}

// ══════════════════════════════════════════
// AI INTERVIEW
// ══════════════════════════════════════════
export const interviewApi = {
  start:    (data) => request("POST", "/pro/interview/start", data),
  getSession: (id) => request("GET", `/pro/interview/${id}`),
  answer:   (id, data) => request("POST", `/pro/interview/${id}/answer`, data),
  complete: (id)  => request("POST", `/pro/interview/${id}/complete`),
  history:  () => request("GET", "/pro/interview/history"),
}

// ══════════════════════════════════════════
// JOBS & APPLICATIONS
// ══════════════════════════════════════════
export const jobsApi = {
  list:         (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/jobs/list${qs ? `?${qs}` : ""}`)
  },
  getJob:       (id) => request("GET", `/jobs/${id}`),
  // 2026-08-03: create()/mine()/update() now hit a real, gated, working
  // backend (see recruiterComms.js) — create() previously 500'd on every
  // call (missing DB column) and had zero frontend caller.
  create:       (data) => request("POST", "/jobs", data),
  mine:         () => request("GET", "/jobs/mine"),
  update:       (id, data) => request("PATCH", `/jobs/${id}`, data),
  apply:        (jobId) => request("POST", `/jobs/${jobId}/apply`),
  applications: () => request("GET", "/jobs/applications"),
  saveJob:      (jobId, action = "save") => request("POST", "/jobs/save", { job_id: jobId, action }),
  savedJobs:    () => request("GET", "/jobs/saved"),
}

// ══════════════════════════════════════════
// RECRUITER COMMS
// ══════════════════════════════════════════
export const recruiterApi = {
  messages:       (box = "inbox") => request("GET", `/recruiter/messages?box=${box}`),
  sendMessage:    (data) => request("POST", "/recruiter/messages", data),
  scheduleInterview: (data) => request("POST", "/recruiter/schedule", data),
  schedules:      () => request("GET", "/recruiter/schedules"),
  updateSchedule: (id, data) => request("PUT", `/recruiter/schedule/${id}`, data),
}

export const offersApi = {
  send:    (data) => request("POST", "/offers", data),
  list:    (asRecruiter) => request("GET", `/offers${asRecruiter ? "?as=recruiter" : ""}`),
  respond: (id, response) => request("PUT", `/offers/${id}/respond`, { response }),
}

// ══════════════════════════════════════════
// MENTOR HUB
// ══════════════════════════════════════════
export const mentorApi = {
  listMentors:    (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/mentors${qs ? `?${qs}` : ""}`)
  },
  getMentor:      (id) => request("GET", `/mentors/${id}`),
  updateProfile:  (data) => request("POST", "/mentors/profile", data),
  createBooking:  (data) => request("POST", "/mentors/bookings", data),
  myBookings:     (asMentor) => request("GET", `/mentors/bookings/mine${asMentor ? "?as=mentor" : ""}`),
  updateBooking:  (id, data) => request("PUT", `/mentors/bookings/${id}`, data),
  payouts:        () => request("GET", "/mentors/payouts"),
  requestPayout:  () => request("POST", "/mentors/payouts/request"),
}

// ══════════════════════════════════════════
// PULSE (SOCIAL FEED)
// ══════════════════════════════════════════
export const pulseApi = {
  feed:          (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/pulse/feed${qs ? `?${qs}` : ""}`)
  },
  createPost:    (data) => request("POST", "/pulse/posts", data),
  updatePost:    (id, data) => request("PUT", `/pulse/posts/${id}`, data),
  deletePost:    (id) => request("DELETE", `/pulse/posts/${id}`),
  interact:      (postId, action) => request("POST", `/pulse/posts/${postId}/interact`, { action }),
  comments:      (postId) => request("GET", `/pulse/posts/${postId}/comments`),
  addComment:    (postId, content, parentId) => request("POST", `/pulse/posts/${postId}/comments`, { content, parent_id: parentId }),
  // Threaded replies (lazy-loaded per comment) + comment-level likes —
  // same "who liked this" pattern as post likers.
  commentReplies:  (commentId) => request("GET", `/pulse/comments/${commentId}/replies`),
  likeComment:     (commentId) => request("POST", `/pulse/comments/${commentId}/like`),
  commentLikers:   (commentId) => request("GET", `/pulse/comments/${commentId}/likers`),
  // New routes
  builders:      (domain = "", elo = 400, limit = 8) => {
    const qs = new URLSearchParams({ domain, elo, limit }).toString()
    return request("GET", `/pulse/builders?${qs}`)
  },
  mentors:       (domain = "", limit = 5) => {
    const qs = new URLSearchParams({ domain, limit }).toString()
    return request("GET", `/pulse/mentors?${qs}`)
  },
  followingFeed: (page = 1, sort = "created_at") => {
    const qs = new URLSearchParams({ page, limit: 15, sort }).toString()
    return request("GET", `/pulse/following-feed?${qs}`)
  },
  saved:         (page = 1) => {
    const qs = new URLSearchParams({ page, limit: 15 }).toString()
    return request("GET", `/pulse/saved?${qs}`)
  },
  // AI market insights + tech news via Gemini Search (server-cached 2hr per domain)
  marketInsights: (domain = "Tech", role = "Professional", skills = []) => {
    const params = { domain, role }
    if (skills?.length) params.skills = skills.slice(0, 8).join(",")
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/pulse/market-insights?${qs}`)
  },
  // Real tech-tag frequency from recent posts — replaces hardcoded hashtags.
  trendingTags: (limit = 8) => request("GET", `/pulse/trending-tags?limit=${limit}`),
  // Proof Posts — the current user's real, shareable achievements
  // (proof_objects / Professional ELO events / verified skills). Feeds the
  // "Share Proof" picker; every fact is re-verified server-side on create.
  proofCandidates: () => request("GET", "/pulse/proof-candidates"),
  // Who reacted to a post (defaults to "acknowledge"/like) — powers the
  // Instagram/LinkedIn-style "who liked this" list.
  likers: (postId, action = "acknowledge") => request("GET", `/pulse/posts/${postId}/likers?action=${action}`),
  // Stories — real 24h-expiry feature (image or text), separate from posts.
  storiesFeed:  () => request("GET", "/pulse/stories"),
  createStory:  ({ file, textContent, backgroundColor }) => {
    const fd = new FormData()
    if (file) fd.append("media", file)
    if (textContent) fd.append("text_content", textContent)
    if (backgroundColor) fd.append("background_color", backgroundColor)
    return upload("/pulse/stories", fd)
  },
  viewStory:    (storyId) => request("POST", `/pulse/stories/${storyId}/view`),
  storyViewers: (storyId) => request("GET", `/pulse/stories/${storyId}/viewers`),
  deleteStory:  (storyId) => request("DELETE", `/pulse/stories/${storyId}`),
}

// ══════════════════════════════════════════
// NEXUS (NETWORK)
// ══════════════════════════════════════════
export const nexusApi = {
  search:      (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/nexus/search${qs ? `?${qs}` : ""}`)
  },
  getProfile:   (uid) => request("GET", `/nexus/profile/${uid}`),
  connect:      (uid, message) => request("POST", "/nexus/connect", { addressee_id: uid, message }),
  respond:      (id, status) => request("PUT", `/nexus/connect/${id}`, { status }),
  follow:       (uid) => request("POST", "/nexus/follow", { following_id: uid }),
  unfollow:     (uid) => request("DELETE", `/nexus/follow/${uid}`),
  connections:  () => request("GET", "/nexus/connections"),
  // Real Follow relationships (the `follows` table) — distinct from
  // connections() above, which is the Sparks/request-approve system.
  // Returns { following: [...profiles], followers: [...profiles] }.
  follows:      () => request("GET", "/nexus/follows"),
  notifications: () => request("GET", "/nexus/notifications"),
  markRead:     (ids) => request("POST", "/nexus/notifications/read", { ids }),
}

// ══════════════════════════════════════════
// EXECUTIVE PATH — warm introduction requests (real, 2026-07-26)
// Distinct from nexusApi.connect() (generic connection ask): every intro
// request carries an explicit reason + message, replacing the previously
// unbuilt ExecutiveNetwork.jsx "Introductions" tab.
// ══════════════════════════════════════════
export const execIntroApi = {
  request:  (targetId, reason, message) => request("POST", "/exec/intro-requests", { target_id: targetId, reason, message }),
  list:     (direction = "incoming") => request("GET", `/exec/intro-requests?direction=${direction}`),
  respond:  (id, status) => request("PATCH", `/exec/intro-requests/${id}`, { status }),
}

// ══════════════════════════════════════════
// ORBIT PLANS
// ══════════════════════════════════════════
export const orbitApi = {
  plans:           () => request("GET", "/orbit/plans"),
  createOrder:     (plan_id, billing_cycle, coupon_code) => request("POST", "/orbit/order", { plan_id, billing_cycle, coupon_code }),
  verifyPayment:   (data) => request("POST", "/orbit/verify", data),
  status:          () => request("GET", "/orbit/status"),
  validateCoupon:  (code, plan_id) => request("POST", "/orbit/coupon/validate", { code, plan_id }),
}

// ══════════════════════════════════════════
// CAREER INTELLIGENCE
// ══════════════════════════════════════════
export const intelApi = {
  generateReport: (report_type) => request("POST", "/intel/report", { report_type }),
  listReports:    () => request("GET", "/intel/reports"),
  getReport:      (id) => request("GET", `/intel/reports/${id}`),
}

// ══════════════════════════════════════════
// HARDWARE CHALLENGES (ECE / IoT / Mech / Civil)
// ══════════════════════════════════════════
export const hardwareApi = {
  list:       (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/hardware/challenges${qs ? `?${qs}` : ""}`)
  },
  get:        (id) => request("GET", `/hardware/challenges/${id}`),
  attempt:    (id, answer) => request("POST", `/hardware/challenges/${id}/attempt`, { answer }),
  myAttempts: () => request("GET", "/hardware/my-attempts"),
  like:       (id) => request("POST", `/hardware/challenges/${id}/like`),
}

// ══════════════════════════════════════════
// RESUME PARSING (existing)
// ══════════════════════════════════════════
export const resumeApi = {
  parsePdf: (file) => {
    const fd = new FormData(); fd.append("resume", file)
    return upload("/extract-pdf", fd)
  },
  parseLinkedin: (url) => request("POST", "/extract-linkedin", { url }),
}

// ══════════════════════════════════════════
// COMPANY MODULE — Career OS Workstream 5 (scoped pass)
// Backend-gated by COMPANY_MODULE_V1_ENABLED (404 while off); frontend also
// gates whether these are ever called via FLAGS.career_os_company — see
// frontend/src/pages/Company.jsx.
// ══════════════════════════════════════════
function newIdempotencyKey() {
  // crypto.randomUUID is available in all evergreen browsers this app
  // targets; no extra dependency needed for a client-generated request id.
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
}

export const companyApi = {
  search:       (q) => request("GET", `/pro/v1/company/search?q=${encodeURIComponent(q || "")}`),
  me:           () => request("GET", "/pro/v1/company/me"),
  get:          (id) => request("GET", `/pro/v1/company/${id}`),
  link:         (companyId) => request("POST", "/pro/v1/company/me/link", { company_id: companyId }, { headers: { "Idempotency-Key": newIdempotencyKey() } }),
  create:       ({ name, domain, sector } = {}) => request("POST", "/pro/v1/company/create", { name, domain, sector }, { headers: { "Idempotency-Key": newIdempotencyKey() } }),
  setVisibility: (companyVisibilityPublic) => request("PATCH", "/pro/v1/company/me/visibility", { company_visibility_public: companyVisibilityPublic }),
}

// CAREER OS TRANCHE 6 / PRIORITY 6A: narrow, field-whitelisted portfolio
// lookup — replaces Portfolio.jsx's old direct client-side
// supabase.from("profiles").select("*") reads (see portfolioPublic.js for
// why: select("*") on a public/verified profile leaked email + uan_number).
export const portfolioApi = {
  lookup: (identifier) => request("GET", `/portfolio/lookup/${encodeURIComponent(identifier)}`),
  // tasks: [{ taskId, type: "domain"|"academic" }, ...], max 50 per call
  // (see backend/server/routes/portfolioPublic.js). Returns
  // { details: { "domain:<id>": {...}, "academic:<id>": {...} } } —
  // entries the viewer isn't allowed to see are simply absent, not errors.
  getTaskDetails: (userId, tasks) => request("POST", `/portfolio/${encodeURIComponent(userId)}/task-details`, { tasks }),
}

// Multi-turn AI chat (routes/chat.js — Claude Haiku -> Groq fallback, no
// auth required, matches the direct-fetch usage already in Aura.jsx). Used
// by TutorPanel (Skill Studio V2) instead of a second chat client.
export const chatApi = {
  send: (messages, system) => request("POST", "/chat", { messages, system }),
}

// Public Engineering Proofs API (routes/proofs.js) — no auth, only
// is_portfolio_visible=true rows. Used by RecruiterProofDrawer (Skill
// Studio V2) since publishing Skill Studio evidence flips this same flag
// via the shared proofObjects/repository.js#updatePublishState — no second
// recruiter-visibility model needed.
export const proofsApi = {
  forUser: (userId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/proofs/${userId}${qs ? `?${qs}` : ""}`)
  },
}

// Professional ELO (product decision 2026-07-25) — real assessment-
// performance-driven rating track, separate from profile-completeness ELO.
export const professionalEloApi = {
  status: () => request("GET", "/pro/elo/professional"),
}

// ══════════════════════════════════════════
// SKILL STUDIO V2 — skill journeys / module runtime / memory / Arena+interview
// bridges / evidence (docs/skill-studio-v2-production-spec-2026-07-29.md).
// Hits the additive routes in backend/server/routes/skillStudioV2.js, mounted
// on the SAME /api/skill-studio prefix as the pre-existing skillStudioApi-less
// /lesson,/learning-path,/youtube,/resources calls SkillStudio.jsx makes
// directly via fetch() — no collision, both live side by side.
// ══════════════════════════════════════════
export const skillStudioV2Api = {
  home:               () => request("GET", "/skill-studio/home"),
  graph:              (domain) => request("GET", `/skill-studio/graph?domain=${encodeURIComponent(domain)}`),
  createJourney:      (skillName, domainKey, targetRole) => request("POST", "/skill-studio/journeys", { skillName, domainKey, targetRole }),
  archiveJourney:     (id) => request("POST", `/skill-studio/journeys/${id}/archive`),
  completeJourney:    (id) => request("POST", `/skill-studio/journeys/${id}/complete`),
  generateModule:     (data) => request("POST", "/skill-studio/modules/generate", data),
  getModule:          (moduleId) => request("GET", `/skill-studio/modules/${moduleId}`),
  startModule:        (moduleId) => request("POST", `/skill-studio/modules/${moduleId}/start`),
  savePlaygroundState: (moduleId, playgroundState) => request("POST", `/skill-studio/modules/${moduleId}/playground-state`, { playgroundState }),
  completeModule:     (moduleId, data) => request("POST", `/skill-studio/modules/${moduleId}/complete`, data),
  quizStart:          (data) => request("POST", "/skill-studio/quiz/start", data),
  quizAnswer:         (sessionId, data) => request("POST", `/skill-studio/quiz/${sessionId}/answer`, data),
  memoryDue:          (limit = 5) => request("GET", `/skill-studio/memory/due?limit=${limit}`),
  memoryFor:          (skillGraphNodeId) => request("GET", `/skill-studio/memory/${skillGraphNodeId}`),
  memoryReview:       (skillGraphNodeId, correct) => request("POST", `/skill-studio/memory/${skillGraphNodeId}/review`, { correct }),
  arenaReadiness:     (skillGraphNodeId) => request("POST", "/skill-studio/arena/readiness", { skillGraphNodeId }),
  arenaHandoff:       (data) => request("POST", "/skill-studio/arena/handoff", data),
  interviewGenerate:  (data) => request("POST", "/skill-studio/interview/generate", data),
  interviewSubmit:    (sessionId, data) => request("POST", `/skill-studio/interview/${sessionId}/submit`, data),
  evidenceList:       () => request("GET", "/skill-studio/evidence"),
  evidencePublish:    (id, publish) => request("POST", `/skill-studio/evidence/${id}/publish`, { publish }),
  recommendations:    () => request("GET", "/skill-studio/recommendations"),
  refreshRecommendations: (opts = {}) => request("POST", "/skill-studio/recommendations/refresh", opts),
  arenaIngestion:     (limit = 10) => request("GET", `/skill-studio/arena/ingestion?limit=${limit}`),
  // Phase 1 (2026-07-30): remedial regeneration (never cached — ephemeral,
  // targeted at one learner's missed topics) and revision content (cached
  // per-module via module_revision_content, shared like the base lesson).
  moduleRemedial:     (moduleId, data) => request("POST", `/skill-studio/modules/${moduleId}/remedial`, data),
  moduleRevision:     (moduleId) => request("GET", `/skill-studio/modules/${moduleId}/revision`),
  // Phase 2a (2026-07-30): narrated visual walkthrough. Cached per module,
  // same lazy generate-on-first-request pattern as moduleRevision above.
  moduleNarration:    (moduleId) => request("GET", `/skill-studio/modules/${moduleId}/narration`),
}

// ══════════════════════════════════════════
// SKILL STUDIO CONTENT ADMIN — generated module/quiz review queue
// (Skill Studio V2 loop closure, 2026-07-29). Every route here is
// requireAuth+requireAdmin server-side (backend/server/routes/
// skillStudioContentAdmin.js) — dedicated namespace, no client-side
// admin check.
// ══════════════════════════════════════════
export const skillStudioContentAdminApi = {
  list:        ({ status, jobType, limit, offset } = {}) => request("GET", `/admin/skill-studio-content${toQuery({ status, jobType, limit, offset })}`),
  get:         (id) => request("GET", `/admin/skill-studio-content/${id}`),
  addSource:   (data) => request("POST", "/admin/skill-studio-content/sources", data),
  generate:    (data) => request("POST", "/admin/skill-studio-content/generate", data),
  approve:     (id, notes) => request("POST", `/admin/skill-studio-content/${id}/approve`, { notes }),
  reject:      (id, notes) => request("POST", `/admin/skill-studio-content/${id}/reject`, { notes }),
  edit:        (id, editedOutput, notes) => request("POST", `/admin/skill-studio-content/${id}/edit`, { editedOutput, notes }),
  regenerate:  (id, notes) => request("POST", `/admin/skill-studio-content/${id}/regenerate`, { notes }),
}

// ══════════════════════════════════════════
// CANDIDATE TASKS (recruiter-assigned, via capabilio-recruiter partner
// bridge — 2026-08-06). NOT the same feature as collegeApi.getMyTasks()
// above, which is an institution-assigned task inbox on this app's own DB.
// This one is for tasks a recruiter on the separate capabilio-recruiter
// product assigns to a candidate; see backend/server/routes/
// candidateTasks.js for the bridge call.
// ══════════════════════════════════════════
export const candidateTasksApi = {
  list:   () => request("GET", "/candidate/tasks"),
  submit: (id, submissionText, submissionUrl) =>
    request("POST", `/candidate/tasks/${id}/submit`, { submissionText, submissionUrl }),
}

// Skill Rating v2 (2026-07-26) — verification-gated certification bonus.
export const certificationsApi = {
  list: () => request("GET", "/pro/certifications"),
  claim: (cert_name, cert_type, issuer) => request("POST", "/pro/certifications", { cert_name, cert_type, issuer }),
  upload: (id, file) => {
    const fd = new FormData(); fd.append("file", file)
    return upload(`/pro/certifications/${id}/upload`, fd)
  },
}

// ══════════════════════════════════════════
// ARENA — COLLEGE STREAM (Arena rebuild, Phase 1)
// Static/curriculum/rule-based branch — structurally separate from the
// not-yet-built Domain Role branch, which will get its own namespaced
// object here later rather than sharing any of these calls.
// ══════════════════════════════════════════
export const arenaCollegeStreamApi = {
  listStreams:     ()                     => request("GET", "/arena/college-stream/streams"),
  listSemesters:   (streamSlug)           => request("GET", `/arena/college-stream/streams/${streamSlug}/semesters`),
  listSubjects:    (semesterId)           => request("GET", `/arena/college-stream/semesters/${semesterId}/subjects`),
  listUnits:       (subjectId)            => request("GET", `/arena/college-stream/subjects/${subjectId}/units`),
  listExperiments: (unitId)               => request("GET", `/arena/college-stream/units/${unitId}/experiments`),
  getExperiment:   (experimentId)         => request("GET", `/arena/college-stream/experiments/${experimentId}`),
  submit:          (experimentId, answer) => request("POST", `/arena/college-stream/experiments/${experimentId}/submit`, { answer }),
  getNextExperiment: (streamSlug)         => request("GET", `/arena/college-stream/streams/${streamSlug}/next-experiment`),
  // params: { cursor, limit, passed } — passed is a boolean; the query
  // string sends "true"/"false" strings, matching what the backend expects.
  getHistory: (streamSlug, params = {}) => {
    const { cursor, limit, passed } = params
    const qs = new URLSearchParams()
    if (cursor) qs.set("cursor", cursor)
    if (limit) qs.set("limit", String(limit))
    if (passed !== undefined) qs.set("passed", String(passed))
    const s = qs.toString()
    return request("GET", `/arena/college-stream/streams/${streamSlug}/history${s ? `?${s}` : ""}`)
  },
  getHistoryCounts: (streamSlug) => request("GET", `/arena/college-stream/streams/${streamSlug}/history/counts`),
  getLeaderboard: (streamSlug)            => request("GET", `/arena/college-stream/streams/${streamSlug}/leaderboard`),
  getAllExperiments: (streamSlug)         => request("GET", `/arena/college-stream/streams/${streamSlug}/all-experiments`),
}

// ══════════════════════════════════════════
// Arena — Domain Role branch (Phase 2)
// Config-driven (panel_types/domain_roles/evaluation_axes/domain_missions),
// deterministic scoring (SQL Runner panel, sql.js sandbox server-side) —
// structurally separate from arenaCollegeStreamApi above per the rebuild spec.
// ══════════════════════════════════════════
export const arenaDomainRoleApi = {
  listMissions: (roleId)          => request("GET", `/arena/domain-role/${roleId}/missions`),
  getMission:   (missionId)       => request("GET", `/arena/domain-role/missions/${missionId}`),
  submitMission: (missionId, sql) => request("POST", `/arena/domain-role/missions/${missionId}/submit`, { sql }),
  // Non-scoring preflight run (Phase 2) — never writes a submission, never
  // touches ELO/quota. Same request shape as submitMission, different path.
  validateMission: (missionId, sql) => request("POST", `/arena/domain-role/missions/${missionId}/validate`, { sql }),
  getNextMission: (roleId)        => request("GET", `/arena/domain-role/${roleId}/next-mission`),
  // params: { cursor, limit, passed } — passed is a boolean; the query
  // string sends "true"/"false" strings, matching what the backend expects.
  getHistory: (roleId, params = {}) => {
    const { cursor, limit, passed } = params
    const qs = new URLSearchParams()
    if (cursor) qs.set("cursor", cursor)
    if (limit) qs.set("limit", String(limit))
    if (passed !== undefined) qs.set("passed", String(passed))
    const s = qs.toString()
    return request("GET", `/arena/domain-role/${roleId}/history${s ? `?${s}` : ""}`)
  },
  getHistoryCounts: (roleId) => request("GET", `/arena/domain-role/${roleId}/history/counts`),
  // params: { window: "all_time"|"weekly"|"monthly", scope: "role"|"global" }
  // — both optional, additive; omitting either preserves the original
  // all-time/role-scoped behavior.
  getLeaderboard: (roleId, params = {}) => {
    const { window, scope } = params
    const qs = new URLSearchParams()
    if (window) qs.set("window", window)
    if (scope) qs.set("scope", scope)
    const s = qs.toString()
    return request("GET", `/arena/domain-role/${roleId}/leaderboard${s ? `?${s}` : ""}`)
  },
}

// ══════════════════════════════════════════
// Arena — Capability Engine (Phase 2/3)
// Sits above College Stream / Domain Role without merging them — the single
// endpoint takes a domain ("college_stream"|"domain_role") + key (stream
// slug or role id) and returns a ranked existing task, an AI-generated
// fallback task when none exists (taskSource: "generated"|"regenerated"|
// "fallback" — always a real, persisted, already-verified task), or an
// honest no_suitable_task result.
// ══════════════════════════════════════════
export const arenaCapabilityApi = {
  getNextTask: ({ domain, key }) =>
    request("GET", `/arena/capability/next-task?domain=${encodeURIComponent(domain)}&key=${encodeURIComponent(key)}`),
}

// ══════════════════════════════════════════
// Arena — cross-branch activity (Phase B)
// Read-only: calendar/streak/week stats computed from both branches'
// submission history. See backend/server/lib/activity/computeSummary.js.
// ══════════════════════════════════════════
export const arenaActivityApi = {
  getSummary: () => request("GET", "/arena/activity/summary"),
}

// ══════════════════════════════════════════
// Arena — Subscription tab checkout
// Same /api/create-order + /api/verify-payment endpoints Pricing.jsx calls,
// but routed through this module's shared request() helper instead of a
// raw fetch() — request() already retries once on the Render free-tier
// cold-start "Failed to fetch" (see its comment above), which a bare
// fetch() call does not. Fixes the Subscription tab's checkout failing on
// the very first request after the backend has been idle.
// ══════════════════════════════════════════
export const arenaPaymentsApi = {
  createOrder:   (planId, uid) => request("POST", "/create-order", { planId, uid }),
  verifyPayment: (payload)     => request("POST", "/verify-payment", payload),
}
