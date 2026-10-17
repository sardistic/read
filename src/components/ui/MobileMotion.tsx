"use client";

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { orientationGravity, type SandGravity } from '@/lib/sandMotion';
import styles from './MobileMotion.module.css';

type MotionStatus = 'idle' | 'requesting' | 'waiting' | 'active' | 'denied' | 'unavailable';
type OrientationAPI = typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<PermissionState>;
};

const MotionContext = createContext<{ current: SandGravity }>({
    current: { x: 0, y: 1, active: false },
});

export const useSandGravity = () => useContext(MotionContext);

export function MobileMotionProvider({ children }: { children: React.ReactNode }) {
    const gravity = useRef<SandGravity>({ x: 0, y: 1, active: false });
    const [available, setAvailable] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [status, setStatus] = useState<MotionStatus>('idle');

    useEffect(() => {
        const mobile = window.matchMedia('(any-pointer: coarse)');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => {
            const supported = window.isSecureContext && 'DeviceOrientationEvent' in window
                && mobile.matches && !reduced.matches;
            setAvailable(supported);
            if (!supported) {
                setEnabled(false);
                gravity.current = { x: 0, y: 1, active: false };
            }
        };
        update();
        mobile.addEventListener('change', update);
        reduced.addEventListener('change', update);
        return () => {
            mobile.removeEventListener('change', update);
            reduced.removeEventListener('change', update);
        };
    }, []);

    useEffect(() => {
        if (!enabled || !available) return;
        let received = false;
        const onOrientation = (event: DeviceOrientationEvent) => {
            if (document.hidden || event.beta === null || event.gamma === null
                || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
            const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
            const next = orientationGravity(event.beta, event.gamma, angle);
            const previous = gravity.current;
            gravity.current = {
                x: previous.active ? previous.x + (next.x - previous.x) * 0.25 : next.x,
                y: previous.active ? previous.y + (next.y - previous.y) * 0.25 : next.y,
                active: true,
            };
            if (!received) {
                received = true;
                setStatus('active');
            }
        };
        const onVisibility = () => {
            gravity.current = { x: 0, y: 1, active: false };
        };
        window.addEventListener('deviceorientation', onOrientation, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        const timeout = window.setTimeout(() => {
            if (!received) {
                setStatus('unavailable');
                setEnabled(false);
            }
        }, 5000);
        return () => {
            window.clearTimeout(timeout);
            window.removeEventListener('deviceorientation', onOrientation);
            document.removeEventListener('visibilitychange', onVisibility);
            gravity.current = { x: 0, y: 1, active: false };
        };
    }, [enabled, available]);

    const toggle = async () => {
        if (enabled) {
            setEnabled(false);
            setStatus('idle');
            return;
        }
        setStatus('requesting');
        try {
            const api = window.DeviceOrientationEvent as OrientationAPI;
            // Safari requires this call directly within the button gesture.
            if (api.requestPermission && await api.requestPermission() !== 'granted') {
                setStatus('denied');
                return;
            }
            setStatus('waiting');
            setEnabled(true);
        } catch {
            setStatus('unavailable');
        }
    };

    const label = status === 'requesting' || status === 'waiting' ? 'Connecting tilt…'
        : enabled ? 'Tilt on' : 'Enable tilt';
    const message = status === 'denied' ? 'Motion access denied. Touch still works.'
        : status === 'unavailable' ? 'No motion data. Touch still works.' : '';

    return (
        <MotionContext.Provider value={gravity}>
            {children}
            {available && (
                <div className={styles.control}>
                    {message && <span className={styles.message} role="status">{message}</span>}
                    <button
                        type="button"
                        className={styles.button}
                        onClick={toggle}
                        aria-pressed={enabled}
                        disabled={status === 'requesting' || status === 'waiting'}
                        title={enabled ? 'Turn off phone tilt' : 'Tilt your phone to move the sand'}
                    >
                        {label}
                    </button>
                </div>
            )}
        </MotionContext.Provider>
    );
}
