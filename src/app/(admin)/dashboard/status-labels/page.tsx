"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import { useOrgContext } from "@/components/dashboard/DashboardLayout";

export default function StatusLabelsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { context } = useOrgContext();
  
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newLabel, setNewLabel] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const isOwner = context?.role === "org_owner";

  // ── Fetch initial labels ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/organizations/me/status-labels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLabels(data.status_labels);
        } else {
          setError("Failed to load status labels.");
        }
      } catch {
        setError("Network error loading status labels.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken, apiUrl]);

  // ── Save handler ──────────────────────────────────────────────────────────
  const saveLabels = async (proposedLabels: string[], successMsg: string) => {
    // Client-side guards
    if (proposedLabels.length === 0) {
      setError("You must have at least one status label.");
      return;
    }
    
    // Normalize and trim labels for duplicate check
    const trimmedLabels = proposedLabels.map(l => l.trim());
    if (trimmedLabels.some(l => l.length === 0)) {
      setError("Status labels cannot be empty.");
      return;
    }

    const unique = new Set(trimmedLabels);
    if (unique.size !== trimmedLabels.length) {
      setError("Status labels must be unique.");
      return;
    }
    if (trimmedLabels.some(l => l.length > 50)) {
      setError("Status labels must be 50 characters or less.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/organizations/me/status-labels`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status_labels: trimmedLabels })
      });

      if (res.ok) {
        const data = await res.json();
        setLabels(data.status_labels);
        setSuccess(successMsg);
        setNewLabel("");
        setEditingIndex(null);
      } else {
        const errData = await res.json();
        // e.g. "Cannot remove label(s) ['in_use'] — they are still referenced..."
        setError(errData.detail || "Failed to save changes. No changes were made.");
      }
    } catch {
      setError("Network error while saving. No changes were made.");
    } finally {
      setSaving(false);
    }
  };

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleAdd = () => {
    const val = newLabel.trim();
    if (!val) return;
    saveLabels([...labels, val], `Added label "${val}"`);
  };

  const handleRemove = (index: number) => {
    const proposed = [...labels];
    const removed = proposed.splice(index, 1)[0];
    saveLabels(proposed, `Removed label "${removed}"`);
    setRemovingIndex(null);
  };

  const handleSaveEdit = (index: number) => {
    const val = editingValue.trim();
    if (!val) return;
    if (val === labels[index]) {
      setEditingIndex(null); // No change
      return;
    }
    const proposed = [...labels];
    proposed[index] = val;
    saveLabels(proposed, `Renamed label to "${val}"`);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[300px]">
        <p className="text-[#F5F3EE]/50 animate-pulse">Loading status labels...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-[#F5F3EE]">Status Labels</h1>
        <p className="text-sm text-white/40 mt-1">
          Manage the pipeline stages for your lead captures.
        </p>
      </div>

      {!isOwner && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
          <strong>Note:</strong> You are viewing this page as a staff member. Only the organization owner can edit status labels.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          {success}
        </div>
      )}

      <GlassPanel className="overflow-hidden">
        <div className="p-4 sm:p-6">
          <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
            Current Labels
          </h2>
          
          <ul className="space-y-3">
            {labels.map((label, index) => (
              <li 
                key={`${label}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-white/5 border border-white/5"
              >
                {editingIndex === index ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      disabled={saving}
                      className="flex-1 bg-[#0B1220]/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#D4AF6A] focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(index)}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-[#0B1220] bg-[#D4AF6A] rounded-lg hover:bg-[#E5C383] transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={label} />
                      <span className="text-white/40 text-xs hidden sm:inline">
                        (Stored as: {label})
                      </span>
                    </div>
                    {isOwner && (
                      <div className="flex gap-2 shrink-0">
                        {removingIndex === index ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-400 mr-2">Are you sure?</span>
                            <button
                              onClick={() => handleRemove(index)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500/80 hover:bg-red-500 rounded-md transition-colors disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setRemovingIndex(null)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingIndex(index);
                                setEditingValue(label);
                                setRemovingIndex(null);
                                setError(null);
                                setSuccess(null);
                              }}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                setRemovingIndex(index);
                                setEditingIndex(null);
                                setError(null);
                                setSuccess(null);
                              }}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isOwner && (
          <div className="p-4 sm:p-6 border-t border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
              Add New Label
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Interview Scheduled"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                className="flex-1 bg-[#0B1220]/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F5F3EE] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#D4AF6A] focus:border-transparent"
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newLabel.trim()}
                className="px-6 py-2 text-sm font-medium text-[#0B1220] bg-[#D4AF6A] rounded-lg hover:bg-[#E5C383] transition-colors disabled:opacity-50 shrink-0"
              >
                Add Label
              </button>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
