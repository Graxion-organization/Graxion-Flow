import React, { useEffect, useState } from 'react';
import { useCrmStore } from '../store/crmStore';
import { PlusIcon, ArrowUpTrayIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ImportModal from '../components/contacts/ImportModal';
import GroupManager from '../components/contacts/GroupManager';
import AddContactModal from '../components/contacts/AddContactModal';
import { Phone, Tag, CheckCircle2, XCircle } from 'lucide-react';

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
    <div className={`p-3 sm:p-6 max-w-7xl mx-auto pb-28 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header with Responsive Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Customers & Audience
          </h1>
          <p className={`mt-1 text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage contacts, audience segments, and broadcast subscribers.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setGroupsOpen(true)} 
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
              isDark 
                ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> Segments
          </button>

          <button 
            onClick={() => setImportOpen(true)} 
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${
              isDark 
                ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <ArrowUpTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> Import CSV
          </button>

          <button 
            onClick={() => setAddOpen(true)} 
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FF6A00] hover:bg-[#e05d00] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#FF6A00]/25"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Add Contact
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className={`rounded-2xl border shadow-xs overflow-hidden ${
        isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
      }`}>
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading audience contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="p-10 sm:p-14 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
              isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <UserGroupIcon className="w-7 h-7" />
            </div>
            <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>No contacts yet</h3>
            <p className={`text-xs max-w-sm mx-auto mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Import your contacts or add them manually to build audience segments for WhatsApp & broadcasts.
            </p>
            <div className="flex gap-2.5 justify-center">
              <button 
                onClick={() => setImportOpen(true)} 
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Import CSV
              </button>
              <button 
                onClick={() => setAddOpen(true)} 
                className="bg-[#FF6A00] hover:bg-[#e05d00] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#FF6A00]/20"
              >
                Add Contact
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table: Hidden on mobile screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[11px] font-semibold tracking-wider ${
                  isDark ? 'bg-slate-950 text-slate-400 border-b border-white/10' : 'bg-slate-50 text-slate-500 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="px-5 py-3.5">Customer Name</th>
                    <th className="px-5 py-3.5">Phone Number</th>
                    <th className="px-5 py-3.5">Subscription Status</th>
                    <th className="px-5 py-3.5">Audience Tags</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {contacts.map((contact) => (
                    <tr key={contact._id} className={isDark ? 'hover:bg-white/[0.02] transition' : 'hover:bg-slate-50 transition'}>
                      <td className={`px-5 py-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {contact.name || 'Anonymous User'}
                      </td>
                      <td className={`px-5 py-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {contact.phone}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          contact.optIn 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        }`}>
                          {contact.optIn ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {contact.optIn ? 'Subscribed' : 'Opted Out'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map((t) => (
                              <span key={t} className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High readability cards on phones */}
            <div className="block md:hidden divide-y divide-inherit">
              {contacts.map((contact) => (
                <div key={contact._id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {contact.name || 'Anonymous User'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      contact.optIn 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}>
                      {contact.optIn ? 'Subscribed' : 'Opted Out'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Phone size={12} className="text-[#FF6A00]" />
                    {contact.phone}
                  </div>

                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {contact.tags.map((t) => (
                        <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isImportOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {isGroupsOpen && <GroupManager onClose={() => setGroupsOpen(false)} />}
      {isAddOpen && <AddContactModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}
