import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "starmaj_atelier_secret_key_2026_vercel_production_security_min32chars"
);

const COOKIE_NAME = "starmaj_session";

/**
 * Next.js Edge Middleware for server-side route protection.
 * Protects sensitive administrative endpoints from unauthorized client requests.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect sensitive admin and validation API routes
  if (
    pathname.startsWith("/api/validation") ||
    (pathname.startsWith("/api/action-pricing") && request.method === "PATCH")
  ) {
    const token =
      request.cookies.get(COOKIE_NAME)?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "").trim() ||
      request.headers.get("x-starmaj-session");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé (401 Unauthorized) : Token de session requis.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (!payload || payload.role !== "admin") {
        return NextResponse.json(
          {
            success: false,
            error: "Accès interdit (403 Forbidden) : Rôle ADMIN requis.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Session invalide ou corrompue. Échec de validation du token.",
          code: "INVALID_TOKEN",
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/validation/:path*", "/api/action-pricing/:path*"],
};
