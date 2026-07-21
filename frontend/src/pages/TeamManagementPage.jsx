import React from 'react';
import TeamMembers from '../components/settings/TeamMembers';

export default function TeamManagementPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Team Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">
          Manage your organization's team members, roles, and pending invitations.
        </p>
      </div>
      
      <TeamMembers />
    </div>
  );
}
