
const query = "intitle:Project Hail Mary inauthor:Andy Weir";
const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&filter=audiobooks&maxResults=1`;

console.log(`Fetching ${url}...`);

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.totalItems > 0 && data.items) {
            const book = data.items[0].volumeInfo;
            console.log('Title:', book.title);
            console.log('Authors:', book.authors);
            console.log('Description:', book.description ? book.description.substring(0, 100) + '...' : 'N/A');
            console.log('Page Count:', book.pageCount);
            console.log('Duration:', book.duration); // Check valid field?
            // Sometimes it's in extra properties?
            console.log('Full Info:', JSON.stringify(book, null, 2));
        } else {
            console.log('No results found.');
        }
    })
    .catch(err => console.error(err));
