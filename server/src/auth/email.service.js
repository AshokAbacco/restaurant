// ==============================================
// src/auth/email.service.js
// ==============================================

import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

export const sendPasswordResetEmail = async ({ to, resetUrl, name }) => {
  const from =
    process.env.SMTP_FROM || "Restaurant ERP <no-reply@restauranterp.com>";

  // In non-production environments, skip real SMTP and just log the link —
  // avoids needing real credentials for local dev / testing.
  if (process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST) {
    console.log("=========================================");
    console.log("PASSWORD RESET EMAIL (dev mode, not sent)");
    console.log("To:", to);
    console.log("Reset URL:", resetUrl);
    console.log("=========================================");
    return;
  }

  const mailer = getTransporter();

  await mailer.sendMail({
    from,
    to,
    subject: "Reset your Restaurant ERP password",
    html: `
      <p>Hi ${name || "there"},</p>
      <p>We received a request to reset your Restaurant ERP password. This link expires in 30 minutes.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password will not change.</p>
    `,
  });
};
