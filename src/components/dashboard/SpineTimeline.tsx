import React from 'react';
import styles from './SpineTimeline.module.css';
import { Work } from '@/lib/types';
import BookSpine from '@/components/ui/BookSpine';

interface SpineTimelineProps {
    works: Work[];
}

const SpineTimeline: React.FC<SpineTimelineProps> = ({ works }) => {
    // Sort by date read (asc) for timeline effect
    const sortedWorks = [...works]
        .filter(w => w.status === 'read' && w.dateRead)
        .sort((a, b) => new Date(a.dateRead!).getTime() - new Date(b.dateRead!).getTime());

    return (
        <div className={styles.timelineContainer}>
            <div className={styles.timelineScroll}>
                {sortedWorks.map((work) => (
                    <BookSpine key={work.id} work={work} />
                ))}
            </div>
            <div className={styles.shelf} />
        </div>
    );
};

export default SpineTimeline;
