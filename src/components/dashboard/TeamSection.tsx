"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";

interface StaffMember {
  id: string;
  email: string;
  role: string;
  can_edit: boolean;
  can_edit_until: string | null;
  created_at: string;
}

interface TeamSectionProps {
  isOwner: boolean;
  currentUserId?: string; // Optional, to prevent self-editing
}

export default function TeamSection({ isOwner }: TeamSectionProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCanEdit, setEditCanEdit] = useState(false);
  const [editUntil, setEditUntil] = useState<string>("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStaff(data);
        } else {
          setError("Failed to load team members.");
        }
      } catch {
        setError("Network error loading team members.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken, apiUrl]);

  const handleSavePermissions = async (userId: string) => {
    setError(null);
    setSuccess(null);
    
    // Validation
    let canEditUntilDate: string | null = null;
    if (editUntil) {
        canEditUntilDate = new Date(editUntil).toISOString();
    }
    
    if (canEditUntilDate && !editCanEdit) {
        setError("Time limit can only be set when granting edit permissions.");
        return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/staff/${userId}/permissions`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
            can_edit: editCanEdit,
            can_edit_until: canEditUntilDate
        })
      });

      if (res.ok) {
        setSuccess("Permissions updated successfully.");
        setStaff(staff.map(member => 
            member.id === userId 
                ? { ...member, can_edit: editCanEdit, can_edit_until: canEditUntilDate }
                : member
        ));
        setEditingId(null);
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to update permissions.");
      }
    } catch {
      setError("Network error while saving.");
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <GlassPanel className="w-full">
        <div className="p-6 flex items-center justify-center min-h-[150px]">
          <p className="text-[#F5F3EE]/50 animate-pulse">Loading team members...</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA]">Team Members</h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
          Manage staff access and permissions for your organization.
        </p>
      </div>

      <div className="p-4 sm:p-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {staff.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-white/40 text-sm font-medium">
            No team members found.
          </div>
        ) : (
          <ul className="space-y-3">
            {staff.map((member) => (
              <li 
                key={member.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all hover:border-slate-300 dark:hover:border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/10 to-rose-500/10 dark:from-indigo-500/20 dark:to-rose-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                    <span className="text-sm font-semibold text-gradient">{member.email.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-[#FAFAFA] group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors">{member.email}</span>
                      <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              member.role === 'org_owner' 
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30' 
                                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/10 dark:text-white/60 dark:border-white/10'
                          }`}>
                              {member.role === 'org_owner' ? 'Owner' : 'Staff'}
                          </span>
                          
                          {member.role !== 'org_owner' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                  member.can_edit 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20' 
                                      : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/40 dark:border-white/10'
                              }`}>
                                  {member.can_edit ? 'Can Edit' : 'Read Only'}
                              </span>
                          )}

                          {member.can_edit_until && (
                              <span className="text-[10px] font-medium text-slate-500 dark:text-white/40">
                                  Until: {formatDate(member.can_edit_until)}
                              </span>
                          )}
                      </div>
                  </div>
                </div>

                {isOwner && member.role !== 'org_owner' && (
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === member.id ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#06080F]/50 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-inner">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-white/80 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                            <input 
                                type="checkbox" 
                                checked={editCanEdit}
                                onChange={(e) => setEditCanEdit(e.target.checked)}
                                className="rounded bg-white dark:bg-[#06080F] border-slate-300 dark:border-white/20 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500/50"
                            />
                            Grant Edit Access
                        </label>
                        
                        {editCanEdit && (
                            <input 
                                type="datetime-local" 
                                value={editUntil}
                                onChange={(e) => setEditUntil(e.target.value)}
                                className="bg-white dark:bg-[#06080F] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-[#FAFAFA] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                            />
                        )}

                        <div className="flex gap-2 ml-2">
                            <button
                                onClick={() => handleSavePermissions(member.id)}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-500 dark:hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-white/60 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                      </div>
                    ) : (
                        <button
                            onClick={() => {
                                setEditingId(member.id);
                                setEditCanEdit(member.can_edit);
                                if (member.can_edit_until) {
                                    const d = new Date(member.can_edit_until);
                                    setEditUntil(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16));
                                } else {
                                    setEditUntil("");
                                }
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white glass-panel dark:hover:bg-white/10 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Manage Permissions
                        </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassPanel>
  );
}
