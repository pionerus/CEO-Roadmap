'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { SearchBar } from '@/components/shared/SearchBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page has no sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <SearchBar />
    </div>
  );
}
