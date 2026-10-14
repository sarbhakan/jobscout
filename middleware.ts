import { NextRequest, NextResponse } from "next/server";
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
const PUBLIC_PATHS = new Set(["/", "/connect", "/privacy", "/mcp", "/api/health", "/jobscout-widget.js"]);
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const host = request.headers.get("host") || request.nextUrl.host;
  let requestOrigin: string;
  try { requestOrigin = new URL(`${request.nextUrl.protocol}//${host}`).origin; }
  catch { return NextResponse.json({ error: "Hôte invalide." }, { status: 400 }); }
  const publicRoute = PUBLIC_PATHS.has(path) || path.startsWith("/api/web/");
  if (!publicRoute) {
    const localMode = process.env.JOBSCOUT_ENABLE_LOCAL_APP === "1" && LOCAL.has(new URL(requestOrigin).hostname);
    if (!localMode) return NextResponse.json({ error: "Cette route appartient à l'ancienne application locale." }, { status: 404 });
  }
  const site = request.headers.get("sec-fetch-site");
  if (path.startsWith("/api/") && site && site !== "same-origin" && site !== "none") return NextResponse.json({ error: "Origine externe refusée." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin) {
    let allowed = requestOrigin;
    if (process.env.JOBSCOUT_PUBLIC_URL) { try { allowed = new URL(process.env.JOBSCOUT_PUBLIC_URL).origin; } catch {} }
    if (origin !== allowed) return NextResponse.json({ error: "Origine externe refusée." }, { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (path.startsWith("/api/") || path === "/mcp") response.headers.set("Cache-Control", "no-store");
  return response;
}
