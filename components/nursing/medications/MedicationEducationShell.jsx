'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  GraduationCap,
  Layers3,
  LogOut,
  Menu,
  NotebookPen,
  Pill,
  ShieldCheck,
  X,
} from 'lucide-react';
import DoctaRxLogo from '@/components/branding/DoctaRxLogo';
import NursingFooter from '@/components/nursing/NursingFooter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const medicationNavigation = [
  { href: '/ng/education/medications', label: 'Medication Library', icon: Pill },
  { href: '/ng/education/medication-notes', label: 'My Medication Notes', icon: NotebookPen, studentOnly: true },
  { href: '/ng/education/medication-quizzes', label: 'Medication Quizzes', icon: ClipboardCheck, studentOnly: true },
  { href: '/ng/education/medication-flashcards', label: 'Medication Flashcards', icon: Layers3, studentOnly: true },
];

function initials(user) {
  return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'DR';
}

export default function MedicationEducationShell({ user, title, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const navigation = medicationNavigation.filter((item) => !item.studentOnly || user.role === 'student');

  async function logout() {
    await fetch('/api/nursing/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    window.localStorage.removeItem('doctarx:nursing-session:v1');
    router.push('/ng/nursing/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close medication navigation"
        />
      ) : null}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[19rem] flex-col bg-slate-950 p-4 text-white shadow-2xl transition-transform lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between gap-3">
          <Link href="/ng/nursing" className="inline-flex rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
            <DoctaRxLogo className="h-7 w-auto" />
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/10 p-3 shadow-lg backdrop-blur-xl">
          <p className="text-sm font-semibold text-white">Medication Education</p>
          <p className="mt-1 truncate text-xs text-slate-300">{user.firstName} {user.lastName}</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official DailyMed source
          </p>
        </div>

        <nav className="mt-5 grid flex-1 content-start gap-1 overflow-y-auto pr-1" aria-label="Medication education">
          <Link
            href="/ng/nursing/student"
            className="mb-3 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            <GraduationCap className="h-4 w-4" />
            Student Dashboard
          </Link>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Medication learning</p>
          {navigation.map((item) => {
            const active = item.href === '/ng/education/medications'
              ? pathname === item.href || pathname.startsWith(`${item.href}/`)
              : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
          Do not enter identifiable patient information in medication notes.
        </div>
      </aside>

      <div className="lg:pl-[19rem]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open medication navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Medication learning</p>
                <h1 className="truncate text-lg font-semibold tracking-normal text-slate-950">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                  {initials(user)}
                </span>
                <span className="max-w-36 truncate text-sm font-medium text-slate-700">{user.firstName}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={logout} title="Sign out">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
        <NursingFooter compact />
      </div>
    </div>
  );
}

export { medicationNavigation };
