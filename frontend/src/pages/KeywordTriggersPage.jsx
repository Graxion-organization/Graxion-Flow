import React, { useState, useEffect } from 'react';
import { keywordAPI } from '../services/api';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function KeywordTriggersPage() {
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ 
    keyword: '', 
    matchType: 'exact', 
    action: 'SEND_MESSAGE', 
    response: '',
    platforms: ['whatsapp'],
    replyType: 'ALL',
    mediaType: 'none',
    mediaUrl: ''
  });

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    setIsLoading(true);
    try {
      const { data } = await keywordAPI.getAll();
      setKeywords(data.data.keywords);
    } catch (err) {
      toast.error('Failed to load keywords');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newKeyword.keyword || !newKeyword.response) return toast.error('Keyword and response are required');
    try {
      await keywordAPI.create(newKeyword);
      toast.success('Keyword added');
      setNewKeyword({ 
        keyword: '', 
        matchType: 'exact', 
        action: 'SEND_MESSAGE', 
        response: '',
        platforms: ['whatsapp'],
        replyType: 'ALL',
        mediaType: 'none',
        mediaUrl: ''
      });
      fetchKeywords();
    } catch (err) {
      toast.error('Failed to add keyword');
    }
  };

  const handleDelete = async (id) => {
    try {
      await keywordAPI.delete(id);
      toast.success('Keyword deleted');
      fetchKeywords();
    } catch (err) {
      toast.error('Failed to delete keyword');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Keyword Triggers</h1>
        <p className="text-gray-400 mt-1">Automate simple replies or start flows based on specific words.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Trigger</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input 
            type="text" 
            placeholder="If user says (e.g. 'pricing')..." 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.keyword}
            onChange={(e) => setNewKeyword({...newKeyword, keyword: e.target.value})}
          />
          <select 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.matchType}
            onChange={(e) => setNewKeyword({...newKeyword, matchType: e.target.value})}
          >
            <option value="exact">Exact Match</option>
            <option value="contains">Contains</option>
          </select>
          <select 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.platforms[0] || 'whatsapp'}
            onChange={(e) => setNewKeyword({...newKeyword, platforms: [e.target.value]})}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="telegram">Telegram</option>
          </select>
          <select 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
            value={newKeyword.replyType}
            onChange={(e) => {
              const newReplyType = e.target.value;
              let newMediaType = newKeyword.mediaType;
              if (newReplyType === 'COMMENT') newMediaType = 'none';
              setNewKeyword({...newKeyword, replyType: newReplyType, mediaType: newMediaType});
            }}
          >
            <option value="ALL">DM & Comment</option>
            <option value="DM">DM Only</option>
            <option value="COMMENT">Comment Only</option>
          </select>

          <input 
            type="text" 
            placeholder="Then reply with text..." 
            className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white lg:col-span-2"
            value={newKeyword.response}
            onChange={(e) => setNewKeyword({...newKeyword, response: e.target.value})}
          />

          {newKeyword.replyType !== 'COMMENT' && (
            <select 
              className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
              value={newKeyword.mediaType}
              onChange={(e) => setNewKeyword({...newKeyword, mediaType: e.target.value})}
            >
              <option value="none">No Media</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document" disabled={newKeyword.platforms.includes('instagram') || newKeyword.platforms.includes('facebook') || newKeyword.platforms.includes('telegram')}>Document (PDF)</option>
            </select>
          )}

          {newKeyword.mediaType !== 'none' && newKeyword.replyType !== 'COMMENT' && (
             <input 
             type="url" 
             placeholder="Media URL (e.g. https://...)" 
             className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
             value={newKeyword.mediaUrl}
             onChange={(e) => setNewKeyword({...newKeyword, mediaUrl: e.target.value})}
           />
          )}

          <div className="lg:col-span-4 flex justify-end">
            <button onClick={handleAdd} className="bg-blue-600 rounded-lg px-6 py-3 hover:bg-blue-500 font-semibold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20">
              <PlusIcon className="w-5 h-5" /> Add Trigger
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              <th className="p-4 font-medium text-gray-300">Keyword</th>
              <th className="p-4 font-medium text-gray-300">Platform</th>
              <th className="p-4 font-medium text-gray-300">Match Type</th>
              <th className="p-4 font-medium text-gray-300">Location</th>
              <th className="p-4 font-medium text-gray-300">Response / Media</th>
              <th className="p-4 font-medium text-gray-300 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading triggers...</td></tr>
            ) : keywords.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No triggers configured yet.</td></tr>
            ) : (
              keywords.map(kw => (
                <tr key={kw._id} className="hover:bg-gray-800/30 transition">
                  <td className="p-4 font-semibold text-blue-400">"{kw.keyword}"</td>
                  <td className="p-4 text-gray-400 capitalize">{kw.platforms?.join(', ') || 'Whatsapp'}</td>
                  <td className="p-4 text-gray-400 capitalize">{kw.matchType}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-gray-800 rounded text-xs">{kw.replyType || 'DM'}</span></td>
                  <td className="p-4 text-gray-300">
                    <div className="flex flex-col gap-1">
                      <span>{kw.response}</span>
                      {kw.mediaType !== 'none' && (
                        <span className="text-xs text-blue-300">Attachment: {kw.mediaType}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(kw._id)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded transition">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
