"use client";

import React, { useEffect, useRef } from 'react';
import styles from './ContainerSandEffect.module.css';
import { useSandGravity } from './MobileMotion';
import { stepTiltedSand } from '@/lib/sandMotion';

interface ContainerSandEffectProps {
    color?: string;
    density?: number;
}

export const ContainerSandEffect: React.FC<ContainerSandEffectProps> = ({
    color = '#ff4444',
    density = 0.5
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<{ x: number, y: number }>({ x: -1, y: -1 });
    const gravityRef = useSandGravity();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let running = false;
        let visible = false;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let cols = 0;
        let rows = 0;
        const CELL_SIZE = 4;
        let grid: Uint8Array; // 0=Empty, 1=Sand

        // Sand only exists after the mouse visits the card, so the loop parks
        // itself whenever the grid is empty and the pointer is gone.
        const start = () => {
            if (running || reducedMotion.matches || !visible) return;
            running = true;
            animationFrameId = requestAnimationFrame(update);
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                cols = Math.ceil(canvas.width / CELL_SIZE);
                rows = Math.ceil(canvas.height / CELL_SIZE);
                grid = new Uint8Array(cols * rows).fill(0);
                start();
            }
        };

        const update = () => {
            if (!visible || reducedMotion.matches) {
                running = false;
                return;
            }
            const gravity = gravityRef.current;
            // Phone motion supplies a few red grains without requiring a hover.
            if (gravity.active && Math.hypot(gravity.x, gravity.y) > 0.12 && Math.random() < density) {
                const x = Math.floor(Math.random() * cols);
                const y = Math.floor(Math.random() * rows);
                grid[y * cols + x] = 1;
            }
            // Mouse Spawning Logic
            if (mouseRef.current.x >= 0 && mouseRef.current.y >= 0) {
                const mx = Math.floor(mouseRef.current.x / CELL_SIZE);
                const my = Math.floor(mouseRef.current.y / CELL_SIZE);
                const radius = 2; // Brush size

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx * dx + dy * dy > radius * radius) continue;
                        if (Math.random() > density) continue;

                        const nx = mx + dx;
                        const ny = my + dy;
                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            const idx = ny * cols + nx;
                            // Passive erase/displacement on hover
                            // If we want to delete existing sand to make room or just effect:
                            if (grid[idx] === 1 && Math.random() > 0.5) {
                                grid[idx] = 0;
                            }

                            if (Math.random() > density) continue;
                            grid[idx] = 1;
                        }
                    }
                }
            }

            // Red grains retain their buoyancy and travel opposite phone gravity.
            stepTiltedSand(grid, cols, rows, gravity.active
                ? { x: -gravity.x, y: -gravity.y } : { x: 0, y: -1 }, 1);

            const sandCount = draw();

            // Park the loop once the card is sand-free and un-hovered.
            if (sandCount > 0 || mouseRef.current.x >= 0 || gravity.active) {
                animationFrameId = requestAnimationFrame(update);
            } else {
                running = false;
            }
        };

        const draw = () => {
            if (!ctx) return 0;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = color;

            let sandCount = 0;
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (grid[y * cols + x] === 1) {
                        sandCount++;
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            return sandCount;
        };

        const handleMouseMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            start();
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1, y: -1 };
        };

        const handleClick = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const mx = Math.floor(x / CELL_SIZE);
            const my = Math.floor(y / CELL_SIZE);
            const radius = 15; // Explosion radius

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy > radius * radius) continue;
                    const nx = mx + dx;
                    const ny = my + dy;
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                        grid[ny * cols + nx] = 0; // Destroy
                    }
                }
            }
        };

        resize();
        start();

        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start();
        });
        observer.observe(canvas);
        const handleOrientation = () => {
            if (gravityRef.current.active) start();
        };
        const handlePointerUp = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse') handleMouseLeave();
        };
        window.addEventListener('deviceorientation', handleOrientation, { passive: true });
        window.addEventListener('pointerup', handlePointerUp);
        reducedMotion.addEventListener('change', start);

        const ro = new ResizeObserver(resize);
        if (canvas.parentElement) {
            ro.observe(canvas.parentElement);
            canvas.parentElement.addEventListener('pointermove', handleMouseMove, { passive: true });
            canvas.parentElement.addEventListener('pointerleave', handleMouseLeave);
            canvas.parentElement.addEventListener('pointercancel', handleMouseLeave);
            canvas.parentElement.addEventListener('pointerdown', handleClick);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            ro.disconnect();
            observer.disconnect();
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('pointerup', handlePointerUp);
            reducedMotion.removeEventListener('change', start);
            if (canvas.parentElement) {
                canvas.parentElement.removeEventListener('pointermove', handleMouseMove);
                canvas.parentElement.removeEventListener('pointerleave', handleMouseLeave);
                canvas.parentElement.removeEventListener('pointercancel', handleMouseLeave);
                canvas.parentElement.removeEventListener('pointerdown', handleClick);
            }
        };
    }, [color, density, gravityRef]);

    return (
        <canvas
            ref={canvasRef}
            className={styles.canvas}
        />
    );
};
