import Link from 'next/link';
import { ExternalLink, GraduationCap, ShieldCheck } from 'lucide-react';
import DoctaRxLogo from '@/components/branding/DoctaRxLogo';

export default function NursingFooter({ compact = false }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className={compact ? 'mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8'}>
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <Link href="/ng/nursing" className="inline-flex rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
              <DoctaRxLogo className="h-7 w-auto" />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Nursing education, clinical simulation, telehealth skills, and verified academic evidence in one institutional workspace.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Learning access</p>
            <nav className="mt-3 grid gap-2 text-sm">
              <Link href="/ng/education/medications" className="text-slate-300 hover:text-teal-200">Medication Library</Link>
              <Link href="/ng/nursing/student" className="text-slate-300 hover:text-teal-200">Student Dashboard</Link>
              <Link href="/ng/nursing/request-access" className="text-slate-300 hover:text-teal-200">Request Institutional Access</Link>
            </nav>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
              <p className="text-sm leading-6 text-slate-300">
                Educational content supports learning and does not replace clinical judgment, approved prescribing guidance, or institutional policy.
              </p>
            </div>
            <a
              href="https://dailymed.nlm.nih.gov/dailymed/"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-200 hover:text-white"
            >
              NIH DailyMed
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {new Date().getFullYear()} DoctaRx. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Nursing Education & Clinical Training Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
