import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PaperCard } from '@/components/ui/PaperCard';
import { ReadingTimeline } from '@/components/charts/ReadingTimeline';
import { GenreDistribution } from '@/components/charts/GenreDistribution';
import { AtmosphericBackground } from '@/components/ui/AtmosphericBackground';
import { SandDunesOverlay } from '@/components/ui/SandDunesOverlay';
import { RecentHistory } from '@/components/dashboard/RecentHistory';
import { BookSpineTimeline } from '@/components/dashboard/BookSpineTimeline';
import { mockWorks } from '@/lib/mockData';
import { Work } from '@/lib/types';
import styles from './page.module.css';
import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';

import { QuoteBanner } from '@/components/dashboard/QuoteBanner';

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

export default async function Home() {
  // Logic
  const works = await getLibraryData();
  const totalWorks = works.length;
  const readWorks = works.filter(w => w.status === 'read');
  const finishedCount = readWorks.length;

  const totalPages = readWorks.reduce((acc, w) => acc + (w.pageCount || 0), 0);
  const totalWords = readWorks.reduce((acc, w) => acc + (w.wordCount || 0), 0);
  const totalHours = Math.round(readWorks.reduce((acc, w) => acc + (w.durationMinutes || 0), 0) / 60);

  const toReadCount = works.filter(w => w.status === 'toread').length;

  const currentlyReading = works.filter(w => w.status === 'reading');
  // Fallback to most recent read book if no active reading
  const currentCover = (currentlyReading.length > 0 ? currentlyReading[0] : readWorks[0])?.coverImage;

  return (
    <DashboardLayout currentRead={currentlyReading[0]}>
      <AtmosphericBackground image={currentCover} />
      <div className={styles.grid}>



        {/* Header Section (Tight Grouping) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Timeline */}
          <BookSpineTimeline works={readWorks} />

          {/* Quote Banner */}
          <div style={{ width: '100%' }}>
            <QuoteBanner works={readWorks} />
          </div>

          {/* Key Metrics Row */}
          <div className={styles.metricsRow}>
            <Link href="/library" className={styles.metricLink}>
              <MetricCard
                label="Total Works"
                value={totalWorks}
                subValue={`${works.filter(w => w.type === 'book').length} Books, ${works.filter(w => w.type === 'audiobook').length} Audio`}
              />
            </Link>
            <MetricCard
              label="Words Read"
              value={(totalWords / 1000000).toFixed(2) + 'M'}
              subValue={totalWords.toLocaleString() + ' words'}
            />
            <MetricCard
              label="Pages Read"
              value={totalPages.toLocaleString()}
              subValue="Across all books"
            />
            <MetricCard
              label="Reading Time"
              value={totalHours}
              subValue="Estimated hours"
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className={styles.chartsRow}>
          <ReadingTimeline works={readWorks} />
          <GenreDistribution works={readWorks} />
        </div>

        {/* Content Area */}
        <div className={styles.contentGrid}>
          {/* Main Feed / Timeline Placeholder */}
          <div className={styles.mainColumn}>
            {/* <div className={styles.sectionHeader}>
              <h2>Currently Reading</h2>
            </div> */}

            <div className={styles.readingList}>
              {/* Moved to Header */}
              {/* {currentlyReading.map(work => (
                <Link href={`/book/${work.id}`} key={work.id} style={{ textDecoration: 'none' }}>
                  <PaperCard
                    elevation="md"
                    interactive
                    className={styles.readingCard}
                    enableSand
                    style={{
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {work.coverImage && (
                      <>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: `url(${work.coverImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center 20%',
                          zIndex: 0
                        }} />
                        <SandDunesOverlay />
                      </>
                    )}
                    <div className={styles.cardContent} style={{ position: 'relative', zIndex: 2 }}>
                      <div>
                        <h3 className={styles.workTitle} style={{ color: work.coverImage ? '#e0e0e0' : undefined }}>{work.title}</h3>
                        <p className={styles.workAuthor} style={{ color: work.coverImage ? '#aaaaaa' : undefined }}>{work.author}</p>
                        <div className={styles.tags}>
                          {work.genres.slice(0, 3).map(g => (
                            <span key={g} className={styles.tag} style={{
                              borderColor: work.coverImage ? 'rgba(255,255,255,0.2)' : undefined,
                              color: work.coverImage ? '#cccccc' : undefined
                            }}>{g}</span>
                          ))}
                        </div>
                      </div>
                      <div className={styles.statusBadge}>In Progress</div>
                    </div>
                  </PaperCard>
                </Link>
              ))} */}

              {currentlyReading.length === 0 && (
                <PaperCard elevation="sm" className={styles.emptyState}>
                  <p>Not reading anything right now.</p>
                </PaperCard>
              )}
            </div>

            <RecentHistory works={readWorks} />

          </div>

          {/* Sidebar / Stats */}
          <div className={styles.sidebar}>
            <PaperCard elevation="md">
              <h3>To Read ({toReadCount})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {works.filter(w => w.status === 'toread').slice(0, 5).map(work => (
                  <Link href={`/book/${work.id}`} key={work.id} style={{ textDecoration: 'none' }}>
                    <PaperCard
                      elevation="sm"
                      interactive
                      enableSand
                      style={{
                        backgroundImage: work.coverImage
                          ? `linear-gradient(to right, rgba(15, 15, 20, 0.95) 0%, rgba(15, 15, 20, 0.7) 100%), url(${work.coverImage})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        padding: '16px',
                        minHeight: '80px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ position: 'relative', zIndex: 2 }}>
                        <span style={{
                          display: 'block',
                          fontWeight: 500,
                          color: work.coverImage ? '#e0e0e0' : 'var(--ink-primary)',
                          marginBottom: '4px'
                        }}>
                          {work.title}
                        </span>
                        <span style={{
                          display: 'block',
                          fontSize: '0.85rem',
                          color: work.coverImage ? '#aaaaaa' : 'var(--ink-secondary)'
                        }}>
                          {work.author}
                        </span>
                      </div>
                    </PaperCard>
                  </Link>
                ))}
              </div>
            </PaperCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
