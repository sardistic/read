import React from 'react';
import { GlassHeader } from '../ui/GlassHeader';
import styles from './DashboardLayout.module.css';

import { Work } from '@/lib/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    currentRead?: Work;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentRead }) => {
    return (
        <div className={styles.wrapper}>
            <GlassHeader currentRead={currentRead} />
            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>
        </div>
    );
};
