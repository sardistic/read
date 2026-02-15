'use client';

import React, { useState } from 'react';
import { PaperCard } from '@/components/ui/PaperCard';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { parseGoodreadsCSV } from '@/lib/parsers';
import { Work } from '@/lib/types';

export default function IngestPage() {
    const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [count, setCount] = useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setStatus('parsing');
            setMessage(`Reading ${file.name}...`);

            const text = await file.text();
            const works = await parseGoodreadsCSV(text);

            setCount(works.length);
            setStatus('saving');
            setMessage(`Parsed ${works.length} books. Saving to library...`);

            const res = await fetch('/api/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ works }),
            });

            if (!res.ok) throw new Error('Failed to save library');

            setStatus('success');
            setMessage(`Successfully imported ${works.length} books!`);
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(err.message || 'An error occurred during import.');
        }
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <h1 style={{ marginBottom: '2rem', color: 'var(--ink-primary)' }}>Library Management</h1>

                <PaperCard elevation="md">
                    <h2 style={{ marginTop: 0 }}>Import Goodreads Library</h2>
                    <p style={{ color: 'var(--ink-secondary)', marginBottom: '1.5rem' }}>
                        Export your library from Goodreads (My Books - Import and export) and upload the CSV here.
                        <br />
                        <small>Note: This will overwrite your current local library.</small>
                    </p>

                    <div style={{
                        border: '2px dashed var(--ink-faint)',
                        borderRadius: 'var(--radius-md)',
                        padding: '3rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: 'var(--bg-paper-sm)'
                    }}>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                        />
                        <div style={{ pointerEvents: 'none' }}>
                            <span style={{ fontSize: '2rem' }}>📄</span>
                            <p style={{ margin: '1rem 0 0', fontWeight: 500 }}>
                                Click or Drag Goodreads CSV here
                            </p>
                        </div>
                    </div>



                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--ink-faint)' }}>
                        <h2 style={{ marginTop: 0 }}>Or Import via User ID</h2>
                        <p style={{ color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
                            Scrape your "Read" shelf directly from your public profile.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Goodreads User ID (e.g. 62292951)"
                                style={{
                                    flex: 1,
                                    padding: '0.8rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--ink-faint)',
                                    background: 'var(--bg-void)',
                                    color: 'var(--ink-primary)'
                                }}
                                id="userIdInput"
                            />
                            <button
                                onClick={async () => {
                                    const input = document.getElementById('userIdInput') as HTMLInputElement;
                                    const userId = input.value.trim();
                                    if (!userId) return;

                                    try {
                                        setStatus('parsing');
                                        setMessage(`Fetching RSS feed for user ${userId}...`);

                                        const scrapeRes = await fetch(`/api/scrape?userId=${userId}`);
                                        const scrapeData = await scrapeRes.json();

                                        if (!scrapeRes.ok) throw new Error(scrapeData.error || 'Scrape failed');

                                        const works = scrapeData.works;
                                        setCount(works.length);

                                        setStatus('saving');
                                        setMessage(`Found ${works.length} books. Saving to library...`);

                                        const saveRes = await fetch('/api/library', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ works }),
                                        });

                                        if (!saveRes.ok) throw new Error('Failed to save library');

                                        setStatus('success');
                                        setMessage(`Successfully scraped and imported ${works.length} books!`);
                                    } catch (err: any) {
                                        console.error(err);
                                        setStatus('error');
                                        setMessage(err.message || 'Scraping failed.');
                                    }
                                }}
                                style={{
                                    padding: '0 1.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: 'var(--ink-primary)',
                                    color: 'var(--bg-void)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Scrape
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginTop: '0.5rem' }}>
                            Note: Imports the 100 most recently read books via the public RSS feed.
                        </p>
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--ink-faint)' }}>
                        <h2 style={{ marginTop: 0 }}>Metadata Enrichment</h2>
                        <p style={{ color: 'var(--ink-secondary)', marginBottom: '1rem' }}>
                            Auto-fetch missing Genres, Descriptions, and Page Counts via Google Books API.
                        </p>
                        <button
                            onClick={async () => {
                                try {
                                    setStatus('parsing');
                                    setMessage('Enriching library metadata (this may take a moment)...');

                                    const res = await fetch('/api/enrich');
                                    const data = await res.json();

                                    if (!res.ok) throw new Error(data.error || 'Enrichment failed');

                                    setStatus('success');
                                    setMessage(`Enrichment complete! Updated ${data.updated} books.`);
                                } catch (err: any) {
                                    console.error(err);
                                    setStatus('error');
                                    setMessage(err.message || 'Enrichment failed.');
                                }
                            }}
                            style={{
                                padding: '0.8rem 1.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--accent-gold)',
                                background: 'transparent',
                                color: 'var(--accent-gold)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <span>✨</span> Enrich Library
                        </button>
                    </div>

                    {status !== 'idle' && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-paper-raised)', borderRadius: 'var(--radius-sm)' }}>
                            <strong>Status:</strong> {status.toUpperCase()}
                            <br />
                            {message}
                        </div>
                    )}
                </PaperCard>
            </div >
        </DashboardLayout >
    );
}
