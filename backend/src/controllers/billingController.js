const Razorpay = require('razorpay');
const { Cashfree, CFEnvironment } = require('cashfree-pg');
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

    // Check if Cashfree is selected
    const gateway = req.body.gateway || 'razorpay';
    
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
    
    const amountInRupees = planInfo.price || 999;
    // Calculate tax
    const taxInfo = calculateTax(planInfo.price, customerStateCode);
    const amountInPaisa = Math.round(taxInfo.totalAmount * 100);

    if (gateway === 'cashfree') {
      if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        return next(new AppError('Cashfree payment gateway is not configured.', 500));
      }

      const env = process.env.CASHFREE_ENV === 'PRODUCTION' 
        ? CFEnvironment.PRODUCTION 
        : CFEnvironment.SANDBOX;
      
      const cashfree = new Cashfree(env, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);

      const request = {
        order_amount: taxInfo.totalAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: req.user._id.toString(),
          customer_email: req.user.email,
          customer_phone: "9999999999",
          customer_name: req.user.name || "Customer"
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/app/billing?order_id={order_id}`
        }
      };

      try {
        const response = await cashfree.PGCreateOrder(request);
        logger.info('Cashfree raw response data: ' + JSON.stringify(response.data));
        
        await Payment.create({
          user: req.user._id,
          cashfreeOrderId: response.data.order_id || response.data.cf_order_id,
          plan: planId,
          amount: amountInPaisa,
          paymentGateway: 'cashfree',
          status: 'created',
          taxDetails: taxInfo
        });

        return res.status(201).json({
          status: 'success',
          data: {
            orderId: response.data.order_id || response.data.cf_order_id,
            paymentSessionId: response.data.payment_session_id,
            amount: taxInfo.totalAmount,
            currency: 'INR',
            gateway: 'cashfree',
            environment: process.env.CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox',
            plan: planId,
            planLabel: planInfo.name
          }
        });
      } catch (err) {
        logger.error('Cashfree order creation error:', err.response?.data || err.message);
        return next(new AppError('Cashfree payment order creation failed.', 500));
      }
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return next(new AppError('Razorpay payment gateway is not configured. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env file.', 500));
    }

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
      paymentGateway: 'razorpay',
      status: 'created',
      taxDetails: taxInfo
    });

    res.status(201).json({
      status: 'success',
      data: {
        orderId: order.id,
        amount: amountInPaisa,
        currency: 'INR',
        gateway: 'razorpay',
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, cashfreeOrderId, plan, gateway } = req.body;
    const planCode = plan || req.body.planId;

    if (gateway === 'cashfree') {
      if (!cashfreeOrderId) {
        return next(new AppError('Missing required Cashfree order ID.', 400));
      }
      
      if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
        return next(new AppError('Cashfree payment gateway is not configured.', 500));
      }
      
      const env = process.env.CASHFREE_ENV === 'PRODUCTION' 
        ? CFEnvironment.PRODUCTION 
        : CFEnvironment.SANDBOX;
        
      const cashfree = new Cashfree(env, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);

      try {
        const response = await cashfree.PGOrderFetchPayments(cashfreeOrderId);
        const payments = response.data;
        const successfulPayment = payments.find(p => p.payment_status === 'SUCCESS');
        
        if (!successfulPayment) {
          logger.error(`Cashfree payment verification failed for order ${cashfreeOrderId}`);
          return next(new AppError('Payment verification failed. No successful payment found for this order.', 400));
        }

        const paymentRecord = await Payment.findOne({ cashfreeOrderId: cashfreeOrderId });
        if (paymentRecord && paymentRecord.status !== 'captured') {
          paymentRecord.status = 'captured';
          paymentRecord.cashfreePaymentId = successfulPayment.cf_payment_id.toString();
          await paymentRecord.save();
        }
      } catch (err) {
        logger.error('Cashfree payment verification error:', err.message);
        return next(new AppError('Cashfree payment verification failed.', 500));
      }
    } else {
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
      user.subscription.lastPlan = null; // Clear expiry state
      user.subscription.currentPeriodStart = now;
      user.subscription.currentPeriodEnd = periodEnd;
      user.subscription.messageLimit = planInfo.messageLimit || 1000;
      user.subscription.agentLimit = planInfo.agentLimit || 3;
      user.subscription.credits = (user.subscription.credits || 0) + (planInfo.credits || 500);
      user.subscription.totalCredits = (user.subscription.totalCredits || 0) + (planInfo.credits || 500);
      await user.save();

      // Reactivate all workspaces owned by the user
      const Organization = require('../models/Organization');
      await Organization.updateMany({ owner: user._id }, { isActive: true });
    }

    // Update payment record
    const paymentQuery = gateway === 'cashfree' ? { cashfreeOrderId } : { razorpayOrderId };
    const paymentUpdate = {
      status: 'captured',
      billingPeriod: { start: now, end: periodEnd }
    };
    if (gateway === 'cashfree') {
      paymentUpdate.cashfreePaymentId = req.body.cashfreePaymentId; // Optional if we already saved it above
    } else {
      paymentUpdate.razorpayPaymentId = razorpayPaymentId;
      paymentUpdate.razorpaySignature = razorpaySignature;
    }
    
    const paymentDoc = await Payment.findOneAndUpdate(
      paymentQuery,
      paymentUpdate,
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

    // Reactivate all workspaces owned by the user
    const Organization = require('../models/Organization');
    await Organization.updateMany({ owner: user._id }, { isActive: true });

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

// Cancel Subscription
exports.cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(new AppError('User not found', 404));

    if (!user.subscription || user.subscription.plan === 'free') {
      return next(new AppError('You do not have an active premium subscription to cancel.', 400));
    }

    user.subscription.status = 'cancelled';
    await user.save();

    // Send email confirmation
    try {
      const expiryDate = user.subscription.currentPeriodEnd 
        ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString()
        : 'the end of your billing cycle';

      await sendEmail({
        to: user.email,
        subject: 'Subscription Cancellation Confirmed',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #FF6A00;">Subscription Cancellation Confirmed</h2>
            <p>Hi ${user.name},</p>
            <p>We've received your request to cancel your subscription. Your plan will remain active with full access to all paid features until <strong>${expiryDate}</strong>.</p>
            <p>At the end of your billing period, your account will be downgraded to the <strong>Free Plan</strong>. Your workspaces will remain active under the Free Plan limits.</p>
            <p>If this was a mistake, you can always renew or upgrade your plan directly from settings.</p>
            <p style="color: #666; font-size: 12px;">Thanks,<br/>The Team</p>
          </div>
        `
      });
    } catch (emailErr) {
      logger.warn(`Failed to send cancellation confirmation email: ${emailErr.message}`);
    }

    res.status(200).json({
      status: 'success',
      message: 'Subscription cancelled successfully. You will be moved to the free plan at the end of your billing period.',
      data: { user }
    });
  } catch (err) {
    logger.error('Cancel subscription error:', err);
    next(err);
  }
};

exports.cashfreeWebhook = async (req, res, next) => {
  try {
    const rawBody = req.rawBody; // Make sure rawBody is populated, or you can verify signature
    // For Cashfree, we use x-webhook-signature
    const signature = req.headers['x-webhook-signature'];
    
    // Verify signature logic can be implemented here based on Cashfree docs
    // using crypto and process.env.CASHFREE_SECRET_KEY
    
    const event = req.body;
    
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = event.data.order.order_id;
      const paymentId = event.data.payment.cf_payment_id;
      
      const paymentRecord = await Payment.findOne({ cashfreeOrderId: orderId });
      if (paymentRecord && paymentRecord.status !== 'captured') {
        paymentRecord.status = 'captured';
        paymentRecord.cashfreePaymentId = paymentId.toString();
        await paymentRecord.save();
        
        // Find user and upgrade plan similarly to verification
        // ... (can extract plan upgrading logic if needed)
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    logger.error('Cashfree webhook error:', err);
    res.status(500).send('Webhook Error');
  }
};
