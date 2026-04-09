'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, FileText, Folder, Map } from 'lucide-react';
import { useSearch, type SearchResult } from '@/lib/hooks/useSearch';
import { useUIStore } from '@/lib/stores/uiStore';

const typeIcons: Record<SearchResult['type'], React.ReactNode> = {
  task: <FileText className="h-3.5 w-3.5 text-text-muted" />,
  project: <Folder className="h-3.5 w-3.5 text-text-muted" />,
  milestone: <Map className="h-3.5 w-3.5 text-text-muted" />,
};

export function SearchBar() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const { data: results = [] } = useSearch(query);
  const router = useRouter();
  const openTaskDetail = useUIStore((s) => s.openTaskDetail);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !isInputFocused()) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const handleSelect = (result: SearchResult) => {
    setCommandPaletteOpen(false);
    setQuery('');
    if (result.type === 'task') {
      router.push(result.url);
      // Small delay to let navigation complete, then open task detail
      setTimeout(() => openTaskDetail(result.id), 100);
    } else {
      router.push(result.url);
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
      onClick={() => {
        setCommandPaletteOpen(false);
        setQuery('');
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-text-muted" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search tasks, projects, milestones..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <kbd className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-muted">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {query.length < 2 ? (
              <Command.Empty className="px-4 py-6 text-center text-xs text-text-muted">
                Type at least 2 characters to search...
              </Command.Empty>
            ) : results.length === 0 ? (
              <Command.Empty className="px-4 py-6 text-center text-xs text-text-muted">
                No results found
              </Command.Empty>
            ) : (
              results.map((result) => (
                <Command.Item
                  key={`${result.type}-${result.id}`}
                  value={result.title}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary transition-colors data-[selected=true]:bg-bg-tertiary"
                >
                  {typeIcons[result.type]}
                  <span className="flex-1 text-text-primary truncate">
                    {result.title}
                  </span>
                  {result.subtitle && (
                    <span className="text-xs text-text-muted">
                      {result.subtitle}
                    </span>
                  )}
                  <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-muted capitalize">
                    {result.type}
                  </span>
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
}
