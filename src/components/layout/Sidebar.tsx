import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ArrowDownToLine, 
  FileText, 
  Settings,
  CreditCard,
  Wallet,
  Activity,
  LogOut,
  Shield
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'merchant';
}

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/merchants', icon: Users, label: 'Merchants' },
  { to: '/admin/transactions', icon: ArrowDownToLine, label: 'Transactions' },
  { to: '/admin/ledger', icon: FileText, label: 'Ledger' },
  { to: '/admin/settlements', icon: Wallet, label: 'Settlements' },
  { to: '/admin/analytics', icon: Activity, label: 'Analytics' },
];

const merchantLinks = [
  { to: '/merchant', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/merchant/transactions', icon: ArrowDownToLine, label: 'Transactions' },
  { to: '/merchant/ledger', icon: FileText, label: 'Ledger' },
  { to: '/merchant/settlements', icon: Wallet, label: 'Settlements' },
  { to: '/merchant/api', icon: CreditCard, label: 'API Keys' },
];

export function Sidebar({ role }: SidebarProps) {
  const location = useLocation();
  const links = role === 'admin' ? adminLinks : merchantLinks;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary glow-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-bold gradient-text">CryptoGate</span>
            <span className="ml-1 text-xs text-muted-foreground">
              {role === 'admin' ? 'Admin' : 'Portal'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {links.map((link) => {
            const isActive = location.pathname === link.to || 
              (link.to !== '/admin' && link.to !== '/merchant' && location.pathname.startsWith(link.to));
            
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-primary' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <link.icon className={cn(
                  'h-5 w-5 transition-colors',
                  isActive && 'text-primary'
                )} />
                {link.label}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="border-t border-sidebar-border p-4 space-y-1">
          <Link
            to={`/${role}/settings`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Link>
        </div>
      </div>
    </aside>
  );
}
