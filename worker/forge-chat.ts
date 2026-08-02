import { userKey } from "./account-bench";
import { nativeCoachAnswer } from "./native-coach";
interface ChatEnv { DB: D1Database; METAFORGE_FOUNDER_USER_KEY?: string }
type ChatMessage = { role: "user" | "assistant"; content: string };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function handleForgeChat(request: Request, env: ChatEnv) {
  const key = await userKey(request, env);
  if (!key) return json({ error: "Authenticated account required" }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let payload: any; try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const messages: ChatMessage[] = Array.isArray(payload.messages) ? payload.messages.slice(-12).filter((m: any) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 2500) })) : [];
  if (!messages.length || messages.at(-1)?.role !== "user") return json({ error: "A user message is required" }, 400);
  const c = payload.context && typeof payload.context === "object" ? payload.context : {};
  // Deck repair/generation needs a full replacement decklist, which the deterministic
  // native coach does not produce; MetaForge no longer calls an external model for it.
  if (payload.task === "deck_generation") return json({ error: "Automatic repair is not available; the flagged cards need a manual edit." }, 503);
  return json({
    answer: nativeCoachAnswer(messages, c),
    model: "metaforge-native-v1",
    remaining: null,
    resetAt: null,
    evidenceBoundary: "Deterministic local reasoning from the supplied deck and verified card facts; no model call was made.",
  });
}
