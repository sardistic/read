import Link from 'next/link';
import React from 'react';
import styles from './GlassHeader.module.css';

export const GlassHeader = () => {
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

                {/* Right Section: Library/Dashboard */}
                <nav className={styles.nav}>
                    <Link href="/library" className={styles.link}>library</Link>
                </nav>
            </div>
        </header>
    );
};
