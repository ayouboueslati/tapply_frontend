"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

// ── Types ──────────────────────────────────────────────────────────────────────

type FieldType = "text" | "email" | "phone" | "date" | "select" | "textarea" | "number";

interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];    // for select fields
}

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: string }[] = [
  { value: "text",     label: "Short Text",   icon: "Aa" },
  { value: "email",    label: "Email",        icon: "✉" },
  { value: "phone",    label: "Phone",        icon: "📞" },
  { value: "date",     label: "Date",         icon: "📅" },
  { value: "select",   label: "Dropdown",     icon: "☰" },
  { value: "textarea", label: "Paragraph",    icon: "¶" },
  { value: "number",   label: "Number",       icon: "#" },
];

function newField(): FieldDef {
  return { name: "", label: "", type: "text", required: false };
}

function toSnakeCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FormSchemaBuilder({ isOwner }: { isOwner: boolean }) {
  const { getToken } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [fields, setFields] = useState<FieldDef[]>([]);
  const [saved, setSaved] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wasSaved, setWasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/organizations/me/form-schema`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load form schema");
      const data = await res.json();
      const hydrated: FieldDef[] = (data.fields || []).map((f: any) => ({
        name: f.name || "",
        label: f.label || f.name || "",
        type: f.type || "text",
        required: f.required || false,
        placeholder: f.placeholder,
        options: f.options,
      }));
      setFields(hydrated);
      setSaved(hydrated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getToken]);

  useEffect(() => { fetchSchema(); }, [fetchSchema]);

  const handleSave = async () => {
    // Validate all fields have name + type
    for (const f of fields) {
      if (!f.name.trim()) { setError("All fields must have a name."); return; }
    }
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/organizations/me/form-schema`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Save failed");
      }
      const data = await res.json();
      const hydrated: FieldDef[] = (data.fields || []).map((f: any) => ({
        name: f.name || "",
        label: f.label || f.name || "",
        type: f.type || "text",
        required: f.required || false,
        placeholder: f.placeholder,
        options: f.options,
      }));
      setFields(hydrated);
      setSaved(hydrated);
      setWasSaved(true);
      setTimeout(() => setWasSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (idx: number, patch: Partial<FieldDef>) => {
    setFields(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const updated = { ...f, ...patch };
      // Auto-generate name from label if user hasn't customised it
      if ("label" in patch && f.name === toSnakeCase(f.label)) {
        updated.name = toSnakeCase(patch.label as string);
      }
      return updated;
    }));
  };

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const addField = () => {
    setFields(prev => [...prev, newField()]);
    setExpandedIdx(fields.length);
  };

  // Drag-to-reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setFields(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const isDirty = JSON.stringify(fields) !== JSON.stringify(saved);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Field list */}
      <div className="space-y-2">
        {fields.length === 0 && (
          <div className="text-center py-10 text-slate-400 dark:text-white/30 text-sm rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            No fields yet. Click "Add Field" to start building your form.
          </div>
        )}
        {fields.map((field, idx) => (
          <div
            key={idx}
            draggable={isOwner}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`rounded-2xl border transition-all duration-200 ${
              dragIdx === idx ? "opacity-40 scale-[0.98]" : ""
            } bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 overflow-hidden`}
          >
            {/* Row header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              {isOwner && (
                <span className="text-slate-300 dark:text-white/20 cursor-grab active:cursor-grabbing text-lg leading-none" title="Drag to reorder">⠿</span>
              )}
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-mono text-slate-500 dark:text-white/50 shrink-0">
                  {FIELD_TYPE_OPTIONS.find(o => o.value === field.type)?.icon ?? "?"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {field.label || field.name || <span className="italic text-slate-400">Untitled Field</span>}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-white/30">
                    {FIELD_TYPE_OPTIONS.find(o => o.value === field.type)?.label}
                    {field.required && " · Required"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOwner && (
                  <button
                    onClick={e => { e.stopPropagation(); removeField(idx); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    ✕
                  </button>
                )}
                <span className="text-slate-400 text-xs">{expandedIdx === idx ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Expanded editor */}
            {expandedIdx === idx && (
              <div className="border-t border-slate-100 dark:border-white/5 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wide">Label</label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={field.label}
                    onChange={e => updateField(idx, { label: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wide">Field Name (key)</label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={field.name}
                    onChange={e => updateField(idx, { name: toSnakeCase(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                    placeholder="full_name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wide">Field Type</label>
                  <select
                    disabled={!isOwner}
                    value={field.type}
                    onChange={e => updateField(idx, { type: e.target.value as FieldType })}
                    className="mt-1 w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                  >
                    {FIELD_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wide">Placeholder</label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={field.placeholder ?? ""}
                    onChange={e => updateField(idx, { placeholder: e.target.value || undefined })}
                    className="mt-1 w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
                    placeholder="e.g. John Doe"
                  />
                </div>
                {field.type === "select" && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-white/50 uppercase tracking-wide">Options (one per line)</label>
                    <textarea
                      disabled={!isOwner}
                      rows={4}
                      value={(field.options ?? []).join("\n")}
                      onChange={e => updateField(idx, { options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                      className="mt-1 w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400 resize-none disabled:opacity-50"
                      placeholder={"Option A\nOption B\nOption C"}
                    />
                  </div>
                )}
                <div className="flex items-center gap-3 sm:col-span-2">
                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => updateField(idx, { required: !field.required })}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 disabled:cursor-not-allowed ${field.required ? "bg-indigo-500" : "bg-slate-200 dark:bg-white/10"}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow ${field.required ? "translate-x-4" : ""}`} />
                  </button>
                  <span className="text-sm text-slate-700 dark:text-white/70">Required field</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {error && <p className="text-sm text-red-600 dark:text-red-400 px-1">{error}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {isOwner && (
          <button
            onClick={addField}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-dashed border-slate-300 dark:border-white/20 text-slate-600 dark:text-white/60 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            + Add Field
          </button>
        )}
        {isOwner && (
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : wasSaved ? "✓ Saved" : "Save Schema"}
          </button>
        )}
        {isDirty && isOwner && (
          <button onClick={() => setFields(saved)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-white/80 transition-colors">
            Discard
          </button>
        )}
      </div>
    </div>
  );
}
