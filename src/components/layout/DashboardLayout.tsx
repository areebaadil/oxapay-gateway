import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'admin' | 'merchant' | 'agent';
  title?: string;
}

export function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} />
      
      {/* Main Content */}
      <div className="pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
          <div className="flex items-center gap-4">
            {title && (
              <h1 className="text-xl font-semibold">{title}</h1>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search transactions..." 
                className="w-64 pl-9 bg-muted/50 border-border/50 focus:border-primary"
              />
            </div>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                3
              </span>
            </Button>
            
            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {role === 'admin' ? 'A' : role === 'agent' ? 'G' : 'M'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">
                  {role === 'admin' ? 'Admin User' : role === 'agent' ? 'Agent' : 'Merchant'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role === 'admin' ? 'Platform Owner' : role === 'agent' ? 'Sub-Admin' : 'Merchant'}
                </p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
