'use client';

import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import styles from './GlassHeader.module.css';

import { Work } from '@/lib/types';
import { RedParticlesOverlay } from './RedParticlesOverlay';

interface GlassHeaderProps {
    currentRead?: Work;
    currentReadLabel?: string;
}

interface DropdownProps {
    label: string;
    items: { label: string; href: string }[];
}

const NavDropdown: React.FC<DropdownProps> = ({ label, items }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className={styles.dropdown} ref={ref}>
            <button
                className={styles.link}
                onClick={() => setOpen(!open)}
                aria-expanded={open}
            >
                {label}
                <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▾</span>
            </button>
            <div className={`${styles.dropdownMenu} ${open ? styles.dropdownOpen : ''}`}>
                {items.map((item, i) => (
                    <a
                        key={item.href}
                        href={item.href}
                        className={styles.dropdownItem}
                        style={{ animationDelay: `${i * 0.05}s` }}
                        onClick={() => setOpen(false)}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </div>
    );
};

export const GlassHeader: React.FC<GlassHeaderProps> = ({ currentRead, currentReadLabel = 'Reading Now' }) => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                {/* Left Section: Logo + External Navigation */}
                <div className={styles.leftSection}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoText}>read</span>
                        <img
                            src={`${basePath}/images/logo.webp`}
                            alt="Logo"
                            className={styles.logoImage}
                        />
                    </Link>

                    <nav className={styles.nav}>
                        <a href="https://www.sardistic.com/" className={styles.link}>.com</a>

                        <NavDropdown
                            label="I/O"
                            items={[
                                { label: 'audio', href: 'https://audio.sardistic.com/' },
                                { label: 'write', href: 'https://write.sardistic.com/' },
                                { label: 'chat', href: 'https://chat.sardistic.com/' },
                            ]}
                        />

                        <NavDropdown
                            label="gallery"
                            items={[
                                { label: 'organic', href: 'https://www.sardistic.com/gallery-timeline/' },
                                { label: 'artificial', href: 'https://www.sardistic.com/ai-timeline/' },
                            ]}
                        />
                    </nav>
                </div>

                {currentRead && (
                    <div className={styles.readingWidget} style={{ backgroundImage: `url(${currentRead.coverImage})` }}>
                        <RedParticlesOverlay />
                        <div className={styles.readingInfo}>
                            <span className={styles.readingLabel}>{currentReadLabel}</span>
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
