'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SlidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function SlidePanel({ isOpen, onClose, title, children }: SlidePanelProps) {
    // Prevent body scroll when panel is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Slide Panel */}
                    <motion.div
                        initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                        animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)' }}
                        exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md">
                            <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-neutral-700">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
