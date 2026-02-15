const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'src', 'data', 'library.json');
const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));

const genreKeywords = {
    // Science Fiction
    'Space Opera': ['space opera', 'galactic empire', 'interstellar', 'starship', 'spaceship', 'galaxy-spanning', 'solar republic'],
    'Cyberpunk': ['cyberpunk', 'artificial intelligence', 'android', 'neon', 'high tech low life', 'hacking'],
    'Dystopian': ['dystopian', 'dystopia', 'totalitarian', 'oppressive', 'rebellion', 'uprising', 'resistance'],
    'Post-Apocalyptic': ['post-apocalyptic', 'apocalypse', 'collapse', 'ruins', 'survival', 'wasteland'],
    'Hard Sci-Fi': ['hard sci-fi', 'physics', 'scientific', 'technical', 'realistic space'],
    'First Contact': ['first contact', 'alien', 'extra-terrestrial', 'encounter', 'aliens'],
    'Time Travel': ['time travel', 'timeline', 'chronomancer', 'future', 'past'],
    'Science Fiction': ['sci-fi', 'science fiction', 'cosmere', 'mars', 'planet'],

    // Fantasy
    'Epic Fantasy': ['epic fantasy', 'high fantasy', 'world-building', 'quest', 'kingdom', 'empire', 'throne'],
    'Grimdark': ['grimdark', 'dark fantasy', 'gritty', 'brutal', 'unfiltered', 'grey morality'],
    'Urban Fantasy': ['urban fantasy', 'modern magic', 'city magic', 'contemporary fantasy'],
    'Sword & Sorcery': ['sword & sorcery', 'blade', 'wizard', 'witch', 'magic system'],
    'Mythology': ['mythology', 'gods', 'myth', 'ancient', 'pantheon', 'legends'],
    'Fantasy': ['fantasy', 'dragon', 'sorcery', 'magic', 'labrint', 'hierarchy'],

    // Horror
    'Cosmic Horror': ['cosmic horror', 'eldritch', 'lovecraftian', 'unimaginable', 'insanity', 'madness'],
    'Body Horror': ['body horror', 'mutation', 'flesh', 'grotesque'],
    'Supernatural': ['supernatural', 'ghost', 'haunted', 'vampire', 'werewolf', 'spirit', 'demon'],
    'Horror': ['horror', 'scary', 'spooky', 'monsters', 'terrifying'],

    // Mystery & Thriller
    'Noir': ['noir', 'gritty', 'detective', 'rainy', 'investigation', 'femme fatale'],
    'Psychological Thriller': ['psychological thriller', 'mind games', 'unreliable narrator', 'suspense'],
    'Crime': ['crime', 'murder', 'heist', 'thief', 'mafia', 'underworld'],
    'Espionage': ['espionage', 'spy', 'intelligence', 'secret agent', 'covert'],
    'Mystery & Thriller': ['mystery', 'thriller', 'suspense', 'detective'],

    // Non-Fiction & Thought
    'Philosophy': ['philosophy', 'existentialism', 'stoicism', 'morality', 'ethics', 'thought'],
    'Psychology': ['psychology', 'trauma', 'mind', 'brain', 'behavior', 'therapy'],
    'Science': ['science', 'physics', 'biology', 'evolution', 'nature', 'astronomy'],
    'Economics': ['economics', 'finance', 'market', 'money', 'business'],
    'Politics': ['politics', 'political', 'society', 'government', 'governance'],
    'History': ['history', 'historical', 'biography', 'autobiography', 'memoir', 'war', 'ancient'],

    // Action & Adventure
    'Adventure': ['adventure', 'quest', 'exploration', 'journey', 'expedition'],
    'Action': ['action', 'combat', 'battle', 'fighting', 'warrior'],

    // Other
    'Classics': ['classic', 'literature', 'literary', 'masterpiece', 'canonical'],
    'Romance': ['romance', 'love', 'romantic', 'dating', 'relationship'],
    'Poetry': ['poetry', 'poem', 'verse'],
    'Art & Design': ['art', 'design', 'drawing', 'painting', 'creative'],
    'Young Adult': ['ya', 'young adult', 'teen', 'adolescent'],
    'Comics & Manga': ['comic', 'graphic novel', 'manga', 'illustrated'],
    'Satire': ['satire', 'darkly witty', 'parody', 'ironic'],
    'Fiction': ['fiction', 'novel', 'story']
};

const enrichedWorks = library.works.map(work => {
    let genres = work.genres || [];
    const text = (work.title + ' ' + (work.description || '') + ' ' + (work.seriesName || '')).toLowerCase();

    // Multigenre: Scan EVERY book for all keywords
    Object.entries(genreKeywords).forEach(([genre, keywords]) => {
        if (keywords.some(kw => text.includes(kw))) {
            if (!genres.includes(genre)) {
                genres.push(genre);
            }
        }
    });

    // Still empty? Fallback 
    if (genres.length === 0) {
        genres.push('General');
    }

    return { ...work, genres };
});

fs.writeFileSync(libPath, JSON.stringify({ works: enrichedWorks }, null, 2));
console.log(`Massively Enriched ${enrichedWorks.length} works with detailed subgenres.`);
