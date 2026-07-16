import assert from "node:assert/strict";
import test from "node:test";
import { discoverOfficialLinks, extractSourceMetadata } from "../app/data-goblin-discovery.mjs";
test("goblins retain relevant same-origin sources only",()=>{const html='<a href="/en/news/event/championship">A</a><a href="https://evil.example/interview">B</a><a href="/store">C</a>';assert.deepEqual(discoverOfficialLinks(html,"https://magic.wizards.com/en/news","magic.wizards.com"),["https://magic.wizards.com/en/news/event/championship"])});
test("goblins extract dated source metadata without scripts",()=>{const html='<html><head><meta property="og:title" content="Pro Strategy"><meta property="article:published_time" content="2026-07-15T10:00:00Z"><script>poison</script></head><body>Play to your outs.</body></html>';assert.deepEqual(extractSourceMetadata(html,"https://example.test"),{title:"Pro Strategy",published:"2026-07-15",text:"Play to your outs."})});
