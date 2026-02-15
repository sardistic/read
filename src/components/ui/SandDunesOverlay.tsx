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

export const SandDunesOverlay = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

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
            const divider = isMobile ? 1500 : 100; // Aggressively fewer particles (was 300)
            const particleCount = Math.floor((canvas.width * canvas.height) / divider);

            // Respect reduced motion
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) return; // No particles

            const speedMultiplier = isMobile ? 0.3 : 1; // 30% speed on mobile

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (0.5 + Math.random() * 1.5) * speedMultiplier, // Natural wind
                    vy: ((Math.random() - 0.5) * 0.5) * speedMultiplier,
                    size: Math.random() * 2,
                    alpha: 0.1 + Math.random() * 0.3
                });
            }
        };

        const update = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear only particles

            // Draw "Dune" Gradient (Static backdrop for sand to blow over)
            // Actually, user said "covering most of the book art", so maybe a semi-transparent gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, 'rgba(10, 10, 12, 0.95)'); // Solid dark left
            gradient.addColorStop(0.4, 'rgba(10, 10, 12, 0.8)'); // Dune peak
            gradient.addColorStop(1, 'rgba(10, 10, 12, 0.4)'); // Fade out right

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            ctx.fillStyle = '#d4af37'; // Gold sand

            particles.forEach(p => {
                // Mouse Interaction (Wind turbulence)
                const dx = p.x - mouseRef.current.x;
                const dy = p.y - mouseRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let forceX = 0;
                let forceY = 0;

                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    forceX = (dx / dist) * force * 2;
                    forceY = (dy / dist) * force * 2;
                }

                p.x += p.vx + forceX;
                p.y += p.vy + forceY;

                // Reset bounds
                if (p.x > canvas.width) {
                    p.x = -10;
                    p.y = Math.random() * canvas.height;
                }
                if (p.x < -10) {
                    p.x = canvas.width + 10;
                }
                if (p.y > canvas.height) p.y = 0;
                if (p.y < 0) p.y = canvas.height;

                // Draw
                ctx.beginPath();
                ctx.globalAlpha = p.alpha;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            animationFrameId = requestAnimationFrame(update);
        };

        window.addEventListener('resize', resize);
        resize();
        update();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    return (
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            {/* Pointer events none usually blocks mouse, but we want the effect to react. 
                 We can put pointerEvents: 'none' on the div, but attach a listener to the PARENT? 
                 Or just let pass through? 
                 Actually, if pointerEvents is none, onMouseMove won't fire on this element.
                 But we can listen on the parent if passed as ref, or just assume global mouse? 
                 Let's rely on the parent PaperCard being interactive and bubbling events if we could.
                 Alternatively, we just capture events here and set pointer-events: auto? 
                 If we set auto, it blocks the Link click.
                 Solution: Use 'mousemove' on window or parent? 
                 Simpler: Just set z-index: 1 and pointer-events: none, and track mouse relative to viewport? 
                 Or use a global mouse tracker hook. 
                 For now, let's try tracking on the parent via a wrapper or assume the parent passes the mouse state?
                 No, keep it simple: Add mousemove listener to window and calculate relative pos.
             */}
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%' }}
            />
            {/* Invisible interactive layer? No, that blocks clicks. */}
        </div>
    );
};
