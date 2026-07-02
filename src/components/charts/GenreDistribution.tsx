"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { PaperCard } from '../ui/PaperCard';
import { Work } from '@/lib/types';
import styles from './GenreDistribution.module.css';
import { resolveWorkGenres, getParentGenre } from '@/lib/genreUtils';

interface Node {
    id: string;
    count: number;
    parent: string;
    isMajor: boolean;
    radius: number;
    color: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Link {
    source: string;
    target: string;
    strength: number; // shared-book count
}

// Only render nodes/links above these thresholds so the sky stays legible.
const MIN_COUNT = 4;
const MAX_NODES = 40;
const MIN_LINK = 6;

// Force-simulation constants (tuned for this dataset so galaxies separate
// instead of collapsing into a central hairball).
const CHARGE = 9000;   // mutual repulsion between stars
const LINK_K = 0.018;  // spring stiffness for shared-genre links
const CLUSTER_K = 0.18; // pull toward each star's galaxy centroid
const CENTER_K = 0.005; // gentle pull toward canvas centre

// Galaxy palette (parent genre -> colour).
const GALAXY_COLORS: Record<string, string> = {
    'Science Fiction': '#4cc9f0',
    'Fantasy': '#f72585',
    'Horror': '#7209b7',
    'Mystery & Thriller': '#4361ee',
    'History & Memoir': '#ffd166',
    'Science': '#06d6a0',
    'Society & Business': '#ef476f',
    'Spirituality': '#b5179e',
    'Arts & Poetry': '#c77dff',
    'Comics & Manga': '#3a0ca3',
    'Romance': '#ff4d6d',
    'Action & Adventure': '#ff9f1c',
    'Classics': '#e9c46a',
    'Young Adult': '#2ec4b6',
    'Philosophy': '#9b5de5',
    'Psychology': '#00bbf9',
    'Other': '#adb5bd'
};

const colorFor = (parent: string) => GALAXY_COLORS[parent] || GALAXY_COLORS['Other'];

const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const galaxyHazeRadius = (starCount: number) => Math.min(120, 34 + starCount * 12);

export const GenreDistribution = ({ works }: { works: Work[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<SVGSVGElement>(null);

    const [dimensions, setDimensions] = useState({ width: 800, height: 440 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [pinnedNode, setPinnedNode] = useState<string | null>(null);

    // Hover previews a star; a pinned star keeps its panel/links when the mouse leaves.
    const selected = hoveredNode ?? pinnedNode;

    // Distinguish a click (pin) from a drag.
    const downRef = useRef<{ x: number; y: number } | null>(null);
    const movedRef = useRef(false);

    // Refs the simulation reads without re-subscribing.
    const dimsRef = useRef(dimensions);
    const dragRef = useRef<{ id: string; x: number; y: number } | null>(null);
    const alphaRef = useRef(0);
    const runningRef = useRef(false);
    const reheatRef = useRef<(() => void) | null>(null);
    dimsRef.current = dimensions;

    // The simulation writes positions straight to these DOM elements each frame,
    // bypassing React state so a hot sim doesn't re-render the whole tree.
    const nodeElRefs = useRef(new Map<string, SVGGElement>());
    const linkElRefs = useRef(new Map<number, SVGLineElement>());
    const galaxyElRefs = useRef(new Map<string, SVGGElement>());

    // 1. Build nodes + links from the (de-duplicated) genre data.
    const { nodeData, links } = useMemo(() => {
        const perWork = works.map(w => resolveWorkGenres(w.genres));

        const counts = new Map<string, number>();
        perWork.forEach(genres => genres.forEach(g => counts.set(g, (counts.get(g) || 0) + 1)));

        const entries = Array.from(counts.entries())
            .filter(([, value]) => value >= MIN_COUNT)
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_NODES);
        const names = new Set(entries.map(([name]) => name));

        const nodeData: Node[] = entries.map(([name, count]) => {
            const parent = getParentGenre(name);
            return {
                id: name,
                count,
                parent,
                isMajor: count >= 15,
                // Rounded so SSR and client render identical attribute strings
                // (Math.pow can differ in the last float bits across engines).
                radius: Math.round(Math.max(6, Math.pow(count, 0.42) * 4.4) * 100) / 100,
                color: colorFor(parent),
                x: 0, y: 0, vx: 0, vy: 0
            };
        });

        const linkMap = new Map<string, number>();
        perWork.forEach(genres => {
            const unique = Array.from(new Set(genres.filter(g => names.has(g)))).sort();
            for (let i = 0; i < unique.length; i++) {
                for (let j = i + 1; j < unique.length; j++) {
                    const key = `${unique[i]}|${unique[j]}`;
                    linkMap.set(key, (linkMap.get(key) || 0) + 1);
                }
            }
        });

        const links: Link[] = Array.from(linkMap.entries())
            .map(([key, strength]) => {
                const [source, target] = key.split('|');
                return { source, target, strength };
            })
            .filter(link => link.strength >= MIN_LINK);

        return { nodeData, links };
    }, [works]);

    // Mutable simulation state. Seeded here so the very first render already has
    // sensible positions; the animation effect then mutates these same objects.
    const sim = useMemo(() => {
        const { width, height } = dimsRef.current;
        const cx = width / 2;
        const cy = height / 2;
        const parents = Array.from(new Set(nodeData.map(n => n.parent)));
        return nodeData.map(node => {
            const angle = (parents.indexOf(node.parent) / Math.max(1, parents.length)) * Math.PI * 2;
            const jitter = (hashString(node.id) % 100) / 100 - 0.5;
            return {
                ...node,
                x: Math.round((cx + Math.cos(angle) * (150 + jitter * 40)) * 100) / 100,
                y: Math.round((cy + Math.sin(angle) * (120 + jitter * 40)) * 100) / 100,
                vx: 0, vy: 0
            };
        });
    }, [nodeData]);

    const activeConnections = useMemo(() => {
        if (!selected) return new Set<string>();
        const connections = new Set(
            links
                .filter(link => link.source === selected || link.target === selected)
                .flatMap(link => [link.source, link.target])
        );
        connections.add(selected);
        return connections;
    }, [selected, links]);

    // Static galaxy facts (name, colour, sizes). Positions are updated
    // imperatively from the live centroids inside the simulation tick.
    const galaxies = useMemo(() => {
        const groups = new Map<string, { name: string; color: string; count: number; nodes: number }>();
        nodeData.forEach(node => {
            const existing = groups.get(node.parent);
            if (existing) {
                existing.count += node.count;
                existing.nodes += 1;
            } else {
                groups.set(node.parent, { name: node.parent, color: node.color, count: node.count, nodes: 1 });
            }
        });
        return Array.from(groups.values()).sort((a, b) => b.count - a.count);
    }, [nodeData]);

    // 2. Track container size.
    useEffect(() => {
        if (!containerRef.current) return;
        const updateSize = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setDimensions({ width: rect.width || 800, height: rect.height || 440 });
        };
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        updateSize();
        return () => observer.disconnect();
    }, []);

    // 3. Force simulation. Runs while "hot" or dragging, then rests.
    //    Each tick mutates `sim` and writes transforms/coordinates directly to
    //    the SVG elements — React is not involved in the per-frame path.
    useEffect(() => {
        const index = new Map(sim.map((n, i) => [n.id, i]));
        const simLinks = links
            .map(l => ({ a: index.get(l.source)!, b: index.get(l.target)!, strength: l.strength }))
            .filter(l => l.a !== undefined && l.b !== undefined);
        const maxStrength = Math.max(1, ...simLinks.map(l => l.strength));

        const applyPositions = () => {
            for (const n of sim) {
                nodeElRefs.current.get(n.id)?.setAttribute('transform', `translate(${n.x}, ${n.y})`);
            }
            links.forEach((l, i) => {
                const el = linkElRefs.current.get(i);
                if (!el) return;
                const a = sim[index.get(l.source)!];
                const b = sim[index.get(l.target)!];
                if (!a || !b) return;
                el.setAttribute('x1', String(a.x));
                el.setAttribute('y1', String(a.y));
                el.setAttribute('x2', String(b.x));
                el.setAttribute('y2', String(b.y));
            });
            const centroid = new Map<string, { x: number; y: number; n: number }>();
            for (const n of sim) {
                const c = centroid.get(n.parent) || { x: 0, y: 0, n: 0 };
                c.x += n.x; c.y += n.y; c.n += 1;
                centroid.set(n.parent, c);
            }
            centroid.forEach((c, parent) => {
                galaxyElRefs.current.get(parent)?.setAttribute('transform', `translate(${c.x / c.n}, ${c.y / c.n})`);
            });
        };

        alphaRef.current = 1;
        let raf = 0;

        const tick = () => {
            const alpha = alphaRef.current;
            const { width: W, height: H } = dimsRef.current;
            const centerX = W / 2;
            const centerY = H / 2;

            // Live galaxy centroids for cluster gravity.
            const centroid = new Map<string, { x: number; y: number; n: number }>();
            for (const n of sim) {
                const c = centroid.get(n.parent) || { x: 0, y: 0, n: 0 };
                c.x += n.x; c.y += n.y; c.n += 1;
                centroid.set(n.parent, c);
            }
            centroid.forEach(c => { c.x /= c.n; c.y /= c.n; });

            // Charge: mutual repulsion so stars spread out.
            for (let i = 0; i < sim.length; i++) {
                for (let j = i + 1; j < sim.length; j++) {
                    const a = sim[i], b = sim[j];
                    let dx = b.x - a.x, dy = b.y - a.y;
                    let d2 = dx * dx + dy * dy;
                    if (d2 < 1) { d2 = 1; dx = 0.5; dy = 0.5; }
                    const d = Math.sqrt(d2);
                    const rep = (CHARGE / d2) * alpha;
                    const fx = (dx / d) * rep, fy = (dy / d) * rep;
                    a.vx -= fx; a.vy -= fy;
                    b.vx += fx; b.vy += fy;
                }
            }

            // Links: springs pulling shared-genre stars together.
            for (const l of simLinks) {
                const a = sim[l.a], b = sim[l.b];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const rest = a.radius + b.radius + 46;
                const weight = 0.35 + 0.55 * (l.strength / maxStrength);
                const f = (d - rest) * LINK_K * weight * alpha;
                const fx = (dx / d) * f, fy = (dy / d) * f;
                a.vx += fx; a.vy += fy;
                b.vx -= fx; b.vy -= fy;
            }

            // Cluster gravity (toward galaxy centroid) + gentle centering.
            for (const n of sim) {
                const c = centroid.get(n.parent)!;
                n.vx += (c.x - n.x) * CLUSTER_K * alpha;
                n.vy += (c.y - n.y) * CLUSTER_K * alpha;
                n.vx += (centerX - n.x) * CENTER_K * alpha;
                n.vy += (centerY - n.y) * CENTER_K * alpha;
            }

            // Integrate with damping; pin the dragged node.
            const drag = dragRef.current;
            for (const n of sim) {
                if (drag && drag.id === n.id) {
                    n.x = drag.x; n.y = drag.y; n.vx = 0; n.vy = 0;
                    continue;
                }
                n.vx = Math.max(-40, Math.min(40, n.vx)) * 0.72;
                n.vy = Math.max(-40, Math.min(40, n.vy)) * 0.72;
                n.x += n.vx;
                n.y += n.vy;
                const pad = n.radius + 12;
                n.x = Math.max(pad, Math.min(W - pad, n.x));
                n.y = Math.max(pad, Math.min(H - pad, n.y));
            }

            // Collision: keep stars from overlapping.
            for (let i = 0; i < sim.length; i++) {
                for (let j = i + 1; j < sim.length; j++) {
                    const a = sim[i], b = sim[j];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    const min = a.radius + b.radius + 6;
                    if (d < min) {
                        const push = (min - d) / 2;
                        const ox = (dx / d) * push, oy = (dy / d) * push;
                        if (!(drag && drag.id === a.id)) { a.x -= ox; a.y -= oy; }
                        if (!(drag && drag.id === b.id)) { b.x += ox; b.y += oy; }
                    }
                }
            }

            applyPositions();

            alphaRef.current = alpha * 0.985;
            if (alphaRef.current > 0.02 || dragRef.current) {
                raf = requestAnimationFrame(tick);
            } else {
                runningRef.current = false;
            }
        };

        reheatRef.current = () => {
            alphaRef.current = Math.max(alphaRef.current, 0.5);
            if (!runningRef.current) {
                runningRef.current = true;
                raf = requestAnimationFrame(tick);
            }
        };

        applyPositions();
        runningRef.current = true;
        raf = requestAnimationFrame(tick);
        return () => {
            runningRef.current = false;
            cancelAnimationFrame(raf);
        };
    }, [sim, links]);

    // Reheat on resize so the layout re-settles into the new bounds.
    useEffect(() => {
        reheatRef.current?.();
    }, [dimensions.width, dimensions.height]);

    // Interaction: drag stars around.
    const pointToCanvas = (e: React.PointerEvent) => {
        const svg = canvasRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        const { x, y } = pointToCanvas(e);
        dragRef.current = { id: nodeId, x, y };
        downRef.current = { x, y };
        movedRef.current = false;
        reheatRef.current?.();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        const { x, y } = pointToCanvas(e);
        if (downRef.current) {
            const dx = x - downRef.current.x, dy = y - downRef.current.y;
            if (dx * dx + dy * dy > 16) movedRef.current = true;
        }
        dragRef.current = { id: dragRef.current.id, x, y };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        // A press without meaningful movement is a click: toggle the pin.
        if (dragRef.current && !movedRef.current) {
            const id = dragRef.current.id;
            setPinnedNode(prev => (prev === id ? null : id));
        }
        dragRef.current = null;
        downRef.current = null;
        const target = e.target as Element;
        if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
    };

    // Clicking empty space clears any pinned star.
    const handleBackgroundPointerDown = (e: React.PointerEvent) => {
        if (e.target === canvasRef.current) setPinnedNode(null);
    };

    const nodeById = useMemo(() => new Map(nodeData.map(n => [n.id, n])), [nodeData]);
    const maxLinkStrength = useMemo(() => Math.max(1, ...links.map(l => l.strength)), [links]);

    // One soft radial gradient per galaxy colour replaces the old per-node
    // feGaussianBlur filter, which was far too expensive to repaint every frame.
    const glowColors = useMemo(() => Array.from(new Set(nodeData.map(n => n.color))), [nodeData]);
    const glowId = (color: string) => `genre-glow-${color.slice(1)}`;

    // Which works sit behind each genre, so hovering a star reveals real titles.
    const genreWorks = useMemo(() => {
        const map = new Map<string, Work[]>();
        works.forEach(work => {
            resolveWorkGenres(work.genres).forEach(genre => {
                const list = map.get(genre);
                if (list) list.push(work);
                else map.set(genre, [work]);
            });
        });
        return map;
    }, [works]);

    // Ranked series / standalone titles for the hovered genre.
    const hoveredInfo = useMemo(() => {
        if (!selected) return null;
        const list = genreWorks.get(selected) || [];
        const seriesCount = new Map<string, number>();
        const standalone: string[] = [];
        list.forEach(work => {
            if (work.seriesName) seriesCount.set(work.seriesName, (seriesCount.get(work.seriesName) || 0) + 1);
            else standalone.push(work.title);
        });
        const items = [
            ...Array.from(seriesCount.entries()).map(([label, count]) => ({ label, count, series: true })),
            ...standalone.map(label => ({ label, count: 1, series: false }))
        ]
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
        const node = nodeById.get(selected);
        return {
            count: list.length,
            seriesTotal: seriesCount.size,
            items,
            parent: node?.parent ?? '',
            color: node?.color ?? colorFor('Other')
        };
    }, [selected, genreWorks, nodeById]);

    return (
        <PaperCard elevation="md" className={styles.container} enableSand>
            <div className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>Genre Map</span>
                    <h3 className={styles.title}>Constellation</h3>
                </div>
                <div className={styles.stats}>
                    <span>{nodeData.length} genres</span>
                    <span>{galaxies.length} galaxies</span>
                    <span>{links.length} links</span>
                </div>
            </div>
            <div ref={containerRef} className={styles.graphContainer}>
                <div className={styles.starfield} />
                <svg
                    ref={canvasRef}
                    width="100%"
                    height="100%"
                    onPointerDown={handleBackgroundPointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className={styles.canvas}
                >
                    <defs>
                        <radialGradient id="genre-core" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
                            <stop offset="45%" stopColor="rgba(255,255,255,0.06)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </radialGradient>
                        {glowColors.map(color => (
                            <radialGradient key={color} id={glowId(color)} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                                <stop offset="55%" stopColor={color} stopOpacity="0.14" />
                                <stop offset="100%" stopColor={color} stopOpacity="0" />
                            </radialGradient>
                        ))}
                    </defs>

                    {/* Galaxy haze + label at each cluster centroid (positioned by the sim) */}
                    {galaxies.filter(g => g.nodes >= 2).map(g => (
                        <g
                            key={`galaxy-${g.name}`}
                            className={styles.hub}
                            ref={el => {
                                if (el) galaxyElRefs.current.set(g.name, el);
                                else galaxyElRefs.current.delete(g.name);
                            }}
                        >
                            <circle r={galaxyHazeRadius(g.nodes)} fill={g.color} opacity="0.05" />
                            <text y={-galaxyHazeRadius(g.nodes) + 4} textAnchor="middle" className={styles.hubLabel}>
                                {g.name}
                            </text>
                        </g>
                    ))}

                    {/* Persistent connection lines (co-occurring genres) */}
                    {links.map((link, i) => {
                        const active = selected === link.source || selected === link.target;
                        const dimmed = selected !== null && !active;
                        // Fade weak links so the strong co-occurrence backbone stands out.
                        const strengthOpacity = 0.18 + 0.82 * (link.strength / maxLinkStrength);
                        return (
                            <line
                                key={`link-${i}`}
                                ref={el => {
                                    if (el) linkElRefs.current.set(i, el);
                                    else linkElRefs.current.delete(i);
                                }}
                                className={active ? styles.linkActive : styles.link}
                                strokeWidth={Math.min(4, Math.max(0.5, link.strength * 0.35))}
                                opacity={active ? 1 : dimmed ? 0.06 : strengthOpacity}
                            />
                        );
                    })}

                    {/* Stars (positioned by the sim via transform) */}
                    {sim.map(node => {
                        const dimmed = selected !== null && !activeConnections.has(node.id);
                        const active = selected === node.id;
                        const pinned = pinnedNode === node.id;
                        return (
                            <g
                                key={node.id}
                                ref={el => {
                                    if (el) nodeElRefs.current.set(node.id, el);
                                    else nodeElRefs.current.delete(node.id);
                                }}
                                transform={`translate(${node.x}, ${node.y})`}
                                onPointerDown={(e) => handlePointerDown(e, node.id)}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className={styles.node}
                                opacity={dimmed ? 0.24 : 1}
                            >
                                <circle r={node.radius + (active ? 16 : 9)} fill="url(#genre-core)" className={active ? styles.nodeAuraActive : styles.nodeAura} />
                                <circle r={node.radius * 2.4} fill={`url(#${glowId(node.color)})`} className={styles.nodeAura} />
                                <circle
                                    r={node.radius}
                                    fill={node.color}
                                    fillOpacity={node.isMajor ? 0.96 : 0.72}
                                    stroke={pinned ? '#ffffff' : active || node.isMajor ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.18)'}
                                    strokeWidth={pinned ? 3 : active ? 2.5 : 1.25}
                                />
                                {pinned && (
                                    <circle r={node.radius + 11} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="3 4" />
                                )}
                                <circle r={Math.max(2, node.radius * 0.24)} fill="#ffffff" fillOpacity={node.isMajor ? 0.52 : 0.25} />

                                {(node.isMajor || active) && (
                                    <text dy={node.radius + 17} textAnchor="middle" className={active ? styles.nodeLabelActive : styles.nodeLabel}>
                                        {node.id}
                                    </text>
                                )}
                                {active && (
                                    <text dy={node.radius + 32} textAnchor="middle" className={styles.nodeCount}>
                                        {node.count} books
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {hoveredInfo && (
                    <div className={styles.infoPanel}>
                        <span className={styles.infoKicker} style={{ color: hoveredInfo.color }}>
                            {hoveredInfo.parent}{selected === pinnedNode && pinnedNode ? ' · pinned' : ''}
                        </span>
                        <strong>{selected}</strong>
                        <span>
                            {hoveredInfo.count} books
                            {hoveredInfo.seriesTotal > 0 && ` · ${hoveredInfo.seriesTotal} series`}
                        </span>
                        <div className={styles.topList}>
                            {hoveredInfo.items.map(item => (
                                <span className={styles.topGenre} key={item.label} title={item.label}>
                                    <span style={{ background: hoveredInfo.color, color: hoveredInfo.color }} />
                                    {item.label}{item.series && item.count > 1 ? ` ×${item.count}` : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.legend}>
                    {galaxies.slice(0, 6).map(g => (
                        <span key={`legend-${g.name}`} className={styles.legendItem}>
                            <span style={{ background: g.color }} />
                            {g.name}
                        </span>
                    ))}
                </div>
                <span className={styles.dragHint}>Drag stars · hover to trace links · click to pin</span>
            </div>
        </PaperCard>
    );
};
