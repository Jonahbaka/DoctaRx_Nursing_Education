import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function NursingMetricCard({ label, value, detail, icon: Icon, tone = 'teal', className }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    navy: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
  };

  return (
    <Card className={cn('rounded-lg border-white/70 bg-white/88 shadow-sm shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 dark:shadow-black/20', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
          {Icon ? (
            <span className={cn('rounded-lg p-2', tones[tone] || tones.teal)}>
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
