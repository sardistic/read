"use client";

import React, { useEffect, useRef } from 'react';
import styles from './AtmosphericBackground.module.css';

interface AtmosphericBackgroundProps {
    image?: string;
}

export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({ image }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<{ x: number, y: number }>({ x: -1, y: -1 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Configuration
        const CELL_SIZE = 5;
        let cols = 0;
        let rows = 0;
        let grid: Uint8Array; // 0=Empty, 1=Sand, 2=Anti-Sand
        let obstacleGrid: Uint8Array; // 1=Obstacle
        let animationFrameId: number;
        let frame = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            cols = Math.ceil(canvas.width / CELL_SIZE);
            rows = Math.ceil(canvas.height / CELL_SIZE);
            // Re-allocate grids
            grid = new Uint8Array(cols * rows).fill(0);
            obstacleGrid = new Uint8Array(cols * rows).fill(0);
            initGrid();
        };

        const initGrid = () => {
            // Single Ridge (High on Left, Low on Right)
            for (let x = 0; x < cols; x++) {
                const progress = x / cols;
                const slope = 1.0 - Math.pow(progress, 0.5);
                const noise = Math.sin(x * 0.05) * 0.1;
                const duneHeight = Math.floor(rows * (0.7 * slope + noise));

                for (let y = rows - 1; y >= rows - duneHeight; y--) {
                    if (y >= 0 && y < rows) {
                        grid[y * cols + x] = 1;
                    }
                }
            }
        };

        const updateObstacles = () => {
            if (!obstacleGrid) return;
            obstacleGrid.fill(0);

            const elements = document.querySelectorAll('[data-sand-obstacle="true"]');
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();

                // Map screen coords to grid coords
                const startX = Math.floor(Math.max(0, rect.left) / CELL_SIZE);
                const endX = Math.floor(Math.min(canvas.width, rect.right) / CELL_SIZE);
                const startY = Math.floor(Math.max(0, rect.top) / CELL_SIZE);
                const endY = Math.floor(Math.min(canvas.height, rect.bottom) / CELL_SIZE);

                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const idx = y * cols + x;
                        if (idx < obstacleGrid.length) {
                            obstacleGrid[idx] = 1;
                        }
                    }
                }
            });
        };

        const update = () => {
            frame++;
            updateObstacles();

            // 1. Emitter: Waves
            const stormIntensity = (Math.sin(frame * 0.01) + 1) / 2;
            const waveCenter = (Math.sin(frame * 0.02) * 0.5 + 0.5) * cols;
            const waveWidth = cols * 0.3;

            const baseDrops = Math.floor(cols / 20);
            const gustDrops = Math.floor((cols / 5) * stormIntensity);
            const totalDrops = baseDrops + gustDrops;

            for (let i = 0; i < totalDrops; i++) {
                let x;
                if (Math.random() > 0.5) {
                    const offset = (Math.random() - 0.5) * waveWidth;
                    x = Math.floor(waveCenter + offset);
                } else {
                    x = Math.floor(Math.random() * cols);
                }

                if (x < 0) x += cols;
                if (x >= cols) x -= cols;
                x = Math.max(0, Math.min(cols - 1, x));

                // Spawn only if empty and not obstacle
                if (grid[x] === 0 && obstacleGrid[x] === 0) {
                    grid[x] = 1;
                }
            }

            // 2. Interaction
            if (mouseRef.current.x >= 0 && mouseRef.current.y >= 0) {
                const mx = Math.floor(mouseRef.current.x / CELL_SIZE);
                const my = Math.floor(mouseRef.current.y / CELL_SIZE);
                // Larger brush for global effect
                const radius = 3; // Reduced from 6

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        if (dx * dx + dy * dy > radius * radius) continue;

                        const nx = mx + dx;
                        const ny = my + dy;
                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            const idx = ny * cols + nx;

                            // Passive Erase (Hover Effect)
                            if (grid[idx] === 1) {
                                grid[idx] = 0; // Destroy falling sand
                            }

                            // Spawn Anti-Sand (Red) from mouse if empty
                            // Reduced spawn rate significantly (was 0.5)
                            if (grid[idx] === 0 && obstacleGrid[idx] === 0 && Math.random() > 0.92) {
                                grid[idx] = 2;
                            }
                        }
                    }
                }
            }

            // 3. Drain
            const drainWidth = Math.floor(cols * 0.15);
            const drainStart = cols - drainWidth;
            for (let x = drainStart; x < cols; x++) {
                const idx = (rows - 1) * cols + x;
                grid[idx] = 0;
            }

            // 4. Physics Update

            // Pass 1: Sand (Down)
            for (let y = rows - 2; y >= 0; y--) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;

                    // Kill existing sand if it's now inside an obstacle (e.g. scrolled up)
                    if (obstacleGrid[idx] === 1 && grid[idx] === 1) {
                        grid[idx] = 0;
                        continue;
                    }

                    if (grid[idx] !== 1) continue;

                    const below = (y + 1) * cols + x;
                    const belowLeft = (y + 1) * cols + (x - 1);
                    const belowRight = (y + 1) * cols + (x + 1);

                    // Solid check: Grid Sand OR Obstacle
                    // Ensure bounds for obstacle check logic (though typed array handles OOB gracefully usually returns undefined/0 if wrapped safely, but manual check is safer)
                    // Simplified: just check values.

                    if (grid[below] === 2) { grid[idx] = 0; grid[below] = 0; continue; } // Annihilate

                    const isBelowSolid = grid[below] === 1 || obstacleGrid[below] === 1;

                    if (!isBelowSolid) {
                        grid[below] = 1;
                        grid[idx] = 0;
                    } else {
                        // Spread
                        const tryRight = Math.random() > 0.5;
                        if (tryRight) {
                            if (x < cols - 1 && grid[belowRight] === 0 && obstacleGrid[belowRight] === 0) {
                                grid[belowRight] = 1;
                                grid[idx] = 0;
                            } else if (x > 0 && grid[belowLeft] === 0 && obstacleGrid[belowLeft] === 0) {
                                grid[belowLeft] = 1;
                                grid[idx] = 0;
                            }
                        } else {
                            if (x > 0 && grid[belowLeft] === 0 && obstacleGrid[belowLeft] === 0) {
                                grid[belowLeft] = 1;
                                grid[idx] = 0;
                            } else if (x < cols - 1 && grid[belowRight] === 0 && obstacleGrid[belowRight] === 0) {
                                grid[belowRight] = 1;
                                grid[idx] = 0;
                            }
                        }
                    }
                }
            }

            // Pass 2: Anti-Sand (Up)
            for (let y = 1; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    if (grid[idx] !== 2) continue;

                    const above = (y - 1) * cols + x;
                    const aboveLeft = (y - 1) * cols + (x - 1);
                    const aboveRight = (y - 1) * cols + (x + 1);

                    // Toxic Interaction: Aggressive 'Acid' Effect
                    // Check larger radius for sand to destroy
                    const range = 2; // 2-pixel radius
                    let ateSomething = false;

                    for (let dy = -range; dy <= range; dy++) {
                        for (let dx = -range; dx <= range; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;

                            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                                const nIdx = ny * cols + nx;
                                if (grid[nIdx] === 1) {
                                    grid[nIdx] = 0; // Destroy sand
                                    ateSomething = true;
                                }
                            }
                        }
                    }

                    if (ateSomething) {
                        // High potency: 80% chance to survive after eating
                        // This allows one anti-sand particle to tunnel through multiple sand particles
                        if (Math.random() > 0.8) {
                            grid[idx] = 0; // Fizzle out
                        }
                        // If it survives, it stays in place this frame (busy eating)
                        continue;
                    }

                    if (y === 0) { grid[idx] = 0; continue; }

                    // Standard Upward Movement for Anti-Sand
                    if (grid[above] === 0) {
                        grid[above] = 2;
                        grid[idx] = 0;
                    } else if (grid[above] === 1) {
                        // Direct collision with sand above (already handled by neighbor check, but fail-safe)
                        grid[above] = 0;
                        grid[idx] = 0;
                    } else if (obstacleGrid[above] === 1) {
                        // Slide under obstacle
                        const tryLeft = Math.random() > 0.5;
                        if (tryLeft) {
                            if (x > 0 && grid[aboveLeft] === 0 && obstacleGrid[aboveLeft] === 0) {
                                grid[aboveLeft] = 2; grid[idx] = 0;
                            } else if (x < cols - 1 && grid[aboveRight] === 0 && obstacleGrid[aboveRight] === 0) {
                                grid[aboveRight] = 2; grid[idx] = 0;
                            }
                        } else {
                            if (x < cols - 1 && grid[aboveRight] === 0 && obstacleGrid[aboveRight] === 0) {
                                grid[aboveRight] = 2; grid[idx] = 0;
                            } else if (x > 0 && grid[aboveLeft] === 0 && obstacleGrid[aboveLeft] === 0) {
                                grid[aboveLeft] = 2; grid[idx] = 0;
                            }
                        }
                    } else {
                        // Dispersion if blocked by other anti-sand
                        const tryLeft = Math.random() > 0.5;
                        if (tryLeft) {
                            if (x > 0 && grid[aboveLeft] === 0 && obstacleGrid[aboveLeft] === 0) {
                                grid[aboveLeft] = 2; grid[idx] = 0;
                            } else if (x < cols - 1 && grid[aboveRight] === 0 && obstacleGrid[aboveRight] === 0) {
                                grid[aboveRight] = 2; grid[idx] = 0;
                            }
                        } else {
                            if (x < cols - 1 && grid[aboveRight] === 0 && obstacleGrid[aboveRight] === 0) {
                                grid[aboveRight] = 2; grid[idx] = 0;
                            } else if (x > 0 && grid[aboveLeft] === 0 && obstacleGrid[aboveLeft] === 0) {
                                grid[aboveLeft] = 2; grid[idx] = 0;
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

            // Gradient Overlay
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Sand
            ctx.beginPath();
            ctx.fillStyle = '#050505';
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (grid[y * cols + x] === 1) {
                        ctx.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            ctx.fill();

            // Draw Anti-Sand (Red)
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 80, 80, 0.8)'; // Match container sand
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (grid[y * cols + x] === 2) {
                        ctx.rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            ctx.fill();
        };

        const handleMove = (x: number, y: number) => {
            mouseRef.current = { x, y };
        };

        const handleClick = (e: MouseEvent) => {
            // Explosion Logic
            const mx = Math.floor(e.clientX / CELL_SIZE);
            const my = Math.floor(e.clientY / CELL_SIZE);
            const radius = 20; // Explosion radius

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy > radius * radius) continue;
                    const nx = mx + dx;
                    const ny = my + dy;
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                        const idx = ny * cols + nx;
                        grid[idx] = 0; // Destroy everything
                    }
                }
            }
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const onMouseLeave = () => { mouseRef.current = { x: -1, y: -1 }; };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', handleClick); // Trigger on click
        window.addEventListener('touchmove', onTouchMove);
        document.addEventListener('mouseleave', onMouseLeave);

        resize();
        update();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', handleClick);
            window.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('mouseleave', onMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className={styles.wrapper}>
            {image && (
                <div
                    className={styles.imageLayer}
                    style={{
                        backgroundImage: `url(${image})`,
                        opacity: 0.5
                    }}
                />
            )}
            <canvas
                ref={canvasRef}
                className={styles.overlay}
            />
        </div>
    );
};
