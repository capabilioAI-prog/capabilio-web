/**
 * WorkspaceShell.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Composition root wiring theme + header + toolbar + resizable panel tree
 * + persisted layout + shortcuts + focus mode + fullscreen together. Pure
 * layout/chrome — it never fetches data and knows nothing about missions,
 * SQL, Python, or grading; everything content-shaped comes from the
 * `workspace` prop (already fully computed upstream, the SAME object
 * every registered workspace already receives — see
 * workspaces/sql/SqlWorkspace.jsx's documented shape) or from `children`
 * (the center panel — e.g. `<WorkspaceRenderer workspace={workspace} />`).
 *
 * `workspace.meta` is an OPTIONAL `{ workspaceTypeLabel, workspaceTypeIcon }`
 * the integration point can supply (e.g. via panelMetadata.js's existing
 * getPanelMetadata()) — this file deliberately never imports
 * workspaces/panelMetadata.js itself (shell/* never imports workspaces/*
 * except through the children slot, per the plan's dependency graph).
 *
 * Usage: <WorkspaceShell workspace={workspace}><WorkspaceRenderer workspace={workspace} /></WorkspaceShell>
 */
import { useEffect, useState } from "react"
import WorkspaceThemeProvider from "./theme/WorkspaceThemeProvider"
import { useWorkspaceTheme } from "./theme/useWorkspaceTheme"
import { useShellTokens } from "./tokens"
import WorkspaceHeader from "./WorkspaceHeader"
import WorkspaceToolbar from "./WorkspaceToolbar"
import MissionSidebar from "./MissionSidebar"
import BottomPanel from "./BottomPanel"
import RightSidebar from "./RightSidebar"
import ResizablePanelGroup from "./panels/ResizablePanelGroup"
import ResizablePanel, { usePanelRef } from "./panels/ResizablePanel"
import PanelResizeHandle from "./panels/PanelResizeHandle"
import { useFullscreenPanel } from "./panels/useFullscreenPanel"
import { useWorkspaceLayout } from "./state/useWorkspaceLayout"
import { useWorkspaceShortcuts } from "./a11y/useWorkspaceShortcuts"
import { useFocusMode } from "./a11y/useFocusMode"

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = () => setIsMobile(mql.matches)
    handler()
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])
  return isMobile
}

const MOBILE_TABS = [
  { id: "mission", label: "Mission" },
  { id: "work", label: "Work" },
  { id: "output", label: "Output" },
  { id: "ai", label: "AI" },
]

function ShellInner({ workspace, userId, children }) {
  // ── Every hook is called unconditionally, every render — the early
  // "nothing to show yet" return sits below all of them (see its comment). ──
  const { theme, toggleTheme } = useWorkspaceTheme()
  const ws = useShellTokens()
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState("work")

  // `userId` is normally passed explicitly by the integration point (a
  // mission is shared content, not per-user, so `workspace.mission` itself
  // has no user id) — the `workspace.mission?.user_id` fallback only
  // covers a hypothetical future workspace type whose content genuinely is
  // per-user.
  const resolvedUserId = userId ?? workspace?.mission?.user_id
  const layout = useWorkspaceLayout(resolvedUserId)
  const { isFullscreen, toggleFullscreen } = useFullscreenPanel()
  const { focusMode, toggleFocusMode } = useFocusMode()

  const missionPanelRef = usePanelRef()
  const bottomPanelRef = usePanelRef()
  const rightPanelRef = usePanelRef()

  useEffect(() => {
    const targets = [missionPanelRef, bottomPanelRef, rightPanelRef]
    for (const ref of targets) {
      if (!ref.current) continue
      if (focusMode) ref.current.collapse()
      else if (ref.current.isCollapsed()) ref.current.expand()
    }
  }, [focusMode, missionPanelRef, bottomPanelRef, rightPanelRef])

  useWorkspaceShortcuts({
    onToggleMissionSidebar: () => {
      const p = missionPanelRef.current
      if (!p) return
      p.isCollapsed() ? p.expand() : p.collapse()
    },
    onToggleBottomPanel: () => {
      const p = bottomPanelRef.current
      if (!p) return
      p.isCollapsed() ? p.expand() : p.collapse()
    },
    onToggleFullscreen: () => toggleFullscreen("center-panel"),
  })

  const openAIMentor = () => {
    layout.setRightSidebarTab("mentor")
    if (rightPanelRef.current?.isCollapsed()) rightPanelRef.current.expand()
  }

  // Nothing meaningful to render without a mission — mirrors
  // WorkspaceRenderer.jsx's own "owns zero state, nothing to look up yet"
  // discipline rather than crashing on `workspace.mission.title`.
  if (!workspace?.mission) return null

  const centerContent = <div style={{ height: "100%", overflow: "auto", padding: 16 }}>{children}</div>

  if (isMobile) {
    const panelsById = {
      mission: <MissionSidebar workspace={workspace} activeTab={layout.missionSidebarTab} onActiveTabChange={layout.setMissionSidebarTab} />,
      work: centerContent,
      output: <BottomPanel workspace={workspace} activeTab={layout.bottomPanelTab} onActiveTabChange={layout.setBottomPanelTab} />,
      ai: <RightSidebar workspace={workspace} activeTab={layout.rightSidebarTab} onActiveTabChange={layout.setRightSidebarTab} />,
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <WorkspaceHeader workspace={workspace} theme={theme} onToggleTheme={toggleTheme} onOpenAIMentor={openAIMentor} />
        <WorkspaceToolbar workspace={workspace} onFullscreenToggle={() => {}} isFullscreen={false} onFocusModeToggle={toggleFocusMode} isFocusMode={focusMode} fontScale={layout.fontScale} onFontScaleChange={layout.setFontScale} />
        <div style={{ flex: 1, overflow: "auto" }}>{panelsById[mobileTab]}</div>
        <div role="tablist" aria-label="Workspace sections" style={{ display: "flex", borderTop: `1px solid ${ws.border}`, background: ws.bgCard }}>
          {MOBILE_TABS.map(t => (
            <button
              key={t.id} role="tab" aria-selected={mobileTab === t.id} onClick={() => setMobileTab(t.id)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 12, fontWeight: mobileTab === t.id ? 800 : 500,
                color: mobileTab === t.id ? ws.accent : ws.ink3, background: "transparent", border: "none",
                borderTop: `2px solid ${mobileTab === t.id ? ws.accent : "transparent"}`, cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Desktop/tablet — full resizable 3-region layout. `isFullscreen` swaps
  // the whole PanelGroup tree for a single full-bleed region (see
  // panels/useFullscreenPanel.js's header for why this isn't a library
  // feature).
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <WorkspaceHeader workspace={workspace} theme={theme} onToggleTheme={toggleTheme} onOpenAIMentor={openAIMentor} />
      <WorkspaceToolbar
        workspace={workspace}
        onFullscreenToggle={() => toggleFullscreen("center-panel")}
        isFullscreen={isFullscreen("center-panel")}
        onFocusModeToggle={toggleFocusMode}
        isFocusMode={focusMode}
        fontScale={layout.fontScale}
        onFontScaleChange={layout.setFontScale}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        {isFullscreen("center-panel") ? (
          centerContent
        ) : (
          <ResizablePanelGroup id="arena-shell-h" direction="horizontal" persistId="arena-shell-h" storage={layout.panelStorage}>
            {/* react-resizable-panels' Panel size props are unit-sensitive: a
                bare number means pixels, a string means percent (see its own
                doc comment on Panel — "Numeric values are assumed to be
                pixels. Strings without explicit units are assumed to be
                percentages"). These were passed as numbers, so e.g.
                defaultSize={22} meant a literal 22px-wide sidebar (not 22% of
                the group), and minSize={14}/maxSize={36} permanently pinned
                it to a 14-36px sliver regardless of the group's real width —
                the reported "sidebar collapses to single characters, main
                panel overlaps it" bug. Fixed by passing percent strings. */}
            <ResizablePanel id="mission-sidebar" defaultSize="22%" minSize="14%" maxSize="36%" collapsible collapsedSize={0} panelRef={missionPanelRef}>
              <MissionSidebar workspace={workspace} activeTab={layout.missionSidebarTab} onActiveTabChange={layout.setMissionSidebarTab} />
            </ResizablePanel>
            <PanelResizeHandle direction="horizontal" />
            <ResizablePanel id="center-column" defaultSize="56%" minSize="30%">
              <ResizablePanelGroup id="arena-shell-v" direction="vertical" persistId="arena-shell-v" storage={layout.panelStorage}>
                <ResizablePanel id="center-panel" defaultSize="70%" minSize="30%">
                  {centerContent}
                </ResizablePanel>
                <PanelResizeHandle direction="vertical" />
                <ResizablePanel id="bottom-panel" defaultSize="30%" minSize={0} collapsible collapsedSize={0} panelRef={bottomPanelRef}>
                  <BottomPanel workspace={workspace} activeTab={layout.bottomPanelTab} onActiveTabChange={layout.setBottomPanelTab} />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <PanelResizeHandle direction="horizontal" />
            <ResizablePanel id="right-sidebar" defaultSize="22%" minSize="14%" maxSize="36%" collapsible collapsedSize={0} panelRef={rightPanelRef}>
              <RightSidebar workspace={workspace} activeTab={layout.rightSidebarTab} onActiveTabChange={layout.setRightSidebarTab} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
      {focusMode && (
        <button
          type="button" onClick={toggleFocusMode}
          style={{ position: "fixed", bottom: 16, right: 16, zIndex: 30, padding: "8px 14px", borderRadius: 20, background: ws.ink, color: ws.bgCard, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, boxShadow: ws.shadow }}
        >
          Exit Focus Mode (Esc)
        </button>
      )}
    </div>
  )
}

export default function WorkspaceShell({ workspace, userId, children }) {
  return (
    <WorkspaceThemeProvider>
      <ShellInner workspace={workspace} userId={userId}>{children}</ShellInner>
    </WorkspaceThemeProvider>
  )
}
