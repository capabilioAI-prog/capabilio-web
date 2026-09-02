// ─── policies/dpdpNotice.js ───────────────────────────────────────────────────
// See blocks.js for the content-block format. Legal-status claims here
// (Rules notified but phased, substantive obligations not yet operative,
// IT Act/SPDI Rules as today's binding floor) reflect researched primary
// sources as of this policy's date — see the accompanying research report.
export default {
  id: "dpdp",
  title: "DPDP Compliance / Data Protection Notice",
  lastUpdated: "2026-09-02",
  intro:
    "This notice explains, specifically, how the Digital Personal Data Protection Act, 2023 (\"DPDP Act\") applies to Capabilio, what's actually in force today versus still coming into effect, and how to exercise your rights as a Data Principal.",
  sections: [
    {
      id: "status",
      heading: "1. Where the law actually stands today",
      body: [
        "The DPDP Act, 2023 was enacted, and its accompanying Rules were notified in November 2025 — but they take effect in phases. As of this notice's date, the Data Protection Board has been established, but the substantive obligations that most affect how a Privacy Policy operates — the detailed notice/consent mechanics, Data Principal rights procedures, and cross-border transfer conditions — are not yet fully in force; they phase in over the following months.",
        { note: "We are not claiming Capabilio is \"fully DPDP-compliant\" in the present tense, because the operative Rules aren't fully in force yet for anyone. What we can say honestly: our current privacy practices are built around the IT Act, 2000 and the IT (Reasonable Security Practices and Sensitive Personal Data or Information) Rules, 2011 — today's actual binding law — and we intend to align fully with the DPDP Act's Rules as each phase takes effect.", tone: "info" },
      ],
    },
    {
      id: "role",
      heading: "2. Our role, and what counts as your personal data",
      body: [
        "Under the DPDP Act, Capabilio acts as a \"Data Fiduciary\" — the entity that decides what personal data is collected and why. \"Personal data\" broadly means any data that identifies you, directly or indirectly — including your name, email, profile and career information, and your Arena/ELO history, since it's linked to your account. See our Privacy Policy for the full inventory of what we collect.",
      ],
    },
    {
      id: "consent",
      heading: "3. Consent and lawful processing",
      body: [
        "We process your data based on the consent you give by creating and using your account, and to the extent the DPDP Act's \"legitimate use\" provisions apply (for example, to provide a service you've specifically requested). You can withdraw consent at any time by deleting your account, though this may mean you can no longer use features that depend on that data.",
      ],
    },
    {
      id: "rights",
      heading: "4. Your rights as a Data Principal",
      body: [
        { list: [
          "Right to access — see a summary of the personal data we hold about you, and download a full export from Settings → Data & Export.",
          "Right to correction and completion — update inaccurate or incomplete profile data yourself in Settings, or ask us to correct it.",
          "Right to erasure — request deletion of your personal data via Settings → Advanced → Delete Account, or by contacting us. See our Privacy Policy's Data Retention section for the current honest state of how deletion requests are processed.",
          "Right to grievance redressal — raise a complaint with our Grievance Officer (below) if you're unhappy with how we've handled your data or a rights request.",
          "Right to nominate — nominate another individual to exercise these rights on your behalf in the event of your death or incapacity, once this mechanism is available in-product; until then, contact us directly to record a nomination.",
        ] },
      ],
    },
    {
      id: "children",
      heading: "5. Children's data",
      body: [
        "The DPDP Act defines a \"child\" as anyone under 18, and requires verifiable parental consent before processing a child's personal data, with no targeted advertising or behavioral tracking of children permitted. As disclosed in our Privacy Policy, Capabilio does not currently verify age at sign-up. If you are under 18, please use Capabilio with a parent or guardian's involvement. We are reviewing sign-up controls to address this as the Act's rules for children's data take effect.",
      ],
    },
    {
      id: "security",
      heading: "6. Security and breach notification",
      body: [
        "We follow the security practices described in our Privacy Policy. In the event of a personal data breach, we will notify affected users and, as required by CERT-In's 2022 directions, report qualifying cyber incidents to CERT-In within the mandated timeframe.",
      ],
    },
    {
      id: "cross-border",
      heading: "7. Cross-border data transfer",
      body: [
        "The DPDP Act permits transferring personal data outside India by default, except to countries the Central Government specifically restricts by notification. As explained in our Privacy Policy, several of the third-party providers we rely on (for AI processing, transcription, and vector search) are based outside India, which means relevant data is transferred to them as part of using those features.",
      ],
    },
    {
      id: "grievance-officer",
      heading: "8. Grievance Officer",
      body: [
        "Under the IT Rules and the DPDP Act, we are required to designate a Grievance Officer you can contact about privacy or data-handling complaints.",
        { note: "Grievance Officer name, designation, contact email, and postal address: [PLACEHOLDER — to be confirmed before publishing].", tone: "placeholder" },
        "We aim to acknowledge grievances within 48 hours and resolve them within one month, consistent with the Consumer Protection (E-Commerce) Rules, 2020.",
      ],
    },
    {
      id: "changes",
      heading: "9. Changes to this notice",
      body: [
        "As the DPDP Rules' remaining phases come into force, or our practices change to meet them, we will update this notice and its \"Last updated\" date.",
      ],
    },
  ],
}
