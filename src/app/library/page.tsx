import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PaperCard } from '@/components/ui/PaperCard';
import { mockWorks } from '@/lib/mockData';
import { Work } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';

async function getLibraryData(): Promise<Work[]> {
    try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'library.json');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        return data.works || [];
    } catch (error) {
        return mockWorks;
    }
}

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { status, genre, type } = await searchParams;
    const works = await getLibraryData();

    // Filtering Logic
    let filteredWorks = works;
    if (status) {
        const statusStr = Array.isArray(status) ? status[0] : status;
        filteredWorks = filteredWorks.filter(w => w.status === statusStr);
    }
    if (genre) {
        const genreStr = Array.isArray(genre) ? genre[0] : genre;
        filteredWorks = filteredWorks.filter(w => w.genres.includes(genreStr));
    }
    if (type) {
        const typeStr = Array.isArray(type) ? type[0] : type;
        filteredWorks = filteredWorks.filter(w => w.type === typeStr);
    }

    // Sort by Date Added (newest first) by default
    filteredWorks.sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime());

    const title = status === 'toread' ? 'To Read' :
        status === 'read' ? 'Read History' :
            status === 'reading' ? 'Currently Reading' :
                type === 'audiobook' ? 'Audiobooks' :
                    type === 'book' ? 'Books' :
                        'Full Library';

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, color: 'var(--ink-primary)' }}>
                        {title}
                    </h1>
                    <div style={{ color: 'var(--ink-secondary)' }}>
                        {filteredWorks.length} books found
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                    {filteredWorks.map(work => (
                        <Link href={`/book/${work.id}`} key={work.id} style={{ textDecoration: 'none' }}>
                            <PaperCard
                                interactive
                                elevation="sm"
                                style={{
                                    height: '320px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundImage: work.coverImage
                                        ? `linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 50%, rgba(10,10,10,0.3) 100%), url(${work.coverImage})`
                                        : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center top',
                                    justifyContent: 'flex-end',
                                    border: '1px solid var(--ink-faint)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Text Content pushed to bottom by flex-end */}
                                <div style={{ position: 'relative', zIndex: 2 }}>
                                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: work.coverImage ? '#f0f0f0' : 'var(--ink-primary)', textShadow: work.coverImage ? '0 2px 4px rgba(0,0,0,0.8)' : 'none' }}>
                                        {work.title}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: work.coverImage ? '#cccccc' : 'var(--ink-secondary)', textShadow: work.coverImage ? '0 1px 2px rgba(0,0,0,0.8)' : 'none' }}>
                                        {work.author}
                                    </p>

                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {work.genres.slice(0, 2).map(g => (
                                            <span key={g} style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '12px',
                                                color: work.coverImage ? '#dddddd' : 'var(--ink-secondary)',
                                                background: 'rgba(0,0,0,0.5)',
                                                backdropFilter: 'blur(4px)'
                                            }}>
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </PaperCard>
                        </Link>
                    ))}
                </div>

                {filteredWorks.length === 0 && (
                    <PaperCard elevation="sm" style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-secondary)' }}>
                        No books found matching your criteria.
                    </PaperCard>
                )}
            </div>
        </DashboardLayout>
    );
}
