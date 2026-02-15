"use client";

import React, { useEffect, useRef } from 'react';
import styles from './ContainerSandEffect.module.css';

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

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let cols = 0;
        let rows = 0;
        const CELL_SIZE = 4;
        let grid: Uint8Array; // 0=Empty, 1=Sand

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                cols = Math.ceil(canvas.width / CELL_SIZE);
                rows = Math.ceil(canvas.height / CELL_SIZE);
                grid = new Uint8Array(cols * rows).fill(0);
            }
        };

        const update = () => {
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

            // Physics Passing (Rising)
            for (let y = 1; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    if (grid[idx] !== 1) continue;

                    const above = (y - 1) * cols + x;
                    const aboveLeft = (y - 1) * cols + (x - 1);
                    const aboveRight = (y - 1) * cols + (x + 1);

                    // If at top, disappear (or stick? User said "accumulating inside")
                    // If we want accumulation, they should stick to the top?
                    // Or maybe just stick to the bottom of "obstacles" inside.
                    // But here the container IS the boundary.
                    // Let's assume they float up and disappear, or accumulate at top?
                    // "Accumulating inside the divs" -> probably filling up from bottom or clustering?
                    // Wait, "red accumulating inside divs".
                    // Global red sand was "anti-sand" (rising).
                    // Maybe they mean it should look like it's trapped?
                    // Let's try rising and accumulating at the TOP edge of the card.

                    if (y === 0) {
                        grid[idx] = 1; // Accumulate at ceiling
                        continue;
                    }

                    if (grid[above] === 1) {
                        // Hit sand above (pile up)
                        grid[idx] = 1;
                        continue;
                    }

                    if (grid[above] === 0) {
                        grid[above] = 1;
                        grid[idx] = 0;
                    } else {
                        // Sliding
                        const tryLeft = Math.random() > 0.5;
                        if (tryLeft) {
                            if (x > 0 && grid[aboveLeft] === 0) {
                                grid[aboveLeft] = 1;
                                grid[idx] = 0;
                            }
                        } else {
                            if (x < cols - 1 && grid[aboveRight] === 0) {
                                grid[aboveRight] = 1;
                                grid[idx] = 0;
                            }
                        }
                    }
                }
            }

            draw();
            animationFrameId = requestAnimationFrame(update);
        };

        const draw = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = color;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (grid[y * cols + x] === 1) {
                        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1, y: -1 };
        };

        const handleClick = (e: MouseEvent) => {
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
        update();

        const ro = new ResizeObserver(resize);
        if (canvas.parentElement) {
            ro.observe(canvas.parentElement);
            canvas.parentElement.addEventListener('mousemove', handleMouseMove);
            canvas.parentElement.addEventListener('mouseleave', handleMouseLeave);
            canvas.parentElement.addEventListener('mousedown', handleClick);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            ro.disconnect();
            if (canvas.parentElement) {
                canvas.parentElement.removeEventListener('mousemove', handleMouseMove);
                canvas.parentElement.removeEventListener('mouseleave', handleMouseLeave);
                canvas.parentElement.removeEventListener('mousedown', handleClick);
            }
        };
    }, [color, density]);

    return (
        <canvas
            ref={canvasRef}
            className={styles.canvas}
        />
    );
};
