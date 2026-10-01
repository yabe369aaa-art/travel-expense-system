import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, Users, LogOut, User, ClipboardCheck, Archive } from 'lucide-react';
import { getRoleLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const navigation = {
  applicant: [
    { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
    { name: '申請一覧', href: '/applications', icon: FileText },
    { name: '新規申請', href: '/applications/new', icon: FileText },
  ],
  coordinator: [
    { name: 'マイページ', href: '/dashboard', icon: LayoutDashboard },
    { name: '代理申請', href: '/coordinator/applications/new', icon: Users },
  ],
  admin: [
    { name: '確認待ち', href: '/admin/pending', icon: ClipboardCheck },
    { name: '転記待ち', href: '/admin/approved', icon: Archive },
  ],
};

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userNav = user ? navigation[user.role] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <NavLink to="/dashboard" className="text-xl font-bold text-primary">
              交通費申請システム
            </NavLink>
            <nav className="hidden md:flex items-center gap-1">
              {userNav.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{user?.email}</span>
              <Badge variant="secondary" className="text-xs">{getRoleLabel(user?.role || '')}</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}