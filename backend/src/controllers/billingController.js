const Razorpay = require('razorpay');
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

const getRazorpayInstance = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret || keyId === 'dummy') {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const processPartnerCommission = async (user, paymentAmountInRupees, planCode, paymentId = null) => {
  if (!user || !user.referredByPartner || paymentAmountInRupees <= 0) return;
  try {
    const SystemSettings = require('../models/SystemSettings');
    const PartnerCommission = require('../models/PartnerCommission');

    const partner = await User.findById(user.referredByPartner);
    if (!partner) return;

    // Check if commission for this specific payment was already recorded
    const query = {
      partner: partner._id,
      referredUser: user._id,
    };
    if (paymentId) {
      query.payment = paymentId;
    } else {
      query.paymentAmount = paymentAmountInRupees;
      query.notes = { $regex: planCode };
    }

    const existingComm = await PartnerCommission.findOne(query);
    if (existingComm) return;

    const settings = await SystemSettings.findOne({ key: 'global_settings' });
    const rate = partner.partnerCommissionRate || settings?.defaultPartnerCommissionRate || 20;

    const commissionAmount = Math.round((paymentAmountInRupees * rate) / 100);

    if (commissionAmount > 0) {
      await PartnerCommission.create({
        partner: partner._id,
        referredUser: user._id,
        payment: paymentId || null,
        paymentAmount: paymentAmountInRupees,
        commissionAmount: commissionAmount,
        commissionRate: rate,
        status: 'APPROVED',
        notes: `Subscription payment for plan: ${planCode}`
      });
      logger.info(`Recorded Partner Commission of ₹${commissionAmount} for Partner ${partner.email}`);
    }
  } catch (err) {
    logger.error('Failed to process partner commission:', err);
  }
};

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

// WA-004: Create Order / Subscription (Production Razorpay Order Creation)
exports.createSubscription = async (req, res, next) => {
  try {
    const planId = req.body.planId || req.body.plan;
    const { customerStateCode } = req.body;

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return next(new AppError('Razorpay payment gateway is not configured. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env file.', 500));
    }
    
    // Fetch plan
    let planInfo = await Plan.findOne({ code: planId, isActive: true });
    if (!planInfo) {
      const defaultPlans = {
        starter: { name: 'Starter', price: 999, messageLimit: 1000, agentLimit: 3, credits: 500 },
        pro: { name: 'Pro', price: 2999, messageLimit: 5000, agentLimit: 10, credits: 2000 },
        enterprise: { name: 'Enterprise', price: 9999, messageLimit: 50000, agentLimit: 50, credits: 10000 },
      };
      planInfo = defaultPlans[planId];
    }
    if (!planInfo) return next(new AppError('Invalid plan selected.', 400));

    // Calculate tax
    const taxInfo = calculateTax(planInfo.price, customerStateCode);
    const amountInPaisa = Math.round(taxInfo.totalAmount * 100);

    const order = await rzp.orders.create({
      amount: amountInPaisa,
      currency: 'INR',
      receipt: `rcpt_${req.user._id.toString().slice(-8)}_${Date.now()}`,
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
        keyId: process.env.RAZORPAY_KEY_ID?.trim(),
        plan: planId,
        planLabel: planInfo.name,
        prefill: { name: req.user.name, email: req.user.email },
        rbiComplianceNote: amountInPaisa >= 1500000 ? 'As per RBI guidelines, recurring e-mandates above ₹15,000 will require AFA (Additional Factor of Authentication).' : undefined
      },
    });
  } catch (err) {
    const errorDetail = err.error?.description || err.description || err.message || 'Unknown Razorpay Error';
    logger.error('Create Razorpay subscription order error:', err);
    if (err.statusCode === 401 || errorDetail.toLowerCase().includes('authentication failed')) {
      return next(new AppError('Razorpay Authentication Failed: Invalid RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in backend .env file. Please verify your Razorpay API key credentials.', 401));
    }
    next(new AppError(`Razorpay payment order creation failed: ${errorDetail}`, 500));
  }
};

// Verify Payment Signature & Activate Subscription
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;
    const planCode = plan || req.body.planId;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return next(new AppError('Missing required payment verification credentials.', 400));
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return next(new AppError('Razorpay secret key not configured on server.', 500));
    }

    // Strict HMAC-SHA256 Cryptographic Signature Verification
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      logger.error(`Signature verification failed for order ${razorpayOrderId}`);
      return next(new AppError('Payment verification failed. Invalid Razorpay signature.', 400));
    }

    // Instantly activate user subscription
    let planInfo = await Plan.findOne({ code: planCode, isActive: true });
    if (!planInfo) {
      const defaultPlans = {
        starter: { name: 'Starter', price: 999, messageLimit: 1000, agentLimit: 3, credits: 500 },
        pro: { name: 'Pro', price: 2999, messageLimit: 5000, agentLimit: 10, credits: 2000 },
        enterprise: { name: 'Enterprise', price: 9999, messageLimit: 50000, agentLimit: 50, credits: 10000 },
      };
      planInfo = defaultPlans[planCode] || { name: planCode, price: 999, messageLimit: 1000, agentLimit: 3, credits: 500 };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const user = await User.findById(req.user._id);
    if (user) {
      user.subscription.plan = planCode;
      user.subscription.status = 'active';
      user.subscription.currentPeriodStart = now;
      user.subscription.currentPeriodEnd = periodEnd;
      user.subscription.messageLimit = planInfo.messageLimit || 1000;
      user.subscription.agentLimit = planInfo.agentLimit || 3;
      user.subscription.credits = (user.subscription.credits || 0) + (planInfo.credits || 500);
      user.subscription.totalCredits = (user.subscription.totalCredits || 0) + (planInfo.credits || 500);
      await user.save();
    }

    // Update payment record
    const paymentDoc = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        status: 'captured',
        razorpayPaymentId,
        billingPeriod: { start: now, end: periodEnd }
      },
      { new: true }
    );

    // Process Sales Partner Commission if user was referred by a Sales Partner
    if (user && user.referredByPartner) {
      const paymentInRupees = planInfo ? planInfo.price : 0;
      await processPartnerCommission(user, paymentInRupees, planCode, paymentDoc?._id);
    }

    res.status(200).json({ status: 'success', message: 'Payment verified and plan activated successfully!', data: { user } });
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
    logger.info(`[RAZORPAY WEBHOOK] Received event ${event}`);

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

        // Process Sales Partner Commission if user was referred by a Sales Partner
        if (user.referredByPartner) {
          const paymentInRupees = (payment.amount || 0) / 100;
          await processPartnerCommission(user, paymentInRupees, payment.plan, payment._id);
        }

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
        logger.info(`Invoice generated at ${invoicePath}`);
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
          logger.warn(`User ${userId} subscription marked past_due due to payment failure.`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    logger.error('Webhook processing error:', err);
    res.status(500).send('Internal Server Error');
  }
};

// WA-006: Direct Upgrade/Proration
exports.upgradePlan = async (req, res, next) => {
  try {
    const planCode = req.body.plan || req.body.planId;
    if (!planCode) return next(new AppError('Plan is required', 400));

    let planInfo = await Plan.findOne({ code: planCode, isActive: true });
    if (!planInfo) {
      const defaultPlans = {
        starter: { name: 'Starter', price: 999, messageLimit: 1000, agentLimit: 3, credits: 500 },
        pro: { name: 'Pro', price: 2999, messageLimit: 5000, agentLimit: 10, credits: 2000 },
        enterprise: { name: 'Enterprise', price: 9999, messageLimit: 50000, agentLimit: 50, credits: 10000 },
      };
      planInfo = defaultPlans[planCode] || { name: planCode, price: 999, messageLimit: 1000, agentLimit: 3, credits: 500 };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('User not found', 44));

    user.subscription.plan = planCode;
    user.subscription.status = 'active';
    user.subscription.currentPeriodStart = now;
    user.subscription.currentPeriodEnd = periodEnd;
    user.subscription.messageLimit = planInfo.messageLimit || 1000;
    user.subscription.agentLimit = planInfo.agentLimit || 3;
    user.subscription.credits = (user.subscription.credits || 0) + (planInfo.credits || 500);
    user.subscription.totalCredits = (user.subscription.totalCredits || 0) + (planInfo.credits || 500);
    await user.save();

    const paymentObj = await Payment.create({
      user: req.user._id,
      razorpayOrderId: `DIRECT_UPGRADE_${Date.now()}`,
      razorpayPaymentId: `DIRECT_PAY_${Date.now()}`,
      plan: planCode,
      amount: (planInfo.price || 0) * 100,
      status: 'captured',
      billingPeriod: { start: now, end: periodEnd }
    });

    if (user && user.referredByPartner) {
      await processPartnerCommission(user, planInfo.price || 0, planCode, paymentObj._id);
    }

    res.status(200).json({
      status: 'success',
      message: `Plan upgraded to ${planInfo.name || planCode} successfully!`,
      data: { user }
    });
  } catch (err) {
    logger.error('Upgrade plan error:', err);
    next(err);
  }
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
