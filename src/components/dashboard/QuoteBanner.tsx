"use client";

import React, { useEffect, useState } from 'react';
import { Work } from '@/lib/types';
import { PaperCard } from '../ui/PaperCard';
import styles from './QuoteBanner.module.css';

interface QuoteBannerProps {
    works: Work[];
}

interface QuoteData {
    text: string;
    author: string;
    bookTitle: string;
}

export const QuoteBanner: React.FC<QuoteBannerProps> = ({ works }) => {
    const [quote, setQuote] = useState<QuoteData | null>(null);

    useEffect(() => {
        // Gather all quotes
        const allQuotes: QuoteData[] = [];
        works.forEach(w => {
            if (w.quotes && w.quotes.length > 0) {
                w.quotes.forEach(q => {
                    if (typeof q === 'string') {
                        allQuotes.push({
                            text: q,
                            author: w.author,
                            bookTitle: w.title
                        });
                    } else {
                        allQuotes.push({
                            text: q.text,
                            author: q.character, // Use character as primary author
                            bookTitle: w.title
                        });
                    }
                });
            }
        });

        if (allQuotes.length > 0) {
            const random = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            setQuote(random);
        }
    }, [works]);

    if (!quote) return null;

    const cycleQuote = () => {
        // Re-gather quotes (in a real app, optimize this to not re-run on every click if list doesn't change)
        // Or better: move data gathering to a useMemo or just reuse the logic if it's cheap.
        // Actually, let's just pick a random one from the existing 'quote' state? No, we need the full list.
        // Let's optimize: Store allQuotes in a state or ref.
    };

    return (
        <PaperCard
            elevation="flat"
            className={styles.banner}
            isObstacle={false}
            onClick={() => {
                const allQuotes: QuoteData[] = [];
                works.forEach(w => {
                    if (w.quotes && w.quotes.length > 0) {
                        w.quotes.forEach(q => {
                            if (typeof q === 'string') {
                                allQuotes.push({
                                    text: q,
                                    author: w.author,
                                    bookTitle: w.title
                                });
                            } else {
                                allQuotes.push({
                                    text: q.text,
                                    author: q.character,
                                    bookTitle: w.title
                                });
                            }
                        });
                    }
                });
                if (allQuotes.length > 0) {
                    let nextQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
                    // Simple retry to avoid same quote
                    if (nextQuote.text === quote.text && allQuotes.length > 1) {
                        nextQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
                    }
                    setQuote(nextQuote);
                }
            }}
        >
            <blockquote className={styles.quote}>
                "{quote.text}"
            </blockquote>
            <div className={styles.citation}>
                <span className={styles.author}>— {quote.author}</span>
                <span className={styles.book}>, from <i>{quote.bookTitle}</i></span>
            </div>
            <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                fontSize: '0.7rem',
                opacity: 0.3,
                fontStyle: 'italic'
            }}>
                (Click to cycle)
            </div>
        </PaperCard>
    );
};
