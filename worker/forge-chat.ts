import { userKey } from "./account-bench";
import { nativeCoachAnswer } from "./native-coach";
interface ChatEnv { DB: D1Database; OPENAI_API_KEY?: string; OPENAI_MODEL?: string; METAFORGE_FOUNDER_USER_KEY?: string }
type ChatMessage = { role: "user" | "assistant"; content: string };
const SYSTEM = `You are the MetaForge Coach, a rigorous trading-card-game strategy teacher. The current game is supplied in context. Never transfer one game's rules, cards, terminology, legality, or match evidence into another. Teach rather than dictate. Separate verified facts and match evidence from hypotheses. Never invent card text, legality, tournament results, prices, rules, or win rates. If current facts are missing, say what must be verified. Respect the requested format, goals, and play style. Personal match results are evidence about this player and revision, not proof of universal strength.

For a play decision, reason in this order: identify legal candidate lines; determine the current role (aggressor, defender, or pivot) from clocks, board, and inevitability; estimate the opponent range from observations rather than omniscience; compare tempo, card economy, board control, resource efficiency, pressure, reach, information, flexibility, synergy, inevitability, downside, and terminal outcomes; test the preferred line against the most credible punishments; state assumptions and missing state; explain the strongest alternative and what evidence would reverse the choice. Label close decisions as close. Never claim a line was wrong from the match result alone. Never imply that this text analysis is a rules-complete game simulation.`;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function handleForgeChat(request: Request, env: ChatEnv) {
  const key = await userKey(request);
  if (!key) return json({ error: "Authenticated account required" }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let payload: any; try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const messages: ChatMessage[] = Array.isArray(payload.messages) ? payload.messages.slice(-12).filter((m: any) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 2500) })) : [];
  if (!messages.length || messages.at(-1)?.role !== "user") return json({ error: "A user message is required" }, 400);
  const c = payload.context && typeof payload.context === "object" ? payload.context : {};
  if(!env.OPENAI_API_KEY)return json({answer:nativeCoachAnswer(messages,c),model:"metaforge-native-v1",remaining:null,resetAt:null,evidenceBoundary:"Deterministic local reasoning from the supplied deck and verified card facts; no model call was made."});
  const now = new Date(), day = (now.getUTCDay() + 6) % 7;
  const week = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day)).toISOString().slice(0,10);
  const reset = new Date(`${week}T00:00:00.000Z`); reset.setUTCDate(reset.getUTCDate() + 7);
  const founder = key === env.METAFORGE_FOUNDER_USER_KEY;
  let used = 0;
  if (!founder) {
    await env.DB.prepare("INSERT OR IGNORE INTO forge_chat_usage (user_key, week_start, questions) VALUES (?, ?, 0)").bind(key, week).run();
    const row = await env.DB.prepare("SELECT questions FROM forge_chat_usage WHERE user_key = ? AND week_start = ?").bind(key, week).first<{questions:number}>();
    used = Number(row?.questions || 0);
    if (used >= 10) return json({ error:"Weekly Forge conversation limit reached", remaining:0, resetAt:reset.toISOString() },429);
    await env.DB.prepare("UPDATE forge_chat_usage SET questions = questions + 1, updated_at = CURRENT_TIMESTAMP WHERE user_key = ? AND week_start = ?").bind(key, week).run();
    used += 1;
  }
  const context = `CURRENT USER CONTEXT\nGame: ${String(c.game || "Magic: The Gathering").slice(0,80)}\nDeck name: ${String(c.deckName || "Untitled").slice(0,120)}\nFormat: ${String(c.format || "Unknown").slice(0,60)}\nCoaching preferences: ${String(c.coachingProfile || "Not specified").slice(0,1000)}\nCurrent deck or pool:\n${String(c.deckText || "Not supplied").slice(0,14000)}`;
  const upstream = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers:{ Authorization:`Bearer ${env.OPENAI_API_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ model:env.OPENAI_MODEL || "gpt-5.6-luna", input:[{role:"system",content:SYSTEM},{role:"system",content:context},...messages], reasoning:{effort:"low"}, max_output_tokens:1800, store:false }) });
  const result:any = await upstream.json().catch(()=>({}));
  if (!upstream.ok) { if (!founder) await env.DB.prepare("UPDATE forge_chat_usage SET questions = MAX(0, questions - 1) WHERE user_key = ? AND week_start = ?").bind(key, week).run(); return json({ error:"The Forge brain could not answer", detail:result?.error?.message || "Model request failed" },502); }
  const answer = result.output_text || (result.output || []).flatMap((item:any)=>item.content || []).find((item:any)=>item.type === "output_text")?.text;
  return answer ? json({ answer, model:env.OPENAI_MODEL || "gpt-5.6-luna", remaining:founder ? null : 10-used, resetAt:reset.toISOString(), evidenceBoundary:"Personalized guidance, not automatic global training." }) : json({error:"The Forge returned no readable answer"},502);
}
