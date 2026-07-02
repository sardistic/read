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
            shortLabel: string;
            rangeLabel: string;
            fullDate: Date;
            words: number;
            hours: number;
            books: number;
            missingWords: number;
            missingHours: number;
            estimatedWords: number;
            estimatedHours: number;
        }
        const months: MonthData[] = [];
        const readDates = works
            .map(w => w.dateRead)
            .filter((date): date is string => Boolean(date))
            .map(date => {
                const [y, m, d] = date.split('-').map(Number);
                return new Date(y, m - 1, d || 1);
            })
            .filter(date => !Number.isNaN(date.getTime()));
        const latestReadDate = readDates.length
            ? new Date(Math.max(...readDates.map(date => date.getTime())))
            : new Date();
        const anchorMonth = new Date(latestReadDate.getFullYear(), latestReadDate.getMonth(), 1);

        for (let i = 11; i >= 0; i--) {
            const d = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() - i, 1);
            const key = d.toLocaleString('default', { month: 'short' });
            months.push({
                label: `${key} '${String(d.getFullYear()).slice(2)}`,
                shortLabel: key,
                rangeLabel: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
                fullDate: d,
                words: 0,
                hours: 0,
                books: 0,
                missingWords: 0,
                missingHours: 0,
                estimatedWords: 0,
                estimatedHours: 0
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
                const audiobookMinutes = w.audiobookDurationMinutes ||
                    (w.type === 'audiobook' && !w.metricSource?.durationMinutes?.includes('estimated')
                        ? w.durationMinutes || 0
                        : 0);
                bin.words += (w.wordCount || 0);
                bin.hours += audiobookMinutes / 60;
                bin.books += 1;
                if (!w.wordCount) bin.missingWords += 1;
                if (!audiobookMinutes) bin.missingHours += 1;
                if (w.wordCount && !w.metricSource?.wordCount?.includes('actual')) bin.estimatedWords += 1;
                if (audiobookMinutes && !w.metricSource?.audiobookDurationMinutes?.includes('itunes')) bin.estimatedHours += 1;
            }
        });

        return months;
    }, [works]);

    const maxValue = Math.max(...data.map(d => metric === 'words' ? d.words : d.hours)) || 1;
    const totalValue = data.reduce((sum, d) => sum + (metric === 'words' ? d.words : d.hours), 0);
    const estimateCount = data.reduce((sum, d) => sum + (metric === 'words' ? d.estimatedWords : d.estimatedHours), 0);
    const isEstimatedTotal = estimateCount > 0;
    const rangeText = data.length ? `${data[0].label} - ${data[data.length - 1].label}` : 'last 12 months';

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
                        Audio
                    </button>
                </div>
            </div>

            <div className={styles.chartWrapper}>
                <div className={styles.summary}>
                    <span>{metric === 'words' ? `${isEstimatedTotal ? '~' : ''}${Math.round(totalValue / 1000).toLocaleString()}k` : `${isEstimatedTotal ? '~' : ''}${Math.round(totalValue).toLocaleString()}h`}</span>
                    <small>{rangeText}</small>
                </div>
                <div className={styles.barList}>
                    {data.map((d) => {
                        const val = metric === 'words' ? d.words : d.hours;
                        const width = `${Math.max(val > 0 ? 6 : 0, (val / maxValue) * 100)}%`;
                        const displayValue = metric === 'words'
                            ? `${Math.round(val / 1000).toLocaleString()}k`
                            : `${val.toFixed(1)}h`;
                        const missingCount = metric === 'words' ? d.missingWords : d.missingHours;
                        const estimatedCount = metric === 'words' ? d.estimatedWords : d.estimatedHours;
                        const isEstimated = estimatedCount > 0;
                        const missingLabel = missingCount > 0 ? ` (${missingCount} missing ${metric === 'words' ? 'word counts' : 'hour counts'})` : '';
                        const estimatedLabel = isEstimated ? ` (${estimatedCount} estimated ${metric === 'words' ? 'word counts' : 'time values'})` : '';

                        return (
                            <div key={d.rangeLabel} className={styles.barRow} title={`${d.rangeLabel}: ${isEstimated ? '~' : ''}${displayValue}, ${d.books} books${missingLabel}${estimatedLabel}`}>
                                <span className={styles.month}>{d.label}</span>
                                <span className={styles.track}>
                                    <span
                                        className={styles.bar}
                                        style={{
                                            width,
                                            background: metric === 'words'
                                                ? 'linear-gradient(90deg, var(--ink-primary), rgba(255,255,255,0.42))'
                                                : 'linear-gradient(90deg, var(--accent-gold), rgba(255,209,102,0.34))'
                                        }}
                                    />
                                </span>
                                <span className={missingCount > 0 ? styles.valueMissing : isEstimated ? styles.valueEstimated : styles.value}>
                                    {val > 0 ? `${isEstimated ? '~' : ''}${displayValue}` : d.books > 0 ? `${d.books} books` : '-'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </PaperCard>
    );
};
