const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('SMTP Port:', process.env.SMTP_PORT);
console.log('SMTP User:', process.env.SMTP_USER);
console.log('SMTP Pass (first 5 chars):', process.env.SMTP_PASS?.substring(0, 5));

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function main() {
    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('SMTP connection verified successfully!');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: `"MediPulse Test" <${process.env.SMTP_FROM_EMAIL}>`,
            to: process.env.SMTP_FROM_EMAIL, // Send to self
            subject: 'Test Email from MediPulse',
            text: 'Hello, this is a test email.'
        });
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

main();
