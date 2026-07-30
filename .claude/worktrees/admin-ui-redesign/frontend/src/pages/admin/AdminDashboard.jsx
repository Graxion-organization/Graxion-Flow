import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  MessageSquare, 
  Bot, 
  Zap, 
  TrendingUp, 
  Smartphone,
  Send,
  Instagram,
  BarChart3,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

const StatCard = ({ title, value, icon: Icon, color, trend, delay = 0 }) => {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/10', glow: 'shadow-blue-500/5' },
    emerald: { bg: 'bg-brand-500/10', text: 'text-brand-400', border: 'border-brand-500/10', glow: 'shadow-brand-500/5' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/10', glow: 'shadow-purple-500/5' },
    orange: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/10', glow: 'shadow-amber-500/5' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all duration-300 group`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
            trend > 0 ? 'bg-brand-500/10 text-brand-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            <ArrowUpRight className="w-3 h-3" />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <h3 className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold mt-1 text-white">{value ?? '—'}</p>
    </motion.div>
  );
};

const PlatformBar = ({ name, icon: Icon, count, total, color, delay = 0 }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3"
    >
      <div className={`p-2.5 rounded-xl ${color.bg} ${color.text} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1.5">
          <span className="font-medium text-sm text-white">{name}</span>
          <span className="text-gray-500 text-xs">{count} accounts</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, delay: delay + 0.3 }}
            className={`h-full rounded-full ${color.bar}`}
          />
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch admin stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500/30 border-t-brand-500" />
          <span className="text-gray-500 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.overview.users.total} icon={Users} color="blue" trend={12} delay={0} />
        <StatCard title="Total Messages" value={stats?.overview.messages.total?.toLocaleString()} icon={MessageSquare} color="emerald" trend={8} delay={0.05} />
        <StatCard title="Active Agents" value={stats?.overview.agents} icon={Bot} color="purple" trend={5} delay={0.1} />
        <StatCard title="Human Handoffs" value={stats?.overview.activeHandoffs} icon={Zap} color="orange" delay={0.15} />
      </div>

      {/* Sales Partners Quick Action */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-gradient-to-r from-brand-500/[0.08] via-white/[0.02] to-white/[0.02] border border-brand-500/10 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Sales Partners
              <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 text-[9px] font-bold rounded-full uppercase">Active</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage affiliates, view referred clients, and audit commissions.</p>
          </div>
        </div>
        <Link 
          to="/admin/sales-partners"
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-glow-sm hover:shadow-glow shrink-0"
        >
          Open <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

      {/* Platform Distribution + Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Platform Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-400" />
              Platform Distribution
            </h2>
          </div>
          
          <div className="space-y-5">
            <PlatformBar
              name="WhatsApp" icon={Smartphone} count={stats?.overview.accounts.whatsapp || 0} total={stats?.overview.accounts.total || 1}
              color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: 'bg-emerald-500' }} delay={0}
            />
            <PlatformBar
              name="Telegram" icon={Send} count={stats?.overview.accounts.telegram || 0} total={stats?.overview.accounts.total || 1}
              color={{ bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' }} delay={0.1}
            />
            <PlatformBar
              name="Instagram" icon={Instagram} count={stats?.overview.accounts.instagram || 0} total={stats?.overview.accounts.total || 1}
              color={{ bg: 'bg-pink-500/10', text: 'text-pink-400', bar: 'bg-gradient-to-r from-pink-500 to-purple-500' }} delay={0.2}
            />
          </div>
        </motion.div>

        {/* Subscriptions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
        >
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-400" />
            Subscriptions
          </h2>
          <div className="space-y-2.5">
            {Object.entries(stats?.plans || {}).map(([plan, count], i) => (
              <motion.div
                key={plan}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                className="flex justify-between items-center p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <span className="capitalize font-medium text-sm text-gray-300">{plan}</span>
                <span className="text-lg font-bold text-brand-400">{count}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
