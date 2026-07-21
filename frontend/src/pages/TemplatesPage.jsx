import React, { useEffect } from 'react';
import { useCrmStore } from '../store/crmStore';
import { ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { templateAPI } from '../services/api';

export default function TemplatesPage() {
  const { templates, fetchTemplates, isLoading } = useCrmStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Message Templates</h1>
          <p className="text-gray-400 mt-1">Manage your WhatsApp approved templates</p>
        </div>
        <button onClick={async () => {
          try {
            await templateAPI.sync();
            toast.success('Templates synced successfully');
            fetchTemplates();
          } catch (err) {
            toast.error('Failed to sync templates');
          }
        }} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
          <ArrowPathIcon className="w-5 h-5" /> Sync from Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="text-gray-500 col-span-full">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <DocumentDuplicateIcon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No templates found. Sync from your WhatsApp Business Account.</p>
          </div>
        ) : (
          templates.map(tpl => (
            <div key={tpl._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{tpl.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${tpl.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {tpl.status || 'PENDING'}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-4 bg-gray-800 p-3 rounded-lg border border-gray-700 font-mono whitespace-pre-wrap">
                {tpl.components?.find(c => c.type === 'BODY')?.text || 'No body content'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Category: {tpl.category || 'MARKETING'}</span>
                <span>Language: {tpl.language || 'en'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
