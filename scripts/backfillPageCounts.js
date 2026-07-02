const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '..', 'src', 'data', 'library.json');
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

const WORDS_PER_PAGE = 275;
const missing = library.works.filter(work =>
    work.type === 'book' &&
    (!work.pageCount || work.pageCount <= 0 || !work.metricSource?.pageCount?.startsWith('google-books'))
);

const normalize = value => String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreResult = (work, volume) => {
    const info = volume.volumeInfo || {};
    const title = normalize(info.title);
    const subtitle = normalize(info.subtitle);
    const authors = normalize((info.authors || []).join(' '));
    const workTitle = normalize(work.title);
    const workAuthor = normalize(work.author);

    let score = 0;
    if (title && workTitle.includes(title)) score += 4;
    if (title && title.includes(workTitle.split(' ').slice(0, 4).join(' '))) score += 3;
    if (subtitle && workTitle.includes(subtitle)) score += 1;
    if (authors && workAuthor && authors.includes(workAuthor.split(' ')[0])) score += 2;
    if (info.pageCount) score += 2;
    return score;
};

const queryBook = async work => {
    const query = `intitle:${work.title} inauthor:${work.author}`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&printType=books&maxResults=5`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const data = await response.json();
    const candidates = (data.items || [])
        .filter(item => item.volumeInfo?.pageCount)
        .sort((a, b) => scoreResult(work, b) - scoreResult(work, a));
    return candidates[0]?.volumeInfo || null;
};

(async () => {
    let updated = 0;

    for (const work of missing) {
        try {
            const result = await queryBook(work);
            if (!result?.pageCount) {
                console.log(`No page count: ${work.title}`);
                continue;
            }

            work.metricSource = work.metricSource || {};
            work.pageCount = result.pageCount;
            work.wordCount = result.pageCount * WORDS_PER_PAGE;
            work.metricSource.pageCount = `google-books:${result.infoLink || 'volume'}`;
            work.metricSource.wordCount = 'estimated-from-google-books-pages';
            updated++;
            console.log(`Updated ${work.title}: ${result.pageCount} pages, ${work.wordCount} est. words`);
        } catch (error) {
            console.error(`Failed ${work.title}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 140));
    }

    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));
    console.log(`Done. Updated ${updated} of ${missing.length} missing read works.`);
})();
