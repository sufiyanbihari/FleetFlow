import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const targetUrl = `${BACKEND_URL}/${path}${url.search}`;

    // Forward all incoming request headers except hop-by-hop headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
        if (!['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
            headers.set(key, value);
        }
    });

    let body: BodyInit | undefined;
    if (!['GET', 'HEAD'].includes(request.method)) {
        body = await request.arrayBuffer();
    }

    try {
        const backendResponse = await fetch(targetUrl, {
            method: request.method,
            headers,
            body,
        });

        // Build the response headers, copying ALL headers EXCEPT set-cookie (handled separately)
        const responseHeaders = new Headers();
        backendResponse.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'connection', 'set-cookie'].includes(key.toLowerCase())) {
                responseHeaders.append(key, value);
            }
        });

        // ── Critical: forward each Set-Cookie header individually ──────────────
        // Headers.forEach() MERGES multiple Set-Cookie values into one
        // comma-separated string, which browsers reject. getSetCookie() returns
        // the correct array of individual cookie strings.
        const setCookies = backendResponse.headers.getSetCookie?.() ?? [];
        for (const cookie of setCookies) {
            responseHeaders.append('Set-Cookie', cookie);
        }

        const responseBody = await backendResponse.arrayBuffer();

        return new NextResponse(responseBody, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: responseHeaders,
        });
    } catch (err) {
        console.error(`[Proxy] Failed to reach backend at ${targetUrl}:`, err);
        return NextResponse.json(
            { message: 'Backend is unreachable', error: 'ECONNREFUSED' },
            { status: 503 }
        );
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(request, await params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(request, await params);
}
