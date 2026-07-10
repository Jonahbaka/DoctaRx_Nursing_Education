import { FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NursingEmptyState({ title, description, actionLabel, onAction, icon: Icon = FileSearch }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-950">
      <span className="rounded-lg bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-normal">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel ? (
        <Button type="button" className="mt-5 bg-teal-700 text-white hover:bg-teal-800" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
