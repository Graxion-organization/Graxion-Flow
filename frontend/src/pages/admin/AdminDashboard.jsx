import React, { useState, useEffect } from "react";
import { 
  Users, 
  MessageSquare, 
  Bot, 
  Zap, 
  TrendingUp, 
  Smartphone,
  Send,
  Instagram,
  BarChart3
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-3xl font-bold mt-1">{value}</p>
  </div>
);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats?.overview.users.total} 
          icon={Users} 
          color="blue" 
          trend={12} 
        />
        <StatCard 
          title="Total Messages" 
          value={stats?.overview.messages.total.toLocaleString()} 
          icon={MessageSquare} 
          color="emerald" 
          trend={8} 
        />
        <StatCard 
          title="Active Agents" 
          value={stats?.overview.agents} 
          icon={Bot} 
          color="purple" 
          trend={5} 
        />
        <StatCard 
          title="Human Handoffs" 
          value={stats?.overview.activeHandoffs} 
          icon={Zap} 
          color="orange" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Platform Distribution */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Platform Distribution
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">WhatsApp</span>
                  <span className="text-gray-400">{stats?.overview.accounts.whatsapp} Accounts</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${(stats?.overview.accounts.whatsapp / stats?.overview.accounts.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <Send className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Telegram</span>
                  <span className="text-gray-400">{stats?.overview.accounts.telegram} Accounts</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${(stats?.overview.accounts.telegram / stats?.overview.accounts.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-pink-500/10 text-pink-500">
                <Instagram className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Instagram</span>
                  <span className="text-gray-400">{stats?.overview.accounts.instagram} Accounts</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 rounded-full" 
                    style={{ width: `${(stats?.overview.accounts.instagram / stats?.overview.accounts.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-bold mb-8">Subscriptions</h2>
          <div className="space-y-4">
            {Object.entries(stats?.plans || {}).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="capitalize font-medium text-gray-300">{plan}</span>
                <span className="text-xl font-bold text-emerald-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
