import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      nav={{
        title: "next-typed-cache",
      }}
      tree={source.pageTree}
    >
      {children}
    </DocsLayout>
  );
}
