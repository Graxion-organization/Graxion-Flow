import React, { useEffect, useState } from 'react';
import { Check, Zap, Crown, Building2, Loader2, CreditCard, AlertCircle, Send, Lock, ShieldCheck, Smartphone, Landmark, Wallet, CheckCircle } from 'lucide-react';
import api, { billingAPI } from '../services/api';
import { useAuthStore, useBrandingStore } from '../store';
import toast from 'react-hot-toast';
import CustomQuoteModal from '../components/dashboard/CustomQuoteModal';

const PLAN_ICONS = { starter: Zap, pro: Crown, enterprise: Building2 };
const PLAN_FEATURES = {
  starter: ['1,000 messages/month', '3 AI agents', 'OpenAI + Claude support', 'Basic analytics', 'Email support'],
  pro: ['5,000 messages/month', '10 AI agents', 'All AI models', 'Advanced analytics', 'Priority support', 'Business hours config'],
  enterprise: ['50,000 messages/month', '50 AI agents', 'All features', 'Custom analytics', 'Dedicated support', 'SLA guarantee'],
};

export default function BillingPage() {
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [creditsHistory, setCreditsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [gateway, setGateway] = useState('razorpay');
  const [numberOfOrgs, setNumberOfOrgs] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [creditsPage, setCreditsPage] = useState(1);
  const [creditsTotal, setCreditsTotal] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [isCustomQuoteModalOpen, setIsCustomQuoteModalOpen] = useState(false);
  const [customCheckoutPlan, setCustomCheckoutPlan] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ card: '', expiry: '', cvc: '', name: '', upiId: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showOTP, setShowOTP] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user, fetchUser } = useAuthStore();
  const { branding } = useBrandingStore();
  const isRazorpayEnabled = branding?.razorpay_enabled !== false;
  const isCashfreeEnabled = branding?.cashfree_enabled !== false;

  useEffect(() => {
    if (user?.subscription?.orgLimit) {
      setNumberOfOrgs(user.subscription.orgLimit);
    }
  }, [user?.subscription?.orgLimit]);

  useEffect(() => {
    if (!isRazorpayEnabled && isCashfreeEnabled) {
      setGateway('cashfree');
    } else if (isRazorpayEnabled && !isCashfreeEnabled) {
      setGateway('razorpay');
    }
  }, [isRazorpayEnabled, isCashfreeEnabled]);

  useEffect(() => {
    Promise.all([
      billingAPI.getPlans().then((r) => setPlans(r.data.data.plans)),
      billingAPI.getHistory().then((r) => setHistory(r.data.data.payments)),
      billingAPI.getCreditsHistory({ page: 1, limit: 10 }).then((r) => {
        setCreditsHistory(r.data.data.transactions || []);
        setCreditsTotal(r.data.data.total || (r.data.data.transactions?.length || 0));
      }),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const loadMoreCredits = () => {
    const nextPage = creditsPage + 1;
    setLoadingCredits(true);
    billingAPI.getCreditsHistory({ page: nextPage, limit: 10 }).then((r) => {
      setCreditsHistory(prev => [...prev, ...(r.data.data.transactions || [])]);
      setCreditsPage(nextPage);
      setCreditsTotal(r.data.data.total || 0);
    }).finally(() => setLoadingCredits(false));
  };

  const handleUpgrade = async (planId) => {
    /* 
    // OLD PAYMENT GATEWAY LOGIC (Razorpay / Cashfree) COMMENTED OUT
    if (!isRazorpayEnabled && !isCashfreeEnabled) {
      toast.error('Payments are currently disabled.');
      return;
    }

    setPaying(planId);
    try {
      const orderRes = await billingAPI.createOrder(planId, gateway, numberOfOrgs);
      // ... gateway loading ...
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment gateway order');
      setPaying(null);
    }
    */

    // NEW CUSTOM PREMIUM CHECKOUT LOGIC
    setCustomCheckoutPlan(planId);
  };

  const handleCustomPaymentSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (paymentMethod === 'card') {
      if (!checkoutForm.card || !checkoutForm.expiry || !checkoutForm.cvc || !checkoutForm.name) {
        toast.error('Please fill all card details securely.');
        return;
      }
    }

    setProcessing(true);
    try {
      // 1. Create Real Order on Backend
      const orderRes = await billingAPI.createOrder(customCheckoutPlan, gateway, numberOfOrgs);
      const { orderId, amount, currency, keyId, planLabel, prefill } = orderRes.data.data;

      // 2. Load Razorpay Custom SDK
      if (!window.Razorpay) {
        const { loadScript } = await import('../utils/scriptLoader');
        await loadScript('https://checkout.razorpay.com/v1/razorpay.js', 'razorpay-custom-script');
      }

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: orderId,
        amount,
        currency,
        name: 'Graxion Pay',
        description: `${planLabel} Subscription`,
        prefill,
        theme: { color: '#FF6A00' }
      });

      rzp.on('payment.success', async (response) => {
        try {
          await billingAPI.verifyPayment({
            razorpayOrderId: orderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            plan: customCheckoutPlan,
            gateway: 'razorpay',
          });
          toast.success(`${planLabel} plan activated successfully!`);
          setCustomCheckoutPlan(null);
          setCheckoutForm({ card: '', expiry: '', cvc: '', name: '', upiId: '' });
          await fetchUser();
          billingAPI.getHistory().then((r) => setHistory(r.data?.data?.payments || []));
          billingAPI.getCreditsHistory().then((r) => setCreditsHistory(r.data?.data?.transactions || []));
        } catch (err) {
          toast.error(err.response?.data?.message || 'Payment verification failed. Contact support.');
        } finally {
          setProcessing(false);
        }
      });

      rzp.on('payment.error', (resp) => {
        toast.error(resp.error?.description || 'Payment failed. Please try again.');
        setProcessing(false);
      });

      // 3. Dispatch Payment Data securely via Razorpay API
      let paymentData = {};
      if (paymentMethod === 'card') {
        const [month, year] = checkoutForm.expiry.split('/');
        paymentData = {
          method: 'card',
          'card[name]': checkoutForm.name,
          'card[number]': checkoutForm.card.replace(/\s/g, ''),
          'card[expiry_month]': month,
          'card[expiry_year]': year?.length === 2 ? `20${year}` : year,
          'card[cvv]': checkoutForm.cvc
        };
        rzp.createPayment(paymentData);
      } else if (paymentMethod === 'upi') {
        if (checkoutForm.upiId) {
          paymentData = {
            method: 'upi',
            upi: { vpa: checkoutForm.upiId }
          };
          rzp.createPayment(paymentData);
        } else {
          // If no UPI ID is entered, open standard Razorpay checkout to show the QR Scanner
          rzp.open();
        }
      } else {
        // Fallback for NetBanking/Wallets to standard Razorpay Checkout
        rzp.open();
      }
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel subscription? You will be moved to the free plan.')) return;
    try {
      await billingAPI.cancel();
      toast.success('Subscription cancelled');
      await fetchUser();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const currentPlan = user?.subscription?.plan || 'free';
  const isExpired = user?.subscription?.status === 'past_due';
  const lastPlan = user?.subscription?.lastPlan;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
      <div>
        <h1 className={`text-2xl font-extrabold ${'text-slate-900 dark:text-slate-100'}`}>Billing & Plans</h1>
        <p className={`${'text-slate-500 dark:text-slate-400'} text-sm mt-1`}>
          Current plan: <span className={`font-semibold capitalize ${'text-slate-800 dark:text-slate-200'}`}>{currentPlan}</span>
          {lastPlan && (
            <>
              {' · '}
              <span className="text-rose-500 font-medium">Last active plan: <span className="capitalize font-semibold">{lastPlan}</span> (Expired)</span>
            </>
          )}
          {user?.subscription?.currentPeriodEnd && currentPlan !== 'free' && !lastPlan && (
            <>
              {' · '}
              {isExpired ? (
                <span className="text-rose-500 font-semibold">Expired on {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</span>
              ) : (
                `Renews ${new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}`
              )}
            </>
          )}
        </p>
      </div>

      {currentPlan === 'free' && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'}`}>
          <AlertCircle size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm ${'text-amber-700 dark:text-amber-200'}`}>You are on the free plan with 100 messages/month. Upgrade to unlock more features.</p>
        </div>
      )}

      {/* Payment gateway selection hidden as per custom UI requirement
      {currentPlan !== 'enterprise' && (isRazorpayEnabled || isCashfreeEnabled) && (
        <div className="flex justify-end gap-3 mt-4 items-center">
          <span className={`text-sm font-semibold ${'text-slate-600 dark:text-slate-400'}`}>Payment Gateway:</span>
          {isRazorpayEnabled && isCashfreeEnabled ? (
            <select 
              value={gateway} 
              onChange={(e) => setGateway(e.target.value)} 
              className={`text-sm px-3 py-1.5 rounded-lg border outline-none font-medium ${'bg-white text-slate-900 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 focus:border-[#FF6A00]'}`}
            >
              <option value="razorpay">Razorpay</option>
              <option value="cashfree">Cashfree</option>
            </select>
          ) : (
            <span className={`text-sm font-medium px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 ${'text-slate-900 dark:text-slate-200'}`}>
              {isRazorpayEnabled ? 'Razorpay' : 'Cashfree'}
            </span>
          )}
        </div>
      )}
      */}
      
      {/* Payments Disabled message hidden
      {currentPlan !== 'enterprise' && !isRazorpayEnabled && !isCashfreeEnabled && (
        <div className="flex justify-end mt-4">
          <span className="text-sm font-semibold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-lg">Payments are currently disabled</span>
        </div>
      )}
      */}

      <div className={`mt-6 p-5 rounded-2xl border ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'} max-w-2xl mx-auto`}>
        <h3 className={`font-semibold mb-3 text-base ${'text-slate-800 dark:text-slate-100'}`}>How many organizations do you need?</h3>
        <div className="flex items-center gap-4">
          <input 
            type="range" 
            min="1" 
            max="21" 
            value={numberOfOrgs} 
            onChange={(e) => setNumberOfOrgs(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#FF6A00]"
          />
          <div className={`text-xl font-bold ${'text-slate-900 dark:text-white'} min-w-[4rem] text-right`}>
            {numberOfOrgs === 21 ? '20+' : numberOfOrgs}
          </div>
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>1 Org: Base Price</span>
          <span>2-4 Orgs: 15% Off</span>
          <span>5+ Orgs: 30% Off</span>
        </div>
      </div>

      {numberOfOrgs === 21 ? (
        <div className="mt-6 rounded-2xl border p-8 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-center max-w-2xl mx-auto">
          <Building2 size={40} className="mx-auto text-[#FF6A00] mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Custom Enterprise Solutions</h3>
          <p className="text-slate-300 mb-6 text-sm">Need more than 20 organizations? Tell us your requirements and our team will get back to you with custom volume pricing.</p>
          
          <button 
            onClick={() => setIsCustomQuoteModalOpen(true)}
            className="bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,106,0,0.3)] hover:shadow-[0_0_20px_rgba(255,106,0,0.4)] hover:-translate-y-0.5 mx-auto"
          >
            <Send size={18} /> Request Custom Quote
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          {plans.filter(p => p.id !== 'free').map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Zap;
          const isCurrentPlan = currentPlan === plan.id;
          const isLastPlan = lastPlan === plan.id;
          const isBest = plan.id === 'pro';
          const bg = 'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10';
          const currentOrgLimit = user?.subscription?.orgLimit || 1;
          const isUpdatingOrgs = isCurrentPlan && numberOfOrgs !== currentOrgLimit;
          const isDisabled = (!isCurrentPlan && paying === plan.id) || (isCurrentPlan && !isExpired && !isUpdatingOrgs) || (!isRazorpayEnabled && !isCashfreeEnabled);

          let pricePerOrg = plan.amountInRupees;
          if (numberOfOrgs >= 5) {
            pricePerOrg = Math.round(pricePerOrg * 0.7);
          } else if (numberOfOrgs >= 2) {
            pricePerOrg = Math.round(pricePerOrg * 0.85);
          }
          const dynamicPrice = pricePerOrg * numberOfOrgs;

          return (
            <div key={plan.id} className={`relative rounded-2xl border p-6 transition-all hover:shadow-xl ${bg} ${isCurrentPlan ? 'ring-2 ring-[#FF6A00]' : isLastPlan ? 'ring-2 ring-rose-500/40' : ''}`}>
              {isBest && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="bg-[#FF6A00] text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span></div>}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <span className={`text-white text-xs font-semibold px-3 py-1 rounded-full ${isExpired ? 'bg-rose-500 shadow-lg shadow-rose-500/20 animate-pulse' : 'bg-[#FF6A00]'}`}>
                    {isExpired ? 'Expired' : 'Current'}
                  </span>
                </div>
              )}
              {!isCurrentPlan && isLastPlan && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-rose-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg shadow-rose-500/20 animate-pulse">
                    Last Plan
                  </span>
                </div>
              )}

              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FF6A0022', color: '#FF6A00' }}>
                <Icon size={22} />
              </div>

              <h3 className={`text-lg font-bold capitalize ${'text-slate-900 dark:text-slate-100'}`}>{plan.label}</h3>
              <div className="mt-2 mb-4">
                <span className={`text-3xl font-bold ${'text-slate-900 dark:text-slate-100'}`}>₹{dynamicPrice.toLocaleString()}</span>
                <span className={`${'text-slate-500 dark:text-slate-400'} text-sm`}>/month</span>
              </div>

              <ul className="space-y-2.5 mb-6">
                {(PLAN_FEATURES[plan.id] || [`${plan.credits?.toLocaleString() || 0} Credits Included`, `${plan.messages?.toLocaleString() || 0} Messages / Month`, `${plan.agents || 0} Active AI Agents`, plan.description || 'Premium features']).map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${'text-slate-700 dark:text-slate-300'}`}>
                    <Check size={15} className="shrink-0" style={{ color: '#FF6A00' }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => (!isDisabled) && handleUpgrade(plan.id)}
                disabled={isDisabled}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${(isCurrentPlan && !isExpired && !isUpdatingOrgs) ? ('bg-gray-100 text-gray-500 cursor-default dark:bg-white/10 dark:text-slate-400 dark:cursor-default') : 'text-white'}`}
                style={(!isCurrentPlan || isExpired || isLastPlan || isUpdatingOrgs) ? { background: '#FF6A00' } : undefined}
              >
                {paying === plan.id ? (
                  <><Loader2 size={15} className="animate-spin" /> Processing...</>
                ) : isCurrentPlan ? (
                  isExpired ? 'Renew Plan' : isUpdatingOrgs ? 'Update Organizations' : 'Active Plan'
                ) : isLastPlan ? (
                  'Renew Plan'
                ) : (
                  `Upgrade to ${plan.label}`
                )}
              </button>
            </div>
          );
        })}
        </div>
      )}

      {currentPlan !== 'free' && (
        <div className={`rounded-2xl border p-5 ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
          <h3 className={`font-semibold mb-1 ${'text-slate-800 dark:text-slate-100'}`}>Cancel Subscription</h3>
          <p className={`text-sm mb-3 ${'text-slate-500 dark:text-slate-400'}`}>You will be moved to the free plan at the end of your billing period.</p>
          <button onClick={handleCancel} className="text-sm text-rose-500 border border-rose-300/50 px-4 py-2 rounded-xl transition-colors hover:bg-rose-500/10">Cancel Subscription</button>
        </div>
      )}

      {history.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between ${'border-slate-100 dark:border-white/10'}`}>
            <h3 className={`font-semibold flex items-center gap-2 ${'text-slate-800 dark:text-slate-100'}`}><CreditCard size={16} /> Payment History</h3>
            {history.length > 3 && (
              <button 
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FF6A00]/10 text-[#FF6A00] hover:bg-[#FF6A00]/20 transition-colors"
              >
                {showAllHistory ? 'Show Less' : `View All (${history.length})`}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={'bg-slate-50 dark:bg-white/5'}>
                <tr>{['Date', 'Plan', 'Amount', 'Status', 'Payment ID'].map((h) => <th key={h} className={`text-left text-xs font-medium px-6 py-3 ${'text-slate-500 dark:text-slate-400'}`}>{h}</th>)}</tr>
              </thead>
              <tbody className={'divide-y divide-slate-100 dark:divide-y dark:divide-white/10'}>
                {(showAllHistory ? history : history.slice(0, 3)).map((p) => (
                  <tr key={p._id} className={'hover:bg-slate-50 dark:hover:bg-white/5'}>
                    <td className={`px-6 py-3 text-sm ${'text-slate-600 dark:text-slate-300'}`}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className={`px-6 py-3 text-sm font-medium capitalize ${'text-slate-900 dark:text-slate-100'}`}>{p.plan}</td>
                    <td className={`px-6 py-3 text-sm ${'text-slate-600 dark:text-slate-300'}`}>₹{(p.amount / 100).toLocaleString()}</td>
                    <td className="px-6 py-3"><span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: '#FF6A0022', color: '#FF6A00' }}>{p.status}</span></td>
                    <td className={`px-6 py-3 text-xs font-mono ${'text-slate-400 dark:text-slate-500'}`}>{p.razorpayPaymentId || p.cashfreePaymentId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creditsHistory && creditsHistory.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between ${'border-slate-100 dark:border-white/10'}`}>
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: '#FF6A00' }} />
              <h3 className={`font-semibold ${'text-slate-800 dark:text-slate-100'}`}>Credits Transaction History</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={'bg-slate-50 dark:bg-white/5'}>
                <tr>{['Date', 'Type', 'Amount', 'Description'].map((h) => <th key={h} className={`text-left text-xs font-medium px-6 py-3 ${'text-slate-500 dark:text-slate-400'}`}>{h}</th>)}</tr>
              </thead>
              <tbody className={'divide-y divide-slate-100 dark:divide-y dark:divide-white/10'}>
                {creditsHistory.map((t) => (
                  <tr key={t._id} className={'hover:bg-slate-50 dark:hover:bg-white/5'}>
                    <td className={`px-6 py-3 text-sm ${'text-slate-600 dark:text-slate-300'}`}>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3"><span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#FF6A0022', color: '#FF6A00' }}>{t.type === 'addition' ? 'Credit Added' : 'Credit Deducted'}</span></td>
                    <td className="px-6 py-3 text-sm font-semibold" style={{ color: t.type === 'addition' ? '#f59e0b' : '#ef4444' }}>{t.type === 'addition' ? '+' : '-'}{t.amount.toLocaleString()} Cr</td>
                    <td className={`px-6 py-3 text-sm ${'text-slate-700 dark:text-slate-200'}`}>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {creditsHistory.length < creditsTotal && (
            <div className={`p-4 border-t flex justify-center ${'border-slate-100 dark:border-white/10'}`}>
              <button
                onClick={loadMoreCredits}
                disabled={loadingCredits}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300'}`}
              >
                {loadingCredits ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
      
      {isCustomQuoteModalOpen && (
        <CustomQuoteModal 
          user={user} 
          onClose={() => setIsCustomQuoteModalOpen(false)} 
        />
      )}

      {/* Graxion Pay Fullscreen Modal */}
      {customCheckoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-xl bg-slate-900/60 animate-fade-in">
          <div className="w-full h-full md:h-auto md:max-w-4xl bg-white dark:bg-slate-900 md:border border-slate-200 dark:border-slate-700 md:rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Sidebar - Order Summary */}
            <div className="w-full md:w-2/5 bg-slate-50 dark:bg-slate-800/80 p-8 flex flex-col justify-between border-r border-slate-200 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A00] to-rose-500 flex items-center justify-center text-white font-bold text-lg">G</div>
                  <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Graxion <span className="font-light text-slate-500">Pay</span></span>
                </div>
                
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300 capitalize font-medium">{customCheckoutPlan} Plan</span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      ₹{plans.find(p => p.id === customCheckoutPlan)?.amountInRupees?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Organizations (x{numberOfOrgs})</span>
                    <span className="text-slate-900 dark:text-white font-semibold">
                      {numberOfOrgs > 1 ? 'Applied' : '-'}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-slate-900 dark:text-white font-bold text-lg">Total Amount</span>
                    <span className="text-[#FF6A00] font-extrabold text-2xl">
                      ₹{(() => {
                         const p = plans.find(p => p.id === customCheckoutPlan);
                         let price = p?.amountInRupees || 0;
                         if (numberOfOrgs >= 5) price = Math.round(price * 0.7);
                         else if (numberOfOrgs >= 2) price = Math.round(price * 0.85);
                         return (price * numberOfOrgs).toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg">
                  <ShieldCheck size={16} /> 256-bit SSL Encrypted Transaction
                </div>
                <div className="text-xs text-slate-500 text-center">Powered by Graxion Secure Checkout</div>
              </div>
            </div>
            
            {/* Right Side - Payment Methods & Form */}
            <div className="w-full md:w-3/5 p-8 flex flex-col relative bg-white dark:bg-slate-900 overflow-y-auto">
              <button 
                onClick={() => { setCustomCheckoutPlan(null); setShowOTP(false); }}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors z-10"
              >
                ✕
              </button>
              
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Select Payment Method</h2>
              
              {/* Payment Method Tabs */}
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: 'card', icon: CreditCard, label: 'Card' },
                  { id: 'upi', icon: Smartphone, label: 'UPI' },
                  { id: 'netbanking', icon: Landmark, label: 'Net Banking' },
                  { id: 'wallet', icon: Wallet, label: 'Wallets' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${paymentMethod === method.id ? 'bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    <method.icon size={16} className={paymentMethod === method.id ? 'text-[#FF6A00]' : 'text-slate-400'} />
                    {method.label}
                  </button>
                ))}
              </div>
              
              <form onSubmit={handleCustomPaymentSubmit} className="flex-1 flex flex-col">
                <div className="flex-1 space-y-5">
                  
                  {/* CARD FORM */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-5 animate-fade-in">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="0000 0000 0000 0000"
                            className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#FF6A00] outline-none transition-all text-sm font-medium text-slate-900 dark:text-white shadow-sm"
                            value={checkoutForm.card}
                            onChange={(e) => setCheckoutForm({...checkoutForm, card: e.target.value})}
                          />
                          <CreditCard className="absolute left-3 top-3.5 text-slate-400" size={18} />
                          <div className="absolute right-3 top-3.5 flex gap-1">
                            <div className="w-6 h-4 bg-blue-500 rounded-sm opacity-50"></div>
                            <div className="w-6 h-4 bg-[#FF6A00] rounded-sm opacity-50"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Expiry</label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#FF6A00] outline-none transition-all text-sm font-medium text-slate-900 dark:text-white shadow-sm"
                            value={checkoutForm.expiry}
                            onChange={(e) => setCheckoutForm({...checkoutForm, expiry: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">CVV</label>
                          <div className="relative">
                            <input
                              type="password"
                              required
                              maxLength="4"
                              placeholder="•••"
                              className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#FF6A00] outline-none transition-all text-sm font-medium text-slate-900 dark:text-white shadow-sm tracking-widest"
                              value={checkoutForm.cvc}
                              onChange={(e) => setCheckoutForm({...checkoutForm, cvc: e.target.value})}
                            />
                            <Lock className="absolute right-3 top-3.5 text-slate-400" size={16} />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Name on Card</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#FF6A00] outline-none transition-all text-sm font-medium text-slate-900 dark:text-white shadow-sm"
                          value={checkoutForm.name}
                          onChange={(e) => setCheckoutForm({...checkoutForm, name: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {/* UPI FORM */}
                  {paymentMethod === 'upi' && (
                    <div className="space-y-6 animate-fade-in py-4 flex flex-col items-center">
                      <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-[#FF6A00] transition-colors" onClick={(e) => { e.preventDefault(); document.getElementById('pay-btn').click(); }}>
                         {/* Mock QR Code Pattern - Click to open Real Scanner */}
                         <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300">
                           <div className="text-[#FF6A00] text-xs text-center font-bold px-2">Click to open QR Scanner</div>
                         </div>
                      </div>
                      <div className="text-center w-full">
                        <span className="text-sm text-slate-500 font-medium">OR Enter UPI ID</span>
                        <div className="mt-3 relative max-w-sm mx-auto">
                            <input
                            type="text"
                            placeholder="username@bank"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#FF6A00] outline-none transition-all text-sm font-medium text-slate-900 dark:text-white shadow-sm"
                            value={checkoutForm.upiId || ''}
                            onChange={(e) => setCheckoutForm({...checkoutForm, upiId: e.target.value})}
                          />
                          <Smartphone className="absolute left-3 top-3.5 text-[#FF6A00]" size={18} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NETBANKING FORM */}
                  {paymentMethod === 'netbanking' && (
                    <div className="animate-fade-in h-full flex flex-col justify-center text-center py-4">
                        <Landmark size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 text-sm mb-6">Select your bank to proceed to their secure login portal.</p>
                        <div className="grid grid-cols-2 gap-3">
                          {['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'].map(bank => (
                            <div key={bank} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#FF6A00] hover:bg-[#FF6A00]/5 transition-all text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                              {bank}
                            </div>
                          ))}
                        </div>
                    </div>
                  )}

                  {/* WALLET FORM */}
                  {paymentMethod === 'wallet' && (
                    <div className="animate-fade-in h-full flex flex-col justify-center text-center py-4">
                        <Wallet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                        <p className="text-slate-500 text-sm mb-6">Link your wallet for 1-click checkout.</p>
                        <div className="space-y-3">
                          {['PayTM', 'PhonePe', 'Amazon Pay'].map(wallet => (
                            <div key={wallet} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#FF6A00] hover:bg-[#FF6A00]/5 transition-all flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                              <span>{wallet}</span>
                              <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">Link</span>
                            </div>
                          ))}
                        </div>
                    </div>
                  )}

                </div>
                
                <button
                  id="pay-btn"
                  type="submit"
                  disabled={processing}
                  className="mt-8 w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-[#FF6A00] to-rose-500 text-white shadow-lg hover:shadow-[0_10px_25px_rgba(255,106,0,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 size={20} className="animate-spin" /> : `Pay ₹${(() => {
                      const p = plans.find(p => p.id === customCheckoutPlan);
                      let price = p?.amountInRupees || 0;
                      if (numberOfOrgs >= 5) price = Math.round(price * 0.7);
                      else if (numberOfOrgs >= 2) price = Math.round(price * 0.85);
                      return (price * numberOfOrgs).toLocaleString();
                  })()} Securely`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
