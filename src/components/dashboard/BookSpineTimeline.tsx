"use client";

import React, { useState } from 'react';
import { Work } from '@/lib/types';
import styles from './BookSpineTimeline.module.css';

interface BookSpineTimelineProps {
    works: Work[];
}

export const BookSpineTimeline: React.FC<BookSpineTimelineProps> = ({ works }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Sort by date read (Oldest First -> Recent)
    const sortedWorks = [...works]
        .filter(w => w.status === 'read')
        .sort((a, b) => {
            // Sort by date read, falling back to date added
            const getTime = (w: Work) => {
                if (w.dateRead) return new Date(w.dateRead).getTime();
                if (w.dateAdded) return new Date(w.dateAdded).getTime();
                return 0;
            };

            const timeA = getTime(a);
            const timeB = getTime(b);

            if (timeA !== timeB) {
                return timeA - timeB;
            }

            // Stable sort by title if dates are equal
            return a.title.localeCompare(b.title);
        });

    const handleSpineClick = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    // Duplicate works for loop (triple to ensure smooth infinite scroll)
    const displayWorks = [...sortedWorks, ...sortedWorks, ...sortedWorks];

    // Refs for animation and dragging
    const scrollRef = React.useRef(0);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const animationFrameRef = React.useRef<number | null>(null);
    const isDraggingRef = React.useRef(false);
    const startXRef = React.useRef(0);
    const lastScrollRef = React.useRef(0);
    const isPausedRef = React.useRef(false);

    // Optimized Animation Loop (No State Updates)
    React.useEffect(() => {
        const itemWidth = 24; // 20px + 4px gap
        const totalSetWidth = sortedWorks.length * itemWidth;
        const maxScroll = totalSetWidth * 2; // Loop point

        const animate = () => {
            // Mobile Optimization: Disable auto-scroll logic entirely on small screens
            // We check this inside the loop or just once? checking window width is cheap enough
            const isMobile = window.innerWidth < 768;

            if (!isDraggingRef.current && !isPausedRef.current && wrapperRef.current && !isMobile) {
                // VERY Slow Auto-scroll speed
                const speed = 0.2;
                scrollRef.current += speed;

                // Infinite Loop Reset
                if (scrollRef.current >= maxScroll) {
                    scrollRef.current -= totalSetWidth;
                } else if (scrollRef.current < 0) {
                    scrollRef.current += totalSetWidth;
                }

                // Direct DOM update (Zero React Re-renders)
                wrapperRef.current.style.transform = `translateX(-${scrollRef.current}px)`;
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [sortedWorks.length]);

    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        startXRef.current = e.pageX;
        lastScrollRef.current = scrollRef.current;
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || !wrapperRef.current) return;
        e.preventDefault();
        const delta = e.pageX - startXRef.current;
        scrollRef.current = lastScrollRef.current - delta;
        wrapperRef.current.style.transform = `translateX(-${scrollRef.current}px)`;
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab';
    };

    // We need a dedicated selected state for the modal data
    const [selectedWork, setSelectedWork] = React.useState<Work | null>(null);

    return (
        <>
            <div
                className={styles.container}
                onMouseEnter={() => isPausedRef.current = true}
                onMouseLeave={() => {
                    isPausedRef.current = false;
                    isDraggingRef.current = false; // Safety reset
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <div
                    className={styles.scrollWrapper}
                    ref={wrapperRef}
                    // Initial transform
                    style={{ transform: 'translateX(0px)' }}
                >
                    {displayWorks.map((work, index) => {
                        const uniqueKey = `${work.id}-${index}`;
                        // We no longer expand in-place, but we can highlight?
                        const isExpanded = false;

                        // Height based on page count (Clamped)
                        const pageCount = work.pageCount || 300;
                        const heightPercent = Math.min(100, Math.max(60, 60 + ((pageCount - 200) / 800) * 40));

                        // Generate a deterministic "slice" of the cover for the spine
                        const hash = work.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const positionPercent = 10 + (hash % 80);

                        // Organic Sway/Lean Logic (CSS-based, performant)
                        const randomSwayDuration = 5 + (hash % 5) + 's';
                        const randomDelay = '-' + (hash % 5) + 's';
                        const randomLean = (hash % 3) - 1.5;

                        return (
                            <div
                                key={uniqueKey}
                                className={`${styles.spineWrapper}`}
                                style={{
                                    height: `${heightPercent}%`,
                                    transform: `rotate(${randomLean}deg)`,
                                    zIndex: 1,
                                }}
                                onClick={() => setSelectedWork(work)}
                                title={`${work.title} (${pageCount} pages)`}
                            >
                                <div
                                    className={`${styles.spine}`}
                                    style={{
                                        backgroundColor: work.coverImage ? 'transparent' : '#2a2a2a',
                                        backgroundImage: work.coverImage ? `url(${work.coverImage})` : undefined,
                                        backgroundPosition: `${positionPercent}% center`,
                                        backgroundSize: 'cover',
                                        // Animation handled by CSS class on hover
                                        // animationDuration: randomSwayDuration,
                                        // animationDelay: randomDelay,
                                    }}
                                >
                                    {/* Always show text, overlaid on cover slice or blank spine */}
                                    <div className={styles.spineText}>
                                        {work.title.split('(')[0].trim()}
                                    </div>
                                    {(!work.coverImage) && (
                                        <div className={styles.spineLabel} style={{ display: 'none' }}>
                                            {/* Legacy fallback hidden */}
                                        </div>
                                    )}

                                    <div className={styles.spineOverlay} />

                                    <div className={styles.details}>
                                        <span className={styles.rating}>{'★'.repeat(work.rating || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Book Detail Modal */}
            {selectedWork && (
                <div className={styles.modalOverlay} onClick={() => setSelectedWork(null)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.closeButton} onClick={() => setSelectedWork(null)}>×</button>

                        {selectedWork.coverImage && (
                            <img src={selectedWork.coverImage} alt={selectedWork.title} className={styles.modalCover} />
                        )}

                        <div className={styles.modalContent}>
                            <h2 className={styles.modalTitle}>{selectedWork.title}</h2>
                            <p className={styles.modalAuthor}>by {selectedWork.author}</p>

                            <p className={styles.modalExcerpt}>
                                {selectedWork.description
                                    ? selectedWork.description
                                    : "No description available for this book."}
                            </p>

                            <div className={styles.modalActions}>
                                <a href={`/book/${selectedWork.id}`} className={styles.viewButton}>
                                    View Book Page
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
