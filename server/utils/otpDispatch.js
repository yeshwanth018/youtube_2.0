import nodemailer from "nodemailer";
import { buildOtpEmailHtml } from "./otp.js";

/**
 * Sends OTP via Email.
 * Uses real SMTP when configured, otherwise falls back to Ethereal test mail
 * (same pattern used in sendInvoiceEmail).
 *
 * @param {string} email  - recipient address
 * @param {string} otp    - the 6-digit OTP
 * @param {string} name   - user's display name (for email greeting)
 */
export async function sendOtpEmail(email, otp, name) {
  const subject = `Your-Tube Login OTP: ${otp}`;
  const html = buildOtpEmailHtml(otp, name);

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user_email = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "Your-Tube <no-reply@yourtube.com>";

  // ── No real SMTP → Ethereal test account ──
  if (!host || !user_email || !pass) {
    // Print fallback log instantly so testers don't have to wait for SMTP timeouts
    console.log(`\n[OTP EMAIL FALLBACK] To: ${email} | OTP: ${otp}\n`);

    // If on Render where outbound SMTP is blocked, return immediately to prevent 30s timeouts
    if (process.env.RENDER || process.env.NODE_ENV === "production") {
      return;
    }

    try {
      const testAccount = await nodemailer.createTestAccount();
      const etherealTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });

      const info = await etherealTransporter.sendMail({
        from: `"Your-Tube" <${testAccount.user}>`,
        to: email,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log("\n=======================================================");
      console.log("  ✅  OTP EMAIL SENT VIA ETHEREAL (Test Mode)");
      console.log("=======================================================");
      console.log(`  To:      ${email}`);
      console.log(`  OTP:     ${otp}`);
      console.log("-------------------------------------------------------");
      console.log(`  📧 View Email: ${previewUrl}`);
      console.log("=======================================================\n");
    } catch (err) {
      console.error("[OTP Email] Ethereal fallback failed:", err);
      console.log(`\n[OTP EMAIL FALLBACK] To: ${email} | OTP: ${otp}\n`);
    }
    return;
  }

  // ── Real SMTP ──
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: port == "465",
      auth: { user: user_email, pass },
    });

    const info = await transporter.sendMail({ from, to: email, subject, html });
    console.log(`[OTP Email] Sent successfully: ${info.messageId}`);
  } catch (err) {
    console.error("[OTP Email] Failed to send:", err);
  }
}

/**
 * Sends OTP via SMS.
 * In production, plug in Twilio / AWS SNS / MSG91 here.
 * For now, simulates the SMS with a console log.
 *
 * @param {string} phone - recipient phone number
 * @param {string} otp   - the 6-digit OTP
 */
export async function sendOtpSms(phone, otp) {
  // ─── Replace with real SMS provider in production ───
  // Example with Twilio:
  //   import twilio from "twilio";
  //   const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  //   await client.messages.create({
  //     body: `Your Your-Tube login OTP is: ${otp}. Valid for 10 minutes.`,
  //     from: process.env.TWILIO_PHONE,
  //     to: phone,
  //   });

  console.log("\n=======================================================");
  console.log("  📱  OTP SMS SENT (Simulated — Test Mode)");
  console.log("=======================================================");
  console.log(`  To:      ${phone}`);
  console.log(`  OTP:     ${otp}`);
  console.log(`  Message: Your Your-Tube login OTP is: ${otp}`);
  console.log("=======================================================\n");
}
