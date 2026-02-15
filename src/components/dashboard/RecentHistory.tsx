"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PaperCard } from '@/components/ui/PaperCard';
import { Work } from '@/lib/types';
import styles from '@/app/page.module.css'; // We can reuse the page module styles if we pass them or import them

interface RecentHistoryProps {
    works: Work[];
}

export const RecentHistory: React.FC<RecentHistoryProps> = ({ works }) => {
    const [visibleCount, setVisibleCount] = useState(5);

    const visibleWorks = works.slice(0, visibleCount);
    const hasMore = visibleCount < works.length;

    const handleShowMore = () => {
        setVisibleCount(prev => prev + 5);
    };

    return (
        <div className={styles.recentHistoryContainer}>
            <div className={styles.sectionHeader}>
                <h2>Recent History</h2>
            </div>

            <div className={styles.historyList}>
                {visibleWorks.map(work => (
                    <Link href={`/book/${work.id}`} key={work.id} style={{ textDecoration: 'none' }}>
                        <PaperCard
                            elevation="sm"
                            className={styles.historyCard}
                            interactive
                            style={{
                                backgroundImage: work.coverImage
                                    ? `linear-gradient(to right, rgba(15, 15, 20, 0.95) 0%, rgba(15, 15, 20, 0.7) 100%), url(${work.coverImage})`
                                    : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center center',
                            }}
                        >
                            <div className={styles.historyRow}>
                                <span className={styles.historyTitle} style={{ color: work.coverImage ? '#e0e0e0' : undefined }}>{work.title}</span>
                                <span className={styles.rating}>{'★'.repeat(work.rating || 0)}</span>
                                <span className={styles.date} style={{ color: work.coverImage ? '#aaaaaa' : undefined }}>{work.dateRead}</span>
                            </div>
                        </PaperCard>
                    </Link>
                ))}
            </div>

            {hasMore && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button
                        onClick={handleShowMore}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--ink-secondary)',
                            color: 'var(--ink-primary)',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--ink-primary)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--ink-secondary)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Show More
                    </button>
                </div>
            )}
        </div>
    );
};
