import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EducationalDisclaimer({ compact = false, className }) {
  return (
    <div className={cn('border border-amber-200 bg-amber-50 text-amber-950', compact ? 'rounded-lg px-4 py-3' : 'rounded-lg p-5', className)} role="note">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold">Educational use only</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            DailyMed label content supports nursing education. It does not replace clinical judgment, current local prescribing guidance, a pharmacist, or institutional policy. Never enter identifiable patient information.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DrugInteractionPlaceholder() {
  return (
    <section className="rounded-lg border border-slate-300 bg-slate-100 p-5" aria-labelledby="interaction-placeholder-title">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
        <div>
          <p id="interaction-placeholder-title" className="font-semibold text-slate-950">Future interaction service</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Drug interaction checking is not yet available. Always consult an approved interaction database, pharmacist, or current clinical guideline.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The official Drug Interactions section shown above is label information for one product. It is not a complete multi-drug interaction analysis.
          </p>
        </div>
      </div>
    </section>
  );
}
