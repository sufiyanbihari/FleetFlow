'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Edit2, ShieldAlert, AlertTriangle } from 'lucide-react';
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

interface Driver {
    id: string;
    name: string;
    licenseNumber: string;
    licenseExpiry: string;
    status: 'AVAILABLE' | 'ON_DUTY' | 'OFF_DUTY' | 'SUSPENDED';
    safetyScore: number;
}

export default function DriversPage() {
    const { data: drivers, error, mutate } = useSWR<Driver[]>(`/api/drivers`, fetcher);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    const [formData, setFormData] = useState({
        name: '', licenseNumber: '', licenseExpiry: '', status: 'AVAILABLE', safetyScore: 100
    });

    const openCreate = () => {
        setEditingDriver(null);
        setFormData({ name: '', licenseNumber: '', licenseExpiry: '', status: 'AVAILABLE', safetyScore: 100 });
        setIsPanelOpen(true);
    };

    const openEdit = (d: Driver) => {
        setEditingDriver(d);
        setFormData({
            name: d.name,
            licenseNumber: d.licenseNumber,
            licenseExpiry: d.licenseExpiry.substring(0, 10), // format for input type="date"
            status: d.status,
            safetyScore: d.safetyScore
        });
        setIsPanelOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingDriver ? `/api/drivers/${editingDriver.id}` : `/api/drivers`;
        const method = editingDriver ? 'PATCH' : 'POST';

        const promise = fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, safetyScore: Number(formData.safetyScore) }),
            credentials: 'include'
        }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to save driver');
            mutate();
            setIsPanelOpen(false);
        });

        toast.promise(promise, {
            loading: 'Saving driver...',
            success: 'Driver saved successfully',
            error: (err) => err.message
        });
    };

    // UX Check: Is license expired?
    const isExpired = (expiryDate: string) => {
        return new Date(expiryDate) < new Date();
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Driver Roster</h1>
                    <p className="text-neutral-400">Manage personnel, safety scores, and certifications</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center shadow-lg shadow-purple-500/20 transition-all font-medium text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Driver
                </button>
            </div>

            {error ? (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0" />
                    <p>You do not have permission to view the driver roster.</p>
                </div>
            ) : !drivers ? (
                <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 p-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drivers.map((d) => {
                        const expired = isExpired(d.licenseExpiry);
                        const actuallySuspended = d.status === 'SUSPENDED' || expired;

                        return (
                            <div key={d.id} className={`bg-neutral-800/30 p-6 rounded-2xl border ${expired ? 'border-red-500/30 ring-1 ring-red-500/20' : 'border-neutral-800'} relative overflow-hidden group hover:border-neutral-700 transition-colors`}>

                                {/* Expired Visual Warning Overlay */}
                                {expired && (
                                    <div className="absolute top-0 right-0 left-0 bg-red-500/10 text-red-400 text-xs font-semibold px-4 py-1.5 flex items-center justify-center border-b border-red-500/20">
                                        <AlertTriangle className="w-3 h-3 mr-1.5" />
                                        LICENSE EXPIRED — ASSIGNMENT BLOCKED
                                    </div>
                                )}

                                <div className={`flex justify-between items-start ${expired ? 'mt-8' : ''}`}>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{d.name}</h3>
                                        <div className="text-sm font-mono text-neutral-500 mt-1">ID: {d.licenseNumber}</div>
                                    </div>
                                    <button onClick={() => openEdit(d)} className="p-1.5 bg-neutral-800/50 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-700/50 opacity-0 group-hover:opacity-100">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="mt-6 flex flex-wrap gap-2">
                                    <StatusPill status={actuallySuspended ? 'SUSPENDED' : d.status} />

                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${d.safetyScore >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        d.safetyScore >= 75 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        Safety: {d.safetyScore}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-neutral-800/50 flex justify-between items-center text-sm">
                                    <span className="text-neutral-500">License Expiry</span>
                                    <span className={`font-medium ${expired ? 'text-red-400' : 'text-neutral-300'}`}>
                                        {new Date(d.licenseExpiry).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <SlidePanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                title={editingDriver ? "Edit Driver" : "Add Driver"}
            >
                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Full Name</label>
                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" placeholder="John Doe" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">License Number</label>
                        <input required value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm font-mono uppercase transition-all" placeholder="DL-XXX-YYY" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">License Expiration Date</label>
                        <input type="date" required value={formData.licenseExpiry} onChange={e => setFormData({ ...formData, licenseExpiry: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all text-neutral-300 [color-scheme:dark]" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Operating Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all text-neutral-300 appearance-none">
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="OFF_DUTY">OFF DUTY</option>
                                <option value="SUSPENDED">SUSPENDED</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Initial Safety Score</label>
                            <input type="number" required min="0" max="100" value={formData.safetyScore} onChange={e => setFormData({ ...formData, safetyScore: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-purple-500/20">
                            {editingDriver ? 'Update Driver' : 'Register Driver'}
                        </button>
                    </div>
                </form>
            </SlidePanel>
        </div>
    );
}
