'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Wallet, ShieldAlert, Plus, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { SlidePanel } from '@/components/ui/SlidePanel';
import toast from 'react-hot-toast';

const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(val);

const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        throw new Error(info.message || 'An error occurred');
    }
    return res.json();
};

interface ROIRecord {
    vehicleId: string;
    licensePlate: string;
    revenue: number;
    expenses: number;
    netROI: number;
}

export default function FinancePage() {
    const { data: roiData, error, mutate } = useSWR<ROIRecord[]>(`/api/analytics/fleet-roi`, fetcher);

    // Need vehicles for the "Log Fuel" dropdown
    const { data: vehicles } = useSWR<any[]>(`/api/vehicles`, fetcher);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [formData, setFormData] = useState({
        vehicleId: '', liters: 0, cost: 0, date: new Date().toISOString().substring(0, 10)
    });

    const openLogFuel = () => {
        setFormData({ vehicleId: '', liters: 50, cost: 80, date: new Date().toISOString().substring(0, 10) });
        setIsPanelOpen(true);
    };

    const submitLogFuel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/finance/fuel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    liters: Number(formData.liters),
                    cost: Number(formData.cost)
                }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error((await res.json()).message || 'Failed to log fuel');

            // Toast and mutation is handled globally by SocketProvider listening to 'fuel.logged'
            // But we can eagerly trigger it too just in case
            mutate();
            setIsPanelOpen(false);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const normalizedRoi = (roiData ?? []).map((v) => {
        const revenue = Number(v?.revenue ?? 0);
        const expenses = Number(v?.expenses ?? 0);
        const netROI = Number(v?.netROI ?? revenue - expenses);
        const licensePlate = v?.licensePlate || v?.vehicleId?.substring(0, 8) || 'Unknown';
        return { ...v, revenue, expenses, netROI, licensePlate };
    });

    const totalRevenue = normalizedRoi.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExpenses = normalizedRoi.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalNet = totalRevenue - totalExpenses;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Financial Ledgers</h1>
                    <p className="text-neutral-400">Track fuel costs and vehicle lifetime ROI</p>
                </div>
                <button
                    onClick={openLogFuel}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all font-medium text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Fuel Receipt
                </button>
            </div>

            {error ? (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0" />
                    <p>You do not have permission to view financial metrics (Requires FINANCE role or higher).</p>
                </div>
            ) : !roiData ? (
                <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 p-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Top Aggregates Layer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4">
                            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-neutral-400 text-sm font-medium mb-1">Gross Fleet Revenue</h3>
                                <div className="text-2xl font-bold text-white">{formatINR(totalRevenue)}</div>
                            </div>
                        </div>

                        <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4">
                            <div className="p-3 bg-red-500/10 text-red-400 rounded-xl">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-neutral-400 text-sm font-medium mb-1">Total Operating Expenses</h3>
                                <div className="text-2xl font-bold text-white">{formatINR(totalExpenses)}</div>
                            </div>
                        </div>

                        <div className="bg-neutral-800/30 p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="flex items-start space-x-4 relative">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-neutral-400 text-sm font-medium mb-1">Net Fleet ROI</h3>
                                    <div className={`text-3xl font-bold ${totalNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {totalNet >= 0 ? '+' : '-'}{formatINR(Math.abs(totalNet))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Cost Breakdown */}
                    <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 overflow-hidden">
                        <div className="p-6 border-b border-neutral-800 flex items-center mb-0">
                            <Wallet className="w-5 h-5 text-neutral-400 mr-2" />
                            <h2 className="text-lg font-semibold text-white">Cost per Vehicle Summary</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-neutral-900/50 text-neutral-400 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Identification</th>
                                        <th className="px-6 py-4 text-right">Lifetime Revenue</th>
                                        <th className="px-6 py-4 text-right">Lifetime Expenses</th>
                                        <th className="px-6 py-4 text-right">Net ROI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/50">
                                    {normalizedRoi.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                                                No financial data points recorded yet.
                                            </td>
                                        </tr>
                                    ) : normalizedRoi.map(v => (
                                        <tr key={v.vehicleId} className="hover:bg-neutral-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-white">{v.licensePlate}</div>
                                                <div className="text-xs font-mono text-neutral-500 mt-0.5">{v.vehicleId.substring(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-neutral-300">
                                                {formatINR(v.revenue)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-red-400">
                                                -{formatINR(v.expenses)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex font-mono items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${v.netROI >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                                                    {v.netROI >= 0 ? '+' : '-'}{formatINR(Math.abs(v.netROI))}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <SlidePanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                title="Log Fuel Receipt"
            >
                <form onSubmit={submitLogFuel} className="space-y-5 mt-2">

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Select Vehicle</label>
                        <select required value={formData.vehicleId} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all appearance-none text-neutral-300">
                            <option value="" disabled>Select vehicle...</option>
                            {vehicles?.map(v => (
                                <option key={v.id} value={v.id}>{v.licensePlate} ({v.make} {v.model})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Volume (Liters)</label>
                            <input type="number" required min="1" step="0.1" value={formData.liters} onChange={e => setFormData({ ...formData, liters: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all text-neutral-300" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Total Cost ($)</label>
                            <input type="number" required min="0.01" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all text-neutral-300" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Refueling Date</label>
                        <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-emerald-500 outline-none text-sm transition-all [color-scheme:dark] text-neutral-300" />
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            Record Transaction
                        </button>
                    </div>
                </form>
            </SlidePanel>
        </div>
    );
}
