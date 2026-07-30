import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  User, 
  Clock, 
  CreditCard,
  AlertCircle
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const Payments = () => {
  const navigate = useNavigate();
  
  // Data States
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalTransactions: 0,
    successCount: 0,
    failedCount: 0,
    refundedCount: 0,
    pendingCount: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState({
    preset: "all", // all, today, yesterday, 7days, 30days, custom
    startDate: "",
    endDate: ""
  });
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, [page, selectedPlan, selectedStatus, dateRange.preset, dateRange.startDate, dateRange.endDate]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        plan: selectedPlan,
        status: selectedStatus,
        search: searchTerm
      };

      // Add Date parameters based on preset
      const now = new Date();
      if (dateRange.preset === "today") {
        const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        params.startDate = start;
        params.endDate = new Date().toISOString();
      } else if (dateRange.preset === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
        const end = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
        params.startDate = start;
        params.endDate = end;
      } else if (dateRange.preset === "7days") {
        const past = new Date();
        past.setDate(past.getDate() - 7);
        params.startDate = past.toISOString();
        params.endDate = new Date().toISOString();
      } else if (dateRange.preset === "30days") {
        const past = new Date();
        past.setDate(past.getDate() - 30);
        params.startDate = past.toISOString();
        params.endDate = new Date().toISOString();
      } else if (dateRange.preset === "custom" && dateRange.startDate && dateRange.endDate) {
        params.startDate = new Date(dateRange.startDate).toISOString();
        params.endDate = new Date(dateRange.endDate).toISOString();
      }

      const response = await adminAPI.getPayments(params);
      const { payments: list, stats: metrics, total: count } = response.data.data;
      setPayments(list || []);
      setStats(metrics || {
        totalEarnings: 0,
        totalTransactions: 0,
        successCount: 0,
        failedCount: 0,
        refundedCount: 0,
        pendingCount: 0,
        successRate: 0
      });
      setTotal(count || 0);
    } catch (error) {
      toast.error("Failed to load payments history");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchPayments();
    }
  };

  const handlePresetDateChange = (preset) => {
    setPage(1);
    if (preset !== "custom") {
      setDateRange({ preset, startDate: "", endDate: "" });
    } else {
      setDateRange({ ...dateRange, preset });
    }
  };

  const handleRefund = async (paymentId) => {
    if (!window.confirm("WARNING: Are you sure you want to refund this payment? This will mark the transaction as refunded in our database, revert the user's SaaS plan back to the Free tier, deduct their plan credits, and email the customer confirmation.")) return;
    
    setActionLoading(true);
    try {
      const response = await adminAPI.refundPayment(paymentId);
      toast.success("Payment refunded and subscription revoked successfully!");
      setSelectedPayment(response.data.data.payment);
      
      // Update items in the list
      setPayments(payments.map(p => p._id === paymentId ? response.data.data.payment : p));
      fetchPayments(); // Refresh aggregate stats
    } catch (e) {
      // Error handled by api global interceptor
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    if (!window.confirm(`Are you sure you want to change this payment's status manually to ${newStatus.toUpperCase()}?`)) return;
    
    setActionLoading(true);
    try {
      const response = await adminAPI.updatePaymentStatus(paymentId, newStatus);
      toast.success(`Payment status updated to ${newStatus} successfully!`);
      setSelectedPayment(response.data.data.payment);
      
      // Update items in list
      setPayments(payments.map(p => p._id === paymentId ? response.data.data.payment : p));
      fetchPayments(); // Refresh aggregates
    } catch (e) {
      // Handled globally
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error("No payments found in current search query to export.");
      return;
    }
    
    // Header
    const headers = [
      "Payment ID",
      "User Name",
      "User Email",
      "Plan",
      "Amount (Rupees)",
      "Status",
      "Razorpay Order ID",
      "Razorpay Payment ID",
      "Billing Start",
      "Billing End",
      "Date Created"
    ];
    
    const rows = payments.map(p => [
      p._id,
      p.user?.name || "N/A",
      p.user?.email || "N/A",
      p.plan?.toUpperCase() || "N/A",
      p.amount / 100,
      p.status?.toUpperCase(),
      p.razorpayOrderId || "N/A",
      p.razorpayPaymentId || "N/A",
      p.billingPeriod?.start ? new Date(p.billingPeriod.start).toLocaleDateString() : "N/A",
      p.billingPeriod?.end ? new Date(p.billingPeriod.end).toLocaleDateString() : "N/A",
      new Date(p.createdAt).toLocaleString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `whatsapp_saas_payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payments CSV exported successfully!");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "captured":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <CheckCircle2 className="w-3 h-3" /> Captured
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            <AlertTriangle className="w-3 h-3" /> Refunded
          </span>
        );
      case "created":
      case "authorized":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-white/5">
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-8 text-white">
      {/* ─── Metrics Dashboard Overview ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric: Revenue */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-tl-full blur-xl" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Earnings</span>
              <h3 className="text-3xl font-black text-emerald-400">₹{stats.totalEarnings.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Success Rate: <strong className="text-white">{stats.successRate}%</strong></span>
          </div>
        </motion.div>

        {/* Metric: Successful */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-tl-full blur-xl" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Successful Orders</span>
              <h3 className="text-3xl font-black text-blue-400">{stats.successCount}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Across <strong className="text-white">{stats.totalTransactions}</strong> total checkout logs
          </p>
        </motion.div>

        {/* Metric: Refunded */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-500/5 rounded-tl-full blur-xl" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Refunded Payments</span>
              <h3 className="text-3xl font-black text-amber-400">{stats.refundedCount}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">Subscriptions revoked & returned</p>
        </motion.div>

        {/* Metric: Failed */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-rose-500/5 rounded-tl-full blur-xl" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Failed Checkout Attempts</span>
              <h3 className="text-3xl font-black text-rose-500">{stats.failedCount}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">Razorpay abandoned or declined logs</p>
        </motion.div>
      </div>

      {/* ─── Controls & Filters Panel ──────────────────────────── */}
      <div className="p-6 bg-white/[0.02] border border-white/10 rounded-[2rem] space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
          
          {/* Group 1: Search Inputs */}
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Email, Payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full pl-12 pr-16 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 transition-all text-white placeholder-gray-400"
            />
            <button 
              onClick={() => { setPage(1); fetchPayments(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              Apply
            </button>
          </div>

          {/* Group 2: Advanced Select Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Filter: Plan */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Plan:</span>
              <select 
                value={selectedPlan}
                onChange={(e) => { setSelectedPlan(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="all" className="bg-[#0f172a]">All Tiers</option>
                <option value="starter" className="bg-[#0f172a]">Starter</option>
                <option value="pro" className="bg-[#0f172a]">Pro Pack</option>
                <option value="enterprise" className="bg-[#0f172a]">Enterprise</option>
              </select>
            </div>

            {/* Filter: Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Status:</span>
              <select 
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="all" className="bg-[#0f172a]">All Statuses</option>
                <option value="captured" className="bg-[#0f172a]">Captured</option>
                <option value="failed" className="bg-[#0f172a]">Failed</option>
                <option value="refunded" className="bg-[#0f172a]">Refunded</option>
                <option value="created" className="bg-[#0f172a]">Created</option>
              </select>
            </div>

            {/* Date Preset Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium"><Calendar className="w-4 h-4 inline-block -mt-1 mr-1" /> Period:</span>
              <select 
                value={dateRange.preset}
                onChange={(e) => handlePresetDateChange(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="all" className="bg-[#0f172a]">All Time</option>
                <option value="today" className="bg-[#0f172a]">Today</option>
                <option value="yesterday" className="bg-[#0f172a]">Yesterday</option>
                <option value="7days" className="bg-[#0f172a]">Last 7 Days</option>
                <option value="30days" className="bg-[#0f172a]">Last 30 Days</option>
                <option value="custom" className="bg-[#0f172a]">Custom Range</option>
              </select>
            </div>
            
            {/* Export and Refresh */}
            <div className="flex items-center gap-2 ml-auto">
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all font-semibold text-xs"
                title="Download Filtered Data as Excel/CSV"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
              
              <button 
                onClick={fetchPayments}
                className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all"
                title="Refresh Payments Table"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker Container */}
        {dateRange.preset === "custom" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Start Date:</span>
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">End Date:</span>
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none"
              />
            </div>
            <button 
              onClick={() => { setPage(1); fetchPayments(); }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-all"
            >
              Apply Filter
            </button>
          </motion.div>
        )}
      </div>

      {/* ─── Payments Database Table ───────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Transaction User</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Plan</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Razorpay Identifiers</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Date / Time</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="mt-4 text-gray-400 text-sm">Loading checkout logs...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-gray-400">
                    No transactions matching the selected filters were found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-white/[0.01] transition-colors group">
                    {/* User Column with Cross-Link Jump */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => navigate(`/admin/users?userId=${payment.user?._id}`)}
                          className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-sm uppercase cursor-pointer hover:scale-105 transition-transform"
                          title="Jump to User Profile"
                        >
                          {payment.user?.name ? payment.user.name.charAt(0) : "?"}
                        </div>
                        <div>
                          <span 
                            onClick={() => navigate(`/admin/users?userId=${payment.user?._id}`)}
                            className="font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5"
                            title="Jump to User Profile"
                          >
                            {payment.user?.name || <span className="italic text-gray-500">Deleted User</span>}
                            {payment.user && <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </span>
                          <span className="block text-xs text-gray-400">{payment.user?.email || "N/A"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Plan Code */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase ${
                        payment.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500' :
                        payment.plan === 'pro' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {payment.plan}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-extrabold text-white text-base">
                      ₹{payment.amount / 100}
                    </td>

                    {/* Razorpay Order ID */}
                    <td className="px-6 py-4 text-xs font-mono text-gray-400 space-y-1">
                      <p><span className="text-gray-600">ORD:</span> {payment.razorpayOrderId || "N/A"}</p>
                      <p><span className="text-gray-600">PAY:</span> {payment.razorpayPaymentId || "N/A"}</p>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-xs text-gray-400">
                      <p className="font-semibold text-white">{new Date(payment.createdAt).toLocaleDateString()}</p>
                      <p className="text-gray-500">{new Date(payment.createdAt).toLocaleTimeString()}</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>

                    {/* Detail Trigger */}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedPayment(payment)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-all font-semibold text-xs"
                      >
                        Inspect Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer controls ────────────────────────── */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-sm text-gray-400">
          <div>
            Showing <strong className="text-white">{payments.length}</strong> of <strong className="text-white">{total}</strong> transactions
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
            >
              Previous
            </button>
            <span className="text-xs">Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── Glassmorphic Payment Inspection Modal ──────────────── */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPayment(null)}
              className="absolute inset-0 bg-[#030712]/85 backdrop-blur-md"
            />

            {/* Content Drawer dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-500/10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Payment Audit Details</h3>
                    <p className="text-xs text-gray-400">ID: {selectedPayment._id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPayment(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                
                {/* Section: Transaction User */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-sm uppercase">
                      {selectedPayment.user?.name ? selectedPayment.user.name.charAt(0) : "?"}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{selectedPayment.user?.name || "N/A"}</p>
                      <p className="text-xs text-gray-400">{selectedPayment.user?.email || "N/A"}</p>
                    </div>
                  </div>
                  
                  {selectedPayment.user && (
                    <button 
                      onClick={() => {
                        setSelectedPayment(null);
                        navigate(`/admin/users?userId=${selectedPayment.user._id}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl transition-all font-semibold text-xs"
                    >
                      <User className="w-3.5 h-3.5" /> Jump to Profile <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Amount Invoiced</span>
                    <p className="text-2xl font-black text-white mt-1">₹{selectedPayment.amount / 100}</p>
                    <span className="text-[10px] text-gray-400 capitalize">Currency: {selectedPayment.currency}</span>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Plan Allocated</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1 capitalize">{selectedPayment.plan}</p>
                    <span className="text-[10px] text-gray-400 capitalize">Type: {selectedPayment.type || "Subscription"}</span>
                  </div>
                </div>

                {/* Identifiers list */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Gateway Details (Razorpay)</h4>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-white/5 py-1.5">
                      <span className="text-gray-400">Order ID:</span>
                      <span className="font-mono text-gray-300 select-all">{selectedPayment.razorpayOrderId || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1.5">
                      <span className="text-gray-400">Payment ID:</span>
                      <span className="font-mono text-gray-300 select-all">{selectedPayment.razorpayPaymentId || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1.5">
                      <span className="text-gray-400">Subscription ID:</span>
                      <span className="font-mono text-gray-300 select-all">
                        {selectedPayment.razorpaySubscriptionId || (selectedPayment.type === 'one_time' ? "N/A (One-Time Checkout)" : "N/A (Direct Payment)")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-400">Signature Hash:</span>
                      <span className="font-mono text-gray-500 max-w-[280px] truncate select-all" title={selectedPayment.razorpaySignature}>{selectedPayment.razorpaySignature || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Billing Period timeline */}
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Transaction Timeline</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Checkout Started:</span>
                      <span className="text-gray-300">{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedPayment.billingPeriod?.start && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Billing Active:</span>
                        <span className="text-emerald-500 font-semibold">
                          {new Date(selectedPayment.billingPeriod.start).toLocaleDateString()} to {new Date(selectedPayment.billingPeriod.end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedPayment.metadata?.refundedAt && (
                      <div className="flex justify-between text-rose-500 font-bold border-t border-rose-500/10 pt-2">
                        <span>Payment Refunded:</span>
                        <span>{new Date(selectedPayment.metadata.refundedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Administrative Override Actions */}
                <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-3xl space-y-4">
                  <h4 className="text-xs font-extrabold uppercase text-rose-400 flex items-center gap-1.5 tracking-wider">
                    <AlertCircle className="w-4 h-4" /> Administrative Controls Override
                  </h4>
                  <p className="text-xs text-gray-400">Direct database actions. Modifying status or issuing refunds alters active subscription states and user credits balances.</p>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Action: Refund */}
                    {selectedPayment.status !== "refunded" && (
                      <button
                        onClick={() => handleRefund(selectedPayment._id)}
                        disabled={actionLoading}
                        className="flex-1 min-w-[150px] py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-950/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading ? "Processing..." : "Refund Payment & Revoke SaaS"}
                      </button>
                    )}

                    {/* Action: Manual status changes */}
                    <div className="flex-1 min-w-[180px] flex items-center gap-2">
                      <span className="text-xs text-gray-400">Set Status:</span>
                      <select
                        disabled={actionLoading}
                        value={selectedPayment.status}
                        onChange={(e) => handleStatusChange(selectedPayment._id, e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-rose-500/50"
                      >
                        <option value="created">Created</option>
                        <option value="authorized">Authorized</option>
                        <option value="captured">Captured</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Control */}
              <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all border border-white/5"
                >
                  Close Audit Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal stylesheet scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Payments;
