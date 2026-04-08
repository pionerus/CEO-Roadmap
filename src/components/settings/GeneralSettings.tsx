'use client';

import { useThemeStore } from '@/lib/stores/themeStore';
import { Sun, Moon } from 'lucide-react';

export function GeneralSettings() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div>
      <h2 className="text-sm font-medium text-text-primary mb-4">General</h2>

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <h3 className="text-xs font-medium text-text-secondary mb-2">
            Appearance
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (theme !== 'light') toggleTheme();
              }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                theme === 'light'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-border-hover'
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              onClick={() => {
                if (theme !== 'dark') toggleTheme();
              }}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                theme === 'dark'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-border-hover'
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
