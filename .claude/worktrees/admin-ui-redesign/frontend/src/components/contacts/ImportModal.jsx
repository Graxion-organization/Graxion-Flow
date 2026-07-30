import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ImportModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-white mb-4">Import Contacts</h2>
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer bg-gray-800/50">
          <p className="text-gray-400">Click to upload CSV file</p>
          <p className="text-xs text-gray-500 mt-2">Required columns: name, phone</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500">Upload</button>
        </div>
      </div>
    </div>
  );
}
