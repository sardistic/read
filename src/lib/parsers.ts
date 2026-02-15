import Papa from 'papaparse';
import { Work, WorkStatus } from './types';

interface GoodreadsRow {
    'Book Id': string;
    'Title': string;
    'Author': string;
    'Author l-f': string;
    'Additional Authors': string;
    'ISBN': string;
    'ISBN13': string;
    'My Rating': string;
    'Average Rating': string;
    'Publisher': string;
    'Binding': string;
    'Number of Pages': string;
    'Year Published': string;
    'Original Publication Year': string;
    'Date Read': string;
    'Date Added': string;
    'Bookshelves': string;
    'Bookshelves with positions': string;
    'Exclusive Shelf': string;
    'My Review': string;
    'Spoiler': string;
    'Private Notes': string;
    'Read Count': string;
    'Recommended For': string;
    'Recommended By': string;
    'Owned Copies': string;
    'Original Purchase Date': string;
    'Original Purchase Location': string;
    'Condition': string;
    'Condition Description': string;
    'BCID': string;
}

export const parseGoodreadsCSV = (csvContent: string): Promise<Work[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse<GoodreadsRow>(csvContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const works: Work[] = results.data.map((row) => {
                        // Map status
                        let status: WorkStatus = 'toread';
                        if (row['Exclusive Shelf'] === 'read') status = 'read';
                        else if (row['Exclusive Shelf'] === 'currently-reading') status = 'reading';
                        else if (row['Exclusive Shelf'] === 'to-read') status = 'toread';
                        else status = 'toread'; // Default to to-read for custom shelves if unsure, or 'dnf' if we had logic

                        // Map Dates (Goodreads dates are YYYY/MM/DD or missing)
                        const dateRead = row['Date Read'] ? new Date(row['Date Read']).toISOString().split('T')[0] : undefined;
                        const dateAdded = row['Date Added'] ? new Date(row['Date Added']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                        return {
                            id: row['Book Id'] || crypto.randomUUID(),
                            title: row['Title'],
                            author: row['Author'],
                            type: 'book', // Goodreads is mostly books
                            status,
                            rating: parseInt(row['My Rating'], 10) || 0,
                            dateRead,
                            dateAdded,
                            pageCount: parseInt(row['Number of Pages'], 10) || 0,
                            // Word count estimate if pages exist
                            wordCount: (parseInt(row['Number of Pages'], 10) || 0) * 275,
                            genres: [], // Goodreads doesn't export genres in CSV sadly
                            platform: 'goodreads',
                            notes: row['Private Notes']
                        };
                    });
                    resolve(works);
                } catch (e) {
                    console.error("Error parsing rows", e);
                    reject(e);
                }
            },
            error: (error: Error) => { // Explicitly typed as Error
                reject(error);
            }
        });
    });
};
