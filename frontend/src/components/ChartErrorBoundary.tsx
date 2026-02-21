'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    title: string;
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

/**
 * ChartErrorBoundary — wraps a single chart panel.
 * If Recharts throws (bad data, SSR hydration, etc.), this catches it
 * and renders a contained error card instead of crashing the entire page.
 */
export class ChartErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[ChartErrorBoundary] "${this.props.title}" crashed:`, error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] gap-4">
                    <span className="text-3xl">📉</span>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-neutral-300">{this.props.title} unavailable</p>
                        <p className="text-xs text-neutral-500 mt-1 font-mono">
                            {this.state.errorMessage || 'Render error'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="px-4 py-2 text-xs rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
