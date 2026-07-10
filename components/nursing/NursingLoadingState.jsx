export default function NursingLoadingState({ label = 'Loading workspace' }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-teal-700" />
        {label}
      </div>
    </div>
  );
}
