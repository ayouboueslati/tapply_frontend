"use client";

import { useOrgContext } from "@/components/dashboard/DashboardLayout";
import EditableLabelList from "@/components/dashboard/EditableLabelList";
import TeamSection from "@/components/dashboard/TeamSection";

export default function SettingsPage() {
  const { context } = useOrgContext();
  const isOwner = context?.role === "org_owner";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
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
        description="Define branch names for organizing your dashboard. These are not yet connected to the tap form."
        endpointPath="/organizations/me/branches"
        dataKey="branch_labels"
        isEditable={isOwner}
      />

      <TeamSection isOwner={isOwner} />
    </div>
  );
}
