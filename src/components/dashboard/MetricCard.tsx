import React from 'react';
import { PaperCard } from '../ui/PaperCard';
import styles from './MetricCard.module.css';

interface MetricCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    icon?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    subValue,
    trend,
    trendValue,
    icon
}) => {
    return (
        <PaperCard className={styles.container} enableSand>
            <div className={styles.header}>
                <h3 className={styles.label}>{label}</h3>
                {icon && <span className={styles.icon}>{icon}</span>}
            </div>
            <div className={styles.value}>{value}</div>
            {(subValue || trendValue) && (
                <div className={styles.footer}>
                    {subValue && <span className={styles.subValue}>{subValue}</span>}
                    {trendValue && (
                        <span className={`${styles.trend} ${trend ? styles[trend] : ''}`}>
                            {trend === 'up' && '↑'} {trend === 'down' && '↓'} {trendValue}
                        </span>
                    )}
                </div>
            )}
        </PaperCard>
    );
};
