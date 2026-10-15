"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { installClientErrorReporting, reportClientError } from "./client-error-reporter";

type Props = { children: ReactNode };
type State = { failed: boolean };

class ClientErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  componentDidMount() {
    installClientErrorReporting();
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      kind: "react",
      message: error?.message || "React render error",
      stack: `${error?.stack || ""}\n${info?.componentStack || ""}`,
    });
  }

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="client-error-fallback">
        <b>METAFORGE</b>
        <h1>This page hit an error.</h1>
        <p>Reload to continue. The report, if you allowed anonymous measurement, does not include your deck.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
      </main>;
    }
    return this.props.children;
  }
}

export default function ClientDiagnostics({ children }: Props) {
  return <ClientErrorBoundary>{children}</ClientErrorBoundary>;
}
