import React, { useEffect, useState } from 'react';
import { Check, Zap, Crown, Building2, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { billingAPI } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

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
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const { user, fetchUser } = useAuthStore();

  useEffect(() => {
    Promise.all([
      billingAPI.getPlans().then((r) => setPlans(r.data.data.plans)),
      billingAPI.getHistory().then((r) => setHistory(r.data.data.payments)),
      billingAPI.getCreditsHistory().then((r) => setCreditsHistory(r.data.data.transactions)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const handleUpgrade = async (planId) => {
    setPaying(planId);
    try {
      const orderRes = await billingAPI.createOrder(planId, gateway);
      const { orderId, amount, currency, keyId, planLabel, prefill, paymentSessionId, gateway: responseGateway, environment } = orderRes.data.data;

      if (responseGateway === 'cashfree') {
        if (!window.Cashfree) {
          const { loadScript } = await import('../utils/scriptLoader');
          await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js', 'cashfree-checkout-script');
        }

        const cashfree = window.Cashfree({
          mode: environment || "sandbox"
        });
        
        cashfree.checkout({
          paymentSessionId: paymentSessionId,
          redirectTarget: "_modal",
        }).then(async (result) => {
          if (result.error) {
            toast.error(result.error.message || 'Payment failed. Please try again.');
            setPaying(null);
          }
          if (result.redirect) {
            toast.success(`${planLabel} plan activated!`);
            await fetchUser();
            billingAPI.getHistory().then((r) => setHistory(r.data?.data?.payments || []));
            billingAPI.getCreditsHistory().then((r) => setCreditsHistory(r.data?.data?.transactions || []));
            setPaying(null);
          }
          if (result.paymentDetails) {
            // Cashfree sends payment message
            await fetchUser();
            billingAPI.getHistory().then((r) => setHistory(r.data?.data?.payments || []));
            billingAPI.getCreditsHistory().then((r) => setCreditsHistory(r.data?.data?.transactions || []));
            toast.success(`${planLabel} plan activated!`);
            setPaying(null);
          }
        });
      } else {
        if (!window.Razorpay) {
          const { loadScript } = await import('../utils/scriptLoader');
          await loadScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay-checkout-script');
        }

        const options = {
          key: keyId,
          amount,
          currency,
          name: 'Graxion',
          description: `${planLabel} Plan Subscription`,
          order_id: orderId,
          prefill,
          theme: { color: '#FF6A00' },
          handler: async (response) => {
            try {
              await billingAPI.verifyPayment({
                razorpayOrderId: orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                plan: planId,
                gateway: 'razorpay',
              });
              toast.success(`${planLabel} plan activated!`);
              await fetchUser();
              billingAPI.getHistory().then((r) => setHistory(r.data?.data?.payments || []));
              billingAPI.getCreditsHistory().then((r) => setCreditsHistory(r.data?.data?.transactions || []));
            } catch (err) {
              toast.error(err.response?.data?.message || 'Payment verification failed. Contact support.');
            } finally {
              setPaying(null);
            }
          },
          modal: { ondismiss: () => setPaying(null) },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          toast.error(resp.error?.description || 'Payment failed. Please try again.');
          setPaying(null);
        });
        rzp.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment gateway order');
      setPaying(null);
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
    <div className="space-y-8 animate-fade-in max-w-6xl">
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

      {currentPlan !== 'enterprise' && (
        <div className="flex justify-end gap-3 mt-4 items-center">
          <span className={`text-sm font-semibold ${'text-slate-600 dark:text-slate-400'}`}>Payment Gateway:</span>
          <select 
            value={gateway} 
            onChange={(e) => setGateway(e.target.value)} 
            className={`text-sm px-3 py-1.5 rounded-lg border outline-none font-medium ${'bg-white text-slate-900 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 focus:border-[#FF6A00]'}`}
          >
            <option value="razorpay">Razorpay</option>
            <option value="cashfree">Cashfree</option>
          </select>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] || Zap;
          const isCurrentPlan = currentPlan === plan.id;
          const isLastPlan = lastPlan === plan.id;
          const isBest = plan.id === 'pro';
          const bg = 'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10';

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
                <span className={`text-3xl font-bold ${'text-slate-900 dark:text-slate-100'}`}>₹{plan.amountInRupees}</span>
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
                onClick={() => (!isCurrentPlan || isExpired || isLastPlan) && handleUpgrade(plan.id)}
                disabled={(isCurrentPlan && !isExpired) || paying === plan.id}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${(isCurrentPlan && !isExpired) ? ('bg-gray-100 text-gray-500 cursor-default dark:bg-white/10 dark:text-slate-400 dark:cursor-default') : 'text-white'}`}
                style={(!isCurrentPlan || isExpired || isLastPlan) ? { background: '#FF6A00' } : undefined}
              >
                {paying === plan.id ? (
                  <><Loader2 size={15} className="animate-spin" /> Processing...</>
                ) : isCurrentPlan ? (
                  isExpired ? 'Renew Plan' : 'Active Plan'
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

      {currentPlan !== 'free' && (
        <div className={`rounded-2xl border p-5 ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
          <h3 className={`font-semibold mb-1 ${'text-slate-800 dark:text-slate-100'}`}>Cancel Subscription</h3>
          <p className={`text-sm mb-3 ${'text-slate-500 dark:text-slate-400'}`}>You will be moved to the free plan at the end of your billing period.</p>
          <button onClick={handleCancel} className="text-sm text-rose-500 border border-rose-300/50 px-4 py-2 rounded-xl transition-colors hover:bg-rose-500/10">Cancel Subscription</button>
        </div>
      )}

      {history.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
          <div className={`px-6 py-4 border-b ${'border-slate-100 dark:border-white/10'}`}>
            <h3 className={`font-semibold flex items-center gap-2 ${'text-slate-800 dark:text-slate-100'}`}><CreditCard size={16} /> Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={'bg-slate-50 dark:bg-white/5'}>
                <tr>{['Date', 'Plan', 'Amount', 'Status', 'Payment ID'].map((h) => <th key={h} className={`text-left text-xs font-medium px-6 py-3 ${'text-slate-500 dark:text-slate-400'}`}>{h}</th>)}</tr>
              </thead>
              <tbody className={'divide-y divide-slate-100 dark:divide-y dark:divide-white/10'}>
                {history.map((p) => (
                  <tr key={p._id} className={'hover:bg-slate-50 dark:hover:bg-white/5'}>
                    <td className={`px-6 py-3 text-sm ${'text-slate-600 dark:text-slate-300'}`}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className={`px-6 py-3 text-sm font-medium capitalize ${'text-slate-900 dark:text-slate-100'}`}>{p.plan}</td>
                    <td className={`px-6 py-3 text-sm ${'text-slate-600 dark:text-slate-300'}`}>₹{(p.amount / 100).toLocaleString()}</td>
                    <td className="px-6 py-3"><span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: '#FF6A0022', color: '#FF6A00' }}>{p.status}</span></td>
                    <td className={`px-6 py-3 text-xs font-mono ${'text-slate-400 dark:text-slate-500'}`}>{p.razorpayPaymentId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {creditsHistory && creditsHistory.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden ${'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10'}`}>
          <div className={`px-6 py-4 border-b flex items-center gap-2 ${'border-slate-100 dark:border-white/10'}`}>
            <Zap size={16} style={{ color: '#FF6A00' }} />
            <h3 className={`font-semibold ${'text-slate-800 dark:text-slate-100'}`}>Credits Transaction History</h3>
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
        </div>
      )}
    </div>
  );
}
