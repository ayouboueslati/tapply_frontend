"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import StatusBadge from "@/components/ui/StatusBadge";

interface EditableLabelListProps {
  title: string;
  description: string;
  endpointPath: string; // e.g. "/organizations/me/status-labels"
  dataKey: string;      // e.g. "status_labels"
  isEditable: boolean;
  useStatusBadge?: boolean;
}

export default function EditableLabelList({
  title,
  description,
  endpointPath,
  dataKey,
  isEditable,
  useStatusBadge = false,
}: EditableLabelListProps) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  
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

  // ── Fetch initial labels ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}${endpointPath}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLabels(data[dataKey] || []);
        } else {
          setError(`Failed to load ${title.toLowerCase()}.`);
        }
      } catch {
        setError(`Network error loading ${title.toLowerCase()}.`);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken, apiUrl, endpointPath, dataKey, title]);

  // ── Save handler ──────────────────────────────────────────────────────────
  const saveLabels = async (proposedLabels: string[], successMsg: string) => {
    if (!isEditable) return; // Guard clause for read-only

    // Client-side guards
    if (proposedLabels.length === 0) {
      setError(`You must have at least one ${title.toLowerCase().replace(/s$/, '')}.`);
      return;
    }
    
    // Normalize and trim labels for duplicate check
    const trimmedLabels = proposedLabels.map(l => l.trim());
    if (trimmedLabels.some(l => l.length === 0)) {
      setError(`${title} cannot be empty.`);
      return;
    }

    const unique = new Set(trimmedLabels);
    if (unique.size !== trimmedLabels.length) {
      setError(`${title} must be unique.`);
      return;
    }
    if (trimmedLabels.some(l => l.length > 50)) {
      setError(`${title} must be 50 characters or less.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}${endpointPath}`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ [dataKey]: trimmedLabels })
      });

      if (res.ok) {
        const data = await res.json();
        setLabels(data[dataKey] || []);
        setSuccess(successMsg);
        setNewLabel("");
        setEditingIndex(null);
      } else {
        const errData = await res.json();
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
    saveLabels([...labels, val], `Added "${val}"`);
  };

  const handleRemove = (index: number) => {
    const proposed = [...labels];
    const removed = proposed.splice(index, 1)[0];
    saveLabels(proposed, `Removed "${removed}"`);
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
    saveLabels(proposed, `Renamed to "${val}"`);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <GlassPanel className="w-full">
        <div className="p-6 flex items-center justify-center min-h-[150px]">
          <p className="text-slate-400 dark:text-white/50 animate-pulse">Loading {title.toLowerCase()}...</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/5">
        <h2 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA]">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">{description}</p>
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

        {labels.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-white/40 text-sm">
            No items found.
          </div>
        ) : (
          <ul className="space-y-3">
            {labels.map((label, index) => (
              <li 
                key={`${label}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5"
              >
                {editingIndex === index ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      disabled={saving}
                      className="flex-1 bg-white dark:bg-[#06080F]/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(index)}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-white/60 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {useStatusBadge ? (
                        <StatusBadge status={label} />
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 dark:bg-white/10 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-white/80">
                          {label}
                        </span>
                      )}
                      <span className="text-slate-400 dark:text-white/40 text-xs hidden sm:inline">
                        (Stored as: {label})
                      </span>
                    </div>
                    
                    {isEditable && (
                      <div className="flex gap-2 shrink-0">
                        {removingIndex === index ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-rose-500 dark:text-rose-400 mr-2">Are you sure?</span>
                            <button
                              onClick={() => handleRemove(index)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 dark:bg-rose-500/80 dark:hover:bg-rose-500 rounded-md transition-colors disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setRemovingIndex(null)}
                              disabled={saving}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-white/60 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
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
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-white/60 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
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
                              className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:hover:text-rose-300 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-md transition-colors disabled:opacity-50"
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
        )}
      </div>

      {isEditable && (
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <h2 className="text-sm font-medium text-slate-600 dark:text-white/60 uppercase tracking-wider mb-4">
            Add New Item
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter name..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="flex-1 bg-white dark:bg-[#06080F]/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#FAFAFA] placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newLabel.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
