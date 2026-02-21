import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type StatusType =
    | 'AVAILABLE'
    | 'ON_TRIP'
    | 'IN_SHOP'
    | 'RETIRED'
    | 'ON_DUTY'
    | 'OFF_DUTY'
    | 'SUSPENDED'
    | 'DRAFT'
    | 'DISPATCHED'
    | 'COMPLETED'
    | 'CANCELLED';

export function StatusPill({ status, className }: { status: StatusType; className?: string }) {
    const getStyles = (s: StatusType) => {
        switch (s) {
            // Green
            case 'AVAILABLE':
            case 'ON_DUTY':
            case 'COMPLETED':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            // Blue
            case 'ON_TRIP':
            case 'DISPATCHED':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            // Yellow
            case 'IN_SHOP':
            case 'DRAFT':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            // Red/Gray
            case 'SUSPENDED':
            case 'CANCELLED':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'RETIRED':
            case 'OFF_DUTY':
                return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
            default:
                return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
        }
    };

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            getStyles(status),
            className
        )}>
            {status.replace('_', ' ')}
        </span>
    );
}
