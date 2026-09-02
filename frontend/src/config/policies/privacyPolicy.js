// ─── policies/privacyPolicy.js ────────────────────────────────────────────────
// See blocks.js for the content-block format. Every factual claim here is
// grounded in the actual codebase (signup fields, storage buckets, AI
// provider wiring, public-profile field lists, etc.) as researched for this
// update — see the accompanying compliance report for citations. Where the
// underlying implementation has a real gap (e.g. account-deletion purging),
// this policy describes what the product actually does today rather than
// what a typical privacy policy claims.
export default {
  id: "privacy",
  title: "Privacy Policy",
  lastUpdated: "2026-09-02",
  intro:
    "This Privacy Policy explains what personal data Capabilio collects, why, who we share it with, and the choices and rights you have. It's written to reflect what the product actually does — not a generic template. Read it alongside our Cookie Policy, Terms of Service, and DPDP Compliance Notice.",
  sections: [
    {
      id: "who-we-are",
      heading: "1. Who we are",
      body: [
        "Capabilio (\"we\", \"us\") operates the Capabilio platform at capabilio.online, built in India for career skill-building, practice, and verification.",
        { note: "Legal entity name, registered address, and CIN/registration number: [PLACEHOLDER — to be confirmed before publishing].", tone: "placeholder" },
      ],
    },
    {
      id: "data-we-collect",
      heading: "2. Data we collect",
      body: [
        { sub: "Account and sign-up data" },
        "Email address and password (managed by Supabase Auth) and your first and last name, always. Depending on which path you choose at sign-up, we also collect: as a student — college, branch, and stage of study; as a professional — company, job title, LinkedIn URL, and years of experience; as an executive — organization name, title, and LinkedIn URL; as an institution — institution name, type, city, website, and administrator name.",
        { sub: "Profile and career data" },
        "Whatever you choose to add to your profile — headline, bio, profile/cover photos, resume content, work experience, education, certifications, skill graph, and target role/keyword.",
        { sub: "Arena performance and ratings" },
        "Your mission/task submissions (code, SQL queries, written answers), pass/fail results, ELO and other rating scores, submission history, and streaks.",
        { sub: "Voice interview data (if you use this feature)" },
        "If you take an AI mock interview, your spoken answers are recorded in your browser and sent to our server to be transcribed. Audio is held only in server memory for the duration of that transcription request and is not written to disk or persistent storage by Capabilio; the transcript text (and Capabilio's AI-generated evaluation of it) is what gets saved to your account.",
        { sub: "Uploaded files and portfolio material" },
        "Files you upload — resumes, portfolio proof documents, profile/cover photos, and organization media where applicable — are stored in Supabase Storage under access-controlled buckets.",
        { sub: "Payment data" },
        "When you buy a plan, Razorpay (our payment processor) handles your card/UPI/payment-instrument details directly — we do not receive or store your full payment credentials. We keep a record of the transaction (plan, amount, order/payment ID, status) to verify and grant access.",
        { sub: "Usage and device data" },
        "Basic technical data (like IP address and browser/device information) is processed by our hosting and analytics providers as an ordinary part of serving the site and understanding product usage — see our Cookie Policy for specifics on analytics.",
      ],
    },
    {
      id: "how-we-use",
      heading: "3. How we use your data",
      body: [
        { list: [
          "To create and run your account, and show you your own profile, submissions, and ratings.",
          "To evaluate Arena submissions — deterministically for tasks with an objectively correct answer, and with AI assistance for open-ended content.",
          "To generate new practice missions with AI when your existing task pool runs out, and to verify those before showing them to you.",
          "To power semantic features (like similar-challenge suggestions and skill-gap matching) using vector embeddings of profile/skill data.",
          "To process payments and grant plan access.",
          "To send transactional email (account/verification messages) and, in some cases, re-engagement emails about your activity or streaks.",
          "To maintain security, investigate abuse of Arena/assessments, and enforce our Terms of Service.",
          "To understand product usage through analytics (see our Cookie Policy).",
        ] },
      ],
    },
    {
      id: "third-parties",
      heading: "4. Who we share data with",
      body: [
        "We share data only with the service providers that make Capabilio work, and with recruiters/institutions to the extent described below — never sold to data brokers or advertisers.",
        { sub: "AI and data-processing providers" },
        { list: [
          "Groq, Anthropic (Claude), Google (Gemini), and OpenAI — used for grading assistance, content generation/normalization, and (OpenAI) generating the embeddings used for semantic matching.",
          "Deepgram — speech-to-text for voice interviews, and text-to-speech for narrated career-video content. Deepgram's text-to-speech does not currently offer a genuine Indian-English voice option; narrated content uses an available American-English voice.",
          "Pinecone — stores vector embeddings (derived from profile/skill data, not raw text) to power similarity search and matching features.",
          "ProxyCurl — used only when you explicitly submit a LinkedIn URL (typically your own) to pull public profile data from it; this happens on demand, not as background scraping of your account.",
        ] },
        "These are US-based (or US-hosted) providers, so using these features involves transferring the relevant data outside India. The DPDP Act, 2023 permits cross-border transfer by default except to countries the Indian government specifically restricts by notification; we are not aware of any such restriction affecting these providers as of this policy's date.",
        { sub: "Payments and communications" },
        "Razorpay (payment processing) and Resend (transactional/lifecycle email).",
        { sub: "Hosting and infrastructure" },
        "Supabase (database, authentication, file storage), Vercel (frontend hosting, analytics), and Render (backend hosting).",
        { sub: "Recruiters and institutions" },
        "Your public profile fields — name, headline, photo, current company/role, skill graph, education, certifications, ratings, portfolio content, LinkedIn/GitHub links, location, and years of experience — are visible to anyone with your profile link or using Capabilio's profile search, whether or not they're logged in, unless you restrict visibility in Settings → Privacy. Your email, phone number, and detailed internal scoring breakdowns are never included in this public data. If your college or employer has an institution account on Capabilio, its administrators can additionally see performance data for members of that institution through Capabilio's institution tools.",
        { sub: "Legal disclosure" },
        "We may disclose data if required by law, court order, or a valid request from CERT-In or another Indian authority.",
      ],
    },
    {
      id: "ai-disclaimer",
      heading: "5. AI features — what to know",
      body: [
        { note: "AI-generated tasks, feedback, evaluations, and recommendations can be wrong, incomplete, or biased by the data they were trained on. Don't treat any AI output on Capabilio as professional, legal, medical, or financial advice, and don't submit confidential or sensitive information (yours or anyone else's) into free-text fields, chats, or interview answers — these are not designed or guaranteed to give such information special handling.", tone: "warning" },
        "Some AI-assisted features (grading, generation, transcription, embeddings) necessarily send relevant data to the third-party providers listed above to function.",
      ],
    },
    {
      id: "cookies",
      heading: "6. Cookies and analytics",
      body: [
        "See our separate Cookie Policy for the full detail on PostHog product analytics (including session recording with input masking), Vercel Analytics/Speed Insights, and locally-stored preferences.",
      ],
    },
    {
      id: "security",
      heading: "7. Security",
      body: [
        "We use Supabase's row-level security to restrict database access by user and role, and a dedicated admin flag (checked server-side) to gate administrative tools. Data in transit is encrypted via HTTPS/TLS, and data at rest benefits from the managed encryption our infrastructure providers (Supabase, Vercel, Render) provide as part of their platforms.",
        { note: "No system is completely secure, and we don't claim data is \"encrypted everywhere\" beyond what's described above, or that any specific request-rate protection is active on every endpoint. If we become aware of a breach affecting your data, we will notify affected users and, where required, CERT-In, in line with applicable Indian law.", tone: "info" },
      ],
    },
    {
      id: "retention",
      heading: "8. Data retention and deletion",
      body: [
        "Profile data is kept while your account is active. Arena submission history is currently kept indefinitely, since it's the basis of your ELO history and portfolio.",
        "You can delete your account at any time from Settings → Advanced. Doing this immediately signs you out and records your deletion request.",
        { note: "Being transparent about where this stands today: account deletion currently records your request but does not yet trigger an automated data-purge process on our servers. We are working on completing this so that deletion requests are reliably fulfilled — until then, if you delete your account, also contact us using the details below so we can confirm your data is removed. Do not read the phrase \"purged within 30 days\" shown elsewhere in the product as a guarantee until this is fully implemented.", tone: "warning" },
        "You can download a full export of your profile and Arena history at any time from Settings → Data & Export.",
      ],
    },
    {
      id: "childrens-data",
      heading: "9. Children's data",
      body: [
        "Capabilio does not currently verify your age at sign-up. Under the Digital Personal Data Protection Act, 2023, anyone under 18 is a \"child,\" and processing a child's data will require verifiable parental consent once the Act's rules for this are in force. If you are under 18, please use Capabilio only with a parent or guardian's involvement, and avoid submitting personal data beyond what's necessary. If you are a parent/guardian and believe your child has provided personal data without your consent, contact us and we will address it.",
      ],
    },
    {
      id: "your-rights",
      heading: "10. Your rights",
      body: [
        "You can access, correct, and export your data, and request deletion, using the tools in Settings, or by contacting us. See our DPDP Compliance Notice for the fuller list of rights under Indian law and how to exercise them, including how to reach our grievance officer.",
      ],
    },
    {
      id: "international",
      heading: "11. International users",
      body: [
        "Capabilio is built for and priced in India (INR only) and is not actively marketed to users in the EU/UK, the US, or elsewhere. The site isn't geo-blocked, so if you access it from outside India, this Privacy Policy still applies, but we do not represent that Capabilio is compliant with non-Indian frameworks like the GDPR or CCPA unless and until we actually operate in those markets.",
      ],
    },
    {
      id: "changes",
      heading: "12. Changes to this policy",
      body: [
        "We'll update the \"Last updated\" date above whenever this policy changes, and give reasonably prominent in-product notice for material changes.",
      ],
    },
    {
      id: "contact",
      heading: "13. Contact",
      body: [
        { note: "Contact email for privacy questions and data requests: [PLACEHOLDER — official privacy/legal email to be confirmed]. See our DPDP Compliance Notice for our Grievance Officer's details.", tone: "placeholder" },
      ],
    },
  ],
}
