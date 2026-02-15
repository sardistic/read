import React from 'react';
import styles from './PaperCard.module.css';
import { ContainerSandEffect } from './ContainerSandEffect';

interface PaperCardProps {
    children: React.ReactNode;
    className?: string;
    elevation?: 'flat' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    style?: React.CSSProperties;
    onClick?: () => void;
    enableSand?: boolean;
    isObstacle?: boolean;
}

export const PaperCard: React.FC<PaperCardProps> = ({
    children,
    className = '',
    elevation = 'sm',
    interactive = false,
    style,
    onClick,
    enableSand = false,
    isObstacle = true
}) => {
    return (
        <div
            className={`
        ${styles.card} 
        ${styles[elevation]} 
        ${interactive ? styles.interactive : ''} 
        ${className}
      `}
            style={style}
            data-sand-obstacle={isObstacle ? "true" : undefined}
            onClick={onClick}
        >
            {enableSand && <ContainerSandEffect />}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </div>
        </div>
    );
};
