'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';

interface SocketContextData {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextData>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { mutate } = useSWRConfig();

    // Minimal auth probe to delay socket connection until a session exists
    const { data: auth } = useSWR<{ role?: string }>('/api/auth/me', (url) =>
        fetch(url, { credentials: 'include' }).then((res) => res.json()),
    );

    const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        return document.cookie
            .split('; ')
            .find((c) => c.startsWith(`${name}=`))
            ?.split('=')[1] ?? null;
    };

    useEffect(() => {
        // Avoid connecting before we have an authenticated session cookie
        if (!auth?.role) {
            if (socket) socket.disconnect();
            setSocket(null);
            setIsConnected(false);
            return;
        }

        const token = getCookie('access_token');

        const socketInstance = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000', {
            withCredentials: true,
            transports: ['websocket', 'polling'], // Fallback to polling if wss fails
            auth: token ? { token } : undefined,
        });

        socketInstance.on('connect', () => {
            console.log('Socket.io Connected:', socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Socket.io Disconnected:', reason);
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
            console.warn('Socket connection error:', err.message);
            setIsConnected(false);
            // Allow reconnection attempts after login / token refresh
        });

        // ── Global Event Bindings to SWR caches ──

        // Trips
        socketInstance.on('trip.dispatched', (payload) => {
            toast.success(`Trip dispatched: ${payload.id?.substring(0, 8)}...`);
            mutate(key => typeof key === 'string' && (key.includes('/trips') || key.includes('/vehicles') || key.includes('/drivers')));
        });

        socketInstance.on('trip.completed', (payload) => {
            toast.success(`Trip completed: ${payload.id?.substring(0, 8)}...`);
            mutate(key => typeof key === 'string' && (key.includes('/trips') || key.includes('/vehicles') || key.includes('/drivers') || key.includes('/analytics')));
        });

        socketInstance.on('trip.cancelled', (payload) => {
            toast.error(`Trip cancelled: ${payload.id?.substring(0, 8)}...`);
            mutate(key => typeof key === 'string' && (key.includes('/trips') || key.includes('/vehicles') || key.includes('/drivers')));
        });

        // Vehicles & Maintenance
        socketInstance.on('vehicle.updated', () => {
            mutate(key => typeof key === 'string' && key.includes('/vehicles'));
        });

        socketInstance.on('maintenance.started', (payload) => {
            toast('Maintenance logged', { icon: '🔧' });
            mutate(key => typeof key === 'string' && (key.includes('/maintenance') || key.includes('/vehicles')));
        });

        socketInstance.on('maintenance.completed', (payload) => {
            toast.success('Maintenance completed');
            mutate(key => typeof key === 'string' && (key.includes('/maintenance') || key.includes('/vehicles')));
        });

        // Finance & Fuel
        socketInstance.on('fuel.logged', () => {
            toast('Fuel logged', { icon: '⛽' });
            mutate(key => typeof key === 'string' && key.includes('/finance'));
        });

        // Drivers
        socketInstance.on('driver.suspended', (payload) => {
            toast.error('Driver Suspended (License Expired)');
            mutate(key => typeof key === 'string' && key.includes('/drivers'));
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [auth?.role, mutate]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}
