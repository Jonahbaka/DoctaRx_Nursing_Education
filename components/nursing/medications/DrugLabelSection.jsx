'use client';

import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DrugLabelSection({ section, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionId = `label-section-${section.key}`;

  return (
    <section id={sectionId} className="scroll-mt-24 border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 sm:px-6"
        aria-expanded={open}
        aria-controls={`${sectionId}-content`}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-teal-50 p-2 text-teal-700 ring-1 ring-teal-100">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-950">{section.title}</span>
            <span className="mt-1 block text-xs text-slate-500">
              Source: {section.sourceTitle}{section.sourceCode ? ` (${section.sourceCode})` : ''}
            </span>
          </span>
        </span>
        <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div id={`${sectionId}-content`} className="medication-label-content px-5 pb-6 sm:px-6" dangerouslySetInnerHTML={{ __html: section.html }} />
      ) : null}
    </section>
  );
}
