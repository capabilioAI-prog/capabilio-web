/**
 * Regression guard (2026-09-02) for the Settings/Security/Privacy redesign —
 * source-scan style, consistent with execIntroRequests.test.js and the
 * other regression tests in this directory: asserts the security contract
 * at the file-content level (auth required, re-authentication enforced,
 * secrets never logged/returned twice, client-supplied ids never trusted)
 * so a future edit can't silently reintroduce a weaker version of any of
 * these checks. Live-Supabase-backed 2FA/session flows aren't exercised
 * here — see the design report's Phase 8 section for what was and wasn't
 * feasible to test without a live test project.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.join(__dirname, "..")
const src = readFileSync(path.join(routesDir, "security.js"), "utf8")
const serverSrc = readFileSync(path.join(routesDir, "../../server.js"), "utf8")
const libSrc = readFileSync(path.join(routesDir, "../lib/security.js"), "utf8")
const nexusSrc = readFileSync(path.join(routesDir, "pulseNexus.js"), "utf8")

describe("security.js — every route requires auth except the documented login-fallback", () => {
  const authedRoutes = [
    'router.post("/password/change", requireAuth',
    'router.get("/mfa/status", requireAuth',
    'router.post("/mfa/enroll", requireAuth',
    'router.post("/mfa/verify", requireAuth',
    'router.post("/mfa/disable", requireAuth',
    'router.post("/mfa/recovery-codes/regenerate", requireAuth',
    'router.get("/sessions", requireAuth',
    'router.post("/visibility", requireAuth',
    'router.get("/notification-preferences", requireAuth',
    'router.put("/notification-preferences", requireAuth',
    'router.get("/ai-preferences", requireAuth',
    'router.put("/ai-preferences", requireAuth',
    'router.get("/events", requireAuth',
    'router.post("/account/delete", requireAuth',
  ]
  for (const line of authedRoutes) {
    test(`${line} ...) is present`, () => assert.ok(src.includes(line)))
  }

  // The one intentionally-unauthenticated route: a user without a live
  // session, mid-login, choosing "use a recovery code instead" has no JWT
  // yet by definition — it re-verifies the password itself instead.
  test("recovery-login is intentionally public but re-verifies the password itself", () => {
    assert.ok(src.includes('router.post("/mfa/recovery-login", async'))
    assert.ok(src.includes("signInWithPassword"))
  })
})

describe("Sensitive actions require current-password re-authentication server-side", () => {
  const reauthGated = [
    "password/change", "mfa/enroll", "mfa/disable",
    "mfa/recovery-codes/regenerate", "account/delete",
  ]
  for (const route of reauthGated) {
    test(`${route} calls requireReauth before acting`, () => {
      const idx = src.indexOf(`/${route}"`)
      assert.notEqual(idx, -1, `route /${route} not found`)
      const body = src.slice(idx, idx + 400)
      assert.ok(body.includes("requireReauth(req, res)"), `${route} must call requireReauth`)
    })
  }

  test("requireReauth actually verifies against Supabase, not a local guess", () => {
    assert.ok(src.includes("verifyCurrentPassword(req.user.email, currentPassword)"))
  })
})

describe("MFA disable requires a second factor, not just the password", () => {
  test("checks a fresh TOTP code OR a recovery code before unenrolling", () => {
    const idx = src.indexOf('router.post("/mfa/disable"')
    const body = src.slice(idx, idx + 1400)
    assert.ok(body.includes("secondFactorOk"))
    assert.ok(body.includes("consumeRecoveryCode"))
    assert.ok(body.includes("mfa.verify"))
    assert.ok(body.includes('if (!secondFactorOk)'))
  })
})

describe("No client-supplied user id ever substitutes for the verified JWT's own id", () => {
  test("every mutating query is scoped to req.user.id, not req.body/req.params", () => {
    // Every .eq("user_id", ...) or .eq("id", ...) write targets req.user.id.
    const eqCalls = [...src.matchAll(/\.eq\("(?:user_id|id)",\s*([^)]+)\)/g)].map(m => m[1].trim())
    assert.ok(eqCalls.length > 0)
    for (const arg of eqCalls) assert.equal(arg, "req.user.id", `found a write scoped to ${arg}, not req.user.id`)
  })

  test("recovery-login resolves the target user from Supabase's own sign-in result, not a client-supplied id", () => {
    const idx = src.indexOf('router.post("/mfa/recovery-login"')
    const body = src.slice(idx, idx + 1200)
    assert.ok(body.includes("signIn.user.id"))
    assert.ok(!/consumeRecoveryCode\(req\.body/.test(body))
  })
})

describe("Secrets and codes are never mishandled", () => {
  test("TOTP secret is never logged", () => {
    assert.ok(!/console\.(log|error|warn)\([^)]*secret/i.test(src))
  })
  test("recovery codes are hashed, never stored in plaintext", () => {
    assert.ok(libSrc.includes("code_hash"))
    assert.ok(libSrc.includes("createHmac"))
    assert.ok(!/insert\(\{[^}]*plaintext/.test(libSrc))
  })
  test("recovery codes are single-use — consumption is a conditional UPDATE, not a read-only check", () => {
    const idx = libSrc.indexOf("export async function consumeRecoveryCode")
    const body = libSrc.slice(idx, idx + 500)
    assert.ok(body.includes('.is("used_at", null)'))
    assert.ok(body.includes(".update({ used_at:"))
  })
  test("regenerating recovery codes deletes the old set first (invalidates everything issued before)", () => {
    const idx = libSrc.indexOf("export async function replaceRecoveryCodes")
    const body = libSrc.slice(idx, idx + 400)
    assert.ok(body.includes(".delete()"))
  })
})

describe("Notification preferences: security/account notices are never client-disable-able", () => {
  test("account_updates is not in the accepted PUT field list", () => {
    const idx = src.indexOf("const NOTIF_PREF_FIELDS")
    const arr = src.slice(idx, src.indexOf("]", idx))
    assert.ok(!arr.includes('"account_updates"'))
  })
})

describe("Profile visibility only accepts the three real values", () => {
  test("route validates against the exact allowed set", () => {
    const idx = src.indexOf('router.post("/visibility"')
    const body = src.slice(idx, idx + 400)
    assert.ok(body.includes('["public", "capabilio_users", "private"]'))
  })
})

describe("pulseNexus.js /nexus/profile/:uid respects profile_visibility", () => {
  test("checks visibility before returning data, 404s rather than 403s for a restricted profile", () => {
    const idx = nexusSrc.indexOf('router.get("/nexus/profile/:uid"')
    const body = nexusSrc.slice(idx, idx + 2200)
    assert.ok(body.includes("profile_visibility"))
    assert.ok(body.includes("isOwner"))
    assert.ok(/if \(!allowed\)[\s\S]{0,40}res\.status\(404\)/.test(body))
  })
  test("profile_visibility is never leaked into the public response shape", () => {
    const idx = nexusSrc.indexOf('router.get("/nexus/profile/:uid"')
    const body = nexusSrc.slice(idx, idx + 2200)
    assert.ok(body.includes("delete data.profile_visibility"))
  })
})

describe("Mounted correctly in server.js, behind strictLimiter", () => {
  test("route is imported and mounted at /api/security", () => {
    assert.ok(serverSrc.includes("securityRoutes"))
    assert.ok(serverSrc.includes('app.use("/api/security",     securityRoutes)'))
  })
  test("strictLimiter (brute-force protection) covers /api/security", () => {
    assert.ok(serverSrc.includes('app.use("/api/security",        strictLimiter)'))
  })
})
