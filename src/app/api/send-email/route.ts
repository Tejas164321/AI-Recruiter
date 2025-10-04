
import {NextRequest, NextResponse} from 'next/server';
import nodemailer from 'nodemailer';

/**
 * Defines the shape of a single recipient object.
 */
interface Recipient {
    name: string;
    email: string;
}

/**
 * Defines the expected shape of the request body for sending an email.
 */
interface SendEmailRequestBody {
    recipients: Recipient[];
    subject: string;
    body: string;
}

/**
 * API route handler for sending emails.
 * It uses Nodemailer with Gmail SMTP to send emails in small batches.
 * @param {NextRequest} req - The incoming Next.js API request.
 * @returns {Promise<NextResponse>} A response indicating the outcome of the email sending process.
 */
export async function POST(req: NextRequest) {
    // Check for required environment variables.
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
        console.error("Missing GMAIL_EMAIL or GMAIL_APP_PASSWORD environment variables.");
        return NextResponse.json({ message: "Server is not configured for sending emails." }, { status: 500 });
    }

    try {
        const { recipients, subject, body } = await req.json() as SendEmailRequestBody;

        // Basic validation
        if (!recipients || recipients.length === 0 || !subject || !body) {
            return NextResponse.json({ message: "Missing required fields: recipients, subject, and body." }, { status: 400 });
        }

        // Create a Nodemailer transporter using Gmail SMTP.
        // It's recommended to use an "App Password" for security.
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_EMAIL,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        const batchSize = 20;
        let successfullySentCount = 0;

        // Process recipients in batches to avoid hitting rate limits.
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            // Create a promise for each email in the current batch.
            const batchPromises = batch.map(recipient => {
                // Personalize the body by replacing the placeholder with the candidate's name.
                // Fallback to "Student" if the name is somehow missing.
                const personalizedBody = body.replace(/{{candidateName}}/g, recipient.name || 'Student');

                return transporter.sendMail({
                    from: `"AI Recruiter" <${process.env.GMAIL_EMAIL}>`,
                    to: recipient.email,
                    subject: subject,
                    html: personalizedBody, // Using HTML to allow for rich text formatting.
                });
            });

            // Await all emails in the current batch.
            const results = await Promise.allSettled(batchPromises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successfullySentCount++;
                } else {
                    console.error(`Failed to send email to ${batch[index].email}:`, result.reason);
                }
            });

            // Add a short delay between batches to be respectful of SMTP server limits.
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
            }
        }
        
        return NextResponse.json({ message: `Successfully sent ${successfullySentCount} of ${recipients.length} emails.`, successCount: successfullySentCount, totalCount: recipients.length });

    } catch (error) {
        console.error("Error in /api/send-email:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ message: "Failed to send emails.", error: errorMessage }, { status: 500 });
    }
}
