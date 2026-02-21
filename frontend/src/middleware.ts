import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole, ROLE_HIERARCHY, MENU_ITEMS } from './constants/role-menu-map';

// ─── Lightweight JWT decoder for Edge runtime ──────────────────────────────
// NOTE: We only DECODE (no verify) in middleware because Edge runtime cannot
// run Node crypto. Signature verification happens on every backend API call
// via the JwtAuthGuard — middleware is a UX-layer redirect gate only.
//
// For full cryptographic verification in middleware, use `jose`:
//   npm install jose → jwtVerify(token, secret)
// That is the production upgrade path.
function decodeJwtPayload(token: string): { role?: string } | null {
    try {
        const [, payloadB64] = token.split('.');
        if (!payloadB64) return null;
        // Base64url → Base64 → decode
        const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        return JSON.parse(json) as { role?: string };
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Never intercept the forbidden page itself (avoid redirect loops)
    if (pathname === '/403') {
        return NextResponse.next();
    }

    const mappedRoute = MENU_ITEMS.find(
        (item) => pathname.startsWith(item.path) && item.path !== '/',
    );

    if (!mappedRoute) {
        // Public or unprotected path — pass through
        return NextResponse.next();
    }

    // ── Extract JWT from Authorization cookie (set by login response) ─────────
    // Cookie name matches what the AuthController sets:
    //   res.cookie('access_token', token, { httpOnly: true, sameSite: 'strict' })
    // Falls back to the legacy mock_role cookie during migration.
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
        // No JWT present → redirect to 403 (or /login once that page exists)
        const url = request.nextUrl.clone();
        url.pathname = '/403';
        return NextResponse.rewrite(url);
    }

    const payload = decodeJwtPayload(accessToken);

    if (!payload?.role) {
        // Malformed token structure
        const url = request.nextUrl.clone();
        url.pathname = '/403';
        return NextResponse.rewrite(url);
    }

    const activeRole = payload.role as UserRole;
    const userTier = ROLE_HIERARCHY[activeRole] ?? 0;
    const requiredTier = ROLE_HIERARCHY[mappedRoute.minimumRole];

    if (userTier < requiredTier) {
        const url = request.nextUrl.clone();
        url.pathname = '/403';
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
