import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Root-level vite config: serves the frontend/ directory so `npm run dev`
// from the project root works without needing to cd into frontend/.
export default defineConfig({
  root: './frontend',   // Vite's web root — index.html lives here
  plugins: [react()],
  envDir: '..',         // Load .env from the project root (one level up from frontend/)
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // ── Code splitting — prevents a 3–6MB monolithic JS bundle ────────────────
    // Each chunk loads only when the user navigates to that feature.
    // react + react-dom: always needed → inline in main chunk
    // Heavy libraries (Three.js, Recharts, jsPDF etc.) → separate lazy chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React MUST stay in the main bundle — splitting it causes
          // "Cannot read properties of undefined (reading 'useState')"
          // because vendor-misc can load before vendor-react in some browsers.
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) return undefined
          // Chart library (~400kb)
          if (id.includes("node_modules/recharts"))      return "vendor-charts"
          // 3D library (~600kb) — only used in specific pages
          if (id.includes("node_modules/three"))         return "vendor-three"
          // Animation library (~150kb)
          if (id.includes("node_modules/framer-motion")) return "vendor-motion"
          // PDF generation (~500kb) — only used on resume/export pages
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas")) return "vendor-pdf"
          // Supabase client (~300kb)
          if (id.includes("node_modules/@supabase"))     return "vendor-supabase"
          // Code editor (~500kb) — only used by Arena's coding/SQL
          // workstation (frontend/src/pages/arena/Workstation.jsx), which
          // already dynamically imports it. Without its own chunk name
          // here, manualChunks would otherwise sweep it into the shared
          // "vendor-misc" chunk below — silently defeating that lazy
          // import, since vendor-misc is pulled in eagerly by many
          // unrelated pages that have nothing to do with Arena.
          if (id.includes("node_modules/@uiw/react-codemirror") ||
              id.includes("node_modules/@uiw/codemirror-extensions-basic-setup") ||
              id.includes("node_modules/@codemirror/") ||
              id.includes("node_modules/@lezer/"))       return "vendor-codemirror"
          // All other node_modules → shared vendor chunk
          if (id.includes("node_modules/"))              return "vendor-misc"
        },
      },
    },
    // Warn when any chunk exceeds 600kb (down from Vite's default 500kb — we
    // split intentionally, so raise the warning threshold slightly)
    chunkSizeWarningLimit: 600,
  },
})
