const http = require('http');

const payload = JSON.stringify({
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Hello',
    message: 'This is a test contact submission.'
});

const req = http.request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
}, (res) => {
    let raw = '';
    res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => {
        const data = JSON.parse(raw);
        if (res.statusCode !== 200 || !data.success || data.recipientEmail !== 'mallickfahad13@gmail.com') {
            console.error('Contact endpoint test failed:', res.statusCode, raw);
            process.exit(1);
        }
        console.log('Contact endpoint test passed');
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('Request failed:', error.message);
    process.exit(1);
});

req.write(payload);
req.end();
