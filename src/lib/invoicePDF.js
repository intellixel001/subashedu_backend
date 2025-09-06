import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createInvoicePDF(paymentDetails, studentEmail) {
  return new Promise((resolve, reject) => {
    // Create document with proper margins
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    const stream = new PassThrough();
    const buffers = [];

    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', reject);

    doc.pipe(stream);

    // Color Palette
    const primaryColor = '#2563EB'; // Primary blue
    const darkColor = '#1E40AF'; // Dark blue
    const accentColor = '#F59E0B'; // Accent yellow
    const lightColor = '#F8FAFC'; // Light background
    const textColor = '#1F2937'; // Dark text
    const lightText = '#6B7280'; // Light text
    const borderColor = '#E5E7EB'; // Border color

    // Helper function to ensure content stays within bounds
    const checkY = (y) => {
      if (y > 750) {
        doc.addPage();
        return 50;
      }
      return y;
    };

    let y = 50;

    // Header with logo and invoice info
    try {
      doc.image(path.join(__dirname, '../../public/logo.png'), 50, y, {
        width: 50,
        height: 50,
        align: 'left'
      });
    } catch (error) {
      console.warn('Logo image could not be loaded:', error.message);
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Suvash Edu', 50, y);
    }

    // Invoice header info
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(darkColor)
       .text('INVOICE', 400, y, { align: 'right' })
       .fontSize(10)
       .font('Helvetica')
       .fillColor(lightText)
       .text(`#${paymentDetails.transactionId}`, 400, y + 20, { align: 'right' })
       .text(new Date(paymentDetails.createdAt).toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'short',
         day: 'numeric'
       }), 400, y + 35, { align: 'right' });

    y = checkY(y + 80);

    // Invoice title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor(darkColor)
       .text('Payment Receipt', 50, y);

    y = checkY(y + 40);

    // Divider
    doc.strokeColor(borderColor)
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(562, y)
       .stroke();

    y = checkY(y + 20);

    // Two-column layout for student and course info
    const columnWidth = 240;
    
    // Student Information
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(darkColor)
       .text('STUDENT INFORMATION', 50, y);

    y = checkY(y + 25);

    doc.rect(50, y, columnWidth, 120)
       .fillColor(lightColor)
       .fill()
       .strokeColor(borderColor)
       .stroke();

    const labelX = 60;
    const valueX = 130;
    const lineHeight = 25;

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(textColor)
       .text('Name:', labelX, y + 10, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(paymentDetails.studentName, valueX, y + 10, { width: columnWidth - 80, align: 'left' })
       .font('Helvetica-Bold')
       .text('Email:', labelX, y + 10 + lineHeight, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(studentEmail || 'N/A', valueX, y + 10 + lineHeight, { width: columnWidth - 80, align: 'left' })
       .font('Helvetica-Bold')
       .text('Date:', labelX, y + 10 + lineHeight * 2, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(new Date(paymentDetails.createdAt).toLocaleDateString(), valueX, y + 10 + lineHeight * 2, { width: columnWidth - 80, align: 'left' })
       .font('Helvetica-Bold')
       .text('Invoice Status:', labelX, y + 10 + lineHeight * 3, { width: 60, align: 'left' })
       .font('Helvetica')
       .fillColor('#10B981')
       .text('PAID', valueX, y + 10 + lineHeight * 3, { width: columnWidth - 80, align: 'left' });

    // Course Information (fixed spacing)
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(darkColor)
       .text('COURSE INFORMATION', 330, y - 25);

    const courseBoxHeight = 120;
    doc.rect(330, y, columnWidth, courseBoxHeight)
       .fillColor(lightColor)
       .fill()
       .strokeColor(borderColor)
       .stroke();

    const courseLabelX = 340;
    const courseValueX = 400;

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(textColor)
       .text('Course:', courseLabelX, y + 10, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(paymentDetails.courseTitle, courseValueX, y + 10, { width: columnWidth - 70, align: 'left' })
       .font('Helvetica-Bold')
       .text('Enrollment Date:', courseLabelX, y + 10 + lineHeight, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(new Date(paymentDetails.createdAt).toLocaleDateString(), courseValueX, y + 10 + lineHeight, { width: columnWidth - 70, align: 'left' })
       .font('Helvetica-Bold')
       .text('Payment Method:', courseLabelX, y + 10 + lineHeight * 2, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(paymentDetails.paymentMethod, courseValueX, y + 10 + lineHeight * 2, { width: columnWidth - 70, align: 'left' })
       .font('Helvetica-Bold')
       .text('Reference:', courseLabelX, y + 10 + lineHeight * 3, { width: 60, align: 'left' })
       .font('Helvetica')
       .text(paymentDetails.transactionId.slice(0, 12) + '...', courseValueX, y + 10 + lineHeight * 3, { width: columnWidth - 70, align: 'left' });

    y = checkY(y + 140);

    // Payment Details
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(darkColor)
       .text('PAYMENT DETAILS', 50, y);

    y = checkY(y + 20);

    // Table header
    doc.rect(50, y, 512, 20)
       .fillColor(darkColor)
       .fill();

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('white')
       .text(' Descriptions', 60, y + 5)
       .text('Amount', 500, y + 5, { align: 'right' });

    y = checkY(y + 25);

    // Course row
    doc.rect(50, y, 512, 20)
       .fillColor(lightColor)
       .fill();

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(textColor)
       .text(paymentDetails.courseTitle, 60, y + 5)
       .text(`${paymentDetails.amount} BDT`, 500, y + 5, { align: 'right' });

    y = checkY(y + 25);

    // Total row
    doc.rect(50, y, 512, 30)
       .fillColor(primaryColor)
       .fill();

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('white')
       .text('TOTAL AMOUNT', 60, y + 8)
       .text(`${paymentDetails.amount} BDT`, 500, y + 8, { align: 'right' });

    y = checkY(y + 50);

    // Payment Notes
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(lightText)
       .text('Payment Terms:', 50, y)
       .font('Helvetica-Bold')
       .fillColor(textColor)
       .text('Confirmed on receipt', 130, y)
       .font('Helvetica')
       .fillColor(lightText)
       .text('Payment Method:', 50, y + 15)
       .font('Helvetica-Bold')
       .fillColor(textColor)
       .text(paymentDetails.paymentMethod, 130, y + 15);

    y = checkY(y + 40);

    // Footer
    doc.rect(50, y, 512, 2)
       .fillColor(borderColor)
       .fill();

    y = checkY(y + 15);

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(lightText)
       .text('Thank you for your payment!', 50, y)
       .text('This is an automated receipt. Please contact suvasheducation@gmail.com for any questions.', 50, y + 15);

    y = checkY(y + 40);

    // Company info footer
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(lightText)
       .text('Suvash Edu | House :93-94, Road 6 Block E, Section 11, Mirpur 11, Dhaka, Bangladesh | suvasheducation@gmail.com | +880 1724 304107', 
             50, y, { align: 'center', width: 512 });

    // Finalize PDF
    doc.end();
  });
}