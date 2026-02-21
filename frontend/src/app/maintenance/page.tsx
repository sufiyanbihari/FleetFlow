'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Wrench, ShieldAlert, CheckCircle } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { SlidePanel } from '@/components/ui/SlidePanel';
import toast from 'react-hot-toast';

const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
        const info = await res.json().catch(() => ({}));
        throw new Error(info.message || 'An error occurred');
    }
    return res.json();
};

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    status: 'AVAILABLE' | 'ON_TRIP' | 'IN_SHOP' | 'RETIRED';
    vin: string;
}

export default function MaintenancePage() {
    const { data: vehicles, error, mutate } = useSWR<Vehicle[]>(`/api/vehicles`, fetcher);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    const [formData, setFormData] = useState({
        type: 'ROUTINE', cost: 0, description: '', serviceDate: new Date().toISOString().substring(0, 10)
    });

    const openLogService = (v: Vehicle) => {
        setSelectedVehicle(v);
        setFormData({ type: 'ROUTINE', cost: 150, description: 'Oil change and tire rotation', serviceDate: new Date().toISOString().substring(0, 10) });
        setIsPanelOpen(true);
    };

    const submitLogService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle) return;

        // Optimistic Update
        mutate(vehicles?.map(veh => veh.id === selectedVehicle.id ? { ...veh, status: 'IN_SHOP' } : veh), false);

        try {
            const res = await fetch(`/api/maintenance/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, vehicleId: selectedVehicle.id, cost: Number(formData.cost) }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error((await res.json()).message || 'Failed to start maintenance');

            // Toast handles success globally in SocketProvider
            mutate();
            setIsPanelOpen(false);
        } catch (err: any) {
            toast.error(err.message);
            mutate(); // Revert
        }
    };

    const completeMaintenance = async (v: Vehicle) => {
        // Optimistic Update
        mutate(vehicles?.map(veh => veh.id === v.id ? { ...veh, status: 'AVAILABLE' } : veh), false);

        try {
            const res = await fetch(`/api/maintenance/${v.id}/complete`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to complete maintenance');

            // Toasts handled in SocketProvider
            mutate();
        } catch (err: any) {
            toast.error('Could not complete maintenance');
            mutate();
        }
    };

    const vehiclesInShop = vehicles?.filter(v => v.status === 'IN_SHOP') || [];
    const activeVehicles = vehicles?.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_TRIP') || [];

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Maintenance Fleet</h1>
                <p className="text-neutral-400">Log service records and monitor shop statuses</p>
            </div>

            {error ? (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0" />
                    <p>You do not have permission to view or log maintenance.</p>
                </div>
            ) : !vehicles ? (
                <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 p-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {/* Active Shop Layer */}
                    <div className="bg-neutral-800/30 rounded-2xl border border-amber-500/20 overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
                        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-amber-500/5">
                            <h2 className="text-lg font-semibold text-white flex items-center">
                                <Wrench className="w-5 h-5 text-amber-500 mr-2" />
                                Currently IN_SHOP
                            </h2>
                            <span className="bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full">
                                {vehiclesInShop.length} Vehicles
                            </span>
                        </div>

                        <div className="divide-y divide-neutral-800/50">
                            {vehiclesInShop.length === 0 ? (
                                <div className="p-8 text-center text-neutral-500">No vehicles in shop.</div>
                            ) : (
                                vehiclesInShop.map(v => (
                                    <div key={v.id} className="p-4 px-6 flex items-center justify-between hover:bg-neutral-800/30 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-lg">{v.licensePlate}</span>
                                            <span className="text-sm text-neutral-400">{v.year} {v.make} {v.model}</span>
                                        </div>
                                        <button
                                            onClick={() => completeMaintenance(v)}
                                            className="flex items-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="font-medium text-sm">Complete Service</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Available Roster */}
                    <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 overflow-hidden">
                        <div className="p-6 border-b border-neutral-800">
                            <h2 className="text-lg font-semibold text-white">Active Fleet (Requires Maintenance?)</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-neutral-900/50 text-neutral-400 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Vehicle</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/50">
                                    {activeVehicles.map(v => (
                                        <tr key={v.id} className="hover:bg-neutral-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-white">{v.licensePlate}</div>
                                                <div className="text-xs text-neutral-500 mt-0.5">{v.year} {v.make}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusPill status={v.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openLogService(v)}
                                                    disabled={v.status === 'ON_TRIP'}
                                                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-amber-400 rounded-xl text-sm font-medium transition-colors border border-amber-500/20"
                                                >
                                                    Log Service
                                                </button>
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
                title="Log Maintenance Service"
            >
                <form onSubmit={submitLogService} className="space-y-5 mt-2">

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3 mb-6">
                        <Wrench className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-amber-500 font-semibold text-sm">Service targeting: {selectedVehicle?.licensePlate}</h4>
                            <p className="text-amber-500/70 text-xs mt-1">This will immediately tag the vehicle as IN_SHOP and block it from trip dispatching.</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Service Type</label>
                        <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all appearance-none text-neutral-300">
                            <option value="ROUTINE">Routine Maintenance</option>
                            <option value="REPAIR">Emergency Repair</option>
                            <option value="INSPECTION">Annual Inspection</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Description of Service</label>
                        <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all min-h-[100px] text-neutral-300" placeholder="Replaced brake pads and fluid." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Estimated Cost ($)</label>
                            <input type="number" required min="0" value={formData.cost} onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all text-neutral-300" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Date Logged</label>
                            <input type="date" required value={formData.serviceDate} onChange={e => setFormData({ ...formData, serviceDate: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all [color-scheme:dark] text-neutral-300" />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            Submit & Tag IN_SHOP
                        </button>
                    </div>
                </form>
            </SlidePanel>
        </div>
    );
}
