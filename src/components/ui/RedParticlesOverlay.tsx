"use client";

import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
}

export const RedParticlesOverlay = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];

        const resize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                initParticles();
            }
        };

        const initParticles = () => {
            particles = [];
            // Mobile/Performance optimization:
            const isMobile = window.innerWidth < 768;
            const divider = isMobile ? 1200 : 80; // Aggressively fewer particles (was 250)
            const particleCount = Math.floor((canvas.width * canvas.height) / divider);

            // Respect reduced motion
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) return; // No particles

            const speedMultiplier = isMobile ? 0.4 : 1; // 40% speed on mobile

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (0.2 + Math.random() * 0.8) * speedMultiplier, // Slower, more ambient float
                    vy: ((Math.random() - 0.5) * 0.5) * speedMultiplier,
                    size: Math.random() * 1.5 + 0.5,
                    alpha: 0.2 + Math.random() * 0.5
                });
            }
        };

        const update = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Red Gradient Overlay (Subtle)
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, 'rgba(40, 10, 10, 0.6)');
            gradient.addColorStop(1, 'rgba(40, 10, 10, 0.1)');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Particles
            ctx.fillStyle = '#ff4d4d'; // Red particles

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                // Simple wrap
                if (p.x > canvas.width) p.x = -5;
                if (p.y > canvas.height) p.y = 0;
                if (p.y < 0) p.y = canvas.height;

                ctx.beginPath();
                ctx.globalAlpha = p.alpha;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            animationFrameId = requestAnimationFrame(update);
        };

        const resizeObserver = new ResizeObserver(resize);
        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }

        resize();
        update();

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', mixBlendMode: 'plus-lighter' }}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};
