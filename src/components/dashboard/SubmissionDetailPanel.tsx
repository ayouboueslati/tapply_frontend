import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import GlassPanel from "@/components/ui/GlassPanel";
import { useOrgContext } from "@/components/dashboard/DashboardLayout";

type Submission = {
  id: string;
  card_id: string;
  org_id: string;
  status: string;
  branch: string | null;
  data: Record<string, any>;
  created_at: string;
};

type Props = {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Submission) => void;
  statusLabels: string[];
};

export default function SubmissionDetailPanel({
  submission,
  isOpen,
  onClose,
  onSave,
  statusLabels,
}: Props) {
  const { getToken } = useAuth();
  const { context } = useOrgContext();
  
  const [status, setStatus] = useState(submission?.status || "");
  const [branch, setBranch] = useState(submission?.branch || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Reset local state when submission changes
  useEffect(() => {
    setStatus(submission?.status || "");
    setBranch(submission?.branch || "");
    setError(null);
  }, [submission]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!submission) return;
    setSaving(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/submissions/${submission.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: status,
          branch: branch || null, // convert empty string to null
        }),
      });

      if (res.ok) {
        const updatedSubmission = await res.json();
        onSave(updatedSubmission);
        onClose();
      } else if (res.status === 404) {
        setError("This submission is no longer available.");
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to save submission.");
      }
    } catch (error) {
      const err = error as Error;
      console.error("Error saving submission:", err);
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  const labelMap = context?.form_fields.reduce((acc, f) => {
    acc[f.name] = f.label || f.name;
    return acc;
  }, {} as Record<string, string>) || {};

  return (
    <>
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-white/[0.02]">
          <h2 className="text-lg font-medium text-slate-900 dark:text-[#FAFAFA]">Submission Details</h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          {submission ? (
            <>
              {/* Editable Fields */}
              <GlassPanel className="p-5 space-y-4">
                <div>
                  <label htmlFor="status-select" className="block text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    id="status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={saving}
                    className="w-full bg-white/50 dark:bg-[#06080F]/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 appearance-none transition-all hover:bg-slate-50 dark:hover:bg-[#06080F]/80"
                  >
                    {/* Make sure the current status is in the list, even if it was removed from org labels mid-session (helps prevent it being silently switched if they just hit save) */}
                    {!statusLabels.includes(submission.status) && (
                      <option value={submission.status}>{submission.status} (Legacy)</option>
                    )}
                    {statusLabels.map((lbl) => (
                      <option key={lbl} value={lbl}>{lbl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="branch-input" className="block text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
                    Branch
                  </label>
                  <input
                    id="branch-input"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    disabled={saving}
                    placeholder="e.g. New York, Remote"
                    className="w-full bg-white/50 dark:bg-[#06080F]/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#FAFAFA] placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:bg-slate-50 dark:hover:bg-[#06080F]/80"
                  />
                </div>
              </GlassPanel>

              {/* Read-only Data Blob */}
              <div>
                <h3 className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3">
                  Candidate Data
                </h3>
                <GlassPanel className="overflow-hidden">
                  <ul className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                    {Object.entries(submission.data).map(([key, value]) => {
                      if (key === "branch" || key === "metadata") return null; // already handled
                      
                      // Handle empty strings beautifully
                      const displayValue = value === "" ? "—" : value;
                      return (
                        <li key={key} className="px-5 py-3">
                          <p className="text-xs text-slate-500 dark:text-white/40 mb-0.5">{labelMap[key] || key}</p>
                          <p className="text-sm text-slate-900 dark:text-[#FAFAFA]">{String(displayValue)}</p>
                        </li>
                      );
                    })}
                  </ul>
                </GlassPanel>
              </div>

              {/* Metadata */}
              {(() => {
                const meta = submission.data.metadata;
                if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
                const metaEntries = Object.entries(meta as Record<string, unknown>);
                if (metaEntries.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3">
                      Hidden Metadata
                    </h3>
                    <GlassPanel className="overflow-hidden">
                      <ul className="divide-y divide-slate-200 dark:divide-white/[0.06]">
                        {metaEntries.map(([key, value]) => {
                          let displayValue: string;
                          if (value === null || value === undefined) {
                            displayValue = "—";
                          } else if (typeof value === 'object') {
                            displayValue = JSON.stringify(value);
                          } else {
                            displayValue = String(value) || "—";
                          }
                          return (
                            <li key={key} className="px-5 py-3">
                              <p className="text-xs text-slate-500 dark:text-white/40 mb-0.5 capitalize">{key.replace(/_/g, ' ')}</p>
                              <p className="text-sm text-slate-900 dark:text-[#FAFAFA] break-all">{displayValue}</p>
                            </li>
                          );
                        })}
                      </ul>
                    </GlassPanel>
                  </div>
                );
              })()}

              {/* System Info */}
              <div className="text-xs text-slate-400 dark:text-white/30 text-center space-y-1 mt-4">
                <p>Submitted: {new Date(submission.created_at).toLocaleString()}</p>
                <p>ID: {submission.id}</p>
                <p>Card ID: {submission.card_id}</p>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 dark:text-white/40 py-8">
              No submission selected.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-white/60 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !submission || (status === submission.status && branch === (submission.branch || ""))}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
