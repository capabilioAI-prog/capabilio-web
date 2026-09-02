// ─── policies/refundPolicy.js ─────────────────────────────────────────────────
// See blocks.js for the content-block format. Mentor Marketplace figures are
// taken directly from backend/server/lib/mentorMarketplace/refundPolicy.js's
// real, implemented logic — not invented. Plan-purchase refund handling is
// deliberately described as what it is today (no implemented refund
// mechanism), not as an aspirational policy — see the compliance-gaps note
// in the accompanying report.
export default {
  id: "refund",
  title: "Refund Policy",
  lastUpdated: "2026-09-02",
  intro:
    "This policy covers the two different kinds of payments on Capabilio — plan purchases and Mentor Marketplace sessions — because they work differently and have different refund rules.",
  sections: [
    {
      id: "plans",
      heading: "1. Plan purchases (Pro, Elite, and other tiers)",
      body: [
        "Capabilio's paid plans are one-time purchases, processed through Razorpay, that unlock a plan tier and its usage limits (for example, more daily Arena missions or AI interview sessions).",
        { note: "As of this version, Capabilio does not have an automated in-product refund mechanism for plan purchases. If you believe you were charged in error, were charged the wrong amount, or a technical failure meant you never actually received the plan you paid for, contact us using the details below and we will review it manually on a case-by-case basis.", tone: "warning" },
        "Nothing in this section limits any right you have under the Consumer Protection Act, 2019 or the Consumer Protection (E-Commerce) Rules, 2020 to raise a complaint about a purchase, including through our grievance process (see our DPDP Compliance Notice for grievance contact details).",
      ],
    },
    {
      id: "mentor-marketplace",
      heading: "2. Mentor Marketplace sessions",
      body: [
        "Where Capabilio's Mentor Marketplace is available, paid 1:1 mentor sessions follow a specific, automated cancellation and refund schedule:",
        { sub: "If you (the mentee) cancel" },
        { list: [
          "More than 24 hours before the session — full refund (100%).",
          "Between 6 and 24 hours before the session — half refund (50%).",
          "Less than 6 hours before the session — no refund (0%).",
        ] },
        { sub: "If the mentor cancels, or doesn't show up" },
        "You receive a full refund (100%), regardless of timing.",
        { sub: "If you (the mentee) don't show up" },
        "No refund — the mentor is still paid for the reserved time.",
        { sub: "Disputes and no-show reports" },
        "You have 7 days after a session to raise a dispute, and 48 hours to report that the other party didn't show up. If neither side disputes it, a session is automatically marked complete 24 hours after its scheduled end time. A platform fee (currently 15% by default) applies to mentor payouts, not to the refund amount you receive.",
      ],
    },
    {
      id: "how-to-request",
      heading: "3. How to request a refund or raise a dispute",
      body: [
        "Mentor Marketplace cancellations and disputes are handled in-product through the session's own cancel/dispute controls, which apply the schedule above automatically. For anything else — plan-purchase issues, billing questions, or anything the in-product flow doesn't cover — contact us directly.",
        { note: "Contact email for billing/refund questions: [PLACEHOLDER — official billing/support email to be confirmed]. Grievance Officer name and contact (required under the Consumer Protection Act, 2019 and IT Rules): [PLACEHOLDER — to be confirmed before publishing].", tone: "placeholder" },
      ],
    },
    {
      id: "changes",
      heading: "4. Changes to this policy",
      body: [
        "If we add automated refund handling for plan purchases, or change the Mentor Marketplace schedule above, we'll update this page and the \"Last updated\" date accordingly.",
      ],
    },
  ],
}
