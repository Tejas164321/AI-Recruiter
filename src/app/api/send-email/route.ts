
import {NextRequest, NextResponse} from 'next/server';
import nodemailer from 'nodemailer';

// Define the expected shape of the request body
interface EmailPayload {
  recipients: Array<{name: string; email: string;}>;
  subject: string;
  body: string;
}

// Define the configuration for Nodemailer with Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

/**
 * A helper function to introduce a delay.
 * @param {number} ms - The number of milliseconds to wait.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * POST handler for the /api/send-email route.
 * It sends emails in small batches to avoid hitting rate limits.
 */
export async function POST(req: NextRequest) {
    // Check for required environment variables
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
        console.error('Missing GMAIL_EMAIL or GMAIL_APP_PASSWORD environment variables.');
        return NextResponse.json({ message: 'Server configuration error: Missing email credentials.' }, { status: 500 });
    }

    try {
        const payload: EmailPayload = await req.json();
        const { recipients, subject, body } = payload;

        // Validate the payload
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !body) {
            return NextResponse.json({ message: 'Invalid request payload. Required: recipients array, subject, body.' }, { status: 400 });
        }

        const BATCH_SIZE = 20; // Number of emails per batch
        const DELAY_MS = 5000; // Delay between batches (5 seconds)

        let successfullySent = 0;
        const failedRecipients: string[] = [];

        // Process recipients in batches
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            
            // Create a promise for each email in the batch
            const emailPromises = batch.map(async (recipient) => {
                const personalizedBody = body.replace(/{{candidateName}}/g, recipient.name || 'Candidate');
                const mailOptions = {
                    from: `"AI Recruiter" <${process.env.GMAIL_EMAIL}>`,
                    to: recipient.email,
                    subject,
                    html: personalizedBody, // Use HTML to allow for formatted emails
                };
                try {
                    await transporter.sendMail(mailOptions);
                    successfullySent++;
                } catch (error) {
                    console.error(`Failed to send email to ${recipient.email}:`, error);
                    failedRecipients.push(recipient.email);
                }
            });

            await Promise.all(emailPromises);

            // If there are more batches to process, wait before sending the next one
            if (i + BATCH_SIZE < recipients.length) {
                await delay(DELAY_MS);
            }
        }

        if (failedRecipients.length > 0) {
             return NextResponse.json({ message: `Process complete. Sent ${successfullySent} emails, but failed for: ${failedRecipients.join(', ')}.` }, { status: 207 }); // 207 Multi-Status
        }

        return NextResponse.json({ message: `Successfully sent ${successfullySent} emails.` }, { status: 200 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error('Error in send-email API:', error);
        return NextResponse.json({ message: `Failed to process request: ${errorMessage}` }, { status: 500 });
    }
}
