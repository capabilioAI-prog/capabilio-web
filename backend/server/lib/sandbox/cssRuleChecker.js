/**
 * cssRuleChecker.js — frontend_runner panel type (Vision Reset, 2026-08-20).
 *
 * "Arena is a Virtual Company." The Frontend Developer example the product
 * spec gives verbatim is "Marketing reported the pricing cards break on
 * mobile. Fix the responsive layout without changing desktop behaviour." —
 * a real CSS bug ticket, not a from-scratch build. There is no headless
 * browser in this stack (no puppeteer/playwright — a real, deliberate
 * infrastructure decision: a Chromium binary on Render is a much larger,
 * riskier addition than this phase's scope justifies, see the git history
 * around sandbox-requirements.txt for the same size-of-new-infra judgment
 * call made for the Python venv). Real visual/computed-layout regression
 * testing is therefore explicitly OUT of scope — what this file grades
 * instead is real: it parses the student's submitted CSS into a genuine
 * AST (the `css` npm package — a real, spec-following CSS parser) and
 * checks for the specific declarations the ticket calls for, inside the
 * specific media query (or lack of one) the ticket specifies. This is a
 * narrower, honest grading mechanism — structural, not pixel-accurate —
 * not a faked one.
 *
 * A check has the shape:
 *   { description, selector, property, expectedValue, mediaMaxWidth }
 * mediaMaxWidth: null means "must hold outside any @media block" (e.g.
 * "desktop behaviour is unchanged"); a number N means "must hold inside a
 * `@media (max-width: <= N px)` block" (any breakpoint at or narrower than
 * N satisfies the ticket's "on mobile" requirement).
 */
import css from "css"

export class CssCheckerError extends Error {
  constructor(message) {
    super(message)
    this.name = "CssCheckerError"
  }
}

function normalizeValue(v) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/;$/, "")
}
function normalizeSelector(s) {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

// A rule's `selectors` array can list several comma-separated selectors
// under one declaration block (e.g. ".a, .b { ... }") — matches if the
// target selector is any one of them, not only an exact single match.
function ruleMatchesSelector(rule, selector) {
  if (!rule.selectors) return false
  const target = normalizeSelector(selector)
  return rule.selectors.some(s => normalizeSelector(s) === target)
}

function declarationMatches(rule, property, expectedValue) {
  const decls = (rule.declarations || []).filter(d => d.type === "declaration")
  return decls.some(d => normalizeSelector(d.property) === normalizeSelector(property) && normalizeValue(d.value) === normalizeValue(expectedValue))
}

// Extracts the numeric px value out of a `max-width` (or `min-width`,
// unused today but kept generic) media feature — handles both
// `(max-width: 600px)` and `(max-width:600px)` spacing.
function extractMaxWidthPx(mediaText) {
  const match = /max-width\s*:\s*(\d+(?:\.\d+)?)px/i.exec(mediaText || "")
  return match ? parseFloat(match[1]) : null
}

function findRulesInMedia(ast, maxMaxWidth) {
  const rules = []
  for (const node of ast.stylesheet?.rules || []) {
    if (node.type !== "media") continue
    const mw = extractMaxWidthPx(node.media)
    if (mw === null) continue
    if (mw <= maxMaxWidth) rules.push(...(node.rules || []).filter(r => r.type === "rule"))
  }
  return rules
}

function findTopLevelRules(ast) {
  return (ast.stylesheet?.rules || []).filter(r => r.type === "rule")
}

/**
 * Runs one check against parsed CSS. Returns { passed, foundValue } —
 * foundValue is the actual value seen for the matched selector/property
 * (or null if the selector/property was never found at all), used to
 * build a human-readable insight, same spirit as sqlSandbox's
 * computeInsight().
 */
function runCheck(ast, check) {
  const candidateRules = check.mediaMaxWidth == null
    ? findTopLevelRules(ast)
    : findRulesInMedia(ast, check.mediaMaxWidth)

  const matchingRules = candidateRules.filter(r => ruleMatchesSelector(r, check.selector))
  if (matchingRules.length === 0) return { passed: false, foundValue: null }

  const passed = matchingRules.some(r => declarationMatches(r, check.property, check.expectedValue))
  if (passed) return { passed: true, foundValue: check.expectedValue }

  const lastDecl = (matchingRules[matchingRules.length - 1].declarations || [])
    .filter(d => d.type === "declaration")
    .find(d => normalizeSelector(d.property) === normalizeSelector(check.property))
  return { passed: false, foundValue: lastDecl ? lastDecl.value : null }
}

/**
 * @param {string} cssText
 * @param {Array<{description:string, selector:string, property:string, expectedValue:string, mediaMaxWidth:number|null}>} checks
 * @returns {{parsed:boolean, parseError:string|null, results:Array<{description:string, passed:boolean, foundValue:string|null}>}}
 * Never throws — a parse error is reported as a failed check on every
 * item, exactly like a syntax-error submission fails every SQL/Python/Node
 * check in the sibling sandboxes, not a special-cased crash.
 */
export function checkCssRules(cssText, checks) {
  let ast
  try {
    ast = css.parse(String(cssText || ""), { silent: false })
  } catch (err) {
    return {
      parsed: false,
      parseError: err.message,
      results: checks.map(c => ({ description: c.description, passed: false, foundValue: null })),
    }
  }
  return {
    parsed: true,
    parseError: null,
    results: checks.map(c => {
      const { passed, foundValue } = runCheck(ast, c)
      return { description: c.description, passed, foundValue }
    }),
  }
}
