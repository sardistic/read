import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { mockWorks } from '@/lib/mockData';
import { Work } from '@/lib/types';
import libraryData from '@/data/library.json';
import { Suspense } from 'react';
import { LibraryClient } from './LibraryClient';

function getLibraryData(): Work[] {
    return (libraryData as { works?: Work[] }).works || mockWorks;
}

export default function LibraryPage() {
    const works = getLibraryData();

    return (
        <DashboardLayout>
            <Suspense fallback={null}>
                <LibraryClient works={works} />
            </Suspense>
        </DashboardLayout>
    );
}
