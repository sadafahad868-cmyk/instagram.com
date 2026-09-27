const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const RECIPIENT_EMAIL = process.env.TO_EMAIL || 'mallickfahad13@gmail.com';

async function sendContactEmail({ name, email, subject, message }) {
    const mailSubject = subject || 'New contact message';
    const textBody = [
        'New contact form submission',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject || 'No subject provided'}`,
        '',
        'Message:',
        message
    ].join('\n');

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const error = 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to enable direct email delivery.';
        console.error(error);
        console.error(`Would have sent to ${RECIPIENT_EMAIL}\n${textBody}`);
        return { sent: false, error };
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: RECIPIENT_EMAIL,
        subject: mailSubject,
        text: textBody
    });

    return { sent: true };
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            sendJson(res, 404, {
                success: false,
                error: 'File not found.'
            });
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (req.method === 'POST' && url.pathname === '/api/contact') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', async () => {
            try {
                const data = body ? JSON.parse(body) : {};
                const name = typeof data.name === 'string' ? data.name.trim() : '';
                const email = typeof data.email === 'string' ? data.email.trim() : '';
                const subject = typeof data.subject === 'string' ? data.subject.trim() : 'Contact message';
                const message = typeof data.message === 'string' ? data.message.trim() : '';

                if (!name || !email || !message) {
                    sendJson(res, 400, {
                        success: false,
                        error: 'Name, email, and message are required.'
                    });
                    return;
                }

                const emailStatus = await sendContactEmail({ name, email, subject, message });

                if (!emailStatus || emailStatus.sent !== true) {
                    sendJson(res, 500, {
                        success: false,
                        error: emailStatus && emailStatus.error ? emailStatus.error : 'Unable to send email. Configure SMTP settings.',
                        recipientEmail: RECIPIENT_EMAIL
                    });
                    return;
                }

                const payload = {
                    success: true,
                    message: 'Message received successfully.',
                    recipientEmail: RECIPIENT_EMAIL,
                    emailStatus,
                    data: {
                        name,
                        email,
                        subject: subject || 'Contact message',
                        message
                    }
                };

                sendJson(res, 200, payload);
            } catch (error) {
                sendJson(res, 400, {
                    success: false,
                    error: 'Invalid JSON payload.'
                });
            }
        });

        return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
    }

    if (req.method === 'GET') {
        const decodedPath = decodeURIComponent(url.pathname);

        if (decodedPath === '/' || decodedPath === '/index.html') {
            sendFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');
            return;
        }

        const requestedFile = path.join(__dirname, decodedPath.replace(/^\//, ''));
        if (requestedFile.startsWith(__dirname) && fs.existsSync(requestedFile)) {
            const extension = path.extname(requestedFile).toLowerCase();
            const typeMap = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp'
            };

            sendFile(res, requestedFile, typeMap[extension] || 'application/octet-stream');
            return;
        }
    }

    sendJson(res, 404, {
        success: false,
        error: 'Not found.'
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
