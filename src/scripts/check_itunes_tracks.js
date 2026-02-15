
const collectionId = 1565808256; // Project Hail Mary
// Try 'album' and 'song' entities, or just default lookup with &entity=song
const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`;

console.log(`Fetching ${url}...`);

fetch(url)
    .then(res => res.json())
    .then(data => {
        console.log(`Result Count: ${data.resultCount}`);
        if (data.resultCount > 1) {
            // Index 0 is usually the collection, subsequent are tracks
            const tracks = data.results.slice(1);
            let totalMillis = 0;
            tracks.forEach((t, i) => {
                console.log(`Track ${i + 1}: ${t.trackName} - ${t.trackTimeMillis}ms`);
                totalMillis += (t.trackTimeMillis || 0);
            });

            console.log('----------------');
            console.log(`Total Duration (ms): ${totalMillis}`);
            console.log(`Total Duration (min): ${Math.round(totalMillis / 60000)}`);
            console.log(`Total Duration (hrs): ${(totalMillis / 3600000).toFixed(2)}`);
        } else {
            console.log('No tracks found in lookup.');
            console.log(JSON.stringify(data.results[0], null, 2));
        }
    })
    .catch(err => console.error(err));
