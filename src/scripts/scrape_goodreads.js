/**
 * Standalone Goodreads RSS scraper
 * Fetches all shelves (read, currently-reading, to-read) and saves to goodreads_scrape.json
 * 
 * Usage: node src/scripts/scrape_goodreads.js [userId]
 *   Default userId: 62292951
 */

const fs = require('fs');
const path = require('path');

const USER_ID = process.argv[2] || '62292951';
const SHELVES = ['read', 'currently-reading', 'to-read'];
const OUTPUT_PATH = path.join(__dirname, '../data/goodreads_scrape.json');

async function fetchShelf(userId, shelf, page = 1) {
    const url = `https://www.goodreads.com/review/list_rss/${userId}?shelf=${shelf}&page=${page}`;
    console.log(`  Fetching ${shelf} page ${page}...`);

    const res = await fetch(url);
    if (!res.ok) {
        console.warn(`  Failed to fetch ${shelf} page ${page}: ${res.status}`);
        return [];
    }

    const xml = await res.text();

    // Simple XML parsing for the RSS items we care about
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const getTag = (tag) => {
            const m = itemXml.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
            if (m) return m[1].trim();
            const m2 = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
            return m2 ? m2[1].trim() : '';
        };

        items.push({
            title: getTag('title'),
            author: getTag('author_name'),
            dateRead: getTag('user_read_at'),
            dateAdded: getTag('user_date_added'),
            imageUrl: getTag('book_large_image_url') || getTag('book_medium_image_url') || getTag('book_image_url'),
            bookId: getTag('book_id'),
            rating: getTag('user_rating'),
            averageRating: getTag('average_rating'),
            numPages: getTag('num_pages') || getTag('book\\.num_pages'),
            shelf: shelf
        });
    }

    return items;
}

async function fetchAllPages(userId, shelf) {
    let allItems = [];
    let page = 1;
    const MAX_PAGES = 10; // Safety limit

    while (page <= MAX_PAGES) {
        const items = await fetchShelf(userId, shelf, page);
        if (items.length === 0) break;
        allItems = allItems.concat(items);
        page++;
        // Small delay to be polite
        await new Promise(r => setTimeout(r, 500));
    }

    return allItems;
}

async function main() {
    console.log(`\nScraping Goodreads for user ${USER_ID}...\n`);

    // Load existing scrape data for comparison
    let existingData = [];
    try {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    } catch (e) {
        console.log('No existing scrape data found, starting fresh.');
    }

    const existingTitles = new Set(existingData.map(b => b.title));

    let allItems = [];

    for (const shelf of SHELVES) {
        console.log(`\nFetching shelf: ${shelf}`);
        const items = await fetchAllPages(USER_ID, shelf);
        console.log(`  Found ${items.length} items on "${shelf}"`);
        allItems = allItems.concat(items);
    }

    // Deduplicate by title (a book could appear on multiple shelves)
    const seen = new Set();
    const deduped = [];
    for (const item of allItems) {
        if (seen.has(item.title)) continue;
        seen.add(item.title);
        deduped.push(item);
    }

    // Find new books
    const newBooks = deduped.filter(b => !existingTitles.has(b.title));

    console.log(`\n--- Results ---`);
    console.log(`Total books scraped: ${deduped.length}`);
    console.log(`Previously scraped:  ${existingData.length}`);
    console.log(`New books found:     ${newBooks.length}`);

    if (newBooks.length > 0) {
        console.log(`\nNew books:`);
        newBooks.forEach(b => {
            console.log(`  + ${b.title} by ${b.author}${b.dateRead ? ` (read: ${b.dateRead})` : ''}`);
        });
    }

    // Save the full scrape (overwrite with latest)
    // Format to match existing goodreads_scrape.json structure
    const output = deduped.map(b => ({
        title: b.title,
        author: b.author,
        dateRead: b.dateRead,
        imageUrl: b.imageUrl,
        shelf: b.shelf
    }));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 4));
    console.log(`\nSaved ${output.length} books to ${OUTPUT_PATH}`);
    console.log('Run "node src/scripts/merge_goodreads_data.js" to merge new books into library.json');
}

main().catch(err => {
    console.error('Scrape failed:', err);
    process.exit(1);
});
