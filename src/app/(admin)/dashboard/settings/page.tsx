"use client";

import { useState } from "react";
import { useOrgContext } from "@/components/dashboard/DashboardLayout";
import EditableLabelList from "@/components/dashboard/EditableLabelList";
import TeamSection from "@/components/dashboard/TeamSection";
import BrandingSettings from "@/components/dashboard/BrandingSettings";
import FormSchemaBuilder from "@/components/dashboard/FormSchemaBuilder";

const TABS = [
  { id: "pipeline",  label: "Pipeline" },
  { id: "branding",  label: "Branding" },
  { id: "form",      label: "Form Builder" },
  { id: "team",      label: "Team" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  const { context } = useOrgContext();
  const isOwner = context?.role === "org_owner";
  const [activeTab, setActiveTab] = useState<TabId>("pipeline");

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#FAFAFA]">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
          Manage your organization&apos;s configuration.
        </p>
      </div>

      {!isOwner && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200 text-sm">
          <strong>Note:</strong> You are viewing this page as a staff member.
          Only the organization owner can edit these settings.
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <EditableLabelList
            title="Status Labels"
            description="Manage the pipeline stages for your lead captures."
            endpointPath="/organizations/me/status-labels"
            dataKey="status_labels"
            isEditable={isOwner}
            useStatusBadge={true}
          />
          <EditableLabelList
            title="Branches"
            description="Define branch names for organizing your dashboard."
            endpointPath="/organizations/me/branches"
            dataKey="branch_labels"
            isEditable={isOwner}
          />
        </div>
      )}

      {activeTab === "branding" && (
        <div className="space-y-2">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Branding</h2>
            <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">
              Customize how your public tap form looks to applicants.
            </p>
          </div>
          <BrandingSettings isOwner={isOwner} />
        </div>
      )}

      {activeTab === "form" && (
        <div className="space-y-2">
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Form Builder</h2>
            <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">
              Configure the fields that appear on your public NFC tap form. Drag to reorder.
            </p>
          </div>
          <FormSchemaBuilder isOwner={isOwner} />
        </div>
      )}

      {activeTab === "team" && (
        <TeamSection isOwner={isOwner} />
      )}
    </div>
  );
}
