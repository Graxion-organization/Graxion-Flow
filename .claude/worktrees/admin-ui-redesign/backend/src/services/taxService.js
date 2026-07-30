
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
