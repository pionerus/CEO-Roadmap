'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';

const tabs = ['Users', 'Statuses', 'Labels', 'General'] as const;
type Tab = (typeof tabs)[number];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Users');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="h-5 w-5 text-text-tertiary" />
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        </div>

        {/* Tabs */}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'Users' && (
          <div className="text-sm text-text-tertiary">
            User management will be implemented in Phase 2.
          </div>
        )}
        {activeTab === 'Statuses' && (
          <div className="text-sm text-text-tertiary">
            Status management will be implemented in Phase 2.
          </div>
        )}
        {activeTab === 'Labels' && (
          <div className="text-sm text-text-tertiary">
            Label management will be implemented in Phase 2.
          </div>
        )}
        {activeTab === 'General' && (
          <div className="text-sm text-text-tertiary">
            General settings will be implemented in Phase 2.
          </div>
        )}
      </div>
    </div>
  );
}
