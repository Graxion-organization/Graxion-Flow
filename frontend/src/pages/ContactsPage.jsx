import React, { useEffect, useState } from 'react';
import { useCrmStore } from '../store/crmStore';
import { PlusIcon, ArrowUpTrayIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ImportModal from '../components/contacts/ImportModal';
import GroupManager from '../components/contacts/GroupManager';

export default function ContactsPage() {
  const { contacts, fetchContacts, isLoading } = useCrmStore();
  const [isImportOpen, setImportOpen] = useState(false);
  const [isGroupsOpen, setGroupsOpen] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Contacts</h1>
          <p className="text-gray-400 mt-1">Manage your audience and segments</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setGroupsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
            <UserGroupIcon className="w-5 h-5" /> Segments
          </button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
            <ArrowUpTrayIcon className="w-5 h-5" /> Import CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">
            <PlusIcon className="w-5 h-5" /> Add Contact
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-300">Name</th>
              <th className="p-4 font-medium text-gray-300">Phone</th>
              <th className="p-4 font-medium text-gray-300">Status</th>
              <th className="p-4 font-medium text-gray-300">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading contacts...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">No contacts found. Import some to get started.</td></tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact._id} className="hover:bg-gray-800/30 transition">
                  <td className="p-4">{contact.name || 'Unknown'}</td>
                  <td className="p-4 text-gray-400">{contact.phoneNumber}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${contact.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-1">
                    {contact.tags?.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300">{t}</span>
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
    </div>
  );
}
