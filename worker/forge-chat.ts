import { userKey } from "./account-bench";
interface ChatEnv { OPENAI_API_KEY?: string; OPENAI_MODEL?: string }
type ChatMessage = { role: "user" | "assistant"; content: string };
const SYSTEM = `You are the MetaForge Coach, an expert Magic: The Gathering deck-building teacher. Help users explore competitive and fun deck ideas, understand draft picks, and reason through card choices. Teach rather than dictate. Separate verified card or match evidence from hypotheses. Never invent card text, legality, tournament results, prices, or win rates. If current facts are missing, say what must be verified. Respect the requested format, budget, collection, goals, and play style. Give concrete card-for-card proposals only when the supplied context supports them. Explain tradeoffs and a safe test plan. Personal match results are evidence about this player and revision, not proof of universal deck strength.`;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function handleForgeChat(request: Request, env: ChatEnv) {
  if (!await userKey(request)) return json({ error: "Authenticated account required" }, 401);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.OPENAI_API_KEY) return json({ error: "Forge conversation is awaiting its model key" }, 503);
  let payload: any; try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const messages: ChatMessage[] = Array.isArray(payload.messages) ? payload.messages.slice(-12).filter((m: any) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 2500) })) : [];
  if (!messages.length || messages.at(-1)?.role !== "user") return json({ error: "A user message is required" }, 400);
  const c = payload.context && typeof payload.context === "object" ? payload.context : {};
  const context = `CURRENT USER CONTEXT\nDeck name: ${String(c.deckName || "Untitled").slice(0,120)}\nFormat: ${String(c.format || "Unknown").slice(0,60)}\nCoaching preferences: ${String(c.coachingProfile || "Not specified").slice(0,1000)}\nCurrent deck or pool:\n${String(c.deckText || "Not supplied").slice(0,14000)}`;
  const upstream = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers:{ Authorization:`Bearer ${env.OPENAI_API_KEY}`, "Content-Type":"application/json" }, body:JSON.stringify({ model:env.OPENAI_MODEL || "gpt-5.6-luna", input:[{role:"system",content:SYSTEM},{role:"system",content:context},...messages], reasoning:{effort:"low"}, max_output_tokens:1800, store:false }) });
  const result:any = await upstream.json().catch(()=>({}));
  if (!upstream.ok) return json({ error:"The Forge brain could not answer", detail:result?.error?.message || "Model request failed" },502);
  const answer = result.output_text || (result.output || []).flatMap((item:any)=>item.content || []).find((item:any)=>item.type === "output_text")?.text;
  return answer ? json({ answer, model:env.OPENAI_MODEL || "gpt-5.6-luna", evidenceBoundary:"Personalized guidance, not automatic global training." }) : json({error:"The Forge returned no readable answer"},502);
}
