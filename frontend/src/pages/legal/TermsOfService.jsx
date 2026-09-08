import LegalPageShell from "./LegalPageShell"

const SECTIONS = [
  {
    heading: "1. Acceptance of terms",
    paragraphs: [
      "By creating a Capabilio account, you agree to these Terms of Service. If you don't agree, please don't use Capabilio.",
    ],
  },
  {
    heading: "2. Your account",
    paragraphs: [
      "You're responsible for keeping your login credentials secure and for all activity under your account. Tell us right away if you suspect unauthorized access.",
      "Account information must be accurate — Capabilio's verification model depends on it, especially for professional, executive, and institution accounts.",
    ],
  },
  {
    heading: "3. Subscriptions and payments",
    paragraphs: [
      "Paid plans are billed as described on each path's pricing page. Payments are processed by Razorpay; by subscribing you also agree to Razorpay's applicable terms.",
      "You can cancel a paid plan at any time from your account settings; cancellation takes effect at the end of the current billing period.",
    ],
  },
  {
    heading: "4. Your content and ELO",
    paragraphs: [
      "You own the content you submit (resumes, mission solutions, portfolio content). By submitting it, you grant Capabilio the right to process it to generate your verified profile, skill graph, and ELO score.",
      "ELO reflects real, scored performance on Capabilio and is not transferable, purchasable, or guaranteed to match any other rating system.",
    ],
  },
  {
    heading: "5. Prohibited conduct",
    paragraphs: [
      "Don't submit false credentials, plagiarized work, or attempt to manipulate ELO through means other than genuine task completion. Don't attempt to access other users' accounts or disrupt the platform.",
    ],
  },
  {
    heading: "6. Termination",
    paragraphs: [
      "You may close your account at any time. We may suspend or terminate accounts that violate these terms, including fraudulent verification claims.",
    ],
  },
  {
    heading: "7. Disclaimers and limitation of liability",
    paragraphs: [
      "Capabilio is provided \"as is.\" We don't guarantee specific job placement, interview, or hiring outcomes — ELO and verification reflect demonstrated skill, not a guarantee of employment.",
      "To the extent permitted by law, Capabilio's liability for any claim is limited to the amount you paid us in the 12 months before the claim arose.",
    ],
  },
  {
    heading: "8. Governing law",
    paragraphs: [
      "These terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of Andhra Pradesh.",
    ],
  },
  {
    heading: "9. Contact us",
    paragraphs: [
      "Questions about these terms? Email support@capabilio.com.",
    ],
  },
]

export default function TermsOfService({ onGetStarted, onLogin }) {
  return (
    <LegalPageShell
      title="Terms of Service"
      updated="September 2026"
      sections={SECTIONS}
      onGetStarted={onGetStarted}
      onLogin={onLogin}
    />
  )
}
