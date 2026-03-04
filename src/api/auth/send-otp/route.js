import sql from '../../utils/sql.js';
import nodemailer from "nodemailer";
import crypto from "crypto";

// Generic transporter fallback (Ethereal fake-smtp if no real SMTP details are provided in .env)
let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;

    // Use configured SMTP if available
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    } else {
        // Fallback to Ethereal Testing Account automatically
        console.log("No SMTP details found in .env, falling back to Ethereal Testing SMTP...");
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
    return transporter;
}

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return Response.json({ error: "Email is required" }, { status: 400 });
        }

        // 1. Check if the user exists in our system (Since this is Sign In only)
        const [user] = await sql`SELECT id FROM auth_users WHERE email = ${email}`;
        if (!user) {
            return Response.json({ error: "No account found with this email. Please sign up first." }, { status: 404 });
        }

        // 2. Generate a secure 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // 3. Store the token in auth_verification_token
        await sql`
      INSERT INTO auth_verification_token (identifier, token, expires)
      VALUES (${email}, ${otp}, ${expiresAt})
    `;

        // 4. Send the OTP email
        const mailer = await getTransporter();

        const info = await mailer.sendMail({
            from: process.env.EMAIL_FROM || '"Study Planner Auth" <noreply@studyplanner.com>',
            to: email,
            subject: "Your Sign In Code - Study Planner",
            text: `Your Study Planner sign in code is: ${otp}\n\nThis code will expire in 5 minutes.`,
            html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Sign In Code</h2>
          <p>Use the following 6-digit code to securely complete your sign in:</p>
          <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <h1 style="letter-spacing: 5px; margin: 0; color: #8B70F6;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
        </div>
      `,
        });

        // If using Ethereal, log the preview URL specifically to the terminal so the dev can click it
        if (!process.env.SMTP_HOST) {
            console.log("\n\n--------------------- OTP EMAIL SENT ---------------------");
            console.log("Preview URL: " + nodemailer.getTestMessageUrl(info));
            console.log("----------------------------------------------------------\\n\\n");
        }

        return Response.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("OTP generation error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
