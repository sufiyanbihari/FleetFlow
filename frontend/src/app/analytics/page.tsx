'use client';

import useSWR from 'swr';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { ChartErrorBoundary } from '../../components/ChartErrorBoundary';
import {
    fetcher,
    API_KEYS,
    type DashboardKPIs,
    type TripsPerDayEntry,
    type FuelTrendEntry,
    type VehicleROIEntry,
} from '../../lib/api';

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e'];

// ─── KPI Stat Card ─────────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    unit,
    sub,
}: {
    label: string;
    value: string | number;
    unit?: string;
    sub?: string;
}) {
    return (
        <div className="glass-card p-6 flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-medium">{label}</p>
            <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white tabular-nums">{value}</span>
                {unit && <span className="text-sm text-neutral-400 mb-1">{unit}</span>}
            </div>
            {sub && <p className="text-xs text-neutral-500">{sub}</p>}
        </div>
    );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-xs text-neutral-500">{description}</p>
        </div>
    );
}

// ─── Skeleton loading placeholder ──────────────────────────────────────────
function ChartSkeleton({ height = 260 }: { height?: number }) {
    return (
        <div
            className="w-full rounded-lg bg-neutral-800/40 animate-pulse"
            style={{ height }}
        />
    );
}

// ─── Tooltip styling (shared) ──────────────────────────────────────────────
const tooltipStyle = {
    contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 },
    labelStyle: { color: '#a1a1aa' },
};

// ─── Page ──────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    // SWR fetches — deduplicated, background refresh every 60s, auto-retry on failure
    const { data: kpis, error: kpiErr, isLoading: kpiLoading } = useSWR<DashboardKPIs>(
        API_KEYS.dashboard,
        fetcher,
        { refreshInterval: 60_000, revalidateOnFocus: true, shouldRetryOnError: true },
    );

    const { data: tripsPerDay = [], error: tripsErr, isLoading: tripsLoading } = useSWR<TripsPerDayEntry[]>(
        API_KEYS.tripsPerDay,
        fetcher,
        { refreshInterval: 60_000 },
    );

    const { data: fuelTrend = [], error: fuelErr, isLoading: fuelLoading } = useSWR<FuelTrendEntry[]>(
        API_KEYS.fuelTrend,
        fetcher,
        { refreshInterval: 60_000 },
    );

    const { data: fleetROI = [], error: roiErr, isLoading: roiLoading } = useSWR<VehicleROIEntry[]>(
        API_KEYS.fleetROI,
        fetcher,
        { refreshInterval: 120_000 },
    );

    const roiChartData = fleetROI.slice(0, 10).map((v) => ({
        name: v.vehicleId.slice(0, 8) + '…',
        roi: v.roi,
    }));

    return (
        <div className="space-y-8 p-4 md:p-6 overflow-y-auto h-full">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Intelligence</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Fleet KPIs · Refreshed every 60s · SWR-cached · Role: MANAGER+
                </p>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────────── */}
            {kpiErr ? (
                <div className="glass-card p-5 text-center text-red-400 text-sm">
                    ⚠️ Dashboard KPIs unavailable — {String(kpiErr.message)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {kpiLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="glass-card p-6 animate-pulse h-28 rounded-2xl bg-neutral-800/40" />
                        ))
                    ) : (
                        <>
                            <StatCard
                                label="Fleet Utilization"
                                value={kpis?.utilizationRate ?? 0}
                                unit="%"
                                sub={`${kpis?.vehiclesOnTrip ?? 0} of ${kpis?.activeFleetCount ?? 0} on trip`}
                            />
                            <StatCard
                                label="Trips Today"
                                value={kpis?.tripsToday ?? 0}
                                sub={`${kpis?.availableVehicles ?? 0} vehicles available`}
                            />
                            <StatCard
                                label="Fleet Efficiency"
                                value={kpis?.fleetEfficiencyKmPerLiter ?? '—'}
                                unit={kpis?.fleetEfficiencyKmPerLiter != null ? 'km/L' : ''}
                                sub="Last 30 days"
                            />
                            <StatCard
                                label="Drivers On Duty"
                                value={kpis?.driversOnDuty ?? 0}
                                sub={`As of ${kpis ? new Date(kpis.calculatedAt).toLocaleTimeString() : '—'}`}
                            />
                        </>
                    )}
                </div>
            )}

            {/* ── Fuel Trend ─────────────────────────────────────────────────── */}
            <ChartErrorBoundary title="Fuel Consumption Trend">
                <div className="glass-card p-6">
                    <SectionHeader
                        title="Fuel Consumption Trend"
                        description="Total liters logged per day — last 30 days"
                    />
                    {fuelLoading ? (
                        <ChartSkeleton />
                    ) : fuelErr ? (
                        <p className="text-xs text-red-400 text-center py-10">Failed to load fuel data.</p>
                    ) : fuelTrend.length === 0 ? (
                        <p className="text-xs text-neutral-500 text-center py-10">No fuel data in the last 30 days.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={fuelTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} unit=" L" />
                                <Tooltip {...tooltipStyle} itemStyle={{ color: '#22d3ee' }} />
                                <Legend wrapperStyle={{ fontSize: 12, color: '#71717a' }} />
                                <Line
                                    type="monotone"
                                    dataKey="liters"
                                    stroke="#22d3ee"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    name="Liters"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </ChartErrorBoundary>

            {/* ── Trips Per Day ──────────────────────────────────────────────── */}
            <ChartErrorBoundary title="Completed Trips Per Day">
                <div className="glass-card p-6">
                    <SectionHeader
                        title="Completed Trips Per Day"
                        description="Completed trips grouped by date — last 30 days"
                    />
                    {tripsLoading ? (
                        <ChartSkeleton />
                    ) : tripsErr ? (
                        <p className="text-xs text-red-400 text-center py-10">Failed to load trips data.</p>
                    ) : tripsPerDay.length === 0 ? (
                        <p className="text-xs text-neutral-500 text-center py-10">No completed trips in the last 30 days.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={tripsPerDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                                <Tooltip {...tooltipStyle} itemStyle={{ color: '#6366f1' }} />
                                <Legend wrapperStyle={{ fontSize: 12, color: '#71717a' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Trips" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </ChartErrorBoundary>

            {/* ── Fleet ROI ──────────────────────────────────────────────────── */}
            <ChartErrorBoundary title="Fleet ROI Comparison">
                <div className="glass-card p-6">
                    <SectionHeader
                        title="Fleet ROI Comparison"
                        description="Return on investment per vehicle — top 10 sorted descending"
                    />
                    {roiLoading ? (
                        <ChartSkeleton height={300} />
                    ) : roiErr ? (
                        <p className="text-xs text-red-400 text-center py-10">Failed to load ROI data.</p>
                    ) : roiChartData.length === 0 ? (
                        <p className="text-xs text-neutral-500 text-center py-10">No ROI data available yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={roiChartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} unit="%" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#71717a' }} width={80} />
                                <Tooltip
                                    {...tooltipStyle}
                                    formatter={(v: number | undefined) => [`${v ?? 0}%`, 'ROI']}
                                />
                                <Bar dataKey="roi" radius={[0, 4, 4, 0]} name="ROI (%)">
                                    {roiChartData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </ChartErrorBoundary>

            <p className="text-xs text-neutral-600 text-center pb-4">
                SWR auto-refresh · Background revalidation · Role required: MANAGER+
            </p>
        </div>
    );
}
