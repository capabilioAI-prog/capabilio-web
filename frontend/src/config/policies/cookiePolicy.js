// ─── policies/cookiePolicy.js ─────────────────────────────────────────────────
// See blocks.js for the content-block format. Facts here are taken directly
// from frontend/src/lib/analytics.js (PostHog wrapper), App.jsx's Vercel
// Analytics/Speed Insights mount, and grep confirmation that no
// cookie-consent banner exists anywhere in the codebase today.
export default {
  id: "cookies",
  title: "Cookie Policy",
  lastUpdated: "2026-09-02",
  intro:
    "This Cookie Policy explains what cookies and similar local-storage technologies Capabilio actually uses, why, and what choices you have. It should be read alongside our Privacy Policy.",
  sections: [
    {
      id: "what-are-cookies",
      heading: "1. What this policy covers",
      body: [
        "\"Cookies\" are small pieces of data a website can store in your browser. Capabilio also uses two related browser storage mechanisms — localStorage and sessionStorage — for some of the same purposes; this policy covers all of them together, since they raise the same practical questions for you.",
        { note: "Capabilio does not currently show a cookie-consent banner. Analytics and session tools described below load automatically when you use the site, based on the settings in place at the time. If you'd prefer stricter control, see \"Your choices\" below.", tone: "warning" },
      ],
    },
    {
      id: "categories",
      heading: "2. What we actually use, and why",
      body: [
        { sub: "Strictly necessary — authentication" },
        "Supabase Auth (our authentication provider) stores a session token in your browser so you stay signed in between visits. Without this, you would need to log in again on every page load. This is essential to the service and cannot be turned off without signing out.",
        { sub: "Product analytics — PostHog" },
        "When configured, Capabilio uses PostHog to understand how the product is used — which pages are visited, which features are used, and basic funnel events like sign-up or Arena mission completion. Concretely, based on our current configuration:",
        { list: [
          "We identify signed-in users by their account ID, email, display name, career path, subscription plan, and current ELO rating — not anonymous visitors by default (person_profiles is set to \"identified_only\").",
          "Session recording is enabled, but all form inputs are masked (maskAllInputs) — PostHog is configured not to record what you actually type, including in password and email fields.",
          "Page views are sent manually as named events (e.g. \"page_viewed\", \"onboarding_completed\", \"arena_task_completed\"), not through PostHog's automatic pageview tracking.",
        ] },
        "PostHog's own cookies/local storage are what make this identification and session recording possible across page loads.",
        { sub: "Performance monitoring — Vercel Analytics and Speed Insights" },
        "We use Vercel Web Analytics and Vercel Speed Insights to understand traffic patterns and page performance. These are designed by Vercel to operate without persistent tracking cookies; they do not identify you personally.",
        { sub: "Preferences stored locally (not sent anywhere)" },
        "Some parts of the app remember a preference on your own device only — for example, your chosen light/dark theme in the Arena workspace, or whether you've dismissed the maintenance banner. These stay in your browser's localStorage and are never transmitted to Capabilio's servers or any third party.",
      ],
    },
    {
      id: "third-party",
      heading: "3. Third-party cookies",
      body: [
        "Some AI, payment, and integration providers we rely on to run parts of the product (see our Privacy Policy's \"who we share data with\" section) may set their own cookies when their scripts run in your browser — for example, a payment provider's checkout flow. We do not control these third parties' cookie behavior directly; their own privacy/cookie policies govern what they do.",
      ],
    },
    {
      id: "choices",
      heading: "4. Your choices",
      body: [
        "You can block or delete cookies and clear localStorage through your browser's own settings at any time. Doing so may sign you out or reset locally-remembered preferences (like theme choice), but it will not delete your Capabilio account data — that is handled separately, and is described in our Privacy Policy and DPDP Compliance Notice.",
        "Because we do not currently gate PostHog analytics behind a consent banner, the most reliable way to opt out of product analytics today is a browser-level tracking blocker, or contacting us using the details in our Privacy Policy so we can suppress your account from analytics collection manually.",
        { note: "We are evaluating adding an in-product cookie-consent control as India's data-protection framework (the DPDP Act's Rules — see our DPDP Compliance Notice) comes into force. This policy will be updated when that changes.", tone: "info" },
      ],
    },
    {
      id: "changes",
      heading: "5. Changes to this policy",
      body: [
        "We'll update this page whenever the cookies, analytics tools, or storage mechanisms we actually use change, and update the \"Last updated\" date above accordingly. Material changes will also be reflected in our general Privacy Policy.",
      ],
    },
    {
      id: "contact",
      heading: "6. Contact",
      body: [
        { note: "Contact email for privacy/cookie questions: [PLACEHOLDER — official privacy/legal email to be confirmed].", tone: "placeholder" },
      ],
    },
  ],
}
