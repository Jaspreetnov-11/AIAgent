import { NextResponse, type NextRequest } from "next/server";

/**
 * Makes /api/* callable from another app (Lighthouse), with two env knobs:
 *   ALLOWED_ORIGINS  comma-separated origins allowed to call the API from a browser. Empty = any origin.
 *   STUDIO_API_KEY   if set, every POST must carry header  x-api-key: <key>  (GETs stay open).
 */
export const config = { matcher: "/api/:path*" };

function corsHeaders(origin: string | null) {
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = !allowed.length || (origin && allowed.includes(origin));
  return {
    "Access-Control-Allow-Origin": ok ? (origin ?? "*") : allowed[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function middleware(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });

  const key = process.env.STUDIO_API_KEY?.trim();
  if (key && req.method === "POST" && req.headers.get("x-api-key") !== key) {
    return NextResponse.json({ error: "Missing or wrong x-api-key." }, { status: 401, headers });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
