'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRole, MENU_ITEMS, checkAccess } from '@/constants/role-menu-map';
import {
    LayoutDashboard,
    Truck,
    Wrench,
    Wallet,
    BarChart2,
    ShieldAlert,
    Menu,
    X,
} from 'lucide-react';

import useSWR from 'swr';
import toast from 'react-hot-toast';

// ─── Role context ─────────────────────────────────────────────────────────────
// SWR fetcher for auth
const authFetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((res) => res.json());

// Reads role from the JWT access_token cookie (decoded client-side for UX only).
// Resolves from: 1) JWT cookie payload, 2) GET /auth/me via SWR, 3) null (unauthenticated)
function useUserRole(): UserRole | null {
    // 1. Try to decode the JWT cookie for instant role resolution (no network round-trip)
    const getInitialRole = (): UserRole | null => {
        if (typeof document === 'undefined') return null;
        const cookieVal = document.cookie
            .split('; ')
            .find((c) => c.startsWith('access_token='))
            ?.split('=')[1];

        if (cookieVal) {
            try {
                const [, payloadB64] = cookieVal.split('.');
                const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(atob(base64)) as { role?: string };
                if (payload.role) {
                    return payload.role as UserRole;
                }
            } catch {
                // Return null if malformed
                return null;
            }
        }
        return null;
    };

    const initialRole = getInitialRole();

    // 2. Fetch /auth/me for authoritative role using SWR
    const { data } = useSWR<{ role?: string }>(
        `/api/auth/me`,
        authFetcher,
        {
            fallbackData: initialRole ? { role: initialRole } : undefined,
            revalidateOnFocus: true,
            shouldRetryOnError: false, // Don't retry heavily if unauthenticated
        }
    );

    return (data?.role as UserRole) || null;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────
function NavIcon({ title }: { title: string }) {
    const cls = 'w-5 h-5 mr-3 flex-shrink-0';
    switch (title) {
        case 'Dashboard': return <LayoutDashboard className={cls} />;
        case 'Trip Dispatching': return <Truck className={cls} />;
        case 'Maintenance Fleet': return <Wrench className={cls} />;
        case 'Financial Logs': return <Wallet className={cls} />;
        case 'Analytics': return <BarChart2 className={cls} />;
        default: return <ShieldAlert className={cls} />;
    }
}

// ─── Navigation list ─────────────────────────────────────────────────────────
function NavLinks({ role, onNav }: { role: UserRole | null; onNav?: () => void }) {
    const pathname = usePathname();

    return (
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 px-2">
                Navigation
            </div>
            {MENU_ITEMS.map((item) => {
                const hasAccess = checkAccess(role, item);
                if (!hasAccess && role !== null) return null;

                const isActive = pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        onClick={onNav}
                        className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white border border-transparent'
                            } ${role === null ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                    >
                        <div className={isActive ? 'text-blue-400' : 'group-hover:text-emerald-400 transition-colors'}>
                            <NavIcon title={item.title} />
                        </div>
                        <span className="font-medium text-sm">{item.title}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

// ─── Sidebar footer ───────────────────────────────────────────────────────────
function SidebarFooter({ role, onLogout }: { role: UserRole | null; onLogout: () => Promise<void> }) {
    return (
        <div className="p-4 border-t border-neutral-800">
            <div className="px-4 py-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                <div suppressHydrationWarning className="text-xs text-neutral-400 mb-1">
                    {role ? `Signed in as ${role}` : 'Authenticating...'}
                </div>
                <div className="text-[10px] text-neutral-500">
                    Authorization Matrix v3.0 · JWT-secured
                </div>
                <button
                    onClick={onLogout}
                    className="mt-3 w-full text-xs font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md py-2 transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

// ─── Brand header ─────────────────────────────────────────────────────────────
function Brand() {
    return (
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    FleetFlow OS
                </h1>
                <div className="mt-1 text-xs font-mono text-neutral-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    Operational
                </div>
            </div>
        </div>
    );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────
function DesktopSidebar({ role, onLogout }: { role: UserRole | null; onLogout: () => Promise<void> }) {
    return (
        <aside className="hidden md:flex w-64 h-screen bg-neutral-900 border-r border-neutral-800 text-white flex-col flex-shrink-0">
            <Brand />
            <NavLinks role={role} />
            <SidebarFooter role={role} onLogout={onLogout} />
        </aside>
    );
}

// ─── Mobile Drawer Sidebar ────────────────────────────────────────────────────
function MobileDrawer({ role, onLogout }: { role: UserRole | null; onLogout: () => Promise<void> }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Close drawer on route change
    useEffect(() => { setOpen(false); }, [pathname]);

    return (
        <>
            {/* Hamburger trigger — visible on mobile only */}
            <button
                aria-label="Open navigation"
                onClick={() => setOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Drawer panel */}
            <aside
                className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-neutral-900 border-r border-neutral-800 text-white flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        FleetFlow OS
                    </h1>
                    <button
                        aria-label="Close navigation"
                        onClick={() => setOpen(false)}
                        className="p-1 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <NavLinks role={role} onNav={() => setOpen(false)} />
                <SidebarFooter role={role} onLogout={onLogout} />
            </aside>
        </>
    );
}

// ─── Public export ─────────────────────────────────────────────────────────────
export default function Sidebar() {
    const role = useUserRole();
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
            toast.success('Logged out');
        } catch (err: any) {
            toast.error(err.message || 'Logout failed');
        } finally {
            window.location.href = '/login';
        }
    };
    return (
        <>
            <DesktopSidebar role={role} onLogout={handleLogout} />
            <MobileDrawer role={role} onLogout={handleLogout} />
        </>
    );
}
