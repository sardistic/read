
const query = "Project Hail Mary";
const url = `https://www.audible.com/search?keywords=${encodeURIComponent(query)}`;

console.log(`Fetching ${url}...`);

fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
})
    .then(res => res.text())
    .then(html => {
        // Look for "Length: 16 hrs and 10 mins"
        const lengthMatch = html.match(/Length:\s*(\d+)\s*hrs?\s*(?:and\s*(\d+)\s*mins?)?/i);
        if (lengthMatch) {
            const hours = parseInt(lengthMatch[1], 10);
            const mins = parseInt(lengthMatch[2] || '0', 10);
            const totalMinutes = (hours * 60) + mins;
            console.log(`Found Duration: ${hours}h ${mins}m (${totalMinutes} mins)`);
        } else {
            console.log('Duration not found in HTML.');
            // console.log(html.substring(0, 1000)); // Debug
        }
    })
    .catch(err => console.error(err));
