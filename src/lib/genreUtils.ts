// Maps a specific genre to a broader "Galaxy" category
export const getParentGenre = (genre: string): string => {
    const g = genre.toLowerCase();

    if (g.includes('sci') || g.includes('space') || g.includes('dystop') || g.includes('cyber')) return 'Science Fiction';
    if (g.includes('fantas') || g.includes('magic') || g.includes('myth') || g.includes('grimdark')) return 'Fantasy';
    if (g.includes('horror') || g.includes('ghost') || g.includes('vampire') || g.includes('creature')) return 'Horror';
    if (g.includes('thriller') || g.includes('suspense') || g.includes('mystery') || g.includes('crime') || g.includes('noir')) return 'Mystery & Thriller';
    if (g.includes('history') || g.includes('biograph') || g.includes('memoir') || g.includes('war')) return 'History & Memoir';
    if (g.includes('philosoph') || g.includes('thought') || g.includes('consciousness')) return 'Philosophy';
    if (g.includes('psycholog') || g.includes('mind') || g.includes('brain')) return 'Psychology';
    if (g.includes('science') || g.includes('physics') || g.includes('evolut')) return 'Science';
    if (g.includes('business') || g.includes('econom') || g.includes('polit') || g.includes('manage')) return 'Society & Business';
    if (g.includes('religion') || g.includes('spirit') || g.includes('god') || g.includes('faith')) return 'Spirituality';
    if (g.includes('poetry') || g.includes('art') || g.includes('music') || g.includes('design')) return 'Arts & Poetry';
    if (g.includes('comic') || g.includes('graphic') || g.includes('manga')) return 'Comics & Manga';
    if (g.includes('romance') || g.includes('love')) return 'Romance';
    if (g.includes('adventure') || g.includes('action') || g.includes('quest')) return 'Action & Adventure';
    if (g.includes('classic') || g.includes('literature')) return 'Classics';
    if (g.includes('ya') || g.includes('young adult') || g.includes('teen')) return 'Young Adult';

    return 'Other';
};

export const normalizeGenre = (genre: string): string | null => {
    let g = genre.toLowerCase().trim();

    // ONLY exclude truly technical / non-genre buckets
    const exclusions = [
        'ebook', 'audiobook', 'kindle', 'library', 'owned', 'read',
        'currently reading', 'to read', 'default', 'series', 'reference',
        'unfinished', 'dnf', 'reviews', 'books', 'textbook', 'owned'
    ];

    if (exclusions.some(ex => g === ex)) return null;

    // Don't exclude based on substrings anymore, be much more inclusive
    // We only filter if it's EXACTLY an exclusion.

    // Minimal cleaning (Keep subgenres specific but clean)
    if (g.includes('sci') && g.includes('fi')) return 'Sci-Fi';
    if (g === 'ya' || g === 'young adult') return 'Young Adult';

    // Capitalize properly
    return g.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
