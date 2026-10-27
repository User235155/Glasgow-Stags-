import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    // libSQL ships a native binary for local SQLite files; keep it out of the bundle.
    serverExternalPackages: ["@libsql/client", "libsql"],
    // When the dev server is opened through a GitHub Codespaces URL or a VS Code
    // "forward port" link, Next would otherwise reject every form as cross-site.
    experimental:
      phase === PHASE_DEVELOPMENT_SERVER
        ? { serverActions: { allowedOrigins: ["*.app.github.dev", "**.devtunnels.ms"] } }
        : {},
  };
}
