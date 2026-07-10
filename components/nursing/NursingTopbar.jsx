import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NursingTopbar({ roleLabel, user, onMenu, onLogout }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={onMenu}>
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
            <p className="font-semibold">{user.firstName} {user.lastName}</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
