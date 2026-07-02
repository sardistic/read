const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '..', 'src', 'data', 'library.json');
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

const WORDS_PER_PAGE = 275;
const MINUTES_PER_WORD = 60 / 9300; // roughly 155 spoken/read words per minute

const knownPageCounts = new Map(Object.entries({
    'The Player of Games (Culture, #2)': 309,
    'A Parade of Horribles (Dungeon Crawler Carl, #8)': 750,
    'Use of Weapons (Culture, #3)': 411,
    'The State of the Art (Culture, #4)': 192,
    'Excession (Culture, #5)': 451,
    'Inversions (Culture, #6)': 343,
    'Look to Windward (Culture, #7)': 357,
    'Surface Detail (Culture, #9)': 627,
    'The Wise Man\'s Fear (The Kingkiller Chronicle, #2)': 994,
    'The Way of Kings (The Stormlight Archive, #1)': 1007,
    'Words of Radiance (The Stormlight Archive, #2)': 1087,
    'Horrorstor': 240,
    'Horrorstör': 240,
    'A Game of Thrones (A Song of Ice and Fire, #1)': 835,
    'A Clash of Kings  (A Song of Ice and Fire, #2)': 969,
    'A Storm of Swords (A Song of Ice and Fire, #3)': 1128,
    'A Feast for Crows (A Song of Ice and Fire, #4)': 753,
    'A Dance with Dragons (A Song of Ice and Fire, #5)': 1016,
    'The Foundation Trilogy (Foundation, #1-3)': 679,
    'The Picture of Dorian Gray': 254,
    'The Complete Works of H.P. Lovecraft': 1098,
    'The Hobbit, or There and Back Again': 310,
    'The Fellowship of the Ring (The Lord of the Rings, #1)': 423,
    'The Two Towers (The Lord of the Rings, #2)': 352,
    'The Return of the King (The Lord of the Rings, #3)': 416,
    'Gardens of the Moon (Malazan Book of the Fallen, #1)': 666,
    'The Name of the Wind (The Kingkiller Chronicle, #1)': 662,
    'Dune (Dune #1)': 412,
    'American Gods: Tenth Anniversary (American Gods, #1)': 541,
    'The Sunlit Man (Cosmere)': 447,
    'The Eye of the World (Wheel of Time, #1)': 814,
    'The Great Hunt (Wheel of Time, #2)': 705,
    'The Dragon Reborn (Wheel of Time, #3)': 624,
    'The Shadow Rising (Wheel of Time, #4)': 1007,
    'The Fires of Heaven (Wheel of Time, #5)': 912,
    'Lord of Chaos (Wheel of Time, #6)': 1011,
    'A Crown of Swords (Wheel of Time, #7)': 880,
    'A Crown of Swords (The Wheel of Time, #7)': 880,
    'The Path of Daggers (Wheel of Time, #8)': 672,
    'Winter\'s Heart (Wheel of Time, #9)': 766,
    'Crossroads of Twilight (Wheel of Time, #10)': 704,
    'Knife of Dreams (Wheel of Time, #11)': 784,
    'The Gathering Storm (Wheel of Time, #12)': 766,
    'Towers of Midnight (Wheel of Time, #13)': 864,
    'A Memory of Light (Wheel of Time, #14)': 912
    ,
    'Matter (Culture, #8)': 593,
    'Columbus Day (Expeditionary Force, #1)': 386,
    'Dawn (Xenogenesis, #1)': 248,
    'Hyperion (Hyperion Cantos, #1)': 482,
    'Blood Over Bright Haven': 545,
    'His Majesty\'s Dragon (Temeraire, #1)': 356,
    'The Lathe of Heaven': 184,
    'Audition for the Fox': 176,
    'The Carathayan (Second Apocalypse #0.1)': 32,
    'Homegrown Magic (Homegrown Magic, #1)': 384
}));

let pageUpdates = 0;
let wordUpdates = 0;
let durationUpdates = 0;

for (const work of library.works) {
    work.metricSource = work.metricSource || {};
    const knownPages = knownPageCounts.get(work.title);

    if ((!work.pageCount || work.pageCount <= 0) && knownPages) {
        work.pageCount = knownPages;
        work.metricSource.pageCount = 'manual-page-count';
        pageUpdates++;
    } else if (work.pageCount > 0 && !work.metricSource.pageCount) {
        work.metricSource.pageCount = 'existing-page-count';
    }

    if ((!work.wordCount || work.wordCount <= 0) && work.pageCount > 0) {
        work.wordCount = work.pageCount * WORDS_PER_PAGE;
        work.metricSource.wordCount = 'estimated-from-pages';
        wordUpdates++;
    } else if (work.wordCount > 0 && !work.metricSource.wordCount) {
        work.metricSource.wordCount = 'estimated-from-pages';
    }

    if ((!work.durationMinutes || work.durationMinutes <= 0) && work.wordCount > 0) {
        work.durationMinutes = Math.round(work.wordCount * MINUTES_PER_WORD);
        work.metricSource.durationMinutes = 'estimated-from-words';
        durationUpdates++;
    } else if (work.durationMinutes > 0 && !work.metricSource.durationMinutes) {
        work.metricSource.durationMinutes = work.type === 'audiobook'
            ? 'existing-audiobook-duration'
            : 'estimated-from-words';
    }
}

fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));

console.log(`Updated ${pageUpdates} page counts.`);
console.log(`Updated ${wordUpdates} word counts.`);
console.log(`Updated ${durationUpdates} hour estimates.`);
