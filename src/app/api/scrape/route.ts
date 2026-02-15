import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { Work } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';

interface CustomItem {
    book_id: string;
    book_image_url: string;
    book_small_image_url: string;
    book_medium_image_url: string;
    book_large_image_url: string;
    book_description: string;
    book: { num_pages: string[] };
    author_name: string;
    user_rating: string;
    user_read_at: string;
    user_date_added: string;
    user_review: string;
    average_rating: string;
    book_published: string;
}

const SHELVES = ['read', 'currently-reading', 'to-read'];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const shouldSave = searchParams.get('save') === 'true';

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const parser = new Parser<any, CustomItem>({
            customFields: {
                item: [
                    'book_id',
                    'book_image_url',
                    'book_small_image_url',
                    'book_medium_image_url',
                    'book_large_image_url',
                    'book_description',
                    'book',
                    'author_name',
                    'user_rating',
                    'user_read_at',
                    'user_date_added',
                    'user_review',
                    'average_rating',
                    'book_published',
                    'categories'
                ]
            }
        });

        // Fetch all shelves in parallel
        const feedPromises = SHELVES.map(shelf =>
            parser.parseURL(`https://www.goodreads.com/review/list_rss/${userId}?shelf=${shelf}`)
                .catch(e => {
                    console.warn(`Failed to fetch shelf ${shelf}:`, e);
                    return { items: [] };
                })
        );

        const feeds = await Promise.all(feedPromises);

        // Process feeds
        const workMap = new Map<string, Work>();

        for (let i = 0; i < SHELVES.length; i++) {
            const shelf = SHELVES[i];
            const items = feeds[i].items || [];

            items.forEach(item => {
                const id = item.book_id || crypto.randomUUID();
                if (workMap.has(id)) return;

                let status: 'read' | 'reading' | 'toread' = 'toread';
                if (shelf === 'read') status = 'read';
                if (shelf === 'currently-reading') status = 'reading';
                if (shelf === 'to-read') status = 'toread';

                // Parse page count
                let pageCount = 0;
                if (item.book && item.book.num_pages && item.book.num_pages[0]) {
                    pageCount = parseInt(item.book.num_pages[0], 10) || 0;
                }

                // Metrics Calculation
                const WORDS_PER_PAGE = 275; // Industry avg for trade paperback
                const WORDS_PER_MINUTE = 155; // Average audiobook narration speed (approx 9300 words/hr)

                const wordCount = pageCount * WORDS_PER_PAGE;
                const durationMinutes = Math.round(wordCount / WORDS_PER_MINUTE);

                // Series Extraction
                let seriesName = undefined;
                let seriesIndex = undefined;
                const title = item.title || 'Unknown Title';
                const seriesMatch = title.match(/\(([^)]+), #(\d+(?:\.\d+)?)\)/);
                if (seriesMatch) {
                    seriesName = seriesMatch[1];
                    seriesIndex = parseFloat(seriesMatch[2]);
                }

                workMap.set(id, {
                    id,
                    title,
                    author: item.author_name || 'Unknown Author',
                    type: 'book',
                    status,
                    rating: parseInt(item.user_rating || '0', 10),
                    dateRead: item.user_read_at ? new Date(item.user_read_at).toISOString().split('T')[0] : undefined,
                    dateAdded: item.user_date_added ? new Date(item.user_date_added).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    pageCount,
                    wordCount,
                    durationMinutes,
                    coverImage: item.book_large_image_url || item.book_medium_image_url || item.book_image_url,
                    description: item.book_description,
                    genres: item.categories || [],
                    seriesName,
                    seriesIndex,
                    platform: 'goodreads',
                    notes: item.user_review
                });
            });
        }

        const works = Array.from(workMap.values());

        if (shouldSave) {
            const filePath = path.join(process.cwd(), 'src', 'data', 'library.json');
            try { await fs.mkdir(path.dirname(filePath), { recursive: true }); } catch { }
            await fs.writeFile(filePath, JSON.stringify({ works }, null, 2), 'utf-8');
        }

        return NextResponse.json({ works, count: works.length, saved: shouldSave });
    } catch (error) {
        console.error('RSS Parse Error:', error);
        return NextResponse.json({ error: 'Failed to fetch or parse RSS feed' }, { status: 500 });
    }
}
