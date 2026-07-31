import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Check, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { organizationAPI } from "../../services/api";
import { useOrganizationStore, useAuthStore } from "../../store";
import toast from "react-hot-toast";

export default function OrganizationSwitcher({ isDark = true, primaryColor = "#FF6A00" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, org: null });
  const dropdownRef = useRef(null);
  const contextMenuRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    organizations,
    currentOrganization,
    setOrganizations,
    setCurrentOrganization,
    addOrganization,
  } = useOrganizationStore();

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        setLoading(true);
        const res = await organizationAPI.getAll();
        const orgs = res.data.data.organizations;
        setOrganizations(orgs);

        const storedId = localStorage.getItem("organizationId");
        if (orgs.length > 0) {
          const found = orgs.find((o) => o._id === storedId);
          if (!currentOrganization || (storedId && !found)) {
            setCurrentOrganization(found || orgs[0]);
          } else if (found && currentOrganization._id !== found._id) {
            setCurrentOrganization(found);
          }
        }
      } catch (err) {
        console.error("Failed to fetch organizations", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, [currentOrganization, setCurrentOrganization, setOrganizations]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      const clickedInsideContextMenu = contextMenuRef.current && contextMenuRef.current.contains(e.target);
      
      if (!clickedInsideDropdown && !clickedInsideContextMenu) {
        setOpen(false);
        setIsCreating(false);
      }
      
      if (!clickedInsideContextMenu) {
        setContextMenu({ visible: false, x: 0, y: 0, org: null });
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSwitch = async (org) => {
    if (switchingId || currentOrganization?._id === org._id) {
      setOpen(false);
      return;
    }
    setSwitchingId(org._id);
    try {
      const res = await organizationAPI.switch(org._id);
      if (res.data.status === "success") {
        setCurrentOrganization(org);
        setOpen(false);
        toast.success(`Switched to ${org.name}`);
        navigate("/app/dashboard");
      }
    } catch (err) {
      console.error("Switch error:", err);
      toast.error(err.response?.data?.message || "Failed to switch organization");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setLoading(true);
      const res = await organizationAPI.create({ name: newOrgName });
      const newOrg = res.data.data.organization;
      addOrganization(newOrg);
      setCurrentOrganization(newOrg);
      setNewOrgName("");
      setIsCreating(false);
      setOpen(false);
      toast.success("Organization created!");
      navigate("/app/dashboard");
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl border transition-all ${
          isDark
            ? "bg-white/5 border-white/10 hover:bg-white/10"
            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primaryColor}22`, color: primaryColor }}>
          <Building2 size={16} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <p className="text-sm font-semibold truncate">{currentOrganization?.name || "Select Workspace"}</p>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute left-0 top-full mt-2 w-full min-w-[240px] rounded-2xl border z-50 overflow-hidden nav-fade-up backdrop-blur-xl ${isDark ? "bg-slate-900/95 border-white/10 shadow-2xl shadow-black/40" : "bg-white/95 border-slate-200 shadow-2xl shadow-slate-300/40"}`}>
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {organizations.map((org) => {
              const active = currentOrganization?._id === org._id;
              const isCurrentlySwitching = switchingId === org._id;
              
              const handleContextMenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  org
                });
              };

              return (
                <button
                  key={org._id}
                  disabled={!!switchingId}
                  onClick={() => handleSwitch(org)}
                  onContextMenu={handleContextMenu}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all disabled:opacity-60 ${
                    active
                      ? "text-white"
                      : isDark
                      ? "text-slate-300 hover:bg-white/8"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  style={active ? { background: primaryColor } : undefined}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-white/20" : isDark ? "bg-white/10" : "bg-slate-200"
                    }`}
                  >
                    <Building2 size={15} />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate text-left">{org.name}</span>
                  {isCurrentlySwitching ? (
                    <Loader2 size={15} className={`animate-spin ${active ? "text-white" : "text-slate-400"}`} />
                  ) : (
                    active && <Check size={15} />
                  )}
                </button>
              );
            })}
          </div>

          <div className={`p-2 border-t ${isDark ? "border-white/10" : "border-slate-200"}`}>
            {isCreating ? (
              <form onSubmit={handleCreate} className="space-y-2 p-1">
                <input
                  autoFocus
                  type="text"
                  placeholder="Workspace name..."
                  className={`w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400"
                      : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                  }`}
                  style={{ boxShadow: `0 0 0 0 ${primaryColor}` }}
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 text-white text-xs font-bold py-2 rounded-lg transition-opacity disabled:opacity-50"
                    style={{ background: primaryColor }}
                  >
                    {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className={`flex-1 text-xs font-bold py-2 rounded-lg ${isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${isDark ? "hover:bg-white/8" : "hover:bg-slate-100"}`}
                style={{ color: primaryColor }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${primaryColor}22` }}>
                  <Plus size={16} />
                </div>
                Create New Workspace
              </button>
            )}
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className={`fixed z-[100] w-48 rounded-xl border backdrop-blur-xl p-1 shadow-2xl ${
            isDark
              ? "bg-slate-900/95 border-white/10 shadow-black/50"
              : "bg-white/95 border-slate-200 shadow-slate-300/50"
          }`}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              handleSwitch(contextMenu.org);
              setContextMenu({ visible: false, x: 0, y: 0, org: null });
            }}
            className={`flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all text-left ${
              isDark ? "text-slate-200 hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Building2 size={13} />
            Switch to Workspace
          </button>
          
          {/* Delete Option */}
          {(() => {
            const isOwner = contextMenu.org.owner === user?._id;
            return (
              <button
                disabled={!isOwner}
                onClick={async () => {
                  const targetOrg = contextMenu.org;
                  setContextMenu({ visible: false, x: 0, y: 0, org: null });
                  setOpen(false);

                  // 1. If not current organization, switch first
                  if (currentOrganization?._id !== targetOrg._id) {
                    toast.loading(`Switching to ${targetOrg.name}...`, { id: 'switch-before-delete' });
                    try {
                      const res = await organizationAPI.switch(targetOrg._id);
                      if (res.data.status === "success") {
                        setCurrentOrganization(targetOrg);
                        toast.success(`Switched to ${targetOrg.name}`, { id: 'switch-before-delete' });
                      } else {
                        throw new Error();
                      }
                    } catch {
                      toast.error("Failed to switch workspace", { id: 'switch-before-delete' });
                      return;
                    }
                  }

                  // 2. Redirect to Danger Zone settings tab
                  navigate("/app/settings?tab=danger");
                  
                  // 3. Scroll to the Delete Workspace card after rendering
                  setTimeout(() => {
                    const el = document.getElementById("delete-workspace-card");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }, 800);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-all text-left ${
                  isOwner
                    ? "text-red-500 hover:bg-red-500/10"
                    : "text-slate-400 opacity-50 cursor-not-allowed"
                }`}
              >
                <Trash2 size={13} />
                Delete Workspace {!isOwner && "🔒"}
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
