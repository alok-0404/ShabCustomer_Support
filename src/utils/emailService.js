/**
 * Email Service - For sending Password Reset Emails
 * Uses nodemailer
 */

import { createTransport } from 'nodemailer';

// Email transporter configuration
const getTransporter = () => {
  // For production, use real SMTP credentials (Gmail, SendGrid, etc.)
  return createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email
      pass: process.env.EMAIL_PASSWORD // Your email password or app-specific password
    }
  });
};

/**
 * Sends password reset email to user
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 */
export const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  try {
    const transporter = getTransporter();

    // Frontend URL where reset form is located
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendURL}/reset-password?token=${resetToken}`;

    // Email content - Professional English format
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Customer Support'}" <${fromEmail}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
              border-radius: 10px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 20px 0;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            }
            .button:hover {
              background-color: #45a049;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              
              <p>We received a request to reset your account password. If you made this request, click the button below to set a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
                ${resetLink}
              </p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link is valid for <strong>1 hour</strong> only</li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you access the link above and create a new one</li>
                </ul>
              </div>
              
              <p>Thank you,<br>
              <strong>${process.env.APP_NAME || 'Customer Support'} Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Plain text version for email clients that don't support HTML
      text: `
Hello ${userName},

We received a request to reset your account password.

To reset your password, visit this link:
${resetLink}

This link is valid for 1 hour only.

If you didn't request this password reset, please ignore this email.

Thank you,
${process.env.APP_NAME || 'Customer Support'} Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Email sending failed: ' + error.message);
  }
};

/**
 * Tests email configuration
 */
export const testEmailConnection = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ Email server connection successful');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    return false;
  }
};

