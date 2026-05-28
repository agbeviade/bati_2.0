import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimit } from "@/lib/rate-limit";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate-limiting sur toutes les routes /api/* ──────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    // Limites par route type :
    // - IA (lourdes) : 20 req/min
    // - PDF          : 30 req/min
    // - Autres API   : 60 req/min
    const isAi = pathname.startsWith("/api/ai/");
    const isPdf = pathname.startsWith("/api/pdf/");
    const max = isAi ? 20 : isPdf ? 30 : 60;

    const allowed = await rateLimit(`${ip}:${pathname}`, max, 60_000);
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Trop de requêtes. Réessayez dans 1 minute." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }
  }

  // ── Auth Supabase (pour toutes les autres routes) ───────────────────────
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Appliqué à toutes les routes sauf :
     * - _next/static  (fichiers statiques)
     * - _next/image   (optimisation images)
     * - favicon.ico, .png, .svg, .webp, .jpg, .jpeg
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|webp|jpg|jpeg)$).*)",
  ],
};
