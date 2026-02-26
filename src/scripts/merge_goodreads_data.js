
const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '../data/library.json');
const scrapePath = path.join(__dirname, '../data/goodreads_scrape.json');

const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const scraped = JSON.parse(fs.readFileSync(scrapePath, 'utf8'));

let addedCount = 0;
let updatedCount = 0;

// Map Goodreads shelf names to our status values
const shelfToStatus = (shelf) => {
    if (shelf === 'read') return 'read';
    if (shelf === 'currently-reading') return 'reading';
    if (shelf === 'to-read') return 'toread';
    return 'read'; // default
};

// Helper to normalize strings for comparison
const normalize = (str) => str ? str.toLowerCase().replace(/[^\w\s]/g, '').trim() : '';

scraped.forEach(scrapedBook => {
    // Try to find existing book
    let existingBook = library.works.find(work => {
        // Exact title match (normalized)
        if (normalize(work.title) === normalize(scrapedBook.title)) return true;
        // Check fuzzy if needed? For now strict on title, loose on author
        return false;
    });

    if (existingBook) {
        let updated = false;

        // Update cover if missing
        if (!existingBook.coverImage && scrapedBook.imageUrl) {
            existingBook.coverImage = scrapedBook.imageUrl;
            updated = true;
        }

        // Update dateRead if missing
        if (!existingBook.dateRead && scrapedBook.dateRead) {
            // scraped date is "Wed, 11 Feb 2026 00:00:00 +0000"
            // convert to YYYY-MM-DD
            try {
                const d = new Date(scrapedBook.dateRead);
                if (!isNaN(d.getTime())) {
                    existingBook.dateRead = d.toISOString().split('T')[0];
                    updated = true;
                }
            } catch (e) {
                console.error(`Failed to parse date for ${scrapedBook.title}: ${scrapedBook.dateRead}`);
            }
        }

        // Update status from shelf if shelf data is available
        if (scrapedBook.shelf) {
            const newStatus = shelfToStatus(scrapedBook.shelf);
            if (existingBook.status !== newStatus) {
                console.log(`  Status change: ${existingBook.title}: ${existingBook.status} -> ${newStatus}`);
                existingBook.status = newStatus;
                updated = true;
            }
        }

        if (updated) {
            updatedCount++;
            console.log(`Updated: ${existingBook.title}`);
        }
    } else {
        // Add new book
        const newBook = {
            id: Math.floor(Math.random() * 1000000000).toString(),
            title: scrapedBook.title,
            author: scrapedBook.author,
            type: "book",
            status: scrapedBook.shelf ? shelfToStatus(scrapedBook.shelf) : "read",
            rating: 0,
            dateAdded: new Date().toISOString().split('T')[0],
            pageCount: 0, // Unknown
            coverImage: scrapedBook.imageUrl || "",
            description: "",
            genres: [],
            platform: "goodreads",
            notes: ""
        };

        if (scrapedBook.dateRead) {
            try {
                const d = new Date(scrapedBook.dateRead);
                if (!isNaN(d.getTime())) {
                    newBook.dateRead = d.toISOString().split('T')[0];
                }
            } catch (e) { }
        }

        // If no date read, we might want to infer from the list order? 
        // For now leave it blank, as the timeline handles missing dates by putting them at the start.

        library.works.push(newBook);
        addedCount++;
        console.log(`Added: ${newBook.title}`);
    }
});

// Write back
fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));

console.log(`\nDone! Added ${addedCount} books, updated ${updatedCount} books.`);
