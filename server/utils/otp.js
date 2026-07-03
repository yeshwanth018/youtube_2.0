import crypto from "crypto";

/**
 * Generates a cryptographically random 6-digit OTP string.
 * @returns {string} e.g. "482901"
 */
export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Returns the OTP expiry time (10 minutes from now).
 * @returns {Date}
 */
export function getOtpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

/**
 * Builds a styled HTML email body for the OTP.
 * @param {string} otp
 * @param {string} name - user's display name
 * @returns {string} HTML string
 */
export function buildOtpEmailHtml(otp, name) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Your-Tube Login OTP</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f1f5f9;
        color: #1e293b;
        margin: 0; padding: 0;
      }
      .container {
        max-width: 520px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      .header {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        padding: 28px;
        text-align: center;
        color: #fff;
      }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
      .header p  { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
      .content { padding: 32px; text-align: center; }
      .otp-box {
        display: inline-block;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: 10px;
        color: #6366f1;
        background: #f1f5f9;
        border: 2px dashed #c7d2fe;
        border-radius: 12px;
        padding: 16px 32px;
        margin: 24px 0;
        font-family: 'Courier New', monospace;
      }
      .note {
        font-size: 14px;
        color: #64748b;
        line-height: 1.6;
      }
      .footer {
        background: #f8fafc;
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Your-Tube Login</h1>
        <p>One-Time Password Verification</p>
      </div>
      <div class="content">
        <p style="font-size:16px; font-weight:600;">Hi ${name || "there"},</p>
        <p class="note">Use the code below to complete your login. This code is valid for <strong>10 minutes</strong>.</p>
        <div class="otp-box">${otp}</div>
        <p class="note">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        &copy; 2026 Your-Tube Inc. &mdash; Do not share this code with anyone.
      </div>
    </div>
  </body>
</html>
  `;
}
