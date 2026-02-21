'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell
} from 'recharts';
import { Activity, Clock, ShieldAlert, Truck, TrendingUp } from 'lucide-react';
import { ChartErrorBoundary } from '@/components/ChartErrorBoundary';
import { motion, useSpring, useTransform } from 'framer-motion';

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new Error(info.message || 'An error occurred');
  }
  return res.json();
};

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) {
  const spring = useSpring(0, { bounce: 0, duration: 1500 });
  const display = useTransform(spring, (current) => `${prefix}${Math.round(current).toLocaleString()}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

function SkeletonCard() {
  return (
    <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 animate-pulse flex items-start space-x-4">
      <div className="w-12 h-12 bg-neutral-700/50 rounded-xl" />
      <div className="space-y-2 flex-1 pt-1">
        <div className="h-4 bg-neutral-700/50 rounded w-1/2" />
        <div className="h-8 bg-neutral-700/50 rounded w-3/4" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 h-[350px] animate-pulse flex flex-col">
      <div className="h-6 bg-neutral-700/50 rounded w-1/3 mb-6" />
      <div className="flex-1 bg-neutral-700/20 rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const { data: dashboard, error: dashErr } = useSWR(`/api/analytics/dashboard`, fetcher);
  const { data: fuelTrend, error: fuelErr } = useSWR(`/api/analytics/fuel-trend`, fetcher);
  const { data: tripsDay, error: tripsErr } = useSWR(`/api/analytics/trips-per-day`, fetcher);
  const { data: roiData, error: roiErr } = useSWR(`/api/analytics/fleet-roi`, fetcher);

  const isLoadingKPIs = !dashboard && !dashErr;
  const isLoadingCharts = (!fuelTrend && !fuelErr) || (!tripsDay && !tripsErr) || (!roiData && !roiErr);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Command Center
          </h1>
          <p className="text-neutral-400">Real-time operational intelligence</p>
        </div>
        <div className="hidden md:flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium">Live Sync Active</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoadingKPIs ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : dashErr ? (
          <div className="col-span-3 p-4 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            Error loading KPIs. Note: Requires a signed-in user. If this persists, please re-login.
          </div>
        ) : (
          <>
            {/* Utilization */}
            <ChartErrorBoundary title="Utilization">
              <div className="bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4 group">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-neutral-400 text-sm font-medium mb-1">Fleet Utilization</h3>
                  <div className="text-3xl font-bold text-white">
                    <AnimatedCounter value={dashboard.activeTripsCount || 0} /> <span className="text-lg text-neutral-500 font-normal">/ <AnimatedCounter value={dashboard.totalVehicles || 0} /></span>
                  </div>
                </div>
              </div>
            </ChartErrorBoundary>

            {/* Total Value */}
            <ChartErrorBoundary title="Total Acquisition Value">
              <div className="bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4 group">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                  <span className="text-lg font-bold">₹</span>
                </div>
                <div>
                  <h3 className="text-neutral-400 text-sm font-medium mb-1">Total Fleet Value</h3>
                  <div className="text-3xl font-bold text-white">
                    {formatINR(dashboard.totalAcquisitionCost || 0)}
                  </div>
                </div>
              </div>
            </ChartErrorBoundary>

            {/* Efficiency */}
            <ChartErrorBoundary title="Average Efficiency">
              <div className="bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors p-6 rounded-2xl border border-neutral-800 flex items-start space-x-4 group">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-neutral-400 text-sm font-medium mb-1">Avg Efficiency</h3>
                  <div className="text-3xl font-bold text-white">
                    <AnimatedCounter value={dashboard.avgEfficiencyKmPerL || 0} suffix=" km/L" />
                  </div>
                </div>
              </div>
            </ChartErrorBoundary>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Trend LineChart */}
        {isLoadingCharts ? <SkeletonChart /> : fuelErr ? null : (
          <ChartErrorBoundary title="Fuel Consumption Trend">
            <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 h-[350px] flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-6">Fuel Consumption (30 Days)</h2>
              <div className="flex-1 min-h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                  <AreaChart data={fuelTrend}>
                    <defs>
                      <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: number) => `${val}L`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                      itemStyle={{ color: '#ffffff' }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                    <Area type="monotone" dataKey="totalLiters" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorFuel)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartErrorBoundary>
        )}

        {/* Trips Per Day BarChart */}
        {isLoadingCharts ? <SkeletonChart /> : tripsErr ? null : (
          <ChartErrorBoundary title="Trips Per Day">
            <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 h-[350px] flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-6">Daily Dispatch Volume</h2>
              <div className="flex-1 min-h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                  <BarChart data={tripsDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: '#262626' }}
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                      labelStyle={{ color: '#ffffff' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Bar dataKey="completedTrips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartErrorBoundary>
        )}

        {/* Fleet ROI BarChart */}
        {isLoadingCharts ? <SkeletonChart /> : roiErr ? null : (
          <ChartErrorBoundary title="Fleet ROI">
            <div className="bg-neutral-800/30 p-6 rounded-2xl border border-neutral-800 h-[350px] flex flex-col lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-6">Vehicle Performance (Net ROI)</h2>
              <div className="flex-1 min-h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                  <BarChart data={roiData?.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="licensePlate" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#525252"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: number) => formatINR(val).replace('₹', '₹ ')}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#262626' }}
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                      formatter={(value: any) => [formatINR(Number(value)), 'Net ROI']}
                      labelStyle={{ color: '#ffffff' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Bar dataKey="netROI" radius={[4, 4, 0, 0]}>
                      {
                        roiData?.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.netROI >= 0 ? '#10b981' : '#ef4444'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartErrorBoundary>
        )}
      </div>
    </div>
  );
}
