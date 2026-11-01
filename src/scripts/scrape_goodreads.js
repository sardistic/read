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
const LIBRARY_PATH = path.join(__dirname, '../data/library.json');

const decodeHtml = (value) => value.replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt|#39);/gi, (match, numeric, named) => {
    if (numeric) return String.fromCodePoint(numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric));
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'" }[named.toLowerCase()] || match;
});
const coverBookId = (url) => url?.match(/\/books\/[^/]*l\/(\d+)/)?.[1];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
    return res.text();
}

async function fetchShelf(userId, shelf, page = 1) {
    const url = `https://www.goodreads.com/review/list_rss/${userId}?shelf=${shelf}&page=${page}`;
    console.log(`  Fetching ${shelf} page ${page}...`);

    const xml = await fetchText(url);
    if (!/<rss\b/i.test(xml) || !/<channel\b/i.test(xml)) throw new Error(`${url} did not return RSS`);

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

async function fetchPublicProfile(userId, existingLibrary) {
    const profile = await fetchText(`https://www.goodreads.com/user/show/${userId}`);
    const currentSection = profile.match(/id="currentlyReadingReviews"([\s\S]*?)<div class="bigBoxBottom"/);
    if (!currentSection) throw new Error('Goodreads profile has no currently-reading section');
    const current = [...currentSection[1].matchAll(/<a class="bookTitle"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="authorName"[^>]*>([\s\S]*?)<\/a>/g)]
        .map(match => ({ title: decodeHtml(match[1].replace(/<[^>]*>/g, '')), author: decodeHtml(match[2].replace(/<[^>]*>/g, '')), dateRead: '', imageUrl: '', shelf: 'currently-reading' }));

    const year = new Date().getUTCFullYear();
    const yearPages = await Promise.all([year - 1, year].map(y => fetchText(`https://www.goodreads.com/user/year_in_books/${y}/${userId}`)));
    const read = [];
    for (const html of yearPages) {
        if (!/Year in Books/i.test(html)) throw new Error('Goodreads Year in Books returned unexpected HTML');
        for (const match of html.matchAll(/data-resource-id='(\d+)' data-resource-type='Book'>\s*<a href="[^"]*"><img alt="([^"]+)"[^>]*src="([^"]+)"/g)) {
            const label = decodeHtml(match[2]);
            const separator = label.lastIndexOf(' by ');
            if (separator < 0) continue;
            read.push({ title: label.slice(0, separator), author: label.slice(separator + 4), dateRead: '', imageUrl: decodeHtml(match[3]), shelf: 'read' });
        }
    }
    if (read.length === 0) throw new Error('Goodreads Year in Books had no completed books');

    const byTitle = new Map(existingLibrary.works.map(book => [book.title.toLowerCase(), book]));
    const byCoverId = new Map(existingLibrary.works.filter(book => coverBookId(book.coverImage)).map(book => [coverBookId(book.coverImage), book]));
    for (const book of [...read, ...current]) {
        const known = byCoverId.get(coverBookId(book.imageUrl)) || byTitle.get(book.title.toLowerCase());
        if (known) {
            book.title = known.title;
            if (book.shelf === 'read' && known.dateReadEstimated) {
                book.dateRead = known.dateRead;
                book.dateReadEstimated = true;
            }
        }
    }
    const lastDatedIndex = read.findLastIndex(book => byTitle.get(book.title.toLowerCase())?.dateRead);
    if (lastDatedIndex < 0) throw new Error('Cannot date new books without a previously dated completed book');
    const newlyRead = read.slice(lastDatedIndex + 1).filter(book => !byTitle.get(book.title.toLowerCase())?.dateRead);
    const day = today();
    for (const [index, book] of newlyRead.entries()) {
        const date = new Date(`${day}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() - (newlyRead.length - index - 1));
        book.dateRead = date.toISOString().slice(0, 10);
        book.dateReadEstimated = true;
    }
    console.log(`  Public profile fallback: ${read.length} year-in-books entries, ${current.length} currently reading`);
    return [...read, ...current];
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
    try {
        for (const shelf of SHELVES) {
            console.log(`\nFetching shelf: ${shelf}`);
            const items = await fetchAllPages(USER_ID, shelf);
            console.log(`  Found ${items.length} items on "${shelf}"`);
            allItems = allItems.concat(items);
        }
        if (allItems.length === 0) throw new Error('All Goodreads RSS shelves were empty');
    } catch (error) {
        console.warn(`Goodreads RSS unavailable: ${error.message}`);
        const existingLibrary = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
        allItems = await fetchPublicProfile(USER_ID, existingLibrary);
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
        shelf: b.shelf,
        ...(b.dateReadEstimated ? { dateReadEstimated: true } : {})
    }));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 4));
    console.log(`\nSaved ${output.length} books to ${OUTPUT_PATH}`);
    console.log('Run "node src/scripts/merge_goodreads_data.js" to merge new books into library.json');
}

main().catch(err => {
    console.error('Scrape failed:', err);
    process.exit(1);
});
