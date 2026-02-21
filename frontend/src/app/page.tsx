import React from 'react';
import { ShieldAlert, Activity, CheckCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Command Center
          </h1>
          <p className="text-neutral-400">System metrics and operational status</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">All Systems Operational</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-neutral-400 text-sm font-medium mb-1">Active Trips</h3>
            <div className="text-3xl font-bold text-white">24</div>
          </div>
        </div>

        <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-neutral-400 text-sm font-medium mb-1">Pending Maintenance</h3>
            <div className="text-3xl font-bold text-white">3</div>
          </div>
        </div>

        <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-neutral-400 text-sm font-medium mb-1">Security Events</h3>
            <div className="text-3xl font-bold text-white">0</div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-800/30 p-8 rounded-2xl border border-neutral-800">
        <div className="flex items-center mb-6">
          <ShieldAlert className="w-5 h-5 text-blue-400 mr-2" />
          <h2 className="text-lg font-semibold text-white">Access Control Information</h2>
        </div>
        <p className="text-neutral-400 text-sm leading-relaxed max-w-2xl">
          You are viewing the FleetFlow OS system dashboard. This interface dynamically maps its available modules strictly against your assigned hierarchical Tier (`UserRole`). Attempting to browse manually to an unauthorized route will safely bounce traffic internally resolving a 403 Forbidden payload mask.
        </p>
      </div>
    </div>
  );
}
