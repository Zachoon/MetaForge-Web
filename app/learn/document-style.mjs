// Layout for Learn pages. Color comes from the site tokens in globals.css.
// Standalone notes (RSS is separate; a dynamic article rendered by the
// worker) set the same token values so a document without the forge
// stylesheet still resolves var(--paper) and the rest.

export const LEARN_TOKEN_CSS = `:root{--ink:#071012;--panel:#0d1a1c;--panel2:#102326;--line:#294246;--mint:#75dbc4;--mint2:#b9f5e6;--amber:#e39a48;--paper:#edf5f1;--muted:#91a7a5}`;

export const LEARN_LAYOUT_CSS = `
.learn-page{min-height:100vh;padding:24px 16px 72px;background:var(--ink);color:var(--paper);font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.learn-shell{width:min(100%,760px);margin-inline:auto}
.learn-brand{display:inline-flex;align-items:center;gap:10px;color:var(--paper);font-weight:800;letter-spacing:.12em;text-decoration:none}
.learn-brand i{display:grid;width:36px;height:36px;place-items:center;border:1px solid var(--amber);border-radius:50%;color:var(--amber);font-style:normal}
.learn-crumb{display:flex;flex-wrap:wrap;gap:6px 8px;margin:22px 0 0;color:var(--muted);font-size:13px}
.learn-crumb a{color:var(--amber);text-decoration:none}
.learn-kicker{margin:18px 0 0;color:var(--mint);font-size:12px;font-weight:800;letter-spacing:.14em}
.learn-page h1{margin:8px 0 0;font-family:Newsreader,Georgia,serif;font-size:clamp(34px,8vw,56px);font-weight:500;line-height:1.05}
.learn-page h2{margin:28px 0 8px;color:var(--paper);font-family:Newsreader,Georgia,serif;font-size:28px;font-weight:500;line-height:1.2}
.learn-page h3{margin:16px 0 6px;font-family:Newsreader,Georgia,serif;font-size:22px;font-weight:500}
.learn-page h3 a{color:var(--paper);text-decoration:none}
.learn-dek{margin:12px 0 0;color:var(--muted);font-size:16px;line-height:1.5}
.learn-measure{max-width:65ch}
.learn-measure p,.learn-measure li{color:var(--muted);font-size:17px;line-height:1.7}
.learn-byline{margin:14px 0 0;color:var(--amber);font-size:13px;letter-spacing:.04em}
.learn-nav{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0;padding:0;list-style:none}
.learn-nav a,.learn-tag{display:inline-flex;align-items:center;min-height:36px;padding:4px 10px;border:1px solid var(--line);border-radius:999px;color:var(--paper);font-size:13px;text-decoration:none}
.learn-nav a[aria-current="page"],.learn-tag{border-color:var(--amber);color:var(--amber)}
.learn-index{display:grid;gap:12px;margin:18px 0 0;padding:0;list-style:none}
.learn-index a{display:flex;flex-direction:column;gap:6px;padding:16px;border:1px solid var(--line);background:var(--panel);color:inherit;text-decoration:none}
.learn-index strong{color:var(--paper);font-family:Newsreader,Georgia,serif;font-size:22px;font-weight:500}
.learn-index span{color:var(--mint);font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.learn-index p{margin:0;color:var(--muted)}
.learn-tags{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.learn-quote{margin:16px 0;padding:12px 14px;border-left:3px solid var(--amber);color:var(--paper)}
.learn-oracle{margin:12px 0;padding:12px 14px;border:1px solid var(--line);background:var(--panel);white-space:pre-line;color:var(--paper);font-size:15px;line-height:1.55}
.learn-cta{margin-top:28px;padding:18px;border:1px solid var(--line);background:var(--panel)}
.learn-cta a{display:inline-flex;align-items:center;min-height:44px;margin-top:8px;padding:8px 16px;background:var(--amber);color:var(--ink);font-weight:800;text-decoration:none}
.learn-links{display:flex;flex-wrap:wrap;gap:14px;margin-top:22px;font-size:14px}
.learn-links a{color:var(--amber)}
.learn-package{margin:12px 0 0;padding:0;list-style:none}
.learn-package li{padding:6px 0;border-top:1px solid var(--line)}
.learn-empty{color:var(--muted)}
@media (min-width:720px){
  .learn-page{padding:42px 24px 88px}
  .learn-index{grid-template-columns:1fr 1fr}
}
`;
