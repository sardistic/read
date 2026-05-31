import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PaperCard } from '@/components/ui/PaperCard';
import { AtmosphericBackground } from '@/components/ui/AtmosphericBackground';
import { mockWorks } from '@/lib/mockData';
import { Work } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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

export async function generateStaticParams() {
    const works = await getLibraryData();

    return works.map((work) => ({
        id: work.id,
    }));
}

export const dynamicParams = false;

export default async function BookDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const works = await getLibraryData();
    const work = works.find(w => w.id === id);

    if (!work) {
        notFound();
    }

    // --- Context Calculations ---

    // 1. Chronological Context (Read Before/After)
    // Sort read books by dateRead desc
    const readWorks = works
        .filter(w => w.status === 'read' && w.dateRead)
        .sort((a, b) => new Date(b.dateRead!).getTime() - new Date(a.dateRead!).getTime());

    const currentIndex = readWorks.findIndex(w => w.id === work.id);
    const nextRead = currentIndex > 0 ? readWorks[currentIndex - 1] : null; // "Newer" read
    const prevRead = currentIndex < readWorks.length - 1 ? readWorks[currentIndex + 1] : null; // "Older" read

    // 2. Series Context
    const seriesBooks = work.seriesName
        ? works.filter(w => w.seriesName === work.seriesName).sort((a, b) => (a.seriesIndex || 0) - (b.seriesIndex || 0))
        : [];

    // 3. Related Books (Same Genre or Author)
    const relatedBooks = works
        .filter(w => w.id !== work.id && (
            (w.author === work.author) ||
            (w.genres.some(g => work.genres.includes(g)))
        ))
        .slice(0, 5);

    return (
        <DashboardLayout>
            <AtmosphericBackground image={work.coverImage} />

            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Navigation / Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/" style={{ textDecoration: 'none', color: 'var(--ink-secondary)' }}>
                        ← Back to Library
                    </Link>
                    <div style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
                        {work.dateRead ? `Read on ${work.dateRead}` : 'Unread'}
                    </div>
                </div>

                {/* Main Book Card */}
                <PaperCard elevation="lg">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                        {/* Cover Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <img
                                src={work.coverImage}
                                alt={work.title}
                                style={{
                                    width: '100%',
                                    borderRadius: '4px',
                                    boxShadow: 'var(--shadow-md)',
                                    filter: 'sepia(20%) contrast(1.1)'
                                }}
                            />
                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
                                <div style={{ background: 'var(--bg-paper-raised)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--ink-primary)' }}>{work.pageCount || '-'}</div>
                                    <div>Pages</div>
                                </div>
                                <div style={{ background: 'var(--bg-paper-raised)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--ink-primary)' }}>
                                        {work.durationMinutes ? Math.round(work.durationMinutes / 60) + 'h' : '-'}
                                    </div>
                                    <div>Audio</div>
                                </div>
                            </div>
                        </div>

                        {/* Content Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <h1 style={{
                                    margin: '0 0 0.5rem 0',
                                    fontSize: '2.5rem',
                                    fontFamily: 'var(--font-serif)',
                                    color: 'var(--ink-primary)'
                                }}>
                                    {work.title}
                                </h1>
                                <div style={{ fontSize: '1.2rem', color: 'var(--ink-secondary)' }}>{work.author}</div>
                            </div>

                            {work.rating && (
                                <div style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                                    {'★'.repeat(work.rating)}{'☆'.repeat(5 - work.rating)}
                                </div>
                            )}

                            {/* Tags */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {work.genres.map(g => (
                                    <span key={g} style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        border: '1px solid var(--ink-faint)',
                                        borderRadius: '12px',
                                        color: 'var(--ink-secondary)'
                                    }}>
                                        {g}
                                    </span>
                                ))}
                            </div>

                            {/* Summary */}
                            {work.description && (
                                <div style={{ marginTop: '1rem', lineHeight: '1.6', color: 'var(--ink-primary)' }}>
                                    <div dangerouslySetInnerHTML={{ __html: work.description }} />
                                </div>
                            )}

                            {/* User Notes */}
                            {work.notes && (
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderLeft: '4px solid var(--accent-gold)',
                                    fontStyle: 'italic',
                                    color: 'var(--ink-secondary)'
                                }}>
                                    " {work.notes} "
                                </div>
                            )}
                        </div>
                    </div>
                </PaperCard>

                {/* Series Context */}
                {work.seriesName && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--ink-secondary)', borderBottom: '1px solid var(--ink-faint)', paddingBottom: '0.5rem' }}>
                            Series: {work.seriesName}
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                            {seriesBooks.map(sb => (
                                <Link href={`/book/${sb.id}`} key={sb.id} style={{ textDecoration: 'none' }}>
                                    <PaperCard
                                        elevation={sb.id === work.id ? 'md' : 'sm'}
                                        interactive
                                        style={{
                                            height: '100%',
                                            opacity: sb.id === work.id ? 1 : 0.7,
                                            border: sb.id === work.id ? '1px solid var(--accent-gold)' : undefined
                                        }}
                                    >
                                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '0.25rem' }}>#{sb.seriesIndex}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{sb.title}</div>
                                        {sb.dateRead && <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)' }}>Read {new Date(sb.dateRead).getFullYear()}</div>}
                                    </PaperCard>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chronological Context (Before / After) */}
                {(prevRead || nextRead) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        {prevRead ? (
                            <Link href={`/book/${prevRead.id}`} style={{ textDecoration: 'none' }}>
                                <PaperCard interactive elevation="sm">
                                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginBottom: '0.5rem' }}>← Read Before</div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {prevRead.coverImage && <img src={prevRead.coverImage} style={{ width: '40px', borderRadius: '2px' }} />}
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{prevRead.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)' }}>{prevRead.dateRead}</div>
                                        </div>
                                    </div>
                                </PaperCard>
                            </Link>
                        ) : <div />}

                        {nextRead ? (
                            <Link href={`/book/${nextRead.id}`} style={{ textDecoration: 'none' }}>
                                <PaperCard interactive elevation="sm">
                                    <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', marginBottom: '0.5rem', textAlign: 'right' }}>Read After →</div>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'right' }}>{nextRead.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', textAlign: 'right' }}>{nextRead.dateRead}</div>
                                        </div>
                                        {nextRead.coverImage && <img src={nextRead.coverImage} style={{ width: '40px', borderRadius: '2px' }} />}
                                    </div>
                                </PaperCard>
                            </Link>
                        ) : <div />}
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
