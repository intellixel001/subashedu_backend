import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createInvoicePDF } from "./invoicePDF.js";

dotenv.config({
  path: "./.env",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});


export const sendPaymentConfirmationEmail = async ({
  studentEmail,
  studentName,
  courseTitle,
  paymentDetails,
}) => {
  try {
    // Generate PDF buffer
    const pdfBuffer = await createInvoicePDF(paymentDetails, studentEmail);

    // Email options
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: studentEmail,
      subject: `Payment Confirmation for ${courseTitle} - Suvash Edu`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              background-color: #f4f4f9;
              margin: 0;
              padding: 0;
              color: #1f2937;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background-color: #2563eb;
              padding: 20px;
              text-align: center;
            }
            .header img {
              max-width: 50px;
              height: auto;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              font-size: 24px;
              margin: 10px 0 0;
              display: inline-block;
              vertical-align: middle;
            }
            .content {
              padding: 30px;
            }
            .content h2 {
              color: #1e40af;
              font-size: 20px;
              margin-bottom: 20px;
            }
            .content p {
              font-size: 16px;
              line-height: 1.6;
              margin: 10px 0;
            }
            .details {
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              border: 1px solid #e5e7eb;
            }
            .details ul {
              list-style: none;
              padding: 0;
              font-size: 14px;
            }
            .details ul li {
              margin: 10px 0;
              display: flex;
              justify-content: space-between;
            }
            .details ul li strong {
              color: #1e40af;
            }
            .cta {
              text-align: center;
              margin: 20px 0;
            }
            .cta a {
              display: inline-block;
              padding: 12px 24px;
              background-color: #f59e0b;
              color: #ffffff;
              text-decoration: none;
              border-radius: 4px;
              font-size: 16px;
              font-weight: bold;
            }
            .footer {
              background-color: #2563eb;
              color: #ffffff;
              text-align: center;
              padding: 20px;
              font-size: 12px;
            }
            .footer a {
              color: #ffffff;
              text-decoration: underline;
            }
            @media (max-width: 600px) {
              .container {
                margin: 10px;
              }
              .content {
                padding: 20px;
              }
              .header h1 {
                font-size: 20px;
              }
              .content h2 {
                font-size: 18px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
            Suvash Edu
            </div>
            <div class="content">
              <h2>Payment Confirmation</h2>
              <p>Dear ${studentName},</p>
              <p>Thank you for your payment for the course <strong>${courseTitle}</strong> with Suvash Edu. Your payment has been successfully verified.</p>
              <p>Please find the invoice attached to this email for your records.</p>
              <div class="details">
                <ul>
                  <li><strong>Transaction ID:</strong> ${
                    paymentDetails.transactionId
                  }</li>
                  <li><strong>Amount:</strong> ${paymentDetails.amount} BDT</li>
                  <li><strong>Payment Method:</strong> ${
                    paymentDetails.paymentMethod
                  }</li>
                  <li><strong>Date:</strong> ${new Date(
                    paymentDetails.createdAt
                  ).toLocaleDateString()}</li>
                </ul>
              </div>
              <p>You are now enrolled in the course. Start learning today by accessing your course through the Suvash Edu dashboard.</p>
              <div class="cta">
                <a href="${
                  process.env.APP_URL || "http://localhost:8000"
                }/dashboard">Go to Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>Suvash Edu | House :93-94, Road 6 Block E, Section 11, Mirpur 11, Dhaka, Bangladesh</p>
              <p>Email: <a href="mailto:${process.env.GMAIL_USER}">${
        process.env.GMAIL_USER
      }</a> | Phone: +880 1724 304107</p>
              <p>© 2025 Suvash Edu. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `invoice_${paymentDetails.transactionId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "Failed to send email",
      error: error.message,
    };
  }
};
