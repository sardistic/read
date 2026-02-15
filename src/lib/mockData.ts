import { Work } from './types';

export const mockWorks: Work[] = [
    {
        id: '1',
        title: 'The Way of Kings',
        author: 'Brandon Sanderson',
        type: 'book',
        status: 'read',
        rating: 5,
        dateRead: '2022-08-15',
        dateAdded: '2022-01-10',
        pageCount: 1007,
        wordCount: 384000,
        genres: ['Fantasy', 'Epic Fantasy', 'High Fantasy'],
        platform: 'goodreads',
        notes: 'Absolutely monumental based.'
    },
    {
        id: '2',
        title: 'Project Hail Mary',
        author: 'Andy Weir',
        type: 'audiobook',
        status: 'read',
        rating: 5,
        dateRead: '2023-05-20',
        dateAdded: '2023-05-01',
        durationMinutes: 980, // ~16h 20m
        genres: ['Sci-Fi', 'Space', 'Hard Sci-Fi'],
        platform: 'audible',
        notes: 'Ray Porter narration is top tier.'
    },
    {
        id: '3',
        title: 'Dune',
        author: 'Frank Herbert',
        type: 'book',
        status: 'reading',
        dateAdded: '2023-11-01',
        pageCount: 412,
        wordCount: 188000,
        coverImage: 'https://upload.wikimedia.org/wikipedia/en/d/de/Dune-Frank_Herbert_%281965%29_First_edition.jpg',
        genres: ['Sci-Fi', 'Classic'],
        platform: 'goodreads'
    },
    {
        id: '4',
        title: 'Hyperion',
        author: 'Dan Simmons',
        type: 'audiobook',
        status: 'toread',
        dateAdded: '2023-12-15',
        durationMinutes: 1240,
        genres: ['Sci-Fi', 'Space Opera'],
        platform: 'audible'
    },
    {
        id: '5',
        title: 'House of Leaves',
        author: 'Mark Z. Danielewski',
        type: 'book',
        status: 'toread',
        dateAdded: '2024-01-05',
        pageCount: 709,
        wordCount: 150000, // Hard to say lol
        genres: ['Horror', 'Experimental', 'Fiction'],
        platform: 'manual'
    },
    {
        id: '6',
        title: 'Blindsight',
        author: 'Peter Watts',
        type: 'book',
        status: 'read',
        rating: 4,
        dateRead: '2023-02-14',
        dateAdded: '2023-01-20',
        pageCount: 384,
        wordCount: 98000,
        genres: ['Sci-Fi', 'Horror', 'Hard Sci-Fi'],
        platform: 'goodreads'
    }
];
