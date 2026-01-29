const https = require('https');

const API_URL = 'https://horizonte-api-cr8v.onrender.com/account/accounts?type=USER';
const INTERVAL = 10000; // 10 seconds in milliseconds

function makeRequest() {
    const startTime = Date.now();

    https.get(API_URL, (res) => {
        let data = '';

        // Collect data chunks
        res.on('data', (chunk) => {
            data += chunk;
        });

        // When response is complete
        res.on('end', () => {
            const duration = Date.now() - startTime;
            console.log('\n='.repeat(50));
            console.log(`[${new Date().toISOString()}]`);
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Response Time: ${duration}ms`);
            console.log('Response Body:');

            try {
                // Try to parse and pretty-print JSON
                const jsonData = JSON.parse(data);
                console.log(JSON.stringify(jsonData, null, 2));
            } catch (e) {
                // If not JSON, just print the raw data
                console.log(data);
            }
            console.log('='.repeat(50));
        });

    }).on('error', (err) => {
        console.error('\n='.repeat(50));
        console.error(`[${new Date().toISOString()}]`);
        console.error('Error:', err.message);
        console.error('='.repeat(50));
    });
}

// Make the first request immediately
console.log('Starting API polling...');
console.log(`Requesting: ${API_URL}`);
console.log(`Interval: Every ${INTERVAL / 1000} seconds`);
console.log('Press Ctrl+C to stop\n');

makeRequest();

// Set up interval to make requests every 10 seconds
setInterval(makeRequest, INTERVAL);