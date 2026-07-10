import Link from 'next/link';
import DoctaRxLogo from '@/components/branding/DoctaRxLogo';
import { cn } from '@/lib/utils';

export default function NursingSidebar({ navigation, role, hrefForRole, activeTab, onTabChange, tabs, mobileOpen, onClose }) {
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/ng/nursing" className="inline-flex rounded-lg bg-slate-950 px-3 py-2 dark:bg-black">
          <DoctaRxLogo className="h-8 w-auto" />
        </Link>
        <button type="button" className="lg:hidden" onClick={onClose}>Close</button>
      </div>
      <div className="grid gap-2">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', item.role === role ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-100' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900')}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
        <div className="grid gap-1">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm', activeTab === tab.id ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900')}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
