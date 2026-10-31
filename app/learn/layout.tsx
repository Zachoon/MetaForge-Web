import type { ReactNode } from "react";
import { LEARN_LAYOUT_CSS } from "./document-style.mjs";

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LEARN_LAYOUT_CSS }} />
      {children}
    </>
  );
}
