'use client';

import React, { useState, useMemo } from 'react';
import { PaperCard } from '../ui/PaperCard';
import styles from './ReadingTimeline.module.css';
import { Work } from '@/lib/types';

export const ReadingTimeline = ({ works }: { works: Work[] }) => {
    const [metric, setMetric] = useState<'words' | 'hours'>('words');

    const data = useMemo(() => {
        interface MonthData {
            label: string;
            fullDate: Date;
            words: number;
            hours: number;
        }
        const months: MonthData[] = [];
        const today = new Date();

        // Generate last 12 months keys
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short' });
            // We use a simplified key like "Aug" but for sorting we might need more, 
            // but for this chart order is fixed to last 12 months.
            months.push({
                label: key,
                fullDate: d,
                words: 0,
                hours: 0
            });
        }

        // Aggregate
        works.forEach(w => {
            if (!w.dateRead) return;
            // Parse YYYY-MM-DD
            const [y, m, d] = w.dateRead.split('-').map(Number);
            const date = new Date(y, m - 1, d); // Construct date object

            // Find matching month bin
            const bin = months.find(bin =>
                bin.fullDate.getMonth() === date.getMonth() &&
                bin.fullDate.getFullYear() === date.getFullYear()
            );

            if (bin) {
                bin.words += (w.wordCount || 0);
                bin.hours += (w.durationMinutes || 0) / 60;
            }
        });

        return months;
    }, [works]);

    const maxValue = Math.max(...data.map(d => metric === 'words' ? d.words : d.hours)) || 1;
    const height = 280;
    const barWidth = 32;
    const gap = 12;

    return (
        <PaperCard elevation="md" className={styles.container} enableSand>
            <div className={styles.header}>
                <h3 className={styles.title}>Velocity (Last 12 Months)</h3>
                <div className={styles.toggles}>
                    <button
                        className={`${styles.toggle} ${metric === 'words' ? styles.active : ''}`}
                        onClick={() => setMetric('words')}
                    >
                        Words
                    </button>
                    <button
                        className={`${styles.toggle} ${metric === 'hours' ? styles.active : ''}`}
                        onClick={() => setMetric('hours')}
                    >
                        Hours
                    </button>
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <svg
                    width="100%"
                    height={320}
                    viewBox={`0 0 ${data.length * (barWidth + gap)} 320`}
                    preserveAspectRatio="xMidYMid meet"
                    className={styles.svg}
                >
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={metric === 'words' ? 'var(--ink-primary)' : 'var(--accent-gold)'} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={metric === 'words' ? 'var(--ink-primary)' : 'var(--accent-gold)'} stopOpacity="0.4" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1={height} x2="100%" y2={height} stroke="var(--ink-faint)" strokeWidth="1" />
                    <line x1="0" y1={height / 2} x2="100%" y2={height / 2} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                    <line x1="0" y1={0} x2="100%" y2={0} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

                    {data.map((d, i) => {
                        const val = metric === 'words' ? d.words : d.hours;
                        const barHeight = (val / maxValue) * height;
                        const x = i * (barWidth + gap);
                        const y = height - barHeight;

                        return (
                            <g key={i} className={styles.barGroup}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill="url(#barGradient)"
                                    className={styles.bar}
                                    rx="2"
                                />
                                <text
                                    x={x + barWidth / 2}
                                    y={height + 24}
                                    textAnchor="middle"
                                    fill="var(--ink-secondary)"
                                    fontSize="10"
                                    fontFamily="var(--font-sans)"
                                >
                                    {d.label}
                                </text>
                                {val > 0 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 4}
                                        textAnchor="middle"
                                        fill="var(--ink-primary)"
                                        fontSize="9"
                                        fontWeight="bold"
                                    >
                                        {metric === 'words' ? (val / 1000).toFixed(0) + 'k' : val.toFixed(1)}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </PaperCard>
    );
};
