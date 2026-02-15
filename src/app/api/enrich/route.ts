import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Work } from '@/lib/types';

const LIBRARY_PATH = path.join(process.cwd(), 'src', 'data', 'library.json');
const LOG_PATH = path.join(process.cwd(), 'src', 'data', 'enrichment.log');

async function logToFile(message: string) {
    const timestamp = new Date().toISOString();
    await fs.appendFile(LOG_PATH, `[${timestamp}] ${message}\n`);
}

async function fetchAudibleDuration(title: string, author: string): Promise<number | null> {
    try {
        const query = `${title} ${author}`;
        const url = `https://www.audible.com/search?keywords=${encodeURIComponent(query)}`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = await res.text();
        // Regex for "Length: XX hrs and YY mins" or "Length: XX hrs"
        const lengthMatch = html.match(/Length:\s*(\d+)\s*hrs?\s*(?:and\s*(\d+)\s*mins?)?/i);

        if (lengthMatch) {
            const hours = parseInt(lengthMatch[1], 10);
            const mins = parseInt(lengthMatch[2] || '0', 10);
            return (hours * 60) + mins;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching Audible for ${title}:`, error);
        return null;
    }
}

interface GoogleBooksResult {
    volumeInfo: {
        title: string;
        authors?: string[];
        categories?: string[]; // Genres
        pageCount?: number;
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
        };
        description?: string;
    };
}

async function fetchGoogleBooksMetadata(title: string, author: string): Promise<Partial<Work> | null> {
    try {
        // Clean title: remove series info like "(The Sun Eater, #7)"
        const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, '').trim();

        const query = `intitle:${encodeURIComponent(cleanTitle)}+inauthor:${encodeURIComponent(author)}`;
        const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.items || data.items.length === 0) return null;

        const info = data.items[0].volumeInfo as GoogleBooksResult['volumeInfo'];

        return {
            genres: info.categories || [],
            pageCount: info.pageCount,
            description: info.description,
            // Prioritize higher res if we could, but thumbnail is what we get usually
            coverImage: info.imageLinks?.thumbnail?.replace('http:', 'https:')
        };
    } catch (error) {
        console.error(`Error fetching Google Books for ${title}:`, error);
        return null;
    }
}

export async function GET() {
    try {
        const data = await fs.readFile(LIBRARY_PATH, 'utf-8');
        const library = JSON.parse(data);
        const works: Work[] = library.works;

        let updatedCount = 0;

        // Process all works
        for (const work of works) {
            let changed = false;

            // 1. Enrich Books with Google Books Data
            if (work.type === 'book') {
                // Only enrich if missing critical data or explicitly requested?
                // For now, let's try to fill gaps: genres, description, pageCount
                if (!work.genres || work.genres.length === 0 || !work.description || !work.pageCount) {
                    await logToFile(`Enriching: ${work.title}...`);
                    const metadata = await fetchGoogleBooksMetadata(work.title, work.author);
                    if (metadata) {
                        if ((!work.genres || work.genres.length === 0) && metadata.genres) {
                            work.genres = metadata.genres;
                            changed = true;
                        }
                        if (!work.pageCount && metadata.pageCount) {
                            work.pageCount = metadata.pageCount;
                            work.wordCount = metadata.pageCount * 275; // Estimate
                            changed = true;
                        }
                        if (!work.description && metadata.description) {
                            work.description = metadata.description;
                            changed = true;
                        }
                    } else {
                        await logToFile(`Failed to find metadata for: ${work.title}`);
                    }
                    // Rate limit for Google Books
                    await new Promise(r => setTimeout(r, 500));
                } else {
                    await logToFile(`Skipping (already has data): ${work.title}`);
                }
            }

            // 2. Enrich Audiobooks with Audible Data
            if (work.type === 'audiobook' && !work.durationMinutes) {
                const duration = await fetchAudibleDuration(work.title, work.author);
                if (duration) {
                    work.durationMinutes = duration;
                    changed = true;
                }
                // Rate limit for scraping
                await new Promise(r => setTimeout(r, 500));
            }

            if (changed) updatedCount++;
        }

        await fs.writeFile(LIBRARY_PATH, JSON.stringify({ works }, null, 2), 'utf-8');

        return NextResponse.json({
            success: true,
            updated: updatedCount,
            total: works.length
        });
    } catch (error) {
        console.error('Enrichment Error:', error);
        return NextResponse.json({ error: 'Failed to enrich library' }, { status: 500 });
    }
}
