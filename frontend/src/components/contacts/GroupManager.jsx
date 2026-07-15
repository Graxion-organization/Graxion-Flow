import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function GroupManager({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white mb-4">Contact Segments</h2>
        <div className="space-y-3">
          <div className="p-3 bg-gray-800 rounded-lg flex justify-between items-center">
            <span className="text-gray-200">All Customers</span>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400">120 contacts</span>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg flex justify-between items-center">
            <span className="text-gray-200">VIP</span>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400">15 contacts</span>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <input type="text" placeholder="New segment name..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white" />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Create</button>
        </div>
      </div>
    </div>
  );
}
