// Maps a specific genre to a broader "Galaxy" category.
// Order matters: specific/compound forms are matched before broad substrings
// so that e.g. "Science Fiction" and "consciousness" don't get swallowed by a
// bare "sci" test, and "Science" stays out of the Science-Fiction galaxy.
export const getParentGenre = (genre: string): string => {
    const g = genre.toLowerCase();

    if (/sci-?fi|science fiction|space opera|\bspace\b|dystop|cyber|first contact|time travel|post.?apocalyp|\balien/.test(g)) return 'Science Fiction';
    if (/fantas|magic|myth|grimdark|sword|sorcery|dragon/.test(g)) return 'Fantasy';
    if (/horror|ghost|vampire|creature|cosmic|macabre|supernatural/.test(g)) return 'Horror';
    if (/thriller|suspense|mystery|crime|noir|espionage|detective/.test(g)) return 'Mystery & Thriller';
    if (/history|biograph|memoir|\bwar\b/.test(g)) return 'History & Memoir';
    if (/philosoph|conscious|existential|\bthought\b/.test(g)) return 'Philosophy';
    if (/psycholog|\bmind\b|brain|self.?help|dysfunctional/.test(g)) return 'Psychology';
    if (/science|physics|evolut|biology|\bnature\b|medic/.test(g)) return 'Science';
    if (/business|econom|polit|manage|\bsociety\b/.test(g)) return 'Society & Business';
    if (/religion|spirit|\bgod\b|faith/.test(g)) return 'Spirituality';
    if (/poetry|\bart\b|music|design/.test(g)) return 'Arts & Poetry';
    if (/comic|graphic|manga/.test(g)) return 'Comics & Manga';
    if (/romance|\blove\b/.test(g)) return 'Romance';
    if (/adventure|action|quest/.test(g)) return 'Action & Adventure';
    if (/classic|literature/.test(g)) return 'Classics';
    if (/young adult|\bya\b|teen|juvenile/.test(g)) return 'Young Adult';

    return 'Other';
};

// Exact strings that are shelf/format tags or too generic to be a real genre.
const NON_GENRES = new Set([
    'ebook', 'audiobook', 'kindle', 'library', 'owned', 'read', 'currently reading',
    'to read', 'default', 'series', 'reference', 'unfinished', 'dnf', 'reviews',
    'books', 'textbook', 'fiction', 'nonfiction', 'non-fiction', 'general', 'novel',
    'novels', 'juvenile fiction', 'good vs evil', 'adult children of dysfunctional families',
    'fiction in english, 1900- texts', 'texts'
]);

// Collapse near-duplicate spellings onto one canonical subgenre label.
const GENRE_ALIASES: Record<string, string> = {
    'dystopias': 'Dystopian',
    'fantasy fiction': 'Fantasy',
    'comics & graphic novels': 'Comics & Manga',
    'biography & autobiography': 'Biography',
    'business & economics': 'Economics',
    'political science': 'Politics',
    'psychological thriller': 'Thriller',
    'hard sci-fi': 'Sci-Fi'
};

export const normalizeGenre = (genre: string): string | null => {
    const g = genre.toLowerCase().trim();

    if (!g || NON_GENRES.has(g)) return null;
    if (GENRE_ALIASES[g]) return GENRE_ALIASES[g];

    if (g.includes('sci') && g.includes('fi')) return 'Sci-Fi';
    if (g === 'ya' || g === 'young adult') return 'Young Adult';

    // Title-case, preserving separators between words.
    return g.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// An "umbrella" genre is one whose own name is also a galaxy/parent name
// (e.g. "Fantasy", "Science Fiction", "History & Memoir"). These are redundant
// when a book also carries a more specific subgenre in the same galaxy.
export const isUmbrellaGenre = (name: string): boolean => getParentGenre(name) === name;

// Real-world "subject" galaxies. As Goodreads shelves these get sprinkled onto genre
// fiction as themes ("History"/"Art & Design"/"Spirituality" on an epic fantasy), so on
// a clearly fictional work they are noise rather than the book's actual category. They
// are kept for nonfiction works, where they are the genuine subject.
const SUBJECT_PARENTS = new Set([
    'History & Memoir', 'Science', 'Society & Business', 'Philosophy',
    'Psychology', 'Arts & Poetry', 'Spirituality'
]);

const FICTION_MARKERS = /\b(fiction|fantasy|sci-?fi|science fiction|romance|horror|thriller|mystery|dystop|cyberpunk|space opera|grimdark|manga|graphic novel|young adult|literature|novel)\b/i;

// A work is treated as fiction if any raw shelf names a fiction form. "Nonfiction"
// has no word boundary before "fiction", so it correctly does not match.
export const isFictionWork = (rawGenres: string[]): boolean =>
    rawGenres.some(g => FICTION_MARKERS.test(g));

// Resolve a single work's raw genre tags into clean subgenre names:
//  1. drop real-world nonfiction subjects from fiction works (thematic shelves), and
//  2. drop an umbrella tag when a more specific sibling in the same galaxy exists.
export const resolveWorkGenres = (genres: string[]): string[] => {
    const normalized = Array.from(
        new Set(genres.map(normalizeGenre).filter((g): g is string => g !== null))
    );

    const contextual = isFictionWork(genres)
        ? normalized.filter(name => !SUBJECT_PARENTS.has(getParentGenre(name)))
        : normalized;

    const specificParents = new Set(
        contextual.filter(name => !isUmbrellaGenre(name)).map(getParentGenre)
    );

    return contextual.filter(name => !(isUmbrellaGenre(name) && specificParents.has(name)));
};

export const aggregateGenres = (genres: string[]): { name: string; value: number; parent: string }[] => {
    const counts: Record<string, number> = {};

    genres.forEach(g => {
        const normalized = normalizeGenre(g);
        if (normalized) {
            counts[normalized] = (counts[normalized] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({
            name,
            value,
            parent: getParentGenre(name)
        }));
};
