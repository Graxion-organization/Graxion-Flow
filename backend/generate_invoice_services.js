const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'src', 'services');

const taxService = `
// GST Calculation Service (India)
// 18% standard for SaaS/Software
const GST_RATE = 0.18;
const COMPANY_STATE_CODE = 'MH'; // e.g. Maharashtra

exports.calculateTax = (baseAmount, customerStateCode) => {
  const taxAmount = baseAmount * GST_RATE;
  
  if (!customerStateCode || customerStateCode === COMPANY_STATE_CODE) {
    // Intra-state (CGST + SGST)
    return {
      totalTax: taxAmount,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      igst: 0,
      totalAmount: baseAmount + taxAmount
    };
  } else {
    // Inter-state (IGST)
    return {
      totalTax: taxAmount,
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      totalAmount: baseAmount + taxAmount
    };
  }
};
`;

const invoiceService = `
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

exports.generateInvoicePDF = (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = \`invoice_\${invoiceData.invoiceNumber}.pdf\`;
      const filePath = path.join(os.tmpdir(), fileName);
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(10)
         .text(\`Invoice Number: \${invoiceData.invoiceNumber}\`)
         .text(\`Date: \${new Date().toLocaleDateString()}\`)
         .moveDown();
         
      // Company Details
      doc.text('Provider: WhatsApp Automation SaaS')
         .text('GSTIN: 27AAAAA0000A1Z5')
         .text('State: Maharashtra (MH)')
         .moveDown();
         
      // Customer Details
      doc.text(\`Billed To: \${invoiceData.customerName}\`)
         .text(\`Email: \${invoiceData.customerEmail}\`)
         .moveDown();
         
      // Line Items
      doc.text('---------------------------------------------------------')
         .text(\`Description: Subscription Plan - \${invoiceData.planName}\`)
         .text(\`Base Amount: INR \${invoiceData.baseAmount.toFixed(2)}\`);
         
      if (invoiceData.tax.igst > 0) {
        doc.text(\`IGST (18%): INR \${invoiceData.tax.igst.toFixed(2)}\`);
      } else {
        doc.text(\`CGST (9%): INR \${invoiceData.tax.cgst.toFixed(2)}\`)
           .text(\`SGST (9%): INR \${invoiceData.tax.sgst.toFixed(2)}\`);
      }
      
      doc.text('---------------------------------------------------------')
         .fontSize(12)
         .text(\`Total Amount: INR \${invoiceData.tax.totalAmount.toFixed(2)}\`, { bold: true });
         
      doc.end();
      
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
`;

fs.writeFileSync(path.join(servicesDir, 'taxService.js'), taxService);
fs.writeFileSync(path.join(servicesDir, 'invoiceService.js'), invoiceService);
console.log('Created taxService.js and invoiceService.js');
