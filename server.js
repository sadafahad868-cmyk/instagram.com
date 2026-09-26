const http = require('http');
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
        console.log(`Contact email would be sent to ${RECIPIENT_EMAIL}\n${textBody}`);
        return { queued: true };
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

    sendJson(res, 404, {
        success: false,
        error: 'Not found.'
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
});
