// ─── policies/termsOfService.js ───────────────────────────────────────────────
// See blocks.js for the content-block format.
export default {
  id: "terms",
  title: "Terms of Service",
  lastUpdated: "2026-09-02",
  intro:
    "These Terms of Service (\"Terms\") govern your access to and use of Capabilio — the website, application, and related services (together, \"Capabilio\", \"the Platform\", \"we\", \"us\"). By creating an account or otherwise using Capabilio, you agree to these Terms. If you do not agree, do not use the Platform.",
  sections: [
    {
      id: "who-we-are",
      heading: "1. Who we are, and what Capabilio does",
      body: [
        "Capabilio is an AI-assisted career platform, built in India, that helps you build, practice, and demonstrate professional and academic skills. Depending on the path you choose at sign-up, Capabilio provides some combination of: skill assessments and a skill graph, \"Arena\" practice missions and coding/SQL exercises scored by automated rubrics and, where noted, AI grading, an ELO-style performance rating, an auto-generated public portfolio page, career-guidance and job-matching features, and paid subscription plans with additional usage limits and features.",
        { note: "Capabilio is a skills-practice and career-readiness tool. It is not a recruitment agency, a certification or accreditation body, a substitute for a degree or professional qualification, or a guarantee of employment.", tone: "info" },
      ],
    },
    {
      id: "eligibility",
      heading: "2. Eligibility and your account",
      body: [
        "You must be able to form a binding contract under the Indian Contract Act, 1872 to use Capabilio. You are responsible for the accuracy of the information you provide, for keeping your login credentials confidential, and for all activity that happens under your account.",
        { note: "Capabilio does not currently verify your age at sign-up. If you are under 18, you should only use Capabilio with the involvement and consent of a parent or guardian, and should not submit personal data beyond what is necessary to use the Platform. We are reviewing age-related sign-up controls as India's data-protection rules for children's data come into effect (see our DPDP Compliance Notice).", tone: "warning" },
        "You agree to notify us promptly if you become aware of any unauthorized use of your account.",
      ],
    },
    {
      id: "acceptance",
      heading: "3. How you accept these Terms",
      body: [
        "You accept these Terms by creating a Capabilio account, and continue to accept the then-current version by continuing to use the Platform after we've posted an update (see \"Changes to these Terms\" below).",
        { note: "As of this version, account creation does not require a separate \"I agree to the Terms of Service\" checkbox during sign-up. We recommend Capabilio add one for clearer, more defensible acceptance under Indian click-wrap contract principles — see the compliance-gaps note accompanying this policy update.", tone: "placeholder" },
      ],
    },
    {
      id: "arena-ai",
      heading: "4. Arena, ELO ratings, and AI-generated content",
      body: [
        { sub: "How scoring works" },
        "Where a task has a single objectively correct answer (for example, most SQL and code-execution missions), your submission is checked by an automated, deterministic evaluator — running your query or code and comparing the real output against an expected result. No AI model is involved in deciding whether these submissions pass or fail. Where a task involves open-ended writing or design, we may use AI models to assist grading or feedback; this is disclosed in-product where it applies.",
        { sub: "Your ELO rating" },
        "Your ELO rating is a relative, algorithmically-computed performance score derived from your own submission history on the Platform. It is not an industry-standard credential, not verified or endorsed by any employer or third party, and not comparable across unrelated platforms. Ratings can go up or down, and unused ratings may decay over time as disclosed in-product.",
        { sub: "AI-generated missions and content" },
        "When there isn't an existing suitable practice task for you, Capabilio may generate one using a third-party AI model, then automatically verify that a correct reference solution actually produces the expected result before ever showing it to you. A generated task may later be reused and shown to other users facing the same gap — it is not exclusive to the person it was first generated for. Despite the verification step, AI-generated content can still contain errors, ambiguity, or unexpected edge cases. If you believe a generated task is broken or unfair, please report it — see \"Contact\" below.",
        { note: "Do not treat any AI-generated content, feedback, or recommendation on Capabilio as professional, legal, medical, or financial advice. AI outputs may be inaccurate or incomplete, and you remain responsible for verifying anything you rely on.", tone: "warning" },
        { note: "Do not enter confidential, sensitive, or third-party-owned information (someone else's personal data, a former employer's confidential material, health information, financial account details, etc.) into any Arena mission, chat, or free-text field. These fields are not designed or guaranteed to give such information special handling.", tone: "warning" },
      ],
    },
    {
      id: "acceptable-use",
      heading: "5. Acceptable use",
      body: [
        "You agree not to:",
        { list: [
          "Cheat, manipulate, or attempt to game Arena missions, ELO ratings, leaderboards, or assessments — including submitting answers obtained from another person's account, automating submissions, exploiting a bug to inflate your score, or sharing solutions in a way intended to defeat the evaluation.",
          "Attempt to reverse-engineer, scrape, or extract our question banks, AI prompts, or proprietary scoring logic.",
          "Use another person's account, impersonate anyone, or misrepresent your identity, qualifications, or affiliation.",
          "Upload or submit unlawful, infringing, defamatory, or malicious content (including malware).",
          "Interfere with the Platform's normal operation, including through excessive automated requests.",
          "Use Capabilio to build a competing product from our content or underlying systems.",
        ] },
        "Violating this section may result in score adjustment, loss of access to features, or account suspension or termination as described below.",
      ],
    },
    {
      id: "content-ip",
      heading: "6. Content and intellectual property",
      body: [
        { sub: "Capabilio's content" },
        "The Platform's software, question banks, design, branding, and AI prompt/evaluation systems are owned by Capabilio (or licensed to us) and protected under the Copyright Act, 1957 and other applicable intellectual-property law. Your subscription gives you a personal, non-transferable right to use the Platform — it does not transfer ownership of any of this to you.",
        { sub: "Your content" },
        "You retain ownership of what you submit — your resume/profile information, code and query submissions, portfolio material, and written answers. By submitting content, you grant Capabilio a worldwide, royalty-free license to host, display, process, and (where you've made a page public) show that content as part of operating the Platform — for example, showing your public portfolio page to visitors, or using your anonymized submission to power your own ELO calculation.",
        { sub: "AI-generated task content" },
        "Indian copyright law does not yet have a settled rule for content generated with little or no human authorship. Where an Arena mission is generated by an AI model, Capabilio asserts rights in that content as the commissioning platform, to the extent the law allows; we do not claim a fully settled copyright position beyond what current law supports.",
      ],
    },
    {
      id: "third-parties",
      heading: "7. Employers, institutions, and other third parties",
      body: [
        "Certain profile fields — your name, headline, photo, current role/company, skill graph, ELO/rating scores, education, certifications, and portfolio content — are visible on your public profile and portfolio pages to anyone with the link, including people who aren't logged in, unless you restrict visibility in Settings → Privacy. Your email address, phone number, and raw internal scoring detail are never included on public pages.",
        "If your college or company has an institutional account on Capabilio, its administrators may additionally see aggregated or individual performance data for members of that institution through Capabilio's institution tools, as described further in our Privacy Policy.",
      ],
    },
    {
      id: "payments",
      heading: "8. Plans and payments",
      body: [
        "Capabilio's paid plans (for example Pro, Elite, and the higher institutional/executive tiers) are currently sold as one-time purchases that unlock a plan tier and its usage limits — not as an auto-renewing subscription that charges you again automatically. If that changes for a given plan, we'll disclose it clearly before you pay. Pricing is shown in INR at the time of purchase and may change for future purchases.",
        "Payments are processed by our payment partner, Razorpay. Capabilio does not directly store your full card, UPI, or other payment-instrument details — Razorpay handles that. We independently verify each payment's amount and plan against Razorpay's own records before granting access, to prevent tampering.",
        "Separately, our Mentor Marketplace (paid 1:1 mentor sessions, where available) has its own specific cancellation and refund rules — see our Refund Policy.",
      ],
    },
    {
      id: "suspension",
      heading: "9. Suspension and termination",
      body: [
        "We may suspend or terminate your access if you violate these Terms (including the Acceptable Use section), if required by law, or to protect the security or integrity of the Platform. Where practical, we'll tell you why. You may delete your account at any time from Settings → Advanced; see our Privacy Policy and DPDP Compliance Notice for what happens to your data afterward.",
      ],
    },
    {
      id: "disclaimers",
      heading: "10. Disclaimers and limitation of liability",
      body: [
        "Capabilio is provided \"as is.\" We do not guarantee that Arena content, AI feedback, ELO ratings, or job/career recommendations are error-free, complete, or will lead to any particular outcome (such as an interview or job offer). To the maximum extent permitted by Indian law, Capabilio and its team are not liable for indirect, incidental, or consequential damages arising from your use of the Platform. Nothing in these Terms limits liability that cannot be excluded under applicable law.",
      ],
    },
    {
      id: "governing-law",
      heading: "11. Governing law and disputes",
      body: [
        "These Terms are governed by the laws of India. Disputes will be subject to the exclusive jurisdiction of the courts at [PLACEHOLDER — registered city/jurisdiction to be confirmed].",
        { note: "Legal entity name and registered address: [PLACEHOLDER — to be confirmed before publishing].", tone: "placeholder" },
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to these Terms",
      body: [
        "We may update these Terms as the Platform evolves or as law requires. We'll update the \"Last updated\" date above, and for material changes, provide reasonably prominent notice in-product before they take effect.",
      ],
    },
    {
      id: "contact",
      heading: "13. Contact",
      body: [
        { note: "Contact email for legal/Terms questions: [PLACEHOLDER — official legal email to be confirmed].", tone: "placeholder" },
      ],
    },
  ],
}
