import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";

export const source = loader({
  baseUrl: "/docs",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fumadocs-mdx generated types have pnpm resolution issues
  source: (docs as any).toFumadocsSource(),
});
