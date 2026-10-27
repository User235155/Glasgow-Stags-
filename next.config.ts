import type { NextConfig } from "next";

// In GitHub Codespaces the site is opened through a forwarded URL, which Next
// would otherwise reject as a cross-site form submission.
const codespaceOrigin =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : null;

const nextConfig: NextConfig = {
  // libSQL ships a native binary for local SQLite files; keep it out of the bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: codespaceOrigin ? { serverActions: { allowedOrigins: [codespaceOrigin] } } : {},
};

export default nextConfig;
