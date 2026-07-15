import React, { useState, useEffect } from 'react';
import { UserPlusIcon, TrashIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TeamMembers() {
  const [members, setMembers] = useState([
    { id: 1, name: 'You', email: 'you@example.com', role: 'owner', status: 'active' },
    { id: 2, name: 'Alice Admin', email: 'alice@example.com', role: 'admin', status: 'active' },
    { id: 3, name: 'Jane Doe', email: 'jane@example.com', role: 'editor', status: 'invited' },
  ]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'viewer' });
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    // In production, fetch members and logs via API
    setAuditLogs([
      { id: 1, action: 'FLOW_PUBLISHED', user: 'Jane Doe', timestamp: '1 hour ago' },
      { id: 2, action: 'BROADCAST_SENT', user: 'You', timestamp: '3 hours ago' }
    ]);
  }, []);

  const handleInvite = () => {
    if (!newInvite.email) return toast.error('Email is required');
    setMembers([...members, { id: Date.now(), name: 'Pending', email: newInvite.email, role: newInvite.role, status: 'invited' }]);
    toast.success('Invitation sent');
    setIsInviteOpen(false);
    setNewInvite({ email: '', role: 'viewer' });
  };

  const handleExport = () => {
    toast.success('Export started. You will receive an email shortly.');
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
            {members.map(member => (
              <tr key={member.id} className="hover:bg-gray-800/30 transition">
                <td className="p-4">
                  <div className="font-semibold">{member.name}</div>
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
                  {member.role !== 'owner' && (
                    <button className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded transition">
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
            {auditLogs.map(log => (
              <div key={log.id} className="border-l-2 border-blue-500 pl-4 py-1">
                <p className="text-sm font-semibold">{log.action}</p>
                <p className="text-xs text-gray-400">by {log.user} • {log.timestamp}</p>
              </div>
            ))}
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
