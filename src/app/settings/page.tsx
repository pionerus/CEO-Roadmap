'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { UserManager } from '@/components/settings/UserManager';
import { StatusManager } from '@/components/settings/StatusManager';
import { LabelManager } from '@/components/settings/LabelManager';
import { GeneralSettings } from '@/components/settings/GeneralSettings';

const tabs = ['Users', 'Statuses', 'Labels', 'General'] as const;
type Tab = (typeof tabs)[number];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Users');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-text-tertiary" />
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {activeTab === 'Users' && <UserManager />}
        {activeTab === 'Statuses' && <StatusManager />}
        {activeTab === 'Labels' && <LabelManager />}
        {activeTab === 'General' && <GeneralSettings />}
      </div>
    </div>
  );
}
