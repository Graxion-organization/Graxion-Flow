import React, { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Activity, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Key,
  Globe,
  Settings,
  DollarSign
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const AdminActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    fetchActivities();
  }, [page, filterAction]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: searchTerm || undefined,
        action: filterAction || undefined
      };
      const res = await adminAPI.getAdminActivities(params);
      setActivities(res.data.data.activities || []);
      setTotal(res.data.data.total || 0);
    } catch (err) {
      toast.error("Failed to fetch administrative activities");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchActivities();
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setPage(1);
    // Directly fetch with empty search
    setTimeout(() => {
      fetchActivities();
    }, 0);
  };

  // Maps action types to readable labels, colors and icons
  const getActionDetails = (action) => {
    switch (action) {
      case "approve_signup":
        return {
          label: "Approve Admin Enrollment",
          color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          icon: Shield
        };
      case "update_user":
        return {
          label: "Update User Record",
          color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
          icon: Globe
        };
      case "update_settings":
        return {
          label: "System Settings Modified",
          color: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          icon: Settings
        };
      case "refund_payment":
        return {
          label: "Refund Transaction Authorized",
          color: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
          icon: DollarSign
        };
      default:
        return {
          label: action ? action.replace(/_/g, " ").toUpperCase() : "ADMIN ACTION",
          color: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
          icon: Activity
        };
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-200">Admin Audit Trail</h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time security logs documenting administrative operations and modifications.
          </p>
        </div>
        
        <button
          onClick={fetchActivities}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:text-white transition-all"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh Logs
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-3 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Admin Email or Access Key..."
              className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter size={14} className="absolute left-3.5 top-3.5 text-gray-500" />
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="">All Action Types</option>
                <option value="approve_signup">Approve Admin Signup</option>
                <option value="update_user">Update User Record</option>
                <option value="update_settings">Modify System Settings</option>
                <option value="refund_payment">Refund Payment</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-semibold rounded-xl transition-colors shrink-0"
            >
              Search
            </button>

            {(searchTerm || filterAction) && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm transition-colors shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/10">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrator</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Operation Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-24"></div></td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="h-4 bg-white/10 rounded w-36"></div>
                        <div className="h-3 bg-white/10 rounded w-20"></div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-6 bg-white/10 rounded w-28"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-64"></div></td>
                    <td className="px-6 py-5"><div className="h-3 bg-white/10 rounded w-20"></div></td>
                  </tr>
                ))
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <History size={40} className="text-gray-600" />
                      <p className="font-semibold text-gray-300">No activity logs found</p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        Either no actions have been taken, or no logs match your specified filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((log) => {
                  const actionDetails = getActionDetails(log.action);
                  const ActionIcon = actionDetails.icon;
                  
                  return (
                    <tr key={log._id} className="hover:bg-white/[0.01] transition-colors border-transparent">
                      {/* Timestamp */}
                      <td className="px-6 py-5 text-sm text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-500" />
                          <span>{format(new Date(log.timestamp), "MMM dd, hh:mm a")}</span>
                        </div>
                      </td>

                      {/* Administrator info */}
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold text-gray-200 text-sm">{log.adminEmail || "Unknown Admin"}</p>
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-md font-mono font-semibold">
                            <Key size={8} />
                            {log.adminAccessKey || "LEGACY-ADMIN"}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${actionDetails.color}`}>
                          <ActionIcon size={10} className="shrink-0" />
                          {actionDetails.label}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="px-6 py-5">
                        <p className="text-sm text-gray-300 font-medium max-w-md break-words leading-relaxed">
                          {log.details || "No details provided"}
                        </p>
                      </td>

                      {/* IP / User Agent */}
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="text-xs font-mono text-gray-500 font-semibold bg-black/25 px-1.5 py-0.5 rounded border border-white/5 inline-block">
                            IP: {log.ipAddress || "127.0.0.1"}
                          </div>
                          <p className="text-[10px] text-gray-600 max-w-[120px] truncate" title={log.userAgent}>
                            {log.userAgent || "Unknown Browser"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > limit && (
          <div className="p-5 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-200">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-semibold text-gray-200">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-semibold text-gray-200">{total}</span> activity records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-white/10 hover:border-white/20 bg-white/5 text-gray-300 disabled:opacity-30 disabled:hover:border-white/10 disabled:pointer-events-none rounded-xl text-xs transition-colors"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-white/10 hover:border-white/20 bg-white/5 text-gray-300 disabled:opacity-30 disabled:hover:border-white/10 disabled:pointer-events-none rounded-xl text-xs transition-colors"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminActivities;
