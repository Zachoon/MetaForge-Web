import assert from "node:assert/strict";
import test from "node:test";
import { discoverOfficialLinks } from "../app/data-goblin-discovery.mjs";
test("goblins retain relevant same-origin sources only",()=>{const html='<a href="/en/news/event/championship">A</a><a href="https://evil.example/interview">B</a><a href="/store">C</a>';assert.deepEqual(discoverOfficialLinks(html,"https://magic.wizards.com/en/news","magic.wizards.com"),["https://magic.wizards.com/en/news/event/championship"])});
