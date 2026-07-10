import { Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function SimulationCaseCard({ item, selected, onSelect }) {
  return (
    <button type="button" onClick={onSelect} className="rounded-lg text-left">
      <Card className={cn('h-full rounded-lg border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950', selected && 'border-teal-600 ring-2 ring-teal-600')}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{item.chiefComplaint}</p>
              <p className="mt-1 text-sm text-slate-500">{item.setting}</p>
              <p className="mt-2 text-xs text-slate-500">Target score {item.score}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
