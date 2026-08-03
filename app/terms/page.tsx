import type { Metadata } from "next";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms of Use | MetaForge",
  description: "Terms for using MetaForge's public-alpha Magic: The Gathering deckbuilding and analysis service.",
  alternates: { canonical: "https://metaforge.gg/terms" },
};

export default function TermsPage() {
  return <main className="legal-page"><div className="legal-shell">
    <a className="legal-brand" href="/"><i>MF</i> METAFORGE</a>
    <article className="legal-card">
      <small>PUBLIC ALPHA</small><h1>Terms of Use</h1><p className="updated">Effective August 2, 2026</p>
      <section><h2>Who operates MetaForge</h2><p>MetaForge is currently operated by Zach Lackey. Questions about these terms may be sent to <a href="mailto:support@metaforge.gg">support@metaforge.gg</a>.</p></section>
      <section><h2>Alpha service</h2><p>MetaForge is an early-access deckbuilding and analysis service. Features, card data, recommendations, availability, and account limits may change as the service is tested and improved.</p></section>
      <section><h2>Your responsibility</h2><p>Forge results are recommendations, not guarantees of tournament legality, performance, price, availability, or suitability for a particular event. Verify card legality, current rules, prices, and event requirements before relying on a result.</p></section>
      <section><h2>Acceptable use</h2><p>You may use MetaForge for personal deckbuilding and testing. You may not automate excessive requests, bypass access or rate limits, probe private systems, interfere with other players, scrape protected engine logic, or use the service unlawfully.</p></section>
      <section><h2>Accounts and content</h2><p>You are responsible for activity through your account. You retain ownership of decklists, notes, and feedback you submit. You permit MetaForge to process that material to provide, secure, and improve the service.</p></section>
      <section><h2>Third-party services and trademarks</h2><p>MetaForge uses third-party services and public card information, including Cloudflare, Google, Scryfall, and affiliate partners. Magic: The Gathering and related names and images belong to Wizards of the Coast. MetaForge is not affiliated with or endorsed by Wizards of the Coast.</p></section>
      <section><h2>Affiliate disclosure</h2><p>Some card or product links may be affiliate links. MetaForge may receive compensation when you follow or purchase through those links, at no additional cost to you. Compensation does not guarantee that a recommendation is appropriate for your deck.</p></section>
      <section><h2>Availability and liability</h2><p>The alpha is provided “as is” and “as available” without warranties. To the extent allowed by law, MetaForge is not liable for indirect losses, lost data, purchases, event results, or decisions based on generated recommendations.</p></section>
      <section><h2>Changes</h2><p>These terms may be updated as MetaForge approaches general availability. Continued use after an update means you accept the revised terms.</p></section>
    </article><footer className="legal-links"><a href="/">Return to the Forge</a><a href="/privacy">Privacy Policy</a><a href="mailto:support@metaforge.gg">Support</a></footer>
  </div></main>;
}
