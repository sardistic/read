import React from 'react';
import Link from 'next/link';
import styles from './BookSpine.module.css';
import { Work } from '@/lib/types';

interface BookSpineProps {
    work: Work;
}

const BookSpine: React.FC<BookSpineProps> = ({ work }) => {
    return (
        <Link href={`/book/${work.id}`} className={styles.spineContainer} title={work.title}>
            <div className={styles.spineContent}>
                {work.coverImage && (
                    <div
                        className={styles.spineTexture}
                        style={{ backgroundImage: `url(${work.coverImage})` }}
                    />
                )}
                <div className={styles.spineOverlay} />
                <span className={styles.spineText}>
                    {work.title.split('(')[0].trim()}
                </span>
            </div>
        </Link>
    );
};

export default BookSpine;
