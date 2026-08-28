import React, { useEffect, useState } from 'react';
import { useCrmStore } from '../store/crmStore';
import { PlusIcon, ArrowUpTrayIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ImportModal from '../components/contacts/ImportModal';
import GroupManager from '../components/contacts/GroupManager';
import AddContactModal from '../components/contacts/AddContactModal';

export default function ContactsPage() {
  const { contacts, fetchContacts, isLoading } = useCrmStore();
  const [isImportOpen, setImportOpen] = useState(false);
  const [isGroupsOpen, setGroupsOpen] = useState(false);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Customers</h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage your audience and segments</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setGroupsOpen(true)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <UserGroupIcon className="w-5 h-5" /> Segments
          </button>
          <button onClick={() => setImportOpen(true)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <ArrowUpTrayIcon className="w-5 h-5" /> Import CSV
          </button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6A00] hover:bg-[#e05d00] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#FF6A00]/20">
            <PlusIcon className="w-5 h-5" /> Add Contact
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        <table className="w-full text-left">
          <thead className={`text-xs uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-400 border-b border-white/5' : 'bg-slate-50 text-slate-500 border-b border-slate-100'}`}>
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Phone</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Tags</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
            {isLoading ? (
              <tr><td colSpan="4" className={`p-8 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Loading contacts...</td></tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-12 text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <UserGroupIcon className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>No contacts yet</h3>
                  <p className={`text-sm mb-5 max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Import your contacts or add them manually to start building your audience.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setImportOpen(true)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      Import CSV
                    </button>
                    <button onClick={() => setAddOpen(true)} className="bg-[#FF6A00] hover:bg-[#e05d00] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#FF6A00]/20">
                      Add Contact
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact._id} className={`transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                  <td className={`p-4 font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{contact.name || 'Unknown'}</td>
                  <td className={`p-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{contact.phoneNumber}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${contact.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-1">
                    {contact.tags?.map(t => (
                      <span key={t} className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t}</span>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isImportOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {isGroupsOpen && <GroupManager onClose={() => setGroupsOpen(false)} />}
      {isAddOpen && <AddContactModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}
