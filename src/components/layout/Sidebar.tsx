'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Map,
  Settings,
  LogOut,
  Plus,
  ChevronLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { useThemeStore } from '@/lib/stores/themeStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuth } from './AuthGuard';
import type { Project } from '@/lib/types';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [showCreateProject, setShowCreateProject] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      return (data ?? []) as Project[];
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (sidebarCollapsed) {
    return (
      <aside className="flex w-12 flex-col items-center border-r border-border bg-bg-secondary py-4">
        <button
          onClick={toggleSidebar}
          className="mb-6 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
        <Link
          href="/roadmap"
          className={`mb-2 rounded-lg p-2 transition-colors ${
            pathname === '/roadmap'
              ? 'bg-accent/10 text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          <Map className="h-4 w-4" />
        </Link>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/project/${project.id}`}
            className={`mb-1 rounded-lg p-2 transition-colors ${
              pathname === `/project/${project.id}`
                ? 'bg-accent/10 text-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          </Link>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <Link
            href="/settings"
            className="rounded-lg p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          Roadmap OS
        </span>
        <button
          onClick={toggleSidebar}
          className="text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* Roadmap */}
        <Link
          href="/roadmap"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === '/roadmap'
              ? 'bg-accent/10 text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          <Map className="h-4 w-4" />
          Roadmap
        </Link>

        {/* Projects */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Projects
            </span>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowCreateProject(true)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                pathname === `/project/${project.id}`
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-text-muted">
              No projects yet
            </p>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-3 space-y-1">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <Link
          href="/settings"
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            pathname === '/settings'
              ? 'bg-accent/10 text-accent'
              : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      <CreateProjectDialog
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
    </aside>
  );
}
