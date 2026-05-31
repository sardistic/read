import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PaperCard } from '@/components/ui/PaperCard';

export default function IngestPage() {
    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <h1 style={{ marginBottom: '2rem', color: 'var(--ink-primary)' }}>Library Management</h1>

                <PaperCard elevation="md">
                    <h2 style={{ marginTop: 0 }}>Static Site Updates</h2>
                    <p style={{ color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                        This site is exported for GitHub Pages, so it cannot save files or run import APIs from the browser.
                        Goodreads updates now happen through the repository workflow instead.
                    </p>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-paper-raised)', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Automatic:</strong> GitHub Actions runs the reads update workflow on a daily schedule.
                        When Goodreads has new items, the workflow commits the refreshed JSON files and the Pages deployment rebuilds.
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-paper-raised)', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Manual local refresh:</strong>
                        <pre style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                            node src/scripts/scrape_goodreads.js{'\n'}
                            node src/scripts/merge_goodreads_data.js
                        </pre>
                    </div>
                </PaperCard>
            </div>
        </DashboardLayout>
    );
}
