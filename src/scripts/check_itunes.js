
const query = "Project Hail Mary Andy Weir";
const url = `https://itunes.apple.com/search?media=audiobook&term=${encodeURIComponent(query)}&limit=1`;

console.log(`Fetching ${url}...`);

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.resultCount > 0) {
            const result = data.results[0];
            console.log('Title:', result.collectionName);
            console.log('Artist:', result.artistName);
            console.log('Duration (ms):', result.trackTimeMillis);
            console.log('Duration (min):', Math.round(result.trackTimeMillis / 60000));
            console.log('Duration (hrs):', (result.trackTimeMillis / 3600000).toFixed(2));
        } else {
            console.log('No results found.');
        }
    })
    .catch(err => console.error(err));
