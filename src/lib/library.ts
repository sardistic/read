import { Work } from '@/lib/types';

export interface LibraryData {
    works: Work[];
    metadata?: {
        lastUpdated: string;
        source: 'manual' | 'import';
    };
}
