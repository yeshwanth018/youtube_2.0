import nodemailer from "nodemailer";

export const generateInvoiceHtml = (user, invoice) => {
  const { name } = user;
  const { _id: invoiceId, planSelected, amountPaid, paymentId, createdAt } = invoice;

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Subscription Invoice</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f1f5f9;
        color: #1e293b;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      .header {
        background: linear-gradient(135deg, #ef4444 0%, #d97706 100%);
        padding: 32px;
        text-align: center;
        color: #ffffff;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.025em;
      }
      .header p {
        margin: 8px 0 0 0;
        font-size: 16px;
        opacity: 0.9;
      }
      .content {
        padding: 32px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #0f172a;
      }
      .intro {
        font-size: 15px;
        line-height: 1.6;
        color: #475569;
        margin-bottom: 24px;
      }
      .receipt-box {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
      }
      .footer {
        background-color: #f8fafc;
        padding: 24px;
        text-align: center;
        font-size: 13px;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
      }
      .footer a {
        color: #ef4444;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Your-Tube Receipt</h1>
        <p>Thank you for subscribing!</p>
      </div>
      <div class="content">
        <div class="greeting">Hi ${name || "User"},</div>
        <div class="intro">
          This email confirms that your subscription has been successfully upgraded. A summary of your transaction is detailed below:
        </div>
        
        <div class="receipt-box">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: 500;">Invoice Number</td>
              <td style="padding: 12px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right; font-family: monospace;">${invoiceId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: 500;">Plan Selected</td>
              <td style="padding: 12px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${planSelected.toUpperCase()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: 500;">Payment Reference ID</td>
              <td style="padding: 12px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right; font-family: monospace;">${paymentId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: 500;">Transaction Date</td>
              <td style="padding: 12px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-size: 14px; color: #64748b; font-weight: 500;">Amount Paid</td>
              <td style="padding: 12px 0; font-size: 20px; color: #10b981; font-weight: 800; text-align: right;">₹${amountPaid}.00</td>
            </tr>
          </table>
        </div>
        
        <div class="intro" style="margin-bottom: 0;">
          You now have full access to all your plan benefits. If you have any questions or did not authorize this purchase, please contact our support team immediately.
        </div>
      </div>
      <div class="footer">
        &copy; 2026 Your-Tube Inc. All rights reserved.<br>
        Need help? Visit our <a href="http://localhost:3000/settings">Billing Settings</a>.
      </div>
    </div>
  </body>
</html>
  `;
};

export const sendInvoiceEmail = async (user, invoice) => {
  const { email } = user;
  const { _id: invoiceId, planSelected, amountPaid, paymentId, createdAt } = invoice;

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `Your-Tube Subscription Invoice - ${planSelected.toUpperCase()} Plan`;
  const html = generateInvoiceHtml(user, invoice);

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user_email = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "Your-Tube <no-reply@yourtube.com>";

  if (!host || !user_email || !pass) {
    // ── Ethereal Email: auto-generated test account ──
    // No real SMTP configured — use Ethereal to capture a real email
    // and generate a browser-viewable preview URL.
    try {
      const testAccount = await nodemailer.createTestAccount();

      const etherealTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await etherealTransporter.sendMail({
        from: `"Your-Tube" <${testAccount.user}>`,
        to: email,
        subject,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log("\n=======================================================");
      console.log("  ✅  INVOICE EMAIL SENT VIA ETHEREAL (Test Mode)");
      console.log("=======================================================");
      console.log(`  To:          ${email}`);
      console.log(`  Subject:     ${subject}`);
      console.log(`  Plan:        ${planSelected.toUpperCase()}`);
      console.log(`  Amount:      ₹${amountPaid}`);
      console.log(`  Payment ID:  ${paymentId}`);
      console.log(`  Date:        ${formattedDate}`);
      console.log("-------------------------------------------------------");
      console.log(`  📧 View Email: ${previewUrl}`);
      console.log("=======================================================\n");
    } catch (etherealErr) {
      console.error("[Email] Ethereal fallback also failed:", etherealErr);
      // Ultimate fallback — just log the details
      console.log("\n=== EMAIL LOG FALLBACK ===");
      console.log(`To: ${email} | Plan: ${planSelected.toUpperCase()} | ₹${amountPaid}`);
      console.log(`Invoice: ${invoiceId} | Payment: ${paymentId}\n`);
    }
    return;
  }

  // ── Real SMTP (Gmail, Outlook, etc.) ──
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: port == "465",
      auth: {
        user: user_email,
        pass: pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to: email,
      subject,
      html,
    });

    console.log(`[Email] Invoice sent successfully: ${info.messageId}`);
  } catch (error) {
    console.error("[Email] Failed to send invoice email:", error);
  }
};
