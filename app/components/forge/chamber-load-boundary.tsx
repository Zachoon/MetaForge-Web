"use client";

import { Component, type ReactNode } from "react";

// Same phrases as STALE_CHUNK_RECOVERY_SCRIPT. React.lazy catches a failed
// dynamic import, so it often never becomes an unhandledrejection. The head
// script reloads once on vite:preloadError; when that reload is declined, or
// the rejection never reaches the window, this boundary keeps the forge shell
// mounted instead of letting the missing chunk blank the page.
const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i;

type Props = { children: ReactNode };
type State = { error: unknown };

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause = "cause" in error ? errorText(error.cause) : "";
    return `${error.message} ${cause}`;
  }
  return String(error);
}

export function isChunkLoadError(error: unknown) {
  return CHUNK_LOAD_ERROR.test(errorText(error));
}

export class ChamberLoadBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      // A real render bug is not a stale chunk. Let it surface above this
      // boundary instead of disguising it as a reload prompt.
      if (!isChunkLoadError(this.state.error)) throw this.state.error;
      return (
        <p className="chamber-loading" role="alert">
          This part of the Forge did not load.
          {" "}
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </p>
      );
    }
    return this.props.children;
  }
}
