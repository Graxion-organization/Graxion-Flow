import React, { useState, useEffect } from "react";
import { 
  Image as ImageIcon, 
  Trash2, 
  RefreshCw, 
  Search, 
  FileWarning, 
  ExternalLink,
  ShieldAlert,
  HardDrive,
  Filter
} from "lucide-react";
import { adminAPI } from "../../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const SystemMedia = () => {
  const [orphans, setOrphans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null); // ID of file being deleted
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all, image, video

  useEffect(() => {
    fetchOrphans();
  }, []);

  const fetchOrphans = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getOrphanMedia();
      setOrphans(res.data.data.orphans || []);
    } catch (err) {
      toast.error("Failed to fetch orphan media");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (publicId) => {
    if (!window.confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    
    setDeleting(publicId);
    try {
      await adminAPI.deleteOrphanMedia([publicId]);
      setOrphans(prev => prev.filter(item => item.publicId !== publicId));
      toast.success("File deleted successfully");
    } catch (err) {
      toast.error("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (orphans.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${orphans.length} orphan files? This action is irreversible.`)) return;

    setBulkDeleting(true);
    try {
      const publicIds = orphans.map(o => o.publicId);
      // Process in chunks if there are many files (Cloudinary allows up to 100 per call)
      const chunkSize = 100;
      for (let i = 0; i < publicIds.length; i += chunkSize) {
        const chunk = publicIds.slice(i, i + chunkSize);
        await adminAPI.deleteOrphanMedia(chunk);
      }
      
      setOrphans([]);
      toast.success(`Deleted ${publicIds.length} files successfully`);
    } catch (err) {
      toast.error("Failed to delete some files");
      fetchOrphans(); // Refresh to see what's left
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredOrphans = orphans.filter(item => {
    const matchesSearch = item.publicId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || item.resourceType === filter;
    return matchesSearch && matchesFilter;
  });

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="w-12 h-12 animate-spin text-emerald-500" />
        <p className="text-gray-400 animate-pulse">Scanning Cloudinary for orphaned content...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <FileWarning className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Orphaned Files</p>
            <h3 className="text-3xl font-bold">{orphans.length}</h3>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <HardDrive className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Space Waste</p>
            <h3 className="text-3xl font-bold">
              {formatSize(orphans.reduce((acc, curr) => acc + (curr.bytes || 0), 0))}
            </h3>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-xl flex items-center justify-center">
          <button
            onClick={handleDeleteAll}
            disabled={bulkDeleting || orphans.length === 0}
            className="w-full h-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl transition-all duration-300 font-bold group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDeleting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            Delete All Orphans
          </button>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-3 items-start">
        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-500/70">
          Orphaned files are assets found in your Cloudinary 'social_hub' folder that have no reference in the application database. 
          Deleting these files will free up storage but they cannot be recovered. Make sure no external systems depend on these public IDs.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by Public ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-2xl">
          {["all", "image", "video"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === t ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-400 hover:text-white"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}s
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {filteredOrphans.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <ImageIcon className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Orphaned Content</h3>
          <p className="text-gray-400 max-w-md">Your system is clean! No files were found without database references.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredOrphans.map((file) => (
              <motion.div
                key={file.publicId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-emerald-500/30 transition-all duration-500"
              >
                {/* Media Preview */}
                <div className="aspect-square relative overflow-hidden bg-black/40">
                  {file.resourceType === "video" ? (
                    <video
                      src={file.url}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                      onMouseOver={(e) => e.target.play()}
                      onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                      muted
                      loop
                    />
                  ) : (
                    <img
                      src={file.url}
                      alt={file.publicId}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  )}
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider">
                    {file.resourceType}
                  </div>
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all hover:scale-110"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <button 
                      onClick={() => handleDelete(file.publicId)}
                      disabled={deleting === file.publicId}
                      className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center backdrop-blur-xl border border-red-500/30 text-red-500 transition-all hover:scale-110"
                    >
                      {deleting === file.publicId ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-xs font-mono text-gray-400 truncate mb-1" title={file.publicId}>
                    {file.publicId}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span>{formatSize(file.bytes)}</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SystemMedia;
