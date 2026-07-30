import React, { useState, useEffect } from 'react';
import { UserPlusIcon, TrashIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store';
import { organizationAPI } from '../../services/api';

export default function TeamMembers() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'viewer' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const orgId = user?.currentOrganization;

  useEffect(() => {
    if (orgId) {
      fetchTeamData();
    }
  }, [orgId]);

  const fetchTeamData = async () => {
    try {
      setIsLoading(true);
      const [orgRes, logRes] = await Promise.all([
        organizationAPI.getOne(orgId),
        organizationAPI.getActivity(orgId).catch(() => ({ data: { data: { logs: [] } } }))
      ]);
      
      const org = orgRes.data.data.organization;
      
      const formattedMembers = org.members.map(m => ({
        id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        status: m.user.isActive ? 'active' : 'invited'
      }));
      
      setMembers(formattedMembers);
      setAuditLogs(logRes.data.data.logs || []);
    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!newInvite.email) return toast.error('Email is required');
    try {
      const res = await organizationAPI.inviteMember(newInvite);
      if (res.data.data?.member) {
        setMembers([...members, res.data.data.member]);
      } else {
        // Fallback if the user wasn't registered yet and it only sent a mock email
        setMembers([...members, { id: Date.now(), name: 'Pending', email: newInvite.email, role: newInvite.role, status: 'invited' }]);
      }
      toast.success('Invitation sent');
      setIsInviteOpen(false);
      setNewInvite({ email: '', role: 'viewer' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    }
  };
  
  const handleRemove = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      await organizationAPI.removeMember(orgId, userId);
      setMembers(members.filter(m => m.id !== userId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleExport = async () => {
    try {
      await organizationAPI.exportData(orgId);
      toast.success('Export started. You will receive an email shortly.');
    } catch (err) {
      toast.error('Failed to request export');
    }
  };

  return (
    <div className="space-y-8">
      {/* Team Members Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Team Members</h2>
            <p className="text-sm text-gray-400 mt-1">Manage who has access to this workspace</p>
          </div>
          <button onClick={() => setIsInviteOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5" /> Invite Member
          </button>
        </div>
        
        <table className="w-full text-left text-white">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-300">User</th>
              <th className="p-4 font-medium text-gray-300">Role</th>
              <th className="p-4 font-medium text-gray-300">Status</th>
              <th className="p-4 font-medium text-gray-300 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-400">Loading...</td>
              </tr>
            ) : members.map(member => (
              <tr key={member.id} className="hover:bg-gray-800/30 transition">
                <td className="p-4">
                  <div className="font-semibold">{member.name} {member.id === user?._id && '(You)'}</div>
                  <div className="text-xs text-gray-400">{member.email}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs capitalize ${member.role === 'owner' ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-300'}`}>
                    {member.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${member.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {member.status}
                  </span>
                </td>
                <td className="p-4">
                  {member.role !== 'owner' && member.id !== user?._id && (
                    <button onClick={() => handleRemove(member.id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded transition">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activity Logs & Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-blue-400"/> Activity Audit Log</h2>
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity.</p>
            ) : (
              auditLogs.map((log, index) => (
                <div key={index} className="border-l-2 border-blue-500 pl-4 py-1">
                  <p className="text-sm font-semibold">{log.action}</p>
                  <p className="text-xs text-gray-400">by {log.user} • {new Date(log.timestamp).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowDownTrayIcon className="w-5 h-5 text-green-400"/> Data Export</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            As the workspace owner, you can export all your contacts, message histories, flows, and templates into a unified JSON/CSV bundle.
          </p>
          <button onClick={handleExport} className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-semibold flex justify-center items-center gap-2 border border-gray-700">
            <ArrowDownTrayIcon className="w-5 h-5" /> Request Data Export
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-6">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({...newInvite, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                  value={newInvite.role}
                  onChange={(e) => setNewInvite({...newInvite, role: e.target.value})}
                >
                  <option value="admin">Admin (Full Access)</option>
                  <option value="editor">Editor (Can edit flows/campaigns)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancel</button>
              <button onClick={handleInvite} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
