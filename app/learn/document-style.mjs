// Standalone articles (the worker returns a full document, with no Next
// stylesheet) use the same class names as the shared frame: header, trail,
// 42rem shell, bronze card, 65ch measure. React pages load those rules from
// design-system.css, legal.css, and tripo-assets.css instead.

export const LEARN_DOCUMENT_CSS = `
:root{
  --mf-void:#070908;--mf-surface-0:#0c0e0c;--mf-surface-1:#14110e;--mf-surface-2:#1c1814;
  --mf-border:#6d4e32;--mf-border-strong:#a67c49;--mf-ornament:#e0b56a;--mf-ornament-dim:rgba(166,116,62,.16);
  --mf-ivory:#f3efe6;--mf-mist:#cbbba6;--mf-ink:#1a120c;
  --mf-reading-shell:42rem;--mf-reading-max:65ch;--mf-gutter:clamp(16px,2.4vw,32px);--mf-section-gap:24px;
  --mf-frame-shadow:inset 0 0 0 1px rgba(8,6,4,.9), inset 0 0 0 4px var(--mf-ornament-dim);
  --mf-page-bg:
    radial-gradient(ellipse at 50% -12%, rgba(176,112,48,.16), transparent 34rem),
    radial-gradient(ellipse at 100% 110%, rgba(62,34,16,.28), transparent 40rem),
    linear-gradient(180deg, rgba(8,9,8,.78), rgba(7,8,7,.9)),
    url("/assets/forge/hammered_iron.svg") center / 520px,
    url("/assets/forge/dark_stone.svg") center / 680px,
    var(--mf-void);
}
body{margin:0;background:var(--mf-page-bg);color:var(--mf-ivory);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.legal-page{min-height:100vh;padding:0 var(--mf-gutter) 80px;background:var(--mf-page-bg);color:var(--mf-ivory);overflow-x:clip}
.legal-shell{width:min(42rem,100%);margin:0 auto;padding-top:var(--mf-section-gap)}
.legal-card{padding:clamp(20px,4vw,40px);border:1px solid var(--mf-border);border-radius:2px;background:linear-gradient(180deg,rgba(224,181,106,.05),transparent 72px),var(--mf-surface-1);box-shadow:var(--mf-frame-shadow)}
.legal-card>small{color:var(--mf-ornament);font-size:11px;font-weight:800;letter-spacing:.16em}
.legal-card h1{margin:8px 0;color:var(--mf-ivory);font:500 clamp(32px,5vw,52px)/1.02 Newsreader,Georgia,serif;letter-spacing:-.02em;overflow-wrap:anywhere}
.legal-card h2{margin:0 0 10px;color:#f3dfc1;font:600 23px Newsreader,Georgia,serif}
.legal-card h3{margin:16px 0 6px;color:var(--mf-ivory);font:500 22px Newsreader,Georgia,serif}
.legal-card h3 a{color:var(--mf-ivory);text-decoration:none}
.legal-card .updated{margin:0 0 24px;color:var(--mf-mist);font-size:15px;line-height:1.5}
.legal-card section{padding:18px 0;border-top:1px solid #4a3828}
.legal-card p,.legal-card li{max-width:65ch;color:#d9cbb8;font-size:15px;line-height:1.65}
.legal-card a{color:var(--mf-ornament);overflow-wrap:anywhere}
.mf-site-header{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:16px;width:100%;min-height:58px;padding:0 16px;border-bottom:1px solid var(--mf-border);background:rgba(12,10,8,.94)}
.mf-brand{display:inline-flex;align-items:center;gap:10px;min-height:44px;color:var(--mf-ivory);font-weight:800;letter-spacing:.14em;text-decoration:none;white-space:nowrap}
.mf-brand img{display:block;width:34px;height:34px;object-fit:contain}
.mf-site-nav{display:flex;min-width:0;flex:1 1 auto;align-items:stretch;gap:2px;overflow-x:auto;scrollbar-width:none}
.mf-site-nav a{display:inline-flex;flex:0 0 auto;align-items:center;min-height:44px;padding:0 8px;border-bottom:2px solid transparent;color:#d9cbb8;font-size:14px;font-weight:700;text-decoration:none;white-space:nowrap}
.mf-site-nav a[aria-current="page"]{border-bottom-color:var(--mf-ornament);color:var(--mf-ivory)}
.mf-trail{display:grid;gap:12px;margin:0 0 16px}
.mf-crumbs ol{display:flex;flex-wrap:wrap;gap:6px 0;margin:0;padding:0;list-style:none;color:var(--mf-mist);font-size:13px}
.mf-crumbs li{display:inline-flex;align-items:center;min-width:0}
.mf-crumbs li+li::before{content:"/";margin:0 8px;color:#8c7360}
.mf-crumbs a{color:var(--mf-ornament);text-decoration:none}
.mf-crumbs [aria-current="page"]{color:var(--mf-ivory);overflow-wrap:anywhere}
.mf-journey{display:flex;flex-wrap:wrap;gap:8px}
.mf-journey a{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:6px 10px;border:1px solid var(--mf-border);background:var(--mf-surface-1);box-shadow:inset 0 0 0 1px rgba(8,6,4,.65);color:var(--mf-ivory);font-size:13px;font-weight:650;text-decoration:none}
.mf-journey b{display:grid;width:20px;height:20px;place-items:center;border:1px solid var(--mf-border-strong);border-radius:50%;color:var(--mf-ornament);font-size:11px}
.learn-quote{margin:16px 0;padding:12px 14px;border:1px solid var(--mf-border);border-left:3px solid var(--mf-ornament);background:var(--mf-surface-2);box-shadow:var(--mf-frame-shadow);color:var(--mf-ivory)}
.learn-oracle{display:block;max-width:100%;margin:12px 0;padding:12px 14px;border:1px solid var(--mf-border);background:var(--mf-surface-0);box-shadow:var(--mf-frame-shadow);color:var(--mf-ivory);font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;overflow-x:hidden}
.learn-cta{margin-top:8px;padding:18px;border:1px solid var(--mf-border-strong);background:linear-gradient(180deg,rgba(224,181,106,.12),transparent 72%),var(--mf-surface-2);box-shadow:var(--mf-frame-shadow)}
.learn-cta a{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:10px 16px;background:var(--mf-ornament);color:var(--mf-ink);font-weight:800;text-decoration:none}
@media(min-width:720px){
  .mf-trail{padding-right:48px;background:url("/assets/forge/tripo/prop_hammer-512.webp") right center / 36px no-repeat}
}
@media(max-width:720px){
  .mf-site-header{align-items:stretch;flex-wrap:wrap;height:98px;min-height:98px;padding:0 12px}
  .mf-brand{height:54px}
  .mf-site-nav{flex:1 0 100%;height:44px}
}
`;
