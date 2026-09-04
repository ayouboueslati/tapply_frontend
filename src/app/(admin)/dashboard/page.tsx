"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import { useOrgContext } from "@/components/dashboard/DashboardLayout";
import SubmissionDetailPanel from "@/components/dashboard/SubmissionDetailPanel";
import CardManagement from "@/components/dashboard/CardManagement";

// ── Types ────────────────────────────────────────────────────────────────────

type Submission = {
  id: string;
  card_id: string;
  org_id: string;
  status: string;
  branch: string | null;
  data: Record<string, string>;
  created_at: string;
};

type SubmissionListResponse = {
  items: Submission[];
  total: number;
  limit: number;
  offset: number;
};

type Card = {
  id: string;
  stand_id: string;
  stand_name: string;
  token: string;
  is_active: boolean;
  assigned_recruiter_id: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Build a label map from the org's form_fields definition. */
function buildLabelMap(fields: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    map[f.name] = f.label || f.name;
  }
  return map;
}

/** Extract up to 2 initials from a string value for the avatar circle. */
function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

/** Humanize a status label for KPI card display (e.g. "to_contact" → "To contact"). */
function humanizeLabel(label: string): string {
  return label.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { context } = useOrgContext();

  // Status labels (independent fetch, resilient)
  const [statusLabels, setStatusLabels] = useState<string[]>([]);

  // KPI: per-status counts (label → count | null if failed)
  const [statusCounts, setStatusCounts] = useState<Record<string, number | null>>({});
  const [unfilteredTotal, setUnfilteredTotal] = useState<number | null>(null);

  // Submissions
  const [submissions, setSubmissions] = useState<SubmissionListResponse | null>(null);
  const [subsLoading, setSubsLoading] = useState(true);
  const [subsError, setSubsError] = useState<string | null>(null);

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [debouncedBranch, setDebouncedBranch] = useState("");
  const [offset, setOffset] = useState(0);

  // Detail panel state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Cards (for tap links in empty state)
  const [cards, setCards] = useState<Card[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Debounce timer ref
  const branchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Token helper ─────────────────────────────────────────────────────────

  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Session expired");
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Fetch status labels (once, resilient) ──────────────────────────────────────

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const [labelsRes, cardsRes] = await Promise.all([
          fetch(`${apiUrl}/organizations/me/status-labels`, { headers }),
          fetch(`${apiUrl}/cards`, { headers }),
        ]);
        if (labelsRes.ok) {
          const json = await labelsRes.json();
          setStatusLabels(json.status_labels ?? []);
        }
        if (cardsRes.ok) {
          setCards(await cardsRes.json());
        }
        // Both are resilient — if either fails, their state stays at default.
      } catch {
        // Silently degrade.
      }
    })();
  }, [isLoaded, isSignedIn, getAuthHeaders, apiUrl]);

  // ── Fetch KPI counts (once status labels are loaded, each independently) ─

  useEffect(() => {
    if (!isLoaded || !isSignedIn || statusLabels.length === 0) return;

    // Fetch unfiltered total
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiUrl}/submissions?limit=1&offset=0`, { headers });
        if (res.ok) {
          const json = await res.json();
          setUnfilteredTotal(json.total);
        }
      } catch {
        // Total card will show "—" if this fails
      }
    })();

    // Fetch count per status label — each independently
    for (const label of statusLabels) {
      (async () => {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(
            `${apiUrl}/submissions?status=${encodeURIComponent(label)}&limit=1&offset=0`,
            { headers }
          );
          if (res.ok) {
            const json = await res.json();
            setStatusCounts((prev) => ({ ...prev, [label]: json.total }));
          } else {
            setStatusCounts((prev) => ({ ...prev, [label]: null }));
          }
        } catch {
          setStatusCounts((prev) => ({ ...prev, [label]: null }));
        }
      })();
    }
  }, [isLoaded, isSignedIn, statusLabels, getAuthHeaders, apiUrl]);

  // ── Debounce branch filter ───────────────────────────────────────────────

  useEffect(() => {
    if (branchTimerRef.current) clearTimeout(branchTimerRef.current);
    branchTimerRef.current = setTimeout(() => {
      setDebouncedBranch(branchFilter);
      setOffset(0); // reset pagination on filter change
    }, 300);
    return () => {
      if (branchTimerRef.current) clearTimeout(branchTimerRef.current);
    };
  }, [branchFilter]);

  // Reset offset when status filter changes
  useEffect(() => {
    setOffset(0);
  }, [statusFilter]);

  // ── Fetch submissions (re-runs on filter/offset change) ──────────────────

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    setSubsLoading(true);
    setSubsError(null);

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        if (statusFilter) params.set("status", statusFilter);
        if (debouncedBranch) params.set("branch", debouncedBranch);

        const res = await fetch(`${apiUrl}/submissions?${params}`, { headers });

        if (!cancelled) {
          if (!res.ok) {
            setSubsError("Failed to load submissions. Please try again.");
          } else {
            setSubmissions(await res.json());
          }
        }
      } catch {
        if (!cancelled) setSubsError("Network error. Unable to reach the server.");
      } finally {
        if (!cancelled) setSubsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getAuthHeaders, apiUrl, statusFilter, debouncedBranch, offset]);

  // ── Label map for rendering candidate data generically ───────────────────

  const labelMap = context ? buildLabelMap(context.form_fields) : {};
  // Collect all unique data keys across visible submissions for column headers
  const dataKeys: string[] = [];
  if (submissions) {
    const seen = new Set<string>();
    for (const sub of submissions.items) {
      for (const key of Object.keys(sub.data)) {
        if (key === "branch" || key === "metadata") continue; // branch is its own column; metadata is hidden
        if (!seen.has(key)) {
          seen.add(key);
          dataKeys.push(key);
        }
      }
    }
  }

  // ── Pagination helpers ───────────────────────────────────────────────────

  const total = submissions?.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  // ── Primary / secondary data keys for avatar row ─────────────────────────

  const primaryKey = dataKeys[0] ?? null;
  const secondaryKey = dataKeys[1] ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveSubmission = (updated: Submission) => {
    if (!submissions) return;

    // Find old submission
    const oldSub = submissions.items.find(s => s.id === updated.id);
    if (!oldSub) return;

    // Update local table data
    setSubmissions({
      ...submissions,
      items: submissions.items.map(s => s.id === updated.id ? updated : s)
    });

    // Safely update KPI counts if status changed
    if (oldSub.status !== updated.status) {
      setStatusCounts(prev => {
        const next = { ...prev };
        if (typeof next[oldSub.status] === 'number') {
          next[oldSub.status] = Math.max(0, (next[oldSub.status] as number) - 1);
        }
        if (typeof next[updated.status] === 'number') {
          next[updated.status] = (next[updated.status] as number) + 1;
        }
        return next;
      });
    }
  };

  const selectedSubmission = submissions?.items.find(s => s.id === selectedSubmissionId) || null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto w-full">
      <SubmissionDetailPanel
        submission={selectedSubmission}
        isOpen={selectedSubmissionId !== null}
        onClose={() => setSelectedSubmissionId(null)}
        onSave={handleSaveSubmission}
        statusLabels={statusLabels}
      />

      {/* KPI Summary Cards */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-auto gap-3" style={{ gridTemplateColumns: `repeat(${1 + statusLabels.length}, minmax(0, 1fr))` }}>
          {/* Total card — emphasized with gradient */}
          <GlassPanel className="p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-default relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[10px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1 relative z-10">Total</p>
            <p className="text-3xl font-semibold text-gradient tabular-nums relative z-10">
              {unfilteredTotal !== null ? unfilteredTotal : "—"}
            </p>
          </GlassPanel>

          {/* Per-status cards */}
          {statusLabels.map((label) => (
            <GlassPanel key={label} className="p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 bg-black/[0.02] dark:bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1 truncate relative z-10">
                {humanizeLabel(label)}
              </p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-[#F5F3EE] tabular-nums relative z-10">
                {statusCounts[label] !== undefined && statusCounts[label] !== null
                  ? statusCounts[label]
                  : "—"}
              </p>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* NFC Cards & QR Links */}
      <CardManagement cards={cards} onCardsChange={setCards} />

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-4">
        <GlassPanel className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status filter */}
            <div className="flex-1 min-w-0 group">
              <label htmlFor="filter-status" className="block text-xs font-medium text-slate-500 dark:text-white/40 mb-1.5 transition-colors group-hover:text-slate-700 dark:group-hover:text-white/60">
                Status
              </label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white/50 dark:bg-[#06080F]/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all appearance-none hover:bg-slate-50 dark:hover:bg-[#06080F]/80"
              >
                <option value="">All statuses</option>
                {statusLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch filter */}
            <div className="flex-1 min-w-0 group">
              <label htmlFor="filter-branch" className="block text-xs font-medium text-slate-500 dark:text-white/40 mb-1.5 transition-colors group-hover:text-slate-700 dark:group-hover:text-white/60">
                Branch
              </label>
              <input
                id="filter-branch"
                type="text"
                placeholder="Filter by branch..."
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full bg-white/50 dark:bg-[#06080F]/50 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-[#FAFAFA] placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:bg-slate-50 dark:hover:bg-[#06080F]/80"
              />
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Table area */}
      <div className="max-w-7xl mx-auto">
        <GlassPanel className="overflow-hidden">
          {subsLoading ? (
            /* Loading skeleton */
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-200 dark:bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : subsError ? (
            /* Error state */
            <div className="p-8 text-center">
              <p className="text-red-500 dark:text-red-400 font-medium">{subsError}</p>
            </div>
          ) : submissions && submissions.total === 0 && !statusFilter && !debouncedBranch ? (
            /* ── First-run / genuine empty state ─────────────────────────────────── */
            <div className="p-16 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
              {/* Icon */}
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-sky-500/10 dark:from-emerald-500/20 dark:to-sky-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-6 animate-float shadow-xl shadow-emerald-500/5 dark:shadow-emerald-500/10">
                <svg className="w-10 h-10 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA] mb-3">No submissions yet</h3>
              <p className="text-sm text-slate-500 dark:text-white/50 max-w-sm mb-8 leading-relaxed">
                Once candidates tap your NFC card or scan your QR code and fill in the form, their submissions will appear here magically.
              </p>

              {/* Tap links — shown only if cards were fetched */}
              {cards.length > 0 && (
                <div className="w-full max-w-lg relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-4 text-left">
                    Your Active Link{cards.length > 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-3">
                    {cards.map((card) => {
                      const tapUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/tap/${card.token}`;
                      const isCopied = copiedToken === card.token;
                      return (
                        <li key={card.id} className="group flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-500 dark:text-white/50 mb-1">{card.stand_name}</p>
                            <p className="text-sm text-slate-900 dark:text-[#FAFAFA] font-mono truncate">{tapUrl}</p>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(tapUrl);
                              setCopiedToken(card.token);
                              setTimeout(() => setCopiedToken(null), 2000);
                            }}
                            className={`shrink-0 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                              isCopied
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-transparent dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                            }`}
                          >
                            {isCopied ? "Copied!" : "Copy Link"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : submissions && submissions.items.length === 0 ? (
            /* Filtered empty state (filters active but no results) */
            <div className="p-16 text-center">
              <p className="text-slate-600 dark:text-white/50 text-lg font-medium mb-2">No matching submissions</p>
              <p className="text-slate-400 dark:text-white/30 text-sm">Try adjusting your filters to find what you're looking for.</p>
            </div>
          ) : submissions ? (
            /* Data table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                    {/* Candidate column (primary + secondary merged) */}
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      {primaryKey ? (labelMap[primaryKey] || primaryKey) : "Candidate"}
                    </th>
                    {/* Remaining data keys (skip primary + secondary since they're in the candidate cell) */}
                    {dataKeys.slice(2).map((key) => (
                      <th
                        key={key}
                        className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-widest"
                      >
                        {labelMap[key] || key}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Branch
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-white/50 uppercase tracking-widest">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] bg-transparent">
                  {submissions.items.map((sub) => {
                    const primaryVal = primaryKey ? (sub.data[primaryKey] ?? "") : "";
                    const secondaryVal = secondaryKey ? (sub.data[secondaryKey] ?? "") : "";
                    const initials = primaryVal ? getInitials(primaryVal) : "?";

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSubmissionId(sub.id)}
                        className="group hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-200 cursor-pointer relative"
                      >
                        {/* Candidate cell: avatar + primary + secondary */}
                        <td className="px-6 py-4 relative">
                          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/10 to-sky-500/10 dark:from-emerald-500/20 dark:to-sky-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                              <span className="text-sm font-semibold text-gradient">{initials}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-[#FAFAFA] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors">
                                {primaryVal || <span className="text-slate-400 dark:text-white/20">—</span>}
                              </p>
                              {secondaryVal && (
                                <p className="text-xs text-slate-500 dark:text-white/40 truncate mt-0.5">{secondaryVal}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Remaining data columns */}
                         {dataKeys.filter(k => k !== 'metadata').slice(2).map((key) => {
                            const val = sub.data[key];
                            const displayVal = val === undefined || val === null
                              ? null
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);
                            return (
                              <td key={key} className="px-6 py-4 text-slate-700 dark:text-[#FAFAFA]/90">
                                {displayVal ?? (
                                  <span className="text-slate-400 dark:text-white/20">—</span>
                                )}
                              </td>
                            );
                          })}
                        <td className="px-6 py-4 text-slate-600 dark:text-white/60">
                          {sub.branch || (
                            <span className="text-slate-400 dark:text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-white/40 whitespace-nowrap text-xs">
                          {formatDate(sub.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Pagination */}
          {submissions && submissions.items.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-white/30">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  disabled={!canPrev}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-white/10 text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[#F5F3EE]/70 dark:hover:bg-white/5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  disabled={!canNext}
                  className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-white/10 text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[#F5F3EE]/70 dark:hover:bg-white/5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
