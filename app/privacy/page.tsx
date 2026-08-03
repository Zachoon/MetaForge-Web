import type { Metadata } from "next";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy | MetaForge",
  description: "How MetaForge handles guest Forge previews, account data, decklists, security information, and privacy requests.",
  alternates: { canonical: "https://metaforge.gg/privacy" },
};

export default function PrivacyPage() {
  return <main className="legal-page"><div className="legal-shell">
    <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
    <article className="legal-card">
      <small>PUBLIC ALPHA</small><h1>Privacy Policy</h1><p className="updated">Effective August 2, 2026</p>
      <section><h2>Who operates MetaForge</h2><p>MetaForge is currently operated by Zach Lackey. Privacy questions and deletion requests may be sent to <a href="mailto:support@metaforge.gg">support@metaforge.gg</a>.</p></section>
      <section><h2>Information we process</h2><ul><li>Account identity supplied through Cloudflare Access, including a cryptographically verified email identifier.</li><li>Decklists, Blueprint choices, revisions, match notes, feedback, and saved account preferences.</li><li>Security and operational information such as request timing, coarse network signals, browser information, rate-limit records, and error logs.</li><li>Affiliate and usage events produced when permitted tracking or affiliate links are used.</li></ul></section>
      <section><h2>Guest preview</h2><p>The account-free Forge uses Cloudflare Turnstile, a signed browser session, coarse abuse-prevention signals, and a temporary claim record. The preview and claim record expire after approximately 24 hours unless you sign in and preserve the Masterwork.</p></section>
      <section><h2>How information is used</h2><p>We use information to generate and save decks, provide analysis, sync account history, prevent abuse, diagnose failures, respond to support, measure the alpha, and improve MetaForge’s recommendations.</p></section>
      <section><h2>Service providers</h2><p>MetaForge relies on providers including Cloudflare for hosting, security, identity, Turnstile, and storage; Google for business email; Scryfall and other card-data sources; and affiliate or analytics partners disclosed on the site. These providers process information under their own terms and privacy policies.</p></section>
      <section><h2>Retention and security</h2><p>Temporary guest generation data expires automatically. Account data is retained while needed to provide the service or until deletion is requested, subject to legitimate security, legal, and backup needs. MetaForge uses access controls, encrypted connections, server-side secrets, ownership checks, and request limits, but no online service can promise absolute security.</p></section>
      <section><h2>Your choices</h2><p>You may avoid creating an account and use only the one-time preview. You may request access, correction, or deletion of account information by contacting support. Browser and provider settings may offer additional cookie or tracking controls.</p></section>
      <section><h2>Children</h2><p>MetaForge is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p></section>
      <section><h2>Updates</h2><p>We may update this policy as the alpha changes. The effective date above will identify the current version.</p></section>
    </article><footer className="legal-links"><a href="/">Return to the Forge</a><a href="/terms">Terms of Use</a><a href="mailto:support@metaforge.gg">Support</a></footer>
  </div></main>;
}
