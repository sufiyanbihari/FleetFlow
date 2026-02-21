import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole, ROLE_HIERARCHY, MENU_ITEMS, checkAccess } from './constants/role-menu-map';

// ─── Cryptographic JWT verification for Edge runtime ─────────────────────────
import { jwtVerify } from 'jose';

async function verifyJwtPayload(token: string): Promise<{ role?: string } | null> {
    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_for_dev_only');
        const { payload } = await jwtVerify(token, secret);
        return payload as { role?: string };
    } catch (e) {
        console.error('JWT Verification failed in middleware:', e);
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/403') {
        return NextResponse.next();
    }

    const accessToken = request.cookies.get('access_token')?.value;

    if (pathname === '/login') {
        if (accessToken) {
            const payload = await verifyJwtPayload(accessToken);
            if (payload?.role) {
                const url = request.nextUrl.clone();
                url.pathname = '/';
                return NextResponse.redirect(url);
            }
        }
        return NextResponse.next();
    }

    // Protect all MENU_ITEMS routes. Note: '/' matches exactly to dashboard.
    const mappedRoute = MENU_ITEMS.find(
        (item) => item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
    );

    if (!mappedRoute) {
        // Unprotected path (not in menu)
        return NextResponse.next();
    }

    if (!accessToken) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    const payload = await verifyJwtPayload(accessToken);

    if (!payload?.role) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    const activeRole = payload.role as UserRole;
    const userTier = ROLE_HIERARCHY[activeRole] ?? 0;
    const requiredTier = ROLE_HIERARCHY[mappedRoute.minimumRole];
    const hasMenuAccess = checkAccess(activeRole, mappedRoute);

    if (userTier < requiredTier || !hasMenuAccess) {
        const url = request.nextUrl.clone();
        url.pathname = '/403';
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
