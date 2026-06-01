import React from 'react';
import { GlassHeader } from '../ui/GlassHeader';
import styles from './DashboardLayout.module.css';

import { Work } from '@/lib/types';

interface DashboardLayoutProps {
    children: React.ReactNode;
    currentRead?: Work;
    currentReadLabel?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentRead, currentReadLabel }) => {
    return (
        <div className={styles.wrapper}>
            <GlassHeader currentRead={currentRead} currentReadLabel={currentReadLabel} />
            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>
        </div>
    );
};
