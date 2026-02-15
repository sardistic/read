"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { PaperCard } from '../ui/PaperCard';
import { Work } from '@/lib/types';
import styles from './GenreDistribution.module.css';
import { aggregateGenres, normalizeGenre } from '@/lib/genreUtils';

interface Node {
    id: string; // Genre Name
    count: number;
    parent: string;
    isMajor: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
}

interface Link {
    source: string;
    target: string;
    strength: number; // Shared books count
}

// Dynamic Galaxy Palette
const GALAXY_COLORS: Record<string, string> = {
    'Science Fiction': '#4cc9f0',
    'Fantasy': '#f72585',
    'Horror': '#7209b7',
    'Mystery & Thriller': '#4361ee',
    'History & Memoir': '#ffd166',
    'Science & Thought': '#06d6a0',
    'Society & Business': '#ef476f',
    'Spirituality': '#b5179e',
    'Arts & Poetry': '#560bad',
    'Comics & Manga': '#3a0ca3',
    'Romance': '#ff4d6d',
    'Other': '#adb5bd'
};

export const GenreDistribution = ({ works }: { works: Work[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<SVGSVGElement>(null);
    const [tooltipToken, setTooltipToken] = useState<{ x: number, y: number, content: string } | null>(null);


    // State for Simulation
    const [nodes, setNodes] = useState<Node[]>([]);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const isDragging = useRef<string | null>(null);

    // 1. Process Data (Pure calculation)
    const { nodes: filteredNodes, links: initialLinks } = useMemo(() => {
        const allGenres = works.flatMap(w => w.genres);
        const aggregated = aggregateGenres(allGenres);

        // Filter out noise (< 6 books)
        const nodeData = aggregated
            .filter((g: { value: number }) => g.value >= 6)
            .map((g: { name: string; value: number; parent: string }) => {
                const isMajor = g.value >= 15; // Raised threshold for major distinction
                const radius = Math.pow(g.value, 0.4) * 4;

                return {
                    id: g.name,
                    count: g.value,
                    parent: g.parent,
                    isMajor,
                    x: 400 + (Math.random() - 0.5) * 100,
                    y: 250 + (Math.random() - 0.5) * 100,
                    vx: 0,
                    vy: 0,
                    radius,
                    color: GALAXY_COLORS[g.parent] || GALAXY_COLORS['Other']
                };
            });

        const maxCount = Math.max(...nodeData.map(n => n.count)) || 1;
        const parents = Object.keys(GALAXY_COLORS);

        // Cartographic Neighborhood Hubs (Fixed regions for each category)
        const nodes: Node[] = nodeData.map((n: Node) => {
            const parentIndex = parents.indexOf(n.parent);
            // 4 columns, 3 rows grid for 12 categories
            const col = parentIndex % 4;
            const row = Math.floor(parentIndex / 4);
            const hubX = 100 + col * 180;
            const hubY = 80 + row * 100;

            const angle = Math.random() * Math.PI * 2;
            const dist = (1 - n.count / maxCount) * 40 + 10;

            return {
                ...n,
                x: hubX + Math.cos(angle) * dist,
                y: hubY + Math.sin(angle) * dist
            };
        });

        const nodeNames = new Set(nodes.map(n => n.id));

        // Create Links (Shared Books)
        const linkMap = new Map<string, number>();
        works.forEach(w => {
            const bookGenres = w.genres
                .map(g => normalizeGenre(g))
                .filter((g): g is string => g !== null && nodeNames.has(g));

            const unique = Array.from(new Set(bookGenres)).sort();
            for (let i = 0; i < unique.length; i++) {
                for (let j = i + 1; j < unique.length; j++) {
                    const key = `${unique[i]}|${unique[j]}`;
                    linkMap.set(key, (linkMap.get(key) || 0) + 1);
                }
            }
        });

        const links: Link[] = Array.from(linkMap.entries())
            .map(([key, count]) => {
                const [source, target] = key.split('|');
                return { source, target, strength: count };
            })
            .filter(l => l.strength >= 1);

        return { nodes, links };
    }, [works]);

    // 2. Manage Dimensions
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width || 800, height: rect.height || 200 });
            }
        };

        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        updateSize();

        return () => observer.disconnect();
    }, []);

    // 3. Initialize/Reset Nodes when data or initial centering changes
    useEffect(() => {
        const centeredNodes = filteredNodes.map(n => ({
            ...n,
            x: dimensions.width / 2 + (Math.random() - 0.5) * 100,
            y: dimensions.height / 2 + (Math.random() - 0.5) * 100
        }));
        setNodes(centeredNodes);
    }, [filteredNodes, dimensions.width === 800]);

    // 4. Physics Simulation (Static Warm-up)
    useEffect(() => {
        if (nodes.length === 0) return;

        const { width, height } = dimensions;
        const center = { x: width / 2, y: height / 2 };

        // Physics Constants (Structured Sector Layout)
        const repulsion = 100; // Lower repulsion to preserve sectors
        const springLength = 80;
        const springK = 0.01;
        const dampening = 0.85;
        const centerGravity = 0.02;
        const clusterStrength = 0.08; // Strong pull to parent sector

        const maxCount = Math.max(...nodes.map(n => n.count)) || 1;

        setNodes(prevNodes => {
            let workingNodes: Node[] = prevNodes.map((n: Node) => ({ ...n }));

            for (let iter = 0; iter < 60; iter++) {
                // Gravity & Clustering (Scale Gravity by Relevance)
                workingNodes.forEach((node: Node) => {
                    const dx = center.x - node.x;
                    const dy = center.y - node.y;
                    const distToCenter = Math.sqrt(dx * dx + dy * dy);

                    // Proportional Gravity: Significant genres are pulled harder to core
                    const relevanceScale = node.count / maxCount;
                    const baseGravity = distToCenter > width * 0.4 ? centerGravity * 5 : centerGravity;
                    const gravityScale = baseGravity * (0.5 + relevanceScale * 1.5);

                    node.vx += dx * gravityScale;
                    node.vy += dy * gravityScale;

                    const clusterNodes = workingNodes.filter((n: Node) => n.parent === node.parent);
                    if (clusterNodes.length > 1) {
                        const parentIndex = Object.keys(GALAXY_COLORS).indexOf(node.parent);
                        const col = parentIndex % 4;
                        const row = Math.floor(parentIndex / 4);
                        const targetX = 100 + col * 180;
                        const targetY = 80 + row * 100;

                        node.vx += (targetX - node.x) * clusterStrength;
                        node.vy += (targetY - node.y) * clusterStrength;
                    }
                });

                // Repulsion
                const interactionDist = 400;
                for (let i = 0; i < workingNodes.length; i++) {
                    for (let j = i + 1; j < workingNodes.length; j++) {
                        const n1 = workingNodes[i];
                        const n2 = workingNodes[j];
                        const dx = n1.x - n2.x;
                        const dy = n1.y - n2.y;
                        const distSq = dx * dx + dy * dy || 1;
                        if (distSq > interactionDist * interactionDist) continue;
                        const dist = Math.sqrt(distSq);
                        const force = (repulsion * (n1.radius + n2.radius)) / (distSq * 1.5 + 1);
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        n1.vx += fx; n1.vy += fy;
                        n2.vx -= fx; n2.vy -= fy;
                    }
                }

                // Links
                initialLinks.forEach(link => {
                    const source = workingNodes.find((n: Node) => n.id === link.source);
                    const target = workingNodes.find((n: Node) => n.id === link.target);
                    if (source && target) {
                        const dx = target.x - source.x;
                        const dy = target.y - source.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const linkForce = (dist - springLength) * springK * (link.strength * 0.5 + 0.5);
                        const fx = (dx / dist) * linkForce;
                        const fy = (dy / dist) * linkForce;
                        source.vx += fx; source.vy += fy;
                        target.vx -= fx; target.vy -= fy;
                    }
                });

                // Movement
                workingNodes.forEach((node: Node) => {
                    node.x += node.vx;
                    node.y += node.vy;
                    node.vx *= dampening;
                    node.vy *= dampening;

                    // Bounds (Zero Padding)
                    const padding = 0;
                    if (node.x < padding) { node.x = padding; node.vx = 0; }
                    if (node.x > width - padding) { node.x = width - padding; node.vx = 0; }
                    if (node.y < padding) { node.y = padding; node.vy = 0; }
                    if (node.y > height - padding) { node.y = height - padding; node.vy = 0; }
                });
            }
            return workingNodes;
        });
    }, [initialLinks, filteredNodes, dimensions.width === 800]);

    // Interaction Handlers
    const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
        const node = nodes.find((n: Node) => n.id === nodeId);
        if (!node) return;
        (e.target as Element).setPointerCapture(e.pointerId);
        isDragging.current = nodeId;
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const svg = canvasRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setNodes(prev => prev.map((n: Node) => {
            if (n.id === isDragging.current) {
                return { ...n, x, y, vx: 0, vy: 0 };
            }
            return n;
        }));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = null;
        (e.target as Element).releasePointerCapture(e.pointerId);
    };

    return (
        <PaperCard elevation="md" className={styles.container} enableSand style={{ padding: 0 }}>
            <h3 className={styles.title} style={{ margin: '16px 0 0 16px' }}>Genre Constellation</h3>
            <div
                ref={containerRef}
                className={styles.graphContainer}
                style={{ width: '100%', height: '350px', minHeight: '350px', position: 'relative', overflow: 'hidden' }}
            >
                <svg
                    ref={canvasRef}
                    width="100%"
                    height="100%"
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    style={{ overflow: 'visible', cursor: 'all-scroll' }}
                >
                    <defs>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background Category Anchors (Faint Labels) */}
                    {Object.keys(GALAXY_COLORS).map((p, i) => {
                        const col = i % 4;
                        const row = Math.floor(i / 4);
                        return (
                            <text
                                key={`hub-${p}`}
                                x={100 + col * 180}
                                y={80 + row * 100}
                                textAnchor="middle"
                                fill="var(--ink-secondary)"
                                opacity="0.05"
                                fontSize="2.5rem"
                                fontWeight="900"
                                style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}
                            >
                                {p.split(' ')[0]}
                            </text>
                        );
                    })}

                    {/* Links */}
                    {initialLinks.map((link: Link, i: number) => {
                        const source = nodes.find((n: Node) => n.id === link.source);
                        const target = nodes.find((n: Node) => n.id === link.target);
                        if (!source || !target) return null;

                        return (
                            <line
                                key={`link-${i}`}
                                x1={source.x} y1={source.y}
                                x2={target.x} y2={target.y}
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth={Math.min(1.2, Math.max(0.3, link.strength * 0.25))}
                            />
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <g
                            key={node.id}
                            transform={`translate(${node.x}, ${node.y})`}
                            onPointerDown={(e) => handlePointerDown(e, node.id)}
                            onMouseEnter={() => {
                                setHoveredNode(node.id);
                                setTooltipToken({ x: node.x, y: node.y, content: `${node.id}: ${node.count} books` });
                            }}
                            onMouseLeave={() => {
                                setHoveredNode(null);
                                setTooltipToken(null);
                            }}
                            style={{ cursor: 'grab' }}
                        >
                            <circle
                                r={node.radius + 5}
                                fill={node.color}
                                fillOpacity={0.12}
                                filter="url(#glow)"
                            />
                            <circle
                                r={node.radius}
                                fill={node.color}
                                fillOpacity={node.isMajor ? 0.95 : 0.6}
                                stroke={node.isMajor ? "rgba(255,255,255,0.4)" : "none"}
                                strokeWidth={2}
                            />

                            {hoveredNode === node.id && (
                                <text
                                    dy={node.radius + 15}
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize="0.75rem"
                                    fontWeight="700"
                                    style={{
                                        pointerEvents: 'none',
                                        textShadow: '0 0 10px rgba(0,0,0,0.9)',
                                        fontFamily: 'Inter, sans-serif',
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {node.id}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>

                {tooltipToken && (
                    <div style={{
                        position: 'absolute',
                        left: tooltipToken.x,
                        top: tooltipToken.y - 40,
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: '#fff',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        zIndex: 10
                    }}>
                        {tooltipToken.content}
                    </div>
                )}
            </div>
        </PaperCard>
    );
};
