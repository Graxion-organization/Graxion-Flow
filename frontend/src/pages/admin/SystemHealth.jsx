import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  Server,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Users,
  Terminal,
  Unplug,
  Zap
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

const HealthCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${color}-500/5 rounded-full blur-2xl group-hover:bg-${color}-500/10 transition-all`}></div>
    <div className="flex items-center gap-4 mb-2">
      <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
    </div>
  </div>
);

const SystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentErrors, setRecentErrors] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchData();
    setupSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const setupSocket = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socketUrl = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const socket = io(socketUrl, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on("api_error", (error) => {
      setRecentErrors(prev => [error, ...prev].slice(0, 20));
      toast.error(`API Error: ${error.method} ${error.path}`, {
        icon: <AlertCircle className="text-rose-500" />,
        duration: 5000
      });
    });

    socket.on("system_health_update", (data) => {
      setActiveUsers(data.activeUsers);
      setHealth(prev => ({
        ...prev,
        monitor: {
          ...prev?.monitor,
          ...data
        }
      }));
    });
  };

  const fetchData = async () => {
    try {
      const [healthRes, settingsRes] = await Promise.all([
        adminAPI.getHealth(),
        adminAPI.getSettings()
      ]);
      setHealth(healthRes.data.data);
      setSettings(settingsRes.data.data.settings);
      setRecentErrors(healthRes.data.data.monitor.recentErrors || []);
      setActiveUsers(healthRes.data.data.monitor.activeUsers || 0);
    } catch (error) {
      toast.error("Failed to fetch system data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSetting = async (key, currentValue) => {
    try {
      await adminAPI.updateSetting(key, !currentValue);
      setSettings(settings.map(s => s.key === key ? { ...s, value: !currentValue } : s));
      toast.success(`${key.replace(/_/g, ' ').toUpperCase()} updated`);
    } catch (error) {
      toast.error("Failed to update setting");
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "0m";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const isMaintenance = settings.find(s => s.key === 'maintenance_mode')?.value;

  return (
    <div className="space-y-8 pb-12">
      {/* Real-time Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Live System Monitor
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h2>
          <p className="text-gray-500 text-sm">Real-time health monitoring and service control</p>
        </div>
        <button 
          onClick={() => { setRefreshing(true); fetchData(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthCard 
          title="Active Users" 
          value={activeUsers} 
          icon={Users} 
          color="emerald" 
          subtitle="Unique (1m)"
        />
        <HealthCard 
          title="Avg Latency" 
          value={`${health?.monitor?.avgLatency?.whatsapp || 0}ms`} 
          icon={Activity} 
          color="blue" 
          subtitle="WhatsApp"
        />
        <HealthCard 
          title="Throughput" 
          value={health?.monitor?.requests || 0} 
          icon={Zap} 
          color="purple" 
          subtitle="Req/min"
        />
        <HealthCard 
          title="Uptime" 
          value={formatUptime(health?.uptime)} 
          icon={Clock} 
          color="orange" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Power className="w-5 h-5 text-emerald-500" />
              Service Control Center
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.map((setting) => (
                <div key={setting.key} className={`p-4 rounded-2xl border transition-all ${setting.value ? 'bg-white/5 border-white/5' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${setting.value ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {setting.key === 'maintenance_mode' ? <ShieldAlert className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold capitalize">{setting.key.replace(/_/g, ' ')}</h4>
                        <p className="text-[10px] text-gray-500">{setting.description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleSetting(setting.key, setting.value)}
                      className={`transition-colors ${setting.value ? 'text-emerald-500' : 'text-rose-500'}`}
                    >
                      {setting.value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Error Log */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-rose-500" />
              Live Error Log
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {recentErrors.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
                  <p>No errors recorded. System is stable.</p>
                </div>
              ) : (
                recentErrors.map((err, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-rose-500 text-white rounded font-bold uppercase">{err.method}</span>
                      <span className="font-mono text-gray-400">{err.path}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-rose-400 font-bold">HTTP {err.status}</span>
                      <span className="text-gray-500 text-[10px]">{new Date(err.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live Latency Dashboard */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Service Latency
            </h3>
            <div className="space-y-4">
              {Object.entries(health?.monitor?.avgLatency || {}).map(([service, ms]) => (
                <div key={service} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-gray-400">{service}</span>
                    <span className={`font-mono ${ms > 500 ? 'text-rose-500' : ms > 200 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {ms}ms
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${ms > 500 ? 'bg-rose-500' : ms > 200 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((ms / 1000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-5 h-5" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => toggleSetting('maintenance_mode', isMaintenance)}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isMaintenance ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-900/20'}`}
              >
                {isMaintenance ? <Power className="w-4 h-4" /> : <Unplug className="w-4 h-4" />}
                {isMaintenance ? 'Deactivate Maintenance' : 'Activate Maintenance'}
              </button>
              <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-all text-sm">
                Clear Error Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default SystemHealth;
