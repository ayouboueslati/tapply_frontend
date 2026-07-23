"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import { useOrgContext } from "@/components/dashboard/DashboardLayout";

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

  // Debounce timer ref
  const branchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Token helper ─────────────────────────────────────────────────────────

  const getAuthHeaders = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Session expired");
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Fetch status labels (once, resilient) ────────────────────────────────

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiUrl}/organizations/me/status-labels`, { headers });
        if (res.ok) {
          const json = await res.json();
          setStatusLabels(json.status_labels ?? []);
        }
        // If it fails, statusLabels stays [] — filter just won't render options.
      } catch {
        // Silently degrade — the submissions table still works.
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
        if (key === "branch") continue; // branch is its own column
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* KPI Summary Cards */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-auto gap-3" style={{ gridTemplateColumns: `repeat(${1 + statusLabels.length}, minmax(0, 1fr))` }}>
          {/* Total card — emphasized with gold */}
          <GlassPanel className="p-4">
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mb-1">Total</p>
            <p className="text-3xl font-semibold text-[#D4AF6A] tabular-nums">
              {unfilteredTotal !== null ? unfilteredTotal : "—"}
            </p>
          </GlassPanel>

          {/* Per-status cards */}
          {statusLabels.map((label) => (
            <GlassPanel key={label} className="p-4">
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mb-1 truncate">
                {humanizeLabel(label)}
              </p>
              <p className="text-3xl font-semibold text-[#F5F3EE] tabular-nums">
                {statusCounts[label] !== undefined && statusCounts[label] !== null
                  ? statusCounts[label]
                  : "—"}
              </p>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-4">
        <GlassPanel className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Status filter */}
            <div className="flex-1 min-w-0">
              <label htmlFor="filter-status" className="block text-xs text-white/40 mb-1">
                Status
              </label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0B1220]/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F5F3EE] focus:outline-none focus:ring-2 focus:ring-[#D4AF6A] focus:border-transparent appearance-none"
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
            <div className="flex-1 min-w-0">
              <label htmlFor="filter-branch" className="block text-xs text-white/40 mb-1">
                Branch
              </label>
              <input
                id="filter-branch"
                type="text"
                placeholder="Filter by branch..."
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full bg-[#0B1220]/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#F5F3EE] placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#D4AF6A] focus:border-transparent"
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
                <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : subsError ? (
            /* Error state */
            <div className="p-8 text-center">
              <p className="text-red-400 font-medium">{subsError}</p>
            </div>
          ) : submissions && submissions.items.length === 0 ? (
            /* Empty state */
            <div className="p-12 text-center">
              <p className="text-white/40 text-lg">No submissions yet</p>
              <p className="text-white/25 text-sm mt-1">
                Submissions will appear here once candidates tap your NFC cards.
              </p>
            </div>
          ) : submissions ? (
            /* Data table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {/* Candidate column (primary + secondary merged) */}
                    <th className="px-5 py-3.5 text-xs font-medium text-white/50 uppercase tracking-wider">
                      {primaryKey ? (labelMap[primaryKey] || primaryKey) : "Candidate"}
                    </th>
                    {/* Remaining data keys (skip primary + secondary since they're in the candidate cell) */}
                    {dataKeys.slice(2).map((key) => (
                      <th
                        key={key}
                        className="px-5 py-3.5 text-xs font-medium text-white/50 uppercase tracking-wider"
                      >
                        {labelMap[key] || key}
                      </th>
                    ))}
                    <th className="px-5 py-3.5 text-xs font-medium text-white/50 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-white/50 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-white/50 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {submissions.items.map((sub) => {
                    const primaryVal = primaryKey ? (sub.data[primaryKey] ?? "") : "";
                    const secondaryVal = secondaryKey ? (sub.data[secondaryKey] ?? "") : "";
                    const initials = primaryVal ? getInitials(primaryVal) : "?";

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Candidate cell: avatar + primary + secondary */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D4AF6A]/15 border border-[#D4AF6A]/25 flex items-center justify-center">
                              <span className="text-xs font-semibold text-[#D4AF6A]">{initials}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#F5F3EE] truncate">
                                {primaryVal || <span className="text-white/20">—</span>}
                              </p>
                              {secondaryVal && (
                                <p className="text-xs text-white/35 truncate mt-0.5">{secondaryVal}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Remaining data columns */}
                        {dataKeys.slice(2).map((key) => (
                          <td key={key} className="px-5 py-4 text-[#F5F3EE]">
                            {sub.data[key] ?? (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-5 py-4 text-[#F5F3EE]/70">
                          {sub.branch || (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="px-5 py-4 text-white/40 whitespace-nowrap text-xs">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <p className="text-xs text-white/30">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  disabled={!canPrev}
                  className="px-3 py-1.5 text-xs rounded-md border border-white/10 text-[#F5F3EE]/70 hover:bg-white/5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  disabled={!canNext}
                  className="px-3 py-1.5 text-xs rounded-md border border-white/10 text-[#F5F3EE]/70 hover:bg-white/5 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
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
