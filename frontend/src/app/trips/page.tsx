'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, ArrowRight, ShieldAlert, Navigation } from 'lucide-react';
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

interface Trip {
    id: string;
    driverId: string;
    vehicleId: string;
    status: 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
    cargoWeight: number;
    origin: string;
    destination: string;
    driver?: { name: string };
    vehicle?: { licensePlate: string };
    createdAt: string;
}

export default function TripsPage() {
    const { data: trips, error, mutate } = useSWR<Trip[]>(`/api/trips`, fetcher, { refreshInterval: 0 });

    const { data: drivers } = useSWR<any[]>(`/api/drivers`, fetcher);
    const { data: vehicles } = useSWR<any[]>(`/api/vehicles`, fetcher);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [formData, setFormData] = useState({
        driverId: '', vehicleId: '', cargoWeight: 1000, origin: '', destination: '', startOdometer: 0
    });

    const openCreate = () => {
        setFormData({ driverId: '', vehicleId: '', cargoWeight: 1000, origin: '', destination: '', startOdometer: 0 });
        setIsPanelOpen(true);
    };

    const handleDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.cargoWeight > 40000) {
            toast.error('Cargo weight exceeds maximum vehicle capacity (40,000 kg)');
            return;
        }

        try {
            const res = await fetch(`/api/trips/dispatch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    cargoWeight: Number(formData.cargoWeight),
                    startOdometer: Number(formData.startOdometer),
                }),
                credentials: 'include'
            });
            const data = await res.json();

            if (res.status === 409) {
                toast.error('Conflict: Trip already dispatched (Redis Lock Working!)');
                return;
            }
            if (!res.ok) throw new Error(data.message || 'Dispatch failed');

            toast.success('Trip successfully dispatched');
            mutate();
            setIsPanelOpen(false);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/trips/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Failed to update');
            }
            mutate();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Active Dispatch</h1>
                    <p className="text-neutral-400">Monitor active routes and dispatch new trips</p>
                </div>
                <button onClick={openCreate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center shadow-lg shadow-purple-500/20 transition-all font-medium text-sm">
                    <Navigation className="w-4 h-4 mr-2" />
                    Dispatch Trip
                </button>
            </div>

            {error ? (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0" />
                    <p>You do not have permission to view trips.</p>
                </div>
            ) : !trips ? (
                <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 p-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {trips.length === 0 ? (
                        <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 p-12 text-center">
                            <p className="text-neutral-400">No trips managed. Dispatch your first trip payload.</p>
                        </div>
                    ) : (
                        trips.map((trip) => (
                            <div key={trip.id} className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 group hover:border-neutral-700 transition-colors">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm font-mono text-neutral-500 uppercase">#{trip.id.substring(0, 8)}</span>
                                        <StatusPill status={trip.status} />
                                    </div>
                                    <div className="flex items-center text-white font-medium text-lg">
                                        {trip.origin} <ArrowRight className="w-4 h-4 mx-3 text-neutral-500" /> {trip.destination}
                                    </div>
                                    <div className="text-sm text-neutral-400 flex items-center space-x-4">
                                        <span><strong className="text-neutral-300">Driver:</strong> {trip.driver?.name || trip.driverId.substring(0, 8)}</span>
                                        <span><strong className="text-neutral-300">Vehicle:</strong> {trip.vehicle?.licensePlate || trip.vehicleId.substring(0, 8)}</span>
                                        <span><strong className="text-neutral-300">Payload:</strong> {trip.cargoWeight} kg</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 border-t lg:border-t-0 lg:border-l border-neutral-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                                    {trip.status === 'DISPATCHED' && (
                                        <>
                                            <button onClick={() => updateStatus(trip.id, 'COMPLETED')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium transition-colors border border-emerald-500/20">Mark Completed</button>
                                            <button onClick={() => updateStatus(trip.id, 'CANCELLED')} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors border border-red-500/20">Cancel</button>
                                        </>
                                    )}
                                    {trip.status === 'DRAFT' && (
                                        <button onClick={() => updateStatus(trip.id, 'DISPATCHED')} className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium transition-colors border border-blue-500/20">Dispatch Now</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <SlidePanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} title="Dispatch New Trip">
                <form onSubmit={handleDispatch} className="space-y-5 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Select Vehicle</label>
                        <select required value={formData.vehicleId} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all appearance-none text-neutral-300">
                            <option value="" disabled>Select a vehicle...</option>
                            {vehicles?.filter(v => v.status === 'AVAILABLE').map(v => (
                                <option key={v.id} value={v.id}>{v.licensePlate} ({v.model})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Select Driver</label>
                        <select required value={formData.driverId} onChange={e => setFormData({ ...formData, driverId: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all appearance-none text-neutral-300">
                            <option value="" disabled>Select an available driver...</option>
                            {drivers?.filter(d => d.status === 'ON_DUTY' && new Date(d.licenseExpiry) >= new Date()).map(d => (
                                <option key={d.id} value={d.id}>{d.name} (Safety: {d.safetyScore})</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Origin</label>
                            <input required value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" placeholder="Depot A" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Destination</label>
                            <input required value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" placeholder="Warehouse B" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Cargo Weight (kg)</label>
                        <input type="number" required min="1" max="45000" value={formData.cargoWeight} onChange={e => setFormData({ ...formData, cargoWeight: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Start Odometer</label>
                        <input
                            type="number"
                            required
                            min="0"
                            value={formData.startOdometer}
                            onChange={e => setFormData({ ...formData, startOdometer: Number(e.target.value) })}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all"
                            placeholder="e.g. 120000"
                        />
                    </div>
                    <div className="pt-4 border-t border-neutral-800 text-xs text-neutral-500">
                        Note: By clicking Dispatch rapidly twice, you can verify backend Redis distributed lock protection logic (409 Conflict).
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                        Initialize Dispatch Sequence
                    </button>
                </form>
            </SlidePanel>
        </div>
    );
}
