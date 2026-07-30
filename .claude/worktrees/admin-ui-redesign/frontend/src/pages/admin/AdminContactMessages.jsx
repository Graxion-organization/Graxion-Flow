import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Clock } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/admin/contact-messages');
      setMessages(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load contact messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/admin/contact-messages/${id}/read`);
      toast.success('Marked as read');
      fetchMessages();
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading messages...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Contact Submissions</h1>
          <p className="text-gray-400">Manage inquiries from your public contact page.</p>
        </div>
        <div className="bg-brand-500/10 p-4 rounded-xl border border-brand-500/20">
          <div className="flex items-center gap-3">
            <Mail className="text-brand-500" size={24} />
            <div>
              <p className="text-sm text-brand-500/80">Total Unread</p>
              <p className="text-xl font-bold text-white">{messages.filter(m => m.status === 'unread').length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {messages.length === 0 ? (
          <div className="bg-dark-paper border-dark-border rounded-xl border">
            <div className="p-8 text-center text-gray-400">
              No contact messages received yet.
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className={`rounded-xl bg-dark-paper border ${msg.status === 'unread' ? 'border-brand-500/50' : 'border-dark-border'}`}>
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{msg.subject}</h3>
                      {msg.status === 'unread' && (
                        <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-brand-500/20 text-brand-500 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                      From: <span className="text-white">{msg.name}</span> &lt;{msg.email}&gt;
                    </p>
                    <div className="bg-black/30 p-4 rounded-lg border border-white/5 text-gray-300 whitespace-pre-wrap">
                      {msg.message}
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-between items-end min-w-[150px]">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={14} />
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </div>
                    
                    {msg.status === 'unread' ? (
                      <button 
                        onClick={() => markAsRead(msg._id)}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-bg border border-brand-500/30 text-brand-500 rounded-lg hover:bg-brand-500 hover:text-white transition-colors"
                      >
                        <CheckCircle2 size={16} /> Mark as Read
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle2 size={14} /> Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
