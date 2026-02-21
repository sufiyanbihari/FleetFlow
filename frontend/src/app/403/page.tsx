import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Forbidden() {
    return (
        <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in mt-24">
            <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="p-8 bg-black/50 border border-red-500/20 rounded-full relative z-10">
                    <ShieldAlert className="w-24 h-24 text-red-500 animate-bounce" />
                </div>
            </div>

            <div className="text-center space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight text-white mb-2 drop-shadow-lg">
                    403 Forbidden
                </h1>
                <p className="text-xl text-neutral-400 max-w-lg mx-auto leading-relaxed">
                    Access explicitly denied. You lack the minimum clearance tier (UserRole) to cross this hierarchical boundary.
                </p>
            </div>

            <div className="p-6 bg-red-950/30 border border-red-900/50 rounded-2xl w-full max-w-md">
                <p className="text-sm font-mono text-red-400/80 mb-2">ACCESS DENIED LOG</p>
                <div className="space-y-1 text-xs text-neutral-500 font-mono">
                    <div>EVENT: INSUFFICIENT_SECURITY_CLEARANCE</div>
                    <div>STATUS: BLOCKED</div>
                    <div>TIMESTAMP: {new Date().toISOString().split('T')[0]}</div>
                </div>
            </div>

            <Link
                href="/"
                className="mt-8 flex items-center px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors gap-2"
            >
                <ArrowLeft className="w-4 h-4" />
                Return to Command Center
            </Link>
        </div>
    );
}
