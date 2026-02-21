// Default to the local Next.js API proxy so HttpOnly auth cookies are automatically included.
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');

const buildUrl = (path: string) => {
    if (/^https?:\/\//i.test(path)) return path; // Allow absolute URLs when explicitly provided
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${normalized}`;
};

/** Thin fetch wrapper — passes session cookie, throws on non-2xx */
async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(buildUrl(path), {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`API ${res.status} on ${path}: ${err}`);
    }
    return res.json() as Promise<T>;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface DashboardKPIs {
    activeFleetCount: number;
    availableVehicles: number;
    driversOnDuty: number;
    tripsToday: number;
    utilizationRate: number;
    vehiclesOnTrip: number;
    fleetEfficiencyKmPerLiter: number | null;
    calculatedAt: string;
}

export interface TripsPerDayEntry {
    date: string;
    count: number;
}

export interface FuelTrendEntry {
    date: string;
    liters: number;
}

export interface VehicleROIEntry {
    vehicleId: string;
    licensePlate: string;
    revenue: number;
    expenses: number;
    netROI: number;
    roiPercent: number;
}

// ─── Fetcher functions (used by SWR) ─────────────────────────────────────────
// SWR calls these with the key as the argument — key doubles as the URL path.

export const fetcher = <T>(path: string) => apiFetch<T>(path);

// ─── SWR Keys (stable string constants) ─────────────────────────────────────

export const API_KEYS = {
    dashboard: '/analytics/dashboard',
    tripsPerDay: '/analytics/trips-per-day',
    fuelTrend: '/analytics/fuel-trend',
    fleetROI: '/analytics/fleet-roi',
} as const;

// ─── Legacy imperative functions (used where hooks aren't available) ──────────

export const fetchDashboard = () => apiFetch<DashboardKPIs>('/analytics/dashboard');
export const fetchTripsPerDay = () => apiFetch<TripsPerDayEntry[]>('/analytics/trips-per-day');
export const fetchFuelTrend = () => apiFetch<FuelTrendEntry[]>('/analytics/fuel-trend');
export const fetchFleetROI = () => apiFetch<VehicleROIEntry[]>('/analytics/fleet-roi');
