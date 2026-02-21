'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Truck, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            const res = await fetch(`/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Required to store the HttpOnly cookie from cross-origin response
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Invalid credentials');
            }

            toast.success('Successfully logged in');
            window.location.href = '/';
        } catch (err: any) {
            setErrorMsg(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-neutral-950 text-white font-sans selection:bg-purple-500/30">

            {/* Left Split: Brand Presentation */}
            <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-indigo-900 via-purple-900 to-neutral-950 overflow-hidden items-center justify-center">
                {/* Decorative Grid / Particles backdrop */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500 via-neutral-900 to-transparent"></div>

                <div className="relative z-10 px-16 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl backdrop-blur-md mb-8 ring-1 ring-white/20">
                            <Truck className="w-12 h-12 text-purple-300" />
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">
                            Operational Intelligence<br />
                            <span className="text-purple-300">for Modern Fleets</span>
                        </h1>
                        <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                            Command, track, and optimize your entire vehicle network in real-time. Unrivaled security and precision built for enterprise scale.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right Split: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-neutral-900 p-8 rounded-2xl shadow-2xl ring-1 ring-neutral-800 backdrop-blur-xl relative overflow-hidden group">
                        {/* Subtle purple glow around form on hover/focus within */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl blur opacity-0 group-focus-within:opacity-20 transition duration-1000"></div>

                        <div className="relative">
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl font-bold">Welcome back</h2>
                                <p className="text-neutral-400 mt-2 text-sm">Enter your credentials to access your terminal</p>
                            </div>

                            {errorMsg && (
                                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2 flex-shrink-0 animate-pulse"></div>
                                    {errorMsg}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm"
                                            placeholder="dispatcher@fleetflow.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Password</label>
                                        <a href="#" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Forgot password?</a>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-neutral-900"
                                    />
                                    <label htmlFor="remember" className="ml-2 text-sm text-neutral-400">Remember me for 30 days</label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <span>Secure Login</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
