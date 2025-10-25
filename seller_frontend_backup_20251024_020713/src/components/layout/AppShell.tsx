import type { ReactNode } from 'react';
import { SidebarNavigation } from '@/components/navigation/SidebarNavigation';
import { TopBar } from '@/components/navigation/TopBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-muted">
      <SidebarNavigation />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
