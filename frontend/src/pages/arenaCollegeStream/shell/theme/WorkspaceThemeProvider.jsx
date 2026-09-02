/**
 * WorkspaceThemeProvider.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Owns the shell's light/dark theme state, persisted to localStorage —
 * this app has no Zustand/Redux/preferences-table anywhere (confirmed),
 * so plain `try { localStorage } catch {}` is the established convention
 * (see frontend/src/pages/InstitutionOS.jsx's CAMPUS_PREF_KEY) and what
 * this follows. Scoped entirely to the shell subtree via `data-theme` on
 * a wrapping div — never touches document.documentElement, so it cannot
 * leak into or fight the rest of the (single-theme) app.
 *
 * "system" is a real third option (not just light/dark) — when selected,
 * no `data-theme` attribute is set at all, and workspaceTheme.css's own
 * `prefers-color-scheme` media query takes over. This mirrors the
 * three-state contract the Artifact viewer itself uses.
 */
import { useCallback, useMemo, useState } from "react"
import { WorkspaceThemeContext } from "./useWorkspaceTheme"
import "./workspaceTheme.css"

const STORAGE_KEY = "capabilio_workspace_theme"
const VALID_THEMES = new Set(["light", "dark", "system"])

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return VALID_THEMES.has(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

export default function WorkspaceThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  const setTheme = useCallback((next) => {
    if (!VALID_THEMES.has(next)) return
    setThemeState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage unavailable — theme still applies for this session */ }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  // data-theme is undefined (omitted) for "system" — see workspaceTheme.css's
  // prefers-color-scheme fallback for why that's intentional, not a bug.
  const dataTheme = theme === "system" ? undefined : theme

  return (
    <WorkspaceThemeContext.Provider value={value}>
      {/* `height` (not `minHeight`) is required here, not just cosmetic:
          `min-height: 100%` makes this div visually fill its parent, but its
          computed `height` stays `auto` — and CSS only lets a descendant's
          `height: 100%` resolve against an ancestor with a *specified*
          height, not one merely constrained via min-height. With minHeight,
          ShellInner's own `height: "100%"` (and everything under it —
          header, toolbar, the resizable panel tree) silently failed to
          resolve and collapsed to content height, floating at the top of
          this div while its background alone stretched to fill the
          available space — the exact "large blank area below the
          workspace" bug. */}
      <div className="capabilio-workspace" data-theme={dataTheme} style={{ height: "100%" }}>
        {children}
      </div>
    </WorkspaceThemeContext.Provider>
  )
}
