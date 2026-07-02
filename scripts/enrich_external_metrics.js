const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '..', 'src', 'data', 'library.json');
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const cachePath = path.join(__dirname, '..', '.metrics-cache.json');
const cache = fs.existsSync(cachePath)
    ? JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    : { audio: {} };

const WORDS_PER_PAGE = 275;
const AUDIO_ALL = process.argv.includes('--audio-all') || process.env.METRICS_AUDIO_ALL === '1';
const AUDIO_ONLY = process.argv.includes('--audio-only');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripSeries = value => String(value || '')
    .replace(/\s*\([^)]*(?:#|book|saga|series|trilogy|chronicle|chronicles|cycle|cantos|cosmere|culture|mistborn|malazan|wheel of time|stormlight)[^)]*\)\s*/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleVariants = work => {
    const title = String(work.title || '').trim();
    const stripped = stripSeries(title);
    const withoutSubtitle = stripped.split(':')[0].trim();
    return Array.from(new Set([title, stripped, withoutSubtitle].filter(Boolean)));
};

const titleBase = value => normalize(stripSeries(value)).split(/\s+/).slice(0, 8).join(' ');

const score = (work, candidateTitle, candidateAuthor) => {
    const workTitle = normalize(stripSeries(work.title));
    const candTitle = normalize(candidateTitle);
    const workAuthor = normalize(work.author);
    const candAuthor = normalize(candidateAuthor);
    let total = 0;

    if (candTitle === workTitle) total += 10;
    if (candTitle && workTitle.includes(candTitle)) total += 5;
    if (candTitle && candTitle.includes(titleBase(work.title))) total += 4;
    if (candAuthor && workAuthor && candAuthor.includes(workAuthor.split(' ')[0])) total += 3;
    if (candAuthor && workAuthor && candAuthor.includes(workAuthor.split(' ').at(-1))) total += 3;
    return total;
};

const audioCacheKey = work => `${normalize(stripSeries(work.title))}|${normalize(work.author)}`;

const writeLibrary = () => {
    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));
};

const writeCache = () => {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
};

const fetchJson = async url => {
    const response = await fetch(url, {
        headers: { 'User-Agent': 'read-dashboard-metrics/1.0' }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
};

const fetchText = async url => {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) read-dashboard-metrics/1.0'
        }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.text();
};

const lookupOpenLibraryPages = async work => {
    const fields = [
        'key',
        'title',
        'author_name',
        'number_of_pages_median',
        'editions',
        'editions.title',
        'editions.number_of_pages',
        'editions.language'
    ].join(',');
    let docs = [];
    for (const title of titleVariants(work)) {
        const url = 'https://openlibrary.org/search.json?' + new URLSearchParams({
            title,
            author: work.author,
            fields,
            limit: '8'
        });
        const data = await fetchJson(url);
        docs = docs.concat(data.docs || []);
        if (docs.length) break;
        await sleep(80);
    }
    const ranked = docs
        .map(doc => ({ doc, score: score(work, doc.title, (doc.author_name || []).join(' ')) }))
        .sort((a, b) => b.score - a.score);

    for (const { doc, score: matchScore } of ranked) {
        if (matchScore < 5) continue;
        const editionPages = (doc.editions?.docs || [])
            .map(edition => edition.number_of_pages)
            .filter(value => Number.isFinite(value) && value > 0);
        const pages = editionPages[0] || doc.number_of_pages_median;
        if (pages) return { pages, source: `openlibrary:${doc.key}` };
    }

    return null;
};

const lookupGooglePages = async work => {
    for (const title of titleVariants(work)) {
        const query = `intitle:"${title}" inauthor:"${work.author}"`;
        const url = 'https://www.googleapis.com/books/v1/volumes?' + new URLSearchParams({
            q: query,
            printType: 'books',
            maxResults: '8'
        });
        const data = await fetchJson(url);
        const ranked = (data.items || [])
            .filter(item => item.volumeInfo?.pageCount)
            .map(item => ({
                item,
                score: score(work, item.volumeInfo.title, (item.volumeInfo.authors || []).join(' '))
            }))
            .filter(candidate => candidate.score >= 5)
            .sort((a, b) => b.score - a.score);

        const best = ranked[0]?.item?.volumeInfo;
        if (best) return { pages: best.pageCount, source: `google-books:${best.infoLink || best.canonicalVolumeLink || 'volume'}` };
        await sleep(80);
    }

    return null;
};

const HLTR_BASE = 'https://api.howlongtoread.com';

// howlongtoread.com: one structured call yields page count, word count (some
// publisher-verified), and audiobook runtime — the primary source for all three.
const lookupHowLongToRead = async work => {
    for (const title of titleVariants(work)) {
        const results = await fetchJson(`${HLTR_BASE}/books/search/${encodeURIComponent(title)}`)
            .catch(() => []);
        const ranked = (Array.isArray(results) ? results : [])
            .map(candidate => ({ candidate, score: score(work, candidate.title, candidate.author) }))
            .filter(entry => entry.score >= 5)
            .sort((a, b) => b.score - a.score);

        const best = ranked[0]?.candidate;
        if (!best?.id) {
            await sleep(80);
            continue;
        }

        const detail = await fetchJson(`${HLTR_BASE}/books/id/${best.id}`).catch(() => null);
        if (!detail) return null;

        const wc = detail.wordCount || {};
        return {
            id: detail.id,
            source: `howlongtoread:${detail.id}`,
            pages: Number.isFinite(detail.numPages) && detail.numPages > 0 ? detail.numPages : null,
            wordCount: Number.isFinite(wc.value) ? Math.round(wc.value) : null,
            wordVerified: Boolean(wc.verified),
            audiobookMinutes: Number.isFinite(detail.audioBook?.duration) && detail.audioBook.duration > 0
                ? detail.audioBook.duration
                : null
        };
    }
    return null;
};

const lookupITunesAudiobook = async work => {
    for (const title of titleVariants(work)) {
        const url = 'https://itunes.apple.com/search?' + new URLSearchParams({
            media: 'audiobook',
            entity: 'audiobook',
            term: `${title} ${work.author}`,
            limit: '20'
        });
        const data = await fetchJson(url);
        const ranked = (data.results || [])
            .filter(result => result.trackTimeMillis || result.collectionTimeMillis)
            .map(result => ({
                result,
                score: score(work, result.collectionName || result.trackName, result.artistName)
            }))
            .filter(candidate => candidate.score >= 5)
            .sort((a, b) => b.score - a.score);

        const best = ranked[0]?.result;
        const ms = best?.trackTimeMillis || best?.collectionTimeMillis;
        if (ms) {
            return {
                minutes: Math.round(ms / 60000),
                source: `itunes:${best.collectionViewUrl || best.trackViewUrl || best.collectionId || 'audiobook'}`
            };
        }
        await sleep(80);
    }

    return null;
};

const segmentScore = (work, text) => {
    const segment = normalize(text);
    const title = normalize(stripSeries(work.title));
    const titleWords = title.split(' ').filter(word => word.length > 2);
    const authorWords = normalize(work.author).split(' ').filter(word => word.length > 2);
    let total = 0;

    if (title && segment.includes(title)) total += 12;
    if (titleWords.slice(0, 3).every(word => segment.includes(word))) total += 8;
    if (authorWords.at(-1) && segment.includes(authorWords.at(-1))) total += 5;
    if (authorWords[0] && segment.includes(authorWords[0])) total += 3;
    return total;
};

const lookupAudibleAudiobook = async work => {
    for (const title of titleVariants(work)) {
        const url = 'https://www.audible.com/search?' + new URLSearchParams({
            keywords: `${title} ${work.author}`
        });
        const html = await fetchText(url);
        const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const matches = Array.from(plain.matchAll(/Length:\s*(?:(\d+)\s*hrs?)?\s*(?:and\s*)?(?:(\d+)\s*mins?)?/ig))
            .filter(match => match[1] || match[2])
            .map(match => {
                const hours = Number.parseInt(match[1] || '0', 10);
                const minutes = Number.parseInt(match[2] || '0', 10);
                const nearbyText = plain.slice(Math.max(0, match.index - 900), Math.min(plain.length, match.index + 250));
                return {
                    minutes: (hours * 60) + minutes,
                    score: segmentScore(work, nearbyText)
                };
            })
            .filter(match => match.minutes > 0 && match.score >= 13)
            .sort((a, b) => b.score - a.score);

        const best = matches[0];
        if (best) {
            return {
                minutes: best.minutes,
                source: `audible-search:${title}`
            };
        }
        await sleep(120);
    }

    return null;
};

const shouldReplacePageCount = work =>
    !AUDIO_ONLY && (
        !work.pageCount ||
        work.pageCount <= 0 ||
        work.metricSource?.pageCount?.startsWith('openlibrary:') ||
        work.metricSource?.pageCount?.startsWith('google-books:')
    );

const shouldLookupAudio = work =>
    !work.audiobookDurationMinutes && (work.platform === 'audible' || work.type === 'audiobook' || AUDIO_ALL);

// Never overwrite metrics that were entered by hand or confirmed as verified.
const isManualSource = source =>
    typeof source === 'string' && (source.startsWith('manual') || source.endsWith(':verified'));

(async () => {
    let pagesUpdated = 0;
    let audioUpdated = 0;
    let wordEstimatesUpdated = 0;
    let wordsVerified = 0;

    for (const work of library.works) {
        work.metricSource = work.metricSource || {};

        try {
            const cachedAudio = cache.audio[audioCacheKey(work)];
            if (cachedAudio && shouldLookupAudio(work)) {
                work.audiobookDurationMinutes = cachedAudio.minutes;
                work.metricSource.audiobookDurationMinutes = cachedAudio.source;
            }

            // Primary source: one HLTR call covers word count, pages, and audio runtime.
            const hltr = await lookupHowLongToRead(work).catch(() => null);

            // Word count (the metric we most want to be real): verified when HLTR says so.
            let wordResult = null;
            if (hltr?.wordCount && !AUDIO_ONLY && !isManualSource(work.metricSource.wordCount)) {
                work.wordCount = hltr.wordCount;
                work.metricSource.wordCount = hltr.wordVerified
                    ? `${hltr.source}:verified`
                    : `${hltr.source}:estimated-narration`;
                wordResult = hltr;
                wordEstimatesUpdated++;
                if (hltr.wordVerified) wordsVerified++;
            }

            // Page count: prefer HLTR, fall back to OpenLibrary / Google Books.
            let pageResult = hltr?.pages ? { pages: hltr.pages, source: hltr.source } : null;
            if (!pageResult && shouldReplacePageCount(work)) {
                pageResult = await lookupOpenLibraryPages(work).catch(() => null)
                    || await lookupGooglePages(work).catch(() => null);
            }
            if (pageResult?.pages && (shouldReplacePageCount(work) || hltr?.pages)) {
                work.pageCount = pageResult.pages;
                work.metricSource.pageCount = pageResult.source;
                pagesUpdated++;
                // Only synthesize a word count from pages when HLTR gave us none.
                if (!wordResult && !AUDIO_ONLY && !isManualSource(work.metricSource.wordCount)) {
                    work.wordCount = pageResult.pages * WORDS_PER_PAGE;
                    work.metricSource.wordCount = `estimated-from-${pageResult.source.split(':')[0]}-pages`;
                    wordEstimatesUpdated++;
                }
                writeLibrary();
            }

            await sleep(120);

            // Audiobook runtime: prefer HLTR's structured value, then iTunes/Audible.
            let audioResult = hltr?.audiobookMinutes
                ? { minutes: hltr.audiobookMinutes, source: hltr.source }
                : null;
            if (!audioResult && shouldLookupAudio(work)) {
                audioResult = await lookupITunesAudiobook(work).catch(() => null)
                    || await lookupAudibleAudiobook(work).catch(() => null);
            }
            if (audioResult?.minutes && (hltr?.audiobookMinutes || shouldLookupAudio(work))) {
                work.audiobookDurationMinutes = audioResult.minutes;
                work.metricSource.audiobookDurationMinutes = audioResult.source;
                cache.audio[audioCacheKey(work)] = audioResult;
                audioUpdated++;
                writeLibrary();
                writeCache();
            }

            const wordText = wordResult
                ? `${wordResult.wordCount} words${wordResult.wordVerified ? ' (verified)' : ' (est)'}`
                : AUDIO_ONLY ? 'audio only' : work.wordCount ? `kept ${work.wordCount} words` : 'no words';
            const audioText = audioResult?.minutes ? `${audioResult.minutes} audio min` : work.audiobookDurationMinutes ? `kept ${work.audiobookDurationMinutes} audio min` : 'no audio';
            console.log(`${work.title}: ${wordText}; ${audioText}`);
        } catch (error) {
            console.error(`Failed ${work.title}: ${error.message}`);
        }

        await sleep(180);
    }

    writeLibrary();
    writeCache();
    console.log(`Updated ${pagesUpdated} page counts, ${wordEstimatesUpdated} word counts (${wordsVerified} publisher-verified), and ${audioUpdated} audiobook durations.`);
    console.log('Primary source: howlongtoread.com. Word counts marked ":verified" are actual publisher counts; ":estimated-narration" are derived from real audiobook narration rate; "estimated-from-*-pages" are the pages×275 fallback.');
})();
