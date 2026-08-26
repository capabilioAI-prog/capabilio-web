/**
 * MaintenancePage.jsx — full-application lockout screen.
 *
 * NOT the same mechanism as components/MaintenanceBanner.jsx (the thin,
 * dismissible top bar for active deploy windows — the site stays usable
 * underneath it). This is the harder shutdown: when FLAGS.maintenance_mode
 * is on, main.jsx renders ONLY this component, before BrowserRouter/App/
 * ErrorBoundary ever mount. There is nothing below this in the tree, so
 * there is nothing here that can navigate into the app — no nav bar, no
 * sign-in link, no route links, no buttons. That's deliberate, not an
 * oversight: don't add one.
 *
 * No countdown/ETA — this page doesn't know how long maintenance will
 * take and showing a fabricated timer would just be a promise this code
 * can't keep.
 */
export default function MaintenancePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        padding: 24,
        textAlign: "center",
        background: "#FFF3EE",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "#FF5701",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        🛠️
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1A1714",
          margin: "0 0 10px",
        }}
      >
        Capabilio is temporarily offline for maintenance
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "#6B6560",
          maxWidth: 420,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        We'll be back shortly. Thanks for your patience.
      </p>
    </div>
  )
}
