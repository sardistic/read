import Link from 'next/link';
import React from 'react';
import styles from './GlassHeader.module.css';

import { Work } from '@/lib/types';

interface GlassHeaderProps {
    currentRead?: Work;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ currentRead }) => {
    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                {/* Left Section: Logo + External Navigation */}
                <div className={styles.leftSection}>
                    <Link href="/" className={styles.logo}>
                        <img
                            src="/images/logo.webp"
                            alt="Logo"
                            className={styles.logoImage}
                        />
                        read
                    </Link>

                    <nav className={styles.nav}>
                        <a href="https://www.sardistic.com/" className={styles.link} target="_blank" rel="noopener noreferrer">return</a>
                        <a href="https://www.sardistic.com/gallery-landing/" className={styles.link} target="_blank" rel="noopener noreferrer">gallery</a>
                        <a href="https://audio.sardistic.com/" className={styles.link} target="_blank" rel="noopener noreferrer">audio</a>
                        <a href="https://chat.sardistic.com/" className={styles.link} target="_blank" rel="noopener noreferrer">chat</a>
                        <a href="https://course.sardistic.com/" className={styles.link} target="_blank" rel="noopener noreferrer">discourse</a>
                    </nav>
                </div>

                {/* Center / Right-ish: Currently Reading Widget */}
                {currentRead && (
                    <div className={styles.readingWidget}>
                        <div className={styles.readingCover} style={{ backgroundImage: `url(${currentRead.coverImage})` }} />
                        <div className={styles.readingInfo}>
                            <span className={styles.readingLabel}>Reading Now</span>
                            <span className={styles.readingTitle}>{currentRead.title}</span>
                        </div>
                    </div>
                )}

                {/* Right Section: Library/Dashboard */}
                <nav className={styles.nav}>
                    <Link href="/library" className={styles.link}>library</Link>
                </nav>
            </div>
        </header>
    );
};
