'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Do not render Sidebar or the dashboard padding for /login and /403
    if (pathname === '/login' || pathname === '/403') {
        return <main className="w-full min-h-screen bg-black">{children}</main>;
    }

    return (
        <>
            <Sidebar />
            <main className="flex-1 h-full overflow-y-auto bg-neutral-900 shadow-inner md:rounded-l-3xl md:border-l md:border-neutral-800 shadow-2xl relative z-10 w-full">
                <div className="max-w-7xl mx-auto p-4 pt-16 md:p-8">{children}</div>
            </main>
        </>
    );
}
