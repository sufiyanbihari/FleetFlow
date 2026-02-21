'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Edit2, ShieldAlert } from 'lucide-react';
import { StatusPill, StatusType } from '@/components/ui/StatusPill';
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
    name: string;
    model: string;
    licensePlate: string;
    maxCapacityKg: number;
    odometer: number;
    acquisitionCost: number;
    status: StatusType;
}

export default function VehiclesPage() {
    const { data: vehicles, error, mutate } = useSWR<Vehicle[]>(`/api/vehicles`, fetcher);

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    const [formData, setFormData] = useState({
        name: '', model: '', licensePlate: '', maxCapacityKg: 40000, odometer: 0, acquisitionCost: 150000
    });

    const openCreate = () => {
        setEditingVehicle(null);
        setFormData({ name: '', model: '', licensePlate: '', maxCapacityKg: 40000, odometer: 0, acquisitionCost: 150000 });
        setIsPanelOpen(true);
    };

    const openEdit = (v: Vehicle) => {
        setEditingVehicle(v);
        setFormData({
            name: v.name,
            model: v.model,
            licensePlate: v.licensePlate,
            maxCapacityKg: v.maxCapacityKg,
            odometer: v.odometer,
            acquisitionCost: v.acquisitionCost
        });
        setIsPanelOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : `/api/vehicles`;
        const method = editingVehicle ? 'PATCH' : 'POST';

        const promise = fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                maxCapacityKg: Number(formData.maxCapacityKg),
                odometer: Number(formData.odometer),
                acquisitionCost: Number(formData.acquisitionCost)
            }),
            credentials: 'include'
        }).then(async (res) => {
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to save vehicle');
            mutate();
            setIsPanelOpen(false);
        });

        toast.promise(promise, {
            loading: 'Saving vehicle...',
            success: 'Vehicle saved successfully',
            error: (err) => err.message
        });
    };

    const toggleOutOfService = async (v: Vehicle) => {
        const isReturning = v.status === 'IN_SHOP' || v.status === 'RETIRED';
        const newStatus = isReturning ? 'AVAILABLE' : 'IN_SHOP';

        // Optimistic update
        mutate(vehicles?.map(veh => veh.id === v.id ? { ...veh, status: newStatus } : veh), false);

        try {
            const res = await fetch(`/api/vehicles/${v.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to update status');
            toast.success(`Vehicle marked as ${newStatus}`);
            mutate();
        } catch (err: any) {
            toast.error('Could not update status');
            mutate(); // revert optimistic
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Fleet Roster</h1>
                    <p className="text-neutral-400">Manage vehicle registrations and statuses</p>
                </div>
                <button
                    onClick={openCreate}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl flex items-center shadow-lg shadow-purple-500/20 transition-all font-medium text-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vehicle
                </button>
            </div>

            {error ? (
                <div className="p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0" />
                    <p>You do not have permission to view the fleet roster or the API is unreachable.</p>
                </div>
            ) : !vehicles ? (
                <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 p-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="bg-neutral-800/30 rounded-2xl border border-neutral-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-900/50 text-neutral-400 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Identification</th>
                                    <th className="px-6 py-4">Model Details</th>
                                    <th className="px-6 py-4">Odometer</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {(!Array.isArray(vehicles) || vehicles.length === 0) ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                            No vehicles found. Add your first vehicle to begin tracking.
                                        </td>
                                    </tr>
                                ) : vehicles.map((v) => (
                                    <tr key={v.id} className="hover:bg-neutral-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-white">{v.licensePlate}</div>
                                            <div className="text-xs font-mono text-neutral-500 mt-0.5">{v.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-neutral-300">{v.model}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-neutral-400">
                                            {v.odometer.toLocaleString()} km
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusPill status={v.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => toggleOutOfService(v)}
                                                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                                                >
                                                    {v.status === 'IN_SHOP' || v.status === 'RETIRED' ? 'Make Available' : 'Tag OOS'}
                                                </button>
                                                <button
                                                    onClick={() => openEdit(v)}
                                                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors border border-neutral-700"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <SlidePanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                title={editingVehicle ? "Edit Details" : "Register Vehicle"}
            >
                <form onSubmit={handleSubmit} className="space-y-5 mt-2">

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Identifier Name</label>
                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" placeholder="e.g. Truck 12" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">Model</label>
                            <input required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" placeholder="e.g. Cascadia" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-400">License Plate</label>
                            <input required value={formData.licensePlate} onChange={e => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm uppercase transition-all" placeholder="ABC-123" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Max Capacity (kg)</label>
                        <input type="number" required min="0" value={formData.maxCapacityKg} onChange={e => setFormData({ ...formData, maxCapacityKg: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Odometer (km)</label>
                        <input type="number" required min="0" value={formData.odometer} onChange={e => setFormData({ ...formData, odometer: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">Acquisition Cost ($)</label>
                        <input type="number" required min="0" value={formData.acquisitionCost} onChange={e => setFormData({ ...formData, acquisitionCost: Number(e.target.value) })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-purple-500 outline-none text-sm transition-all" />
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-purple-500/20">
                            {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                        </button>
                    </div>
                </form>
            </SlidePanel>
        </div>
    );
}
