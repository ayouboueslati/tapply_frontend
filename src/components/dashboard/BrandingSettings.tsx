"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

interface Branding {
  logo_url: string | null;
  theme_color: string;
  welcome_title: string;
  welcome_text: string;
}

const PRESET_COLORS = [
  "#C9A96E", "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

export default function BrandingSettings({ isOwner }: { isOwner: boolean }) {
  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [branding, setBranding] = useState<Branding | null>(null);
  const [draft, setDraft] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/organizations/me/branding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load branding");
      const data = await res.json();
      setBranding(data);
      setDraft(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getToken]);

  useEffect(() => { fetchBranding(); }, [fetchBranding]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/organizations/me/branding`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save");
      }
      const data = await res.json();
      setBranding(data);
      setDraft(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(branding);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="space-y-6">
      {/* Color */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Brand Color</h3>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">Used as the primary accent on the public tap form.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              disabled={!isOwner}
              onClick={() => setDraft(d => d ? { ...d, theme_color: c } : d)}
              className="w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-110 disabled:cursor-not-allowed"
              style={{
                background: c,
                borderColor: draft.theme_color === c ? c : "transparent",
                boxShadow: draft.theme_color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : undefined,
              }}
              title={c}
            />
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              disabled={!isOwner}
              value={draft.theme_color}
              onChange={e => setDraft(d => d ? { ...d, theme_color: e.target.value } : d)}
              className="w-8 h-8 rounded-full cursor-pointer disabled:cursor-not-allowed border-0 p-0 bg-transparent"
              title="Custom color"
            />
            <span className="text-xs text-slate-500 font-mono">{draft.theme_color}</span>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl p-4 border border-dashed border-slate-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: draft.theme_color }}>T</div>
          <div>
            <div className="text-xs font-semibold" style={{ color: draft.theme_color }}>Preview — Active Accent</div>
            <div className="h-1.5 w-32 rounded-full mt-1" style={{ background: draft.theme_color, opacity: 0.4 }} />
          </div>
        </div>
      </div>

      {/* Welcome copy */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Welcome Copy</h3>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">Text displayed on the left panel of the public tap form.</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-white/60 uppercase tracking-wide">Heading</label>
            <input
              type="text"
              disabled={!isOwner}
              value={draft.welcome_title}
              onChange={e => setDraft(d => d ? { ...d, welcome_title: e.target.value } : d)}
              maxLength={60}
              className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ "--tw-ring-color": draft.theme_color } as any}
              placeholder="Choose Your Path"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-white/60 uppercase tracking-wide">Subtext</label>
            <textarea
              disabled={!isOwner}
              value={draft.welcome_text}
              onChange={e => setDraft(d => d ? { ...d, welcome_text: e.target.value } : d)}
              maxLength={160}
              rows={3}
              className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Find the programme that ignites your ambition."
            />
          </div>
        </div>
      </div>

      {/* Logo URL */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Logo URL</h3>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">Paste a public URL to your logo image. Leave blank to use initials.</p>
        </div>
        <input
          type="url"
          disabled={!isOwner}
          value={draft.logo_url ?? ""}
          onChange={e => setDraft(d => d ? { ...d, logo_url: e.target.value || null } : d)}
          className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="https://example.com/logo.png"
        />
        {draft.logo_url && (
          <img src={draft.logo_url} alt="Logo preview" className="h-12 object-contain rounded-xl border border-slate-200 dark:border-white/10 p-1" />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 px-1">{error}</p>
      )}

      {isOwner && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: draft.theme_color }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
          {isDirty && (
            <button onClick={() => setDraft(branding)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white/80 transition-colors">
              Discard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
