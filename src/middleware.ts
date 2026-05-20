import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-bolao-copa"
);

const PROTECTED_TENANT_AREAS = new Set([
  "palpites",
  "ranking",
  "admin",
  "grupos",
  "jogo",
]);

const PUBLIC_TENANT_AREAS = new Set(["login", "register"]);

async function readSession(
  req: NextRequest
): Promise<JWTPayload | null> {
  const token = req.cookies.get("bolao_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segs = pathname.split("/").filter(Boolean);

  // Super-admin area
  if (segs[0] === "superadmin") {
    if (segs[1] === "login") return NextResponse.next();
    const session = await readSession(req);
    if (!session?.isSuperAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/superadmin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Tenant routes: /<slug>/<area>/...
  if (segs.length >= 2) {
    const slug = segs[0];
    const area = segs[1];

    if (PUBLIC_TENANT_AREAS.has(area)) return NextResponse.next();

    if (PROTECTED_TENANT_AREAS.has(area)) {
      const session = await readSession(req);
      if (!session) {
        const url = req.nextUrl.clone();
        url.pathname = `/${slug}/login`;
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      if (session.tenantSlug !== slug) {
        const url = req.nextUrl.clone();
        url.pathname = `/${slug}/login`;
        return NextResponse.redirect(url);
      }
      if (area === "admin" && !session.isAdmin) {
        const url = req.nextUrl.clone();
        url.pathname = `/${slug}/palpites`;
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  // Skip static files, Next internals, API and asset files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|teams/).*)"],
};
