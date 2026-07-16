/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleAccountBench, handleFounderFeedback, handlePlayerProfile } from "./account-bench";
import { handleFounderOverview } from "./founder-dashboard";
import { handleForgeChat } from "./forge-chat";
import { handleCoachingKnowledge } from "./coaching-knowledge";
import { ensureDataGoblinsStarted, handleGoblinOperations, runDataGoblins } from "./data-goblins";
const BUILD_ID = "2026.07.16-coachloop1";

interface Env {
  ASSETS: Fetcher;
  METAFORGE_BOOTSTRAP_LOCK?: string;
  METAFORGE_FOUNDER_USER_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (env.METAFORGE_BOOTSTRAP_LOCK !== "unlocked") {
      return new Response("MetaForge private alpha is locked while access controls are configured.", {
        status: 403,
        headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const url = new URL(request.url);

    if (url.pathname === "/api/account/deck-bench") {
      return handleAccountBench(request, env);
    }
    if (url.pathname === "/api/account/feedback") {
      return handleFounderFeedback(request, env);
    }
    if (url.pathname === "/api/account/player-profile") return handlePlayerProfile(request, env);
    if (url.pathname === "/api/founder/overview") {
      return handleFounderOverview(request, env);
    }
    if (url.pathname === "/api/forge/chat") return handleForgeChat(request, env);
    if (url.pathname === "/api/forge/status") {ctx.waitUntil(ensureDataGoblinsStarted(env));return Response.json({ready:true,build:BUILD_ID,modelReady:Boolean(env.OPENAI_API_KEY),mode:env.OPENAI_API_KEY?"model":"native",fallback:"MetaForge Native Coach remains available without a model call"},{headers:{"Cache-Control":"no-store"}})}
    if (url.pathname === "/api/founder/knowledge") return handleCoachingKnowledge(request, env, true);
    if (url.pathname === "/api/coach/knowledge") return handleCoachingKnowledge(request, env, false);
    if (url.pathname === "/api/founder/goblins") return handleGoblinOperations(request, env);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
  async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(runDataGoblins(env));},
};

export default worker;
