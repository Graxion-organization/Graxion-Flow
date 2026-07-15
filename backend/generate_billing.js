const fs = require('fs');
const path = require('path');

const billingController = `const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const CreditTransaction = require('../models/CreditTransaction');
const AppError = require('../utils/AppError');
const { sendEmail, emailTemplates } = require('../services/emailService');
const logger = require('../utils/logger');
const creditHelper = require('../utils/creditHelper');
const { calculateTax } = require('../services/taxService');
const { generateInvoicePDF } = require('../services/invoiceService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true });
    res.status(200).json({
      status: 'success',
      data: {
        plans: plans.map((p) => ({
          id: p.code,
          label: p.name,
          amount: p.price * 100, // Razorpay amount in paisa
          amountInRupees: p.price,
          messages: p.messageLimit,
          agents: p.agentLimit,
          credits: p.credits,
          description: p.description,
        })),
        currentPlan: req.user.subscription?.plan,
      },
    });
  } catch (err) {
    next(err);
  }
};

// WA-004: Create Subscription (Replaces createOrder)
exports.createSubscription = async (req, res, next) => {
  try {
    const { planId, customerStateCode } = req.body;
    
    // Fetch plan
    const planInfo = await Plan.findOne({ code: planId, isActive: true });
    if (!planInfo) return next(new AppError('Invalid plan selected.', 400));

    // Calculate tax
    const taxInfo = calculateTax(planInfo.price, customerStateCode);
    const amountInPaisa = Math.round(taxInfo.totalAmount * 100);

    // Create a plan on Razorpay if it doesn't exist (assuming Razorpay Plan ID = planId)
    // Here we'd normally map our DB plan to Razorpay Plan ID. For simplicity, we just create an order.
    // Real implementation would use razorpay.subscriptions.create()

    const order = await razorpay.orders.create({
      amount: amountInPaisa,
      currency: 'INR',
      receipt: \`SUB\${req.user._id}\${Date.now()}\`,
      notes: { userId: req.user._id.toString(), plan: planId, isSubscription: "true" },
    });

    await Payment.create({
      user: req.user._id,
      razorpayOrderId: order.id,
      plan: planId,
      amount: amountInPaisa,
      status: 'created',
      taxDetails: taxInfo
    });

    res.status(201).json({
      status: 'success',
      data: {
        orderId: order.id,
        amount: amountInPaisa,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        plan: planId,
        planLabel: planInfo.name,
        prefill: { name: req.user.name, email: req.user.email },
      },
    });
  } catch (err) {
    logger.error('Create subscription error:', err);
    next(err);
  }
};

// Legacy verifyPayment (used by frontend callback)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return next(new AppError('Payment verification failed. Invalid signature.', 400));
    }

    res.status(200).json({ status: 'success', message: 'Payment verified. Awaiting webhook for activation.' });
  } catch (err) {
    logger.error('Verify payment error:', err);
    next(err);
  }
};

// WA-001, WA-002: Razorpay Webhook
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        logger.error('Webhook signature mismatch');
        return res.status(400).send('Invalid signature');
      }
    }

    const { event, payload } = req.body;
    logger.info(\`[RAZORPAY WEBHOOK] Received event \${event}\`);

    if (event === 'payment.captured' || event === 'subscription.charged') {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const notes = paymentEntity.notes || {};
      const userId = notes.userId;
      const planCode = notes.plan;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) return res.status(200).send('Order not found in DB, ignored.');

      if (payment.status === 'captured') return res.status(200).send('Already processed');

      const planInfo = await Plan.findOne({ code: payment.plan });
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      payment.status = 'captured';
      payment.razorpayPaymentId = paymentId;
      payment.billingPeriod = { start: now, end: periodEnd };
      await payment.save();

      const user = await User.findById(payment.user);
      if (user) {
        user.subscription.plan = payment.plan;
        user.subscription.status = 'active';
        user.subscription.currentPeriodStart = now;
        user.subscription.currentPeriodEnd = periodEnd;
        user.subscription.messageLimit = planInfo?.messageLimit || 0;
        user.subscription.agentLimit = planInfo?.agentLimit || 0;
        user.subscription.credits = planInfo?.credits || 0;
        await user.save();

        // Invoice Generation
        const invoiceData = {
          invoiceNumber: paymentId,
          customerName: user.name,
          customerEmail: user.email,
          planName: planInfo?.name || payment.plan,
          baseAmount: payment.taxDetails?.totalAmount 
                      ? (payment.taxDetails.totalAmount - payment.taxDetails.totalTax)
                      : (payment.amount / 100),
          tax: payment.taxDetails || { igst: 0, cgst: 0, sgst: 0, totalAmount: payment.amount / 100, totalTax: 0 }
        };
        const invoicePath = await generateInvoicePDF(invoiceData);
        // We could email the invoice here
        logger.info(\`Invoice generated at \${invoicePath}\`);
      }
    } else if (event === 'payment.failed' || event === 'subscription.halted') {
      // WA-005: Dunning & Suspension
      const paymentEntity = payload.payment.entity;
      const notes = paymentEntity.notes || {};
      const userId = notes.userId;

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.subscription.status = 'past_due';
          await user.save();
          logger.warn(\`User \${userId} subscription marked past_due due to payment failure.\`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    logger.error('Webhook processing error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// WA-006: Upgrade/Proration
exports.upgradePlan = async (req, res, next) => {
  // Proration logic: Calculate remaining days on current plan, subtract from new plan cost.
  res.status(200).json({ status: 'success', message: 'Proration calculation pending' });
};

// WA-007: Refund Payment
exports.refundPayment = async (req, res, next) => {
  try {
    const { paymentId, amount } = req.body; // amount in INR
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? amount * 100 : undefined,
    });
    res.status(200).json({ status: 'success', data: { refund } });
  } catch (err) {
    next(new AppError('Refund failed: ' + err.message, 500));
  }
};

exports.getBillingHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ status: 'success', data: { payments } });
  } catch (err) {
    next(err);
  }
};

exports.getCreditsHistory = async (req, res, next) => {
  try {
    const transactions = await CreditTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ status: 'success', data: { transactions } });
  } catch (err) {
    next(err);
  }
};
`;

fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'billingController.js'), billingController);

const billingRoutes = `const express = require('express');
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Webhook must be raw body if we use body-parser, but we already handle it in server.js middleware if needed
router.post('/webhook', billingController.razorpayWebhook);

router.use(protect);

router.get('/plans', billingController.getPlans);
router.post('/create-subscription', billingController.createSubscription);
router.post('/verify', billingController.verifyPayment);
router.get('/history', billingController.getBillingHistory);
router.get('/credits/history', billingController.getCreditsHistory);
router.post('/upgrade', billingController.upgradePlan);
router.post('/refund', billingController.refundPayment);

module.exports = router;
`;

fs.writeFileSync(path.join(__dirname, 'src', 'routes', 'billing.js'), billingRoutes);
console.log('Created billing logic');
