/**
 * MaintenancePage.jsx — site-wide "under construction" gate.
 *
 * Rendered instead of <App/> (see main.jsx) when
 * FLAGS.maintenance_mode is on. Deliberately standalone — no imports from
 * App.jsx, no router, no Supabase/auth calls — so it can never fail because
 * of whatever the maintenance work in progress might be breaking elsewhere
 * in the app. Matches the existing Parchment Design System tokens from
 * index.css (cream background, brand orange, DM Sans) rather than
 * introducing a new visual style.
 */
export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAF7F2",
        color: "#1A1714",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#FFF3EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 26,
          }}
          aria-hidden="true"
        >
          🛠️
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#FF5701",
            marginBottom: 12,
          }}
        >
          Capabilio
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px", color: "#1A1714" }}>
          We&rsquo;ll be right back
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#3D3935", margin: "0 0 4px" }}>
          Capabilio is offline for scheduled maintenance right now.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#3D3935", margin: 0 }}>
          We&rsquo;re not taking requests during this window — please check back shortly.
        </p>
      </div>
    </div>
  )
}
